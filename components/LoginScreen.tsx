
import React, { useState } from 'react';
import { Collaborator } from '../types';
import { MOCK_USERS } from '../constants';
import { Beaker, Users, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { addCollaboratorToProject } from '../services/firebase';

interface LoginScreenProps {
  onLogin: (user: Collaborator) => void;
  inviteProjectId?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, inviteProjectId }) => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestJoin = async () => {
      if (!guestName.trim() || !guestEmail.trim()) return;
      
      setIsLoading(true);

      const guestUser: Collaborator = {
          // Use email as ID for guests to ensure uniqueness/persistence across sessions
          id: guestEmail.toLowerCase().replace(/[^a-z0-9]/g, '-'), 
          name: guestName,
          email: guestEmail,
          role: 'Guest',
          initials: guestName.substring(0, 2).toUpperCase()
      };

      try {
          // If this is an invite link, add them to the database
          if (inviteProjectId) {
              await addCollaboratorToProject(inviteProjectId, guestUser);
          }
          onLogin(guestUser);
      } catch (error) {
          console.error("Failed to join project:", error);
          alert("Could not join project. Please check your connection.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleOwnerEntry = () => {
      // Login as default Owner
      onLogin(MOCK_USERS[0]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-8 text-center border-b border-slate-50 bg-gradient-to-b from-white to-slate-50/50">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-6">
            <Beaker className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">ResearchNexus</h1>
          {inviteProjectId ? (
              <p className="text-indigo-600 font-medium text-sm">
                  You have been invited to collaborate on a project.
              </p>
          ) : (
              <p className="text-slate-500 text-sm">
                Secure Research Environment
              </p>
          )}
        </div>

        {/* Login Area */}
        <div className="p-8">
          {inviteProjectId ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 items-start">
                      <Users className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div>
                          <h3 className="text-sm font-semibold text-indigo-900">Join as Guest</h3>
                          <p className="text-xs text-indigo-700 mt-1">
                              Enter your details to collaborate. Your name will appear in task assignments.
                          </p>
                      </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Full Name</label>
                    <input 
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="e.g. Dr. West"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Email Address</label>
                    <input 
                        type="email"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="name@university.edu"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
                    />
                  </div>

                  <button
                    onClick={handleGuestJoin}
                    disabled={!guestName.trim() || !guestEmail.trim() || isLoading}
                    className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Join Project
                  </button>
                  <div className="pt-4 border-t border-slate-100 text-center">
                       <button onClick={() => window.location.href = window.location.origin} className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto">
                           <ArrowLeft className="w-3 h-3" /> Go to Owner Login
                       </button>
                  </div>
              </div>
          ) : (
            <div className="text-center space-y-4 animate-in fade-in duration-300">
               <p className="text-slate-600 text-sm">
                   Welcome back, Dr. Researcher.
               </p>
               <button
                  onClick={handleOwnerEntry}
                  className="w-full bg-slate-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
               >
                  Enter Workspace
               </button>
               <p className="text-xs text-slate-400">
                   (In a real app, you would enter your password here)
               </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            &copy; 2024 ResearchNexus AI.
          </p>
        </div>
      </div>
    </div>
  );
};