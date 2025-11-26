
import React, { useState, useRef } from 'react';
import { Collaborator } from '../types';
import { User, Bell, Download, Upload, Shield, Sparkles, Building, Mail, Save, AlertTriangle } from 'lucide-react';

interface SettingsPageProps {
  currentUser: Collaborator;
  onUpdateUser?: (user: Collaborator) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [affiliation, setAffiliation] = useState('University of Technology'); // Mock default
  const [notifications, setNotifications] = useState({
      email: true,
      push: true,
      weeklyReport: false
  });
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
      // Simulate API call to save user data
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      if (onUpdateUser) {
          onUpdateUser({ ...currentUser, name, email });
      }
  };

  const handleExportData = () => {
      const projects = localStorage.getItem('rn_projects');
      const ideas = localStorage.getItem('rn_ideas');
      const reminders = localStorage.getItem('rn_reminders');

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
          user: currentUser, 
          projects: projects ? JSON.parse(projects) : [],
          ideas: ideas ? JSON.parse(ideas) : [],
          reminders: reminders ? JSON.parse(reminders) : [],
          exportedAt: new Date().toISOString(),
          note: "ResearchNexus Backup Data" 
      }, null, 2));
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `research_nexus_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!window.confirm("WARNING: This will overwrite your current data with the imported file. Continue?")) {
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = e.target?.result as string;
              const data = JSON.parse(json);

              // Basic validation to check if it looks like our data
              if (!data.projects && !data.ideas && !data.reminders) {
                  throw new Error("Invalid backup file format");
              }

              // Update LocalStorage
              if (data.user) localStorage.setItem('rn_user', JSON.stringify(data.user));
              if (data.projects) localStorage.setItem('rn_projects', JSON.stringify(data.projects));
              if (data.ideas) localStorage.setItem('rn_ideas', JSON.stringify(data.ideas));
              if (data.reminders) localStorage.setItem('rn_reminders', JSON.stringify(data.reminders));

              alert("Data imported successfully! The application will now reload.");
              window.location.reload();
          } catch (error) {
              console.error("Import failed", error);
              alert("Failed to import data. Please ensure the file is a valid ResearchNexus backup JSON.");
          }
      };
      reader.readAsText(file);
  };

  const handleResetData = () => {
      if (window.confirm("WARNING: This will delete ALL your saved projects, ideas, and settings from this browser. This action cannot be undone. Are you sure?")) {
          localStorage.clear();
          window.location.reload();
      }
  }

  const apiKeyStatus = process.env.API_KEY ? 'Connected' : 'Not Configured';

  return (
    <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <header className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
        <p className="text-slate-500">Manage your profile, preferences, and workspace configuration.</p>
      </header>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Academic Profile</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name & Title</label>
                    <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Institution / Affiliation</label>
                    <div className="relative">
                        <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="text" 
                            value={affiliation} 
                            onChange={e => setAffiliation(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button 
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${isSaved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isSaved ? <span className="flex items-center gap-1">Saved!</span> : <span className="flex items-center gap-1"><Save className="w-4 h-4" /> Save Changes</span>}
                </button>
            </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800">Notifications</h3>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-slate-800">Deadline Alerts</p>
                        <p className="text-sm text-slate-500">Receive alerts 24h before task due dates.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-slate-800">Project Updates</p>
                        <p className="text-sm text-slate-500">Email me when collaborators make changes.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>
        </div>

        {/* System & Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-slate-800">AI Configuration</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-2">Gemini API Status:</p>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${apiKeyStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="font-medium text-slate-800">{apiKeyStatus}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        API Key is managed via Vercel Environment Variables.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-800">Data Management</h3>
                </div>
                <div className="p-6 space-y-3">
                    <p className="text-sm text-slate-600">Export your data to JSON for backup or migration.</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExportData}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                            <Upload className="w-4 h-4" /> Import
                        </button>
                        {/* Hidden Input for File Upload */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-4 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
            </div>
            <div className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-red-900">Reset Application</p>
                    <p className="text-xs text-red-700">Deletes all local data and restores default mock projects.</p>
                </div>
                <button 
                    onClick={handleResetData}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-medium"
                >
                    Reset to Defaults
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
