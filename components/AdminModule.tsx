
import React, { useState, useEffect } from 'react';
import { Project, AcademicYearDoc, Reminder, AdminViewState } from '../types';
import { ProjectManager } from './ProjectManager';
import { Briefcase, Folder, Plus, FileText, Search, ExternalLink, FolderPlus, Sparkles, Loader2, Trash2, Bot, X } from 'lucide-react';
import { suggestAdminPlan } from '../services/gemini';
import { subscribeToAdminDocs, saveAdminDoc, deleteAdminDoc } from '../services/firebase';
import { AIChat } from './AIChat';
import { ProjectDetail } from './ProjectDetail';

interface AdminModuleProps {
    activeView: AdminViewState;
    adminProjects: Project[];
    currentUser?: any;
    onUpdateProject: (p: Project) => void;
    onSelectProject: (p: Project | null) => void;
    selectedProject: Project | null;
    onDeleteProject?: (id: string) => void;
    onAddProject?: (p: Project) => void;
    onAddReminder?: (reminder: Reminder) => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
    activeView,
    adminProjects,
    currentUser,
    onUpdateProject,
    onSelectProject,
    selectedProject,
    onDeleteProject,
    onAddProject,
    onAddReminder
}) => {
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Document State from Firebase
    const [docs, setDocs] = useState<AcademicYearDoc[]>([]);
    
    // Subscribe
    useEffect(() => {
        const unsubscribe = subscribeToAdminDocs(setDocs);
        return () => unsubscribe();
    }, []);

    const [availableYears, setAvailableYears] = useState<string[]>(['2023-2024']);
    const [searchDocQuery, setSearchDocQuery] = useState('');
    const [isAddingDoc, setIsAddingDoc] = useState(false);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newDocData, setNewDocData] = useState({ name: '', url: '', year: '2023-2024', category: 'Report' });
    const [newFolderName, setNewFolderName] = useState('');

    const handleAddDoc = () => {
        if (!newDocData.name || !newDocData.url) return;
        const newDoc: AcademicYearDoc = {
            id: Date.now().toString(),
            name: newDocData.name,
            url: newDocData.url,
            year: newDocData.year,
            category: newDocData.category as any,
            type: 'doc'
        };
        saveAdminDoc(newDoc);
        setIsAddingDoc(false);
        setNewDocData({ name: '', url: '', year: availableYears[0] || '2023-2024', category: 'Report' });
    };

    const handleAddFolder = () => {
        if (!newFolderName.trim()) return;
        if (!availableYears.includes(newFolderName)) {
            setAvailableYears([newFolderName, ...availableYears]);
        }
        setNewFolderName('');
        setIsAddingFolder(false);
    };

    const handleDeleteFolder = (year: string) => {
        if (window.confirm(`Are you sure you want to hide folder "${year}"? This will hide documents associated with this year until they are reassigned.`)) {
            setAvailableYears(availableYears.filter(y => y !== year));
            // In a real app we might update all docs to a different year or delete them.
            // For now, just hiding the folder from the view state locally.
            // If docs exist in that year, they persist in DB but won't show if the year isn't in 'allYears' logic.
        }
    };

    const handleDeleteDoc = (id: string) => {
        if (window.confirm("Are you sure you want to remove this document/meeting link?")) {
            deleteAdminDoc(id);
        }
    };

    const handleSmartPlan = async () => {
        if (!onAddReminder) return;
        setIsGeneratingPlan(true);
        try {
            const suggestions = await suggestAdminPlan();
            suggestions.forEach((s, index) => {
                const reminder: Reminder = {
                    id: `admin-ai-${Date.now()}-${index}`,
                    title: `Admin: ${s.title}`,
                    date: new Date(Date.now() + s.daysFromNow * 86400000),
                    type: 'task',
                    completed: false
                };
                onAddReminder(reminder);
            });
            alert(`Added ${suggestions.length} admin tasks to your global reminders.`);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };
    
    // Get years including empty ones created manually or existing in docs
    const allYears = Array.from(new Set([...availableYears, ...docs.map(d => d.year)])).sort().reverse();

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 relative">
             <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-indigo-600" />
                        Administrative Hub
                    </h1>
                    <p className="text-slate-500">Manage department projects, meetings, and official documents.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm transition-all ${showChat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Bot className="w-4 h-4" />
                        <span>Admin AI</span>
                    </button>
                    <button 
                        onClick={handleSmartPlan}
                        disabled={isGeneratingPlan}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity shadow-sm"
                    >
                        {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Gemini Smart Plan</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto relative">
                {activeView === AdminViewState.PROJECTS && (
                    selectedProject ? (
                        <ProjectDetail
                            project={selectedProject}
                            currentUser={currentUser}
                            onUpdateProject={onUpdateProject}
                            onBack={() => onSelectProject(null)}
                            onDeleteProject={onDeleteProject!}
                            isGuestView={false}
                        />
                    ) : (
                        <ProjectManager
                            projects={adminProjects}
                            currentUser={currentUser}
                            onSelectProject={onSelectProject}
                            onAddProject={onAddProject}
                            title="Admin Projects"
                            projectCategory="admin"
                        />
                    )
                )}

                {activeView === AdminViewState.DOCS && (
                    <div className="space-y-6">
                        {/* Search and Add Header */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search docs & meetings..." 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={searchDocQuery}
                                    onChange={(e) => setSearchDocQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button 
                                    onClick={() => setIsAddingFolder(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <FolderPlus className="w-4 h-4" /> New Folder
                                </button>
                                <button 
                                    onClick={() => setIsAddingDoc(!isAddingDoc)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                                >
                                    <Plus className="w-4 h-4" /> Add Item
                                </button>
                            </div>
                        </div>

                         {/* Add Folder Modal/Inline */}
                         {isAddingFolder && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-indigo-200 animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
                                <Folder className="w-5 h-5 text-indigo-500" />
                                <input 
                                    autoFocus
                                    placeholder="Folder Name (e.g. 2025-2026)"
                                    className="flex-1 px-3 py-2 text-sm border rounded-lg"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                                />
                                <button onClick={handleAddFolder} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Create</button>
                                <button onClick={() => setIsAddingFolder(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm">Cancel</button>
                            </div>
                         )}

                        {/* Add Doc/Meeting Form */}
                        {isAddingDoc && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-indigo-200 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Add New Item</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <input 
                                        placeholder="Item Name / Meeting Title"
                                        className="w-full px-3 py-2 text-sm border rounded-lg"
                                        value={newDocData.name}
                                        onChange={e => setNewDocData({...newDocData, name: e.target.value})}
                                    />
                                    <input 
                                        placeholder="URL (Drive Link, Google Doc)"
                                        className="w-full px-3 py-2 text-sm border rounded-lg"
                                        value={newDocData.url}
                                        onChange={e => setNewDocData({...newDocData, url: e.target.value})}
                                    />
                                    <select 
                                        className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                                        value={newDocData.year}
                                        onChange={e => setNewDocData({...newDocData, year: e.target.value})}
                                    >
                                        {allYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <select 
                                        className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                                        value={newDocData.category}
                                        onChange={e => setNewDocData({...newDocData, category: e.target.value})}
                                    >
                                        <option value="Meeting">Meeting Note</option>
                                        <option value="Report">Report</option>
                                        <option value="Regulation">Regulation</option>
                                        <option value="Form">Form</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddDoc} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save</button>
                                    <button onClick={() => setIsAddingDoc(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm">Cancel</button>
                                </div>
                            </div>
                        )}

                        {allYears.map(year => {
                            const yearDocs = docs.filter(d => 
                                d.year === year && 
                                d.name.toLowerCase().includes(searchDocQuery.toLowerCase())
                            );
                            
                            if (searchDocQuery && yearDocs.length === 0) return null;

                            return (
                                <div key={year} className="group/folder">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Folder className="w-4 h-4" /> Academic Year {year}
                                        </h3>
                                        <button 
                                            onClick={() => handleDeleteFolder(year)}
                                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/folder:opacity-100 transition-opacity"
                                            title="Delete Folder"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                        {yearDocs.length === 0 ? (
                                            <div className="p-6 text-center">
                                                <p className="text-xs text-slate-400 italic mb-2">No items in this folder.</p>
                                                <button 
                                                    onClick={() => {
                                                        setNewDocData({...newDocData, year: year});
                                                        setIsAddingDoc(true);
                                                    }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    + Add to {year}
                                                </button>
                                            </div>
                                        ) : yearDocs.map(doc => (
                                            <div key={doc.id} className="relative group/doc">
                                                <a 
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block p-3 flex items-center justify-between hover:bg-indigo-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded transition-colors ${
                                                            doc.category === 'Meeting' 
                                                                ? 'bg-purple-100 text-purple-600 group-hover/doc:bg-purple-200' 
                                                                : 'bg-slate-100 text-slate-500 group-hover/doc:bg-white group-hover/doc:text-indigo-600'
                                                        }`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800 group-hover/doc:text-indigo-700">{doc.name}</p>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                                                                doc.category === 'Meeting' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500 group-hover/doc:bg-white'
                                                            }`}>{doc.category}</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 text-slate-400 group-hover/doc:text-indigo-600">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </div>
                                                </a>
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); handleDeleteDoc(doc.id); }}
                                                    className="absolute top-3 right-10 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/doc:opacity-100 transition-opacity"
                                                    title="Delete Item"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Chat Slide-Over */}
            {showChat && (
                <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-600" /> Admin Assistant
                        </h3>
                        <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AIChat moduleContext={{ type: 'admin', data: { docs, projects: adminProjects } }} />
                    </div>
                </div>
            )}
        </div>
    );
};
