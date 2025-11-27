import React, { useState } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, StickyNote, Paper, ProjectFile } from '../types';
import { 
    ChevronLeft, Plus, Users, Bot, ClipboardList, Book, File as FileIcon, StickyNote as NoteIcon, 
    Trash2, Share2, X, Copy, Check, Mail, Maximize2, ExternalLink, Flame, ArrowUp, ArrowDown, Calendar, Send, MessageCircle, 
    Pencil, Database, Layers
} from 'lucide-react';
import { AIChat } from './AIChat';

interface ProjectDetailProps {
  project: Project;
  currentUser: Collaborator;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  onDeleteProject: (projectId: string) => void;
  isGuestView?: boolean;
}

const statusMap: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done'
};

const getStatusClasses = (status: ProjectStatus) => {
    switch (status) {
        case ProjectStatus.ACTIVE:
            return 'bg-blue-100 text-blue-700';
        case ProjectStatus.PLANNING:
            return 'bg-sky-100 text-sky-700';
        case ProjectStatus.REVIEW:
            return 'bg-amber-100 text-amber-700';
        case ProjectStatus.COMPLETED:
            return 'bg-emerald-100 text-emerald-700';
        case ProjectStatus.PAUSED:
            return 'bg-slate-100 text-slate-600';
        case ProjectStatus.ARCHIVED:
            return 'bg-gray-100 text-gray-600';
        default:
            return 'bg-slate-100 text-slate-600';
    }
};

interface TaskCardProps {
    task: Task;
    project: Project;
    onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onClick }) => {
    const assignee = project.collaborators.find(c => c.id === task.assigneeId);

    const priorityIcons: Record<TaskPriority, React.ReactNode> = {
        high: <Flame className="w-3.5 h-3.5 text-red-500" title="High Priority"/>,
        medium: <ArrowUp className="w-3.5 h-3.5 text-amber-500" title="Medium Priority"/>,
        low: <ArrowDown className="w-3.5 h-3.5 text-green-500" title="Low Priority"/>,
    };
    
    return (
        <div onClick={onClick} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer">
            <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-3">{task.title}</p>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.dueDate).toLocaleDateString('en-CA')}</span>
                    </div>
                    {priorityIcons[task.priority]}
                    <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{task.comments?.length || 0}</span>
                    </div>
                </div>
                {assignee && (
                    <div title={assignee.name} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] border-2 border-white">
                        {assignee.initials}
                    </div>
                )}
            </div>
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
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, project, currentUser, onClose, onUpdateTask, onDeleteTask }) => {
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [newComment, setNewComment] = useState('');

    const handleSave = () => {
        onUpdateTask(editedTask);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            onDeleteTask(task.id);
            onClose();
        }
    };
    
    const handleAddComment = () => {
        if (!newComment.trim()) return;
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
        onUpdateTask(updatedTask); // Save immediately
        setNewComment('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <input value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} className="text-lg font-bold text-slate-800 bg-transparent outline-none w-full" />
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="flex-1 p-6 grid grid-cols-3 gap-6 overflow-y-auto">
                    <div className="col-span-2 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                            <textarea value={editedTask.description} onChange={e => setEditedTask({...editedTask, description: e.target.value})} className="w-full mt-1 p-2 border rounded-md h-24 text-sm" placeholder="Add task details..."/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Comments</label>
                            <div className="mt-2 space-y-3 max-h-64 overflow-y-auto pr-2">
                                {(editedTask.comments || []).map(c => (
                                    <div key={c.id} className="flex items-start gap-2">
                                        <div className="w-7 h-7 mt-1 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{c.authorInitials}</div>
                                        <div>
                                            <div className="bg-slate-100 p-2 rounded-lg rounded-tl-none">
                                                <p className="text-xs font-semibold">{c.authorName}</p>
                                                <p className="text-sm text-slate-700">{c.text}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(c.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Add a comment..."/>
                                <button onClick={handleAddComment} className="p-2 bg-indigo-600 text-white rounded-lg"><Send className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                            <select value={editedTask.status} onChange={e => setEditedTask({...editedTask, status: e.target.value as TaskStatus})} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-400 uppercase">Assignee</label>
                            <select value={editedTask.assigneeId || ''} onChange={e => setEditedTask({...editedTask, assigneeId: e.target.value})} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                                <option value="">Unassigned</option>
                                {project.collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                    <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Trash2 className="w-4 h-4"/> Delete Task
                    </button>
                    <button onClick={handleSave} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Save & Close</button>
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
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

    const handleSave = () => {
        if (!title.trim()) return;
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title,
            status,
            priority,
            dueDate,
            assigneeId: assigneeId || undefined,
            comments: [],
            description: ''
        };
        onSave(newTask);
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
                    <div className="grid grid-cols-3 gap-4">
                        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2 border rounded-md text-sm bg-white"><option value="">Unassigned</option>{project.collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md text-sm"/>
                        <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-2 border rounded-md text-sm bg-white"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Task</button>
                </div>
            </div>
        </div>
    );
};

interface ShareModalProps {
    project: Project;
    currentUser: Collaborator;
    onClose: () => void;
    onAddCollaborator: (c: Collaborator) => void;
    onRemoveCollaborator: (collaboratorId: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ project, currentUser, onClose, onAddCollaborator, onRemoveCollaborator }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'Editor' | 'Viewer'>('Editor');
    const [copied, setCopied] = useState(false);

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}?pid=${project.id}` : '';

    const handleCopy = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert("Could not copy to clipboard automatically. Please select and copy the link manually.");
        }
    };

    const handleAdd = () => {
        if (!email || !name) return;
        const newCollaborator: Collaborator = {
            id: `collab_${Date.now()}`,
            name,
            email,
            role,
            initials: name.substring(0, 2).toUpperCase()
        };
        onAddCollaborator(newCollaborator);
        setEmail('');
        setName('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-indigo-600" /> Share Project
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Invite via Link</label>
                        <div className="flex gap-2">
                            <input 
                                readOnly
                                value={inviteLink}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 select-all outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button 
                                onClick={handleCopy}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center min-w-[3rem]"
                                title="Copy Link"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Anyone with this link can request to join as a Guest.</p>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-3">Add Team Member</label>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <input 
                                    placeholder="Name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <select 
                                    value={role}
                                    onChange={e => setRole(e.target.value as any)}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="Editor">Editor</option>
                                    <option value="Viewer">Viewer</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input 
                                        placeholder="Email Address"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={handleAdd}
                                    disabled={!name || !email}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Current Access</label>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                            {project.collaborators.map(c => (
                                <div key={c.id} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded-lg group border border-transparent hover:border-slate-200 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                            {c.initials}
                                        </div>
                                        <span className="text-slate-700 truncate max-w-[120px]" title={c.name}>{c.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{c.role}</span>
                                        {currentUser.role === 'Owner' && c.role !== 'Owner' && (
                                            <button 
                                                onClick={() => onRemoveCollaborator(c.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove member"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, currentUser, onUpdateProject, onBack, onDeleteProject, isGuestView = false }) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'files' | 'notes' | 'team' | 'ai'>('tasks');
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Task Modals State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [addingTaskForStatus, setAddingTaskForStatus] = useState<TaskStatus | null>(null);

    // State for new Papers/Files forms
    const [showAddPaper, setShowAddPaper] = useState(false);
    const [newPaper, setNewPaper] = useState({ title: '', authors: '', year: new Date().getFullYear(), url: '' });
    const [showAddDraft, setShowAddDraft] = useState(false);
    const [newDraft, setNewDraft] = useState({ name: '', url: '' });
    const [showAddCodeData, setShowAddCodeData] = useState(false);
    const [newCodeData, setNewCodeData] = useState({ name: '', url: '', type: 'code' as 'code' | 'data' });
    const [showAddOther, setShowAddOther] = useState(false);
    const [newOther, setNewOther] = useState({ name: '', url: '', type: 'slide' as 'slide' | 'document' | 'other' });

    // State for Sticky Notes Board
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const handleUpdateSingleTask = (updatedTask: Task) => {
        const updatedTasks = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        onUpdateProject({ ...project, tasks: updatedTasks });
    };

    const handleCreateTask = (newTask: Task) => {
        onUpdateProject({ ...project, tasks: [...project.tasks, newTask] });
        setAddingTaskForStatus(null);
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = project.tasks.filter(t => t.id !== taskId);
        onUpdateProject({ ...project, tasks: updatedTasks });
    };

    const handleAddCollaborator = (newCollab: Collaborator) => {
        if (project.collaborators.some(c => c.email.toLowerCase() === newCollab.email.toLowerCase())) {
            alert("This user is already a collaborator.");
            return;
        }
        const updatedCollaborators = [...project.collaborators, newCollab];
        onUpdateProject({ ...project, collaborators: updatedCollaborators });
    };

    const handleRemoveCollaborator = (collaboratorId: string) => {
        if (window.confirm("Are you sure you want to remove this member?")) {
            const updatedCollaborators = project.collaborators.filter(c => c.id !== collaboratorId);
            onUpdateProject({ ...project, collaborators: updatedCollaborators });
        }
    };

    const handleDeleteProjectConfirm = () => {
        if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
            onDeleteProject(project.id);
        }
    };

    // --- PAPERS & FILES LOGIC ---
    const handleAddPaper = () => {
        if(!newPaper.title || !newPaper.url) return;
        const paper: Paper = {
            id: `paper_${Date.now()}`,
            ...newPaper,
            status: 'Unread'
        };
        onUpdateProject({...project, papers: [...project.papers, paper]});
        setNewPaper({ title: '', authors: '', year: new Date().getFullYear(), url: '' });
        setShowAddPaper(false);
    };
    
    const handleDeletePaper = (id: string) => {
        onUpdateProject({...project, papers: project.papers.filter(p => p.id !== id)});
    };

    const handleAddFile = (
        fileData: { name: string; url: string; },
        type: ProjectFile['type']
    ) => {
        if(!fileData.name || !fileData.url) return;
        
        const file: ProjectFile = {
            id: `file_${Date.now()}`,
            name: fileData.name,
            url: fileData.url,
            type: type,
            lastModified: new Date().toISOString().split('T')[0]
        };
        onUpdateProject({...project, files: [...project.files, file]});

        // Reset respective forms
        if (type === 'draft') {
            setNewDraft({ name: '', url: '' });
            setShowAddDraft(false);
        } else if (type === 'code' || type === 'data') {
            setNewCodeData({ name: '', url: '', type: 'code' });
            setShowAddCodeData(false);
        } else { // slide, document, other
            setNewOther({ name: '', url: '', type: 'slide' });
            setShowAddOther(false);
        }
    };

    const handleDeleteFile = (id: string) => {
        onUpdateProject({...project, files: project.files.filter(f => f.id !== id)});
    };

    // --- STICKY NOTES LOGIC ---
    const addStickyNote = () => {
        const newNote: StickyNote = {
            id: `p-note-${Date.now()}`,
            title: 'New Note',
            content: '',
            color: 'yellow',
            createdAt: new Date().toISOString()
        };
        onUpdateProject({ ...project, notes: [newNote, ...(project.notes || [])] });
    };

    const updateStickyNote = (id: string, updates: Partial<StickyNote>) => {
        const updatedNotes = (project.notes || []).map(note => 
            note.id === id ? { ...note, ...updates } : note
        );
        onUpdateProject({ ...project, notes: updatedNotes });
    };

    const deleteStickyNote = (id: string) => {
        if (!window.confirm("Delete this note?")) return;
        const updatedNotes = (project.notes || []).filter(n => n.id !== id);
        onUpdateProject({ ...project, notes: updatedNotes });
        if (expandedNoteId === id) setExpandedNoteId(null);
    };

    const renderExpandedNoteModal = () => {
        if (!expandedNoteId) return null;
        const note = project.notes?.find(n => n.id === expandedNoteId);
        if (!note) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className={`w-full max-w-2xl h-[70vh] rounded-xl shadow-2xl flex flex-col overflow-hidden ${ note.color === 'yellow' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/50">
                        <input className="bg-transparent text-xl font-bold text-slate-800 outline-none w-full mr-4" value={note.title} onChange={(e) => updateStickyNote(note.id, { title: e.target.value })}/>
                        <button onClick={() => setExpandedNoteId(null)} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-6 h-6" /></button>
                    </div>
                    <textarea className="flex-1 w-full p-6 bg-transparent resize-none outline-none text-base text-slate-700" value={note.content} onChange={(e) => updateStickyNote(note.id, { content: e.target.value })} autoFocus/>
                </div>
            </div>
        );
    };

    const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: React.ElementType, label: string }) => (
        <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'tasks':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 h-full overflow-hidden">
                        {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                            <div key={status} className="bg-slate-100/70 rounded-xl p-4 flex flex-col h-full overflow-hidden">
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                    <h3 className="font-semibold text-slate-700 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${status === 'todo' ? 'bg-slate-400' : status === 'in_progress' ? 'bg-blue-400' : 'bg-emerald-400'}`} />{statusMap[status]}</h3>
                                    <button onClick={() => setAddingTaskForStatus(status)} className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-600" title="Add Task"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                    {project.tasks.filter(t => t.status === status).map(task => (
                                        <TaskCard key={task.id} task={task} project={project} onClick={() => setSelectedTask(task)} />
                                    ))}
                                    {project.tasks.filter(t => t.status === status).length === 0 && <div className="text-center py-8 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-lg">No tasks</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'files':
                const drafts = project.files.filter(f => f.type === 'draft');
                const codeAndData = project.files.filter(f => f.type === 'code' || f.type === 'data');
                const otherAssets = project.files.filter(f => ['slide', 'document', 'other'].includes(f.type));

                return (
                    <div className="p-6 space-y-6 h-full overflow-y-auto">
                        {/* Reference Papers Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium flex items-center gap-2 text-slate-800"><Book className="w-4 h-4 text-indigo-600"/> Reference Papers</h4>
                                {!isGuestView && <button onClick={() => setShowAddPaper(!showAddPaper)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Paper</button>}
                            </div>
                            {showAddPaper && !isGuestView && <div className="p-3 mb-3 bg-indigo-50 rounded-lg border border-indigo-100 grid grid-cols-2 gap-2 text-sm">
                                <input placeholder="Title" value={newPaper.title} onChange={e => setNewPaper({...newPaper, title: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <input placeholder="Authors" value={newPaper.authors} onChange={e => setNewPaper({...newPaper, authors: e.target.value})} className="p-2 rounded border"/>
                                <input type="number" placeholder="Year" value={newPaper.year} onChange={e => setNewPaper({...newPaper, year: parseInt(e.target.value)})} className="p-2 rounded border"/>
                                <input placeholder="URL" value={newPaper.url} onChange={e => setNewPaper({...newPaper, url: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <div className="col-span-2 flex gap-2"><button onClick={handleAddPaper} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs">Save</button><button onClick={() => setShowAddPaper(false)} className="bg-slate-200 px-3 py-1 rounded text-xs">Cancel</button></div>
                            </div>}
                            <div className="space-y-2">
                                {project.papers.map(p => (<div key={p.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                                    <div><a href={p.url} target="_blank" rel="noreferrer" className="font-medium hover:text-indigo-600">{p.title}</a><p className="text-xs text-slate-500">{p.authors} ({p.year})</p></div>
                                    {!isGuestView && <button onClick={() => handleDeletePaper(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4" /></button>}
                                </div>))}
                                {project.papers.length === 0 && !showAddPaper && <p className="text-xs text-slate-400 italic text-center py-4">No papers linked.</p>}
                            </div>
                        </div>

                        {/* Manuscript Drafts Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium flex items-center gap-2 text-slate-800"><Pencil className="w-4 h-4 text-emerald-600"/> Manuscript Drafts</h4>
                                {!isGuestView && <button onClick={() => setShowAddDraft(!showAddDraft)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Draft</button>}
                            </div>
                            {showAddDraft && !isGuestView && <div className="p-3 mb-3 bg-emerald-50 rounded-lg border border-emerald-100 grid grid-cols-1 gap-2 text-sm">
                                <input placeholder="Draft Title (e.g., Chapter 1 v2)" value={newDraft.name} onChange={e => setNewDraft({...newDraft, name: e.target.value})} className="p-2 rounded border"/>
                                <input placeholder="URL" value={newDraft.url} onChange={e => setNewDraft({...newDraft, url: e.target.value})} className="p-2 rounded border"/>
                                <div className="flex gap-2"><button onClick={() => handleAddFile(newDraft, 'draft')} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs">Save</button><button onClick={() => setShowAddDraft(false)} className="bg-slate-200 px-3 py-1 rounded text-xs">Cancel</button></div>
                            </div>}
                            <div className="space-y-2">
                                {drafts.map(f => (<div key={f.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                                    <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:text-emerald-600 flex items-center gap-2"><ExternalLink className="w-3 h-3"/> {f.name}</a>
                                    {!isGuestView && <button onClick={() => handleDeleteFile(f.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4" /></button>}
                                </div>))}
                                {drafts.length === 0 && !showAddDraft && <p className="text-xs text-slate-400 italic text-center py-4">No drafts linked.</p>}
                            </div>
                        </div>

                        {/* Code & Data Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium flex items-center gap-2 text-slate-800"><Database className="w-4 h-4 text-sky-600"/> Code & Data</h4>
                                {!isGuestView && <button onClick={() => setShowAddCodeData(!showAddCodeData)} className="text-xs font-medium text-sky-600 hover:text-sky-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Item</button>}
                            </div>
                            {showAddCodeData && !isGuestView && <div className="p-3 mb-3 bg-sky-50 rounded-lg border border-sky-100 grid grid-cols-2 gap-2 text-sm">
                                <input placeholder="File Name (e.g., main.py)" value={newCodeData.name} onChange={e => setNewCodeData({...newCodeData, name: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <select value={newCodeData.type} onChange={e => setNewCodeData({...newCodeData, type: e.target.value as any})} className="p-2 rounded border bg-white"><option value="code">Code</option><option value="data">Data</option></select>
                                <input placeholder="URL" value={newCodeData.url} onChange={e => setNewCodeData({...newCodeData, url: e.target.value})} className="p-2 rounded border"/>
                                <div className="col-span-2 flex gap-2"><button onClick={() => handleAddFile(newCodeData, newCodeData.type)} className="bg-sky-600 text-white px-3 py-1 rounded text-xs">Save</button><button onClick={() => setShowAddCodeData(false)} className="bg-slate-200 px-3 py-1 rounded text-xs">Cancel</button></div>
                            </div>}
                            <div className="space-y-2">
                                {codeAndData.map(f => (<div key={f.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                                    <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:text-sky-600 flex items-center gap-2"><ExternalLink className="w-3 h-3"/> {f.name}</a>
                                    <div className="flex items-center gap-2"><span className="text-[10px] uppercase text-slate-500 bg-white px-1.5 py-0.5 rounded border">{f.type}</span>{!isGuestView && <button onClick={() => handleDeleteFile(f.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4" /></button>}</div>
                                </div>))}
                                {codeAndData.length === 0 && !showAddCodeData && <p className="text-xs text-slate-400 italic text-center py-4">No code or data files linked.</p>}
                            </div>
                        </div>
                        
                        {/* Other Assets Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium flex items-center gap-2 text-slate-800"><Layers className="w-4 h-4 text-amber-600"/> Other Assets</h4>
                                {!isGuestView && <button onClick={() => setShowAddOther(!showAddOther)} className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Asset</button>}
                            </div>
                            {showAddOther && !isGuestView && <div className="p-3 mb-3 bg-amber-50 rounded-lg border border-amber-100 grid grid-cols-2 gap-2 text-sm">
                                <input placeholder="File Name (e.g., Presentation Slides)" value={newOther.name} onChange={e => setNewOther({...newOther, name: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <select value={newOther.type} onChange={e => setNewOther({...newOther, type: e.target.value as any})} className="p-2 rounded border bg-white"><option value="slide">Slide Deck</option><option value="document">Document</option><option value="other">Other</option></select>
                                <input placeholder="URL" value={newOther.url} onChange={e => setNewOther({...newOther, url: e.target.value})} className="p-2 rounded border"/>
                                <div className="col-span-2 flex gap-2"><button onClick={() => handleAddFile(newOther, newOther.type)} className="bg-amber-600 text-white px-3 py-1 rounded text-xs">Save</button><button onClick={() => setShowAddOther(false)} className="bg-slate-200 px-3 py-1 rounded text-xs">Cancel</button></div>
                            </div>}
                            <div className="space-y-2">
                                {otherAssets.map(f => (<div key={f.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                                    <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:text-amber-600 flex items-center gap-2"><ExternalLink className="w-3 h-3"/> {f.name}</a>
                                    <div className="flex items-center gap-2"><span className="text-[10px] uppercase text-slate-500 bg-white px-1.5 py-0.5 rounded border">{f.type}</span>{!isGuestView && <button onClick={() => handleDeleteFile(f.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4" /></button>}</div>
                                </div>))}
                                {otherAssets.length === 0 && !showAddOther && <p className="text-xs text-slate-400 italic text-center py-4">No other assets linked.</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'notes':
                 const notes = project.notes || [];
                 return (
                    <div className="p-6 flex flex-col h-full overflow-hidden">
                         <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="font-semibold text-slate-700 text-lg">Project Sticky Board</h3>
                            <button onClick={addStickyNote} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> New Note</button>
                         </div>
                         <div className="flex-1 bg-slate-100/70 rounded-xl border border-slate-200 p-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {notes.map(note => (
                                    <div key={note.id} className={`group relative p-4 rounded-lg shadow-sm flex flex-col min-h-[200px] border ${note.color === 'yellow' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <input className="bg-transparent font-bold text-sm text-slate-700 outline-none w-full" value={note.title} onChange={(e) => updateStickyNote(note.id, { title: e.target.value })}/>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                <button onClick={() => setExpandedNoteId(note.id)} className="p-1 hover:bg-white/50 rounded" title="Expand"><Maximize2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => deleteStickyNote(note.id)} className="p-1 hover:bg-white/50 rounded text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <textarea className="flex-1 w-full text-sm text-slate-600 bg-transparent resize-none outline-none" value={note.content} onChange={(e) => updateStickyNote(note.id, { content: e.target.value })} />
                                    </div>
                                ))}
                                {notes.length === 0 && <button onClick={addStickyNote} className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 min-h-[200px]"><Plus className="w-6 h-6 mb-1" /><span>New Sticky Note</span></button>}
                            </div>
                         </div>
                    </div>
                 );
            case 'team':
                 return (
                    <div className="p-6">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-slate-700 text-lg">Team Members</h3>
                            {!isGuestView && (<button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"><Plus className="w-4 h-4" /> Add Member</button>)}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {project.collaborators.map(c => (<div key={c.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{c.initials}</div>
                                <div><p className="font-medium text-slate-800 truncate">{c.name}</p><p className="text-xs text-slate-500 truncate">{c.email}</p></div>
                                <span className="ml-auto text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-600">{c.role}</span>
                             </div>))}
                         </div>
                    </div>
                 );
            case 'ai':
                return <div className="p-6 h-full overflow-hidden"><AIChat project={project} /></div>;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-300 relative bg-slate-50">
            {showShareModal && <ShareModal project={project} currentUser={currentUser} onClose={() => setShowShareModal(false)} onAddCollaborator={handleAddCollaborator} onRemoveCollaborator={handleRemoveCollaborator} />}
            {renderExpandedNoteModal()}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask}
                    project={project}
                    currentUser={currentUser}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateSingleTask}
                    onDeleteTask={handleDeleteTask}
                />
            )}
            {addingTaskForStatus && (
                <AddTaskModal 
                    status={addingTaskForStatus}
                    project={project}
                    onClose={() => setAddingTaskForStatus(null)}
                    onSave={handleCreateTask}
                />
            )}


            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0 bg-white shadow-sm z-10">
                <div className="flex items-center gap-4">
                    {!isGuestView && (<button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100" title="Back to Projects"><ChevronLeft className="w-5 h-5" /></button>)}
                    <div>
                        <div className="flex items-center gap-3"><h2 className="text-xl font-bold text-slate-800">{project.title}</h2><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusClasses(project.status)}`}>{project.status}</span></div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isGuestView && (<>
                        <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Share2 className="w-4 h-4" /> Share</button>
                        {currentUser.role === 'Owner' && (<button onClick={handleDeleteProjectConfirm} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete Project"><Trash2 className="w-5 h-5" /></button>)}
                    </>)}
                </div>
            </header>
            
            <nav className="px-6 py-3 border-b border-slate-200 flex-shrink-0 bg-white flex items-center gap-4">
                <TabButton id="tasks" icon={ClipboardList} label="Tasks" />
                <TabButton id="files" icon={Book} label="Papers & Files" />
                <TabButton id="notes" icon={NoteIcon} label="Notes" />
                <TabButton id="team" icon={Users} label="Team" />
                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                <TabButton id="ai" icon={Bot} label="AI Assistant" />
            </nav>

            <main className="flex-1 overflow-hidden">{renderTabContent()}</main>
        </div>
    );
};