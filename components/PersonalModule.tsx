
import React, { useState } from 'react';
import { Target, TrendingUp, Heart, Book, Dumbbell, Star, CheckCircle } from 'lucide-react';
import { PersonalGoal } from '../types';

export const PersonalModule: React.FC = () => {
    const [goals, setGoals] = useState<PersonalGoal[]>([
        { id: '1', title: 'Read 20 Books', category: 'Learning', progress: 35, target: '20 books' },
        { id: '2', title: 'Marathon Training', category: 'Fitness', progress: 60, target: '42km' },
        { id: '3', title: 'Learn Spanish', category: 'Hobby', progress: 10, target: 'B1 Level' }
    ]);

    return (
        <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Target className="w-6 h-6 text-rose-500" />
                        Personal Growth
                    </h1>
                    <p className="text-slate-500">Track habits, fitness, and self-improvement goals.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => (
                    <div key={goal.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
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
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{goal.title}</h3>
                        <p className="text-sm text-slate-500 mb-6">Target: {goal.target}</p>
                        
                        <div className="mt-auto">
                            <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
                                <span>Progress</span>
                                <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                <div 
                                    className={`h-full rounded-full transition-all ${
                                        goal.category === 'Fitness' ? 'bg-emerald-500' :
                                        goal.category === 'Learning' ? 'bg-blue-500' : 'bg-rose-500'
                                    }`} 
                                    style={{width: `${goal.progress}%`}}
                                ></div>
                            </div>
                            <button className="w-full py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Update Progress
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add New Goal Card */}
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer min-h-[250px]">
                    <Star className="w-8 h-8 mb-2" />
                    <span className="font-medium">Set New Goal</span>
                </div>
            </div>
            
            {/* Habits Placeholder */}
            <div className="mt-12">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" /> Habit Tracker
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500">
                    <p className="mb-2">Streak visualization coming soon.</p>
                    <p className="text-xs">Track daily habits like Reading, Meditation, and Exercise.</p>
                </div>
            </div>
        </div>
    );
};
