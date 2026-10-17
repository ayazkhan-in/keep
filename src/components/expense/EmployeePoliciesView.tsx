import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowUp,
  RotateCcw,
  BookOpen,
  MapPin,
  FileText,
  ShieldCheck,
  Building2,
  Utensils,
  Car,
  Plane,
  Receipt,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { getActivePolicy, queryPolicyGrounded, GroundedPolicyAnswer } from '../../services/policyService';
import { PolicyRule } from '../../types/expense';

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  result?: GroundedPolicyAnswer;
}

export const EmployeePoliciesView: React.FC = () => {
  const policy = getActivePolicy();

  // Active view tab: 'chat' | 'browse' | 'tiers'
  const [activeTab, setActiveTab] = useState<'chat' | 'browse' | 'tiers'>('chat');

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Browse tab category filter
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'meals' | 'travel' | 'client' | 'exclusions' | 'approvals'>('all');
  const [browseSearch, setBrowseSearch] = useState('');

  // City Tier search
  const [citySearch, setCitySearch] = useState('');

  const starterPrompts = [
    { label: 'Cab after 10 PM', query: 'Can I expense a cab after 10 PM?' },
    { label: 'Meal Cap in Mumbai', query: 'What is the daily meal cap in Mumbai or Bengaluru?' },
    { label: 'Alcohol with Clients', query: 'Can I expense alcohol or beer with client dinner?' },
    { label: 'Client Dinner Allowance', query: 'What are the rules for client entertainment dinner?' },
    { label: 'Flight Travel Rules', query: 'What are the domestic flight travel guidelines?' },
    { label: '30-Day Submission Deadline', query: 'What happens if I submit my receipt after 30 days?' },
  ];

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isTyping, activeTab]);

  const handleSendQuery = (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim()) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessageItem = {
      id: userMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate natural AI thinking delay (350ms)
    setTimeout(() => {
      const grounded = queryPolicyGrounded(textToSend, policy);
      const assistantMsg: ChatMessageItem = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: grounded.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: grounded,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputText('');
  };

  const handleAskAboutRule = (rule: PolicyRule) => {
    const query = `What are the details and requirements for ${rule.title} under ${rule.section}?`;
    setActiveTab('chat');
    handleSendQuery(query);
  };

  // Filtered rules for browse tab
  const filteredRules = policy.rules.filter((rule) => {
    const matchesSearch =
      browseSearch === '' ||
      rule.title.toLowerCase().includes(browseSearch.toLowerCase()) ||
      rule.section.toLowerCase().includes(browseSearch.toLowerCase()) ||
      (rule.sourceQuote || '').toLowerCase().includes(browseSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'meals') {
      return (rule.conditions.category || []).includes('meals');
    }
    if (categoryFilter === 'travel') {
      return (
        (rule.conditions.category || []).includes('transportation') ||
        rule.title.toLowerCase().includes('travel') ||
        rule.title.toLowerCase().includes('flight')
      );
    }
    if (categoryFilter === 'client') {
      return (
        (rule.conditions.category || []).includes('client entertainment') ||
        rule.title.toLowerCase().includes('client')
      );
    }
    if (categoryFilter === 'exclusions') {
      return rule.type === 'exclusion';
    }
    if (categoryFilter === 'approvals') {
      return rule.type === 'threshold' || rule.type === 'time_window';
    }

    return true;
  });

  // City Tiers database
  const cityTierList = [
    { name: 'Mumbai', tier: 'Tier-1', cap: '₹3,000 / day', state: 'Maharashtra', notes: 'Commercial Hub' },
    { name: 'Bengaluru', tier: 'Tier-1', cap: '₹3,000 / day', state: 'Karnataka', notes: 'Tech HQ' },
    { name: 'Delhi-NCR (Gurgaon/Noida)', tier: 'Tier-1', cap: '₹3,000 / day', state: 'National Capital Region', notes: 'Metro Area' },
    { name: 'Hyderabad', tier: 'Tier-1', cap: '₹3,000 / day', state: 'Telangana', notes: 'Major Hub' },
    { name: 'Pune', tier: 'Tier-2', cap: '₹1,800 / day', state: 'Maharashtra', notes: 'Regional Office' },
    { name: 'Chennai', tier: 'Tier-2', cap: '₹1,800 / day', state: 'Tamil Nadu', notes: 'Regional Hub' },
    { name: 'Kolkata', tier: 'Tier-2', cap: '₹1,800 / day', state: 'West Bengal', notes: 'East Zone' },
    { name: 'Ahmedabad', tier: 'Tier-2', cap: '₹1,800 / day', state: 'Gujarat', notes: 'Commercial Center' },
    { name: 'Jaipur', tier: 'Tier-3', cap: '₹1,200 / day', state: 'Rajasthan', notes: 'Domestic Tier 3' },
    { name: 'Goa', tier: 'Tier-3', cap: '₹1,200 / day', state: 'Goa', notes: 'Domestic Tier 3' },
    { name: 'Kochi', tier: 'Tier-3', cap: '₹1,200 / day', state: 'Kerala', notes: 'Domestic Tier 3' },
    { name: 'Chandigarh', tier: 'Tier-3', cap: '₹1,200 / day', state: 'Punjab / Haryana', notes: 'Domestic Tier 3' },
    { name: 'International (London/NYC/SFO/Dubai)', tier: 'International', cap: '₹6,500 ($80) / day', state: 'Global', notes: 'Requires Travel Desk' },
  ];

  const filteredCityTiers = cityTierList.filter(
    (c) =>
      c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.state.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.tier.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Company Policy & Assistant</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono-code font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>v{policy.versionNumber} Active</span>
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Know company reimbursement guidelines or ask questions in natural language.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ask Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Browse Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'tiers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>City Tiers</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CHATGPT-STYLE AI POLICY ASSISTANT */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-230px)] min-h-[580px] overflow-hidden relative">
          {/* Chat Sub-header */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-slate-900">Keepr Policy AI</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500">Grounded in Acme Global T&E Policy v{policy.versionNumber}</span>
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleResetChat}
                className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear chat</span>
              </button>
            )}
          </div>

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.length === 0 ? (
              // Empty / Welcome state
              <div className="max-w-xl mx-auto py-6 sm:py-10 text-center space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    What would you like to know about our expense policy?
                  </h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Ask any question in natural language before spending or filing an expense claim to verify eligibility and limits.
                  </p>
                </div>

                {/* Key Policy Rules At a Glance */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px] mb-0.5">
                      <Utensils className="w-3 h-3 text-emerald-500" />
                      <span>Tier-1 Meals</span>
                    </div>
                    <div className="font-mono-code text-xs text-slate-900 font-bold">₹3,000 / day</div>
                    <div className="text-[10px] text-slate-500">Mumbai, Bengaluru, NCR</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px] mb-0.5">
                      <Utensils className="w-3 h-3 text-emerald-500" />
                      <span>Tier-2 Meals</span>
                    </div>
                    <div className="font-mono-code text-xs text-slate-900 font-bold">₹1,800 / day</div>
                    <div className="text-[10px] text-slate-500">Pune, Chennai, Kolkata</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px] mb-0.5">
                      <XCircle className="w-3 h-3 text-rose-500" />
                      <span>Exclusions</span>
                    </div>
                    <div className="text-xs text-slate-900 font-medium">Alcohol, Tobacco</div>
                    <div className="text-[10px] text-slate-500">Non-reimbursable</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px] mb-0.5">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>Deadline</span>
                    </div>
                    <div className="font-mono-code text-xs text-slate-900 font-bold">30 Days</div>
                    <div className="text-[10px] text-slate-500">From receipt date</div>
                  </div>
                </div>

                {/* Starter Prompts */}
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Common Questions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {starterPrompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendQuery(p.query)}
                        className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all text-xs text-slate-700 flex items-center justify-between group cursor-pointer shadow-2xs"
                      >
                        <span className="truncate">{p.query}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Message List
              messages.map((m) => (
                <div key={m.id} className="space-y-3">
                  {m.sender === 'user' ? (
                    // User Message Bubble
                    <div className="flex justify-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs max-w-lg shadow-sm">
                        <p className="leading-relaxed">{m.text}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block text-right font-mono-code">
                          {m.timestamp}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Assistant Message Bubble
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 sm:p-5 text-xs max-w-2xl shadow-xs space-y-3 text-slate-800">
                        {/* Status / Verdict Banner */}
                        {m.result && (
                          <div className="flex items-center gap-2">
                            {m.result.verdict === 'covered' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{m.result.verdictLabel}</span>
                              </span>
                            )}
                            {m.result.verdict === 'capped' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{m.result.verdictLabel}</span>
                              </span>
                            )}
                            {m.result.verdict === 'excluded' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{m.result.verdictLabel}</span>
                              </span>
                            )}
                            {m.result.verdict === 'review_required' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>{m.result.verdictLabel}</span>
                              </span>
                            )}
                            {m.result.verdict === 'silent' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>{m.result.verdictLabel}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono-code ml-auto">
                              {m.timestamp}
                            </span>
                          </div>
                        )}

                        {/* Natural Language Answer */}
                        <p className="text-slate-800 text-xs sm:text-[13px] leading-relaxed">
                          {m.text}
                        </p>

                        {/* Grounded Citation Box */}
                        {m.result?.sourceQuote && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-slate-500" />
                                <span>{m.result.sourceSection || 'Official Policy Clause'}</span>
                              </span>
                              <span className="text-[10px] font-mono-code text-slate-400">Grounded Citation</span>
                            </div>
                            <blockquote className="text-[11px] text-slate-600 italic border-l-2 border-emerald-400 pl-2 mt-1">
                              "{m.result.sourceQuote}"
                            </blockquote>
                          </div>
                        )}

                        {/* Practical Action Tips */}
                        {m.result?.tips && m.result.tips.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              Receipt & Claim Advice:
                            </span>
                            <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                              {m.result.tips.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Follow-up question chips */}
                        {m.result?.suggestedFollowUps && m.result.suggestedFollowUps.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                            <span className="text-[10px] text-slate-400 self-center mr-1">Ask next:</span>
                            {m.result.suggestedFollowUps.map((fu, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendQuery(fu)}
                                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                              >
                                {fu}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span className="text-xs text-slate-500">Checking active policy rules...</span>
                  <div className="flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CHATGPT-STYLE FIXED BOTTOM INPUT BAR */}
          <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Input Capsule Container */}
              <div className="bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/5 rounded-2xl p-2 sm:p-2.5 transition-all shadow-xs flex items-end gap-2">
                <div className="p-1.5 text-slate-400 shrink-0 mb-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any policy question in natural language (e.g. Can I expense dinner in Mumbai?)..."
                  className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 resize-none py-1.5 max-h-32 leading-relaxed"
                />

                <button
                  type="button"
                  onClick={() => handleSendQuery()}
                  disabled={!inputText.trim() || isTyping}
                  className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                    inputText.trim() && !isTyping
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Send question (Enter)"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>

              {/* Footnote Disclaimer */}
              <p className="text-[10px] text-center text-slate-400">
                Grounded in Acme Global T&E Policy v{policy.versionNumber} • Answers cite exact clauses • Press Enter to send
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROWSE ALL POLICIES */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Rules ({policy.rules.length})
              </button>
              <button
                onClick={() => setCategoryFilter('meals')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'meals'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Meals & Daily Caps
              </button>
              <button
                onClick={() => setCategoryFilter('travel')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'travel'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Travel & Ground Transit
              </button>
              <button
                onClick={() => setCategoryFilter('client')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'client'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Client Entertainment
              </button>
              <button
                onClick={() => setCategoryFilter('exclusions')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'exclusions'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Exclusions
              </button>
              <button
                onClick={() => setCategoryFilter('approvals')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'approvals'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Thresholds & Deadlines
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                placeholder="Search policy rules..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Rule Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredRules.map((rule) => {
              const isCap = rule.type === 'cap';
              const isExclusion = rule.type === 'exclusion';
              const isThreshold = rule.type === 'threshold';
              const isTimeWindow = rule.type === 'time_window';

              return (
                <div
                  key={rule.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono-code font-semibold text-slate-400 uppercase block">
                          {rule.section}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                          {rule.title}
                        </h3>
                      </div>

                      {/* Rule Type Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          isCap
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isExclusion
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isThreshold
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {rule.type.toUpperCase()}
                      </span>
                    </div>

                    {/* Numerical or condition highlight */}
                    {isCap && rule.parameters.capAmountMinor && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Cap Limit:</span>
                        <span className="text-sm font-bold font-mono-code text-slate-900">
                          ₹{((rule.parameters.capAmountMinor || 0) / 100).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          per {rule.parameters.capPeriod || 'claim'}
                        </span>
                      </div>
                    )}

                    {isThreshold && rule.parameters.thresholdAmountMinor && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Escalates Above:</span>
                        <span className="text-sm font-bold font-mono-code text-slate-900">
                          ₹{((rule.parameters.thresholdAmountMinor || 0) / 100).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({rule.parameters.thresholdLevel || 'finance'} sign-off)
                        </span>
                      </div>
                    )}

                    {isTimeWindow && rule.parameters.timeWindowDays && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Submission Window:</span>
                        <span className="text-sm font-bold font-mono-code text-slate-900">
                          {rule.parameters.timeWindowDays} Calendar Days
                        </span>
                      </div>
                    )}

                    {/* Source quote callout */}
                    {rule.sourceQuote && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic leading-relaxed">
                        "{rule.sourceQuote}"
                      </p>
                    )}
                  </div>

                  {/* Ask AI Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      On violation: <code className="text-slate-600 font-mono-code">{rule.parameters.onViolationBehavior || 'cap'}</code>
                    </span>

                    <button
                      onClick={() => handleAskAboutRule(rule)}
                      className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Ask AI Assistant</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CITY TIER DIRECTORY */}
      {activeTab === 'tiers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">City Tier Classification Table</h2>
              <p className="text-xs text-slate-500">
                Daily meal and travel allowance per diems are determined by the destination city tier.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Search city, e.g. Pune, Goa..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">City / Destination</th>
                  <th className="py-2.5 px-3.5">Region / State</th>
                  <th className="py-2.5 px-3.5">Tier Rating</th>
                  <th className="py-2.5 px-3.5">Daily Meal Allowance</th>
                  <th className="py-2.5 px-3.5">Notes</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCityTiers.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{c.name}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">{c.state}</td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          c.tier === 'Tier-1'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.tier === 'Tier-2'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.tier === 'Tier-3'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono-code font-bold text-slate-900">{c.cap}</td>
                    <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">{c.notes}</td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendQuery(`What is the reimbursement limit and meal cap for travel to ${c.name}?`);
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
                      >
                        Ask AI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
