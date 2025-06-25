import { Request } from 'express';
import { PowerPlantFilters } from '../interfaces/PowerPlant';

export class FilterUtils {
  // Validate and extract PowerPlant filters from request
  static extractPowerPlantFilters(req: Request): PowerPlantFilters {
    const filters: PowerPlantFilters = {};
    
    // String filters with validation
    const stringFilters = ['state', 'plantName', 'fuelType', 'fuelCategory'] as const;
    stringFilters.forEach(field => {
      const value = req.query[field];
      if (value && typeof value === 'string' && value.trim()) {
        (filters as any)[field] = value.trim();
      }
    });

    // Sort field validation
    if (req.query['sortBy']) {
      const sortBy = req.query['sortBy'] as string;
      const validSortFields = [
        'capacityFactor', 'annualCo2EmissionsTons', 'plantName', 'stateAbbr', 
        'countyName', 'annualNoxEmissionsTons', 'annualSo2EmissionsTons', 
        'annualGenerationMwh', 'nameplateCapacityMw'
      ];
      
      if (validSortFields.includes(sortBy)) {
        filters.sortBy = sortBy as any;
      }
    }

    // Sort order validation
    if (req.query['sortOrder']) {
      const sortOrder = req.query['sortOrder'] as string;
      if (sortOrder === 'ASC' || sortOrder === 'DESC') {
        filters.sortOrder = sortOrder;
      }
    }

    // Numeric filters with validation
    if (req.query['page']) {
      const page = Number(req.query['page']);
      if (!isNaN(page) && page > 0) {
        filters.page = page;
      }
    }

    if (req.query['limit']) {
      const limit = Number(req.query['limit']);
      if (!isNaN(limit) && limit > 0 && limit <= 100) { // Cap at 100 for performance
        filters.limit = limit;
      }
    }

    return filters;
  }

  // Apply default values for empty filters
  static applyDefaults(filters: PowerPlantFilters, defaults: Partial<PowerPlantFilters>): PowerPlantFilters {
    return { ...defaults, ...filters };
  }

  // Check if filters object is empty
  static isEmpty(filters: Record<string, any>): boolean {
    return Object.keys(filters).length === 0;
  }

  // Generate filter summary for logging/debugging
  static generateFilterSummary(filters: PowerPlantFilters): string {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return activeFilters || 'No filters applied';
  }

  // Validate filter combinations
  static validateFilterCombination(filters: PowerPlantFilters): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Example validation rules
    if (filters.page && !filters.limit) {
      errors.push('Page specified without limit');
    }

    if (filters.limit && filters.limit > 100) {
      errors.push('Limit cannot exceed 100');
    }

    if (filters.page && filters.page < 1) {
      errors.push('Page must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 