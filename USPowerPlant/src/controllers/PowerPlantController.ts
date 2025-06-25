import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { PowerPlantService } from '../services/PowerPlantService';
import { PowerPlantFilters } from '../interfaces/PowerPlant';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

// Constants for better maintainability
const DEFAULT_FILTERS = {
  limit: 10,
  page: 1,
  sortBy: 'annualGenerationMwh' as const,
  sortOrder: 'DESC' as const
};



export class PowerPlantController extends BaseController {
  constructor(
    private readonly powerPlantService: PowerPlantService,
    private readonly authMiddleware: AuthMiddleware
  ) {
    super();
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    this.router.get('/plants', this.authMiddleware.authenticate, ValidationMiddleware.validateCombinedPlantsParams, this.getFilteredPlants);
    this.router.get('/map-data', this.authMiddleware.authenticate, ValidationMiddleware.validateCombinedPlantsParams, this.getMapData);
  }

  // Main endpoints
  public getFilteredPlants = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.extractFilters(req);
      const isEmptyFilters = this.isEmpty(filters);
      
      // Apply default values for empty filters
      if (isEmptyFilters) { 
        Object.assign(filters, DEFAULT_FILTERS);
      }

      const result = await this.powerPlantService.getFilteredPlantsData(filters);
      
      const summary = {
        dataType: this.getDataType(filters, isEmptyFilters)
      };

      this.sendSuccess(
        res,
        result.data,
        this.generateMessage(filters, result.data.length, isEmptyFilters),
        summary
      );
    } catch (error) {
      this.sendError(res, error, 'Failed to retrieve plants data');
    }
  };

  public getMapData = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.extractFilters(req);
      const result = await this.powerPlantService.getMapData(filters);

      const message = this.buildMapDataMessage(filters);
      this.sendSuccess(res, result, message);
    } catch (error) {
      this.sendError(res, error, 'Failed to retrieve map data');
    }
  };

  // PowerPlant-specific utility methods
  private extractFilters(req: Request): PowerPlantFilters {
    const filters: PowerPlantFilters = {};
    // filter parsing
    if (req.query['state']) filters.state = req.query['state'] as string;
    if (req.query['plantName']) filters.plantName = req.query['plantName'] as string;
    if (req.query['fuelType']) filters.fuelType = req.query['fuelType'] as string;
    if (req.query['fuelCategory']) filters.fuelCategory = req.query['fuelCategory'] as string;
    if (req.query['sortBy']) filters.sortBy = req.query['sortBy'] as 'capacityFactor' | 'annualCo2EmissionsTons' | 'plantName' | 'stateAbbr' | 'countyName' | 'annualNoxEmissionsTons' | 'annualSo2EmissionsTons' | 'annualGenerationMwh' | 'nameplateCapacityMw';
    if (req.query['sortOrder']) filters.sortOrder = req.query['sortOrder'] as 'ASC' | 'DESC';
    if (req.query['page']) filters.page = Number(req.query['page']);
    if (req.query['limit']) filters.limit = Number(req.query['limit']);
    return filters;
  }

  private buildMapDataMessage(filters: PowerPlantFilters): string {
    const parts = ['Map data retrieved successfully'];
    
    if (filters.state) {
      parts.push(`for ${filters.state}`);
    }
    if (filters.plantName) {
      parts.push(`including plant analysis for ${filters.plantName}`);
    }

    return parts.join(' ');
  }

  private generateMessage(filters: PowerPlantFilters, dataLength: number = 0, isEmptyFilters: boolean = false): string {
    if (isEmptyFilters) {
      return `Retrieved top ${dataLength} power plants by generation.`;
    }
    
    if (filters.state && !filters.plantName) {
      return `Retrieved ${dataLength} power plants in ${filters.state} with filtering applied`;
    }
    
    if (filters.state && filters.plantName) {
      return dataLength > 0 
        ? `Retrieved detailed data for "${filters.plantName}" in ${filters.state}`
        : `No plants found matching "${filters.plantName}" in ${filters.state}`;
    }
    
    return `Retrieved ${dataLength} filtered power plants`;
  }

  private getDataType(filters: PowerPlantFilters, isEmptyFilters: boolean = false): string {
    if (isEmptyFilters) return 'top_plants';
    if (filters.state && !filters.plantName) return 'state_plants';
    if (filters.state && filters.plantName) return 'specific_plant';
    return 'filtered_plants';
  }
} 