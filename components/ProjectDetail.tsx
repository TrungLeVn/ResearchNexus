import React, { useState, useRef, useEffect } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, ProjectFile, ProjectActivity } from '../types';
import { 
    ChevronLeft, Plus, Users, Bot, ClipboardList, File as FileIcon, 
    Trash2, Share2, X, Copy, Check, Mail, ExternalLink, Flame, ArrowUp, ArrowDown, Calendar, Send, MessageCircle, 
    Pencil, Database, Layers, LayoutDashboard, Activity, ChevronDown, Sparkles, Loader2, FileText, AtSign
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { AIChat } from './AIChat';
import { generateProjectBriefing } from '../services/gemini';
import { sendEmailNotification } from '../services/email';

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
    const assignees = (project.collaborators || []).filter(c => task.assigneeIds?.includes(c.id));

    const priorityIcons: Record<TaskPriority, React.ReactNode> = {
        high: <span title="High Priority"><Flame className="w-3.5 h-3.5 text-red-500"/></span>,
        medium: <span title="Medium Priority"><ArrowUp className="w-3.5 h-3.5 text-amber-500"/></span>,
        low: <span title="Low Priority"><ArrowDown className="w-3.5 h-3.5 text-green-500"/></span>,
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
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    
    // Mention State
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const commentInputRef = useRef<HTMLInputElement>(null);
    
    const collaborators = project.collaborators || [];
    const assignees = collaborators.filter(c => editedTask.assigneeIds?.includes(c.id));

    const handleAssigneeToggle = (collaboratorId: string) => {
        const currentIds = editedTask.assigneeIds || [];
        const newIds = currentIds.includes(collaboratorId)
            ? currentIds.filter(id => id !== collaboratorId)
            : [...currentIds, collaboratorId];
        setEditedTask({ ...editedTask, assigneeIds: newIds });
    };

    const handleSave = () => {
        // Detect new assignees to send notification
        const oldIds = task.assigneeIds || [];
        const newIds = editedTask.assigneeIds || [];
        const addedIds = newIds.filter(id => !oldIds.includes(id));

        if (addedIds.length > 0) {
            addedIds.forEach(id => {
                const user = collaborators.find(c => c.id === id);
                if (user && user.id !== currentUser.id) { // Don't notify self
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

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            onDeleteTask(task.id);
            onClose();
        }
    };

    // --- MENTION LOGIC ---
    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewComment(value);

        // Detect if typing @
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
        words.pop(); // Remove the partial @mention
        const newValue = `${words.join(' ')} @${collaborator.name} `;
        setNewComment(newValue);
        setShowMentionList(false);
        commentInputRef.current?.focus();
    };

    const filteredCollaborators = collaborators.filter(c => 
        c.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );

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
        
        // --- CHECK MENTIONS & SEND EMAILS ---
        collaborators.forEach(c => {
            // Check if user is mentioned in the comment text (e.g., "@Name")
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
                                            <div className="bg-slate-100 p-2 rounded-lg rounded-tl-none relative group/comment">
                                                <p className="text-xs font-semibold">{c.authorName}</p>
                                                {/* Highlight mentions in blue */}
                                                <p className="text-sm text-slate-700">
                                                    {c.text.split(' ').map((word, i) => 
                                                        word.startsWith('@') ? <span key={i} className="text-indigo-600 font-medium">{word} </span> : word + ' '
                                                    )}
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
                                        {filteredCollaborators.length > 0 ? filteredCollaborators.map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => handleSelectMention(c)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold">{c.initials}</div>
                                                {c.name}
                                            </button>
                                        )) : (
                                            <div className="px-3 py-2 text-xs text-slate-400 italic">No matching members</div>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input 
                                        ref={commentInputRef}
                                        value={newComment} 
                                        onChange={handleCommentChange} 
                                        onKeyDown={e => e.key === 'Enter' && handleAddComment()} 
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm" 
                                        placeholder="Add a comment... Type @ to mention"
                                    />
                                    <button onClick={handleAddComment} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Send className="w-4 h-4"/></button>
                                </div>
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
                            <label className="text-xs font-bold text-slate-400 uppercase">Assignees</label>
                            <div className="relative">
                                <button onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)} className="w-full mt-1 p-2 border rounded-md text-sm bg-white text-left flex justify-between items-center h-10">
                                    {assignees.length > 0 ? (
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            {assignees.map(a => (
                                                <div key={a.id} title={a.name} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold shrink-0">{a.initials}</div>
                                            ))}
                                            <span className="truncate text-xs">{assignees.map(a => a.name).join(', ')}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">Unassigned</span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${assigneeDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {assigneeDropdownOpen && (
                                    <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                        {collaborators.map(c => (
                                            <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                    checked={editedTask.assigneeIds?.includes(c.id) || false}
                                                    onChange={() => handleAssigneeToggle(c.id)}
                                                />
                                                {c.name}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
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
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    
    const collaborators = project.collaborators || [];
    const selectedAssignees = collaborators.filter(c => assigneeIds.includes(c.id));

    const handleAssigneeToggle = (collaboratorId: string) => {
        const newIds = assigneeIds.includes(collaboratorId)
            ? assigneeIds.filter(id => id !== collaboratorId)
            : [...assigneeIds, collaboratorId];
        setAssigneeIds(newIds);
    };

    const handleSave = () => {
        if (!title.trim()) return;
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title,
            status,
            priority,
            dueDate,
            assigneeIds,
            comments: [],
            description: ''
        };
        
        // Notify assignees for new task
        if (assigneeIds.length > 0) {
            assigneeIds.forEach(id => {
                const user = collaborators.find(c => c.id === id);
                if (user) {
                     const taskLink = `${window.location.origin}?pid=${project.id}&tid=${newTask.id}`;
                     sendEmailNotification(
                        user.email,
                        user.name,
                        `New Task: ${title}`,
                        `You have been assigned to a new task in <strong>${project.title}</strong>.`,
                        taskLink
                    );
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="relative col-span-1 sm:col-span-3">
                            <label className="text-xs font-semibold text-slate-500 mb-1">Assignees</label>
                            <button onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)} className="w-full p-2 border rounded-md text-sm bg-white text-left flex justify-between items-center h-10">
                                {selectedAssignees.length > 0 ? (
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        {selectedAssignees.map(a => (
                                            <div key={a.id} title={a.name} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold shrink-0">{a.initials}</div>
                                        ))}
                                        <span className="truncate text-xs">{selectedAssignees.map(a => a.name).join(', ')}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400">Unassigned</span>
                                )}
                                <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${assigneeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {assigneeDropdownOpen && (
                                <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                    {collaborators.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                                            <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={assigneeIds.includes(c.id)} onChange={() => handleAssigneeToggle(c.id)}/>
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                             <label className="text-xs font-semibold text-slate-500 mb-1">Due Date</label>
                             <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md text-sm"/>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1">Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-2 border rounded-md text-sm bg-white h-10"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
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

interface ShareModalProps {
    project: Project;
    currentUser: Collaborator;
    onClose: () => void;
    onAddCollaborator: (c: Collaborator) => void;
    onRemoveCollaborator: (collaboratorId: string) => void;
    onUpdateCollaboratorRole: (collaboratorId: string, newRole: 'Editor' | 'Viewer') => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ project, currentUser, onClose, onAddCollaborator, onRemoveCollaborator, onUpdateCollaboratorRole }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'Editor' | 'Viewer'>('Editor');
    const [copied, setCopied] = useState(false);

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}?pid=${project.id}` : '';
    const collaborators = project.collaborators || [];

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
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="text-xs font-medium">{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            Anyone with this link can view this project as a guest.
                        </p>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Add Collaborator</label>
                        <div className="space-y-3">
                            <input 
                                placeholder="Full Name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2">
                                <input 
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <select 
                                    value={role}
                                    onChange={e => setRole(e.target.value as 'Editor' | 'Viewer')}
                                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none bg-white"
                                >
                                    <option value="Editor">Editor</option>
                                    <option value="Viewer">Viewer</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAdd}
                                disabled={!name || !email}
                                className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                Add Member
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Team Members</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {collaborators.map(c => (
                                <div key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                            {c.initials}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{c.name} {c.id === currentUser.id && '(You)'}</p>
                                            <p className="text-xs text-slate-500">{c.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">{c.role}</span>
                                        {c.role !== 'Owner' && c.id !== currentUser.id && (
                                            <button 
                                                onClick={() => onRemoveCollaborator(c.id)}
                                                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
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

// --- NOTIFY MODAL ---

interface NotifyModalProps {
    project: Project;
    currentUser: Collaborator;
    onClose: () => void;
}

const NotifyModal: React.FC<NotifyModalProps> = ({ project, currentUser, onClose }) => {
    const [recipientId, setRecipientId] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Filter out current user from recipients list
    const recipients = (project.collaborators || []).filter(c => c.id !== currentUser.id);

    const handleSend = async () => {
        if(!recipientId || !message) return;
        setLoading(true);
        const recipient = recipients.find(r => r.id === recipientId);
        if(recipient) {
             try {
                const success = await sendEmailNotification(
                    recipient.email,
                    recipient.name,
                    `Notification from ${currentUser.name}`,
                    message,
                    window.location.href
                );
                if(success) {
                    alert("Email sent successfully!");
                    onClose();
                } else {
                    alert("Failed to send email. Please check your network or API configuration.");
                }
             } catch(e) {
                 console.error(e);
                 alert("Error sending email.");
             }
        }
        setLoading(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-600" /> Notify Colleague
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Recipient</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={recipientId}
                            onChange={e => setRecipientId(e.target.value)}
                        >
                            <option value="">Select a colleague...</option>
                            {recipients.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                            ))}
                        </select>
                        {recipients.length === 0 && (
                            <p className="text-xs text-amber-500 mt-1">No other collaborators in this project.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Message</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm h-32 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                        <p className="text-xs text-slate-400 mt-1">A link to this project will be included automatically.</p>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                    <button 
                        onClick={handleSend} 
                        disabled={loading || !recipientId || !message}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send Email
                    </button>
                </div>
            </div>
        </div>
    )
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, currentUser, onUpdateProject, onBack, onDeleteProject, isGuestView = false }) => {
    const [tasks, setTasks] = useState<Task[]>(project.tasks);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [addingTaskStatus, setAddingTaskStatus] = useState<TaskStatus | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showBriefing, setShowBriefing] = useState(false);
    const [briefingContent, setBriefingContent] = useState<string>('');
    const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
    const [notificationMsg, setNotificationMsg] = useState('');

    useEffect(() => {
        setTasks(project.tasks);
    }, [project.tasks]);

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

    const handleAddCollaborator = (newCollaborator: Collaborator) => {
        const updatedProject = {
            ...project,
            collaborators: [...(project.collaborators || []), newCollaborator]
        };
        onUpdateProject(updatedProject);
    };

    const handleRemoveCollaborator = (collabId: string) => {
         const updatedProject = {
            ...project,
            collaborators: (project.collaborators || []).filter(c => c.id !== collabId)
        };
        onUpdateProject(updatedProject);
    };
    
    const handleUpdateCollaboratorRole = (collabId: string, newRole: 'Editor' | 'Viewer') => {
        const updatedProject = {
            ...project,
            collaborators: (project.collaborators || []).map(c => c.id === collabId ? { ...c, role: newRole } : c)
        };
        onUpdateProject(updatedProject);
    };

    // Deep linking logic for tasks
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tid = params.get('tid');
        if (tid && !editingTask) {
             const foundTask = tasks.find(t => t.id === tid);
             if (foundTask) {
                 setEditingTask(foundTask);
             }
        }
    }, [tasks]);

    const handleGenerateBriefing = async () => {
        setShowBriefing(true);
        setIsGeneratingBriefing(true);
        try {
            const briefing = await generateProjectBriefing(project);
            setBriefingContent(briefing);
        } catch (e) {
            setBriefingContent("Failed to generate briefing.");
        } finally {
            setIsGeneratingBriefing(false);
        }
    };

    const showNotification = (msg: string) => {
        setNotificationMsg(msg);
        setTimeout(() => setNotificationMsg(''), 3000);
    };

    // Derived Metrics
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    
    const pieData = [
        { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#0ea5e9' },
        { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
        { name: 'Done', value: tasks.filter(t => t.status === 'done').length, color: '#10b981' }
    ].filter(d => d.value > 0);

    return (
        <div className="h-full flex flex-col bg-slate-50 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            {editingTask && <TaskDetailModal task={editingTask} project={project} currentUser={currentUser} onClose={() => setEditingTask(null)} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onSendNotification={showNotification} />}
            {addingTaskStatus && <AddTaskModal status={addingTaskStatus} project={project} onClose={() => setAddingTaskStatus(null)} onSave={handleAddTask} />}
            {isShareModalOpen && <ShareModal project={project} currentUser={currentUser} onClose={() => setIsShareModalOpen(false)} onAddCollaborator={handleAddCollaborator} onRemoveCollaborator={handleRemoveCollaborator} onUpdateCollaboratorRole={handleUpdateCollaboratorRole} />}
            
            {/* New Notify Modal */}
            {isNotifyModalOpen && <NotifyModal project={project} currentUser={currentUser} onClose={() => setIsNotifyModalOpen(false)} />}
            
            {/* Notification Toast */}
            {notificationMsg && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-bottom-2 z-50">
                    <Mail className="w-4 h-4" />
                    {notificationMsg}
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    {!isGuestView && (
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-800">{project.title}</h1>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusClasses(project.status)}`}>
                                {project.status}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">{project.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center -space-x-2 mr-2">
                        {(project.collaborators || []).slice(0, 3).map(c => (
                            <div key={c.id} title={c.name} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-slate-600 text-xs">
                                {c.initials}
                            </div>
                        ))}
                        {(project.collaborators || []).length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center font-bold text-slate-500 text-xs">
                                +{(project.collaborators || []).length - 3}
                            </div>
                        )}
                    </div>
                    
                    {!isGuestView && (
                        <>
                             {/* AI Briefing Button */}
                             <button 
                                onClick={handleGenerateBriefing}
                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 rounded-lg text-sm hover:shadow-sm transition-all"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline">Daily Brief</span>
                            </button>

                             {/* AI Chat Toggle */}
                             <button 
                                onClick={() => setShowChat(!showChat)}
                                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all ${
                                    showChat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Bot className="w-4 h-4" />
                                <span className="hidden sm:inline">AI Chat</span>
                            </button>
                        </>
                    )}

                    {/* Notify Colleague Button (Manual) */}
                    <button
                        onClick={() => setIsNotifyModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                        title="Notify Colleague"
                    >
                        <Mail className="w-4 h-4" />
                        <span className="hidden sm:inline">Notify</span>
                    </button>

                    <button 
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                     {!isGuestView && (
                        <button 
                            onClick={() => { if(window.confirm('Delete project?')) onDeleteProject(project.id); }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Project"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Kanban Board */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    {/* Project Metrics / Briefing Area */}
                    {showBriefing && (
                         <div className="mb-6 bg-white p-6 rounded-xl border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-4 relative">
                            <button onClick={() => setShowBriefing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-amber-500" /> AI Project Briefing
                            </h3>
                            {isGeneratingBriefing ? (
                                <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing project data...
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-slate max-w-none">
                                    <ReactMarkdown>{briefingContent}</ReactMarkdown>
                                </div>
                            )}
                         </div>
                    )}
                    
                    {!showBriefing && (
                         <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Overall Progress</span>
                                <div className="flex items-end gap-2 mt-1">
                                    <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-16 h-16 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} innerRadius={15} outerRadius={25} paddingAngle={2} dataKey="value">
                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Task Stats</p>
                                    <p className="text-sm font-medium text-slate-700">{completedTasks} / {tasks.length} Completed</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Team Activity</span>
                                <div className="flex items-center gap-2 mt-2">
                                     <Activity className="w-5 h-5 text-emerald-500" />
                                     <span className="text-sm font-medium text-slate-700">Healthy</span>
                                </div>
                            </div>
                         </div>
                    )}

                    <div className="flex gap-6 h-full min-w-max pb-4">
                        {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                            <div key={status} className="w-80 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4 px-1">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        {status === 'todo' && <div className="w-2 h-2 rounded-full bg-sky-500"></div>}
                                        {status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                        {status === 'done' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                        {statusMap[status]} 
                                        <span className="text-slate-400 text-xs font-normal ml-1">({tasks.filter(t => t.status === status).length})</span>
                                    </h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => setAddingTaskStatus(status)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-slate-100/50 rounded-xl p-3 border border-slate-200 overflow-y-auto space-y-3">
                                    {tasks.filter(t => t.status === status).map(task => (
                                        <TaskCard key={task.id} task={task} project={project} onClick={() => setEditingTask(task)} />
                                    ))}
                                    {tasks.filter(t => t.status === status).length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                                            No tasks here
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setAddingTaskStatus(status)}
                                        className="w-full py-2 text-xs text-slate-500 hover:bg-slate-200 rounded-lg border border-transparent hover:border-slate-300 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Task
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar: Chat or Details */}
                {showChat && (
                    <div className="w-96 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-indigo-600" />
                                Project Assistant
                            </h3>
                            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                             <AIChat project={project} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
