
import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Save, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles, Loader2, Bot, X, StickyNote as NoteIcon, Briefcase, Lightbulb, PenTool, Maximize2, MoreHorizontal, FileText } from 'lucide-react';
import { JournalEntry, StickyNote, Idea, AcademicYearDoc } from '../types';
import { generateDailyTasksFromDescription } from '../services/gemini';
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
    const [showChat, setShowChat] = useState(false);
    
    // Daily Goal Input State
    const [dailyGoalDescription, setDailyGoalDescription] = useState('');

    // Sticky Note State
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

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
        try {
            await saveJournalEntry(updatedEntry);
        } catch (error) {
            console.error(error);
            alert("Failed to save entry.");
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
        setActiveNoteId(null);
        setExpandedNoteId(null);
        setDailyGoalDescription('');
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

    const handleGenerateDailyTasks = async () => {
        if (!dailyGoalDescription.trim()) return;
        setIsGeneratingPlan(true);
        try {
            const dateStr = selectedDate.toDateString();
            const suggestions = await generateDailyTasksFromDescription(dailyGoalDescription, dateStr);
            
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
            setDailyGoalDescription('');
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedEntry = {...entry, tasks: entry.tasks.filter(t => t.id !== taskId)};
        setEntry(updatedEntry);
        handleSave(updatedEntry);
    };

    // --- STICKY NOTE LOGIC ---

    const addStickyNote = (templateType: 'blank' | 'meeting' | 'research' = 'blank') => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString();
        
        let title = `${dateString} - ${timeString}`;
        let content = '';
        let color: StickyNote['color'] = 'yellow';

        if (templateType === 'meeting') {
            title = 'Meeting Minutes';
            // Google Docs Meeting Notes Structure
            content = `**Attendees:** \n- \n\n**Agenda:**\n1. \n2. \n\n**Notes:**\n\n\n**Action Items:**\n- [ ] `;
            color = 'blue'; // We'll interpret 'blue' as Word Doc style in render if title implies meeting
        } else if (templateType === 'research') {
            title = 'Research Idea';
            content = `**Concept:**\n\n**Hypothesis:**\n\n**References/Links:**\n- `;
            color = 'purple';
        }

        const newNote: StickyNote = {
            id: `note-${Date.now()}`,
            title,
            content,
            color,
            createdAt: now.toISOString()
        };

        const updatedEntry = {
            ...entry,
            notes: [newNote, ...(entry.notes || [])]
        };
        setEntry(updatedEntry);
        handleSave(updatedEntry);
        setActiveNoteId(newNote.id);
        setShowTemplates(false);
        
        // Auto-expand new notes if not blank for easier typing
        if (templateType !== 'blank') {
            setExpandedNoteId(newNote.id);
        }
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

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 relative">
             <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Daily Journal
                    </h1>
                    <p className="text-slate-500">Log your thoughts, tasks, and meetings for the day.</p>
                </div>
                 <button 
                    onClick={() => setShowChat(!showChat)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm transition-all ${showChat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                >
                    <Bot className="w-4 h-4" />
                    <span>Journal AI</span>
                </button>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* LEFT: Daily Control & Tasks */}
                <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
                     {/* Date Nav */}
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                         <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
                         <div className="text-center">
                             <h3 className="font-bold text-lg text-slate-800">{selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}</h3>
                             <p className="text-xs text-slate-500">{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                         </div>
                         <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight className="w-5 h-5" /></button>
                     </div>

                     {/* Daily Focus / AI Plan */}
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                         <h4 className="text-sm font-bold text-indigo-600 uppercase mb-2 flex items-center gap-2">
                             <Sparkles className="w-4 h-4" /> Daily Focus
                         </h4>
                         <div className="flex gap-2 mb-2">
                             <input 
                                value={dailyGoalDescription}
                                onChange={e => setDailyGoalDescription(e.target.value)}
                                className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                                placeholder="What's your main goal today?"
                                onKeyDown={e => e.key === 'Enter' && handleGenerateDailyTasks()}
                             />
                             <button 
                                onClick={handleGenerateDailyTasks}
                                disabled={isGeneratingPlan || !dailyGoalDescription}
                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                             </button>
                         </div>
                     </div>

                     {/* Tasks List */}
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <CheckSquare className="w-4 h-4" /> Checklist
                            </h4>
                            <button onClick={addTask} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-medium">+ Add</button>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                             {(entry.tasks || []).map(task => (
                                 <div key={task.id} className="group flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                     <button 
                                        onClick={() => toggleTask(task.id)}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                                     >
                                         {task.done && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                     </button>
                                     <span className={`text-sm flex-1 ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                         {task.text}
                                     </span>
                                     <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </div>
                             ))}
                             {(entry.tasks || []).length === 0 && (
                                 <p className="text-center text-xs text-slate-400 italic mt-4">No tasks yet. Use the AI Focus box above!</p>
                             )}
                         </div>
                     </div>
                </div>

                {/* RIGHT: Sticky Note Board (Word Widget Support) */}
                <div className="lg:col-span-2 bg-slate-100 rounded-xl border border-slate-200 p-6 overflow-y-auto relative flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-600 flex items-center gap-2">
                            <NoteIcon className="w-5 h-5" /> Notes & Thoughts
                        </h3>
                        <div className="relative">
                            <button 
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm font-medium"
                            >
                                <Plus className="w-4 h-4" /> New Note
                            </button>
                            {showTemplates && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-10 overflow-hidden animate-in fade-in zoom-in-95">
                                    <button onClick={() => addStickyNote('blank')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                        <NoteIcon className="w-4 h-4 text-yellow-500" /> Blank Note
                                    </button>
                                    <button onClick={() => addStickyNote('meeting')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                        <Briefcase className="w-4 h-4 text-blue-500" /> Meeting Minute
                                    </button>
                                    <button onClick={() => addStickyNote('research')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                        <Lightbulb className="w-4 h-4 text-purple-500" /> Research Idea
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min pb-10">
                        {(entry.notes || []).map(note => {
                            const isMeetingNote = note.title === 'Meeting Minutes' || note.content.includes('**Agenda:**');
                            const isExpanded = expandedNoteId === note.id;

                            // Word Doc Style Classes vs Sticky Note Classes
                            const containerClasses = isMeetingNote 
                                ? `bg-white border border-slate-200 shadow-md` // Word Doc Style
                                : `shadow-sm border-0 ${
                                    note.color === 'yellow' ? 'bg-yellow-100 text-yellow-900' :
                                    note.color === 'blue' ? 'bg-sky-100 text-sky-900' :
                                    note.color === 'rose' ? 'bg-rose-100 text-rose-900' :
                                    note.color === 'green' ? 'bg-emerald-100 text-emerald-900' :
                                    'bg-purple-100 text-purple-900'
                                }`; // Classic Sticky Style

                            return (
                                <div 
                                    key={note.id} 
                                    className={`relative p-4 rounded-lg transition-all duration-300 group flex flex-col ${containerClasses} ${isExpanded ? 'md:col-span-2 row-span-2 min-h-[400px]' : 'min-h-[200px]'}`}
                                >
                                    {/* Header */}
                                    <div className={`flex justify-between items-start mb-2 ${isMeetingNote ? 'border-b border-slate-100 pb-2' : ''}`}>
                                        <input 
                                            value={note.title}
                                            onChange={(e) => updateStickyNote(note.id, { title: e.target.value })}
                                            className="bg-transparent font-bold text-sm outline-none w-full mr-8 truncate"
                                            placeholder="Note Title"
                                        />
                                        <div className="absolute top-4 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setExpandedNoteId(isExpanded ? null : note.id)} className="p-1 hover:bg-black/10 rounded">
                                                <Maximize2 className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => deleteStickyNote(note.id)} className="p-1 hover:bg-red-500/20 hover:text-red-700 rounded">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <textarea 
                                        value={note.content}
                                        onChange={(e) => updateStickyNote(note.id, { content: e.target.value })}
                                        onBlur={() => handleSave()}
                                        className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed w-full ${isMeetingNote ? 'font-serif text-slate-800' : ''}`}
                                        placeholder={isMeetingNote ? "Type meeting notes..." : "Write something..."}
                                    />
                                    
                                    {/* Footer (Timestamp) */}
                                    <div className="mt-2 text-[10px] opacity-50 flex justify-between items-center">
                                        <span>{new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        {isMeetingNote && <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> Doc</span>}
                                    </div>
                                </div>
                            );
                        })}
                        {(entry.notes || []).length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                                <PenTool className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>Click "New Note" to add thoughts or meeting minutes.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Slide-Over */}
             {showChat && (
                <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                     <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-600" /> Journal Companion
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
