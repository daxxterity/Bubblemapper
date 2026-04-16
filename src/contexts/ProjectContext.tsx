import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db, monitoredSetDoc, monitoredUpdateDoc, monitoredDeleteDoc, handleFirestoreError, OperationType } from '../firebase';
import { ProjectState, INITIAL_STATE } from '../types';
import { logFirestoreCall } from '../utils/monitor';

interface ProjectContextType {
  user: User | null;
  loading: boolean;
  projectState: ProjectState;
  saveProject: (state: ProjectState) => Promise<void>;
  isAuthReady: boolean;
  restoreFromBackup: (backupType: 'guest' | 'local') => void;
  availableBackups: { guest: boolean; local: boolean };
  listProjects: () => Promise<ProjectState[]>;
  createProject: (name: string, state?: ProjectState) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  currentProjectId: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [projectState, setProjectState] = useState<ProjectState>(INITIAL_STATE);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(localStorage.getItem('bubblemapper-current-id'));
  const [availableBackups, setAvailableBackups] = useState({ guest: false, local: false });

  // Check for backups periodically or on mount
  useEffect(() => {
    const checkBackups = () => {
      setAvailableBackups({
        guest: !!localStorage.getItem('bubblemapper-project'),
        local: !!localStorage.getItem('bubblemapper-backup')
      });
    };
    checkBackups();
    const interval = setInterval(checkBackups, 5000);
    return () => clearInterval(interval);
  }, []);

  const restoreFromBackup = (type: 'guest' | 'local') => {
    const key = type === 'guest' ? 'bubblemapper-project' : 'bubblemapper-backup';
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      setProjectState(data);
      // If logged in, we might want to save this to cloud too
      if (user) {
        const id = currentProjectId || Math.random().toString(36).substring(7);
        const projectRef = doc(db, 'projects', id);
        monitoredSetDoc(projectRef, {
          ...data,
          id,
          ownerUid: user.uid,
          updatedAt: Timestamp.now()
        }).then(() => {
          if (!currentProjectId) {
            setCurrentProjectId(id);
            localStorage.setItem('bubblemapper-current-id', id);
          }
        });
      }
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      // Fallback to localStorage if not logged in
      const saved = localStorage.getItem('bubblemapper-project');
      if (saved) setProjectState(JSON.parse(saved));
      return;
    }

    // If we have a currentProjectId, listen to it
    if (currentProjectId) {
      const projectRef = doc(db, 'projects', currentProjectId);
      const monitor = logFirestoreCall('QUERY', `projects/${currentProjectId}`, 'Snapshot listener');
      
      const unsubscribeSnapshot = onSnapshot(projectRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as ProjectState;
          setProjectState(cloudData);
          localStorage.setItem('bubblemapper-backup', JSON.stringify(cloudData));
          monitor.success();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, projectRef.path);
        monitor.error(error);
      });

      return () => unsubscribeSnapshot();
    } else {
      // If no current project, try to find the most recent one or create one
      const findInitialProject = async () => {
        const projects = await listProjects();
        if (projects.length > 0) {
          const latest = projects[0]; // Assuming sorted by date
          setCurrentProjectId(latest.id!);
          localStorage.setItem('bubblemapper-current-id', latest.id!);
        } else {
          // Migrate guest data or create new
          const guestData = localStorage.getItem('bubblemapper-project');
          const initialData = guestData ? JSON.parse(guestData) : INITIAL_STATE;
          await createProject(initialData.name || 'My New Project', initialData);
          if (guestData) localStorage.removeItem('bubblemapper-project');
        }
      };
      findInitialProject();
    }
  }, [user, currentProjectId]);

  const listProjects = async () => {
    if (!user) return [];
    const monitor = logFirestoreCall('QUERY', 'projects', 'Listing user projects');
    try {
      const q = query(collection(db, 'projects'), where('ownerUid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const projects = querySnapshot.docs.map(doc => doc.data() as ProjectState);
      monitor.success();
      return projects.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : new Date(a.updatedAt).getTime();
        const timeB = b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : new Date(b.updatedAt).getTime();
        return timeB - timeA;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'projects');
      monitor.error(err);
      return [];
    }
  };

  const createProject = async (name: string, state?: ProjectState) => {
    if (!user) return;
    const id = Math.random().toString(36).substring(7);
    const projectRef = doc(db, 'projects', id);
    const data = state || INITIAL_STATE;
    
    await monitoredSetDoc(projectRef, {
      ...data,
      id,
      name,
      ownerUid: user.uid,
      updatedAt: Timestamp.now()
    });
    setCurrentProjectId(id);
    localStorage.setItem('bubblemapper-current-id', id);
  };

  const loadProject = async (projectId: string) => {
    setCurrentProjectId(projectId);
    localStorage.setItem('bubblemapper-current-id', projectId);
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', projectId);
    await monitoredDeleteDoc(projectRef);
    
    // If the deleted project was the current one, reset
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
      localStorage.removeItem('bubblemapper-current-id');
      setProjectState(INITIAL_STATE);
    }
  };

  const saveProject = async (newState: ProjectState) => {
    if (!user) {
      localStorage.setItem('bubblemapper-project', JSON.stringify(newState));
      setProjectState(newState);
      return;
    }

    if (!currentProjectId) return;

    const projectRef = doc(db, 'projects', currentProjectId);
    await monitoredUpdateDoc(projectRef, newState);
  };

  return (
    <ProjectContext.Provider value={{ 
      user, 
      loading, 
      projectState, 
      saveProject, 
      isAuthReady, 
      restoreFromBackup, 
      availableBackups,
      listProjects,
      createProject,
      loadProject,
      deleteProject,
      currentProjectId
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
