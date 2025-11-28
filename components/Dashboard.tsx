

import React, { useState } from 'react';
import { Project, ProjectStatus, Reminder } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, CheckCircle2, TrendingUp, Calendar, Plus, Sparkles, Bell, Trash2, Hash, Layers } from 'lucide-react';
import { suggestProjectSchedule } from '../services/gemini';

interface DashboardProps {
  projects: Project[];
  reminders: Reminder[];
  onAddReminder: (r: Reminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, reminders, onAddReminder, onToggleReminder, onDeleteReminder }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE);
  const totalProjects = projects.length;
  
  // Stats Calculation
  const avgProgress = activeProjects.length > 0 
    ? Math.round(activeProjects.reduce((acc: number, p) => acc + p.progress, 0) / activeProjects.length) 
    : 0;

  // Tag/Topic Analysis
  const allTags = projects.flatMap(p => p.tags || []);
  const uniqueTopics = [...new Set(allTags)].length;
  
  const tagDistribution = Object.entries(
    allTags.reduce((acc: Record<string, number>, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)
  )
  .map(([name, count]) => ({ name, count: count as number }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 6); // Top 6 topics

  // Data for Charts
  const progressData = activeProjects.map(p => ({
    name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
    progress: p.progress,
    fullTitle: p.title
  }));

  const handleSmartPlan = async () => {
      if (activeProjects.length === 0) return;
      setIsGenerating(true);
      
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
          alert((e as Error).message);
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Research Overview</h1>
            <p className="text-slate-500">High-level view of your active projects and research themes.</p>
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

      {/* Stats Cards - Redesigned */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Projects</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalProjects}</h3>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <Layers className="w-6 h-6 text-slate-600" />
          </div>
        </div>
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
            <p className="text-sm text-slate-500 font-medium">Active Topics</p>
            <h3 className="text-2xl font-bold text-pink-600">{uniqueTopics}</h3>
          </div>
          <div className="p-3 bg-pink-50 rounded-lg">
            <Hash className="w-6 h-6 text-pink-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Avg. Velocity</p>
            <h3 className="text-2xl font-bold text-emerald-600">{avgProgress}%</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts - 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
            {/* Active Project Progress */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Active Projects Status</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value}%`, 'Progress']}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                return payload[0].payload.fullTitle;
                            }
                            return label;
                        }}
                    />
                    <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Topic Landscape (Tag Cloud replacement) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Topic Landscape</h3>
                {tagDistribution.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tagDistribution} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: '8px', border: 'none' }}
                            />
                            <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        No tags found across projects.
                    </div>
                )}
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
                        <div key={reminder.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors relative pr-8">
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
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteReminder(reminder.id); }}
                                className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Reminder"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
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