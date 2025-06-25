import { PowerPlantFilters, IStateTotals } from './PowerPlant';
import { PowerPlant } from '../models/PowerPlant';

export interface IPowerPlantRepository {
  findByFilters(filters: PowerPlantFilters): Promise<PowerPlant[]>;
  getStateTotals?(stateAbbr: string): Promise<IStateTotals | null>;
} 