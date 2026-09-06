import React, { useState } from 'react';
import { IsolatedSession } from '../types';
import { Layers, Plus, Trash2, Check, Shield, Cookie, RefreshCw, X } from 'lucide-react';

interface SessionManagerModalProps {
  sessions: IsolatedSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (name: string, color: string) => void;
  onDeleteSession: (id: string) => void;
  onClearSessionStorage: (id: string) => void;
  onClose: () => void;
}

const COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6'  // Purple
];

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onClearSessionStorage,
  onClose
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[1]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      onCreateSession(newSessionName.trim(), selectedColor);
      setNewSessionName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E293B] border border-slate-700 rounded-lg w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Isolated Browser Sessions</h3>
              <p className="text-xs text-slate-400">Every session maintains quarantined cookies, cache, and auth tokens</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-[#0F172A]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">Active Sandbox Profiles</div>

          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                className={`p-3.5 rounded-md border transition-all flex items-center justify-between ${
                  isActive 
                    ? 'bg-[#1E293B] border-sky-500 shadow-md ring-1 ring-sky-500/30' 
                    : 'bg-[#1E293B]/60 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span 
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-700 shrink-0" 
                    style={{ backgroundColor: sess.color }}
                  ></span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white">{sess.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-mono font-semibold">
                          Active Envelope
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2 font-mono">
                      <span>Cookies: {Object.keys(sess.cookies).length}</span>
                      <span>&bull;</span>
                      <span>Storage: {Object.keys(sess.localStorageData).length} keys</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onClearSessionStorage(sess.id)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors flex items-center space-x-1 cursor-pointer border border-slate-700"
                    title="Purge cookies and storage for this profile"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Purge</span>
                  </button>

                  {!isActive ? (
                    <button
                      onClick={() => {
                        onSelectSession(sess.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      Switch
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 text-xs text-sky-400 font-mono font-semibold flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>Loaded</span>
                    </span>
                  )}

                  {sessions.length > 1 && (
                    <button
                      onClick={() => onDeleteSession(sess.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* New Profile Section */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 border border-dashed border-slate-700 hover:border-sky-500 rounded-md text-slate-400 hover:text-sky-400 text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer mt-2 bg-[#1E293B]/40"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Isolated Profile</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 bg-[#1E293B] border border-slate-700 rounded-md space-y-3 mt-2">
              <span className="text-xs font-semibold text-white block">New Profile Configuration</span>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="e.g. Incognito Sandbox or Secondary Tenant"
                required
                autoFocus
                className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 font-mono">Color Tag:</span>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 cursor-pointer border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-500 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#1E293B] border-t border-slate-700 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span>State isolation enforced across all envelopes</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono font-semibold cursor-pointer border border-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
