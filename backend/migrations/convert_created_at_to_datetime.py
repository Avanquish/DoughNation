"""
Migration: Convert created_at from Date to DateTime

This migration converts the created_at column in the users table from Date type
to DateTime type to store both date and time information.

Changes:
- Convert users.created_at from Date to DateTime
- Preserve existing date values by setting time to 00:00:00

Run with: python -m migrations.convert_created_at_to_datetime
"""

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def get_column_type(table_name: str, column_name: str) -> str:
    """Get the data type of a column"""
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    for col in columns:
        if col['name'] == column_name:
            return str(col['type'])
    return None


def convert_created_at_to_datetime():
    """Convert created_at column from Date to DateTime"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("MIGRATION: Converting created_at from Date to DateTime")
        print("=" * 60)
        
        # Check current column type
        print("\n📋 Checking users.created_at column type...")
        current_type = get_column_type('users', 'created_at')
        print(f"  Current type: {current_type}")
        
        if 'DATE' in str(current_type).upper() and 'TIME' not in str(current_type).upper():
            print("\n🔄 Converting users.created_at from Date to DateTime...")
            
            # PostgreSQL: Use ALTER COLUMN TYPE with USING clause
            # This preserves the date and sets time to 00:00:00
            db.execute(text("""
                ALTER TABLE users 
                ALTER COLUMN created_at TYPE TIMESTAMP 
                USING created_at::timestamp
            """))
            
            db.commit()
            print("  ✅ Successfully converted users.created_at to DateTime")
            
            # Verify the change
            new_type = get_column_type('users', 'created_at')
            print(f"  New type: {new_type}")
            
        else:
            print("  ℹ️  Column is already DateTime type, no changes needed")
        
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        db.close()


def rollback_datetime_to_date():
    """Rollback: Convert created_at column from DateTime back to Date"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("ROLLBACK: Converting created_at from DateTime to Date")
        print("=" * 60)
        
        print("\n🔄 Converting users.created_at from DateTime to Date...")
        
        # PostgreSQL: Convert DateTime to Date (loses time information)
        db.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN created_at TYPE DATE 
            USING created_at::date
        """))
        
        db.commit()
        print("  ✅ Successfully converted users.created_at back to Date")
        
        print("\n" + "=" * 60)
        print("ROLLBACK COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Rollback failed: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback_datetime_to_date()
    else:
        convert_created_at_to_datetime()
