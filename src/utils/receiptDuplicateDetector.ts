import { canonicalizeMerchant } from '../engine/duplicates';
import { ReceiptAnchor, DuplicateCheckResult, ReceiptIssue } from '../types';

const STORAGE_KEY_REGISTRY = 'keepr_receipt_hash_registry_v1';

/**
 * Robust cross-environment (Browser & Node) SHA-256 calculation
 */
export async function computeSha256(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  // 1. If subtle crypto is available (Modern Browsers & Node.js 19+)
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    let buffer: ArrayBuffer;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
    } else if (data instanceof Uint8Array) {
      buffer = data.buffer as ArrayBuffer;
    } else {
      buffer = data;
    }
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 2. Node.js native crypto fallback if running in legacy node environment
  try {
    if (typeof window === 'undefined') {
      const cryptoModuleName = 'crypto';
      const nodeCrypto = await import(/* @vite-ignore */ cryptoModuleName);
      const hash = nodeCrypto.createHash('sha256');
      if (typeof data === 'string') {
        hash.update(data);
      } else {
        hash.update(Buffer.from(data as any));
      }
      return hash.digest('hex');
    }
  } catch (e) {
    // 3. Fallback deterministic hash calculation
    let hash = 0;
    const str = typeof data === 'string' ? data : new Uint8Array(data as any).toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Computes raw image SHA-256 hash from a File, Blob, ArrayBuffer, or Base64 data string
 */
export async function computeRawImageSha256(fileOrBase64: File | Blob | string | ArrayBuffer): Promise<string> {
  if (typeof fileOrBase64 === 'string') {
    // Strip data URI header if present
    const cleanData = fileOrBase64.replace(/^data:[^;]+;base64,/, '');
    return computeSha256(cleanData);
  }

  if (fileOrBase64 instanceof ArrayBuffer) {
    return computeSha256(fileOrBase64);
  }

  // File or Blob
  const arrayBuffer = await fileOrBase64.arrayBuffer();
  return computeSha256(arrayBuffer);
}

/**
 * Constructs a normalized, deterministic ReceiptAnchor payload
 */
export function createAnchorJson(data: {
  transaction_date?: string;
  purchaseDate?: string;
  date?: string;
  total_amount?: number | string;
  price?: number | string;
  total?: number | string;
  vendor?: string;
  merchant?: string;
  currency?: string;
  order_number?: string;
  orderNumber?: string;
  orderId?: string;
}): ReceiptAnchor {
  const rawDate = data.transaction_date || data.purchaseDate || data.date || '';
  const rawAmount = data.total_amount ?? data.price ?? data.total ?? 0;
  const numAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount) || 0 : Number(rawAmount) || 0;
  const rawVendor = data.vendor || data.merchant || '';
  const rawCurrency = data.currency || 'USD';
  const rawOrderNum = data.order_number || data.orderNumber || data.orderId || '';

  return {
    transaction_date: rawDate.trim().split('T')[0], // Ensure YYYY-MM-DD
    total_amount: Number(numAmount.toFixed(2)),
    vendor: canonicalizeMerchant(rawVendor),
    currency: rawCurrency.trim().toUpperCase(),
    order_number: rawOrderNum.trim().toLowerCase(),
  };
}

/**
 * Computes deterministic SHA-256 of canonical Anchor JSON
 */
export async function computeAnchorJsonHash(anchor: ReceiptAnchor): Promise<string> {
  // Sort keys alphabetically for deterministic serialization
  const canonicalString = JSON.stringify({
    currency: anchor.currency || 'USD',
    order_number: anchor.order_number || '',
    total_amount: Number(anchor.total_amount.toFixed(2)),
    transaction_date: anchor.transaction_date || '',
    vendor: anchor.vendor || '',
  });

  return computeSha256(canonicalString);
}

interface StoredRecordMeta {
  id: string;
  title: string;
  vendor: string;
  date: string;
  amount: number;
  timestamp: number;
}

interface HashRegistryData {
  rawImageHashes: Record<string, StoredRecordMeta>;
  anchorJsonHashes: Record<string, StoredRecordMeta>;
}

// In-memory cache
let inMemoryRegistry: HashRegistryData = {
  rawImageHashes: {},
  anchorJsonHashes: {},
};

/**
 * Loads registry from localStorage (or in-memory fallback)
 */
export function getReceiptRegistry(): HashRegistryData {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REGISTRY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rawImageHashes && parsed.anchorJsonHashes) {
          inMemoryRegistry = parsed;
          return inMemoryRegistry;
        }
      }
    } catch (e) {
      console.warn('Error reading receipt registry from storage:', e);
    }
  }
  return inMemoryRegistry;
}

/**
 * Persists registry
 */
function persistRegistry() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(inMemoryRegistry));
    } catch (e) {
      console.warn('Error saving receipt registry:', e);
    }
  }
}

/**
 * Stage 1: Check if raw image hash is a duplicate
 */
export function checkRawImageDuplicate(rawImageHash: string): DuplicateCheckResult {
  if (!rawImageHash) return { isDuplicate: false };

  const registry = getReceiptRegistry();
  const match = registry.rawImageHashes[rawImageHash];

  if (match) {
    return {
      isDuplicate: true,
      stage: 'raw_image_hash',
      hash: rawImageHash,
      matchedRecordId: match.id,
      matchedRecordTitle: match.title,
      reason: `Identical receipt image file previously recorded (${match.title || match.vendor}, recorded on ${new Date(match.timestamp).toLocaleDateString()}). Discarded before AI processing.`,
    };
  }

  // Also check existing purchases in localStorage if available
  if (typeof localStorage !== 'undefined') {
    try {
      const savedPurchases = localStorage.getItem('keepr_purchases_v1');
      if (savedPurchases) {
        const purchases = JSON.parse(savedPurchases);
        if (Array.isArray(purchases)) {
          const found = purchases.find((p: any) => p.rawImageHash === rawImageHash);
          if (found) {
            return {
              isDuplicate: true,
              stage: 'raw_image_hash',
              hash: rawImageHash,
              matchedRecordId: found.id,
              matchedRecordTitle: found.name,
              reason: `Identical receipt image previously saved as "${found.name}". Discarded before AI processing.`,
            };
          }
        }
      }

      // Also check existing corporate expenses
      const savedExpenses = localStorage.getItem('keepr_expenses_v2');
      if (savedExpenses) {
        const expenses = JSON.parse(savedExpenses);
        if (Array.isArray(expenses)) {
          const foundExp = expenses.find((e: any) => e.receiptRef?.originalSha256 === rawImageHash);
          if (foundExp) {
            return {
              isDuplicate: true,
              stage: 'raw_image_hash',
              hash: rawImageHash,
              matchedRecordId: foundExp.id,
              matchedRecordTitle: foundExp.extracted?.merchant?.value || 'Expense Claim',
              reason: `Identical receipt image previously submitted in expense claim ${foundExp.id}. Discarded before AI processing.`,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Storage check notice:', err);
    }
  }

  return { isDuplicate: false };
}

/**
 * Stage 2: Check if anchor JSON hash is a duplicate
 */
export function checkAnchorJsonDuplicate(anchorJsonHash: string, currentAnchor?: ReceiptAnchor): DuplicateCheckResult {
  if (!anchorJsonHash) return { isDuplicate: false };

  const registry = getReceiptRegistry();
  const match = registry.anchorJsonHashes[anchorJsonHash];

  if (match) {
    return {
      isDuplicate: true,
      stage: 'anchor_json_hash',
      hash: anchorJsonHash,
      matchedRecordId: match.id,
      matchedRecordTitle: match.title,
      anchor: currentAnchor,
      reason: `Matching financial transaction anchor (${match.vendor}, ₹/$ ${match.amount} on ${match.date}) already exists in your records. Duplicate rejected.`,
    };
  }

  // Cross-check existing purchases in localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const savedPurchases = localStorage.getItem('keepr_purchases_v1');
      if (savedPurchases) {
        const purchases = JSON.parse(savedPurchases);
        if (Array.isArray(purchases)) {
          for (const p of purchases) {
            if (p.anchorJsonHash === anchorJsonHash) {
              return {
                isDuplicate: true,
                stage: 'anchor_json_hash',
                hash: anchorJsonHash,
                matchedRecordId: p.id,
                matchedRecordTitle: p.name,
                anchor: currentAnchor,
                reason: `Matching transaction anchor already recorded under "${p.name}" (${p.vendor}, ${p.currency} ${p.price} on ${p.purchaseDate}). Duplicate rejected.`,
              };
            }
          }
        }
      }

      // Cross-check existing corporate expenses
      const savedExpenses = localStorage.getItem('keepr_expenses_v2');
      if (savedExpenses) {
        const expenses = JSON.parse(savedExpenses);
        if (Array.isArray(expenses)) {
          for (const e of expenses) {
            if (e.anchorJsonHash === anchorJsonHash) {
              return {
                isDuplicate: true,
                stage: 'anchor_json_hash',
                hash: anchorJsonHash,
                matchedRecordId: e.id,
                matchedRecordTitle: e.extracted?.merchant?.value || 'Expense Claim',
                anchor: currentAnchor,
                reason: `Matching transaction anchor already submitted in claim ${e.id} (${e.extracted?.merchant?.value}, on ${e.expenseDate}). Duplicate rejected.`,
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('Storage check notice:', err);
    }
  }

  return { isDuplicate: false };
}

/**
 * Register a newly confirmed receipt in the duplicate registry
 */
export function registerReceipt(params: {
  id: string;
  title: string;
  vendor: string;
  date: string;
  amount: number;
  rawImageHash?: string;
  anchorJsonHash?: string;
}) {
  const meta: StoredRecordMeta = {
    id: params.id,
    title: params.title,
    vendor: params.vendor,
    date: params.date,
    amount: params.amount,
    timestamp: Date.now(),
  };

  if (params.rawImageHash) {
    inMemoryRegistry.rawImageHashes[params.rawImageHash] = meta;
  }

  if (params.anchorJsonHash) {
    inMemoryRegistry.anchorJsonHashes[params.anchorJsonHash] = meta;
  }

  persistRegistry();
}

/**
 * Synchronize registry with existing purchases and expenses
 */
export async function syncRegistryWithItems(
  purchases: Array<{ id: string; name: string; vendor: string; purchaseDate: string; price: number; currency: string; orderNumber?: string; rawImageHash?: string; anchorJsonHash?: string }>,
  expenses: Array<{ id: string; expenseDate: string; extracted?: any; receiptRef?: any; anchorJsonHash?: string }>
) {
  for (const p of purchases) {
    const anchor = createAnchorJson({
      purchaseDate: p.purchaseDate,
      price: p.price,
      vendor: p.vendor,
      currency: p.currency,
      orderNumber: p.orderNumber,
    });
    const anchorHash = p.anchorJsonHash || (await computeAnchorJsonHash(anchor));
    registerReceipt({
      id: p.id,
      title: p.name,
      vendor: p.vendor,
      date: p.purchaseDate,
      amount: p.price,
      rawImageHash: p.rawImageHash,
      anchorJsonHash: anchorHash,
    });
  }

  for (const e of expenses) {
    const rawSha = e.receiptRef?.originalSha256;
    const vendor = e.extracted?.merchant?.value || '';
    const date = e.expenseDate;
    const amount = e.extracted?.total?.value || 0;
    const currency = e.extracted?.currency?.value || 'INR';
    const orderId = e.extracted?.orderId?.value || '';

    const anchor = createAnchorJson({
      date,
      total: amount,
      merchant: vendor,
      currency,
      orderId,
    });
    const anchorHash = e.anchorJsonHash || (await computeAnchorJsonHash(anchor));
    registerReceipt({
      id: e.id,
      title: vendor || 'Corporate Expense',
      vendor,
      date,
      amount,
      rawImageHash: rawSha,
      anchorJsonHash: anchorHash,
    });
  }
}

/**
 * Creates a duplicate rejection ReceiptIssue to display in the top overlay card
 */
export function createDuplicateRejectionIssue(dupResult: DuplicateCheckResult): ReceiptIssue {
  const isRaw = dupResult.stage === 'raw_image_hash';
  const matchInfo = dupResult.matchedRecordTitle ? ` (${dupResult.matchedRecordTitle})` : '';

  return {
    code: isRaw ? 'DUPLICATE_IMAGE_HASH' : 'DUPLICATE_ANCHOR_JSON',
    severity: 'error',
    title: isRaw
      ? 'Duplicate Receipt Image'
      : 'Duplicate Transaction Detected',
    message: isRaw
      ? `This receipt image was already uploaded previously${matchInfo}. Upload discarded to prevent duplicates.`
      : `This receipt matches an existing transaction on record${matchInfo}. Discarded to prevent double-entry.`,
    duplicateStage: dupResult.stage,
    isDuplicate: true,
  };
}

/**
 * Clears the registry (useful for testing)
 */
export function clearReceiptRegistry(): void {
  inMemoryRegistry = {
    rawImageHashes: {},
    anchorJsonHashes: {},
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_REGISTRY);
  }
}
