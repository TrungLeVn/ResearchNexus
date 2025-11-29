
import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Heart, Book, Dumbbell, Star, CheckCircle, Sparkles, Loader2, Plus, Calendar, ChevronRight, Check, X, FileEdit, MessageSquare, Trash2, Bot, ChevronLeft, CalendarDays, BarChart2, Eye, EyeOff } from 'lucide-react';
import { PersonalGoal, Habit, GoalMilestone, GoalLog } from '../types';
import { generateGoalMilestones } from '../services/gemini';
import { subscribeToPersonalGoals, subscribeToHabits, savePersonalGoal, deletePersonalGoal, saveHabit, deleteHabit } from '../services/firebase';
import { AIChat } from './AIChat';

// --- SUB-COMPONENTS ---

interface CreateGoalModalProps {
    onClose: () => void;
    onSave: (goal: PersonalGoal) => void;
}

const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<'Fitness' | 'Learning' | 'Hobby'>('Learning');
    const [target, setTarget] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMilestones, setGeneratedMilestones] = useState<string[]>([]);
    
    const handleGenerate = async () => {
        if (!title || !target) return;
        setIsGenerating(true);
        try {
            const steps = await generateGoalMilestones(title, target);
            setGeneratedMilestones(steps);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        if (!title) return;
        
        const milestones: GoalMilestone[] = generatedMilestones.map((m, idx) => ({
            id: `gm-${Date.now()}-${idx}`,
            title: m,
            completed: false
        }));

        const newGoal: PersonalGoal = {
            id: `goal-${Date.now()}`,
            title,
            category,
            target,
            progress: 0,
            milestones,
            logs: []
        };
        onSave(newGoal);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" /> Set New Goal
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Goal Title</label>
                        <input 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            placeholder="e.g. Run a Marathon"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                value={category}
                                onChange={e => setCategory(e.target.value as any)}
                            >
                                <option value="Learning">Learning</option>
                                <option value="Fitness">Fitness</option>
                                <option value="Hobby">Hobby</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Metric</label>
                            <input 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                placeholder="e.g. 42km or 20 books"
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* AI Plan Generation Area */}
                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold text-indigo-900">Action Plan</h4>
                            <button 
                                onClick={handleGenerate}
                                disabled={!title || !target || isGenerating}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isGenerating ? 'Thinking...' : 'Generate with Gemini'}
                            </button>
                        </div>
                        
                        {generatedMilestones.length > 0 ? (
                            <div className="space-y-2 mt-3">
                                {generatedMilestones.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-indigo-800 bg-white p-2 rounded border border-indigo-100">
                                        <div className="mt-0.5 w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        {step}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-indigo-400 italic text-center py-4">
                                Enter details above and click Generate to let Gemini plan your milestones.
                            </p>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!title || generatedMilestones.length === 0}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Create Goal
                    </button>
                </div>
            </div>
        </div>
    );
};

interface GoalDetailViewProps {
    goal: PersonalGoal;
    onClose: () => void;
    onUpdate: (goal: PersonalGoal) => void;
    onDelete: (id: string) => void;
}

const GoalDetailView: React.FC<GoalDetailViewProps> = ({ goal, onClose, onUpdate, onDelete }) => {
    const [newLog, setNewLog] = useState('');
    
    const toggleMilestone = (id: string) => {
        const updatedMilestones = goal.milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const newProgress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;
        onUpdate({ ...goal, milestones: updatedMilestones, progress: newProgress });
    };

    const addLog = () => {
        if (!newLog.trim()) return;
        const log: GoalLog = {
            id: `log-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            content: newLog
        };
        onUpdate({ ...goal, logs: [log, ...goal.logs] });
        setNewLog('');
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{goal.title}</h3>
                    <div className="flex gap-2">
                         <button 
                             onClick={() => { if (window.confirm("Delete this goal?")) onDelete(goal.id); }}
                             className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                         >
                             <Trash2 className="w-4 h-4" />
                         </button>
                         <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* Left: Milestones */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-600">Milestones ({goal.milestones.filter(m=>m.completed).length}/{goal.milestones.length})</h4>
                        {goal.milestones.map(m => (
                            <div key={m.id} className="flex items-center gap-3">
                                <button onClick={() => toggleMilestone(m.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${m.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                    {m.completed && <Check className="w-3 h-3 text-white" />}
                                </button>
                                <span className={`text-sm ${m.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.title}</span>
                            </div>
                        ))}
                    </div>

                    {/* Right: Logs */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-600 mb-3">Progress Log</h4>
                        <div className="flex gap-2">
                             <input 
                                value={newLog}
                                onChange={e => setNewLog(e.target.value)}
                                className="flex-1 border border-slate-300 rounded-lg p-2 text-sm"
                                placeholder="Add a quick update..."
                                onKeyDown={e => e.key === 'Enter' && addLog()}
                             />
                             <button onClick={addLog} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Log</button>
                        </div>
                        <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-2">
                            {goal.logs.map(log => (
                                <div key={log.id} className="text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p className="font-medium text-slate-700">{log.content}</p>
                                    <p className="text-xs text-slate-400 mt-1">{new Date(log.date).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
};

// --- HELPER FOR CALENDAR ---
const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Days in month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }
    
    return days;
};

// Recalculate streak based on history
const calculateStreak = (history: string[]) => {
    if (!history || history.length === 0) return 0;
    
    // Sort desc
    const sorted = [...history].sort().reverse();
    
    let streak = 1;
    
    // Check gaps
    for (let i = 0; i < sorted.length - 1; i++) {
        const curr = new Date(sorted[i]);
        const prev = new Date(sorted[i+1]);
        
        // Normalize time
        curr.setHours(0,0,0,0);
        prev.setHours(0,0,0,0);

        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    
    // Validate if current streak is still active (i.e. last entry was today or yesterday)
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    const lastEntryDate = new Date(sorted[0]);
    lastEntryDate.setHours(0,0,0,0);
    
    const dayDiff = (todayDate.getTime() - lastEntryDate.getTime()) / (1000 * 3600 * 24);
    
    if (dayDiff > 1) return 0;

    return streak;
};

// --- MAIN COMPONENT ---
export const PersonalModule: React.FC = () => {
    const [goals, setGoals] = useState<PersonalGoal[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [showCreateGoal, setShowCreateGoal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<PersonalGoal | null>(null);
    const [newHabit, setNewHabit] = useState('');
    
    // Calendar State
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Focus State (for visualizing one habit on the calendar)
    const [focusedHabitId, setFocusedHabitId] = useState<string | null>(null);
    const [hoveredHabitId, setHoveredHabitId] = useState<string | null>(null);

    useEffect(() => {
        const unsubGoals = subscribeToPersonalGoals(setGoals);
        const unsubHabits = subscribeToHabits(setHabits);
        return () => {
            unsubGoals();
            unsubHabits();
        };
    }, []);

    const handleSaveGoal = (goal: PersonalGoal) => {
        savePersonalGoal(goal);
        setShowCreateGoal(false);
    };

    const handleUpdateGoal = (goal: PersonalGoal) => {
        savePersonalGoal(goal);
        if (selectedGoal && selectedGoal.id === goal.id) {
            setSelectedGoal(goal);
        }
    };
    
    const handleDeleteGoal = (id: string) => {
        deletePersonalGoal(id);
        setSelectedGoal(null);
    };

    const handleAddHabit = () => {
        if (!newHabit.trim()) return;
        const habit: Habit = {
            id: `habit-${Date.now()}`,
            title: newHabit,
            streak: 0,
            history: []
        };
        saveHabit(habit);
        setNewHabit('');
    };

    const handleDeleteHabit = (id: string) => {
        if(window.confirm("Are you sure you want to delete this habit and its history?")) {
            deleteHabit(id);
            if (focusedHabitId === id) setFocusedHabitId(null);
        }
    };

    const toggleHabitForDate = (habit: Habit, dateStr: string) => {
        let newHistory;
        if (habit.history.includes(dateStr)) {
            newHistory = habit.history.filter(d => d !== dateStr);
        } else {
            newHistory = [...habit.history, dateStr];
        }
        
        const newStreak = calculateStreak(newHistory);
        saveHabit({ ...habit, history: newHistory, streak: newStreak });
    };

    const getCategoryIcon = (category: PersonalGoal['category']) => {
        if (category === 'Fitness') return <Dumbbell className="w-5 h-5 text-red-500" />;
        if (category === 'Learning') return <Book className="w-5 h-5 text-blue-500" />;
        return <Star className="w-5 h-5 text-amber-500" />;
    };
    
    const currentMonthDays = getDaysInMonth(viewDate);
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Determine which habit to visualize on the calendar (Focused or Hovered)
    const activeVisualHabitId = hoveredHabitId || focusedHabitId;

    // Calculate daily completion status for color coding
    const getDayCompletionColor = (dateStr: string) => {
        // If focusing on a specific habit, show binary status (Done/Not Done)
        if (activeVisualHabitId) {
            const habit = habits.find(h => h.id === activeVisualHabitId);
            if (habit && habit.history.includes(dateStr)) {
                return 'bg-indigo-600 text-white shadow-md';
            }
            return 'bg-slate-50 text-slate-300';
        }

        // Aggregate View
        if (habits.length === 0) return 'bg-slate-50 text-slate-400';
        
        const completedCount = habits.filter(h => h.history.includes(dateStr)).length;
        const percentage = completedCount / habits.length;

        if (percentage === 0) return 'bg-slate-50 text-slate-400 hover:bg-slate-100';
        if (percentage < 0.4) return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
        if (percentage < 0.8) return 'bg-emerald-300 text-emerald-800 hover:bg-emerald-400';
        return 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 relative">
            {showCreateGoal && <CreateGoalModal onClose={() => setShowCreateGoal(false)} onSave={handleSaveGoal} />}
            {selectedGoal && <GoalDetailView goal={selectedGoal} onClose={() => setSelectedGoal(null)} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} />}
            
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Target className="w-6 h-6 text-indigo-600" />
                        Personal Growth
                    </h1>
                    <p className="text-slate-500">Track goals, build habits, and reflect on your progress.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm transition-all ${showChat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Bot className="w-4 h-4" />
                        <span>Growth AI</span>
                    </button>
                    <button 
                        onClick={() => setShowCreateGoal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Goal
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Left Column: Goals */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-4 overflow-hidden">
                     <h3 className="font-semibold text-slate-700 mb-4 px-2 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" /> Active Goals
                     </h3>
                     <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                         {goals.map(goal => (
                             <div 
                                 key={goal.id} 
                                 onClick={() => setSelectedGoal(goal)}
                                 className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md cursor-pointer transition-all group"
                             >
                                 <div className="flex justify-between items-start">
                                     <div className="flex items-center gap-3">
                                         <div className="p-2 bg-white rounded-lg border">{getCategoryIcon(goal.category)}</div>
                                         <div>
                                            <h4 className="font-bold text-slate-800">{goal.title}</h4>
                                            <p className="text-xs text-slate-500">{goal.target}</p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <span className="font-medium">{goal.progress}%</span>
                                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                     </div>
                                 </div>
                                 <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{width: `${goal.progress}%`}}></div>
                                 </div>
                             </div>
                         ))}
                         {goals.length === 0 && <p className="text-center text-sm text-slate-400 py-8">No goals set yet.</p>}
                     </div>
                </div>

                {/* Right Column: Unified Habit Tracker */}
                <div className="flex flex-col gap-6 h-full overflow-hidden">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                        {/* Calendar Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <div>
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-indigo-600" /> Habit Calendar
                                </h3>
                                {activeVisualHabitId ? (
                                    <p className="text-xs text-indigo-600 font-medium mt-1 ml-7 flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> Viewing: {habits.find(h => h.id === activeVisualHabitId)?.title}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-1 ml-7">Overview Mode</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="hover:bg-slate-100 p-1 rounded"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="font-bold w-24 text-center text-slate-800">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="hover:bg-slate-100 p-1 rounded"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        {/* Master Calendar Grid */}
                        <div className="p-4">
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                    <div key={i} className="text-[10px] font-bold text-slate-400 uppercase text-center">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: currentMonthDays[0].getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`} className="w-full aspect-square"></div>
                                ))}
                                {currentMonthDays.map((date) => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isSelected = dateStr === selectedDateStr;
                                    const isToday = dateStr === todayStr;
                                    const colorClass = getDayCompletionColor(dateStr);
                                    
                                    return (
                                        <button 
                                            key={dateStr} 
                                            onClick={() => setSelectedDate(date)}
                                            className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative ${colorClass} ${
                                                isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 z-10' : ''
                                            }`}
                                        >
                                            <span className={`text-xs ${isToday ? 'font-bold underline' : ''}`}>{date.getDate()}</span>
                                            {/* Optional: Dot for perfect day */}
                                            {!activeVisualHabitId && habits.length > 0 && habits.every(h => h.history.includes(dateStr)) && (
                                                 <div className="w-1 h-1 rounded-full bg-white mt-0.5"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Daily Check-in List */}
                        <div className="flex-1 bg-slate-50 p-4 border-t border-slate-200 overflow-y-auto">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                Check-ins for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </h4>
                            
                            <div className="space-y-2 mb-4">
                                {habits.map(habit => {
                                    const isDone = habit.history.includes(selectedDateStr);
                                    const isFocused = focusedHabitId === habit.id;

                                    return (
                                        <div 
                                            key={habit.id} 
                                            className={`flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm group transition-all ${
                                                isFocused || hoveredHabitId === habit.id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'
                                            }`}
                                            onMouseEnter={() => setHoveredHabitId(habit.id)}
                                            onMouseLeave={() => setHoveredHabitId(null)}
                                        >
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer flex-1"
                                                onClick={() => toggleHabitForDate(habit, selectedDateStr)}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-slate-50'
                                                }`}>
                                                    {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <span className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                    {habit.title}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {/* Focus Toggle */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setFocusedHabitId(isFocused ? null : habit.id); }}
                                                    className={`p-1.5 rounded transition-colors ${isFocused ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                                    title={isFocused ? "Unfocus Calendar" : "Focus Calendar on this Habit"}
                                                >
                                                    {isFocused ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>

                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                                                    <TrendingUp className="w-3 h-3" />
                                                    {habit.streak}
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteHabit(habit.id)}
                                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {habits.length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                                        <p className="text-sm text-slate-400">No habits tracked yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Habit Setup Section */}
                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Habit Setup</h4>
                                <div className="flex gap-2">
                                    <input 
                                        value={newHabit}
                                        onChange={e => setNewHabit(e.target.value)}
                                        className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Define new habit..."
                                        onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                                    />
                                    <button onClick={handleAddHabit} className="px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium">
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Slide-Over */}
            {showChat && (
                <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                     <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-600" /> Growth Coach
                        </h3>
                        <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AIChat moduleContext={{ type: 'personal', data: { goals, habits } }} />
                    </div>
                </div>
            )}
        </div>
    );
};
