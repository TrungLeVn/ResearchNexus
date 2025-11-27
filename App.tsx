import React, { useState, useEffect } from 'react';
import { ViewState, Project, Idea, Reminder, Collaborator, ProjectStatus, AppModule, AdminViewState, SystemSettings } from './types';
import { MOCK_USERS } from './constants';
import { Dashboard } from './components/Dashboard';
import { ProjectManager } from './components/ProjectManager';
import { ProjectDetail } from './components/ProjectDetail'; // Import new component
import { IdeaLab } from './components/IdeaLab';
import { AIChat } from './components/AIChat';
import { LoginScreen } from './components/LoginScreen';
import { SettingsPage } from './components/SettingsPage';
import { JournalModule } from './components/JournalModule';
import { TeachingModule } from './components/TeachingModule';
import { AdminModule } from './components/AdminModule';
import { PersonalModule } from './components/PersonalModule';
import { 
  getDb, 
  subscribeToProjects, 
  subscribeToIdeas, 
  subscribeToReminders, 
  subscribeToSystemSettings,
  saveProject, 
  deleteProject, 
  saveIdea, 
  deleteIdea, 
  saveReminder, 
  deleteReminder,
  saveSystemSettings
} from './services/firebase';
import { 
  GraduationCap, 
  CloudOff, 
  Beaker, 
  BookOpen, 
  Target, 
  Calendar, 
  Settings, 
  LogOut,
  Briefcase,
  Lock,
  KeyRound,
  ArrowRight,
  Bot,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const initialPid = params.get('pid');

  // --- GLOBAL SETTINGS STATE (Firebase) ---
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
      id: 'global_config',
      adminCode: '141089',
      ownerProfile: MOCK_USERS[0]
  });

  // --- SECURITY LOCK STATE ---
  // Default to Locked if code is not empty, but we wait for Firebase to confirm the code
  const [isLocked, setIsLocked] = useState(true);
  const [inputCode, setInputCode] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  // User Session
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(() => {
    // Only use localStorage for temporary session persistence during refresh, 
    // but source of truth is Firebase for profile data
    if (initialPid) return null;
    const saved = localStorage.getItem('rn_user');
    return saved ? JSON.parse(saved) : null; 
  });
  
  // Navigation State
  const [activeModule, setActiveModule] = useState<AppModule>(AppModule.RESEARCH);
  const [currentResearchView, setCurrentResearchView] = useState<ViewState>(ViewState.DASHBOARD);
  const [currentAdminView, setCurrentAdminView] = useState<AdminViewState>(AdminViewState.DOCS);
  
  // Data State (Managed by Firebase)
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dbConnected, setDbConnected] = useState(true);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(initialPid);

  useEffect(() => {
    if (!getDb()) {
      setDbConnected(false);
      return;
    }

    const unsubProjects = subscribeToProjects((data) => {
      setProjects(data);
      if (selectedProject) {
        const fresh = data.find(p => p.id === selectedProject.id);
        if (fresh) setSelectedProject(fresh);
      }
      // If a guest has logged in via invite, find and set their project once it loads
      if (inviteProjectId && currentUser?.role === 'Guest' && !selectedProject) {
        const invitedProject = data.find(p => p.id === inviteProjectId);
        if (invitedProject) {
            setSelectedProject(invitedProject);

            // Role upgrade logic for pre-added collaborators joining as guests
            const existingCollaborator = (invitedProject.collaborators || []).find(
                c => c.email.toLowerCase() === currentUser.email.toLowerCase()
            );

            if (existingCollaborator && existingCollaborator.role !== 'Guest') {
                // This is a pre-added editor/viewer, not a true guest. Upgrade their role for the session.
                setCurrentUser(existingCollaborator);
            }
        }
      }
    });

    const unsubIdeas = subscribeToIdeas(setIdeas);
    const unsubReminders = subscribeToReminders(setReminders);
    
    // Subscribe to Global Settings (Admin Code & Owner Profile)
    const unsubSettings = subscribeToSystemSettings((settings) => {
        if (settings) {
            setSystemSettings(settings);
            
            // If the current user is the Owner, keep their profile in sync with Firebase settings
            if (currentUser && currentUser.role === 'Owner') {
                // Only update if there are changes to avoid loop
                if (currentUser.name !== settings.ownerProfile.name || 
                    currentUser.email !== settings.ownerProfile.email) {
                    const updatedOwner = { ...currentUser, ...settings.ownerProfile };
                    setCurrentUser(updatedOwner);
                    localStorage.setItem('rn_user', JSON.stringify(updatedOwner));
                }
            }
            
            // Auto-unlock if code is empty
            if (settings.adminCode === '') {
                setIsLocked(false);
            }
        } else {
            // First time init? Create default settings in DB
             const defaultSettings: SystemSettings = {
                id: 'global_config',
                adminCode: '141089',
                ownerProfile: MOCK_USERS[0]
            };
            saveSystemSettings(defaultSettings);
        }
    });

    return () => {
      unsubProjects();
      unsubIdeas();
      unsubReminders();
      unsubSettings();
    };
  }, [selectedProject?.id, inviteProjectId, currentUser?.role]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'Guest') {
      localStorage.setItem('rn_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
      if (initialPid) {
          setInviteProjectId(initialPid);
          // Invites bypass the main lock to let guests see the project
          setIsLocked(false);
      }
  }, [initialPid]);

  const handleUnlock = (e?: React.FormEvent) => {
      e?.preventDefault();
      // Compare against the code from Firebase
      if (inputCode === systemSettings.adminCode) {
          setIsLocked(false);
          setUnlockError(false);
      } else {
          setUnlockError(true);
          setInputCode('');
      }
  };

  const handleUpdateAdminCode = (newCode: string) => {
      // Save to Firebase
      const newSettings = { ...systemSettings, adminCode: newCode };
      setSystemSettings(newSettings); // Optimistic update
      saveSystemSettings(newSettings);
      
      if (newCode === '') setIsLocked(false);
  };

  const handleUpdateUser = (updatedUser: Collaborator) => {
      // If updating the Owner, sync to global settings in Firebase
      if (updatedUser.role === 'Owner') {
          const newSettings = { ...systemSettings, ownerProfile: updatedUser };
          setSystemSettings(newSettings); // Optimistic
          saveSystemSettings(newSettings);
      }
      
      setCurrentUser(updatedUser);
  };

  const handleLogin = (user: Collaborator) => {
      if (user.role === 'Owner') {
          // When logging in as owner, prioritize the profile from Firebase settings
          // This ensures if name/email changed on another device, it reflects here
          const ownerFromDb = systemSettings.ownerProfile;
          setCurrentUser(ownerFromDb);
      } else {
          setCurrentUser(user);
      }

      if (inviteProjectId && user.role === 'Guest') {
          const invitedProject = projects.find(p => p.id === inviteProjectId);
          if (invitedProject) {
              setSelectedProject(invitedProject);
          }
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('rn_user');
      window.location.href = window.location.origin;
  };

  // --- CRUD HANDLERS ---
  const handleUpdateProject = (updatedProject: Project) => {
    saveProject(updatedProject);
    if (selectedProject?.id === updatedProject.id) setSelectedProject(updatedProject);
  };

  const handleAddProject = (newProject: Project) => saveProject(newProject);
  
  const handleDeleteProject = (projectId: string) => {
      // Logic inside ProjectDetail handles the confirmation, but we double check or just execute
      // Since ProjectDetail calls this after confirmation, we just delete.
      deleteProject(projectId);
      if (selectedProject?.id === projectId) setSelectedProject(null);
  };

  const handleArchiveProject = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (project) saveProject({ ...project, status: ProjectStatus.ARCHIVED });
  };

  const handleUpdateIdea = (updatedIdea: Idea) => saveIdea(updatedIdea);
  const handleDeleteIdea = (id: string) => deleteIdea(id);
  const handleAddIdea = (newIdea: Idea) => saveIdea(newIdea);
  const handleAddReminder = (newReminder: Reminder) => saveReminder(newReminder);
  const handleToggleReminder = (id: string) => {
      const r = reminders.find(rem => rem.id === id);
      if (r) saveReminder({ ...r, completed: !r.completed });
  };
  const handleDeleteReminder = (id: string) => deleteReminder(id);

  // --- RENDER LOCK SCREEN ---
  if (isLocked) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 font-sans">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-8 h-8 text-slate-700" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Restricted Access</h1>
                  <p className="text-sm text-slate-500 mb-6">Please enter the Admin Code to access TrungLe's Corner.</p>
                  
                  <form onSubmit={handleUnlock} className="space-y-4">
                      <div className="relative">
                          <KeyRound className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <input 
                              type="password"
                              autoFocus
                              className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition-all text-center tracking-widest text-lg ${unlockError ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-300 focus:ring-indigo-500'}`}
                              placeholder="Enter Code"
                              value={inputCode}
                              onChange={(e) => { setInputCode(e.target.value); setUnlockError(false); }}
                          />
                      </div>
                      {unlockError && <p className="text-xs text-red-600 font-medium">Incorrect code. Please try again.</p>}
                      <button 
                          type="submit"
                          className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                          Unlock App <ArrowRight className="w-4 h-4" />
                      </button>
                  </form>
              </div>
              <p className="mt-8 text-slate-500 text-xs">Protected System • Authorized Personnel Only</p>
          </div>
      );
  }

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} inviteProjectId={inviteProjectId} />;
  }
  
  // --- GUEST VIEW RENDER ---
  if (currentUser.role === 'Guest') {
    if (!selectedProject) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600">Loading project...</p>
                <p className="text-xs text-slate-400 mt-2">If this takes too long, the project may not exist or you may not have access.</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900">ResearchNexus</h1>
                        <p className="text-xs text-slate-500 font-medium">Guest Collaboration</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
                        <p className="text-xs text-slate-500">Viewing: {selectedProject.title}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-hidden">
                <ProjectDetail
                    isGuestView={true}
                    project={selectedProject}
                    currentUser={currentUser}
                    onUpdateProject={handleUpdateProject}
                    onBack={() => {}} // No back action for guests
                    onDeleteProject={() => {}} // Guests can't delete
                />
            </main>
        </div>
    );
  }

  // Filter Data for Owner
  const researchProjects = projects.filter(p => p.category === 'research' || !p.category);
  const adminProjects = projects.filter(p => p.category === 'admin');

  // --- RENDER LOGIC ---

  const renderResearchModule = () => {
      switch (currentResearchView) {
          case ViewState.DASHBOARD:
              return (
                  <Dashboard 
                      projects={researchProjects} 
                      reminders={reminders}
                      onAddReminder={handleAddReminder}
                      onToggleReminder={handleToggleReminder}
                      onDeleteReminder={handleDeleteReminder}
                  />
              );
          case ViewState.PROJECTS:
              return selectedProject ? (
                  <ProjectDetail
                      project={selectedProject}
                      currentUser={currentUser}
                      onUpdateProject={handleUpdateProject}
                      onBack={() => setSelectedProject(null)}
                      isGuestView={false}
                      onDeleteProject={handleDeleteProject}
                  />
              ) : (
                  <ProjectManager 
                      projects={researchProjects} 
                      currentUser={currentUser}
                      onSelectProject={setSelectedProject}
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
          default:
              return null;
      }
  };

  const renderMainContent = () => {
      if (currentResearchView === ViewState.SETTINGS) {
           return <SettingsPage 
                    currentUser={currentUser} 
                    onUpdateUser={handleUpdateUser}
                    currentAdminCode={systemSettings.adminCode} // Pass code from Firebase
                    onUpdateAdminCode={handleUpdateAdminCode}
                  />;
      }

      switch (activeModule) {
          case AppModule.RESEARCH:
              return renderResearchModule();
          case AppModule.TEACHING:
              return (
                  <TeachingModule 
                    currentUser={currentUser}
                    onAddReminder={handleAddReminder}
                  />
              );
          case AppModule.ADMIN:
              return (
                  <AdminModule 
                      activeView={currentAdminView}
                      adminProjects={adminProjects}
                      currentUser={currentUser}
                      onUpdateProject={handleUpdateProject}
                      onSelectProject={setSelectedProject}
                      selectedProject={selectedProject}
                      onDeleteProject={handleDeleteProject}
                      onAddProject={handleAddProject}
                      onAddReminder={handleAddReminder}
                  />
              );
          case AppModule.PERSONAL:
              return <PersonalModule />;
          case AppModule.JOURNAL:
              return <JournalModule />;
          case AppModule.AI_GLOBAL:
              return (
                  <div className="p-6 h-full flex flex-col justify-center">
                      <AIChat 
                          globalContext={{
                              projects: projects,
                              ideas: ideas,
                              reminders: reminders
                          }}
                      />
                  </div>
              );
          default:
              return <div>Module Under Construction</div>;
      }
  };

  const SidebarItem = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) => (
      <button
          onClick={onClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              active
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
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">TrungLe's Corner</h1>
            <p className="text-xs text-slate-400 font-medium">Life Management</p>
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
                    <p className="opacity-80">Check Vercel Config</p>
                </div>
            </div>
        )}

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            <div className="mb-6">
                 {/* GLOBAL AI ASSISTANT BUTTON */}
                 <button
                    onClick={() => { setActiveModule(AppModule.AI_GLOBAL); setCurrentResearchView(ViewState.DASHBOARD); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-6 border border-slate-100 ${
                        activeModule === AppModule.AI_GLOBAL && currentResearchView !== ViewState.SETTINGS
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:shadow-sm'
                    }`}
                >
                    <Bot className={`w-5 h-5 ${activeModule === AppModule.AI_GLOBAL ? 'text-amber-400' : 'text-indigo-600'}`} />
                    <span className="font-bold">AI Assistant</span>
                </button>

                <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Modules</h3>
                
                {/* RESEARCH MODULE + SUB-TABS */}
                <button
                    onClick={() => { setActiveModule(AppModule.RESEARCH); setCurrentResearchView(ViewState.DASHBOARD); setSelectedProject(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${
                        activeModule === AppModule.RESEARCH && currentResearchView !== ViewState.SETTINGS
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                    <Beaker className="w-5 h-5" />
                    <span className="font-medium">Research</span>
                </button>

                {/* Sub-tabs for Research */}
                {activeModule === AppModule.RESEARCH && currentResearchView !== ViewState.SETTINGS && (
                    <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1 mb-4 animate-in slide-in-from-left-2 duration-200">
                        <button
                            onClick={() => setCurrentResearchView(ViewState.DASHBOARD)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                currentResearchView === ViewState.DASHBOARD ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Dashboard
                        </button>
                        <button
                            onClick={() => {setCurrentResearchView(ViewState.PROJECTS); setSelectedProject(null);}}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                currentResearchView === ViewState.PROJECTS ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Projects
                        </button>
                        <button
                            onClick={() => setCurrentResearchView(ViewState.IDEAS)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                currentResearchView === ViewState.IDEAS ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Idea Lab
                        </button>
                         <button
                            onClick={() => setCurrentResearchView(ViewState.CHAT)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                currentResearchView === ViewState.CHAT ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Project Chat
                        </button>
                    </div>
                )}

                <SidebarItem 
                    active={activeModule === AppModule.TEACHING && currentResearchView !== ViewState.SETTINGS} 
                    icon={BookOpen} 
                    label="Teaching" 
                    onClick={() => { setActiveModule(AppModule.TEACHING); setCurrentResearchView(ViewState.DASHBOARD); setSelectedProject(null); }} 
                />
                
                {/* ADMIN MODULE + SUB-TABS */}
                <button
                    onClick={() => { setActiveModule(AppModule.ADMIN); setCurrentAdminView(AdminViewState.DOCS); setSelectedProject(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${
                        activeModule === AppModule.ADMIN && currentResearchView !== ViewState.SETTINGS
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                    <Briefcase className="w-5 h-5" />
                    <span className="font-medium">Admin</span>
                </button>
                
                {activeModule === AppModule.ADMIN && currentResearchView !== ViewState.SETTINGS && (
                    <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1 mb-4 animate-in slide-in-from-left-2 duration-200">
                        <button onClick={() => setCurrentAdminView(AdminViewState.DOCS)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${currentAdminView === AdminViewState.DOCS ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-800'}`}><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Docs & Meetings</button>
                        <button onClick={() => setCurrentAdminView(AdminViewState.PROJECTS)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${currentAdminView === AdminViewState.PROJECTS ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-800'}`}><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Admin Projects</button>
                    </div>
                )}

                <SidebarItem 
                    active={activeModule === AppModule.PERSONAL && currentResearchView !== ViewState.SETTINGS} 
                    icon={Target} 
                    label="Personal Growth" 
                    onClick={() => { setActiveModule(AppModule.PERSONAL); setCurrentResearchView(ViewState.DASHBOARD); }} 
                />
                <SidebarItem 
                    active={activeModule === AppModule.JOURNAL && currentResearchView !== ViewState.SETTINGS} 
                    icon={Calendar} 
                    label="Daily Journal" 
                    onClick={() => { setActiveModule(AppModule.JOURNAL); setCurrentResearchView(ViewState.DASHBOARD); }} 
                />
            </div>

            <div>
                 <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System</h3>
                 <SidebarItem 
                    active={currentResearchView === ViewState.SETTINGS} 
                    icon={Settings} 
                    label="Settings" 
                    onClick={() => { setCurrentResearchView(ViewState.SETTINGS); }} 
                />
                 <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;