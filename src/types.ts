import { v4 as uuidv4 } from 'uuid';

export enum TemplateType {
  TOP_IMAGE = 'TOP_IMAGE',
  SIDE_IMAGE = 'SIDE_IMAGE',
  ONLY_TEXT = 'ONLY_TEXT',
  CINEMATIC = 'CINEMATIC',
  MULTI_LINK = 'MULTI_LINK',
}

export enum NodeType {
  STORY = 'STORY',
  BACK = 'BACK',
  LEVEL = 'LEVEL',
  ARTEFACT = 'ARTEFACT',
  SUCCESS = 'SUCCESS',
  THUMBNAIL = 'THUMBNAIL',
}

export interface Choice {
  id: string;
  label: string;
  targetNodeId: string | null;
  position?: 'sidebar' | 'bottom';
}

export type TipType = 'TIP' | 'POPUP' | 'POWERUP' | 'ELARA' | 'GREMLINS' | 'SYSTEM';

export interface Tip {
  id: string;
  type: TipType;
  copy: string;
  copy2?: string;
  trigger: string;
  duration: number | 'tap';
  isExpanded?: boolean;
}

export interface NodeData {
  id: string;
  type: NodeType;
  title: string;
  screenID?: string;
  content: string;
  imageUrl: string;
  imageUrls?: string[];
  imageCaptions?: string[];
  choices: Choice[];
  tips?: Tip[];
  template: TemplateType;
  color?: string;
  aspectRatio?: '3:4' | '16:9';
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  choiceId: string;
  toNodeId: string;
}

export interface ProjectState {
  id?: string;
  name?: string;
  nodes: NodeData[];
  connections: Connection[];
}

export const INITIAL_STATE: ProjectState = {
  name: 'Untitled Project',
  nodes: [
    {
      id: 'start-node',
      type: NodeType.STORY,
      title: 'Welcome Screen',
      screenID: 'Welcome Screen',
      content: 'Welcome to the game! Choose your path.',
      imageUrl: 'https://picsum.photos/seed/game-start/800/600',
      choices: [
        { id: uuidv4(), label: 'Start New Quest', targetNodeId: null },
        { id: uuidv4(), label: 'Options', targetNodeId: null },
      ],
      template: TemplateType.TOP_IMAGE,
      x: 100,
      y: 100,
    }
  ],
  connections: [],
};
