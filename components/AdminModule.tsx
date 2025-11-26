
import React, { useState } from 'react';
import { Project, MeetingNote, AcademicYearDoc, Reminder } from '../types';
import { ProjectManager } from './ProjectManager';
import { MOCK_MEETINGS } from '../constants';
import { Briefcase, Folder, Plus, FileText, Search, ExternalLink, Calendar, Tag, FolderPlus, Sparkles, Loader2 } from 'lucide-react';
import { suggestAdminPlan } from '../services/gemini';

interface AdminModuleProps {
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
    adminProjects,
    currentUser,
    onUpdateProject,
    onSelectProject,
    selectedProject,
    onDeleteProject,
    onAddProject,
    onAddReminder
}) => {
    const [adminSubTab, setAdminSubTab] = useState<'meetings' | 'projects' | 'docs'>('meetings');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    // Meeting State
    const [meetings, setMeetings] = useState<MeetingNote[]>(MOCK_MEETINGS);
    const [searchMeetingQuery, setSearchMeetingQuery] = useState('');
    const [isAddingMeeting, setIsAddingMeeting] = useState(false);
    const [newMeetingData, setNewMeetingData] = useState({ title: '', date: new Date().toISOString().split('T')[0], url: '', tags: '' });

    // Document State
    const [docs, setDocs] = useState<AcademicYearDoc[]>([
        { id: '1', name: 'Faculty Handbook', year: '2023-2024', type: 'pdf', url: 'https://drive.google.com', category: 'Regulation' },
        { id: '2', name: 'Research Grant Forms', year: '2023-2024', type: 'doc', url: 'https://drive.google.com', category: 'Form' }
    ]);
    const [availableYears, setAvailableYears] = useState<string[]>(['2023-2024', '2022-2023']);
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
        setDocs([...docs, newDoc]);
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

    const handleAddMeeting = () => {
        if (!newMeetingData.title) return;
        const newMeeting: MeetingNote = {
            id: Date.now().toString(),
            title: newMeetingData.title,
            date: newMeetingData.date,
            attendees: [], 
            content: newMeetingData.url, 
            tags: newMeetingData.tags.split(',').map(t => t.trim()).filter(Boolean)
        };
        setMeetings([newMeeting, ...meetings]);
        setIsAddingMeeting(false);
        setNewMeetingData({ title: '', date: new Date().toISOString().split('T')[0], url: '', tags: '' });
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
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    // If an admin project is selected and we are in projects tab, show the project manager view
    if (selectedProject && adminSubTab === 'projects') {
        return (
            <ProjectManager 
                projects={adminProjects}
                selectedProject={selectedProject}
                currentUser={currentUser}
                onSelectProject={(p) => !p ? onSelectProject(null) : onSelectProject(p)}
                onUpdateProject={onUpdateProject}
                onDeleteProject={onDeleteProject}
                onAddProject={onAddProject}
                title="Admin Projects"
            />
        );
    }

    // Filter meetings
    const filteredMeetings = meetings.filter(m => 
        m.title.toLowerCase().includes(searchMeetingQuery.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(searchMeetingQuery.toLowerCase()))
    );

    // Get years including empty ones created manually
    const allYears = Array.from(new Set([...availableYears, ...docs.map(d => d.year)])).sort().reverse();

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500">
             <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-indigo-600" />
                        Administrative Hub
                    </h1>
                    <p className="text-slate-500">Manage department projects, meetings, and official documents.</p>
                </div>
                <button 
                    onClick={handleSmartPlan}
                    disabled={isGeneratingPlan}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity shadow-sm"
                >
                    {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Gemini Smart Plan</span>
                </button>
            </header>

            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                <button 
                    onClick={() => setAdminSubTab('meetings')}
                    className={`pb-2 text-sm font-medium transition-colors ${adminSubTab === 'meetings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Meeting Notes
                </button>
                <button 
                    onClick={() => setAdminSubTab('projects')}
                    className={`pb-2 text-sm font-medium transition-colors ${adminSubTab === 'projects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Admin Projects
                </button>
                <button 
                    onClick={() => setAdminSubTab('docs')}
                    className={`pb-2 text-sm font-medium transition-colors ${adminSubTab === 'docs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Academic Docs
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {adminSubTab === 'projects' && (
                    <ProjectManager 
                        projects={adminProjects}
                        selectedProject={null} // Force list view initially
                        currentUser={currentUser}
                        onSelectProject={(p) => !p ? onSelectProject(null) : onSelectProject(p)}
                        onUpdateProject={onUpdateProject}
                        onDeleteProject={onDeleteProject}
                        onAddProject={onAddProject}
                        title="Admin Projects"
                    />
                )}

                {adminSubTab === 'meetings' && (
                    <div className="space-y-6">
                        {/* Meeting Search & Add */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search meetings..." 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={searchMeetingQuery}
                                    onChange={(e) => setSearchMeetingQuery(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => setIsAddingMeeting(!isAddingMeeting)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                            >
                                <Plus className="w-4 h-4" /> Log Meeting
                            </button>
                        </div>

                         {/* Add Meeting Form */}
                         {isAddingMeeting && (
                            <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-semibold text-slate-700 mb-4">Log New Meeting</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Meeting Title</label>
                                        <input 
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                            value={newMeetingData.title}
                                            onChange={e => setNewMeetingData({...newMeetingData, title: e.target.value})}
                                            placeholder="e.g. Department Sync"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                        <input 
                                            type="date"
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                            value={newMeetingData.date}
                                            onChange={e => setNewMeetingData({...newMeetingData, date: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Google Docs Link</label>
                                        <input 
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                            value={newMeetingData.url}
                                            onChange={e => setNewMeetingData({...newMeetingData, url: e.target.value})}
                                            placeholder="https://docs.google.com/..."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Tags (comma separated)</label>
                                        <input 
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                            value={newMeetingData.tags}
                                            onChange={e => setNewMeetingData({...newMeetingData, tags: e.target.value})}
                                            placeholder="HR, Budget, Planning"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsAddingMeeting(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">Cancel</button>
                                    <button onClick={handleAddMeeting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Save Log</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMeetings.map(meeting => (
                                <a 
                                    key={meeting.id} 
                                    href={meeting.content.startsWith('http') ? meeting.content : '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                            <Calendar className="w-3 h-3" />
                                            {meeting.date}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-1">{meeting.title}</h3>
                                    
                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        {meeting.tags.map(t => (
                                            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider rounded-md border border-slate-200">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex items-center gap-1 text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open in Google Docs <ExternalLink className="w-3 h-3" />
                                    </div>
                                </a>
                            ))}
                             {filteredMeetings.length === 0 && (
                                <div className="col-span-full text-center py-12 text-slate-400">
                                    <p>No meeting notes found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {adminSubTab === 'docs' && (
                    <div className="space-y-6">
                        {/* Search and Add Header */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search documents..." 
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
                                    <Plus className="w-4 h-4" /> Add Document
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

                        {/* Add Doc Form */}
                        {isAddingDoc && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-indigo-200 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Add New Document Link</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <input 
                                        placeholder="Document Name"
                                        className="w-full px-3 py-2 text-sm border rounded-lg"
                                        value={newDocData.name}
                                        onChange={e => setNewDocData({...newDocData, name: e.target.value})}
                                    />
                                    <input 
                                        placeholder="URL (Drive Link)"
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
                                        <option value="Report">Report</option>
                                        <option value="Regulation">Regulation</option>
                                        <option value="Form">Form</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddDoc} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save Link</button>
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
                                <div key={year}>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Folder className="w-4 h-4" /> Academic Year {year}
                                    </h3>
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                        {yearDocs.length === 0 ? (
                                            <div className="p-6 text-center">
                                                <p className="text-xs text-slate-400 italic mb-2">No documents in this folder.</p>
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
                                            <a 
                                                key={doc.id} 
                                                href={doc.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block p-3 flex items-center justify-between hover:bg-indigo-50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 group-hover:bg-white rounded text-slate-500 group-hover:text-indigo-600 transition-colors">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700">{doc.name}</p>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 group-hover:bg-white rounded text-slate-500 uppercase">{doc.category}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 text-slate-400 group-hover:text-indigo-600">
                                                    <ExternalLink className="w-4 h-4" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
