"""
Direct migration script using psycopg2 with autocommit
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Connect with autocommit enabled
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cursor = conn.cursor()

print("Starting food category migration...")

try:
    # Add food_category to admin_donation_requests
    print("Adding food_category to admin_donation_requests...")
    cursor.execute("""
        ALTER TABLE admin_donation_requests 
        ADD COLUMN IF NOT EXISTS food_category VARCHAR(50) DEFAULT 'other'
    """)
    print("✅ Added food_category to admin_donation_requests")
    
    # Add donation_deadline to admin_donation_requests
    print("Adding donation_deadline to admin_donation_requests...")
    cursor.execute("""
        ALTER TABLE admin_donation_requests 
        ADD COLUMN IF NOT EXISTS donation_deadline DATE
    """)
    print("✅ Added donation_deadline to admin_donation_requests")
    
    # Add food_category to admin_inventory
    print("Adding food_category to admin_inventory...")
    cursor.execute("""
        ALTER TABLE admin_inventory 
        ADD COLUMN IF NOT EXISTS food_category VARCHAR(50) DEFAULT 'other'
    """)
    print("✅ Added food_category to admin_inventory")
    
    # Add donation_deadline to admin_inventory
    print("Adding donation_deadline to admin_inventory...")
    cursor.execute("""
        ALTER TABLE admin_inventory 
        ADD COLUMN IF NOT EXISTS donation_deadline DATE
    """)
    print("✅ Added donation_deadline to admin_inventory")
    
    print("\n✅ Migration completed successfully!")
    
    # Verify columns were added
    print("\nVerifying columns...")
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin_donation_requests' 
        AND column_name IN ('food_category', 'donation_deadline')
    """)
    result = cursor.fetchall()
    print(f"admin_donation_requests columns: {[r[0] for r in result]}")
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin_inventory' 
        AND column_name IN ('food_category', 'donation_deadline')
    """)
    result = cursor.fetchall()
    print(f"admin_inventory columns: {[r[0] for r in result]}")
    
except psycopg2.errors.DuplicateColumn as e:
    print(f"⚠️ Columns may already exist: {e}")
except Exception as e:
    print(f"❌ Error during migration: {e}")
    raise
finally:
    cursor.close()
    conn.close()

print("\nMigration script completed!")
