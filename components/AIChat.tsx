
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, FolderDot, Globe } from 'lucide-react';
import { ChatMessage, Project, Idea, Reminder } from '../types';
import { sendChatMessage } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface AIChatProps {
    project?: Project | null;
    globalContext?: {
        projects: Project[];
        ideas: Idea[];
        reminders: Reminder[];
    }
}

export const AIChat: React.FC<AIChatProps> = ({ project, globalContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Messages based on mode
  useEffect(() => {
    if (globalContext) {
        setMessages([{
            id: 'welcome',
            role: 'model',
            text: "Hello! I am **TrungLe's Corner AI**. I have access to your entire workspace (Research, Teaching, Admin, Personal). Ask me anything!",
            timestamp: new Date()
        }]);
    } else {
        setMessages([{
            id: 'welcome',
            role: 'model',
            text: project 
              ? `Context switched to **${project.title}**. How can I assist with this project?`
              : "Hello! I'm your Research Assistant. How can I help you today?",
            timestamp: new Date()
        }]);
    }
  }, [project?.id, !!globalContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for API (exclude errors)
      const history = messages
        .filter(m => !m.isError)
        .map(m => ({ role: m.role, text: m.text }));

      // Pass project context OR global context
      const responseText = await sendChatMessage(history, userMsg.text, project || undefined, globalContext);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error connecting to the service. Please check your API key or internet connection.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isGlobal = !!globalContext;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b border-slate-200 flex items-center gap-3 ${
          isGlobal ? 'bg-slate-900' : project ? 'bg-indigo-50' : 'bg-gradient-to-r from-indigo-600 to-purple-600'
      }`}>
        <div className={`p-2 rounded-lg ${isGlobal ? 'bg-slate-800' : project ? 'bg-indigo-100' : 'bg-white/20'}`}>
          <Bot className={`w-6 h-6 ${isGlobal ? 'text-amber-400' : project ? 'text-indigo-600' : 'text-white'}`} />
        </div>
        <div>
          <h2 className={`font-semibold text-lg ${project ? 'text-slate-800' : 'text-white'}`}>
            {isGlobal ? "Global AI Assistant" : project ? 'Project Assistant' : 'Research Assistant'}
          </h2>
          <p className={`text-xs flex items-center gap-1 ${project ? 'text-slate-500' : 'text-indigo-100'}`}>
            <Sparkles className="w-3 h-3" /> Powered by Gemini 3 Pro
          </p>
        </div>
        {project && (
             <div className="ml-auto flex items-center gap-1 text-xs text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">
                 <FolderDot className="w-3 h-3" /> {project.title.substring(0, 15)}...
             </div>
        )}
        {isGlobal && (
             <div className="ml-auto flex items-center gap-1 text-xs text-amber-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                 <Globe className="w-3 h-3" /> All Data
             </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? (isGlobal ? 'bg-slate-800' : 'bg-indigo-600') : 'bg-emerald-600'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? (isGlobal ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-indigo-600 text-white rounded-tr-none')
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
              }`}>
                 {msg.role === 'user' ? (
                   msg.text
                 ) : (
                   <div className="prose prose-sm prose-slate max-w-none">
                     <ReactMarkdown>{msg.text}</ReactMarkdown>
                   </div>
                 )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
               <Bot className="w-5 h-5 text-white" />
             </div>
             <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-2">
               <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
               <span className="text-sm text-slate-500">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isGlobal ? "Ask about any project, class, or admin task..." : (project ? `Ask Gemini about ${project.title}...` : "Ask about your research...")}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-14 max-h-32 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 top-2 p-2 text-white rounded-lg transition-colors disabled:bg-slate-300 ${isGlobal ? 'bg-slate-900 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Gemini may display inaccurate info, so double-check its responses.
        </p>
      </div>
    </div>
  );
};
