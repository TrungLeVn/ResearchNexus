import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Link as LinkIcon, Save, Plus, Trash2, ChevronLeft, ChevronRight, ExternalLink, Sparkles, Loader2, Bot, X, StickyNote as NoteIcon, ArrowRight, Briefcase, Lightbulb } from 'lucide-react';
import { JournalEntry, LinkResource, StickyNote, Idea, AcademicYearDoc } from '../types';
import { suggestJournalPlan } from '../services/gemini';
import { subscribeToJournal, saveJournalEntry, saveIdea, saveAdminDoc } from '../services/firebase';
import { AIChat } from './AIChat';

export const JournalModule: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
    const [entry, setEntry] = useState<JournalEntry>({
        id: '',
        date: new Date().toISOString().split('T')[0],
        content: '',
        notes: [],
        tasks: [],
        links: []
    });
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Sticky Note State
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

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
            // Backward compatibility: If no notes but content exists, create a default note
            let initNotes = existing.notes || [];
            if (initNotes.length === 0 && existing.content) {
                initNotes = [{
                    id: `migrated-${Date.now()}`,
                    title: 'Daily Log',
                    content: existing.content,
                    color: 'yellow',
                    createdAt: new Date().toISOString()
                }];
            }
            setEntry({ ...existing, notes: initNotes });
        } else {
            setEntry({
                id: `journal-${dateStr}`, // Consistent ID format for quick lookup
                date: dateStr,
                content: '',
                notes: [],
                tasks: [],
                links: []
            });
        }
    }, [selectedDate, allEntries]);

    const handleSave = async (updatedEntry = entry) => {
        setIsSaving(true);
        try {
            await saveJournalEntry(updatedEntry);
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
        setActiveNoteId(null);
    };

    const toggleTask = (taskId: string) => {
        const newTasks = entry.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
        const updatedEntry = { ...entry, tasks: newTasks };
        setEntry(updatedEntry);
        handleSave(updatedEntry);
    };

    const addTask = () => {
        const text = prompt("New Task:");
        if (text) {
            const updatedEntry = {
                ...entry,
                tasks: [...entry.tasks, { id: Date.now().toString(), text, done: false }]
            };
            setEntry(updatedEntry);
            handleSave(updatedEntry);
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
            handleSave(updatedEntry);
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
            handleSave(updatedEntry);
        }
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedEntry = {...entry, tasks: entry.tasks.filter(t => t.id !== taskId)};
        setEntry(updatedEntry);
        handleSave(updatedEntry);
    };

    const handleDeleteLink = (linkId: string) => {
        const updatedEntry = {...entry, links: entry.links.filter(l => l.id !== linkId)};
        setEntry(updatedEntry);
        handleSave(updatedEntry);
    };

    // --- STICKY NOTE LOGIC ---

    const addStickyNote = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString();
        
        const newNote: StickyNote = {
            id: `note-${Date.now()}`,
            title: `${dateString} - ${timeString}`,
            content: '',
            color: 'yellow',
            createdAt: now.toISOString()
        };

        const updatedEntry = {
            ...entry,
            notes: [newNote, ...(entry.notes || [])]
        };
        setEntry(updatedEntry);
        handleSave(updatedEntry);
        setActiveNoteId(newNote.id);
    };

    const updateStickyNote = (id: string, updates: Partial<StickyNote>) => {
        const updatedNotes = (entry.notes || []).map(note => 
            note.id === id ? { ...note, ...updates } : note
        );
        const updatedEntry = { ...entry, notes: updatedNotes };
        setEntry(updatedEntry);
    };

    const deleteStickyNote = (id: string) => {
        if (!window.confirm("Delete this note?")) return;
        const updatedNotes = (entry.notes || []).filter(n => n.id !== id);
        const updatedEntry = { ...entry, notes: updatedNotes };
        setEntry(updatedEntry);
        handleSave(updatedEntry);
        if (activeNoteId === id) setActiveNoteId(null);
    };

    const convertToIdea = (note: StickyNote) => {
        const newTitle = prompt("New Idea Title:", note.title.includes('-') ? "New Idea" : note.title);
        if (!newTitle) return;

        const idea: Idea = {
            id: `idea-${Date.now()}`,
            title: newTitle,
            description: `Generated from Journal Note on ${note.createdAt.split('T')[0]}`,
            content: note.content,
            relatedResources: [],
            aiEnhanced: false
        };
        saveIdea(idea);
        alert("Note converted to Research Idea!");
    };

    const convertToAdmin = (note: StickyNote) => {
        const newTitle = prompt("Admin Note/Meeting Title:", note.title);
        if (!newTitle) return;

        const doc: AcademicYearDoc = {
            id: `admin-note-${Date.now()}`,
            name: newTitle,
            type: 'doc', // Using generic doc type
            year: '2023-2024', // Default, user can move later
            url: '', // No external URL, uses content
            category: 'Meeting',
            content: note.content
        };
        saveAdminDoc(doc);
        alert("Note converted to Admin Meeting Note!");
    };

    const renderStickyBoard = () => {
        const notes = entry.notes || [];

        return (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <NoteIcon className="w-4 h-4 text-amber-500" /> Sticky Board
                    </h3>
                    <button 
                        onClick={addStickyNote}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Note
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-slate-100/50 rounded-xl border border-slate-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notes.map(note => (
                            <div 
                                key={note.id}
                                className={`group relative p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col min-h-[180px] border ${
                                    note.color === 'yellow' ? 'bg-amber-50 border-amber-100' :
                                    note.color === 'blue' ? 'bg-blue-50 border-blue-100' :
                                    note.color === 'rose' ? 'bg-rose-50 border-rose-100' :
                                    note.color === 'green' ? 'bg-emerald-50 border-emerald-100' :
                                    'bg-purple-50 border-purple-100'
                                }`}
                                onClick={() => setActiveNoteId(note.id)}
                            >
                                {/* Header / Title */}
                                <div className="flex justify-between items-start mb-2">
                                    <input 
                                        className="bg-transparent font-bold text-sm text-slate-700 outline-none w-full"
                                        value={note.title}
                                        onChange={(e) => updateStickyNote(note.id, { title: e.target.value })}
                                        placeholder="Note Title"
                                        onBlur={() => handleSave()}
                                    />
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteStickyNote(note.id); }}
                                            className="p-1 hover:bg-white/50 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <textarea 
                                    className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-slate-600 leading-relaxed font-medium"
                                    placeholder="Write your thought..."
                                    value={note.content}
                                    onChange={(e) => updateStickyNote(note.id, { content: e.target.value })}
                                    onBlur={() => handleSave()}
                                />

                                {/* Footer Actions */}
                                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1">
                                        {['yellow', 'blue', 'rose', 'green', 'purple'].map((color) => (
                                            <button
                                                key={color}
                                                onClick={(e) => { e.stopPropagation(); updateStickyNote(note.id, { color: color as any }); handleSave(); }}
                                                className={`w-3 h-3 rounded-full ${
                                                    color === 'yellow' ? 'bg-amber-300' :
                                                    color === 'blue' ? 'bg-blue-300' :
                                                    color === 'rose' ? 'bg-rose-300' :
                                                    color === 'green' ? 'bg-emerald-300' : 'bg-purple-300'
                                                } hover:scale-125 transition-transform`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); convertToIdea(note); }}
                                            className="p-1 hover:bg-white/50 rounded text-slate-500" 
                                            title="Convert to Research Idea"
                                        >
                                            <Lightbulb className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); convertToAdmin(note); }}
                                            className="p-1 hover:bg-white/50 rounded text-slate-500"
                                            title="Convert to Admin Doc/Note"
                                        >
                                            <Briefcase className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Empty State / Quick Add */}
                        <button 
                            onClick={addStickyNote}
                            className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all min-h-[180px]"
                        >
                            <Plus className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">New Sticky Note</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 relative">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Daily Journal
                    </h1>
                    <p className="text-slate-500">Track your daily work, progress, and thoughts.</p>
                </div>
                <div className="flex items-center gap-4">
                     {/* Chat Toggle Button */}
                     <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm transition-all ${showChat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Bot className="w-4 h-4" />
                        <span>Reflect AI</span>
                    </button>

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
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden relative">
                {/* Main Note Area (Sticky Board) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden p-4">
                    {renderStickyBoard()}
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

            {/* Chat Slide-Over */}
            {showChat && (
                <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-600" /> Reflection Coach
                        </h3>
                        <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AIChat moduleContext={{ type: 'journal', data: allEntries }} />
                    </div>
                </div>
            )}
        </div>
    );
};