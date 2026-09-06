import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Check, Search, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { formatHtml, tokenizeHtmlLine } from '../utils/htmlFormatter';

interface LiveCodeViewerProps {
  rawHtml: string;
  url: string;
  nodeCount: number;
  lastUpdated: number;
}

export const LiveCodeViewer: React.FC<LiveCodeViewerProps> = ({
  rawHtml,
  url,
  nodeCount,
  lastUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [wrapLines, setWrapLines] = useState(false);
  const [flashUpdated, setFlashUpdated] = useState(false);
  const [maxDisplayLines, setMaxDisplayLines] = useState(500);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Format HTML and calculate lines
  const formattedLines = useMemo(() => {
    const formatted = formatHtml(rawHtml || '<!DOCTYPE html>\n<html>\n<head>\n  <title>Loading DOM...</title>\n</head>\n<body>\n  <p>Waiting for real-time DOM stream...</p>\n</body>\n</html>');
    return formatted.split('\n');
  }, [rawHtml]);

  const visibleLines = useMemo(() => {
    return formattedLines.slice(0, maxDisplayLines);
  }, [formattedLines, maxDisplayLines]);

  // Flash indicator on real-time update
  useEffect(() => {
    setFlashUpdated(true);
    const timer = setTimeout(() => setFlashUpdated(false), 400);
    return () => clearTimeout(timer);
  }, [lastUpdated]);

  // Find search query matches across lines
  const matchingLineIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const indices: number[] = [];
    formattedLines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [formattedLines, searchQuery]);

  const scrollToLine = (lineIdx: number) => {
    const el = lineRefs.current[lineIdx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (matchingLineIndices.length === 0) return;
    const next = (currentMatchIndex + 1) % matchingLineIndices.length;
    setCurrentMatchIndex(next);
    scrollToLine(matchingLineIndices[next]);
  };

  const handlePrevMatch = () => {
    if (matchingLineIndices.length === 0) return;
    const prev = (currentMatchIndex - 1 + matchingLineIndices.length) % matchingLineIndices.length;
    setCurrentMatchIndex(prev);
    scrollToLine(matchingLineIndices[prev]);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-neutral-200 overflow-hidden font-mono select-text">
      {/* Code Viewer Header Bar */}
      <div className="h-10 px-4 bg-black border-b border-neutral-900 flex items-center justify-between text-xs shrink-0 select-none">
        {/* Left: Real-time Status Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className={`w-2 h-2 rounded-full bg-emerald-400 ${flashUpdated ? 'scale-125 ring-2 ring-emerald-400/50' : 'animate-pulse'} transition-all`}></span>
            <span className="font-semibold uppercase tracking-wider text-[11px]">Real-Time Source</span>
          </div>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-400 text-[11px] hidden sm:inline">
            {formattedLines.length} lines
          </span>
          <span className="text-neutral-700 hidden sm:inline">|</span>
          <span className="text-neutral-400 text-[11px] hidden sm:inline">
            {nodeCount} DOM elements
          </span>
          {flashUpdated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 animate-fade-in flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Synced
            </span>
          )}
        </div>

        {/* Right: Search in Code & Copy Button */}
        <div className="flex items-center space-x-2">
          {/* Quick Search */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[11px]">
            <Search className="w-3 h-3 text-neutral-500 mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Find in HTML..."
              className="bg-transparent text-neutral-200 placeholder-neutral-600 focus:outline-none w-24 sm:w-36 text-[11px]"
            />
            {matchingLineIndices.length > 0 && (
              <div className="flex items-center space-x-1 ml-1 text-[10px] text-neutral-400">
                <span>{currentMatchIndex + 1}/{matchingLineIndices.length}</span>
                <button 
                  onClick={handlePrevMatch} 
                  className="hover:text-white p-0.5 cursor-pointer"
                  title="Previous match"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button 
                  onClick={handleNextMatch} 
                  className="hover:text-white p-0.5 cursor-pointer"
                  title="Next match"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Wrap Toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`px-2 py-1 rounded text-[11px] border transition-colors cursor-pointer ${
              wrapLines 
                ? 'bg-neutral-800 text-white border-neutral-700' 
                : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border-neutral-800'
            }`}
            title="Toggle word wrap"
          >
            Wrap
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Copy full HTML source"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-neutral-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-auto p-4 text-[12px] leading-relaxed bg-black ${
          wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre'
        }`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#262626 #000000'
        }}
      >
        {visibleLines.map((line, idx) => {
          const isMatched = matchingLineIndices.includes(idx);
          const isCurrentMatch = matchingLineIndices[currentMatchIndex] === idx;
          const tokens = tokenizeHtmlLine(line);

          return (
            <div
              key={idx}
              ref={(el) => (lineRefs.current[idx] = el)}
              className={`flex hover:bg-neutral-950/80 transition-colors ${
                isCurrentMatch 
                  ? 'bg-amber-950/40 ring-1 ring-amber-500/40' 
                  : isMatched 
                  ? 'bg-yellow-950/20' 
                  : ''
              }`}
            >
              {/* Line Number */}
              <span className="w-12 shrink-0 pr-4 text-right text-neutral-700 select-none font-mono text-[11px]">
                {idx + 1}
              </span>

              {/* Code Tokens */}
              <span className="flex-1 font-mono">
                {tokens.map((token, tIdx) => {
                  let tokenClass = 'text-neutral-300';
                  switch (token.type) {
                    case 'tag':
                      tokenClass = 'text-rose-400 font-semibold';
                      break;
                    case 'attr-name':
                      tokenClass = 'text-amber-300';
                      break;
                    case 'attr-val':
                      tokenClass = 'text-emerald-300';
                      break;
                    case 'comment':
                      tokenClass = 'text-neutral-500 italic';
                      break;
                    case 'doctype':
                      tokenClass = 'text-purple-400 font-bold';
                      break;
                    case 'punctuation':
                      tokenClass = 'text-neutral-500';
                      break;
                    default:
                      tokenClass = 'text-neutral-200';
                  }

                  return (
                    <span key={tIdx} className={tokenClass}>
                      {token.content}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}

        {formattedLines.length > visibleLines.length && (
          <div className="py-4 text-center">
            <button
              onClick={() => setMaxDisplayLines((prev) => prev + 500)}
              className="px-4 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white cursor-pointer transition-colors"
            >
              Load more lines ({formattedLines.length - visibleLines.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
