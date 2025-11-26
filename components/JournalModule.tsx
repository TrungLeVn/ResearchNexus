import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Link as LinkIcon, Save, Plus, Trash2, ChevronLeft, ChevronRight, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { JournalEntry, LinkResource } from '../types';
import { suggestJournalPlan } from '../services/gemini';
import { subscribeToJournal, saveJournalEntry } from '../services/firebase';

export const JournalModule: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
    const [entry, setEntry] = useState<JournalEntry>({
        id: '',
        date: new Date().toISOString().split('T')[0],
        content: '',
        tasks: [],
        links: []
    });
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Subscribe to Firebase Journal Entries
    useEffect(() => {
        const unsubscribe = subscribeToJournal(setAllEntries);
        return () => unsubscribe();
    }, []);

    // Update current entry state when selected date changes or allEntries updates
    useEffect(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const existing = allEntries.find(e => e.date === dateStr);
        if (existing) {
            setEntry(existing);
        } else {
            setEntry({
                id: `journal-${dateStr}`, // Consistent ID format for quick lookup
                date: dateStr,
                content: '',
                tasks: [],
                links: []
            });
        }
    }, [selectedDate, allEntries]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveJournalEntry(entry);
        } catch (error) {
            console.error(error);
            alert("Failed to save entry.");
        } finally {
            setIsSaving(false);
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const toggleTask = (taskId: string) => {
        const newTasks = entry.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
        // Auto save on task toggle for better UX
        const updatedEntry = { ...entry, tasks: newTasks };
        setEntry(updatedEntry);
        saveJournalEntry(updatedEntry);
    };

    const addTask = () => {
        const text = prompt("New Task:");
        if (text) {
            const updatedEntry = {
                ...entry,
                tasks: [...entry.tasks, { id: Date.now().toString(), text, done: false }]
            };
            setEntry(updatedEntry);
            saveJournalEntry(updatedEntry);
        }
    };

    const handleSmartPlan = async () => {
        setIsGeneratingPlan(true);
        try {
            const dateStr = selectedDate.toDateString();
            const suggestions = await suggestJournalPlan(dateStr);
            
            const newTasks = suggestions.map(s => ({
                id: Date.now().toString() + Math.random(),
                text: s.text,
                done: false
            }));

            const updatedEntry = {
                ...entry,
                tasks: [...entry.tasks, ...newTasks]
            };
            setEntry(updatedEntry);
            saveJournalEntry(updatedEntry);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const addLink = () => {
        const title = prompt("Link Title:");
        const url = prompt("URL:");
        if (title && url) {
            const newLink: LinkResource = { id: Date.now().toString(), title, url, type: 'web' };
            const updatedEntry = { ...entry, links: [...entry.links, newLink] };
            setEntry(updatedEntry);
            saveJournalEntry(updatedEntry);
        }
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedEntry = {...entry, tasks: entry.tasks.filter(t => t.id !== taskId)};
        setEntry(updatedEntry);
        saveJournalEntry(updatedEntry);
    };

    const handleDeleteLink = (linkId: string) => {
        const updatedEntry = {...entry, links: entry.links.filter(l => l.id !== linkId)};
        setEntry(updatedEntry);
        saveJournalEntry(updatedEntry);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Daily Journal
                    </h1>
                    <p className="text-slate-500">Track your daily work, progress, and thoughts.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <button onClick={() => changeDate(-1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="font-semibold text-slate-700 w-32 text-center">
                        {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                    <button 
                        onClick={() => setSelectedDate(new Date())}
                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium"
                    >
                        Today
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Main Note Area */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-700">Daily Log & Notes</h3>
                        <button onClick={handleSave} className="flex items-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <textarea 
                        className="flex-1 p-6 resize-none focus:outline-none text-slate-700 leading-relaxed"
                        placeholder="What did you work on today? Any blockers? Ideas?"
                        value={entry.content}
                        onChange={(e) => setEntry({ ...entry, content: e.target.value })}
                        onBlur={handleSave} // Auto-save on blur
                    />
                </div>

                {/* Sidebar: Tasks & Links */}
                <div className="flex flex-col gap-6 overflow-hidden">
                    {/* Daily Checklist */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4" /> Daily Goals
                                </h3>
                                <button 
                                    onClick={handleSmartPlan}
                                    disabled={isGeneratingPlan}
                                    className="p-1 hover:bg-purple-100 rounded text-purple-600 transition-colors"
                                    title="Generate Daily Checklist with AI"
                                >
                                    {isGeneratingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <button onClick={addTask} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3 flex-1">
                            {entry.tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 group">
                                    <input 
                                        type="checkbox" 
                                        checked={task.done} 
                                        onChange={() => toggleTask(task.id)}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className={`flex-1 text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {task.text}
                                    </span>
                                    <button 
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {entry.tasks.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">No tasks set for today.</p>}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-1/3 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" /> Resources
                            </h3>
                            <button onClick={addLink} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-2">
                             {entry.links.map(link => (
                                 <div key={link.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 hover:border-indigo-200 group">
                                     <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-medium text-indigo-600 truncate flex-1">
                                         <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                         <span className="truncate">{link.title}</span>
                                     </a>
                                     <button 
                                        onClick={() => handleDeleteLink(link.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 ml-2"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                 </div>
                             ))}
                             {entry.links.length === 0 && <p className="text-xs text-slate-400 italic text-center">No links attached.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};