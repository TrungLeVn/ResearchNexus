import React, { useState, useRef, useEffect } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, ProjectFile, ProjectActivity } from '../types';
import { 
    ChevronLeft, Plus, Users, File as FileIcon, 
    Trash2, X, Check, Calendar, Send, MessageCircle, 
    LayoutDashboard, Activity, ChevronDown, Flag,
    Code, FileText, Database, Settings, Link, AlignLeft, FolderOpen, Box, Share2, Hash,
    ClipboardList, Megaphone, Table
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AIChat } from './AIChat';
import { sendEmailNotification } from '../services/email';

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
    onSendNotification: (msg: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, project, currentUser, onClose, onUpdateTask, onDeleteTask, onSendNotification }) => {
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [newComment, setNewComment] = useState('');
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const commentInputRef = useRef<HTMLInputElement>(null);
    const collaborators = project.collaborators || [];

    const handleSave = () => {
        const oldIds = task.assigneeIds || [];
        const newIds = editedTask.assigneeIds || [];
        const addedIds = newIds.filter(id => !oldIds.includes(id));

        if (addedIds.length > 0) {
            addedIds.forEach(id => {
                const user = collaborators.find(c => c.id === id);
                if (user && user.id !== currentUser.id) { 
                     const taskLink = `${window.location.origin}?pid=${project.id}&tid=${task.id}`;
                     sendEmailNotification(
                        user.email,
                        user.name,
                        `New Task Assigned: ${editedTask.title}`,
                        `You have been assigned to the task "<strong>${editedTask.title}</strong>" in project <strong>${project.title}</strong> by ${currentUser.name}.`,
                        taskLink
                    );
                }
            });
            onSendNotification(`Notified ${addedIds.length} new assignee(s)`);
        }
        onUpdateTask(editedTask);
        onClose();
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewComment(value);
        const words = value.split(' ');
        const lastWord = words[words.length - 1];
        if (lastWord.startsWith('@')) {
            setShowMentionList(true);
            setMentionQuery(lastWord.substring(1));
        } else {
            setShowMentionList(false);
        }
    };

    const handleSelectMention = (collaborator: Collaborator) => {
        const words = newComment.split(' ');
        words.pop(); 
        const newValue = `${words.join(' ')} @${collaborator.name} `;
        setNewComment(newValue);
        setShowMentionList(false);
        commentInputRef.current?.focus();
    };

    const filteredCollaborators = collaborators.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()));

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
        onUpdateTask(updatedTask); 
        
        collaborators.forEach(c => {
            if (newComment.includes(`@${c.name}`) && c.id !== currentUser.id) {
                const taskLink = `${window.location.origin}?pid=${project.id}&tid=${task.id}`;
                sendEmailNotification(
                    c.email,
                    c.name,
                    `You were mentioned in ${project.title}`,
                    `${currentUser.name} mentioned you in a comment on task "<strong>${updatedTask.title}</strong>":<br/><i>"${newComment}"</i>`,
                    taskLink
                );
            }
        });
        setNewComment('');
        setShowMentionList(false);
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
                        
                        {/* Add Assignee Selector Here */}
                        <AssigneeSelector 
                            collaborators={collaborators}
                            selectedIds={editedTask.assigneeIds || []}
                            onChange={(ids) => setEditedTask({...editedTask, assigneeIds: ids})}
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
                                                <p className="text-sm text-slate-700">
                                                    {c.text.split(' ').map((word, i) => word.startsWith('@') ? <span key={i} className="text-indigo-600 font-medium">{word} </span> : word + ' ')}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(c.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 relative">
                                {showMentionList && (
                                    <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-20">
                                        <div className="bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-500 uppercase">Mention Member</div>
                                        {filteredCollaborators.map(c => (
                                            <button key={c.id} onClick={() => handleSelectMention(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold">{c.initials}</div>{c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input ref={commentInputRef} value={newComment} onChange={handleCommentChange} onKeyDown={e => e.key === 'Enter' && handleAddComment()} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Add a comment... Type @ to mention" />
                                    <button onClick={handleAddComment} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Send className="w-4 h-4"/></button>
                                </div>
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
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    
    const collaborators = project.collaborators || [];

    const handleSave = () => {
        if (!title.trim()) return;
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title, status, priority, dueDate, assigneeIds, comments: [], description: ''
        };
        if (assigneeIds.length > 0) {
            assigneeIds.forEach(id => {
                const user = collaborators.find(c => c.id === id);
                if (user) {
                     const taskLink = `${window.location.origin}?pid=${project.id}&tid=${newTask.id}`;
                     sendEmailNotification(user.email, user.name, `New Task: ${title}`, `You have been assigned to a new task in <strong>${project.title}</strong>.`, taskLink);
                }
            });
        }
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                             <AssigneeSelector 
                                collaborators={collaborators}
                                selectedIds={assigneeIds}
                                onChange={setAssigneeIds}
                             />
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
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Task</button>
                </div>
            </div>
        </div>
    );
};

interface FileCardProps {
    file: ProjectFile;
    onDelete: (id: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onDelete }) => (
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 group relative hover:shadow-md transition-all h-full">
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
                file.type === 'code' ? 'bg-slate-800 text-white' : 
                file.type === 'data' ? 'bg-emerald-100 text-emerald-600' :
                file.type === 'draft' || file.type === 'document' ? 'bg-indigo-50 text-indigo-600' :
                'bg-amber-50 text-amber-600'
            }`}>
                {file.type === 'code' ? <Code className="w-5 h-5" /> : 
                 file.type === 'data' ? <Database className="w-5 h-5" /> :
                 file.type === 'other' ? <Box className="w-5 h-5" /> :
                 <FileText className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate mb-1" title={file.name}>{file.name}</p>
                <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <Link className="w-3 h-3" /> Open in Drive
                </a>
            </div>
        </div>
        
        {file.description && (
            <div className="mt-1 bg-slate-50 p-2 rounded text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {file.description}
            </div>
        )}
        
        <div className="mt-auto pt-2 flex justify-between items-center text-[10px] text-slate-400">
             <span>{new Date(file.lastModified).toLocaleDateString()}</span>
             <button onClick={() => onDelete(file.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    </div>
);

// --- NEW FILE UPLOAD MODAL ---
interface AddFileModalProps {
    type: 'draft' | 'code' | 'other';
    projectCategory?: 'research' | 'admin';
    onClose: () => void;
    onSave: (name: string, description: string, url: string, type: ProjectFile['type']) => void;
}

const AddFileModal: React.FC<AddFileModalProps> = ({ type, projectCategory = 'research', onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [specificType, setSpecificType] = useState<ProjectFile['type']>(type === 'draft' ? 'draft' : type === 'code' ? 'code' : 'other');
    
    // Determine labels based on category
    const isAdmin = projectCategory === 'admin';
    
    const getModalTitle = () => {
        if (isAdmin) {
             if (type === 'draft') return "Add Official Document";
             if (type === 'code') return "Add Logistics / Finance";
             if (type === 'other') return "Add Media / Asset";
        }
        return type === 'draft' ? 'Add Draft/Paper' : type === 'code' ? 'Add Code/Data' : 'Add Asset';
    };

    const handleConfirm = () => {
        if (!name || !url) return;
        onSave(name, description, url, specificType);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {type === 'draft' && <FileText className="w-4 h-4 text-indigo-600" />}
                        {type === 'code' && (isAdmin ? <Table className="w-4 h-4 text-emerald-600" /> : <Database className="w-4 h-4 text-emerald-600" />)}
                        {type === 'other' && (isAdmin ? <Megaphone className="w-4 h-4 text-amber-600" /> : <Box className="w-4 h-4 text-amber-600" />)}
                        {getModalTitle()}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">File Name</label>
                        <input 
                            autoFocus
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder={isAdmin ? "e.g. Workshop Budget v1" : "e.g. Experiment Results v2"}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    
                    {/* Sub-type selection for specific categories */}
                    {type === 'draft' && (
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
                             <select 
                                value={specificType} 
                                onChange={(e) => setSpecificType(e.target.value as any)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                             >
                                 {isAdmin ? (
                                    <>
                                        <option value="document">Official Document</option>
                                        <option value="draft">Proposal/Draft</option>
                                        <option value="slide">Meeting Minutes</option>
                                    </>
                                 ) : (
                                    <>
                                        <option value="draft">Draft Manuscript</option>
                                        <option value="document">General Doc</option>
                                        <option value="slide">Presentation Slide</option>
                                    </>
                                 )}
                             </select>
                        </div>
                    )}
                    {type === 'code' && (
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
                             <select 
                                value={specificType} 
                                onChange={(e) => setSpecificType(e.target.value as any)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                             >
                                 {isAdmin ? (
                                     <>
                                         <option value="data">Spreadsheet / Budget</option>
                                         <option value="code">Schedule / Plan</option>
                                     </>
                                 ) : (
                                     <>
                                         <option value="code">Source Code</option>
                                         <option value="data">Dataset / Logs</option>
                                     </>
                                 )}
                             </select>
                        </div>
                    )}
                     {type === 'other' && isAdmin && (
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
                             <select 
                                value={specificType} 
                                onChange={(e) => setSpecificType(e.target.value as any)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                             >
                                 <option value="other">Image / Asset</option>
                                 <option value="slide">Presentation</option>
                             </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Google Drive URL</label>
                        <div className="relative">
                            <Link className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                className="w-full border border-slate-300 rounded-lg pl-9 pr-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://docs.google.com/..."
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Short Description</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg pl-9 pr-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                                placeholder="Briefly describe this file..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!name || !url}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Save File
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- TAG MANAGER MODAL ---
interface TagManagerModalProps {
    currentTags: string[];
    allTags: string[]; // Global suggestions
    onClose: () => void;
    onUpdate: (newTags: string[]) => void;
}

const TagManagerModal: React.FC<TagManagerModalProps> = ({ currentTags, allTags, onClose, onUpdate }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (!inputValue) {
            setSuggestions([]);
            return;
        }
        const lowerInput = inputValue.toLowerCase();
        // Filter global tags that contain input AND are not already selected
        const matches = allTags.filter(t => 
            t.toLowerCase().includes(lowerInput) && !currentTags.includes(t)
        );
        setSuggestions(matches);
    }, [inputValue, allTags, currentTags]);

    const addTag = (tag: string) => {
        onUpdate([...currentTags, tag]);
        setInputValue('');
        setSuggestions([]);
    };

    const removeTag = (tag: string) => {
        onUpdate(currentTags.filter(t => t !== tag));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Hash className="w-4 h-4 text-pink-500" /> Manage Topics
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {currentTags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="hover:text-pink-900"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        {currentTags.length === 0 && <span className="text-slate-400 text-sm italic">No topics added.</span>}
                    </div>
                    
                    <div className="relative">
                        <input 
                            autoFocus
                            placeholder="Type new topic..."
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && inputValue.trim()) {
                                    addTag(inputValue.trim());
                                }
                            }}
                        />
                        {/* Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                                {suggestions.map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => addTag(s)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 block"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Press Enter to add.</p>
                </div>
                 <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800">Done</button>
                </div>
            </div>
        </div>
    );
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, currentUser, onUpdateProject, onBack, onDeleteProject, isGuestView = false, existingTags = [] }) => {
    const [tasks, setTasks] = useState<Task[]>(project.tasks);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [addingTaskStatus, setAddingTaskStatus] = useState<TaskStatus | null>(null);
    const [notificationMsg, setNotificationMsg] = useState('');
    
    // File State
    const [isAddingFile, setIsAddingFile] = useState<null | 'draft' | 'code' | 'other'>(null);
    const [isManagingTags, setIsManagingTags] = useState(false);

    // View State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'files' | 'team' | 'ai'>('dashboard');

    useEffect(() => { setTasks(project.tasks); }, [project.tasks]);

    const handleUpdateTask = (updatedTask: Task) => {
        const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        setTasks(newTasks);
        onUpdateProject({ ...project, tasks: newTasks });
    };

    const handleDeleteTask = (taskId: string) => {
        const newTasks = tasks.filter(t => t.id !== taskId);
        setTasks(newTasks);
        onUpdateProject({ ...project, tasks: newTasks });
    };

    const handleAddTask = (newTask: Task) => {
        const newTasks = [...tasks, newTask];
        setTasks(newTasks);
        onUpdateProject({ ...project, tasks: newTasks });
        setAddingTaskStatus(null);
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}?pid=${project.id}`;
        navigator.clipboard.writeText(shareUrl);
        showNotification("Project link copied to clipboard!");
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        const taskToMove = tasks.find(t => t.id === taskId);
        
        if (taskToMove && taskToMove.status !== newStatus) {
            const updatedTask = { ...taskToMove, status: newStatus };
            handleUpdateTask(updatedTask);
        }
    };

    const handleAddFile = (name: string, description: string, url: string, type: ProjectFile['type']) => {
        const newFile: ProjectFile = {
            id: Date.now().toString(),
            name,
            description,
            type,
            lastModified: new Date().toISOString(),
            url
        };
        onUpdateProject({ ...project, files: [...project.files, newFile] });
        setIsAddingFile(null);
    };

    const showNotification = (msg: string) => {
        setNotificationMsg(msg);
        setTimeout(() => setNotificationMsg(''), 3000);
    };

    // Deep linking logic for tasks
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tid = params.get('tid');
        if (tid && !editingTask) {
             const foundTask = tasks.find(t => t.id === tid);
             if (foundTask) {
                 setEditingTask(foundTask);
                 setActiveTab('tasks');
             }
        }
    }, [tasks]);

    // Data Calculation
    const progress = project.progress;
    
    const pieData = [
        { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#0ea5e9' },
        { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
        { name: 'Done', value: tasks.filter(t => t.status === 'done').length, color: '#10b981' }
    ].filter(d => d.value > 0);

    const handleProgressChange = (newProgress: number) => {
        onUpdateProject({ ...project, progress: newProgress });
    };

    const handleProjectStatusChange = (newStatus: string) => {
        onUpdateProject({ ...project, status: newStatus as ProjectStatus });
    };

    // Render Logic

    const renderDashboard = () => (
        <div className="p-6 h-full overflow-y-auto animate-in fade-in duration-300">
             {/* Header Section with Description & Tags */}
             <div className="mb-8">
                <p className="text-slate-600 mb-4 text-lg">{project.description || "No description provided."}</p>
                <div className="flex flex-wrap gap-2 items-center">
                    {(project.tags || []).map(tag => (
                        <span key={tag} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm font-medium border border-pink-100">
                            #{tag}
                        </span>
                    ))}
                    {!isGuestView && (
                        <button 
                            onClick={() => setIsManagingTags(true)} 
                            className="px-3 py-1 bg-white border border-dashed border-slate-300 text-slate-400 rounded-full text-sm hover:border-pink-300 hover:text-pink-500 flex items-center gap-1 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Topic
                        </button>
                    )}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 {/* Stat Cards */}
                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div>
                             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Progress</p>
                             <h3 className="text-2xl font-bold text-slate-800 mt-1">{progress}%</h3>
                         </div>
                         <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                             <Activity className="w-5 h-5" />
                         </div>
                     </div>
                     <div className="mt-4">
                        {currentUser.role === 'Owner' && !isGuestView ? (
                             <input 
                                type="range" 
                                min="0" max="100" 
                                value={progress}
                                onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                title="Drag to update progress"
                             />
                        ) : (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{width: `${progress}%`}}></div>
                            </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1 text-right">{currentUser.role === 'Owner' ? 'Drag to update' : 'Read-only'}</p>
                     </div>
                 </div>

                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div>
                             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks</p>
                             <h3 className="text-2xl font-bold text-slate-800 mt-1">{tasks.filter(t => t.status === 'done').length} <span className="text-sm font-normal text-slate-400">/ {tasks.length}</span></h3>
                         </div>
                         <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                             <Check className="w-5 h-5" />
                         </div>
                     </div>
                     <p className="text-xs text-slate-400 mt-4">{tasks.filter(t => t.status === 'todo').length} pending tasks</p>
                 </div>

                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div>
                             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team</p>
                             <h3 className="text-2xl font-bold text-slate-800 mt-1">{project.collaborators.length}</h3>
                         </div>
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                             <Users className="w-5 h-5" />
                         </div>
                     </div>
                     <div className="flex -space-x-2 mt-4">
                        {project.collaborators.slice(0, 5).map(c => (
                             <div key={c.id} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600">{c.initials}</div>
                        ))}
                     </div>
                 </div>

                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div>
                             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files</p>
                             <h3 className="text-2xl font-bold text-slate-800 mt-1">{project.files.length}</h3>
                         </div>
                         <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                             <FileIcon className="w-5 h-5" />
                         </div>
                     </div>
                     <p className="text-xs text-slate-400 mt-4">Across drafts, code, & assets</p>
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Charts */}
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                         Task Breakdown
                     </h3>
                     <div className="h-64 flex items-center justify-center">
                        {tasks.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-slate-400 text-sm italic">No tasks created yet.</p>
                        )}
                     </div>
                 </div>

                 {/* Key Milestones Widget */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Flag className="w-5 h-5 text-rose-500" />
                         Key Milestones
                     </h3>
                     <div className="space-y-4 flex-1 overflow-y-auto max-h-[250px] pr-2">
                         {tasks
                            .filter(t => t.priority === 'high' && t.status !== 'done')
                            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                            .map(t => (
                                <div key={t.id} onClick={() => setEditingTask(t)} className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
                                    <div className="bg-white p-1.5 rounded-md shadow-sm">
                                        <Calendar className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{t.title}</h4>
                                        <p className="text-xs text-rose-600 font-medium">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                         }
                         {tasks.filter(t => t.priority === 'high' && t.status !== 'done').length === 0 && (
                             <div className="text-center py-8 text-slate-400">
                                 <Flag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                 <p className="text-sm">No active milestones.</p>
                                 <p className="text-xs opacity-70">Mark tasks as "High Priority" to see them here.</p>
                             </div>
                         )}
                     </div>
                 </div>
                 
                 {/* Activity Feed (Full Width) */}
                 <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Activity className="w-5 h-5 text-blue-600" />
                         Recent Activity
                     </h3>
                     <div className="space-y-4">
                        {(project.activity || []).length > 0 ? (project.activity || []).slice(0, 5).map(act => {
                            const author = project.collaborators.find(c => c.id === act.authorId) || { name: 'Unknown User', initials: '?' };
                            return (
                                <div key={act.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                        {author.initials}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-800">
                                            <span className="font-medium">{author.name}</span> {act.message}
                                        </p>
                                        <p className="text-xs text-slate-400">{new Date(act.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-slate-400 italic">No recent activity recorded.</p>
                        )}
                     </div>
                 </div>
             </div>
        </div>
    );

    const renderTasks = () => (
        <div className="h-full overflow-x-auto overflow-y-hidden p-6 flex gap-6">
             {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                <div 
                    key={status} 
                    className="w-80 flex flex-col h-full flex-shrink-0"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                >
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            {status === 'todo' && <div className="w-2 h-2 rounded-full bg-sky-500"></div>}
                            {status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                            {status === 'done' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                            {statusMap[status]} 
                            <span className="text-slate-400 text-xs font-normal ml-1">({tasks.filter(t => t.status === status).length})</span>
                        </h3>
                        <button onClick={() => setAddingTaskStatus(status)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="flex-1 bg-slate-100/50 rounded-xl p-3 border border-slate-200 overflow-y-auto space-y-3 transition-colors hover:bg-slate-100/80">
                        {tasks.filter(t => t.status === status).map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                project={project} 
                                onClick={() => setEditingTask(task)}
                                onDragStart={handleDragStart}
                            />
                        ))}
                        <button 
                            onClick={() => setAddingTaskStatus(status)}
                            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Task
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderTeam = () => (
        <div className="p-6 h-full overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Users className="w-5 h-5 text-indigo-600" />
                     Team Members
                 </h3>
                 {!isGuestView && currentUser.role === 'Owner' && (
                     <button 
                        onClick={() => {
                            const email = prompt("Enter email to invite:");
                            if(email) alert(`Invitation sent to ${email} (Mock)`);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                     >
                         <Plus className="w-4 h-4" /> Add Member
                     </button>
                 )}
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {project.collaborators.map(c => (
                     <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 border-2 border-white shadow-sm">
                             {c.initials}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="font-bold text-slate-800 truncate">{c.name}</p>
                             <p className="text-xs text-slate-500 truncate">{c.email}</p>
                         </div>
                         <div>
                             {currentUser.role === 'Owner' && c.id !== currentUser.id ? (
                                 <select 
                                     value={c.role}
                                     onChange={(e) => {
                                         const newRole = e.target.value as any;
                                         const updatedCollabs = project.collaborators.map(col => col.id === c.id ? {...col, role: newRole} : col);
                                         onUpdateProject({...project, collaborators: updatedCollabs});
                                     }}
                                     className="text-xs font-medium px-2 py-1 rounded bg-slate-100 border-none outline-none cursor-pointer hover:bg-slate-200 text-slate-700"
                                 >
                                     <option value="Owner">Owner</option>
                                     <option value="Editor">Editor</option>
                                     <option value="Viewer">Viewer</option>
                                     <option value="Guest">Guest</option>
                                 </select>
                             ) : (
                                 <span className={`text-xs font-medium px-2 py-1 rounded ${
                                     c.role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                                     c.role === 'Editor' ? 'bg-blue-100 text-blue-700' :
                                     'bg-slate-100 text-slate-600'
                                 }`}>
                                     {c.role}
                                 </span>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );

    const renderFiles = () => {
        const isAdmin = project.category === 'admin';
        
        // Group files differently based on project category
        const drafts = project.files.filter(f => ['draft', 'document', 'slide'].includes(f.type));
        const code = project.files.filter(f => ['code', 'data'].includes(f.type));
        const assets = project.files.filter(f => f.type === 'other');

        // Admin mapping for groups
        const adminDocs = project.files.filter(f => ['document', 'draft'].includes(f.type));
        const adminLogistics = project.files.filter(f => ['data', 'code'].includes(f.type));
        const adminMedia = project.files.filter(f => ['slide', 'other'].includes(f.type));

        return (
            <div className="p-6 h-full overflow-y-auto animate-in fade-in duration-300">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                     <FileIcon className="w-5 h-5 text-indigo-600" />
                     {isAdmin ? 'Project Documents & Assets' : 'Project Assets'}
                </h3>

                {/* Widgets Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {isAdmin ? (
                        <>
                            {/* ADMIN WIDGETS */}
                            <button 
                                onClick={() => setIsAddingFile('draft')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800">Official Documents</h4>
                                <p className="text-xs text-slate-500 mt-1">Proposals, Minutes, Decisions.</p>
                                <div className="mt-4 text-xs font-medium text-indigo-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Doc
                                </div>
                            </button>

                            <button 
                                onClick={() => setIsAddingFile('code')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800">Logistics & Finance</h4>
                                <p className="text-xs text-slate-500 mt-1">Budgets, Schedules, Lists.</p>
                                <div className="mt-4 text-xs font-medium text-emerald-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Sheet
                                </div>
                            </button>

                            <button 
                                onClick={() => setIsAddingFile('other')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                    <Megaphone className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800">Media & Marketing</h4>
                                <p className="text-xs text-slate-500 mt-1">Posters, Invitations, Slides.</p>
                                <div className="mt-4 text-xs font-medium text-amber-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Asset
                                </div>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* RESEARCH WIDGETS */}
                            <button 
                                onClick={() => setIsAddingFile('draft')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800">Drafts & Papers</h4>
                                <p className="text-xs text-slate-500 mt-1">Add manuscripts, docs, slides.</p>
                                <div className="mt-4 text-xs font-medium text-indigo-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add File
                                </div>
                            </button>

                            <button 
                                onClick={() => setIsAddingFile('code')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <Database className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800">Code & Data</h4>
                                <p className="text-xs text-slate-500 mt-1">Upload code, datasets, logs.</p>
                                <div className="mt-4 text-xs font-medium text-emerald-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add File
                                </div>
                            </button>

                            <button 
                                onClick={() => setIsAddingFile('other')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                    <FolderOpen className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800">Other Assets</h4>
                                <p className="text-xs text-slate-500 mt-1">Images, PDFs, misc resources.</p>
                                <div className="mt-4 text-xs font-medium text-amber-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add File
                                </div>
                            </button>
                        </>
                    )}
                </div>

                {/* File Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1 */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                             {isAdmin ? 'Official Docs' : 'Drafts & Docs'} <span className="px-1.5 py-0.5 bg-indigo-100 rounded-full">{(isAdmin ? adminDocs : drafts).length}</span>
                        </h4>
                        <div className="space-y-3">
                            {(isAdmin ? adminDocs : drafts).map(f => <FileCard key={f.id} file={f} onDelete={(id) => onUpdateProject({...project, files: project.files.filter(fi => fi.id !== id)})} />)}
                            {(isAdmin ? adminDocs : drafts).length === 0 && <p className="text-center text-xs text-slate-400 py-4 italic">No documents yet.</p>}
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                             {isAdmin ? 'Logistics & Finance' : 'Code & Data'} <span className="px-1.5 py-0.5 bg-emerald-100 rounded-full">{(isAdmin ? adminLogistics : code).length}</span>
                        </h4>
                        <div className="space-y-3">
                            {(isAdmin ? adminLogistics : code).map(f => <FileCard key={f.id} file={f} onDelete={(id) => onUpdateProject({...project, files: project.files.filter(fi => fi.id !== id)})} />)}
                            {(isAdmin ? adminLogistics : code).length === 0 && <p className="text-center text-xs text-slate-400 py-4 italic">No files yet.</p>}
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                         <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                             {isAdmin ? 'Media & Assets' : 'Other Assets'} <span className="px-1.5 py-0.5 bg-amber-100 rounded-full">{(isAdmin ? adminMedia : assets).length}</span>
                        </h4>
                        <div className="space-y-3">
                            {(isAdmin ? adminMedia : assets).map(f => <FileCard key={f.id} file={f} onDelete={(id) => onUpdateProject({...project, files: project.files.filter(fi => fi.id !== id)})} />)}
                            {(isAdmin ? adminMedia : assets).length === 0 && <p className="text-center text-xs text-slate-400 py-4 italic">No assets.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300">
             {/* Header */}
             <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                 <div className="flex items-center gap-4">
                     {!isGuestView && (
                         <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                             <ChevronLeft className="w-5 h-5" />
                         </button>
                     )}
                     <div>
                         <h2 className="text-xl font-bold text-slate-800">{project.title}</h2>
                         <div className="flex items-center gap-3 text-xs text-slate-500">
                             {currentUser.role === 'Owner' && !isGuestView ? (
                                 <select 
                                    value={project.status} 
                                    onChange={(e) => handleProjectStatusChange(e.target.value)}
                                    className="bg-slate-100 px-2 py-0.5 rounded outline-none cursor-pointer hover:bg-slate-200"
                                 >
                                    <option value={ProjectStatus.PLANNING}>Planning</option>
                                    <option value={ProjectStatus.ACTIVE}>Active</option>
                                    <option value={ProjectStatus.REVIEW}>Review</option>
                                    <option value={ProjectStatus.COMPLETED}>Completed</option>
                                    <option value={ProjectStatus.PAUSED}>Paused</option>
                                    <option value={ProjectStatus.ARCHIVED}>Archived</option>
                                 </select>
                             ) : (
                                 <span className="bg-slate-100 px-2 py-0.5 rounded">{project.status}</span>
                             )}
                             <span>•</span>
                             <span>Updated {new Date().toLocaleDateString()}</span>
                         </div>
                     </div>
                 </div>

                 <div className="flex bg-slate-100 p-1 rounded-lg">
                     <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
                     <button onClick={() => setActiveTab('tasks')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tasks</button>
                     <button onClick={() => setActiveTab('files')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'files' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Files</button>
                     <button onClick={() => setActiveTab('team')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Team</button>
                     <button onClick={() => setActiveTab('ai')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'ai' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>AI Chat</button>
                 </div>

                 <div className="flex items-center gap-2">
                     <button 
                        onClick={handleShare}
                        className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"
                        title="Share Project Link"
                    >
                         <Share2 className="w-5 h-5" />
                     </button>
                     {!isGuestView && currentUser.role === 'Owner' && (
                         <button onClick={() => { if(window.confirm('Delete project?')) onDeleteProject(project.id); }} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Delete Project">
                             <Trash2 className="w-5 h-5" />
                         </button>
                     )}
                 </div>
             </header>

             {/* Content */}
             <div className="flex-1 overflow-hidden relative">
                 {activeTab === 'dashboard' && renderDashboard()}
                 {activeTab === 'tasks' && renderTasks()}
                 {activeTab === 'files' && renderFiles()}
                 {activeTab === 'team' && renderTeam()}
                 {activeTab === 'ai' && <div className="p-6 h-full"><AIChat project={project} /></div>}
             </div>

             {/* Modals */}
             {isManagingTags && (
                 <TagManagerModal 
                    currentTags={project.tags || []} 
                    allTags={existingTags} 
                    onClose={() => setIsManagingTags(false)} 
                    onUpdate={(newTags) => onUpdateProject({...project, tags: newTags})} 
                 />
             )}
             {isAddingFile && (
                 <AddFileModal 
                    type={isAddingFile}
                    projectCategory={project.category}
                    onClose={() => setIsAddingFile(null)} 
                    onSave={handleAddFile} 
                 />
             )}
             {editingTask && (
                 <TaskDetailModal 
                     task={editingTask} 
                     project={project}
                     currentUser={currentUser}
                     onClose={() => setEditingTask(null)}
                     onUpdateTask={handleUpdateTask}
                     onDeleteTask={handleDeleteTask}
                     onSendNotification={showNotification}
                 />
             )}
             {addingTaskStatus && (
                 <AddTaskModal 
                     status={addingTaskStatus}
                     project={project}
                     onClose={() => setAddingTaskStatus(null)}
                     onSave={handleAddTask}
                 />
             )}
             
             {/* Notification Toast */}
             {notificationMsg && (
                 <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-bottom duration-300 z-50">
                     <Check className="w-4 h-4 text-emerald-400" />
                     {notificationMsg}
                 </div>
             )}
        </div>
    );
};