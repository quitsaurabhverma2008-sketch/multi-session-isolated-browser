import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileCode, 
  Search, 
  Copy, 
  Check, 
  Download, 
  WrapText, 
  Activity, 
  FolderTree, 
  History, 
  Cookie, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { InspectorState, InspectorTab, IsolatedSession, DomMutationEvent } from '../types';
import { formatHtml, tokenizeHtmlLine, SyntaxToken } from '../utils/htmlFormatter';
import { DomTreeViewer } from './DomTreeViewer';
import { MutationLogger } from './MutationLogger';

interface HtmlInspectorProps {
  state: InspectorState;
  activeSession: IsolatedSession;
  onClearHistory: () => void;
}

export const HtmlInspector: React.FC<HtmlInspectorProps> = ({
  state,
  activeSession,
  onClearHistory
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('source');
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [recentFlash, setRecentFlash] = useState(false);

  const codeContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Format HTML and compute lines
  const formattedLines = useMemo(() => {
    const formatted = formatHtml(state.rawHtml || '<!-- Waiting for DOM payload from isolated browser... -->');
    return formatted.split('\n');
  }, [state.rawHtml]);

  // Flash animation on real-time update
  useEffect(() => {
    setRecentFlash(true);
    const timer = setTimeout(() => setRecentFlash(false), 450);
    return () => clearTimeout(timer);
  }, [state.lastUpdated]);

  // Search matches
  const matchLineIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryLower = searchQuery.toLowerCase();
    const indices: number[] = [];
    formattedLines.forEach((line, idx) => {
      if (line.toLowerCase().includes(queryLower)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [formattedLines, searchQuery]);

  // Handle Search Navigation
  const handleNextMatch = () => {
    if (matchLineIndices.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchLineIndices.length;
    setCurrentMatchIndex(nextIdx);
    scrollToLine(matchLineIndices[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matchLineIndices.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchLineIndices.length) % matchLineIndices.length;
    setCurrentMatchIndex(prevIdx);
    scrollToLine(matchLineIndices[prevIdx]);
  };

  const scrollToLine = (lineIdx: number) => {
    const el = lineRefs.current[lineIdx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatHtml(state.rawHtml));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([state.rawHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-dom-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const htmlSizeKb = (new Blob([state.rawHtml]).size / 1024).toFixed(1);

  return (
    <div id="html-source-inspector-pane" className="h-full flex flex-col bg-[#010409] text-slate-200 border-l border-slate-800 select-text overflow-hidden">
      {/* Top Geometric Inspector Header */}
      <div className="px-4 py-2 bg-[#0d1117] border-b border-slate-800 flex justify-between items-center shrink-0">
        {/* Title & Live Badge */}
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] font-bold uppercase tracking-tighter text-sky-400">
            Live DOM Stream
          </span>

          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 rounded text-[9px] text-sky-400 font-mono font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            SYNCED
          </span>

          {recentFlash && (
            <span className="text-[9px] text-green-400 font-mono flex items-center gap-1 bg-green-500/10 px-1.5 py-0.2 rounded animate-pulse">
              <Sparkles className="w-2.5 h-2.5" /> Updated
            </span>
          )}
        </div>

        {/* Live Badges from Geometric Balance theme */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 font-mono">UTF-8</div>
          <div className="px-2 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 font-mono">HTML5</div>
          <div className="hidden sm:flex px-2 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 font-mono">
            {state.nodeCount} nodes
          </div>
          <div className="hidden sm:flex px-2 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 font-mono">
            {htmlSizeKb} KB
          </div>
        </div>
      </div>

      {/* Tabs Bar & Quick Actions */}
      <div className="bg-[#0d1117]/80 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          <button
            id="tab-btn-source"
            onClick={() => setActiveTab('source')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'source' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Source</span>
          </button>

          <button
            id="tab-btn-tree"
            onClick={() => setActiveTab('tree')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'tree' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>DOM Tree</span>
          </button>

          <button
            id="tab-btn-mutations"
            onClick={() => setActiveTab('mutations')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer relative ${
              activeTab === 'mutations' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Mutations</span>
            {state.history.length > 0 && (
              <span className="w-3.5 h-3.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[8px] flex items-center justify-center font-bold">
                {state.history.length > 99 ? '99+' : state.history.length}
              </span>
            )}
          </button>

          <button
            id="tab-btn-storage"
            onClick={() => setActiveTab('storage')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'storage' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Quarantine</span>
          </button>
        </div>

        {/* Inspector Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {activeTab === 'source' && (
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-1 rounded text-xs transition-colors cursor-pointer border ${
                wordWrap ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            >
              <WrapText className="w-3 h-3" />
            </button>
          )}

          <button
            id="btn-copy-html-source"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors cursor-pointer border border-slate-700"
            title="Copy current live HTML"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="btn-download-html"
            onClick={handleDownload}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
            title="Download .html file"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Code Search Bar (Only shown on Source Code tab) */}
      {activeTab === 'source' && (
        <div className="bg-[#0d1117] border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs gap-2 shrink-0">
          <div className="relative flex-1 max-w-sm flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
            <input
              type="text"
              id="html-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Search tag, class, id (e.g. form, dashboard)..."
              className="w-full pl-8 pr-16 py-1 bg-[#010409] border border-slate-700 rounded text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
            {matchLineIndices.length > 0 && (
              <span className="absolute right-2 text-[10px] text-sky-400 font-mono">
                {currentMatchIndex + 1}/{matchLineIndices.length}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMatch}
              disabled={matchLineIndices.length === 0}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Match"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matchLineIndices.length === 0}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Next Match"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: Formatted Real-Time HTML Source */}
      {activeTab === 'source' && (
        <div 
          ref={codeContainerRef}
          id="code-lines-scroll-container"
          className={`flex-1 overflow-auto bg-[#010409] p-4 font-mono text-[12px] leading-relaxed ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}
        >
          {formattedLines.map((line, idx) => {
            const isMatch = matchLineIndices.includes(idx);
            const isCurrentMatch = matchLineIndices[currentMatchIndex] === idx;
            const tokens = tokenizeHtmlLine(line);

            return (
              <div
                key={idx}
                ref={(el) => (lineRefs.current[idx] = el)}
                className={`flex items-start group rounded-xs px-1 -mx-1 transition-colors ${
                  isCurrentMatch 
                    ? 'bg-sky-900/30 -mx-4 px-4 py-0.5 border-l-2 border-sky-400' 
                    : isMatch 
                    ? 'bg-sky-950/40 border-l-2 border-sky-500/50' 
                    : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Line Number */}
                <span className="w-10 text-right pr-3 select-none text-slate-600 group-hover:text-slate-400 font-mono text-[11px] shrink-0">
                  {idx + 1}
                </span>

                {/* Tokens */}
                <span className="flex-1">
                  {tokens.map((token, tIdx) => renderSyntaxToken(token, tIdx, searchQuery))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: DOM Tree Explorer */}
      {activeTab === 'tree' && (
        <div className="flex-1 overflow-hidden bg-[#010409]">
          <DomTreeViewer rawHtml={state.rawHtml} />
        </div>
      )}

      {/* Tab 3: Live Mutation Audit Log */}
      {activeTab === 'mutations' && (
        <div className="flex-1 overflow-hidden bg-[#010409]">
          <MutationLogger events={state.history} onClear={onClearHistory} />
        </div>
      )}

      {/* Tab 4: Isolated State & Cookies */}
      {activeTab === 'storage' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-mono bg-[#010409]">
          <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-4">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <Cookie className="w-4 h-4 text-sky-400" />
              <span className="text-sky-400 uppercase tracking-wider text-[11px]">Isolated Profile Envelope</span>
            </h4>
            <div className="space-y-1.5 text-slate-300">
              <div>Session ID: <strong className="text-white">{activeSession.id}</strong></div>
              <div>Profile Name: <strong className="text-sky-400">{activeSession.name}</strong></div>
              <div>Created: <span className="text-slate-400">{new Date(activeSession.createdAt).toLocaleString()}</span></div>
              <div>Active Document Title: <span className="text-green-400">"{state.pageTitle}"</span></div>
            </div>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-4">
            <h4 className="font-bold text-white mb-2">Quarantined Cookies ({Object.keys(activeSession.cookies).length})</h4>
            {Object.keys(activeSession.cookies).length === 0 ? (
              <p className="text-slate-500 italic">No cookies stored in this sandbox session container.</p>
            ) : (
              <div className="space-y-1 bg-[#010409] p-2.5 rounded border border-slate-800">
                {Object.entries(activeSession.cookies).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-orange-300">{k}</span>
                    <span className="text-green-400">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function renderSyntaxToken(token: SyntaxToken, key: number, searchQuery: string) {
  let colorClass = 'text-slate-300';

  // Syntax colors from Geometric Balance theme:
  // Tag: text-blue-400
  // Attribute: text-orange-300
  // Attr value: text-green-400
  // Punctuation: text-slate-500
  // Text: text-slate-400
  switch (token.type) {
    case 'tag':
      colorClass = 'text-blue-400';
      break;
    case 'attr-name':
      colorClass = 'text-orange-300';
      break;
    case 'attr-val':
      colorClass = 'text-green-400';
      break;
    case 'punctuation':
      colorClass = 'text-slate-500';
      break;
    case 'comment':
      colorClass = 'text-slate-600 italic';
      break;
    case 'doctype':
      colorClass = 'text-slate-500 font-semibold';
      break;
    case 'text':
    default:
      colorClass = 'text-slate-400';
      break;
  }

  // Highlight if matches search query
  if (searchQuery.trim() && token.content.toLowerCase().includes(searchQuery.toLowerCase())) {
    return (
      <span key={key} className={`${colorClass} bg-sky-500/30 text-yellow-200 px-0.5 rounded font-bold`}>
        {token.content}
      </span>
    );
  }

  return (
    <span key={key} className={colorClass}>
      {token.content}
    </span>
  );
}
