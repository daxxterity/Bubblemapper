import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { throttle } from 'lodash';
import { Plus, Play, Save, Trash2, Image as ImageIcon, Link as LinkIcon, Settings2, Layout, MousePointer2, Upload, X as CloseIcon, AlertCircle, RotateCcw, Download, FileCode, Gamepad2, Gem, Trophy, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle, Zap, GripVertical, Clock, Hand, Activity, History, Folder } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Editor, EditorRef } from './components/Editor';
import { PlayMode } from './components/PlayMode';
import { NodeEditor } from './components/NodeEditor';
import { RecoveryModal } from './components/RecoveryModal';
import { ProjectModal } from './components/ProjectModal';
import { ProjectBrowserModal } from './components/ProjectBrowserModal';
import { NameModal } from './components/NameModal';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { NodeData, Connection, ProjectState, INITIAL_STATE, TemplateType, Choice, NodeType, Tip, TipType } from './types';
import { generateHTML } from './utils/exportTemplate';
import { FirestoreMonitor } from './components/FirestoreMonitor';
import { useMonitor } from './utils/monitor';
import { useProject } from './contexts/ProjectContext';
import { signIn, signOut } from './firebase';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

// Helper to handle Google Drive links and other common image issues
const getProcessedImageUrl = (url: string) => {
  if (!url) return 'https://picsum.photos/seed/placeholder/800/600';
  
  // Handle Google Drive links by converting to direct download/thumbnail links
  // We use the thumbnail endpoint as it's the most reliable for embedding in web apps
  const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([^\/&?]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
  }
  
  return url;
};

const ImageCarousel = ({ urls }: { urls: string[] }) => {
  const [index, setIndex] = useState(0);

  if (urls.length === 0) return null;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % urls.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group">
      <AnimatePresence mode="wait">
        <motion.img 
          key={index}
          src={getProcessedImageUrl(urls[index])} 
          alt={`Preview ${index + 1}`} 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/800/600';
          }}
        />
      </AnimatePresence>
      
      {urls.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-slate-900/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-slate-900/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {urls.map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-1 rounded-full transition-all ${i === index ? 'bg-white w-3' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
      
      <div className="absolute top-2 right-2 bg-slate-900/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400 border border-slate-700">
        {index + 1} / {urls.length}
      </div>
    </div>
  );
};

export default function App() {
  const { user, loading, projectState, saveProject, isAuthReady, availableBackups, createProject, currentProjectId, resetProject } = useProject();
  const [state, setState] = useState<ProjectState>(projectState);
  const [isExtrasFullscreen, setIsExtrasFullscreen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectBrowserOpen, setIsProjectBrowserOpen] = useState(false);
  const [nameModalConfig, setNameModalConfig] = useState<{ isOpen: boolean; title: string; defaultValue: string; onConfirm: (name: string) => void } | null>(null);
  
  // Sync local state when Firebase state changes (e.g., initial load or remote update)
  const lastProjectStateId = useRef<string | null>(null);
  useEffect(() => {
    if (isAuthReady && projectState.id !== lastProjectStateId.current) {
      setState(projectState);
      lastProjectStateId.current = projectState.id || null;
    }
  }, [projectState, isAuthReady]);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Clear selection when project changes
  useEffect(() => {
    setSelectedNodeIds([]);
  }, [projectState.id]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayNodeId, setCurrentPlayNodeId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ nodeId: string, choiceId: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savePassword, setSavePassword] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isAddNodeDropdownOpen, setIsAddNodeDropdownOpen] = useState(false);
  const editorRef = useRef<EditorRef>(null);
  const { toggleOpen: toggleMonitor, isOpen: isMonitorOpen } = useMonitor();

  const handleSaveAs = () => {
    setNameModalConfig({
      isOpen: true,
      title: 'Save Project As',
      defaultValue: `${state.name || 'Untitled'} (Copy)`,
      onConfirm: async (name) => {
        await createProject(name, state);
      }
    });
  };

  const handleNewProject = () => {
    setNameModalConfig({
      isOpen: true,
      title: 'New Project',
      defaultValue: 'My New Project',
      onConfirm: async (name) => {
        await createProject(name);
      }
    });
  };

  const handleDuplicateSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    
    const newNodes: NodeData[] = [];
    const idMap = new Map<string, string>();
    
    selectedNodeIds.forEach(id => {
      const node = state.nodes.find(n => n.id === id);
      if (node) {
        const newId = uuidv4();
        idMap.set(id, newId);
        newNodes.push({
          ...node,
          id: newId,
          x: node.x + 40,
          y: node.y + 40,
          choices: node.choices.map(c => ({ ...c, id: uuidv4(), targetNodeId: null }))
        });
      }
    });
    
    setState(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes]
    }));
    setSelectedNodeIds(newNodes.map(n => n.id));
  }, [selectedNodeIds, state.nodes]);

  const handleDeleteSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => !selectedNodeIds.includes(n.id)),
      connections: prev.connections.filter(c => 
        !selectedNodeIds.includes(c.fromNodeId) && !selectedNodeIds.includes(c.toNodeId)
      )
    }));
    setSelectedNodeIds([]);
  }, [selectedNodeIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingConnection) setPendingConnection(null);
        if (isImportModalOpen) setIsImportModalOpen(false);
      }
      
      // Delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
        // Check if we're not in an input/textarea
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          handleDeleteSelectedNodes();
        }
      }

      // Duplicate selected nodes (Cmd/Ctrl + D)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedNodeIds.length > 0) {
        e.preventDefault();
        handleDuplicateSelectedNodes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingConnection, isImportModalOpen, selectedNodeIds, handleDeleteSelectedNodes, handleDuplicateSelectedNodes]);

  const handleSave = async () => {
    if (savePassword === 'runneth') {
      await saveProject(state);
      setIsSaveModalOpen(false);
      setSavePassword('');
      setSaveError(null);
    } else {
      setSaveError('Incorrect password');
    }
  };

  const handleMouseMove = useCallback((e: any) => {
    // We no longer track mousePos here for performance
    // Editor handles it internally for pending connections
  }, []);

  const handleAddNode = (x?: number, y?: number, type: NodeType = NodeType.STORY) => {
    let finalX = x;
    let finalY = y;

    if (finalX === undefined || finalY === undefined) {
      const center = editorRef.current?.getViewportCenter() || { x: 300, y: 200 };
      finalX = center.x - 100; // Center the node (width is 200)
      finalY = center.y - 60;  // Center the node (height is 120)
    }

    const title = type === NodeType.BACK ? 'Back / Return' : 
                 type === NodeType.LEVEL ? 'New Level' : 
                 type === NodeType.ARTEFACT ? 'New Artefact' :
                 type === NodeType.SUCCESS ? 'Success Screen' : 
                 type === NodeType.THUMBNAIL ? 'New Thumbnail' : 'New Screen';

    const newNode: NodeData = {
      id: uuidv4(),
      type,
      title,
      screenID: title,
      content: type === NodeType.BACK 
        ? 'Automatically returns to the previous screen in history.' 
        : type === NodeType.LEVEL ? 'Game level description...' : 
          type === NodeType.ARTEFACT ? 'Artefact description...' :
          type === NodeType.SUCCESS ? 'Victory message!' : 
          type === NodeType.THUMBNAIL ? '' : 'Enter description here...',
      imageUrl: type === NodeType.BACK ? '' : 'https://picsum.photos/seed/' + Math.random() + '/800/600',
      imageUrls: type === NodeType.BACK ? [] : ['https://picsum.photos/seed/' + Math.random() + '/800/600'],
      tips: [],
      choices: type === NodeType.BACK ? [] : [
        { id: uuidv4(), label: type === NodeType.LEVEL ? 'Complete Level' : 
                               type === NodeType.SUCCESS ? 'Restart' : 'Next', targetNodeId: null }
      ],
      template: TemplateType.TOP_IMAGE,
      color: type === NodeType.BACK ? '#7c3aed' : 
             type === NodeType.LEVEL ? '#10b981' : 
             type === NodeType.ARTEFACT ? '#f59e0b' :
             type === NodeType.SUCCESS ? '#ef4444' : 
             type === NodeType.THUMBNAIL ? '#3b82f6' : '#3b82f6',
      aspectRatio: type === NodeType.THUMBNAIL ? '3:4' : undefined,
      x: finalX,
      y: finalY,
    };

    if (pendingConnection) {
      const newConnection: Connection = {
        id: uuidv4(),
        fromNodeId: pendingConnection.nodeId,
        choiceId: pendingConnection.choiceId,
        toNodeId: newNode.id,
      };

      setState(prev => {
        const filteredConnections = prev.connections.filter(c => 
          !(c.fromNodeId === pendingConnection.nodeId && c.choiceId === pendingConnection.choiceId)
        );
        
        const updatedNodes = prev.nodes.map(n => {
          if (n.id === pendingConnection.nodeId) {
            return {
              ...n,
              choices: n.choices.map(c => c.id === pendingConnection.choiceId ? { ...c, targetNodeId: newNode.id } : c)
            };
          }
          return n;
        });

        return {
          ...prev,
          nodes: [...updatedNodes, newNode],
          connections: [...filteredConnections, newConnection]
        };
      });
      setPendingConnection(null);
    } else {
      setState(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    }
    
    setSelectedNodeIds([newNode.id]);
  };

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setState(prev => {
      const node = prev.nodes.find(n => n.id === id);
      if (!node) return prev;
      
      const dx = x - node.x;
      const dy = y - node.y;

      if (selectedNodeIds.includes(id)) {
        return {
          ...prev,
          nodes: prev.nodes.map(n => 
            selectedNodeIds.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
          )
        };
      }

      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === id ? { ...n, x, y } : n)
      };
    });
  }, [selectedNodeIds]);

  // Throttled version for smooth dragging
  const throttledNodeMove = useMemo(
    () => throttle(handleNodeMove, 16, { leading: true, trailing: true }),
    [handleNodeMove]
  );

  const handleUpdateNode = (id: string, updates: Partial<NodeData>) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));
  };

  const handleDeleteNode = (id: string) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      connections: prev.connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id)
    }));
    setSelectedNodeIds(prev => prev.filter(nodeId => nodeId !== id));
  };

  const handleStartConnection = (nodeId: string, choiceId: string) => {
    setPendingConnection({ nodeId, choiceId });
  };

  const handleNodeSelect = (nodeOrIds: string | string[] | undefined, shiftKey: boolean = false) => {
    if (!nodeOrIds) {
      setSelectedNodeIds([]);
      return;
    }

    if (Array.isArray(nodeOrIds)) {
      if (shiftKey) {
        setSelectedNodeIds(prev => {
          const newIds = [...prev];
          nodeOrIds.forEach(id => {
            if (!newIds.includes(id)) newIds.push(id);
          });
          return newIds;
        });
      } else {
        setSelectedNodeIds(nodeOrIds);
      }
      return;
    }

    const nodeId = nodeOrIds;
    if (shiftKey) {
      setSelectedNodeIds(prev => 
        prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
      );
    } else {
      setSelectedNodeIds(prev => prev.includes(nodeId) ? prev : [nodeId]);
    }
  };

  const handleEndConnection = (toNodeId: string) => {
    if (!pendingConnection || pendingConnection.nodeId === toNodeId) {
      setPendingConnection(null);
      return;
    }

    const newConnection: Connection = {
      id: uuidv4(),
      fromNodeId: pendingConnection.nodeId,
      choiceId: pendingConnection.choiceId,
      toNodeId: toNodeId,
    };

    setState(prev => {
      // Remove existing connection for this choice
      const filteredConnections = prev.connections.filter(c => 
        !(c.fromNodeId === pendingConnection.nodeId && c.choiceId === pendingConnection.choiceId)
      );
      
      // Update node choice target
      const updatedNodes = prev.nodes.map(n => {
        if (n.id === pendingConnection.nodeId) {
          return {
            ...n,
            choices: n.choices.map(c => c.id === pendingConnection.choiceId ? { ...c, targetNodeId: toNodeId } : c)
          };
        }
        return n;
      });

      return {
        ...prev,
        nodes: updatedNodes,
        connections: [...filteredConnections, newConnection]
      };
    });

    setPendingConnection(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `bubblemapper-project-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportHTML = () => {
    const htmlContent = generateHTML(state);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `bubblemapper-play-flow-${new Date().toISOString().split('T')[0]}.html`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    URL.revokeObjectURL(url);
  };

  const handleImport = (textToImport?: string) => {
    const source = textToImport || importText;
    setImportError(null);
    try {
      let storyData: any = null;
      
      // Try parsing as raw JSON first
      try {
        storyData = JSON.parse(source);
      } catch (e) {
        // Try extracting from HTML script tag
        // We look for the storyData assignment. We use a more flexible regex.
        const match = source.match(/const\s+storyData\s*=\s*({[\s\S]*?});/);
        if (match) {
          const objectStr = match[1];
          try {
            // Use Function constructor to safely evaluate the JS object string.
            // This handles single quotes, hex escapes (\x20), and unquoted keys.
            storyData = new Function(`return ${objectStr}`)();
          } catch (evalErr) {
            console.error("Eval error:", evalErr);
            throw new Error("Found storyData but could not parse the format. Ensure it's a valid JavaScript object.");
          }
        }
      }

      if (!storyData || !storyData.nodes) {
        throw new Error("Could not find valid story data. Please paste the full HTML or the storyData object.");
      }

      // Check if it's our native format (has 'title' or 'choices' instead of 'label' or 'outputs')
      const isNativeFormat = Array.isArray(storyData.nodes) && storyData.nodes.length > 0 && 
                            (storyData.nodes[0].title !== undefined || storyData.nodes[0].choices !== undefined);

      if (isNativeFormat) {
        // Native format import - preserve as much as possible
        const newNodes: NodeData[] = storyData.nodes.map((sn: any) => ({
          id: sn.id || uuidv4(),
          type: sn.type || NodeType.STORY,
          title: sn.title || 'Untitled',
          screenID: sn.screenID || sn.title || 'Untitled',
          content: sn.content || '',
          imageUrl: sn.imageUrl || '',
          imageUrls: Array.isArray(sn.imageUrls) ? sn.imageUrls : (sn.imageUrl ? [sn.imageUrl] : []),
          tips: Array.isArray(sn.tips) ? sn.tips : [],
          template: sn.template || TemplateType.SIDE_IMAGE,
          color: sn.color,
          choices: (sn.choices || []).map((c: any) => ({
            id: c.id || uuidv4(),
            label: c.label || 'Choice',
            targetNodeId: c.targetNodeId || null
          })),
          x: typeof sn.x === 'number' ? sn.x : 100,
          y: typeof sn.y === 'number' ? sn.y : 100,
        }));

        setState({
          nodes: newNodes,
          connections: Array.isArray(storyData.connections) ? storyData.connections : []
        });
        setIsImportModalOpen(false);
        setImportText('');
        return;
      }

      // Legacy format mapping (for importing from other tools or old exports)
      const newNodes: NodeData[] = [];
      const nodeMap = new Map<string, NodeData>();
      
      // Filter out 'start' node
      const sourceNodes = storyData.nodes.filter((n: any) => n.type !== 'start');
      
      sourceNodes.forEach((sn: any, index: number) => {
        const node: NodeData = {
          id: sn.id || uuidv4(),
          type: NodeType.STORY,
          title: (sn.label || 'Untitled').replace(/^##\s*/, ''),
          screenID: (sn.label || 'Untitled').replace(/^##\s*/, ''),
          content: sn.content?.text || '',
          imageUrl: sn.content?.background || '',
          imageUrls: sn.content?.background ? [sn.content.background] : [],
          tips: [],
          template: TemplateType.SIDE_IMAGE,
          choices: (sn.outputs || []).map((out: any) => ({
            id: out.id || uuidv4(),
            label: out.label || 'Choice',
            targetNodeId: null
          })),
          x: (index % 4) * 300 + 100,
          y: Math.floor(index / 4) * 250 + 100,
        };
        newNodes.push(node);
        nodeMap.set(node.id, node);
      });

      const newConnections: Connection[] = [];
      (storyData.connections || []).forEach((sc: any) => {
        if (sc.from === 'start') return;

        const fromNode = nodeMap.get(sc.from);
        const toNode = nodeMap.get(sc.to);
        
        if (fromNode && toNode) {
          const choice = fromNode.choices[sc.fromOutput];
          if (choice) {
            choice.targetNodeId = toNode.id;
            newConnections.push({
              id: sc.id || uuidv4(),
              fromNodeId: fromNode.id,
              choiceId: choice.id,
              toNodeId: toNode.id
            });
          }
        }
      });

      if (newNodes.length === 0) {
        throw new Error("No valid screens found in the data.");
      }

      setState({
        nodes: newNodes,
        connections: newConnections
      });
      setIsImportModalOpen(false);
      setImportText('');
    } catch (err: any) {
      setImportError(err.message || "Failed to parse data. Please check the format.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleImport(content);
    };
    reader.onerror = () => {
      setImportError("Failed to read the file.");
    };
    reader.readAsText(file);
  };

  const selectedNode = selectedNodeIds.length === 1 ? state.nodes.find(n => n.id === selectedNodeIds[0]) : undefined;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">BubbleMapper</h1>
            <p className="text-xs text-slate-500 font-mono">Sitemap Editor v1.51</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all border border-slate-700 shadow-lg font-medium group"
            title="Project Menu"
          >
            <Folder className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Project</span>
          </button>

          <div className="w-px h-6 bg-slate-800 mx-2" />
          
          <button 
            onClick={toggleMonitor}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border font-medium ${
              isMonitorOpen 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
            title="Toggle Firestore Monitor"
          >
            <Activity className="w-4 h-4" />
            <span>Monitor</span>
          </button>

          <div className="w-px h-6 bg-slate-800 mx-2" />
          
          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-800/50 pl-2 pr-1 py-1 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full border border-slate-600" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-300 hidden lg:block">{user.displayName?.split(' ')[0]}</span>
                </div>
                <button 
                  onClick={() => signOut()}
                  className="p-1.5 hover:bg-slate-700 rounded-md text-slate-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={async () => {
                  try {
                    await signIn();
                  } catch (err) {
                    console.error("Failed to sign in:", err);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 text-slate-300"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-slate-800 mx-2" />
          
          {/* Add Node Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsAddNodeDropdownOpen(!isAddNodeDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20 font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Node</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddNodeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isAddNodeDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsAddNodeDropdownOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-1.5 space-y-1">
                      <button 
                        onClick={() => {
                          handleAddNode(undefined, undefined, NodeType.STORY);
                          setIsAddNodeDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 group"
                      >
                        <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold">Screen</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Standard Story Page</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          handleAddNode(undefined, undefined, NodeType.LEVEL);
                          setIsAddNodeDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 group"
                      >
                        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
                          <Gamepad2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold">Level</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Game Gameplay Screen</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          handleAddNode(undefined, undefined, NodeType.ARTEFACT);
                          setIsAddNodeDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 group"
                      >
                        <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20">
                          <Gem className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold">Artefact</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Item Discovery Screen</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          handleAddNode(undefined, undefined, NodeType.SUCCESS);
                          setIsAddNodeDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 group"
                      >
                        <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold">Success</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Victory / Goal Reached</span>
                        </div>
                      </button>

                      <div className="h-px bg-slate-800 mx-2 my-1" />

                      <button 
                        onClick={() => {
                          handleAddNode(undefined, undefined, NodeType.BACK);
                          setIsAddNodeDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 group"
                      >
                        <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold">Back Node</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Return to Previous</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-slate-800 mx-2" />
          <button 
            onClick={() => {
              if (state.nodes.length > 0) {
                // Start from selected node if available, otherwise from the first node
                const startNodeId = selectedNodeIds[0] || state.nodes[0].id;
                setCurrentPlayNodeId(startNodeId);
                setIsPlaying(true);
              }
            }}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20 font-medium"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Flow</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Canvas Area */}
        <div className="flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
          <Editor 
            ref={editorRef}
            nodes={state.nodes}
            connections={state.connections}
            onNodeMove={throttledNodeMove}
            onNodeSelect={(nodeOrIds, shiftKey) => {
              if (Array.isArray(nodeOrIds)) {
                handleNodeSelect(nodeOrIds, shiftKey);
              } else {
                handleNodeSelect(nodeOrIds?.id, shiftKey);
              }
            }}
            onStartConnection={handleStartConnection}
            onEndConnection={handleEndConnection}
            selectedNodeIds={selectedNodeIds}
            pendingConnection={pendingConnection}
            onMouseMove={handleMouseMove}
            onStageClick={(x, y) => handleAddNode(x, y)}
          />
        </div>

        {/* Context Window (Floating Modal) */}
        <div className="absolute top-6 right-6 z-30 flex flex-col pointer-events-none">
          {selectedNodeIds.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl pointer-events-auto p-3 mb-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold">
                  {selectedNodeIds.length}
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Nodes Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDuplicateSelectedNodes}
                  className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors rounded hover:bg-blue-500/10"
                  title="Duplicate selected (Ctrl+D)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleDeleteSelectedNodes}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                  title="Delete selected (Del)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={false}
            animate={{ 
              width: selectedNodeIds.length === 1 ? 340 : 200,
              height: selectedNodeIds.length === 1 ? 'calc(100vh - 120px)' : 48
            }}
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
          >
            {/* Header / Bar */}
            <div 
              className={`h-12 px-4 flex items-center justify-between border-b transition-colors ${
                selectedNodeIds.length === 1 ? 'border-slate-700 bg-slate-800/50' : 'border-transparent bg-transparent'
              }`}
            >
                <div className="flex items-center gap-2">
                  {selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.BACK ? (
                    <RotateCcw className="w-4 h-4 text-purple-400" />
                  ) : selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.LEVEL ? (
                    <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  ) : selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.ARTEFACT ? (
                    <Gem className="w-4 h-4 text-amber-400" />
                  ) : selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.SUCCESS ? (
                    <Trophy className="w-4 h-4 text-red-400" />
                  ) : (
                    <Settings2 className={`w-4 h-4 ${selectedNodeIds.length === 1 ? 'text-blue-400' : 'text-slate-500'}`} />
                  )}
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    {selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.BACK ? 'Back Node' : 
                     selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.LEVEL ? 'Level Node' : 
                     selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.ARTEFACT ? 'Artefact Node' :
                     selectedNodeIds.length === 1 && state.nodes.find(n => n.id === selectedNodeIds[0])?.type === NodeType.SUCCESS ? 'Success Node' : 
                     selectedNodeIds.length > 1 ? 'Multi-Selection' : 'Context Window'}
                  </span>
                </div>
              {selectedNodeIds.length === 1 && (
                <button 
                  onClick={() => handleDeleteNode(selectedNodeIds[0])}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div 
                  key={selectedNode.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  <NodeEditor 
                    selectedNode={selectedNode}
                    onUpdateNode={handleUpdateNode}
                    onDeleteNode={handleDeleteNode}
                    onFullscreenToggle={() => setIsExtrasFullscreen(true)}
                    hideHeader={true}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center p-8 text-center"
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto border border-slate-700/50">
                      <MousePointer2 className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">No Screen Selected</h3>
                      <p className="text-[10px] text-slate-600 leading-relaxed uppercase tracking-wider">
                        Select a screen on the canvas to edit its properties
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      <FirestoreMonitor />

      {/* Save Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Save className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Save Project</h2>
                </div>
                <button 
                  onClick={() => {
                    setIsSaveModalOpen(false);
                    setSavePassword('');
                    setSaveError(null);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-slate-400 text-sm">
                  Enter the password to save your changes and overwrite the previous version.
                </p>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <input 
                    type="password"
                    value={savePassword}
                    onChange={(e) => setSavePassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                    placeholder="Enter password..."
                  />
                  {saveError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs mt-2 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{saveError}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex gap-3">
                <button 
                  onClick={() => {
                    setIsSaveModalOpen(false);
                    setSavePassword('');
                    setSaveError(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors font-bold text-sm border border-slate-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/20 font-bold text-sm"
                >
                  Confirm Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold">Import Story Data</h2>
                </div>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    You can import your game data by either uploading the HTML file or pasting the content below.
                  </p>
                  
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-900/50 hover:border-blue-500/50 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <p className="mb-2 text-sm text-slate-400 group-hover:text-slate-300"><span className="font-bold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-slate-500">HTML or JSON files</p>
                      </div>
                      <input type="file" className="hidden" accept=".html,.json" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-slate-500 font-bold tracking-widest">Or paste content</span>
                  </div>
                </div>
                
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste HTML or storyData object here..."
                  className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                />

                {importError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleImport()}
                  disabled={!importText.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-600/20"
                >
                  Import Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play Mode Overlay */}
      <AnimatePresence>
        {isPlaying && currentPlayNodeId && (
          <PlayMode 
            nodes={state.nodes}
            currentNodeId={currentPlayNodeId}
            onNavigate={(id) => setCurrentPlayNodeId(id)}
            onClose={() => setIsPlaying(false)}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Extras Modal */}
      <AnimatePresence>
        {isExtrasFullscreen && selectedNode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Manage Notices & Popups</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{selectedNode.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExtrasFullscreen(false)}
                  className="p-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <NodeEditor 
                  selectedNode={selectedNode}
                  onUpdateNode={handleUpdateNode}
                  onDeleteNode={handleDeleteNode}
                  initialTab="extras"
                  hideHeader
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RecoveryModal 
        isOpen={isRecoveryModalOpen} 
        onClose={() => setIsRecoveryModalOpen(false)} 
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={() => setIsSaveModalOpen(true)}
        onSaveAs={handleSaveAs}
        onOpen={() => setIsProjectBrowserOpen(true)}
        onImport={() => setIsImportModalOpen(true)}
        onExportJSON={handleExport}
        onExportHTML={handleExportHTML}
        onRecovery={() => setIsRecoveryModalOpen(true)}
        onNew={resetProject}
        hasBackups={availableBackups.guest || availableBackups.local}
      />

      <ProjectBrowserModal
        isOpen={isProjectBrowserOpen}
        onClose={() => setIsProjectBrowserOpen(false)}
        onNewProject={handleNewProject}
      />

      {nameModalConfig && (
        <NameModal
          isOpen={nameModalConfig.isOpen}
          title={nameModalConfig.title}
          defaultValue={nameModalConfig.defaultValue}
          onClose={() => setNameModalConfig(null)}
          onConfirm={nameModalConfig.onConfirm}
        />
      )}

      {/* Footer / Status */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900 px-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MousePointer2 className="w-3 h-3" />
            Drag nodes to move, drag circles to connect
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMonitor}
            className={`flex items-center gap-1 transition-colors hover:text-white ${isMonitorOpen ? 'text-emerald-400' : 'text-slate-500'}`}
            title="Toggle Firestore Monitor"
          >
            <Activity className="w-3 h-3" />
            Monitor
          </button>
          <span>{state.nodes.length} Screens</span>
          <span>{state.connections.length} Connections</span>
        </div>
      </footer>

      <PerformanceMonitor />
    </div>
  );
}
