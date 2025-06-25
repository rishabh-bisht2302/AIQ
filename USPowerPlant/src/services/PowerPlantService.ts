import { BaseService } from './BaseService';
import { IPowerPlantRepository } from '../interfaces/Repository';
import { 
  PowerPlantFilters,
  IFilteredPlantsResponse
} from '../interfaces/PowerPlant';
import { ICacheService, CACHE_TTL } from '../interfaces/Cache';

// Performance optimization constants
const CALCULATION_PRECISION = 100; // For rounding calculations
const TOP_FUEL_CATEGORIES_LIMIT = 5;

export class PowerPlantService extends BaseService {
  constructor(
    private readonly powerPlantRepository: IPowerPlantRepository,
    cacheService?: ICacheService
  ) {
    super(cacheService);
  }

  public async getFilteredPlantsData(filters: PowerPlantFilters): Promise<IFilteredPlantsResponse> {
    const cacheKey = this.generateCacheKey('plants', filters);
    
    return this.getCachedData(
      cacheKey,
      () => this.getFilteredPlants(filters),
      CACHE_TTL.PLANT_LIST
    );
  }

  private async getFilteredPlants(filters: PowerPlantFilters): Promise<IFilteredPlantsResponse> {
    const plants = await this.powerPlantRepository.findByFilters(filters);
    
    // Enhanced plant data with calculated metrics
    const enhancedPlants = plants.map(plant => this.enhancePlantData(plant));
    
    return { data: enhancedPlants };
  }

  // Extracted plant data enhancement for reusability
  private enhancePlantData(plant: any) {
    const capacityMw = plant.nameplateCapacityMw || 0;
    const generationMwh = plant.annualGenerationMwh || 0;
    const emissionsTons = plant.annualCo2EmissionsTons || 0;

    return {
      // Basic identification
      id: plant.id,
      orisCode: plant.orisCode,
      plantName: plant.plantName,
      stateAbbr: plant.stateAbbr,
      countyName: plant.countyName,
      
      // Location
      latitude: plant.latitude,
      longitude: plant.longitude,
      
      // Core generation metrics
      nameplateCapacityMw: capacityMw,
      annualGenerationMwh: generationMwh,
      capacityFactor: plant.capacityFactor || 0,
      
      // Additional metrics
      annualHeatInputMmbtu: plant.annualHeatInputMmbtu,
      
      // Fuel information
      primaryFuel: plant.primaryFuel,
      fuelCategory: plant.fuelCategory,
      sector: plant.sector,
      
      // Emissions
      annualCo2EmissionsTons: emissionsTons,
      annualNoxEmissionsTons: plant.annualNoxEmissionsTons,
      annualSo2EmissionsTons: plant.annualSo2EmissionsTons,
      
      // Plant characteristics
      numGenerators: plant.numGenerators,
      utilityName: plant.utilityName,
      dataYear: plant.dataYear,
      
      // Efficiency metrics - using base class method
      generationPerMw: this.safeCalculate(generationMwh, capacityMw, CALCULATION_PRECISION),
      emissionsPerMwh: this.safeCalculate(emissionsTons, generationMwh, CALCULATION_PRECISION),
    };
  }

  public async getMapData(filters: PowerPlantFilters): Promise<any> {
    const cacheKey = this.generateCacheKey('mapdata', filters);
    
    return this.getCachedData(
      cacheKey,
      () => this.fetchMapData(filters),
      CACHE_TTL.MAP_DATA
    );
  }

  private async fetchMapData(filters: PowerPlantFilters): Promise<any> {
    // Get plants for state-level analysis (excluding plantName for broader context)
    const stateFilters = this.createStateFilters(filters);
    const plants = await this.powerPlantRepository.findByFilters(stateFilters);

    // Parallel processing for better performance
    const [stateData, plantData] = await Promise.all([
      this.getStateAnalytics(plants, filters.state),
      this.getPlantDataIfRequested(plants, filters.plantName)
    ]);
    
    return { stateData, plantData };
  }

  // Extracted filter creation logic
  private createStateFilters(filters: PowerPlantFilters): PowerPlantFilters {
    const stateFilters = { ...filters };
    delete stateFilters.plantName; // Remove plantName for state-level data
    return stateFilters;
  }

  // Extracted plant data retrieval logic
  private async getPlantDataIfRequested(plants: any[], plantName?: string): Promise<any> {
    if (!plantName) return null;

    const filteredPlant = plants.find(plant => 
      plant.plantName.toLowerCase().includes(plantName.toLowerCase())
    );
    
    if (!filteredPlant) return null;

    // We need state data for plant analytics - get it if not already available
    const stateData = await this.getStateAnalytics(plants);
    return this.getPlantAnalytics(filteredPlant, stateData);
  }

  private async getStateAnalytics(plants: any[], state?: string): Promise<any> {
    if (plants.length === 0) return null;

    // Calculate totals using reduce with better performance
    const totals = this.calculateStateTotals(plants);
    const avgCapacityFactor = this.calculateAverageCapacityFactor(plants);
    const topFuelCategories = this.getTopFuelCategories(plants);
    const nationalTotals = await this.getNationalTotals();
    const percentages = this.calculateStatePercentages(totals, nationalTotals);

    return {
      stateAbbr: state || plants[0]?.stateAbbr || 'N/A',
      ...totals,
      avgCapacityFactor: Math.round(avgCapacityFactor * CALCULATION_PRECISION) / CALCULATION_PRECISION,
      topFuelCategories,
      percentages
    };
  }

  // Extracted calculation methods for better organization and testability
  private calculateStateTotals(plants: any[]) {
    return plants.reduce((totals, plant) => ({
      totalPlants: totals.totalPlants + 1,
      totalCapacityMw: totals.totalCapacityMw + (plant.nameplateCapacityMw || 0),
      totalGenerationMwh: totals.totalGenerationMwh + (plant.annualGenerationMwh || 0),
      totalEmissionsTons: totals.totalEmissionsTons + (plant.annualCo2EmissionsTons || 0),
      totalNoxEmissions: totals.totalNoxEmissions + (plant.annualNoxEmissionsTons || 0),
      totalSo2Emissions: totals.totalSo2Emissions + (plant.annualSo2EmissionsTons || 0)
    }), {
      totalPlants: 0,
      totalCapacityMw: 0,
      totalGenerationMwh: 0,
      totalEmissionsTons: 0,
      totalNoxEmissions: 0,
      totalSo2Emissions: 0
    });
  }

  private calculateAverageCapacityFactor(plants: any[]): number {
    const validFactors = plants
      .map(plant => plant.capacityFactor)
      .filter(cf => cf && cf > 0);
    
    return validFactors.length > 0 
      ? validFactors.reduce((sum, cf) => sum + cf, 0) / validFactors.length 
      : 0;
  }

  private getTopFuelCategories(plants: any[]): any[] {
    const categoryStats = plants.reduce((stats, plant) => {
      const category = plant.fuelCategory || 'Unknown';
      if (!stats[category]) {
        stats[category] = {
          fuelCategory: category,
          plantCount: 0,
          capacityMw: 0,
          generationMwh: 0,
          emissionsTons: 0
        };
      }
      
      const stat = stats[category];
      stat.plantCount += 1;
      stat.capacityMw += plant.nameplateCapacityMw || 0;
      stat.generationMwh += plant.annualGenerationMwh || 0;
      stat.emissionsTons += plant.annualCo2EmissionsTons || 0;
      
      return stats;
    }, {} as Record<string, any>);

    return Object.values(categoryStats)
      .sort((a: any, b: any) => b.capacityMw - a.capacityMw)
      .slice(0, TOP_FUEL_CATEGORIES_LIMIT);
  }

  private calculateStatePercentages(stateTotals: any, nationalTotals: any) {
    return {
      capacityPercentage: this.calculatePercentage(stateTotals.totalCapacityMw, nationalTotals.totalCapacityMw),
      generationPercentage: this.calculatePercentage(stateTotals.totalGenerationMwh, nationalTotals.totalGenerationMwh),
      emissionsPercentage: this.calculatePercentage(stateTotals.totalEmissionsTons, nationalTotals.totalEmissionsTons),
      plantCountPercentage: this.calculatePercentage(stateTotals.totalPlants, nationalTotals.totalPlants)
    };
  }

  private async getNationalTotals(): Promise<any> {
    const cacheKey = 'national:totals';
    
    return this.getCachedData(
      cacheKey,
      async () => {
        const allPlants = await this.powerPlantRepository.findByFilters({});
        return this.calculateStateTotals(allPlants);
      },
      CACHE_TTL.NATIONAL_TOTALS
    );
  }

  private async getPlantAnalytics(plant: any, stateData: any): Promise<any> {
    if (!plant || !stateData) return null;

    const percentageOfState = {
      capacity: this.calculatePercentage(plant.nameplateCapacityMw || 0, stateData.totalCapacityMw),
      generation: this.calculatePercentage(plant.annualGenerationMwh || 0, stateData.totalGenerationMwh),
      emissions: this.calculatePercentage(plant.annualCo2EmissionsTons || 0, stateData.totalEmissionsTons),
      noxEmissions: this.calculatePercentage(plant.annualNoxEmissionsTons || 0, stateData.totalNoxEmissions),
      so2Emissions: this.calculatePercentage(plant.annualSo2EmissionsTons || 0, stateData.totalSo2Emissions),
      plantCount: this.calculatePercentage(1, stateData.totalPlants)
    };

    const efficiencyMetrics = {
      generationPerMw: this.safeCalculate(plant.annualGenerationMwh || 0, plant.nameplateCapacityMw || 0, CALCULATION_PRECISION),
      emissionsPerMwh: this.safeCalculate(plant.annualCo2EmissionsTons || 0, plant.annualGenerationMwh || 0, CALCULATION_PRECISION),
      capacityFactor: Math.round((plant.capacityFactor || 0) * CALCULATION_PRECISION) / CALCULATION_PRECISION,
      capacityFactorVsStateAvg: this.calculatePercentage(plant.capacityFactor || 0, stateData.avgCapacityFactor)
    };

    const stateComparison = {
      isAboveStateAvgCapacityFactor: (plant.capacityFactor || 0) > stateData.avgCapacityFactor,
      capacityFactorPercentile: efficiencyMetrics.capacityFactorVsStateAvg,
      contributionRank: {
        capacity: percentageOfState.capacity,
        generation: percentageOfState.generation,
        emissions: percentageOfState.emissions
      }
    };

    return {
      ...plant,
      percentageOfState,
      efficiencyMetrics,
      stateComparison
    };
  }
} 