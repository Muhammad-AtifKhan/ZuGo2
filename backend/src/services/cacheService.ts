type CacheEntry = {
  value: any;
  expiry: number;
};

class CacheService {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get value from cache if it exists and is not expired
   */
  public get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache with a custom TTL (Time-To-Live) in milliseconds
   */
  public set(key: string, value: any, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a specific cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache keys belonging to a specific transporter
   */
  public invalidateTransporter(transporterId: string): void {
    const prefix = `transporter:${transporterId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        console.log(`[CACHE INVALIDATED] ${key}`);
      }
    }
  }

  /**
   * Invalidate user profile cache key
   */
  public invalidateUser(userId: string): void {
    const key = `user_profile:${userId}`;
    this.cache.delete(key);
    console.log(`[CACHE INVALIDATED] ${key}`);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
