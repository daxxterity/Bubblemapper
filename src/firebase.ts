import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, collection, query, where, getDocs, Timestamp, getDocFromServer } from 'firebase/firestore';
import { logFirestoreCall } from './utils/monitor';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

// Validate configuration
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value && key !== 'measurementId' && key !== 'firestoreDatabaseId')
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(`Missing Firebase environment variables: ${missingKeys.join(', ')}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const dbId = firebaseConfig.firestoreDatabaseId === '(default)' || !firebaseConfig.firestoreDatabaseId 
  ? undefined 
  : firebaseConfig.firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified.");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

// Auth Helpers
export const signIn = () => signInWithPopup(auth, googleProvider);
export const signOut = () => auth.signOut();

// Error Handler with Monitor Integration and Standardized JSON Format
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  const monitor = logFirestoreCall(
    (operationType === OperationType.WRITE || operationType === OperationType.CREATE || operationType === OperationType.UPDATE) ? 'WRITE' : 'QUERY', 
    path || 'unknown', 
    errInfo.error
  );
  monitor.error(error);

  throw new Error(JSON.stringify(errInfo));
};

// Monitored Firestore Wrappers
export const monitoredUpdateDoc = async (docRef: any, data: any) => {
  const monitor = logFirestoreCall('WRITE', docRef.path);
  try {
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    monitor.success();
  } catch (err) {
    monitor.error(err);
    // Standardized error handling will throw the JSON error
    handleFirestoreError(err, OperationType.UPDATE, docRef.path);
  }
};

export const monitoredSetDoc = async (docRef: any, data: any) => {
  const monitor = logFirestoreCall('WRITE', docRef.path);
  try {
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    monitor.success();
  } catch (err) {
    monitor.error(err);
    // Standardized error handling will throw the JSON error
    handleFirestoreError(err, OperationType.CREATE, docRef.path);
  }
};

export const monitoredDeleteDoc = async (docRef: any) => {
  const monitor = logFirestoreCall('WRITE', docRef.path, 'Deleting document');
  try {
    await deleteDoc(docRef);
    monitor.success();
  } catch (err) {
    monitor.error(err);
    handleFirestoreError(err, OperationType.DELETE, docRef.path);
  }
};
