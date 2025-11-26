
export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Active',
  REVIEW = 'Review',
  COMPLETED = 'Completed',
  PAUSED = 'Paused',
  ARCHIVED = 'Archived'
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
