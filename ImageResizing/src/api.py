"""
FastAPI application for serving image frames based on depth ranges.
"""
from fastapi import FastAPI, Query, HTTPException, Response
from pydantic import BaseModel, Field
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import logging

from src.database import query_data
from src.image_generation import generate_image, get_image_bytes
from config import (
    API_HOST, API_PORT, MIN_DEPTH_VALUE, MAX_DEPTH_VALUE,
    MAX_CONCURRENT_REQUESTS, DEFAULT_COLORMAP, COLORMAPS
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for API documentation
class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Health status of the API")

class RootResponse(BaseModel):
    """Root endpoint response model."""
    message: str = Field(..., description="Welcome message")
    version: str = Field(..., description="API version")

class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str = Field(..., description="Error message details")

# Create FastAPI app with enhanced OpenAPI configuration
app = FastAPI(
    title="Depth Image API",
    description="""
    ## Depth Image Processing API
    
    This API provides endpoints for generating images from depth-based data stored in MongoDB.
    
    ### Features:
    - Query data by depth range
    - Generate images with customizable color maps
    - Asynchronous processing with concurrent request handling
    - Built-in data validation and error handling
    
    ### Available Color Maps:
    - **grayscale**: Standard grayscale visualization
    - **heatmap**: Hot color map for thermal-like visualization  
    - **viridis**: Perceptually uniform color map
    - **plasma**: High contrast plasma color map
    """,
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        }
    ],
    tags_metadata=[
        {
            "name": "health",
            "description": "Health check and status endpoints"
        },
        {
            "name": "images",
            "description": "Image generation and processing endpoints"
        }
    ]
)

# Thread pool for handling concurrent requests
executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_REQUESTS)


@app.get(
    "/",
    response_model=RootResponse,
    tags=["health"],
    summary="Root endpoint",
    description="Returns basic API information and version."
)
async def root():
    """Root endpoint providing API information."""
    return {"message": "Depth Image API", "version": "1.0.0"}


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Health check",
    description="Endpoint for checking API health status.",
    responses={
        200: {
            "description": "API is healthy",
            "content": {
                "application/json": {
                    "example": {"status": "healthy"}
                }
            }
        }
    }
)
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get(
    "/image_frame",
    response_class=Response,
    tags=["images"],
    summary="Generate depth-based image",
    description="""
    Generate and return a PNG image frame for the specified depth range.
    
    The endpoint queries data within the specified depth range and generates
    a visualization using the selected color map.
    
    **Parameters:**
    - `depth_min`: Lower bound of depth range (inclusive)
    - `depth_max`: Upper bound of depth range (inclusive)  
    - `colormap`: Color scheme for visualization
    
    **Returns:**
    - PNG image as binary data
    - Content-Disposition header with suggested filename
    """,
    responses={
        200: {
            "description": "Successfully generated image",
            "content": {
                "image/png": {
                    "example": "Binary PNG image data"
                }
            },
            "headers": {
                "Content-Disposition": {
                    "description": "Suggested filename for the image",
                    "schema": {"type": "string"}
                }
            }
        },
        400: {
            "description": "Invalid parameters",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_range": {
                            "summary": "Invalid depth range",
                            "value": {"detail": "Invalid depth range"}
                        },
                        "out_of_bounds": {
                            "summary": "Depth values out of bounds",
                            "value": {"detail": f"Depth values must be between {MIN_DEPTH_VALUE} and {MAX_DEPTH_VALUE}"}
                        },
                        "invalid_colormap": {
                            "summary": "Invalid colormap",
                            "value": {"detail": f"Invalid colormap. Available options: {list(COLORMAPS.keys())}"}
                        }
                    }
                }
            }
        },
        404: {
            "description": "No data found",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "example": {"detail": "No data in specified depth range"}
                }
            }
        },
        500: {
            "description": "Server error",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "examples": {
                        "database_error": {
                            "summary": "Database query failed",
                            "value": {"detail": "Database query failed"}
                        },
                        "image_error": {
                            "summary": "Image generation failed", 
                            "value": {"detail": "Image generation failed"}
                        }
                    }
                }
            }
        }
    }
)
async def get_image_frame(
    depth_min: float = Query(..., description="Minimum depth value for filtering data", example=0.0),
    depth_max: float = Query(..., description="Maximum depth value for filtering data", example=100.0),
    colormap: Optional[str] = Query(DEFAULT_COLORMAP, description="Color map to apply to the generated image", example=DEFAULT_COLORMAP)
):
    """
    Generate and return an image frame for the specified depth range.
    
    Args:
        depth_min: Minimum depth value
        depth_max: Maximum depth value
        colormap: Color map to apply (optional)
        
    Returns:
        PNG image as binary response
    """
    # Validate depth range
    if depth_min > depth_max:
        raise HTTPException(
            status_code=400,
            detail="Invalid depth range"
        )
    
    # Validate depth values are within bounds
    if depth_min < MIN_DEPTH_VALUE or depth_max > MAX_DEPTH_VALUE:
        raise HTTPException(
            status_code=400,
            detail=f"Depth values must be between {MIN_DEPTH_VALUE} and {MAX_DEPTH_VALUE}"
        )
    
    # Validate colormap
    if colormap not in COLORMAPS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid colormap. Available options: {list(COLORMAPS.keys())}"
        )
    
    # Run database query in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    try:
        data_records = await loop.run_in_executor(
            executor,
            query_data,
            depth_min,
            depth_max
        )
    except Exception as e:
        logger.error(f"Database query error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )
    
    # Check if data exists
    if not data_records:
        raise HTTPException(
            status_code=404,
            detail="No data in specified depth range"
        )
    
    # Generate image in thread pool
    try:
        image = await loop.run_in_executor(
            executor,
            generate_image,
            data_records,
            colormap
        )
        
        image_bytes = await loop.run_in_executor(
            executor,
            get_image_bytes,
            image
        )
        
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Image generation failed"
        )
    
    # Return image as PNG response
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=depth_{depth_min}_{depth_max}.png"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host=API_HOST,
        port=API_PORT,
        reload=True
    ) 