import React, { useState, useRef, useEffect } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, ProjectFile, ProjectActivity, FileSection } from '../types';
import { 
    ChevronLeft, Plus, Users, File as FileIcon, 
    Trash2, X, Check, Calendar, Send, MessageCircle, 
    LayoutDashboard, ChevronDown, Flag,
    Code, FileText, Database, FolderOpen, Box, Hash,
    ClipboardList, Megaphone, Loader2, AlertTriangle, Edit2, Save, Folder, Globe,
    ExternalLink, Mail, User, UserPlus, BarChart2, Activity, PenLine, Share2, MoreVertical
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
    disabled?: boolean;
}

const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ collaborators, selectedIds, onChange, disabled }) => {
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
                onClick={() => !disabled && setIsOpen(!isOpen)} 
                className={`w-full min-h-[42px] p-2 border border-slate-200 rounded-lg bg-white flex items-center justify-between transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}`}
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
            
            {isOpen && !disabled && (
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
    readOnly?: boolean;
}
const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, project, currentUser, onClose, onUpdateTask, onDeleteTask, onSendNotification, readOnly }) => {
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
                    <input 
                        value={editedTask.title} 
                        onChange={e => setEditedTask({...editedTask, title: e.target.value})} 
                        disabled={readOnly}
                        className={`text-lg font-bold text-slate-800 bg-transparent outline-none w-full ${readOnly ? 'cursor-not-allowed' : ''}`} 
                    />
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                            <textarea 
                                value={editedTask.description} 
                                onChange={e => setEditedTask({...editedTask, description: e.target.value})} 
                                disabled={readOnly}
                                className={`w-full mt-1 p-2 border rounded-md h-24 text-sm ${readOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} 
                                placeholder="Add task details..."
                            />
                        </div>
                        <AssigneeSelector 
                            collaborators={collaborators} 
                            selectedIds={editedTask.assigneeIds || []} 
                            onChange={(ids) => setEditedTask({...editedTask, assigneeIds: ids})} 
                            disabled={readOnly}
                        />
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
                            <select 
                                value={editedTask.status} 
                                onChange={e => setEditedTask({...editedTask, status: e.target.value as TaskStatus})} 
                                disabled={readOnly}
                                className={`w-full mt-1 p-2 border rounded-md text-sm bg-white ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                            <input 
                                type="date" 
                                value={editedTask.dueDate} 
                                onChange={e => setEditedTask({...editedTask, dueDate: e.target.value})} 
                                disabled={readOnly}
                                className={`w-full mt-1 p-2 border rounded-md text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
                            <select 
                                value={editedTask.priority} 
                                onChange={e => setEditedTask({...editedTask, priority: e.target.value as TaskPriority})} 
                                disabled={readOnly}
                                className={`w-full mt-1 p-2 border rounded-md text-sm bg-white ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
                    {!readOnly ? (
                        <button onClick={() => { if (window.confirm("Delete task?")) { onDeleteTask(task.id); onClose(); } }} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Trash2 className="w-4 h-4"/> Delete Task</button>
                    ) : (
                        <div></div>
                    )}
                    {!readOnly ? (
                        <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-70 flex items-center gap-2">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save & Close
                        </button>
                    ) : (
                        <button onClick={onClose} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300">
                            Close
                        </button>
                    )}
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

  // File Section Editing State
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  // PERMISSIONS LOGIC
  const projectMember = project.collaborators.find(c => c.id === currentUser.id);
  // If guest view, role is Guest. Otherwise use project role, fallback to Viewer (safest default).
  const userRole = isGuestView ? 'Guest' : (projectMember?.role || 'Viewer');
  
  const canEdit = ['Owner', 'Editor'].includes(userRole);
  const isOwner = userRole === 'Owner';

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
  
  // Migration Effect for Legacy Projects without fileSections
  useEffect(() => {
      // STRICT CHECK: Only migrate if fileSections is completely undefined.
      // If it is an empty array [], that means sections were deleted intentionally, so do not migrate.
      if (project.fileSections === undefined) {
          console.log('Migrating legacy project file structure...');
          
          const isAdmin = project.category === 'admin';
          const sec1Id = 'sec_1';
          const sec2Id = 'sec_2';
          const sec3Id = 'sec_3';
          
          const defaultSections: FileSection[] = [
              { id: sec1Id, name: isAdmin ? 'Official Documents' : 'Drafts & Papers', driveUrl: project.categoryDriveUrls?.drafts || '' },
              { id: sec2Id, name: isAdmin ? 'Financial Documents' : 'Code & Data', driveUrl: project.categoryDriveUrls?.code || '' },
              { id: sec3Id, name: isAdmin ? 'Assets' : 'Other Assets', driveUrl: project.categoryDriveUrls?.assets || '' }
          ];

          // Map existing files to sections
          const updatedFiles = (project.files || []).map(f => {
              if (f.sectionId) return f;
              let sId = sec3Id;
              if (['draft', 'document'].includes(f.type)) sId = sec1Id;
              else if (['code', 'data'].includes(f.type)) sId = sec2Id;
              return { ...f, sectionId: sId };
          });

          onUpdateProject({
              ...project,
              fileSections: defaultSections,
              files: updatedFiles,
              categoryDriveUrls: undefined // Cleanup
          });
      }
  }, [project.id, project.fileSections]); // Check on ID or fileSections change

  // --- HANDLERS ---
  
  const handleShareProject = () => {
    const inviteLink = `${window.location.origin}?pid=${project.id}`;
    navigator.clipboard.writeText(inviteLink);
    setShowNotification({ message: 'Invite link copied to clipboard!', type: 'success' });
  };

  const handleUpdateOverview = () => {
      onUpdateProject({
          ...project,
          description: editDescription,
          tags: editTags,
          status: editStatus,
          progress: editProgress
      });
      setIsEditingOverview(false);
      setShowNotification({ message: 'Project overview updated', type: 'success' });
  };

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
      if (!canEdit) return; // Guard
      const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      onUpdateProject({ ...project, tasks: updatedTasks });
      
      const movedTask = project.tasks.find(t => t.id === taskId);
      const activity: ProjectActivity = {
          id: Date.now().toString(),
          message: `moved task '${movedTask?.title}' to ${statusMap[newStatus]}`,
          timestamp: new Date().toISOString(),
          authorId: currentUser.id
      };
      onUpdateProject({ ...project, tasks: updatedTasks, activity: [activity, ...(project.activity || [])] });
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) handleTaskMove(taskId, status);
  };
  
  // File Section Handlers
  const handleAddSection = () => {
      const name = prompt("Enter new section name:");
      if (!name) return;
      const newSection: FileSection = {
          id: `sec_${Date.now()}`,
          name: name,
          driveUrl: ''
      };
      onUpdateProject({ ...project, fileSections: [...(project.fileSections || []), newSection] });
  };

  const handleRenameSection = (sectionId: string) => {
      if (editSectionName.trim() === '') return;
      const updatedSections = (project.fileSections || []).map(s => 
          s.id === sectionId ? { ...s, name: editSectionName } : s
      );
      onUpdateProject({ ...project, fileSections: updatedSections });
      setEditingSectionId(null);
  };

  const handleDeleteSection = (sectionId: string) => {
      if (!window.confirm("Are you sure? This will remove the section but keep the files (they will be moved to Uncategorized).")) return;
      
      const updatedSections = (project.fileSections || []).filter(s => s.id !== sectionId);
      onUpdateProject({ ...project, fileSections: updatedSections });
  };

  const handleUpdateSectionDrive = (sectionId: string, url: string) => {
      const updatedSections = (project.fileSections || []).map(s => 
          s.id === sectionId ? { ...s, driveUrl: url } : s
      );
      onUpdateProject({ ...project, fileSections: updatedSections });
  };

  const handleAddFile = (sectionId: string) => {
      const name = prompt("File Name:");
      if (!name) return;
      // In a real app, this would be a file picker
      const newFile: ProjectFile = {
          id: `f_${Date.now()}`,
          name,
          type: 'document',
          lastModified: new Date().toISOString(),
          sectionId
      };
      onUpdateProject({ ...project, files: [...project.files, newFile] });
  };
  
  const handleDeleteFile = (fileId: string) => {
      if (!window.confirm("Delete this file reference?")) return;
      onUpdateProject({ ...project, files: project.files.filter(f => f.id !== fileId) });
  };

  const handleInviteMember = () => {
      if (!inviteEmail || !inviteName) return;
      
      const newMember: Collaborator = {
          id: inviteEmail.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: inviteName,
          email: inviteEmail,
          role: 'Viewer',
          initials: inviteName.substring(0, 2).toUpperCase()
      };
      
      onUpdateProject({ 
          ...project, 
          collaborators: [...project.collaborators, newMember] 
      });
      
      setInviteName('');
      setInviteEmail('');
      setShowNotification({ message: `${newMember.name} added to project!`, type: 'success' });
  };

  const handleRemoveMember = (memberId: string) => {
      if (!window.confirm("Remove this member?")) return;
      onUpdateProject({
          ...project,
          collaborators: project.collaborators.filter(c => c.id !== memberId)
      });
  };

  const handleUpdateRole = (memberId: string, newRole: Collaborator['role']) => {
      onUpdateProject({
          ...project,
          collaborators: project.collaborators.map(c => c.id === memberId ? { ...c, role: newRole } : c)
      });
  };

  // Tag Handling
  const handleAddTag = () => {
      if (tagInput && !editTags.includes(tagInput)) {
          setEditTags([...editTags, tagInput]);
          setTagInput('');
      }
  };

  const handleRemoveTag = (tag: string) => {
      setEditTags(editTags.filter(t => t !== tag));
  };
  
  // Calculate Task Stats
  const taskStats = [
      { name: 'To Do', value: project.tasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
      { name: 'In Progress', value: project.tasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
      { name: 'Done', value: project.tasks.filter(t => t.status === 'done').length, color: '#10b981' }
  ].filter(d => d.value > 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative animate-in fade-in duration-300">
      {showNotification && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 flex items-center gap-2 animate-in slide-in-from-top-4 fade-in ${showNotification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
              {showNotification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {showNotification.message}
          </div>
      )}
      
      {/* Modals */}
      {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            project={project}
            currentUser={currentUser}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={(t) => {
                const updatedTasks = project.tasks.map(task => task.id === t.id ? t : task);
                onUpdateProject({ ...project, tasks: updatedTasks });
            }}
            onDeleteTask={(tid) => {
                 onUpdateProject({ ...project, tasks: project.tasks.filter(t => t.id !== tid) });
            }}
            onSendNotification={(msg, type) => setShowNotification({ message: msg, type: type || 'success' })}
            readOnly={!canEdit}
          />
      )}
      {addingTaskTo && canEdit && (
          <AddTaskModal 
             status={addingTaskTo}
             project={project}
             onClose={() => setAddingTaskTo(null)}
             onSave={(t) => {
                 onUpdateProject({ ...project, tasks: [...project.tasks, t] });
                 setAddingTaskTo(null);
                 setShowNotification({ message: 'Task added successfully', type: 'success' });
             }}
          />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </button>
            <div 
                className="relative group" 
                onMouseEnter={() => setShowEditTitleIcon(true)}
                onMouseLeave={() => setShowEditTitleIcon(false)}
            >
                {isEditingTitle ? (
                    <input 
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        onBlur={() => {
                            if (newProjectTitle.trim()) {
                                onUpdateProject({ ...project, title: newProjectTitle });
                            }
                            setIsEditingTitle(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (newProjectTitle.trim()) {
                                    onUpdateProject({ ...project, title: newProjectTitle });
                                }
                                setIsEditingTitle(false);
                            }
                        }}
                        autoFocus
                        className="text-xl font-bold text-slate-800 border-b-2 border-indigo-500 outline-none bg-transparent"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <h1 onClick={() => canEdit && setIsEditingTitle(true)} className={`text-xl font-bold text-slate-800 ${canEdit ? 'cursor-pointer' : ''}`}>{project.title}</h1>
                        {canEdit && showEditTitleIcon && (
                            <Edit2 onClick={() => setIsEditingTitle(true)} className="w-4 h-4 text-slate-400 cursor-pointer hover:text-indigo-600" />
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className={`px-2 py-0.5 rounded-full ${project.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{project.status}</span>
                    <span>• {project.progress}% Complete</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex -space-x-2 mr-2">
                {project.collaborators.slice(0, 4).map(c => (
                    <div key={c.id} title={c.name} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border-2 border-white">
                        {c.initials}
                    </div>
                ))}
            </div>
            {!isGuestView && (
                <button 
                    onClick={handleShareProject}
                    className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200"
                    title="Copy Invite Link"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            )}
             {isOwner && (
                <button 
                    onClick={() => { if(window.confirm("Are you sure you want to delete this project?")) onDeleteProject(project.id); }}
                    className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
             )}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-6">
        <TabButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard}>Dashboard</TabButton>
        <TabButton isActive={activeTab === 'board'} onClick={() => setActiveTab('board')} icon={ClipboardList}>Tasks</TabButton>
        <TabButton isActive={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={FolderOpen}>Files</TabButton>
        <TabButton isActive={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users}>Team</TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Overview / Edit Card */}
                 <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold text-slate-800">Project Overview</h3>
                             {canEdit && (
                                <button 
                                    onClick={() => isEditingOverview ? handleUpdateOverview() : setIsEditingOverview(true)}
                                    className={`text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 ${isEditingOverview ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {isEditingOverview ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                    {isEditingOverview ? 'Save Changes' : 'Edit'}
                                </button>
                             )}
                         </div>
                         
                         {isEditingOverview ? (
                             <div className="space-y-4">
                                 <div>
                                     <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                                     <textarea 
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        className="w-full mt-1 p-3 border rounded-lg text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                                     />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                                         <select 
                                            value={editStatus}
                                            onChange={e => setEditStatus(e.target.value as ProjectStatus)}
                                            className="w-full mt-1 p-2 border rounded-lg text-sm bg-white"
                                         >
                                             {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                         </select>
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Progress (%)</label>
                                         <input 
                                            type="number"
                                            min="0" max="100"
                                            value={editProgress}
                                            onChange={e => setEditProgress(Number(e.target.value))}
                                            className="w-full mt-1 p-2 border rounded-lg text-sm"
                                         />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-slate-400 uppercase">Tags</label>
                                     <div className="flex gap-2 mt-1 mb-2 flex-wrap">
                                         {editTags.map(tag => (
                                             <span key={tag} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs flex items-center gap-1">
                                                 {tag} <X onClick={() => handleRemoveTag(tag)} className="w-3 h-3 cursor-pointer" />
                                             </span>
                                         ))}
                                     </div>
                                     <div className="flex gap-2">
                                         <input 
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                            placeholder="Add tag..."
                                            className="flex-1 p-2 border rounded-lg text-sm"
                                            list="existingTags"
                                         />
                                         <datalist id="existingTags">
                                             {existingTags.map(t => <option key={t} value={t} />)}
                                         </datalist>
                                         <button onClick={handleAddTag} className="p-2 bg-slate-100 rounded-lg text-slate-600"><Plus className="w-4 h-4" /></button>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div className="space-y-4">
                                 <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{project.description || "No description provided."}</p>
                                 <div className="flex flex-wrap gap-2">
                                     {project.tags?.map(tag => (
                                         <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200">#{tag}</span>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>
                     
                     {/* Recent Activity */}
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                             <Activity className="w-5 h-5 text-indigo-600" /> Recent Activity
                         </h3>
                         <div className="space-y-4">
                             {(project.activity || []).slice(0, 5).map(act => {
                                 const author = project.collaborators.find(c => c.id === act.authorId);
                                 return (
                                     <div key={act.id} className="flex gap-3 text-sm">
                                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                                             {author?.initials || '?'}
                                         </div>
                                         <div>
                                             <p className="text-slate-800">
                                                 <span className="font-semibold">{author?.name || 'Unknown'}</span> {act.message}
                                             </p>
                                             <p className="text-xs text-slate-400">{new Date(act.timestamp).toLocaleString()}</p>
                                         </div>
                                     </div>
                                 );
                             })}
                             {(project.activity || []).length === 0 && <p className="text-slate-400 italic text-sm">No recent activity.</p>}
                         </div>
                     </div>
                 </div>
                 
                 {/* Sidebar Stats */}
                 <div className="space-y-6">
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Task Completion</h3>
                         <div className="h-48">
                             {taskStats.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={taskStats} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                            {taskStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                             ) : (
                                 <div className="h-full flex items-center justify-center text-slate-400 text-xs">No tasks yet</div>
                             )}
                         </div>
                         <div className="flex justify-center gap-4 mt-2">
                             {taskStats.map(s => (
                                 <div key={s.name} className="flex items-center gap-1 text-xs text-slate-600">
                                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}}></div>
                                     {s.name} ({s.value})
                                 </div>
                             ))}
                         </div>
                     </div>
                     
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Project Progress</h3>
                         <div className="flex items-center gap-4">
                             <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-600 rounded-full" style={{width: `${project.progress}%`}}></div>
                             </div>
                             <span className="font-bold text-indigo-600">{project.progress}%</span>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {/* BOARD TAB */}
        {activeTab === 'board' && (
            <div className="flex gap-6 h-full overflow-x-auto pb-4">
            {Object.keys(statusMap).map(status => (
                <div 
                    key={status} 
                    className="flex-1 min-w-[300px] bg-slate-100/50 rounded-xl p-4 flex flex-col border border-slate-200"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, status as TaskStatus)}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700">{statusMap[status as TaskStatus]}</h3>
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">
                            {project.tasks.filter(t => t.status === status).length}
                        </span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto">
                        {project.tasks.filter(t => t.status === status).map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                project={project}
                                onClick={() => setSelectedTask(task)}
                                onDragStart={handleDragStart}
                            />
                        ))}
                    </div>
                    {canEdit && (
                        <button 
                            onClick={() => setAddingTaskTo(status as TaskStatus)}
                            className="mt-3 w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-200"
                        >
                            <Plus className="w-4 h-4" /> Add Task
                        </button>
                    )}
                </div>
            ))}
            </div>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
            <div className="space-y-8">
                {(project.fileSections || []).map(section => (
                    <div key={section.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Section Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {editingSectionId === section.id ? (
                                    <div className="flex gap-2">
                                        <input 
                                            value={editSectionName}
                                            onChange={e => setEditSectionName(e.target.value)}
                                            className="px-2 py-1 border rounded text-sm"
                                            autoFocus
                                        />
                                        <button onClick={() => handleRenameSection(section.id)} className="p-1 bg-indigo-600 text-white rounded"><Check className="w-3 h-3"/></button>
                                        <button onClick={() => setEditingSectionId(null)} className="p-1 bg-slate-200 rounded"><X className="w-3 h-3"/></button>
                                    </div>
                                ) : (
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5 text-indigo-500" /> {section.name}
                                    </h3>
                                )}
                                {canEdit && !editingSectionId && (
                                    <div className="flex gap-1">
                                         <button onClick={() => { setEditingSectionId(section.id); setEditSectionName(section.name); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3 h-3"/></button>
                                         <button onClick={() => handleDeleteSection(section.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                )}
                            </div>
                            
                            {canEdit && (
                                <button 
                                    onClick={() => handleAddFile(section.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm"
                                >
                                    <Plus className="w-3 h-3" /> Add File
                                </button>
                            )}
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Drive Link & Sync */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Google Drive Folder
                                </label>
                                {canEdit ? (
                                    <EditableResourceLink 
                                        url={section.driveUrl || ''} 
                                        onSave={(url) => handleUpdateSectionDrive(section.id, url)}
                                        placeholder="Paste Google Drive folder link..."
                                    />
                                ) : (
                                    section.driveUrl ? (
                                        <a href={section.driveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline text-sm"><Folder className="w-4 h-4"/> Open Drive Folder</a>
                                    ) : <p className="text-sm text-slate-400 italic">No Drive folder linked.</p>
                                )}
                                
                                {section.driveUrl && (
                                    <div className="mt-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Synced Files</p>
                                        <SyncedDriveFiles driveUrl={section.driveUrl} />
                                    </div>
                                )}
                            </div>

                            {/* Manual Files */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tracked Files</label>
                                <div className="space-y-2">
                                    {project.files.filter(f => f.sectionId === section.id).map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                                            <div className="flex items-center gap-3">
                                                {getFileIcon(file.type)}
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(file.lastModified).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <button onClick={() => handleDeleteFile(file.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {project.files.filter(f => f.sectionId === section.id).length === 0 && (
                                        <p className="text-sm text-slate-400 italic">No manually tracked files.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {canEdit && (
                    <button 
                        onClick={handleAddSection}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus className="w-5 h-5" /> Add New Section
                    </button>
                )}
            </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-800">Team Members</h3>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                            {project.collaborators.length} Members
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {project.collaborators.map(member => (
                            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 border-2 border-white shadow-sm">
                                        {member.initials}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{member.name} {member.id === currentUser.id && <span className="text-xs text-slate-400 font-normal">(You)</span>}</p>
                                        <p className="text-sm text-slate-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {isOwner ? (
                                        <select 
                                            value={member.role}
                                            onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                                            className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
                                            disabled={member.role === 'Owner'} // Can't demote owner easily here for safety
                                        >
                                            <option value="Owner">Owner</option>
                                            <option value="Editor">Editor</option>
                                            <option value="Viewer">Viewer</option>
                                            <option value="Guest">Guest</option>
                                        </select>
                                    ) : (
                                        <span className="text-sm font-medium text-slate-600 px-2">{member.role}</span>
                                    )}
                                    
                                    {isOwner && member.role !== 'Owner' && (
                                        <button 
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Member"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {canEdit && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-indigo-600" /> Invite New Member
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Full Name</label>
                                <input 
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    placeholder="e.g. Dr. Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email Address</label>
                                <div className="flex gap-2">
                                    <input 
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm"
                                        placeholder="jane@university.edu"
                                    />
                                    <button 
                                        onClick={handleInviteMember}
                                        disabled={!inviteName || !inviteEmail}
                                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Send Invite
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
