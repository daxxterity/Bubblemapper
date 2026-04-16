import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, Database, AlertTriangle, History, CheckCircle2 } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({ isOpen, onClose }) => {
  const { availableBackups, restoreFromBackup, projectState } = useProject();
  const [restored, setRestored] = React.useState<string | null>(null);

  const handleRestore = (type: 'guest' | 'local') => {
    restoreFromBackup(type);
    setRestored(type);
    setTimeout(() => {
      setRestored(null);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Project Recovery</h2>
                <p className="text-xs text-slate-500">Restore lost data from local backups</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200/80 leading-relaxed">
                If your map disappeared, it might still be stored in your browser's local cache. Restoring a backup will overwrite your current screen.
              </p>
            </div>

            <div className="space-y-3">
              {availableBackups.guest && (
                <button
                  onClick={() => handleRestore('guest')}
                  disabled={!!restored}
                  className="w-full group relative p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-400" />
                      Guest Session Backup
                    </span>
                    {restored === 'guest' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Data from before you signed in</p>
                </button>
              )}

              {availableBackups.local && (
                <button
                  onClick={() => handleRestore('local')}
                  disabled={!!restored}
                  className="w-full group relative p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-400" />
                      Last Cloud Sync Backup
                    </span>
                    {restored === 'local' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Last version successfully loaded from cloud</p>
                </button>
              )}

              {!availableBackups.guest && !availableBackups.local && (
                <div className="py-8 flex flex-col items-center justify-center text-slate-600 gap-3">
                  <Database className="w-12 h-12 opacity-20" />
                  <span className="text-sm">No local backups found in this browser.</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
