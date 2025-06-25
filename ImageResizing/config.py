"""
Configuration settings for the image processing system.
"""
import os
from typing import Dict

# Database configuration
MONGODB_URI = os.environ.get(
    'MONGODB_URI',
    'mongodb://user:password@localhost:27017/imagedb?authSource=admin'
)

# MongoDB database and collection names
DATABASE_NAME = 'imagedb'
COLLECTION_NAME = 'image_data'

# API configuration
API_HOST = os.environ.get('API_HOST', '0.0.0.0')
API_PORT = int(os.environ.get('API_PORT', '8000'))

# Image processing configuration
DEFAULT_COLORMAP = 'grayscale'

# Color map definitions
COLORMAPS: Dict[str, str] = {
    'grayscale': 'grayscale',
    'heatmap': 'hot',
    'viridis': 'viridis',
    'plasma': 'plasma'
}

# Performance settings
MAX_CONCURRENT_REQUESTS = 10
RESPONSE_TIMEOUT_SECONDS = 2

# Data validation
MAX_DEPTH_VALUE = 1e6
MIN_DEPTH_VALUE = -1e6

# Logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO') 