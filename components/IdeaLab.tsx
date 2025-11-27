
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
                            className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600" title="Close">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content Editor */}
                    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                        <input 
                            className="text-sm text-slate-500 mb-4 w-full outline-none border-b border-transparent focus:border-slate-200 pb-2 transition-colors"
                            placeholder="Add a short description/summary..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            onBlur={handleSave}
                        />
                        <textarea 
                            className="flex-1 w-full resize-none outline-none text-base text-slate-700 leading-relaxed font-mono"
                            placeholder="Start typing your research notes..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            onBlur={handleSave}
                        />
                    </div>

                    {/* Right Sidebar: Tools & Resources */}
                    <div className="w-80 bg-slate-50 border-l border-slate-200 p-4 flex flex-col gap-6 overflow-y-auto">
                        
                        {/* AI Tools */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">AI Brainstorming</h3>
                            <div className="space-y-2">
                                <button 
                                    onClick={handleStructure}
                                    disabled={isProcessing}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-indigo-100 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
                                >
                                    <Wand2 className="w-4 h-4" /> Structure & Summarize
                                </button>
                                <button 
                                    onClick={handleExpand}
                                    disabled={isProcessing}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-purple-100 rounded-lg text-sm text-purple-700 hover:bg-purple-50 transition-colors shadow-sm"
                                >
                                    <Sparkles className="w-4 h-4" /> Expand Proposal
                                </button>
                                <button 
                                    onClick={handleBrainstorm}
                                    disabled={isProcessing}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-amber-100 rounded-lg text-sm text-amber-700 hover:bg-amber-50 transition-colors shadow-sm"
                                >
                                    <BrainCircuit className="w-4 h-4" /> Find Connections
                                </button>
                            </div>
                            
                            {/* Suggestions Result */}
                            {suggestedTopics.length > 0 && (
                                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <p className="text-xs font-semibold text-amber-800 mb-2">Try exploring:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestedTopics.map((topic, i) => (
                                            <span key={i} className="text-[10px] px-2 py-1 bg-white rounded-full border border-amber-200 text-amber-700">
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Resources */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resources</h3>
                                <button 
                                    onClick={() => setShowLinkInput(!showLinkInput)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {showLinkInput && (
                                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm mb-3 space-y-2">
                                    <input 
                                        placeholder="Title (optional)"
                                        className="w-full px-2 py-1 text-xs border rounded"
                                        value={newLinkTitle}
                                        onChange={e => setNewLinkTitle(e.target.value)}
                                    />
                                    <input 
                                        placeholder="https://..."
                                        className="w-full px-2 py-1 text-xs border rounded"
                                        value={newLinkUrl}
                                        onChange={e => setNewLinkUrl(e.target.value)}
                                    />
                                    <button onClick={addResource} className="w-full bg-slate-800 text-white text-xs py-1 rounded hover:bg-slate-700">
                                        Add Link
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {idea.relatedResources.map(res => (
                                    <div key={res.id} className="group bg-white p-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between">
                                        <a href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                                            {res.type === 'drive' ? <HardDrive className="w-3 h-3 text-blue-500" /> : <LinkIcon className="w-3 h-3 text-slate-400" />}
                                            <span className="text-xs text-slate-700 truncate">{res.title}</span>
                                        </a>
                                        <button 
                                            onClick={() => removeResource(res.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {idea.relatedResources.length === 0 && !showLinkInput && (
                                    <p className="text-xs text-slate-400 italic">No links added yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const IdeaLab: React.FC<IdeaLabProps> = ({ ideas, onAddIdea, onUpdateIdea, onDeleteIdea }) => {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for quick AI actions from main board
  const [processingIdeaId, setProcessingIdeaId] = useState<string | null>(null);
  const [aiMenuOpenId, setAiMenuOpenId] = useState<string | null>(null);


  const handleQuickAdd = () => {
      if (!quickTitle.trim()) return;
      const newIdea: Idea = {
          id: Date.now().toString(),
          title: quickTitle,
          description: '',
          content: '',
          relatedResources: [],
          aiEnhanced: false
      };
      // For new ideas, we save it right away and then select it.
      // This simplifies state management.
      onAddIdea(newIdea);
      setSelectedIdea(newIdea);
      setQuickTitle('');
  };
  
  const handleSaveOrUpdate = (ideaToSave: Idea) => {
    // This function handles saves from the modal.
    // It finds if the idea exists to decide if it's an add or update.
    const ideaExists = ideas.some(i => i.id === ideaToSave.id);
    if (ideaExists) {
        onUpdateIdea(ideaToSave);
    } else {
        onAddIdea(ideaToSave);
    }
  };

  const handleDelete = (id: string) => {
      onDeleteIdea(id);
      if(selectedIdea?.id === id) {
          setSelectedIdea(null);
      }
  };

  // --- AI HANDLERS for main board ---
  const handleAiStructure = async (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    setAiMenuOpenId(null);
    setProcessingIdeaId(idea.id);
    try {
        const structured = await structureIdeaContent(idea.content);
        onUpdateIdea({ ...idea, content: structured, aiEnhanced: true });
    } catch (err) { console.error(err); } 
    finally { setProcessingIdeaId(null); }
  };

  const handleAiConnections = async (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    setAiMenuOpenId(null);
    setProcessingIdeaId(idea.id);
    try {
        const topics = await brainstormRelatedTopics(idea.title, idea.content);
        if (topics.length > 0) {
            const connectionsMd = `\n\n### AI Suggested Connections\n${topics.map(t => `- ${t}`).join('\n')}`;
            onUpdateIdea({ ...idea, content: idea.content + connectionsMd, aiEnhanced: true });
        }
    } catch (err) { console.error(err); }
    finally { setProcessingIdeaId(null); }
  };


  const filteredIdeas = ideas.filter(i => 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 animate-in fade-in duration-500 overflow-hidden relative" onClick={() => setAiMenuOpenId(null)}>
        {selectedIdea && (
            <IdeaDetailModal 
                idea={selectedIdea} 
                onClose={() => setSelectedIdea(null)} 
                onUpdate={handleSaveOrUpdate}
                onDelete={handleDelete}
            />
        )}

        <header className="flex justify-between items-center mb-6 flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-amber-500" />
                    Idea Lab
                </h1>
                <p className="text-slate-500">A space for brainstorming, connecting dots, and research sparks.</p>
            </div>
             <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search ideas..." 
                    className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </header>

        {/* Quick Capture */}
        <div className="w-full max-w-2xl mx-auto mb-8 shadow-sm flex-shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center p-1 focus-within:ring-2 focus-within:ring-amber-100 focus-within:border-amber-300 transition-all">
                <input 
                    className="flex-1 px-4 py-3 outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder="What's on your mind? Capture a new idea..."
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                />
                <button 
                    onClick={handleQuickAdd}
                    disabled={!quickTitle.trim()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors mr-1"
                >
                    Create
                </button>
            </div>
        </div>

        {/* Masonry-like Grid */}
        <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                {filteredIdeas.map(idea => (
                    <div 
                        key={idea.id}
                        onClick={() => setSelectedIdea(idea)}
                        className="relative bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-amber-200 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-[220px]"
                    >
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setAiMenuOpenId(aiMenuOpenId === idea.id ? null : idea.id); }}
                                    className="p-1.5 bg-white/70 backdrop-blur-sm rounded-md hover:bg-amber-100 text-amber-600"
                                    title="AI Actions"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                                {aiMenuOpenId === idea.id && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 animate-in fade-in zoom-in-95">
                                        <button onClick={(e) => handleAiStructure(e, idea)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                                            <Wand2 className="w-3 h-3"/> Structure & Summarize
                                        </button>
                                        <button onClick={(e) => handleAiConnections(e, idea)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                                            <BrainCircuit className="w-3 h-3"/> Find Connections
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (window.confirm('Are you sure you want to delete this idea?')) handleDelete(idea.id); }}
                                className="p-1.5 bg-white/70 backdrop-blur-sm rounded-md hover:bg-red-100 text-red-500"
                                title="Delete Idea"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                         {/* Loading Overlay */}
                        {processingIdeaId === idea.id && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
                                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 pr-4">{idea.title}</h3>
                            {/* FIX: The `title` prop is not valid on lucide-react icons. Wrap with a span to show a tooltip. */}
                            {idea.aiEnhanced && <span title="AI Enhanced"><Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" /></span>}
                        </div>
                        
                        <div className="flex-1 overflow-hidden relative">
                             <p className="text-sm text-slate-500 line-clamp-4 leading-relaxed">
                                {idea.description || idea.content || <span className="italic opacity-50">No content yet...</span>}
                             </p>
                             {/* Fade out effect at bottom of text */}
                             <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                             <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3" /> {idea.relatedResources.length}
                                </span>
                             </div>
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-indigo-600 font-medium">Click to open</span>
                             </div>
                        </div>
                    </div>
                ))}
                
                {filteredIdeas.length === 0 && (
                    <div className="col-span-full text-center py-20 text-slate-400 flex flex-col items-center">
                        <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
                        <p>Your idea lab is empty.</p>
                        <p className="text-sm">Start capturing your thoughts above.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
