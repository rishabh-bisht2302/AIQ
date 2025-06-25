"""
Unit tests for data processing module.
"""
import pytest
import pandas as pd
import numpy as np
from src.data_processing import read_csv, resize_row, resize_data


class TestDataProcessing:
    
    def test_resize_row(self):
        """Test resizing a single row of data."""
        # Create test data with 200 values
        original_data = np.linspace(0, 100, 200)
        
        # Resize to 150 values
        resized = resize_row(original_data)
        
        # Check output shape
        assert len(resized) == 150
        
        # Check that values are within expected range
        assert resized.min() >= 0
        assert resized.max() <= 100
        
        # Check that first and last values are preserved
        assert np.isclose(resized[0], original_data[0])
        assert np.isclose(resized[-1], original_data[-1])
    
    def test_resize_row_constant_values(self):
        """Test resizing with constant values."""
        original_data = np.ones(200) * 50
        resized = resize_row(original_data)
        
        assert len(resized) == 150
        assert np.allclose(resized, 50)
    
    def test_resize_data(self):
        """Test resizing entire dataframe."""
        # Create test dataframe
        data = {
            'depth': [100.0, 200.0, 300.0],
        }
        
        # Add 200 columns of pixel data
        for i in range(1, 201):
            data[f'col{i}'] = (np.random.rand(3) * 255).tolist()
        
        df = pd.DataFrame(data)
        
        # Resize data
        resized_df = resize_data(df)
        
        # Check output shape
        assert len(resized_df) == 3
        assert len(resized_df.columns) == 151  # depth + 150 pixel columns
        
        # Check that depth values are preserved
        assert resized_df['depth'].tolist() == [100.0, 200.0, 300.0]
        
        # Check pixel column names
        for i in range(150):
            assert f'pixel_{i}' in resized_df.columns
    
    def test_resize_data_missing_columns(self):
        """Test error handling for missing columns."""
        # Create dataframe with missing columns
        data = {
            'depth': [100.0, 200.0],
            'col1': [1, 2],
            'col2': [3, 4]
        }
        df = pd.DataFrame(data)
        
        # Should raise ValueError for missing columns
        with pytest.raises(ValueError) as excinfo:
            resize_data(df)
        
        assert "Missing pixel columns" in str(excinfo.value)
    
    def test_read_csv_sorting(self):
        """Test that read_csv sorts by depth."""
        # Create test dataframe with unsorted depths
        data = {
            'depth': [300.0, 100.0, 200.0],
        }
        for i in range(1, 201):
            data[f'col{i}'] = [1, 2, 3]
        
        df = pd.DataFrame(data)
        
        # Save to temporary CSV
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            df.to_csv(f.name, index=False)
            
            # Read CSV
            result_df = read_csv(f.name)
            
            # Check that depths are sorted
            assert result_df['depth'].tolist() == [100.0, 200.0, 300.0]
        
        # Clean up
        import os
        os.unlink(f.name) 