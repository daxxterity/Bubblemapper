import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { NodeData, TemplateType, NodeType, Tip } from '../types';
import { ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle, Zap, Clock, Hand, RefreshCw, Sparkles, Bug, Cpu } from 'lucide-react';

interface PlayModeProps {
  nodes: NodeData[];
  currentNodeId: string;
  onNavigate: (nodeId: string) => void;
  onClose: () => void;
}

const ImageCarousel = ({ 
  urls, 
  captions, 
  getProcessedImageUrl, 
  isExpanded, 
  onToggleExpand,
  onPrevNode,
  onNextNode,
  hasPrevNode,
  hasNextNode
}: { 
  urls: string[], 
  captions?: string[], 
  getProcessedImageUrl: (url: string) => string, 
  isExpanded?: boolean, 
  onToggleExpand?: () => void,
  onPrevNode?: () => void,
  onNextNode?: () => void,
  hasPrevNode?: boolean,
  hasNextNode?: boolean
}) => {
  const [index, setIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Add Keyboard Support (A/D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      const code = e.code;
      const isRight = key === 'd' || code === 'ArrowRight';
      const isLeft = key === 'a' || code === 'ArrowLeft';

      if (!isRight && !isLeft) return;

      const len = urls.length;
      
      if (isRight) {
        if (len > 1 && index < len - 1) {
          setIndex(prev => prev + 1);
        } else if (onNextNode) {
          onNextNode();
        }
      } else if (isLeft) {
        if (len > 1 && index > 0) {
          setIndex(prev => prev - 1);
        } else if (onPrevNode) {
          onPrevNode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [urls, index, onNextNode, onPrevNode]); // Using urls and index as dependency

  if (urls.length === 0) return null;

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (urls.length > 1 && index < urls.length - 1) {
      setIndex((prev) => prev + 1);
    } else if (onNextNode) {
      onNextNode();
    }
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (urls.length > 1 && index > 0) {
      setIndex((prev) => prev - 1);
    } else if (onPrevNode) {
      onPrevNode();
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshKey(prev => prev + 1);
  };

  const showPrevArrow = urls.length > 1 || hasPrevNode;
  const showNextArrow = urls.length > 1 || hasNextNode;

  return (
    <div className="relative w-full h-full group select-none">
      <AnimatePresence mode="wait">
        <motion.div 
          key={`${index}-${refreshKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full relative"
          onClick={onToggleExpand}
        >
          <img 
            src={getProcessedImageUrl(urls[index])} 
            alt={`Image ${index + 1}`} 
            className="w-full h-full object-contain bg-black/40 cursor-pointer"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/800/600';
            }}
          />
          {captions && captions[index] && !isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-sm font-medium drop-shadow-md">{captions[index]}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {/* Navigation Arrows - 50% smaller as requested */}
        <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-start pl-4 pointer-events-none">
          {showPrevArrow && (
            <button 
              onClick={prev}
              className="p-2.5 bg-black/60 hover:bg-black/90 backdrop-blur-xl rounded-full text-white transition-all border border-white/40 shadow-2xl pointer-events-auto active:scale-95 group/btn"
              title="Previous (A / Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
          )}
        </div>
        <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-end pr-4 pointer-events-none">
          {showNextArrow && (
            <button 
              onClick={next}
              className="p-2.5 bg-black/60 hover:bg-black/90 backdrop-blur-xl rounded-full text-white transition-all border border-white/40 shadow-2xl pointer-events-auto active:scale-95 group/btn"
              title="Next (D / Right Arrow)"
            >
              <ChevronRight className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* Top Controls Removed (Refresh and Solo Image) as requested */}

        {/* Progress Overlay */}
        {urls.length > 1 && (
          <div className="absolute top-6 right-6 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full text-sm font-black text-white border border-white/20 shadow-2xl">
            {index + 1} / {urls.length}
          </div>
        )}

        {/* Visual Indicators for Multiple Images */}
        {urls.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
            {urls.map((_, i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === index ? 'bg-white w-10 shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PlayMode: React.FC<PlayModeProps> = ({ nodes, currentNodeId, onNavigate, onClose }) => {
  const [history, setHistory] = useState<string[]>([]);
  const [direction, setDirection] = useState<number>(1); // 1 for forward, -1 for back
  const [activeTip, setActiveTip] = useState<Tip | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [gremlinPage, setGremlinPage] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const node = nodes.find((n) => n.id === currentNodeId);
  const isThumbnailNode = node?.type === NodeType.THUMBNAIL;

  // Auto-expand if node has no content/title or is a THUMBNAIL type
  useEffect(() => {
    if (node && (!node.content && !node.title || isThumbnailNode)) {
      setIsExpanded(true);
    }
  }, [node?.id, isThumbnailNode]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Global Keyboard Navigation (for templates without ImageCarousel like ONLY_TEXT)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (node?.template !== TemplateType.ONLY_TEXT) return;

      const key = e.key.toLowerCase();
      const code = e.code;
      const isRight = key === 'd' || code === 'ArrowRight';
      const isLeft = key === 'a' || code === 'ArrowLeft';

      if (isRight) {
        const primaryChoice = node.choices.find(c => c.targetNodeId);
        if (primaryChoice?.targetNodeId) handleNavigate(primaryChoice.targetNodeId);
      } else if (isLeft && history.length > 0) {
        handleGoBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [node?.id, node?.template, node?.choices, history]);

  // Handle Tip Timer
  useEffect(() => {
    if (activeTip && typeof activeTip.duration === 'number') {
      setTimeLeft(activeTip.duration);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setActiveTip(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(null);
    }
  }, [activeTip]);

  // Reset active tip on navigation
  useEffect(() => {
    setActiveTip(null);
    setGremlinPage(0);
  }, [currentNodeId]);

  useEffect(() => {
    setGremlinPage(0);
  }, [activeTip?.id]);

  // Helper to handle Google Drive links and other common image issues
  const getProcessedImageUrl = (url: string) => {
    if (!url) return 'https://picsum.photos/seed/placeholder/800/600';
    
    // Handle Google Drive links by converting to thumbnail links
    const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([^\/&?]+)/);
    if (driveMatch) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
    }
    
    return url;
  };

  // Handle automatic navigation for BACK nodes
  useEffect(() => {
    if (node?.type === NodeType.BACK) {
      setDirection(-1);
      setHistory(prev => {
        if (prev.length > 0) {
          const newHistory = [...prev];
          const previousId = newHistory.pop();
          if (previousId) {
            setTimeout(() => onNavigate(previousId), 0);
          }
          return newHistory;
        } else {
          setTimeout(() => onClose(), 0);
          return prev;
        }
      });
    }
  }, [node?.id, node?.type, onNavigate, onClose]);

  const handleNavigate = (targetId: string) => {
    const targetNode = nodes.find(n => n.id === targetId);
    if (!targetNode) return;

    // Set direction based on whether we are going to a BACK node
    setDirection(targetNode.type === NodeType.BACK ? -1 : 1);

    // Only add to history if:
    // 1. The current node is a standard content node
    // 2. The target node is NOT a BACK node
    const historyTypes = [NodeType.STORY, NodeType.LEVEL, NodeType.ARTEFACT, NodeType.SUCCESS, NodeType.THUMBNAIL];
    if (node && historyTypes.includes(node.type) && targetNode.type !== NodeType.BACK) {
      setHistory(prev => [...prev, node.id]);
    }
    
    onNavigate(targetId);
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const previousId = newHistory.pop();
      setHistory(newHistory);
      setDirection(-1);
      if (previousId) {
        onNavigate(previousId);
      }
    }
  };

  if (!node || node.type === NodeType.BACK) return null;

  // Preloading logic: Find all images in nodes reachable from the current node
  const nextNodeIds = node.choices
    .map(c => c.targetNodeId)
    .filter((id): id is string => !!id);
  
  const preloadUrls = nodes
    .filter(n => nextNodeIds.includes(n.id))
    .flatMap(n => n.imageUrls && n.imageUrls.length > 0 ? n.imageUrls : [n.imageUrl])
    .filter(url => !!url)
    .map(url => getProcessedImageUrl(url));

  const renderTemplate = () => {
    const primaryChoice = node.choices.find(c => c.targetNodeId);
    const handleNextNode = primaryChoice ? () => handleNavigate(primaryChoice.targetNodeId!) : undefined;
    const handlePrevNode = history.length > 0 ? () => handleGoBack() : undefined;

    const navProps = {
      onPrevNode: handlePrevNode,
      onNextNode: handleNextNode,
      hasPrevNode: !!handlePrevNode,
      hasNextNode: !!handleNextNode
    };

    const sidebarChoices = node.choices
      .filter(c => c.position === 'sidebar')
      .map((choice) => (
        <button
          key={choice.id}
          disabled={!choice.targetNodeId}
          onClick={() => choice.targetNodeId && handleNavigate(choice.targetNodeId)}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all w-full text-left ${
            choice.targetNodeId 
              ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-100 cursor-pointer'
              : 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
          }`}
        >
          <span className="text-sm font-medium truncate pr-2">{choice.label}</span>
          {choice.targetNodeId && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />}
        </button>
      ));

    const bottomChoices = node.choices
      .filter(c => c.position === 'bottom' || !c.position)
      .map((choice) => (
        <button
          key={choice.id}
          disabled={!choice.targetNodeId}
          onClick={() => choice.targetNodeId && handleNavigate(choice.targetNodeId)}
          className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
            choice.targetNodeId 
              ? node.template === TemplateType.TOP_IMAGE || node.template === TemplateType.MULTI_LINK
                ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-100 cursor-pointer'
                : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 cursor-pointer'
              : 'border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed'
          } ${node.template === TemplateType.SIDE_IMAGE || node.template === TemplateType.ONLY_TEXT ? 'w-full p-5 rounded-xl' : ''}`}
        >
          <span className={node.template === TemplateType.SIDE_IMAGE || node.template === TemplateType.ONLY_TEXT ? 'text-lg font-medium' : 'font-medium'}>
            {choice.label}
          </span>
          {choice.targetNodeId && (
            nodes.find(n => n.id === choice.targetNodeId)?.type === NodeType.BACK 
              ? <ArrowLeft className="w-4 h-4" />
              : <ArrowRight className={node.template === TemplateType.SIDE_IMAGE || node.template === TemplateType.ONLY_TEXT ? 'w-5 h-5' : 'w-4 h-4'} />
          )}
        </button>
      ));

    const renderHeader = (positionClass: string, isFloating: boolean) => {
      if (!node) return null;
      const hasPill = node.type === NodeType.LEVEL || node.type === NodeType.ARTEFACT || node.type === NodeType.SUCCESS;
      if (!hasPill && !node.screenID) return null;

      return (
        <div className={`absolute z-10 flex items-center gap-3 ${positionClass}`}>
          {node.type === NodeType.LEVEL && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isFloating ? 'bg-emerald-500/80 backdrop-blur-md border-emerald-400/50 shadow-lg' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isFloating ? 'text-white' : 'text-emerald-400'}`}>Game Level</span>
            </div>
          )}
          {node.type === NodeType.ARTEFACT && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isFloating ? 'bg-amber-500/80 backdrop-blur-md border-amber-400/50 shadow-lg' : 'bg-amber-500/20 border-amber-500/30'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isFloating ? 'text-white' : 'text-amber-400'}`}>Artefact Found</span>
            </div>
          )}
          {node.type === NodeType.SUCCESS && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isFloating ? 'bg-red-500/80 backdrop-blur-md border-red-400/50 shadow-lg' : 'bg-red-500/20 border-red-500/30'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isFloating ? 'text-white' : 'text-red-400'}`}>Victory</span>
            </div>
          )}
          {node.screenID && (
            <div className={`px-3 py-1 rounded-full border ${isFloating ? 'bg-slate-900/80 backdrop-blur-md border-white/20 shadow-lg' : 'bg-slate-100 border-slate-200'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isFloating ? 'text-white' : 'text-slate-500'}`}>
                {node.screenID}
              </span>
            </div>
          )}
        </div>
      );
    };

    if (node.template === TemplateType.ONLY_TEXT) {
      return (
        <div className="flex flex-col h-full bg-slate-900 p-12 overflow-hidden relative">
          {renderHeader("top-8 left-12", false)}
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full overflow-y-auto pr-4 custom-scrollbar">
            <h1 className="text-5xl font-bold mb-8 tracking-tight text-white">{node.title}</h1>
            <p className="text-2xl text-slate-300 mb-12 leading-relaxed whitespace-pre-wrap">{node.content}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8">
              {bottomChoices}
            </div>
          </div>
        </div>
      );
    }

    if (node.template === TemplateType.TOP_IMAGE) {
      return (
        <div className="flex flex-col h-full overflow-hidden relative">
          {renderHeader("top-6 left-6", true)}
          <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-[4vh]">
            <div className={`relative w-full h-[92vh] rounded-xl overflow-hidden shadow-2xl ${isExpanded ? '' : 'border border-slate-800'}`}>
              <ImageCarousel 
              urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
              captions={node.imageCaptions}
              getProcessedImageUrl={getProcessedImageUrl}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              {...navProps}
            />
          </div>
        </div>
        {!isExpanded && (
            <div className="p-8 bg-slate-900 border-t border-slate-800 overflow-y-auto max-h-[60%] custom-scrollbar">
              <h1 className="text-4xl font-bold mb-4 tracking-tight text-white">{node.title}</h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-3xl whitespace-pre-wrap">{node.content}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                {bottomChoices}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (node.template === TemplateType.CINEMATIC) {
      return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
          {renderHeader("top-6 left-6", true)}
          
          <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-[4vh]">
            <div className={`relative w-full h-[92vh] rounded-xl overflow-hidden shadow-2xl ${isExpanded ? '' : 'border border-slate-800'}`}>
              <ImageCarousel 
              urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
              captions={node.imageCaptions}
              getProcessedImageUrl={getProcessedImageUrl}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              {...navProps}
            />
          </div>
        </div>

        {/* Tips line (if any) - Specific to Cinematic Template */}
          {node.tips && node.tips.length > 0 && !isExpanded && (
            <div className="h-12 bg-slate-950/80 backdrop-blur-md border-y border-slate-800 flex items-center px-6 gap-6 z-20 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notices</span>
              <div className="flex items-center gap-3">
                {node.tips.map((tip) => (
                  <button
                    key={tip.id}
                    onClick={() => setActiveTip(tip)}
                    title={tip.trigger}
                    className={`p-2 rounded-lg transition-all relative group ${
                      activeTip?.id === tip.id 
                        ? tip.type === 'TIP' ? 'bg-blue-600 text-white' :
                          tip.type === 'POPUP' ? 'bg-amber-600 text-white' :
                          tip.type === 'POWERUP' ? 'bg-yellow-600 text-white' :
                          tip.type === 'ELARA' ? 'bg-rose-600 text-white' :
                          tip.type === 'GREMLINS' ? 'bg-lime-600 text-white' :
                          'bg-orange-600 text-white'
                        : tip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' :
                          tip.type === 'POPUP' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' :
                          tip.type === 'POWERUP' ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' :
                          tip.type === 'ELARA' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' :
                          tip.type === 'GREMLINS' ? 'bg-lime-500/10 text-lime-400 hover:bg-lime-500/20' :
                          'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                    }`}
                  >
                    {tip.type === 'TIP' && <MessageSquare className="w-4 h-4" />}
                    {tip.type === 'POPUP' && <AlertTriangle className="w-4 h-4" />}
                    {tip.type === 'POWERUP' && <Zap className="w-4 h-4" />}
                    {tip.type === 'ELARA' && <Sparkles className="w-4 h-4" />}
                    {tip.type === 'GREMLINS' && <Bug className="w-4 h-4" />}
                    {tip.type === 'SYSTEM' && <Cpu className="w-4 h-4" />}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[9px] text-slate-300 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                      {tip.trigger}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isExpanded && (
            <div className="flex-shrink-0 p-6 bg-slate-900/50 border-t border-slate-800/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                {bottomChoices}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (node.template === TemplateType.MULTI_LINK) {
      return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
          {/* Top Section: Sidebar + Image */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar (1/4) */}
            {!isExpanded && (
              <div className="w-1/4 border-r border-slate-800 flex flex-col bg-slate-900/50">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Links</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {sidebarChoices.length > 0 ? sidebarChoices : (
                    <div className="py-8 text-center">
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest">No sidebar links</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image Area with 8% margin height */}
            <div className={`flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center ${isThumbnailNode ? 'p-0' : 'p-[4vh]'}`}>
              <div className={`relative w-full h-[92vh] rounded-xl overflow-hidden shadow-2xl ${isThumbnailNode || isExpanded ? '' : 'border border-slate-800'}`}>
                {renderHeader("top-4 left-4", true)}
                <ImageCarousel 
                  urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
                  captions={node.imageCaptions}
                  getProcessedImageUrl={getProcessedImageUrl}
                  isExpanded={isExpanded}
                  onToggleExpand={toggleExpand}
                  {...navProps}
                />
              </div>
            </div>
          </div>
          
          {/* Bottom Section (Full Width) */}
          {!isExpanded && (
            <div className="p-8 bg-slate-900 border-t border-slate-800 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">{node.title}</h1>
                    <p className="text-base text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-2">{node.content}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {bottomChoices}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // SIDE_IMAGE Template
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full gap-8 p-8 overflow-hidden bg-slate-900 relative">
        {renderHeader("top-8 left-8", false)}
        {!isExpanded && (
          <div className="flex flex-col overflow-y-auto pr-4 custom-scrollbar">
            <div className="my-auto py-8">
              <h1 className="text-5xl font-bold mb-6 tracking-tight text-white">{node.title}</h1>
              <p className="text-xl text-slate-300 mb-12 leading-relaxed whitespace-pre-wrap">{node.content}</p>
              <div className="space-y-4">
                {bottomChoices}
              </div>
            </div>
          </div>
        )}
        <div className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center bg-slate-950 ${isExpanded || isThumbnailNode ? 'lg:col-span-2' : 'hidden lg:block'}`}>
          <div className="w-full h-[92vh] p-[4vh]">
            <ImageCarousel 
              urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
              captions={node.imageCaptions}
              getProcessedImageUrl={getProcessedImageUrl}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              {...navProps}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 bg-slate-950 flex items-center justify-center transition-all duration-500 ${
        isExpanded || isThumbnailNode ? 'p-0' : 'p-4 md:p-12'
      }`}
    >
      {/* Global Go Back Button - Outside image, top left corner */}
      {history.length > 0 && (
        <button 
          onClick={handleGoBack}
          className="absolute top-8 left-8 z-[150] p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black border border-white/10 text-white transition-all shadow-2xl flex items-center justify-center"
          title="Go Back (A / Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <button 
        onClick={onClose}
        className="absolute top-8 right-8 z-[150] p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black border border-white/10 text-white transition-all shadow-2xl"
      >
        <X className="w-6 h-6" />
      </button>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full h-full bg-slate-900 overflow-hidden relative shadow-2xl transition-all duration-500 ${
          isExpanded || isThumbnailNode 
            ? 'max-w-none max-h-none rounded-none border-none' 
            : 'max-w-6xl max-h-[800px] rounded-2xl border border-slate-800'
        }`}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentNodeId}
            custom={direction}
            variants={{
              enter: (d: number) => ({
                x: d * 100,
                opacity: 0,
                scale: 0.98
              }),
              center: {
                zIndex: 1,
                x: 0,
                opacity: 1,
                scale: 1
              },
              exit: (d: number) => ({
                zIndex: 0,
                x: d * -100,
                opacity: 0,
                scale: 0.98
              })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ 
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            className="h-full w-full bg-slate-900 absolute inset-0"
          >
            {renderTemplate()}
          </motion.div>
        </AnimatePresence>

        {/* Hidden Preloader */}
        <div className="hidden" aria-hidden="true">
          {preloadUrls.map((url, i) => (
            <img key={`${url}-${i}`} src={url} referrerPolicy="no-referrer" />
          ))}
        </div>

        {/* Tips Bar */}
        {node.tips && node.tips.length > 0 && node.template !== TemplateType.CINEMATIC && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex items-center px-6 gap-6 z-20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notices</span>
            <div className="flex items-center gap-3">
              {node.tips.map((tip) => (
                <button
                  key={tip.id}
                  onClick={() => setActiveTip(tip)}
                  title={tip.trigger}
                  className={`p-2 rounded-lg transition-all relative group ${
                    activeTip?.id === tip.id 
                      ? tip.type === 'TIP' ? 'bg-blue-600 text-white' :
                        tip.type === 'POPUP' ? 'bg-amber-600 text-white' :
                        tip.type === 'POWERUP' ? 'bg-yellow-600 text-white' :
                        tip.type === 'ELARA' ? 'bg-rose-600 text-white' :
                        tip.type === 'GREMLINS' ? 'bg-lime-600 text-white' :
                        'bg-orange-600 text-white'
                      : tip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' :
                        tip.type === 'POPUP' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' :
                        tip.type === 'POWERUP' ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' :
                        tip.type === 'ELARA' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' :
                        tip.type === 'GREMLINS' ? 'bg-lime-500/10 text-lime-400 hover:bg-lime-500/20' :
                        'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                  }`}
                >
                  {tip.type === 'TIP' && <MessageSquare className="w-4 h-4" />}
                  {tip.type === 'POPUP' && <AlertTriangle className="w-4 h-4" />}
                  {tip.type === 'POWERUP' && <Zap className="w-4 h-4" />}
                  {tip.type === 'ELARA' && <Sparkles className="w-4 h-4" />}
                  {tip.type === 'GREMLINS' && <Bug className="w-4 h-4" />}
                  {tip.type === 'SYSTEM' && <Cpu className="w-4 h-4" />}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[9px] text-slate-300 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                    {tip.trigger}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tip Overlay */}
        <AnimatePresence>
          {activeTip && (
            <>
              {activeTip.type === 'GREMLINS' ? (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-40 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none"
                >
                  <div className="bg-black/90 backdrop-blur-md border-y border-white/5 w-full max-w-4xl h-12 flex items-center justify-center px-8 gap-6 shadow-2xl pointer-events-auto">
                    <div className="flex items-center gap-4 text-lime-400 font-mono text-sm tracking-tight">
                      {gremlinPage === 1 && activeTip.copy2 ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setGremlinPage(0); }}
                          className="text-lime-400/40 hover:text-lime-400 transition-colors flex items-center gap-1"
                        >
                          <span className="text-xs font-bold">{"<<"}</span>
                        </button>
                      ) : null}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-lime-400/40">/</span>
                        <div className="max-w-[600px] truncate">
                          <ReactMarkdown components={{
                            p: ({node, ...props}) => <span {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                            em: ({node, ...props}) => <em className="italic opacity-80" {...props} />
                          }}>
                            {gremlinPage === 1 && activeTip.copy2 ? activeTip.copy2 : activeTip.copy}
                          </ReactMarkdown>
                        </div>
                        <span className="text-lime-400/40">/</span>
                      </div>

                      {gremlinPage === 0 && activeTip.copy2 ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setGremlinPage(1); }}
                          className="text-lime-400/40 hover:text-lime-400 transition-colors flex items-center gap-1"
                        >
                          <span className="text-xs font-bold">{">>"}</span>
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveTip(null); }}
                          className="text-lime-400/40 hover:text-lime-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6"
                  onClick={() => {
                    if (activeTip.duration === 'tap') setActiveTip(null);
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className={`max-w-md w-full rounded-2xl shadow-2xl border-2 p-8 space-y-6 text-center relative ${
                      activeTip.type === 'TIP' ? 'bg-slate-900 border-blue-500 shadow-blue-500/10' :
                      activeTip.type === 'POPUP' ? 'bg-slate-900 border-amber-500 shadow-amber-500/10' :
                      activeTip.type === 'POWERUP' ? 'bg-slate-900 border-yellow-500 shadow-yellow-500/10' :
                      activeTip.type === 'ELARA' ? 'bg-[#f5f5dc] border-[#d2b48c] shadow-black/20' :
                      'bg-black border-orange-500 shadow-orange-500/10'
                    }`}
                  >
                    {/* Close button for ELARA */}
                    {activeTip.type === 'ELARA' && (
                      <button 
                        onClick={() => setActiveTip(null)}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 text-black/50 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}

                    <div className="flex flex-col items-center gap-4">
                      {activeTip.type !== 'POPUP' && (
                        <div className={`p-4 rounded-2xl ${
                          activeTip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400' :
                          activeTip.type === 'POWERUP' ? 'bg-yellow-500/10 text-yellow-400' :
                          activeTip.type === 'ELARA' ? 'bg-black/5 text-black/60' :
                          'bg-orange-500/10 text-orange-500'
                        }`}>
                          {activeTip.type === 'TIP' && <MessageSquare className="w-8 h-8" />}
                          {activeTip.type === 'POWERUP' && <Zap className="w-8 h-8" />}
                          {activeTip.type === 'ELARA' && <Sparkles className="w-8 h-8" />}
                          {activeTip.type === 'SYSTEM' && <Cpu className="w-8 h-8" />}
                        </div>
                      )}
                      <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                        activeTip.type === 'ELARA' ? 'text-black/40' :
                        activeTip.type === 'SYSTEM' ? 'text-orange-500/40' :
                        'text-slate-500'
                      }`}>
                        {activeTip.type === 'TIP' ? 'Notice' :
                         activeTip.type === 'POPUP' ? '' : 
                         activeTip.type === 'POWERUP' ? 'Power-up Reveal' :
                         activeTip.type === 'ELARA' ? 'Elara Dialogue' : 'System Alert'}
                      </h3>
                    </div>

                    <div className={`text-xl font-medium leading-relaxed ${
                      activeTip.type === 'ELARA' ? 'text-black font-serif' :
                      activeTip.type === 'SYSTEM' ? 'text-orange-500 font-mono' :
                      'text-slate-100'
                    }`}>
                      <ReactMarkdown components={{
                        p: ({node, ...props}) => <span {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                        em: ({node, ...props}) => <em className="italic opacity-80" {...props} />
                      }}>
                        {activeTip.copy}
                      </ReactMarkdown>
                    </div>

                    <div className="pt-4 flex flex-col items-center gap-4">
                      {activeTip.duration === 'tap' ? (
                        <button
                          onClick={() => setActiveTip(null)}
                          className={`px-8 py-3 rounded-xl transition-all font-bold text-sm border shadow-lg ${
                            activeTip.type === 'ELARA' ? 'bg-black text-white border-black hover:bg-black/80' :
                            activeTip.type === 'SYSTEM' ? 'bg-orange-500 text-black border-orange-500 hover:bg-orange-400' :
                            'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                          }`}
                        >
                          Dismiss
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-48 h-1 rounded-full overflow-hidden ${
                            activeTip.type === 'ELARA' ? 'bg-black/10' : 'bg-slate-800'
                          }`}>
                            <motion.div 
                              initial={{ width: '100%' }}
                              animate={{ width: '0%' }}
                              transition={{ duration: activeTip.duration as number, ease: 'linear' }}
                              className={`h-full ${
                                activeTip.type === 'TIP' ? 'bg-blue-500' :
                                activeTip.type === 'POPUP' ? 'bg-amber-500' :
                                activeTip.type === 'POWERUP' ? 'bg-yellow-500' :
                                activeTip.type === 'ELARA' ? 'bg-black' :
                                'bg-orange-500'
                              }`}
                            />
                          </div>
                          <span className={`text-[10px] font-mono ${
                            activeTip.type === 'ELARA' ? 'text-black/40' : 'text-slate-500'
                          }`}>
                            Closing in {timeLeft}s
                          </span>
                          <button
                            onClick={() => setActiveTip(null)}
                            className={`text-xs transition-colors mt-2 ${
                              activeTip.type === 'ELARA' ? 'text-black/40 hover:text-black' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Close early
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
