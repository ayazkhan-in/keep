import { describe, it, expect } from 'vitest';
import { getReceiptFallback } from '../server';

describe('Receipt Scanner Versatility & Quality Issues Suite', () => {
  describe('Versatile Category Extraction', () => {
    it('accurately parses Meals & Entertainment receipts with line items and tips', () => {
      const result = getReceiptFallback('Toit Brewpub Indiranagar Craft Beer Pizza Dinner');
      
      expect(result.category).toBe('Meals & Entertainment');
      expect(result.vendor).toContain('Toit');
      expect(result.price).toBeGreaterThan(0);
      expect(result.tip).toBeDefined();
      expect(result.isReceipt).toBe(true);
      expect(result.isReadable).toBe(true);
      expect(result.hasIssue).toBe(false);
      expect(result.lineItems?.length).toBeGreaterThan(0);
    });

    it('accurately parses Travel & Transit receipts with carrier and route info', () => {
      const result = getReceiptFallback('Delta Air Lines Flight SFO to JFK Boarding Pass DL891Q');
      
      expect(result.category).toBe('Travel & Transit');
      expect(result.vendor).toBe('Delta Air Lines');
      expect(result.price).toBe(489.20);
      expect(result.travelContext?.carrier).toBe('Delta Air Lines');
      expect(result.travelContext?.bookingReference).toBe('DL891Q');
      expect(result.travelContext?.origin).toBe('San Francisco (SFO)');
      expect(result.travelContext?.destination).toBe('New York (JFK)');
      expect(result.isReceipt).toBe(true);
      expect(result.isReadable).toBe(true);
      expect(result.hasIssue).toBe(false);
    });

    it('accurately parses Office & Operational receipts with PO and line items', () => {
      const result = getReceiptFallback('WeWork Monthly Dedicated Desk Workspace Pass INV-WW-9921');
      
      expect(result.category).toBe('Office & Operational');
      expect(result.vendor).toBe('WeWork Management LLC');
      expect(result.orderNumber).toBe('INV-WW-9921');
      expect(result.price).toBe(299.00);
      expect(result.isReceipt).toBe(true);
      expect(result.isReadable).toBe(true);
      expect(result.hasIssue).toBe(false);
      expect(result.lineItems?.length).toBeGreaterThan(0);
    });
  });

  describe('Receipt Quality & Issue Auditing', () => {
    it('flags unreadable and blurry receipts with descriptive issue message and recommendation', () => {
      const result = getReceiptFallback('blurry unreadable smudged receipt');
      
      expect(result.isReadable).toBe(false);
      expect(result.hasIssue).toBe(true);
      expect(result.issues).toBeDefined();
      expect(result.issues?.length).toBeGreaterThan(0);
      
      const issue = result.primaryIssue || result.issues?.[0];
      expect(issue).toBeDefined();
      expect(issue?.code).toBe('UNREADABLE_BLURRY');
      expect(issue?.severity).toBe('error');
      expect(issue?.message.toLowerCase()).toContain('blur');
      expect(issue?.suggestion).toBeDefined();
    });

    it('flags cut-off / cropped receipts with missing total warning', () => {
      const result = getReceiptFallback('receipt is cut off at the bottom and cropped');
      
      expect(result.isReadable).toBe(false);
      expect(result.hasIssue).toBe(true);
      
      const issue = result.primaryIssue || result.issues?.[0];
      expect(issue).toBeDefined();
      expect(issue?.code).toBe('CUT_OFF_DOCUMENT');
      expect(issue?.message).toContain('cut off');
      expect(issue?.suggestion).toContain('top to bottom');
    });

    it('flags non-receipt uploads and invalid documents', () => {
      const result = getReceiptFallback('not a receipt, random photo of a plant');
      
      expect(result.isReceipt).toBe(false);
      expect(result.isReadable).toBe(false);
      expect(result.hasIssue).toBe(true);
      
      const issue = result.primaryIssue || result.issues?.[0];
      expect(issue).toBeDefined();
      expect(issue?.code).toBe('NOT_A_RECEIPT');
      expect(issue?.message).toContain('not appear to be a receipt');
    });

    it('guards against corrupt or truncated base64 image data', () => {
      const corruptBase64 = 'data:image/jpeg;base64,short';
      const result = getReceiptFallback('', corruptBase64);
      
      expect(result.isReadable).toBe(false);
      expect(result.hasIssue).toBe(true);
      expect(result.primaryIssue?.code).toBe('UNREADABLE_BLURRY');
    });
  });

  describe('Two-Stage Receipt Duplicate Detection Guard', () => {
    it('Stage 1: computes identical SHA-256 hash for raw images regardless of data URI prefix', async () => {
      const { computeRawImageSha256 } = await import('../src/utils/receiptDuplicateDetector');
      const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dataUri = `data:image/png;base64,${rawBase64}`;

      const hash1 = await computeRawImageSha256(rawBase64);
      const hash2 = await computeRawImageSha256(dataUri);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('Stage 1: catches duplicate raw image upload before AI processing', async () => {
      const {
        computeRawImageSha256,
        checkRawImageDuplicate,
        registerReceipt,
        clearReceiptRegistry,
      } = await import('../src/utils/receiptDuplicateDetector');

      clearReceiptRegistry();

      const imageBytes = 'mock-raw-receipt-image-bytes-upload-1';
      const rawHash = await computeRawImageSha256(imageBytes);

      // 1. Before registration: not a duplicate
      const preCheck = checkRawImageDuplicate(rawHash);
      expect(preCheck.isDuplicate).toBe(false);

      // 2. Register receipt
      registerReceipt({
        id: 'rec_001',
        title: 'Blue Bottle Morning Coffee',
        vendor: 'Blue Bottle Coffee',
        date: '2026-10-18',
        amount: 24.50,
        rawImageHash: rawHash,
      });

      // 3. User attempts to upload the exact same image again
      const postCheck = checkRawImageDuplicate(rawHash);
      expect(postCheck.isDuplicate).toBe(true);
      expect(postCheck.stage).toBe('raw_image_hash');
      expect(postCheck.hash).toBe(rawHash);
      expect(postCheck.matchedRecordTitle).toBe('Blue Bottle Morning Coffee');
    });

    it('Stage 2: normalizes anchor fields (vendor, date, amount, currency) into canonical JSON', async () => {
      const { createAnchorJson, computeAnchorJsonHash } = await import('../src/utils/receiptDuplicateDetector');

      const anchor1 = createAnchorJson({
        vendor: 'Starbucks Coffee #1243 LLC',
        purchaseDate: '2026-10-18T19:30:00.000Z',
        price: '24.50',
        currency: 'USD',
        orderNumber: 'INV-9988',
      });

      const anchor2 = createAnchorJson({
        merchant: 'starbucks', // Case & corporate suffix stripped
        date: '2026-10-18',
        total_amount: 24.50,
        currency: 'usd',
        order_number: 'inv-9988',
      });

      expect(anchor1.transaction_date).toBe('2026-10-18');
      expect(anchor1.total_amount).toBe(24.5);
      expect(anchor1.currency).toBe('USD');

      const hash1 = await computeAnchorJsonHash(anchor1);
      const hash2 = await computeAnchorJsonHash(anchor2);

      // Normalization ensures identical financial anchor produces identical hash
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('Stage 2: rejects duplicate receipt by Anchor JSON hashing when photo is different but transaction matches', async () => {
      const {
        createAnchorJson,
        computeAnchorJsonHash,
        checkAnchorJsonDuplicate,
        registerReceipt,
        clearReceiptRegistry,
      } = await import('../src/utils/receiptDuplicateDetector');

      clearReceiptRegistry();

      const originalAnchor = createAnchorJson({
        vendor: 'Delta Air Lines',
        purchaseDate: '2026-10-18',
        price: 489.20,
        currency: 'USD',
        orderNumber: 'DL891Q',
      });
      const anchorHash = await computeAnchorJsonHash(originalAnchor);

      registerReceipt({
        id: 'flight_100',
        title: 'Delta Air Lines Flight DL891Q',
        vendor: 'Delta Air Lines',
        date: '2026-10-18',
        amount: 489.20,
        anchorJsonHash: anchorHash,
      });

      // Second upload with a re-taken photo (different angle/raw bytes) but same transaction
      const secondUploadAnchor = createAnchorJson({
        vendor: 'Delta Air Lines',
        purchaseDate: '2026-10-18',
        price: 489.20,
        currency: 'USD',
        orderNumber: 'DL891Q',
      });
      const secondAnchorHash = await computeAnchorJsonHash(secondUploadAnchor);

      const check = checkAnchorJsonDuplicate(secondAnchorHash, secondUploadAnchor);
      expect(check.isDuplicate).toBe(true);
      expect(check.stage).toBe('anchor_json_hash');
      expect(check.matchedRecordTitle).toBe('Delta Air Lines Flight DL891Q');
      expect(check.reason).toContain('Delta Air Lines');
    });

    it('generates an actionable ReceiptIssue overlay payload on duplicate detection', async () => {
      const { createDuplicateRejectionIssue } = await import('../src/utils/receiptDuplicateDetector');

      const rawIssue = createDuplicateRejectionIssue({
        isDuplicate: true,
        stage: 'raw_image_hash',
        hash: 'hash_abc',
        matchedRecordTitle: 'Office Supplies',
      });

      expect(rawIssue.code).toBe('DUPLICATE_IMAGE_HASH');
      expect(rawIssue.severity).toBe('error');
      expect(rawIssue.title).toContain('Duplicate Receipt');
      expect(rawIssue.message).toContain('Office Supplies');
      expect(rawIssue.isDuplicate).toBe(true);

      const anchorIssue = createDuplicateRejectionIssue({
        isDuplicate: true,
        stage: 'anchor_json_hash',
        hash: 'hash_xyz',
        matchedRecordTitle: 'Team Dinner',
      });

      expect(anchorIssue.code).toBe('DUPLICATE_ANCHOR_JSON');
      expect(anchorIssue.severity).toBe('error');
      expect(anchorIssue.title).toContain('Duplicate Transaction');
      expect(anchorIssue.message).toContain('Team Dinner');
      expect(anchorIssue.isDuplicate).toBe(true);
    });
  });

  describe('Receipt Hash Storage Exclusivity & Error Handling', () => {
    it('does NOT store hash if receipt has blur or unreadable flag (UNREADABLE_BLURRY)', async () => {
      const {
        registerReceipt,
        checkRawImageDuplicate,
        checkAnchorJsonDuplicate,
        clearReceiptRegistry,
      } = await import('../src/utils/receiptDuplicateDetector');

      clearReceiptRegistry();

      const rawHash = 'blurry-receipt-image-hash-1111';
      const anchorHash = 'blurry-receipt-anchor-hash-1111';

      // Attempt to register a blurry receipt
      registerReceipt({
        id: 'rec-blurry-1',
        title: 'Unreadable Blurry Receipt',
        vendor: 'Unknown Merchant',
        date: '2026-10-18',
        amount: 0,
        rawImageHash: rawHash,
        anchorJsonHash: anchorHash,
        hasIssue: true,
        isReadable: false,
        primaryIssue: {
          code: 'UNREADABLE_BLURRY',
          severity: 'error',
          title: 'Receipt Is Severely Blurry & Unreadable',
          message: 'The receipt is blurry and numbers cannot be read.',
        },
      });

      // Verification: Neither the raw image hash nor the anchor json hash should be stored in registry
      const rawCheck = checkRawImageDuplicate(rawHash);
      expect(rawCheck.isDuplicate).toBe(false);

      const anchorCheck = checkAnchorJsonDuplicate(anchorHash);
      expect(anchorCheck.isDuplicate).toBe(false);
    });

    it('does NOT store hash if receipt is cropped / trimmed (CUT_OFF_DOCUMENT)', async () => {
      const {
        registerReceipt,
        checkRawImageDuplicate,
        checkAnchorJsonDuplicate,
        clearReceiptRegistry,
      } = await import('../src/utils/receiptDuplicateDetector');

      clearReceiptRegistry();

      const rawHash = 'trimmed-receipt-image-hash-2222';
      const anchorHash = 'trimmed-receipt-anchor-hash-2222';

      // Attempt to register a trimmed receipt
      registerReceipt({
        id: 'rec-trimmed-1',
        title: 'Cut Off Document',
        vendor: 'Cafe Metro',
        date: '2026-10-18',
        amount: 19.0,
        rawImageHash: rawHash,
        anchorJsonHash: anchorHash,
        hasIssue: true,
        isReadable: false,
        primaryIssue: {
          code: 'CUT_OFF_DOCUMENT',
          severity: 'error',
          title: 'Document Is Cropped / Trimmed',
          message: 'Receipt is cut off at the bottom and missing total amount.',
        },
      });

      expect(checkRawImageDuplicate(rawHash).isDuplicate).toBe(false);
      expect(checkAnchorJsonDuplicate(anchorHash).isDuplicate).toBe(false);
    });

    it('does NOT store hash if hasEncounteredError flag is true', async () => {
      const {
        registerReceipt,
        checkRawImageDuplicate,
        checkAnchorJsonDuplicate,
        clearReceiptRegistry,
      } = await import('../src/utils/receiptDuplicateDetector');

      clearReceiptRegistry();

      const rawHash = 'encountered-error-hash-3333';
      const anchorHash = 'encountered-error-anchor-3333';

      registerReceipt({
        id: 'rec-err-1',
        title: 'Receipt With Scan Interruption',
        vendor: 'Some Vendor',
        date: '2026-10-18',
        amount: 50.0,
        rawImageHash: rawHash,
        anchorJsonHash: anchorHash,
        hasEncounteredError: true,
      });

      expect(checkRawImageDuplicate(rawHash).isDuplicate).toBe(false);
      expect(checkAnchorJsonDuplicate(anchorHash).isDuplicate).toBe(false);
    });

    it('stores hash ONLY when receipt is fully submitted without errors', async () => {
      const {
        registerReceipt,
        checkRawImageDuplicate,
        checkAnchorJsonDuplicate,
        clearReceiptRegistry,
      } = await import('../src/utils/receiptDuplicateDetector');

      clearReceiptRegistry();

      const rawHash = 'clean-valid-image-hash-4444';
      const anchorHash = 'clean-valid-anchor-hash-4444';

      // Register clean, error-free receipt upon full submission
      registerReceipt({
        id: 'rec-clean-1',
        title: 'Blue Bottle Coffee',
        vendor: 'Blue Bottle Coffee',
        date: '2026-10-18',
        amount: 24.50,
        rawImageHash: rawHash,
        anchorJsonHash: anchorHash,
        hasIssue: false,
        isReadable: true,
        hasError: false,
        hasEncounteredError: false,
      });

      // Now it IS stored and catches duplicates
      expect(checkRawImageDuplicate(rawHash).isDuplicate).toBe(true);
      expect(checkAnchorJsonDuplicate(anchorHash).isDuplicate).toBe(true);
    });

    it('serverReceiptRegistry does NOT store hashes during scan/ingestion fallback', async () => {
      const { serverReceiptRegistry, clearServerReceiptRegistry, getReceiptFallback } = await import('../server');

      clearServerReceiptRegistry();

      // Simulate a scan of blurry receipt
      const fallbackBlurry = getReceiptFallback('blurry smudged unreadable receipt');
      expect(fallbackBlurry.hasIssue).toBe(true);

      // Verify server registry is empty
      expect(serverReceiptRegistry.rawImageHashes.size).toBe(0);
      expect(serverReceiptRegistry.anchorJsonHashes.size).toBe(0);

      // Simulate a scan of valid receipt
      const fallbackValid = getReceiptFallback('Toit Brewpub Indiranagar Craft Beer Pizza Dinner');
      expect(fallbackValid.hasIssue).toBe(false);

      // Even valid receipts must NOT be stored at scan time
      expect(serverReceiptRegistry.rawImageHashes.size).toBe(0);
      expect(serverReceiptRegistry.anchorJsonHashes.size).toBe(0);
    });
  });

  describe('Currency Reading & INR Conversion Suite', () => {
    it('uses current FX conversion metrics (1 USD = 95.08 INR, 1 EUR = 106.87 INR)', async () => {
      const { CURRENT_FX_RATES_TO_INR, CURRENT_FX_METRICS } = await import('../src/utils/currencyConverter');

      expect(CURRENT_FX_RATES_TO_INR.USD).toBe(95.08);
      expect(CURRENT_FX_RATES_TO_INR.EUR).toBe(106.87);
      expect(CURRENT_FX_RATES_TO_INR.INR).toBe(1.0);

      expect(CURRENT_FX_METRICS.USD.rateToInr).toBe(95.08);
      expect(CURRENT_FX_METRICS.USD.rateLabel).toBe('1 USD = ₹95.08 INR');

      expect(CURRENT_FX_METRICS.EUR.rateToInr).toBe(106.87);
      expect(CURRENT_FX_METRICS.EUR.rateLabel).toBe('1 EUR = ₹106.87 INR');
    });

    it('correctly normalizes currency symbols and text codes', async () => {
      const { normalizeCurrencyCode } = await import('../src/utils/currencyConverter');

      expect(normalizeCurrencyCode('$')).toBe('USD');
      expect(normalizeCurrencyCode('usd')).toBe('USD');
      expect(normalizeCurrencyCode('Dollar')).toBe('USD');

      expect(normalizeCurrencyCode('€')).toBe('EUR');
      expect(normalizeCurrencyCode('eur')).toBe('EUR');
      expect(normalizeCurrencyCode('Euro')).toBe('EUR');

      expect(normalizeCurrencyCode('₹')).toBe('INR');
      expect(normalizeCurrencyCode('inr')).toBe('INR');
      expect(normalizeCurrencyCode('Rs')).toBe('INR');
      expect(normalizeCurrencyCode('Rupees')).toBe('INR');
    });

    it('reads a Dollar (USD) receipt and converts all calculations into INR at 95.08', async () => {
      const { convertReceiptToInr } = await import('../src/utils/currencyConverter');

      const rawDollarReceipt = {
        name: 'Blue Bottle Coffee & Bakery',
        vendor: 'Blue Bottle Coffee',
        currency: 'USD',
        price: 24.50,
        subtotal: 20.00,
        tax: 1.80,
        tip: 2.70,
        purchaseDate: '2026-10-18',
        lineItems: [
          { name: 'Avocado Toast & Poached Egg', quantity: 1, unitPrice: 16.00, amount: 16.00 },
          { name: 'Single Origin Pour Over Coffee', quantity: 2, unitPrice: 4.25, amount: 8.50 },
        ],
      };

      const converted: any = convertReceiptToInr(rawDollarReceipt);

      // Calculations are in INR
      expect(converted.currency).toBe('INR');
      // 24.50 * 95.08 = 2329.46
      expect(converted.price).toBe(2329.46);
      expect(converted.total).toBe(2329.46);
      // Tax: 1.80 * 95.08 = 171.14
      expect(converted.tax).toBe(171.14);
      // Tip: 2.70 * 95.08 = 256.72
      expect(converted.tip).toBe(256.72);

      // Line items are converted to INR
      expect(converted.lineItems[0].amount).toBe(1521.28); // 16 * 95.08
      expect(converted.lineItems[0].originalAmount).toBe(16.00);
      expect(converted.lineItems[1].amount).toBe(808.18); // 8.50 * 95.08
      expect(converted.lineItems[1].originalAmount).toBe(8.50);

      // Original currency and price are preserved
      expect(converted.originalCurrency).toBe('USD');
      expect(converted.originalPrice).toBe(24.50);

      // Conversion metrics metadata is attached
      expect(converted.conversionMetrics.isConverted).toBe(true);
      expect(converted.conversionMetrics.originalCurrency).toBe('USD');
      expect(converted.conversionMetrics.targetCurrency).toBe('INR');
      expect(converted.conversionMetrics.rate).toBe(95.08);
      expect(converted.conversionMetrics.rateFormatted).toBe('1 USD = ₹95.08 INR');
      expect(converted.conversionMetrics.convertedPriceInr).toBe(2329.46);
    });

    it('reads a Euro (EUR) receipt and converts all calculations into INR at 106.87', async () => {
      const { convertReceiptToInr } = await import('../src/utils/currencyConverter');

      const rawEuroReceipt = {
        name: 'Le Bistro Parisien',
        vendor: 'Le Bistro Parisien',
        currency: 'EUR',
        price: 85.00,
        subtotal: 75.00,
        tax: 10.00,
        tip: 0,
        purchaseDate: '2026-10-18',
        lineItems: [
          { name: 'Dinner Tasting Menu (2 Guests)', quantity: 2, unitPrice: 30.00, amount: 60.00 },
          { name: 'Mineral Water & Espresso', quantity: 2, unitPrice: 7.50, amount: 15.00 },
        ],
      };

      const converted: any = convertReceiptToInr(rawEuroReceipt);

      // Calculations are in INR
      expect(converted.currency).toBe('INR');
      // 85.00 * 106.87 = 9083.95
      expect(converted.price).toBe(9083.95);
      expect(converted.total).toBe(9083.95);
      // Tax: 10.00 * 106.87 = 1068.70
      expect(converted.tax).toBe(1068.70);

      // Line items are converted to INR
      expect(converted.lineItems[0].amount).toBe(6412.20); // 60 * 106.87
      expect(converted.lineItems[0].originalAmount).toBe(60.00);
      expect(converted.lineItems[1].amount).toBe(1603.05); // 15 * 106.87
      expect(converted.lineItems[1].originalAmount).toBe(15.00);

      // Original currency and price are preserved
      expect(converted.originalCurrency).toBe('EUR');
      expect(converted.originalPrice).toBe(85.00);

      // Conversion metrics metadata is attached
      expect(converted.conversionMetrics.isConverted).toBe(true);
      expect(converted.conversionMetrics.originalCurrency).toBe('EUR');
      expect(converted.conversionMetrics.targetCurrency).toBe('INR');
      expect(converted.conversionMetrics.rate).toBe(106.87);
      expect(converted.conversionMetrics.rateFormatted).toBe('1 EUR = ₹106.87 INR');
      expect(converted.conversionMetrics.convertedPriceInr).toBe(9083.95);
    });

    it('passes arithmetic integrity check with converted INR values', async () => {
      const { convertReceiptToInr } = await import('../src/utils/currencyConverter');
      const { verifyReceiptIntegrity } = await import('../src/engine');

      const rawReceipt = {
        name: 'Tech Conference Supplies',
        vendor: 'Amazon US',
        currency: 'USD',
        price: 100.00,
        tax: 0,
        lineItems: [
          { description: 'HDMI Cables', quantity: 2, unitPrice: 25.00, amount: 50.00 },
          { description: 'USB-C Adapters', quantity: 2, unitPrice: 25.00, amount: 50.00 },
        ],
      };

      const converted = convertReceiptToInr(rawReceipt);
      expect(converted.price).toBe(9508.00); // 100 * 95.08

      const integrity = verifyReceiptIntegrity({
        printedTotal: converted.price,
        tax: converted.tax || 0,
        lineItems: converted.lineItems.map((li: any, idx: number) => ({
          id: String(idx + 1),
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.amount,
          category: 'supplies',
          confidence: 0.95,
          itemFlags: [],
        })),
        expenseDate: '2026-10-18',
      });

      expect(integrity.signals.mathMismatch).toBe(false);
      expect(integrity.difference).toBe(0);
      expect(integrity.signals.unitemizedBalance).toBe(0);
    });

    it('leaves INR receipts unchanged with 1:1 conversion metrics', async () => {
      const { convertReceiptToInr } = await import('../src/utils/currencyConverter');

      const inrReceipt = {
        name: 'Toit Brewpub Indiranagar',
        currency: 'INR',
        price: 2400.00,
        tax: 200.00,
        lineItems: [
          { name: 'Pizza', quantity: 1, unitPrice: 1400.00, amount: 1400.00 },
        ],
      };

      const converted = convertReceiptToInr(inrReceipt);
      expect(converted.currency).toBe('INR');
      expect(converted.price).toBe(2400.00);
      expect(converted.conversionMetrics.isConverted).toBe(false);
      expect(converted.conversionMetrics.rate).toBe(1.0);
    });
  });
});

