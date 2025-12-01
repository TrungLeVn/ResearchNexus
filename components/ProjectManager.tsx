
import React, { useState } from 'react';
import { Project, Collaborator, ProjectStatus, FileSection } from '../types';
import { ChevronLeft, Plus, Users, X, Briefcase, GraduationCap, Eye, PenTool, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProjectManagerProps {
  projects: Project[];
  currentUser: Collaborator;
  onSelectProject: (project: Project) => void;
  onAddProject?: (project: Project) => void;
  title?: string;
  isGuestView?: boolean;
  projectCategory?: 'research' | 'admin';
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  currentUser,
  onSelectProject,
  onAddProject,
  title = 'Research Projects',
  isGuestView = false,
  projectCategory = 'research',
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [descriptionMode, setDescriptionMode] = useState<'write' | 'preview'>('write');
  
  // New state for tags
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleCreateProject = () => {
     if (!newTitle.trim() || !onAddProject) return;
     
     const isAdmin = projectCategory === 'admin';
     // Initialize default sections immediately to avoid migration logic overwriting later
     const defaultSections: FileSection[] = [
        { id: 'sec_1', name: isAdmin ? 'Official Documents' : 'Drafts & Papers', driveUrl: '' },
        { id: 'sec_2', name: isAdmin ? 'Financial Documents' : 'Code & Data', driveUrl: '' },
        { id: 'sec_3', name: isAdmin ? 'Assets' : 'Other Assets', driveUrl: '' }
     ];

     const newProject: Project = { 
        id: `proj_${Date.now()}`,
        title: newTitle, 
        description: newDescription, 
        status: newStatus,
        progress: 0, 
        tags: newTags, // Add tags to new project
        papers: [], files: [], notes: [],
        collaborators: [currentUser], tasks: [],
        category: projectCategory as 'research' | 'admin',
        fileSections: defaultSections, // Initialize with correct sections
    };
    onAddProject(newProject);
    
    // Reset all fields
    setNewTitle('');
    setNewDescription('');
    setNewStatus(ProjectStatus.PLANNING);
    setDescriptionMode('write');
    setNewTags([]);
    setTagInput('');
    setShowCreateModal(false);
  };
  
  // Tag handling logic
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          const tagToAdd = tagInput.trim();
          if (!newTags.includes(tagToAdd)) {
              setNewTags([...newTags, tagToAdd]);
          }
          setTagInput('');
      }
  };

  const removeTag = (tagToRemove: string) => {
      setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto relative animate-in fade-in duration-500">
      
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {projectCategory === 'admin' ? <Briefcase className="w-5 h-5 text-indigo-600"/> : <GraduationCap className="w-5 h-5 text-indigo-600"/>}
                        New {projectCategory === 'admin' ? 'Admin' : 'Research'} Project
                    </h3>
                    <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Title <span className="text-red-500">*</span></label>
                        <input 
                            autoFocus
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Neural Architecture Search v2"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Initial Status</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                        >
                            {Object.values(ProjectStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Description / Goal</label>
                            <div className="flex bg-slate-100 rounded-lg p-0.5">
                                <button 
                                    onClick={() => setDescriptionMode('write')}
                                    className={`px-2 py-0.5 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${descriptionMode === 'write' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <PenTool className="w-3 h-3" /> Write
                                </button>
                                <button 
                                    onClick={() => setDescriptionMode('preview')}
                                    className={`px-2 py-0.5 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${descriptionMode === 'preview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Eye className="w-3 h-3" /> Preview
                                </button>
                            </div>
                        </div>
                        
                        {descriptionMode === 'write' ? (
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none font-mono"
                                placeholder="Describe the objectives of this project... (Markdown supported)"
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                            />
                        ) : (
                            <div className="w-full border border-slate-200 bg-slate-50 rounded-lg p-3 text-sm min-h-[120px] max-h-[200px] overflow-y-auto prose prose-sm max-w-none">
                                {newDescription ? <ReactMarkdown>{newDescription}</ReactMarkdown> : <span className="text-slate-400 italic">No description to preview.</span>}
                            </div>
                        )}
                    </div>

                    {/* NEW TAGS INPUT */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Topics / Tags</label>
                        <div className="flex flex-wrap items-center gap-2 p-2 border border-slate-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-indigo-500">
                            {newTags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium animate-in fade-in zoom-in-95">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-pink-900"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                            <input 
                                className="flex-1 bg-transparent outline-none text-sm min-w-[120px]"
                                placeholder="Add a tag..."
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 pl-1">Press Enter to add a tag.</p>
                    </div>

                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                    <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleCreateProject}
                        disabled={!newTitle.trim()}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                        Create Project
                    </button>
                </div>
            </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {onAddProject && !isGuestView && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer">
            <h3 className="font-bold text-lg text-slate-800">{project.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2 mt-2 h-10">{project.description || "No description provided."}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    project.status === ProjectStatus.ACTIVE ? 'bg-emerald-100 text-emerald-700' :
                    project.status === ProjectStatus.COMPLETED ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-100 text-slate-600'
                }`}>{project.status}</span>
                 <div className="flex items-center -space-x-2">
                    {project.collaborators.slice(0, 3).map(c => (
                        <div key={c.id} title={c.name} className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] border-2 border-white">
                            {c.initials}
                        </div>
                    ))}
                    {project.collaborators.length > 3 && <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600 text-[10px] border-2 border-white">+{project.collaborators.length-3}</div>}
                </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <div className="p-4 bg-slate-50 rounded-full mb-3">
                    {projectCategory === 'admin' ? <Briefcase className="w-8 h-8 opacity-50" /> : <GraduationCap className="w-8 h-8 opacity-50" />}
                </div>
                <p className="text-sm font-medium">No projects yet.</p>
                <button onClick={() => setShowCreateModal(true)} className="mt-2 text-indigo-600 hover:underline text-sm">Create your first project</button>
            </div>
        )}
      </div>
    </div>
  );
};

export { ProjectManager };
