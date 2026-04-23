import React, { useState } from 'react';

// Helper to handle Google Drive links and other common image issues
const getProcessedImageUrl = (url: string) => {
  if (!url) return 'https://picsum.photos/seed/placeholder/800/600';
  
  // Handle Google Drive links by converting to direct download/thumbnail links
  const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([^\/&?]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
  }
  
  return url;
};
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  Settings2, Trash2, RotateCcw, Gamepad2, Gem, Trophy, 
  Plus, ImageIcon, MessageSquare, AlertTriangle, Zap, 
  Clock, Hand, Link as LinkIcon, GripVertical, 
  Layout, Image as ImageIcon2, Link2, MoreHorizontal,
  Sparkles, Bug, Cpu, ChevronDown, ChevronUp, Maximize2, Minimize2,
  Expand, Eye
} from 'lucide-react';
import { NodeData, NodeType, TemplateType, Choice, Tip, TipType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface NodeEditorProps {
  selectedNode: NodeData;
  onUpdateNode: (id: string, data: Partial<NodeData>) => void;
  onDeleteNode: (id: string) => void;
  onFullscreenToggle?: () => void;
  initialTab?: TabType;
  hideHeader?: boolean;
}

type TabType = 'main' | 'images' | 'links' | 'extras';

export const NodeEditor: React.FC<NodeEditorProps> = ({ selectedNode, onUpdateNode, onDeleteNode, onFullscreenToggle, initialTab, hideHeader }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'main');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);

  const handleUpdateNode = (data: Partial<NodeData>) => {
    onUpdateNode(selectedNode.id, data);
  };

  const renderMainTab = () => (
    <div className="space-y-6">
      {selectedNode.type === NodeType.THUMBNAIL && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
          <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Thumbnail Layout</label>
          <div className="flex gap-2">
            {[
              { id: '3:4', label: '3:4 Portrait' },
              { id: '16:9', label: '16:9 Landscape' }
            ].map(aspect => (
              <button
                key={aspect.id}
                onClick={() => handleUpdateNode({ aspectRatio: aspect.id as any })}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                  (selectedNode.aspectRatio || '3:4') === aspect.id
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {aspect.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Node Type</label>
          <button 
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            onBlur={() => setTimeout(() => setIsTypeDropdownOpen(false), 200)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 text-left flex items-center justify-between hover:border-slate-500 transition-colors"
          >
            <span className="truncate">
              {Object.entries(NodeType).find(([_, v]) => v === selectedNode.type)?.[0] || 'Story'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isTypeDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 left-0 right-0 top-full mt-1 bg-black border border-slate-700 rounded-lg shadow-2xl overflow-hidden py-1"
              >
                {Object.values(NodeType).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      handleUpdateNode({ type });
                      setIsTypeDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                      selectedNode.type === type ? 'text-blue-400 bg-slate-900' : 'text-slate-300'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Node Color</label>
          <button 
            onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
            onBlur={() => setTimeout(() => setIsColorDropdownOpen(false), 200)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 text-left flex items-center justify-between hover:border-slate-500 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <div 
                className="w-2.5 h-2.5 rounded-full border border-white/20"
                style={{ backgroundColor: selectedNode.color || '#3b82f6' }}
              />
              <span className="truncate">
                {['Blue', 'Green', 'Amber', 'Red', 'Pink', 'Purple', 'Slate', 'Black'][
                  ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b', '#000000'].indexOf(selectedNode.color || '#3b82f6')
                ] || 'Blue'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isColorDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isColorDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 left-0 right-0 top-full mt-1 bg-black border border-slate-700 rounded-lg shadow-2xl overflow-hidden py-1 max-h-48 overflow-y-auto custom-scrollbar"
              >
                {[
                  { name: 'Blue', value: '#3b82f6' },
                  { name: 'Green', value: '#10b981' },
                  { name: 'Amber', value: '#f59e0b' },
                  { name: 'Red', value: '#ef4444' },
                  { name: 'Pink', value: '#ec4899' },
                  { name: 'Purple', value: '#8b5cf6' },
                  { name: 'Slate', value: '#64748b' },
                  { name: 'Black', value: '#000000' },
                ].map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      handleUpdateNode({ color: color.value });
                      setIsColorDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-800 transition-colors flex items-center gap-3 ${
                      selectedNode.color === color.value ? 'bg-slate-900 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className={selectedNode.color === color.value ? 'text-white font-bold' : 'text-slate-300'}>
                      {color.name}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Title</label>
        <input 
          type="text"
          value={selectedNode.title}
          onChange={(e) => handleUpdateNode({ title: e.target.value })}
          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Screen ID (Optional)</label>
        <input 
          type="text"
          value={selectedNode.screenID || ''}
          onChange={(e) => handleUpdateNode({ screenID: e.target.value })}
          placeholder="Leave blank to hide"
          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {selectedNode.type !== NodeType.BACK && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Content Text</label>
            <textarea 
              value={selectedNode.content}
              onChange={(e) => handleUpdateNode({ content: e.target.value })}
              rows={4}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Template Selection</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: TemplateType.TOP_IMAGE, label: 'Top Image', icon: <div className="w-full h-4 bg-current opacity-20 rounded-sm" /> },
                { type: TemplateType.SIDE_IMAGE, label: 'Side Image', icon: (
                  <div className="flex gap-1 w-full h-4">
                    <div className="flex-1 bg-current opacity-20 rounded-sm" />
                    <div className="w-1/3 bg-current opacity-20 rounded-sm" />
                  </div>
                )},
                { type: TemplateType.ONLY_TEXT, label: 'Only Text', icon: (
                  <div className="w-full h-4 border border-current border-dashed opacity-20 rounded-sm flex items-center justify-center">
                    <span className="text-[6px]">T</span>
                  </div>
                )},
                { type: TemplateType.CINEMATIC, label: 'Cinematic', icon: (
                  <div className="w-full flex flex-col gap-0.5 h-4">
                    <div className="flex-1 bg-current opacity-20 rounded-sm" />
                    <div className="h-0.5 bg-current opacity-40 rounded-sm" />
                    <div className="h-1 bg-current opacity-20 rounded-sm" />
                  </div>
                )},
                { type: TemplateType.MULTI_LINK, label: 'Multi-Link', icon: (
                  <div className="flex w-full h-4 gap-0.5">
                    <div className="w-1/4 bg-current opacity-40 rounded-sm" />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex-1 bg-current opacity-20 rounded-sm" />
                      <div className="h-1 bg-current opacity-20 rounded-sm" />
                    </div>
                  </div>
                )},
              ].map((tmpl) => (
                <button 
                  key={tmpl.type}
                  onClick={() => handleUpdateNode({ template: tmpl.type })}
                  className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    selectedNode.template === tmpl.type 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5' 
                      : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {tmpl.icon}
                  <span className="text-[9px] font-bold uppercase tracking-wider">{tmpl.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderImagesTab = () => {
    const imageUrls = selectedNode.imageUrls || [selectedNode.imageUrl];
    const imageCaptions = selectedNode.imageCaptions || [];

    const handleReorder = (newUrls: string[]) => {
      // When reordering URLs, we need to reorder captions too
      const newCaptions = newUrls.map(url => {
        const oldIdx = imageUrls.indexOf(url);
        return imageCaptions[oldIdx] || '';
      });
      handleUpdateNode({ imageUrls: newUrls, imageCaptions: newCaptions, imageUrl: newUrls[0] || '' });
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Image Gallery</label>
          <button 
            onClick={() => {
              const newUrls = [...imageUrls, ''];
              handleUpdateNode({ imageUrls: newUrls });
            }}
            className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <Reorder.Group axis="y" values={imageUrls} onReorder={handleReorder} className="space-y-3">
          {imageUrls.map((url, idx) => (
            <Reorder.Item 
              key={`${url}-${idx}`} 
              value={url}
              className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden group/img"
            >
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />
                  
                  {/* Thumbnail Preview */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0 shadow-inner">
                    <img 
                      src={getProcessedImageUrl(url)} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/100/100';
                      }}
                    />
                  </div>

                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...imageUrls];
                        newUrls[idx] = e.target.value;
                        handleUpdateNode({ 
                          imageUrls: newUrls,
                          imageUrl: newUrls[0]
                        });
                      }}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                      placeholder="Image URL (https://...)"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const newUrls = imageUrls.filter((_, i) => i !== idx);
                      const newCaptions = imageCaptions.filter((_, i) => i !== idx);
                      handleUpdateNode({ 
                        imageUrls: newUrls,
                        imageCaptions: newCaptions,
                        imageUrl: newUrls[0] || ''
                      });
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="relative">
                  <input 
                    type="text"
                    value={imageCaptions[idx] || ''}
                    onChange={(e) => {
                      const newCaptions = [...imageCaptions];
                      // Ensure array is long enough
                      while (newCaptions.length <= idx) newCaptions.push('');
                      newCaptions[idx] = e.target.value;
                      handleUpdateNode({ imageCaptions: newCaptions });
                    }}
                    placeholder="Add a caption for this image..."
                    className="w-full bg-slate-900/30 border border-slate-700/50 rounded-lg px-3 py-1.5 text-[11px] italic text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {imageUrls.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <ImageIcon className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-xs text-slate-600 uppercase tracking-widest">No images added</p>
          </div>
        )}
      </div>
    );
  };

  const renderLinksTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choices / Links</label>
        <button 
          onClick={() => {
            const newChoice: Choice = { id: uuidv4(), label: 'New Choice', targetNodeId: null };
            handleUpdateNode({ choices: [...selectedNode.choices, newChoice] });
          }}
          className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {selectedNode.choices.map((choice, idx) => (
          <div key={choice.id} className="group relative space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <input 
                type="text"
                value={choice.label}
                onChange={(e) => {
                  const newChoices = [...selectedNode.choices];
                  newChoices[idx] = { ...choice, label: e.target.value };
                  handleUpdateNode({ choices: newChoices });
                }}
                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                placeholder="Choice Label"
              />
              <button 
                onClick={() => {
                  const newChoices = selectedNode.choices.filter(c => c.id !== choice.id);
                  handleUpdateNode({ choices: newChoices });
                }}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between bg-slate-900/30 p-2 rounded-lg border border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Placement</span>
              <div className="flex bg-slate-900/50 p-0.5 rounded-md border border-slate-700">
                <button 
                  onClick={() => {
                    const newChoices = [...selectedNode.choices];
                    newChoices[idx] = { ...choice, position: 'sidebar' };
                    handleUpdateNode({ choices: newChoices });
                  }}
                  className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${
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
                    handleUpdateNode({ choices: newChoices });
                  }}
                  className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${
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

        {selectedNode.choices.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <Link2 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-xs text-slate-600 uppercase tracking-widest">No links added</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderExtrasTab = () => {
    const tips = selectedNode.tips || [];
    const allExpanded = tips.length > 0 && tips.every(t => t.isExpanded);

    const toggleAll = () => {
      const newTips = tips.map(t => ({ ...t, isExpanded: !allExpanded }));
      handleUpdateNode({ tips: newTips });
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notices & Popups</label>
          </div>
          <div className="flex items-center gap-2">
            {onFullscreenToggle && (
              <button 
                onClick={onFullscreenToggle}
                title="Fullscreen View"
                className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"
              >
                <Expand className="w-4 h-4" />
              </button>
            )}
            {tips.length > 0 && (
              <button 
                onClick={toggleAll}
                title={allExpanded ? "Collapse All" : "Expand All"}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {allExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            <button 
              onClick={() => {
                const newTip: Tip = { 
                  id: uuidv4(), 
                  type: 'TIP', 
                  copy: 'New notice text...', 
                  trigger: 'Trigger condition...', 
                  duration: 'tap',
                  isExpanded: true
                };
                handleUpdateNode({ tips: [...tips, newTip] });
              }}
              className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Reorder.Group 
          axis="y" 
          values={tips} 
          onReorder={(newTips) => handleUpdateNode({ tips: newTips })}
          className="space-y-3"
        >
          {tips.map((tip) => (
            <Reorder.Item 
              key={tip.id} 
              value={tip}
              className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden group/tip"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-slate-600 cursor-grab active:cursor-grabbing" />
                  <div className="flex-1 flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      tip.type === 'TIP' ? 'bg-blue-500/10 text-blue-400' :
                      tip.type === 'POPUP' ? 'bg-amber-500/10 text-amber-400' :
                      tip.type === 'POWERUP' ? 'bg-yellow-500/10 text-yellow-400' :
                      tip.type === 'ELARA' ? 'bg-rose-500/10 text-rose-400' :
                      tip.type === 'GREMLINS' ? 'bg-lime-500/10 text-lime-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {tip.type === 'TIP' && <MessageSquare className="w-4 h-4" />}
                      {tip.type === 'POPUP' && <AlertTriangle className="w-4 h-4" />}
                      {tip.type === 'POWERUP' && <Zap className="w-4 h-4" />}
                      {tip.type === 'ELARA' && <Sparkles className="w-4 h-4" />}
                      {tip.type === 'GREMLINS' && <Bug className="w-4 h-4" />}
                      {tip.type === 'SYSTEM' && <Cpu className="w-4 h-4" />}
                    </div>
                    <select 
                      value={tip.type}
                      onChange={(e) => {
                        const newTips = tips.map(t => 
                          t.id === tip.id ? { ...t, type: e.target.value as TipType } : t
                        ) as Tip[];
                        handleUpdateNode({ tips: newTips });
                      }}
                      className="bg-transparent text-xs font-bold uppercase tracking-wider text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="TIP" className="text-slate-900">Notice</option>
                      <option value="POPUP" className="text-slate-900">Popup</option>
                      <option value="POWERUP" className="text-slate-900">Power-up</option>
                      <option value="ELARA" className="text-slate-900">Elara</option>
                      <option value="GREMLINS" className="text-slate-900">Gremlins</option>
                      <option value="SYSTEM" className="text-slate-900">System</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        const newTips = tips.map(t => 
                          t.id === tip.id ? { ...t, isExpanded: !t.isExpanded } : t
                        );
                        handleUpdateNode({ tips: newTips });
                      }}
                      className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {tip.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => {
                        const newTips = tips.filter(t => t.id !== tip.id);
                        handleUpdateNode({ tips: newTips });
                      }}
                      className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {tip.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      {tip.type === 'GREMLINS' ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Line 1 (Max 80 chars)</label>
                              <span className={`text-[9px] font-mono ${tip.copy.length > 80 ? 'text-red-400' : 'text-slate-600'}`}>
                                {tip.copy.length}/80
                              </span>
                            </div>
                            <input 
                              type="text"
                              value={tip.copy}
                              maxLength={80}
                              onChange={(e) => {
                                const newTips = tips.map(t => 
                                  t.id === tip.id ? { ...t, copy: e.target.value } : t
                                ) as Tip[];
                                handleUpdateNode({ tips: newTips });
                              }}
                              placeholder="Line 1 text..."
                              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-lime-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Line 2 (Max 80 chars)</label>
                              <span className={`text-[9px] font-mono ${(tip.copy2 || '').length > 80 ? 'text-red-400' : 'text-slate-600'}`}>
                                {(tip.copy2 || '').length}/80
                              </span>
                            </div>
                            <input 
                              type="text"
                              value={tip.copy2 || ''}
                              maxLength={80}
                              onChange={(e) => {
                                const newTips = tips.map(t => 
                                  t.id === tip.id ? { ...t, copy2: e.target.value } : t
                                ) as Tip[];
                                handleUpdateNode({ tips: newTips });
                              }}
                              placeholder="Line 2 text (optional)..."
                              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-lime-500/50"
                            />
                          </div>
                        </div>
                      ) : (
                        <textarea 
                          value={tip.copy}
                          onChange={(e) => {
                            const newTips = tips.map(t => 
                              t.id === tip.id ? { ...t, copy: e.target.value } : t
                            ) as Tip[];
                            handleUpdateNode({ tips: newTips });
                          }}
                          placeholder="Notice copy text..."
                          rows={3}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                        />
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                          <input 
                            type="text"
                            value={tip.trigger}
                            onChange={(e) => {
                              const newTips = tips.map(t => 
                                t.id === tip.id ? { ...t, trigger: e.target.value } : t
                              ) as Tip[];
                              handleUpdateNode({ tips: newTips });
                            }}
                            placeholder="Trigger..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5">
                          {tip.duration === 'tap' ? (
                            <Hand className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <button 
                            onClick={() => {
                              const newTips = tips.map(t => 
                                t.id === tip.id ? { ...t, duration: t.duration === 'tap' ? 5 : 'tap' } : t
                              ) as Tip[];
                              handleUpdateNode({ tips: newTips });
                            }}
                            className="text-xs text-slate-300 hover:text-white transition-colors flex-1 text-left"
                          >
                            {tip.duration === 'tap' ? 'Tap' : `${tip.duration}s`}
                          </button>
                          {tip.duration !== 'tap' && (
                            <input 
                              type="number"
                              value={tip.duration}
                              onChange={(e) => {
                                const newTips = tips.map(t => 
                                  t.id === tip.id ? { ...t, duration: parseInt(e.target.value) || 1 } : t
                                ) as Tip[];
                                handleUpdateNode({ tips: newTips });
                              }}
                              className="w-10 bg-transparent text-xs text-right focus:outline-none font-mono"
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!tip.isExpanded && (
                  <div className="text-[10px] text-slate-500 truncate italic px-1">
                    {tip.copy || 'No content...'}
                  </div>
                )}
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {tips.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <MoreHorizontal className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-xs text-slate-600 uppercase tracking-widest">No extras added</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!hideHeader && (
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selectedNode.type === NodeType.BACK ? 'bg-purple-500/10 text-purple-400' :
              selectedNode.type === NodeType.LEVEL ? 'bg-emerald-500/10 text-emerald-400' :
              selectedNode.type === NodeType.ARTEFACT ? 'bg-amber-500/10 text-amber-400' :
              selectedNode.type === NodeType.SUCCESS ? 'bg-red-500/10 text-red-400' :
              'bg-blue-500/10 text-blue-400'
            }`}>
              {selectedNode.type === NodeType.BACK && <RotateCcw className="w-4 h-4" />}
              {selectedNode.type === NodeType.LEVEL && <Gamepad2 className="w-4 h-4" />}
              {selectedNode.type === NodeType.ARTEFACT && <Gem className="w-4 h-4" />}
              {selectedNode.type === NodeType.SUCCESS && <Trophy className="w-4 h-4" />}
              {selectedNode.type === NodeType.THUMBNAIL && <Eye className="w-4 h-4" />}
              {selectedNode.type === NodeType.STORY && <Settings2 className="w-4 h-4" />}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              {selectedNode.type === NodeType.BACK ? 'Back Node' : 
               selectedNode.type === NodeType.LEVEL ? 'Level Node' : 
               selectedNode.type === NodeType.ARTEFACT ? 'Artefact Node' :
               selectedNode.type === NodeType.SUCCESS ? 'Success Node' : 
               selectedNode.type === NodeType.THUMBNAIL ? 'Thumbnail Node' : 
               'Context Window'}
            </span>
          </div>
          <button 
            onClick={() => onDeleteNode(selectedNode.id)}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/30 shrink-0">
        {[
          { id: 'main', label: 'Main', icon: <Layout className="w-3.5 h-3.5" /> },
          { id: 'images', label: 'Images', icon: <ImageIcon2 className="w-3.5 h-3.5" /> },
          { id: 'links', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
          { id: 'extras', label: 'Extras', icon: <MoreHorizontal className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-all relative ${
              activeTab === tab.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-12 custom-scrollbar bg-slate-900/20 [scrollbar-gutter:stable]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedNode.type === NodeType.BACK && activeTab !== 'main' ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <RotateCcw className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-widest">
                  Back nodes only have basic settings
                </p>
              </div>
            ) : (
              <>
                {activeTab === 'main' && renderMainTab()}
                {activeTab === 'images' && renderImagesTab()}
                {activeTab === 'links' && renderLinksTab()}
                {activeTab === 'extras' && renderExtrasTab()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
