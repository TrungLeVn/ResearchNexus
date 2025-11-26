
import React, { useState } from 'react';
import { BookOpen, Users, ClipboardList, Plus, Search, Calendar, Briefcase, FileText } from 'lucide-react';
import { Course, AdminTask } from '../types';

export const TeachingModule: React.FC = () => {
    // Mock Data
    const [courses] = useState<Course[]>([
        { id: '1', code: 'CS101', name: 'Intro to Computer Science', semester: 'Fall 2024', studentsCount: 120, schedule: 'Mon/Wed 10:00 AM' },
        { id: '2', code: 'AI302', name: 'Advanced Machine Learning', semester: 'Fall 2024', studentsCount: 45, schedule: 'Tue/Thu 2:00 PM' }
    ]);

    const [adminTasks, setAdminTasks] = useState<AdminTask[]>([
        { id: '1', title: 'Submit Department Budget', dueDate: '2024-06-30', status: 'pending', category: 'Department' },
        { id: '2', title: 'Review PhD Applications', dueDate: '2024-05-15', status: 'completed', category: 'Committee' }
    ]);

    return (
        <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-emerald-600" />
                    Teaching & Administration
                </h1>
                <p className="text-slate-500">Manage courses, students, and administrative duties.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Teaching Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" /> Current Courses
                        </h2>
                        <button className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                            <Plus className="w-4 h-4" /> Add Course
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map(course => (
                            <div key={course.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase tracking-wider">
                                        {course.code}
                                    </span>
                                    <span className="text-xs text-slate-400">{course.semester}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{course.name}</h3>
                                <div className="space-y-2 mt-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span>{course.studentsCount} Students</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span>{course.schedule}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                                    <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded hover:bg-slate-100">Syllabus</button>
                                    <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded hover:bg-slate-100">Grades</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Administration Section */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-amber-600" /> Admin Tasks
                        </h2>
                        <button className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex gap-2">
                            <input placeholder="Filter tasks..." className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-300" />
                            <button className="p-1 text-slate-400 hover:text-indigo-600"><Search className="w-4 h-4" /></button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {adminTasks.map(task => (
                                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                                    <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                        {task.status === 'completed' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {task.title}
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-slate-500">{task.category}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                new Date(task.dueDate) < new Date() ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                Due: {task.dueDate}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Quick Forms
                        </h3>
                        <div className="space-y-2">
                            <button className="w-full text-left text-xs text-indigo-700 hover:underline">Expense Reimbursement Form</button>
                            <button className="w-full text-left text-xs text-indigo-700 hover:underline">Leave Request</button>
                            <button className="w-full text-left text-xs text-indigo-700 hover:underline">Grant Application Template</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
