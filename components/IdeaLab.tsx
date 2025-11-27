
import React, { useState, useEffect } from 'react';
import { Idea, LinkResource } from '../types';
import { Lightbulb, Sparkles, Plus, Trash2, Edit2, Link as LinkIcon, ExternalLink, HardDrive, Maximize2, X, BrainCircuit, Wand2, Save, Loader2 } from 'lucide-react';
import { expandResearchIdea, structureIdeaContent, brainstormRelatedTopics } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface IdeaLabProps {
  ideas: Idea[];
  onAddIdea: (idea: Idea) => void;
  onUpdateIdea: (idea: Idea) => void;
  onDeleteIdea: (id: string) => void;
}

// --- IDEA DETAIL MODAL ---

interface IdeaDetailModalProps {
    idea: Idea;
    onClose: () => void;
    onUpdate: (idea: Idea) => void;
    onDelete: (id: string) => void;
}

const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({ idea, onClose, onUpdate, onDelete }) => {
    const [title, setTitle] = useState(idea.title);
    const [content, setContent] = useState(idea.content);
    const [description, setDescription] = useState(idea.description || '');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // New Resource State
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);

    // AI Suggestions
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

    // Sync internal state with prop changes to avoid stale data while modal is open
    useEffect(() => {
        if (idea) {
            setTitle(idea.title);
            setContent(idea.content);
            setDescription(idea.description || '');
        }
    }, [idea]);

    const handleSave = () => {
        onUpdate({
            ...idea,
            title,
            content,
            description
        });
    };

    const handleStructure = async () => {
        setIsProcessing(true);
        try {
            const structured = await structureIdeaContent(content);
            setContent(structured);
            // Auto-save after AI action
            onUpdate({ ...idea, title, content: structured, description, aiEnhanced: true });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExpand = async () => {
        setIsProcessing(true);
        try {
            const expanded = await expandResearchIdea(title, content);
            const newContent = content + "\n\n---\n\n" + expanded;
            setContent(newContent);
            onUpdate({ ...idea, title, content: newContent, description, aiEnhanced: true });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBrainstorm = async () => {
        setIsProcessing(true);
        try {
            const topics = await brainstormRelatedTopics(title, content);
            setSuggestedTopics(topics);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const addResource = () => {
        if (!newLinkUrl) return;
        const resource: LinkResource = {
            id: Date.now().toString(),
            title: newLinkTitle || newLinkUrl,
            url: newLinkUrl,
            type: newLinkUrl.includes('drive.google.com') ? 'drive' : 'web'
        };
        const updatedIdea = {
            ...idea,
            title,
            content,
            description,
            relatedResources: [...idea.relatedResources, resource]
        };
        onUpdate(updatedIdea);
        setNewLinkUrl('');
        setNewLinkTitle('');
        setShowLinkInput(false);
    };

    const removeResource = (rId: string) => {
        const updatedIdea = {
            ...idea,
            title,
            content,
            description,
            relatedResources: idea.relatedResources.filter(r => r.id !== rId)
        };
        onUpdate(updatedIdea);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <input 
                        className="bg-transparent text-xl font-bold text-slate-800 outline-none w-full mr-4 placeholder:text-slate-400"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onBlur={handleSave}
                        placeholder="Idea Title"
                    />
                    <div className="flex gap-2 items-center">
                        <button 
                            onClick={() => { handleSave(); onClose(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" /> Save & Close
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-2"></div>
                        <button 
                            onClick={() => { if(window.confirm('Delete this idea?')) onDelete(idea.id); }}
                            className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600