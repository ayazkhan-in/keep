import { describe, it, expect } from 'vitest';
import { runBenchmark } from '../src/services/benchmarkService';

describe('Benchmark Suite against Synthetic Ground Truth', () => {
  it('runs benchmark over synthetic claims in under 5,000ms and verifies scorecard metrics', () => {
    const { metrics, results } = runBenchmark();

    expect(metrics.sampleSize).toBeGreaterThanOrEqual(60);
    expect(metrics.runtimeMs).toBeLessThan(5000); // Must be under 5 seconds
    expect(metrics.ruleCitationCoverage).toBe(100); // Target 100% citation coverage
    expect(metrics.touchlessRate).toBeGreaterThanOrEqual(60); // Target >= 60%
    expect(metrics.decisionAccuracy).toBeGreaterThanOrEqual(85);
    expect(metrics.amountProtected).toBeGreaterThan(0);
    expect(results.length).toBe(metrics.sampleSize);
  });
});
