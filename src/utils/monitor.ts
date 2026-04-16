import { create } from 'zustand';

export type FirestoreOperation = 'READ' | 'WRITE' | 'DELETE' | 'QUERY' | 'AUTH';

export interface MonitorEvent {
  id: string;
  timestamp: number;
  operation: FirestoreOperation;
  path: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  latency?: number;
  details?: string;
}

interface MonitorState {
  events: MonitorEvent[];
  totalReads: number;
  totalWrites: number;
  totalErrors: number;
  isOpen: boolean;
  addEvent: (event: Omit<MonitorEvent, 'timestamp'>) => void;
  updateEvent: (id: string, updates: Partial<MonitorEvent>) => void;
  toggleOpen: () => void;
  clear: () => void;
}

export const useMonitor = create<MonitorState>((set) => ({
  events: [],
  totalReads: 0,
  totalWrites: 0,
  totalErrors: 0,
  isOpen: false,
  addEvent: (event) => set((state) => {
    const newEvent: MonitorEvent = {
      timestamp: Date.now(),
      ...event,
    };
    
    let { totalReads, totalWrites, totalErrors } = state;
    if (event.operation === 'READ' || event.operation === 'QUERY') totalReads++;
    if (event.operation === 'WRITE' || event.operation === 'DELETE') totalWrites++;
    if (event.status === 'ERROR') totalErrors++;

    return {
      events: [newEvent, ...state.events].slice(0, 100), // Keep last 100
      totalReads,
      totalWrites,
      totalErrors,
    };
  }),
  updateEvent: (id, updates) => set((state) => {
    let { totalErrors } = state;
    const newEvents = state.events.map((e) => {
      if (e.id === id) {
        if (updates.status === 'ERROR' && e.status !== 'ERROR') totalErrors++;
        return { ...e, ...updates };
      }
      return e;
    });
    return { events: newEvents, totalErrors };
  }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  clear: () => set({ events: [], totalReads: 0, totalWrites: 0, totalErrors: 0 }),
}));

// Helper for logging
export const logFirestoreCall = (operation: FirestoreOperation, path: string, details?: string) => {
  const id = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  useMonitor.getState().addEvent({
    id,
    operation,
    path,
    status: 'PENDING',
    details,
  });

  return {
    success: () => {
      useMonitor.getState().updateEvent(id, { 
        status: 'SUCCESS', 
        latency: Date.now() - startTime 
      });
    },
    error: (err: any) => {
      useMonitor.getState().updateEvent(id, { 
        status: 'ERROR', 
        details: err?.message || String(err),
        latency: Date.now() - startTime 
      });
    }
  };
};
