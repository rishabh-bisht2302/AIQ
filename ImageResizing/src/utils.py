"""
Utility functions for the image processing system.
"""
import os
import logging
from typing import Callable, Dict
import numpy as np


def setup_logging(level: str = "INFO"):
    """
    Set up logging configuration.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def ensure_directory(path: str):
    """
    Ensure a directory exists, create if it doesn't.
    
    Args:
        path: Directory path
    """
    os.makedirs(path, exist_ok=True)


def get_colormap(colormap_name: str) -> Callable:
    """
    Get a color mapping function for the given colormap name.
    
    Args:
        colormap_name: Name of the colormap
        
    Returns:
        Function that maps grayscale values to RGB
    """
    if colormap_name == 'grayscale':
        def grayscale_map(value: int) -> tuple:
            return (value, value, value)
        return grayscale_map
    
    # For other colormaps, we use matplotlib which is handled in image_generation.py
    raise NotImplementedError(f"Colormap {colormap_name} should be handled by matplotlib")


def validate_csv_structure(df) -> bool:
    """
    Validate that the CSV has the expected structure.
    
    Args:
        df: Pandas DataFrame
        
    Returns:
        True if valid, raises ValueError if not
    """
    # Check for depth column
    if 'depth' not in df.columns:
        raise ValueError("CSV must contain a 'depth' column")
    
    # Check for pixel columns
    expected_cols = [f'col{i}' for i in range(1, 201)]
    missing_cols = [col for col in expected_cols if col not in df.columns]
    
    if missing_cols:
        raise ValueError(f"Missing columns: {missing_cols[:5]}... (showing first 5)")
    
    # Check data types
    if not np.issubdtype(df['depth'].dtype, np.number):
        raise ValueError("Depth column must contain numeric values")
    
    return True


def calculate_stats(data: np.ndarray) -> Dict[str, float]:
    """
    Calculate statistics for image data.
    
    Args:
        data: Numpy array of pixel values
        
    Returns:
        Dictionary with statistics
    """
    return {
        'min': float(np.min(data)),
        'max': float(np.max(data)),
        'mean': float(np.mean(data)),
        'std': float(np.std(data)),
        'median': float(np.median(data))
    } 