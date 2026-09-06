import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Globe,
  ClipboardPaste
} from 'lucide-react';

export interface SessionTab {
  id: number; // 1, 2, 3...
  sessionId: string;
  url: string;
  title: string;
  isLoading: boolean;
}

interface MultiSessionManagerProps {
  onBackToBrowser: () => void;
  defaultUrl?: string;
}

const DEFAULT_FALLBACK_URL = 'https://eutechsmine.com/login';

export const MultiSessionManager: React.FC<MultiSessionManagerProps> = ({
  onBackToBrowser,
  defaultUrl = ''
}) => {
  const initialUrl = defaultUrl || DEFAULT_FALLBACK_URL;

  // 1. Tab Quantity Input State (default 10)
  const [tabQuantityInput, setTabQuantityInput] = useState<string>('10');

  // 2. Link Input State
  const [universalUrlInput, setUniversalUrlInput] = useState<string>(initialUrl);

  // 3. User & Pass System State
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [autofilledTabs, setAutofilledTabs] = useState<number[]>([]);
  const pendingAutofillsRef = useRef<Map<number, { username: string; password: string; autoSubmit: boolean }>>(new Map());

  // Active selected tab number (starts at 1)
  const [activeTabId, setActiveTabId] = useState<number>(1);

  // All session tabs list - initialized with 10 tabs, only Tab 1 loads startUrl initially
  const [tabs, setTabs] = useState<SessionTab[]>(() => {
    const initialTabs: SessionTab[] = [];
    const baseKey = Date.now().toString(36);
    const startUrl = defaultUrl || DEFAULT_FALLBACK_URL;
    for (let i = 1; i <= 10; i++) {
      initialTabs.push({
        id: i,
        sessionId: `isolated_tab_${i}_${baseKey}`,
        url: i === 1 ? startUrl : '',
        title: `Tab ${i}`,
        isLoading: i === 1
      });
    }
    return initialTabs;
  });

  // Sync if defaultUrl changes from parent
  useEffect(() => {
    if (defaultUrl && defaultUrl !== universalUrlInput) {
      setUniversalUrlInput(defaultUrl);
    }
  }, [defaultUrl]);

  // Resolve URL helper
  const resolveTargetUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (!trimmed.includes(' ') && trimmed.includes('.')) {
      return `https://${trimmed}`;
    }
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
  };

  // 1. Tab Quantity Submit
  const handleGenerateTabs = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(tabQuantityInput, 10);
    if (isNaN(qty) || qty <= 0) return;

    const cappedQty = Math.min(Math.max(1, qty), 50);
    const baseKey = Date.now().toString(36);
    const newTabs: SessionTab[] = [];
    const targetUrl = resolveTargetUrl(universalUrlInput) || DEFAULT_FALLBACK_URL;

    for (let i = 1; i <= cappedQty; i++) {
      const existingTab = tabs.find((t) => t.id === i);
      const urlToUse = existingTab?.url || targetUrl;
      newTabs.push({
        id: i,
        sessionId: `isolated_tab_${i}_${baseKey}`,
        url: urlToUse,
        title: `Tab ${i}`,
        isLoading: true
      });
    }

    setTabs(newTabs);
    if (activeTabId > cappedQty) {
      setActiveTabId(1);
    }
  };

  // 2. Link Box Submit: Opens URL in all tabs
  const handleApplyUrlToAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const resolved = resolveTargetUrl(universalUrlInput);
    if (!resolved) return;

    setUniversalUrlInput(resolved);
    setTabs((prev) =>
      prev.map((tab) => ({
        ...tab,
        url: resolved,
        title: `Tab ${tab.id}`,
        isLoading: true
      }))
    );
  };

  // Reload the active tab safely without re-rendering all other tabs
  const handleReloadActiveTab = () => {
    const iframe = document.getElementById(`multi-tab-frame-${activeTabId}`) as HTMLIFrameElement | null;
    if (iframe) {
      try {
        iframe.contentWindow?.location.reload();
      } catch {
        const currentTab = tabs.find((t) => t.id === activeTabId);
        if (currentTab && currentTab.url) {
          iframe.src = getTabProxySrc(currentTab) || '';
        }
      }
    }
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, isLoading: true } : t
      )
    );
  };

  // Switch tab and lazily populate URL if empty
  const handleSelectTab = (tabId: number) => {
    setActiveTabId(tabId);
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId && !t.url && universalUrlInput) {
          return {
            ...t,
            url: resolveTargetUrl(universalUrlInput) || DEFAULT_FALLBACK_URL,
            isLoading: true
          };
        }
        return t;
      })
    );
  };

  // Listen to postMessage from tabs
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.sessionId) return;
      const { sessionId, type, title, originalUrl, url } = event.data;

      // Handle URL changes and navigation completions
      if (type === 'BROWSER_URL_CHANGED') {
        const targetUrl = originalUrl || url;
        setTabs((prev) => {
          let hasChanges = false;
          const next = prev.map((t) => {
            if (t.sessionId === sessionId) {
              const newUrl = targetUrl || t.url;
              const newTitle = title && title !== 'Web Page' ? title : t.title;
              if (t.url !== newUrl || t.title !== newTitle || t.isLoading) {
                hasChanges = true;
                return {
                  ...t,
                  url: newUrl,
                  title: newTitle,
                  isLoading: false
                };
              }
            }
            return t;
          });
          return hasChanges ? next : prev;
        });
      }

      // Page loaded and bridge is ready inside iframe: send pending credentials immediately!
      if (type === 'PAGE_READY_FOR_AUTOFILL') {
        setTabs((prev) => {
          const foundTab = prev.find((t) => t.sessionId === sessionId);
          if (foundTab) {
            const pending = pendingAutofillsRef.current.get(foundTab.id);
            if (pending && (pending.username || pending.password)) {
              const iframe = document.getElementById(`multi-tab-frame-${foundTab.id}`) as HTMLIFrameElement | null;
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  {
                    type: 'AUTOFILL_CREDENTIALS',
                    username: pending.username,
                    password: pending.password,
                    autoSubmit: pending.autoSubmit
                  },
                  '*'
                );
              }
            }
          }
          return prev;
        });
      }

      // Autofill succeeded in target page
      if (type === 'AUTOFILL_RESULT') {
        setTabs((prev) => {
          const foundTab = prev.find((t) => t.sessionId === sessionId);
          if (foundTab && event.data && event.data.success) {
            setAutofilledTabs((old) => Array.from(new Set([...old, foundTab.id])));
          }
          return prev;
        });
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  const parseCredentialLine = (line: string) => {
    let user = '';
    let pass = '';
    const trimmed = line.trim();
    if (!trimmed) return { user, pass };

    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      user = parts[0].trim();
      pass = parts.slice(1).join(',').trim();
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      user = parts[0].trim();
      pass = parts.slice(1).join(':').trim();
    } else if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      user = parts[0].trim();
      pass = parts.slice(1).join('|').trim();
    } else if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      user = parts[0].trim();
      pass = parts.slice(1).join('\t').trim();
    } else {
      const parts = trimmed.split(/\s+/);
      user = parts[0]?.trim() || '';
      pass = parts.slice(1).join(' ').trim();
    }
    return { user, pass };
  };

  const sendAutofillToTab = (tabId: number, username: string, password: string) => {
    if (!username && !password) return;
    pendingAutofillsRef.current.set(tabId, {
      username,
      password,
      autoSubmit: false // strictly manual login as requested
    });

    setAutofilledTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));

    const postToTab = () => {
      const iframe = document.getElementById(`multi-tab-frame-${tabId}`) as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            {
              type: 'AUTOFILL_CREDENTIALS',
              username,
              password,
              autoSubmit: false
            },
            '*'
          );
        } catch (e) {}
      }
    };

    // Dispatch cleanly without stacking heavy timer cascades
    setTimeout(postToTab, 50);
    setTimeout(postToTab, 500);
  };

  const handleDistributeCredentials = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const targetUrl = resolveTargetUrl(universalUrlInput) || DEFAULT_FALLBACK_URL;
    const isSingleAccount = lines.length === 1;

    // Ensure tabs exist for all lines
    setTabs((prev) => {
      let nextTabs = [...prev];
      if (!isSingleAccount && lines.length > prev.length) {
        const baseKey = Date.now().toString(36);
        for (let i = prev.length + 1; i <= lines.length; i++) {
          nextTabs.push({
            id: i,
            sessionId: `sess-${i}-${baseKey}`,
            url: targetUrl,
            title: `Tab ${i}`,
            isLoading: true
          });
        }
        setTabQuantityInput(String(lines.length));
      }
      return nextTabs.map((t) => (!t.url ? { ...t, url: targetUrl, isLoading: true } : t));
    });

    if (isSingleAccount) {
      const { user, pass } = parseCredentialLine(lines[0]);
      tabs.forEach((tab) => {
        sendAutofillToTab(tab.id, user, pass);
      });
      setBulkStatus(`✓ Pasted to all tabs`);
    } else {
      lines.forEach((line, idx) => {
        const tabId = idx + 1;
        const { user, pass } = parseCredentialLine(line);
        sendAutofillToTab(tabId, user, pass);
      });
      setBulkStatus(`✓ Pasted to ${lines.length} tabs`);
    }

    setTimeout(() => setBulkStatus(''), 4000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setBulkText(clipText);
          handleDistributeCredentials(clipText);
          // Dismiss keyboard if open to prevent blink/lag
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          return;
        }
      }
    } catch (err) {}

    // Fallback if clipboard API permission is blocked: use current textarea content
    if (bulkText && bulkText.trim()) {
      handleDistributeCredentials(bulkText);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const getTabProxySrc = (tab: SessionTab) => {
    if (!tab.url) return undefined;
    return `/api/proxy?url=${encodeURIComponent(tab.url)}&sessionId=${encodeURIComponent(tab.sessionId)}`;
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="w-screen h-screen min-h-screen max-h-screen overflow-hidden bg-black text-white flex flex-col font-sans select-none">
      {/* 1. TOP HEADER: Back, Tab Qty, Link Input */}
      <header className="h-10 bg-black border-b border-neutral-900 px-3 flex items-center gap-2 shrink-0 z-40">
        {/* Back Button */}
        <button
          id="btn-back-to-browser"
          onClick={onBackToBrowser}
          className="h-7 px-2.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer shrink-0"
          title="Back to Browser"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
          <span>Back</span>
        </button>

        <div className="h-4 w-px bg-neutral-800 shrink-0" />

        {/* Tab Quantity Form */}
        <form onSubmit={handleGenerateTabs} className="flex items-center gap-1 shrink-0">
          <input
            id="input-tab-quantity"
            type="number"
            min="1"
            max="50"
            value={tabQuantityInput}
            onChange={(e) => setTabQuantityInput(e.target.value)}
            placeholder="Qty"
            className="w-14 h-7 bg-neutral-950 border border-neutral-800 rounded px-1.5 text-xs font-mono text-white text-center placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
            title="Enter Tab Quantity (e.g. 10)"
          />
          <button
            id="btn-create-tabs"
            type="submit"
            className="h-7 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-2 rounded text-xs font-mono cursor-pointer transition-colors shrink-0"
            title="Create Tabs"
          >
            Create
          </button>
        </form>

        <div className="h-4 w-px bg-neutral-800 shrink-0" />

        {/* Link Input Box */}
        <form onSubmit={handleApplyUrlToAll} className="flex-1 flex items-center gap-1 min-w-0">
          <input
            id="input-universal-link"
            type="text"
            value={universalUrlInput}
            onChange={(e) => setUniversalUrlInput(e.target.value)}
            placeholder="Enter link (e.g. https://eutechsmine.com/login2)"
            className="flex-1 min-w-0 h-7 bg-neutral-950 border border-neutral-800 rounded px-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
          />
          <button
            id="btn-open-all-tabs"
            type="submit"
            className="h-7 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-2.5 rounded text-xs font-mono cursor-pointer transition-colors shrink-0 whitespace-nowrap"
            title="Open link in all tabs"
          >
            Open in All
          </button>
        </form>
      </header>

      {/* 2. PASTE OPTION BAR (Directly below Header) */}
      <div className="h-10 bg-black border-b border-neutral-900 px-3 flex items-center justify-between gap-2.5 shrink-0 z-30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            id="btn-paste-bulk"
            type="button"
            onClick={handlePasteFromClipboard}
            className="h-7 px-3 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Paste user,pass lines from clipboard into tabs"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          <textarea
            id="bulk-credential-box"
            rows={1}
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDistributeCredentials(bulkText);
                e.currentTarget.blur();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (pasted) {
                e.preventDefault();
                setBulkText(pasted);
                handleDistributeCredentials(pasted);
                e.currentTarget.blur();
              }
            }}
            placeholder="EU035872,EU035872 (Line 1 to Tab 1, Line 2 to Tab 2...)"
            className="h-7 flex-1 max-w-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded px-2.5 py-1 text-xs font-mono text-neutral-100 placeholder-neutral-600 resize-none overflow-x-auto whitespace-pre leading-tight focus:outline-none transition-colors"
            title="Paste bulk user,pass lines here"
          />

          {bulkStatus && (
            <span className="text-[11px] font-mono text-emerald-400 font-medium shrink-0 animate-pulse">
              {bulkStatus}
            </span>
          )}
        </div>

        {/* Reload Tab */}
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-neutral-400">
          <button
            id="btn-reload-active-tab"
            onClick={handleReloadActiveTab}
            className="h-7 px-2.5 rounded bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
            title={`Reload Tab ${activeTabId}`}
          >
            <RotateCw
              className={`w-3 h-3 ${activeTab?.isLoading ? 'animate-spin text-sky-400' : ''}`}
            />
            <span className="text-[11px]">Reload</span>
          </button>
        </div>
      </div>

      {/* 3. TAB NUMBERS ROW: 1 2 3 4 5 6 ... DIRECTLY UNDER PASTE OPTION */}
      <div className="h-10 bg-black border-b border-neutral-900 px-3 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0 z-20">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isFilled = autofilledTabs.includes(tab.id);

          return (
            <button
              key={tab.id}
              id={`tab-number-box-${tab.id}`}
              onClick={() => handleSelectTab(tab.id)}
              className={`h-7 min-w-[38px] px-2.5 rounded flex items-center justify-center font-mono text-xs cursor-pointer border transition-all relative shrink-0 ${
                isActive
                  ? 'bg-neutral-800 text-white border-neutral-500 font-bold shadow-sm ring-1 ring-neutral-700'
                  : 'bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 border-neutral-850'
              }`}
              title={`Tab ${tab.id}: ${tab.url || 'Empty'}${isFilled ? ' (User & Pass Pasted)' : ''}`}
            >
              <span>{tab.id}</span>
              {isFilled && (
                <span
                  className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.9)]"
                  title="User & Pass Pasted"
                />
              )}
              {tab.isLoading && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. ACTIVE TAB VIEWPORT */}
      <main className="flex-1 min-h-0 bg-neutral-950 relative">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasUrl = Boolean(tab.url);

          return (
            <div
              key={tab.sessionId}
              className={`w-full h-full absolute inset-0 bg-neutral-950 transition-opacity duration-150 ${
                isActive ? 'opacity-100 z-10 pointer-events-auto visible' : 'opacity-0 -z-10 pointer-events-none invisible'
              }`}
            >
              {/* Tab Loading Pill Overlay */}
              {tab.isLoading && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all">
                  <div className="flex items-center gap-2 bg-neutral-950/95 border border-neutral-800 px-3.5 py-1.5 rounded-full text-xs text-sky-400 font-mono shadow-2xl backdrop-blur-md">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Loading Tab {tab.id}...</span>
                  </div>
                </div>
              )}

              {hasUrl ? (
                <iframe
                  id={`multi-tab-frame-${tab.id}`}
                  key={tab.sessionId}
                  src={getTabProxySrc(tab)}
                  loading="eager"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
                  className="w-full h-full border-0 bg-neutral-950"
                  title={`Tab ${tab.id}`}
                  onLoad={() => {
                    setTabs((prev) =>
                      prev.map((t) =>
                        t.id === tab.id && t.isLoading ? { ...t, isLoading: false } : t
                      )
                    );
                    const pending = pendingAutofillsRef.current.get(tab.id);
                    if (pending && (pending.username || pending.password)) {
                      [100, 450, 1200, 2500].forEach((delay) => {
                        setTimeout(() => {
                          const iframe = document.getElementById(`multi-tab-frame-${tab.id}`) as HTMLIFrameElement | null;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage(
                              {
                                type: 'AUTOFILL_CREDENTIALS',
                                username: pending.username,
                                password: pending.password,
                                autoSubmit: pending.autoSubmit
                              },
                              '*'
                            );
                          }
                        }, delay);
                      });
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-mono text-neutral-200 mb-1">
                    Tab {tab.id} (Session {tab.sessionId.slice(-6)})
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mb-4 max-w-sm">
                    Enter a link above and click &quot;Open in All&quot; or choose a quick website below:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    <button
                      onClick={() => {
                        const url = 'https://eutechsmine.com/login';
                        setTabs((prev) =>
                          prev.map((t) =>
                            t.id === tab.id
                              ? { ...t, url, isLoading: true }
                              : t
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-800 cursor-pointer"
                    >
                      Eutechsmine Login
                    </button>
                    <button
                      onClick={() => {
                        const url = 'https://html.duckduckgo.com/html/';
                        setTabs((prev) =>
                          prev.map((t) =>
                            t.id === tab.id
                              ? { ...t, url, isLoading: true }
                              : t
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-800 cursor-pointer"
                    >
                      DuckDuckGo
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};
