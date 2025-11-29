
import React, { useState } from 'react';
import { Project, Collaborator, ProjectStatus } from '../types';
import { ChevronLeft, Plus, Users, X, Briefcase, GraduationCap } from 'lucide-react';

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

  const handleCreateProject = () => {
     if (!newTitle.trim() || !onAddProject) return;

     const newProject: Project = { 
        id: `proj_${Date.now()}`,
        title: newTitle, 
        description: newDescription, 
        status: newStatus,
        progress: 0, tags: [], papers: [], files: [], notes: [],
        collaborators: [currentUser], tasks: [],
        category: projectCategory as 'research' | 'admin',
    };
    onAddProject(newProject);
    
    // Reset
    setNewTitle('');
    setNewDescription('');
    setNewStatus(ProjectStatus.PLANNING);
    setShowCreateModal(false);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto relative animate-in fade-in duration-500">
      
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {projectCategory === 'admin' ? <Briefcase className="w-5 h-5 text-indigo-600"/> : <GraduationCap className="w-5 h-5 text-indigo-600"/>}
                        New {projectCategory === 'admin' ? 'Admin' : 'Research'} Project
                    </h3>
                    <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4">
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
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description / Goal</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none"
                            placeholder="Briefly describe the objectives of this project..."
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                        />
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
