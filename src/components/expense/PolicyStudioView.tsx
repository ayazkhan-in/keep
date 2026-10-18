import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Bot,
  HelpCircle,
  X,
  Code,
  Edit3,
  Trash2,
  ArrowRight,
  Play,
  History,
  FileCheck2,
  XCircle,
  UploadCloud,
  FileText,
  Check,
  Building,
} from 'lucide-react';
import {
  PolicyRule,
  PolicyVersion,
  StructuredConflictWarning,
  PolicyGapSuggestion,
  CityTier,
  Expense,
} from '../../types/expense';
import {
  getActivePolicy,
  saveActivePolicy,
  getDraftPolicy,
  saveDraftPolicy,
  deleteDraftPolicy,
  getAllPolicies,
  getPolicyAuditLog,
  activateDraftPolicy,
  createDraftFromActive,
  createDraftFromTemplate,
  createDraftFromText,
  extractPdfText,
  ingestPolicyDocument,
  dismissConflictWarning,
  getStructuredPolicyConflicts,
  detectPolicyGaps,
  queryPolicyGrounded,
  calculatePolicyDiff,
  DEFAULT_ACME_POLICY,
} from '../../services/policyService';
import { evaluateExpense } from '../../engine/evaluator';
import { ExpenseLedger } from '../../engine/ledger';
import { simulatePolicyChange } from '../../engine/simulator';
import { getAllExpenses } from '../../services/expenseService';
import { DEMO_EMPLOYEES } from '../../services/employeeService';
import { SYNTHETIC_EXPENSES } from '../../data/syntheticClaims';

type StudioTab = 'review' | 'checks' | 'test' | 'diff' | 'qa';

const SAMPLE_POLICY_TEXT = `ACME CORPORATE TRAVEL & REIMBURSEMENT POLICY (REV 2026.2)

1. DAILY MEAL PER-DIEM
Corporate Daily Meal Allowance: Capped at ₹3,000 per day.
Single-Meal Limit: Individual transactions capped at ₹2,000 without prior manager authorization.

2. NON-REIMBURSABLE EXPENSES
Alcohol, tobacco products, minibar items, and parking/traffic fines are non-reimbursable. Associated statutory taxes will be excluded proportionally.

3. APPROVAL THRESHOLDS
Claims below ₹10,000 are eligible for automated touchless approval. Claims between ₹10,000 and ₹50,000 require Finance authorization. Claims exceeding ₹50,000 require CFO executive approval.

4. TIMELY SUBMISSION DEADLINE
All itemized receipts must be submitted within 30 calendar days of the transaction date.`;

export const PolicyStudioView: React.FC = () => {
  const [activePolicy, setActivePolicy] = useState<PolicyVersion>(() => getActivePolicy());
  const [allPolicies, setAllPolicies] = useState<PolicyVersion[]>(() => getAllPolicies());
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(() => getActivePolicy().id);
  const [activeTab, setActiveTab] = useState<StudioTab>('review');

  const selectedPolicy = useMemo(() => {
    return allPolicies.find((p) => p.id === selectedPolicyId) || activePolicy;
  }, [allPolicies, selectedPolicyId, activePolicy]);

  const isDraft = selectedPolicy.status === 'draft';
  const isActive = selectedPolicy.status === 'active';

  // Side-by-side Bi-directional Highlighting state
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);
  const [highlightedParagraphIdx, setHighlightedParagraphIdx] = useState<number | null>(null);

  // Filter & Search in Review Tab
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('all');
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');

  // Modals & Extraction
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'upload' | 'template' | 'manual'>('upload');
  const [selectedTemplate, setSelectedTemplate] = useState<'enterprise' | 'tech_startup'>('enterprise');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadText, setUploadText] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfStats, setPdfStats] = useState<{ pageCount?: number; wordCount?: number } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Manual creation state
  const [manualTitle, setManualTitle] = useState('Acme Global T&E Policy 2026.2');
  const [manualCurrency, setManualCurrency] = useState('INR');
  const [manualTier1Cap, setManualTier1Cap] = useState('3000');
  const [manualTier2Cap, setManualTier2Cap] = useState('1800');
  const [manualThreshold, setManualThreshold] = useState('10000');

  // Rule Editor Modal (Form vs Raw JSON)
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editInJsonMode, setEditInJsonMode] = useState(false);
  const [ruleJsonText, setRuleJsonText] = useState('');
  const [ruleJsonError, setRuleJsonError] = useState<string | null>(null);

  // Conflict Dismissal Modal
  const [dismissingWarning, setDismissingWarning] = useState<StructuredConflictWarning | null>(null);
  const [dismissalNote, setDismissalNote] = useState('');

  // Activation Modal
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activationChangeNote, setActivationChangeNote] = useState('');
  const [reevaluatePending, setReevaluatePending] = useState(true);

  // Q&A State
  const [questionText, setQuestionText] = useState('');
  const [qaResult, setQaResult] = useState<{
    answer: string;
    citedRule?: PolicyRule;
    isSilent: boolean;
  } | null>(null);

  // Sandbox State
  const [sandboxPreset, setSandboxPreset] = useState<'mumbai_beer' | 'pune_lunch' | 'late_cab' | 'high_client'>('mumbai_beer');
  const [sandboxResult, setSandboxResult] = useState<ReturnType<typeof evaluateExpense> | null>(null);

  // Backtest Simulator State
  const [simulationResult, setSimulationResult] = useState<ReturnType<typeof simulatePolicyChange> | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Notice banner
  const [notice, setNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const refreshPolicies = (newSelectedId?: string) => {
    const freshAll = getAllPolicies();
    const freshActive = getActivePolicy();
    setAllPolicies(freshAll);
    setActivePolicy(freshActive);
    if (newSelectedId) {
      setSelectedPolicyId(newSelectedId);
    }
  };

  const structuredConflicts = useMemo(() => {
    return getStructuredPolicyConflicts(selectedPolicy);
  }, [selectedPolicy]);

  const activeConflictsCount = structuredConflicts.filter((c) => !c.isDismissed).length;

  const gapSuggestions = useMemo(() => {
    return detectPolicyGaps();
  }, []);

  const policyDiff = useMemo(() => {
    return calculatePolicyDiff(activePolicy, selectedPolicy);
  }, [activePolicy, selectedPolicy]);

  // Parse source text into paragraphs with mapping
  const parsedParagraphs = useMemo(() => {
    const text = selectedPolicy.sourceText || DEFAULT_ACME_POLICY.sourceText || '';
    const rawParagraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    return rawParagraphs.map((para, idx) => {
      const isHeading = para.trim().startsWith('SECTION') || para.trim().startsWith('ACME');
      const mapped = selectedPolicy.rules.filter((r) => {
        if (r.sourceParagraphIndex !== undefined) {
          return r.sourceParagraphIndex === idx;
        }
        if (r.sourceQuote && para.toLowerCase().includes(r.sourceQuote.slice(0, 30).toLowerCase())) {
          return true;
        }
        return false;
      });

      return {
        index: idx,
        text: para.trim(),
        isHeading,
        mappedRuleIds: mapped.map((r) => r.id),
        isUnmapped: !isHeading && mapped.length === 0,
      };
    });
  }, [selectedPolicy]);

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = selectedPolicy.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    const updatedPolicy: PolicyVersion = {
      ...selectedPolicy,
      rules: updatedRules,
    };

    if (selectedPolicy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
    }
    refreshPolicies(selectedPolicy.id);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!confirm(`Delete rule "${ruleId}"?`)) return;
    const updatedRules = selectedPolicy.rules.filter((r) => r.id !== ruleId);
    const updatedPolicy: PolicyVersion = {
      ...selectedPolicy,
      rules: updatedRules,
    };

    if (selectedPolicy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
    }
    refreshPolicies(selectedPolicy.id);
  };

  const handleOpenEditRule = (rule: PolicyRule) => {
    setEditingRule(JSON.parse(JSON.stringify(rule)));
    setRuleJsonText(JSON.stringify(rule, null, 2));
    setRuleJsonError(null);
    setEditInJsonMode(false);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    let ruleToSave = editingRule;

    if (editInJsonMode) {
      try {
        const parsed = JSON.parse(ruleJsonText);
        if (!parsed.id || !parsed.title || !parsed.type) {
          setRuleJsonError('Rule must contain id, title, and type.');
          return;
        }
        ruleToSave = parsed;
      } catch (err: any) {
        setRuleJsonError(`JSON Syntax Error: ${err.message}`);
        return;
      }
    }

    const updatedRules = selectedPolicy.rules.map((r) =>
      r.id === ruleToSave.id ? ruleToSave : r
    );

    const updatedPolicy: PolicyVersion = {
      ...selectedPolicy,
      rules: updatedRules,
    };

    if (selectedPolicy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
    }
    refreshPolicies(selectedPolicy.id);
    setIsRuleModalOpen(false);
    setEditingRule(null);
    showNotification(`Saved rule "${ruleToSave.title}".`);
  };

  const handleAddNewRule = () => {
    const newRuleId = `rule_custom_${Date.now().toString().slice(-4)}`;
    const newRule: PolicyRule = {
      id: newRuleId,
      type: 'cap',
      section: 'Section 4 - Custom Rule',
      title: 'Custom Travel Cap',
      priority: 45,
      enabled: true,
      sourceQuote: 'Custom company guideline.',
      conditions: { category: ['meals'] },
      parameters: {
        capAmountMinor: 250000,
        capPeriod: 'day',
        capScope: 'employee',
        onViolationBehavior: 'cap',
      },
    };

    const updatedPolicy: PolicyVersion = {
      ...selectedPolicy,
      rules: [...selectedPolicy.rules, newRule],
    };

    if (selectedPolicy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
    }
    refreshPolicies(selectedPolicy.id);
    handleOpenEditRule(newRule);
  };

  const handleUpdateCityTier = (city: string, tier: CityTier) => {
    const updatedPolicy: PolicyVersion = {
      ...selectedPolicy,
      cityTiers: {
        ...selectedPolicy.cityTiers,
        [city]: tier,
      },
    };

    if (selectedPolicy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
    }
    refreshPolicies(selectedPolicy.id);
  };

  const handleFileUpload = async (file: File) => {
    setPdfError(null);
    setUploadedFileName(file.name);
    setUploadedFileSize((file.size / 1024).toFixed(1) + ' KB');

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setIsExtractingPdf(true);
      setExtractionProgress('Extracting text from PDF pages...');
      try {
        const arrayBuffer = await file.arrayBuffer();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;

        const res = await extractPdfText(base64Data, file.name, arrayBuffer);
        if (!res.text || res.text.trim().length === 0) {
          setPdfError('No selectable text found in this PDF (it may be a scanned image or non-searchable). You can type or paste policy clauses below.');
          showNotification('No text detected in PDF. You can paste or type clauses manually.');
        } else {
          setUploadText(res.text);
          setPdfStats({ pageCount: res.pageCount, wordCount: res.wordCount });
          showNotification(`Extracted ${res.wordCount} words (${res.pageCount} page${res.pageCount > 1 ? 's' : ''}) from "${file.name}".`);
        }
      } catch (err: any) {
        console.error('PDF text extraction error:', err);
        setPdfError(`Extraction note: ${err?.message || 'Unable to parse PDF'}. You can paste clauses directly below.`);
        showNotification('Could not extract PDF text automatically. Manual entry is available below.');
      } finally {
        setIsExtractingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setUploadText(text);
        const words = text.split(/\s+/).filter(Boolean).length;
        setPdfStats({ pageCount: 1, wordCount: words });
        showNotification(`Loaded ${words} words from "${file.name}".`);
      };
      reader.readAsText(file);
    }
  };

  const handleStartExtraction = async () => {
    setIsExtracting(true);
    setExtractionProgress('Reading document clauses...');

    try {
      let draft: PolicyVersion;

      if (createMode === 'upload') {
        setExtractionProgress('Synthesizing structured rules (caps, exclusions, thresholds)...');
        const title = uploadedFileName
          ? `Parsed: ${uploadedFileName.replace(/\.[^/.]+$/, '')}`
          : 'Policy Draft v2';

        draft = await ingestPolicyDocument({
          text: uploadText || DEFAULT_ACME_POLICY.sourceText || '',
          fileName: uploadedFileName,
          policyName: title,
        });
      } else if (createMode === 'template') {
        draft = createDraftFromTemplate(selectedTemplate === 'tech_startup' ? 'tech_startup' : 'enterprise');
      } else {
        draft = createDraftFromActive(manualTitle);
        const capMinor = parseInt(manualTier1Cap || '2500', 10) * 100;
        const cap2Minor = parseInt(manualTier2Cap || '1800', 10) * 100;
        const threshMinor = parseInt(manualThreshold || '10000', 10) * 100;
        draft.settings.baseCurrency = manualCurrency;
        draft.rules = draft.rules.map((r) => {
          if (r.id === 'rule_cap_tier1_daily_meal') {
            return { ...r, parameters: { ...r.parameters, capAmountMinor: capMinor } };
          }
          if (r.id === 'rule_cap_tier2_daily_meal') {
            return { ...r, parameters: { ...r.parameters, capAmountMinor: cap2Minor } };
          }
          if (r.id === 'rule_threshold_finance') {
            return { ...r, parameters: { ...r.parameters, thresholdAmountMinor: threshMinor } };
          }
          return r;
        });
        saveDraftPolicy(draft);
      }

      setExtractionProgress('Validating Zod schemas & detecting conflict warnings...');
      await new Promise((r) => setTimeout(r, 400));

      refreshPolicies(draft.id);
      setIsCreateModalOpen(false);
      setUploadText('');
      setUploadedFileName('');
      setUploadedFileSize(null);
      setPdfStats(null);
      setActiveTab('review');
      showNotification(`Created draft: "${draft.name}" with ${draft.rules.length} policy rules.`);
    } catch (err: any) {
      console.error('Extraction error:', err);
      showNotification('Error creating policy draft.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmDismissWarning = () => {
    if (!dismissingWarning) return;
    const updated = dismissConflictWarning(
      selectedPolicy,
      dismissingWarning.id,
      dismissingWarning.title,
      dismissalNote || 'Acknowledged by finance auditor.'
    );
    refreshPolicies(updated.id);
    setDismissingWarning(null);
    setDismissalNote('');
    showNotification('Warning dismissed.');
  };

  const handleRunSandbox = (preset: typeof sandboxPreset) => {
    setSandboxPreset(preset);

    const baseClaim: Expense = {
      id: `exp_sandbox_${Date.now()}`,
      orgId: 'org_acme',
      employeeId: 'emp_101',
      employeeName: 'Alice Walker',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-15',
      submittedAt: '2026-10-15T12:00:00Z',
      receiptRef: { mimeType: 'image/jpeg', originalSha256: 'sandbox_hash', fileSize: 100000 },
      extracted: {
        merchant: { value: 'Mainland China', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-15', confidence: 0.98, inferred: false, source: 'ocr' },
        total: { value: 3400, confidence: 0.98, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          { id: 'li_1', description: 'Chinese Cuisine Dinner', quantity: 1, unitPrice: 2600, amount: 2600, category: 'meals', confidence: 0.95, itemFlags: [] },
          { id: 'li_2', description: 'Craft Beer', quantity: 2, unitPrice: 400, amount: 800, category: 'meals', confidence: 0.92, itemFlags: ['alcohol'] },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 340000,
        targetCurrency: 'INR',
        targetAmountMinor: 340000,
        fxRate: 1.0,
        fxDate: '2026-10-15',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Mumbai', cityTier: 'Tier-1', isTravel: true, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    if (preset === 'pune_lunch') {
      baseClaim.extracted!.merchant!.value = 'Vaishali Restaurant';
      baseClaim.extracted!.total!.value = 1500;
      baseClaim.extracted!.lineItems = [
        { id: 'li_1', description: 'South Indian Lunch', quantity: 1, unitPrice: 1500, amount: 1500, category: 'meals', confidence: 0.98, itemFlags: [] },
      ];
      baseClaim.normalizedCurrency!.sourceAmountMinor = 150000;
      baseClaim.normalizedCurrency!.targetAmountMinor = 150000;
      baseClaim.context!.city = 'Pune';
      baseClaim.context!.cityTier = 'Tier-2';
    } else if (preset === 'late_cab') {
      baseClaim.extracted!.merchant!.value = 'Uber India';
      baseClaim.extracted!.total!.value = 850;
      baseClaim.extracted!.lineItems = [
        { id: 'li_1', description: 'Airport Drop Cab', quantity: 1, unitPrice: 850, amount: 850, category: 'transportation', confidence: 0.98, itemFlags: [] },
      ];
      baseClaim.normalizedCurrency!.sourceAmountMinor = 85000;
      baseClaim.normalizedCurrency!.targetAmountMinor = 85000;
      baseClaim.context!.city = 'Bengaluru';
      baseClaim.context!.cityTier = 'Tier-1';
    } else if (preset === 'high_client') {
      baseClaim.extracted!.merchant!.value = 'Taj Palace Dining';
      baseClaim.extracted!.total!.value = 28000;
      baseClaim.extracted!.lineItems = [
        { id: 'li_1', description: 'Executive Client Dinner', quantity: 1, unitPrice: 28000, amount: 28000, category: 'client entertainment', confidence: 0.95, itemFlags: [] },
      ];
      baseClaim.normalizedCurrency!.sourceAmountMinor = 2800000;
      baseClaim.normalizedCurrency!.targetAmountMinor = 2800000;
      baseClaim.context!.clientName = 'Global Corp';
      baseClaim.context!.attendeeCount = 4;
      baseClaim.context!.purpose = 'Q4 Contract Closing';
    }

    const verdict = evaluateExpense({
      expense: baseClaim,
      policy: selectedPolicy,
      employee: DEMO_EMPLOYEES[0],
      ledger: new ExpenseLedger(),
    });

    setSandboxResult(verdict);
  };

  const handleRunBacktest = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const expenses = getAllExpenses().length > 0 ? getAllExpenses() : SYNTHETIC_EXPENSES;
      const res = simulatePolicyChange({
        activePolicy,
        draftPolicy: selectedPolicy,
        expenses,
        employees: DEMO_EMPLOYEES,
      });
      setSimulationResult(res);
      setIsSimulating(false);
      showNotification(`Simulation evaluated ${res.totalExpensesEvaluated} claims.`);
    }, 500);
  };

  const handleConfirmActivation = () => {
    if (!activationChangeNote.trim()) {
      alert('Please enter a change note for the audit log.');
      return;
    }

    const newActive = activateDraftPolicy(
      selectedPolicy,
      activationChangeNote,
      reevaluatePending
    );

    refreshPolicies(newActive.id);
    setIsActivateModalOpen(false);
    setActivationChangeNote('');
    setActiveTab('review');
    showNotification(`Policy v${newActive.versionNumber} activated.`);
  };

  const handleAddGapRule = (gap: PolicyGapSuggestion) => {
    const updatedPolicy: PolicyVersion = {
      ...selectedPolicy,
      rules: [...selectedPolicy.rules, gap.suggestedRule as PolicyRule],
    };
    if (selectedPolicy.status === 'active') {
      saveActivePolicy(updatedPolicy);
      setActivePolicy(updatedPolicy);
    } else {
      saveDraftPolicy(updatedPolicy);
    }
    refreshPolicies(selectedPolicy.id);
    showNotification(`Added "${gap.suggestedRule.title}".`);
  };

  const handleAskQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionText.trim()) return;
    const res = queryPolicyGrounded(questionText, selectedPolicy);
    setQaResult(res);
  };

  const filteredRules = selectedPolicy.rules
    .filter((r) => {
      if (ruleTypeFilter !== 'all' && r.type !== ruleTypeFilter) return false;
      if (!ruleSearchQuery.trim()) return true;
      const q = ruleSearchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* Top Header - Minimal */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Policies</h1>
          <span className="text-xs font-mono-code font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            v{activePolicy.versionNumber} Active
          </span>
        </div>

        <button
          onClick={() => {
            setCreateMode('upload');
            setIsCreateModalOpen(true);
          }}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Policy</span>
        </button>
      </div>

      {notice && (
        <div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* MINIMAL POLICY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {allPolicies.map((pol) => {
          const isSel = selectedPolicyId === pol.id;
          const polActive = pol.status === 'active';
          const polDraft = pol.status === 'draft';

          return (
            <div
              key={pol.id}
              onClick={() => setSelectedPolicyId(pol.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSel
                  ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        polActive ? 'bg-emerald-500' : polDraft ? 'bg-amber-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-mono-code font-medium text-slate-700">v{pol.versionNumber}</span>
                    <span className="text-slate-400 capitalize">· {pol.status}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono-code">{pol.settings.baseCurrency}</span>
                </div>

                <h3 className="font-semibold text-xs text-slate-900 truncate">{pol.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{pol.rules.length} rules</p>
              </div>

              <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-end">
                <span className={`text-[11px] font-medium flex items-center gap-0.5 ${isSel ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                  <span>{isSel ? 'Selected' : 'Inspect'}</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}

        {/* Minimal Add Policy Card */}
        <div
          onClick={() => {
            setCreateMode('upload');
            setIsCreateModalOpen(true);
          }}
          className="p-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center min-h-[80px]"
        >
          <Plus className="w-4 h-4 text-slate-500 mb-0.5" />
          <span className="text-xs font-semibold text-slate-700">Add Policy</span>
        </div>
      </div>

      {/* SELECTED POLICY WORKSPACE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Workspace Top Bar */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-emerald-500' : isDraft ? 'bg-amber-500' : 'bg-slate-400'
              }`}
            />
            <h2 className="text-xs font-bold text-slate-900">{selectedPolicy.name}</h2>
            <span className="text-[10px] font-mono-code px-1.5 py-0.2 bg-white border border-slate-200 rounded text-slate-600">
              v{selectedPolicy.versionNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isDraft && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('test');
                    handleRunBacktest();
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-slate-600" />
                  <span>Simulate</span>
                </button>

                <button
                  onClick={() => setIsActivateModalOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <FileCheck2 className="w-3 h-3" />
                  <span>Activate v{selectedPolicy.versionNumber}</span>
                </button>
              </>
            )}

            {isActive && (
              <button
                onClick={() => {
                  const draft = createDraftFromActive();
                  refreshPolicies(draft.id);
                  showNotification(`Draft v${draft.versionNumber} created.`);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Draft Revision</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Navigation Tabs */}
        <div className="flex items-center gap-5 px-4 border-b border-slate-200 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('review')}
            className={`py-2.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'review'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900 -mb-[1px]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Review
          </button>


          <button
            onClick={() => setActiveTab('checks')}
            className={`py-2.5 cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'checks'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900 -mb-[1px]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Conflicts</span>
            {activeConflictsCount > 0 && (
              <span className="text-[10px] font-mono-code px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full font-bold">
                {activeConflictsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-2.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'test'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900 -mb-[1px]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Simulator
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`py-2.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'diff'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900 -mb-[1px]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Diff & History
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`py-2.5 cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'qa'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900 -mb-[1px]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot className="w-3 h-3 text-emerald-600" />
            <span>Q&A & Gaps</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-4">
          {/* TAB 1: REVIEW SIDE-BY-SIDE */}
          {activeTab === 'review' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={ruleSearchQuery}
                    onChange={(e) => setRuleSearchQuery(e.target.value)}
                    placeholder="Search rules..."
                    className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 w-44"
                  />
                </div>

                <button
                  onClick={handleAddNewRule}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Rule</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[500px]">
                {/* LEFT: ORIGINAL TEXT */}
                <div className="lg:col-span-5 bg-slate-50/60 border border-slate-200 rounded-xl p-3 overflow-y-auto max-h-[600px] space-y-2">
                  {parsedParagraphs.map((para) => {
                    const isParaHighlighted =
                      highlightedParagraphIdx === para.index ||
                      (highlightedRuleId && para.mappedRuleIds.includes(highlightedRuleId));

                    return (
                      <div
                        key={para.index}
                        onClick={() => {
                          setHighlightedParagraphIdx(para.index);
                          if (para.mappedRuleIds.length > 0) {
                            setHighlightedRuleId(para.mappedRuleIds[0]);
                          } else {
                            setHighlightedRuleId(null);
                          }
                        }}
                        className={`p-2.5 rounded-lg text-xs leading-relaxed transition-all cursor-pointer border ${
                          para.isHeading
                            ? 'font-bold text-slate-800 bg-slate-100/70 border-transparent text-[11px] uppercase tracking-wide'
                            : isParaHighlighted
                            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-200 text-slate-900'
                            : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <p className={para.isHeading ? '' : 'font-mono-code text-[11px]'}>
                          {para.text}
                        </p>

                        {para.isUnmapped && (
                          <div className="mt-1 text-[10px] font-mono-code text-slate-400">
                            Unmapped
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT: GENERATED RULES */}
                <div className="lg:col-span-7 space-y-2">
                  <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1">
                    {['all', 'cap', 'exclusion', 'requirement', 'threshold', 'time_window'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setRuleTypeFilter(type)}
                        className={`px-2 py-0.5 rounded text-xs capitalize transition-colors cursor-pointer ${
                          ruleTypeFilter === type
                            ? 'bg-slate-900 text-white font-medium'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[540px] pr-1">
                    {filteredRules.map((rule) => {
                      const isHighlighted = highlightedRuleId === rule.id;

                      return (
                        <div
                          key={rule.id}
                          onClick={() => {
                            setHighlightedRuleId(rule.id);
                            if (rule.sourceParagraphIndex !== undefined) {
                              setHighlightedParagraphIdx(rule.sourceParagraphIndex);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isHighlighted
                              ? 'bg-white border-emerald-400 ring-2 ring-emerald-100 shadow-2xs'
                              : rule.enabled
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-mono-code text-[10px] text-slate-400 font-semibold">
                                  P{rule.priority}
                                </span>
                                <span className="text-[10px] font-mono-code uppercase font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                                  {rule.type.replace('_', ' ')}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                                {rule.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenEditRule(rule)}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleRule(rule.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                  rule.enabled
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </button>

                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {rule.isAmbiguous && (
                            <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{rule.ambiguityNote || "Ambiguous clause (no numeric limit)."}</span>
                            </div>
                          )}

                          {rule.sourceQuote && (
                            <p className="mt-1.5 text-[11px] text-slate-500 font-mono-code line-clamp-1 italic">
                              "{rule.sourceQuote}"
                            </p>
                          )}

                          <div className="mt-1.5 text-[11px] text-slate-500 flex flex-wrap gap-x-2.5">
                            {rule.parameters.capAmountMinor !== undefined && (
                              <span>Cap: <strong className="text-slate-800">₹{(rule.parameters.capAmountMinor / 100).toLocaleString()}</strong></span>
                            )}
                            {rule.parameters.capPeriod && (
                              <span>Period: <strong className="text-slate-800">{rule.parameters.capPeriod}</strong></span>
                            )}
                            {rule.parameters.thresholdAmountMinor !== undefined && (
                              <span>Threshold: <strong className="text-slate-800">₹{(rule.parameters.thresholdAmountMinor / 100).toLocaleString()}</strong></span>
                            )}
                            {rule.parameters.timeWindowDays !== undefined && (
                              <span>Window: <strong className="text-slate-800">{rule.parameters.timeWindowDays}d</strong></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 3: CONFLICTS & CHECKS */}
          {activeTab === 'checks' && (
            <div className="space-y-3 max-w-2xl">
              {structuredConflicts.length === 0 ? (
                <div className="p-6 text-center bg-emerald-50/40 border border-emerald-200/60 rounded-xl space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  <div className="text-xs font-semibold text-emerald-900">No conflicts detected</div>
                </div>
              ) : (
                structuredConflicts.map((conf) => (
                  <div
                    key={conf.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      conf.isDismissed
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : conf.severity === 'error'
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{conf.title}</h4>
                          <span className="text-[10px] font-mono-code uppercase px-1 py-0.2 bg-white/70 rounded">
                            {conf.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-slate-700 mt-1">{conf.description}</p>
                      </div>

                      {!conf.isDismissed && (
                        <button
                          onClick={() => {
                            setDismissingWarning(conf);
                            setDismissalNote('');
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer shrink-0"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: SIMULATOR & TEST */}
          {activeTab === 'test' && (
            <div className="space-y-5">
              {/* Sandbox */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Sandbox: Sample Verdict
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'mumbai_beer', label: 'Mumbai Dinner (₹3,400)' },
                    { id: 'pune_lunch', label: 'Pune Lunch (₹1,500)' },
                    { id: 'late_cab', label: 'Late Cab (₹850)' },
                    { id: 'high_client', label: 'Client Dinner (₹28,000)' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleRunSandbox(preset.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                        sandboxPreset === preset.id && sandboxResult
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {sandboxResult && (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">Verdict:</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100">
                          {sandboxResult.decision.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono-code text-[11px]">
                        <span>Approved: <strong className="text-emerald-700">₹{(sandboxResult.approvedAmountMinor / 100).toLocaleString()}</strong></span>
                        {sandboxResult.rejectedAmountMinor > 0 && (
                          <span>Excluded: <strong className="text-rose-600">₹{(sandboxResult.rejectedAmountMinor / 100).toLocaleString()}</strong></span>
                        )}
                      </div>
                    </div>

                    {sandboxResult.ruleImpacts.map((imp, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 flex justify-between">
                        <span>{imp.ruleId}: {imp.explanation}</span>
                        <span className="font-mono-code text-rose-600">-₹{(imp.impactAmountMinor / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Backtest Replay */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Simulator Replay
                  </span>

                  <button
                    onClick={handleRunBacktest}
                    disabled={isSimulating}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
                    <span>{isSimulating ? 'Replaying...' : 'Run Replay'}</span>
                  </button>
                </div>

                {simulationResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-[11px] text-slate-500">Reimbursed</div>
                        <div className="font-bold text-slate-900 font-mono-code text-sm mt-0.5">
                          ₹{(simulationResult.draftTotalReimbursedMinor / 100).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono-code">
                          {simulationResult.deltaReimbursedMinor <= 0 ? '▼ Save ' : '▲ Increase '}
                          ₹{Math.abs(simulationResult.deltaReimbursedMinor / 100).toLocaleString()}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-[11px] text-slate-500">Changed Claims</div>
                        <div className="font-bold text-slate-900 font-mono-code text-sm mt-0.5">
                          {simulationResult.changedVerdictsCount}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          of {simulationResult.totalExpensesEvaluated} claims
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-[11px] text-slate-500">Touchless Rate</div>
                        <div className="font-bold text-slate-900 font-mono-code text-sm mt-0.5">
                          {simulationResult.touchlessRateDraft}%
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Active: {simulationResult.touchlessRateActive}%
                        </div>
                      </div>
                    </div>

                    {simulationResult.changedClaims.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {simulationResult.changedClaims.map((claim, idx) => (
                            <div key={idx} className="p-2.5 hover:bg-slate-50 flex items-center justify-between">
                              <div>
                                <span className="font-mono-code font-bold text-slate-800">{claim.expenseId}</span>
                                <span className="text-slate-500 ml-2">{claim.deltaReason}</span>
                              </div>
                              <div className="font-mono-code text-[11px]">
                                {claim.activeDecision} → <strong>{claim.draftDecision}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DIFF & HISTORY */}
          {activeTab === 'diff' && (
            <div className="space-y-4 max-w-2xl text-xs">
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                <span className="font-bold text-slate-900 uppercase text-[11px]">
                  Diff (v{activePolicy.versionNumber} vs v{selectedPolicy.versionNumber})
                </span>

                {policyDiff.modifiedRules.length === 0 &&
                policyDiff.addedRules.length === 0 &&
                policyDiff.removedRules.length === 0 ? (
                  <p className="text-slate-400 py-1">No rule differences between versions.</p>
                ) : (
                  <div className="space-y-1.5">
                    {policyDiff.modifiedRules.map((m) => (
                      <div key={m.ruleId} className="p-2 bg-amber-50/60 border border-amber-200 rounded">
                        <div className="font-semibold text-slate-900">{m.title}</div>
                        {m.changes.map((c, i) => (
                          <div key={i} className="text-[11px] text-amber-900 font-mono-code">• {c}</div>
                        ))}
                      </div>
                    ))}
                    {policyDiff.addedRules.map((r) => (
                      <div key={r.id} className="p-2 bg-emerald-50/60 border border-emerald-200 rounded font-medium text-emerald-900">
                        + Added: {r.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Log */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  Audit Trail
                </div>
                <div className="divide-y divide-slate-100">
                  {getPolicyAuditLog().map((log) => (
                    <div key={log.id} className="p-3 hover:bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code font-bold text-slate-900">v{log.versionNumber}</span>
                        <span className="text-slate-400 font-mono-code text-[11px]">
                          {new Date(log.activatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-0.5">"{log.changeNote}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Q&A & GAPS */}
          {activeTab === 'qa' && (
            <div className="space-y-4 max-w-2xl">
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2.5">
                <span className="text-xs font-bold text-slate-900 uppercase">Policy Q&A</span>

                <form onSubmit={handleAskQuestion} className="flex gap-2">
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g. Can I expense a cab after 10 pm?"
                    className="w-full px-3 py-1.5 bg-white rounded-lg text-xs border border-slate-200 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer shrink-0"
                  >
                    Ask
                  </button>
                </form>

                {qaResult && (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    <p className="text-slate-800">{qaResult.answer}</p>
                    {qaResult.citedRule && (
                      <div className="text-[11px] text-slate-500 font-mono-code">
                        Cited: {qaResult.citedRule.title} ({qaResult.citedRule.section})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Gap Suggestions */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5">
                <span className="text-xs font-bold text-slate-900 uppercase">Gap Detection</span>
                <div className="space-y-2">
                  {gapSuggestions.map((gap) => (
                    <div
                      key={gap.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{gap.issue}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Suggested rule: {gap.suggestedRule.title} (₹{((gap.suggestedRule.parameters?.capAmountMinor || 0) / 100).toLocaleString()})
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddGapRule(gap)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer shrink-0"
                      >
                        + Add Rule
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW POLICY MODAL (PORTALED TO DOCUMENT.BODY) */}
      {isCreateModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Add Reimbursement Policy</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extract rules with Gemini AI, start from a template, or set up manually.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isExtracting ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 animate-spin">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Extracting Rules with Gemini AI</h4>
                    <p className="text-xs text-slate-500 mt-1 font-mono-code">{extractionProgress}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Mode Selector */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-center font-medium">
                    <button
                      onClick={() => setCreateMode('upload')}
                      className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                        createMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Upload / Paste
                    </button>
                    <button
                      onClick={() => setCreateMode('template')}
                      className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                        createMode === 'template' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Template
                    </button>
                    <button
                      onClick={() => setCreateMode('manual')}
                      className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                        createMode === 'manual' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Manual
                    </button>
                  </div>

                  {/* Mode 1: Upload / Paste */}
                  {createMode === 'upload' && (
                    <div className="space-y-3">
                      {/* Styled File Upload Drop Zone */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.md"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                          }
                        }}
                      />

                      {isExtractingPdf ? (
                        <div className="p-4 border-2 border-dashed border-emerald-400 rounded-xl bg-emerald-50/40 flex flex-col items-center justify-center text-center animate-pulse">
                          <div className="w-8 h-8 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-600 mb-1.5 shadow-2xs">
                            <Bot className="w-4 h-4 animate-spin" />
                          </div>
                          <span className="text-xs font-semibold text-slate-900">
                            Extracting Text from PDF...
                          </span>
                          <span className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                            Parsing document pages & taking out all clauses
                          </span>
                        </div>
                      ) : uploadedFileName ? (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <div>
                              <div className="font-semibold text-slate-800 text-xs">{uploadedFileName}</div>
                              <div className="text-[11px] text-emerald-700 font-medium">
                                {uploadedFileSize}
                                {pdfStats ? ` · ${pdfStats.pageCount || 1} page${(pdfStats.pageCount || 1) > 1 ? 's' : ''} · ${pdfStats.wordCount?.toLocaleString() || 0} words extracted` : ' · Ready for rule extraction'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFileName('');
                              setUploadedFileSize(null);
                              setUploadText('');
                              setPdfStats(null);
                              setPdfError(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-xs text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="p-4 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl bg-slate-50/50 hover:bg-emerald-50/20 transition-colors cursor-pointer flex flex-col items-center justify-center text-center"
                        >
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-600 mb-1.5 shadow-2xs">
                            <UploadCloud className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold text-slate-800">
                            Click to upload PDF, TXT, or Markdown
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            Handbooks, travel guidelines, or company policy clauses
                          </span>
                        </div>
                      )}

                      {pdfError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{pdfError}</span>
                        </div>
                      )}

                      {/* Textarea for Pasting / Reviewing Extracted Clauses */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-600 font-medium text-xs">
                            {uploadText ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Extracted Policy Text ({uploadText.split(/\s+/).filter(Boolean).length} words)
                              </span>
                            ) : (
                              'Or Paste Policy Clauses'
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadText(SAMPLE_POLICY_TEXT);
                              setUploadedFileName('');
                              setPdfStats({ pageCount: 1, wordCount: SAMPLE_POLICY_TEXT.split(/\s+/).filter(Boolean).length });
                            }}
                            className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
                          >
                            Paste Sample Policy
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={uploadText}
                          onChange={(e) => setUploadText(e.target.value)}
                          placeholder="Extracted PDF text or pasted policy clauses will appear here..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono-code focus:outline-none focus:border-slate-400 focus:bg-white resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Start from Template */}
                  {createMode === 'template' && (
                    <div className="space-y-2.5">
                      <div
                        onClick={() => setSelectedTemplate('enterprise')}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                          selectedTemplate === 'enterprise'
                            ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-xs">Global Enterprise Standard</span>
                          {selectedTemplate === 'enterprise' && <Check className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Daily meal caps (₹3,000/day), alcohol exclusion, and ₹10,000 finance review threshold.
                        </p>
                      </div>

                      <div
                        onClick={() => setSelectedTemplate('tech_startup')}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                          selectedTemplate === 'tech_startup'
                            ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-xs">Tech Startup (Lean & Fast)</span>
                          {selectedTemplate === 'tech_startup' && <Check className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Flat ₹2,000/day meal limit across all cities, ₹5,000 auto-approval threshold, and shared transit rules.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Manual Configuration */}
                  {createMode === 'manual' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Policy Title</label>
                        <input
                          type="text"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white text-xs font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Base Currency</label>
                          <select
                            value={manualCurrency}
                            onChange={(e) => setManualCurrency(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                          >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Finance Review Threshold</label>
                          <input
                            type="number"
                            value={manualThreshold}
                            onChange={(e) => setManualThreshold(e.target.value)}
                            placeholder="10000"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Daily Meal Cap (₹)</label>
                        <input
                          type="number"
                          value={manualTier1Cap}
                          onChange={(e) => {
                            setManualTier1Cap(e.target.value);
                            setManualTier2Cap(e.target.value);
                          }}
                          placeholder="3000"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleStartExtraction}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>{createMode === 'manual' ? 'Create Policy' : 'Extract Rules with AI'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* RULE EDIT MODAL (PORTALED TO DOCUMENT.BODY) */}
      {isRuleModalOpen &&
        editingRule &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-sm text-slate-900">Edit Rule ({editingRule.id})</h3>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setEditInJsonMode(false)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      !editInJsonMode ? 'bg-white text-slate-900 font-medium shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRuleJsonText(JSON.stringify(editingRule, null, 2));
                      setEditInJsonMode(true);
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 ${
                      editInJsonMode ? 'bg-white text-slate-900 font-medium shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {editInJsonMode ? (
                <div className="space-y-2">
                  <textarea
                    rows={12}
                    value={ruleJsonText}
                    onChange={(e) => setRuleJsonText(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 text-slate-100 rounded-xl font-mono-code text-[11px] focus:outline-none"
                  />
                  {ruleJsonError && (
                    <p className="text-xs text-rose-600">{ruleJsonError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Rule Title</label>
                    <input
                      type="text"
                      value={editingRule.title}
                      onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-600 mb-0.5">Section</label>
                      <input
                        type="text"
                        value={editingRule.section}
                        onChange={(e) => setEditingRule({ ...editingRule, section: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Priority</label>
                      <input
                        type="number"
                        value={editingRule.priority}
                        onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value || '50', 10) })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {editingRule.parameters.capAmountMinor !== undefined && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-600 mb-0.5">Cap (₹)</label>
                        <input
                          type="number"
                          value={((editingRule.parameters.capAmountMinor || 0) / 100).toString()}
                          onChange={(e) =>
                            setEditingRule({
                              ...editingRule,
                              parameters: {
                                ...editingRule.parameters,
                                capAmountMinor: parseInt(e.target.value || '0', 10) * 100,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">Period</label>
                        <select
                          value={editingRule.parameters.capPeriod || 'day'}
                          onChange={(e) =>
                            setEditingRule({
                              ...editingRule,
                              parameters: { ...editingRule.parameters, capPeriod: e.target.value as any },
                            })
                          }
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="per_claim">Per Claim</option>
                          <option value="day">Day</option>
                          <option value="month">Month</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* DISMISS MODAL (PORTALED TO DOCUMENT.BODY) */}
      {dismissingWarning &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="font-bold text-slate-900">Dismiss Conflict</h3>
              <p className="text-slate-600">{dismissingWarning.title}</p>
              <textarea
                rows={2}
                value={dismissalNote}
                onChange={(e) => setDismissalNote(e.target.value)}
                placeholder="Audit note (e.g. Acknowledged exception)..."
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDismissingWarning(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDismissWarning}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ACTIVATE MODAL (PORTALED TO DOCUMENT.BODY) */}
      {isActivateModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="font-bold text-slate-900">Activate Policy v{selectedPolicy.versionNumber}</h3>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Change Note</label>
                <textarea
                  rows={2}
                  value={activationChangeNote}
                  onChange={(e) => setActivationChangeNote(e.target.value)}
                  placeholder="e.g. Lowered daily meal cap to ₹2,500."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsActivateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmActivation}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg font-medium"
                >
                  Activate
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
