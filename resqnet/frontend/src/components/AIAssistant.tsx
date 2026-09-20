import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import type { AssistantMessage } from '../types';

const SUGGESTIONS = [
  'Show all critical incidents',
  'Which ambulances are available?',
  'Summarize current situation',
  'Any incidents waiting for resources?',
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m the ResQNet AI command layer. I can triage incidents, rank resource allocation, compare routes, and explain the current dispatch strategy in real time.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AssistantMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.assistant.query(text);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        method: res.method,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the backend. Please ensure the API server is running.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        id="ai-assistant-btn"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-command-600 to-blue-500 hover:from-command-500 hover:to-blue-400 
                   text-white flex items-center justify-center shadow-xl shadow-blue-900/40 
                   transition-all duration-200 hover:scale-110 ring-4 ring-white/20"
        title="AI Command Assistant"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-80 bg-dark-900 border border-white/10 rounded-2xl 
                        shadow-2xl flex flex-col overflow-hidden animate-slide-up max-h-[520px]">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-dark-950">
            <div className="w-7 h-7 rounded-full bg-command-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Command AI</div>
              <div className="text-xs text-slate-400">ResQNet Assistant</div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-slate-500 hover:text-white transition-colors">
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-command-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={10} className="text-white" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-command-600 text-white rounded-tr-none'
                      : 'bg-dark-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                  {msg.method && (
                    <div className="text-xs text-slate-500 mt-1">
                      via {msg.method === 'llm' ? 'Gemini' : 'AI Engine'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-command-600 flex items-center justify-center shrink-0">
                  <Bot size={10} className="text-white" />
                </div>
                <div className="bg-dark-800 rounded-xl rounded-tl-none px-3 py-2">
                  <Loader2 size={14} className="text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs bg-dark-800 border border-white/5 hover:border-command-600/50 
                             text-slate-400 hover:text-white rounded-full px-2 py-1 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <input
                id="ai-assistant-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about incidents..."
                className="input flex-1 text-xs py-1.5"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-lg bg-command-600 hover:bg-command-500 text-white 
                           flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
