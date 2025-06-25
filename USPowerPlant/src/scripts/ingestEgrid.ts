import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConnection } from '../database/DatabaseConnection';
import csv from 'csv-parser';



class EGridDataIngester {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async initialize(): Promise<void> {
    console.log('Connecting to database...');
    await this.db.connect();
    console.log('Database connected successfully');
  }

  async ingestAllData(): Promise<void> {
    console.log('Starting eGRID data ingestion...');
    
    try {
      // Clear existing data
      await this.clearExistingData();
      
      // Ingest data in order (plants first, then state_totals, then demographics)
      await this.ingestPlants();
      await this.ingestStateTotals();
      await this.ingestDemographics();
      
      console.log('Data ingestion completed successfully!');
    } catch (error) {
      console.error('Error during data ingestion:', error);
      throw error;
    }
  }

  private async clearExistingData(): Promise<void> {
    console.log('Clearing existing data...');
    await this.db.query('DELETE FROM plant_demographics');
    await this.db.query('DELETE FROM state_totals');
    await this.db.query('DELETE FROM plants');
  }

  private async ingestPlants(): Promise<void> {
    console.log('Ingesting plants data...');
    const filePath = path.join(__dirname, '../../data/PLNT21-Table1.csv');
    
    const plants: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            // Handle different possible column headers and skip invalid entries
            const orisField = row.ORISPL || row.ORIS || row['DOE/EIA ORIS plant or facility code'];
            const plantNameField = row.PNAME || row['Plant name'] || '';
            const stateField = row.PSTATABB || row.STATE || row['Plant state abbreviation'] || '';
            const countyField = row.CNTYNAME || row.CNTY || row['Plant county name'] || '';
            const latField = row.LAT || row['Plant latitude'] || '';
            const lonField = row.LON || row['Plant longitude'] || '';
            
            // Skip header rows and invalid entries
            if (!orisField || orisField === 'ORISPL' || orisField === 'ORIS' || 
                orisField === 'DOE/EIA ORIS plant or facility code' || 
                !latField || !lonField) {
              return;
            }

            const orisCode = this.parseInt(orisField);
            const lat = this.parseFloat(latField);
            const lon = this.parseFloat(lonField);
            
            // Skip invalid coordinates and ORIS codes
            if (!orisCode || !lat || !lon || isNaN(lat) || isNaN(lon)) {
              return;
            }

            // Get other fields with fallbacks
            const annualGenField = row.PLNGENAN || row['Plant annual net generation (MWh)'] || '';
            const capacityFactorField = row.CAPFAC || row['Plant capacity factor'] || '';
            const nameplateCapField = row.NAMEPCAP || row['Plant nameplate capacity (MW)'] || '';
            const co2Field = row.PLCO2AN || row['Plant annual CO2 emissions (tons)'] || '';
            const noxField = row.PLNOXAN || row['Plant annual NOx emissions (tons)'] || '';
            const so2Field = row.PLSO2AN || row['Plant annual SO2 emissions (tons)'] || '';
            const heatInputField = row.PLHTIAN || row['Plant annual heat input from combustion (MMBtu)'] || '';
            const primaryFuelField = row.PLPRMFL || row['Plant primary fuel'] || '';
            const fuelCategoryField = row.PLFUELCT || row['Plant primary fuel category'] || '';
            const numGenField = row.NUMGEN || row['Number of generators'] || '';
            const utilityField = row.UTLSRVNM || row['Utility name'] || '';
            const sectorField = row.SECTOR || row['Plant-level sector'] || '';
            const yearField = row.YEAR || row['Data Year'] || '2021';

            const plant = {
              orisCode: orisCode,
              plantName: (plantNameField || 'Unknown Plant').substring(0, 255),
              stateAbbr: (stateField || 'XX').substring(0, 2),
              countyName: (countyField || 'Unknown County').substring(0, 100),
              latitude: lat,
              longitude: lon,
              nameplateCapacityMw: this.parseFloat(nameplateCapField),
              annualGenerationMwh: this.parseFloat(annualGenField),
              capacityFactor: this.parseFloat(capacityFactorField),
              annualCo2EmissionsTons: this.parseFloat(co2Field),
              annualNoxEmissionsTons: this.parseFloat(noxField),
              annualSo2EmissionsTons: this.parseFloat(so2Field),
              annualHeatInputMmbtu: this.parseFloat(heatInputField),
              primaryFuel: (primaryFuelField || 'Unknown').substring(0, 50),
              fuelCategory: this.mapFuelCategory(fuelCategoryField || primaryFuelField || 'Other'),
              numGenerators: this.parseInt(numGenField) || 1,
              utilityName: (utilityField || 'Unknown Utility').substring(0, 255),
              sector: (sectorField || 'Unknown').substring(0, 50),
              dataYear: this.parseInt(yearField) || 2021
            };

            plants.push(plant);
          } catch (error) {
            console.warn('Error processing plant row:', error);
          }
        })
        .on('end', async () => {
          try {
            console.log(`Processing ${plants.length} plants...`);
            if (plants.length > 0) {
              await this.batchInsertPlants(plants);
              console.log('Plants data ingested successfully');
            } else {
              console.log('No valid plant data found to insert');
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async ingestStateTotals(): Promise<void> {
    console.log('Ingesting state totals data...');
    const filePath = path.join(__dirname, '../../data/ST21-Table1.csv');
    
    const stateTotals: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            // Handle different possible column headers and skip invalid entries
            const stateField = row.PSTATABB || row.STATE || row['State abbreviation'] || '';
            const genField = row.STNGENAN || row['State annual net generation (MWh)'] || '';
            const co2Field = row.STCO2AN || row['State annual CO2 emissions (tons)'] || '';
            const noxField = row.STNOXAN || row['State annual NOx emissions (tons)'] || '';
            const so2Field = row.STSO2AN || row['State annual SO2 emissions (tons)'] || '';
            const capacityField = row.STNAMEPCAP || row['State nameplate capacity (MW)'] || '';
            const yearField = row.YEAR || row['Data Year'] || '2021';
            
            // Skip header row and invalid entries
            if (!stateField || stateField === 'PSTATABB' || stateField === 'STATE' || 
                stateField === 'State abbreviation' || stateField.length !== 2) {
              return;
            }

            const stateTotal = {
              stateAbbr: stateField.substring(0, 2),
              totalNameplateCapacityMw: this.parseFloat(capacityField),
              totalAnnualGenerationMwh: this.parseFloat(genField),
              totalAnnualCo2EmissionsTons: this.parseFloat(co2Field),
              totalAnnualNoxEmissionsTons: this.parseFloat(noxField),
              totalAnnualSo2EmissionsTons: this.parseFloat(so2Field),
              dataYear: this.parseInt(yearField) || 2021
            };

            stateTotals.push(stateTotal);
          } catch (error) {
            console.warn('Error processing state total row:', error);
          }
        })
        .on('end', async () => {
          try {
            console.log(`Processing ${stateTotals.length} state totals...`);
            if (stateTotals.length > 0) {
              await this.batchInsertStateTotals(stateTotals);
              
              // Update plant counts
              await this.updatePlantCounts();
              
              console.log('State totals data ingested successfully');
            } else {
              console.log('No valid state totals data found to insert');
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async ingestDemographics(): Promise<void> {
    console.log('Ingesting demographics data...');
    const filePath = path.join(__dirname, '../../data/DEMO21-Table1.csv');
    
    const demographics: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            // Handle different possible column headers and skip invalid entries
            const orisField = row.ORISPL || row.ORIS || row['DOE/EIA ORIS plant or facility code'] || '';
            const totalPopField = row.TOTALPOP || row['Total Population'] || '';
            const distanceField = row.DISTANCE || row['Distance (miles)'] || '';
            const demoIndexField = row.N_D_INDEX_PER || row['National percentile for Demographic Index'] || '';
            const lowIncomeField = row.N_D_INCOME_PER || row['National percentile for Low Income'] || '';
            const peopleColorField = row.N_D_MINOR_PER || row['National percentile for People of Color'] || '';
            const limitedEngField = row.N_D_LING_PER || row['National percentile for Limited English Speaking'] || '';
            const over64Field = row.N_D_OVER64_PER || row['National percentile for Over Age 64'] || '';
            const under5Field = row.N_D_UNDER5_PER || row['National percentile for Under Age 5'] || '';
            const lessHsField = row.N_D_LESSHS_PER || row['National percentile for Less Than High School Education'] || '';
            
            // Skip header row and invalid entries
            if (!orisField || orisField === 'ORISPL' || orisField === 'ORIS' || 
                orisField === 'DOE/EIA ORIS plant or facility code') {
              return;
            }

            const orisCode = this.parseInt(orisField);
            if (!orisCode) {
              return;
            }

            const demographic = {
              orisCode: orisCode,
              totalPopulation: this.parseStringWithCommas(totalPopField),
              bufferDistanceMiles: this.parseFloat(distanceField) || 3.0, // Default buffer distance
              demographicIndexPercentile: this.parseFloat(demoIndexField),
              lowIncomePercentile: this.parseFloat(lowIncomeField),
              peopleOfColorPercentile: this.parseFloat(peopleColorField),
              limitedEnglishPercentile: this.parseFloat(limitedEngField),
              overAge64Percentile: this.parseFloat(over64Field),
              underAge5Percentile: this.parseFloat(under5Field),
              lessThanHsEducationPercentile: this.parseFloat(lessHsField)
            };

            demographics.push(demographic);
          } catch (error) {
            console.warn('Error processing demographics row:', error);
          }
        })
        .on('end', async () => {
          try {
            console.log(`Processing ${demographics.length} demographics records...`);
            if (demographics.length > 0) {
              await this.batchInsertDemographics(demographics);
              console.log('Demographics data ingested successfully');
            } else {
              console.log('No valid demographics data found to insert');
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async batchInsertPlants(plants: any[]): Promise<void> {
    const batchSize = 1000;
    for (let i = 0; i < plants.length; i += batchSize) {
      const batch = plants.slice(i, i + batchSize);
      
      const sql = `
        INSERT INTO plants (
          orisCode, plantName, stateAbbr, countyName, latitude, longitude,
          nameplateCapacityMw, annualGenerationMwh, capacityFactor,
          annualCo2EmissionsTons, annualNoxEmissionsTons, annualSo2EmissionsTons,
          annualHeatInputMmbtu, primaryFuel, fuelCategory, numGenerators,
          utilityName, sector, dataYear
        ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
        ON DUPLICATE KEY UPDATE
          plantName = VALUES(plantName),
          stateAbbr = VALUES(stateAbbr),
          countyName = VALUES(countyName),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          nameplateCapacityMw = VALUES(nameplateCapacityMw),
          annualGenerationMwh = VALUES(annualGenerationMwh),
          capacityFactor = VALUES(capacityFactor),
          annualCo2EmissionsTons = VALUES(annualCo2EmissionsTons),
          annualNoxEmissionsTons = VALUES(annualNoxEmissionsTons),
          annualSo2EmissionsTons = VALUES(annualSo2EmissionsTons),
          annualHeatInputMmbtu = VALUES(annualHeatInputMmbtu),
          primaryFuel = VALUES(primaryFuel),
          fuelCategory = VALUES(fuelCategory),
          numGenerators = VALUES(numGenerators),
          utilityName = VALUES(utilityName),
          sector = VALUES(sector),
          dataYear = VALUES(dataYear)
      `;

      const params = batch.flatMap(plant => [
        plant.orisCode,
        plant.plantName,
        plant.stateAbbr,
        plant.countyName,
        plant.latitude,
        plant.longitude,
        plant.nameplateCapacityMw,
        plant.annualGenerationMwh,
        plant.capacityFactor,
        plant.annualCo2EmissionsTons,
        plant.annualNoxEmissionsTons,
        plant.annualSo2EmissionsTons,
        plant.annualHeatInputMmbtu,
        plant.primaryFuel,
        plant.fuelCategory,
        plant.numGenerators,
        plant.utilityName,
        plant.sector,
        plant.dataYear
      ]);

      await this.db.query(sql, params);
      console.log(`Inserted plants batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(plants.length / batchSize)}`);
    }
  }

  private async batchInsertStateTotals(stateTotals: any[]): Promise<void> {
    if (stateTotals.length === 0) {
      console.log('No state totals data to insert');
      return;
    }

    const sql = `
      INSERT INTO state_totals (
        stateAbbr, totalNameplateCapacityMw, totalAnnualGenerationMwh,
        totalAnnualCo2EmissionsTons, totalAnnualNoxEmissionsTons,
        totalAnnualSo2EmissionsTons, dataYear
      ) VALUES ${stateTotals.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}
      ON DUPLICATE KEY UPDATE
        totalNameplateCapacityMw = VALUES(totalNameplateCapacityMw),
        totalAnnualGenerationMwh = VALUES(totalAnnualGenerationMwh),
        totalAnnualCo2EmissionsTons = VALUES(totalAnnualCo2EmissionsTons),
        totalAnnualNoxEmissionsTons = VALUES(totalAnnualNoxEmissionsTons),
        totalAnnualSo2EmissionsTons = VALUES(totalAnnualSo2EmissionsTons),
        dataYear = VALUES(dataYear)
    `;

    const params = stateTotals.flatMap(state => [
      state.stateAbbr,
      state.totalNameplateCapacityMw,
      state.totalAnnualGenerationMwh,
      state.totalAnnualCo2EmissionsTons,
      state.totalAnnualNoxEmissionsTons,
      state.totalAnnualSo2EmissionsTons,
      state.dataYear
    ]);

    await this.db.query(sql, params);
  }

  private async batchInsertDemographics(demographics: any[]): Promise<void> {
    if (demographics.length === 0) {
      console.log('No demographics data to insert');
      return;
    }

    // First, get all valid ORIS codes from the plants table
    console.log('Fetching valid ORIS codes from plants table...');
    const validOrisQuery = 'SELECT DISTINCT orisCode FROM plants';
    const validOrisResults = await this.db.query(validOrisQuery);
    const validOrisCodes = new Set(validOrisResults.map((row: any) => row.orisCode));
    
    // Filter demographics to only include those with valid ORIS codes
    const validDemographics = demographics.filter(demo => validOrisCodes.has(demo.orisCode));
    const invalidCount = demographics.length - validDemographics.length;
    
    if (invalidCount > 0) {
      console.log(`Filtered out ${invalidCount} demographics records with invalid ORIS codes`);
    }
    
    if (validDemographics.length === 0) {
      console.log('No valid demographics data to insert after filtering');
      return;
    }

    const batchSize = 1000;
    for (let i = 0; i < validDemographics.length; i += batchSize) {
      const batch = validDemographics.slice(i, i + batchSize);
      
      const sql = `
        INSERT INTO plant_demographics (
          orisCode, totalPopulation, bufferDistanceMiles,
          demographicIndexPercentile, lowIncomePercentile, peopleOfColorPercentile,
          limitedEnglishPercentile, overAge64Percentile, underAge5Percentile,
          lessThanHsEducationPercentile
        ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
        ON DUPLICATE KEY UPDATE
          totalPopulation = VALUES(totalPopulation),
          bufferDistanceMiles = VALUES(bufferDistanceMiles),
          demographicIndexPercentile = VALUES(demographicIndexPercentile),
          lowIncomePercentile = VALUES(lowIncomePercentile),
          peopleOfColorPercentile = VALUES(peopleOfColorPercentile),
          limitedEnglishPercentile = VALUES(limitedEnglishPercentile),
          overAge64Percentile = VALUES(overAge64Percentile),
          underAge5Percentile = VALUES(underAge5Percentile),
          lessThanHsEducationPercentile = VALUES(lessThanHsEducationPercentile)
      `;

      const params = batch.flatMap(demo => [
        demo.orisCode,
        demo.totalPopulation,
        demo.bufferDistanceMiles,
        demo.demographicIndexPercentile,
        demo.lowIncomePercentile,
        demo.peopleOfColorPercentile,
        demo.limitedEnglishPercentile,
        demo.overAge64Percentile,
        demo.underAge5Percentile,
        demo.lessThanHsEducationPercentile
      ]);

      await this.db.query(sql, params);
      console.log(`Inserted demographics batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validDemographics.length / batchSize)}`);
    }
  }

  private async updatePlantCounts(): Promise<void> {
    console.log('Updating plant counts in state_totals...');
    const sql = `
      UPDATE state_totals st
      SET totalPlants = (
        SELECT COUNT(*)
        FROM plants p
        WHERE p.stateAbbr = st.stateAbbr
      )
    `;
    await this.db.query(sql);
  }

  private mapFuelCategory(fuelType: string): string {
    const fuelMap: { [key: string]: string } = {
      'COAL': 'Coal',
      'GAS': 'Natural Gas',
      'NG': 'Natural Gas',
      'OIL': 'Oil',
      'NUCLEAR': 'Nuclear',
      'HYDRO': 'Hydro',
      'WAT': 'Hydro',
      'WIND': 'Wind',
      'SOLAR': 'Solar',
      'BIOMASS': 'Biomass',
      'GEOTHERMAL': 'Geothermal'
    };

    return fuelMap[fuelType.toUpperCase()] || 'Other';
  }

  private parseFloat(value: string): number | null {
    if (!value || value === '' || value === '--' || value === 'NA') {
      return null;
    }
    const parsed = parseFloat(value.replace(',', ''));
    return isNaN(parsed) ? null : parsed;
  }

  private parseInt(value: string): number | null {
    if (!value || value === '' || value === '--' || value === 'NA') {
      return null;
    }
    const parsed = parseInt(value.replace(',', ''));
    return isNaN(parsed) ? null : parsed;
  }

  private parseStringWithCommas(value: string): number | null {
    if (!value || value === '' || value === '--' || value === 'NA') {
      return null;
    }
    const cleaned = value.replace(/,/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
}

// Run the ingestion if this script is executed directly
if (require.main === module) {
  const ingester = new EGridDataIngester();
  ingester.initialize()
    .then(() => ingester.ingestAllData())
    .then(() => {
      console.log('Data ingestion completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Data ingestion failed:', error);
      process.exit(1);
    });
}

export { EGridDataIngester }; 