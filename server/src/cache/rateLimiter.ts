interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private tokens: Map<string, number> = new Map();
  private lastRefill: Map<string, number> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private queue: Map<string, Array<() => void>> = new Map();

  constructor() {
    this.configs.set('iwls', { maxRequests: 3, windowMs: 1000 });
  }

  async acquireSlot(apiName: string): Promise<boolean> {
    const config = this.configs.get(apiName) || { maxRequests: 10, windowMs: 1000 };
    this.refillTokens(apiName, config);
    
    const tokens = this.tokens.get(apiName) || config.maxRequests;
    if (tokens > 0) {
      this.tokens.set(apiName, tokens - 1);
      return true;
    }
    
    return new Promise((resolve) => {
      const q = this.queue.get(apiName) || [];
      q.push(() => resolve(true));
      this.queue.set(apiName, q);
      setTimeout(() => this.processQueue(apiName), config.windowMs);
    });
  }

  release(apiName: string): void {
    const config = this.configs.get(apiName);
    if (!config) return;
    const tokens = this.tokens.get(apiName) || 0;
    this.tokens.set(apiName, Math.min(tokens + 1, config.maxRequests));
    this.processQueue(apiName);
  }

  private refillTokens(apiName: string, config: RateLimitConfig): void {
    const now = Date.now();
    const last = this.lastRefill.get(apiName) || 0;
    if (now - last >= config.windowMs) {
      this.tokens.set(apiName, config.maxRequests);
      this.lastRefill.set(apiName, now);
    }
  }

  private processQueue(apiName: string): void {
    const q = this.queue.get(apiName);
    if (!q || q.length === 0) return;
    const config = this.configs.get(apiName);
    if (!config) return;
    this.refillTokens(apiName, config);
    const tokens = this.tokens.get(apiName) || 0;
    while (tokens > 0 && q.length > 0) {
      const cb = q.shift();
      if (cb) {
        this.tokens.set(apiName, (this.tokens.get(apiName) || 1) - 1);
        cb();
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
