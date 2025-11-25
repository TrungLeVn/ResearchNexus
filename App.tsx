
import React, { useState, useEffect } from 'react';
import { ViewState, Project, Idea, Reminder, Collaborator } from './types';
import { MOCK_PROJECTS, MOCK_IDEAS, MOCK_REMINDERS, MOCK_USERS } from './constants';
import { Dashboard } from './components/Dashboard';
import { ProjectManager } from './components/ProjectManager';
import { IdeaLab } from './components/IdeaLab';
import { AIChat } from './components/AIChat';
import { LoginScreen } from './components/LoginScreen';
import { LayoutDashboard, FolderKanban, Lightbulb, MessageSquareText, Beaker, Settings, LogOut } from 'lucide-react';

const App: React.FC = () => {
  // Check URL params immediately for initialization
  const params = new URLSearchParams(window.location.search);
  const initialPid = params.get('pid');

  // AUTO-LOGIN LOGIC:
  // If there is NO invite link (initialPid is null), default to MOCK_USERS[0] (The Owner).
  // If there IS an invite link, start as null to show the Guest Login Screen.
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(
      initialPid ? null : MOCK_USERS[0]
  );
  
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [ideas, setIdeas] = useState<Idea[]>(MOCK_IDEAS);
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(initialPid);

  useEffect(() => {
      // If we are in "Invite Mode", ensure we set the project ID
      if (initialPid) {
          setInviteProjectId(initialPid);
      }
  }, [initialPid]);

  // Authentication Handler
  const handleLogin = (user: Collaborator) => {
      setCurrentUser(user);
      
      // If invited, auto-select the project and switch view
      if (inviteProjectId && user.role === 'Guest') {
          const invitedProject = projects.find(p => p.id === inviteProjectId);
          if (invitedProject) {
              setSelectedProject(invitedProject);
              setCurrentView(ViewState.PROJECTS);
              // Add guest to project collaborators locally for this session
              setProjects(prev => prev.map(p => 
                  p.id === inviteProjectId 
                  ? { ...p, collaborators: [...p.collaborators, user] }
                  : p
              ));
          }
      }
  };

  const handleLogout = () => {
      // Resetting to base state means reloading the app to the root
      // This effectively "logs in" the owner again if they go to root, 
      // or resets the guest flow if they are on a link.
      window.location.href = window.location.origin;
  };

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} inviteProjectId={inviteProjectId} />;
  }

  // Filter Data based on Current User Access
  const visibleProjects = currentUser.role === 'Guest' 
      ? projects.filter(p => p.id === inviteProjectId) 
      : projects.filter(project => project.collaborators.some(c => c.id === currentUser.id));

  const visibleReminders = reminders.filter(reminder => {
    if (reminder.projectId) {
      return visibleProjects.some(p => p.id === reminder.projectId);
    }
    return currentUser.role === 'Owner'; 
  });

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (selectedProject?.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
  };

  const handleUpdateIdea = (updatedIdea: Idea) => {
      setIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
  };

  const handleDeleteIdea = (id: string) => {
      setIdeas(prev => prev.filter(i => i.id !== id));
  }

  const handleAddIdea = (newIdea: Idea) => {
      setIdeas(prev => [newIdea, ...prev]);
  };

  const handleAddReminder = (newReminder: Reminder) => {
      setReminders(prev => [...prev, newReminder].sort((a, b) => a.date.getTime() - b.date.getTime()));
  };

  const handleToggleReminder = (id: string) => {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
            <Dashboard 
                projects={visibleProjects} 
                reminders={visibleReminders}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
            />
        );
      case ViewState.PROJECTS:
        return (
          <ProjectManager 
            projects={visibleProjects} 
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            onUpdateProject={handleUpdateProject}
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
      default:
        return (
            <Dashboard 
                projects={visibleProjects} 
                reminders={visibleReminders}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
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

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {currentUser.role !== 'Guest' && <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />}
          <NavItem view={ViewState.PROJECTS} icon={FolderKanban} label="Projects" />
          {currentUser.role !== 'Guest' && <NavItem view={ViewState.IDEAS} icon={Lightbulb} label="Idea Lab" />}
          <NavItem view={ViewState.CHAT} icon={MessageSquareText} label="AI Assistant" />
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2 relative">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
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
                {/* 
                  Log out actually just redirects to home. 
                  If user is Guest, this takes them out of guest mode. 
                  If user is Owner, it basically refreshes the page (keeping them logged in).
                */}
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
