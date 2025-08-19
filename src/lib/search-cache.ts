// Simple in-memory cache for search results
type Serializable = Record<string, unknown>;

interface CacheEntry<TData> {
  data: TData;
  timestamp: number;
  expiresIn: number;
}

class SearchCache<TData = unknown> {
  private cache: Map<string, CacheEntry<TData>> = new Map();
  private readonly defaultTTL: number = 30 * 60 * 1000; // 30 minutes

  private generateKey(query: string, filters: Serializable): string {
    return JSON.stringify({ query: query.toLowerCase().trim(), filters });
  }

  get(query: string, filters: Serializable = {}): TData | null {
    const key = this.generateKey(query, filters);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(query: string, data: TData, filters: Serializable = {}, ttl: number = this.defaultTTL): void {
    const key = this.generateKey(query, filters);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.expiresIn) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a global instance
export const searchCache = new SearchCache<unknown>();

// Clean up expired entries every 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    searchCache.cleanup();
  }, 10 * 60 * 1000);
}
