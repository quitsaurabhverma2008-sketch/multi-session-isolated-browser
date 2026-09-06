import React, { useEffect, useRef } from 'react';
import { Puzzle, X, Plus, Sparkles, SlidersHorizontal, ShieldCheck } from 'lucide-react';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMultiSession?: () => void;
  currentUrl?: string;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  onOpenMultiSession,
  currentUrl,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      id="extensions-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        id="extensions-modal-panel"
        ref={modalRef}
        className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-900 bg-black/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-950/60 border border-sky-800/50 flex items-center justify-center text-sky-400 shadow-sm">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 font-mono tracking-tight flex items-center gap-2">
                Extensions
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">
                  Ready
                </span>
              </h3>
              <p className="text-[11px] text-neutral-500 font-mono">
                Browser Extensions & Custom Functions
              </p>
            </div>
          </div>

          <button
            id="btn-close-extensions-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          {/* Active Site Context */}
          {currentUrl && (
            <div className="px-3 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-500 text-[11px]">Active Tab:</span>
              <span className="text-neutral-300 truncate max-w-[240px] text-right font-medium">
                {currentUrl}
              </span>
            </div>
          )}

          {/* Multi-Session Feature Card */}
          <div className="p-3.5 rounded-xl border border-sky-900/60 bg-sky-950/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 shadow-sm">
                  <Puzzle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-neutral-100">
                    Multi-Session Tab Engine
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Independent Session IDs & Cookies
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
              Open multiple tabs simultaneously (e.g. 10 tabs). Each tab has a separate session ID, with 1-click bulk <strong>Auto User & Password</strong> typing across all tabs.
            </p>
            {onOpenMultiSession && (
              <button
                id="btn-launch-multi-session-modal"
                onClick={() => {
                  onClose();
                  onOpenMultiSession();
                }}
                className="mt-1 w-full py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Puzzle className="w-3.5 h-3.5" />
                <span>Open Multi-Tab & Auto-Fill Engine</span>
              </button>
            )}
          </div>

          {/* Quick status bar */}
          <div className="flex items-center justify-between pt-1 px-1 text-[11px] font-mono text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Extension Engine Active
            </span>
            <span>v1.0.0</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-neutral-900/40 border-t border-neutral-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
