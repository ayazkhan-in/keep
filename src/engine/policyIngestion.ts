import {
  PolicyRule,
  PolicyVersion,
  CityTier,
  CapPeriod,
  CapScope,
  RuleType,
} from '../types/expense';
import { detectPolicyConflicts, PolicyRuleSchema, PolicyVersionSchema } from './policySchema';

export interface IngestionOptions {
  policyName?: string;
  sourceFileName?: string;
  orgId?: string;
  baseCurrency?: string;
}

export interface IngestionResult {
  policy: PolicyVersion;
  extractedRulesCount: number;
  ambiguousClausesCount: number;
  conflicts: string[];
  paragraphs: string[];
  summary: string;
}

/**
 * Extracts a numeric amount from text string like "₹3,000", "$50.00", "10,000 INR", "50000"
 * Returns amount in integer minor units (paise/cents).
 */
export function extractMinorUnits(text: string, currency: string = 'INR'): number | null {
  if (!text) return null;

  // 1. Matches currency symbol or prefix followed by number: ₹3,000 or $50 or INR 10,000
  const currPrefixMatch = text.match(/(?:[₹$€£]|INR|USD|EUR|GBP|Rs\.?)\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (currPrefixMatch) {
    const rawNum = currPrefixMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }

  // 2. Matches number followed by currency suffix: 3000 INR, 50 USD
  const currSuffixMatch = text.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*(?:[₹$€£]|INR|USD|EUR|GBP|Rs\.?)/i);
  if (currSuffixMatch) {
    const rawNum = currSuffixMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }

  // 3. Fallback: standalone numbers following keyword anchors like "capped at", "limit of", "up to", "between"
  const anchorMatch = text.match(/(?:capped\s+at|limit\s+(?:of|is)|exceeding|up\s+to|between|over|above|below)\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (anchorMatch) {
    const rawNum = anchorMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }

  return null;
}

/**
 * Detects base currency from the policy text.
 */
export function detectBaseCurrency(text: string): string {
  if (/[₹]|INR|Rs\b/i.test(text)) return 'INR';
  if (/[$]|USD/i.test(text)) return 'USD';
  if (/[€]|EUR/i.test(text)) return 'EUR';
  if (/[£]|GBP/i.test(text)) return 'GBP';
  return 'INR';
}

/**
 * Synthesizes structured, fully-typed PolicyRules from raw policy text.
 * Deterministically parses sections, caps, exclusions, thresholds, deadlines, and ambiguous clauses.
 * Conforms to Keepr_Receipt_Final.md specifications.
 */
export function parsePolicyFromText(rawText: string, options: IngestionOptions = {}): IngestionResult {
  const text = (rawText || '').trim();
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const baseCurrency = options.baseCurrency || detectBaseCurrency(text);
  const orgId = options.orgId || 'org_acme';

  // Extract policy name from first heading or options
  let policyName = options.policyName;
  if (!policyName && paragraphs.length > 0) {
    const firstLine = paragraphs[0].split('\n')[0].replace(/[#*]/g, '').trim();
    if (firstLine.length > 3 && firstLine.length < 80) {
      policyName = firstLine;
    }
  }
  if (!policyName) {
    policyName = `Ingested Policy (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
  }

  const rules: PolicyRule[] = [];
  let ruleSequence = 1;

  // Helper to generate unique stable rule IDs
  const makeId = (prefix: string) => `rule_${prefix}_${Date.now().toString().slice(-4)}_${ruleSequence++}`;

  // Track extracted configuration settings
  let lateSubmissionDays = 30;
  let autoApproveThreshold = 25;

  // Process paragraphs
  paragraphs.forEach((para, paraIdx) => {
    const lowerPara = para.toLowerCase();
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    const headerLine = lines[0] || '';
    const isSectionHeader = /^(section|\d+\.|\bpolicy\b)/i.test(headerLine);
    const sectionName = isSectionHeader ? headerLine.slice(0, 50) : `Section ${paraIdx + 1}`;

    // -------------------------------------------------------------------------
    // 1. NON-REIMBURSABLE / EXCLUSIONS
    // -------------------------------------------------------------------------
    if (
      lowerPara.includes('non-reimbursable') ||
      lowerPara.includes('strictly prohibited') ||
      lowerPara.includes('not reimbursable') ||
      lowerPara.includes('excluded') ||
      lowerPara.includes('exclusions')
    ) {
      const excludedItems: string[] = [];
      const excludedKeywords: string[] = [];

      if (/alcohol|beer|wine|spirits|liquor|cocktail/i.test(para)) {
        excludedItems.push('beer', 'wine', 'cocktail', 'whiskey', 'vodka');
        excludedKeywords.push('alcohol', 'liquor', 'brewery', 'bar', 'spirits');
      }
      if (/tobacco|cigarette|cigar|vape/i.test(para)) {
        excludedItems.push('tobacco', 'cigarettes', 'vape');
        excludedKeywords.push('tobacco', 'smoke', 'cigar');
      }
      if (/minibar|mini-bar/i.test(para)) {
        excludedItems.push('minibar snacks', 'minibar beverages');
        excludedKeywords.push('minibar');
      }
      if (/personal\s+grooming|haircut|spa|clothing|toiletries/i.test(para)) {
        excludedItems.push('personal grooming', 'clothing', 'spa treatment');
        excludedKeywords.push('grooming', 'haircut', 'toiletries');
      }
      if (/fine|traffic|parking\s+fine|penalty|speeding/i.test(para)) {
        excludedItems.push('parking fine', 'speeding ticket', 'traffic violation');
        excludedKeywords.push('fine', 'penalty', 'traffic citation');
      }
      if (/gambling|lottery|casino/i.test(para)) {
        excludedItems.push('gambling', 'casino tokens', 'lottery');
        excludedKeywords.push('gambling', 'casino');
      }

      if (excludedItems.length > 0 || excludedKeywords.length > 0) {
        rules.push({
          id: makeId('excl'),
          type: 'exclusion',
          section: sectionName,
          title: 'Non-Reimbursable Goods & Prohibited Items',
          priority: 10,
          enabled: true,
          sourceQuote: lines.find((l) => /non-reimbursable|strictly prohibited|excluded/i.test(l)) || para.slice(0, 160),
          sourceParagraphIndex: paraIdx,
          conditions: {},
          parameters: {
            excludedItems: Array.from(new Set(excludedItems)),
            excludedKeywords: Array.from(new Set(excludedKeywords)),
            allocateTaxTipProportionally: true,
            onViolationBehavior: 'reject',
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. DOCUMENTATION & ITEMIZATION REQUIREMENTS
    // -------------------------------------------------------------------------
    if (
      lowerPara.includes('itemized') ||
      lowerPara.includes('receipt') ||
      lowerPara.includes('proof of payment')
    ) {
      if (/itemized receipts?.*required|unitemized.*held/i.test(para)) {
        rules.push({
          id: makeId('doc_itemized'),
          type: 'document',
          section: sectionName,
          title: 'Itemized Receipt Requirement',
          priority: 15,
          enabled: true,
          sourceQuote: lines.find((l) => /itemized/i.test(l)) || para.slice(0, 160),
          sourceParagraphIndex: paraIdx,
          conditions: {},
          parameters: {
            documentTypes: ['itemized_receipt'],
            onViolationBehavior: 'require_info',
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 3. CLIENT ENTERTAINMENT & DINING REQUIREMENTS & CAPS
    // -------------------------------------------------------------------------
    if (
      lowerPara.includes('client entertainment') ||
      lowerPara.includes('client dinner') ||
      lowerPara.includes('client dining')
    ) {
      // Documentation requirement
      if (/client organization|business purpose|attendee count|attendees/i.test(para)) {
        rules.push({
          id: makeId('req_client'),
          type: 'requirement',
          section: sectionName,
          title: 'Client Dining Documentation Mandate',
          priority: 20,
          enabled: true,
          sourceQuote: lines.find((l) => /client/i.test(l) && /attendee|purpose/i.test(l)) || para.slice(0, 160),
          sourceParagraphIndex: paraIdx,
          conditions: { category: ['client entertainment'] },
          parameters: {
            requiredFields: ['clientName', 'attendeeCount'],
            onViolationBehavior: 'require_info',
          },
        });
      }

      // Per-attendee Cap
      const attendeeLine = lines.find(
        (l) => /attendee/i.test(l) && !/required|mandate|mandates/i.test(l) && /(?:up\s+to|capped|scale|[₹$€£]|INR|USD)/i.test(l)
      );
      if (attendeeLine) {
        const capMinor = extractMinorUnits(attendeeLine, baseCurrency);
        if (capMinor && capMinor > 0) {
          rules.push({
            id: makeId('cap_client_attendee'),
            type: 'cap',
            section: sectionName,
            title: 'Client Dining Per-Attendee Allowance',
            priority: 40,
            enabled: true,
            sourceQuote: attendeeLine,
            sourceParagraphIndex: paraIdx,
            conditions: { category: ['client entertainment'] },
            parameters: {
              capAmountMinor: capMinor,
              capPeriod: 'per_claim',
              capScope: 'employee',
              perAttendeeMultiplier: true,
              onViolationBehavior: 'cap',
            },
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. MEAL ALLOWANCES & DAILY CAPS BY CITY TIER
    // -------------------------------------------------------------------------
    if (
      (lowerPara.includes('meal') || lowerPara.includes('per-diem') || lowerPara.includes('daily allowance')) &&
      !lowerPara.includes('client dining')
    ) {
      let tierFound = false;

      // Tier-1 City Meal Cap
      const tier1Line = lines.find((l) => /tier-?1/i.test(l));
      if (tier1Line) {
        const capMinor = extractMinorUnits(tier1Line, baseCurrency);
        if (capMinor && capMinor > 0) {
          tierFound = true;
          rules.push({
            id: makeId('cap_meal_tier1'),
            type: 'cap',
            section: sectionName,
            title: 'Tier-1 City Daily Meal Cap',
            priority: 30,
            enabled: true,
            sourceQuote: tier1Line,
            sourceParagraphIndex: paraIdx,
            conditions: {
              category: ['meals'],
              cityTier: ['Tier-1'],
              isTravel: true,
            },
            parameters: {
              capAmountMinor: capMinor,
              capPeriod: 'day',
              capScope: 'employee',
              onViolationBehavior: 'cap',
            },
          });
        }
      }

      // Tier-2 City Meal Cap
      const tier2Line = lines.find((l) => /tier-?2/i.test(l));
      if (tier2Line) {
        const capMinor = extractMinorUnits(tier2Line, baseCurrency);
        if (capMinor && capMinor > 0) {
          tierFound = true;
          rules.push({
            id: makeId('cap_meal_tier2'),
            type: 'cap',
            section: sectionName,
            title: 'Tier-2 City Daily Meal Cap',
            priority: 31,
            enabled: true,
            sourceQuote: tier2Line,
            sourceParagraphIndex: paraIdx,
            conditions: {
              category: ['meals'],
              cityTier: ['Tier-2'],
              isTravel: true,
            },
            parameters: {
              capAmountMinor: capMinor,
              capPeriod: 'day',
              capScope: 'employee',
              onViolationBehavior: 'cap',
            },
          });
        }
      }

      // Tier-3 City Meal Cap
      const tier3Line = lines.find((l) => /tier-?3/i.test(l));
      if (tier3Line) {
        const capMinor = extractMinorUnits(tier3Line, baseCurrency);
        if (capMinor && capMinor > 0) {
          tierFound = true;
          rules.push({
            id: makeId('cap_meal_tier3'),
            type: 'cap',
            section: sectionName,
            title: 'Tier-3 City Daily Meal Cap',
            priority: 32,
            enabled: true,
            sourceQuote: tier3Line,
            sourceParagraphIndex: paraIdx,
            conditions: {
              category: ['meals'],
              cityTier: ['Tier-3'],
              isTravel: true,
            },
            parameters: {
              capAmountMinor: capMinor,
              capPeriod: 'day',
              capScope: 'employee',
              onViolationBehavior: 'cap',
            },
          });
        }
      }

      // International Meal Cap
      const intlLine = lines.find((l) => /international/i.test(l));
      if (intlLine) {
        const capMinor = extractMinorUnits(intlLine, baseCurrency);
        if (capMinor && capMinor > 0) {
          tierFound = true;
          rules.push({
            id: makeId('cap_meal_intl'),
            type: 'cap',
            section: sectionName,
            title: 'International Travel Daily Meal Cap',
            priority: 33,
            enabled: true,
            sourceQuote: intlLine,
            sourceParagraphIndex: paraIdx,
            conditions: {
              category: ['meals'],
              cityTier: ['International'],
              isTravel: true,
            },
            parameters: {
              capAmountMinor: capMinor,
              capPeriod: 'day',
              capScope: 'employee',
              onViolationBehavior: 'cap',
            },
          });
        }
      }

      // Generic flat daily meal cap (if no city tier was detected in this paragraph)
      if (!tierFound) {
        const dailyLine = lines.find((l) => /per\s+day|daily|per-diem/i.test(l));
        if (dailyLine) {
          const amountMinor = extractMinorUnits(dailyLine, baseCurrency);
          if (amountMinor && amountMinor > 0) {
            rules.push({
              id: makeId('cap_meal_daily'),
              type: 'cap',
              section: sectionName,
              title: 'Daily Meal Allowance Cap',
              priority: 30,
              enabled: true,
              sourceQuote: dailyLine,
              sourceParagraphIndex: paraIdx,
              conditions: { category: ['meals'] },
              parameters: {
                capAmountMinor: amountMinor,
                capPeriod: 'day',
                capScope: 'employee',
                onViolationBehavior: 'cap',
              },
            });
          }
        }
      }

      // Single-meal transaction limit
      const singleMealLine = lines.find((l) => /single-?meal|individual/i.test(l));
      if (singleMealLine) {
        const capMinor = extractMinorUnits(singleMealLine, baseCurrency);
        if (capMinor && capMinor > 0) {
          rules.push({
            id: makeId('cap_single_meal'),
            type: 'cap',
            section: sectionName,
            title: 'Single-Meal Transaction Limit',
            priority: 35,
            enabled: true,
            sourceQuote: singleMealLine,
            sourceParagraphIndex: paraIdx,
            conditions: { category: ['meals'] },
            parameters: {
              capAmountMinor: capMinor,
              capPeriod: 'per_claim',
              capScope: 'employee',
              onViolationBehavior: 'cap',
            },
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 5. GROUND COMMUTE / TRANSPORTATION
    // -------------------------------------------------------------------------
    const commuteLine = lines.find(
      (l) => /commute|taxi|cab|uber|ride-share/i.test(l) && !/section|heading|caps$/i.test(l) && /(?:reimbursed|up\s+to|capped|per\s+day|[₹$€£]|INR|USD)/i.test(l)
    );
    if (commuteLine) {
      const commuteMinor = extractMinorUnits(commuteLine, baseCurrency);
      if (commuteMinor && commuteMinor > 0) {
        rules.push({
          id: makeId('cap_transport'),
          type: 'cap',
          section: sectionName,
          title: 'Ground Transportation & Taxi Allowance',
          priority: 45,
          enabled: true,
          sourceQuote: commuteLine,
          sourceParagraphIndex: paraIdx,
          conditions: { category: ['transportation'] },
          parameters: {
            capAmountMinor: commuteMinor,
            capPeriod: commuteLine.toLowerCase().includes('trip') ? 'trip' : 'day',
            capScope: 'employee',
            onViolationBehavior: 'cap',
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 6. LODGING / HOTEL ALLOWANCE
    // -------------------------------------------------------------------------
    const lodgingLine = lines.find((l) => /hotel|lodging|accommodation/i.test(l));
    if (lodgingLine) {
      const lodgingMinor = extractMinorUnits(lodgingLine, baseCurrency);
      if (lodgingMinor && lodgingMinor > 0) {
        rules.push({
          id: makeId('cap_lodging'),
          type: 'cap',
          section: sectionName,
          title: 'Hotel & Lodging Nightly Cap',
          priority: 48,
          enabled: true,
          sourceQuote: lodgingLine,
          sourceParagraphIndex: paraIdx,
          conditions: { category: ['lodging'], isTravel: true },
          parameters: {
            capAmountMinor: lodgingMinor,
            capPeriod: 'day',
            capScope: 'employee',
            onViolationBehavior: 'cap',
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 7. APPROVAL THRESHOLDS & WORKFLOW
    // -------------------------------------------------------------------------
    if (
      lowerPara.includes('threshold') ||
      lowerPara.includes('approval') ||
      lowerPara.includes('touchless') ||
      lowerPara.includes('finance review') ||
      lowerPara.includes('finance authorization') ||
      lowerPara.includes('cfo') ||
      lowerPara.includes('manager authorization')
    ) {
      // Finance Review Threshold
      const financeLine = lines.find((l) => /finance|audit/i.test(l) && /between|over|exceeding|claims|require/i.test(l));
      if (financeLine) {
        const threshMinor = extractMinorUnits(financeLine, baseCurrency);
        if (threshMinor && threshMinor >= 100000) { // must be at least ₹1,000 / $10
          rules.push({
            id: makeId('thresh_finance'),
            type: 'threshold',
            section: sectionName,
            title: 'Finance Review Escalation Threshold',
            priority: 50,
            enabled: true,
            sourceQuote: financeLine,
            sourceParagraphIndex: paraIdx,
            conditions: {},
            parameters: {
              thresholdLevel: 'finance',
              thresholdAmountMinor: threshMinor,
              onViolationBehavior: 'escalate',
            },
          });
        }
      }

      // CFO / Executive Authorization Threshold
      const cfoLine = lines.find((l) => /cfo|executive|director/i.test(l) && /exceeding|above|over|more than/i.test(l));
      if (cfoLine) {
        const cfoThreshMinor = extractMinorUnits(cfoLine, baseCurrency);
        if (cfoThreshMinor && cfoThreshMinor > 0) {
          rules.push({
            id: makeId('thresh_cfo'),
            type: 'threshold',
            section: sectionName,
            title: 'CFO Executive Authorization Threshold',
            priority: 55,
            enabled: true,
            sourceQuote: cfoLine,
            sourceParagraphIndex: paraIdx,
            conditions: {},
            parameters: {
              thresholdLevel: 'cfo',
              thresholdAmountMinor: cfoThreshMinor,
              onViolationBehavior: 'escalate',
            },
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 8. TIMELY SUBMISSION DEADLINE
    // -------------------------------------------------------------------------
    const windowLine = lines.find((l) => /days/i.test(l) && /submission|deadline|window|receipt/i.test(l));
    if (windowLine) {
      const daysMatch = windowLine.match(/(\d+)\s*(?:calendar\s+)?days/i);
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        if (days > 0 && days <= 365) {
          lateSubmissionDays = days;
          rules.push({
            id: makeId('window_sub'),
            type: 'time_window',
            section: sectionName,
            title: `${days}-Day Submission Deadline`,
            priority: 70,
            enabled: true,
            sourceQuote: windowLine,
            sourceParagraphIndex: paraIdx,
            conditions: {},
            parameters: {
              timeWindowDays: days,
              onViolationBehavior: 'escalate',
            },
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 9. AMBIGUOUS CLAUSES (Keepr_Receipt_Final.md: Disabled with ambiguity notes)
    // -------------------------------------------------------------------------
    const ambigLine = lines.find((l) =>
      /ordinary,\s*reasonable|reasonable\s+and\s+necessary|appropriate\s+business|economical|discretionary/i.test(l)
    );
    if (ambigLine) {
      rules.push({
        id: makeId('ambig'),
        type: 'cap',
        section: sectionName,
        title: 'Subjective Standard of Reasonableness',
        priority: 95,
        enabled: false,
        isAmbiguous: true,
        ambiguityNote:
          "Policy specifies 'reasonable and ordinary' standard without establishing an explicit numeric boundary. Rule remains disabled pending explicit finance configuration.",
        sourceQuote: ambigLine,
        sourceParagraphIndex: paraIdx,
        conditions: {},
        parameters: {
          capScope: 'employee',
          onViolationBehavior: 'escalate',
        },
      });
    }
  });

  // Ensure city tiers map standard corporate hubs
  const cityTiers: Record<string, CityTier> = {
    Mumbai: 'Tier-1',
    Bengaluru: 'Tier-1',
    Delhi: 'Tier-1',
    Hyderabad: 'Tier-1',
    Pune: 'Tier-2',
    Chennai: 'Tier-2',
    Kolkata: 'Tier-2',
    Ahmedabad: 'Tier-2',
    Jaipur: 'Tier-3',
    Goa: 'Tier-3',
  };

  // If text mentions specific cities, ensure they are registered in cityTiers
  if (/mumbai|bengaluru|delhi|hyderabad/i.test(text)) {
    cityTiers.Mumbai = 'Tier-1';
    cityTiers.Bengaluru = 'Tier-1';
  }

  // Construct PolicyVersion
  const policyDraft: PolicyVersion = {
    id: `pol_ingested_${Date.now()}`,
    orgId,
    versionNumber: 2,
    status: 'draft',
    name: policyName,
    sourceText: text,
    createdAt: new Date().toISOString(),
    cityTiers,
    settings: {
      baseCurrency,
      reportingMonthStartDay: 1,
      lateSubmissionWindowDays: lateSubmissionDays,
      autoApproveRiskThreshold: autoApproveThreshold,
      autoApproveMinConfidence: 0.8,
      fxRates: {
        INR: 1.0,
        USD: 85.0,
        EUR: 92.0,
        GBP: 108.0,
        CAD: 62.0,
        AUD: 55.0,
        JPY: 0.58,
        AED: 23.1,
        SGD: 64.5,
      },
    },
    rules,
    conflictWarnings: [],
    dismissedWarnings: [],
  };

  // Run deterministic conflict check
  const conflictWarnings = detectPolicyConflicts(policyDraft);
  policyDraft.conflictWarnings = conflictWarnings;

  // Validate draft structure against Zod PolicyVersionSchema
  const validated = PolicyVersionSchema.safeParse(policyDraft);
  if (!validated.success) {
    console.warn('Policy draft Zod validation warnings:', validated.error.format());
  }

  const ambiguousCount = rules.filter((r) => r.isAmbiguous).length;

  return {
    policy: policyDraft,
    extractedRulesCount: rules.length,
    ambiguousClausesCount: ambiguousCount,
    conflicts: conflictWarnings,
    paragraphs,
    summary: `Successfully parsed ${rules.length} structured policy rules (${ambiguousCount} flagged ambiguous) from ${paragraphs.length} paragraphs.`,
  };
}
