import { CapPeriod, CapScope, Expense, PolicyVersion } from '../types/expense';

export interface LedgerEntry {
  expenseId: string;
  employeeId: string;
  expenseDate: string; // YYYY-MM-DD
  submittedAt: string; // ISO
  category: string;
  city?: string;
  tripId?: string;
  approvedAmountMinor: number;
  status: string;
  verdictDecision: string;
  isOverride: boolean;
}

export interface LedgerUsage {
  priorSpendMinor: number;
  entryCount: number;
  entries: LedgerEntry[];
}

/**
 * Pure deterministic chronological ledger.
 * No network, no Firebase, integer minor units.
 */
export class ExpenseLedger {
  private entries: LedgerEntry[] = [];

  constructor(initialEntries?: LedgerEntry[]) {
    if (initialEntries) {
      this.entries = [...initialEntries];
      this.sortChronologically();
    }
  }

  /**
   * Sort order specified by guide:
   * 1. expenseDate ASC
   * 2. submittedAt ASC
   * 3. ID ASC
   */
  private sortChronologically(): void {
    this.entries.sort((a, b) => {
      if (a.expenseDate !== b.expenseDate) {
        return a.expenseDate.localeCompare(b.expenseDate);
      }
      if (a.submittedAt !== b.submittedAt) {
        return a.submittedAt.localeCompare(b.submittedAt);
      }
      return a.expenseId.localeCompare(b.expenseId);
    });
  }

  /**
   * Generates a stable key for grouping cumulative expenses by period and scope
   */
  public static buildKey(params: {
    employeeId: string;
    period: CapPeriod;
    scope?: CapScope;
    date: string; // YYYY-MM-DD
    category?: string;
    city?: string;
    tripId?: string;
    monthStartDay?: number;
  }): string {
    const { employeeId, period, scope = 'employee', date, category, city, tripId, monthStartDay = 1 } = params;

    let periodKey = '';
    const dateObj = new Date(date + 'T00:00:00Z');

    if (period === 'per_claim') {
      periodKey = 'claim';
    } else if (period === 'day') {
      periodKey = date; // YYYY-MM-DD
    } else if (period === 'week') {
      // Calculate ISO week
      const target = new Date(dateObj.valueOf());
      const dayNr = (dateObj.getUTCDay() + 6) % 7;
      target.setUTCDate(target.getUTCDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setUTCMonth(0, 1);
      if (target.getUTCDay() !== 4) {
        target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
      }
      const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      const year = target.getUTCFullYear();
      periodKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
    } else if (period === 'month') {
      // Respect custom reporting month start day
      let year = dateObj.getUTCFullYear();
      let month = dateObj.getUTCMonth() + 1; // 1-12
      const day = dateObj.getUTCDate();

      if (day < monthStartDay) {
        month -= 1;
        if (month === 0) {
          month = 12;
          year -= 1;
        }
      }
      periodKey = `${year}-${String(month).padStart(2, '0')}`;
    } else if (period === 'trip') {
      periodKey = tripId || 'no-trip';
    }

    let scopeKey = `emp:${employeeId}`;
    if (scope === 'category' && category) {
      scopeKey = `emp:${employeeId}:cat:${category.toLowerCase()}`;
    } else if (scope === 'city' && city) {
      scopeKey = `emp:${employeeId}:city:${city.toLowerCase()}`;
    } else if (scope === 'global') {
      scopeKey = 'org:global';
    }

    return `${scopeKey}:${period}:${periodKey}`;
  }

  /**
   * Record or update an entry in the ledger
   */
  public record(entry: LedgerEntry): void {
    const existingIndex = this.entries.findIndex((e) => e.expenseId === entry.expenseId);
    if (existingIndex >= 0) {
      this.entries[existingIndex] = entry;
    } else {
      this.entries.push(entry);
    }
    this.sortChronologically();
  }

  /**
   * Remove an entry from the ledger
   */
  public remove(expenseId: string): void {
    this.entries = this.entries.filter((e) => e.expenseId !== expenseId);
  }

  /**
   * Calculate prior spend before a given target expense in chronological order
   */
  public getPriorUsage(params: {
    targetExpenseId?: string;
    employeeId: string;
    period: CapPeriod;
    scope?: CapScope;
    date: string; // YYYY-MM-DD
    targetSubmittedAt?: string;
    category?: string;
    city?: string;
    tripId?: string;
    monthStartDay?: number;
  }): LedgerUsage {
    const targetKey = ExpenseLedger.buildKey(params);
    let priorSpendMinor = 0;
    const matchingEntries: LedgerEntry[] = [];

    for (const entry of this.entries) {
      // Only consider records belonging to the same key
      const entryKey = ExpenseLedger.buildKey({
        employeeId: entry.employeeId,
        period: params.period,
        scope: params.scope,
        date: entry.expenseDate,
        category: entry.category,
        city: entry.city,
        tripId: entry.tripId,
        monthStartDay: params.monthStartDay,
      });

      if (entryKey !== targetKey) continue;

      // In chronological order, check if this entry precedes the target
      if (params.targetExpenseId && entry.expenseId === params.targetExpenseId) {
        break; // stop at target
      }

      if (entry.expenseDate > params.date) {
        break;
      }

      if (entry.expenseDate === params.date && params.targetSubmittedAt && entry.submittedAt > params.targetSubmittedAt) {
        break;
      }

      // Only approved amounts consume allowance
      // Rejection and needs_info do not consume allowance
      if (entry.approvedAmountMinor > 0) {
        priorSpendMinor += entry.approvedAmountMinor;
        matchingEntries.push(entry);
      }
    }

    return {
      priorSpendMinor,
      entryCount: matchingEntries.length,
      entries: matchingEntries,
    };
  }

  /**
   * Get all entries currently stored
   */
  public getAllEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  /**
   * Reset ledger
   */
  public clear(): void {
    this.entries = [];
  }
}
