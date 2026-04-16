export const generateHTML = (state: { nodes: any[], connections: any[] }) => {
  // Use a more robust escaping for the JSON data to prevent issues with script tags and special characters
  const storyData = JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BubbleMapper Play Flow</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Suppress Tailwind production warning
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '') {
            window.tailwind = { config: { } };
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #020617; color: #f8fafc; margin: 0; overflow: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        
        #loading-overlay {
            position: fixed;
            inset: 0;
            background: #020617;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            transition: opacity 0.5s ease;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading-overlay">
        <div class="spinner"></div>
    </div>
    <div id="root"></div>

    <script type="module">
        // Unified loading strategy to ensure all libraries share the same React instance
        // and avoid "i.H is null" (dispatcher) errors in restricted environments.
        import React from 'https://esm.sh/react@18.2.0';
        import * as ReactDOMClient from 'https://esm.sh/react-dom@18.2.0/client?deps=react@18.2.0';
        import * as FramerMotion from 'https://esm.sh/framer-motion@11.11.11?deps=react@18.2.0';
        import * as LucideReact from 'https://esm.sh/lucide-react?deps=react@18.2.0';

        const { useState, useEffect, useMemo } = React;
        const { createRoot } = ReactDOMClient;
        const { motion, AnimatePresence } = FramerMotion;
        const { ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle, Zap, RefreshCw, Sparkles, Bug, Cpu } = LucideReact;

        const NodeType = { STORY: 'STORY', BACK: 'BACK', LEVEL: 'LEVEL', ARTEFACT: 'ARTEFACT', SUCCESS: 'SUCCESS' };
        const TemplateType = { TOP_IMAGE: 'TOP_IMAGE', SIDE_IMAGE: 'SIDE_IMAGE', ONLY_TEXT: 'ONLY_TEXT', CINEMATIC: 'CINEMATIC', MULTI_LINK: 'MULTI_LINK' };
        
        const storyData = ${storyData};
        const nodes = storyData.nodes;

        const App = () => {
            const [currentNodeId, setCurrentNodeId] = useState(nodes[0]?.id);
            const [history, setHistory] = useState([]);
            const [direction, setDirection] = useState(1);
            const [activeTip, setActiveTip] = useState(null);
            const [timeLeft, setTimeLeft] = useState(null);
            
            const node = nodes.find(n => n.id === currentNodeId);

            // Preloading logic
            useEffect(() => {
                if (!node) return;
                const neighborIds = node.choices
                    .map(c => c.targetNodeId)
                    .filter(id => id && id !== currentNodeId);
                
                neighborIds.forEach(id => {
                    const neighborNode = nodes.find(n => n.id === id);
                    if (neighborNode) {
                        const urls = neighborNode.imageUrls && neighborNode.imageUrls.length > 0 
                            ? neighborNode.imageUrls 
                            : [neighborNode.imageUrl];
                        urls.forEach(url => {
                            if (url) {
                                const img = new Image();
                                img.src = getProcessedImageUrl(url);
                            }
                        });
                    }
                });
            }, [currentNodeId]);

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

            const ImageCarousel = ({ urls }) => {
                const [index, setIndex] = useState(0);
                const [refreshKey, setRefreshKey] = useState(0);
                if (!urls || urls.length === 0) return null;

                const next = (e) => {
                    e.stopPropagation();
                    setIndex((prev) => (prev + 1) % urls.length);
                };

                const prev = (e) => {
                    e.stopPropagation();
                    setIndex((prev) => (prev - 1 + urls.length) % urls.length);
                };

                const handleRefresh = (e) => {
                    e.stopPropagation();
                    setRefreshKey(prev => prev + 1);
                };

                return React.createElement('div', { className: 'relative w-full h-full group' },
                    React.createElement(AnimatePresence, { mode: 'wait' },
                        React.createElement(motion.img, {
                            key: \`\${index}-\${refreshKey}\`,
                            src: getProcessedImageUrl(urls[index]),
                            alt: 'Image ' + (index + 1),
                            initial: { opacity: 0 },
                            animate: { opacity: 1 },
                            exit: { opacity: 0 },
                            className: 'w-full h-full object-cover',
                            referrerPolicy: 'no-referrer',
                            onError: (e) => { e.target.src = 'https://picsum.photos/seed/error/800/600'; }
                        })
                    ),
                    React.createElement('button', {
                        onClick: handleRefresh,
                        className: 'absolute top-4 left-4 p-2 bg-slate-900/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900 border border-white/10 z-20',
                        title: 'Refresh Image'
                    }, React.createElement(RefreshCw, { className: 'w-4 h-4' })),
                    urls.length > 1 && React.createElement(React.Fragment, null,
                        React.createElement('button', {
                            onClick: prev,
                            className: 'absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900 border border-white/10'
                        }, React.createElement(ChevronLeft, { className: 'w-6 h-6' })),
                        React.createElement('button', {
                            onClick: next,
                            className: 'absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900 border border-white/10'
                        }, React.createElement(ChevronRight, { className: 'w-6 h-6' })),
                        React.createElement('div', { className: 'absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2' },
                            urls.map((_, i) => React.createElement('div', {
                                key: i,
                                className: \`w-2 h-2 rounded-full transition-all \${i === index ? 'bg-white w-6' : 'bg-white/40'}\`
                            }))
                        ),
                        React.createElement('div', { className: 'absolute top-6 right-6 bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10' },
                            (index + 1) + ' / ' + urls.length
                        )
                    )
                );
            };

            // Hide loading overlay once React starts
            useEffect(() => {
                const overlay = document.getElementById('loading-overlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 500);
                }
            }, []);

                const getProcessedImageUrl = (url) => {
                    if (!url) return 'https://picsum.photos/seed/placeholder/800/600';
                    const driveMatch = url.match(/(?:drive\\.google\\.com\\/(?:file\\/d\\/|open\\?id=)|docs\\.google\\.com\\/file\\/d\\/)([^\\/&?]+)/);
                    if (driveMatch) return \`https://drive.google.com/thumbnail?id=\${driveMatch[1]}&sz=w1600\`;
                    return url;
                };

            useEffect(() => {
                if (node?.type === NodeType.BACK) {
                    setDirection(-1);
                    if (history.length > 0) {
                        const newHistory = [...history];
                        const previousId = newHistory.pop();
                        setHistory(newHistory);
                        setTimeout(() => setCurrentNodeId(previousId), 0);
                    }
                }
            }, [node]);

            const handleNavigate = (targetId) => {
                const targetNode = nodes.find(n => n.id === targetId);
                if (!targetNode) return;
                setDirection(targetNode.type === NodeType.BACK ? -1 : 1);
                if (node && (node.type === NodeType.STORY || node.type === NodeType.LEVEL || node.type === NodeType.ARTEFACT || node.type === NodeType.SUCCESS) && targetNode.type !== NodeType.BACK) {
                    setHistory(prev => [...prev, node.id]);
                }
                setCurrentNodeId(targetId);
            };

            if (!node || node.type === NodeType.BACK) return null;

            const renderTemplate = () => {
                const renderHeader = (positionClass, isFloating) => {
                    if (!node) return null;
                    const hasPill = node.type === NodeType.LEVEL || node.type === NodeType.ARTEFACT || node.type === NodeType.SUCCESS;
                    if (!hasPill && !node.screenID) return null;

                    return React.createElement('div', { className: \`absolute z-10 flex items-center gap-3 \${positionClass}\` },
                        node.type === NodeType.LEVEL && React.createElement('div', { className: \`flex items-center gap-2 px-3 py-1 rounded-full border \${isFloating ? 'bg-emerald-500/80 backdrop-blur-md border-emerald-400/50 shadow-lg' : 'bg-emerald-500/20 border-emerald-500/30'}\` },
                            React.createElement('span', { className: \`text-[10px] font-bold uppercase tracking-widest \${isFloating ? 'text-white' : 'text-emerald-400'}\` }, 'Game Level')
                        ),
                        node.type === NodeType.ARTEFACT && React.createElement('div', { className: \`flex items-center gap-2 px-3 py-1 rounded-full border \${isFloating ? 'bg-amber-500/80 backdrop-blur-md border-amber-400/50 shadow-lg' : 'bg-amber-500/20 border-amber-500/30'}\` },
                            React.createElement('span', { className: \`text-[10px] font-bold uppercase tracking-widest \${isFloating ? 'text-white' : 'text-amber-400'}\` }, 'Artefact Found')
                        ),
                        node.type === NodeType.SUCCESS && React.createElement('div', { className: \`flex items-center gap-2 px-3 py-1 rounded-full border \${isFloating ? 'bg-red-500/80 backdrop-blur-md border-red-400/50 shadow-lg' : 'bg-red-500/20 border-red-500/30'}\` },
                            React.createElement('span', { className: \`text-[10px] font-bold uppercase tracking-widest \${isFloating ? 'text-white' : 'text-red-400'}\` }, 'Victory')
                        ),
                        node.screenID && React.createElement('div', { className: \`px-3 py-1 rounded-full border \${isFloating ? 'bg-slate-900/80 backdrop-blur-md border-white/20 shadow-lg' : 'bg-slate-100 border-slate-200'}\` }, 
                            React.createElement('span', { className: \`text-[10px] font-bold uppercase tracking-[0.2em] \${isFloating ? 'text-white' : 'text-slate-500'}\` }, node.screenID)
                        )
                    );
                };

                const sidebarChoices = node.choices
                    .filter(c => c.position === 'sidebar')
                    .map((choice) => (
                        React.createElement('button', {
                            key: choice.id,
                            disabled: !choice.targetNodeId,
                            onClick: () => choice.targetNodeId && handleNavigate(choice.targetNodeId),
                            className: \`flex items-center justify-between p-3 rounded-lg border transition-all w-full text-left \${
                                choice.targetNodeId 
                                    ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-100 cursor-pointer'
                                    : 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
                            }\`
                        }, 
                        React.createElement('span', { className: 'text-sm font-medium truncate pr-2' }, choice.label),
                        choice.targetNodeId && React.createElement(ArrowRight, { className: 'w-3.5 h-3.5 flex-shrink-0' }))
                    ));

                const bottomChoices = node.choices
                    .filter(c => c.position === 'bottom' || !c.position)
                    .map((choice) => (
                        React.createElement('button', {
                            key: choice.id,
                            disabled: !choice.targetNodeId,
                            onClick: () => choice.targetNodeId && handleNavigate(choice.targetNodeId),
                            className: \`flex items-center justify-between p-4 rounded-lg border transition-all \${
                                choice.targetNodeId 
                                    ? node.template === TemplateType.TOP_IMAGE || node.template === TemplateType.MULTI_LINK
                                        ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-100 cursor-pointer'
                                        : node.template === TemplateType.ONLY_TEXT
                                            ? 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-100 cursor-pointer'
                                            : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 cursor-pointer'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed'
                            } \${node.template === TemplateType.SIDE_IMAGE || node.template === TemplateType.ONLY_TEXT ? 'w-full p-5 rounded-xl' : ''}\`
                        }, 
                        React.createElement('span', { className: node.template === TemplateType.SIDE_IMAGE || node.template === TemplateType.ONLY_TEXT ? 'text-lg font-medium' : 'font-medium' }, choice.label),
                        choice.targetNodeId && React.createElement(
                            nodes.find(n => n.id === choice.targetNodeId)?.type === NodeType.BACK ? ArrowLeft : ArrowRight,
                            { className: node.template === TemplateType.SIDE_IMAGE || node.template === TemplateType.ONLY_TEXT ? 'w-5 h-5' : 'w-4 h-4' }
                        ))
                    ));

                if (node.template === TemplateType.ONLY_TEXT) {
                    return React.createElement('div', { className: 'flex flex-col h-full bg-slate-900 p-12 overflow-hidden relative' },
                        renderHeader('top-8 left-12', false),
                        React.createElement('div', { className: 'flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full overflow-y-auto pr-4 custom-scrollbar' },
                            React.createElement('h1', { className: 'text-5xl font-bold mb-8 tracking-tight text-white' }, node.title),
                            React.createElement('p', { className: 'text-2xl text-slate-300 mb-12 leading-relaxed whitespace-pre-wrap' }, node.content),
                            React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8' }, bottomChoices)
                        )
                    );
                }

                if (node.template === TemplateType.TOP_IMAGE) {
                    return React.createElement('div', { className: 'flex flex-col h-full overflow-hidden relative' },
                        renderHeader('top-6 left-6', true),
                        React.createElement('div', { className: 'flex-1 min-h-[200px] relative' },
                            React.createElement(ImageCarousel, { 
                                urls: node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl] 
                            })
                        ),
                        React.createElement('div', { className: 'p-8 bg-slate-900 border-t border-slate-800 overflow-y-auto max-h-[60%] custom-scrollbar' },
                            React.createElement('h1', { className: 'text-4xl font-bold mb-4 tracking-tight text-white' }, node.title),
                            React.createElement('p', { className: 'text-lg text-slate-300 mb-8 leading-relaxed max-w-3xl whitespace-pre-wrap' }, node.content),
                            React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4' }, bottomChoices)
                        )
                    );
                }

                if (node.template === TemplateType.CINEMATIC) {
                    return React.createElement('div', { className: 'flex flex-col h-full bg-slate-900 overflow-hidden relative' },
                        renderHeader('top-6 left-6', true),
                        React.createElement('div', { className: 'flex-1 relative bg-black overflow-hidden' },
                            React.createElement(ImageCarousel, { 
                                urls: node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl] 
                            })
                        ),
                        node.tips && node.tips.length > 0 && React.createElement('div', { className: 'h-12 bg-slate-950/80 backdrop-blur-md border-y border-slate-800 flex items-center px-6 gap-6 z-20 flex-shrink-0' },
                            React.createElement('span', { className: 'text-[10px] font-bold uppercase tracking-widest text-slate-500' }, 'Notices'),
                            React.createElement('div', { className: 'flex items-center gap-3' },
                                node.tips.map((tip) => React.createElement('button', {
                                    key: tip.id,
                                    onClick: () => setActiveTip(tip),
                                    title: tip.trigger,
                                    className: \`p-2 rounded-lg transition-all relative group \${activeTip && activeTip.id === tip.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}\`
                                }, 
                                tip.type === 'TIP' && React.createElement(MessageSquare, { className: 'w-4 h-4' }),
                                tip.type === 'POPUP' && React.createElement(AlertTriangle, { className: 'w-4 h-4' }),
                                tip.type === 'POWERUP' && React.createElement(Zap, { className: 'w-4 h-4' }),
                                tip.type === 'ELARA' && React.createElement(Sparkles, { className: 'w-4 h-4' }),
                                tip.type === 'GREMLINS' && React.createElement(Bug, { className: 'w-4 h-4' }),
                                tip.type === 'SYSTEM' && React.createElement(Cpu, { className: 'w-4 h-4' }),
                                React.createElement('div', { className: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[9px] text-slate-300 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30' }, tip.trigger)
                                ))
                            )
                        ),
                        React.createElement('div', { className: 'flex-shrink-0 p-6 bg-slate-900/50 border-t border-slate-800/50' },
                            React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full' }, bottomChoices)
                        )
                    );
                }

                if (node.template === TemplateType.MULTI_LINK) {
                    return React.createElement('div', { className: 'flex flex-col h-full bg-slate-900 overflow-hidden relative' },
                        React.createElement('div', { className: 'flex flex-1 min-h-0' },
                            React.createElement('div', { className: 'w-1/4 border-r border-slate-800 flex flex-col bg-slate-900/50' },
                                React.createElement('div', { className: 'p-6 border-b border-slate-800' },
                                    React.createElement('h2', { className: 'text-[10px] font-bold uppercase tracking-widest text-slate-500' }, 'Links')
                                ),
                                React.createElement('div', { className: 'flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar' },
                                    sidebarChoices.length > 0 ? sidebarChoices : React.createElement('div', { className: 'py-8 text-center' },
                                        React.createElement('p', { className: 'text-[10px] text-slate-600 uppercase tracking-widest' }, 'No sidebar links')
                                    )
                                )
                            ),
                            React.createElement('div', { className: 'flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-8' },
                                React.createElement('div', { className: 'relative w-full h-full max-h-[500px] rounded-xl overflow-hidden shadow-2xl border border-slate-800' },
                                    renderHeader('top-4 left-4', true),
                                    React.createElement(ImageCarousel, { 
                                        urls: node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl] 
                                    })
                                )
                            )
                        ),
                        React.createElement('div', { className: 'p-8 bg-slate-900 border-t border-slate-800 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]' },
                            React.createElement('div', { className: 'max-w-7xl mx-auto' },
                                React.createElement('div', { className: 'flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8' },
                                    React.createElement('div', { className: 'flex-1 min-w-0' },
                                        React.createElement('h1', { className: 'text-3xl font-bold mb-2 tracking-tight text-white' }, node.title),
                                        React.createElement('p', { className: 'text-base text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-2' }, node.content)
                                    )
                                ),
                                React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' }, bottomChoices)
                            )
                        )
                    );
                }

                return React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 h-full gap-8 p-8 overflow-hidden bg-slate-900 relative' },
                    renderHeader('top-8 left-8', false),
                    React.createElement('div', { className: 'flex-col overflow-y-auto pr-4 custom-scrollbar' },
                        React.createElement('div', { className: 'my-auto py-8' },
                            React.createElement('h1', { className: 'text-5xl font-bold mb-6 tracking-tight text-white' }, node.title),
                            React.createElement('p', { className: 'text-xl text-slate-300 mb-12 leading-relaxed whitespace-pre-wrap' }, node.content),
                            React.createElement('div', { className: 'space-y-4' }, bottomChoices)
                        )
                    ),
                    React.createElement('div', { className: 'relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 hidden lg:block' },
                        React.createElement(ImageCarousel, { 
                            urls: node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : [node.imageUrl] 
                        }),
                        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none' })
                    )
                );
            };

            return React.createElement('div', { className: 'fixed inset-0 bg-slate-950 flex items-center justify-center p-4 md:p-12' },
                React.createElement(motion.div, {
                    initial: { scale: 0.95, opacity: 0 },
                    animate: { scale: 1, opacity: 1 },
                    className: 'w-full max-w-6xl h-full max-h-[800px] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 relative'
                }, 
                React.createElement(AnimatePresence, { initial: false, custom: direction, mode: 'popLayout' },
                    React.createElement(motion.div, {
                        key: currentNodeId,
                        custom: direction,
                        variants: {
                            enter: (d) => ({ x: d * 100, opacity: 0, scale: 0.98 }),
                            center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
                            exit: (d) => ({ zIndex: 0, x: d * -100, opacity: 0, scale: 0.98 })
                        },
                        initial: 'enter',
                        animate: 'center',
                        exit: 'exit',
                        transition: { 
                            x: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.3 },
                            scale: { duration: 0.3 }
                        },
                        className: 'h-full w-full bg-slate-900 absolute inset-0'
                    }, renderTemplate())
                ),
                node.tips && node.tips.length > 0 && node.template !== TemplateType.CINEMATIC && React.createElement('div', { className: 'absolute bottom-0 left-0 right-0 h-12 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex items-center px-6 gap-6 z-20' },
                    React.createElement('span', { className: 'text-[10px] font-bold uppercase tracking-widest text-slate-500' }, 'Notices'),
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        node.tips.map((tip) => React.createElement('button', {
                            key: tip.id,
                            onClick: () => setActiveTip(tip),
                            title: tip.trigger,
                            className: \`p-2 rounded-lg transition-all relative group \${activeTip && activeTip.id === tip.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}\`
                        }, 
                        tip.type === 'TIP' && React.createElement(MessageSquare, { className: 'w-4 h-4' }),
                        tip.type === 'POPUP' && React.createElement(AlertTriangle, { className: 'w-4 h-4' }),
                        tip.type === 'POWERUP' && React.createElement(Zap, { className: 'w-4 h-4' }),
                        tip.type === 'ELARA' && React.createElement(Sparkles, { className: 'w-4 h-4' }),
                        tip.type === 'GREMLINS' && React.createElement(Bug, { className: 'w-4 h-4' }),
                        tip.type === 'SYSTEM' && React.createElement(Cpu, { className: 'w-4 h-4' }),
                        React.createElement('div', { className: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[9px] text-slate-300 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30' }, tip.trigger)
                        ))
                    )
                ),
                React.createElement(AnimatePresence, null,
                    activeTip && React.createElement(motion.div, {
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        exit: { opacity: 0 },
                        className: 'absolute inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6',
                        onClick: () => { if (activeTip.duration === 'tap') setActiveTip(null); }
                    },
                    React.createElement(motion.div, {
                        initial: { scale: 0.9, opacity: 0, y: 20 },
                        animate: { scale: 1, opacity: 1, y: 0 },
                        exit: { scale: 0.9, opacity: 0, y: 20 },
                        onClick: (e) => e.stopPropagation(),
                        className: \`max-w-md w-full rounded-2xl shadow-2xl border-2 p-8 space-y-6 text-center relative \${
                            activeTip.type === 'TIP' ? 'bg-slate-900 border-blue-500 shadow-blue-500/10' : 
                            activeTip.type === 'POPUP' ? 'bg-slate-900 border-amber-500 shadow-amber-500/10' : 
                            activeTip.type === 'POWERUP' ? 'bg-slate-900 border-yellow-500 shadow-yellow-500/10' :
                            activeTip.type === 'ELARA' ? 'bg-[#f5f5dc] border-[#d2b48c] shadow-black/20' :
                            activeTip.type === 'GREMLINS' ? 'bg-black border-yellow-400/50 shadow-yellow-400/5' :
                            'bg-black border-orange-500 shadow-orange-500/10'
                        }\`
                    },
                    activeTip.type === 'ELARA' && React.createElement('button', {
                        onClick: () => setActiveTip(null),
                        className: 'absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 text-black/50 transition-colors'
                    }, React.createElement(X, { className: 'w-5 h-5' })),
                    React.createElement('div', { className: 'flex flex-col items-center gap-4' },
                        activeTip.type !== 'POPUP' && activeTip.type !== 'GREMLINS' && React.createElement('div', { className: \`p-4 rounded-2xl \${
                            activeTip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400' : 
                            activeTip.type === 'POWERUP' ? 'bg-yellow-500/10 text-yellow-400' :
                            activeTip.type === 'ELARA' ? 'bg-black/5 text-black/60' :
                            'bg-orange-500/10 text-orange-500'
                        }\` },
                            activeTip.type === 'TIP' && React.createElement(MessageSquare, { className: 'w-8 h-8' }),
                            activeTip.type === 'POWERUP' && React.createElement(Zap, { className: 'w-8 h-8' }),
                            activeTip.type === 'ELARA' && React.createElement(Sparkles, { className: 'w-8 h-8' }),
                            activeTip.type === 'SYSTEM' && React.createElement(Cpu, { className: 'w-8 h-8' })
                        ),
                        React.createElement('h3', { className: \`text-[10px] font-bold uppercase tracking-[0.2em] \${
                            activeTip.type === 'ELARA' ? 'text-black/40' :
                            activeTip.type === 'GREMLINS' ? 'text-yellow-400/40' :
                            activeTip.type === 'SYSTEM' ? 'text-orange-500/40' :
                            'text-slate-500'
                        }\` }, 
                            activeTip.type === 'TIP' ? 'Notice' : 
                            activeTip.type === 'POPUP' ? '' : 
                            activeTip.type === 'POWERUP' ? 'Power-up Reveal' :
                            activeTip.type === 'ELARA' ? 'Elara Dialogue' :
                            activeTip.type === 'GREMLINS' ? 'Gremlin Ticker' : 'System Alert')
                    ),
                    React.createElement('p', { className: \`text-xl font-medium leading-relaxed \${
                        activeTip.type === 'ELARA' ? 'text-black font-serif' :
                        activeTip.type === 'GREMLINS' ? 'text-yellow-400 font-mono' :
                        activeTip.type === 'SYSTEM' ? 'text-orange-500 font-mono' :
                        'text-slate-100'
                    }\` }, activeTip.copy),
                    React.createElement('div', { className: 'pt-4 flex flex-col items-center gap-4' },
                        activeTip.duration === 'tap' ? React.createElement('button', {
                            onClick: () => setActiveTip(null),
                            className: \`px-8 py-3 rounded-xl transition-all font-bold text-sm border shadow-lg \${
                                activeTip.type === 'ELARA' ? 'bg-black text-white border-black hover:bg-black/80' :
                                activeTip.type === 'GREMLINS' ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300' :
                                activeTip.type === 'SYSTEM' ? 'bg-orange-500 text-black border-orange-500 hover:bg-orange-400' :
                                'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                            }\`
                        }, 'Dismiss') : React.createElement('div', { className: 'flex flex-col items-center gap-2' },
                            React.createElement('div', { className: \`w-48 h-1 rounded-full overflow-hidden \${activeTip.type === 'ELARA' ? 'bg-black/10' : 'bg-slate-800'}\` },
                                React.createElement(motion.div, {
                                    initial: { width: '100%' },
                                    animate: { width: '0%' },
                                    transition: { duration: activeTip.duration, ease: 'linear' },
                                    className: \`h-full \${
                                        activeTip.type === 'TIP' ? 'bg-blue-500' : 
                                        activeTip.type === 'POPUP' ? 'bg-amber-500' : 
                                        activeTip.type === 'POWERUP' ? 'bg-yellow-500' :
                                        activeTip.type === 'ELARA' ? 'bg-black' :
                                        activeTip.type === 'GREMLINS' ? 'bg-yellow-400' :
                                        'bg-orange-500'
                                    }\`
                                })
                            ),
                            React.createElement('span', { className: \`text-[10px] font-mono \${activeTip.type === 'ELARA' ? 'text-black/40' : 'text-slate-500'}\` }, 'Closing in ' + timeLeft + 's'),
                            React.createElement('button', {
                                onClick: () => setActiveTip(null),
                                className: \`text-xs transition-colors mt-2 \${activeTip.type === 'ELARA' ? 'text-black/40 hover:text-black' : 'text-slate-500 hover:text-slate-300'}\`
                            }, 'Close early')
                        )
                    )
                    ))
                )
                )
            );
        };

        const root = createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>`;
};
