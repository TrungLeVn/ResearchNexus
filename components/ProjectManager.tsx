import React, { useState } from 'react';
import { Project, Collaborator, ProjectStatus } from '../types';
import { ChevronLeft, Plus, Users } from 'lucide-react';

interface ProjectManagerProps {
  projects: Project[];
  selectedProject: Project | null;
  currentUser: Collaborator;
  onSelectProject: (project: Project | null) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onArchiveProject?: (id: string) => void;
  onAddProject?: (project: Project) => void;
  title?: string;
  isGuestView?: boolean; // New prop
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  selectedProject,
  currentUser,
  onSelectProject,
  onUpdateProject,
  onDeleteProject,
  onArchiveProject,
  onAddProject,
  title = 'Research Projects',
  isGuestView = false,
}) => {
  if (selectedProject) {
    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <header className="flex items-center mb-6">
          {!isGuestView && (
            <button 
              onClick={() => onSelectProject(null)} 
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium p-2 rounded-lg hover:bg-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
              All Projects
            </button>
          )}
        </header>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex-1">
          <h2 className="text-2xl font-bold text-slate-800">{selectedProject.title}</h2>
          <p className="text-slate-600 mt-2">{selectedProject.description}</p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Team</h3>
            <div className="flex items-center -space-x-2 mt-2">
              {selectedProject.collaborators.map(c => (
                <div key={c.id} title={c.name} className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border-2 border-white">
                  {c.initials}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-sm text-slate-500 italic">
            (A complete project detail view with tabs for dashboard, tasks, files, etc. would be rendered here.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {onAddProject && !isGuestView && (
          <button onClick={() => {
            const newTitle = prompt("New project title:");
            if (newTitle) {
                const newProject: Project = { 
                    id: `proj_${Date.now()}`,
                    title: newTitle, description: "", status: ProjectStatus.PLANNING,
                    progress: 0, tags: [], papers: [], files: [], notes: '',
                    collaborators: [currentUser], tasks: [],
                };
                onAddProject(newProject);
            }
          }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer">
            <h3 className="font-bold text-lg text-slate-800">{project.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2 mt-2 h-10">{project.description}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{project.status}</span>
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
      </div>
    </div>
  );
};

export { ProjectManager };
