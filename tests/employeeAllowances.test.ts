import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllEmployeesList,
  updateEmployee,
  resetEmployeeFinanceProfile,
  getEmployeeById,
  addEmployee,
  deleteEmployee,
} from '../src/services/employeeService';
import {
  getActivePolicy,
  updatePolicyAllowances,
} from '../src/services/policyService';
import { evaluateExpense } from '../src/engine/evaluator';
import { ExpenseLedger } from '../src/engine/ledger';
import { Expense } from '../src/types/expense';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as any;
}

describe('Employee Allowances and Finance Editing', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('updates employee allowances and finance profile correctly', () => {
    const emp = getAllEmployeesList()[0];
    expect(emp).toBeDefined();

    const updated = updateEmployee(emp.id, {
      department: 'Finance & Audit',
      grade: 'L5',
      financeProfile: {
        customAllowanceEnabled: true,
        dailyMealAllowanceMinor: 500000, // ₹5,000
        monthlySpendCapMinor: 10000000, // ₹100,000
        perClaimMealLimitMinor: 350000, // ₹3,500
        clientDiningPerAttendeeMinor: 400000, // ₹4,000
        mileageRateMinor: 2500, // ₹25/km
        autoApproveEligible: false,
        reimbursementHold: true,
        notes: 'Special executive travel approval authorized.',
      },
    });

    expect(updated.department).toBe('Finance & Audit');
    expect(updated.grade).toBe('L5');
    expect(updated.financeProfile?.customAllowanceEnabled).toBe(true);
    expect(updated.financeProfile?.dailyMealAllowanceMinor).toBe(500000);
    expect(updated.financeProfile?.monthlySpendCapMinor).toBe(10000000);
    expect(updated.financeProfile?.autoApproveEligible).toBe(false);
    expect(updated.financeProfile?.reimbursementHold).toBe(true);

    // Verify persistence across calls
    const fetched = getEmployeeById(emp.id);
    expect(fetched?.financeProfile?.dailyMealAllowanceMinor).toBe(500000);
    expect(fetched?.financeProfile?.reimbursementHold).toBe(true);
  });

  it('resets employee finance profile back to company defaults', () => {
    const emp = getAllEmployeesList()[0];
    updateEmployee(emp.id, {
      financeProfile: {
        customAllowanceEnabled: true,
        dailyMealAllowanceMinor: 800000,
      },
    });

    const reset = resetEmployeeFinanceProfile(emp.id);
    expect(reset.financeProfile).toBeUndefined();

    const fetched = getEmployeeById(emp.id);
    expect(fetched?.financeProfile).toBeUndefined();
  });

  it('evaluator honors custom daily meal allowance override', () => {
    const policy = getActivePolicy();
    const ledger = new ExpenseLedger();

    const baseEmp = getAllEmployeesList()[0];
    const customEmp = {
      ...baseEmp,
      financeProfile: {
        customAllowanceEnabled: true,
        dailyMealAllowanceMinor: 500000, // ₹5,000 daily cap instead of ₹3,000
        perClaimMealLimitMinor: 500000, // ₹5,000 single-meal cap instead of ₹2,000
      },
    };

    // Expense of ₹4,000 in Bengaluru (normally capped at ₹3,000)
    const expense: Expense = {
      id: 'exp_custom_cap_test',
      employeeId: baseEmp.id,
      orgId: 'org_acme',
      status: 'submitted',
      expenseDate: '2026-10-19',
      submittedAt: '2026-10-19T10:00:00Z',
      normalizedCurrency: {
        originalAmountMinor: 400000,
        originalCurrency: 'INR',
        targetAmountMinor: 400000,
        targetCurrency: 'INR',
        fxRate: 1.0,
      },
      extracted: {
        merchant: { value: 'Leela Palace Dining', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-19', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 4000, confidence: 0.98, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_1',
            description: 'Team Lunch Buffet',
            quantity: 1,
            unitPrice: 4000,
            amount: 4000,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      context: {
        city: 'Bengaluru',
        cityTier: 'Tier-1',
        isTravel: false,
        source: 'user',
      },
    };

    // Standard employee with ₹2,000 per-claim meal limit: ₹4,000 exceeds and is capped to ₹2,000
    const standardVerdict = evaluateExpense({
      expense,
      policy,
      employee: baseEmp,
      ledger,
    });
    expect(standardVerdict.approvedAmountMinor).toBe(200000);

    // Custom employee with ₹5,000 daily and single-meal cap: entire ₹4,000 is approved!
    const customVerdict = evaluateExpense({
      expense,
      policy,
      employee: customEmp,
      ledger,
    });
    expect(customVerdict.approvedAmountMinor).toBe(400000);
  });

  it('evaluator flags reimbursement hold and disables auto-approve when restricted by auditor', () => {
    const policy = getActivePolicy();
    const ledger = new ExpenseLedger();

    const baseEmp = getAllEmployeesList()[0];
    const restrictedEmp = {
      ...baseEmp,
      financeProfile: {
        reimbursementHold: true,
        autoApproveEligible: false,
      },
    };

    const expense: Expense = {
      id: 'exp_hold_test',
      employeeId: baseEmp.id,
      orgId: 'org_acme',
      status: 'submitted',
      expenseDate: '2026-10-19',
      submittedAt: '2026-10-19T10:00:00Z',
      normalizedCurrency: {
        originalAmountMinor: 50000,
        originalCurrency: 'INR',
        targetAmountMinor: 50000,
        targetCurrency: 'INR',
        fxRate: 1.0,
      },
      extracted: {
        merchant: { value: 'Cafe Coffee Day', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-19', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 500, confidence: 0.98, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_1',
            description: 'Coffee',
            quantity: 1,
            unitPrice: 500,
            amount: 500,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      context: {
        city: 'Bengaluru',
        cityTier: 'Tier-1',
        isTravel: false,
        source: 'user',
      },
    };

    const verdict = evaluateExpense({
      expense,
      policy,
      employee: restrictedEmp,
      ledger,
    });

    // Should flag hold
    expect(verdict.flags.some((f) => f.code === 'EMP_REIMBURSEMENT_HOLD')).toBe(true);
    // Decision should NOT be auto_approve because autoApproveEligible is false and hold is active
    expect(verdict.decision).not.toBe('auto_approve');
  });

  it('updatePolicyAllowances updates corporate cap rules and auto-approve threshold', () => {
    const updatedPolicy = updatePolicyAllowances({
      tier1MealCapMinor: 350000, // ₹3,500
      tier2MealCapMinor: 220000, // ₹2,200
      singleMealCapMinor: 250000, // ₹2,500
      autoApproveRiskThreshold: 30,
    });

    const tier1Rule = updatedPolicy.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal');
    expect(tier1Rule?.parameters.capAmountMinor).toBe(350000);

    const singleMealRule = updatedPolicy.rules.find((r) => r.id === 'rule_cap_tx_meal');
    expect(singleMealRule?.parameters.capAmountMinor).toBe(250000);

    expect(updatedPolicy.settings.autoApproveRiskThreshold).toBe(30);

    // Active policy reflects new changes
    const current = getActivePolicy();
    expect(current.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal')?.parameters.capAmountMinor).toBe(350000);
  });

  it('allows adding a new employee with custom allowances and attributes', () => {
    const initialCount = getAllEmployeesList().length;

    const newEmp = addEmployee({
      name: 'Rohan Mehta',
      email: 'rohan.mehta@acme.com',
      role: 'employee',
      department: 'Marketing',
      grade: 'L3',
      homeCity: 'Mumbai',
      financeProfile: {
        customAllowanceEnabled: true,
        dailyMealAllowanceMinor: 350000,
        monthlySpendCapMinor: 7000000,
      },
    });

    expect(newEmp.id).toBeDefined();
    expect(newEmp.identity.name).toBe('Rohan Mehta');
    expect(newEmp.identity.email).toBe('rohan.mehta@acme.com');

    const updatedList = getAllEmployeesList();
    expect(updatedList.length).toBe(initialCount + 1);

    const fetched = getEmployeeById(newEmp.id);
    expect(fetched?.identity.name).toBe('Rohan Mehta');
    expect(fetched?.financeProfile?.dailyMealAllowanceMinor).toBe(350000);
  });

  it('allows deleting an employee and removes them from active directory', () => {
    const initialList = getAllEmployeesList();
    const target = initialList[0];

    const deleted = deleteEmployee(target.id);
    expect(deleted).toBe(true);

    const afterDeleteList = getAllEmployeesList();
    expect(afterDeleteList.some((e) => e.id === target.id)).toBe(false);
    expect(afterDeleteList.some((e) => e.identity.email.toLowerCase() === target.identity.email.toLowerCase())).toBe(false);
  });
});
