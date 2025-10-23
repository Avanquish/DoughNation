"""
Database migration script to add system_events table.
Run this script to create the system_events table in your database.

Usage:
    python add_system_events_table.py
"""

from app.database import engine
from app.models import Base, SystemEvent

def run_migration():
    """Create system_events table if it doesn't exist."""
    print("Starting migration: Adding system_events table...")
    
    try:
        # Create only the system_events table
        SystemEvent.__table__.create(bind=engine, checkfirst=True)
        print("✓ Successfully created system_events table")
        print("\nTable structure:")
        print("  - id: Primary Key")
        print("  - event_type: String (indexed)")
        print("  - description: String")
        print("  - user_id: Integer (Foreign Key to users.id, nullable)")
        print("  - timestamp: DateTime (indexed)")
        print("  - severity: String (default='info')")
        print("  - event_metadata: String (JSON storage)")
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"✗ Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_migration()
