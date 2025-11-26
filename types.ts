
export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Active',
  REVIEW = 'Review',
  COMPLETED = 'Completed',
  PAUSED = 'Paused',
  ARCHIVED = 'Archived'
}

export enum AppModule {
  RESEARCH = 'research',
  TEACHING = 'teaching',
  ADMIN = 'admin',
  PERSONAL = 'personal',
  JOURNAL = 'journal',
  AI_GLOBAL = 'ai_global' // New Global AI Module
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  status: 'Unread' | 'Reading' | 'Annotated';
  summary?: string;
  url?: string;
}

export interface LinkResource {
  id: string;
  title: string;
  url: string;
  type: 'drive' | 'web' | 'paper';
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'draft' | 'code' | 'data' | 'other';
  lastModified: string;
  url?: string; // Google Drive Link
}

export interface NotebookAsset {
  id: string;
  title: string;
  type: 'audio' | 'report' | 'slides' | 'source';
  url: string;
  addedBy: string;
  addedAt: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Editor' | 'Viewer' | 'Guest';
  initials: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // ISO Date string
  assigneeId?: string;
  dependencies?: string[]; // Array of Task IDs that must be completed before this task
}

export interface ProjectActivity {
  id: string;
  message: string;
  time: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0-100
  tags: string[];
  papers: Paper[];
  files: ProjectFile[];
  notebookAssets?: NotebookAsset[]; // New field for NotebookLM integration
  notes: string;
  collaborators: Collaborator[];
  tasks: Task[];
  activity?: ProjectActivity[];
  category?: 'research' | 'admin'; // Differentiate between Research and Admin projects
}

export interface Idea {
  id: string;
  title: string;
  description: string; // Short description
  content: string; // Full notes/content
  relatedResources: LinkResource[];
  aiEnhanced?: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  date: Date;
  projectId?: string;
  type: 'deadline' | 'meeting' | 'task';
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export enum ViewState {
  DASHBOARD = 'dashboard',
  PROJECTS = 'projects',
  IDEAS = 'ideas',
  CHAT = 'chat',
  SETTINGS = 'settings'
}

// --- NEW TYPES FOR MODULES ---

export interface JournalEntry {
    id: string;
    date: string; // YYYY-MM-DD
    content: string; // Markdown notes
    tasks: { id: string, text: string, done: boolean }[];
    links: LinkResource[];
}

export interface CourseResources {
    syllabus?: string;
    grades?: string;
    slides?: string;
    classlist?: string;
    testbank?: string;
    exercises?: string;
    readings?: string;
    others?: string;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    semester: string;
    studentsCount: number;
    // Schedule details for Calendar View
    scheduleDay: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    scheduleTime: string; // e.g., "10:00"
    durationMins: number; 
    room: string;
    resources: CourseResources;
    isArchived: boolean;
    imageUrl?: string; // AI Generated Cover
}

export interface AdminTask {
    id: string;
    title: string;
    dueDate: string;
    status: 'pending' | 'completed';
    category: 'Department' | 'Paperwork' | 'Committee';
}

export interface PersonalGoal {
    id: string;
    title: string;
    category: 'Fitness' | 'Learning' | 'Hobby';
    progress: number;
    target: string;
}

export interface MeetingNote {
    id: string;
    title: string;
    date: string;
    attendees: string[];
    content: string; // Markdown
    tags: string[];
}

export interface AcademicYearDoc {
    id: string;
    name: string;
    type: 'pdf' | 'doc' | 'sheet';
    year: string; // e.g. "2023-2024"
    url: string;
    category: 'Report' | 'Regulation' | 'Form';
}
