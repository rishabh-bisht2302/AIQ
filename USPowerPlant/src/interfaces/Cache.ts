export interface ICacheService {
  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete value from cache
   * @param key Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple keys matching pattern
   * @param pattern Key pattern (supports wildcards)
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Check if key exists in cache
   * @param key Cache key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  hitRate?: number;
}

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
  defaultTTL?: number;
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  NATIONAL_TOTALS: 3600,    // 1 hour - rarely changes
  STATE_ANALYTICS: 1800,    // 30 minutes - moderate change frequency
  PLANT_ANALYTICS: 900,     // 15 minutes - more dynamic
  MAP_DATA: 1200,          // 20 minutes - balanced for map queries
  PLANT_LIST: 600,         // 10 minutes - for filtered plant lists
} as const; 