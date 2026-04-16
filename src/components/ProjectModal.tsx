import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Upload, Download, FileCode, History, Folder, ChevronRight, Copy, FolderOpen } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onImport: () => void;
  onExportJSON: () => void;
  onExportHTML: () => void;
  onRecovery: () => void;
  hasBackups: boolean;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAs,
  onOpen,
  onImport,
  onExportJSON,
  onExportHTML,
  onRecovery,
  hasBackups
}) => {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'save',
      label: 'Save Project',
      description: 'Overwrite current cloud version',
      icon: Save,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      onClick: () => { onSave(); onClose(); }
    },
    {
      id: 'save-as',
      label: 'Save As New',
      description: 'Create a new project copy',
      icon: Copy,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      onClick: () => { onSaveAs(); onClose(); }
    },
    {
      id: 'open',
      label: 'Open Project',
      description: 'Browse your cloud library',
      icon: FolderOpen,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      onClick: () => { onOpen(); onClose(); }
    },
    {
      id: 'import',
      label: 'Import Data',
      description: 'Load project from JSON or HTML',
      icon: Upload,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      onClick: () => { onImport(); onClose(); }
    },
    {
      id: 'json',
      label: 'Export JSON',
      description: 'Download raw project data',
      icon: Download,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      onClick: () => { onExportJSON(); onClose(); }
    },
    {
      id: 'html',
      label: 'Export HTML',
      description: 'Standalone playable version',
      icon: FileCode,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      onClick: () => { onExportHTML(); onClose(); }
    },
    {
      id: 'recovery',
      label: 'Recovery',
      description: 'Restore from local backups',
      icon: History,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      disabled: !hasBackups,
      onClick: () => { onRecovery(); onClose(); }
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Project Management</h2>
                <p className="text-xs text-slate-500">Manage your map data and exports</p>
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
          <div className="p-4 grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={item.disabled}
                className={`w-full group flex items-center gap-4 p-4 rounded-xl transition-all text-left border ${
                  item.disabled 
                    ? 'opacity-40 cursor-not-allowed border-transparent' 
                    : 'hover:bg-slate-800 border-transparent hover:border-slate-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg ${item.bg} flex items-center justify-center ${item.color} shrink-0 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">{item.label}</h3>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                {!item.disabled && (
                  <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-slate-400 transition-colors" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">BubbleMapper v1.51</span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
