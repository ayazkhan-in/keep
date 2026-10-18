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
  normalizeExpenseCategory,
} from '../engine';
import { getActivePolicy } from './policyService';
import { DEMO_EMPLOYEES, getAllEmployeesList, getEmployeeDisplayName } from './employeeService';
import { logAuditEvent, getAuditEventsForExpense } from './auditService';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeFirestoreData } from './purchaseService';
import { SYNTHETIC_EXPENSES } from '../data/syntheticClaims';

const STORAGE_KEY_EXPENSES = 'keepr_expenses_v1';

// Active in-memory subscribers across all components
const expenseSubscribers = new Set<(expenses: Expense[]) => void>();

export function notifyExpenseSubscribers(expenses: Expense[]): void {
  for (const subscriber of Array.from(expenseSubscribers)) {
    try {
      subscriber(expenses);
    } catch (err) {
      console.warn('Error in expense subscriber callback:', err);
    }
  }
}

export function getExpensesCollection(orgId: string = 'org_acme'): CollectionReference {
  return collection(db, 'orgs', orgId, 'expenses');
}

export function getExpenseDoc(expenseId: string, orgId: string = 'org_acme'): DocumentReference {
  return doc(db, 'orgs', orgId, 'expenses', expenseId);
}

/**
 * Real-time subscription to corporate expenses with synchronous in-memory propagation
 * and smart-merging with Firestore.
 */
export function subscribeExpenses(
  onUpdate: (expenses: Expense[]) => void,
  onError?: (err: Error) => void,
  orgId: string = 'org_acme'
): () => void {
  // Register in-memory subscriber for instant cross-component updates
  expenseSubscribers.add(onUpdate);

  // Send current expenses immediately so caller has latest state without delay
  const initial = getAllExpenses();
  if (initial.length > 0) {
    onUpdate(initial);
  }

  // Handle custom window events for same-tab and multi-tab instant sync
  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent<Expense[]>;
    if (custom.detail && Array.isArray(custom.detail)) {
      onUpdate(custom.detail);
    } else {
      onUpdate(getAllExpenses());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_EXPENSES) {
      onUpdate(getAllExpenses());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keepr:expenses_updated', handleLocalUpdate);
    window.addEventListener('storage', handleStorageEvent);
  }

  const colRef = getExpensesCollection(orgId);

  const unsubscribeFirestore = onSnapshot(
    colRef,
    (snapshot) => {
      const firestoreItems: Expense[] = [];
      snapshot.forEach((docSnap) => {
        firestoreItems.push({ id: docSnap.id, ...docSnap.data() } as Expense);
      });

      // SMART MERGE: Never discard locally submitted claims that haven't synced to Firestore yet!
      const localExpenses = getAllExpenses();
      const mergedMap = new Map<string, Expense>();

      // 1. Seed with local expenses
      for (const exp of localExpenses) {
        if (exp && exp.id) {
          mergedMap.set(exp.id, exp);
        }
      }

      // 2. Overlay Firestore documents (preserving any local unsaved claims)
      for (const exp of firestoreItems) {
        if (exp && exp.id) {
          mergedMap.set(exp.id, exp);
        }
      }

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = a.submittedAt || a.expenseDate || '';
        const dateB = b.submittedAt || b.expenseDate || '';
        return dateB.localeCompare(dateA);
      });

      if (merged.length > 0) {
        saveAllExpenses(merged);
        notifyExpenseSubscribers(merged);
      } else {
        onUpdate(getAllExpenses());
      }
    },
    (err) => {
      console.warn('Firestore expenses sync error (falling back to local cache):', err);
      if (onError) onError(err);
      onUpdate(getAllExpenses());
    }
  );

  return () => {
    expenseSubscribers.delete(onUpdate);
    if (typeof window !== 'undefined') {
      window.removeEventListener('keepr:expenses_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    }
    unsubscribeFirestore();
  };
}

/**
 * Asynchronously save expense document to Firestore
 */
export async function addExpenseToDb(expense: Expense, orgId: string = 'org_acme'): Promise<void> {
  try {
    if (!expense.employeeName || expense.employeeName === expense.employeeId || expense.employeeName.startsWith('emp_')) {
      expense.employeeName = getEmployeeDisplayName(expense.employeeId);
    }
    const docRef = getExpenseDoc(expense.id, orgId);
    const sanitized = sanitizeFirestoreData(expense);
    await setDoc(docRef, sanitized);
    // Also save to root collection for redundancy
    await setDoc(doc(db, 'expenses', expense.id), sanitized).catch(() => {});
    console.log(`[EXPENSE DB] Synchronized claim ${expense.id} to Firestore with employee: ${expense.employeeName}`);
  } catch (err) {
    console.warn(`[EXPENSE DB] Could not sync claim ${expense.id} to Firestore:`, err);
  }
}

/**
 * Asynchronously update expense document in Firestore
 */
export async function updateExpenseInDb(
  expenseId: string,
  updates: Partial<Expense>,
  orgId: string = 'org_acme'
): Promise<void> {
  try {
    if (updates.employeeId && (!updates.employeeName || updates.employeeName === updates.employeeId)) {
      updates.employeeName = getEmployeeDisplayName(updates.employeeId);
    }
    const docRef = getExpenseDoc(expenseId, orgId);
    const sanitized = sanitizeFirestoreData(updates);
    await updateDoc(docRef, sanitized);
    await updateDoc(doc(db, 'expenses', expenseId), sanitized).catch(() => {});
    console.log(`[EXPENSE DB] Updated claim ${expenseId} in Firestore!`);
  } catch (err) {
    console.warn(`[EXPENSE DB] Could not update claim ${expenseId} in Firestore:`, err);
  }
}

export function getAllExpenses(): Expense[] {
  let list: Expense[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading expenses from storage:', err);
  }
  // Initialize with SYNTHETIC_EXPENSES baseline if storage is empty
  if (list.length === 0 && Array.isArray(SYNTHETIC_EXPENSES) && SYNTHETIC_EXPENSES.length > 0) {
    list = [...SYNTHETIC_EXPENSES];
    saveAllExpenses(list);
  }

  // Ensure every claim has an authentic human employeeName populated (never synthetic 'emp_105' or random hash)
  let mutated = false;
  for (const exp of list) {
    if (!exp.employeeName || exp.employeeName === exp.employeeId || exp.employeeName.startsWith('emp_')) {
      exp.employeeName = getEmployeeDisplayName(exp.employeeId);
      mutated = true;
    }
  }
  if (mutated) {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(list));
    } catch {}
  }

  return list;
}

export function saveAllExpenses(expenses: Expense[]): void {
  // Always guarantee employeeName before saving
  for (const exp of expenses) {
    if (!exp.employeeName || exp.employeeName === exp.employeeId || exp.employeeName.startsWith('emp_')) {
      exp.employeeName = getEmployeeDisplayName(exp.employeeId);
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed saving expenses to localStorage:', err);
  }
  notifyExpenseSubscribers(expenses);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('keepr:expenses_updated', { detail: expenses })
    );
  }
}

export function getEmployeeExpenses(employeeId: string): Expense[] {
  const all = getAllExpenses();
  const targetName = getEmployeeDisplayName(employeeId);
  return all.filter((e) => {
    if (e.employeeId === employeeId) return true;
    if ((e as any).employeeAlias && (e as any).employeeAlias === employeeId) return true;
    if (e.employeeName && targetName && e.employeeName.toLowerCase() === targetName.toLowerCase()) return true;
    // Cross-link Alice Walker's claims between UID and emp_101
    const isAliceParam =
      employeeId === 'emp_101' ||
      employeeId === 'pXmBbGDnDwTsrErsGuad8r4Gz4S2' ||
      employeeId === 'nEqzcEzb0zPDjsvy4tfL8tm2QHl1' ||
      targetName === 'Alice Walker';
    const isAliceClaim =
      e.employeeId === 'emp_101' ||
      e.employeeId === 'pXmBbGDnDwTsrErsGuad8r4Gz4S2' ||
      e.employeeId === 'nEqzcEzb0zPDjsvy4tfL8tm2QHl1' ||
      e.employeeName === 'Alice Walker';
    return isAliceParam && isAliceClaim;
  });
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
    const employee = getAllEmployeesList().find((emp) => emp.id === exp.employeeId) || {
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
      category: normalizeExpenseCategory(exp.context?.category || exp.extracted?.lineItems?.[0]?.category || 'General'),
      city: exp.context?.city,
      tripId: exp.context?.tripId,
      approvedAmountMinor: newVerdict.approvedAmountMinor,
      status: newVerdict.status,
      verdictDecision: newVerdict.decision,
      isOverride: Boolean(exp.reviewerAction?.overrideAmountMinor !== undefined),
    });
  }

  saveAllExpenses(sorted);
  notifyExpenseSubscribers(sorted);
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
  const allEmps = getAllEmployeesList();
  const employee = allEmps.find((e) => e.id === newExpense.employeeId) || allEmps[0];

  // Guarantee actual human employeeName is stored on the claim
  if (!newExpense.employeeName || newExpense.employeeName === newExpense.employeeId || newExpense.employeeName.startsWith('emp_')) {
    newExpense.employeeName = employee.identity?.name || getEmployeeDisplayName(newExpense.employeeId);
  }

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
        category: normalizeExpenseCategory(exp.context?.category || exp.extracted?.lineItems?.[0]?.category || 'General'),
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

  // Directly insert or update in authoritative organization claims list
  const existingIdx = all.findIndex((e) => e.id === newExpense.id);
  if (existingIdx >= 0) {
    all[existingIdx] = newExpense;
  } else {
    all.unshift(newExpense);
  }

  // Persist locally & synchronously notify all views
  saveAllExpenses(all);
  notifyExpenseSubscribers(all);

  // Sync claim asynchronously to Firestore
  addExpenseToDb(newExpense, newExpense.orgId || 'org_acme');

  // Append-only audit events
  logAuditEvent({
    orgId: newExpense.orgId || 'org_acme',
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
    orgId: newExpense.orgId || 'org_acme',
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

  const totalClaimedMinor = expense.normalizedCurrency?.targetAmountMinor || 0;

  if (params.action === 'override' && params.overrideAmountMinor !== undefined) {
    const isOverrideCapped = params.overrideAmountMinor < totalClaimedMinor;
    expense.status = isOverrideCapped ? 'partially_approved' : 'approved';
    if (expense.verdict) {
      expense.verdict.approvedAmountMinor = params.overrideAmountMinor;
      expense.verdict.disbursedAmountMinor = params.overrideAmountMinor;
      expense.verdict.excludedAmountMinor = Math.max(0, totalClaimedMinor - params.overrideAmountMinor);
      expense.verdict.decision = isOverrideCapped ? 'partial' : 'approve';
      expense.verdict.status = isOverrideCapped ? 'partially_approved' : 'approved';
    }
  } else if (params.action === 'approve') {
    // When approving, if the claim was capped or partially approved, approve for disbursement UP TO CAP
    const isCapped = Boolean(
      expense.verdict &&
      (expense.verdict.approvedAmountMinor < totalClaimedMinor ||
       (expense.verdict.excludedAmountMinor && expense.verdict.excludedAmountMinor > 0) ||
       expense.verdict.decision === 'partial' ||
       expense.verdict.status === 'partially_approved')
    );
    expense.status = isCapped ? 'partially_approved' : 'approved';
    if (expense.verdict) {
      expense.verdict.decision = isCapped ? 'partial' : 'approve';
      expense.verdict.status = isCapped ? 'partially_approved' : 'approved';
      if (expense.verdict.disbursedAmountMinor === undefined) {
        expense.verdict.disbursedAmountMinor = expense.verdict.approvedAmountMinor;
      }
      if (expense.verdict.excludedAmountMinor === undefined) {
        expense.verdict.excludedAmountMinor = Math.max(0, totalClaimedMinor - expense.verdict.approvedAmountMinor);
      }
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

  // Sync to Firestore
  updateExpenseInDb(
    expense.id,
    {
      reviewerAction: expense.reviewerAction,
      status: expense.status,
      verdict: expense.verdict,
    },
    expense.orgId || 'org_acme'
  );

  logAuditEvent({
    orgId: expense.orgId || 'org_acme',
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

  // Sync to Firestore
  updateExpenseInDb(
    expense.id,
    { duplicateInfo: expense.duplicateInfo },
    expense.orgId || 'org_acme'
  );

  logAuditEvent({
    orgId: expense.orgId || 'org_acme',
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

  // Sync to Firestore
  updateExpenseInDb(
    expense.id,
    { thread: expense.thread },
    expense.orgId || 'org_acme'
  );

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

  // Sync to Firestore
  updateExpenseInDb(
    expense.id,
    {
      thread: expense.thread,
      context: expense.context,
      verdict: expense.verdict,
      status: expense.status,
    },
    expense.orgId || 'org_acme'
  );

  logAuditEvent({
    orgId: expense.orgId || 'org_acme',
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
