import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  BookOpen,
} from 'lucide-react';
import { getActivePolicy, queryPolicyGrounded } from '../../services/policyService';
import { PolicyRule } from '../../types/expense';
import { ROUTES } from '../../routes/routeConfig';

interface EmployeePolicyAssistantProps {
  onOpenFullChat?: () => void;
  className?: string;
}

export const EmployeePolicyAssistant: React.FC<EmployeePolicyAssistantProps> = ({
  onOpenFullChat,
  className = '',
}) => {
  const navigate = useNavigate();
  const policy = getActivePolicy();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{
    answer: string;
    citedRule?: PolicyRule;
    isSilent: boolean;
  } | null>(null);

  const sampleQuestions = [
    'Can I expense a cab after 10 pm?',
    'Is alcohol covered with client dinner?',
    'What is the daily meal cap allowance?',
    'What is the receipt submission deadline?',
    'What approval is needed for ₹15,000?',
  ];

  const handleAsk = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = customQuery !== undefined ? customQuery : query;
    if (!q.trim()) return;

    if (customQuery !== undefined) {
      setQuery(customQuery);
    }

    const res = queryPolicyGrounded(q, policy);
    setResult(res);
  };

  // Determine status type for high visual clarity
  const getStatusType = () => {
    if (!result) return null;
    if (result.isSilent) return 'silent';
    if (result.citedRule?.type === 'exclusion') return 'excluded';
    if (result.citedRule?.type === 'threshold') return 'threshold';
    return 'covered';
  };

  const statusType = getStatusType();

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Policy Assistant: Check Coverage</span>
              <span className="text-[10px] font-mono-code font-normal text-slate-500">
                v{policy.versionNumber} Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Instant check whether an expense is eligible, capped, or non-reimbursable.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFullChat ? onOpenFullChat : () => navigate(ROUTES.EMPLOYEE.POLICIES)}
          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>Open Policy & Chat</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Query Form */}
      <form onSubmit={(e) => handleAsk(e)} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Can I expense a cab after 10 pm?" or "Is beer covered?"'
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium cursor-pointer shadow-xs transition-colors shrink-0"
        >
          Check
        </button>
      </form>

      {/* Sample Quick Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] text-slate-400">Ask:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAsk(undefined, q)}
            className="text-[11px] px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={`p-3.5 rounded-xl border text-xs transition-all ${
            statusType === 'excluded'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : statusType === 'silent'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : statusType === 'threshold'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusType === 'excluded' && (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            {statusType === 'silent' && (
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            {statusType === 'threshold' && (
              <AlertTriangle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {statusType === 'covered' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono-code ${
                  statusType === 'excluded'
                    ? 'bg-rose-100 text-rose-800'
                    : statusType === 'silent'
                    ? 'bg-amber-100 text-amber-800'
                    : statusType === 'threshold'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {statusType === 'excluded'
                    ? 'Not Covered'
                    : statusType === 'silent'
                    ? 'Policy is Silent'
                    : statusType === 'threshold'
                    ? 'Review Required'
                    : 'Eligible & Capped'}
                </span>
                {result.citedRule && (
                  <span className="text-[11px] font-semibold text-slate-800">
                    {result.citedRule.title}
                  </span>
                )}
              </div>

              <p className="leading-relaxed font-medium">{result.answer}</p>

              {result.citedRule?.sourceQuote && (
                <div className="pt-1 text-[11px] font-mono-code text-slate-600 border-t border-black/5">
                  Policy Section: {result.citedRule.section}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
