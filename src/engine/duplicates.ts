import { DuplicateCandidate, DuplicateInfo, DuplicateMatchKind, Expense } from '../types/expense';

/**
 * Normalizes merchant names for robust fuzzy matching
 * e.g. "Starbucks Coffee #1243 LLC" -> "starbucks"
 */
export function canonicalizeMerchant(merchant: string): string {
  if (!merchant) return '';
  return merchant
    .toLowerCase()
    .replace(/[#\d]/g, '')
    .replace(/\b(llc|inc|corp|ltd|co|pvt|cafe|coffee|restaurant|hotel)\b/g, '')
    .replace(/[^\w\s]/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Calculates Hamming distance between two hex dHash strings (64-bit hex representation)
 */
export function calculateDHashHammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export interface DuplicateDetectionOptions {
  currentExpense: Expense;
  existingExpenses: Expense[];
}

/**
 * Pure deterministic duplicate detection engine.
 * Scores candidates from 0 to 1.0 based on five evidence signals.
 */
export function detectDuplicates(options: DuplicateDetectionOptions): DuplicateInfo {
  const { currentExpense, existingExpenses } = options;
  const candidates: DuplicateCandidate[] = [];

  const currentSha = currentExpense.receiptRef?.originalSha256;
  const currentDHash = currentExpense.receiptRef?.dHash;
  const currentOrderId = (currentExpense.corrected?.orderId || currentExpense.extracted?.orderId?.value || '').trim().toLowerCase();
  const currentMerchant = canonicalizeMerchant(currentExpense.corrected?.merchant || currentExpense.extracted?.merchant?.value || '');
  const currentAmountMinor = currentExpense.normalizedCurrency?.targetAmountMinor || 0;
  const currentDate = currentExpense.expenseDate;
  const currentEmpId = currentExpense.employeeId;

  for (const prev of existingExpenses) {
    // Skip comparing with itself
    if (prev.id === currentExpense.id) continue;

    const prevSha = prev.receiptRef?.originalSha256;
    const prevDHash = prev.receiptRef?.dHash;
    const prevOrderId = (prev.corrected?.orderId || prev.extracted?.orderId?.value || '').trim().toLowerCase();
    const prevMerchant = canonicalizeMerchant(prev.corrected?.merchant || prev.extracted?.merchant?.value || '');
    const prevAmountMinor = prev.normalizedCurrency?.targetAmountMinor || 0;
    const prevDate = prev.expenseDate;
    const isSameEmp = prev.employeeId === currentEmpId;

    let matchKind: DuplicateMatchKind | null = null;
    let score = 0;
    let evidence = '';

    // 1. Same SHA-256 (Score: 1.00 - exact binary match)
    if (currentSha && prevSha && currentSha === prevSha) {
      matchKind = 'sha256';
      score = 1.0;
      evidence = `Exact byte-level SHA-256 hash match with claim ${prev.id}. Identical receipt file uploaded.`;
    }
    // 2. Same normalized Order ID + Canonical Merchant (Score: 0.95)
    else if (currentOrderId && prevOrderId && currentOrderId === prevOrderId && currentMerchant && currentMerchant === prevMerchant) {
      matchKind = 'order_id';
      score = 0.95;
      evidence = `Matching order reference "${currentOrderId}" and merchant "${currentMerchant}" with claim ${prev.id}.`;
    }
    // 3. dHash perceptual hash Hamming distance <= 6 (Score: 0.85)
    else if (currentDHash && prevDHash) {
      const dist = calculateDHashHammingDistance(currentDHash, prevDHash);
      if (dist <= 6) {
        matchKind = 'dhash';
        score = 0.85;
        evidence = `Perceptual visual hash distance is ${dist} (threshold <= 6) compared to claim ${prev.id}. Re-photographed receipt suspected.`;
      }
    }

    // 4. Same employee + canonical merchant + amount within 0.5% + date +/- 1 day (Score: 0.80)
    if (!matchKind && isSameEmp && currentMerchant && prevMerchant && currentMerchant === prevMerchant) {
      const amountDiff = Math.abs(currentAmountMinor - prevAmountMinor);
      const amountTolerance = Math.max(100, Math.round(currentAmountMinor * 0.005)); // 1 currency unit or 0.5%

      if (amountDiff <= amountTolerance && currentDate && prevDate) {
        const d1 = new Date(currentDate).getTime();
        const d2 = new Date(prevDate).getTime();
        const dayDiff = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

        if (dayDiff <= 1) {
          matchKind = 'metadata';
          score = 0.8;
          evidence = `Same employee, identical vendor "${currentMerchant}", matching amount (${currentAmountMinor / 100}), within ${dayDiff} day of claim ${prev.id}.`;
        }
      }
    }

    // 5. Cross-employee shared meal: merchant + amount within 2% + same date (Score: ~0.75)
    if (!matchKind && !isSameEmp && currentMerchant && prevMerchant && currentMerchant === prevMerchant) {
      const amountDiff = Math.abs(currentAmountMinor - prevAmountMinor);
      const amountTolerance = Math.max(200, Math.round(currentAmountMinor * 0.02)); // 2% tolerance

      if (amountDiff <= amountTolerance && currentDate === prevDate) {
        matchKind = 'shared_meal';
        score = 0.75;
        evidence = `Cross-employee shared expense signal: identical date (${currentDate}), vendor "${currentMerchant}", and matching amount with claim ${prev.id} submitted by another employee.`;
      }
    }

    if (matchKind && score >= 0.7) {
      candidates.push({
        claimId: prev.id,
        employeeId: prev.employeeId,
        expenseDate: prev.expenseDate,
        submittedAt: prev.submittedAt,
        amountMinor: prevAmountMinor,
        merchant: prev.extracted?.merchant?.value || 'Unknown',
        matchKind,
        score,
        evidenceText: evidence,
      });
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  const highestScore = candidates.length > 0 ? candidates[0].score : 0;
  const primaryMatchKind: DuplicateMatchKind =
    candidates.length > 0 ? candidates[0].matchKind : 'metadata';

  const evidenceSummary =
    candidates.length > 0
      ? candidates.map((c) => c.evidenceText).join(' | ')
      : 'No duplicate candidates found within organization history.';

  return {
    candidateClaimIds: candidates.map((c) => c.claimId),
    candidates,
    highestScore,
    primaryMatchKind,
    evidenceSummary,
    resolutionStatus: candidates.length > 0 ? 'pending' : 'dismissed',
  };
}
