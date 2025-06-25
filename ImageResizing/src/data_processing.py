"""
Data processing module for reading CSV and resizing image data.
"""
import pandas as pd
import numpy as np
from typing import List, Tuple


def read_csv(file_path: str) -> pd.DataFrame:
    """
    Read CSV file containing depth and pixel intensity data.
    
    Args:
        file_path: Path to the CSV file
        
    Returns:
        DataFrame with depth and pixel columns
    """
    df = pd.read_csv(file_path)
    # Ensure depth column exists and data is sorted by depth
    if 'depth' not in df.columns:
        raise ValueError("CSV must contain a 'depth' column")
    
    df = df.sort_values('depth').reset_index(drop=True)
    return df


def resize_row(row: np.ndarray, original_width: int = 200, new_width: int = 150) -> np.ndarray:
    """
    Resize a single row of pixel data using linear interpolation.
    
    Args:
        row: Array of pixel values
        original_width: Original number of pixels
        new_width: Target number of pixels
        
    Returns:
        Resized array of pixel values
    """
    # Create interpolation indices
    old_indices = np.linspace(0, original_width - 1, original_width)
    new_indices = np.linspace(0, original_width - 1, new_width)
    
    # Perform linear interpolation
    resized = np.interp(new_indices, old_indices, row)
    
    return resized


def resize_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Resize all rows in the dataframe from 200 to 150 columns.
    
    Args:
        df: DataFrame with depth and 200 pixel columns
        
    Returns:
        DataFrame with depth and 150 resized pixel columns
    """
    # Extract pixel columns (assuming they are named col1 to col200)
    pixel_cols = [f'col{i}' for i in range(1, 201)]
    
    # Verify all pixel columns exist
    missing_cols = [col for col in pixel_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing pixel columns: {missing_cols[:5]}...")
    
    # Resize each row
    resized_data = []
    for idx, row in df.iterrows():
        pixel_values = np.array(row[pixel_cols], dtype=float)
        resized_row = resize_row(pixel_values)
        resized_data.append(resized_row)
    
    # Convert to numpy array for efficient storage
    resized_array = np.array(resized_data)
    
    # Create new dataframe with all columns at once to avoid fragmentation
    resized_dict = {'depth': df['depth'].values}
    for i in range(150):
        resized_dict[f'pixel_{i}'] = resized_array[:, i]
    
    resized_df = pd.DataFrame(resized_dict)
    
    return resized_df 