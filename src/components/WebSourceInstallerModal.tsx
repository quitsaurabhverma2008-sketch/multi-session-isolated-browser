import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  Search,
  Terminal,
  Play,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  FolderArchive,
  Code2
} from 'lucide-react';
import { extractWebWorkframe, downloadProjectZip, WebWorkframeProject } from '../utils/sourceExtractor';

interface WebSourceInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawHtml: string;
  currentUrl: string;
  pageTitle: string;
}

type ActiveFileType = 'html' | 'css' | 'js' | 'python' | 'requirements' | 'dockerfile' | 'readme' | 'preview';

export const WebSourceInstallerModal: React.FC<WebSourceInstallerModalProps> = ({
  isOpen,
  onClose,
  rawHtml,
  currentUrl,
  pageTitle
}) => {
  const [activeTab, setActiveTab] = useState<ActiveFileType>('html');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipSuccess, setZipSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wrapLines, setWrapLines] = useState<boolean>(false);
  const [showStatsDrawer, setShowStatsDrawer] = useState<boolean>(false);

  // Extract source code and workframe project
  const project: WebWorkframeProject = useMemo(() => {
    return extractWebWorkframe(rawHtml, currentUrl, pageTitle);
  }, [rawHtml, currentUrl, pageTitle]);

  // Code content based on active tab
  const activeCodeContent = useMemo(() => {
    switch (activeTab) {
      case 'html':
        return project.html;
      case 'css':
        return project.css;
      case 'js':
        return project.js;
      case 'python':
        return project.pythonServer;
      case 'requirements':
        return project.requirements;
      case 'dockerfile':
        return project.dockerfile;
      case 'readme':
        return project.readme;
      default:
        return '';
    }
  }, [activeTab, project]);

  const activeFilename = useMemo(() => {
    switch (activeTab) {
      case 'html': return 'index.html';
      case 'css': return 'styles.css';
      case 'js': return 'app.js';
      case 'python': return 'server.py';
      case 'requirements': return 'requirements.txt';
      case 'dockerfile': return 'Dockerfile';
      case 'readme': return 'README.md';
      default: return 'file.txt';
    }
  }, [activeTab]);

  const lines = useMemo(() => {
    return activeCodeContent.split('\n');
  }, [activeCodeContent]);

  // Download entire project as .ZIP
  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadProjectZip(project);
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 4000);
    } catch (err) {
      console.error('ZIP generation failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Copy active file content
  const handleCopyCurrentFile = async () => {
    try {
      await navigator.clipboard.writeText(activeCodeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Download single file
  const handleDownloadSingleFile = () => {
    const blob = new Blob([activeCodeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-[#0A0D14] border border-neutral-800 rounded-xl w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden font-sans text-neutral-200">
        
        {/* MODAL HEADER */}
        <div className="bg-[#0F141F] border-b border-neutral-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                  Web Source Code & Workframe Studio
                </h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                  Full Stack Clone Ready
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-lg mt-0.5 font-mono">
                {currentUrl || 'Current Active Web Page'}
              </p>
            </div>
          </div>

          {/* TOP RIGHT PRIMARY ACTIONS */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* BIG DOWNLOAD ZIP BUTTON */}
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all shadow-md cursor-pointer ${
                zipSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              }`}
              title="Download full project folder with HTML, CSS, JS, Python Server & README (.ZIP)"
            >
              {zipSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Downloaded (.ZIP)</span>
                </>
              ) : isZipping ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Packaging...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Install Web Source Code (.ZIP)</span>
                </>
              )}
            </button>

            {/* STATS TOGGLE */}
            <button
              onClick={() => setShowStatsDrawer(!showStatsDrawer)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                showStatsDrawer
                  ? 'bg-neutral-800 text-sky-400 border-neutral-700'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
              }`}
              title="Page Asset & Structure Breakdown"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              title="Close Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HINGLISH QUICK BANNER */}
        <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Pura Webcode Ready:</strong> HTML, CSS, JavaScript ke saath complete Python Flask Backend Workframe generate kiya gaya hai. Aap ise 1-click me ZIP download karke run kar sakte hain ya nayi site bana sakte hain!
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold uppercase bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700/50 hidden md:inline">
            7 Workframe Files
          </span>
        </div>

        {/* TABS BAR & CONTROLS */}
        <div className="bg-[#0C0F17] border-b border-neutral-800 px-4 py-2 flex items-center justify-between overflow-x-auto gap-2">
          {/* File Selection Tabs */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('html')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'html'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>index.html</span>
            </button>

            <button
              onClick={() => setActiveTab('css')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'css'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>styles.css</span>
            </button>

            <button
              onClick={() => setActiveTab('js')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'js'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>app.js</span>
            </button>

            <button
              onClick={() => setActiveTab('python')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'python'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>server.py (Python)</span>
            </button>

            <button
              onClick={() => setActiveTab('requirements')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'requirements'
                  ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span>requirements.txt</span>
            </button>

            <button
              onClick={() => setActiveTab('dockerfile')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'dockerfile'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dockerfile</span>
            </button>

            <button
              onClick={() => setActiveTab('readme')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'readme'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>README.md</span>
            </button>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1"></div>

            {/* LIVE PREVIEW TAB */}
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'hover:bg-neutral-800/80 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Live Clone Preview</span>
            </button>
          </div>

          {/* Active File Actions */}
          {activeTab !== 'preview' && (
            <div className="flex items-center space-x-2 shrink-0">
              {/* Search in code */}
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-neutral-500 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded px-2 pl-6 py-0.5 text-[11px] font-mono text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 w-32"
                />
              </div>

              {/* Word wrap toggle */}
              <button
                onClick={() => setWrapLines(!wrapLines)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                  wrapLines
                    ? 'bg-neutral-800 text-sky-400 border-neutral-700'
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
                }`}
              >
                Wrap
              </button>

              {/* Copy Current File */}
              <button
                onClick={handleCopyCurrentFile}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-colors cursor-pointer"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Download Current File */}
              <button
                onClick={handleDownloadSingleFile}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-colors cursor-pointer"
                title={`Download ${activeFilename}`}
              >
                <Download className="w-3 h-3 text-neutral-400" />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        {/* MAIN BODY: CODE VIEWER OR PREVIEW */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* STATS DRAWER */}
          {showStatsDrawer && (
            <div className="w-72 bg-[#0D111A] border-r border-neutral-800 p-4 overflow-y-auto shrink-0 font-mono text-xs flex flex-col space-y-4 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-white uppercase text-[11px] tracking-wider">Page Architecture</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  {project.stats.domain}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded">
                  <div className="text-neutral-500 text-[10px]">DOM Elements</div>
                  <div className="text-sm font-bold text-white mt-0.5">{project.stats.totalNodes}</div>
                </div>
                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded">
                  <div className="text-neutral-500 text-[10px]">Forms Detected</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{project.stats.formCount}</div>
                </div>
                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded">
                  <div className="text-neutral-500 text-[10px]">Input Fields</div>
                  <div className="text-sm font-bold text-sky-400 mt-0.5">{project.stats.inputCount}</div>
                </div>
                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded">
                  <div className="text-neutral-500 text-[10px]">Buttons</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">{project.stats.buttonCount}</div>
                </div>
                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded">
                  <div className="text-neutral-500 text-[10px]">Stylesheets</div>
                  <div className="text-sm font-bold text-purple-400 mt-0.5">{project.stats.styleCount}</div>
                </div>
                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded">
                  <div className="text-neutral-500 text-[10px]">Scripts</div>
                  <div className="text-sm font-bold text-blue-400 mt-0.5">{project.stats.scriptCount}</div>
                </div>
              </div>

              {/* Forms Details */}
              <div>
                <div className="text-[11px] font-semibold text-neutral-300 mb-2 uppercase">Backend Endpoints</div>
                {project.stats.detectedForms.length === 0 ? (
                  <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded text-neutral-500 text-[10px]">
                    No static form tags detected. Static frontend assets fully extracted.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {project.stats.detectedForms.map((f, i) => (
                      <div key={i} className="p-2 bg-neutral-900/80 border border-neutral-800 rounded text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400 truncate max-w-[140px]">{f.action}</span>
                          <span className="bg-neutral-800 text-neutral-300 px-1 py-0.2 rounded font-bold">{f.method}</span>
                        </div>
                        <div className="text-neutral-400 truncate">
                          Button: <span className="text-white">{f.buttonText}</span>
                        </div>
                        <div className="text-neutral-500 text-[9px] truncate">
                          Fields: {f.fields.join(', ') || 'none'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Run Instructions */}
              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded text-[10px] text-neutral-400 space-y-1.5 mt-auto">
                <div className="font-semibold text-neutral-300">Run Locally:</div>
                <div className="bg-black p-1.5 rounded font-mono text-[9px] text-emerald-400">
                  python server.py
                </div>
                <p className="text-neutral-500 text-[9px]">
                  Requires Python 3.10+ and Flask. Or simply double-click <code>index.html</code>!
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE CONTENT VIEW */}
          <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#05070A]">
            
            {activeTab === 'preview' ? (
              <div className="w-full h-full flex flex-col bg-white">
                <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-1 flex items-center justify-between text-xs font-mono text-neutral-400">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Live Interactive Clone Sandbox (Rendered directly from extracted project source)</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Zero Proxy Overhead</span>
                </div>
                <iframe
                  title="Cloned Website Live Preview"
                  srcDoc={project.html}
                  sandbox="allow-scripts allow-forms allow-same-origin"
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-auto font-mono text-xs p-3 leading-relaxed">
                <div className="min-w-full inline-block">
                  {lines.map((line, idx) => {
                    const isMatch = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());
                    return (
                      <div
                        key={idx}
                        className={`flex py-0.5 group ${
                          isMatch ? 'bg-amber-500/20 text-amber-200' : 'hover:bg-neutral-900/60'
                        }`}
                      >
                        <span className="w-12 text-right pr-4 text-neutral-600 select-none shrink-0 font-mono text-[11px]">
                          {idx + 1}
                        </span>

                        <span
                          className={`flex-1 text-neutral-300 font-mono text-[11px] ${
                            wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                          }`}
                        >
                          {line || ' '}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#0A0E17] border-t border-neutral-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-neutral-400 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-white font-semibold">{activeFilename}</span>
            <span className="text-neutral-500">•</span>
            <span>{lines.length} lines</span>
            <span className="text-neutral-500">•</span>
            <span>{(activeCodeContent.length / 1024).toFixed(1)} KB</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-neutral-500 hidden sm:inline">
              Download ZIP to get the entire project ready to deploy or customize!
            </span>
            <button
              onClick={handleDownloadZip}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download (.ZIP)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
