"""
Migration to add threshold_notifications table
Run this to add the ThresholdNotification model to the database
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def migrate():
    """Add threshold_notifications table"""
    print("Starting migration: add_threshold_notifications")
    
    # Create the table using raw SQL to avoid model import issues
    create_table_sql = text("""
    CREATE TABLE IF NOT EXISTS threshold_notifications (
        id SERIAL PRIMARY KEY,
        bakery_id INTEGER NOT NULL REFERENCES users(id),
        product_id INTEGER NOT NULL REFERENCES bakery_inventory(id),
        shown_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        dismissed BOOLEAN DEFAULT FALSE,
        donated BOOLEAN DEFAULT FALSE
    );
    """)
    
    create_indexes_sql = text("""
    CREATE INDEX IF NOT EXISTS idx_threshold_notifications_bakery_id 
        ON threshold_notifications(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_threshold_notifications_product_id 
        ON threshold_notifications(product_id);
    """)
    
    try:
        with engine.connect() as conn:
            # Execute the SQL
            conn.execute(create_table_sql)
            conn.execute(create_indexes_sql)
            conn.commit()
            print("✅ Successfully created threshold_notifications table")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate()
    print("Migration completed!")
