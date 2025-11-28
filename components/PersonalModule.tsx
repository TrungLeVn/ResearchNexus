

import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Heart, Book, Dumbbell, Star, CheckCircle, Sparkles, Loader2, Plus, Calendar, ChevronRight, Check, X, FileEdit, MessageSquare, Trash2, Bot } from 'lucide-react';
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

// --- MAIN COMPONENT ---
export const PersonalModule: React.FC = () => {
    const [goals, setGoals] = useState<PersonalGoal[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [showCreateGoal, setShowCreateGoal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<PersonalGoal | null>(null);
    const [newHabit, setNewHabit] = useState('');
    
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
        // Also update selectedGoal if it's open
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

    const handleTrackHabit = (habit: Habit) => {
        const today = new Date().toISOString().split('T')[0];
        if (habit.history.includes(today)) return; // Already tracked today
        
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const newStreak = habit.history.includes(yesterday) ? habit.streak + 1 : 1;
        
        saveHabit({ ...habit, history: [...habit.history, today], streak: newStreak });
    };

    const isHabitDoneToday = (habit: Habit) => {
        const today = new Date().toISOString().split('T')[0];
        return habit.history.includes(today);
    };

    const getCategoryIcon = (category: PersonalGoal['category']) => {
        if (category === 'Fitness') return <Dumbbell className="w-5 h-5 text-red-500" />;
        if (category === 'Learning') return <Book className="w-5 h-5 text-blue-500" />;
        return <Star className="w-5 h-5 text-amber-500" />;
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

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Goals */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-4">
                     <h3 className="font-semibold text-slate-700 mb-4 px-2">Active Goals</h3>
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

                {/* Habits */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-4">
                        <h3 className="font-semibold text-slate-700 mb-4 px-2">Habit Tracker</h3>
                        <div className="space-y-3">
                            {habits.map(habit => (
                                <div key={habit.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleTrackHabit(habit)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isHabitDoneToday(habit) ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-300 hover:border-emerald-400 hover:text-emerald-500'}`}
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                        <span className="font-medium text-slate-700">{habit.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                                        <TrendingUp className="w-4 h-4" />
                                        {habit.streak}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                            <input 
                                value={newHabit}
                                onChange={e => setNewHabit(e.target.value)}
                                className="flex-1 border border-slate-300 rounded-lg p-2 text-sm"
                                placeholder="Add a new habit..."
                                onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                            />
                            <button onClick={handleAddHabit} className="p-2 bg-slate-800 text-white rounded-lg"><Plus className="w-4 h-4"/></button>
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