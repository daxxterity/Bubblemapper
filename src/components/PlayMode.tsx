import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NodeData, TemplateType, NodeType, Tip } from '../types';
import { ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle, Zap, Clock, Hand } from 'lucide-react';

interface PlayModeProps {
  nodes: NodeData[];
  currentNodeId: string;
  onNavigate: (nodeId: string) => void;
  onClose: () => void;
}

const ImageCarousel = ({ urls, getProcessedImageUrl }: { urls: string[], getProcessedImageUrl: (url: string) => string }) => {
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
    <div className="relative w-full h-full group">
      <AnimatePresence mode="wait">
        <motion.img 
          key={index}
          src={getProcessedImageUrl(urls[index])} 
          alt={`Image ${index + 1}`} 
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
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900 border border-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900 border border-white/10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {urls.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white w-6' : 'bg-white/40'}`}
              />
            ))}
          </div>
          <div className="absolute top-6 right-6 bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
            {index + 1} / {urls.length}
          </div>
        </>
      )}
    </div>
  );
};

export const PlayMode: React.FC<PlayModeProps> = ({ nodes, currentNodeId, onNavigate, onClose }) => {
  const [history, setHistory] = useState<string[]>([]);
  const [direction, setDirection] = useState<number>(1); // 1 for forward, -1 for back
  const [activeTip, setActiveTip] = useState<Tip | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const node = nodes.find((n) => n.id === currentNodeId);

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
  }, [currentNodeId]);

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
    // 1. The current node is a normal STORY, LEVEL, ARTEFACT, or SUCCESS node
    // 2. The target node is NOT a BACK node
    if (node && (node.type === NodeType.STORY || node.type === NodeType.LEVEL || node.type === NodeType.ARTEFACT || node.type === NodeType.SUCCESS) && targetNode.type !== NodeType.BACK) {
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

  const renderTemplate = () => {
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
              ? node.template === TemplateType.TOP_IMAGE || node.template === TemplateType.MAP
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
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isFloating ? 'text-white/70 drop-shadow-md' : 'text-slate-500'}`}>
              {node.screenID}
            </span>
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
          <div className="flex-1 min-h-[200px] relative">
            <ImageCarousel 
              urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
              getProcessedImageUrl={getProcessedImageUrl}
            />
          </div>
          <div className="p-8 bg-slate-900 border-t border-slate-800 overflow-y-auto max-h-[60%] custom-scrollbar">
            <h1 className="text-4xl font-bold mb-4 tracking-tight text-white">{node.title}</h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-3xl whitespace-pre-wrap">{node.content}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              {bottomChoices}
            </div>
          </div>
        </div>
      );
    }

    if (node.template === TemplateType.CINEMATIC) {
      return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
          {renderHeader("top-6 left-6", true)}
          
          <div className="flex-1 relative bg-black overflow-hidden">
            <ImageCarousel 
              urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
              getProcessedImageUrl={getProcessedImageUrl}
            />
          </div>

          {/* Tips line (if any) - Specific to Cinematic Template */}
          {node.tips && node.tips.length > 0 && (
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
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {tip.type === 'TIP' && <MessageSquare className="w-4 h-4" />}
                    {tip.type === 'POPUP' && <AlertTriangle className="w-4 h-4" />}
                    {tip.type === 'POWERUP' && <Zap className="w-4 h-4" />}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[9px] text-slate-300 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                      {tip.trigger}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-shrink-0 p-6 bg-slate-900/50 border-t border-slate-800/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
              {bottomChoices}
            </div>
          </div>
        </div>
      );
    }

    if (node.template === TemplateType.MAP) {
      return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
          {/* Top Section: Sidebar + Image */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar (1/4) */}
            <div className="w-1/4 border-r border-slate-800 flex flex-col bg-slate-900/50">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Map Locations</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {sidebarChoices.length > 0 ? sidebarChoices : (
                  <div className="py-8 text-center">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">No sidebar links</p>
                  </div>
                )}
              </div>
            </div>

            {/* Image Area (3/4) */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-8">
              <div className="relative w-full h-full max-h-[500px] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                {renderHeader("top-4 left-4", true)}
                <ImageCarousel 
                  urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
                  getProcessedImageUrl={getProcessedImageUrl}
                />
              </div>
            </div>
          </div>
          
          {/* Bottom Section (Full Width) */}
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
        </div>
      );
    }

    // SIDE_IMAGE Template
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full gap-8 p-8 overflow-hidden bg-slate-900 relative">
        {renderHeader("top-8 left-8", false)}
        <div className="flex flex-col overflow-y-auto pr-4 custom-scrollbar">
          <div className="my-auto py-8">
            <h1 className="text-5xl font-bold mb-6 tracking-tight text-white">{node.title}</h1>
            <p className="text-xl text-slate-300 mb-12 leading-relaxed whitespace-pre-wrap">{node.content}</p>
            <div className="space-y-4">
              {bottomChoices}
            </div>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 hidden lg:block">
          <ImageCarousel 
            urls={node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl]} 
            getProcessedImageUrl={getProcessedImageUrl}
          />
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
      className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 md:p-12"
    >
      {history.length > 0 && (
        <button 
          onClick={handleGoBack}
          className="absolute top-8 left-8 z-50 p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <button 
        onClick={onClose}
        className="absolute top-8 right-8 z-50 p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-6xl h-full max-h-[800px] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 relative"
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

        {/* Tips Bar */}
        {node.tips && node.tips.length > 0 && node.template !== TemplateType.CINEMATIC && (
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
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tip.type === 'TIP' && <MessageSquare className="w-4 h-4" />}
                  {tip.type === 'POPUP' && <AlertTriangle className="w-4 h-4" />}
                  {tip.type === 'POWERUP' && <Zap className="w-4 h-4" />}
                  
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
                className={`max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl border-2 p-8 space-y-6 text-center ${
                  activeTip.type === 'TIP' ? 'border-blue-500 shadow-blue-500/10' :
                  activeTip.type === 'POPUP' ? 'border-amber-500 shadow-amber-500/10' :
                  'border-yellow-500 shadow-yellow-500/10'
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  {activeTip.type !== 'POPUP' && (
                    <div className={`p-4 rounded-2xl ${
                      activeTip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {activeTip.type === 'TIP' && <MessageSquare className="w-8 h-8" />}
                      {activeTip.type === 'POWERUP' && <Zap className="w-8 h-8" />}
                    </div>
                  )}
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    {activeTip.type === 'TIP' ? 'Notice' :
                     activeTip.type === 'POPUP' ? '' : 'Power-up Reveal'}
                  </h3>
                </div>

                <p className="text-xl font-medium text-slate-100 leading-relaxed">
                  {activeTip.copy}
                </p>

                <div className="pt-4 flex flex-col items-center gap-4">
                  {activeTip.duration === 'tap' ? (
                    <button
                      onClick={() => setActiveTip(null)}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold text-sm border border-slate-700 shadow-lg"
                    >
                      Dismiss
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: '100%' }}
                          animate={{ width: '0%' }}
                          transition={{ duration: activeTip.duration as number, ease: 'linear' }}
                          className={`h-full ${
                            activeTip.type === 'TIP' ? 'bg-blue-500' :
                            activeTip.type === 'POPUP' ? 'bg-amber-500' :
                            'bg-yellow-500'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Closing in {timeLeft}s
                      </span>
                      <button
                        onClick={() => setActiveTip(null)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
                      >
                        Close early
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
