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
});

