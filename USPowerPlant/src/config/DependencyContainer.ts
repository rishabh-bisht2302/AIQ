import { PowerPlantRepository } from '../database/PowerPlantRepository';
import { PowerPlantService } from '../services/PowerPlantService';
import { AuthService } from '../services/AuthService';
import { RedisService } from '../services/RedisService';
import { ICacheService, CacheConfig } from '../interfaces/Cache';
// import { PowerPlantController } from '../controllers/PowerPlantController';

export class DependencyContainer {
  private static instance: DependencyContainer;
  private cacheService: ICacheService | null = null;
  private powerPlantService: PowerPlantService | null = null;
  private authService: AuthService | null = null;
  
  public readonly powerPlantRepository: PowerPlantRepository;

  private constructor() {
    // Initialize dependencies in the correct order
    this.powerPlantRepository = new PowerPlantRepository();
  }

  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  public async initializeCache(): Promise<ICacheService> {
    if (!this.cacheService) {
      const config: CacheConfig = {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
        database: parseInt(process.env['REDIS_DB'] || '0'),
        keyPrefix: 'powerplants:',
        defaultTTL: 3600 // 1 hour
      };

      // Only add password if it exists
      if (process.env['REDIS_PASSWORD']) {
        config.password = process.env['REDIS_PASSWORD'];
      }

      this.cacheService = new RedisService(config);
      await (this.cacheService as RedisService).connect();
    }
    return this.cacheService;
  }

  public getCacheService(): ICacheService | null {
    return this.cacheService;
  }

  public async initializePowerPlantService(): Promise<PowerPlantService> {
    if (!this.powerPlantService) {
      const repository = new PowerPlantRepository();
      const cache = await this.initializeCache();
      this.powerPlantService = new PowerPlantService(repository, cache);
    }
    return this.powerPlantService;
  }

  public async initializeAuthService(): Promise<AuthService> {
    if (!this.authService) {
      this.authService = new AuthService();
    }
    return this.authService;
  }

  public async cleanup(): Promise<void> {
    if (this.cacheService && 'disconnect' in this.cacheService) {
      await (this.cacheService as RedisService).disconnect();
    }
  }
} 