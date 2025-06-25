import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { PowerPlantController } from './controllers/PowerPlantController';
import { AuthController } from './controllers/AuthController';
import { HealthController } from './controllers/HealthController';
import { SequelizeConnection } from './database/SequelizeConnection';
import { AuthMiddleware } from './middleware/AuthMiddleware';
import { DependencyContainer } from './config/DependencyContainer';

const app = express();
const PORT = process.env['PORT'] || 3000;

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'US Power Plants API',
    version: '2.0.0',
    description: 'Comprehensive API for US power plant data with state-level analytics, plant-level details, and contribution percentages',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/api/v1/auth/token': {
      post: {
        summary: 'Generate authentication token',
        description: 'Generate a JWT token for API authentication. No request body required an created to demonstrate the api without any auth generation mechanism.',
        responses: {
          '200': {
            description: 'Token generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        tokenType: { type: 'string' },
                        expiresIn: { type: 'string' }
                      }
                    },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },

          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the API is running and database is connected',
        responses: {
          '200': { 
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string' },
                    version: { type: 'string' }
                  }
                }
              }
            }
          },
        },
      },
    },
    '/api/v1/health/cache': {
      get: {
        summary: 'Cache health check',
        description: 'Check if Redis cache is connected and get cache statistics',
        responses: {
          '200': { 
            description: 'Cache is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string' },
                    cache: {
                      type: 'object',
                      properties: {
                        enabled: { type: 'boolean' },
                        healthy: { type: 'boolean' },
                        totalKeys: { type: 'integer' },
                        memoryUsage: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '500': { 
            description: 'Cache is unhealthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string' },
                    error: { type: 'string' }
                  }
                }
              }
            }
          }
        },
      },
    },
    '/api/v1/plants': {
      get: {
        summary: 'Get power plants data with filtering and analytics',
        security: [{ bearerAuth: [] }],
        description: `
          **Multi-purpose endpoint that returns different data based on parameters:**
          
          1. **No filters (except limit)**: Returns top N power plants by generation (default 10, sorted by generation DESC)
          2. **State only**: Returns all plants in that state with filtering applied
          3. **State + Plant Name**: Returns specific plant details
          4. **Other filters**: Returns filtered plants based on criteria
          
          **Response includes:**
          - Basic plant information (name, location, ORIS code)
          - Generation metrics (capacity, generation, capacity factor)
          - Fuel information (primary fuel, fuel category)
          - Basic emissions data
          - Efficiency metrics (generation per MW, emissions per MWh)
        `,
        parameters: [
          {
            name: 'state',
            in: 'query',
            required: false,
            description: 'Two-letter state abbreviation (e.g., CA, TX, NY)',
            schema: { 
              type: 'string', 
              pattern: '^[A-Z]{2}$'
            },
          },
          {
            name: 'plantName',
            in: 'query',
            required: false,
            description: 'Plant name or partial name for search (case-insensitive)',
            schema: { 
              type: 'string',
              minLength: 2,
              maxLength: 100
            },
          },
          {
            name: 'fuelType',
            in: 'query',
            required: false,
            description: 'Primary fuel type (e.g., Nuclear, Coal, Natural Gas)',
            schema: { 
              type: 'string'
            },
          },
          {
            name: 'fuelCategory',
            in: 'query',
            required: false,
            description: 'Fuel category (e.g., Fossil, Nuclear, Renewable)',
            schema: { 
              type: 'string'
            },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Page number for pagination',
            schema: { 
              type: 'integer',
              minimum: 1
            },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Number of results per page (max 100)',
            schema: { 
              type: 'integer',
              minimum: 1,
              maximum: 100
            },
            
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            description: 'Sort field',
            schema: { 
              type: 'string',
              enum: ['capacityFactor', 'annualCo2EmissionsTons', 'plantName', 'stateAbbr', 'countyName', 'annualNoxEmissionsTons', 'annualSo2EmissionsTons', 'annualGenerationMwh', 'nameplateCapacityMw'],
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            required: false,
            description: 'Sort order',
            schema: { 
              type: 'string',
              enum: ['ASC', 'DESC']
            },
          }
        ],
        responses: {
          '200': { 
            description: 'Success - Returns different data structures based on parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { 
                      type: 'array',
                      description: 'Array of states, plants, or specific plant data depending on parameters'
                    },
                    message: { type: 'string' },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' }
                      }
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        totalGeneration: { type: 'number', description: 'Total generation in MWh' },
                        totalEmissions: { type: 'number', description: 'Total CO2 emissions in tons' },
                        totalCapacity: { type: 'number', description: 'Total capacity in MW' },
                        dataType: { 
                          type: 'string', 
                          enum: ['top_plants', 'state_plants', 'specific_plant', 'filtered_plants'],
                          description: 'Type of data returned'
                        }
                      }
                    }
                  }
                },
                examples: {
                  topPlants: {
                    summary: 'Top plants by generation (no filters)',
                    value: {
                      success: true,
                      data: [
                        {
                          orisCode: 206,
                          plantName: 'Diablo Canyon',
                          stateAbbr: 'CA',
                          latitude: 35.2119,
                          longitude: -120.8542,
                          nameplateCapacityMw: 2256,
                          annualGenerationMwh: 18000000,
                          capacityFactor: 92.4,
                          primaryFuel: 'Nuclear',
                          fuelCategory: 'Nuclear',
                          annualCo2EmissionsTons: 0,
                          generationPerMw: 7978.72,
                          emissionsPerMwh: 0
                        }
                      ],
                      message: 'Retrieved top 10 power plants by generation (limit: 10)',
                      summary: {
                        totalGeneration: 180000000,
                        totalEmissions: 45000000,
                        totalCapacity: 25000,
                        dataType: 'top_plants'
                      }
                    }
                  },
                  statePlants: {
                    summary: 'Plants in specific state (state parameter)',
                    value: {
                      success: true,
                      data: [
                        {
                          orisCode: 206,
                          plantName: 'Diablo Canyon',
                          stateAbbr: 'CA',
                          countyName: 'San Luis Obispo',
                          latitude: 35.2119,
                          longitude: -120.8542,
                          nameplateCapacityMw: 2256,
                          annualGenerationMwh: 18000000,
                          capacityFactor: 92.4,
                          primaryFuel: 'Nuclear',
                          fuelCategory: 'Nuclear',
                          sector: 'Electric Utility',
                          annualCo2EmissionsTons: 0,
                          generationPerMw: 7978.72,
                          emissionsPerMwh: 0
                        }
                      ],
                      message: 'Retrieved 1 power plants in CA with filtering applied'
                    }
                  },
                  specificPlant: {
                    summary: 'Specific plant data (state + plantName parameters)',
                    value: {
                      success: true,
                      data: [
                        {
                          orisCode: 206,
                          plantName: 'Diablo Canyon',
                          stateAbbr: 'CA',
                          countyName: 'San Luis Obispo',
                          latitude: 35.2119,
                          longitude: -120.8542,
                          nameplateCapacityMw: 2256,
                          annualGenerationMwh: 18000000,
                          capacityFactor: 92.4,
                          primaryFuel: 'Nuclear',
                          fuelCategory: 'Nuclear',
                          sector: 'Electric Utility',
                          annualCo2EmissionsTons: 0,
                          generationPerMw: 7978.72,
                          emissionsPerMwh: 0,
                          demographics: {
                            totalPopulation: 25000,
                            demographicIndexPercentile: 45
                          }
                        }
                      ],
                      message: 'Retrieved detailed data for "Diablo Canyon" in CA'
                    }
                  }
                }
              }
            }
          },
          '400': { 
            description: 'Validation error - Invalid parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    details: { 
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          '500': { 
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        },
      },
    },
    '/api/v1/map-data': {
      get: {
        summary: 'Get power plants map data with state-level analytics',
        security: [{ bearerAuth: [] }],
        description: `
          **Advanced endpoint for map visualization and state analytics**
          
          **Returns comprehensive data structure:**
          - **stateData**: Comprehensive state-level analytics including:
            - Total plants count, capacity, generation, emissions
            - Average capacity factor
            - Top 5 fuel categories by capacity
            - State-level aggregations
          - **plantData**: Detailed analytics for specific plant (when plantName provided):
            - Plant's percentage contribution to state totals
            - Efficiency metrics (generation per MW, emissions per MWh)
            - Plant-specific performance data
          
          **Use Cases:**
          - Map visualization with state overlays
          - State-level power generation analysis
          - Individual plant contribution analysis
          - Comparative analytics between plants and state totals
        `,
        parameters: [
          {
            name: 'state',
            in: 'query',
            required: false,
            description: 'Two-letter state abbreviation (e.g., CA, TX, NY) for state-level analytics',
            schema: { 
              type: 'string', 
              pattern: '^[A-Z]{2}$'
            },
            example: 'CA'
          },
          {
            name: 'plantName',
            in: 'query',
            required: false,
            description: 'Plant name or partial name for specific plant analysis (case-insensitive). When provided, returns detailed plant analytics including percentage contribution to state totals.',
            schema: { 
              type: 'string',
              minLength: 2,
              maxLength: 100
            },
            example: 'Diablo Canyon'
          }
        ],
        responses: {
          '200': { 
            description: 'Success - Returns map data with state analytics and optional plant-specific analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                                                        properties: {
                     success: { type: 'boolean' },
                     message: { type: 'string' },
                     data: {
                       type: 'object',
                       description: 'Map data containing state analytics and optional plant data',
                       properties: {
                         stateData: {
                      type: 'object',
                      description: 'Comprehensive state-level analytics',
                      properties: {
                        stateAbbr: { type: 'string' },
                        totalPlants: { type: 'integer', description: 'Total number of plants in state' },
                        totalCapacityMw: { type: 'number', description: 'Total nameplate capacity in MW' },
                        totalGenerationMwh: { type: 'number', description: 'Total annual generation in MWh' },
                        totalEmissionsTons: { type: 'number', description: 'Total CO2 emissions in tons' },
                        totalNoxEmissions: { type: 'number', description: 'Total NOx emissions in tons' },
                        totalSo2Emissions: { type: 'number', description: 'Total SO2 emissions in tons' },
                        avgCapacityFactor: { type: 'number', description: 'Average capacity factor across all plants' },
                        topFuelCategories: {
                          type: 'array',
                          description: 'Top 5 fuel categories by capacity',
                          items: {
                            type: 'object',
                            properties: {
                              fuelCategory: { type: 'string' },
                              plantCount: { type: 'integer' },
                              capacityMw: { type: 'number' },
                              generationMwh: { type: 'number' },
                              emissionsTons: { type: 'number' }
                            }
                          }
                        },
                        percentages: {
                          type: 'object',
                          description: 'State percentages of national totals',
                          properties: {
                            capacityPercentage: { type: 'number', description: 'Percentage of national total capacity' },
                            generationPercentage: { type: 'number', description: 'Percentage of national total generation' },
                            emissionsPercentage: { type: 'number', description: 'Percentage of national total emissions' },
                            plantCountPercentage: { type: 'number', description: 'Percentage of national total plant count' }
                          }
                        }
                      }
                    },
                    plantData: {
                      type: 'object',
                      nullable: true,
                      description: 'Detailed plant analytics (only when plantName parameter provided)',
                      properties: {
                        plantName: { type: 'string' },
                        stateAbbr: { type: 'string' },
                        nameplateCapacityMw: { type: 'number' },
                        annualGenerationMwh: { type: 'number' },
                        annualCo2EmissionsTons: { type: 'number' },
                        percentageOfState: {
                          type: 'object',
                          description: 'Plant contribution as percentage of state totals',
                          properties: {
                            capacity: { type: 'number', description: 'Percentage of state total capacity' },
                            generation: { type: 'number', description: 'Percentage of state total generation' },
                            emissions: { type: 'number', description: 'Percentage of state total CO2 emissions' },
                            noxEmissions: { type: 'number', description: 'Percentage of state total NOx emissions' },
                            so2Emissions: { type: 'number', description: 'Percentage of state total SO2 emissions' },
                            plantCount: { type: 'number', description: 'Percentage representation as single plant in state' }
                          }
                        },
                        efficiencyMetrics: {
                          type: 'object',
                          description: 'Plant-specific efficiency metrics and state comparisons',
                          properties: {
                            generationPerMw: { type: 'number', description: 'Annual generation per MW of capacity' },
                            emissionsPerMwh: { type: 'number', description: 'CO2 emissions per MWh generated' },
                            capacityFactor: { type: 'number', description: 'Plant capacity factor' },
                            capacityFactorVsStateAvg: { type: 'number', description: 'Plant capacity factor as percentage of state average' }
                          }
                        },
                        stateComparison: {
                          type: 'object',
                          description: 'Plant performance comparison within the state',
                          properties: {
                            isAboveStateAvgCapacityFactor: { type: 'boolean', description: 'Whether plant capacity factor is above state average' },
                            capacityFactorPercentile: { type: 'number', description: 'Plant capacity factor as percentage of state average' },
                            contributionRank: {
                              type: 'object',
                              description: 'Plant contribution percentages for ranking',
                              properties: {
                                capacity: { type: 'number' },
                                generation: { type: 'number' },
                                emissions: { type: 'number' }
                              }
                            }
                          }
                        }
                      }
                    }
                       }
                     }
                  }
                },
                examples: {
                  stateAnalytics: {
                    summary: 'State-level analytics (state parameter only)',
                                         value: {
                       success: true,
                       message: 'Map data retrieved successfully for CA',
                       data: {
                         stateData: {
                        stateAbbr: 'CA',
                        totalPlants: 1617,
                        totalCapacityMw: 85342,
                        totalGenerationMwh: 285000000,
                        totalEmissionsTons: 45000000,
                        totalNoxEmissions: 125000,
                        totalSo2Emissions: 15000,
                        avgCapacityFactor: 0.65,
                        topFuelCategories: [
                          {
                            fuelCategory: 'Natural Gas',
                            plantCount: 623,
                            capacityMw: 42500,
                            generationMwh: 120000000,
                            emissionsTons: 35000000
                          },
                          {
                            fuelCategory: 'Solar',
                            plantCount: 456,
                            capacityMw: 15800,
                            generationMwh: 28000000,
                            emissionsTons: 0
                          }
                        ],
                        percentages: {
                          capacityPercentage: 7.85,
                          generationPercentage: 6.32,
                          emissionsPercentage: 4.23,
                          plantCountPercentage: 15.47
                        }
                      },
                      plantData: null
                       }
                    }
                  },
                  plantSpecificAnalytics: {
                    summary: 'Plant-specific analytics (state + plantName parameters)',
                    value: {
                      success: true,
                      message: 'Map data retrieved successfully for CA including plant analysis for Diablo Canyon',
                      data: {
                        stateData: {
                          stateAbbr: 'CA',
                          totalPlants: 1617,
                          totalCapacityMw: 85342,
                          totalGenerationMwh: 285000000,
                          totalEmissionsTons: 45000000,
                          avgCapacityFactor: 0.65,
                          topFuelCategories: [
                            {
                              fuelCategory: 'Natural Gas',
                              plantCount: 623,
                              capacityMw: 42500,
                              generationMwh: 120000000,
                              emissionsTons: 35000000
                            }
                          ]
                        },
                        plantData: {
                          plantName: 'Diablo Canyon',
                          stateAbbr: 'CA',
                          nameplateCapacityMw: 2256,
                          annualGenerationMwh: 18000000,
                          annualCo2EmissionsTons: 0,
                          percentageOfState: {
                            capacity: 2.64,
                            generation: 6.32,
                            emissions: 0.0,
                            noxEmissions: 0.0,
                            so2Emissions: 0.0,
                            plantCount: 0.06
                          },
                          efficiencyMetrics: {
                            generationPerMw: 7978.72,
                            emissionsPerMwh: 0.0,
                            capacityFactor: 0.924,
                            capacityFactorVsStateAvg: 142.15
                          },
                          stateComparison: {
                            isAboveStateAvgCapacityFactor: true,
                            capacityFactorPercentile: 142.15,
                            contributionRank: {
                              capacity: 2.64,
                              generation: 6.32,
                              emissions: 0.0
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { 
            description: 'Validation error - Invalid parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    details: { 
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '500': { 
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        },
      },
    },
  },
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['NODE_ENV'] === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'US Power Plants API',
    version: '2.0.0',
    documentation: {
      swagger: '/api-docs',
    },
    endpoints: {
      health: '/api/v1/health',
      cacheHealth: '/api/v1/health/cache',
      generateToken: '/api/v1/auth/token',
      plants: '/api/v1/plants',
      mapData: '/api/v1/map-data'
    },
    usage: {
      topPlants: '/api/v1/plants',
      topPlantsWithLimit: '/api/v1/plants?limit=20',
      statePlants: '/api/v1/plants?state=CA',
      specificPlant: '/api/v1/plants?state=CA&plantName=Diablo',
      filteredPlants: '/api/v1/plants?fuelCategory=Nuclear&limit=15',
      stateMapData: '/api/v1/map-data?state=CA'
    }
  });
});

// Initialize database and controllers
async function initializeApp(): Promise<void> {
  try {
    // Initialize database connection
    const sequelizeDb = SequelizeConnection.getInstance();
    await sequelizeDb.connect();
    console.log('Sequelize database connected successfully');

    // Initialize dependency container with Redis caching
    const container = DependencyContainer.getInstance();
    
    // Initialize services with caching
    const powerPlantService = await container.initializePowerPlantService();
    const authService = await container.initializeAuthService();
    
    // Initialize middleware and controllers
    const authMiddleware = new AuthMiddleware(authService);
    const authController = new AuthController(authService);
    const healthController = new HealthController(powerPlantService);
    const powerPlantController = new PowerPlantController(powerPlantService, authMiddleware);

    // Routes
    app.use('/api/v1/auth', authController.getRouter());
    app.use('/api/v1', healthController.getRouter());
    app.use('/api/v1', powerPlantController.getRouter());

    // 404 handler
    app.use('*', (_req: express.Request, res: express.Response) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    });

    // Global error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong'
      });
    });

    console.log('Application initialized successfully with Redis caching');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start server
initializeApp().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`US Power Plants API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`API documentation: http://localhost:${PORT}/`);
    console.log(`Database: MySQL`);
    console.log(`Swagger : http://localhost:${PORT}/api-docs`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      
      Promise.all([
        SequelizeConnection.getInstance().disconnect(),
        DependencyContainer.getInstance().cleanup()
      ]).then(() => {
        console.log('All connections closed.');
        process.exit(0);
      }).catch((error) => {
        console.error('Error during shutdown:', error);
        process.exit(1);
      });
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});

export default app;