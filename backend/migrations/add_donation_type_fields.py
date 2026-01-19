"""
Migration: Add donation type fields to bakery_inventory table
Date: 2026-01-20
Description: Adds donation_type, category, and condition columns to support multi-type donations
"""

from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def migrate():
    """Add donation_type, category, and condition columns to bakery_inventory table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        print("Starting migration: add_donation_type_fields")
        
        # Add donation_type column with default 'Food'
        try:
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                ADD COLUMN donation_type VARCHAR DEFAULT 'Food'
            """))
            conn.commit()
            print("✓ Added donation_type column")
        except Exception as e:
            print(f"donation_type column might already exist: {e}")
        
        # Add category column (nullable)
        try:
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                ADD COLUMN category VARCHAR
            """))
            conn.commit()
            print("✓ Added category column")
        except Exception as e:
            print(f"category column might already exist: {e}")
        
        # Add condition column (nullable)
        try:
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                ADD COLUMN condition VARCHAR
            """))
            conn.commit()
            print("✓ Added condition column")
        except Exception as e:
            print(f"condition column might already exist: {e}")
        
        # Make expiration_date nullable for non-food items
        try:
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                ALTER COLUMN expiration_date DROP NOT NULL
            """))
            conn.commit()
            print("✓ Made expiration_date nullable")
        except Exception as e:
            print(f"expiration_date might already be nullable: {e}")
        
        print("Migration completed successfully!")

def rollback():
    """Remove donation_type, category, and condition columns"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        print("Rolling back migration: add_donation_type_fields")
        
        try:
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                DROP COLUMN IF EXISTS donation_type,
                DROP COLUMN IF EXISTS category,
                DROP COLUMN IF EXISTS condition
            """))
            conn.commit()
            print("✓ Removed donation type columns")
        except Exception as e:
            print(f"Error during rollback: {e}")
        
        print("Rollback completed!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
