import request from 'supertest';
import express from 'express';
import { HealthController } from '../../controllers/HealthController';
import { PowerPlantService } from '../../services/PowerPlantService';

const app = express();

// Mock PowerPlantService
const mockGetCacheStats = jest.fn();
const mockPowerPlantService = {
  getCacheStats: mockGetCacheStats
} as jest.Mocked<Partial<PowerPlantService>>;

// Setup controller
const healthController = new HealthController(mockPowerPlantService as PowerPlantService);
app.use('/api/v1', healthController.getRouter());

describe('Health Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock responses
    mockGetCacheStats.mockResolvedValue({
      enabled: true,
      healthy: true,
      totalKeys: 42,
      memoryUsage: '150MB'
    });
  });

  describe('Basic Health Check', () => {
    test('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Power Plant API is healthy',
        version: '2.0.0'
      });

      expect(response.body.timestamp).toBeDefined();
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Cache Health Check', () => {
    test('should return cache health status', async () => {
      const response = await request(app)
        .get('/api/v1/health/cache')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Cache health check',
        version: '2.0.0',
        cache: {
          enabled: true,
          healthy: true,
          totalKeys: 42,
          memoryUsage: '150MB'
        }
      });

      expect(mockGetCacheStats).toHaveBeenCalled();
    });

    test('should handle cache service errors', async () => {
      mockGetCacheStats.mockRejectedValue(new Error('Cache connection failed'));

      const response = await request(app)
        .get('/api/v1/health/cache')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Cache health check failed',
        message: 'Cache connection failed'
      });
    });
  });

  describe('Detailed Health Check', () => {
    test('should return detailed system health', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Detailed system health check',
        version: '2.0.0',
        service: 'Power Plant',
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number)
        }),
        responseTime: expect.stringMatching(/^\d+ms$/),
        cache: expect.objectContaining({
          enabled: true,
          healthy: true
        }),
        status: 'healthy'
      });
    });

    test('should handle partial failures gracefully', async () => {
      mockGetCacheStats.mockRejectedValue(new Error('Cache down'));

      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect(200);

      expect(response.body.cache).toMatchObject({
        enabled: false,
        error: 'Cache down'
      });
      
      expect(response.body.status).toBe('healthy');
    });
  });
}); 