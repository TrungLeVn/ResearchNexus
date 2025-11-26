import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  Timestamp,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { Project, Idea, Reminder, Collaborator } from "../types";

// Helper to check if env vars exist
const isFirebaseConfigured = () => {
  // Check process.env which is polyfilled in vite.config.ts
  const hasKey = !!process.env.VITE_FIREBASE_API_KEY;
  if (!hasKey) {
      console.warn("Firebase Not Configured. Missing VITE_FIREBASE_API_KEY.");
      console.log("Current Env Check:", {
          apiKey: !!process.env.VITE_FIREBASE_API_KEY,
          projectId: !!process.env.VITE_FIREBASE_PROJECT_ID
      });
  }
  return hasKey;
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
    console.log("Firebase initialized successfully");
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

// --- COLLABORATION ---

export const addCollaboratorToProject = async (projectId: string, user: Collaborator) => {
  if (!db) return;
  
  const projectRef = doc(db, "projects", projectId);
  
  try {
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const projectData = projectSnap.data() as Project;
      const collaborators = projectData.collaborators || [];
      
      // Check if user already exists by email
      const exists = collaborators.some(c => c.email.toLowerCase() === user.email.toLowerCase());
      
      if (!exists) {
        const updatedCollaborators = [...collaborators, user];
        await updateDoc(projectRef, {
          collaborators: updatedCollaborators
        });
        console.log("Collaborator added to project");
      } else {
        console.log("Collaborator already exists in project");
      }
    }
  } catch (error) {
    console.error("Error adding collaborator:", error);
  }
};