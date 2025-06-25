#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script settings
set -e  # Exit on error

echo -e "${GREEN}=== Depth Image Processing System Startup ===${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Parse command line arguments
USE_DOCKER=false
SKIP_TESTS=false
SKIP_DATA_LOAD=false
FORCE_RECREATE_DB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker|-d)
            USE_DOCKER=true
            shift
            ;;
        --local|-l)
            USE_DOCKER=false
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-data)
            SKIP_DATA_LOAD=true
            shift
            ;;
        --recreate-db)
            FORCE_RECREATE_DB=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./start.sh [options]"
            echo ""
            echo "Options:"
            echo "  --docker, -d     Force Docker usage"
            echo "  --local, -l      Force local execution"
            echo "  --skip-tests     Skip running tests"
            echo "  --skip-data      Skip data loading"
            echo "  --recreate-db    Force database recreation (drops all tables)"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "By default, Docker will be used if available."
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to check if Docker is available
check_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Auto-detect Docker if not explicitly set
if [ "$USE_DOCKER" == false ] && [ "$1" != "--local" ] && check_docker; then
    USE_DOCKER=true
fi

# Function to wait for MongoDB to be ready
wait_for_mongodb() {
    print_info "Waiting for MongoDB to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            print_status "MongoDB is ready!"
            return 0
        fi
        retries=$((retries - 1))
        sleep 1
    done
    print_error "MongoDB failed to start"
    return 1
}

# Function to run database migrations
run_migrations_docker() {
    print_info "Running database initialization..."
    if docker-compose run --rm app python -c "
from src.database import init_db
init_db()
print('Database collection created successfully!')
"; then
        print_status "Database initialization completed!"
        return 0
    else
        print_error "Database initialization failed!"
        return 1
    fi
}

run_migrations_local() {
    print_info "Running database initialization..."
    python -c "
from src.database import init_db
init_db()
print('Database collection created successfully!')
"
    if [ $? -eq 0 ]; then
        print_status "Database initialization completed!"
        return 0
    else
        print_error "Database initialization failed!"
        return 1
    fi
}

# Docker-based startup
if [ "$USE_DOCKER" == true ]; then
    print_info "Starting with Docker Compose..."
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found!"
        exit 1
    fi
    
    # Stop any existing containers
    print_info "Stopping existing containers..."
    docker-compose down
    
    # Build images
    print_info "Building Docker images..."
    docker-compose build --no-cache
    
    # Start MongoDB first
    print_info "Starting MongoDB..."
    docker-compose up -d mongodb
    
    # Wait for MongoDB to be ready
    wait_for_mongodb
    
    # Load data unless skipped
    if [ "$SKIP_DATA_LOAD" == false ]; then
        print_info "Processing CSV data..."
        # Use --clear-db flag if --recreate-db was specified
        CLEAR_DB_FLAG=""
        if [ "$FORCE_RECREATE_DB" == true ]; then
            CLEAR_DB_FLAG="--clear-db"
            print_info "Database will be recreated due to --recreate-db flag"
        fi
        if docker-compose run --rm app python main.py /app/data/SampleDataProject2.csv $CLEAR_DB_FLAG; then
            print_status "Data processing completed!"
        else
            print_error "Data processing failed!"
            print_info "Note: If you see duplicate key errors, try using --recreate-db flag."
            print_info "The --recreate-db flag will recreate tables with the new schema."
            exit 1
        fi
    else
        print_info "Skipping data loading (--skip-data flag)"
    fi
    
    # Run tests unless skipped
    if [ "$SKIP_TESTS" == false ]; then
        print_info "Running tests..."
        if docker-compose run --rm -e PYTHONPATH=/app app pytest; then
            print_status "All tests passed!"
        else
            print_error "Tests failed! Check the output above."
            read -p "Do you want to continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        print_info "Skipping tests (--skip-tests flag)"
    fi
    
    # Start the API server
    print_info "Starting API server..."
    docker-compose up -d app
    
    print_status "Application started successfully!"
    print_info "API is available at http://localhost:8000"
    print_info "MongoDB is available at localhost:27017"
    print_info ""
    print_info "To view logs: docker-compose logs -f"
    print_info "To stop: docker-compose down"
    
else
    # Local startup (without Docker)
    print_info "Starting locally (without Docker)..."
    
    # Check Python version
    if command -v python3 &> /dev/null; then
        PYTHON_CMD=python3
        PIP_CMD=pip3
    else
        print_error "Python 3 is required but not found!"
        exit 1
    fi
    
    # Check Python version is 3.8+
    PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    REQUIRED_VERSION="3.8"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Python $REQUIRED_VERSION or higher is required (found $PYTHON_VERSION)"
        exit 1
    fi
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        $PYTHON_CMD -m venv venv
        print_status "Virtual environment created"
    else
        print_info "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip
    print_info "Upgrading pip..."
    pip install --upgrade pip
    
    # Install dependencies
    print_info "Installing dependencies..."
    pip install -r requirements.txt
    
    # Run database migrations
    if ! run_migrations_local; then
        exit 1
    fi
    
    # Load data unless skipped
    if [ "$SKIP_DATA_LOAD" == false ]; then
        print_info "Processing CSV data..."
        # Use --clear-db flag if --recreate-db was specified
        CLEAR_DB_FLAG=""
        if [ "$FORCE_RECREATE_DB" == true ]; then
            CLEAR_DB_FLAG="--clear-db"
            print_info "Database will be recreated due to --recreate-db flag"
        fi
        if python main.py data/SampleDataProject2.csv $CLEAR_DB_FLAG; then
            print_status "Data processing completed!"
        else
            print_error "Data processing failed!"
            print_info "Note: If you see duplicate key errors, try using --recreate-db flag."
            print_info "The --recreate-db flag will recreate tables with the new schema."
            exit 1
        fi
    else
        print_info "Skipping data loading (--skip-data flag)"
    fi
    
    # Run tests unless skipped
    if [ "$SKIP_TESTS" == false ]; then
        print_info "Running tests..."
        # Set PYTHONPATH to include current directory
        export PYTHONPATH="${PYTHONPATH:+${PYTHONPATH}:}$(pwd)"
        if pytest; then
            print_status "All tests passed!"
        else
            print_error "Tests failed! Check the output above."
            read -p "Do you want to continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        print_info "Skipping tests (--skip-tests flag)"
    fi
    
    # Start the API server
    print_info "Starting API server..."
    print_status "Application started successfully!"
    print_info "API will be available at http://localhost:8000"
    print_info "API Documentation will be available at http://localhost:8000/redoc"
    print_info "Press Ctrl+C to stop the server"
    
    # Run the server
    uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
fi 