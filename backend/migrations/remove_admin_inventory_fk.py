"""
Migration: Remove foreign key constraint from admin_inventory.donation_request_id
This allows the field to reference either donation_requests or admin_donation_requests
depending on the source of the donation.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        print("Starting migration: Remove admin_inventory foreign key constraint...")
        
        # Drop the foreign key constraint
        cursor.execute("""
            ALTER TABLE admin_inventory 
            DROP CONSTRAINT IF EXISTS admin_inventory_donation_request_id_fkey;
        """)
        print("✓ Dropped foreign key constraint: admin_inventory_donation_request_id_fkey")
        
        # Verify the constraint is gone
        cursor.execute("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'admin_inventory' 
            AND constraint_name = 'admin_inventory_donation_request_id_fkey';
        """)
        result = cursor.fetchone()
        
        if result:
            print("✗ Warning: Constraint still exists!")
        else:
            print("✓ Verified: Constraint successfully removed")
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
