import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Home, 
  Lock, 
  ShieldCheck, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Laptop, 
  KeyRound, 
  ExternalLink,
  Layers,
  ChevronDown
} from 'lucide-react';
import { IsolatedSession, ViewportMode, SandboxPreset } from '../types';
import { SANDBOX_PRESETS } from '../data/sandboxSites';

interface BrowserChromeProps {
  url: string;
  onNavigate: (newUrl: string) => void;
  onReload: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  activeSession: IsolatedSession;
  onOpenSessionModal: () => void;
  viewportMode: ViewportMode;
  onChangeViewport: (mode: ViewportMode) => void;
  onQuickDemoLogin?: () => void;
}

export const BrowserChrome: React.FC<BrowserChromeProps> = ({
  url,
  onNavigate,
  onReload,
  onGoBack,
  onGoForward,
  canGoBack,
  canGoForward,
  activeSession,
  onOpenSessionModal,
  viewportMode,
  onChangeViewport,
  onQuickDemoLogin
}) => {
  const [inputUrl, setInputUrl] = useState(url);
  const [showPresets, setShowPresets] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  // Sync internal state when external url changes
  React.useEffect(() => {
    setInputUrl(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onNavigate(inputUrl.trim());
      setShowPresets(false);
    }
  };

  const handleSelectPreset = (preset: SandboxPreset) => {
    setInputUrl(preset.initialUrl);
    onNavigate(preset.initialUrl);
    setShowPresets(false);
  };

  return (
    <div id="browser-chrome-bar" className="bg-[#1E293B] border-b border-slate-700 px-4 py-2 flex flex-col gap-2 select-none shrink-0">
      {/* Top Bar: Window Controls, Tab & Session Status */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          {/* OS Window dots */}
          <div className="flex items-center gap-2 mr-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-xs"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block shadow-xs"></span>
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block shadow-xs"></span>
          </div>

          {/* Active Browser Tab */}
          <div className="flex items-center space-x-2 bg-[#0F172A] text-slate-200 px-3 py-1 rounded-t-md border-t border-x border-slate-700 font-mono text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeSession.color }}></span>
            <span className="max-w-[180px] truncate">{url.replace('sandbox://', '').replace('https://', '')}</span>
            <span className="text-[9px] text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 rounded font-bold uppercase">Isolated</span>
          </div>
        </div>

        {/* Right Controls: Auto-fill & Session Profile Pill */}
        <div className="flex items-center space-x-2">
          {onQuickDemoLogin && (
            <button
              id="btn-quick-fill-auth"
              onClick={onQuickDemoLogin}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium transition-colors cursor-pointer text-xs"
              title="Auto-fill credentials in the sandbox website"
            >
              <KeyRound className="w-3.5 h-3.5 text-sky-400" />
              <span>Auto-Fill Demo Login</span>
            </button>
          )}

          <button
            id="btn-switch-session"
            onClick={onOpenSessionModal}
            className="flex items-center space-x-2 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/50 rounded-full text-xs font-bold text-sky-400 uppercase tracking-widest transition-colors cursor-pointer"
            title="Manage isolated cookie & storage profiles"
          >
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
            <span>Profile: <span className="text-white font-mono normal-case tracking-normal font-semibold">{activeSession.name.split(' ')[0]}</span></span>
          </button>
        </div>
      </div>

      {/* Main Address & Navigation Row */}
      <div className="flex items-center space-x-2">
        {/* Navigation Controls */}
        <div className="flex items-center space-x-1 text-slate-400">
          <button 
            id="nav-back-btn"
            onClick={onGoBack} 
            disabled={!canGoBack}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            id="nav-forward-btn"
            onClick={onGoForward} 
            disabled={!canGoForward}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            id="nav-reload-btn"
            onClick={onReload} 
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reload Frame"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button 
            id="nav-home-btn"
            onClick={() => onNavigate('sandbox://nexusops.cloud/login')} 
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Home Sandbox"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Address Input & Presets Dropdown - Geometric Omnibox */}
        <div className="relative flex-1">
          <form onSubmit={handleSubmit} className="flex items-center">
            <div className="absolute left-3 flex items-center space-x-1.5 z-10">
              <button
                type="button"
                onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                className="text-green-400 hover:text-green-300 transition-colors cursor-pointer"
                title="Sandbox Isolation Security Status"
              >
                <Lock className="w-3.5 h-3.5 text-green-400" />
              </button>
            </div>

            <input
              id="browser-omnibox-input"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter sandbox:// or https:// URL..."
              className="w-full pl-9 pr-24 py-1.5 bg-[#0F172A] border border-slate-700 hover:border-slate-600 focus:border-sky-500 rounded-md text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
            />

            <div className="absolute right-1.5 flex items-center space-x-1">
              {/* Presets dropdown toggle */}
              <button
                type="button"
                id="btn-toggle-presets"
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans transition-colors cursor-pointer border border-slate-700"
              >
                <span>Sites</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <button
                type="submit"
                id="btn-navigate-go"
                className="px-2.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Go
              </button>
            </div>
          </form>

          {/* Presets Menu Popup */}
          {showPresets && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#1E293B] border border-slate-700 rounded-lg p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700 flex justify-between items-center">
                <span>Select Isolated Website Preset</span>
                <span className="text-[10px] text-sky-400">Zero-CORS Sandboxes</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
                {SANDBOX_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full text-left p-2 rounded-md hover:bg-slate-800/80 transition-colors flex items-start space-x-2.5 group cursor-pointer border border-transparent hover:border-slate-700"
                  >
                    <div className="w-7 h-7 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all shrink-0 mt-0.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                          {preset.title}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700 px-2 flex justify-between items-center text-[10px] text-slate-400">
                <span>Or type any external URL (e.g. <code>https://example.com</code>)</span>
                <button 
                  onClick={() => setShowPresets(false)} 
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Security Info Popup */}
          {showSecurityInfo && (
            <div className="absolute left-0 top-full mt-1 w-72 bg-[#1E293B] border border-slate-700 rounded-lg p-3 shadow-2xl z-50 text-xs">
              <div className="flex items-center space-x-2 text-green-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Isolated Security Envelope</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This website is sandboxed inside an isolated runtime container. Cross-origin trackers, parent cookies, and unauthorized storage are quarantined.
              </p>
              <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-400 space-y-1">
                <div>• Storage Profile: <span className="text-white font-mono">{activeSession.name}</span></div>
                <div>• DOM Mutation Bridge: <span className="text-green-400">Active</span></div>
                <div>• CSP Bypass Proxy: <span className="text-sky-400">Enabled</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Viewport Dimension Switcher */}
        <div className="flex items-center bg-[#0F172A] border border-slate-700 rounded-md p-0.5 space-x-0.5">
          <button
            onClick={() => onChangeViewport('desktop')}
            className={`p-1 rounded ${viewportMode === 'desktop' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} transition-colors cursor-pointer`}
            title="Desktop (100% Fluid)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewport('laptop')}
            className={`p-1 rounded ${viewportMode === 'laptop' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} transition-colors cursor-pointer`}
            title="Laptop (1024px)"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewport('tablet')}
            className={`p-1 rounded ${viewportMode === 'tablet' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} transition-colors cursor-pointer`}
            title="Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewport('mobile')}
            className={`p-1 rounded ${viewportMode === 'mobile' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} transition-colors cursor-pointer`}
            title="Mobile (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
