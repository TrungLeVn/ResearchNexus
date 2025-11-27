import React, { useState } from 'react';
import { Project, Collaborator, Task, TaskStatus, ProjectStatus, StickyNote, Paper, ProjectFile } from '../types';
import { ChevronLeft, Plus, Users, Bot, ClipboardList, Book, File as FileIcon, StickyNote as NoteIcon, Trash2, Share2, X, Copy, Check, Mail, Maximize2, ExternalLink } from 'lucide-react';
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
    onMove: (taskId: string, newStatus: TaskStatus) => void;
    onDelete: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onMove, onDelete }) => {
    return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-slate-800 line-clamp-2">{task.title}</p>
                <button 
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-all" 
                    onClick={() => onDelete(task.id)}
                    title="Delete Task"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <span>Due: {task.dueDate}</span>
            </div>
            <div className="flex gap-1 mt-3">
                {task.status !== 'todo' && (
                    <button 
                        onClick={() => onMove(task.id, 'todo')} 
                        className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                        To Do
                    </button>
                )}
                {task.status !== 'in_progress' && (
                    <button 
                        onClick={() => onMove(task.id, 'in_progress')} 
                        className="text-[10px] px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                    >
                        In Progress
                    </button>
                )}
                {task.status !== 'done' && (
                    <button 
                        onClick={() => onMove(task.id, 'done')} 
                        className="text-[10px] px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                    >
                        Done
                    </button>
                )}
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
    
    // State for new Papers/Files forms
    const [showAddPaper, setShowAddPaper] = useState(false);
    const [newPaper, setNewPaper] = useState({ title: '', authors: '', year: new Date().getFullYear(), url: '' });
    const [showAddFile, setShowAddFile] = useState(false);
    const [newFile, setNewFile] = useState({ name: '', type: 'draft' as 'draft' | 'code' | 'data' | 'other', url: '' });

    // State for Sticky Notes Board
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

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
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
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

    const handleAddFile = () => {
        if(!newFile.name || !newFile.url) return;
        const file: ProjectFile = {
            id: `file_${Date.now()}`,
            ...newFile,
            lastModified: new Date().toISOString().split('T')[0]
        };
        onUpdateProject({...project, files: [...project.files, file]});
        setNewFile({ name: '', type: 'draft', url: '' });
        setShowAddFile(false);
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
                                    <button onClick={() => handleAddTask(status)} className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-600" title="Add Task"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                    {project.tasks.filter(t => t.status === status).map(task => (
                                        <TaskCard key={task.id} task={task} onMove={handleMoveTask} onDelete={handleDeleteTask} />
                                    ))}
                                    {project.tasks.filter(t => t.status === status).length === 0 && <div className="text-center py-8 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-lg">No tasks</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'files':
                 return (
                    <div className="p-6 space-y-6">
                        {/* Papers Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium flex items-center gap-2 text-slate-800"><Book className="w-4 h-4 text-indigo-600"/> Papers</h4>
                                <button onClick={() => setShowAddPaper(!showAddPaper)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Paper</button>
                            </div>
                            {showAddPaper && <div className="p-3 mb-3 bg-indigo-50 rounded-lg border border-indigo-100 grid grid-cols-2 gap-2 text-sm">
                                <input placeholder="Title" value={newPaper.title} onChange={e => setNewPaper({...newPaper, title: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <input placeholder="Authors" value={newPaper.authors} onChange={e => setNewPaper({...newPaper, authors: e.target.value})} className="p-2 rounded border"/>
                                <input type="number" placeholder="Year" value={newPaper.year} onChange={e => setNewPaper({...newPaper, year: parseInt(e.target.value)})} className="p-2 rounded border"/>
                                <input placeholder="URL" value={newPaper.url} onChange={e => setNewPaper({...newPaper, url: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <div className="col-span-2 flex gap-2"><button onClick={handleAddPaper} className="bg-indigo-600 text-white px-3 py-1 rounded">Save</button><button onClick={() => setShowAddPaper(false)} className="bg-slate-200 px-3 py-1 rounded">Cancel</button></div>
                            </div>}
                            <div className="space-y-2">
                                {project.papers.map(p => (<div key={p.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                                    <div><a href={p.url} target="_blank" rel="noreferrer" className="font-medium hover:text-indigo-600">{p.title}</a><p className="text-xs text-slate-500">{p.authors} ({p.year})</p></div>
                                    <button onClick={() => handleDeletePaper(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>))}
                                {project.papers.length === 0 && !showAddPaper && <p className="text-xs text-slate-400 italic text-center py-4">No papers linked.</p>}
                            </div>
                        </div>
                        {/* Files Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium flex items-center gap-2 text-slate-800"><FileIcon className="w-4 h-4 text-blue-600"/> Files</h4>
                                <button onClick={() => setShowAddFile(!showAddFile)} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add File</button>
                            </div>
                            {showAddFile && <div className="p-3 mb-3 bg-blue-50 rounded-lg border border-blue-100 grid grid-cols-2 gap-2 text-sm">
                                <input placeholder="File Name" value={newFile.name} onChange={e => setNewFile({...newFile, name: e.target.value})} className="p-2 rounded border col-span-2"/>
                                <select value={newFile.type} onChange={e => setNewFile({...newFile, type: e.target.value as any})} className="p-2 rounded border"><option>draft</option><option>code</option><option>data</option><option>other</option></select>
                                <input placeholder="URL (e.g. Google Drive)" value={newFile.url} onChange={e => setNewFile({...newFile, url: e.target.value})} className="p-2 rounded border"/>
                                <div className="col-span-2 flex gap-2"><button onClick={handleAddFile} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button><button onClick={() => setShowAddFile(false)} className="bg-slate-200 px-3 py-1 rounded">Cancel</button></div>
                            </div>}
                            <div className="space-y-2">
                                {project.files.map(f => (<div key={f.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                                    <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:text-blue-600 flex items-center gap-2"><ExternalLink className="w-3 h-3"/> {f.name}</a>
                                    <div className="flex items-center gap-2"><span className="text-[10px] uppercase text-slate-500">{f.type}</span><button onClick={() => handleDeleteFile(f.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                                </div>))}
                                {project.files.length === 0 && !showAddFile && <p className="text-xs text-slate-400 italic text-center py-4">No files linked.</p>}
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