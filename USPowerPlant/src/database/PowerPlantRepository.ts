import { IPowerPlantRepository } from '../interfaces/Repository';
import { IPowerPlant, PowerPlantFilters, IStateTotals } from '../interfaces/PowerPlant';
import { PowerPlant } from '../models/PowerPlant';
import { SequelizeConnection, PowerPlantModel } from './SequelizeConnection';


export class PowerPlantRepository implements IPowerPlantRepository {
  private db: SequelizeConnection;

  constructor() {
    this.db = SequelizeConnection.getInstance();
  }

  private ensureModelsInitialized() {
    if (!this.db.PowerPlant) {
      throw new Error('Sequelize models not initialized. Make sure to call connect() on SequelizeConnection first.');
    }
  }

  private getSafeColumnName(sortBy: string): string {
    const allowedColumns = ['capacityFactor', 'annualCo2EmissionsTons', 'plantName', 'stateAbbr', 'countyName', 'annualNoxEmissionsTons', 'annualSo2EmissionsTons', 'annualGenerationMwh', 'nameplateCapacityMw'];
    return allowedColumns.includes(sortBy) ? sortBy : 'annualGenerationMwh';
  }
  
  private mapSequelizeModelToPowerPlant(model: PowerPlantModel): PowerPlant {
    return PowerPlant.create({
      id: model.id,
      orisCode: model.orisCode,
      plantName: model.plantName,
      stateAbbr: model.stateAbbr,
      countyName: model.countyName,
      latitude: parseFloat(model.latitude.toString()),
      longitude: parseFloat(model.longitude.toString()),
      nameplateCapacityMw: model.nameplateCapacityMw ? parseFloat(model.nameplateCapacityMw.toString()) : undefined,
      annualGenerationMwh: model.annualGenerationMwh ? parseFloat(model.annualGenerationMwh.toString()) : undefined,
      capacityFactor: model.capacityFactor ? parseFloat(model.capacityFactor.toString()) : undefined,
      annualCo2EmissionsTons: model.annualCo2EmissionsTons ? parseFloat(model.annualCo2EmissionsTons.toString()) : undefined,
      annualNoxEmissionsTons: model.annualNoxEmissionsTons ? parseFloat(model.annualNoxEmissionsTons.toString()) : undefined,
      annualSo2EmissionsTons: model.annualSo2EmissionsTons ? parseFloat(model.annualSo2EmissionsTons.toString()) : undefined,
      annualHeatInputMmbtu: model.annualHeatInputMmbtu ? parseFloat(model.annualHeatInputMmbtu.toString()) : undefined,
      primaryFuel: model.primaryFuel,
      fuelCategory: model.fuelCategory,
      numGenerators: model.numGenerators,
      utilityName: model.utilityName,
      sector: model.sector,
      dataYear: model.dataYear
    });
  }

  async findByFilters(filters: PowerPlantFilters): Promise<PowerPlant[]> {
    this.ensureModelsInitialized();
    
    try {
      const whereClause: any = {};

      if (filters.state) {
        whereClause.stateAbbr = filters.state;
      }
      
      if (filters.plantName) {
        whereClause.plantName = filters.plantName;
      }

      if (filters.fuelCategory) {
        whereClause.fuelCategory = filters.fuelCategory;
      }

      if (filters.fuelType) {
        whereClause.primaryFuel = filters.fuelType;
      }

      // Build query options
      const queryOptions: any = {
        where: whereClause,
      };

      // Add sorting
      const sortBy = this.getSafeColumnName(filters.sortBy || 'annualGenerationMwh');
      const sortOrder = filters.sortOrder || 'DESC';
      queryOptions.order = [[sortBy, sortOrder]];

      // Add pagination
      if (filters.limit) {
        queryOptions.limit = Number(filters.limit);
        
        if (filters.page && filters.page >= 1) {
          const offset = (filters.page - 1) * Number(filters.limit);
          queryOptions.offset = offset;
        }
      }
      const plants = await this.db.PowerPlant.findAll(queryOptions);
      return plants.map(plant => this.mapSequelizeModelToPowerPlant(plant)) 
    } catch (error) {
      console.error('Error finding plants by filters:', error);
      throw error;
    }
  };
  
  async getStateTotals(stateAbbr: string): Promise<IStateTotals | null> {
    this.ensureModelsInitialized();
    
    try {
      const stateTotals = await this.db.StateTotals.findOne({
        where: { stateAbbr }
      });

      if (!stateTotals) {
        return null;
      }

      const result: IStateTotals = {
        id: stateTotals.id,
        stateAbbr: stateTotals.stateAbbr,
        totalNameplateCapacityMw: stateTotals.totalNameplateCapacityMw || 0,
        totalAnnualGenerationMwh: stateTotals.totalAnnualGenerationMwh || 0
      };

      // Add optional properties only if they exist
      if (stateTotals.totalAnnualCo2EmissionsTons !== null && stateTotals.totalAnnualCo2EmissionsTons !== undefined) {
        result.totalAnnualCo2EmissionsTons = stateTotals.totalAnnualCo2EmissionsTons;
      }
      if (stateTotals.totalAnnualNoxEmissionsTons !== null && stateTotals.totalAnnualNoxEmissionsTons !== undefined) {
        result.totalAnnualNoxEmissionsTons = stateTotals.totalAnnualNoxEmissionsTons;
      }
      if (stateTotals.totalAnnualSo2EmissionsTons !== null && stateTotals.totalAnnualSo2EmissionsTons !== undefined) {
        result.totalAnnualSo2EmissionsTons = stateTotals.totalAnnualSo2EmissionsTons;
      }
      if (stateTotals.totalPlants !== null && stateTotals.totalPlants !== undefined) {
        result.totalPlants = stateTotals.totalPlants;
      }
      if (stateTotals.dataYear !== null && stateTotals.dataYear !== undefined) {
        result.dataYear = stateTotals.dataYear;
      }

      return result;
    } catch (error) {
      console.error('Error fetching state totals:', error);
      throw error;
    }
  }
  
  async save(powerPlant: IPowerPlant): Promise<void> {
    await this.db.PowerPlant.upsert({
      oris_code: powerPlant.orisCode,
      plant_name: powerPlant.plantName,
      state_abbr: powerPlant.stateAbbr,
      county_name: powerPlant.countyName,
      latitude: powerPlant.latitude,
      longitude: powerPlant.longitude,
      nameplate_capacity_mw: powerPlant.nameplateCapacityMw,
      annual_generation_mwh: powerPlant.annualGenerationMwh,
      capacity_factor: powerPlant.capacityFactor,
      annual_co2_emissions_tons: powerPlant.annualCo2EmissionsTons,
      annual_nox_emissions_tons: powerPlant.annualNoxEmissionsTons,
      annual_so2_emissions_tons: powerPlant.annualSo2EmissionsTons,
      annual_heat_input_mmbtu: powerPlant.annualHeatInputMmbtu,
      primary_fuel: powerPlant.primaryFuel,
      fuel_category: powerPlant.fuelCategory,
      num_generators: powerPlant.numGenerators,
      utility_name: powerPlant.utilityName,
      sector: powerPlant.sector,
      data_year: powerPlant.dataYear
    } as any);
  }

  async saveMany(powerPlants: IPowerPlant[]): Promise<void> {
    if (powerPlants.length === 0) return;

    const records = powerPlants.map(plant => ({
      oris_code: plant.orisCode,
      plant_name: plant.plantName,
      state_abbr: plant.stateAbbr,
      county_name: plant.countyName,
      latitude: plant.latitude,
      longitude: plant.longitude,
      nameplate_capacity_mw: plant.nameplateCapacityMw,
      annual_generation_mwh: plant.annualGenerationMwh,
      capacity_factor: plant.capacityFactor,
      annual_co2_emissions_tons: plant.annualCo2EmissionsTons,
      annual_nox_emissions_tons: plant.annualNoxEmissionsTons,
      annual_so2_emissions_tons: plant.annualSo2EmissionsTons,
      annual_heat_input_mmbtu: plant.annualHeatInputMmbtu,
      primary_fuel: plant.primaryFuel,
      fuel_category: plant.fuelCategory,
      num_generators: plant.numGenerators,
      utility_name: plant.utilityName,
      sector: plant.sector,
      data_year: plant.dataYear
    }));

    await this.db.PowerPlant.bulkCreate(records as any, {
      updateOnDuplicate: [
        'plantName', 'stateAbbr', 'countyName', 'latitude', 'longitude',
        'nameplateCapacityMw', 'annualGenerationMwh', 'capacityFactor',
        'annualCo2EmissionsTons', 'annualNoxEmissionsTons', 'annualSo2EmissionsTons',
        'annualHeatInputMmbtu', 'primaryFuel', 'fuelCategory', 'numGenerators',
        'utilityName', 'sector', 'dataYear'
      ]
    });
  }
} 