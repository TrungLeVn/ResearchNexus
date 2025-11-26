import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import { Project, Idea, Reminder } from "../types";

// Helper to check if env vars exist
const isFirebaseConfigured = () => {
  // Check process.env which is polyfilled in vite.config.ts
  return !!process.env.VITE_FIREBASE_API_KEY;
};

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is present
let db: any = null;
if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
}

export const getDb = () => db;

// --- SUBSCRIBE FUNCTIONS (REAL-TIME) ---

export const subscribeToProjects = (callback: (projects: Project[]) => void) => {
  if (!db) return () => {};
  const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
    const projects = snapshot.docs.map(doc => doc.data() as Project);
    callback(projects);
  });
  return unsubscribe;
};

export const subscribeToIdeas = (callback: (ideas: Idea[]) => void) => {
  if (!db) return () => {};
  const unsubscribe = onSnapshot(collection(db, "ideas"), (snapshot) => {
    const ideas = snapshot.docs.map(doc => doc.data() as Idea);
    callback(ideas);
  });
  return unsubscribe;
};

export const subscribeToReminders = (callback: (reminders: Reminder[]) => void) => {
  if (!db) return () => {};
  const unsubscribe = onSnapshot(collection(db, "reminders"), (snapshot) => {
    const reminders = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp to JS Date
      return {
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
      } as Reminder;
    });
    callback(reminders);
  });
  return unsubscribe;
};

// --- WRITE FUNCTIONS ---

export const saveProject = async (project: Project) => {
  if (!db) return;
  await setDoc(doc(db, "projects", project.id), project);
};

export const deleteProject = async (projectId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "projects", projectId));
};

export const saveIdea = async (idea: Idea) => {
  if (!db) return;
  await setDoc(doc(db, "ideas", idea.id), idea);
};

export const deleteIdea = async (ideaId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "ideas", ideaId));
};

export const saveReminder = async (reminder: Reminder) => {
  if (!db) return;
  await setDoc(doc(db, "reminders", reminder.id), reminder);
};

export const deleteReminder = async (reminderId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "reminders", reminderId));
};