import React from 'react';
import { DomMutationEvent } from '../types';
import { Activity, Clock, FileCode, MousePointer, Edit3, CheckCircle, Navigation } from 'lucide-react';

interface MutationLoggerProps {
  events: DomMutationEvent[];
  onClear: () => void;
}

export const MutationLogger: React.FC<MutationLoggerProps> = ({ events, onClear }) => {
  const getReasonBadge = (reason: DomMutationEvent['reason']) => {
    switch (reason) {
      case 'submit':
        return {
          icon: <CheckCircle className="w-3 h-3 text-emerald-400" />,
          label: 'Form Submit',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'input':
        return {
          icon: <Edit3 className="w-3 h-3 text-cyan-400" />,
          label: 'Keystroke Input',
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        };
      case 'click':
        return {
          icon: <MousePointer className="w-3 h-3 text-indigo-400" />,
          label: 'User Click',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        };
      case 'navigation':
        return {
          icon: <Navigation className="w-3 h-3 text-amber-400" />,
          label: 'Route Change',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'initial':
        return {
          icon: <Activity className="w-3 h-3 text-purple-400" />,
          label: 'Page Loaded',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        };
      case 'mutation':
      default:
        return {
          icon: <Activity className="w-3 h-3 text-rose-400" />,
          label: 'DOM Mutation',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#010409] text-xs font-mono">
      {/* Top Controls */}
      <div className="px-4 py-2 bg-[#0d1117] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">Real-Time Mutation Audit Log</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">
            {events.length} events
          </span>
        </div>

        <button
          onClick={onClear}
          className="text-[10px] text-slate-400 hover:text-sky-400 transition-colors cursor-pointer font-mono"
        >
          Clear History
        </button>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#010409]">
        {events.length === 0 ? (
          <div className="text-center py-12 text-slate-500 italic">
            No DOM mutations captured yet. Interact with the website on the left side (type in an input, click a button, or log in) to stream live events.
          </div>
        ) : (
          events.map((evt) => {
            const badge = getReasonBadge(evt.reason);
            const timeStr = new Date(evt.timestamp).toLocaleTimeString();

            return (
              <div
                key={evt.id}
                className="p-3 bg-[#0d1117] border border-slate-800 rounded hover:border-slate-700 transition-all flex items-start justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <span className={`px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1.5 shrink-0 ${badge.bg}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>

                  <div>
                    <div className="text-slate-200 font-sans text-xs font-medium">
                      {evt.summary}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-3 font-mono">
                      <span>Title: <strong className="text-slate-300">{evt.title}</strong></span>
                      <span>&bull;</span>
                      <span>Total Nodes: <strong className="text-sky-400">{evt.nodeCount}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 shrink-0 flex items-center space-x-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
