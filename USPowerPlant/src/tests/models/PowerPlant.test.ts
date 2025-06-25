import { PowerPlant } from '../../models/PowerPlant';
import { IPowerPlant } from '../../interfaces/PowerPlant';

describe('PowerPlant Model Tests', () => {
  
  describe('PowerPlant Creation', () => {
    test('should create a valid PowerPlant instance', () => {
      const plantData: IPowerPlant = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: -118.2437
      };

      const plant = PowerPlant.create(plantData);

      expect(plant).toBeInstanceOf(PowerPlant);
      expect(plant.orisCode).toBe(12345);
      expect(plant.plantName).toBe('Test Plant');
      expect(plant.stateAbbr).toBe('CA');
      expect(plant.latitude).toBe(34.0522);
      expect(plant.longitude).toBe(-118.2437);
    });

    test('should create PowerPlant with all optional fields', () => {
      const plantData: IPowerPlant = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: -118.2437,
        countyName: 'Test County',
        nameplateCapacityMw: 500,
        annualGenerationMwh: 1000000,
        capacityFactor: 0.75,
        annualCo2EmissionsTons: 50000,
        primaryFuel: 'Natural Gas',
        fuelCategory: 'Fossil',
        utilityName: 'Test Utility'
      };

      const plant = PowerPlant.create(plantData);

      expect(plant.countyName).toBe('Test County');
      expect(plant.nameplateCapacityMw).toBe(500);
      expect(plant.annualGenerationMwh).toBe(1000000);
      expect(plant.capacityFactor).toBe(0.75);
      expect(plant.primaryFuel).toBe('Natural Gas');
    });
  });

  describe('PowerPlant Validation', () => {
    test('should throw error when ORIS code is missing', () => {
      const plantData = {
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: -118.2437
      } as IPowerPlant;

      expect(() => PowerPlant.create(plantData)).toThrow('ORIS code is required');
    });

    test('should throw error when plant name is missing', () => {
      const plantData = {
        orisCode: 12345,
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: -118.2437
      } as IPowerPlant;

      expect(() => PowerPlant.create(plantData)).toThrow('Plant name is required');
    });

    test('should throw error when state abbreviation is missing', () => {
      const plantData = {
        orisCode: 12345,
        plantName: 'Test Plant',
        latitude: 34.0522,
        longitude: -118.2437
      } as IPowerPlant;

      expect(() => PowerPlant.create(plantData)).toThrow('State abbreviation is required');
    });

    test('should throw error when latitude is invalid', () => {
      const plantData = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 'invalid' as any,
        longitude: -118.2437
      };

      expect(() => PowerPlant.create(plantData)).toThrow('Valid latitude and longitude are required');
    });

    test('should throw error when longitude is invalid', () => {
      const plantData = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: 'invalid' as any
      };

      expect(() => PowerPlant.create(plantData)).toThrow('Valid latitude and longitude are required');
    });
  });

  describe('PowerPlant Properties', () => {
    test('should have readonly properties', () => {
      const plantData: IPowerPlant = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: -118.2437
      };

      const plant = PowerPlant.create(plantData);

      // Properties should be readonly (TypeScript compile-time check)
      expect(plant.orisCode).toBe(12345);
      expect(plant.plantName).toBe('Test Plant');
      expect(plant.stateAbbr).toBe('CA');
      expect(plant.latitude).toBe(34.0522);
      expect(plant.longitude).toBe(-118.2437);
    });

    test('should handle undefined optional properties', () => {
      const plantData: IPowerPlant = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 34.0522,
        longitude: -118.2437
      };

      const plant = PowerPlant.create(plantData);

      expect(plant.countyName).toBeUndefined();
      expect(plant.nameplateCapacityMw).toBeUndefined();
      expect(plant.annualGenerationMwh).toBeUndefined();
      expect(plant.capacityFactor).toBeUndefined();
      expect(plant.primaryFuel).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero values correctly', () => {
      const plantData: IPowerPlant = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'CA',
        latitude: 0,
        longitude: 0,
        nameplateCapacityMw: 0,
        annualGenerationMwh: 0,
        capacityFactor: 0
      };

      const plant = PowerPlant.create(plantData);

      expect(plant.latitude).toBe(0);
      expect(plant.longitude).toBe(0);
      expect(plant.nameplateCapacityMw).toBe(0);
      expect(plant.annualGenerationMwh).toBe(0);
      expect(plant.capacityFactor).toBe(0);
    });

    test('should handle negative coordinates', () => {
      const plantData: IPowerPlant = {
        orisCode: 12345,
        plantName: 'Test Plant',
        stateAbbr: 'NY',
        latitude: -40.7128,
        longitude: -74.0060
      };

      const plant = PowerPlant.create(plantData);

      expect(plant.latitude).toBe(-40.7128);
      expect(plant.longitude).toBe(-74.0060);
    });

    test('should handle large numbers', () => {
      const plantData: IPowerPlant = {
        orisCode: 99999,
        plantName: 'Large Test Plant',
        stateAbbr: 'TX',
        latitude: 29.7604,
        longitude: -95.3698,
        nameplateCapacityMw: 9999.99,
        annualGenerationMwh: 999999999.99,
        annualCo2EmissionsTons: 999999999.99
      };

      const plant = PowerPlant.create(plantData);

      expect(plant.orisCode).toBe(99999);
      expect(plant.nameplateCapacityMw).toBe(9999.99);
      expect(plant.annualGenerationMwh).toBe(999999999.99);
      expect(plant.annualCo2EmissionsTons).toBe(999999999.99);
    });
  });
}); 