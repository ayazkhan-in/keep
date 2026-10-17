import { z } from 'zod';
import {
  CapPeriod,
  CapScope,
  CityTier,
  PolicyRule,
  PolicyVersion,
  RuleType,
} from '../types/expense';

export const CityTierSchema = z.enum(['Tier-1', 'Tier-2', 'Tier-3', 'International']);

export const CapPeriodSchema = z.enum(['per_claim', 'day', 'week', 'month', 'trip']);

export const CapScopeSchema = z.enum(['employee', 'category', 'city', 'global']);

export const RuleTypeSchema = z.enum([
  'cap',
  'exclusion',
  'requirement',
  'threshold',
  'time_window',
  'document',
]);

export const RuleConditionsSchema = z.object({
  category: z.array(z.string()).optional(),
  isTravel: z.boolean().optional(),
  cityTier: z.array(CityTierSchema).optional(),
  grade: z.array(z.string()).optional(),
  department: z.array(z.string()).optional(),
  minAmountMinor: z.number().int().nonnegative().optional(),
  maxAmountMinor: z.number().int().nonnegative().optional(),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  merchantPattern: z.string().optional(),
  requiredMissingField: z.string().optional(),
});
export type RuleConditions = z.infer<typeof RuleConditionsSchema>;

export const RuleParametersSchema = z.object({
  capAmountMinor: z.number().int().nonnegative().optional(),
  capPeriod: CapPeriodSchema.optional(),
  capScope: CapScopeSchema.optional(),
  perAttendeeMultiplier: z.boolean().optional(),
  excludedItems: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional(),
  thresholdLevel: z.enum(['manager', 'finance', 'cfo']).optional(),
  thresholdAmountMinor: z.number().int().nonnegative().optional(),
  timeWindowDays: z.number().int().positive().optional(),
  documentTypes: z.array(z.string()).optional(),
  allocateTaxTipProportionally: z.boolean().default(true).optional(),
});
export type RuleParameters = z.infer<typeof RuleParametersSchema>;

export const PolicyRuleSchema = z.object({
  id: z.string().min(1),
  type: RuleTypeSchema,
  section: z.string().min(1),
  title: z.string().min(1),
  priority: z.number().int().default(100),
  enabled: z.boolean().default(true),
  sourceQuote: z.string().optional(),
  conditions: RuleConditionsSchema.default({}),
  parameters: RuleParametersSchema.default({}),
});

export const PolicySettingsSchema = z.object({
  baseCurrency: z.string().min(3).max(3).default('INR'),
  reportingMonthStartDay: z.number().int().min(1).max(28).default(1),
  lateSubmissionWindowDays: z.number().int().positive().default(30),
  autoApproveRiskThreshold: z.number().min(0).max(100).default(25),
  autoApproveMinConfidence: z.number().min(0).max(1).default(0.8),
  fxRates: z.record(z.string(), z.number().positive()).default({
    INR: 1.0,
    USD: 85.0,
    EUR: 92.0,
    GBP: 108.0,
    CAD: 62.0,
    AUD: 55.0,
    JPY: 0.58,
    AED: 23.1,
    SGD: 64.5,
  }),
});
export type PolicySettings = z.infer<typeof PolicySettingsSchema>;

export const PolicyVersionSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  versionNumber: z.number().int().positive().default(1),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  name: z.string().min(1),
  sourceText: z.string().optional(),
  rules: z.array(PolicyRuleSchema),
  cityTiers: z.record(z.string(), CityTierSchema).default({
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
  }),
  settings: PolicySettingsSchema.default({
    baseCurrency: 'INR',
    reportingMonthStartDay: 1,
    lateSubmissionWindowDays: 30,
    autoApproveRiskThreshold: 25,
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
  }),
  conflictWarnings: z.array(z.string()).default([]),
  createdAt: z.string(),
  activatedAt: z.string().optional(),
});

/**
 * Validates policy integrity and detects logical conflicts:
 * - Overlapping limits with contradictory values
 * - Unreachable thresholds
 * - Missing city tiers referenced by rules
 * - Ambiguous source quotes / missing quotes
 */
export function detectPolicyConflicts(policy: PolicyVersion): string[] {
  const warnings: string[] = [];
  const rules = policy.rules.filter((r) => r.enabled);

  // 1. Check for missing city tiers referenced by rules
  for (const rule of rules) {
    if (rule.conditions.cityTier) {
      for (const tier of rule.conditions.cityTier) {
        const hasMapping = Object.values(policy.cityTiers).includes(tier);
        if (!hasMapping) {
          warnings.push(`Rule "${rule.title}" references ${tier}, but no cities are mapped to this tier.`);
        }
      }
    }
  }

  // 2. Overlapping caps for same category and scope
  const caps = rules.filter((r) => r.type === 'cap');
  for (let i = 0; i < caps.length; i++) {
    for (let j = i + 1; j < caps.length; j++) {
      const c1 = caps[i];
      const c2 = caps[j];
      const samePeriod = c1.parameters.capPeriod === c2.parameters.capPeriod;
      const sameScope = c1.parameters.capScope === c2.parameters.capScope;
      const sameCategory =
        JSON.stringify(c1.conditions.category || []) === JSON.stringify(c2.conditions.category || []);
      const sameTravel = c1.conditions.isTravel === c2.conditions.isTravel;
      const sameCityTier =
        JSON.stringify(c1.conditions.cityTier || []) === JSON.stringify(c2.conditions.cityTier || []);

      if (samePeriod && sameScope && sameCategory && sameTravel && sameCityTier) {
        warnings.push(
          `Overlapping caps found between "${c1.title}" (${c1.parameters.capAmountMinor} minor units) and "${c2.title}" (${c2.parameters.capAmountMinor} minor units). The most restrictive will govern.`
        );
      }
    }
  }

  // 3. Threshold unreachable: threshold amount < 0 or negative
  const thresholds = rules.filter((r) => r.type === 'threshold');
  for (const t of thresholds) {
    if ((t.parameters.thresholdAmountMinor ?? 0) <= 0) {
      warnings.push(`Threshold rule "${t.title}" has a non-positive trigger amount.`);
    }
  }

  // 4. Source quote audit
  for (const r of rules) {
    if (!r.sourceQuote || r.sourceQuote.trim().length === 0) {
      warnings.push(`Rule "${r.title}" (${r.section}) lacks a source quote for audit traceability.`);
    }
  }

  return warnings;
}
