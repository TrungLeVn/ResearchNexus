
import React, { useState, useRef, useEffect } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, ProjectFile, ProjectActivity } from '../types';
import { 
    ChevronLeft, Plus, Users, File as FileIcon, 
    Trash2, X, Check, Calendar, Send, MessageCircle, 
    LayoutDashboard, ChevronDown, Flag,
    Code, FileText, Database, FolderOpen, Box, Hash,
    ClipboardList, Megaphone, Loader2, AlertTriangle, Edit2, Save, Folder, Globe,
    ExternalLink, Mail, User, UserPlus, BarChart2, Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { listFilesInFolder, DriveFile } from '../services/googleDrive';

interface ProjectDetailProps {
  project: Project;
  currentUser: Collaborator;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  onDeleteProject: (projectId: string) => void;
  isGuestView?: boolean;
  existingTags?: string[]; // Global tags for suggestions
}

const statusMap: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done'
};

interface TaskCardProps {
    task: Task;
    project: Project;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onClick, onDragStart }) => {
    const assignees = (project.collaborators || []).filter(c => task.assigneeIds?.includes(c.id));

    const priorityColor = {
        high: 'text-red-500',
        medium: 'text-amber-500',
        low: 'text-green-500'
    }[task.priority];
    
    return (
        <div 
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick} 
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing"
        >
            <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-3 select-none">{task.title}</p>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.dueDate).toLocaleDateString('en-CA')}</span>
                    </div>
                    <Flag className={`w-3 h-3 ${priorityColor}`} />
                    <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{task.comments?.length || 0}</span>
                    </div>
                </div>
                <div className="flex items-center -space-x-2">
                    {assignees.slice(0, 2).map(c => (
                        <div key={c.id} title={c.name} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] border-2 border-white">
                            {c.initials}
                        </div>
                    ))}
                    {assignees.length > 2 && <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600 text-[10px] border-2 border-white">+{assignees.length - 2}</div>}
                </div>
            </div>
        </div>
    );
};

// --- MULTI-SELECT ASSIGNEE COMPONENT ---
interface AssigneeSelectorProps {
    collaborators: Collaborator[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ collaborators, selectedIds, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(sid => sid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Assignees</label>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full min-h-[42px] p-2 border border-slate-200 rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors"
            >
                <div className="flex items-center gap-1 flex-wrap">
                    {selectedIds.length === 0 && <span className="text-slate-400 text-sm">Select members...</span>}
                    {selectedIds.map(id => {
                        const user = collaborators.find(c => c.id === id);
                        if (!user) return null;
                        return (
                            <div key={id} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                                <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold">
                                    {user.initials}
                                </div>
                                <span className="text-xs font-medium">{user.name.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl mt-2 shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95">
                     <div className="p-2 space-y-1">
                        {collaborators.map(c => {
                            const isSelected = selectedIds.includes(c.id);
                            return (
                                <div 
                                    key={c.id} 
                                    onClick={() => toggleSelection(c.id)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                        {c.initials}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>{c.name}</span>
                                        <span className="text-[10px] text-slate-400">{c.role}</span>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                </div>
            )}
        </div>
    );
};

interface TaskDetailModalProps {
    task: Task;
    project: Project;
    currentUser: Collaborator;
    onClose: () => void;
    onUpdateTask: (updatedTask: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onSendNotification: (msg: string, type?: 'success' | 'error') => void;
}
const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, project, currentUser, onClose, onUpdateTask, onDeleteTask, onSendNotification }) => {
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const collaborators = project.collaborators || [];

    const handleSave = async () => {
        setIsSaving(true);
        onUpdateTask(editedTask);
        setIsSaving(false);
        onClose();
    };

    const handleAddComment = () => {
        if(!newComment.trim()) return;
        const comment: TaskComment = {
            id: `comm_${Date.now()}`,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorInitials: currentUser.initials,
            text: newComment,
            timestamp: new Date().toISOString()
        };
        const updatedTask = { ...editedTask, comments: [...(editedTask.comments || []), comment] };
        setEditedTask(updatedTask);
        onUpdateTask(updatedTask);
        setNewComment('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <input value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} className="text-lg font-bold text-slate-800 bg-transparent outline-none w-full" />
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                            <textarea value={editedTask.description} onChange={e => setEditedTask({...editedTask, description: e.target.value})} className="w-full mt-1 p-2 border rounded-md h-24 text-sm" placeholder="Add task details..."/>
                        </div>
                        <AssigneeSelector collaborators={collaborators} selectedIds={editedTask.assigneeIds || []} onChange={(ids) => setEditedTask({...editedTask, assigneeIds: ids})} />
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Comments</label>
                            <div className="mt-2 space-y-3 max-h-64 overflow-y-auto pr-2">
                                {(editedTask.comments || []).map(c => (
                                    <div key={c.id} className="flex items-start gap-2">
                                        <div className="w-7 h-7 mt-1 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{c.authorInitials}</div>
                                        <div>
                                            <div className="bg-slate-100 p-2 rounded-lg rounded-tl-none relative group/comment">
                                                <p className="text-xs font-semibold">{c.authorName}</p>
                                                <p className="text-sm text-slate-700">{c.text}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(c.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <input ref={commentInputRef} value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Add a comment..." />
                                <button onClick={handleAddComment} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Send className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                            <select value={editedTask.status} onChange={e => setEditedTask({...editedTask, status: e.target.value as TaskStatus})} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                            <input type="date" value={editedTask.dueDate} onChange={e => setEditedTask({...editedTask, dueDate: e.target.value})} className="w-full mt-1 p-2 border rounded-md text-sm"/>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
                            <select value={editedTask.priority} onChange={e => setEditedTask({...editedTask, priority: e.target.value as TaskPriority})} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
                    <button onClick={() => { if (window.confirm("Delete task?")) { onDeleteTask(task.id); onClose(); } }} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Trash2 className="w-4 h-4"/> Delete Task</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-70 flex items-center gap-2">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

interface AddTaskModalProps {
    status: TaskStatus;
    project: Project;
    onClose: () => void;
    onSave: (newTask: Task) => void;
}
const AddTaskModal: React.FC<AddTaskModalProps> = ({ status, project, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    
    const collaborators = project.collaborators || [];

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsSaving(true);
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title, status, priority, dueDate, assigneeIds, comments: [], description: ''
        };
        onSave(newTask);
        setIsSaving(false);
    };

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Add New Task to "{statusMap[status]}"</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." className="w-full border rounded-lg p-2 text-lg"/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                             <AssigneeSelector collaborators={collaborators} selectedIds={assigneeIds} onChange={setAssigneeIds} />
                        </div>
                        <div>
                             <label className="text-xs font-semibold text-slate-500 mb-1 block">Due Date</label>
                             <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md text-sm h-[42px]"/>
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs font-semibold text-slate-500 mb-1 block">Priority</label>
                             <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full p-2 border rounded-md text-sm bg-white h-[42px]">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                             </select>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Add Task
                    </button>
                </div>
            </div>
        </div>
    );
};

const getFileIcon = (type: ProjectFile['type']) => {
    switch (type) {
        case 'code': return <Code className="w-5 h-5 text-slate-500" />;
        case 'data': return <Database className="w-5 h-5 text-emerald-500" />;
        case 'draft': return <FileText className="w-5 h-5 text-blue-500" />;
        case 'slide': return <Megaphone className="w-5 h-5 text-orange-500" />;
        case 'document': return <ClipboardList className="w-5 h-5 text-purple-500" />;
        default: return <Box className="w-5 h-5 text-slate-400" />;
    }
};

// --- GENERIC EDITABLE LINK COMPONENT ---
const EditableResourceLink: React.FC<{
    url: string;
    onSave: (url: string) => void;
    placeholder?: string;
    label?: string;
    icon?: React.ReactNode;
}> = ({ url, onSave, placeholder = "Enter URL...", label, icon }) => {
    const [isEditing, setIsEditing] = useState(!url);
    const [inputVal, setInputVal] = useState(url);

    useEffect(() => {
        setInputVal(url);
        if (!url) setIsEditing(true);
        else setIsEditing(false);
    }, [url]);

    const handleSave = () => {
        onSave(inputVal);
        if (inputVal) setIsEditing(false);
    };

    if (url && !isEditing) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                {label && <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">{label}</p>}
                <div className="flex items-center justify-between">
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium truncate flex-1 mr-2"
                        title={url}
                    >
                        {icon || <Folder className="w-4 h-4 text-slate-500" />}
                        <span className="truncate">{url}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md transition-colors"
                        title="Edit Link"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
             {label && <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">{label}</p>}
             <div className="flex items-center gap-2">
                <input 
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder={placeholder}
                />
                <div className="flex gap-1">
                    <button onClick={handleSave} className="px-3 py-2 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                        Update
                    </button>
                    {url && (
                        <button onClick={() => setIsEditing(false)} className="px-3 py-2 text-xs rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-50">
                            Cancel
                        </button>
                    )}
                </div>
             </div>
        </div>
    );
};

// --- DRIVE LINK MANAGER (Uses EditableResourceLink) ---
const DriveLinkManager: React.FC<{
    category: 'drafts' | 'code' | 'assets';
    project: Project;
    onUpdateProject: (project: Project) => void;
}> = ({ category, project, onUpdateProject }) => {
    const driveUrl = project.categoryDriveUrls?.[category] || '';
    
    const handleSave = (url: string) => {
        const updatedProject = {
            ...project,
            categoryDriveUrls: { ...project.categoryDriveUrls, [category]: url.trim() },
        };
        onUpdateProject(updatedProject);
    };
    
    return (
        <EditableResourceLink 
            url={driveUrl} 
            onSave={handleSave} 
            placeholder={`Paste Google Drive folder URL for ${category}...`}
            icon={<Globe className="w-4 h-4 text-slate-500"/>}
        />
    );
};

const SyncedDriveFiles: React.FC<{ driveUrl: string }> = ({ driveUrl }) => {
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!driveUrl) {
            setIsLoading(false);
            setDriveFiles([]);
            return;
        }
        
        const fetchFiles = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const files = await listFilesInFolder(driveUrl);
                setDriveFiles(files);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFiles();
    }, [driveUrl]);

    if (isLoading) {
        return <div className="flex items-center justify-center p-4 text-slate-400 text-xs"><Loader2 className="w-3 h-3 animate-spin mr-2" /> Syncing...</div>;
    }
    
    if (error) {
        return (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col gap-1">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                         <p className="text-xs text-amber-800 font-medium">{error}</p>
                         <a href={driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2 font-medium">
                            Open in Drive <ExternalLink className="w-3 h-3"/>
                        </a>
                    </div>
                </div>
            </div>
        );
    }
    
    if (driveFiles.length === 0) {
        return <p className="text-xs text-center text-slate-400 italic p-4">Folder is empty.</p>;
    }

    return (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {driveFiles.map(file => (
                <a 
                    key={file.id}
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-600 group"
                >
                    <FileIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-auto opacity-0 group-hover:opacity-100" />
                </a>
            ))}
        </div>
    );
};

const TabButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode; icon: any; }> = ({ isActive, onClick, children, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
        }`}
    >
        <Icon className="w-4 h-4" />
        {children}
    </button>
);

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, currentUser, onUpdateProject, onBack, onDeleteProject, isGuestView = false, existingTags = [] }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'files' | 'team'>('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingTaskTo, setAddingTaskTo] = useState<TaskStatus | null>(null);
  const [showNotification, setShowNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Dashboard Edit State
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [editDescription, setEditDescription] = useState(project.description);
  const [editTags, setEditTags] = useState(project.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [editStatus, setEditStatus] = useState(project.status);
  const [editProgress, setEditProgress] = useState(project.progress);
  
  // Team Management State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState(project.title);
  const [showEditTitleIcon, setShowEditTitleIcon] = useState(false);

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Sync edit state when project changes (if updated externally)
  useEffect(() => {
      if (!isEditingOverview) {
          setEditDescription(project.description);
          setEditTags(project.tags || []);
          setEditStatus(project.status);
          setEditProgress(project.progress);
      }
  }, [project, isEditingOverview]);

  const addActivity = (message: string): ProjectActivity[] => {
      const newActivity: ProjectActivity = {
          id: `act_${Date.now()}`,
          message: `${currentUser.name} ${message}`,
          timestamp: new Date().toISOString(),
          authorId: currentUser.id
      };
      return [newActivity, ...(project.activity || [])];
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const updatedTasks = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    const activityMessage = updatedTask.status !== project.tasks.find(t=>t.id===updatedTask.id)?.status
        ? `updated task "${updatedTask.title}" to ${statusMap[updatedTask.status]}`
        : `updated task details for "${updatedTask.title}"`;

    onUpdateProject({ ...project, tasks: updatedTasks, activity: addActivity(activityMessage) });
  };

  const handleAddTask = (newTask: Task) => {
    onUpdateProject({ ...project, tasks: [...project.tasks, newTask], activity: addActivity(`created task "${newTask.title}"`) });
    setAddingTaskTo(null);
    setShowNotification({ message: 'Task added successfully!', type: 'success' });
  };
  
  const handleDeleteTask = (taskId: string) => {
      const taskToDelete = project.tasks.find(t => t.id === taskId);
      if(!taskToDelete) return;
      onUpdateProject({ ...project, tasks: project.tasks.filter(t => t.id !== taskId), activity: addActivity(`deleted task "${taskToDelete.title}"`) });
      setShowNotification({ message: 'Task deleted!', type: 'success' });
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
      const taskId = e.dataTransfer.getData('taskId');
      const task = project.tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
          handleUpdateTask({ ...task, status: newStatus });
      }
  };

  const handleAddFile = () => {
      const name = prompt("File name or title:");
      if (!name) return;
      const typeStr = prompt("Type (draft, code, data, slide, document):", "document");
      const type = (['draft', 'code', 'data', 'slide', 'document'].includes(typeStr || '') ? typeStr : 'document') as ProjectFile['type'];
      
      const newFile: ProjectFile = {
          id: `file_${Date.now()}`,
          name,
          url: '', 
          description: "Manually added file.",
          type,
          lastModified: new Date().toISOString()
      };
      onUpdateProject({ ...project, files: [...project.files, newFile], activity: addActivity(`added file "${name}"`) });
  };
  
  const handleDeleteFile = (id: string) => {
      onUpdateProject({ ...project, files: project.files.filter(f => f.id !== id) });
  };

  const handleUpdateProjectTitle = () => {
    if (newProjectTitle.trim() && newProjectTitle !== project.title) {
        onUpdateProject({ ...project, title: newProjectTitle.trim() });
    }
    setIsEditingTitle(false);
  };
  
  // --- Overview Edit Handlers ---
  const handleSaveOverview = () => {
      onUpdateProject({
          ...project,
          description: editDescription,
          tags: editTags,
          status: editStatus,
          progress: editProgress,
          activity: addActivity('updated project overview')
      });
      setIsEditingOverview(false);
      setShowNotification({ message: 'Project overview updated', type: 'success' });
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
        e.preventDefault();
        if (!editTags.includes(tagInput.trim())) {
            setEditTags([...editTags, tagInput.trim()]);
        }
        setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
      setEditTags(editTags.filter(t => t !== tagToRemove));
  };
  
  const handleDriveUrlChange = (url: string) => {
    onUpdateProject({ ...project, driveFolderUrl: url });
  };

  const handleDeleteProjectConfirm = () => {
    if(window.prompt(`This will permanently delete the project "${project.title}". This cannot be undone. Type the project title to confirm.`) === project.title) {
        onDeleteProject(project.id);
    }
  };

  // --- Team Management Functions ---
  const handleAddCollaborator = () => {
      if (!inviteName || !inviteEmail) return;
      
      const newCollab: Collaborator = {
          id: `collab_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          name: inviteName,
          email: inviteEmail,
          role: 'Viewer',
          initials: inviteName.substring(0,2).toUpperCase()
      };
      
      const updatedCollaborators = [...project.collaborators, newCollab];
      onUpdateProject({ ...project, collaborators: updatedCollaborators });
      setShowNotification({ message: `Added ${inviteName} to team`, type: 'success' });
      setInviteName('');
      setInviteEmail('');
  };

  const handleRemoveCollaborator = (id: string) => {
      if (window.confirm("Are you sure you want to remove this member?")) {
          const updatedCollaborators = project.collaborators.filter(c => c.id !== id);
          onUpdateProject({ ...project, collaborators: updatedCollaborators });
          setShowNotification({ message: 'Collaborator removed', type: 'success' });
      }
  };

  const handleUpdateRole = (id: string, newRole: 'Owner' | 'Editor' | 'Viewer' | 'Guest') => {
      const updatedCollaborators = project.collaborators.map(c => 
          c.id === id ? { ...c, role: newRole } : c
      );
      onUpdateProject({ ...project, collaborators: updatedCollaborators });
      setShowNotification({ message: 'Role updated', type: 'success' });
  };

  const renderTabContent = () => {
    switch(activeTab) {
        case 'dashboard':
            const completedTasks = project.tasks.filter(t => t.status === 'done').length;
            const totalTasks = project.tasks.length;
            const tasksInProgress = project.tasks.filter(t => t.status === 'in_progress').length;
            const tasksTodo = project.tasks.filter(t => t.status === 'todo').length;

            const taskData = [
                { name: 'To Do', value: tasksTodo, color: '#f59e0b' },
                { name: 'In Progress', value: tasksInProgress, color: '#6366f1' },
                { name: 'Done', value: completedTasks, color: '#10b981' }
            ].filter(d => d.value > 0);

            return (
                <div className="p-6 space-y-6 max-w-6xl mx-auto">
                     {/* Description & Overview Card */}
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                             <h3 className="text-lg font-bold text-slate-800">Project Overview</h3>
                             {!isGuestView && !isEditingOverview && (
                                 <button 
                                     onClick={() => setIsEditingOverview(true)} 
                                     className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                 >
                                     <Edit2 className="w-3.5 h-3.5"/> Edit
                                 </button>
                             )}
                        </div>

                        {isEditingOverview ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea 
                                        value={editDescription} 
                                        onChange={e => setEditDescription(e.target.value)} 
                                        className="w-full border rounded-md p-2 h-32 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select value={editStatus} onChange={e => setEditStatus(e.target.value as ProjectStatus)} className="w-full border rounded-md p-2 bg-white text-sm">
                                            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Progress: {editProgress}%</label>
                                        <input type="range" min="0" max="100" value={editProgress} onChange={e => setEditProgress(Number(e.target.value))} className="w-full"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {editTags.map(tag => (
                                            <span key={tag} className="flex items-center gap-1.5 bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="hover:text-pink-900"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagInput}
                                        className="w-full border rounded-md p-2 text-sm" 
                                        placeholder="Add a tag and press Enter"
                                        list="existing-tags-datalist"
                                    />
                                    <datalist id="existing-tags-datalist">
                                        {existingTags.filter(t => !editTags.includes(t)).map(tag => <option key={tag} value={tag} />)}
                                    </datalist>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button onClick={() => setIsEditingOverview(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                    <button onClick={handleSaveOverview} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Save Overview</button>
                                </div>
                                
                                {/* Danger Zone inside Edit Mode */}
                                <div className="mt-8 pt-4 border-t border-red-100">
                                    <h4 className="text-sm font-bold text-red-700 mb-2">Danger Zone</h4>
                                    <button onClick={handleDeleteProjectConfirm} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium">
                                        <Trash2 className="w-4 h-4"/> Delete Project
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {project.description || "No description provided."}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {project.tags?.map(tag => (
                                        <span key={tag} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <p className="text-sm font-semibold text-slate-500">Progress</p>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-indigo-600">{project.progress}%</span>
                            </div>
                             <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                            </div>
                        </div>
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                             <p className="text-sm font-semibold text-slate-500">Total Tasks</p>
                             <span className="text-3xl font-bold text-slate-800">{totalTasks}</span>
                             <div className="flex items-center gap-1 text-xs text-slate-400">
                                 <ClipboardList className="w-3 h-3"/> {completedTasks} completed
                             </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                             <p className="text-sm font-semibold text-slate-500">Team Size</p>
                             <span className="text-3xl font-bold text-purple-600">{project.collaborators.length}</span>
                             <div className="flex items-center gap-1 text-xs text-slate-400">
                                 <Users className="w-3 h-3"/> Active members
                             </div>
                        </div>
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                             <p className="text-sm font-semibold text-slate-500">Documents</p>
                             <span className="text-3xl font-bold text-emerald-600">{project.files.length}</span>
                             <div className="flex items-center gap-1 text-xs text-slate-400">
                                 <FolderOpen className="w-3 h-3"/> Resources
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-slate-500"/> Task Status</h4>
                            {totalTasks > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={taskData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {taskData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, 'Tasks']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 italic">No tasks created yet.</div>
                            )}
                             <div className="flex justify-center gap-4 mt-[-20px]">
                                {taskData.map(entry => (
                                    <div key={entry.name} className="flex items-center gap-1 text-xs text-slate-600">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                        {entry.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 overflow-hidden flex flex-col">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-slate-500"/> Recent Activity</h4>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {(project.activity || []).slice(0, 10).map(act => (
                                    <div key={act.id} className="flex gap-3 text-sm border-b border-slate-50 pb-2 last:border-0">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                            {(project.collaborators.find(c => c.id === act.authorId)?.initials) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-slate-700">{act.message}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!project.activity || project.activity.length === 0) && (
                                    <p className="text-center text-slate-400 italic mt-10">No recent activity.</p>
                                )}
                            </div>
                         </div>
                    </div>

                    {/* Key Resources / Drive Integration - Moved to Dashboard for Visibility */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Folder className="w-5 h-5 text-indigo-600"/> Key Resources</h3>
                        <div className="space-y-4">
                            <EditableResourceLink 
                                label="Main Google Drive Folder"
                                url={project.driveFolderUrl || ''} 
                                onSave={handleDriveUrlChange} 
                                placeholder="https://drive.google.com/drive/folders/..." 
                                icon={<Globe className="w-4 h-4 text-slate-500"/>}
                            />
                            {project.driveFolderUrl && (
                                <div className="mt-2 pl-2 border-l-2 border-indigo-100">
                                    <SyncedDriveFiles driveUrl={project.driveFolderUrl} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        case 'board':
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                    {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                        <div key={status} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-semibold text-slate-700">{statusMap[status]}</h3>
                                {!isGuestView && (
                                    <button onClick={() => setAddingTaskTo(status)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Plus className="w-4 h-4"/></button>
                                )}
                            </div>
                            <div className="space-y-3 min-h-[100px]">
                                {project.tasks.filter(t => t.status === status).map(task => (
                                    <TaskCard key={task.id} task={task} project={project} onClick={() => setSelectedTask(task)} onDragStart={(e, taskId) => e.dataTransfer.setData('taskId', taskId)} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'files':
            const categoryFiles = (category: ProjectFile['type'][]) => project.files.filter(f => category.includes(f.type));
            return (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-end">
                         {!isGuestView && (
                            <button onClick={handleAddFile} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700">
                                <Plus className="w-3 h-3" /> Add File Manually
                            </button>
                        )}
                    </div>
                    {/* Drafts & Papers */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3">Drafts & Papers</h3>
                        <DriveLinkManager category="drafts" project={project} onUpdateProject={onUpdateProject} />
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {project.categoryDriveUrls?.drafts && <SyncedDriveFiles driveUrl={project.categoryDriveUrls.drafts} />}
                            {/* Manual Files */}
                            {categoryFiles(['draft', 'document']).length > 0 && (
                                <div className="space-y-2">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Manual Files</p>
                                     {categoryFiles(['draft', 'document']).map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group border border-transparent hover:border-slate-200 transition-colors">
                                            <div className="flex items-center gap-2 text-sm">
                                                <FileText className="w-4 h-4 text-blue-500 shrink-0" /> 
                                                <span className="font-medium text-slate-700">{file.name}</span>
                                            </div>
                                            <button onClick={() => handleDeleteFile(file.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                     {/* Code & Data */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3">Code & Data</h3>
                        <DriveLinkManager category="code" project={project} onUpdateProject={onUpdateProject} />
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {project.categoryDriveUrls?.code && <SyncedDriveFiles driveUrl={project.categoryDriveUrls.code} />}
                             {/* Manual Files */}
                             {categoryFiles(['code', 'data']).length > 0 && (
                                 <div className="space-y-2">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Manual Files</p>
                                    {categoryFiles(['code', 'data']).map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group border border-transparent hover:border-slate-200 transition-colors">
                                            <div className="flex items-center gap-2 text-sm">
                                                {getFileIcon(file.type)} 
                                                <span className="font-medium text-slate-700">{file.name}</span>
                                            </div>
                                            <button onClick={() => handleDeleteFile(file.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                    </div>
                    {/* Other Assets */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3">Other Assets</h3>
                        <DriveLinkManager category="assets" project={project} onUpdateProject={onUpdateProject} />
                         <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {project.categoryDriveUrls?.assets && <SyncedDriveFiles driveUrl={project.categoryDriveUrls.assets} />}
                            {/* Manual Files */}
                            {categoryFiles(['slide', 'other']).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Manual Files</p>
                                    {categoryFiles(['slide', 'other']).map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group border border-transparent hover:border-slate-200 transition-colors">
                                            <div className="flex items-center gap-2 text-sm">
                                                {getFileIcon(file.type)} 
                                                <span className="font-medium text-slate-700">{file.name}</span>
                                            </div>
                                            <button onClick={() => handleDeleteFile(file.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        case 'team':
             if (isGuestView) return <div className="p-6 text-center text-slate-400">Team management is hidden for guests.</div>;
             return (
                 <div className="p-6 max-w-4xl mx-auto space-y-6">
                     {/* Team List */}
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600"/> Project Team
                            </h3>
                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-full text-slate-500">{project.collaborators.length} Members</span>
                        </div>
                        <div className="space-y-1">
                            {project.collaborators.map(member => (
                                <div key={member.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                    <div className="flex items-center gap-4 mb-3 md:mb-0">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {member.initials}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{member.name} {member.id === currentUser.id && <span className="text-slate-400 font-normal">(You)</span>}</p>
                                            <p className="text-xs text-slate-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pl-14 md:pl-0">
                                        <div className="relative">
                                            <select 
                                                value={member.role}
                                                disabled={member.role === 'Owner' || currentUser.role !== 'Owner'}
                                                onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                                                className="appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-medium py-1.5 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                                            >
                                                <option value="Owner">Owner</option>
                                                <option value="Editor">Editor</option>
                                                <option value="Viewer">Viewer</option>
                                                <option value="Guest">Guest</option>
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                        </div>
                                        {member.role !== 'Owner' && currentUser.role === 'Owner' && (
                                            <button 
                                                onClick={() => handleRemoveCollaborator(member.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                                title="Remove Member"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                     
                     {/* Invite Section */}
                     {currentUser.role === 'Owner' && (
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                             <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-emerald-600"/> Invite New Member
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                        <input 
                                            value={inviteName}
                                            onChange={e => setInviteName(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                        <input 
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                             </div>
                             <div className="mt-4 flex justify-end">
                                 <button 
                                    onClick={handleAddCollaborator}
                                    disabled={!inviteName || !inviteEmail}
                                    className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm flex items-center gap-2"
                                 >
                                     <Send className="w-4 h-4"/> Send Invite
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             );
        default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 animate-in fade-in duration-500">
      {selectedTask && <TaskDetailModal task={selectedTask} project={project} currentUser={currentUser} onClose={() => setSelectedTask(null)} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onSendNotification={(message, type='success') => setShowNotification({message, type})} />}
      {addingTaskTo && <AddTaskModal status={addingTaskTo} project={project} onClose={() => setAddingTaskTo(null)} onSave={handleAddTask} />}
      
      {showNotification && (
          <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-lg text-white animate-in slide-in-from-top ${showNotification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {showNotification.message}
          </div>
      )}

      {/* Header */}
      <header className="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
          <div onMouseEnter={() => setShowEditTitleIcon(true)} onMouseLeave={() => setShowEditTitleIcon(false)} className="relative group">
            {isEditingTitle ? (
                <div className="flex items-center gap-2">
                    <input 
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateProjectTitle()}
                        onBlur={handleUpdateProjectTitle}
                        autoFocus
                        className="text-xl font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-md px-2 py-1 outline-none"
                    />
                    <button onClick={handleUpdateProjectTitle} className="p-1.5 bg-indigo-600 text-white rounded-md"><Save className="w-3.5 h-3.5" /></button>
                </div>
            ) : (
                <h2 className="text-xl font-bold text-slate-800">{project.title}</h2>
            )}
            {!isEditingTitle && showEditTitleIcon && currentUser.role === 'Owner' && (
                 <button onClick={() => setIsEditingTitle(true)} className="absolute -right-7 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="w-3.5 h-3.5"/>
                </button>
            )}
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{project.status}</span>
        </div>
        <div className="flex items-center gap-4">
           {/* Collaborators */}
           <div className="flex items-center">
                <div className="flex items-center -space-x-3 pr-2">
                    {project.collaborators.slice(0, 3).map(c => (
                        <div key={c.id} title={c.name} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border-2 border-white">
                            {c.initials}
                        </div>
                    ))}
                    {project.collaborators.length > 3 && <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs border-2 border-white">+{project.collaborators.length - 3}</div>}
                </div>
                {!isGuestView && (
                    <button 
                        onClick={() => setActiveTab('team')} 
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Manage Team"
                    >
                        <Users className="w-4 h-4"/>
                    </button>
                )}
           </div>
           
           {/* AI Chat Toggle */}
           <div className="w-px h-6 bg-slate-200"></div>
           <div className="relative">
              <button onClick={() => alert('AI Chat coming soon!')} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 shadow-sm">
                  <MessageCircle className="w-4 h-4"/> AI Assistant
              </button>
           </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-slate-200 px-6 flex gap-4">
        <TabButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard}>Dashboard</TabButton>
        <TabButton isActive={activeTab === 'board'} onClick={() => setActiveTab('board')} icon={ClipboardList}>Tasks</TabButton>
        <TabButton isActive={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={FolderOpen}>Files</TabButton>
        <TabButton isActive={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users}>Team</TabButton>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};
