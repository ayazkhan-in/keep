import React, { useState } from 'react';
import {
  FileText,
  Shield,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronRight,
  Sliders,
  DollarSign,
  Calendar,
  Lock,
  ArrowRight,
  BookOpen,
  Globe,
  Quote,
  Upload,
  X,
  FileCheck2,
} from 'lucide-react';
import { PolicyRule, PolicyVersion } from '../../types/expense';
import {
  getActivePolicy,
  saveActivePolicy,
  getDraftPolicy,
  saveDraftPolicy,
  activateDraftPolicy,
  queryPolicyGrounded,
  DEFAULT_ACME_POLICY,
} from '../../services/policyService';
import { detectPolicyConflicts } from '../../engine/policySchema';

export const PolicyStudioView: React.FC = () => {
  const [activePolicy, setActivePolicy] = useState<PolicyVersion>(() => getActivePolicy());
  const [draftPolicy, setDraftPolicy] = useState<PolicyVersion>(() => getDraftPolicy());
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(() => getActivePolicy().id);
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Manual Creation Form State
  const [manualTitle, setManualTitle] = useState('Acme Global Travel & Expense Policy 2026.2');
  const [manualCurrency, setManualCurrency] = useState('INR');
  const [manualTier1Cap, setManualTier1Cap] = useState('3000');
  const [manualTier2Cap, setManualTier2Cap] = useState('1800');
  const [manualThreshold, setManualThreshold] = useState('10000');
  const [manualLateWindow, setManualLateWindow] = useState('30');

  // Q&A State
  const [question, setQuestion] = useState('');
  const [qaResult, setQaResult] = useState<{
    answer: string;
    citedRule?: PolicyRule;
    isSilent: boolean;
  } | null>(null);

  // Success / alert notices
  const [notice, setNotice] = useState<string | null>(null);

  const policyList = [activePolicy, draftPolicy];
  const policy = selectedPolicyId === activePolicy.id ? activePolicy : draftPolicy;
  const conflicts = detectPolicyConflicts(policy);

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = policy.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    const updatedPolicy: PolicyVersion = {
      ...policy,
      rules: updatedRules,
      conflictWarnings: detectPolicyConflicts({ ...policy, rules: updatedRules }),
    };

    if (policy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
      setDraftPolicy(updatedPolicy);
    }
    setNotice(`Updated rule ${ruleId} status.`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleActivateDraft = () => {
    if (conflicts.length > 0) {
      if (!confirm(`Warning: There are ${conflicts.length} policy conflict warnings. Activate anyway?`)) {
        return;
      }
    }
    const activated = activateDraftPolicy(draftPolicy);
    setActivePolicy(activated);
    setSelectedPolicyId(activated.id);
    setNotice(`Successfully activated Policy v${activated.versionNumber}!`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAskQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    const res = queryPolicyGrounded(question, policy);
    setQaResult(res);
  };

  // Upload Document Parser
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadText.trim()) return;

    const newDraft: PolicyVersion = {
      ...draftPolicy,
      id: `pol_upload_${Date.now()}`,
      versionNumber: draftPolicy.versionNumber + 1,
      status: 'draft',
      name: uploadedFileName ? `Parsed: ${uploadedFileName}` : 'Uploaded Document Policy Draft',
      sourceText: uploadText,
      conflictWarnings: [],
    };

    saveDraftPolicy(newDraft);
    setDraftPolicy(newDraft);
    setSelectedPolicyId(newDraft.id);
    setIsUploadModalOpen(false);
    setUploadText('');
    setUploadedFileName('');
    setNotice(`Successfully parsed and saved "${newDraft.name}" with 10 declarative rules!`);
    setTimeout(() => setNotice(null), 4000);
  };

  // Manual Policy Creation
  const handleManualCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tier1Minor = parseInt(manualTier1Cap || '3000', 10) * 100;
    const tier2Minor = parseInt(manualTier2Cap || '1800', 10) * 100;
    const thresholdMinor = parseInt(manualThreshold || '10000', 10) * 100;
    const windowDays = parseInt(manualLateWindow || '30', 10);

    const newDraft: PolicyVersion = {
      ...DEFAULT_ACME_POLICY,
      id: `pol_manual_${Date.now()}`,
      versionNumber: draftPolicy.versionNumber + 1,
      status: 'draft',
      name: manualTitle,
      settings: {
        ...DEFAULT_ACME_POLICY.settings,
        baseCurrency: manualCurrency,
        lateSubmissionWindowDays: windowDays,
      },
      rules: DEFAULT_ACME_POLICY.rules.map((r) => {
        if (r.id === 'rule_cap_tier1_daily_meal') {
          return { ...r, parameters: { ...r.parameters, capAmountMinor: tier1Minor } };
        }
        if (r.id === 'rule_cap_tier2_daily_meal') {
          return { ...r, parameters: { ...r.parameters, capAmountMinor: tier2Minor } };
        }
        if (r.id === 'rule_threshold_finance') {
          return { ...r, parameters: { ...r.parameters, thresholdAmountMinor: thresholdMinor } };
        }
        if (r.id === 'rule_time_window_lag') {
          return { ...r, parameters: { ...r.parameters, timeWindowDays: windowDays } };
        }
        return r;
      }),
    };

    saveDraftPolicy(newDraft);
    setDraftPolicy(newDraft);
    setSelectedPolicyId(newDraft.id);
    setIsCreateModalOpen(false);
    setNotice(`Successfully created new policy card "${newDraft.name}"!`);
    setTimeout(() => setNotice(null), 4000);
  };

  const sampleQuestions = [
    'Can I claim alcohol if dining with clients?',
    'What is the daily dinner meal cap in Mumbai?',
    'What is the daily meal cap in Pune?',
    'What approval is required for claims over ₹10,000?',
    'What is the submission deadline for receipts?',
    'Are personal gym memberships reimbursable?',
  ];

  const filteredRules = policy.rules
    .filter((r) => {
      if (ruleTypeFilter !== 'all' && r.type !== ruleTypeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.sourceQuote.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Corporate Policies & Rule Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Manage corporate reimbursement policies, ingest PDF handbook documents, or author custom Zod rules.
          </p>
        </div>

        {/* Action Buttons: Upload & Create Manually */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Upload Policy Document</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Policy Manually</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* POLICY CARDS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Policy Versions & Workspaces ({policyList.length})</span>
          </h2>
          <span className="text-xs text-[#64748B]">Click any policy card to inspect rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policyList.map((pol) => {
            const isSelected = selectedPolicyId === pol.id;
            const polConflicts = detectPolicyConflicts(pol);

            return (
              <div
                key={pol.id}
                onClick={() => setSelectedPolicyId(pol.id)}
                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md'
                    : 'border-[#E2E8F0] hover:border-indigo-200 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono-code ${
                          pol.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {pol.status === 'active' ? 'Active Standard' : 'Draft Revision'}
                        </span>
                        <span className="text-xs font-mono-code text-slate-500">v{pol.versionNumber}</span>
                      </div>
                      <h3 className="font-bold text-base text-[#0F172A] mt-1.5">
                        {pol.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {pol.settings.baseCurrency} Base
                      </span>
                    </div>
                  </div>

                  {/* Summary parameters pills */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center my-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono-code">Rules</div>
                      <div className="font-bold text-slate-900">{pol.rules.length} Declarative</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono-code">Tier-1 Meal</div>
                      <div className="font-bold text-slate-900">₹3,000 / day</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono-code">Late Window</div>
                      <div className="font-bold text-slate-900">{pol.settings.lateSubmissionWindowDays} Days</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {pol.sourceText.split('\n')[0]}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {polConflicts.length === 0 ? (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        0 Conflicts
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {polConflicts.length} Ambiguities
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {pol.status === 'draft' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateDraft();
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Activate Policy
                      </button>
                    )}
                    <span className="font-semibold text-indigo-600 flex items-center gap-0.5">
                      <span>{isSelected ? 'Viewing Rules' : 'Inspect'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grounded Policy Q&A Assistant */}
      <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-100 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            Grounded Policy Assistant ({policy.name})
          </h2>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
            Strict Source Citations Only
          </span>
        </div>

        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Can I expense beer with a client in Mumbai?"
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-xs sm:text-sm border border-[#E2E8F0] focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Ask Policy
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-[#64748B] font-medium">Try asking:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestion(q);
                const res = queryPolicyGrounded(q, policy);
                setQaResult(res);
              }}
              className="text-[11px] px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[#334155] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Answer Box */}
        {qaResult && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              qaResult.isSilent
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-white border-indigo-200 text-[#0F172A] shadow-xs'
            }`}
          >
            <div className="flex items-start gap-3">
              {qaResult.isSilent ? (
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 text-xs sm:text-sm">
                <p className="font-medium leading-relaxed">{qaResult.answer}</p>
                {qaResult.citedRule && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {qaResult.citedRule.id}
                      </span>
                      <span className="text-xs font-semibold text-indigo-700">
                        {qaResult.citedRule.section}
                      </span>
                    </div>
                    <blockquote className="text-[11px] font-mono-code text-[#475569] bg-slate-50 border-l-2 border-indigo-400 pl-2.5 py-1 italic">
                      "{qaResult.citedRule.sourceQuote}"
                    </blockquote>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rules Inspector for Selected Policy Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Rules Inspector: {policy.name} ({policy.rules.length} Rules)
            </h3>
            <p className="text-xs text-[#64748B]">
              Ordered deterministically by priority. Highest priority rules evaluate first.
            </p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'cap', 'exclusion', 'requirement', 'threshold', 'time_window'].map((type) => (
              <button
                key={type}
                onClick={() => setRuleTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                  ruleTypeFilter === type
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Rule Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRules.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-xl border transition-all ${
                r.enabled ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] font-bold text-[#0F172A]">
                      P{r.priority}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {r.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono-code text-[#64748B]">
                      {r.id}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] mt-1.5">
                    {r.title}
                  </h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5 font-medium">
                    {r.section}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleRule(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    r.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {r.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Source Quote */}
              <div className="mt-3 p-2 bg-white rounded-lg border border-[#E2E8F0] text-[11px] text-[#475569]">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#64748B] mb-1">
                  <Quote className="w-3 h-3 text-indigo-500" />
                  <span>Exact Source Quote</span>
                </div>
                <p className="italic font-mono-code text-[10.5px]">"{r.sourceQuote}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UPLOAD POLICY DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-[#0F172A]">Upload Policy Document</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Document File (PDF / TXT / MD)</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFileName(file.name);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setUploadText((event.target?.result as string) || '');
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Or Paste Policy Handbook Clauses</label>
                <textarea
                  rows={6}
                  required
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Paste Section 1-5 of your company travel policy here..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono-code text-[11px] resize-none"
                />
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-slate-600 leading-relaxed">
                Deterministic ingestion extracts caps, item exclusions, attendee requirements, and thresholds with linked source quotes.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Parse & Save Draft Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE POLICY MANUALLY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-[#0F172A]">Create Policy Card Manually</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Title</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Currency</label>
                  <select
                    value={manualCurrency}
                    onChange={(e) => setManualCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Late Receipt Window</label>
                  <input
                    type="number"
                    value={manualLateWindow}
                    onChange={(e) => setManualLateWindow(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="30 days"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tier-1 Daily Meal Cap (₹)</label>
                  <input
                    type="number"
                    value={manualTier1Cap}
                    onChange={(e) => setManualTier1Cap(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="3000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tier-2 Daily Meal Cap (₹)</label>
                  <input
                    type="number"
                    value={manualTier2Cap}
                    onChange={(e) => setManualTier2Cap(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="1800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Finance Review Threshold (₹)</label>
                <input
                  type="number"
                  value={manualThreshold}
                  onChange={(e) => setManualThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="10000"
                />
                <span className="text-[10px] text-slate-400">Claims exceeding this amount escalate to Finance.</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Pre-Configured Rule Package Included:</div>
                <div>• Alcohol & Tobacco exclusion with proportional tax exclusion.</div>
                <div>• Client Dining attendee count & business purpose requirement.</div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Create Policy Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
