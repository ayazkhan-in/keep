import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GeminiKeyManager,
  maskKey,
  isQuotaOrRateLimitError,
  isAuthOrInvalidKeyError,
  DEFAULT_GEMINI_KEYS,
} from '../src/utils/geminiKeyManager';

describe('GeminiKeyManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Utility functions', () => {
    it('masks API keys securely', () => {
      const key = 'mock_sample_gemini_api_key_long_enough_1234567890';
      const masked = maskKey(key);
      expect(masked).toBe('mock_samp...4567890');
      expect(maskKey('short')).toBe('***');
    });

    it('identifies quota and rate limit errors', () => {
      expect(isQuotaOrRateLimitError({ status: 429 })).toBe(true);
      expect(isQuotaOrRateLimitError({ message: 'Resource has been exhausted (e.g. check quota)' })).toBe(true);
      expect(isQuotaOrRateLimitError({ message: 'Rate limit exceeded' })).toBe(true);
      expect(isQuotaOrRateLimitError({ status: 503 })).toBe(true);
      expect(isQuotaOrRateLimitError({ message: 'Random syntax error' })).toBe(false);
    });

    it('identifies authentication and invalid key errors', () => {
      expect(isAuthOrInvalidKeyError({ status: 400, message: 'API_KEY_INVALID' })).toBe(true);
      expect(isAuthOrInvalidKeyError({ status: 403, message: 'Permission denied' })).toBe(true);
      expect(isAuthOrInvalidKeyError({ message: 'API key not valid' })).toBe(true);
      expect(isAuthOrInvalidKeyError({ message: 'Random syntax error' })).toBe(false);
    });
  });

  describe('Key Pool Management', () => {
    it('initializes with keys and deduplicates', () => {
      const key1 = 'mock_key_test_1234567890';
      const key2 = 'mock_key_test_2345678901';
      const manager = new GeminiKeyManager([key1, key2]);
      expect(manager.getKeyCount()).toBe(2);
      const status = manager.getKeyPoolStatus();
      expect(status.totalKeys).toBe(2);
      expect(status.keys.every((k) => k.isHealthy)).toBe(true);
    });

    it('respects custom keys and deduplicates them', () => {
      const key1 = 'mock_key_custom_alpha_1234567890';
      const key2 = 'mock_key_custom_beta_1234567890';
      const manager = new GeminiKeyManager([key1, key2, key1]);
      expect(manager.getKeyCount()).toBe(2);
    });

    it('orders candidate keys placing cooling keys last', () => {
      const key1 = 'key_alpha_1234567890';
      const key2 = 'key_beta_1234567890';
      const key3 = 'key_gamma_1234567890';
      const manager = new GeminiKeyManager([key1, key2, key3]);

      // Initially all healthy [0, 1, 2]
      expect(manager.getCandidateKeyIndices()).toEqual([0, 1, 2]);

      // Mark key 0 on cooldown
      manager.markCooldown(0, 30000, 'Quota limit');
      // Should now prioritize healthy keys [1, 2]
      expect(manager.getCandidateKeyIndices()).toEqual([1, 2]);

      // Mark key 1 on cooldown
      manager.markCooldown(1, 30000, 'Rate limit');
      expect(manager.getCandidateKeyIndices()).toEqual([2]);

      // If all on cooldown, returns sorted by remaining
      manager.markCooldown(2, 60000, 'Quota limit');
      const candidates = manager.getCandidateKeyIndices();
      expect(candidates.length).toBe(3);
    });
  });

  describe('Automatic Failover and Rotation', () => {
    it('switches to the next key automatically if the first key throws a 429 quota error', async () => {
      const key1 = 'key_first_1234567890';
      const key2 = 'key_second_1234567890';
      const manager = new GeminiKeyManager([key1, key2]);

      // Mock SDK calls
      const mockGenerateContentKey1 = vi.fn().mockRejectedValue({
        status: 429,
        message: 'Resource has been exhausted (quota exceeded)',
      });
      const mockGenerateContentKey2 = vi.fn().mockResolvedValue({
        text: 'Generated text from Key 2',
      });

      // Stub getClient
      vi.spyOn(manager, 'getClient').mockImplementation((k: string) => {
        if (k === key1) {
          return {
            models: { generateContent: mockGenerateContentKey1 },
          } as any;
        }
        return {
          models: { generateContent: mockGenerateContentKey2 },
        } as any;
      });

      const result = await manager.generateContent({
        contents: 'Test prompt',
      });

      expect(result.text).toBe('Generated text from Key 2');
      expect(mockGenerateContentKey1).toHaveBeenCalled();
      expect(mockGenerateContentKey2).toHaveBeenCalled();

      // Key 1 should now be cooling down, and activeIndex should have switched to Key 2
      const status = manager.getKeyPoolStatus();
      expect(status.keys[0].isHealthy).toBe(false);
      expect(status.keys[1].isHealthy).toBe(true);
      expect(status.activeKeyIndex).toBe(1);
    });

    it('falls back to fallback model if all keys fail on primary model', async () => {
      const key1 = 'key_first_1234567890';
      const key2 = 'key_second_1234567890';
      const manager = new GeminiKeyManager([key1, key2]);

      // Primary model fails on both keys, fallback model succeeds on key 1
      const mockGenerateContent = vi.fn().mockImplementation((args: any) => {
        if (args.model === manager.primaryModel) {
          return Promise.reject({ status: 429, message: 'Primary model exhausted' });
        }
        return Promise.resolve({ text: 'Success on fallback model' });
      });

      vi.spyOn(manager, 'getClient').mockReturnValue({
        models: { generateContent: mockGenerateContent },
      } as any);

      const result = await manager.generateContent({ contents: 'Test prompt' });
      expect(result.text).toBe('Success on fallback model');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({ model: manager.fallbackModel })
      );
    });

    it('throws QUOTA_EXHAUSTED when all keys and models fail', async () => {
      const key1 = 'key_first_1234567890';
      const manager = new GeminiKeyManager([key1]);

      vi.spyOn(manager, 'getClient').mockReturnValue({
        models: {
          generateContent: vi.fn().mockRejectedValue({
            status: 429,
            message: 'Quota exceeded',
          }),
        },
      } as any);

      await expect(manager.generateContent({ contents: 'Test' })).rejects.toThrow('QUOTA_EXHAUSTED');
    });
  });
});
