"""
Image generation module for creating PNG images with color mapping.
"""
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Any
import matplotlib.cm as cm
from config import COLORMAPS, DEFAULT_COLORMAP


def normalize_data(data: np.ndarray) -> np.ndarray:
    """
    Normalize data to 0-255 range.
    
    Args:
        data: Input data array
        
    Returns:
        Normalized data in range 0-255
    """
    # Handle edge case of constant data
    if data.min() == data.max():
        return np.full_like(data, 127, dtype=np.uint8)
    
    # Normalize to 0-255 range
    normalized = (data - data.min()) / (data.max() - data.min()) * 255
    return normalized.astype(np.uint8)


def apply_colormap(data: np.ndarray, colormap: str = 'grayscale') -> np.ndarray:
    """
    Apply a color map to grayscale data.
    
    Args:
        data: 2D array of grayscale values (0-255)
        colormap: Name of the colormap to apply
        
    Returns:
        3D array with RGB values
    """
    # Validate colormap
    if colormap not in COLORMAPS:
        colormap = DEFAULT_COLORMAP
    
    # Get matplotlib colormap name
    cm_name = COLORMAPS[colormap]
    
    if colormap == 'grayscale':
        # For grayscale, just repeat values for RGB channels
        rgb_data = np.stack([data, data, data], axis=-1)
    else:
        # Use matplotlib colormap
        cmap = cm.get_cmap(cm_name)
        # Normalize data to 0-1 for colormap
        norm_data = data / 255.0
        # Apply colormap (returns RGBA, we take RGB)
        rgb_data = (cmap(norm_data)[:, :, :3] * 255).astype(np.uint8)
    
    return rgb_data


def generate_image(data_records: List[Dict[str, Any]], colormap: str = 'grayscale') -> Image.Image:
    """
    Generate a PNG image from database records.
    
    Args:
        data_records: List of records with 'depth' and 'data' fields
        colormap: Color map to apply
        
    Returns:
        PIL Image object
    """
    if not data_records:
        raise ValueError("No data records provided")
    
    # Extract pixel data
    pixel_arrays = []
    for record in data_records:
        pixel_data = np.array(record['data'], dtype=float)
        pixel_arrays.append(pixel_data)
    
    # Convert to 2D numpy array
    image_data = np.array(pixel_arrays)
    
    # Normalize data
    normalized_data = normalize_data(image_data)
    
    # Apply colormap
    rgb_data = apply_colormap(normalized_data, colormap)
    
    # Create PIL Image
    image = Image.fromarray(rgb_data, mode='RGB')
    
    return image


def save_image(image: Image.Image, filename: str):
    """
    Save an image to file.
    
    Args:
        image: PIL Image object
        filename: Output filename
    """
    image.save(filename, 'PNG')


def get_image_bytes(image: Image.Image) -> bytes:
    """
    Convert PIL Image to bytes for API response.
    
    Args:
        image: PIL Image object
        
    Returns:
        PNG image as bytes
    """
    from io import BytesIO
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue() 