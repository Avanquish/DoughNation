"""
Migration: Add donation_type field to direct_donations table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def upgrade():
    """Add donation_type column to direct_donations"""
    with engine.connect() as conn:
        # Add donation_type column (default to "Food" for existing records)
        conn.execute(text("""
            ALTER TABLE direct_donations 
            ADD COLUMN IF NOT EXISTS donation_type VARCHAR DEFAULT 'Food'
        """))
        conn.commit()
        
        # Update existing records to match their inventory item's donation_type
        conn.execute(text("""
            UPDATE direct_donations dd
            SET donation_type = bi.donation_type
            FROM bakery_inventory bi
            WHERE dd.bakery_inventory_id = bi.id
            AND dd.donation_type IS NULL OR dd.donation_type = 'Food'
        """))
        conn.commit()
        print("✓ Added donation_type column to direct_donations table")
        print("✓ Updated existing donations with donation_type from inventory")

def downgrade():
    """Remove donation_type column from direct_donations"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE direct_donations 
            DROP COLUMN IF EXISTS donation_type
        """))
        conn.commit()
        print("✓ Removed donation_type column from direct_donations table")

if __name__ == "__main__":
    print("Running migration: add_donation_type_to_direct_donations")
    upgrade()
    print("Migration completed successfully!")
