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
import { Project, Idea, Reminder, Collaborator, SystemSettings, PersonalGoal, Habit, Course, JournalEntry, AcademicYearDoc } from "../types";

// Helper to check if env vars exist
const isFirebaseConfigured = () => {
  // Check process.env which is polyfilled by vite.config.ts
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

export const subscribeToSystemSettings = (callback: (settings: SystemSettings | null) => void) => {
    if (!db) return () => {};
    // We use a single document 'global_config' in a 'settings' collection
    const unsubscribe = onSnapshot(doc(db, "settings", "global_config"), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as SystemSettings);
        } else {
            callback(null);
        }
    });
    return unsubscribe;
};

// New Subscriptions
export const subscribeToCourses = (callback: (courses: Course[]) => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const courses = snapshot.docs.map(doc => doc.data() as Course);
      callback(courses);
    });
    return unsubscribe;
};

export const subscribeToPersonalGoals = (callback: (goals: PersonalGoal[]) => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "personal_goals"), (snapshot) => {
      const goals = snapshot.docs.map(doc => doc.data() as PersonalGoal);
      callback(goals);
    });
    return unsubscribe;
};

export const subscribeToHabits = (callback: (habits: Habit[]) => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "habits"), (snapshot) => {
      const habits = snapshot.docs.map(doc => doc.data() as Habit);
      callback(habits);
    });
    return unsubscribe;
};

export const subscribeToJournal = (callback: (entries: JournalEntry[]) => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "journal_entries"), (snapshot) => {
      const entries = snapshot.docs.map(doc => doc.data() as JournalEntry);
      callback(entries);
    });
    return unsubscribe;
};

export const subscribeToAdminDocs = (callback: (docs: AcademicYearDoc[]) => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "admin_docs"), (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as AcademicYearDoc);
      callback(docs);
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

export const saveSystemSettings = async (settings: SystemSettings) => {
    if (!db) return;
    await setDoc(doc(db, "settings", "global_config"), settings);
};

// New Save/Delete Functions

export const saveCourse = async (course: Course) => {
    if (!db) return;
    await setDoc(doc(db, "courses", course.id), course);
};

export const deleteCourse = async (courseId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "courses", courseId));
};

export const savePersonalGoal = async (goal: PersonalGoal) => {
    if (!db) return;
    await setDoc(doc(db, "personal_goals", goal.id), goal);
};

export const deletePersonalGoal = async (goalId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "personal_goals", goalId));
};

export const saveHabit = async (habit: Habit) => {
    if (!db) return;
    await setDoc(doc(db, "habits", habit.id), habit);
};

export const deleteHabit = async (habitId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "habits", habitId));
};

export const saveJournalEntry = async (entry: JournalEntry) => {
    if (!db) return;
    await setDoc(doc(db, "journal_entries", entry.id), entry);
};

export const deleteJournalEntry = async (entryId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "journal_entries", entryId));
};

export const saveAdminDoc = async (adDoc: AcademicYearDoc) => {
    if (!db) return;
    await setDoc(doc(db, "admin_docs", adDoc.id), adDoc);
};

export const deleteAdminDoc = async (docId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "admin_docs", docId));
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

export const removeCollaboratorFromProject = async (projectId: string, collaboratorId: string) => {
  if (!db) return;

  const projectRef = doc(db, "projects", projectId);
  
  try {
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const projectData = projectSnap.data() as Project;
      const collaborators = projectData.collaborators || [];
      
      const updatedCollaborators = collaborators.filter(c => c.id !== collaboratorId);
      
      await updateDoc(projectRef, {
        collaborators: updatedCollaborators
      });
      console.log("Collaborator removed from project");
    }
  } catch (error) {
    console.error("Error removing collaborator:", error);
    throw error;
  }
};