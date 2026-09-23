import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, X, Sparkles, RefreshCcw, User, AlertCircle } from 'lucide-react';
import api from '../../services/apiClient';
import { AssistantChatResponse, CitedDocument } from '../../types/api';

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: CitedDocument[];
  followups?: string[];
  timestamp: string;
  isError?: boolean;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectCode: string | null;
  initialQuery?: string;
  sectionContext?: {
    sectionName: string;
    starterQuestions?: string[];
  } | null;
  onSelectProject: (code: string) => void;
}

/** Minimal markdown component styles */
const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <h1 className="text-sm font-bold text-slate-900 mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold text-slate-800 mt-2 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-xs font-semibold text-slate-700 mt-1 mb-0.5">{children}</h4>,
  p: ({ children }) => <p className="text-xs text-slate-800 leading-relaxed mb-1.5">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1.5 ml-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1.5 ml-1">{children}</ol>,
  li: ({ children }) => <li className="text-xs text-slate-700 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
  code: ({ children }) => <code className="bg-slate-100 text-blue-700 text-[11px] px-1 rounded font-mono">{children}</code>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-300 pl-2 my-1 text-slate-600 italic text-[11px]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-slate-200 my-2" />,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 underline text-[11px]" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-[10px] border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-300 px-1.5 py-0.5 bg-slate-100 font-semibold text-left">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-1.5 py-0.5 text-slate-700">{children}</td>,
};

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeProjectCode,
  initialQuery,
  sectionContext,
  onSelectProject
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: activeProjectCode
        ? `Greetings. I am the **NIRMAN Infrastructure Assistant**.\n\nActive project context is set to **\`${activeProjectCode}\`**. I can answer questions about project status, risk drivers, delay metrics, and document evidence.\n\nWhat would you like to review?`
        : `Greetings. I am the **NIRMAN Infrastructure Assistant**.\n\nI provide decision-support intelligence across the monitored infrastructure portfolio. You can ask about:\n- *"Summarize portfolio status"* \n- *"Which projects need attention?"*\n- *"Why is project ${activeProjectCode || '020100044'} high risk?"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      followups: activeProjectCode
        ? [
          `Summarize this project's current status`,
          `Why is this project high risk?`,
          `What should be reviewed?`,
          `Show supporting project evidence`
        ]
        : [
          'Give me a portfolio overview',
          'Show projects needing attention',
          'Which states have highest risk?'
        ]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && sectionContext) {
      setMessages([
        {
          id: `context-welcome-${Date.now()}`,
          sender: 'assistant',
          text: activeProjectCode
            ? `Greetings. You are reviewing the **${sectionContext.sectionName}** section for project **\`${activeProjectCode}\`**.\n\nSelect a starter question below or ask any specific question.`
            : `Greetings. Context set to **${sectionContext.sectionName}**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          followups: sectionContext.starterQuestions || []
        }
      ]);
    }
  }, [isOpen, sectionContext, activeProjectCode]);

  useEffect(() => {
    if (initialQuery && isOpen) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const formattedQuery = sectionContext?.sectionName
        ? `[Section: ${sectionContext.sectionName}] ${queryText}`
        : queryText;
      const res: AssistantChatResponse = await api.sendAssistantMessage(formattedQuery, activeProjectCode);
      const botMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.response || 'No response received from the assistant service.',
        citations: res.cited_documents || [],
        followups: res.suggested_followups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Assistant chat error:', err);
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      const errorMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: isTimeout
          ? '⏱ The request timed out. Please try again.'
          : '⚠️ Unable to connect to the Assistant service. Please check your network connection or backend service status.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-gov-navy text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5 text-white">
              NIRMAN Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </h3>
            <p className="text-[10px] text-slate-300">
              {activeProjectCode
                ? sectionContext?.sectionName
                  ? `Project: ${activeProjectCode} • Section: ${sectionContext.sectionName}`
                  : `Context: ${activeProjectCode}`
                : 'Decision-Support Assistant'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          aria-label="Close assistant"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
        {sectionContext && activeProjectCode && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                {activeProjectCode}
              </span>
              <span className="text-slate-700 font-medium">
                Section: <strong className="text-slate-900">{sectionContext.sectionName}</strong>
              </span>
            </div>
            <span className="text-[10px] text-blue-700 font-mono font-bold bg-blue-100/80 px-2 py-0.5 rounded">
              Context Active
            </span>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender label */}
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1 px-1 font-mono">
              {msg.sender === 'user' ? (
                <><span>User</span> <User className="w-3 h-3 text-slate-500" /></>
              ) : (
                <><Bot className="w-3 h-3 text-blue-600" /> <span>Assistant</span></>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div className={`max-w-[92%] rounded-xl px-4 py-3 shadow-xs ${
              msg.sender === 'user'
                ? 'bg-gov-navy text-white rounded-br-none text-xs leading-relaxed font-sans'
                : msg.isError
                  ? 'bg-red-50 border border-red-200 rounded-bl-none text-xs'
                  : 'bg-white border border-slate-200 rounded-bl-none text-slate-900'
            }`}>
              {msg.sender === 'user' ? (
                <p className="text-xs leading-relaxed">{msg.text}</p>
              ) : msg.isError ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{msg.text}</p>
                </div>
              ) : (
                <div className="prose-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    📄 Project Evidence Excerpts
                  </span>
                  {msg.citations.map((cite, i) => (
                    <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                      <div className="font-semibold text-blue-700 truncate">{cite.doc_name}</div>
                      {cite.snippet && (
                        <p className="text-slate-600 italic mt-0.5 line-clamp-2">"{cite.snippet}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-up chips */}
              {msg.followups && msg.followups.length > 0 && !msg.isError && (
                <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {msg.followups.slice(0, 4).map((f, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(f)}
                      disabled={loading}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-medium transition text-left flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      <span className="line-clamp-1">{f}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2 text-slate-600 text-xs p-3 bg-white border border-slate-200 rounded-xl rounded-bl-none shadow-xs">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Processing request...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-200 flex-shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about project status, risk, schedule, or evidence..."
            className="flex-1 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-lg px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition shadow-xs flex-shrink-0 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-1.5 font-sans">
          NIRMAN Infrastructure Decision Support Platform
        </p>
      </div>
    </div>
  );
};
