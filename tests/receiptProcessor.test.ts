import { describe, it, expect } from 'vitest';
import {
  computeSha256,
  computeDHashFromGrayscale,
  computeDHashFromCanvas,
} from '../src/utils/receiptProcessor';

describe('Receipt Preprocessor & Hashing Suite', () => {
  it('computes 64-character SHA-256 cryptographic hash', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('Keepr Receipt Ground Truth Test Payload');
    const hash = await computeSha256(data.buffer);

    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('computes consistent 16-character perceptual dHash from 9x8 grayscale matrix', () => {
    // 8 rows x 9 columns gradient
    const matrix: number[][] = Array.from({ length: 8 }, () => [
      255, 220, 190, 160, 130, 100, 70, 40, 10,
    ]);

    const dHash = computeDHashFromGrayscale(matrix);
    expect(dHash).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(dHash)).toBe(true);
    // Since each adjacent cell is strictly greater, every bit is 1 -> 0xffff...
    expect(dHash).toBe('ffffffffffffffff');
  });

  it('handles computeDHashFromCanvas gracefully in node / non-DOM environments', () => {
    const mockCanvas = {} as HTMLCanvasElement;
    const dHash = computeDHashFromCanvas(mockCanvas);
    expect(dHash).toHaveLength(16);
  });
});

