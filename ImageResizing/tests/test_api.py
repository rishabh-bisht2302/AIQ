"""
Integration tests for API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.api import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestAPI:
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    @patch('src.api.query_data')
    @patch('src.api.generate_image')
    @patch('src.api.get_image_bytes')
    def test_image_frame_success(self, mock_get_bytes, mock_generate, mock_query, client):
        """Test successful image frame generation."""
        # Mock database query
        mock_query.return_value = [
            {'depth': 100.0, 'data': list(range(150))},
            {'depth': 200.0, 'data': list(range(150))}
        ]
        
        # Mock image generation
        mock_image = MagicMock()
        mock_generate.return_value = mock_image
        
        # Mock image bytes
        mock_get_bytes.return_value = b'fake_png_data'
        
        # Make request
        response = client.get("/image_frame?depth_min=100&depth_max=200")
        
        # Check response
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.content == b'fake_png_data'
    
    def test_image_frame_invalid_range(self, client):
        """Test invalid depth range."""
        response = client.get("/image_frame?depth_min=200&depth_max=100")
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid depth range"
    
    def test_image_frame_missing_params(self, client):
        """Test missing required parameters."""
        response = client.get("/image_frame")
        assert response.status_code == 422  # Unprocessable Entity
    
    @patch('src.api.query_data')
    def test_image_frame_no_data(self, mock_query, client):
        """Test when no data exists in range."""
        # Mock empty query result
        mock_query.return_value = []
        
        response = client.get("/image_frame?depth_min=100&depth_max=200")
        assert response.status_code == 404
        assert response.json()["detail"] == "No data in specified depth range"
    
    @patch('src.api.query_data')
    def test_image_frame_single_depth(self, mock_query, client):
        """Test single depth query."""
        # Mock single record
        mock_query.return_value = [
            {'depth': 100.0, 'data': list(range(150))}
        ]
        
        with patch('src.api.generate_image') as mock_generate:
            with patch('src.api.get_image_bytes') as mock_get_bytes:
                mock_get_bytes.return_value = b'single_depth_image'
                
                response = client.get("/image_frame?depth_min=100&depth_max=100")
                assert response.status_code == 200
    
    def test_image_frame_colormap(self, client):
        """Test colormap parameter."""
        with patch('src.api.query_data') as mock_query:
            mock_query.return_value = [{'depth': 100.0, 'data': list(range(150))}]
            
            with patch('src.api.generate_image') as mock_generate:
                with patch('src.api.get_image_bytes') as mock_get_bytes:
                    mock_get_bytes.return_value = b'colored_image'
                    
                    # Test valid colormap
                    response = client.get("/image_frame?depth_min=100&depth_max=200&colormap=heatmap")
                    assert response.status_code == 200
                    
                    # Verify colormap was passed to generate_image
                    args, kwargs = mock_generate.call_args
                    # Check if colormap is passed as second positional argument or as keyword argument
                    assert (len(args) > 1 and args[1] == 'heatmap') or kwargs.get('colormap') == 'heatmap'
    
    def test_image_frame_invalid_colormap(self, client):
        """Test invalid colormap parameter."""
        response = client.get("/image_frame?depth_min=100&depth_max=200&colormap=invalid")
        assert response.status_code == 400
        assert "Invalid colormap" in response.json()["detail"]
    
    def test_image_frame_out_of_bounds(self, client):
        """Test depth values out of bounds."""
        response = client.get("/image_frame?depth_min=-2e6&depth_max=0")
        assert response.status_code == 400
        assert "Depth values must be between" in response.json()["detail"] 