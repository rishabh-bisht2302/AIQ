import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { PowerPlantService } from '../services/PowerPlantService';

const API_VERSION = '2.0.0';
const SERVICE_NAME = 'Power Plant';

export class HealthController extends BaseController {
  constructor(private readonly powerPlantService: PowerPlantService) {
    super();
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    this.router.get('/health', this.healthCheck);
    this.router.get('/health/cache', this.cacheHealthCheck);
    this.router.get('/health/detailed', this.detailedHealthCheck);
  }

  // Basic health check endpoint
  public healthCheck = (_req: Request, res: Response): void => {
    this.baseHealthCheck(_req, res, SERVICE_NAME, API_VERSION);
  };

  // Cache-specific health check
  public cacheHealthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const cacheStats = await this.powerPlantService.getCacheStats();
      this.sendHealth(res, 'Cache health check', API_VERSION, { cache: cacheStats });
    } catch (error) {
      this.sendError(res, error, 'Cache health check failed');
    }
  };

  // Detailed system health check
  public detailedHealthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const startTime = Date.now();
      
      // Parallel health checks
      const [cacheStats] = await Promise.all([
        this.powerPlantService.getCacheStats().catch(error => ({ 
          enabled: false, 
          error: error.message 
        }))
      ]);

      const responseTime = Date.now() - startTime;

      const healthData = {
        service: SERVICE_NAME,
        version: API_VERSION,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        responseTime: `${responseTime}ms`,
        cache: cacheStats,
        status: 'healthy'
      };

      this.sendHealth(res, 'Detailed system health check', API_VERSION, healthData);
    } catch (error) {
      this.sendError(res, error, 'Detailed health check failed');
    }
  };
} 