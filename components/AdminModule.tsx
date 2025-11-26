
import React, { useState } from 'react';
import { Project, MeetingNote, AcademicYearDoc } from '../types';
import { ProjectManager } from './ProjectManager';
import { MOCK_MEETINGS } from '../constants';
import { Briefcase, Folder, Plus, Users, FileText, Download, Search, Link as LinkIcon, ExternalLink } from 'lucide-react';

interface AdminModuleProps {
    adminProjects: Project[];
    currentUser?: any;
    onUpdateProject: (p: Project) => void;
    onSelectProject: (p: Project | null) => void;
    selectedProject: Project | null;
    onDeleteProject?: (id: string) => void;
    onAddProject?: (p: Project) => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
    adminProjects,
    currentUser,
    onUpdateProject,
    onSelectProject,
    selectedProject,
    onDeleteProject,
    onAddProject
}) => {
    const [adminSubTab, setAdminSubTab] = useState<'meetings' | 'projects' | 'docs'>('meetings');
    const [meetings] = useState<MeetingNote[]>(MOCK_MEETINGS);
    
    // Document State
    const [docs, setDocs] = useState<AcademicYearDoc[]>([
        { id: '1', name: 'Faculty Handbook', year: '2023-2024', type: 'pdf', url: 'https://drive.google.com', category: 'Regulation' },
        { id: '2', name: 'Research Grant Forms', year: '2023-2024', type: 'doc', url: 'https://drive.google.com', category: 'Form' }
    ]);
    const [searchDocQuery, setSearchDocQuery] = useState('');
    const [isAddingDoc, setIsAddingDoc] = useState(false);
    const [newDocData, setNewDocData] = useState({ name: '', url: '', year: '2023-2024', category: 'Report' });

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
        setNewDocData({ name: '', url: '', year: '2023-2024', category: 'Report' });
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

    // Get unique years for grouping
    const years = Array.from(new Set(docs.map(d => d.year))).sort().reverse();
    if (!years.includes('2023-2024')) years.unshift('2023-2024');

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {meetings.map(meeting => (
                            <div key={meeting.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800">{meeting.title}</h3>
                                    <span className="text-xs text-slate-400">{meeting.date}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {meeting.tags.map(t => (
                                        <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{t}</span>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded mb-3">
                                    {meeting.content}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Users className="w-3 h-3" />
                                    <span>{meeting.attendees.length} attendees</span>
                                </div>
                            </div>
                        ))}
                        <button className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[150px]">
                            <Plus className="w-8 h-8 mb-2" />
                            <span className="text-sm font-medium">Log New Meeting</span>
                        </button>
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
                            <button 
                                onClick={() => setIsAddingDoc(!isAddingDoc)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                            >
                                <Plus className="w-4 h-4" /> Add Document
                            </button>
                        </div>

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
                                        <option value="2024-2025">2024-2025</option>
                                        <option value="2023-2024">2023-2024</option>
                                        <option value="2022-2023">2022-2023</option>
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

                        {years.map(year => {
                            const yearDocs = docs.filter(d => 
                                d.year === year && 
                                d.name.toLowerCase().includes(searchDocQuery.toLowerCase())
                            );
                            
                            if (yearDocs.length === 0 && searchDocQuery) return null;

                            return (
                                <div key={year}>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Folder className="w-4 h-4" /> Academic Year {year}
                                    </h3>
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                        {yearDocs.length === 0 ? (
                                            <div className="p-4 text-xs text-slate-400 italic">No documents in this period.</div>
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
