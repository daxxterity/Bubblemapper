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
  Layout, Image as ImageIcon2, Link2, MoreHorizontal
} from 'lucide-react';
import { NodeData, NodeType, TemplateType, Choice, Tip, TipType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface NodeEditorProps {
  selectedNode: NodeData;
  onUpdateNode: (id: string, data: Partial<NodeData>) => void;
  onDeleteNode: (id: string) => void;
}

type TabType = 'main' | 'images' | 'links' | 'extras';

export const NodeEditor: React.FC<NodeEditorProps> = ({ selectedNode, onUpdateNode, onDeleteNode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('main');

  const handleUpdateNode = (data: Partial<NodeData>) => {
    onUpdateNode(selectedNode.id, data);
  };

  const renderMainTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Node Type</label>
          <div className="flex bg-slate-800/50 p-0.5 rounded-md border border-slate-700">
            {[
              { type: NodeType.STORY, label: 'Story', color: 'bg-blue-600' },
              { type: NodeType.LEVEL, label: 'Level', color: 'bg-emerald-600' },
              { type: NodeType.ARTEFACT, label: 'Artfct', color: 'bg-amber-600' },
              { type: NodeType.SUCCESS, label: 'Succss', color: 'bg-red-600' },
              { type: NodeType.BACK, label: 'Back', color: 'bg-purple-600' },
            ].map((item) => (
              <button 
                key={item.type}
                onClick={() => handleUpdateNode({ type: item.type })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                  selectedNode.type === item.type 
                    ? `${item.color} text-white` 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Node Color</label>
        <div className="flex flex-wrap gap-2">
          {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b', '#000000'].map(color => (
            <button
              key={color}
              onClick={() => handleUpdateNode({ color })}
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

  const renderExtrasTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notices & Popups</label>
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
            handleUpdateNode({ tips: [...(selectedNode.tips || []), newTip] });
          }}
          className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <Reorder.Group 
        axis="y" 
        values={selectedNode.tips || []} 
        onReorder={(newTips) => handleUpdateNode({ tips: newTips })}
        className="space-y-3"
      >
        {(selectedNode.tips || []).map((tip) => (
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
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {tip.type === 'TIP' && <MessageSquare className="w-4 h-4" />}
                    {tip.type === 'POPUP' && <AlertTriangle className="w-4 h-4" />}
                    {tip.type === 'POWERUP' && <Zap className="w-4 h-4" />}
                  </div>
                  <select 
                    value={tip.type}
                    onChange={(e) => {
                      const newTips = (selectedNode.tips || []).map(t => 
                        t.id === tip.id ? { ...t, type: e.target.value as TipType } : t
                      ) as Tip[];
                      handleUpdateNode({ tips: newTips });
                    }}
                    className="bg-transparent text-xs font-bold uppercase tracking-wider text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="TIP">Notice</option>
                    <option value="POPUP">Popup</option>
                    <option value="POWERUP">Power-up</option>
                  </select>
                </div>
                <button 
                  onClick={() => {
                    const newTips = (selectedNode.tips || []).filter(t => t.id !== tip.id);
                    handleUpdateNode({ tips: newTips });
                  }}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <textarea 
                value={tip.copy}
                onChange={(e) => {
                  const newTips = (selectedNode.tips || []).map(t => 
                    t.id === tip.id ? { ...t, copy: e.target.value } : t
                  ) as Tip[];
                  handleUpdateNode({ tips: newTips });
                }}
                placeholder="Notice copy text..."
                rows={3}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="text"
                    value={tip.trigger}
                    onChange={(e) => {
                      const newTips = (selectedNode.tips || []).map(t => 
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
                      const newTips = (selectedNode.tips || []).map(t => 
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
                        const newTips = (selectedNode.tips || []).map(t => 
                          t.id === tip.id ? { ...t, duration: parseInt(e.target.value) || 1 } : t
                        ) as Tip[];
                        handleUpdateNode({ tips: newTips });
                      }}
                      className="w-10 bg-transparent text-xs text-right focus:outline-none font-mono"
                    />
                  )}
                </div>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {(selectedNode.tips || []).length === 0 && (
        <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
          <MoreHorizontal className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-600 uppercase tracking-widest">No extras added</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
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
            {selectedNode.type === NodeType.STORY && <Settings2 className="w-4 h-4" />}
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            {selectedNode.type === NodeType.BACK ? 'Back Node' : 
             selectedNode.type === NodeType.LEVEL ? 'Level Node' : 
             selectedNode.type === NodeType.ARTEFACT ? 'Artefact Node' :
             selectedNode.type === NodeType.SUCCESS ? 'Success Node' : 
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

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/30">
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
      <div className="flex-1 overflow-y-auto p-6 pb-24 custom-scrollbar bg-slate-900/20">
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
