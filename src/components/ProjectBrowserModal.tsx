import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, FileText, Clock, ChevronRight, Plus, FolderOpen, Trash2 } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { ProjectState } from '../types';

interface ProjectBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
}

export const ProjectBrowserModal: React.FC<ProjectBrowserModalProps> = ({ isOpen, onClose, onNewProject }) => {
  const { listProjects, loadProject, deleteProject, currentProjectId } = useProject();
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    const data = await listProjects();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await deleteProject(projectId);
      await fetchProjects();
    }
  };

  const filteredProjects = projects.filter(p => 
    (p.name || 'Untitled').toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Open Project</h2>
                <p className="text-xs text-slate-500">Select a project from your cloud library</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Actions */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button 
              onClick={() => { onNewProject(); onClose(); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4 content-start custom-scrollbar">
            {loading ? (
              <div className="col-span-full h-full flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-600 gap-3 py-20">
                <FileText className="w-12 h-12 opacity-20" />
                <span className="text-sm">No projects found</span>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => { loadProject(project.id!); onClose(); }}
                  className={`w-full group flex items-center gap-4 p-4 rounded-xl transition-all text-left border cursor-pointer ${
                    currentProjectId === project.id 
                      ? 'bg-blue-600/10 border-blue-500/50' 
                      : 'hover:bg-slate-800 border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    currentProjectId === project.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{project.name || 'Untitled Project'}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(project as any).updatedAt ? new Date((project as any).updatedAt).toLocaleDateString() : 'Unknown date'}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                        {project.nodes.length} Nodes
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentProjectId === project.id ? (
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-1 rounded">Active</span>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-slate-400 transition-colors" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, project.id!)}
                      className="p-2 hover:bg-red-500/10 text-slate-700 hover:text-red-500 rounded-lg transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
              {filteredProjects.length} Projects Available
            </span>
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
