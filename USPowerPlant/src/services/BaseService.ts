import { ICacheService, CACHE_TTL } from '../interfaces/Cache';

export abstract class BaseService {
  constructor(protected readonly cacheService?: ICacheService) {}

  // Common cache utilities
  protected async tryGetFromCache<T>(key: string): Promise<T | null> {
    if (!this.cacheService) return null;
    
    try {
      const cached = await this.cacheService.get<T>(key);
      if (cached) {
        console.log(`📦 Cache HIT for key: ${key}`);
      }
      return cached;
    } catch (error) {
      console.warn(`Cache GET failed for key ${key}:`, error);
      return null;
    }
  }

  protected async setCacheWithLog<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.cacheService) return;
    
    try {
      await this.cacheService.set(key, value, ttl);
      console.log(`💾 Cache SET for key: ${key}`);
    } catch (error) {
      console.warn(`Cache SET failed for key ${key}:`, error);
    }
  }

  protected generateCacheKey(prefix: string, data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const hash = this.simpleHash(dataString);
    return `${prefix}:${hash}`;
  }

  protected simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Common cache stats method
  public async getCacheStats(): Promise<any> {
    if (!this.cacheService) {
      return {
        enabled: false,
        message: 'Cache service not available'
      };
    }

    try {
      const stats = await this.cacheService.getStats();
      return {
        enabled: true,
        healthy: 'isHealthy' in this.cacheService ? (this.cacheService as any).isHealthy() : true,
        ...stats
      };
    } catch (error) {
      return {
        enabled: true,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Common calculation utilities
  protected safeCalculate(numerator: number, denominator: number, precision: number = 100): number {
    if (denominator === 0 || !numerator || !denominator) return 0;
    return Math.round((numerator / denominator) * precision) / precision;
  }

  protected calculatePercentage(value: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((value / total) * 10000) / 100;
  }

  // Generic method for cached data retrieval with automatic caching
  protected async getCachedData<T>(
    cacheKey: string,
    dataFetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.PLANT_LIST
  ): Promise<T> {
    // Try cache first
    const cached = await this.tryGetFromCache<T>(cacheKey);
    if (cached) return cached;

    // Fetch and cache data
    const data = await dataFetcher();
    await this.setCacheWithLog(cacheKey, data, ttl);
    
    return data;
  }
} 