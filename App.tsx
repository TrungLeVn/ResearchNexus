import React, { useState, useEffect } from 'react';
import { ViewState, Project, Idea, Reminder, Collaborator, ProjectStatus } from './types';
import { MOCK_USERS } from './constants';
import { Dashboard } from './components/Dashboard';
import { ProjectManager } from './components/ProjectManager';
import { IdeaLab } from './components/IdeaLab';
import { AIChat } from './components/AIChat';
import { LoginScreen } from './components/LoginScreen';
import { SettingsPage } from './components/SettingsPage';
import { LayoutDashboard, FolderKanban, Lightbulb, MessageSquareText, Beaker, Settings, LogOut, CloudOff } from 'lucide-react';
import { 
  getDb, 
  subscribeToProjects, 
  subscribeToIdeas, 
  subscribeToReminders, 
  saveProject, 
  deleteProject, 
  saveIdea, 
  deleteIdea, 
  saveReminder, 
  deleteReminder 
} from './services/firebase';

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const initialPid = params.get('pid');

  // User Session (Keep local for simplicity in this version)
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(() => {
    if (initialPid) return null;
    const saved = localStorage.getItem('rn_user');
    return saved ? JSON.parse(saved) : MOCK_USERS[0];
  });
  
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Data State (Managed by Firebase)
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dbConnected, setDbConnected] = useState(true);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(initialPid);

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    if (!getDb()) {
      setDbConnected(false);
      return;
    }

    const unsubProjects = subscribeToProjects((data) => {
      setProjects(data);
      // Update selected project if it exists in the new data to keep it fresh
      if (selectedProject) {
        const fresh = data.find(p => p.id === selectedProject.id);
        if (fresh) setSelectedProject(fresh);
      }
    });

    const unsubIdeas = subscribeToIdeas(setIdeas);
    const unsubReminders = subscribeToReminders(setReminders);

    return () => {
      unsubProjects();
      unsubIdeas();
      unsubReminders();
    };
  }, [selectedProject?.id]); // Re-bind if needed, but mainly we just want the fresh data logic inside

  // Persist User Session
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Guest') {
      localStorage.setItem('rn_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
      if (initialPid) {
          setInviteProjectId(initialPid);
      }
  }, [initialPid]);

  const handleLogin = (user: Collaborator) => {
      setCurrentUser(user);
      if (inviteProjectId && user.role === 'Guest') {
          const invitedProject = projects.find(p => p.id === inviteProjectId);
          if (invitedProject) {
              setSelectedProject(invitedProject);
              setCurrentView(ViewState.PROJECTS);
          }
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('rn_user');
      window.location.href = window.location.origin;
  };

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} inviteProjectId={inviteProjectId} />;
  }

  // Filter Data
  const visibleProjects = currentUser.role === 'Guest' 
      ? projects.filter(p => p.id === inviteProjectId) 
      : projects; // Owner sees all

  const visibleReminders = reminders.filter(reminder => {
    if (reminder.projectId) {
      return visibleProjects.some(p => p.id === reminder.projectId);
    }
    return currentUser.role === 'Owner'; 
  });

  // --- CRUD HANDLERS (Now calling Firebase) ---

  const handleUpdateProject = (updatedProject: Project) => {
    saveProject(updatedProject);
    // Optimistic update for smoother UI (optional, but good)
    if (selectedProject?.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
  };

  const handleAddProject = (newProject: Project) => {
      saveProject(newProject);
  };

  const handleDeleteProject = (projectId: string) => {
      if (window.confirm("Are you sure you want to delete this project?")) {
          deleteProject(projectId);
          if (selectedProject?.id === projectId) setSelectedProject(null);
      }
  };

  const handleArchiveProject = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
          saveProject({ ...project, status: ProjectStatus.ARCHIVED });
      }
  };

  const handleUpdateIdea = (updatedIdea: Idea) => {
      saveIdea(updatedIdea);
  };

  const handleDeleteIdea = (id: string) => {
      deleteIdea(id);
  };

  const handleAddIdea = (newIdea: Idea) => {
      saveIdea(newIdea);
  };

  const handleAddReminder = (newReminder: Reminder) => {
      saveReminder(newReminder);
  };

  const handleToggleReminder = (id: string) => {
      const r = reminders.find(rem => rem.id === id);
      if (r) {
          saveReminder({ ...r, completed: !r.completed });
      }
  };

  const handleDeleteReminder = (id: string) => {
      deleteReminder(id);
  };

  const handleUpdateUser = (updatedUser: Collaborator) => {
      setCurrentUser(prev => prev ? ({ ...prev, ...updatedUser }) : null);
  }

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
            <Dashboard 
                projects={visibleProjects} 
                reminders={visibleReminders}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
            />
        );
      case ViewState.PROJECTS:
        return (
          <ProjectManager 
            projects={visibleProjects} 
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onArchiveProject={handleArchiveProject}
            onAddProject={handleAddProject}
          />
        );
      case ViewState.IDEAS:
        return (
            <IdeaLab 
                ideas={ideas} 
                onAddIdea={handleAddIdea} 
                onUpdateIdea={handleUpdateIdea} 
                onDeleteIdea={handleDeleteIdea}
            />
        );
      case ViewState.CHAT:
        return (
            <div className="p-6 h-full flex flex-col justify-center">
                <AIChat project={null} />
            </div>
        );
      case ViewState.SETTINGS:
        return (
            <SettingsPage 
                currentUser={currentUser} 
                onUpdateUser={handleUpdateUser} 
            />
        );
      default:
        return (
            <Dashboard 
                projects={visibleProjects} 
                reminders={visibleReminders}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
            />
        );
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (view !== ViewState.PROJECTS) setSelectedProject(null);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Nexus AI</h1>
            <p className="text-xs text-slate-400 font-medium">Research Suite</p>
          </div>
        </div>

        {!dbConnected && (
            <div className="px-4 mb-2">
                <div 
                    className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex flex-col gap-1 cursor-help group"
                    title="Please Redeploy in Vercel after setting Environment Variables"
                >
                    <div className="flex items-center gap-2 font-bold">
                        <CloudOff className="w-4 h-4" />
                        <span>Disconnected</span>
                    </div>
                    <p className="opacity-80">Check Vercel Config & Redeploy</p>
                </div>
            </div>
        )}

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {currentUser.role !== 'Guest' && <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />}
          <NavItem view={ViewState.PROJECTS} icon={FolderKanban} label="Projects" />
          {currentUser.role !== 'Guest' && <NavItem view={ViewState.IDEAS} icon={Lightbulb} label="Idea Lab" />}
          <NavItem view={ViewState.CHAT} icon={MessageSquareText} label="AI Assistant" />
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2 relative">
            <button 
                onClick={() => {
                    setCurrentView(ViewState.SETTINGS);
                    setSelectedProject(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentView === ViewState.SETTINGS ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
            </button>
            
            <div className="pt-2 border-t border-slate-50 mt-2">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        currentUser.role === 'Guest' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                        {currentUser.initials}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-xs text-slate-400 truncate">{currentUser.role === 'Guest' ? 'Guest Access' : currentUser.email}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">{currentUser.role === 'Guest' ? 'Exit Guest Mode' : 'Refresh App'}</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;