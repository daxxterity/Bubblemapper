import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Database, ShieldAlert, Trash2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useMonitor, MonitorEvent } from '../utils/monitor';

export const FirestoreMonitor: React.FC = () => {
  const { events, totalReads, totalWrites, totalErrors, isOpen, toggleOpen, clear } = useMonitor();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-6 w-[450px] h-[500px] bg-[#141414] border border-[#333] shadow-2xl z-[100] flex flex-col font-mono overflow-hidden rounded-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#333] bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">Firestore Monitor v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clear}
            className="p-1 hover:bg-[#333] rounded text-slate-500 transition-colors"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={toggleOpen}
            className="p-1 hover:bg-[#333] rounded text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-px bg-[#333] border-b border-[#333]">
        <div className="bg-[#1a1a1a] p-3 flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 uppercase font-serif italic">Total Reads</span>
          <span className="text-xl font-bold text-blue-400">{totalReads}</span>
        </div>
        <div className="bg-[#1a1a1a] p-3 flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 uppercase font-serif italic">Total Writes</span>
          <span className="text-xl font-bold text-emerald-400">{totalWrites}</span>
        </div>
        <div className="bg-[#1a1a1a] p-3 flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 uppercase font-serif italic">Errors</span>
          <span className="text-xl font-bold text-red-500">{totalErrors}</span>
        </div>
      </div>

      {/* Log Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-3 opacity-50">
            <Database className="w-8 h-8" />
            <span className="text-[10px] uppercase tracking-widest">No activity detected</span>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#333] bg-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[9px] text-slate-500 uppercase tracking-tighter">System Ready</span>
        </div>
        <span className="text-[9px] text-slate-600 uppercase tracking-tighter">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
};

const EventRow: React.FC<{ event: MonitorEvent }> = ({ event }) => {
  const [expanded, setExpanded] = React.useState(false);

  const getOpColor = () => {
    switch (event.operation) {
      case 'READ': return 'text-blue-400';
      case 'WRITE': return 'text-emerald-400';
      case 'DELETE': return 'text-red-400';
      case 'QUERY': return 'text-purple-400';
      case 'AUTH': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'SUCCESS': return 'text-emerald-500';
      case 'ERROR': return 'text-red-500';
      case 'PENDING': return 'text-amber-500 animate-pulse';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="group hover:bg-[#141414] transition-colors">
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`text-[10px] font-bold w-12 shrink-0 ${getOpColor()}`}>
          {event.operation}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-300 truncate font-mono">
            {event.path}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[9px] font-bold uppercase ${getStatusColor()}`}>
              {event.status}
            </span>
            {event.latency && (
              <span className="text-[9px] text-slate-600">
                {event.latency}ms
              </span>
            )}
          </div>
        </div>
        <div className="text-slate-700 group-hover:text-slate-500 transition-colors">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#050505] border-t border-[#1a1a1a]"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Terminal className="w-3 h-3 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[9px] text-slate-600 uppercase block mb-1">Details</span>
                  <pre className="text-[10px] text-slate-400 whitespace-pre-wrap break-all leading-relaxed">
                    {event.details || 'No additional details provided.'}
                  </pre>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-[#1a1a1a]">
                <div>
                  <span className="text-[9px] text-slate-600 uppercase block">Event ID</span>
                  <span className="text-[10px] text-slate-500">{event.id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 uppercase block">Timestamp</span>
                  <span className="text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
