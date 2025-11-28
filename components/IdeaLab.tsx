



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
            onUpdate({ ...idea, title, content: structured, description, aiEnhanced: true });
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
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
            alert((e as Error).message);
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
            alert((e as Error).message);
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
            relatedResources: [...(idea.relatedResources || []), resource]
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
            relatedResources: (idea.relatedResources || []).filter(r => r.id !== rId)
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
                            onClick={() => { if(window.confirm('Delete this idea?')) { onDelete(idea.id); onClose(); } }}
                            className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete Idea"
                        >
                           <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Editor */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <input 
                                className="bg-transparent text-sm text-slate-600 w-full outline-none placeholder:text-slate-400"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                onBlur={handleSave}
                                placeholder="Add a short description..."
                            />
                        </div>
                        <textarea 
                            className="flex-1 w-full p-6 bg-transparent resize-none outline-none text-base text-slate-700 leading-relaxed font-serif"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            onBlur={handleSave}
                            placeholder="Start writing your idea here..."
                        />
                    </div>
                    {/* Sidebar */}
                    <div className="w-80 border-l border-slate-100 flex flex-col bg-slate-50/50 overflow-y-auto">
                         {/* AI Tools */}
                        <div className="p-4 space-y-2 border-b border-slate-200">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2"><Sparkles className="w-3 h-3 text-purple-500" /> AI Toolkit</h4>
                            <button disabled={isProcessing} onClick={handleStructure} className="w-full flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"><Wand2 className="w-4 h-4 text-indigo-500" /> Structure Notes</button>
                            <button disabled={isProcessing} onClick={handleExpand} className="w-full flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"><BrainCircuit className="w-4 h-4 text-indigo-500" /> Expand Idea</button>
                            <button disabled={isProcessing} onClick={handleBrainstorm} className="w-full flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"><Lightbulb className="w-4 h-4 text-indigo-500" /> Brainstorm Topics</button>
                        </div>
                         {/* Suggested Topics */}
                        {suggestedTopics.length > 0 && (
                            <div className="p-4 space-y-2 border-b border-slate-200">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase">Suggested Topics</h4>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedTopics.map((topic, i) => (
                                        <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{topic}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Linked Resources */}
                        <div className="p-4 space-y-2 flex-1">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Linked Resources</h4>
                            {(idea.relatedResources || []).map(r => (
                                <div key={r.id} className="group bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-2 text-sm">
                                    {r.type === 'drive' ? <HardDrive className="w-4 h-4 text-blue-500" /> : <ExternalLink className="w-4 h-4 text-slate-500" />}
                                    <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline" title={r.title}>{r.title}</a>
                                    <button onClick={() => removeResource(r.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                </div>
                            ))}
                            {showLinkInput ? (
                                <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 space-y-2 text-sm">
                                    <input value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} placeholder="Title (optional)" className="w-full border rounded p-1 text-xs"/>
                                    <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL" className="w-full border rounded p-1 text-xs"/>
                                    <div className="flex gap-2">
                                        <button onClick={addResource} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">Add</button>
                                        <button onClick={() => setShowLinkInput(false)} className="bg-slate-200 px-2 py-1 rounded text-xs">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowLinkInput(true)} className="w-full flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Plus className="w-4 h-4" /> Add Resource</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const IdeaLab: React.FC<IdeaLabProps> = ({ ideas, onAddIdea, onUpdateIdea, onDeleteIdea }) => {
    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  
    const handleAddNewIdea = () => {
        const title = prompt("New Idea Title:");
        if (title) {
            const newIdea: Idea = {
                id: `idea_${Date.now()}`,
                title,
                description: "",
                content: "",
                relatedResources: [],
                aiEnhanced: false,
            };
            onAddIdea(newIdea);
            setSelectedIdea(newIdea);
        }
    };
  
    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto animate-in fade-in duration-500">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">Idea Lab</h1>
                  <p className="text-slate-500">Capture, develop, and connect your research sparks.</p>
              </div>
          </div>
          <button 
              onClick={handleAddNewIdea}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
              <Plus className="w-4 h-4" />
              New Idea
          </button>
        </header>
  
        {selectedIdea && (
            <IdeaDetailModal
                idea={selectedIdea}
                onClose={() => setSelectedIdea(null)}
                onUpdate={(updatedIdea) => {
                    onUpdateIdea(updatedIdea);
                    setSelectedIdea(updatedIdea); // Keep modal open with updated data
                }}
                onDelete={(id) => {
                    onDeleteIdea(id);
                    setSelectedIdea(null);
                }}
            />
        )}
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map(idea => (
                <div 
                    key={idea.id}
                    onClick={() => setSelectedIdea(idea)}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-slate-800 mb-2">{idea.title}</h3>
                        {/* FIX: The `title` prop is not valid for lucide-react icons. Wrap with a span to show a tooltip. */}
                        {idea.aiEnhanced && <span title="AI Enhanced"><Sparkles className="w-4 h-4 text-purple-500" /></span>}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 h-10">{idea.description || "No description provided."}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>{(idea.relatedResources || []).length} resources linked</span>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedIdea(idea); }} className="flex items-center gap-1 hover:text-indigo-600">
                            <Edit2 className="w-3 h-3"/> Open
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  };