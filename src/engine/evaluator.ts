import {
  CityTier,
  ClaimDecision,
  ClaimStatus,
  Employee,
  Expense,
  PolicyRule,
  PolicyVersion,
  RiskFlag,
  RuleCitation,
  Verdict,
} from '../types/expense';
import { ExpenseLedger } from './ledger';

/**
 * Normalizes user, OCR, or contextual categories into standard policy engine categories:
 * - 'meals': food, dining, restaurant, lunch, dinner, breakfast, cafe, bistro, drinks, beverages, etc.
 * - 'client entertainment': client dining, client entertainment, client dinner, etc.
 * - 'travel': flights, airlines, airfare, hotels, lodging, rideshare, taxi, uber, train, transit, etc.
 * - 'supplies': office, operational, equipment, hardware, supplies, coworking, etc.
 * - 'software': subscriptions, saas, licenses, dev tools, cloud, etc.
 */
export function normalizeExpenseCategory(cat?: string): string {
  if (!cat) return 'general';
  const lower = cat.trim().toLowerCase();
  // Check client entertainment first to avoid 'meals' capturing 'client meal'
  if (lower.includes('client') || lower.includes('entertainment')) {
    return 'client entertainment';
  }
  if (
    lower.includes('meal') ||
    lower.includes('food') ||
    lower.includes('dining') ||
    lower.includes('restaurant') ||
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('breakfast') ||
    lower.includes('beverage') ||
    lower.includes('cafe') ||
    lower.includes('bistro') ||
    lower.includes('bar') ||
    lower.includes('catering') ||
    lower.includes('snack') ||
    lower.includes('bakery') ||
    lower.includes('coffee')
  ) {
    return 'meals';
  }
  if (
    lower.includes('travel') ||
    lower.includes('transit') ||
    lower.includes('flight') ||
    lower.includes('airfare') ||
    lower.includes('airline') ||
    lower.includes('hotel') ||
    lower.includes('lodging') ||
    lower.includes('stay') ||
    lower.includes('rideshare') ||
    lower.includes('taxi') ||
    lower.includes('uber') ||
    lower.includes('lyft') ||
    lower.includes('train') ||
    lower.includes('rail') ||
    lower.includes('car rental') ||
    lower.includes('toll') ||
    lower.includes('parking')
  ) {
    return 'travel';
  }
  if (
    lower.includes('supplies') ||
    lower.includes('office') ||
    lower.includes('operational') ||
    lower.includes('hardware') ||
    lower.includes('equipment') ||
    lower.includes('coworking') ||
    lower.includes('wework')
  ) {
    return 'supplies';
  }
  if (
    lower.includes('software') ||
    lower.includes('saas') ||
    lower.includes('subscription') ||
    lower.includes('license')
  ) {
    return 'software';
  }
  return lower;
}

export function lookupCityTier(
  city: string | undefined,
  cityTiers: Record<string, CityTier>
): CityTier | undefined {
  if (!city) return undefined;
  const clean = city.trim().toLowerCase();
  for (const [tierCity, tier] of Object.entries(cityTiers)) {
    const tcLower = tierCity.toLowerCase();
    if (clean === tcLower || clean.includes(tcLower) || tcLower.includes(clean)) {
      return tier;
    }
  }
  return undefined;
}

export interface EvaluatorOptions {
  expense: Expense;
  policy: PolicyVersion;
  employee: Employee;
  ledger: ExpenseLedger;
  reviewerOverride?: {
    overrideAmountMinor: number;
    reason: string;
    reviewerId: string;
  };
}

/**
 * Pure deterministic rule evaluator.
 * No network, no Firebase, integer minor units.
 */
export function evaluateExpense(options: EvaluatorOptions): Verdict {
  const { expense, policy, employee, ledger, reviewerOverride } = options;

  const totalMinor = expense.normalizedCurrency?.targetAmountMinor ?? 0;
  const currency = expense.normalizedCurrency?.targetCurrency ?? policy.settings.baseCurrency;
  const fxMultiplier = (expense.normalizedCurrency?.fxRate || 1.0);

  const ruleImpacts: RuleCitation[] = [];
  const missingFields: string[] = [];
  const flags: RiskFlag[] = [];

  let excludedMinor = 0;
  let pendingMinor = 0;
  let rejectedMinor = 0;

  // -------------------------------------------------------------
  // 1. Critical missing / low-confidence evidence check
  // -------------------------------------------------------------
  const criticalFields = [
    { name: 'merchant', field: expense.extracted?.merchant, corrected: expense.corrected?.merchant },
    { name: 'date', field: expense.extracted?.date, corrected: expense.corrected?.date },
    { name: 'total', field: expense.extracted?.total, corrected: expense.corrected?.total },
    { name: 'currency', field: expense.extracted?.currency, corrected: expense.corrected?.currency },
  ];

  let criticalConfidenceSum = 0;
  for (const cf of criticalFields) {
    const isProvided = cf.corrected !== undefined || (cf.field?.value !== undefined && cf.field.value !== null && cf.field.value !== '');
    const conf = cf.corrected !== undefined ? 1.0 : (cf.field?.confidence ?? 0);
    criticalConfidenceSum += conf;

    if (!isProvided) {
      if (cf.name === 'total' && (expense.integritySignals?.inferredTotal || totalMinor > 0)) {
        // Total is inferred from itemized lines
      } else {
        missingFields.push(cf.name);
      }
    } else if (conf < 0.6 && cf.corrected === undefined) {
      if (cf.name === 'total' && (expense.integritySignals?.inferredTotal || totalMinor > 0)) {
        // Total is inferred from itemized lines
      } else {
        missingFields.push(`${cf.name} (low confidence: ${(conf * 100).toFixed(0)}%)`);
      }
    }
  }
  const overallConfidence = Number((criticalConfidenceSum / criticalFields.length).toFixed(2));

  // -------------------------------------------------------------
  // 2. Duplicate Check (Earlier submission wins)
  // -------------------------------------------------------------
  const duplicate = expense.duplicateInfo;
  let duplicateSuspected = false;
  if (duplicate && duplicate.resolutionStatus !== 'dismissed' && duplicate.candidates.length > 0) {
    const matchingConfirmed = duplicate.candidates.find(
      (c) => c.score >= 0.95 && c.employeeId === employee.id
    );

    const isLaterSubmission = Boolean(
      matchingConfirmed &&
      matchingConfirmed.submittedAt &&
      expense.submittedAt &&
      matchingConfirmed.submittedAt < expense.submittedAt
    );

    if (isLaterSubmission) {
      flags.push({
        code: 'CONFIRMED_DUPLICATE',
        label: 'Exact Duplicate Detected',
        severity: 'high',
        explanation: duplicate.evidenceSummary || 'Matches previously submitted receipt identically.',
        weight: 50,
      });
      ruleImpacts.push({
        ruleId: 'sys-dup-exact',
        section: 'Policy Section 2.1 - Duplicate Submissions',
        title: 'Duplicate Submission Rejection',
        sourceQuote: 'Employees may not submit identical receipts or invoices for duplicate reimbursement.',
        impactAmountMinor: totalMinor,
        impactType: 'exclusion',
        explanation: 'Rejected as duplicate of an earlier submitted claim.',
      });
      rejectedMinor = totalMinor;
    } else if (duplicate.highestScore >= 0.7) {
      duplicateSuspected = true;
      flags.push({
        code: 'SUSPECTED_DUPLICATE',
        label: 'Suspected Duplicate / Shared Receipt',
        severity: 'high',
        explanation: duplicate.evidenceSummary || 'High visual or temporal similarity to another claim.',
        weight: 40,
      });
    }
  }

  // -------------------------------------------------------------
  // 3. Line-item exclusions with proportional tax & tip allocation
  // -------------------------------------------------------------
  const lineItems = expense.corrected?.lineItems || expense.extracted?.lineItems || [];
  const taxMinor = Math.round((expense.corrected?.tax ?? expense.extracted?.tax?.value ?? 0) * 100 * fxMultiplier);
  const tipMinor = Math.round((expense.corrected?.tip ?? expense.extracted?.tip?.value ?? 0) * 100 * fxMultiplier);
  const lineItemsSumMinor = lineItems.reduce((acc, item) => acc + Math.round(item.amount * 100 * fxMultiplier), 0);

  // Find active exclusion rules
  const exclusionRules = policy.rules.filter((r) => r.enabled && r.type === 'exclusion');

  for (const item of lineItems) {
    const itemFlags = item.itemFlags || [];
    const itemDescLower = (item.description || '').toLowerCase();
    let isItemExcluded = false;
    let matchingRule: PolicyRule | null = null;

    // Check built-in non-reimbursable item tags
    if (
      itemFlags.includes('alcohol') ||
      itemFlags.includes('tobacco') ||
      itemFlags.includes('personal') ||
      itemFlags.includes('gift') ||
      itemFlags.includes('fine_penalty')
    ) {
      isItemExcluded = true;
    }

    // Check policy exclusion rules
    for (const rule of exclusionRules) {
      const excludedKeywords = rule.parameters.excludedKeywords || [];
      const excludedItems = rule.parameters.excludedItems || [];
      const matchesKeyword = excludedKeywords.some((kw) => itemDescLower.includes(kw.toLowerCase()));
      const matchesItem = excludedItems.some((ei) => itemDescLower.includes(ei.toLowerCase()));
      if (matchesKeyword || matchesItem) {
        isItemExcluded = true;
        matchingRule = rule;
        break;
      }
    }

    if (isItemExcluded) {
      const rawItemMinor = Math.round(item.amount * 100 * fxMultiplier);
      let itemTaxTipMinor = 0;
      if (lineItemsSumMinor > 0 && (taxMinor > 0 || tipMinor > 0)) {
        itemTaxTipMinor = Math.round((rawItemMinor / lineItemsSumMinor) * (taxMinor + tipMinor));
      }
      const itemExcludedTotal = rawItemMinor + itemTaxTipMinor;
      excludedMinor += itemExcludedTotal;

      ruleImpacts.push({
        ruleId: matchingRule?.id || 'sys-excl-item',
        section: matchingRule?.section || 'Policy Section 3 - Non-Reimbursable Items',
        title: matchingRule?.title || `Exclusion: ${item.description}`,
        sourceQuote: matchingRule?.sourceQuote || 'Alcohol, personal items, tobacco and associated taxes are strictly non-reimbursable.',
        impactAmountMinor: itemExcludedTotal,
        impactType: 'exclusion',
        explanation: `Excluded "${item.description}" (${rawItemMinor / 100} ${currency}) plus proportional tax/tip (${itemTaxTipMinor / 100} ${currency}).`,
      });
    }
  }

  const rawCategory =
    expense.context?.category ||
    expense.extracted?.lineItems?.[0]?.category ||
    lineItems[0]?.category ||
    'General';
  const expenseCategory = normalizeExpenseCategory(rawCategory);

  // -------------------------------------------------------------
  // 4. Missing Requirements check
  // -------------------------------------------------------------
  const requirementRules = policy.rules.filter((r) => r.enabled && r.type === 'requirement');
  const city = expense.context?.city;
  const isTravel = Boolean(expense.context?.isTravel);

  for (const rule of requirementRules) {
    // Condition check: category
    if (rule.conditions.category && rule.conditions.category.length > 0) {
      const lineCategories = lineItems.map((li) => normalizeExpenseCategory(li.category));
      const ruleCategories = rule.conditions.category.map((c) => normalizeExpenseCategory(c));
      const matchesCategory = ruleCategories.some(
        (c) => c === expenseCategory || lineCategories.includes(c)
      );
      if (!matchesCategory) continue;
    }
    // Condition check: travel
    if (rule.conditions.isTravel !== undefined && rule.conditions.isTravel !== isTravel) {
      continue;
    }

    const requiredFields = rule.parameters.requiredFields || [];
    const missingInThisRule: string[] = [];

    for (const rf of requiredFields) {
      if (rf === 'clientName' && !expense.context?.clientName?.trim()) {
        missingInThisRule.push('Client Name');
      }
      if (rf === 'attendeeCount' && (!expense.context?.attendeeCount || expense.context.attendeeCount < 1)) {
        missingInThisRule.push('Attendee Count');
      }
      if (rf === 'purpose' && !expense.context?.purpose?.trim()) {
        missingInThisRule.push('Business Purpose');
      }
      if (rf === 'tripId' && isTravel && !expense.context?.tripId) {
        missingInThisRule.push('Associated Trip');
      }
    }

    if (missingInThisRule.length > 0) {
      missingFields.push(...missingInThisRule);
      // Move remaining amount to pending
      const amountToHold = Math.max(0, totalMinor - excludedMinor - pendingMinor);
      pendingMinor += amountToHold;

      ruleImpacts.push({
        ruleId: rule.id,
        section: rule.section,
        title: rule.title,
        sourceQuote: rule.sourceQuote,
        impactAmountMinor: amountToHold,
        impactType: 'hold',
        explanation: `Missing required field(s): ${missingInThisRule.join(', ')}. Amount held in pending status until provided.`,
      });
    }
  }

  // -------------------------------------------------------------
  // 5. Caps and Allowances (Simultaneous caps - most restrictive wins)
  // -------------------------------------------------------------
  const capRules = policy.rules.filter((r) => r.enabled && r.type === 'cap');

  const employeeCityTier =
    employee.financeProfile?.cityTierOverride ||
    expense.context?.cityTier ||
    lookupCityTier(city, policy.cityTiers) ||
    'Tier-1';

  // Check if auditor placed a reimbursement hold on this employee
  if (employee.financeProfile?.reimbursementHold) {
    flags.push({
      code: 'EMP_REIMBURSEMENT_HOLD',
      label: 'Auditor Reimbursement Hold Active',
      severity: 'high',
      explanation: 'Auditor has placed a temporary finance hold on reimbursements for this employee.',
      weight: 35,
    });
  }

  let minRemainingAllowanceMinor = Infinity;
  let mostRestrictiveCapRule: PolicyRule | null = null;
  let winningCapSnapshot: Verdict['ledgerSnapshot'] = undefined;

  for (const rule of capRules) {
    // Check conditions
    if (rule.conditions.isTravel !== undefined && rule.conditions.isTravel !== isTravel) {
      continue;
    }
    if (rule.conditions.cityTier && rule.conditions.cityTier.length > 0) {
      if (!rule.conditions.cityTier.includes(employeeCityTier as any)) {
        continue;
      }
    }
    if (rule.conditions.grade && rule.conditions.grade.length > 0) {
      if (!rule.conditions.grade.includes(employee.grade)) {
        continue;
      }
    }
    if (rule.conditions.category && rule.conditions.category.length > 0) {
      const ruleCategories = rule.conditions.category.map((c) => normalizeExpenseCategory(c));
      const lineCategories = lineItems.map((li) => normalizeExpenseCategory(li.category));
      const contextCategory = expense.context?.category ? normalizeExpenseCategory(expense.context.category) : undefined;
      const match = ruleCategories.some(
        (c) => c === expenseCategory || (contextCategory && c === contextCategory) || lineCategories.includes(c)
      );
      if (!match) continue;
    }

    // Base cap limit (honor custom allowances if set by auditor)
    let capLimitMinor = rule.parameters.capAmountMinor ?? 0;
    if (employee.financeProfile?.customAllowanceEnabled) {
      if (rule.parameters.capPeriod === 'day' && rule.conditions.category?.some((c) => normalizeExpenseCategory(c) === 'meals') && employee.financeProfile.dailyMealAllowanceMinor) {
        capLimitMinor = employee.financeProfile.dailyMealAllowanceMinor;
      } else if (rule.parameters.capPeriod === 'per_claim' && rule.conditions.category?.some((c) => normalizeExpenseCategory(c) === 'meals') && employee.financeProfile.perClaimMealLimitMinor) {
        capLimitMinor = employee.financeProfile.perClaimMealLimitMinor;
      } else if (rule.parameters.perAttendeeMultiplier && employee.financeProfile.clientDiningPerAttendeeMinor) {
        capLimitMinor = employee.financeProfile.clientDiningPerAttendeeMinor;
      }
    }

    if (rule.parameters.perAttendeeMultiplier && (expense.context?.attendeeCount || 0) > 1) {
      capLimitMinor *= expense.context!.attendeeCount!;
    }

    // Query ledger usage for this cap's period and scope
    const period = rule.parameters.capPeriod || 'day';
    const scope = rule.parameters.capScope || 'employee';

    let priorSpend = 0;
    if (period !== 'per_claim') {
      const usage = ledger.getPriorUsage({
        targetExpenseId: expense.id,
        employeeId: employee.id,
        period,
        scope,
        date: expense.expenseDate,
        targetSubmittedAt: expense.submittedAt,
        category: expenseCategory,
        city: expense.context?.city,
        tripId: expense.context?.tripId,
        monthStartDay: policy.settings.reportingMonthStartDay,
      });
      priorSpend = usage.priorSpendMinor;
    }

    const remainingAllowance = Math.max(0, capLimitMinor - priorSpend);

    // Record citation for evaluating this cap rule
    ruleImpacts.push({
      ruleId: rule.id,
      section: rule.section,
      title: rule.title,
      sourceQuote: rule.sourceQuote,
      impactAmountMinor: capLimitMinor,
      impactType: 'cap',
      explanation: `${rule.title}: Cap limit is ${(capLimitMinor / 100).toFixed(2)} ${currency}. Prior spend is ${(priorSpend / 100).toFixed(2)} ${currency}. Remaining allowance: ${(remainingAllowance / 100).toFixed(2)} ${currency}.`,
    });

    if (remainingAllowance < minRemainingAllowanceMinor) {
      minRemainingAllowanceMinor = remainingAllowance;
      mostRestrictiveCapRule = rule;
      winningCapSnapshot = {
        capKey: ExpenseLedger.buildKey({
          employeeId: employee.id,
          period,
          scope,
          date: expense.expenseDate,
          category: expenseCategory,
          city: expense.context?.city,
          tripId: expense.context?.tripId,
          monthStartDay: policy.settings.reportingMonthStartDay,
        }),
        priorSpendMinor: priorSpend,
        allowanceMinor: capLimitMinor,
        remainingMinor: remainingAllowance,
        capPeriod: period,
        capScope: scope,
      };
    }
  }

  // Calculate allowable approved amount
  const baseEligibleMinor = Math.max(0, totalMinor - excludedMinor - pendingMinor);
  let approvedMinor = 0;
  if (rejectedMinor < totalMinor) {
    rejectedMinor = excludedMinor;
  }

  if (minRemainingAllowanceMinor === Infinity) {
    // No caps applied
    approvedMinor = baseEligibleMinor;
  } else {
    approvedMinor = Math.min(baseEligibleMinor, minRemainingAllowanceMinor);
    if (approvedMinor < baseEligibleMinor) {
      const capDeduction = baseEligibleMinor - approvedMinor;
      // Policy Cap Enforcement: amount up to cap is disbursed; excess above cap is excluded from reimbursement
      excludedMinor += capDeduction;
      rejectedMinor += capDeduction;

      ruleImpacts.push({
        ruleId: mostRestrictiveCapRule?.id || 'sys-cap-exceeded',
        section: mostRestrictiveCapRule?.section || 'Policy Section 4 - Cumulative Spend Caps',
        title: `Cap Excluded: ${mostRestrictiveCapRule?.title || 'Allowance Exceeded'}`,
        sourceQuote: mostRestrictiveCapRule?.sourceQuote,
        impactAmountMinor: capDeduction,
        impactType: 'exclusion',
        explanation: `Claim total of ${(totalMinor / 100).toFixed(2)} ${currency} exceeds the policy cap limit (${(minRemainingAllowanceMinor / 100).toFixed(2)} ${currency}). Only ${(approvedMinor / 100).toFixed(2)} ${currency} is disbursed; the remaining excess of ${(capDeduction / 100).toFixed(2)} ${currency} is excluded from reimbursement.`,
      });
    }
  }

  // -------------------------------------------------------------
  // 6. Thresholds (Manager / Finance / CFO review)
  // -------------------------------------------------------------
  let thresholdTriggered = false;
  const thresholdRules = policy.rules.filter((r) => r.enabled && r.type === 'threshold');
  for (const rule of thresholdRules) {
    const triggerAmount = rule.parameters.thresholdAmountMinor ?? 0;
    if (totalMinor >= triggerAmount) {
      thresholdTriggered = true;
      flags.push({
        code: `THRESHOLD_${(rule.parameters.thresholdLevel || 'finance').toUpperCase()}`,
        label: `${rule.title} Triggered`,
        severity: 'medium',
        explanation: `Claim total (${(totalMinor / 100).toFixed(2)} ${currency}) exceeds ${rule.parameters.thresholdLevel || 'finance'} threshold (${(triggerAmount / 100).toFixed(2)} ${currency}).`,
        weight: 15,
      });
      ruleImpacts.push({
        ruleId: rule.id,
        section: rule.section,
        title: rule.title,
        sourceQuote: rule.sourceQuote,
        impactAmountMinor: triggerAmount,
        impactType: 'threshold',
        explanation: `Requires explicit ${rule.parameters.thresholdLevel || 'finance'} approval per policy threshold.`,
      });
    }
  }

  // -------------------------------------------------------------
  // 7. Time Window Rules (Late submission)
  // -------------------------------------------------------------
  const timeWindowRules = policy.rules.filter((r) => r.enabled && r.type === 'time_window');
  const allowedLagDays =
    timeWindowRules[0]?.parameters.timeWindowDays ?? policy.settings.lateSubmissionWindowDays;

  if (expense.expenseDate && expense.submittedAt) {
    const expDate = new Date(expense.expenseDate).getTime();
    const subDate = new Date(expense.submittedAt).getTime();
    const lagDays = Math.floor((subDate - expDate) / (1000 * 60 * 60 * 24));

    if (lagDays > allowedLagDays) {
      flags.push({
        code: 'LATE_SUBMISSION',
        label: `Late Submission (${lagDays} days)`,
        severity: 'medium',
        explanation: `Submitted ${lagDays} days after expense date (policy limit: ${allowedLagDays} days).`,
        weight: 10,
      });
      ruleImpacts.push({
        ruleId: timeWindowRules[0]?.id || 'sys-late-submission',
        section: timeWindowRules[0]?.section || 'Policy Section 6 - Timely Submission',
        title: 'Late Submission Window Exceeded',
        sourceQuote: timeWindowRules[0]?.sourceQuote || 'Expenses must be submitted within 30 calendar days.',
        impactAmountMinor: 0,
        impactType: 'time_window',
        explanation: `Claim was submitted ${lagDays} days after the event.`,
      });
    }
  }

  // -------------------------------------------------------------
  // 8. Integrity and Anomaly Signals
  // -------------------------------------------------------------
  if (expense.integritySignals?.mathMismatch) {
    flags.push({
      code: 'MATH_MISMATCH',
      label: 'Receipt Math Discrepancy',
      severity: 'medium',
      explanation: 'Itemized lines sum does not match printed receipt total within tolerance.',
      weight: 20,
    });
  }

  if (expense.integritySignals?.taxRateAnomalous) {
    flags.push({
      code: 'TAX_RATE_ANOMALY',
      label: 'Peculiar Tax Rate',
      severity: 'low',
      explanation: 'Calculated tax rate falls outside expected statutory brackets (0–30%).',
      weight: 8,
    });
  }

  if (expense.integritySignals?.handwritingDetected) {
    flags.push({
      code: 'HANDWRITTEN_RECEIPT',
      label: 'Handwritten Document',
      severity: 'low',
      explanation: 'Receipt contains handwritten values; manual visual inspection advised.',
      weight: 10,
    });
  }

  // -------------------------------------------------------------
  // 9. Derive Risk Score (0..100) and Final Decision
  // -------------------------------------------------------------
  let rawRisk = flags.reduce((acc, f) => acc + f.weight, 0);
  const riskScore = Math.min(100, Math.max(0, rawRisk));
  const riskBand: 'low' | 'medium' | 'high' =
    riskScore >= 60 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

  let decision: ClaimDecision = 'approve';
  let status: ClaimStatus = 'approved';

  // Apply Reviewer Override if provided
  if (reviewerOverride) {
    approvedMinor = reviewerOverride.overrideAmountMinor;
    rejectedMinor = Math.max(0, totalMinor - approvedMinor);
    decision = 'approve';
    status = 'approved';
  } else if (rejectedMinor >= totalMinor && totalMinor > 0) {
    decision = 'reject';
    status = 'rejected';
  } else if (missingFields.length > 0 || pendingMinor > 0) {
    decision = 'needs_info';
    status = 'needs_info';
    if (!ruleImpacts.some((r) => r.impactType === 'hold' || r.impactType === 'document')) {
      ruleImpacts.push({
        ruleId: 'sys-doc-req',
        section: 'Policy Section 3.3 - Documentation Standards',
        title: 'Missing Required Evidence',
        sourceQuote: 'Legible itemized receipts with verified merchant, date, and currency are mandatory.',
        impactAmountMinor: totalMinor,
        impactType: 'document',
        explanation: `Claim is missing critical information: ${missingFields.join(', ')}.`,
      });
    }
  } else if (thresholdTriggered || riskBand === 'high' || duplicateSuspected) {
    decision = 'escalate';
    status = 'in_review';
    if (!ruleImpacts.some((r) => r.impactType === 'threshold')) {
      ruleImpacts.push({
        ruleId: 'sys-review-required',
        section: 'Policy Section 5.2 - Review Requirements',
        title: 'Manual Review Escalation',
        sourceQuote: 'Expenses exhibiting anomaly signals or threshold breaches require manual inspection.',
        impactAmountMinor: totalMinor,
        impactType: 'threshold',
        explanation: 'Escalated to Finance for review based on risk and verification signals.',
      });
    }
  } else if (approvedMinor < totalMinor || excludedMinor > 0) {
    decision = 'partial';
    status = 'partially_approved';
  } else {
    // Check auto-approve requirements: strictly requires 100% full approval and 0 exclusions
    const isAutoApprovable =
      approvedMinor === totalMinor &&
      excludedMinor === 0 &&
      riskScore <= policy.settings.autoApproveRiskThreshold &&
      overallConfidence >= policy.settings.autoApproveMinConfidence &&
      !duplicateSuspected &&
      employee.financeProfile?.autoApproveEligible !== false &&
      !employee.financeProfile?.reimbursementHold;

    if (isAutoApprovable) {
      decision = 'auto_approve';
      status = 'auto_approved';
    } else {
      decision = 'approve';
      status = 'approved';
    }

    if (ruleImpacts.length === 0) {
      ruleImpacts.push({
        ruleId: 'sys-auto-standard',
        section: 'Policy Section 5.1 - Standard Reimbursement',
        title: 'Standard Claim Allowance',
        sourceQuote: 'Standard claims below review threshold with clean itemization and low anomaly risk are eligible for touchless auto-approval.',
        impactAmountMinor: approvedMinor,
        impactType: 'cap',
        explanation: 'Expense complies with category allowances, itemization standards, and approval thresholds.',
      });
    }
  }

  return {
    decision,
    status,
    totalAmountMinor: totalMinor,
    eligibleAmountMinor: baseEligibleMinor,
    approvedAmountMinor: approvedMinor,
    disbursedAmountMinor: approvedMinor,
    excludedAmountMinor: excludedMinor,
    rejectedAmountMinor: rejectedMinor,
    pendingAmountMinor: pendingMinor,
    ruleImpacts,
    missingFields,
    flags,
    riskScore,
    riskBand,
    confidence: overallConfidence,
    autoApprovable: decision === 'auto_approve',
    policyVersionId: policy.id,
    evaluatedAt: new Date().toISOString(),
    ledgerSnapshot: winningCapSnapshot,
  };
}
