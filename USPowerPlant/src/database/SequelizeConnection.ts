import { Sequelize, DataTypes, Model } from 'sequelize';

// Define the PowerPlant model interface
export interface PowerPlantAttributes {
  id?: number;
  orisCode: number;
  plantName: string;
  stateAbbr: string;
  countyName?: string;
  latitude: number;
  longitude: number;
  nameplateCapacityMw?: number;
  annualGenerationMwh?: number;
  capacityFactor?: number;
  annualCo2EmissionsTons?: number;
  annualNoxEmissionsTons?: number;
  annualSo2EmissionsTons?: number;
  annualHeatInputMmbtu?: number;
  primaryFuel?: string;
  fuelCategory?: string;
  numGenerators?: number;
  utilityName?: string;
  sector?: string;
  dataYear?: number;
}

// Define the StateTotals model interface
export interface StateTotalsAttributes {
  id?: number;
  stateAbbr: string;
  totalNameplateCapacityMw?: number;
  totalAnnualGenerationMwh?: number;
  totalAnnualCo2EmissionsTons?: number;
  totalAnnualNoxEmissionsTons?: number;
  totalAnnualSo2EmissionsTons?: number;
  totalPlants?: number;
  dataYear?: number;
}

// Define the PlantDemographics model interface
export interface PlantDemographicsAttributes {
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

// PowerPlant model class
export class PowerPlantModel extends Model<PowerPlantAttributes> implements PowerPlantAttributes {
  public id!: number;
  public orisCode!: number;
  public plantName!: string;
  public stateAbbr!: string;
  public countyName?: string;
  public latitude!: number;
  public longitude!: number;
  public nameplateCapacityMw?: number;
  public annualGenerationMwh?: number;
  public capacityFactor?: number;
  public annualCo2EmissionsTons?: number;
  public annualNoxEmissionsTons?: number;
  public annualSo2EmissionsTons?: number;
  public annualHeatInputMmbtu?: number;
  public primaryFuel?: string;
  public fuelCategory?: string;
  public numGenerators?: number;
  public utilityName?: string;
  public sector?: string;
  public dataYear?: number;

  // timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// StateTotals model class
export class StateTotalsModel extends Model<StateTotalsAttributes> implements StateTotalsAttributes {
  public id!: number;
  public stateAbbr!: string;
  public totalNameplateCapacityMw?: number;
  public totalAnnualGenerationMwh?: number;
  public totalAnnualCo2EmissionsTons?: number;
  public totalAnnualNoxEmissionsTons?: number;
  public totalAnnualSo2EmissionsTons?: number;
  public totalPlants?: number;
  public dataYear?: number;
}

// PlantDemographics model class
export class PlantDemographicsModel extends Model<PlantDemographicsAttributes> implements PlantDemographicsAttributes {
  public id!: number;
  public orisCode!: number;
  public totalPopulation?: number;
  public bufferDistanceMiles?: number;
  public demographicIndexPercentile?: number;
  public lowIncomePercentile?: number;
  public peopleOfColorPercentile?: number;
  public limitedEnglishPercentile?: number;
  public overAge64Percentile?: number;
  public underAge5Percentile?: number;
  public lessThanHsEducationPercentile?: number;
}

export class SequelizeConnection {
  private static instance: SequelizeConnection;
  private sequelize: Sequelize | null = null;
  public PowerPlant!: typeof PowerPlantModel;
  public StateTotals!: typeof StateTotalsModel;
  public PlantDemographics!: typeof PlantDemographicsModel;

  private constructor() {}

  public static getInstance(): SequelizeConnection {
    if (!SequelizeConnection.instance) {
      SequelizeConnection.instance = new SequelizeConnection();
    }
    return SequelizeConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.sequelize = new Sequelize({
        dialect: 'mysql',
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '3306'),
        username: process.env['DB_USER'] || 'powerplant_user',
        password: process.env['DB_PASSWORD'] || 'powerplant_pass',
        database: process.env['DB_NAME'] || 'powerplants',
        logging: process.env['NODE_ENV'] === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
      });

      // Initialize all models
      this.initModels();

      // Define associations
      this.defineAssociations();

      // Test connection
      await this.sequelize.authenticate();
      console.log('Sequelize database connected successfully');
    } catch (error) {
      console.error('Sequelize database connection failed:', error);
      throw error;
    }
  }

  private initModels(): void {
    // Initialize PowerPlant model
    PowerPlantModel.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        orisCode: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
        plantName: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        stateAbbr: {
          type: DataTypes.STRING(2),
          allowNull: false,
        },
        countyName: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        latitude: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: false,
        },
        longitude: {
          type: DataTypes.DECIMAL(11, 8),
          allowNull: false,
        },
        nameplateCapacityMw: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        annualGenerationMwh: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        capacityFactor: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
        },
        annualCo2EmissionsTons: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        annualNoxEmissionsTons: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        annualSo2EmissionsTons: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        annualHeatInputMmbtu: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        primaryFuel: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        fuelCategory: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        numGenerators: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        utilityName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        sector: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        dataYear: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 2021,
        },
      },
      {
        sequelize: this.sequelize!,
        tableName: 'plants',
        timestamps: false,
        indexes: [
          { fields: ['orisCode'] },
          { fields: ['stateAbbr'] },
          { fields: ['latitude', 'longitude'] },
          { fields: [{ name: 'nameplateCapacityMw', order: 'DESC' }] },
          { fields: [{ name: 'annualGenerationMwh', order: 'DESC' }] },
          { fields: [{ name: 'annualCo2EmissionsTons', order: 'DESC' }] },
          { fields: ['fuelCategory'] },
        ],
      }
    );

    // Initialize StateTotals model
    StateTotalsModel.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        stateAbbr: {
          type: DataTypes.STRING(2),
          allowNull: false,
          unique: true,
        },
        totalNameplateCapacityMw: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: true,
        },
        totalAnnualGenerationMwh: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
        },
        totalAnnualCo2EmissionsTons: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
        },
        totalAnnualNoxEmissionsTons: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        totalAnnualSo2EmissionsTons: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        totalPlants: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        dataYear: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 2021,
        },
      },
      {
        sequelize: this.sequelize!,
        tableName: 'state_totals',
        timestamps: false,
        indexes: [
          { fields: ['stateAbbr'] },
        ],
      }
    );

    // Initialize PlantDemographics model
    PlantDemographicsModel.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        orisCode: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        totalPopulation: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        bufferDistanceMiles: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        demographicIndexPercentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        lowIncomePercentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        peopleOfColorPercentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        limitedEnglishPercentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        overAge64Percentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        underAge5Percentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        lessThanHsEducationPercentile: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
      },
      {
        sequelize: this.sequelize!,
        tableName: 'plant_demographics',
        timestamps: false,
        indexes: [
          { fields: ['orisCode'] },
        ],
      }
    );

    // Assign models to instance
    this.PowerPlant = PowerPlantModel;
    this.StateTotals = StateTotalsModel;
    this.PlantDemographics = PlantDemographicsModel;
  }

  private defineAssociations(): void {
    // PowerPlant has one StateTotals (via state_abbr)
    this.PowerPlant.belongsTo(this.StateTotals, {
      foreignKey: 'stateAbbr',
      targetKey: 'stateAbbr',
      as: 'stateData'
    });
    
    this.StateTotals.hasMany(this.PowerPlant, {
      foreignKey: 'stateAbbr',
      sourceKey: 'stateAbbr',
      as: 'plants'
    });

    // PowerPlant has one PlantDemographics (via oris_code)
    this.PowerPlant.hasOne(this.PlantDemographics, {
      foreignKey: 'orisCode',
      sourceKey: 'orisCode',
      as: 'demographics'
    });
    
    this.PlantDemographics.belongsTo(this.PowerPlant, {
      foreignKey: 'orisCode',
      targetKey: 'orisCode',
      as: 'plant'
    });
  }

  public async disconnect(): Promise<void> {
    if (this.sequelize) {
      await this.sequelize.close();
      this.sequelize = null;
      console.log('Database disconnected');
    }
  }

  public getSequelize(): Sequelize {
    if (!this.sequelize) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.sequelize;
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (!this.sequelize) return false;
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async query(sql: string, replacements: any[] = []): Promise<any> {
    if (!this.sequelize) {
      throw new Error('Database not connected. Call connect() first.');
    }
    const [results] = await this.sequelize.query(sql, { replacements });
    return results;
  }
} 