
import React, { useState } from 'react';
import { Collaborator } from '../types';
import { User, Bell, Download, Shield, Sparkles, Building, Mail, Save } from 'lucide-react';

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

  const handleSave = () => {
      // Simulate API call to save user data
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      if (onUpdateUser) {
          onUpdateUser({ ...currentUser, name, email });
      }
  };

  const handleExportData = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
          user: currentUser, 
          exportedAt: new Date().toISOString(),
          note: "This is a mock export of your research data." 
      }, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "research_nexus_data.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

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
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">Export all your projects, tasks, and ideas to a JSON file for backup.</p>
                    <button 
                        onClick={handleExportData}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export Data
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
