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
            alert((e as Error).message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleGenerateImage = async (courseId: string, courseName: string) => {
        setGeneratingImageFor(courseId);
        try {
            const base64Image = await generateCourseImage(courseName