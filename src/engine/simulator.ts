import { Employee, Expense, PolicyVersion, SimulationResult } from '../types/expense';
import { evaluateExpense } from './evaluator';
import { ExpenseLedger } from './ledger';

export interface SimulationOptions {
  activePolicy: PolicyVersion;
  draftPolicy: PolicyVersion;
  expenses: Expense[];
  employees: Employee[];
}

/**
 * Pure deterministic simulator:
 * Replays historical expenses through both active policy and draft policy in parallel.
 * Never mutates live claims.
 */
export function simulatePolicyChange(options: SimulationOptions): SimulationResult {
  const { activePolicy, draftPolicy, expenses, employees } = options;

  const empMap = new Map<string, Employee>();
  for (const emp of employees) {
    empMap.set(emp.id, emp);
  }

  // Sort expenses chronologically
  const sorted = [...expenses].sort((a, b) => {
    if (a.expenseDate !== b.expenseDate) return a.expenseDate.localeCompare(b.expenseDate);
    if (a.submittedAt !== b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt);
    return a.id.localeCompare(b.id);
  });

  const activeLedger = new ExpenseLedger();
  const draftLedger = new ExpenseLedger();

  let activeTotalReimbursedMinor = 0;
  let draftTotalReimbursedMinor = 0;
  let activeAutoApprovedCount = 0;
  let draftAutoApprovedCount = 0;

  const empImpactMap = new Map<
    string,
    { employeeName: string; activeApproved: number; draftApproved: number }
  >();

  const changedClaims: SimulationResult['changedClaims'] = [];

  for (const exp of sorted) {
    const emp = empMap.get(exp.employeeId) || {
      id: exp.employeeId,
      orgId: exp.orgId,
      identity: { email: `${exp.employeeId}@example.com`, name: exp.employeeId },
      role: 'employee',
      department: 'General',
      grade: 'L4',
      homeCity: 'Bengaluru',
    };

    // 1. Evaluate with active policy
    const activeVerdict = evaluateExpense({
      expense: exp,
      policy: activePolicy,
      employee: emp,
      ledger: activeLedger,
    });

    // Record into active ledger
    activeLedger.record({
      expenseId: exp.id,
      employeeId: exp.employeeId,
      expenseDate: exp.expenseDate,
      submittedAt: exp.submittedAt,
      category: exp.extracted?.lineItems?.[0]?.category || 'General',
      city: exp.context?.city,
      tripId: exp.context?.tripId,
      approvedAmountMinor: activeVerdict.approvedAmountMinor,
      status: activeVerdict.status,
      verdictDecision: activeVerdict.decision,
      isOverride: false,
    });

    // 2. Evaluate with draft policy
    const draftVerdict = evaluateExpense({
      expense: exp,
      policy: draftPolicy,
      employee: emp,
      ledger: draftLedger,
    });

    // Record into draft ledger
    draftLedger.record({
      expenseId: exp.id,
      employeeId: exp.employeeId,
      expenseDate: exp.expenseDate,
      submittedAt: exp.submittedAt,
      category: exp.extracted?.lineItems?.[0]?.category || 'General',
      city: exp.context?.city,
      tripId: exp.context?.tripId,
      approvedAmountMinor: draftVerdict.approvedAmountMinor,
      status: draftVerdict.status,
      verdictDecision: draftVerdict.decision,
      isOverride: false,
    });

    activeTotalReimbursedMinor += activeVerdict.approvedAmountMinor;
    draftTotalReimbursedMinor += draftVerdict.approvedAmountMinor;

    if (activeVerdict.decision === 'auto_approve') activeAutoApprovedCount++;
    if (draftVerdict.decision === 'auto_approve') draftAutoApprovedCount++;

    // Track per-employee impact
    const currentEmp = empImpactMap.get(emp.id) || {
      employeeName: emp.identity.name,
      activeApproved: 0,
      draftApproved: 0,
    };
    currentEmp.activeApproved += activeVerdict.approvedAmountMinor;
    currentEmp.draftApproved += draftVerdict.approvedAmountMinor;
    empImpactMap.set(emp.id, currentEmp);

    // Track changed claims
    const amountChanged = activeVerdict.approvedAmountMinor !== draftVerdict.approvedAmountMinor;
    const decisionChanged = activeVerdict.decision !== draftVerdict.decision;

    if (amountChanged || decisionChanged) {
      let deltaReason = '';
      if (draftVerdict.approvedAmountMinor < activeVerdict.approvedAmountMinor) {
        deltaReason = `Reimbursement reduced by ${((activeVerdict.approvedAmountMinor - draftVerdict.approvedAmountMinor) / 100).toFixed(2)} under draft limits.`;
      } else if (draftVerdict.approvedAmountMinor > activeVerdict.approvedAmountMinor) {
        deltaReason = `Reimbursement increased by ${((draftVerdict.approvedAmountMinor - activeVerdict.approvedAmountMinor) / 100).toFixed(2)} under draft allowances.`;
      } else {
        deltaReason = `Verdict status shifted from ${activeVerdict.decision} to ${draftVerdict.decision}.`;
      }

      changedClaims.push({
        expenseId: exp.id,
        merchant: exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown Merchant',
        expenseDate: exp.expenseDate,
        activeDecision: activeVerdict.decision,
        draftDecision: draftVerdict.decision,
        activeApprovedMinor: activeVerdict.approvedAmountMinor,
        draftApprovedMinor: draftVerdict.approvedAmountMinor,
        deltaReason,
      });
    }
  }

  const total = sorted.length || 1;
  const touchlessRateActive = Number(((activeAutoApprovedCount / total) * 100).toFixed(1));
  const touchlessRateDraft = Number(((draftAutoApprovedCount / total) * 100).toFixed(1));

  const employeeImpacts = Array.from(empImpactMap.entries()).map(([employeeId, data]) => ({
    employeeId,
    employeeName: data.employeeName,
    activeApprovedMinor: data.activeApproved,
    draftApprovedMinor: data.draftApproved,
    deltaMinor: data.draftApproved - data.activeApproved,
  }));

  return {
    simulationId: `sim_${Date.now()}`,
    activePolicyVersionId: activePolicy.id,
    draftPolicyVersionId: draftPolicy.id,
    totalExpensesEvaluated: sorted.length,
    activeTotalReimbursedMinor,
    draftTotalReimbursedMinor,
    deltaReimbursedMinor: draftTotalReimbursedMinor - activeTotalReimbursedMinor,
    touchlessRateActive,
    touchlessRateDraft,
    deltaTouchlessRate: Number((touchlessRateDraft - touchlessRateActive).toFixed(1)),
    changedVerdictsCount: changedClaims.length,
    employeeImpacts,
    changedClaims,
  };
}
