import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Play, Save, Trash2, Image as ImageIcon, Link as LinkIcon, Settings2, Layout, MousePointer2, Upload, X as CloseIcon, AlertCircle, RotateCcw, Download, FileCode, Gamepad2, Gem, Trophy, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle, Zap, GripVertical, Clock, Hand } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Editor, EditorRef } from './components/Editor';
import { PlayMode } from './components/PlayMode';
import { NodeData, Connection, ProjectState, INITIAL_STATE, TemplateType, Choice, NodeType, Tip, TipType } from './types';
import { generateHTML } from './utils/exportTemplate';

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
  const [state, setState] = useState<ProjectState>(() => {
    const saved = localStorage.getItem('bubblemapper-project');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayNodeId, setCurrentPlayNodeId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ nodeId: string, choiceId: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isAddNodeDropdownOpen, setIsAddNodeDropdownOpen] = useState(false);
  const editorRef = useRef<EditorRef>(null);

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

  useEffect(() => {
    localStorage.setItem('bubblemapper-project', JSON.stringify(state));
  }, [state]);

  const handleMouseMove = useCallback((e: any) => {
    if (pendingConnection) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (pos) {
        // Adjust for stage scale/position if needed, but for now simple:
        setMousePos(pos);
      }
    }
  }, [pendingConnection]);

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
                 type === NodeType.SUCCESS ? 'Success Screen' : 'New Screen';

    const newNode: NodeData = {
      id: uuidv4(),
      type,
      title,
      screenID: title,
      content: type === NodeType.BACK 
        ? 'Automatically returns to the previous screen in history.' 
        : type === NodeType.LEVEL ? 'Game level description...' : 
          type === NodeType.ARTEFACT ? 'Artefact description...' :
          type === NodeType.SUCCESS ? 'Victory message!' : 'Enter description here...',
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
             type === NodeType.SUCCESS ? '#ef4444' : '#3b82f6',
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

      // If the moved node is selected, move all selected nodes
      if (selectedNodeIds.includes(id)) {
        return {
          ...prev,
          nodes: prev.nodes.map(n => 
            selectedNodeIds.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
          )
        };
      }

      // Otherwise just move the single node
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === id ? { ...n, x, y } : n)
      };
    });
  }, [selectedNodeIds]);

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
      setSelectedNodeIds([nodeId]);
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
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 text-slate-300"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 text-slate-300"
            title="Export project to JSON"
          >
            <Download className="w-4 h-4" />
            <span>JSON</span>
          </button>
          <button 
            onClick={handleExportHTML}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors border border-blue-500/30 text-blue-300"
            title="Export Play Flow as standalone HTML"
          >
            <FileCode className="w-4 h-4" />
            <span>Export HTML</span>
          </button>
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
            onNodeMove={handleNodeMove}
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
            mousePos={mousePos}
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
              height: selectedNodeIds.length === 1 ? 'auto' : 48
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
              {selectedNodeIds.length === 1 ? (
                <motion.div 
                  key="expanded"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-6 space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Node Type</label>
                      <div className="flex bg-slate-800/50 p-0.5 rounded-md border border-slate-700">
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { type: NodeType.STORY })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                            selectedNode.type === NodeType.STORY 
                              ? 'bg-blue-600 text-white' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Story
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { type: NodeType.LEVEL })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                            selectedNode.type === NodeType.LEVEL 
                              ? 'bg-emerald-600 text-white' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Level
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { type: NodeType.ARTEFACT })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                            selectedNode.type === NodeType.ARTEFACT 
                              ? 'bg-amber-600 text-white' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Artfct
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { type: NodeType.SUCCESS })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                            selectedNode.type === NodeType.SUCCESS 
                              ? 'bg-red-600 text-white' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Succss
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { type: NodeType.BACK })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                            selectedNode.type === NodeType.BACK 
                              ? 'bg-purple-600 text-white' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Node Color</label>
                    <div className="flex flex-wrap gap-2">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b', '#000000'].map(color => (
                        <button
                          key={color}
                          onClick={() => handleUpdateNode(selectedNode.id, { color })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            selectedNode.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Title</label>
                    <input 
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { title: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Screen ID (Optional)</label>
                    <input 
                      type="text"
                      value={selectedNode.screenID || ''}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { screenID: e.target.value })}
                      placeholder="Leave blank to hide"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  {selectedNode.type === NodeType.STORY || selectedNode.type === NodeType.LEVEL || selectedNode.type === NodeType.ARTEFACT || selectedNode.type === NodeType.SUCCESS ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Content Text</label>
                        <textarea 
                          value={selectedNode.content}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { content: e.target.value })}
                          rows={3}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Images</label>
                        <div className="space-y-3">
                          {(selectedNode.imageUrls || [selectedNode.imageUrl]).map((url, idx) => (
                            <div key={idx} className="relative group/img">
                              <div className="relative">
                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input 
                                  type="text"
                                  value={url}
                                  onChange={(e) => {
                                    const newUrls = [...(selectedNode.imageUrls || [selectedNode.imageUrl])];
                                    newUrls[idx] = e.target.value;
                                    handleUpdateNode(selectedNode.id, { 
                                      imageUrls: newUrls,
                                      imageUrl: newUrls[0] // Keep legacy field updated
                                    });
                                  }}
                                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                  placeholder="https://..."
                                />
                                <button 
                                  onClick={() => {
                                    const newUrls = (selectedNode.imageUrls || [selectedNode.imageUrl]).filter((_, i) => i !== idx);
                                    handleUpdateNode(selectedNode.id, { 
                                      imageUrls: newUrls,
                                      imageUrl: newUrls[0] || ''
                                    });
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover/img:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newUrls = [...(selectedNode.imageUrls || [selectedNode.imageUrl]), ''];
                              handleUpdateNode(selectedNode.id, { imageUrls: newUrls });
                            }}
                            className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all uppercase tracking-widest"
                          >
                            + Add Image
                          </button>
                        </div>

                        {/* Carousel Preview */}
                        {(selectedNode.imageUrls || [selectedNode.imageUrl]).filter(url => url).length > 0 && (
                          <div className="mt-4">
                            <ImageCarousel 
                              urls={(selectedNode.imageUrls || [selectedNode.imageUrl]).filter(url => url)} 
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { template: TemplateType.TOP_IMAGE })}
                          className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${
                            selectedNode.template === TemplateType.TOP_IMAGE 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                          }`}
                        >
                          <div className="w-full h-6 bg-current opacity-20 rounded-sm" />
                          <span className="text-[9px] font-bold uppercase">Top</span>
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { template: TemplateType.SIDE_IMAGE })}
                          className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${
                            selectedNode.template === TemplateType.SIDE_IMAGE 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex gap-1 w-full h-6">
                            <div className="flex-1 bg-current opacity-20 rounded-sm" />
                            <div className="w-1/3 bg-current opacity-20 rounded-sm" />
                          </div>
                          <span className="text-[9px] font-bold uppercase">Side</span>
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { template: TemplateType.ONLY_TEXT })}
                          className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${
                            selectedNode.template === TemplateType.ONLY_TEXT 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                          }`}
                        >
                          <div className="w-full h-6 border border-current border-dashed opacity-20 rounded-sm flex items-center justify-center">
                            <span className="text-[8px]">T</span>
                          </div>
                          <span className="text-[9px] font-bold uppercase">Text</span>
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { template: TemplateType.CINEMATIC })}
                          className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${
                            selectedNode.template === TemplateType.CINEMATIC 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                          }`}
                        >
                          <div className="w-full flex flex-col gap-0.5 h-6">
                            <div className="flex-1 bg-current opacity-20 rounded-sm" />
                            <div className="h-1 bg-current opacity-40 rounded-sm" />
                            <div className="h-1.5 bg-current opacity-20 rounded-sm" />
                          </div>
                          <span className="text-[9px] font-bold uppercase">Cine</span>
                        </button>
                        <button 
                          onClick={() => handleUpdateNode(selectedNode.id, { template: TemplateType.MAP })}
                          className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${
                            selectedNode.template === TemplateType.MAP 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex w-full h-6 gap-0.5">
                            <div className="w-1/4 bg-current opacity-40 rounded-sm" />
                            <div className="flex-1 flex flex-col gap-0.5">
                              <div className="flex-1 bg-current opacity-20 rounded-sm" />
                              <div className="h-1.5 bg-current opacity-20 rounded-sm" />
                            </div>
                          </div>
                          <span className="text-[9px] font-bold uppercase">Map</span>
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choices / Links</label>
                          <button 
                            onClick={() => {
                              const newChoice: Choice = { id: uuidv4(), label: 'New Choice', targetNodeId: null };
                              handleUpdateNode(selectedNode.id, { choices: [...selectedNode.choices, newChoice] });
                            }}
                            className="p-1 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {selectedNode.choices.map((choice, idx) => (
                            <div key={choice.id} className="group relative space-y-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text"
                                  value={choice.label}
                                  onChange={(e) => {
                                    const newChoices = [...selectedNode.choices];
                                    newChoices[idx] = { ...choice, label: e.target.value };
                                    handleUpdateNode(selectedNode.id, { choices: newChoices });
                                  }}
                                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                />
                                <button 
                                  onClick={() => {
                                    const newChoices = selectedNode.choices.filter(c => c.id !== choice.id);
                                    handleUpdateNode(selectedNode.id, { choices: newChoices });
                                  }}
                                  className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Placement</span>
                                <div className="flex bg-slate-900/50 p-0.5 rounded border border-slate-700">
                                  <button 
                                    onClick={() => {
                                      const newChoices = [...selectedNode.choices];
                                      newChoices[idx] = { ...choice, position: 'sidebar' };
                                      handleUpdateNode(selectedNode.id, { choices: newChoices });
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                                      choice.position === 'sidebar' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                  >
                                    Sidebar
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newChoices = [...selectedNode.choices];
                                      newChoices[idx] = { ...choice, position: 'bottom' };
                                      handleUpdateNode(selectedNode.id, { choices: newChoices });
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                                      (choice.position === 'bottom' || !choice.position)
                                        ? 'bg-blue-600 text-white' 
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                  >
                                    Bottom
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips System */}
                      <div className="pt-4 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notices & Popups</label>
                          </div>
                          <button 
                            onClick={() => {
                              const newTip: Tip = { 
                                id: uuidv4(), 
                                type: 'TIP', 
                                copy: 'New notice text...', 
                                trigger: 'Trigger condition...', 
                                duration: 'tap' 
                              };
                              handleUpdateNode(selectedNode.id, { tips: [...(selectedNode.tips || []), newTip] });
                            }}
                            className="p-1 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <Reorder.Group 
                          axis="y" 
                          values={selectedNode.tips || []} 
                          onReorder={(newTips) => handleUpdateNode(selectedNode.id, { tips: newTips })}
                          className="space-y-2"
                        >
                          {(selectedNode.tips || []).map((tip) => (
                            <Reorder.Item 
                              key={tip.id} 
                              value={tip}
                              className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden group/tip"
                            >
                              <div className="p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-600 cursor-grab active:cursor-grabbing" />
                                  <div className="flex-1 flex items-center gap-2">
                                    <div className={`p-1 rounded ${
                                      tip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400' :
                                      tip.type === 'POPUP' ? 'bg-amber-500/10 text-amber-400' :
                                      'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                      {tip.type === 'TIP' && <MessageSquare className="w-3 h-3" />}
                                      {tip.type === 'POPUP' && <AlertTriangle className="w-3 h-3" />}
                                      {tip.type === 'POWERUP' && <Zap className="w-3 h-3" />}
                                    </div>
                                    <select 
                                      value={tip.type}
                                      onChange={(e) => {
                                        const newTips = (selectedNode.tips || []).map(t => 
                                          t.id === tip.id ? { ...t, type: e.target.value as TipType } : t
                                        ) as Tip[];
                                        handleUpdateNode(selectedNode.id, { tips: newTips });
                                      }}
                                      className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-300 focus:outline-none"
                                    >
                                      <option value="TIP">Notice</option>
                                      <option value="POPUP">Popup</option>
                                      <option value="POWERUP">Power-up</option>
                                    </select>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newTips = (selectedNode.tips || []).filter(t => t.id !== tip.id);
                                      handleUpdateNode(selectedNode.id, { tips: newTips });
                                    }}
                                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover/tip:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                <textarea 
                                  value={tip.copy}
                                  onChange={(e) => {
                                    const newTips = (selectedNode.tips || []).map(t => 
                                      t.id === tip.id ? { ...t, copy: e.target.value } : t
                                    ) as Tip[];
                                    handleUpdateNode(selectedNode.id, { tips: newTips });
                                  }}
                                  placeholder="Notice copy text..."
                                  rows={2}
                                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                                />

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="relative">
                                    <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500" />
                                    <input 
                                      type="text"
                                      value={tip.trigger}
                                      onChange={(e) => {
                                        const newTips = (selectedNode.tips || []).map(t => 
                                          t.id === tip.id ? { ...t, trigger: e.target.value } : t
                                        ) as Tip[];
                                        handleUpdateNode(selectedNode.id, { tips: newTips });
                                      }}
                                      placeholder="Trigger..."
                                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1">
                                    {tip.duration === 'tap' ? (
                                      <Hand className="w-2.5 h-2.5 text-slate-500" />
                                    ) : (
                                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                                    )}
                                    <button 
                                      onClick={() => {
                                        const newTips = (selectedNode.tips || []).map(t => 
                                          t.id === tip.id ? { ...t, duration: t.duration === 'tap' ? 5 : 'tap' } : t
                                        ) as Tip[];
                                        handleUpdateNode(selectedNode.id, { tips: newTips });
                                      }}
                                      className="text-[10px] text-slate-300 hover:text-white transition-colors flex-1 text-left"
                                    >
                                      {tip.duration === 'tap' ? 'Tap to dismiss' : `${tip.duration}s`}
                                    </button>
                                    {tip.duration !== 'tap' && (
                                      <input 
                                        type="number"
                                        value={tip.duration}
                                        onChange={(e) => {
                                          const newTips = (selectedNode.tips || []).map(t => 
                                            t.id === tip.id ? { ...t, duration: parseInt(e.target.value) || 1 } : t
                                          ) as Tip[];
                                          handleUpdateNode(selectedNode.id, { tips: newTips });
                                        }}
                                        className="w-8 bg-transparent text-[10px] text-right focus:outline-none"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-xs text-purple-300 leading-relaxed">
                        This is a <span className="font-bold">Back Node</span>. When a player reaches this node, they will automatically be returned to the previous screen in their history.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-12 flex items-center justify-center"
                >
                  <span className="text-[10px] text-slate-500 font-medium italic">No screen selected</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

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

      {/* Footer / Status */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900 px-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MousePointer2 className="w-3 h-3" />
            Drag nodes to move, drag circles to connect
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>{state.nodes.length} Screens</span>
          <span>{state.connections.length} Connections</span>
        </div>
      </footer>
    </div>
  );
}
