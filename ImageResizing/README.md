# Depth-Based Image Processing System

A Python-based system for processing depth-based image data from CSV files, storing it in a MongoDB database, and serving it via a RESTful API with customizable color mapping.

## Features

- **Data Processing**: Reads CSV files with depth and pixel data, resizes from 200 to 150 columns using linear interpolation
- **Database Storage**: Stores processed data in MongoDB with efficient indexing on depth values
- **RESTful API**: FastAPI-based endpoint to retrieve image frames for specified depth ranges
- **Color Mapping**: Supports multiple colormaps (grayscale, heatmap, viridis, plasma)
- **Dockerized**: Fully containerized application with Docker Compose support
- **Performance**: Handles concurrent requests with async processing
- **Testing**: Comprehensive unit and integration tests

## Project Structure

```
project/
├── src/
│   ├── data_processing.py     # CSV reading and data resizing
│   ├── database.py            # MongoDB interactions
│   ├── image_generation.py    # Image creation with color mapping
│   ├── api.py                 # FastAPI application
│   └── utils.py               # Utility functions
├── tests/
│   ├── test_data_processing.py
│   ├── test_image_generation.py
│   └── test_api.py
├── data/                      # Input CSV files
├── config.py                  # Configuration settings
├── main.py                    # Data processing script
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose setup
└── README.md
```

## Prerequisites

- Python 3.8+
- Docker and Docker Compose
- MongoDB (if running locally)

## Installation

### Quick Start with start.sh (Recommended)

The easiest way to get started is using the provided startup script:

```bash
# Clone the repository
git clone <repository-url>
cd project2_new

# Make script executable
chmod +x start.sh

# Start with Docker (default if Docker is available)
./start.sh

# Or explicitly use Docker
./start.sh --docker

# Or run locally (requires MongoDB)
export MONGODB_URI='mongodb://user:password@localhost:27017/imagedb?authSource=admin'
./start.sh --local
```

#### Available Options:
- `--docker, -d` - Force Docker usage
- `--local, -l` - Force local execution
- `--skip-tests` - Skip running tests
- `--skip-data` - Skip data loading (useful for restarts)
- `--help, -h` - Show help message

The `start.sh` script will:
1. Create a virtual environment (if running locally)
2. Set up the MongoDB database
3. Run database initialization
4. Process the CSV file (unless --skip-data)
5. Run all tests (unless --skip-tests)
6. Start the API server

### Using Docker Compose (Manual)

1. Clone the repository:
```bash
git clone <repository-url>
cd project2_new
```

2. Place your CSV file in the `data/` directory

3. Run with Docker Compose:
```bash
docker-compose up --build
```

This will:
- Start a MongoDB database
- Build and run the application container
- Process the CSV file and populate the database
- Start the API server on http://localhost:8000

### Local Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up MongoDB and update the MONGODB_URI in config.py

3. Process the CSV data:
```bash
python main.py data/SampleDataProject2.csv --clear-db
```

4. Run the API server:
```bash
python -m uvicorn src.api:app --host 0.0.0.0 --port 8000
```

## API Usage

### Endpoints

#### Health Check
```bash
GET /health
```

#### Get Image Frame
```bash
GET /image_frame?depth_min={float}&depth_max={float}&colormap={string}
```

Parameters:
- `depth_min` (required): Minimum depth value
- `depth_max` (required): Maximum depth value
- `colormap` (optional): Color mapping to apply (default: grayscale)
  - Options: grayscale, heatmap, viridis, plasma

Example:
```bash
curl "http://localhost:8000/image_frame?depth_min=100&depth_max=500&colormap=heatmap" \
  --output depth_image.png
```

### Error Responses

- `400 Bad Request`: Invalid depth range or colormap
- `404 Not Found`: No data in specified depth range
- `422 Unprocessable Entity`: Missing required parameters
- `500 Internal Server Error`: Server error

## Configuration

Environment variables can be set in docker-compose.yml or a .env file. See `env.example` for a template:

```bash
# Copy the example file
cp env.example .env

# Edit with your settings
nano .env
```

Available variables:
- `MONGODB_URI`: MongoDB connection string
- `API_HOST`: API server host (default: 0.0.0.0)
- `API_PORT`: API server port (default: 8000)
- `LOG_LEVEL`: Logging level (default: INFO)
- `MAX_CONCURRENT_REQUESTS`: Maximum concurrent API requests (default: 10)
- `RESPONSE_TIMEOUT_SECONDS`: API response timeout (default: 2)

## Data Format

Input CSV should have the following structure:
- Column `depth`: Float values representing depth
- Columns `col1` to `col200`: Float values representing pixel intensities

Example:
```csv
depth,col1,col2,...,col200
100.0,45.2,46.8,...,52.1
200.0,48.3,49.1,...,54.2
```

## Testing

Run tests locally:
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/test_api.py
```

## Performance Considerations

- The system uses database indexing on the depth field for efficient range queries
- Concurrent requests are handled using asyncio and thread pools
- Image data is stored as arrays in MongoDB for optimal performance
- Response time target: < 2 seconds for up to 100 depth ranges

## Development

### Database Operations

The `start.sh` script handles all database operations automatically. For manual control:

```bash
# Run everything (database setup, data load, tests, server)
./start.sh

# Skip data loading (useful for restarts)
./start.sh --skip-data

# Skip tests for faster startup
./start.sh --skip-tests

# Skip both data and tests (fastest startup)
./start.sh --skip-data --skip-tests
```

#### Common Usage Scenarios:

1. **First time setup** (default behavior):
   ```bash
   ./start.sh  # Creates DB, loads data, runs tests, starts server
   ```

2. **Quick restart** (database already populated):
   ```bash
   ./start.sh --skip-data --skip-tests
   ```

3. **Development mode** (skip tests for faster iteration):
   ```bash
   ./start.sh --skip-tests
   ```

4. **Force local execution** (when Docker is available but you want local):
   ```bash
   ./start.sh --local --skip-tests
   ```

### Adding New Colormaps

1. Add the colormap name and matplotlib mapping to `COLORMAPS` in `config.py`
2. The system will automatically handle the new colormap using matplotlib

### Database Schema

Collection: `image_data`
- `depth` (Float, indexed): Depth value
- `data` (Array): Array of 150 float values representing pixel intensities

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI configuration
   - Verify network connectivity

2. **CSV Processing Error**
   - Ensure CSV has correct format (depth + 200 columns)
   - Check for missing or malformed data
   - Verify file permissions

3. **Docker Issues**
   - Run `docker-compose down -v` to clean up volumes
   - Rebuild with `docker-compose build --no-cache`
