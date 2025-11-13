"""
Database Migration: Add password tracking fields to employees table
Run this script to add initial_password_hash and password_changed columns
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def migrate():
    """Add password tracking columns to employees table"""
    session = Session()
    
    try:
        print("🔄 Starting migration: Add password tracking to employees table...")
        
        # Check if columns already exist
        result = session.execute(
            text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'employees';
            """)
        )
        columns = [row[0] for row in result.fetchall()]
        
        needs_migration = False
        
        if 'initial_password_hash' not in columns:
            print("📝 Adding initial_password_hash column...")
            session.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN initial_password_hash VARCHAR
            """))
            needs_migration = True
        else:
            print("✅ initial_password_hash column already exists")
        
        if 'password_changed' not in columns:
            print("📝 Adding password_changed column...")
            session.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN password_changed BOOLEAN DEFAULT FALSE
            """))
            needs_migration = True
        else:
            print("✅ password_changed column already exists")
        
        if needs_migration:
            # Update existing employees
            print("📝 Updating existing employees...")
            session.execute(text("""
                UPDATE employees 
                SET initial_password_hash = hashed_password,
                    password_changed = FALSE
                WHERE initial_password_hash IS NULL
            """))
            
            session.commit()
            print("✅ Migration completed successfully!")
            print("\n⚠️  Important Notes:")
            print("   - Existing employees will need to change their passwords")
            print("   - Their current password is stored as 'initial' to prevent reuse")
            print("   - password_changed flag set to FALSE for all existing employees")
        else:
            print("✅ No migration needed - all columns already exist")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
