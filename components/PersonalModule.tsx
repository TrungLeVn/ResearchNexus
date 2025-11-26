

import React, { useState } from 'react';
import { Target, TrendingUp, Heart, Book, Dumbbell, Star, CheckCircle, Sparkles, Loader2, Plus, Calendar, ChevronRight, Check, X, FileEdit, MessageSquare, Trash2 } from 'lucide-react';
import { PersonalGoal, Habit, GoalMilestone, GoalLog } from '../types';
import { generateGoalMilestones } from '../services/gemini';

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
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!title}
                        className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                        Start Goal
                    </button>
                </div>
            </div>
        </div>
    );
};

interface GoalDetailModalProps {
    goal: PersonalGoal;
    onClose: () => void;
    onUpdate: (updated: PersonalGoal) => void;
    onDelete: (id: string) => void;
}

const GoalDetailModal: React.FC<GoalDetailModalProps> = ({ goal, onClose, onUpdate, onDelete }) => {
    const [progress, setProgress] = useState(goal.progress);
    const [newLog, setNewLog] = useState('');
    const [showLogs, setShowLogs] = useState(false);

    const handleSaveProgress = () => {
        onUpdate({ ...goal, progress });
    };

    const toggleMilestone = (mId: string) => {
        const updatedMilestones = goal.milestones.map(m => 
            m.id === mId ? { ...m, completed: !m.completed } : m
        );
        // Auto-calc progress based on milestones if meaningful
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const autoProgress = Math.round((completedCount / updatedMilestones.length) * 100);
        
        onUpdate({ 
            ...goal, 
            milestones: updatedMilestones,
            progress: updatedMilestones.length > 0 ? autoProgress : goal.progress
        });
        if(updatedMilestones.length > 0) setProgress(autoProgress);
    };

    const addLog = () => {
        if (!newLog.trim()) return;
        const log: GoalLog = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            content: newLog
        };
        onUpdate({ ...goal, logs: [log, ...goal.logs] });
        setNewLog('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                goal.category === 'Fitness' ? 'bg-emerald-100 text-emerald-700' :
                                goal.category === 'Learning' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                                {goal.category}
                            </span>
                            <span className="text-xs text-slate-500">Started recently</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{goal.title}</h2>
                        <p className="text-sm text-slate-500">Target: {goal.target}</p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Progress Section */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-semibold text-slate-700">Current Progress</label>
                            <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={progress}
                            onChange={(e) => setProgress(parseInt(e.target.value))}
                            onMouseUp={handleSaveProgress}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Milestones */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Milestones
                            </h3>
                            <div className="space-y-2">
                                {goal.milestones.map(m => (
                                    <div 
                                        key={m.id} 
                                        onClick={() => toggleMilestone(m.id)}
                                        className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                                            m.completed 
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                            m.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                        }`}>
                                            {m.completed && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-sm ${m.completed ? 'line-through opacity-70' : ''}`}>{m.title}</span>
                                    </div>
                                ))}
                                {goal.milestones.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No milestones set. Use AI to plan next time!</p>
                                )}
                            </div>
                        </div>

                        {/* Logs / Notes */}
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <FileEdit className="w-4 h-4 text-blue-500" /> Journal Logs
                                </h3>
                                <button onClick={() => setShowLogs(!showLogs)} className="text-xs text-indigo-600 hover:underline">
                                    {showLogs ? 'Hide' : 'View All'}
                                </button>
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                                <input 
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="Add a quick note..."
                                    value={newLog}
                                    onChange={e => setNewLog(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addLog()}
                                />
                                <button onClick={addLog} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                {goal.logs.map(log => (
                                    <div key={log.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                        <p className="text-slate-700 mb-1">{log.content}</p>
                                        <p className="text-[10px] text-slate-400 text-right">{log.date}</p>
                                    </div>
                                ))}
                                {goal.logs.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No notes added.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
                     <button onClick={() => onDelete(goal.id)} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete Goal
                     </button>
                     <button onClick={onClose} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                        Done
                     </button>
                </div>
            </div>
        </div>
    );
};

// --- HABIT TRACKER ---

const HabitTracker: React.FC<{ habits: Habit[], onToggle: (id: string, date: string) => void, onDelete: (id: string) => void, onAdd: (title: string) => void }> = ({ habits, onToggle, onDelete, onAdd }) => {
    const [newHabit, setNewHabit] = useState('');
    
    // Generate last 7 days
    const days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 6 + i);
        return d;
    });

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" /> Habit Tracker
                </h2>
                <div className="flex gap-2">
                    <input 
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-48 outline-none focus:border-indigo-500"
                        placeholder="New habit (e.g. Read 15m)"
                        value={newHabit}
                        onChange={e => setNewHabit(e.target.value)}
                        onKeyDown={e => {
                            if(e.key === 'Enter' && newHabit) {
                                onAdd(newHabit);
                                setNewHabit('');
                            }
                        }}
                    />
                    <button 
                        onClick={() => { if(newHabit) { onAdd(newHabit); setNewHabit(''); }}}
                        className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                    <thead>
                        <tr>
                            <th className="text-left text-xs font-semibold text-slate-400 pb-4 w-1/3">Habit</th>
                            <th className="text-center text-xs font-semibold text-slate-400 pb-4 w-20">Streak</th>
                            {days.map(d => (
                                <th key={d.toString()} className="text-center pb-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-slate-400 uppercase">{d.toLocaleDateString('en-US', {weekday: 'short'})}</span>
                                        <span className={`text-xs font-bold ${d.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-slate-600'}`}>
                                            {d.getDate()}
                                        </span>
                                    </div>
                                </th>
                            ))}
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {habits.map(habit => (
                            <tr key={habit.id} className="group">
                                <td className="py-3 text-sm font-medium text-slate-700">{habit.title}</td>
                                <td className="py-3 text-center">
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">
                                        <Sparkles className="w-3 h-3" /> {habit.streak}
                                    </div>
                                </td>
                                {days.map(d => {
                                    const dateStr = d.toISOString().split('T')[0];
                                    const completed = habit.history.includes(dateStr);
                                    return (
                                        <td key={dateStr} className="py-3 text-center">
                                            <button 
                                                onClick={() => onToggle(habit.id, dateStr)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                    completed 
                                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 scale-100' 
                                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200 scale-90'
                                                }`}
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </td>
                                    );
                                })}
                                <td className="py-3 text-center">
                                    <button 
                                        onClick={() => onDelete(habit.id)}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {habits.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No habits tracked yet. Add one above!
                    </div>
                )}
            </div>
        </div>
    )
}

// --- MAIN COMPONENT ---

export const PersonalModule: React.FC = () => {
    // Initial State
    const [goals, setGoals] = useState<PersonalGoal[]>([
        { 
            id: '1', 
            title: 'Read 20 Books', 
            category: 'Learning', 
            progress: 35, 
            target: '20 books',
            milestones: [
                { id: 'm1', title: 'Read 5 books', completed: true },
                { id: 'm2', title: 'Read 10 books', completed: false }
            ],
            logs: [{ id: 'l1', date: '2023-10-01', content: 'Finished "Atomic Habits". Great read!' }] 
        },
        { 
            id: '2', 
            title: 'Marathon Training', 
            category: 'Fitness', 
            progress: 60, 
            target: '42km',
            milestones: [
                { id: 'm3', title: 'Run 10km', completed: true },
                { id: 'm4', title: 'Run Half Marathon', completed: true },
                { id: 'm5', title: 'Run 30km', completed: false }
            ],
            logs: [] 
        }
    ]);

    const [habits, setHabits] = useState<Habit[]>([
        { id: 'h1', title: 'Morning Meditation', streak: 5, history: [] }, // History would be populated in real app
        { id: 'h2', title: 'No Sugar', streak: 2, history: [] }
    ]);

    const [isCreating, setIsCreating] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<PersonalGoal | null>(null);

    const handleAddGoal = (goal: PersonalGoal) => {
        setGoals([...goals, goal]);
        setIsCreating(false);
    };

    const handleUpdateGoal = (updated: PersonalGoal) => {
        setGoals(goals.map(g => g.id === updated.id ? updated : g));
        if (selectedGoal?.id === updated.id) setSelectedGoal(updated);
    };

    const handleDeleteGoal = (id: string) => {
        if(window.confirm("Delete this goal?")) {
            setGoals(goals.filter(g => g.id !== id));
            setSelectedGoal(null);
        }
    };

    // Habit Logic
    const toggleHabit = (id: string, dateStr: string) => {
        setHabits(habits.map(h => {
            if (h.id !== id) return h;
            
            const exists = h.history.includes(dateStr);
            let newHistory = exists 
                ? h.history.filter(d => d !== dateStr) 
                : [...h.history, dateStr];
            
            // Simple Streak Calc (Just count total for demo, real calc needs consecutive logic)
            // Ideally: sort dates, check gap between dates.
            return {
                ...h,
                history: newHistory,
                streak: newHistory.length // Simplified for UI demo
            };
        }));
    };

    const deleteHabit = (id: string) => {
        setHabits(habits.filter(h => h.id !== id));
    };

    const addHabit = (title: string) => {
        setHabits([...habits, { id: Date.now().toString(), title, streak: 0, history: [] }]);
    };

    return (
        <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500 relative">
            {isCreating && <CreateGoalModal onClose={() => setIsCreating(false)} onSave={handleAddGoal} />}
            {selectedGoal && <GoalDetailModal goal={selectedGoal} onClose={() => setSelectedGoal(null)} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} />}

            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Target className="w-6 h-6 text-rose-500" />
                        Personal Growth
                    </h1>
                    <p className="text-slate-500">Track habits, fitness, and self-improvement goals.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {goals.map(goal => (
                    <div 
                        key={goal.id} 
                        onClick={() => setSelectedGoal(goal)}
                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-lg ${
                                goal.category === 'Fitness' ? 'bg-emerald-50 text-emerald-600' :
                                goal.category === 'Learning' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                                {goal.category === 'Fitness' ? <Dumbbell className="w-6 h-6" /> :
                                 goal.category === 'Learning' ? <Book className="w-6 h-6" /> : <Heart className="w-6 h-6" />}
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{goal.category}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{goal.title}</h3>
                        <p className="text-sm text-slate-500 mb-6">Target: {goal.target}</p>
                        
                        <div className="mt-auto">
                            <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
                                <span>Progress</span>
                                <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all ${
                                        goal.category === 'Fitness' ? 'bg-emerald-500' :
                                        goal.category === 'Learning' ? 'bg-blue-500' : 'bg-rose-500'
                                    }`} 
                                    style={{width: `${goal.progress}%`}}
                                ></div>
                            </div>
                            
                            {/* Milestone Preview */}
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Goal Card */}
                <div 
                    onClick={() => setIsCreating(true)}
                    className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer min-h-[250px]"
                >
                    <Star className="w-8 h-8 mb-2" />
                    <span className="font-medium">Set New Goal</span>
                    <span className="text-xs mt-1 opacity-75">AI Planning Available</span>
                </div>
            </div>
            
            <HabitTracker 
                habits={habits}
                onToggle={toggleHabit}
                onDelete={deleteHabit}
                onAdd={addHabit}
            />
        </div>
    );
};