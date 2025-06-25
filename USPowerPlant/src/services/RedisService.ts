import { createClient, RedisClientType } from 'redis';
import { ICacheService, CacheConfig, CacheStats } from '../interfaces/Cache';

export class RedisService implements ICacheService {
  private client: RedisClientType;
  private config: CacheConfig;
  private isConnected: boolean = false;

  constructor(config: CacheConfig) {
    this.config = {
      defaultTTL: 3600, // 1 hour default
      keyPrefix: 'powerplants:',
      ...config
    };

    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
      },
      ...(this.config.password && { password: this.config.password }),
      database: this.config.database || 0,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('Redis client disconnected');
      this.isConnected = false;
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('Redis service connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      console.log('Redis service disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }
  }

  private formatKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null;
      
      const formattedKey = this.formatKey(key);
      const value = await this.client.get(formattedKey);
      
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null; // Graceful degradation
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected) return; // Graceful degradation
      
      const formattedKey = this.formatKey(key);
      const serializedValue = JSON.stringify(value);
      const ttl = ttlSeconds || this.config.defaultTTL || 3600;
      
      await this.client.setEx(formattedKey, ttl, serializedValue);
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      // Don't throw - graceful degradation
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) return;
      
      const formattedKey = this.formatKey(key);
      await this.client.del(formattedKey);
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error);
    }
  }

  public async deletePattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected) return;
      
      const formattedPattern = this.formatKey(pattern);
      const keys = await this.client.keys(formattedPattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const formattedKey = this.formatKey(key);
      const result = await this.client.exists(formattedKey);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  public async clear(): Promise<void> {
    try {
      if (!this.isConnected) return;
      
      // Clear all keys with our prefix
      await this.deletePattern('*');
    } catch (error) {
      console.error('Redis CLEAR error:', error);
    }
  }

  public async getStats(): Promise<CacheStats> {
    try {
      if (!this.isConnected) {
        return {
          totalKeys: 0,
          memoryUsage: '0B',
        };
      }
      
      const pattern = this.formatKey('*');
      const keys = await this.client.keys(pattern);
      const info = await this.client.info('memory');
      
      // Parse memory usage from Redis INFO
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch && memoryMatch[1] ? memoryMatch[1].trim() : 'Unknown';
      
      return {
        totalKeys: keys.length,
        memoryUsage,
      };
    } catch (error) {
      console.error('Redis STATS error:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Error',
      };
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
} 