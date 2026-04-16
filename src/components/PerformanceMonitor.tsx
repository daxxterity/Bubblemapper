import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PerformanceMonitor: React.FC = () => {
  const [fps, setFps] = useState(0);
  const [maxDelta, setMaxDelta] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const maxDeltaRef = useRef(0);

  // Track render counts via incrementing state in an effect that runs every render
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const now = performance.now();
      const delta = now - lastTime.current;
      
      if (delta > maxDeltaRef.current && delta < 2000) { // filter out tab focus pauses
        maxDeltaRef.current = delta;
        setMaxDelta(Math.round(delta));
      }

      frameCount.current++;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = now;
        // Reset max delta every second to see recent spikes
        maxDeltaRef.current = 0;
      }
      
      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-500 rounded-full border border-slate-700 z-50 transition-colors shadow-lg"
        title="Show Performance Monitor"
      >
        <Activity className="w-4 h-4" />
      </button>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-4 left-4 w-64 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden font-mono"
    >
      <div className="bg-slate-800/50 px-3 py-2 border-bottom border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
          <Zap className="w-3 h-3 text-yellow-500" />
          Diagnostics
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-slate-500 hover:text-slate-300"
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs text-[10px]">Frame Rate</span>
          <span className={`text-sm font-bold ${fps > 50 ? 'text-green-400' : fps > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fps} FPS
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs text-[10px]">Worst Frame</span>
          <span className={`text-sm font-bold ${maxDelta < 32 ? 'text-green-400' : maxDelta < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
            {maxDelta}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs text-[10px]">App Renders</span>
          <span className="text-sm font-bold text-blue-400">
            {renderCount}
          </span>
        </div>

        {maxDelta > 1500 && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
            <AlertCircle className="w-3 h-3 text-red-400 mt-0.5" />
            <p className="text-[9px] text-red-300 leading-tight">
              CRITICAL HANG DETECTED. Please report the Worst Frame value.
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-950/50 text-[9px] text-slate-600 italic border-t border-slate-800">
        Monitoring Main Thread latency...
      </div>
    </motion.div>
  );
};
