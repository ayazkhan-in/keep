import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowUp,
  RotateCcw,
  BookOpen,
  FileText,
  ShieldCheck,
  Building2,
  Utensils,
  Car,
  Plane,
  Receipt,
  Clock,
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

  // Active view tab: 'chat' | 'browse'
  const [activeTab, setActiveTab] = useState<'chat' | 'browse'>('chat');

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Browse tab category filter
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'meals' | 'travel' | 'client' | 'exclusions' | 'approvals'>('all');
  const [browseSearch, setBrowseSearch] = useState('');

  const starterPrompts = [
    { label: 'Cab after 10 PM', query: 'Can I expense a cab after 10 PM?' },
    { label: 'Daily Meal Cap', query: 'What is the daily meal cap allowance?' },
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Company Policy & Handbook</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono-code font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                <span>v{policy.versionNumber} Active</span>
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review company reimbursement guidelines and query coverage rules in real-time.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start md:self-auto text-xs border border-slate-200/60">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-slate-600" />
            <span>Ask Question</span>
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Browse Rules</span>
          </button>
        </div>
      </div>

      {/* TAB 1: POLICY ASSISTANT */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col h-[calc(100dvh-230px)] min-h-[380px] sm:min-h-[520px] overflow-hidden relative">
          {/* Chat Sub-header */}
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-medium text-slate-900">Policy Assistant</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500">Acme Global Policy v{policy.versionNumber}</span>
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
              <div className="max-w-xl mx-auto py-6 sm:py-8 text-center space-y-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mx-auto">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    What would you like to verify?
                  </h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Ask any question in plain language to check limits, approval thresholds, or non-reimbursable categories.
                  </p>
                </div>

                {/* Key Policy Rules At a Glance */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
                  <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] mb-0.5">
                      <Utensils className="w-3.5 h-3.5 text-slate-400" />
                      <span>Daily Meals</span>
                    </div>
                    <div className="font-mono-code text-xs text-slate-900 font-bold">₹3,000 / day</div>
                    <div className="text-[10px] text-slate-400">Standard allowance</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] mb-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Client Dining</span>
                    </div>
                    <div className="font-mono-code text-xs text-slate-900 font-bold">₹2,500 / attendee</div>
                    <div className="text-[10px] text-slate-400">Documentation required</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] mb-0.5">
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Exclusions</span>
                    </div>
                    <div className="text-xs text-slate-900 font-medium">Alcohol, Tobacco</div>
                    <div className="text-[10px] text-slate-400">Non-reimbursable</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Deadline</span>
                    </div>
                    <div className="font-mono-code text-xs text-slate-900 font-bold">30 Days</div>
                    <div className="text-[10px] text-slate-400">From transaction date</div>
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
                            <blockquote className="text-[11px] text-slate-600 italic border-l-2 border-emerald-500 pl-2 mt-1">
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
                                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer border border-transparent"
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
                  <Bot className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="text-xs text-slate-500">Checking policy rules...</span>
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

          {/* MINIMAL STICKY FULLY-ROUNDED INPUT BAR */}
          <div className="sticky bottom-0 z-10 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shrink-0">
            <div className="max-w-2xl mx-auto space-y-1.5">
              <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:bg-white rounded-full px-4 py-1.5 sm:py-2 transition-all shadow-xs flex items-center gap-2.5">
                <div className="text-slate-400 shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any policy question in plain language..."
                  className="flex-1 bg-transparent border-0 focus:outline-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 py-1"
                />

                <button
                  type="button"
                  onClick={() => handleSendQuery()}
                  disabled={!inputText.trim() || isTyping}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                    inputText.trim() && !isTyping
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Send question (Enter)"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
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
        <div className="space-y-3.5">
          {/* Filter Bar & Search */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Category filter pills */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                All Rules ({policy.rules.length})
              </button>
              <button
                onClick={() => setCategoryFilter('meals')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'meals'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Meals & Allowances
              </button>
              <button
                onClick={() => setCategoryFilter('travel')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'travel'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Travel & Transit
              </button>
              <button
                onClick={() => setCategoryFilter('client')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'client'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Client Dining
              </button>
              <button
                onClick={() => setCategoryFilter('exclusions')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'exclusions'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Exclusions
              </button>
              <button
                onClick={() => setCategoryFilter('approvals')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'approvals'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Thresholds
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                placeholder="Search policy..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200/80 rounded-md focus:outline-none focus:bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Rule Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRules.map((rule) => {
              const isCap = rule.type === 'cap';
              const isExclusion = rule.type === 'exclusion';
              const isThreshold = rule.type === 'threshold';
              const isTimeWindow = rule.type === 'time_window';

              return (
                <div
                  key={rule.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono-code font-medium text-slate-400 uppercase block">
                          {rule.section}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-900 mt-0.5">
                          {rule.title}
                        </h3>
                      </div>

                      {/* Rule Type Badge */}
                      <span
                        className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded font-medium shrink-0 capitalize ${
                          isCap
                            ? 'bg-slate-100 text-slate-700'
                            : isExclusion
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : isThreshold
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rule.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Numerical or condition highlight */}
                    {isCap && rule.parameters.capAmountMinor && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Cap Limit:</span>
                        <span className="text-xs font-bold font-mono-code text-slate-900">
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
                        <span className="text-xs font-bold font-mono-code text-slate-900">
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
                        <span className="text-xs font-bold font-mono-code text-slate-900">
                          {rule.parameters.timeWindowDays} Calendar Days
                        </span>
                      </div>
                    )}

                    {/* Source quote callout */}
                    {rule.sourceQuote && (
                      <p className="text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100 italic leading-relaxed">
                        "{rule.sourceQuote}"
                      </p>
                    )}
                  </div>

                  {/* Ask AI Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400 font-mono-code">
                      Violation: {rule.parameters.onViolationBehavior || 'cap'}
                    </span>

                    <button
                      onClick={() => handleAskAboutRule(rule)}
                      className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Bot className="w-3 h-3 text-slate-500" />
                      <span>Ask Question</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
