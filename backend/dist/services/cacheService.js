"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
class CacheService {
    cache = new Map();
    /**
     * Get value from cache if it exists and is not expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    /**
     * Set value in cache with a custom TTL (Time-To-Live) in milliseconds
     */
    set(key, value, ttlMs) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttlMs,
        });
    }
    /**
     * Delete a specific cache key
     */
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Invalidate all cache keys belonging to a specific transporter
     */
    invalidateTransporter(transporterId) {
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
    invalidateUser(userId) {
        const key = `user_profile:${userId}`;
        this.cache.delete(key);
        console.log(`[CACHE INVALIDATED] ${key}`);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }
}
exports.cacheService = new CacheService();
