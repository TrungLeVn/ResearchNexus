import React, { useState, useRef, useEffect } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, ProjectFile, ProjectActivity } from '../types';
import { 
    ChevronLeft, Plus, Users, File as FileIcon, 
    Trash2, X, Check, Calendar, Send, MessageCircle, 
    LayoutDashboard, Activity, ChevronDown, Flag,
    Code, FileText, Database, Settings, Link, AlignLeft, FolderOpen, Box, Share2, Hash,
    ClipboardList, Megaphone, Table, Loader2, AlertTriangle, Edit2, Save, Folder, FolderSync, Globe,
    ExternalLink, Mail, User
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AIChat } from './AIChat';
import { sendEmailNotification } from '../services/email';
import ReactMarkdown from 'react-markdown';
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

// --- MANAGE COLLABORATORS MODAL ---
interface ManageCollaboratorsModalProps {
    collaborators: Collaborator[];
    currentUser: Collaborator;
    onClose: () => void;
    onAdd: (email: string, name: string) => void;
    onRemove: (id: string) => void;
}

const ManageCollaboratorsModal: React.FC<ManageCollaboratorsModalProps> = ({ collaborators, currentUser, onClose, onAdd, onRemove }) => {
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');

    const handleAdd = () => {
        if (newEmail && newName) {
            onAdd(newEmail, newName);
            setNewEmail('');
            setNewName('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" /> Manage Collaborators
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* List Existing */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">Current Team</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {collaborators.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                            {c.initials}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                                            <p className="text-xs text-slate-500">{c.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">{c.role}</span>
                                        {c.id !== currentUser.id && c.role !== 'Owner' && (
                                            <button onClick={() => onRemove(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add New */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">Invite New Member</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input 
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input 
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button 
                                onClick={handleAdd}
                                disabled={!newName || !newEmail}
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Add Collaborator
                            </button>
                        </div>
                    </div>
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
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const collaborators = project.collaborators || [];

    const handleSave = async () => {
        setIsSaving(true);
        const oldIds = task.assigneeIds || [];
        const newIds = editedTask.assigneeIds || [];
        const addedIds = newIds.filter(id => !oldIds.includes(id));

        if (addedIds.length > 0) {
            console.log("Found new assignees, triggering email notifications...");
            
            const results = await Promise.all(addedIds.map(async (id) => {
                const user = collaborators.find(c => c.id === id);
                if (user && user.id !== currentUser.id) { 
                     const taskLink = `${window.location.origin}?pid=${project.id}&tid=${task.id}`;
                     return await sendEmailNotification(
                        user.email,
                        user.name,
                        `New Task Assigned: ${editedTask.title}`,
                        `You have been assigned to the task "<strong>${editedTask.title}</strong>" in project <strong>${project.title}</strong> by ${currentUser.name}.`,
                        taskLink
                    );
                }
                return { success: true }; // Self-assign or not found
            }));

            // Check if any email failed
            const failed = results.find(r => !r.success);
            if (failed) {
                alert(`Warning: Notification failed. ${failed.message}`);
            } else {
                onSendNotification(`Notified ${addedIds.length} new assignee(s)`);
            }
        }
        
        onUpdateTask(editedTask);
        setIsSaving(false);
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

    const handleAddComment = async () => {
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
        
        // Notify mentioned users
        const mentionedUsers = collaborators.filter(c => 
            newComment.includes(`@${c.name}`) && c.id !== currentUser.id
        );

        if (mentionedUsers.length > 0) {
            const results = await Promise.all(mentionedUsers.map(c => {
                 const taskLink = `${window.location.origin}?pid=${project.id}&tid=${task.id}`;
                 return sendEmailNotification(
                    c.email,
                    c.name,
                    `You were mentioned in ${project.title}`,
                    `${currentUser.name} mentioned you in a comment on task "<strong>${updatedTask.title}</strong>":<br/><i>"${newComment}"</i>`,
                    taskLink
                );
            }));

             const failed = results.find(r => !r.success);
             if(failed) alert(`Notification Error: ${failed.message}`);
        }

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
        
        if (assigneeIds.length > 0) {
            console.log("Sending email notifications to assignees...");
            const results = await Promise.all(assigneeIds.map(async (id) => {
                const user = collaborators.find(c => c.id === id);
                if (user) {
                     const taskLink = `${window.location.origin}?pid=${project.id}&tid=${newTask.id}`;
                     return await sendEmailNotification(user.email, user.name, `New Task: ${title}`, `You have been assigned to a new task in <strong>${project.title}</strong>.`, taskLink);
                }
                return { success: true };
            }));

            const failed = results.find(r => !r.success);
            if (failed) {
                 alert(`Task created, but email failed: ${failed.message}`);
            }
        }
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

// --- NEW GOOGLE DRIVE SECTION COMPONENT ---
const DriveLinkManager: React.FC<{
    category: 'drafts' | 'code' | 'assets';
    project: Project;
    onUpdateProject: (project: Project) => void;
}> = ({ category, project, onUpdateProject }) => {
    const driveUrl = project.categoryDriveUrls?.[category] || '';
    const [urlInput, setUrlInput] = useState(driveUrl);
    const [isEditing, setIsEditing] = useState(!driveUrl);
    
    useEffect(() => {
        setUrlInput(driveUrl);
        if(!driveUrl) setIsEditing(true);
    }, [driveUrl]);

    const handleSaveLink = () => {
        const updatedProject = {
            ...project,
            categoryDriveUrls: {
                ...project.categoryDriveUrls,
                [category]: urlInput.trim(),
            },
        };
        onUpdateProject(updatedProject);
        setIsEditing(false);
    };
    
    const handleClearLink = () => {
        setUrlInput('');
         const updatedProject = {
            ...project,
            categoryDriveUrls: {
                ...project.categoryDriveUrls,
                [category]: '',
            },
        };
        onUpdateProject(updatedProject);
        setIsEditing(true);
    };

    if (driveUrl && !isEditing) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <a 
                    href={driveUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium truncate"
                >
                    <Folder className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{driveUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div className="flex gap-2">
                     <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md" title="Edit Link">
                        <Edit2 className="w-3.5 h-3.5" />
                     </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-md border border-slate-200 text-slate-500">
                    <Globe className="w-4 h-4" />
                </div>
                <input 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"
                    placeholder="Paste public Google Drive folder URL..."
                />
                <button onClick={handleSaveLink} className="px-3 py-2 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                    Save
                </button>
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
            setError(null);
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
        return <div className="flex items-center justify-center p-4 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading files...</div>;
    }
    if (error) {
        return (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                     <AlertTriangle className="w-3.5 h-3.5" /> Sync Error
                </div>
                <p className="text-xs text-red-600">{error}</p>
                <a href={driveUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                    Open in Drive <ExternalLink className="w-3 h-3"/>
                </a>
            </div>
        );
    }
    if (driveFiles.length === 0) {
        return <p className="text-xs text-center text-slate-400 italic p-4">Synced folder is empty.</p>;
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

// FIX: Moved TabButton outside of ProjectDetail to avoid re-declaration on each render and fix potential type inference issues.
// Updated signature to use React.FC to solve type inference issues with children.
const TabButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: any;
}> = ({ isActive, onClick, children, icon: Icon }) => (
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
  const [activeTab, setActiveTab] = useState<'board' | 'files' | 'notes' | 'activity' | 'settings'>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingTaskTo, setAddingTaskTo] = useState<TaskStatus | null>(null);
  const [showNotification, setShowNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState(project.title);
  const [showEditTitleIcon, setShowEditTitleIcon] = useState(false);

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

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
      // Default to "other" category if manual add, but allow user to be organized in next iteration
      const typeStr = prompt("Type (draft, code, data, slide, document):", "document");
      // Basic validation
      const type = (['draft', 'code', 'data', 'slide', 'document'].includes(typeStr || '') ? typeStr : 'document') as ProjectFile['type'];
      
      const newFile: ProjectFile = {
          id: `file_${Date.now()}`,
          name,
          url: '', // Manual files might not have URLs initially
          description: "Manually added file.",
          type,
          lastModified: new Date().toISOString()
      };
      onUpdateProject({ ...project, files: [...project.files, newFile], activity: addActivity(`added file "${name}"`) });
  };
  
  const handleDeleteFile = (id: string) => {
      onUpdateProject({ ...project, files: project.files.filter(f => f.id !== id) });
  };
  
  const handleUpdateNote = (noteId: string, content: string) => {
      const updatedNotes = project.notes.map(n => n.id === noteId ? { ...n, content } : n);
      onUpdateProject({ ...project, notes: updatedNotes });
  };

  const handleAddNote = () => {
      const newNote = {
          id: `note_${Date.now()}`,
          title: "New Note",
          content: "",
          color: 'yellow' as 'yellow',
          createdAt: new Date().toISOString()
      };
      onUpdateProject({ ...project, notes: [...project.notes, newNote] });
  };
  
  const handleDeleteNote = (id: string) => {
      onUpdateProject({ ...project, notes: project.notes.filter(n => n.id !== id) });
  };

  const handleUpdateProjectTitle = () => {
    if (newProjectTitle.trim() && newProjectTitle !== project.title) {
        onUpdateProject({ ...project, title: newProjectTitle.trim() });
    }
    setIsEditingTitle(false);
  };
  
  const handleAddCollaborator = (email: string, name: string) => {
      // Simulate invite or add if system supports user lookup. 
      // Since this is a client-side demo mostly, we just add to array.
      const newCollab: Collaborator = {
          id: email.replace(/[^a-zA-Z0-9]/g, ''),
          name: name,
          email: email,
          role: 'Viewer', // Default role
          initials: name.substring(0,2).toUpperCase()
      };
      
      const updatedCollaborators = [...project.collaborators, newCollab];
      onUpdateProject({ ...project, collaborators: updatedCollaborators });
      alert(`Invited ${name} (${email})`);
  };

  const handleRemoveCollaborator = (id: string) => {
      const updatedCollaborators = project.collaborators.filter(c => c.id !== id);
      onUpdateProject({ ...project, collaborators: updatedCollaborators });
  };

  const renderTabContent = () => {
    switch(activeTab) {
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
                            {categoryFiles(['draft', 'document']).map(file => (
                                <div key={file.id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="w-4 h-4 text-blue-500 shrink-0" /> 
                                        <span className="font-medium text-slate-700">{file.name}</span>
                                        <span className="text-xs text-slate-400 border border-slate-200 px-1 rounded">Manual</span>
                                    </div>
                                    <button onClick={() => handleDeleteFile(file.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                     {/* Code & Data */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3">Code & Data</h3>
                        <DriveLinkManager category="code" project={project} onUpdateProject={onUpdateProject} />
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {project.categoryDriveUrls?.code && <SyncedDriveFiles driveUrl={project.categoryDriveUrls.code} />}
                             {/* Manual Files */}
                             {categoryFiles(['code', 'data']).map(file => (
                                <div key={file.id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group">
                                    <div className="flex items-center gap-2 text-sm">
                                        {getFileIcon(file.type)} 
                                        <span className="font-medium text-slate-700">{file.name}</span>
                                        <span className="text-xs text-slate-400 border border-slate-200 px-1 rounded">Manual</span>
                                    </div>
                                    <button onClick={() => handleDeleteFile(file.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Other Assets */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3">Other Assets</h3>
                        <DriveLinkManager category="assets" project={project} onUpdateProject={onUpdateProject} />
                         <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {project.categoryDriveUrls?.assets && <SyncedDriveFiles driveUrl={project.categoryDriveUrls.assets} />}
                            {/* Manual Files */}
                            {categoryFiles(['slide', 'other']).map(file => (
                                <div key={file.id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group">
                                    <div className="flex items-center gap-2 text-sm">
                                        {getFileIcon(file.type)} 
                                        <span className="font-medium text-slate-700">{file.name}</span>
                                        <span className="text-xs text-slate-400 border border-slate-200 px-1 rounded">Manual</span>
                                    </div>
                                    <button onClick={() => handleDeleteFile(file.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'notes':
             return (
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                        {(project.notes || []).map(note => (
                            <div key={note.id} className={`p-4 rounded-lg shadow-sm group relative flex flex-col h-52 ${
                                note.color === 'yellow' ? 'bg-yellow-100' : 'bg-sky-100'
                            }`}>
                                <textarea 
                                    value={note.content} 
                                    onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                                    className="bg-transparent resize-none outline-none text-sm w-full flex-1"
                                />
                                <div className="text-xs text-slate-400 mt-2">{new Date(note.createdAt).toLocaleDateString()}</div>
                                <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-black/5 rounded">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {!isGuestView && (
                            <button onClick={handleAddNote} className="h-52 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                                <Plus className="w-6 h-6" />
                                <span className="mt-1 text-sm font-medium">Add Note</span>
                            </button>
                        )}
                    </div>
                </div>
            );
        case 'activity':
            return (
                <div className="p-6 max-w-3xl mx-auto">
                    <ul className="space-y-4">
                        {(project.activity || []).map(act => (
                            <li key={act.id} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                                    {(project.collaborators.find(c => c.id === act.authorId)?.initials) || '?'}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-700">{act.message}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(act.timestamp).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        case 'settings':
            return <ProjectSettingsTab project={project} onUpdateProject={onUpdateProject} onDeleteProject={onDeleteProject} isGuestView={isGuestView} existingTags={existingTags} />;
        default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 animate-in fade-in duration-500">
      {selectedTask && <TaskDetailModal task={selectedTask} project={project} currentUser={currentUser} onClose={() => setSelectedTask(null)} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onSendNotification={(message, type='success') => setShowNotification({message, type})} />}
      {addingTaskTo && <AddTaskModal status={addingTaskTo} project={project} onClose={() => setAddingTaskTo(null)} onSave={handleAddTask} />}
      {showCollaboratorModal && (
          <ManageCollaboratorsModal 
            collaborators={project.collaborators} 
            currentUser={currentUser}
            onClose={() => setShowCollaboratorModal(false)}
            onAdd={handleAddCollaborator}
            onRemove={handleRemoveCollaborator}
          />
      )}
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
                        onClick={() => setShowCollaboratorModal(true)} 
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Manage Collaborators"
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
        <TabButton isActive={activeTab === 'board'} onClick={() => setActiveTab('board')} icon={LayoutDashboard}>Board</TabButton>
        <TabButton isActive={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={FolderOpen}>Files</TabButton>
        <TabButton isActive={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={AlignLeft}>Notes</TabButton>
        <TabButton isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={Activity}>Activity</TabButton>
        {!isGuestView && (
            <TabButton isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings}>Settings</TabButton>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};


// --- SETTINGS TAB COMPONENT ---
interface ProjectSettingsTabProps {
    project: Project;
    onUpdateProject: (p: Project) => void;
    onDeleteProject: (id: string) => void;
    isGuestView?: boolean;
    existingTags?: string[];
}
const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({ project, onUpdateProject, onDeleteProject, isGuestView, existingTags=[] }) => {
    const [status, setStatus] = useState(project.status);
    const [description, setDescription] = useState(project.description);
    const [progress, setProgress] = useState(project.progress);
    const [driveUrl, setDriveUrl] = useState(project.driveFolderUrl || '');
    const [tags, setTags] = useState(project.tags || []);
    const [tagInput, setTagInput] = useState('');

    const handleSaveChanges = () => {
        onUpdateProject({ ...project, status, description, progress, driveFolderUrl: driveUrl, tags });
        alert("Settings saved!");
    };
    
    const handleDelete = () => {
        if(window.prompt(`This will permanently delete the project "${project.title}". This cannot be undone. Type the project title to confirm.`) === project.title) {
            onDeleteProject(project.id);
        }
    };
    
    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    if (isGuestView) return <div className="p-6 text-center text-slate-500">Settings are not available in Guest View.</div>;

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-8 animate-in fade-in">
            {/* General Settings */}
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">General Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className="w-full border rounded-md p-2 bg-white">
                            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Goal / Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-md p-2 h-24" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Progress: {progress}%</label>
                        <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full"/>
                    </div>
                </div>
            </div>

            {/* Integration Settings */}
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Integrations</h3>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Main Google Drive Folder</label>
                    <input type="text" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} className="w-full border rounded-md p-2" placeholder="https://drive.google.com/drive/folders/..." />
                </div>
            </div>
            
            {/* Tags/Topics */}
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5" /> Topics & Tags
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map(tag => (
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
                    className="w-full border rounded-md p-2" 
                    placeholder="Add a tag and press Enter"
                    list="existing-tags-datalist"
                />
                <datalist id="existing-tags-datalist">
                    {existingTags.filter(t => !tags.includes(t)).map(tag => <option key={tag} value={tag} />)}
                </datalist>
            </div>


            <div className="flex justify-end pt-4">
                <button onClick={handleSaveChanges} className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800">
                    Save Changes
                </button>
            </div>
            
            {/* Danger Zone */}
            <div className="mt-12 pt-6 border-t border-red-200">
                <h3 className="font-semibold text-lg text-red-700 mb-2">Danger Zone</h3>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex justify-between items-center">
                    <div>
                        <p className="font-medium text-red-900">Delete this project</p>
                        <p className="text-sm text-red-700">Once deleted, it's gone forever. Please be certain.</p>
                    </div>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700">
                        Delete Project
                    </button>
                </div>
            </div>
        </div>
    );
};