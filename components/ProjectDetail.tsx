import React, { useState, useRef, useEffect } from 'react';
import { Project, Collaborator, Task, TaskStatus, TaskPriority, TaskComment, ProjectStatus, ProjectFile, ProjectActivity, Paper, StickyNote } from '../types';
import { 
    ChevronLeft, Plus, Users, Bot, ClipboardList, File as FileIcon, 
    Trash2, Share2, X, Copy, Check, Mail, ExternalLink, Flame, ArrowUp, ArrowDown, Calendar, Send, MessageCircle, 
    Pencil, Database, Layers, LayoutDashboard, Activity, ChevronDown, Sparkles, Loader2, FileText, AtSign,
    BookOpen, StickyNote as NoteIcon, Download, Code, FileCode, FileImage, Archive, Grid
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
                            <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                            <input type="date" value={editedTask.dueDate} onChange={e => setEditedTask({...editedTask, dueDate: e.target.value})} className="w-full mt-1 p-2 border rounded-md text-sm"/>
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
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="text-xs font-semibold text-slate-500 mb-1">Assignees</label>
                            <button onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)} className="w-full p-2 border rounded-md text-sm bg-white text-left h-10 flex items-center justify-between">
                                <span className="truncate">{assigneeIds.length ? `${assigneeIds.length} selected` : 'Unassigned'}</span>
                                <ChevronDown className="w-4 h-4"/>
                            </button>
                            {assigneeDropdownOpen && (
                                <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                    {collaborators.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                                            <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={assigneeIds.includes(c.id)} onChange={() => {
                                                setAssigneeIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])
                                            }}/> {c.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                             <label className="text-xs font-semibold text-slate-500 mb-1">Due Date</label>
                             <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md text-sm"/>
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
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 group relative hover:shadow-md transition-all">
        <div className={`p-2 rounded-lg ${
            file.type === 'code' ? 'bg-slate-800 text-white' : 
            file.type === 'data' ? 'bg-emerald-100 text-emerald-600' :
            'bg-indigo-50 text-indigo-600'
        }`}>
            {file.type === 'code' ? <Code className="w-4 h-4" /> : 
             file.type === 'data' ? <Database className="w-4 h-4" /> :
             <FileText className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</p>
            <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-indigo-600 truncate block">Open Link</a>
        </div>
        <button onClick={() => onDelete(file.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
);

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, currentUser, onUpdateProject, onBack, onDeleteProject, isGuestView = false }) => {
    const [tasks, setTasks] = useState<Task[]>(project.tasks);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [addingTaskStatus, setAddingTaskStatus] = useState<TaskStatus | null>(null);
    const [notificationMsg, setNotificationMsg] = useState('');
    
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

    // Derived Metrics
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    
    const pieData = [
        { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#0ea5e9' },
        { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
        { name: 'Done', value: tasks.filter(t => t.status === 'done').length, color: '#10b981' }
    ].filter(d => d.value > 0);

    // --- RENDER FUNCTIONS ---

    const renderDashboard = () => (
        <div className="p-6 h-full overflow-y-auto animate-in fade-in duration-300">
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
                     <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                         <div className="h-full bg-indigo-600 rounded-full" style={{width: `${progress}%`}}></div>
                     </div>
                 </div>

                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div>
                             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks</p>
                             <h3 className="text-2xl font-bold text-slate-800 mt-1">{completedTasks} <span className="text-sm font-normal text-slate-400">/ {tasks.length}</span></h3>
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

                 {/* Upcoming Deadlines */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Calendar className="w-5 h-5 text-rose-500" />
                         Upcoming Deadlines
                     </h3>
                     <div className="space-y-4">
                         {tasks
                            .filter(t => t.status !== 'done')
                            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                            .slice(0, 5)
                            .map(t => (
                                <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className={`w-1 h-8 rounded-full ${t.priority === 'high' ? 'bg-rose-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-slate-800 line-clamp-1">{t.title}</h4>
                                        <p className="text-xs text-slate-500">{new Date(t.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{statusMap[t.status]}</span>
                                </div>
                            ))
                         }
                         {tasks.filter(t => t.status !== 'done').length === 0 && (
                             <p className="text-sm text-slate-400 text-center py-4">No pending tasks.</p>
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
                <div key={status} className="w-80 flex flex-col h-full flex-shrink-0">
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
                    <div className="flex-1 bg-slate-100/50 rounded-xl p-3 border border-slate-200 overflow-y-auto space-y-3">
                        {tasks.filter(t => t.status === status).map(task => (
                            <TaskCard key={task.id} task={task} project={project} onClick={() => setEditingTask(task)} />
                        ))}
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
    );

    const renderFiles = () => {
        const handleAddFile = (type: ProjectFile['type'] = 'document') => {
            const name = prompt("File Name:");
            if (!name) return;
            const url = prompt("File URL:");
            if (!url) return;

            const newFile: ProjectFile = {
                id: `file-${Date.now()}`,
                name, url, type,
                lastModified: new Date().toISOString()
            };
            onUpdateProject({ ...project, files: [...project.files, newFile] });
        };

        const deleteFile = (id: string) => {
            if(confirm("Delete file?")) {
                onUpdateProject({ ...project, files: project.files.filter(f => f.id !== id) });
            }
        };

        // Categorize Files
        const drafts = project.files.filter(f => ['draft', 'document', 'slide'].includes(f.type));
        const codeData = project.files.filter(f => ['code', 'data'].includes(f.type));
        const otherAssets = project.files.filter(f => !['draft', 'document', 'slide', 'code', 'data'].includes(f.type));

        return (
            <div className="p-6 h-full overflow-y-auto space-y-8">
                {/* Section 1: Drafts & Papers */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" /> Drafts & Papers
                         </h3>
                         <button onClick={() => handleAddFile('draft')} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                             <Plus className="w-3 h-3" /> Add Draft
                         </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drafts.length > 0 ? drafts.map(f => <FileCard key={f.id} file={f} onDelete={deleteFile} />) : <p className="text-sm text-slate-400 italic">No drafts uploaded.</p>}
                    </div>
                </div>

                {/* Section 2: Code & Data */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Code className="w-5 h-5 text-emerald-600" /> Code & Data
                         </h3>
                         <button onClick={() => handleAddFile('code')} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                             <Plus className="w-3 h-3" /> Add Code/Data
                         </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {codeData.length > 0 ? codeData.map(f => <FileCard key={f.id} file={f} onDelete={deleteFile} />) : <p className="text-sm text-slate-400 italic">No code or data assets.</p>}
                    </div>
                </div>

                {/* Section 3: Other Assets */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Archive className="w-5 h-5 text-amber-500" /> Other Assets
                         </h3>
                         <button onClick={() => handleAddFile('other')} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                             <Plus className="w-3 h-3" /> Add Asset
                         </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherAssets.length > 0 ? otherAssets.map(f => <FileCard key={f.id} file={f} onDelete={deleteFile} />) : <p className="text-sm text-slate-400 italic">No other assets.</p>}
                    </div>
                </div>
            </div>
        );
    };

    const renderTeam = () => {
        const handleInvite = () => {
             const name = prompt("Name:");
             const email = prompt("Email:");
             if(name && email) {
                 const newCollab: Collaborator = {
                     id: `c-${Date.now()}`,
                     name, email, role: 'Editor', initials: name.substring(0,2).toUpperCase()
                 };
                 onUpdateProject({ ...project, collaborators: [...project.collaborators, newCollab] });
             }
        }
        
        return (
            <div className="p-6 h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Project Team</h2>
                        <button onClick={handleInvite} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            <Plus className="w-4 h-4" /> Invite Member
                        </button>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Member</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                                    <th className="py-3 px-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {project.collaborators.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 group">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{c.initials}</div>
                                                <span className="font-medium text-slate-800">{c.name} {c.id === currentUser.id && '(You)'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{c.role}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-500">{c.email}</td>
                                        <td className="py-3 px-4 text-right">
                                            {c.id !== currentUser.id && (
                                                <button 
                                                    onClick={() => { if(confirm("Remove member?")) onUpdateProject({...project, collaborators: project.collaborators.filter(mem => mem.id !== c.id)}) }}
                                                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            {editingTask && <TaskDetailModal task={editingTask} project={project} currentUser={currentUser} onClose={() => setEditingTask(null)} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onSendNotification={showNotification} />}
            {addingTaskStatus && <AddTaskModal status={addingTaskStatus} project={project} onClose={() => setAddingTaskStatus(null)} onSave={handleAddTask} />}
            
            {/* Notification Toast */}
            {notificationMsg && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-bottom-2 z-50">
                    <Mail className="w-4 h-4" />
                    {notificationMsg}
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 pt-4 flex flex-col gap-4 shadow-sm z-10 sticky top-0">
                <div className="flex justify-between items-center">
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
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-6">
                     <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                        {activeTab === 'dashboard' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                     </button>
                     <button 
                        onClick={() => setActiveTab('tasks')}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'tasks' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ClipboardList className="w-4 h-4" /> Tasks
                        {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                     </button>
                     <button 
                        onClick={() => setActiveTab('files')}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'files' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileIcon className="w-4 h-4" /> Files
                        {activeTab === 'files' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                     </button>
                     <button 
                        onClick={() => setActiveTab('team')}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'team' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="w-4 h-4" /> Team
                        {activeTab === 'team' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                     </button>
                     <button 
                        onClick={() => setActiveTab('ai')}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'ai' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Bot className="w-4 h-4" /> AI Assistant
                        {activeTab === 'ai' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                     </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'tasks' && renderTasks()}
                    {activeTab === 'files' && renderFiles()}
                    {activeTab === 'team' && renderTeam()}
                    {activeTab === 'ai' && (
                        <div className="h-full p-6">
                            <AIChat project={project} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};