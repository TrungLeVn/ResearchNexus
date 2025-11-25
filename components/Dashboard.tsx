import React, { useState } from 'react';
import { Project, ProjectStatus, Reminder } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, CheckCircle2, FileText, AlertCircle, TrendingUp, Calendar, Plus, Sparkles, Bell } from 'lucide-react';
import { suggestProjectSchedule } from '../services/gemini';

interface DashboardProps {
  projects: Project[];
  reminders: Reminder[];
  onAddReminder: (r: Reminder) => void;
  onToggleReminder: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, reminders, onAddReminder, onToggleReminder }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE);
  const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
  const totalPapers = projects.reduce((acc, curr) => acc + curr.papers.length, 0);
  
  // Data for Charts
  const progressData = projects.map(p => ({
    name: p.title.substring(0, 10) + '...',
    progress: p.progress
  }));

  const statusData = [
    { name: 'Active', value: activeProjects.length, color: '#6366f1' },
    { name: 'Planning', value: projects.filter(p => p.status === ProjectStatus.PLANNING).length, color: '#0ea5e9' },
    { name: 'Review', value: projects.filter(p => p.status === ProjectStatus.REVIEW).length, color: '#f59e0b' },
    { name: 'Completed', value: completedProjects, color: '#10b981' },
  ];

  const handleSmartPlan = async () => {
      if (activeProjects.length === 0) return;
      setIsGenerating(true);
      
      // Just take the first active project for demo purposes
      const project = activeProjects[0]; 
      
      try {
          const suggestions = await suggestProjectSchedule(project.title, project.status);
          
          suggestions.forEach((s, index) => {
             const reminder: Reminder = {
                 id: Date.now().toString() + index,
                 title: s.title,
                 date: new Date(Date.now() + s.daysFromNow * 86400000),
                 projectId: project.id,
                 type: s.type as any,
                 completed: false
             };
             onAddReminder(reminder);
          });
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Research Overview</h1>
            <p className="text-slate-500">Track your progress across multiple domains.</p>
        </div>
        <button 
            onClick={handleSmartPlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
        >
            {isGenerating ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Gemini Smart Plan</span>
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Active Projects</p>
            <h3 className="text-2xl font-bold text-indigo-600">{activeProjects.length}</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Papers Collected</p>
            <h3 className="text-2xl font-bold text-blue-600">{totalPapers}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Pending Review</p>
            <h3 className="text-2xl font-bold text-amber-500">
              {projects.filter(p => p.status === ProjectStatus.REVIEW).length}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Completed</p>
            <h3 className="text-2xl font-bold text-emerald-600">{completedProjects}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts - 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
            {/* Progress Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Project Progress</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            </div>

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={statusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip />
                </PieChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Right Column: Reminders */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800">Reminders</h3>
                    </div>
                    <button 
                        onClick={() => {
                            const title = prompt("Reminder Title:");
                            if(title) onAddReminder({
                                id: Date.now().toString(),
                                title,
                                date: new Date(),
                                type: 'task',
                                completed: false
                            });
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    {reminders.length === 0 && (
                        <div className="text-center text-slate-400 py-8">
                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No upcoming reminders</p>
                        </div>
                    )}
                    {reminders.map(reminder => (
                        <div key={reminder.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                            <button 
                                onClick={() => onToggleReminder(reminder.id)}
                                className={`mt-1 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                                    reminder.completed 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'border-slate-300 hover:border-indigo-400'
                                }`}
                            >
                                {reminder.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${reminder.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {reminder.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {reminder.date.toLocaleDateString()}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                                        reminder.type === 'deadline' ? 'bg-red-100 text-red-600' :
                                        reminder.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {reminder.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-slate-50 rounded-b-xl border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        Ask Gemini to manage your schedule automatically.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};