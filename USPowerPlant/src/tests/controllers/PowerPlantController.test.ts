import request from 'supertest';
import express from 'express';
import { PowerPlantController } from '../../controllers/PowerPlantController';
import { PowerPlantService } from '../../services/PowerPlantService';
import { AuthService } from '../../services/AuthService';
import { AuthMiddleware } from '../../middleware/AuthMiddleware';

// Mock the services and repository
jest.mock('../../services/PowerPlantService');
jest.mock('../../services/AuthService');
jest.mock('../../database/PowerPlantRepository');

describe('PowerPlant API Tests', () => {
  let app: express.Application;
  let mockPowerPlantService: jest.Mocked<PowerPlantService>;
  let mockAuthService: jest.Mocked<AuthService>;

  // Mock plant data
  const mockPlantData = {
    id: 1,
    orisCode: 12345,
    plantName: 'Test Power Plant',
    stateAbbr: 'CA',
    countyName: 'Test County',
    latitude: 34.0522,
    longitude: -118.2437,
    nameplateCapacityMw: 500,
    annualGenerationMwh: 1000000,
    capacityFactor: 0.75,
    annualCo2EmissionsTons: 50000,
    annualNoxEmissionsTons: 100,
    annualSo2EmissionsTons: 200,
    annualHeatInputMmbtu: 2000000,
    primaryFuel: 'Natural Gas',
    fuelCategory: 'Fossil',
    numGenerators: 2,
    utilityName: 'Test Utility',
    sector: 'Electric Power',
    dataYear: 2021
  };

  // Mock map data response
  const mockMapDataResponse = {
    stateData: {
      stateAbbr: 'CA',
      totalPlants: 1500,
      totalCapacityMw: 85000,
      totalGenerationMwh: 100000000,
      totalEmissionsTons: 25000000,
      totalNoxEmissions: 45000,
      totalSo2Emissions: 1500,
      avgCapacityFactor: 0.65,
      topFuelCategories: [
        {
          fuelCategory: 'Natural Gas',
          plantCount: 400,
          capacityMw: 40000,
          generationMwh: 50000000,
          emissionsTons: 20000000
        }
      ],
      percentages: {
        capacityPercentage: 0,
        generationPercentage: 0,
        emissionsPercentage: 0,
        plantCountPercentage: 0
      }
    },
    plantData: null
  };

  beforeAll(() => {
    // Create mock instances
    mockAuthService = {
      generateToken: jest.fn(),
      verifyToken: jest.fn()
    } as any;

    mockPowerPlantService = {
      getFilteredPlantsData: jest.fn(),
      getMapData: jest.fn()
    } as any;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Create controllers with mocked services (skip auth for testing)
    const authMiddleware = new AuthMiddleware(mockAuthService);
    const powerPlantController = new PowerPlantController(mockPowerPlantService, authMiddleware);

    // Register routes
    app.use('/api/v1', powerPlantController.getRouter());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks to bypass authentication
    mockAuthService.verifyToken.mockReturnValue({ userId: 'test-user', role: 'user' } as any);
    
    mockPowerPlantService.getFilteredPlantsData.mockResolvedValue({
      data: [mockPlantData]
    } as any);

    mockPowerPlantService.getMapData.mockResolvedValue(mockMapDataResponse as any);
  });



  describe('Map Data API Tests', () => {
    test('should return map data with state analytics', async () => {
      const response = await request(app)
        .get('/api/v1/map-data?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          stateData: expect.objectContaining({
            stateAbbr: 'CA',
            totalPlants: expect.any(Number),
            totalCapacityMw: expect.any(Number),
            totalGenerationMwh: expect.any(Number),
            topFuelCategories: expect.any(Array)
          })
        })
      });

      expect(mockPowerPlantService.getMapData).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'CA' })
      );
    });

    test('should return plant-specific data when plantName is provided', async () => {
      const mockMapDataWithPlant = {
        ...mockMapDataResponse,
        plantData: {
          ...mockPlantData,
          percentageOfState: {
            capacity: 0.59,
            generation: 1.0,
            emissions: 0.2
          },
          efficiencyMetrics: {
            generationPerMw: 2000,
            emissionsPerMwh: 0.05,
            capacityFactor: 0.75
          }
        }
      };

      mockPowerPlantService.getMapData.mockResolvedValue(mockMapDataWithPlant as any);

      const response = await request(app)
        .get('/api/v1/map-data?state=CA&plantName=Test%20Power%20Plant')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          plantData: expect.objectContaining({
            plantName: 'Test Power Plant',
            percentageOfState: expect.objectContaining({
              capacity: expect.any(Number),
              generation: expect.any(Number),
              emissions: expect.any(Number)
            }),
            efficiencyMetrics: expect.objectContaining({
              generationPerMw: expect.any(Number),
              emissionsPerMwh: expect.any(Number),
              capacityFactor: expect.any(Number)
            })
          })
        })
      });
    });

    test('should handle Texas state with plant name filter', async () => {
      const mockTexasResponse = {
        stateData: {
          stateAbbr: 'TX',
          totalPlants: 2000,
          totalCapacityMw: 120000,
          totalGenerationMwh: 150000000,
          totalEmissionsTons: 80000000,
          totalNoxEmissions: 150000,
          totalSo2Emissions: 5000,
          avgCapacityFactor: 0.55,
          topFuelCategories: [
            {
              fuelCategory: 'Natural Gas',
              plantCount: 800,
              capacityMw: 70000,
              generationMwh: 90000000,
              emissionsTons: 50000000
            }
          ],
          percentages: {
            capacityPercentage: 0,
            generationPercentage: 0,
            emissionsPercentage: 0,
            plantCountPercentage: 0
          }
        },
        plantData: {
          ...mockPlantData,
          stateAbbr: 'TX',
          plantName: 'Martin Lake',
          percentageOfState: {
            capacity: 0.42,
            generation: 0.67,
            emissions: 0.06
          }
        }
      };

      mockPowerPlantService.getMapData.mockResolvedValue(mockTexasResponse as any);

      const response = await request(app)
        .get('/api/v1/map-data?state=TX&plantName=Martin%20Lake')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.data.stateData.stateAbbr).toBe('TX');
      expect(response.body.data.plantData.plantName).toBe('Martin Lake');
      expect(mockPowerPlantService.getMapData).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'TX', plantName: 'Martin Lake' })
      );
    });

    test('should work with state filter only', async () => {
      const response = await request(app)
        .get('/api/v1/map-data?state=FL')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stateData).toBeDefined();
      expect(response.body.data.plantData).toBeNull();
    });

    test('should handle fuel type filter with map data', async () => {
      const response = await request(app)
        .get('/api/v1/map-data?state=TX&fuelType=Coal')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getMapData).toHaveBeenCalledWith(
        expect.objectContaining({ 
          state: 'TX',
          fuelType: 'Coal'
        })
      );
    });

    test('should handle multiple filters with map data', async () => {
      const response = await request(app)
        .get('/api/v1/map-data?state=CA&fuelType=Solar&plantName=Desert%20Sunlight')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getMapData).toHaveBeenCalledWith(
        expect.objectContaining({ 
          state: 'CA',
          fuelType: 'Solar',
          plantName: 'Desert Sunlight'
        })
      );
    });

    test('should validate state analytics structure', async () => {
      const response = await request(app)
        .get('/api/v1/map-data?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      const { stateData } = response.body.data;
      
      expect(stateData).toHaveProperty('stateAbbr');
      expect(stateData).toHaveProperty('totalPlants');
      expect(stateData).toHaveProperty('totalCapacityMw');
      expect(stateData).toHaveProperty('totalGenerationMwh');
      expect(stateData).toHaveProperty('totalEmissionsTons');
      expect(stateData).toHaveProperty('avgCapacityFactor');
      expect(stateData).toHaveProperty('topFuelCategories');
      
      expect(Array.isArray(stateData.topFuelCategories)).toBe(true);
      expect(stateData.topFuelCategories[0]).toHaveProperty('fuelCategory');
      expect(stateData.topFuelCategories[0]).toHaveProperty('plantCount');
      expect(stateData.topFuelCategories[0]).toHaveProperty('capacityMw');
    });

    test('should handle map data service errors', async () => {
      mockPowerPlantService.getMapData.mockRejectedValue(
        new Error('Map data service failed')
      );

      const response = await request(app)
        .get('/api/v1/map-data?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve map data',
        message: 'Map data service failed'
      });
    });
  });

  describe('Plants API Tests', () => {
    test('should return plants data', async () => {
      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            orisCode: expect.any(Number),
            plantName: expect.any(String),
            stateAbbr: expect.any(String)
          })
        ])
      });

      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalled();
    });

    test('should handle state filter', async () => {
      const response = await request(app)
        .get('/api/v1/plants?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'CA'
        })
      );
    });

    test('should handle plant name filter', async () => {
      const response = await request(app)
        .get('/api/v1/plants?plantName=Test')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          plantName: 'Test'
        })
      );
    });

    test('should handle fuel type filter', async () => {
      const response = await request(app)
        .get('/api/v1/plants?fuelType=Natural%20Gas')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          fuelType: 'Natural Gas'
        })
      );
    });

    test('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/plants?page=2&limit=5')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5
        })
      );
    });

    test('should handle sorting parameters', async () => {
      const response = await request(app)
        .get('/api/v1/plants?sortBy=plantName&sortOrder=ASC')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'plantName',
          sortOrder: 'ASC'
        })
      );
    });

    test('should set default values when no filters provided', async () => {
      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          page: 1,
          sortBy: 'annualGenerationMwh',
          sortOrder: 'DESC'
        })
      );
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle service errors gracefully', async () => {
      // Mock service to throw error
      mockPowerPlantService.getFilteredPlantsData.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve plants data',
        message: 'Database connection failed'
      });
    });

    test('should handle unknown service errors', async () => {
      // Mock service to throw non-Error object
      mockPowerPlantService.getFilteredPlantsData.mockRejectedValue('Unknown error');

      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve plants data',
        message: 'An unexpected error occurred'
      });
    });
  });

  describe('Response Format Tests', () => {
    test('should return consistent response structure', async () => {
      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('summary');

      expect(typeof response.body.success).toBe('boolean');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.summary).toBe('object');
    });

    test('should include proper summary information', async () => {
      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.summary).toHaveProperty('dataType');
      expect(response.body.summary.dataType).toBe('top_plants');
    });

    test('should generate appropriate messages for different scenarios', async () => {
      // Test top plants message
      const response1 = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response1.body.message).toContain('Retrieved top');

      // Test state filter message
      const response2 = await request(app)
        .get('/api/v1/plants?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response2.body.message).toContain('power plants in CA');
    });
  });

  describe('Simplified Response Tests', () => {
    test('should return plant data directly when filters are provided', async () => {
      mockPowerPlantService.getFilteredPlantsData.mockResolvedValue({
        data: [mockPlantData]
      });

      const response = await request(app)
        .get('/api/v1/plants?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockPlantData]);
    });

    test('should return plant data when both state and plantName are provided', async () => {
      mockPowerPlantService.getFilteredPlantsData.mockResolvedValue({
        data: [mockPlantData]
      });

      const response = await request(app)
        .get('/api/v1/plants?state=CA&plantName=Test%20Power%20Plant')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockPlantData]);
    });

    test('should work without any filters', async () => {
      mockPowerPlantService.getFilteredPlantsData.mockResolvedValue({
        data: [mockPlantData]
      });

      const response = await request(app)
        .get('/api/v1/plants')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockPlantData]);
    });

    test('should work with multiple plants', async () => {
      const multiplePlants = [
        mockPlantData,
        { ...mockPlantData, id: 2, orisCode: 67890, plantName: 'Another Plant' }
      ];

      mockPowerPlantService.getFilteredPlantsData.mockResolvedValue({
        data: multiplePlants
      });

      const response = await request(app)
        .get('/api/v1/plants?state=TX&fuelType=Natural%20Gas')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(multiplePlants);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'TX',
          fuelType: 'Natural Gas'
        })
      );
    });
  });

  describe('Integration Tests', () => {
    test('should handle multiple filters simultaneously', async () => {
      const response = await request(app)
        .get('/api/v1/plants?state=CA&fuelType=Nuclear&page=1&limit=20&sortBy=plantName&sortOrder=ASC')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'CA',
          fuelType: 'Nuclear',
          page: 1,
          limit: 20,
          sortBy: 'plantName',
          sortOrder: 'ASC'
        })
      );
    });

    test('should handle concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/v1/plants')
          .set('Authorization', 'Bearer mock-token')
          .expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });

      expect(mockPowerPlantService.getFilteredPlantsData).toHaveBeenCalledTimes(5);
    });

    test('should handle map data and plants API consistency', async () => {
      // Test that both endpoints work with similar filters
      const plantsResponse = await request(app)
        .get('/api/v1/plants?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      const mapResponse = await request(app)
        .get('/api/v1/map-data?state=CA')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(plantsResponse.body.success).toBe(true);
      expect(mapResponse.body.success).toBe(true);
      expect(mapResponse.body.data.stateData.stateAbbr).toBe('CA');
    });
  });
}); 