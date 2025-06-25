"""
Main script to process CSV data and populate the database.
"""
import argparse
import logging
import sys
from pathlib import Path

from src.data_processing import read_csv, resize_data
from src.database import init_db, insert_data, clear_database
from src.utils import setup_logging, validate_csv_structure


def main(csv_path: str, clear_db: bool = False):
    """
    Main function to process CSV and populate database.
    
    Args:
        csv_path: Path to the CSV file
        clear_db: Whether to clear existing data before inserting
    """
    # Set up logging
    setup_logging("INFO")
    logger = logging.getLogger(__name__)
    
    try:
        # Check if file exists
        if not Path(csv_path).exists():
            logger.error(f"CSV file not found: {csv_path}")
            sys.exit(1)
        
        # Initialize database
        logger.info("Initializing database...")
        # Force recreate if clearing database to ensure schema changes
        init_db(force_recreate=clear_db)
        
        # Clear database if requested
        if clear_db:
            logger.info("Clearing existing data...")
            # Database was already recreated, so no need to clear
        
        # Read CSV file
        logger.info(f"Reading CSV file: {csv_path}")
        df = read_csv(csv_path)
        logger.info(f"Loaded {len(df)} rows of data")
        
        # Validate CSV structure
        logger.info("Validating CSV structure...")
        validate_csv_structure(df)
        
        # Resize data
        logger.info("Resizing data from 200 to 150 columns...")
        resized_df = resize_data(df)
        logger.info("Data resizing complete")
        
        # Insert into database
        logger.info("Inserting data into database...")
        insert_data(resized_df)
        logger.info("Data insertion complete")
        
        logger.info("Processing complete!")
        
    except Exception as e:
        logger.error(f"Error during processing: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Process depth image data and populate database"
    )
    parser.add_argument(
        "csv_path",
        help="Path to the CSV file containing depth and pixel data"
    )
    parser.add_argument(
        "--clear-db",
        action="store_true",
        help="Clear existing database data before inserting"
    )
    
    args = parser.parse_args()
    
    main(args.csv_path, args.clear_db) 