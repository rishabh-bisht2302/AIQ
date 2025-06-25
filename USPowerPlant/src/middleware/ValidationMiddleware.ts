import { Response, NextFunction, Request } from 'express';
import Joi from 'joi';

export class ValidationMiddleware {

  /**
   * Validate query parameters for combined plants endpoint
   */
  public static validateCombinedPlantsParams(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
      // Basic filtering
      state: Joi.string().length(2).uppercase().optional().description('Two-letter state abbreviation (e.g., CA, TX)'),
      plantName: Joi.string().min(2).max(100).optional().description('Plant name or partial name for search'),
      
      // Fuel filtering
      fuelType: Joi.string().optional().description('Primary fuel type (e.g., Nuclear, Coal, Natural Gas)'),
      fuelCategory: Joi.string().optional().description('Fuel category (e.g., Fossil, Nuclear, Renewable)'),
      
      // Capacity filtering
      minCapacity: Joi.number().min(0).optional().description('Minimum nameplate capacity in MW'),
      maxCapacity: Joi.number().min(0).optional().description('Maximum nameplate capacity in MW'),
      
      // Generation filtering
      minGeneration: Joi.number().min(0).optional().description('Minimum annual generation in MWh'),
      maxGeneration: Joi.number().min(0).optional().description('Maximum annual generation in MWh'),
      
      // Emissions filtering
      minEmissions: Joi.number().min(0).optional().description('Minimum annual CO2 emissions in tons'),
      maxEmissions: Joi.number().min(0).optional().description('Maximum annual CO2 emissions in tons'),
      
      // Other filtering
      sector: Joi.string().optional().description('Sector (e.g., Electric Utility, Independent Power Producer)'),
      
      // Pagination
      page: Joi.number().integer().min(1).optional().default(1).description('Page number for pagination'),
      limit: Joi.number().integer().min(1).max(100).optional().default(10).description('Number of results per page'),
      
      // Sorting
      sortBy: Joi.string().valid('capacityFactor', 'annualCo2EmissionsTons', 'plantName', 'stateAbbr', 'countyName', 'annualNoxEmissionsTons', 'annualSo2EmissionsTons', 'annualGenerationMwh', 'nameplateCapacityMw').optional().description('Sort field'),
      sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('ASC').description('Sort order')
    });

    const { error } = schema.validate(req.query);

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail: Joi.ValidationErrorItem) => detail.message)
      });
      return;
    }

    next();
  }
} 