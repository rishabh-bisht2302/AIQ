import { IPowerPlant } from '../interfaces/PowerPlant';

export class PowerPlant implements IPowerPlant {
  public readonly id?: number | undefined;
  public readonly orisCode: number;
  public readonly plantName: string;
  public readonly stateAbbr: string;
  public readonly countyName?: string | undefined;
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly nameplateCapacityMw?: number | undefined;
  public readonly annualGenerationMwh?: number | undefined;
  public readonly capacityFactor?: number | undefined;
  public readonly annualCo2EmissionsTons?: number | undefined;
  public readonly annualNoxEmissionsTons?: number | undefined;
  public readonly annualSo2EmissionsTons?: number | undefined;
  public readonly annualHeatInputMmbtu?: number | undefined;
  public readonly primaryFuel?: string | undefined;
  public readonly fuelCategory?: string | undefined;
  public readonly numGenerators?: number | undefined;
  public readonly utilityName?: string | undefined;
  public readonly sector?: string | undefined;
  public readonly dataYear?: number | undefined;

  private constructor(data: IPowerPlant) {
    this.id = data.id;
    this.orisCode = data.orisCode;
    this.plantName = data.plantName;
    this.stateAbbr = data.stateAbbr;
    this.countyName = data.countyName;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.nameplateCapacityMw = data.nameplateCapacityMw;
    this.annualGenerationMwh = data.annualGenerationMwh;
    this.capacityFactor = data.capacityFactor;
    this.annualCo2EmissionsTons = data.annualCo2EmissionsTons;
    this.annualNoxEmissionsTons = data.annualNoxEmissionsTons;
    this.annualSo2EmissionsTons = data.annualSo2EmissionsTons;
    this.annualHeatInputMmbtu = data.annualHeatInputMmbtu;
    this.primaryFuel = data.primaryFuel;
    this.fuelCategory = data.fuelCategory;
    this.numGenerators = data.numGenerators;
    this.utilityName = data.utilityName;
    this.sector = data.sector;
    this.dataYear = data.dataYear;
  }

  public static create(data: IPowerPlant): PowerPlant {
    // Validate required fields
    if (!data.orisCode) {
      throw new Error('ORIS code is required');
    }
    if (!data.plantName) {
      throw new Error('Plant name is required');
    }
    if (!data.stateAbbr) {
      throw new Error('State abbreviation is required');
    }
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('Valid latitude and longitude are required');
    }

    return new PowerPlant(data);
  }
} 