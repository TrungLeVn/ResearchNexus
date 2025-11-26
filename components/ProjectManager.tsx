
import React, { useState } from 'react';
import { Project, Paper, ProjectFile, Task, Collaborator, TaskStatus, ProjectActivity, ProjectStatus } from '../types';
import { Folder, FileCode, FileText, Database, Sparkles, MoreVertical, Plus, ChevronLeft, BookOpen, Clock, HardDrive, ExternalLink, Kanban, Calendar as CalendarIcon, ListTodo, Users, Share2, GripVertical, CheckCircle2, Circle, LayoutDashboard, TrendingUp, AlertTriangle, Activity, MessageSquare, Link as LinkIcon, Copy, X, Archive, Trash2 } from 'lucide-react';
import { summarizeText } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AIChat } from './AIChat';

interface ProjectManagerProps {
  projects: Project[];
  onUpdateProject: (p: Project) => void;
  onSelectProject: (p: Project | null) => void;
  selectedProject: Project | null;
  onDeleteProject?: (id: string) => void;
  onArchiveProject?: (id: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, onUpdateProject, selectedProject, onSelectProject, onDeleteProject, onArchiveProject }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'timeline' | 'calendar' | 'papers' | 'drafts' | 'data' | 'code' | 'assistant'>('dashboard');
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null);

  // File adding state
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFile, setNewFile] = useState<{name: string, url: string}>({name: '', url: ''});

  // Task adding state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleGenerateSummary = async (paper: Paper) => {
    setSummaryLoading(paper.id);
    const mockContent = `Abstract of ${paper.title}: This paper explores the implications of... [Simulated content for AI]`;
    const summary = await summarizeText(mockContent);
    
    if (selectedProject) {
        const updatedPapers = selectedProject.papers.map(p => 
            p.id === paper.id ? { ...p, summary } : p
        );
        onUpdateProject({ ...selectedProject, papers: updatedPapers });
    }
    setSummaryLoading(null);
  };

  const handleAddFile = () => {
      if(!selectedProject || !newFile.name || !newFile.url) return;
      
      const typeMap: Record<string, 'draft' | 'data' | 'code'> = {
          'drafts': 'draft',
          'data': 'data',
          'code': 'code'
      };

      const file: ProjectFile = {
          id: Date.now().toString(),
          name: newFile.name,
          url: newFile.url,
          lastModified: new Date().toISOString().split('T')[0],
          type: typeMap[activeTab] || 'other'
      };

      const updatedFiles = [...selectedProject.files, file];
      onUpdateProject({ ...selectedProject, files: updatedFiles });
      setNewFile({name: '', url: ''});
      setIsAddingFile(false);
  };

  const handleAddTask = (status: TaskStatus = 'todo') => {
      if(!selectedProject || !newTaskTitle.trim()) return;

      const task: Task = {
          id: Date.now().toString(),
          title: newTaskTitle,
          status: status,
          priority: 'medium',
          dueDate: new Date(Date.now() + 604800000).toISOString().split('T')[0], // +1 week
          assigneeId: selectedProject.collaborators[0]?.id
      };

      onUpdateProject({
          ...selectedProject,
          tasks: [...selectedProject.tasks, task]
      });
      setNewTaskTitle('');
      setIsAddingTask(false);
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
      if(!selectedProject) return;
      const updatedTasks = selectedProject.tasks.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
      );
      onUpdateProject({ ...selectedProject, tasks: updatedTasks });
  };

  const handleCopyLink = () => {
      if (!selectedProject) return;
      // Get current URL base and append query param
      const link = `${window.location.origin}${window.location.pathname}?pid=${selectedProject.id}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
  };

  // --- SUB-COMPONENTS FOR VIEWS ---

  const ProjectDashboard = () => {
      if(!selectedProject) return null;

      const tasks = selectedProject.tasks;
      const completed = tasks.filter(t => t.status === 'done').length;
      const inProgress = tasks.filter(t => t.status === 'in_progress').length;
      const todo = tasks.filter(t => t.status === 'todo').length;
      
      const pieData = [
          { name: 'Done', value: completed, color: '#10b981' },
          { name: 'In Progress', value: inProgress, color: '#3b82f6' },
          { name: 'To Do', value: todo, color: '#94a3b8' }
      ];

      const upcomingDeadlines = tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3);

      return (
          <div className="space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs text-slate-500 font-medium uppercase">Overall Progress</p>
                      <div className="flex items-end justify-between mt-2">
                          <h3 className="text-2xl font-bold text-slate-800">{selectedProject.progress}%</h3>
                          <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{width: `${selectedProject.progress}%`}}></div>
                      </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs text-slate-500 font-medium uppercase">Total Tasks</p>
                      <div className="flex items-end justify-between mt-2">
                          <h3 className="text-2xl font-bold text-slate-800">{tasks.length}</h3>
                          <ListTodo className="w-5 h-5 text-indigo-500 mb-1" />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{completed} completed</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs text-slate-500 font-medium uppercase">Resources</p>
                      <div className="flex items-end justify-between mt-2">
                          <h3 className="text-2xl font-bold text-slate-800">{selectedProject.files.length + selectedProject.papers.length}</h3>
                          <Folder className="w-5 h-5 text-blue-500 mb-1" />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{selectedProject.papers.length} papers, {selectedProject.files.length} files</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs text-slate-500 font-medium uppercase">Team</p>
                      <div className="flex items-end justify-between mt-2">
                          <h3 className="text-2xl font-bold text-slate-800">{selectedProject.collaborators.length}</h3>
                          <Users className="w-5 h-5 text-purple-500 mb-1" />
                      </div>
                      <div className="flex -space-x-1 mt-2">
                          {selectedProject.collaborators.map(c => (
                              <div key={c.id} className="w-5 h-5 rounded-full bg-slate-200 border border-white text-[8px] flex items-center justify-center font-bold text-slate-600">
                                  {c.initials}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Task Distribution */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-800 mb-4">Task Status</h3>
                      <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie 
                                    data={pieData} 
                                    innerRadius={40} 
                                    outerRadius={60} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                  >
                                      {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-2">
                          {pieData.map(d => (
                              <div key={d.name} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                                  <span className="text-xs text-slate-600">{d.name}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Upcoming Deadlines */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-800 mb-4">Upcoming Deadlines</h3>
                      <div className="space-y-3">
                          {upcomingDeadlines.map(task => (
                              <div key={task.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                      task.priority === 'high' ? 'bg-red-500' : 'bg-amber-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                              <Clock className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString()}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {upcomingDeadlines.length === 0 && (
                              <p className="text-xs text-slate-400 italic">No upcoming deadlines.</p>
                          )}
                      </div>
                  </div>

                  {/* Recent Activity Feed */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Activity</h3>
                      <div className="space-y-4">
                          {(selectedProject.activity || []).map((act, idx) => (
                              <div key={idx} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                      {idx !== (selectedProject.activity || []).length - 1 && <div className="w-px h-full bg-slate-200 my-1"></div>}
                                  </div>
                                  <div>
                                      <p className="text-xs text-slate-800">{act.message}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                                  </div>
                              </div>
                          ))}
                          {(!selectedProject.activity || selectedProject.activity.length === 0) && (
                              <p className="text-xs text-slate-400 italic">No recent activity recorded.</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const KanbanBoard = () => {
      if(!selectedProject) return null;
      
      const columns: {id: TaskStatus, label: string, color: string}[] = [
          { id: 'todo', label: 'To Do', color: 'bg-slate-100' },
          { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
          { id: 'done', label: 'Done', color: 'bg-emerald-50' }
      ];

      return (
          <div className="flex gap-6 h-full overflow-x-auto pb-4">
              {columns.map(col => (
                  <div key={col.id} className={`flex-1 min-w-[300px] rounded-xl ${col.color} p-4 flex flex-col`}>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-slate-700">{col.label}</h3>
                          <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-slate-500 font-medium">
                              {selectedProject.tasks.filter(t => t.status === col.id).length}
                          </span>
                      </div>
                      
                      <div className="space-y-3 flex-1 overflow-y-auto">
                          {selectedProject.tasks.filter(t => t.status === col.id).map(task => {
                              const assignee = selectedProject.collaborators.find(c => c.id === task.assigneeId);
                              return (
                                  <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 group hover:shadow-md transition-all">
                                      <div className="flex justify-between items-start mb-2">
                                          <p className="text-sm font-medium text-slate-800 leading-tight">{task.title}</p>
                                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                              {col.id !== 'todo' && (
                                                  <button onClick={() => handleUpdateTaskStatus(task.id, 'todo')} className="p-1 hover:bg-slate-100 rounded" title="Move to To Do">
                                                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                  </button>
                                              )}
                                              {col.id !== 'in_progress' && (
                                                  <button onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')} className="p-1 hover:bg-slate-100 rounded" title="Move to In Progress">
                                                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                  </button>
                                              )}
                                              {col.id !== 'done' && (
                                                  <button onClick={() => handleUpdateTaskStatus(task.id, 'done')} className="p-1 hover:bg-slate-100 rounded" title="Move to Done">
                                                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-3">
                                          <div className="flex items-center gap-2">
                                              {assignee && (
                                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold" title={assignee.name}>
                                                      {assignee.initials}
                                                  </div>
                                              )}
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                                  task.priority === 'high' ? 'bg-red-50 text-red-600' : 
                                                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                              }`}>
                                                  {task.priority}
                                              </span>
                                          </div>
                                          <span className="text-[10px] text-slate-400">{task.dueDate.substring(5)}</span>
                                      </div>
                                  </div>
                              );
                          })}
                          
                          {isAddingTask && col.id === 'todo' ? (
                               <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                                   <input 
                                      autoFocus
                                      className="w-full text-sm outline-none mb-2" 
                                      placeholder="Task title..."
                                      value={newTaskTitle}
                                      onChange={e => setNewTaskTitle(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                   />
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => setIsAddingTask(false)} className="text-xs text-slate-500">Cancel</button>
                                       <button onClick={() => handleAddTask()} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Add</button>
                                   </div>
                               </div>
                          ) : col.id === 'todo' && (
                              <button 
                                  onClick={() => setIsAddingTask(true)}
                                  className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 transition-colors"
                              >
                                  <Plus className="w-4 h-4" /> Add Task
                              </button>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  const TimelineView = () => {
      if(!selectedProject) return null;
      const sortedTasks = [...selectedProject.tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      return (
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex justify-between">
                  <span>Project Timeline</span>
                  <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded border">Sorted by Due Date</span>
              </div>
              <div className="divide-y divide-slate-100">
                  {sortedTasks.map(task => {
                      const assignee = selectedProject.collaborators.find(c => c.id === task.assigneeId);
                      const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
                      return (
                          <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  task.status === 'done' ? 'bg-emerald-500' :
                                  task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                          {task.title}
                                      </span>
                                      {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">LATE</span>}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" /> Due: {task.dueDate}
                                      </span>
                                      {assignee && (
                                          <span className="flex items-center gap-1">
                                              <Users className="w-3 h-3" /> {assignee.name}
                                          </span>
                                      )}
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                      task.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                      {task.status.replace('_', ' ')}
                                  </span>
                              </div>
                          </div>
                      );
                  })}
                  {sortedTasks.length === 0 && (
                      <div className="p-8 text-center text-slate-400">No tasks scheduled.</div>
                  )}
              </div>
          </div>
      );
  };

  const CalendarView = () => {
      // Simplified Month View
      const days = Array.from({length: 35}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - d.getDay() + i);
          return d;
      });

      return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                  {days.map((date, i) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const dayTasks = selectedProject?.tasks.filter(t => t.dueDate === dateStr) || [];
                      const isToday = new Date().toDateString() === date.toDateString();
                      
                      return (
                          <div key={i} className={`border-b border-r border-slate-100 p-2 min-h-[80px] ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  {date.getDate()} {isToday && '(Today)'}
                              </div>
                              <div className="space-y-1">
                                  {dayTasks.map(task => (
                                      <div key={task.id} className={`text-[10px] truncate px-1.5 py-0.5 rounded cursor-pointer ${
                                          task.status === 'done' ? 'bg-emerald-100 text-emerald-700 line-through opacity-70' :
                                          task.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-100' : 
                                          'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                      }`}>
                                          {task.title}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderFileList = (type: 'draft' | 'data' | 'code') => {
      if (!selectedProject) return null;
      const files = selectedProject.files.filter(f => f.type === type);

      return (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-800 capitalize">{type}s Repository</h2>
                  <button 
                    onClick={() => setIsAddingFile(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                  >
                      <Plus className="w-4 h-4" /> Link {type}
                  </button>
              </div>

              {isAddingFile && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-indigo-200 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Google Drive Link</h4>
                      <div className="grid grid-cols-1 gap-3 mb-3">
                          <input 
                              placeholder="File Name"
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              value={newFile.name}
                              onChange={e => setNewFile({...newFile, name: e.target.value})}
                          />
                          <input 
                              placeholder="Google Drive URL"
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              value={newFile.url}
                              onChange={e => setNewFile({...newFile, url: e.target.value})}
                          />
                      </div>
                      <div className="flex gap-2">
                          <button onClick={handleAddFile} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save Link</button>
                          <button onClick={() => setIsAddingFile(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm">Cancel</button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                  {files.map(file => (
                      <div key={file.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                  {type === 'code' ? <FileCode className="w-5 h-5" /> : 
                                   type === 'data' ? <Database className="w-5 h-5" /> :
                                   <FileText className="w-5 h-5" />}
                              </div>
                              <div>
                                  <h3 className="font-semibold text-slate-800">{file.name}</h3>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>Modified: {file.lastModified}</span>
                                      {file.url && file.url.includes('drive.google.com') && (
                                          <span className="flex items-center gap-1 text-green-600 font-medium">
                                              <HardDrive className="w-3 h-3" /> Google Drive
                                          </span>
                                      )}
                                  </div>
                              </div>
                          </div>
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                              <ExternalLink className="w-5 h-5" />
                          </a>
                      </div>
                  ))}
                  {files.length === 0 && !isAddingFile && (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                          <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No {type} files linked yet.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  if (selectedProject) {
    return (
      <div className="h-full flex flex-col bg-slate-50 relative">
        {/* Share Modal */}
        {showShareModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Share "{selectedProject.title}"</h3>
                        <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                        Invite collaborators by sharing this link. They can join as guests to view resources and track progress.
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                        <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 text-xs text-slate-600 truncate font-mono">
                            {`${window.location.origin}${window.location.pathname}?pid=${selectedProject.id}`}
                        </div>
                        <button 
                            onClick={handleCopyLink}
                            className={`p-2 rounded-lg transition-colors ${copiedLink ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-white text-slate-500'}`}
                        >
                            {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setShowShareModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">Done</button>
                    </div>
                </div>
            </div>
        )}

        {/* Project Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
                <button onClick={() => onSelectProject(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                <h1 className="text-xl font-bold text-slate-800">{selectedProject.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700`}>
                    {selectedProject.status}
                    </span>
                    <span className="text-xs text-slate-400">Last updated: Today</span>
                </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Collaborators List */}
                <div className="flex items-center -space-x-2">
                    {selectedProject.collaborators.map(c => (
                        <div key={c.id} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700" title={`${c.name} (${c.role})`}>
                            {c.initials}
                        </div>
                    ))}
                    <button 
                        onClick={() => setShowShareModal(true)}
                        className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors" title="Add Collaborator"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                    <Share2 className="w-4 h-4" /> Share
                </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full max-w-xs">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${selectedProject.progress}%` }}></div>
            </div>
            <span className="text-xs font-medium text-slate-600">{selectedProject.progress}%</span>
          </div>
        </div>

        {/* Project Content */}
        <div className="flex-1 overflow-hidden flex">
            {/* Folder Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-1 overflow-y-auto">
                <div className="mb-6">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Management</h3>
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('board')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'board' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Kanban className="w-4 h-4" /> Task Board
                    </button>
                    <button 
                        onClick={() => setActiveTab('timeline')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'timeline' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <ListTodo className="w-4 h-4" /> Timeline
                    </button>
                    <button 
                        onClick={() => setActiveTab('calendar')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <CalendarIcon className="w-4 h-4" /> Calendar
                    </button>
                </div>

                <div className="mb-6">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Intelligence</h3>
                    <button 
                        onClick={() => setActiveTab('assistant')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'assistant' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <MessageSquare className="w-4 h-4" /> AI Assistant
                    </button>
                </div>

                <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Resources</h3>
                    <button 
                        onClick={() => setActiveTab('papers')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'papers' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <BookOpen className="w-4 h-4" /> Papers & Refs
                    </button>
                    <button 
                        onClick={() => setActiveTab('drafts')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'drafts' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <FileText className="w-4 h-4" /> Drafts & Notes
                    </button>
                    <button 
                        onClick={() => setActiveTab('data')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Database className="w-4 h-4" /> Data Sets
                    </button>
                    <button 
                        onClick={() => setActiveTab('code')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'code' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <FileCode className="w-4 h-4" /> Code Repo
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
                {activeTab === 'dashboard' && <ProjectDashboard />}
                {activeTab === 'board' && <KanbanBoard />}
                {activeTab === 'timeline' && <TimelineView />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'assistant' && (
                    <div className="h-full">
                        <AIChat project={selectedProject} />
                    </div>
                )}

                {activeTab === 'papers' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-800">Literature Review</h2>
                            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                                <Plus className="w-4 h-4" /> Add Paper
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {selectedProject.papers.map(paper => (
                                <div key={paper.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-800">{paper.title}</h3>
                                                <p className="text-sm text-slate-500">{paper.authors} • {paper.year}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            paper.status === 'Annotated' ? 'bg-emerald-100 text-emerald-700' : 
                                            paper.status === 'Reading' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {paper.status}
                                        </span>
                                    </div>
                                    
                                    {paper.summary ? (
                                        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100">
                                            <div className="flex items-center gap-1 text-indigo-600 mb-1 font-medium">
                                                <Sparkles className="w-3 h-3" /> AI Summary
                                            </div>
                                            <ReactMarkdown>{paper.summary}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="mt-4">
                                            <button 
                                                onClick={() => handleGenerateSummary(paper)}
                                                disabled={summaryLoading === paper.id}
                                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                {summaryLoading === paper.id ? 'Generating...' : <><Sparkles className="w-3 h-3" /> Generate Summary with Gemini</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {selectedProject.papers.length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                    No papers added yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'drafts' && renderFileList('draft')}
                {activeTab === 'data' && renderFileList('data')}
                {activeTab === 'code' && renderFileList('code')}
            </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500" onClick={() => setMenuOpenId(null)}>
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
                <p className="text-slate-500">Manage your ongoing research efforts.</p>
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> New Project
            </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
                <div 
                    key={project.id} 
                    onClick={() => onSelectProject(project)}
                    className={`group bg-white rounded-xl border p-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative ${
                        project.status === ProjectStatus.ARCHIVED ? 'border-slate-100 opacity-75 grayscale-[0.5]' : 'border-slate-200'
                    }`}
                >
                    <div className="absolute top-6 right-6">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === project.id ? null : project.id); }}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {menuOpenId === project.id && (
                            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {project.status !== ProjectStatus.ARCHIVED && onArchiveProject && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onArchiveProject(project.id); setMenuOpenId(null); }}
                                        className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <Archive className="w-3.5 h-3.5" /> Archive Project
                                    </button>
                                )}
                                {onDeleteProject && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); setMenuOpenId(null); }}
                                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Project
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                        project.status === 'Active' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                        <Folder className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{project.title}</h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="mt-auto">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                                className="bg-indigo-600 h-full rounded-full transition-all" 
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {project.papers.length}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {project.collaborators.length}</span>
                            </div>
                            <span>
                                {project.status === ProjectStatus.ARCHIVED ? 'Archived' : 'Updated 2d ago'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
