import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Sparkles,
  BarChart3,
  DollarSign,
  ShieldCheck,
  Send,
  Loader2,
  PieChart,
  ArrowUpRight,
  Bot,
  User,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { PurchaseItem, SpendingInsight, ChatMessage } from '../types';
import { INITIAL_CHAT, INITIAL_INSIGHTS } from '../data/mockData';
import { useCurrency } from '../context/CurrencyContext';

interface AnalyticsViewProps {
  purchases: PurchaseItem[];
  onSelectPurchase: (item: PurchaseItem) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  purchases,
  onSelectPurchase,
}) => {
  const { formatPrice, currencySymbol } = useCurrency();
  const [insights, setInsights] = useState<SpendingInsight[]>(INITIAL_INSIGHTS);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Totals calculations
  const totalSpend = purchases.reduce((acc, p) => acc + p.price, 0);
  const taxDeductibleSpend = purchases
    .filter((p) => p.taxDeductible)
    .reduce((acc, p) => acc + p.price, 0);

  const protectedValue = purchases
    .filter((p) => p.warranty.hasWarranty)
    .reduce((acc, p) => acc + p.price, 0);

  // Group by category
  const categoryTotals: { [key: string]: number } = {};
  purchases.forEach((p) => {
    categoryTotals[p.category] = (categoryTotals[p.category] || 0) + p.price;
  });

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchases }),
      });
      const data = await res.json();
      if (data.success && data.insights?.length) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSendChat = async (queryText?: string) => {
    const textToSend = queryText || chatInput;
    if (!textToSend.trim() || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          purchasesSummary: purchases.map((p) => ({
            name: p.name,
            vendor: p.vendor,
            category: p.category,
            price: p.price,
            purchaseDate: p.purchaseDate,
            warrantyExpiry: p.warranty?.expiryDate,
            returnDeadline: p.returnWindow?.deadlineDate,
            taxDeductible: p.taxDeductible,
          })),
          chatHistory: chatMessages.slice(-4),
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || "I couldn't process your request at this moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: "I'm having trouble analyzing your request right now. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0]"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              Telemetry & Analytics
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            Spending & Intelligence
          </h1>
          <p className="text-[13px] text-[#76777D] mt-1">
            Aggregate asset analytics, tax deductions, and Gemini conversational assistant.
          </p>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={isGeneratingInsights}
          className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-[12px] font-medium text-[#0F172A] hover:bg-[#F9F9FB] shadow-2xs cursor-pointer transition-colors"
        >
          {isGeneratingInsights ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{isGeneratingInsights ? 'Refreshing AI...' : 'Refresh Insights'}</span>
        </button>
      </motion.div>

      {/* Metric Cards Grid with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs">
          <div className="flex justify-between items-center text-[#76777D] mb-1">
            <span className="font-mono-code text-[11px] uppercase font-semibold">Total Assets</span>
            <Coins className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <p className="font-mono-code text-2xl font-bold text-[#0F172A] mt-2">
            {formatPrice(totalSpend)}
          </p>
          <p className="text-[11px] text-[#10B981] mt-1 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3 h-3" /> Active Portfolio
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs">
          <div className="flex justify-between items-center text-[#76777D] mb-1">
            <span className="font-mono-code text-[11px] uppercase font-semibold">Tax Deductible</span>
            <span className="font-mono-code text-[10px] bg-[#ECFDF5] text-[#065F46] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              {totalSpend > 0 ? `${Math.round((taxDeductibleSpend / totalSpend) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="font-mono-code text-2xl font-bold text-[#0F172A] mt-2">
            {formatPrice(taxDeductibleSpend)}
          </p>
          <p className="text-[11px] text-[#76777D] mt-1">Ready for business write-off export</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs">
          <div className="flex justify-between items-center text-[#76777D] mb-1">
            <span className="font-mono-code text-[11px] uppercase font-semibold">Protected Value</span>
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="font-mono-code text-2xl font-bold text-[#0F172A] mt-2">
            {formatPrice(protectedValue)}
          </p>
          <p className="text-[11px] text-[#76777D] mt-1">Active warranty coverage</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs">
          <div className="flex justify-between items-center text-[#76777D] mb-1">
            <span className="font-mono-code text-[11px] uppercase font-semibold">Tracked Items</span>
            <span className="font-mono-code text-[11px] text-[#76777D]">Total</span>
          </div>
          <p className="font-mono-code text-2xl font-bold text-[#0F172A] mt-2">
            {purchases.length} Items
          </p>
          <p className="text-[11px] text-[#76777D] mt-1">100% OCR parsed & stored</p>
        </div>
      </motion.div>

      {/* AI Insights Section with Blur Appear */}
      <motion.section
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0F172A]" />
          <h3 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
            Keepr Intelligence Insights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((ins, idx) => (
            <div
              key={ins.id || idx}
              className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs flex flex-col justify-between"
            >
              <div>
                <span className="font-mono-code text-[10px] text-[#76777D] uppercase font-semibold">
                  {ins.type}
                </span>
                <h4 className="font-medium text-[13px] text-[#0F172A] mt-1">{ins.title}</h4>
                <p className="text-[12px] text-[#76777D] mt-1.5 leading-relaxed">{ins.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex justify-between items-center">
                <span className="text-[11px] text-[#0F172A] font-medium hover:underline cursor-pointer">
                  {ins.actionLabel} →
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Category Breakdown & Assistant Grid */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
      >
        {/* Left (5 cols): Category Breakdown */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              Category Distribution
            </h3>
            <PieChart className="w-4 h-4 text-[#94A3B8]" />
          </div>

          <div className="space-y-4">
            {categoryEntries.map(([category, amount]) => {
              const pct = Math.round((amount / (totalSpend || 1)) * 100);
              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="font-medium text-[#0F172A]">{category}</span>
                    <span className="font-mono-code text-[#76777D]">
                      {formatPrice(amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0F172A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right (7 cols): Ask Keepr AI Interactive Chat Assistant */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#0F172A]" />
                <h3 className="font-medium text-[13px] text-[#0F172A]">Ask Keepr Assistant</h3>
              </div>
              <span className="font-mono-code text-[10px] text-[#10B981] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                Gemini 3.1 Online
              </span>
            </div>

            {/* Chat message stream */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[11px] shrink-0 font-semibold">
                      K
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-2xl text-[12px] max-w-[85%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#0F172A] text-white rounded-tr-xs'
                        : 'bg-[#F9F9FB] text-[#0F172A] border border-[#E2E8F0] rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span
                      className={`block font-mono-code text-[9px] mt-1 ${
                        msg.sender === 'user' ? 'text-white/60 text-right' : 'text-[#94A3B8]'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[11px] shrink-0">
                    K
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F9F9FB] border border-[#E2E8F0] flex items-center gap-2 text-[12px] text-[#76777D]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing purchase intelligence...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Prompts & Chat Input Form */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {[
                'Which items can I still return?',
                'How much on software last quarter?',
                'Show tax deductions',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSendChat(suggestion)}
                  className="text-[11px] bg-[#F9F9FB] border border-[#E2E8F0] px-2.5 py-1 rounded-full text-[#45464D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything about your purchases, warranties, or receipts..."
                className="flex-1 px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[12px] text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-[12px] font-medium hover:bg-[#1E293B] disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
