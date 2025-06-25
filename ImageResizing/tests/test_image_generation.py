"""
Unit tests for image generation module.
"""
import pytest
import numpy as np
from PIL import Image
from src.image_generation import (
    normalize_data, apply_colormap, generate_image, get_image_bytes
)


class TestImageGeneration:
    
    def test_normalize_data(self):
        """Test data normalization to 0-255 range."""
        # Test with typical data
        data = np.array([[0, 50, 100], [25, 75, 125]])
        normalized = normalize_data(data)
        
        assert normalized.min() == 0
        assert normalized.max() == 255
        assert normalized.dtype == np.uint8
    
    def test_normalize_data_constant(self):
        """Test normalization with constant data."""
        data = np.ones((3, 4)) * 50
        normalized = normalize_data(data)
        
        # Should return middle value for constant data
        assert np.all(normalized == 127)
    
    def test_apply_colormap_grayscale(self):
        """Test grayscale colormap application."""
        data = np.array([[0, 128, 255], [64, 192, 255]], dtype=np.uint8)
        rgb = apply_colormap(data, 'grayscale')
        
        # Check shape - should add RGB dimension
        assert rgb.shape == (2, 3, 3)
        
        # Check that all RGB channels are equal for grayscale
        assert np.all(rgb[:, :, 0] == rgb[:, :, 1])
        assert np.all(rgb[:, :, 1] == rgb[:, :, 2])
    
    def test_generate_image_basic(self):
        """Test basic image generation."""
        # Create test data records
        data_records = [
            {'depth': 100.0, 'data': [i * 10 for i in range(150)]},
            {'depth': 200.0, 'data': [i * 5 for i in range(150)]},
            {'depth': 300.0, 'data': [i * 15 for i in range(150)]}
        ]
        
        # Generate image
        image = generate_image(data_records)
        
        # Check image properties
        assert isinstance(image, Image.Image)
        assert image.mode == 'RGB'
        assert image.size == (150, 3)  # width=150, height=3
    
    def test_generate_image_empty_data(self):
        """Test error handling for empty data."""
        with pytest.raises(ValueError) as excinfo:
            generate_image([])
        
        assert "No data records" in str(excinfo.value)
    
    def test_generate_image_single_depth(self):
        """Test image generation with single depth."""
        data_records = [
            {'depth': 100.0, 'data': list(range(150))}
        ]
        
        image = generate_image(data_records)
        
        # Should create 1x150 image
        assert image.size == (150, 1)
    
    def test_get_image_bytes(self):
        """Test converting image to bytes."""
        # Create a simple test image
        data = np.zeros((10, 10, 3), dtype=np.uint8)
        image = Image.fromarray(data, mode='RGB')
        
        # Convert to bytes
        image_bytes = get_image_bytes(image)
        
        # Check that it's bytes and non-empty
        assert isinstance(image_bytes, bytes)
        assert len(image_bytes) > 0
        
        # Verify it's a valid PNG by loading it back
        from io import BytesIO
        loaded_image = Image.open(BytesIO(image_bytes))
        assert loaded_image.format == 'PNG'
    
    def test_colormap_validation(self):
        """Test colormap validation and fallback."""
        data = np.array([[0, 128, 255]], dtype=np.uint8)
        
        # Test with invalid colormap - should fall back to grayscale
        rgb = apply_colormap(data, 'invalid_colormap')
        
        # Check that it used grayscale
        assert np.all(rgb[:, :, 0] == rgb[:, :, 1])
        assert np.all(rgb[:, :, 1] == rgb[:, :, 2]) 