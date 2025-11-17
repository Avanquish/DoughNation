"""
Migration: Fix Employee Foreign Keys to Allow Deletion
=======================================================
Updates foreign key constraints on created_by_employee_id to SET NULL on delete.
This allows employee records to be deleted when they become bakery owners.

Run this migration with: python migrations/fix_employee_foreign_keys.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def migrate():
    """Update foreign key constraints to SET NULL on employee deletion"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        print("🔧 Starting migration: Fix Employee Foreign Keys...")
        
        try:
            # Start transaction
            trans = conn.begin()
            
            # Drop existing foreign key constraints
            print("📌 Dropping existing foreign key constraints...")
            
            # Drop constraint on bakery_inventory table
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                DROP CONSTRAINT IF EXISTS bakery_inventory_created_by_employee_id_fkey
            """))
            print("   ✓ Dropped bakery_inventory constraint")
            
            # Drop constraint on donations table
            conn.execute(text("""
                ALTER TABLE donations 
                DROP CONSTRAINT IF EXISTS donations_created_by_employee_id_fkey
            """))
            print("   ✓ Dropped donations constraint")
            
            # Add new foreign key constraints with ON DELETE SET NULL
            print("📌 Adding new foreign key constraints with ON DELETE SET NULL...")
            
            # Add constraint to bakery_inventory
            conn.execute(text("""
                ALTER TABLE bakery_inventory 
                ADD CONSTRAINT bakery_inventory_created_by_employee_id_fkey 
                FOREIGN KEY (created_by_employee_id) 
                REFERENCES employees(id) 
                ON DELETE SET NULL
            """))
            print("   ✓ Added bakery_inventory constraint with SET NULL")
            
            # Add constraint to donations
            conn.execute(text("""
                ALTER TABLE donations 
                ADD CONSTRAINT donations_created_by_employee_id_fkey 
                FOREIGN KEY (created_by_employee_id) 
                REFERENCES employees(id) 
                ON DELETE SET NULL
            """))
            print("   ✓ Added donations constraint with SET NULL")
            
            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully!")
            print("\n📝 Summary:")
            print("   - Employee records can now be deleted")
            print("   - Related inventory/donation records will have created_by_employee_id set to NULL")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()
