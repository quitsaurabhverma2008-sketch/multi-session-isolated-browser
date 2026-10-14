import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Code, 
  Globe, 
  Search, 
  ArrowRight, 
  RotateCw, 
  X, 
  Plus,
  Compass,
  Lock,
  ExternalLink,
  Puzzle,
  MoreVertical,
  Activity,
  Download,
  FolderArchive
} from 'lucide-react';
import { LiveCodeViewer } from './components/LiveCodeViewer';
import { ExtensionsModal } from './components/ExtensionsModal';
import { MultiSessionManager } from './components/MultiSessionManager';
import { WebSourceInstallerModal } from './components/WebSourceInstallerModal';
import { RealTimeActivitiesModal } from './components/RealTimeActivitiesModal';
import { RealTimeActivity } from './types';
import { 
  getNexusOpsHtml, 
  getFinBankHtml, 
  getNovaCommerceHtml, 
  getPlaygroundHtml 
} from './data/sandboxSites';

// Persistent storage keys to guarantee session never expires or dies
const STORAGE_URL_KEY = 'isolated_browser_persistent_url';
const STORAGE_HTML_KEY = 'isolated_browser_persistent_html';

const NEW_TAB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Tab - Browser</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #111111;
      border: 1px solid #222222;
      color: #10b981;
      font-size: 11px;
      font-family: monospace;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }
    p {
      color: #888888;
      font-size: 0.95rem;
      max-width: 480px;
      line-height: 1.5;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  <div class="badge">● REAL-TIME SESSION ACTIVE</div>
  <h1>Isolated Real-Time Browser</h1>
  <p>Search any website or enter a web address to start browsing. Toggle between live website view and real-time DOM source code instantly.</p>
</body>
</html>`;

const QUICK_LINKS = [
  { name: 'DuckDuckGo Search', url: 'https://html.duckduckgo.com/html/', label: 'Search' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page', label: 'Encyclopedia' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', label: 'Tech News' },
  { name: 'GitHub Explore', url: 'https://github.com/explore', label: 'Code' },
  { name: 'Internet Archive', url: 'https://archive.org', label: 'Archive' },
  { name: 'NexusOps Sandbox', url: 'sandbox://nexusops.cloud/login', label: 'Login Demo' },
];

export default function App() {
  // Toggle between 'website' view, 'code' view, and 'multi-session' extension view
  const [viewMode, setViewMode] = useState<'website' | 'code' | 'multi-session'>('website');

  // URL state: default is empty (clean new tab, no demo pre-opened)
  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_URL_KEY) || '';
    } catch {
      return '';
    }
  });

  // Decoupled iframe mount source: only updated on user-directed navigation to prevent white screens/reloads
  const [iframeTargetUrl, setIframeTargetUrl] = useState<string>(currentUrl);
  const [searchInput, setSearchInput] = useState<string>(currentUrl);
  const [showQuickLinks, setShowQuickLinks] = useState<boolean>(false);
  const [showExtensionsModal, setShowExtensionsModal] = useState<boolean>(false);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);
  const [showSourceInstaller, setShowSourceInstaller] = useState<boolean>(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState<boolean>(false);
  const [activities, setActivities] = useState<RealTimeActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Live DOM State received in real time
  const [rawHtml, setRawHtml] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HTML_KEY);
      if (saved && saved.length < 150000 && currentUrl) return saved;
    } catch {}
    return NEW_TAB_HTML;
  });

  const [nodeCount, setNodeCount] = useState<number>(24);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [pageTitle, setPageTitle] = useState<string>('New Tab');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const centerInputRef = useRef<HTMLInputElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  // Keep session alive indefinitely (heartbeat guarantees session never expires or dies)
  useEffect(() => {
    const keepAliveInterval = setInterval(() => {
      try {
        localStorage.setItem('isolated_browser_session_heartbeat', Date.now().toString());
      } catch {}
      // Ping health check to keep proxy server warm
      fetch('/api/health').catch(() => {});
    }, 4000);

    return () => clearInterval(keepAliveInterval);
  }, []);

  // Sync currentUrl changes to localStorage and input bar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_URL_KEY, currentUrl);
    } catch {}

    if (!currentUrl) {
      setRawHtml(NEW_TAB_HTML);
      setPageTitle('New Tab');
      setNodeCount(24);
    }
  }, [currentUrl]);

  // Click outside to close quick links and tools menu dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowQuickLinks(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to real-time postMessage events from the iframe bridge script
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (!event.data) return;

      // CRITICAL: Only process events for the main browser session, NOT multi-session tabs
      if (event.data.sessionId && event.data.sessionId !== 'persistent-user-session') {
        return;
      }

      // Handle direct real-time activity stream from bridge
      if (event.data.type === 'BROWSER_REALTIME_ACTIVITY' && event.data.activity) {
        setActivities((prev) => [event.data.activity, ...prev].slice(0, 300));
      }

      // 1. Navigation has started inside the iframe (user clicked link, submitted form, redirect)
      if (event.data.type === 'BROWSER_NAVIGATING') {
        const targetNavUrl = event.data.url;
        if (targetNavUrl && !targetNavUrl.includes('about:blank')) {
          setSearchInput(targetNavUrl);
          setCurrentUrl(targetNavUrl);
          setIsLoading(true);

          setActivities((prev) => [
            {
              id: 'nav_' + Math.random().toString(36).substring(2, 9),
              category: 'network',
              title: 'Navigation Started',
              detail: `Navigating to: ${targetNavUrl}`,
              timestamp: Date.now(),
              method: 'GET',
              url: targetNavUrl
            },
            ...prev
          ].slice(0, 300));
        }
      }

      // 2. Target page loaded and announced its URL
      if (event.data.type === 'BROWSER_URL_CHANGED') {
        const newUrl = event.data.originalUrl || event.data.url;
        if (newUrl && !newUrl.includes('about:blank')) {
          setCurrentUrl(newUrl);
          setSearchInput(newUrl);
          if (event.data.title) {
            setPageTitle(event.data.title);
          }
          setIsLoading(false);

          setActivities((prev) => [
            {
              id: 'url_' + Math.random().toString(36).substring(2, 9),
              category: 'network',
              title: 'Page Document Loaded',
              detail: `Active document: ${event.data.title || 'Web Page'} (${newUrl})`,
              timestamp: Date.now(),
              status: 200,
              url: newUrl
            },
            ...prev
          ].slice(0, 300));
        }
      }

      // 3. Live DOM mutation stream from inside the page
      if (event.data.type === 'BROWSER_DOM_MUTATION') {
        if (event.data.html) {
          setRawHtml(event.data.html);
          setNodeCount(event.data.nodeCount || 0);
          setLastUpdated(Date.now());
          if (event.data.title) {
            setPageTitle(event.data.title);
          }
          try {
            // Guard localStorage against quota exceeded error
            if (typeof event.data.html === 'string' && event.data.html.length < 100000) {
              localStorage.setItem(STORAGE_HTML_KEY, event.data.html);
            }
          } catch {}

          setActivities((prev) => [
            {
              id: 'dom_' + Math.random().toString(36).substring(2, 9),
              category: 'dom',
              title: 'DOM Mutation Synced',
              detail: `Synchronized ${event.data.nodeCount || 0} nodes from ${event.data.title || 'page'}`,
              timestamp: Date.now(),
              selector: event.data.activeElement || 'document'
            },
            ...prev
          ].slice(0, 300));
        }
        const newUrl = event.data.originalUrl || event.data.url;
        if (newUrl && !newUrl.includes('about:blank')) {
          setCurrentUrl(newUrl);
          setSearchInput(newUrl);
        }
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  // Clean URL resolver: accepts URLs, domains, shortcuts, or search queries
  const resolveTargetUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Direct protocol matches
    if (
      trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('sandbox://')
    ) {
      return trimmed;
    }

    const lower = trimmed.toLowerCase();
    // Sandbox Shortcuts
    if (lower === 'nexusops' || lower === 'login' || lower === 'dashboard' || lower === 'nexus') {
      return 'sandbox://nexusops.cloud/login';
    }
    if (lower === 'finbank' || lower === 'bank' || lower === 'banking') {
      return 'sandbox://finbank.global/auth';
    }
    if (lower === 'novacommerce' || lower === 'shop' || lower === 'store' || lower === 'ecommerce') {
      return 'sandbox://novacommerce.shop';
    }
    if (lower === 'playground' || lower === 'dom' || lower === 'test') {
      return 'sandbox://playground.local';
    }

    // Standard domains (contains a dot and no spaces, e.g. google.com, wikipedia.org, github.com)
    if (!trimmed.includes(' ') && trimmed.includes('.')) {
      return `https://${trimmed}`;
    }

    // Search query fallback (DuckDuckGo HTML search renders seamlessly inside iframes)
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
  };

  const navigateTo = useCallback((target: string) => {
    const resolved = resolveTargetUrl(target);
    setIsLoading(true);
    setCurrentUrl(resolved);
    setSearchInput(resolved);
    setIframeTargetUrl(resolved);
    setShowQuickLinks(false);

    if (resolved) {
      setActivities((prev) => [
        {
          id: 'act_' + Math.random().toString(36).substring(2, 9),
          category: 'network',
          title: 'User Navigated',
          detail: `Navigated to: ${resolved}`,
          timestamp: Date.now(),
          method: 'GET',
          url: resolved
        },
        ...prev
      ].slice(0, 300));
    }

    setTimeout(() => setIsLoading(false), 600);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      navigateTo(searchInput);
    }
  };

  const handleReload = () => {
    if (!currentUrl) return;
    setIsLoading(true);
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.location.reload();
      } catch {
        iframeRef.current.src = iframeRef.current.src;
      }
    }
    setActivities((prev) => [
      {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        category: 'network',
        title: 'Page Reloaded',
        detail: `Reloading frame: ${currentUrl}`,
        timestamp: Date.now(),
        method: 'GET',
        url: currentUrl
      },
      ...prev
    ].slice(0, 300));
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleNewTab = () => {
    setCurrentUrl('');
    setSearchInput('');
    setIframeTargetUrl('');
    setRawHtml(NEW_TAB_HTML);
    setPageTitle('New Tab');
  };

  // Determine iframe source
  const effectiveTarget = iframeTargetUrl || currentUrl;
  const isSandbox = effectiveTarget.startsWith('sandbox://');

  const getSandboxDoc = () => {
    if (effectiveTarget.includes('nexusops.cloud')) {
      return getNexusOpsHtml('login');
    } else if (effectiveTarget.includes('finbank.global')) {
      return getFinBankHtml();
    } else if (effectiveTarget.includes('novacommerce.shop')) {
      return getNovaCommerceHtml();
    } else {
      return getPlaygroundHtml();
    }
  };

  const getIframeSrc = () => {
    if (!effectiveTarget) return undefined;
    if (isSandbox) return undefined;
    return `/api/proxy?url=${encodeURIComponent(effectiveTarget)}&sessionId=persistent-user-session`;
  };

  // Toggle button handler: Tapping once shows Website, tapping again shows Source Code
  const handleToggleView = () => {
    setViewMode((prev) => {
      const next = prev === 'website' ? 'code' : 'website';
      if (next === 'code' && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'REQUEST_DOM_SYNC' }, '*');
        } catch {}
      }
      return next;
    });
  };

  return (
    <div className="w-screen h-screen min-h-screen max-h-screen overflow-hidden bg-black text-white flex flex-col font-sans select-none">
      {/* TOP BAR: Single Minimalist Browser Header */}
      <header className="h-11 bg-black border-b border-neutral-900 px-3 flex items-center gap-2 shrink-0 z-50">
        
        {/* 3-DOTS MENU BUTTON ON THE LEFT SIDE */}
        <div ref={toolsMenuRef} className="relative shrink-0">
          <button
            id="btn-xbrowse-tools-menu"
            onClick={() => setShowToolsMenu((prev) => !prev)}
            className={`h-7 w-7 rounded flex items-center justify-center transition-colors cursor-pointer border ${
              showToolsMenu
                ? 'bg-neutral-800 text-white border-neutral-700'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
            }`}
            title="xbrowse Site Tools (Real-Time Activities & Web Source Code)"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* 3-DOTS DROPDOWN MENU */}
          {showToolsMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#0C0F17] border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 font-sans">
              <div className="px-3 py-1.5 border-b border-neutral-800/80 flex items-center justify-between text-[10px] font-mono uppercase font-semibold text-neutral-400">
                <span>xbrowse Site Tools</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
                </span>
              </div>

              <div className="py-1 space-y-1">
                {/* 1. See Real-Time Activities */}
                <button
                  id="menu-opt-realtime-activities"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setShowActivitiesModal(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-900/90 transition-colors flex items-center space-x-3 group cursor-pointer border border-transparent hover:border-neutral-800"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                        See Real-Time Activities
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">
                      Live network, DOM, clicks & events
                    </p>
                  </div>
                </button>

                {/* 2. Install the Web Source Code */}
                <button
                  id="menu-opt-install-source"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setShowSourceInstaller(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-900/90 transition-colors flex items-center space-x-3 group cursor-pointer border border-transparent hover:border-neutral-800"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        Install Web Source Code
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono border border-emerald-800">
                        .ZIP
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">
                      Full HTML, CSS, JS + Python Workframe
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-1.5 px-3 pb-1 border-t border-neutral-800/80 text-[10px] text-neutral-500 font-mono flex items-center justify-between">
                <span>Active: <span className="text-neutral-300">{pageTitle || 'Web Page'}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* SINGLE TOGGLE BUTTON ON THE LEFT OF SEARCH BAR */}
        <button
          id="btn-toggle-view"
          onClick={handleToggleView}
          className={`h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono font-medium transition-all cursor-pointer shrink-0 border ${
            viewMode === 'website'
              ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-neutral-700'
              : 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-800 shadow-sm shadow-emerald-950'
          }`}
          title={viewMode === 'website' ? 'Click to view Live Source Code' : 'Click to view Live Website'}
        >
          {viewMode === 'website' ? (
            <>
              <Code className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Source Code</span>
              <span className="sm:hidden">&lt;/&gt;</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Live Sync Active"></span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Website</span>
              <span className="sm:hidden">Web</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5"></span>
            </>
          )}
        </button>

        {/* SEARCH BAR (FILLS REST OF TOP) */}
        <div ref={searchContainerRef} className="flex-1 relative flex items-center min-w-0">
          <form 
            onSubmit={handleSearchSubmit} 
            className="w-full flex items-center bg-neutral-950 hover:bg-black border border-neutral-800 hover:border-neutral-700 focus-within:border-neutral-600 focus-within:bg-black rounded px-2.5 h-7.5 transition-colors"
          >
            {/* Protocol/Security indicator */}
            {currentUrl ? (
              <Lock className="w-3 h-3 text-emerald-400 shrink-0 mr-1.5" />
            ) : (
              <Search className="w-3 h-3 text-neutral-500 shrink-0 mr-1.5" />
            )}

            {/* Input Element */}
            <input
              id="browser-search-bar"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setShowQuickLinks(true)}
              placeholder="Search Google or type a URL (e.g. google.com, wikipedia.org, github.com)..."
              className="w-full bg-transparent text-neutral-100 placeholder-neutral-600 text-xs font-mono focus:outline-none truncate"
              autoComplete="off"
              spellCheck="false"
            />

            {/* Clear / New Tab Button */}
            {searchInput && (
              <button
                type="button"
                onClick={handleNewTab}
                className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer shrink-0"
                title="Clear and open New Tab"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Reload Button (when site is active) */}
            {currentUrl && (
              <button
                type="button"
                onClick={handleReload}
                className={`p-1 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer shrink-0 ml-0.5 ${
                  isLoading ? 'animate-spin text-sky-400' : ''
                }`}
                title="Reload page"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            )}

            {/* Submit / Go Arrow */}
            <button
              type="submit"
              className="ml-1 px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-[10px] font-mono transition-colors cursor-pointer shrink-0 border border-neutral-800"
              title="Navigate"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>

          {/* Quick Suggestions Dropdown (Only when user focuses search bar) */}
          {showQuickLinks && (
            <div className="absolute top-9.5 left-0 right-0 bg-neutral-950 border border-neutral-800 rounded-md shadow-2xl z-50 overflow-hidden text-xs font-mono">
              <div className="p-2 border-b border-neutral-900 flex items-center justify-between text-[10px] text-neutral-500 uppercase font-semibold">
                <span>Quick Web Access</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Persistent Session
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-neutral-900">
                {QUICK_LINKS.map((link) => (
                  <button
                    key={link.url}
                    onClick={() => navigateTo(link.url)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-neutral-900 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-neutral-500 group-hover:text-emerald-400 shrink-0" />
                      <span className="text-neutral-300 group-hover:text-white truncate">
                        {link.name}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                      {link.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* EXTENSIONS BUTTON */}
        <button
          id="btn-extensions-toolbar"
          onClick={() => setViewMode((prev) => (prev === 'multi-session' ? 'website' : 'multi-session'))}
          className={`h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono font-medium transition-all cursor-pointer shrink-0 border ${
            viewMode === 'multi-session'
              ? 'bg-sky-950/90 text-sky-300 border-sky-800 shadow-sm shadow-sky-950'
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700'
          }`}
          title="Open Multi-Session Isolated Tab Engine"
        >
          <Puzzle className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Extensions</span>
        </button>
      </header>

      {/* FULL SCREEN MAIN DISPLAY AREA */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-black">
        {/* WEBSITE VIEW */}
        <div
          id="website-view-container"
          className="w-full h-full bg-black relative"
          style={{ display: viewMode === 'website' ? 'block' : 'none' }}
        >
          {/* Default Clean Real Browser Start Page (Shown when no URL is active) */}
          {!currentUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-black text-white select-none">
              <div className="w-full max-w-md flex flex-col items-center text-center">
                {/* Minimalist Browser Icon */}
                <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-6 shadow-2xl">
                  <Compass className="w-7 h-7 text-neutral-300" />
                </div>

                <h2 className="text-xl font-medium tracking-tight text-neutral-100 mb-2 font-sans">
                  Real-Time Isolated Browser
                </h2>
                <p className="text-xs text-neutral-500 max-w-sm mb-7 leading-relaxed font-mono">
                  Enter any website URL or search query to browse privately. Session stays persistent without expiring.
                </p>

                {/* Center Quick Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (centerInputRef.current?.value.trim()) {
                      navigateTo(centerInputRef.current.value);
                    }
                  }}
                  className="w-full flex items-center bg-neutral-950 border border-neutral-800 hover:border-neutral-700 focus-within:border-neutral-600 rounded-lg px-3.5 h-10 mb-7 transition-colors"
                >
                  <Search className="w-4 h-4 text-neutral-500 mr-2.5 shrink-0" />
                  <input
                    ref={centerInputRef}
                    type="text"
                    placeholder="Search the web or type a URL..."
                    className="w-full bg-transparent text-neutral-200 placeholder-neutral-600 text-xs font-mono focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="ml-2 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono border border-neutral-800 cursor-pointer"
                  >
                    Go
                  </button>
                </form>

                {/* Quick Access Icons with Extension Icon */}
                <div className="grid grid-cols-4 gap-2.5 w-full">
                  {/* Extension Icon Card on Home Page */}
                  <button
                    id="btn-extensions-home"
                    onClick={() => setViewMode('multi-session')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-sky-900/50 hover:border-sky-600 transition-all cursor-pointer group shadow-sm"
                    title="Open Multi-Session Isolated Tab Engine"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center mb-1 group-hover:bg-sky-900/80 group-hover:scale-105 transition-all">
                      <Puzzle className="w-4 h-4 text-sky-400" />
                    </div>
                    <span className="text-[11px] font-mono text-sky-300 group-hover:text-white truncate w-full text-center font-medium">
                      Extensions
                    </span>
                  </button>

                  {QUICK_LINKS.slice(0, 7).map((link) => (
                    <button
                      key={link.url}
                      onClick={() => navigateTo(link.url)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 transition-all cursor-pointer group"
                    >
                      <Globe className="w-4 h-4 text-neutral-400 group-hover:text-emerald-400 mb-1.5 transition-colors" />
                      <span className="text-[11px] font-mono text-neutral-300 group-hover:text-white truncate w-full text-center">
                        {link.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2 bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-full text-xs text-sky-400 font-mono shadow-2xl backdrop-blur-md">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </div>
              )}

              <iframe
                id="isolated-browser-frame"
                ref={iframeRef}
                key="isolated-browser-session-viewport"
                src={getIframeSrc()}
                srcDoc={isSandbox ? getSandboxDoc() : undefined}
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
                className="w-full h-full border-0 bg-neutral-950"
                title="Isolated Web Browser Session"
              />
            </>
          )}
        </div>

        {/* REAL-TIME LIVE SOURCE CODE VIEW (Only mounted when in code view to save 100% background CPU) */}
        {viewMode === 'code' && (
          <div
            id="source-code-view-container"
            className="w-full h-full bg-black relative"
          >
            <LiveCodeViewer
              rawHtml={rawHtml}
              url={currentUrl || 'about:blank'}
              nodeCount={nodeCount}
              lastUpdated={lastUpdated}
            />
          </div>
        )}
      </main>

      {/* FULL SCREEN MULTI-SESSION ISOLATED TAB ENGINE (Only mounted when in multi-session view) */}
      {viewMode === 'multi-session' && (
        <div
          id="multi-session-view-container"
          className="w-screen h-screen min-h-screen max-h-screen overflow-hidden bg-black fixed inset-0 z-50"
        >
          <MultiSessionManager
            onBackToBrowser={() => setViewMode('website')}
            defaultUrl={currentUrl}
          />
        </div>
      )}

      {/* EXTENSIONS MODAL */}
      <ExtensionsModal
        isOpen={showExtensionsModal}
        onClose={() => setShowExtensionsModal(false)}
        onOpenMultiSession={() => setViewMode('multi-session')}
        currentUrl={currentUrl}
      />

      {/* WEB SOURCE CODE & WORKFRAME INSTALLER MODAL */}
      <WebSourceInstallerModal
        isOpen={showSourceInstaller}
        onClose={() => setShowSourceInstaller(false)}
        rawHtml={rawHtml}
        currentUrl={currentUrl}
        pageTitle={pageTitle}
      />

      {/* REAL-TIME ACTIVITIES MODAL */}
      <RealTimeActivitiesModal
        isOpen={showActivitiesModal}
        onClose={() => setShowActivitiesModal(false)}
        activities={activities}
        onClearActivities={() => setActivities([])}
        currentUrl={currentUrl}
      />
    </div>
  );
}
