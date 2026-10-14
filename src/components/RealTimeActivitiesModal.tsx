import React, { useState, useMemo } from 'react';
import {
  X,
  Activity,
  Play,
  Pause,
  Trash2,
  Download,
  Search,
  Globe,
  Radio,
  MousePointer,
  Send,
  Cookie,
  Layers
} from 'lucide-react';
import { RealTimeActivity } from '../types';

interface RealTimeActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: RealTimeActivity[];
  onClearActivities: () => void;
  currentUrl: string;
}

type ActivityCategory = 'all' | 'network' | 'dom' | 'interaction' | 'form' | 'storage';

export const RealTimeActivitiesModal: React.FC<RealTimeActivitiesModalProps> = ({
  isOpen,
  onClose,
  activities,
  onClearActivities,
  currentUrl
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<RealTimeActivity | null>(null);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedCategory !== 'all' && act.category !== selectedCategory) {
        return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          act.title.toLowerCase().includes(q) ||
          act.detail.toLowerCase().includes(q) ||
          (act.url && act.url.toLowerCase().includes(q)) ||
          (act.selector && act.selector.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activities, selectedCategory, searchFilter]);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `xbrowse-activities-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'network':
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case 'dom':
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      case 'interaction':
        return <MousePointer className="w-3.5 h-3.5 text-amber-400" />;
      case 'form':
        return <Send className="w-3.5 h-3.5 text-emerald-400" />;
      case 'storage':
        return <Cookie className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'network':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'dom':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'interaction':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'form':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'storage':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-[#0A0D14] border border-neutral-800 rounded-xl w-full max-w-5xl h-[88vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden font-sans text-neutral-200">
        
        {/* HEADER */}
        <div className="bg-[#0F141F] border-b border-neutral-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Real-Time Activities Monitor
                </h2>
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                  <span>{isPaused ? 'PAUSED' : 'LIVE STREAM'}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md mt-0.5 font-mono">
                {currentUrl || 'Tracking browser events'}
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              }`}
              title={isPaused ? 'Resume live recording' : 'Pause recording'}
            >
              {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={onClearActivities}
              className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              title="Clear all activity history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleExportJson}
              className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              title="Export activities as JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer ml-1"
              title="Close Monitor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="bg-[#0C0F17] border-b border-neutral-800 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 shrink-0 text-xs font-mono">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-neutral-700 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              All ({activities.length})
            </button>

            <button
              onClick={() => setSelectedCategory('network')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
                selectedCategory === 'network'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-sky-300 hover:bg-neutral-800/60'
              }`}
            >
              <Globe className="w-3 h-3 text-sky-400" />
              <span>Network</span>
            </button>

            <button
              onClick={() => setSelectedCategory('dom')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
                selectedCategory === 'dom'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-purple-300 hover:bg-neutral-800/60'
              }`}
            >
              <Layers className="w-3 h-3 text-purple-400" />
              <span>DOM Mutations</span>
            </button>

            <button
              onClick={() => setSelectedCategory('interaction')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
                selectedCategory === 'interaction'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/60'
              }`}
            >
              <MousePointer className="w-3 h-3 text-amber-400" />
              <span>User Clicks</span>
            </button>

            <button
              onClick={() => setSelectedCategory('form')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
                selectedCategory === 'form'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800/60'
              }`}
            >
              <Send className="w-3 h-3 text-emerald-400" />
              <span>Forms & Submit</span>
            </button>

            <button
              onClick={() => setSelectedCategory('storage')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
                selectedCategory === 'storage'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-rose-300 hover:bg-neutral-800/60'
              }`}
            >
              <Cookie className="w-3 h-3 text-rose-400" />
              <span>Cookies & Storage</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center shrink-0">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-2.5 pl-8 py-1 text-xs font-mono text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 w-48"
            />
          </div>
        </div>

        {/* ACTIVITIES STREAM BODY */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 font-mono text-xs">
            {filteredActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                <Radio className="w-8 h-8 text-neutral-600 mb-2 animate-pulse" />
                <p className="text-xs">Waiting for real-time browser activities...</p>
                <p className="text-[11px] text-neutral-600 mt-1 max-w-sm">
                  Click links, submit forms, or type queries in xbrowse to see live streaming logs here.
                </p>
              </div>
            ) : (
              filteredActivities.map((act) => {
                const isSelected = selectedActivity?.id === act.id;
                const date = new Date(act.timestamp);
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivity(act)}
                    className={`p-3 flex items-start space-x-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800/80 border-l-2 border-sky-400'
                        : 'hover:bg-neutral-900/60'
                    }`}
                  >
                    <span className="text-[10px] text-neutral-500 select-none pt-0.5 shrink-0 w-16">
                      {timeStr}
                    </span>

                    <div className="pt-0.5 shrink-0">
                      {getCategoryIcon(act.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-semibold ${getCategoryBadgeClass(act.category)}`}>
                          {act.category}
                        </span>
                        {act.method && (
                          <span className="text-[9px] font-bold text-neutral-300 bg-neutral-800 px-1.5 py-0.2 rounded">
                            {act.method}
                          </span>
                        )}
                        {act.status && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded">
                            {act.status}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-white truncate">
                          {act.title}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400 mt-1 truncate">
                        {act.detail}
                      </p>

                      {act.url && (
                        <div className="text-[10px] text-sky-400/80 truncate mt-0.5">
                          🔗 {act.url}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* INSPECTOR DETAILS SIDEBAR */}
          {selectedActivity && (
            <div className="w-80 bg-[#0C0F17] border-l border-neutral-800 p-4 overflow-y-auto shrink-0 font-mono text-xs flex flex-col space-y-3 animate-in slide-in-from-right">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-white text-xs">Activity Details</span>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="text-neutral-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <span className="text-neutral-500 text-[10px] uppercase">Title</span>
                <div className="text-white font-semibold mt-0.5">{selectedActivity.title}</div>
              </div>

              <div>
                <span className="text-neutral-500 text-[10px] uppercase">Category</span>
                <div className="mt-0.5">
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-semibold ${getCategoryBadgeClass(selectedActivity.category)}`}>
                    {selectedActivity.category}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-neutral-500 text-[10px] uppercase">Timestamp</span>
                <div className="text-neutral-300 mt-0.5">{new Date(selectedActivity.timestamp).toLocaleString()}</div>
              </div>

              {selectedActivity.url && (
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase">Target URL</span>
                  <div className="text-sky-400 break-all mt-0.5 bg-neutral-900/60 p-2 rounded border border-neutral-800 text-[10px]">
                    {selectedActivity.url}
                  </div>
                </div>
              )}

              {selectedActivity.selector && (
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase">Element Selector</span>
                  <div className="text-amber-300 break-all mt-0.5 bg-neutral-900/60 p-2 rounded border border-neutral-800 text-[10px]">
                    {selectedActivity.selector}
                  </div>
                </div>
              )}

              <div>
                <span className="text-neutral-500 text-[10px] uppercase">Full Description</span>
                <div className="text-neutral-300 whitespace-pre-wrap break-all mt-0.5 bg-neutral-900/60 p-2 rounded border border-neutral-800 text-[10px]">
                  {selectedActivity.detail}
                </div>
              </div>

              {selectedActivity.dataSnippet && (
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase">Payload / Data Snippet</span>
                  <pre className="text-emerald-300 whitespace-pre-wrap break-all mt-0.5 bg-black p-2 rounded border border-neutral-800 text-[10px] max-h-48 overflow-y-auto">
                    {selectedActivity.dataSnippet}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-[#0A0E17] border-t border-neutral-800 px-4 py-2 flex items-center justify-between text-xs font-mono text-neutral-400 shrink-0">
          <div>
            Showing <span className="text-white font-semibold">{filteredActivities.length}</span> of {activities.length} total events
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-neutral-500">Live stream updates in real-time</span>
          </div>
        </div>

      </div>
    </div>
  );
};
