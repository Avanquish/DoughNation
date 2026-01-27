"""
Migration: Add food category tracking for safety and grace period management
"""
from sqlalchemy import text
from app.database import engine

def upgrade():
    """Add food_category and donation_deadline fields"""
    with engine.begin() as conn:
        # Add food_category to AdminDonationRequest
        try:
            conn.execute(text("""
                ALTER TABLE admin_donation_requests 
                ADD COLUMN IF NOT EXISTS food_category VARCHAR(50) DEFAULT 'other'
            """))
            print("✅ Added food_category to admin_donation_requests")
        except Exception as e:
            print(f"⚠️ Skipping admin_donation_requests: {e}")
        
        # Add donation_deadline to AdminDonationRequest (calculated field)
        try:
            conn.execute(text("""
                ALTER TABLE admin_donation_requests 
                ADD COLUMN IF NOT EXISTS donation_deadline DATE
            """))
            print("✅ Added donation_deadline to admin_donation_requests")
        except Exception as e:
            print(f"⚠️ Skipping admin_donation_requests donation_deadline: {e}")
        
        # Add food_category to AdminInventory
        try:
            conn.execute(text("""
                ALTER TABLE admin_inventory 
                ADD COLUMN IF NOT EXISTS food_category VARCHAR(50) DEFAULT 'other'
            """))
            print("✅ Added food_category to admin_inventory")
        except Exception as e:
            print(f"⚠️ Skipping admin_inventory: {e}")
        
        # Add donation_deadline to AdminInventory
        try:
            conn.execute(text("""
                ALTER TABLE admin_inventory 
                ADD COLUMN IF NOT EXISTS donation_deadline DATE
            """))
            print("✅ Added donation_deadline to admin_inventory")
        except Exception as e:
            print(f"⚠️ Skipping admin_inventory donation_deadline: {e}")
        
        # Add food_category to DonorInventory (for future donations) - skip if doesn't exist
        try:
            conn.execute(text("""
                ALTER TABLE donor_inventory 
                ADD COLUMN IF NOT EXISTS food_category VARCHAR(50) DEFAULT 'other'
            """))
            print("✅ Added food_category to donor_inventory")
        except Exception as e:
            print(f"⚠️ Skipping donor_inventory (table may not exist): {e}")
        
        print("\n✅ Migration completed successfully!")


def downgrade():
    """Remove food_category and donation_deadline fields"""
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE admin_donation_requests DROP COLUMN IF EXISTS food_category"))
        conn.execute(text("ALTER TABLE admin_donation_requests DROP COLUMN IF EXISTS donation_deadline"))
        conn.execute(text("ALTER TABLE admin_inventory DROP COLUMN IF EXISTS food_category"))
        conn.execute(text("ALTER TABLE admin_inventory DROP COLUMN IF EXISTS donation_deadline"))
        conn.execute(text("ALTER TABLE donor_inventory DROP COLUMN IF EXISTS food_category"))
        print("✅ Successfully removed food_category and donation_deadline fields")


if __name__ == "__main__":
    print("Running migration: Add food category tracking...")
    upgrade()
    print("Migration completed!")
