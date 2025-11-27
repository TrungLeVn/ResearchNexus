import React, { useState } from 'react';
import { Project, Collaborator, Task, TaskStatus } from '../types';
import { ChevronLeft, Plus, Users, Bot, ClipboardList, Book, File, StickyNote, Trash2, Share2, X, Copy, Check, Mail } from 'lucide-react';
import { AIChat } from './AIChat';

interface ProjectDetailProps {
  project: Project;
  currentUser: Collaborator;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  onDeleteProject: (projectId: string) => void;
  isGuestView?: boolean;
}

const statusMap: { [key in TaskStatus]: string } = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done'
};

interface TaskCardProps {
    task: Task;
    onMove: (taskId: string, newStatus: TaskStatus) => void;
    onDelete: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onMove, onDelete }) => {
    return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-slate-800">{task.title}</p>
                <div className="relative">
                    <button className="opacity-0 group-hover:opacity-100" onClick={() => onDelete(task.id)}>
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                    </button>
                </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">Due: {task.dueDate}</div>
            <div className="flex gap-1 mt-3">
                {task.status !== 'todo' && <button onClick={() => onMove(task.id, 'todo')} className="text-[10px] px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200">To Do</button>}
                {task.status !== 'in_progress' && <button onClick={() => onMove(task.id, 'in_progress')} className="text-[10px] px-1 py-0.5 rounded bg-blue-100 hover:bg-blue-200">In Progress</button>}
                {task.status !== 'done' && <button onClick={() => onMove(task.id, 'done')} className="text-[10px] px-1 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200">Done</button>}
            </div>
        </div>
    );
};

interface ShareModalProps {
    project: Project;
    onClose: () => void;
    onAddCollaborator: (c: Collaborator) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ project, onClose, onAddCollaborator }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'Editor' | 'Viewer'>('Editor');
    const [copied, setCopied] = useState(false);

    const inviteLink = `${window.location.origin}?pid=${project.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Invite Link Section */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Invite via Link</label>
                        <div className="flex gap-2">
                            <input 
                                readOnly
                                value={inviteLink}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 select-all outline-none"
                            />
                            <button 
                                onClick={handleCopy}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                title="Copy Link"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Anyone with this link can request to join as a Guest.</p>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Add Collaborator Section */}
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
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
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

                    {/* Current Team List Preview */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Current Access</label>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                            {project.collaborators.map(c => (
                                <div key={c.id} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {c.initials}
                                        </div>
                                        <span className="text-slate-700">{c.name}</span>
                                    </div>
                                    <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{c.role}</span>
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
    const [notes, setNotes] = useState(project.notes);
    const [showShareModal, setShowShareModal] = useState(false);

    const handleUpdateTasks = (updatedTasks: Task[]) => {
        onUpdateProject({ ...project, tasks: updatedTasks });
    };

    const handleAddTask = (status: TaskStatus) => {
        const title = prompt(`New task title for "${statusMap[status]}":`);
        if (title) {
            const newTask: Task = {
                id: `task_${Date.now()}`,
                title,
                status,
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // 1 week from now
            };
            handleUpdateTasks([...project.tasks, newTask]);
        }
    };
    
    const handleMoveTask = (taskId: string, newStatus: TaskStatus) => {
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        handleUpdateTasks(updatedTasks);
    };

    const handleDeleteTask = (taskId: string) => {
        if (window.confirm("Delete this task?")) {
            const updatedTasks = project.tasks.filter(t => t.id !== taskId);
            handleUpdateTasks(updatedTasks);
        }
    };

    const handleSaveNotes = () => {
        onUpdateProject({ ...project, notes });
        alert("Notes saved!");
    };

    const handleAddCollaborator = (newCollab: Collaborator) => {
        const updatedCollaborators = [...project.collaborators, newCollab];
        onUpdateProject({ ...project, collaborators: updatedCollaborators });
    };

    const handleDeleteProjectConfirm = () => {
        if (window.confirm(`Are you sure you want to delete "${project.title}"? This action cannot be undone.`)) {
            onDeleteProject(project.id);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'tasks':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                        {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                            <div key={status} className="bg-slate-100/70 rounded-xl p-4 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-slate-700">{statusMap[status]}</h3>
                                    <button onClick={() => handleAddTask(status)} className="p-1 text-slate-400 hover:text-slate-600">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3 overflow-y-auto flex-1">
                                    {project.tasks.filter(t => t.status === status).map(task => (
                                        <TaskCard key={task.id} task={task} onMove={handleMoveTask} onDelete={handleDeleteTask} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'files':
                 return (
                    <div className="p-6">
                        <h3 className="font-semibold text-slate-700 text-lg mb-4">Papers & Files</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2 flex items-center gap-2"><Book className="w-4 h-4"/> Papers</h4>
                                {project.papers.map(p => <div key={p.id} className="text-sm p-2 bg-white rounded border">{p.title}</div>)}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2 flex items-center gap-2"><File className="w-4 h-4"/> Files</h4>
                                {project.files.map(f => <div key={f.id} className="text-sm p-2 bg-white rounded border">{f.name}</div>)}
                            </div>
                        </div>
                    </div>
                 );
            case 'notes':
                 return (
                    <div className="p-6 flex flex-col h-full">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-slate-700 text-lg">Project Notes</h3>
                            <button onClick={handleSaveNotes} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">Save Notes</button>
                         </div>
                         <textarea 
                            className="flex-1 w-full border rounded-lg p-4 font-mono text-sm"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter your project notes in Markdown format..."
                         />
                    </div>
                 );
            case 'team':
                 return (
                    <div className="p-6">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-slate-700 text-lg">Collaborators</h3>
                            {!isGuestView && (
                                <button 
                                    onClick={() => setShowShareModal(true)} 
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100"
                                >
                                    <Plus className="w-4 h-4" /> Add Member
                                </button>
                            )}
                         </div>
                         <div className="space-y-2 max-w-md">
                             {project.collaborators.map(c => (
                                 <div key={c.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                                     <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">{c.initials}</div>
                                     <div>
                                         <p className="font-medium">{c.name}</p>
                                         <p className="text-xs text-slate-500">{c.email} - {c.role}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                 );
            case 'ai':
                return <div className="p-6 h-full"><AIChat project={project} /></div>;
        }
    };

    const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: React.ElementType, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-300 relative">
            {showShareModal && (
                <ShareModal 
                    project={project} 
                    onClose={() => setShowShareModal(false)} 
                    onAddCollaborator={handleAddCollaborator} 
                />
            )}

            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    {!isGuestView && (
                        <button
                            onClick={onBack}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{project.title}</h2>
                        <p className="text-sm text-slate-500">{project.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{project.status}</span>
                     <div className="flex items-center -space-x-2 mr-2">
                        {project.collaborators.map(c => (
                            <div key={c.id} title={c.name} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border-2 border-white">
                            {c.initials}
                            </div>
                        ))}
                    </div>
                    
                    {!isGuestView && (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button 
                                onClick={() => setShowShareModal(true)}
                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Share Project"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handleDeleteProjectConfirm}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Project"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar/Tabs */}
                <div className="w-56 bg-white border-r border-slate-100 p-4 flex flex-col gap-2">
                    <TabButton id="tasks" icon={ClipboardList} label="Tasks" />
                    <TabButton id="files" icon={Book} label="Papers & Files" />
                    <TabButton id="notes" icon={StickyNote} label="Notes" />
                    <TabButton id="team" icon={Users} label="Team" />
                    <TabButton id="ai" icon={Bot} label="AI Assistant" />
                </div>

                {/* Tab Panel */}
                <div className="flex-1 bg-slate-50 overflow-y-auto">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};