-- Database initialization script for power plants
USE powerplants;

-- Main Plants Table
CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    orisCode INTEGER UNIQUE NOT NULL,              -- DOE/EIA facility code
    plantName VARCHAR(255) NOT NULL,
    stateAbbr CHAR(2) NOT NULL,
    countyName VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    nameplateCapacityMw DECIMAL(10, 2),           -- Primary ranking metric
    annualGenerationMwh DECIMAL(15, 2),           -- Secondary ranking metric  
    capacityFactor DECIMAL(6, 2),                 -- Efficiency metric (as percentage)
    annualCo2EmissionsTons DECIMAL(15, 2),       -- Major ranking/color metric
    annualNoxEmissionsTons DECIMAL(10, 2),
    annualSo2EmissionsTons DECIMAL(10, 2),
    annualHeatInputMmbtu DECIMAL(15, 2),
    primaryFuel VARCHAR(50),                       -- Detailed fuel type
    fuelCategory VARCHAR(20),                      -- Simplified category for UI
    numGenerators INTEGER,
    utilityName VARCHAR(255),
    sector VARCHAR(50),
    dataYear INTEGER DEFAULT 2021,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- State Totals Table (for percentage calculations)
CREATE TABLE IF NOT EXISTS state_totals (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    stateAbbr CHAR(2) UNIQUE NOT NULL,
    totalNameplateCapacityMw DECIMAL(12, 2),
    totalAnnualGenerationMwh DECIMAL(18, 2),
    totalAnnualCo2EmissionsTons DECIMAL(18, 2),
    totalAnnualNoxEmissionsTons DECIMAL(15, 2),
    totalAnnualSo2EmissionsTons DECIMAL(15, 2),
    totalPlants INTEGER,
    dataYear INTEGER DEFAULT 2021
);

-- Demographics Table (optional - for advanced analytics)
CREATE TABLE IF NOT EXISTS plant_demographics (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    orisCode INTEGER NOT NULL,
    totalPopulation INTEGER,
    bufferDistanceMiles DECIMAL(5, 2),
    demographicIndexPercentile DECIMAL(5, 2),
    lowIncomePercentile DECIMAL(5, 2),
    peopleOfColorPercentile DECIMAL(5, 2),
    limitedEnglishPercentile DECIMAL(5, 2),
    overAge64Percentile DECIMAL(5, 2),
    underAge5Percentile DECIMAL(5, 2),
    lessThanHsEducationPercentile DECIMAL(5, 2),
    
    FOREIGN KEY (orisCode) REFERENCES plants(orisCode),
    INDEX idx_oris_demo (orisCode)
);

-- Create indexes for performance
CREATE INDEX idx_state ON plants(stateAbbr);
CREATE INDEX idx_capacity ON plants(nameplateCapacityMw DESC);
CREATE INDEX idx_generation ON plants(annualGenerationMwh DESC);
CREATE INDEX idx_co2 ON plants(annualCo2EmissionsTons DESC);
CREATE INDEX idx_location ON plants(latitude, longitude);
CREATE INDEX idx_fuel ON plants(fuelCategory);
CREATE INDEX idx_oris ON plants(orisCode);
CREATE INDEX idx_state_abbr ON state_totals(stateAbbr); 