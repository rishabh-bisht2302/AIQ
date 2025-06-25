"""
Database module for MongoDB interactions.
"""
import json
import pandas as pd
from pymongo import MongoClient, errors, ReplaceOne
from pymongo.collection import Collection
from pymongo.database import Database
from typing import List, Dict, Optional, Any
import logging
from config import MONGODB_URI, DATABASE_NAME, COLLECTION_NAME

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global MongoDB client
_client: Optional[MongoClient] = None
_database: Optional[Database] = None
_collection: Optional[Collection] = None


def get_client() -> MongoClient:
    """Create and return MongoDB client."""
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGODB_URI)
            # Test the connection
            _client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    return _client


def get_database() -> Database:
    """Get the database instance."""
    global _database
    if _database is None:
        client = get_client()
        _database = client[DATABASE_NAME]
    return _database


def get_collection() -> Collection:
    """Get the collection instance."""
    global _collection
    if _collection is None:
        database = get_database()
        _collection = database[COLLECTION_NAME]
        # Create index on depth for better query performance
        _collection.create_index("depth", unique=True)
    return _collection


def init_db(force_recreate=False):
    """Initialize database collections."""
    try:
        collection = get_collection()
        
        if force_recreate:
            logger.info("Force recreating database collection...")
            collection.drop()
            logger.info("Dropped existing collection")
            # Recreate the collection and index
            collection = get_collection()
        
        # Ensure index exists
        collection.create_index("depth", unique=True)
        
        # Verify connection and get collection stats
        stats = collection.database.command("collstats", COLLECTION_NAME)
        logger.info(f"Collection '{COLLECTION_NAME}' initialized. Document count: {stats.get('count', 0)}")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


def insert_data(df: pd.DataFrame):
    """
    Insert resized data into MongoDB.
    This will insert new records or update existing ones if a depth value already exists.
    
    Args:
        df: DataFrame with depth and 150 pixel columns
    """
    collection = get_collection()
    
    try:
        pixel_cols = [f'pixel_{i}' for i in range(150)]
        
        # Prepare documents for bulk operation
        operations = []
        
        for _, row in df.iterrows():
            depth = float(row['depth'])
            pixel_data = [float(row[col]) for col in pixel_cols]
            
            # Use upsert operation (update if exists, insert if not)
            operations.append(ReplaceOne(
                {"depth": depth},
                {
                    "depth": depth,
                    "data": pixel_data
                },
                upsert=True
            ))
        
        # Execute bulk operations in batches for better performance
        batch_size = 1000
        inserted_count = 0
        updated_count = 0
        
        for i in range(0, len(operations), batch_size):
            batch = operations[i:i + batch_size]
            result = collection.bulk_write(batch)
            inserted_count += result.upserted_count
            updated_count += result.modified_count
        
        logger.info(f"Successfully processed {len(df)} records: {inserted_count} inserted, {updated_count} updated")
        
    except Exception as e:
        logger.error(f"Error during bulk insert/update: {e}")
        raise


def query_data(depth_min: float, depth_max: float) -> List[Dict[str, Any]]:
    """
    Query data for the specified depth range.
    
    Args:
        depth_min: Minimum depth value
        depth_max: Maximum depth value
        
    Returns:
        List of dictionaries with depth and data fields
    """
    collection = get_collection()
    
    try:
        # Query documents within the depth range
        cursor = collection.find(
            {
                "depth": {
                    "$gte": depth_min,
                    "$lte": depth_max
                }
            }
        ).sort("depth", 1)  # Sort by depth ascending
        
        # Convert to list of dictionaries
        data = []
        for document in cursor:
            data.append({
                'depth': document['depth'],
                'data': document['data']
            })
        
        logger.info(f"Retrieved {len(data)} records for depth range [{depth_min}, {depth_max}]")
        return data
        
    except Exception as e:
        logger.error(f"Error querying data: {e}")
        raise


def clear_database():
    """Clear all data from the database (useful for testing)."""
    collection = get_collection()
    
    try:
        result = collection.delete_many({})
        logger.info(f"Database cleared. Deleted {result.deleted_count} documents")
    except Exception as e:
        logger.error(f"Error clearing database: {e}")
        raise


def close_connection():
    """Close the MongoDB connection."""
    global _client, _database, _collection
    if _client:
        _client.close()
        _client = None
        _database = None
        _collection = None
        logger.info("MongoDB connection closed") 