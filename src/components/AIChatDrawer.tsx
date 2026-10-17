import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  ShoppingBag,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { PurchaseItem } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseItem[];
  onSelectPurchase: (item: PurchaseItem) => void;
  onTriggerClaim: (item: PurchaseItem) => void;
  onTriggerReturn: (item: PurchaseItem) => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  purchases,
  onSelectPurchase,
  onTriggerClaim,
  onTriggerReturn,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        "Hello! I am your Keepr AI Purchase & Warranty Intelligence Assistant. Ask me anything about your active warranties, upcoming return deadlines, receipt vaults, or tax deductibles.",
      timestamp: 'Just now',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInputPrompt('');
    setIsTyping(true);

    try {
      // Build conversation history format for backend
      const history = messages
        .filter((m) => m.id !== 'msg-welcome')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          purchases,
          conversationHistory: history,
        }),
      });

      const data = await res.json();
      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply ||
          "I've analyzed your purchases and records. Let me know if you need specific claim forms or return draft notices.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue connecting to Gemini AI. Please try again.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const samplePrompts = [
    'Which return windows are closing soon?',
    'What is my total tax-deductible expense amount?',
    'Check warranty status on my Breville espresso machine',
    'Calculate depreciation on my electronics',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
        >
          <motion.div
            initial={{ x: '100%', opacity: 0, filter: 'blur(10px)' }}
            animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ x: '100%', opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col justify-between"
          >
            {/* Drawer Header */}
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-[14px] text-[#0F172A] leading-tight">
                Ask Keepr AI
              </h3>
              <p className="text-[11px] text-[#76777D]">
                Gemini 3.6 Flash Purchase Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[13px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#0F172A] text-white rounded-br-xs'
                    : 'bg-[#F9F9FB] border border-[#E2E8F0] text-[#0F172A] rounded-bl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <span
                  className={`block text-[10px] mt-1 font-mono-code ${
                    m.role === 'user' ? 'text-white/60 text-right' : 'text-[#76777D]'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-[#76777D] text-[12px] p-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F172A]" />
              <span>Keepr AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="p-3 border-t border-[#F1F5F9] bg-[#FAFAFC] space-y-1.5">
          <p className="text-[10px] font-mono-code text-[#76777D] uppercase font-semibold">
            Suggested Prompts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="text-[11px] bg-white border border-[#E2E8F0] hover:border-[#0F172A] text-[#45464D] hover:text-[#0F172A] px-2.5 py-1 rounded-full transition-colors cursor-pointer text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask about receipts, warranties, returns..."
              className="flex-1 px-3.5 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[13px] text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isTyping}
              className="p-2.5 bg-[#0F172A] disabled:opacity-40 text-white rounded-xl hover:bg-[#1E293B] transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
