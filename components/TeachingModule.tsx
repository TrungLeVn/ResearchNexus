import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Plus, Calendar, FileText, Archive, HardDrive, MapPin, Presentation, FileCheck, FileBarChart, Layers, Users2, Sparkles, Loader2, Image as ImageIcon, Search, Clock, Trash2, Bot, X } from 'lucide-react';
import { Course, Reminder } from '../types';
import { generateCourseImage, suggestTeachingPlan } from '../services/gemini';
import { subscribeToCourses, saveCourse, deleteCourse } from '../services/firebase';
import { AIChat } from './AIChat';

interface TeachingModuleProps {
    currentUser?: any;
    onAddReminder?: (reminder: Reminder) => void;
}

export const TeachingModule: React.FC<TeachingModuleProps> = ({ currentUser, onAddReminder }) => {
    const [activeTab, setActiveTab] = useState<'current' | 'archived' | 'calendar'>('current');
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
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleGenerateImage = async (courseId: string, courseName: string) => {
        setGeneratingImageFor(courseId);
        try {
            const base64Image = await generateCourseImage(courseName);
            if (base64Image) {
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    saveCourse({ ...course, imageUrl: base64Image });
                }
            } else {
                alert("Could not generate image. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("Error generating image.");
        } finally {
            setGeneratingImageFor(null);
        }
    };

    const handleAddNewCourse = () => {
        const name = prompt("Course Name:");
        if (!name) return;
        const code = prompt("Course Code (e.g. CS101):");
        if (!code) return;

        const newCourse: Course = {
            id: Date.now().toString(),
            name,
            code,
            semester: 'Current',
            studentsCount: 0,
            scheduleDay: 'Mon',
            scheduleTime: '09:00',
            durationMins: 90,
            room: 'TBD',
            isArchived: false,
            resources: {}
        };
        saveCourse(newCourse);
    };

    const handleArchiveToggle = (course: Course) => {
        saveCourse({ ...course, isArchived: !course.isArchived });
    };

    const handleDeleteCourse = (id: string) => {
        if(window.confirm("Are you sure you want to delete this course?")) {
            deleteCourse(id);
        }
    };

    const renderCourseCard = (course: Course) => {
        const resourceButtons = [
            { label: 'Syllabus', icon: FileText, url: course.resources.syllabus },
            { label: 'Grades', icon: FileBarChart, url: course.resources.grades },
            { label: 'Slides', icon: Presentation, url: course.resources.slides },
            { label: 'Classlist', icon: Users, url: course.resources.classlist },
            { label: 'Tests', icon: FileCheck, url: course.resources.testbank },
            { label: 'Exercises', icon: Layers, url: course.resources.exercises },
            { label: 'Readings', icon: BookOpen, url: course.resources.readings },
            { label: 'Others', icon: HardDrive, url: course.resources.others },
        ];

        return (
            <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group h-full flex flex-col overflow-hidden relative">
                <button 
                    onClick={() => handleDeleteCourse(course.id)}
                    className="absolute top-2 left-2 z-10 p-1.5 bg-white/80 rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Course"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                {/* Course Cover Image */}
                <div className="h-32 w-full bg-slate-100 relative group/image">
                    {course.imageUrl ? (
                         <img src={course.imageUrl} alt={course.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                            <ImageIcon className="w-10 h-10 text-indigo-200" />
                        </div>
                    )}
                    
                    {/* Generate Button Overlay */}
                    <button 
                        onClick={() => handleGenerateImage(course.id, course.name)}
                        disabled={generatingImageFor === course.id}
                        className={`absolute top-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-opacity flex items-center gap-2 ${course.imageUrl ? 'opacity-0 group-hover/image:opacity-100' : 'opacity-100'}`}
                    >
                        {generatingImageFor === course.id ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3 h-3" /> {course.imageUrl ? 'Regenerate Cover' : 'Generate AI Cover'}
                            </>
                        )}
                    </button>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase tracking-wider">
                            {course.code}
                        </span>
                        <div className="flex gap-2">
                             <button onClick={() => handleArchiveToggle(course)} className="text-xs text-slate-400 hover:text-indigo-600">
                                 {course.isArchived ? 'Restore' : 'Archive'}
                             </button>
                             <span className="text-xs text-slate-400">{course.semester}</span>
                        </div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{course.name}</h3>
                    
                    <div className="flex gap-4 text-sm text-slate-600 mt-2 mb-4">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{course.scheduleDay} {course.scheduleTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{course.room}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                            <Users2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{course.studentsCount}</span>
                        </div>
                    </div>

                    <div className="mt-auto grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
                        {resourceButtons.map((btn, idx) => {
                            const hasLink = !!btn.url;
                            const commonClasses = `flex flex-col items-center justify-center p-2 rounded-lg transition-all border cursor-pointer ${
                                hasLink 
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                            }`;

                            if (hasLink) {
                                return (
                                    <a 
                                        key={idx}
                                        href={btn.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={commonClasses}
                                        title={btn.label}
                                    >
                                        <btn.icon className="w-5 h-5 mb-1" />
                                        <span className="text-[10px] font-medium">{btn.label}</span>
                                    </a>
                                );
                            } else {
                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => {
                                            const newUrl = prompt(`Enter URL for ${btn.label}:`);
                                            if (newUrl) {
                                                const resourceKey = btn.label.toLowerCase() as keyof typeof course.resources;
                                                saveCourse({
                                                    ...course,
                                                    resources: { ...course.resources, [resourceKey]: newUrl }
                                                });
                                            }
                                        }}
                                        className={commonClasses}
                                        title="Click to add link"
                                    >
                                        <btn.icon className="w-5 h-5 mb-1" />
                                        <span className="text-[10px] font-medium">{btn.label}</span>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderCalendar = () => {
        // Simplified Weekly Grid
        const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-6 border-b border-slate-200">
                    <div className="p-3 text-xs font-semibold text-slate-400 text-center border-r border-slate-100">Time</div>
                    {days.map(d => (
                        <div key={d} className="p-3 text-sm font-semibold text-slate-700 text-center border-r border-slate-100 last:border-r-0">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-6 auto-rows-[60px]">
                    {hours.map(h => (
                        <React.Fragment key={h}>
                            <div className="border-b border-r border-slate-100 p-2 text-xs text-slate-400 text-center">{h}</div>
                            {days.map(d => {
                                // Find course at this time
                                const course = currentCourses.find(c => 
                                    c.scheduleDay === d && c.scheduleTime.startsWith(h.substring(0, 2))
                                );
                                
                                return (
                                    <div key={`${d}-${h}`} className="border-b border-r border-slate-100 relative p-1">
                                        {course && (
                                            <div className="absolute inset-1 bg-indigo-100 text-indigo-700 rounded p-2 text-xs border border-indigo-200 flex flex-col justify-center">
                                                <div className="font-bold truncate">{course.code}</div>
                                                <div className="truncate">{course.room}</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 relative">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                        Teaching
                    </h1>
                    <p className="text-slate-500">Manage courses, schedules, and student resources.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Chat Toggle Button */}
                    <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm transition-all ${showChat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Bot className="w-4 h-4" />
                        <span>Teaching AI</span>
                    </button>

                    {/* Smart Plan Button */}
                    <button 
                        onClick={handleSmartPlan}
                        disabled={isGeneratingPlan}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity shadow-sm"
                    >
                        {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Gemini Smart Plan</span>
                    </button>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search courses..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => setActiveTab('current')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'current' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            Current
                        </button>
                        <button 
                            onClick={() => setActiveTab('calendar')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            Calendar
                        </button>
                        <button 
                            onClick={() => setActiveTab('archived')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'archived' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            Archived
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'current' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full pb-6">
                        {currentCourses.map(course => renderCourseCard(course))}
                        <button 
                            onClick={handleAddNewCourse}
                            className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[250px]"
                        >
                            <Plus className="w-8 h-8 mb-2" />
                            <span className="font-medium">Add New Course</span>
                        </button>
                        {currentCourses.length === 0 && searchQuery && (
                             <div className="col-span-full text-center py-12 text-slate-400">
                                <p>No courses match "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'archived' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full pb-6">
                        {archivedCourses.map(course => renderCourseCard(course))}
                        {archivedCourses.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-400">
                                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>{searchQuery ? `No archived courses match "${searchQuery}"` : "No archived courses found."}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="h-full overflow-y-auto">
                        {renderCalendar()}
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