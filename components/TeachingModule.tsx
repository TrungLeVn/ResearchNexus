
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Plus, Calendar, Archive, Sparkles, Loader2, ImageIcon, Search, Clock, Trash2, Bot, X } from 'lucide-react';
import { Course, Reminder } from '../types';
import { generateCourseImage, suggestTeachingPlan } from '../services/gemini';
import { subscribeToCourses, saveCourse, deleteCourse } from '../services/firebase';
import { AIChat } from './AIChat';

// --- SUB-COMPONENTS ---

interface CourseCardProps {
    course: Course;
    isGeneratingImage: boolean;
    onGenerateImage: () => void;
    onArchiveToggle: () => void;
    onDelete: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, isGeneratingImage, onGenerateImage, onArchiveToggle, onDelete }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group">
            <div className="relative h-32 bg-slate-200">
                {isGeneratingImage ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-xs mt-2">Generating image...</p>
                    </div>
                ) : course.imageUrl ? (
                    <img src={course.imageUrl} alt={course.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        <BookOpen className="w-12 h-12 text-slate-300" />
                    </div>
                )}
                <button 
                    onClick={onGenerateImage}
                    disabled={isGeneratingImage}
                    className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-slate-700 px-2 py-1 rounded-md text-xs font-medium hover:bg-white flex items-center gap-1 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                    <Sparkles className="w-3 h-3 text-purple-500"/> Generate Cover
                </button>
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full self-start">{course.code}</span>
                <h3 className="font-bold text-slate-800 mt-2">{course.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{course.semester}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex-1 flex flex-col justify-end space-y-2 text-sm text-slate-600">
                     <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{course.studentsCount} Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{course.scheduleDay} at {course.scheduleTime} ({course.durationMins} min)</span>
                    </div>
                </div>
                 <div className="mt-4 flex gap-2">
                    <button onClick={onArchiveToggle} className="flex-1 text-xs text-center py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg">
                        {course.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface TeachingModuleProps {
    currentUser?: any;
    onAddReminder?: (reminder: Reminder) => void;
}

export const TeachingModule: React.FC<TeachingModuleProps> = ({ currentUser, onAddReminder }) => {
    const [activeTab, setActiveTab] = useState<'current' | 'archived'>('current');
    const [searchQuery, setSearchQuery] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [showChat, setShowChat] = useState(false);
    
    // Firebase Data
    const [courses, setCourses] = useState<Course[]>([]);
    const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToCourses(setCourses);
        return () => unsubscribe();
    }, []);

    // Filter courses based on search query
    const filteredCourses = courses.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentCourses = filteredCourses.filter(c => !c.isArchived);
    const archivedCourses = filteredCourses.filter(c => c.isArchived);

    const handleSmartPlan = async () => {
        if (!onAddReminder) return;
        setIsGeneratingPlan(true);
        try {
            const courseNames = currentCourses.map(c => c.name);
            const suggestions = await suggestTeachingPlan(courseNames);
            
            suggestions.forEach((s, index) => {
                const reminder: Reminder = {
                    id: `teach-ai-${Date.now()}-${index}`,
                    title: `Teaching: ${s.title}`,
                    date: new Date(Date.now() + s.daysFromNow * 86400000),
                    type: 'task',
                    completed: false
                };
                onAddReminder(reminder);
            });
            alert(`Added ${suggestions.length} teaching tasks to your global reminders.`);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleGenerateImage = async (courseId: string, courseName: string) => {
        setGeneratingImageFor(courseId);
        try {
            const base64Image = await generateCourseImage(courseName);
            if (base64Image) {
                const courseToUpdate = courses.find(c => c.id === courseId);
                if (courseToUpdate) {
                    await saveCourse({ ...courseToUpdate, imageUrl: base64Image });
                }
            } else {
                alert("Failed to generate an image.");
            }
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        } finally {
            setGeneratingImageFor(null);
        }
    };
    
    const handleAddCourse = () => {
        const name = prompt("New Course Name (e.g., Intro to AI):");
        if (!name) return;
        const code = prompt("Course Code (e.g., CS401):", "CS");
        if (!code) return;
        
        const newCourse: Course = {
            id: `course-${Date.now()}`,
            name,
            code,
            semester: 'Fall 2024',
            studentsCount: 0,
            scheduleDay: 'Mon',
            scheduleTime: '10:00',
            durationMins: 90,
            room: 'TBD',
            isArchived: false,
            resources: {},
        };
        saveCourse(newCourse);
    };

    const handleArchiveToggle = (course: Course) => {
        saveCourse({ ...course, isArchived: !course.isArchived });
    };
    
    const handleDeleteCourse = (courseId: string) => {
        if (window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
            deleteCourse(courseId);
        }
    };
    
    const coursesToDisplay = activeTab === 'current' ? currentCourses : archivedCourses;

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 relative">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                        Teaching Dashboard
                    </h1>
                    <p className="text-slate-500">Manage your courses, schedules, and materials.</p>
                </div>
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm transition-all ${showChat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Bot className="w-4 h-4" />
                        <span>Teaching AI</span>
                    </button>
                    <button 
                        onClick={handleSmartPlan}
                        disabled={isGeneratingPlan}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity shadow-sm"
                    >
                        {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Gemini Smart Plan</span>
                    </button>
                    <button onClick={handleAddCourse} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 shadow-sm">
                        <Plus className="w-4 h-4" />
                        New Course
                    </button>
                </div>
            </header>

            {/* Tabs and Search */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('current')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'current' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Current</button>
                    <button onClick={() => setActiveTab('archived')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'archived' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Archived</button>
                </div>
                 <div className="relative w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search courses..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coursesToDisplay.map(course => (
                        <CourseCard 
                            key={course.id}
                            course={course}
                            isGeneratingImage={generatingImageFor === course.id}
                            onGenerateImage={() => handleGenerateImage(course.id, course.name)}
                            onArchiveToggle={() => handleArchiveToggle(course)}
                            onDelete={() => handleDeleteCourse(course.id)}
                        />
                    ))}
                </div>
                 {coursesToDisplay.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                        <p>No courses found in this section.</p>
                    </div>
                )}
            </div>

             {/* Chat Slide-Over */}
             {showChat && (
                <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                     <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-600" /> Teaching Assistant
                        </h3>
                        <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AIChat moduleContext={{ type: 'teaching', data: courses }} />
                    </div>
                </div>
            )}
        </div>
    );
};
