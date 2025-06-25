# US Power Plants API

Backend API for US power plant data visualization with authentication, caching, and 3-table database architecture.

## Features

- 🔐 **JWT Authentication** - Secure API access with token-based authentication
- ⚡ **Redis Caching** - High-performance data caching for improved response times
- 🗄️ **3-Table Architecture** - Optimized database schema for plant data, state totals, and demographics
- 📊 **Comprehensive Analytics** - State-level percentages, rankings, and plant comparisons
- 🐳 **Docker Ready** - Fully containerized with automated setup
- 📖 **API Documentation** - Interactive Swagger documentation

## Database Schema

### Tables:
1. **plants** - Main power plant data (ORIS codes, names, locations, generation, emissions)
2. **state_totals** - Aggregated state-level totals for percentage calculations  
3. **plant_demographics** - Environmental justice and demographic data

## Quick Start

### Prerequisites

The required EPA eGRID 2021 datasets are already included in the `data/` directory:
- `data/PLNT21-Table1.csv` - Plant-level data
- `data/ST21-Table1.csv` - State totals data  
- `data/DEMO21-Table1.csv` - Demographics data

### Start with Docker Compose (Recommended)

```bash
# Build and start all services (includes database setup, Redis, and data seeding)
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

The docker-compose will automatically:
1. Start **Redis** cache server
2. Start **MySQL** database with health checks
3. Run **database migrations** to create tables
4. **Seed database** with CSV data automatically
5. Start the **API server** with caching enabled

**✅ Fully automated setup!** The system is ready to use after `docker-compose up --build`.

## API Authentication

This API uses JWT token authentication. Get your token first:

```bash
# Generate authentication token
curl -X POST http://localhost:3000/api/v1/auth/token

# Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "1h"
  }
}
```

Use the token in subsequent requests:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/plants
```

## API Endpoints

### Core Endpoints
- `GET /` - API info and usage examples
- `GET /api-docs` - Interactive Swagger documentation
- `POST /api/v1/auth/token` - Generate authentication token

### Health & Monitoring
- `GET /api/v1/health` - API health check
- `GET /api/v1/health/cache` - Redis cache health and statistics

### Data Endpoints (🔐 Authentication Required)
- `GET /api/v1/plants` - Power plants data with filtering and analytics
- `GET /api/v1/map-data` - Specialized data for map visualizations

## Docker Services

When you run `docker-compose up --build`, the following services start:

1. **redis** - Redis cache server (port 6379)
2. **db** - MySQL database (port 3306) with health checks
3. **seed** - Data ingestion service (runs once, then exits)
4. **app** - Main API server (port 3000) with Redis caching

## Manual Setup (Development)

### Install Dependencies
```bash
npm install
```

### Environment Variables
Create `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=powerplants
DB_USER=powerplant_user
DB_PASSWORD=powerplant_pass

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# API
PORT=3000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
```

### Development Server
```bash
# Start with tests
npm start

# Development mode with hot reload
npm run dev

# Production mode
npm run start:prod
```

### Manual Data Ingestion
```bash
# Ingest CSV data into database
npm run ingest-egrid
```

## API Usage Examples

### Authentication
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/token | jq -r '.data.token')
```

### Data Queries
```bash
# Get top 10 plants nationally
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/plants?limit=10"

# Get top 5 plants in California  
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/plants?limit=5&state=CA"

# Search for specific plant
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/plants?state=CA&plantName=Diablo"

# Filter by fuel type
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/plants?fuelCategory=Nuclear&limit=15"

# Get map data for Texas
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/map-data?state=TX"
```

### Health Monitoring
```bash
# Check API health
curl http://localhost:3000/api/v1/health

# Check cache performance
curl http://localhost:3000/api/v1/health/cache
```

## Use Cases Supported

✅ **JWT Authentication** - Secure API access  
✅ **High-Performance Caching** - Redis-powered response optimization  
✅ **Top N Plants** - `/api/v1/plants?limit=20`  
✅ **State Filtering** - `/api/v1/plants?state=CA`  
✅ **Plant Search** - `/api/v1/plants?plantName=Diablo`  
✅ **Fuel Filtering** - `/api/v1/plants?fuelCategory=Nuclear`  
✅ **Map Visualizations** - `/api/v1/map-data` with state percentages  
✅ **Health Monitoring** - API and cache health endpoints  

## Available Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start with tests, then run server
- `npm run start:prod` - Start production server
- `npm run dev` - Development server with hot reload
- `npm run test` - Run test suite
- `npm run test:quick` - Quick test run (silent)
- `npm run ingest-egrid` - Ingest CSV datasets into database
- `npm run lint` - ESLint code checking
- `npm run format` - Prettier code formatting

## Technology Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: MySQL 8.0 with Sequelize ORM
- **Cache**: Redis 7
- **Authentication**: JWT tokens
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose
- **Code Quality**: ESLint + Prettier

## Version

**API Version**: 2.0.0  
**Features**: Authentication, Redis caching, enhanced analytics, comprehensive health monitoring 