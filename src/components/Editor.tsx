import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva';
import { NodeData, Connection, Choice, NodeType } from '../types';

export interface EditorRef {
  getViewportCenter: () => { x: number, y: number };
}

interface EditorProps {
  nodes: NodeData[];
  connections: Connection[];
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeSelect: (nodeOrIds: any, shiftKey: boolean) => void;
  onStartConnection: (nodeId: string, choiceId: string) => void;
  onEndConnection: (nodeId: string) => void;
  selectedNodeIds: string[];
  pendingConnection: { nodeId: string, choiceId: string } | null;
  mousePos: { x: number, y: number };
  onMouseMove: (e: any) => void;
  onStageClick: (x: number, y: number) => void;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const BACK_NODE_WIDTH = 140;
const BACK_NODE_HEIGHT = 60;
const CHOICE_START_Y = 50;
const CHOICE_HEIGHT = 20;

export const Editor = forwardRef<EditorRef, EditorProps>(({
  nodes,
  connections,
  onNodeMove,
  onNodeSelect,
  onStartConnection,
  onEndConnection,
  selectedNodeIds,
  pendingConnection,
  mousePos,
  onMouseMove,
  onStageClick,
}, ref) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number, isAdding: boolean } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (!isSpacePressed) {
          setIsSpacePressed(true);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    const handleBlur = () => setIsSpacePressed(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isSpacePressed]);

  useImperativeHandle(ref, () => ({
    getViewportCenter: () => {
      const stage = stageRef.current;
      if (!stage) return { x: 300, y: 200 };
      
      const scale = stage.scaleX();
      const x = stage.x();
      const y = stage.y();
      
      return {
        x: (dimensions.width / 2 - x) / scale,
        y: (dimensions.height / 2 - y) / scale
      };
    }
  }));

  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.disconnect();
  }, []);

  const renderConnections = () => {
    const lines = connections.map((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
      const toNode = nodes.find((n) => n.id === conn.toNodeId);
      if (!fromNode || !toNode) return null;

      const choiceIndex = fromNode.choices.findIndex(c => c.id === conn.choiceId);
      const isFromBack = fromNode.type === NodeType.BACK;
      const isToBack = toNode.type === NodeType.BACK;
      
      const fromW = isFromBack ? BACK_NODE_WIDTH : NODE_WIDTH;
      const toW = isToBack ? BACK_NODE_WIDTH : NODE_WIDTH;
      const toH = isToBack ? BACK_NODE_HEIGHT : NODE_HEIGHT;

      const startX = fromNode.x + fromW;
      const startY = fromNode.y + CHOICE_START_Y + (choiceIndex * CHOICE_HEIGHT);
      const endX = toNode.x;
      const endY = toNode.y + toH / 2;

      return (
        <Line
          key={conn.id}
          points={[startX, startY, startX + 30, startY, endX - 30, endY, endX, endY]}
          stroke="#3b82f6"
          strokeWidth={2}
          tension={0.5}
          listening={false}
        />
      );
    });

    if (pendingConnection) {
      const fromNode = nodes.find(n => n.id === pendingConnection.nodeId);
      if (fromNode) {
        const choiceIndex = fromNode.choices.findIndex(c => c.id === pendingConnection.choiceId);
        const isBack = fromNode.type === NodeType.BACK;
        const fromW = isBack ? BACK_NODE_WIDTH : NODE_WIDTH;
        
        const startX = fromNode.x + fromW;
        const startY = fromNode.y + CHOICE_START_Y + (choiceIndex * CHOICE_HEIGHT);
        
        // Get relative mouse position
        const stage = stageRef.current;
        const transform = stage.getAbsoluteTransform().copy().invert();
        const pt = transform.point(mousePos);

        lines.push(
          <Line
            key="pending"
            points={[startX, startY, pt.x, pt.y]}
            stroke="#3b82f6"
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
        );
      }
    }

    return lines;
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit scale
    const limitedScale = Math.max(0.1, Math.min(newScale, 5));

    stage.scale({ x: limitedScale, y: limitedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };
    stage.position(newPos);
  };

  const handleStageMouseDown = (e: any) => {
    if (isSpacePressed) return;
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const pt = transform.point(pos);

      if (pendingConnection) {
        // Create new node and connect
        onStageClick(pt.x - NODE_WIDTH / 2, pt.y - NODE_HEIGHT / 2);
      } else {
        // Start selection box
        setSelectionBox({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, isAdding: e.evt.shiftKey });
        if (!e.evt.shiftKey) {
          onNodeSelect(null as any, false);
        }
      }
    }
  };

  const handleStageMouseMove = (e: any) => {
    onMouseMove(e);
    
    if (selectionBox) {
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const pt = transform.point(pos);

      setSelectionBox(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null);
    }
  };

  const handleStageMouseUp = () => {
    if (selectionBox) {
      const x1 = Math.min(selectionBox.x1, selectionBox.x2);
      const y1 = Math.min(selectionBox.y1, selectionBox.y2);
      const x2 = Math.max(selectionBox.x1, selectionBox.x2);
      const y2 = Math.max(selectionBox.y1, selectionBox.y2);

      const selectedInBoxIds: string[] = [];
      // Find nodes inside the box
      nodes.forEach(node => {
        const isBack = node.type === NodeType.BACK;
        const width = isBack ? BACK_NODE_WIDTH : NODE_WIDTH;
        const height = isBack ? BACK_NODE_HEIGHT : NODE_HEIGHT;

        const nodeX1 = node.x;
        const nodeY1 = node.y;
        const nodeX2 = node.x + width;
        const nodeY2 = node.y + height;

        const isInside = (
          nodeX1 < x2 &&
          nodeX2 > x1 &&
          nodeY1 < y2 &&
          nodeY2 > y1
        );

        if (isInside) {
          selectedInBoxIds.push(node.id);
        }
      });

      if (selectedInBoxIds.length > 0) {
        onNodeSelect(selectedInBoxIds, selectionBox.isAdding);
      }

      setSelectionBox(null);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full" style={{ cursor: isSpacePressed ? 'grab' : 'default' }}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        draggable={isSpacePressed}
        ref={stageRef}
        onWheel={handleWheel}
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onDragStart={(e) => {
          if (e.target === e.target.getStage()) {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'grabbing';
          }
        }}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = isSpacePressed ? 'grab' : 'default';
          }
        }}
      >
        <Layer>
          {renderConnections()}
          
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x2 - selectionBox.x1)}
              height={Math.abs(selectionBox.y2 - selectionBox.y1)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}
          
          {nodes.map((node) => {
            const isBack = node.type === NodeType.BACK;
            const isLevel = node.type === NodeType.LEVEL;
            const isArtefact = node.type === NodeType.ARTEFACT;
            const isSuccess = node.type === NodeType.SUCCESS;
            const width = isBack ? BACK_NODE_WIDTH : NODE_WIDTH;
            const height = isBack ? BACK_NODE_HEIGHT : NODE_HEIGHT;
            const nodeColor = node.color || (
              isBack ? "#7c3aed" : 
              isLevel ? "#10b981" : 
              isArtefact ? "#f59e0b" :
              isSuccess ? "#ef4444" : "#3b82f6"
            );

            return (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable
                onDragMove={(e) => {
                  onNodeMove(node.id, e.target.x(), e.target.y());
                }}
                onMouseDown={(e) => {
                e.cancelBubble = true;
                onNodeSelect(node, e.evt.shiftKey);
              }}
                onMouseEnter={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'pointer';
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'default';
                }}
              >
                <Rect
                  width={width}
                  height={height}
                  fill="#1e293b"
                  stroke={selectedNodeIds.includes(node.id) ? "#3b82f6" : nodeColor}
                  strokeWidth={selectedNodeIds.includes(node.id) ? 3 : 2}
                  cornerRadius={8}
                  shadowBlur={selectedNodeIds.includes(node.id) ? 15 : 5}
                  shadowColor={selectedNodeIds.includes(node.id) ? "#3b82f6" : "#000"}
                  shadowOpacity={0.3}
                />
                {/* Color indicator bar */}
                <Rect
                  width={width}
                  height={4}
                  fill={nodeColor}
                  cornerRadius={[8, 8, 0, 0]}
                />

                <Text
                  text={
                    isBack ? "↺ " + (node.screenID || node.title) : 
                    isLevel ? "🎮 " + (node.screenID || node.title) : 
                    isArtefact ? "💎 " + (node.screenID || node.title) :
                    isSuccess ? "🏆 " + (node.screenID || node.title) :
                    (node.screenID || node.title) || "Untitled Node"
                  }
                  fontSize={isBack ? 12 : 14}
                  fontStyle="bold"
                  fill={
                    isBack ? "#c084fc" : 
                    isLevel ? "#6ee7b7" : 
                    isArtefact ? "#fcd34d" :
                    isSuccess ? "#fca5a5" : "#f8fafc"
                  }
                  x={12}
                  y={12}
                  width={width - 24}
                  listening={false}
                />
                {!isBack && (
                  <Text
                    text={node.content?.substring(0, 60) + (node.content?.length > 60 ? "..." : "")}
                    fontSize={11}
                    fill="#94a3b8"
                    x={12}
                    y={32}
                    width={width - 24}
                    listening={false}
                  />
                )}

                {/* Choice Connectors */}
                {node.choices.map((choice, i) => (
                  <Group key={choice.id} y={CHOICE_START_Y + (i * CHOICE_HEIGHT)}>
                    <Text
                      text={choice.label}
                      fontSize={10}
                      fill="#64748b"
                      x={12}
                      y={-5}
                      listening={false}
                    />
                    <Circle
                      x={width}
                      y={0}
                      radius={12}
                      fill="transparent"
                      onMouseDown={(e) => {
                        e.cancelBubble = true;
                        onStartConnection(node.id, choice.id);
                        onNodeSelect(node, e.evt.shiftKey); // Ensure node stays selected
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'crosshair';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                    />
                    <Circle
                      x={width}
                      y={0}
                      radius={5}
                      fill={choice.targetNodeId ? "#3b82f6" : "#475569"}
                      listening={false}
                    />
                  </Group>
                ))}

                {/* Input Connector */}
                <Group x={0} y={height / 2}>
                  <Circle
                    x={0}
                    y={0}
                    radius={12}
                    fill="transparent"
                    onMouseUp={(e) => {
                      onEndConnection(node.id);
                    }}
                  />
                  <Circle
                    x={0}
                    y={0}
                    radius={6}
                    fill="#475569"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    listening={false}
                  />
                </Group>
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
});
