"""
Migration: Add LoginAttempt table for login security
Tracks failed login attempts and implements account blocking
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, Integer, String, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from app.database import engine, SessionLocal
from app.timezone_utils import now_ph

Base = declarative_base()

def add_login_attempts_table():
    """Add login_attempts table to track failed login attempts"""
    
    db = SessionLocal()
    
    try:
        print("🔄 Adding login_attempts table...")
        
        # Create the login_attempts table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS login_attempts (
            id SERIAL PRIMARY KEY,
            identifier VARCHAR NOT NULL,
            login_type VARCHAR NOT NULL,
            bakery_id INTEGER,
            failed_attempts INTEGER DEFAULT 0,
            total_failed_attempts INTEGER DEFAULT 0,
            block_level INTEGER DEFAULT 0,
            blocked_until TIMESTAMP,
            last_attempt TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL
        );
        """
        
        db.execute(text(create_table_sql))
        db.commit()
        print("✅ login_attempts table created successfully")
        
        # Create indexes for better performance
        print("🔄 Creating indexes...")
        
        index_sql = """
        CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier 
        ON login_attempts(identifier);
        
        CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_type 
        ON login_attempts(identifier, login_type);
        
        CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_type_bakery 
        ON login_attempts(identifier, login_type, bakery_id);
        """
        
        db.execute(text(index_sql))
        db.commit()
        print("✅ Indexes created successfully")
        
        print("\n✅ Migration completed successfully!")
        print("\n📋 Summary:")
        print("   - Created login_attempts table")
        print("   - Added indexes for performance")
        print("   - Ready to track failed login attempts")
        
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("\n" + "="*80)
    print("🔐 LOGIN SECURITY MIGRATION")
    print("="*80 + "\n")
    
    add_login_attempts_table()
    
    print("\n" + "="*80)
    print("✅ Migration Complete!")
    print("="*80 + "\n")
