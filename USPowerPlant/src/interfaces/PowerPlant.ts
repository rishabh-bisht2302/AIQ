// PowerPlant related interfaces
export interface IPowerPlant {
  id?: number | undefined;
  orisCode: number;
  plantName: string;
  stateAbbr: string;
  countyName?: string | undefined;
  latitude: number;
  longitude: number;
  nameplateCapacityMw?: number | undefined;
  annualGenerationMwh?: number | undefined;
  capacityFactor?: number | undefined;
  annualCo2EmissionsTons?: number | undefined;
  annualNoxEmissionsTons?: number | undefined;
  annualSo2EmissionsTons?: number | undefined;
  annualHeatInputMmbtu?: number | undefined;
  primaryFuel?: string | undefined;
  fuelCategory?: string | undefined;
  numGenerators?: number | undefined;
  utilityName?: string | undefined;
  sector?: string | undefined;
  dataYear?: number | undefined;
}

export interface IStateTotals {
  id?: number;
  stateAbbr: string;
  totalNameplateCapacityMw: number;
  totalAnnualGenerationMwh: number;
  totalAnnualCo2EmissionsTons?: number;
  totalAnnualNoxEmissionsTons?: number;
  totalAnnualSo2EmissionsTons?: number;
  totalPlants?: number;
  dataYear?: number;
}

export interface IPlantDemographics {
  id?: number;
  orisCode: number;
  totalPopulation?: number;
  bufferDistanceMiles?: number;
  demographicIndexPercentile?: number;
  lowIncomePercentile?: number;
  peopleOfColorPercentile?: number;
  limitedEnglishPercentile?: number;
  overAge64Percentile?: number;
  underAge5Percentile?: number;
  lessThanHsEducationPercentile?: number;
}

export interface PowerPlantFilters {
  state?: string;
  plantName?: string;
  fuelType?: string;
  fuelCategory?: string;
  plantType?: string;
  minGeneration?: number;
  maxGeneration?: number;
  sector?: string;
  page?: number;
  limit?: number;
  sortBy?: 'capacityFactor' | 'annualCo2EmissionsTons' | 'plantName' | 'stateAbbr' | 'countyName' | 'annualNoxEmissionsTons' | 'annualSo2EmissionsTons' | 'annualGenerationMwh' | 'nameplateCapacityMw';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ExtendedPlantData extends IPowerPlant {
  // Calculated fields
  percentageOfState?: number | undefined;
  percentageOfTotal?: number | undefined;
  
  // Demographics data
  demographics?: IPlantDemographics | undefined;
  
  // State context
  stateData?: IStateTotals | undefined;
}

export interface MapDataPoint {
  id: number;
  orisCode: number;
  plantName: string;
  stateAbbr: string;
  latitude: number;
  longitude: number;
  annualGenerationMwh: number;
  nameplateCapacityMw: number;
  annualCo2EmissionsTons: number;
  percentageOfState: number;
  percentageOfTotal: number;
  fuelCategory: string;
  primaryFuel: string;
  sector: string;
  
  // Optional demographics for enhanced visualization
  demographicIndex?: number;
  environmentalJusticeScore?: number;
}

export interface FilterOptions {
  states: string[];
  fuelCategories: string[];
  fuelTypes: string[];
  primaryFuels: string[];
  sectors: string[];
  totalPlants: number;
  capacityRange: { min: number; max: number };
  generationRange: { min: number; max: number };
  emissionsRange: { min: number; max: number };
}

export interface StateAnalytics {
  stateAbbr: string;
  totalPlants: number;
  totalCapacityMw: number;
  totalGenerationMwh: number;
  totalEmissionsTons: number;
  avgCapacityFactor: number;
  topFuelCategories: Array<{
    fuelCategory: string;
    plantCount: number;
    capacityMw: number;
    generationMwh: number;
  }>;
  environmentalJusticeMetrics?: {
    avgDemographicIndex: number;
    highEjCommunityCount: number;
    totalAffectedPopulation: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 

export interface IFilteredPlantsResponse {
    data: IPowerPlant[];
    requestedContext?: IStateContext;
}

export interface IStateContext {
    stateAbbr: string;
    stateTotals: IStateTotals;
    filteredPlantsTotals: {
        totalNameplateCapacityMw: number;
        totalAnnualGenerationMwh: number;
        totalAnnualCo2EmissionsTons: number;
        plantCount: number;
    };
    percentages: {
        capacityPercentage: number;
        generationPercentage: number;
        emissionsPercentage: number;
        plantCountPercentage: number;
    };
}

export interface IStateResponse {
    stateContext: IStateContext;
    message?: string;
    plants?: IPowerPlant[];
}

export interface IPlantSpecificResponse {
    plant: IPowerPlant | null;
    plants: IPowerPlant[];
    stateContext?: IStateContext;
}