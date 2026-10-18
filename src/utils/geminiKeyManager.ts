import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_KEYS: string[] = [];

export interface KeyEntry {
  key: string;
  masked: string;
  lastUsed: number;
  failureCount: number;
  cooldownUntil: number; // timestamp in ms; 0 if healthy
  lastError?: string;
}

export interface KeyStatusReport {
  index: number;
  maskedKey: string;
  isHealthy: boolean;
  cooldownRemainingSeconds: number;
  failureCount: number;
  lastError?: string;
}

export interface KeyPoolStatus {
  totalKeys: number;
  activeKeyIndex: number;
  activeKeyMasked: string;
  keys: KeyStatusReport[];
}

export interface GeminiCallParams {
  contents: any;
  config?: any;
  models?: string[];
}

/**
 * Mask API key for logs and public diagnostics (e.g. AIzaSyD2...a0Tnk)
 */
export function maskKey(key: string): string {
  if (!key || key.length <= 12) return '***';
  return `${key.slice(0, 9)}...${key.slice(-7)}`;
}

/**
 * Check if an error indicates quota exhaustion, rate limiting, or temporary capacity issue
 */
export function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  const errString = String(err?.message || err?.error || err || '');
  return (
    status === 429 ||
    status === 503 ||
    /429|resource_exhausted|quota|exceeded|rate limit|too many requests|capacity|overloaded|unavailable/i.test(
      errString
    )
  );
}

/**
 * Check if an error indicates invalid authentication, expired key, or bad permissions
 */
export function isAuthOrInvalidKeyError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  const errString = String(err?.message || err?.error || err || '');
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    /api_key_invalid|invalid api key|unauthenticated|permission_denied|api key not valid|key expired|forbidden/i.test(
      errString
    )
  );
}

/**
 * Enterprise-grade Gemini Multi-Key Failover and Automatic Rotation Manager
 */
export class GeminiKeyManager {
  private keys: KeyEntry[] = [];
  private activeIndex: number = 0;
  private clients: Map<string, GoogleGenAI> = new Map();
  public primaryModel: string = 'gemini-3.8-flash';
  public fallbackModel: string = 'gemini-3.6-flash';
  public defaultCooldownMs: number = 60 * 1000; // 60s cooldown for quota/rate-limits
  public authCooldownMs: number = 10 * 60 * 1000; // 10 min cooldown for invalid keys

  constructor(customKeys?: string[]) {
    this.initKeys(customKeys);
  }

  /**
   * Initialize and deduplicate keys from environment variables and defaults
   */
  public initKeys(customKeys?: string[]): void {
    const rawKeys: string[] = [];

    // 1. If explicit custom keys are provided, use only those
    if (customKeys && customKeys.length > 0) {
      rawKeys.push(...customKeys);
    } else {
      // 2. Comma-separated GEMINI_API_KEYS environment variable
      if (process.env.GEMINI_API_KEYS) {
        const splitKeys = process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim());
        rawKeys.push(...splitKeys);
      }

      // 3. Individual standard env variables
      if (process.env.GEMINI_API_KEY) {
        rawKeys.push(process.env.GEMINI_API_KEY.trim());
      }
      if (process.env.GEMINI_API_KEY_FALLBACK) {
        rawKeys.push(process.env.GEMINI_API_KEY_FALLBACK.trim());
      }
      if (process.env.GEMINI_API_KEY_2) {
        rawKeys.push(process.env.GEMINI_API_KEY_2.trim());
      }
      if (process.env.GEMINI_API_KEY_3) {
        rawKeys.push(process.env.GEMINI_API_KEY_3.trim());
      }
      if (process.env.VITE_GEMINI_API_KEY) {
        rawKeys.push(process.env.VITE_GEMINI_API_KEY.trim());
      }

      // 4. Default configured keys as guaranteed fallback
      rawKeys.push(...DEFAULT_GEMINI_KEYS);
    }

    // Filter non-empty and deduplicate while maintaining priority order
    const seen = new Set<string>();
    const uniqueKeys: string[] = [];
    for (const k of rawKeys) {
      if (k && k.length > 5 && !seen.has(k)) {
        seen.add(k);
        uniqueKeys.push(k);
      }
    }

    this.keys = uniqueKeys.map((key) => ({
      key,
      masked: maskKey(key),
      lastUsed: 0,
      failureCount: 0,
      cooldownUntil: 0,
    }));

    this.activeIndex = 0;
    this.clients.clear();
  }

  /**
   * Total number of configured keys
   */
  public getKeyCount(): number {
    if (this.keys.length === 0) this.initKeys();
    return this.keys.length;
  }

  /**
   * Get active key entry
   */
  public getActiveKeyEntry(): KeyEntry | null {
    if (this.keys.length === 0) this.initKeys();
    if (this.keys.length === 0) return null;
    return this.keys[this.activeIndex] || this.keys[0];
  }

  /**
   * Get a GoogleGenAI SDK client instance for a specific key
   */
  public getClient(key: string): GoogleGenAI {
    let client = this.clients.get(key);
    if (!client) {
      client = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      this.clients.set(key, client);
    }
    return client;
  }

  /**
   * Get GoogleGenAI instance for the currently active key
   */
  public getAI(): GoogleGenAI | null {
    if (this.keys.length === 0) this.initKeys();
    const entry = this.getActiveKeyEntry();
    if (!entry) return null;
    return this.getClient(entry.key);
  }

  /**
   * Mark a key as cooling down due to error
   */
  public markCooldown(keyIndex: number, cooldownMs: number, reason: string): void {
    if (keyIndex >= 0 && keyIndex < this.keys.length) {
      const entry = this.keys[keyIndex];
      entry.cooldownUntil = Date.now() + cooldownMs;
      entry.failureCount += 1;
      entry.lastError = reason;
      console.warn(
        `[GeminiKeyManager] Key #${keyIndex + 1} (${entry.masked}) placed on cooldown for ${Math.round(
          cooldownMs / 1000
        )}s. Reason: ${reason}`
      );
    }
  }

  /**
   * Order keys to try: healthy keys first starting from activeIndex, followed by least-delayed cooling keys
   */
  public getCandidateKeyIndices(): number[] {
    const now = Date.now();
    const healthy: number[] = [];
    const inCooldown: { index: number; remaining: number }[] = [];

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.activeIndex + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.cooldownUntil <= now) {
        healthy.push(idx);
      } else {
        inCooldown.push({ index: idx, remaining: entry.cooldownUntil - now });
      }
    }

    if (healthy.length > 0) {
      return healthy;
    }

    // If all keys are in cooldown, sort by smallest remaining cooldown so we don't prematurely abort
    inCooldown.sort((a, b) => a.remaining - b.remaining);
    return inCooldown.map((item) => item.index);
  }

  /**
   * Main execution engine: executes content generation with automatic key failover and model downgrade
   */
  public async generateContent(params: GeminiCallParams): Promise<any> {
    if (this.keys.length === 0) this.initKeys();
    if (this.keys.length === 0) {
      throw new Error('NO_API_KEYS_CONFIGURED');
    }

    const models = params.models && params.models.length > 0
      ? params.models
      : [this.primaryModel, this.fallbackModel, 'gemini-3.1-flash-lite'];

    let lastError: any = null;

    for (const model of models) {
      const candidateIndices = this.getCandidateKeyIndices();

      for (const keyIndex of candidateIndices) {
        const entry = this.keys[keyIndex];
        const client = this.getClient(entry.key);

        try {
          console.log(`[Gemini AI] 🚀 Calling Gemini API (model: "${model}") with Key #${keyIndex + 1} [${entry.masked}]...`);
          const startTime = Date.now();

          const res = await client.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          });

          const elapsed = Date.now() - startTime;
          console.log(`[Gemini AI] ✨ Model "${model}" responded successfully in ${elapsed}ms!`);

          // Mark successful execution
          entry.failureCount = 0;
          entry.cooldownUntil = 0;
          entry.lastUsed = Date.now();
          entry.lastError = undefined;
          this.activeIndex = keyIndex;
          return res;
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err?.error || err || '');
          const isQuota = isQuotaOrRateLimitError(err);
          const isAuth = isAuthOrInvalidKeyError(err);

          console.warn(
            `[GeminiKeyManager] ⚠️ Call failed on model "${model}" with Key #${keyIndex + 1} (${entry.masked}): ${errMsg}`
          );

          if (isQuota || isAuth) {
            const cooldown = isAuth ? this.authCooldownMs : this.defaultCooldownMs;
            this.markCooldown(keyIndex, cooldown, errMsg);

            // Determine if another key is available
            const remainingCandidates = candidateIndices.filter((idx) => idx !== keyIndex);
            if (remainingCandidates.length > 0) {
              const nextIndex = remainingCandidates[0];
              console.log(
                `[GeminiKeyManager] 🔄 Switching active key to Key #${nextIndex + 1} (${this.keys[nextIndex].masked}) and retrying...`
              );
              this.activeIndex = nextIndex;
            }
          }
        }
      }

      console.warn(`[GeminiKeyManager] ⚠️ All configured keys failed for model "${model}". Trying next fallback model if available...`);
    }

    // If quota or rate-limit was hit on all keys and all models, throw normalized QUOTA_EXHAUSTED
    if (isQuotaOrRateLimitError(lastError)) {
      console.warn('[GeminiKeyManager] ⚠️ All Gemini keys and models quota exhausted. Engaging smart heuristic fallback.');
      throw new Error('QUOTA_EXHAUSTED');
    }

    throw lastError || new Error('GEMINI_CALL_FAILED');
  }

  /**
   * Diagnostic pool status report (used by /api/health and admin logs)
   */
  public getKeyPoolStatus(): KeyPoolStatus {
    if (this.keys.length === 0) this.initKeys();
    const now = Date.now();
    const activeEntry = this.getActiveKeyEntry();

    return {
      totalKeys: this.keys.length,
      activeKeyIndex: this.activeIndex,
      activeKeyMasked: activeEntry ? activeEntry.masked : 'none',
      keys: this.keys.map((entry, index) => {
        const remainingMs = Math.max(0, entry.cooldownUntil - now);
        return {
          index,
          maskedKey: entry.masked,
          isHealthy: remainingMs === 0,
          cooldownRemainingSeconds: Math.ceil(remainingMs / 1000),
          failureCount: entry.failureCount,
          lastError: entry.lastError,
        };
      }),
    };
  }

  /**
   * Reset cooldowns for all keys (useful for manual retry or tests)
   */
  public resetCooldowns(): void {
    for (const k of this.keys) {
      k.cooldownUntil = 0;
      k.failureCount = 0;
      k.lastError = undefined;
    }
  }
}

// Global Singleton Instance
export const geminiKeyManager = new GeminiKeyManager();

/**
 * Drop-in replacement for existing server.ts / api/index.ts getAI()
 */
export function getAI(): GoogleGenAI | null {
  return geminiKeyManager.getAI();
}

/**
 * Drop-in replacement for existing server.ts / api/index.ts generateContentWithQuotaFallback
 * Supports passing (ai, params) or just (params)
 */
export async function generateContentWithQuotaFallback(
  _ai: GoogleGenAI | null | undefined,
  params: { contents: any; config?: any; models?: string[] }
): Promise<any> {
  return geminiKeyManager.generateContent(params);
}
