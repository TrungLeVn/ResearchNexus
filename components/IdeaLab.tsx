import React, { useState } from 'react';
import { Idea, LinkResource } from '../types';
import { Lightbulb, Sparkles, Plus, Trash2, Edit2, Link as LinkIcon, ExternalLink, HardDrive } from 'lucide-react';
import { expandResearchIdea } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface IdeaLabProps {
  ideas: Idea[];
  onAddIdea: (idea: Idea) => void;
  onUpdateIdea: (idea: Idea) => void;
  onDeleteIdea: (id: string) => void;
}

export const IdeaLab: React.FC<IdeaLabProps> = ({ ideas, onAddIdea, onUpdateIdea, onDeleteIdea }) => {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // New Idea State
  const [newIdeaTitle, setNewIdeaTitle] = useState('');

  // Editing State
  const [editForm, setEditForm] = useState<Partial<Idea>>({});
  
  // Link State
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState<{title: string, url: string}>({title: '', url: ''});

  const handleCreateIdea = () => {
    if (!newIdeaTitle.trim()) return;
    const newIdea: Idea = {
        id: Date.now().toString(),
        title: newIdeaTitle,
        description: 'No description yet.',
        content: "Draft your research question here...",
        relatedResources: [],
        aiEnhanced: false
    };
    onAddIdea(newIdea);
    setNewIdeaTitle('');
    setSelectedIdea(newIdea);
  };

  const handleEnhanceIdea = async () => {
    if (!selectedIdea) return;
    setIsEnhancing(true);
    try {
        const expandedContent = await expandResearchIdea(selectedIdea.title, selectedIdea.content);
        const updatedIdea = {
            ...selectedIdea,
            content: selectedIdea.content + "\n\n### AI Enhanced Proposal\n" + expandedContent,
            aiEnhanced: true
        };
        onUpdateIdea(updatedIdea);
        setSelectedIdea(updatedIdea);
    } catch (e) {
        console.error(e);
    } finally {
        setIsEnhancing(false);
    }
  };

  const startEdit = () => {
      if(!selectedIdea) return;
      setEditForm({...selectedIdea});
      setIsEditing(true);
  };

  const saveEdit = () => {
      if(!selectedIdea || !editForm.title) return;
      const updated = { ...selectedIdea, ...editForm } as Idea;
      onUpdateIdea(updated);
      setSelectedIdea(updated);
      setIsEditing(false);
  };

  const addResource = () => {
      if(!selectedIdea || !newLink.title || !newLink.url) return;
      const resource: LinkResource = {
          id: Date.now().toString(),
          title: newLink.title,
          url: newLink.url,
          type: newLink.url.includes('drive.google.com') ? 'drive' : 'web'
      };
      const updatedIdea = {
          ...selectedIdea,
          relatedResources: [...selectedIdea.relatedResources, resource]
      };
      onUpdateIdea(updatedIdea);
      setSelectedIdea(updatedIdea);
      setNewLink({title: '', url: ''});
      setIsAddingLink(false);
  };

  const removeResource = (resourceId: string) => {
      if(!selectedIdea) return;
      const updatedIdea = {
          ...selectedIdea,
          relatedResources: selectedIdea.relatedResources.filter(r => r.id !== resourceId)
      };
      onUpdateIdea(updatedIdea);
      setSelectedIdea(updatedIdea);
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500">
        {/* Sidebar List */}
        <div className="w-80 border-r border-slate-200 bg-white p-4 flex flex-col h-full">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Idea Lab
            </h2>
            
            <div className="mb-4 flex gap-2">
                <input 
                    type="text" 
                    value={newIdeaTitle}
                    onChange={(e) => setNewIdeaTitle(e.target.value)}
                    placeholder="New idea title..." 
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateIdea()}
                />
                <button 
                    onClick={handleCreateIdea}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {ideas.map(idea => (
                    <div 
                        key={idea.id}
                        onClick={() => { setSelectedIdea(idea); setIsEditing(false); }}
                        className={`group relative p-3 rounded-lg cursor-pointer border transition-all ${
                            selectedIdea?.id === idea.id 
                            ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' 
                            : 'bg-white border-slate-200 hover:border-amber-200'
                        }`}
                    >
                        <h3 className="font-medium text-slate-800 text-sm pr-6">{idea.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{idea.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                             {idea.aiEnhanced && <Sparkles className="w-3 h-3 text-indigo-500" />}
                             <span className="text-[10px] text-slate-400">{idea.relatedResources.length} links</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteIdea(idea.id); if(selectedIdea?.id === idea.id) setSelectedIdea(null); }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
            {selectedIdea ? (
                <div className="flex-1 flex flex-col h-full">
                    {/* Header */}
                    <header className="px-8 py-4 bg-white border-b border-slate-200 flex justify-between items-center">
                        <div>
                            {isEditing ? (
                                <input 
                                    className="text-2xl font-bold text-slate-800 border-b-2 border-indigo-500 outline-none"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-slate-800">{selectedIdea.title}</h1>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                    <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={startEdit} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Edit Idea">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={handleEnhanceIdea}
                                        disabled={isEnhancing}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                                    >
                                        {isEnhancing ? (
                                            <>Processing...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4" /> Expand with Gemini</>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Content */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="max-w-3xl mx-auto space-y-6">
                                {/* Description Box */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Short Description</label>
                                    {isEditing ? (
                                        <textarea 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            rows={2}
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                        />
                                    ) : (
                                        <p className="text-slate-700">{selectedIdea.description}</p>
                                    )}
                                </div>

                                {/* Content Box */}
                                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
                                     <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 block">Research Notes & Expansion</label>
                                     {isEditing ? (
                                         <textarea 
                                            className="w-full h-[400px] p-4 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                            value={editForm.content}
                                            onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                                         />
                                     ) : (
                                         <div className="prose prose-slate max-w-none">
                                            <ReactMarkdown>{selectedIdea.content}</ReactMarkdown>
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar: Resources */}
                        <div className="w-72 bg-white border-l border-slate-200 p-4 overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-slate-800 text-sm">Resources</h3>
                                <button 
                                    onClick={() => setIsAddingLink(!isAddingLink)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {isAddingLink && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4 space-y-2">
                                    <input 
                                        placeholder="Resource Title"
                                        className="w-full px-2 py-1 text-xs border rounded"
                                        value={newLink.title}
                                        onChange={e => setNewLink({...newLink, title: e.target.value})}
                                    />
                                    <input 
                                        placeholder="URL (Drive/Web)"
                                        className="w-full px-2 py-1 text-xs border rounded"
                                        value={newLink.url}
                                        onChange={e => setNewLink({...newLink, url: e.target.value})}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={addResource} className="flex-1 bg-indigo-600 text-white text-xs py-1 rounded">Add</button>
                                        <button onClick={() => setIsAddingLink(false)} className="flex-1 bg-slate-200 text-slate-700 text-xs py-1 rounded">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {selectedIdea.relatedResources.map(resource => (
                                    <div key={resource.id} className="group p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all bg-white">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2 mb-1">
                                                {resource.type === 'drive' 
                                                    ? <HardDrive className="w-3 h-3 text-blue-600" /> 
                                                    : <LinkIcon className="w-3 h-3 text-slate-400" />
                                                }
                                                <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{resource.title}</span>
                                            </div>
                                            <button 
                                                onClick={() => removeResource(resource.id)}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <a href={resource.url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                                            Open Link <ExternalLink className="w-2 h-2" />
                                        </a>
                                    </div>
                                ))}
                                {selectedIdea.relatedResources.length === 0 && !isAddingLink && (
                                    <div className="text-center py-6 text-slate-400 text-xs">
                                        No linked papers or files.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Lightbulb className="w-16 h-16 mb-4 text-slate-200" />
                    <p className="text-lg">Select an idea or create a new one to start brainstorming.</p>
                </div>
            )}
        </div>
    </div>
  );
};

// Helper component import
import { X } from 'lucide-react';