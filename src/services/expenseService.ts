import {
  AuditActor,
  ClaimStatus,
  Employee,
  Expense,
  Verdict,
} from '../types/expense';
import {
  evaluateExpense,
  ExpenseLedger,
  detectDuplicates,
  calculateAnomalyRisk,
  normalizeCurrency,
  verifyReceiptIntegrity,
} from '../engine';
import { getActivePolicy } from './policyService';
import { DEMO_EMPLOYEES } from './employeeService';
import { logAuditEvent, getAuditEventsForExpense } from './auditService';

const STORAGE_KEY_EXPENSES = 'keepr_expenses_v1';

export function getAllExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    console.error('Failed reading expenses from storage:', err);
  }
  return [];
}

export function saveAllExpenses(expenses: Expense[]): void {
  localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
}

export function getEmployeeExpenses(employeeId: string): Expense[] {
  return getAllExpenses().filter((e) => e.employeeId === employeeId);
}

export function getExpenseById(expenseId: string): Expense | undefined {
  return getAllExpenses().find((e) => e.id === expenseId);
}

/**
 * Replays chronological ledger for an organization / employee to ensure all
 * caps and allowances reflect exact order of events.
 */
export function replayLedger(expenses: Expense[]): {
  ledger: ExpenseLedger;
  reflowCount: number;
} {
  const policy = getActivePolicy();
  const ledger = new ExpenseLedger();
  let reflowCount = 0;

  // Sort chronologically: expenseDate ASC, submittedAt ASC, id ASC
  const sorted = [...expenses].sort((a, b) => {
    if (a.expenseDate !== b.expenseDate) return a.expenseDate.localeCompare(b.expenseDate);
    if (a.submittedAt !== b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt);
    return a.id.localeCompare(b.id);
  });

  for (const exp of sorted) {
    const employee = DEMO_EMPLOYEES.find((emp) => emp.id === exp.employeeId) || {
      id: exp.employeeId,
      orgId: exp.orgId,
      identity: { email: `${exp.employeeId}@acme.com`, name: exp.employeeId },
      role: 'employee' as const,
      department: 'Engineering',
      grade: 'L4',
      homeCity: 'Bengaluru',
    };

    // Calculate verdict with updated ledger state
    const priorVerdict = exp.verdict;
    const newVerdict = evaluateExpense({
      expense: exp,
      policy,
      employee,
      ledger,
      reviewerOverride: exp.reviewerAction?.overrideAmountMinor !== undefined
        ? {
            overrideAmountMinor: exp.reviewerAction.overrideAmountMinor,
            reason: exp.reviewerAction.reason,
            reviewerId: exp.reviewerAction.reviewerId,
          }
        : undefined,
    });

    // Check if materially reflowed
    if (
      priorVerdict &&
      (priorVerdict.approvedAmountMinor !== newVerdict.approvedAmountMinor ||
        priorVerdict.decision !== newVerdict.decision)
    ) {
      reflowCount++;
      logAuditEvent({
        orgId: exp.orgId,
        expenseId: exp.id,
        actor: { id: 'system', name: 'Deterministic Ledger Engine', role: 'admin' },
        action: 'LEDGER_REFLOW',
        entity: 'ledger',
        details: {
          priorApprovedMinor: priorVerdict.approvedAmountMinor,
          newApprovedMinor: newVerdict.approvedAmountMinor,
          reason: 'Cumulative spend allowance reflowed due to chronological receipt order.',
        },
        changeSummary: `Reimbursement updated from ${(priorVerdict.approvedAmountMinor / 100).toFixed(2)} to ${(newVerdict.approvedAmountMinor / 100).toFixed(2)}.`,
      });
    }

    exp.verdict = newVerdict;
    exp.status = newVerdict.status;

    // Record in ledger
    ledger.record({
      expenseId: exp.id,
      employeeId: exp.employeeId,
      expenseDate: exp.expenseDate,
      submittedAt: exp.submittedAt,
      category: exp.extracted?.lineItems?.[0]?.category || 'General',
      city: exp.context?.city,
      tripId: exp.context?.tripId,
      approvedAmountMinor: newVerdict.approvedAmountMinor,
      status: newVerdict.status,
      verdictDecision: newVerdict.decision,
      isOverride: Boolean(exp.reviewerAction?.overrideAmountMinor !== undefined),
    });
  }

  saveAllExpenses(sorted);
  return { ledger, reflowCount };
}

/**
 * Submits a new expense, performs duplicate detection, integrity analysis,
 * deterministic policy evaluation, and persists to ledger.
 */
export function submitExpense(newExpense: Expense): {
  expense: Expense;
  verdict: Verdict;
} {
  const all = getAllExpenses();
  const policy = getActivePolicy();
  const employee = DEMO_EMPLOYEES.find((e) => e.id === newExpense.employeeId) || DEMO_EMPLOYEES[0];

  // 1. Authoritative Currency Normalization
  const rawAmount = newExpense.corrected?.total ?? newExpense.extracted?.total?.value ?? 0;
  const rawCurr = newExpense.corrected?.currency ?? newExpense.extracted?.currency?.value ?? 'INR';
  const normalized = normalizeCurrency({
    sourceCurrency: rawCurr,
    sourceAmount: rawAmount,
    targetCurrency: policy.settings.baseCurrency,
    expenseDate: newExpense.expenseDate,
    policyFxRates: policy.settings.fxRates,
  });
  newExpense.normalizedCurrency = normalized;

  // 2. Arithmetic Integrity Check
  const lineItems = newExpense.corrected?.lineItems || newExpense.extracted?.lineItems || [];
  const tax = newExpense.corrected?.tax ?? newExpense.extracted?.tax?.value;
  const tip = newExpense.corrected?.tip ?? newExpense.extracted?.tip?.value;
  const integrity = verifyReceiptIntegrity({
    printedTotal: rawAmount,
    tax,
    tip,
    lineItems,
    expenseDate: newExpense.expenseDate,
  });
  newExpense.integritySignals = integrity.signals;

  // 3. Duplicate Detection across existing organization claims
  const dupInfo = detectDuplicates({
    currentExpense: newExpense,
    existingExpenses: all,
  });
  newExpense.duplicateInfo = dupInfo;

  // 4. Anomaly Risk Scoring
  const riskResult = calculateAnomalyRisk({
    expense: newExpense,
    historicalExpenses: all,
  });

  // 5. Build chronological ledger and evaluate
  const currentLedger = new ExpenseLedger();
  // Populate ledger with existing approved claims
  for (const exp of all) {
    if (exp.id !== newExpense.id && (exp.verdict?.approvedAmountMinor || 0) > 0) {
      currentLedger.record({
        expenseId: exp.id,
        employeeId: exp.employeeId,
        expenseDate: exp.expenseDate,
        submittedAt: exp.submittedAt,
        category: exp.extracted?.lineItems?.[0]?.category || 'General',
        city: exp.context?.city,
        tripId: exp.context?.tripId,
        approvedAmountMinor: exp.verdict!.approvedAmountMinor,
        status: exp.status,
        verdictDecision: exp.verdict!.decision,
        isOverride: false,
      });
    }
  }

  const verdict = evaluateExpense({
    expense: newExpense,
    policy,
    employee,
    ledger: currentLedger,
  });

  newExpense.verdict = verdict;
  newExpense.status = verdict.status;

  // Append claim
  all.push(newExpense);
  saveAllExpenses(all);

  // Append-only audit events
  logAuditEvent({
    orgId: newExpense.orgId,
    expenseId: newExpense.id,
    actor: { id: employee.id, name: employee.identity.name, role: employee.role },
    action: 'CLAIM_SUBMITTED',
    entity: 'expense',
    details: {
      amountMinor: normalized.targetAmountMinor,
      currency: normalized.targetCurrency,
      channel: newExpense.channel,
    },
    changeSummary: `Claim submitted for ${(normalized.targetAmountMinor / 100).toFixed(2)} ${normalized.targetCurrency}.`,
  });

  logAuditEvent({
    orgId: newExpense.orgId,
    expenseId: newExpense.id,
    actor: { id: 'system', name: 'Deterministic Evaluator', role: 'admin' },
    action: 'POLICY_EVALUATED',
    entity: 'verdict',
    details: {
      decision: verdict.decision,
      approvedMinor: verdict.approvedAmountMinor,
      riskScore: verdict.riskScore,
      ruleImpacts: verdict.ruleImpacts,
    },
    changeSummary: `Verdict derived: ${verdict.decision.toUpperCase()} (${(verdict.approvedAmountMinor / 100).toFixed(2)} approved).`,
  });

  // Replay chronological ledger to handle potential reflows if date is older
  replayLedger(all);

  return { expense: newExpense, verdict };
}

/**
 * Applies a reviewer action (Approve, Reject, Override, Request Info)
 */
export function applyReviewerDecision(params: {
  expenseId: string;
  reviewer: AuditActor;
  action: 'approve' | 'reject' | 'override' | 'request_info' | 'mark_paid';
  overrideAmountMinor?: number;
  reason: string;
}): Expense {
  const all = getAllExpenses();
  const expense = all.find((e) => e.id === params.expenseId);
  if (!expense) throw new Error(`Expense ${params.expenseId} not found.`);

  expense.reviewerAction = {
    reviewerId: params.reviewer.id,
    reviewerName: params.reviewer.name,
    action: params.action,
    timestamp: new Date().toISOString(),
    overrideAmountMinor: params.overrideAmountMinor,
    reason: params.reason,
  };

  if (params.action === 'override' && params.overrideAmountMinor !== undefined) {
    expense.status = 'approved';
    if (expense.verdict) {
      expense.verdict.approvedAmountMinor = params.overrideAmountMinor;
      expense.verdict.decision = 'approve';
      expense.verdict.status = 'approved';
    }
  } else if (params.action === 'approve') {
    expense.status = 'approved';
    if (expense.verdict) {
      expense.verdict.decision = 'approve';
      expense.verdict.status = 'approved';
    }
  } else if (params.action === 'reject') {
    expense.status = 'rejected';
    if (expense.verdict) {
      expense.verdict.decision = 'reject';
      expense.verdict.status = 'rejected';
      expense.verdict.approvedAmountMinor = 0;
      expense.verdict.rejectedAmountMinor = expense.normalizedCurrency.targetAmountMinor;
    }
  } else if (params.action === 'request_info') {
    expense.status = 'needs_info';
    if (expense.verdict) {
      expense.verdict.decision = 'needs_info';
      expense.verdict.status = 'needs_info';
    }
  } else if (params.action === 'mark_paid') {
    expense.status = 'paid';
    if (expense.verdict) {
      expense.verdict.status = 'paid';
    }
  }

  saveAllExpenses(all);

  logAuditEvent({
    orgId: expense.orgId,
    expenseId: expense.id,
    actor: params.reviewer,
    action: `REVIEWER_${params.action.toUpperCase()}`,
    entity: 'override',
    details: {
      action: params.action,
      overrideAmountMinor: params.overrideAmountMinor,
      reason: params.reason,
    },
    changeSummary: `Reviewer ${params.reviewer.name} set decision to ${params.action.toUpperCase()}. Reason: "${params.reason}"`,
  });

  // Replay downstream claims after override
  replayLedger(all);

  return expense;
}

/**
 * Resolves a duplicate claim (confirmed or dismissed by finance)
 */
export function resolveDuplicateClaim(params: {
  expenseId: string;
  reviewer: AuditActor;
  resolutionStatus: 'confirmed' | 'dismissed';
  reason?: string;
}): Expense {
  const all = getAllExpenses();
  const expense = all.find((e) => e.id === params.expenseId);
  if (!expense || !expense.duplicateInfo) throw new Error(`Claim or duplicate info missing.`);

  expense.duplicateInfo.resolutionStatus = params.resolutionStatus;
  expense.duplicateInfo.resolvedBy = params.reviewer.name;
  expense.duplicateInfo.resolvedAt = new Date().toISOString();
  expense.duplicateInfo.dismissalReason = params.reason;

  saveAllExpenses(all);

  logAuditEvent({
    orgId: expense.orgId,
    expenseId: expense.id,
    actor: params.reviewer,
    action: `DUPLICATE_${params.resolutionStatus.toUpperCase()}`,
    entity: 'duplicate',
    details: {
      status: params.resolutionStatus,
      reason: params.reason,
    },
    changeSummary: `Duplicate candidate marked as ${params.resolutionStatus.toUpperCase()} by ${params.reviewer.name}.`,
  });

  // Replay ledger
  replayLedger(all);

  return expense;
}

/**
 * Appends a message to the fix-it thread
 */
export function appendThreadMessage(params: {
  expenseId: string;
  sender: 'system' | 'reviewer' | 'employee';
  message: string;
  proposedPatch?: any;
}): Expense {
  const all = getAllExpenses();
  const expense = all.find((e) => e.id === params.expenseId);
  if (!expense) throw new Error('Expense not found');

  if (!expense.thread) expense.thread = [];

  const msg = {
    id: `msg_${Date.now()}`,
    sender: params.sender,
    message: params.message,
    timestamp: new Date().toISOString(),
    proposedPatch: params.proposedPatch,
    status: 'pending' as const,
  };

  expense.thread.push(msg);
  saveAllExpenses(all);

  return expense;
}

/**
 * Confirms and applies a proposed context patch from an employee reply, then re-evaluates
 */
export function applyThreadPatch(params: {
  expenseId: string;
  messageId: string;
  patch: Record<string, any>;
  actor: AuditActor;
}): Expense {
  const all = getAllExpenses();
  const expense = all.find((e) => e.id === params.expenseId);
  if (!expense) throw new Error('Expense not found');

  // Apply patch to context or corrected fields
  if (params.patch.clientName) expense.context.clientName = params.patch.clientName;
  if (params.patch.attendeeCount) expense.context.attendeeCount = Number(params.patch.attendeeCount);
  if (params.patch.purpose) expense.context.purpose = params.patch.purpose;
  if (params.patch.city) expense.context.city = params.patch.city;
  if (params.patch.cityTier) expense.context.cityTier = params.patch.cityTier;

  // Mark thread message accepted
  const msg = expense.thread?.find((m) => m.id === params.messageId);
  if (msg) msg.status = 'accepted';

  saveAllExpenses(all);

  logAuditEvent({
    orgId: expense.orgId,
    expenseId: expense.id,
    actor: params.actor,
    action: 'CONTEXT_PATCH_APPLIED',
    entity: 'thread',
    details: params.patch,
    changeSummary: `Employee provided missing details: ${JSON.stringify(params.patch)}.`,
  });

  // Replay ledger and re-evaluate
  replayLedger(all);

  return expense;
}
