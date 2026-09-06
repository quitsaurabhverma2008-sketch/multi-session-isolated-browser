import React, { useRef, useEffect, useState } from 'react';
import { ViewportMode, IsolatedSession } from '../types';
import { 
  getNexusOpsHtml, 
  getFinBankHtml, 
  getNovaCommerceHtml, 
  getPlaygroundHtml 
} from '../data/sandboxSites';
import { Shield, Sparkles } from 'lucide-react';

interface BrowserViewportProps {
  url: string;
  session: IsolatedSession;
  viewportMode: ViewportMode;
  onDomMutation: (mutationData: any) => void;
  onUrlChange: (newUrl: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export const BrowserViewport: React.FC<BrowserViewportProps> = ({
  url,
  session,
  viewportMode,
  onDomMutation,
  onUrlChange,
  iframeRef
}) => {
  const [loading, setLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Determine if URL is internal sandbox or external proxy
  const isSandbox = url.startsWith('sandbox://');

  const getSandboxHtmlContent = (targetUrl: string) => {
    if (targetUrl.includes('nexusops.cloud')) {
      return getNexusOpsHtml('login');
    } else if (targetUrl.includes('finbank.global')) {
      return getFinBankHtml();
    } else if (targetUrl.includes('novacommerce.shop')) {
      return getNovaCommerceHtml();
    } else {
      return getPlaygroundHtml();
    }
  };

  const getIframeSrc = () => {
    if (isSandbox) {
      return undefined;
    }
    // Route external website through our server-side isolated proxy
    return `/api/proxy?url=${encodeURIComponent(url)}&sessionId=${encodeURIComponent(session.id)}`;
  };

  const getIframeSrcDoc = () => {
    if (isSandbox) {
      return getSandboxHtmlContent(url);
    }
    return undefined;
  };

  // Listen to postMessage from the iframe's injected bridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'BROWSER_DOM_MUTATION') {
        onDomMutation(event.data);
        if (event.data.url && event.data.url !== url && !event.data.url.includes('about:blank')) {
          // If navigated inside proxy
          if (event.data.originalUrl) {
            onUrlChange(event.data.originalUrl);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onDomMutation, onUrlChange, url]);

  // Handle reload
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [url, session.id]);

  // Calculate container styles based on viewport mode
  const getViewportContainerClasses = () => {
    switch (viewportMode) {
      case 'mobile':
        return 'w-[390px] h-[800px] max-h-[calc(100vh-180px)] rounded-[32px] border-[8px] border-slate-700 shadow-2xl overflow-hidden bg-[#0F172A] mx-auto my-auto relative ring-1 ring-slate-600';
      case 'tablet':
        return 'w-[768px] h-[950px] max-h-[calc(100vh-180px)] rounded-xl border-[6px] border-slate-700 shadow-2xl overflow-hidden bg-[#0F172A] mx-auto my-auto relative ring-1 ring-slate-600';
      case 'laptop':
        return 'w-[1024px] h-full max-h-[calc(100vh-160px)] rounded-lg border border-slate-700 shadow-xl overflow-hidden bg-[#0F172A] mx-auto';
      case 'desktop':
      default:
        return 'w-full h-full bg-[#0F172A]';
    }
  };

  const getViewportResolutionLabel = () => {
    switch (viewportMode) {
      case 'mobile':
        return '390x844';
      case 'tablet':
        return '768x1024';
      case 'laptop':
        return '1024x768';
      case 'desktop':
      default:
        return '1280x800';
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0F172A] overflow-hidden">
      {/* Geometric Subheader Bar */}
      <div className="px-4 py-2 bg-[#1E293B]/50 border-b border-slate-700 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
          Virtual Viewport [{getViewportResolutionLabel()}]
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">60 FPS</span>
          <span className="text-[10px] text-green-400 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Live
          </span>
        </div>
      </div>

      {/* Viewport Frame Container */}
      <div 
        id="browser-viewport-wrapper" 
        className="flex-1 w-full h-full bg-[#0F172A] overflow-auto flex items-center justify-center relative p-2"
      >
        <div className={getViewportContainerClasses()}>
          {/* Mobile speaker notch indicator if in mobile mode */}
          {viewportMode === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-b-lg z-20 flex items-center justify-center">
              <div className="w-8 h-1 bg-slate-600 rounded-full"></div>
            </div>
          )}

          {/* Loading overlay indicator */}
          {loading && (
            <div className="absolute inset-0 bg-[#0F172A]/70 backdrop-blur-xs z-10 flex items-center justify-center">
              <div className="flex items-center space-x-2 bg-[#1E293B] border border-slate-700 px-4 py-2 rounded-md text-xs text-sky-400 font-mono shadow-lg">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                <span>Loading Isolated Session...</span>
              </div>
            </div>
          )}

          {/* Sandboxed Interactive Iframe */}
          <iframe
            id="isolated-browser-frame"
            ref={iframeRef}
            key={`${url}-${session.id}-${iframeKey}`}
            src={getIframeSrc()}
            srcDoc={getIframeSrcDoc()}
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
            className="w-full h-full border-0 bg-white"
            title="Isolated Browser Sandbox Frame"
          />
        </div>

        {/* Floating Status Badge at bottom left of Left Slide */}
        <div className="absolute bottom-3 left-3 bg-[#1E293B]/90 backdrop-blur border border-slate-700 px-2.5 py-1 rounded-md text-[10px] text-slate-400 flex items-center space-x-2 shadow-lg z-30 pointer-events-none font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          <span className="font-semibold text-slate-300">ISOLATED ENVELOPE</span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-400">{session.name.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  );
};
