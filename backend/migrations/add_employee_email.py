"""
Database Migration: Add email field to employees table
Run this script to add the email column to existing employees table
"""

from sqlalchemy import create_engine, Column, String, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def migrate():
    """Add email column to employees table"""
    session = Session()
    
    try:
        print("🔄 Starting migration: Add email to employees table...")
        
        # Check if email column already exists
        result = session.execute(
            text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'employees';
            """)
        )
        columns = [row[0] for row in result.fetchall()]
        
        if 'email' in columns:
            print("✅ Email column already exists. No migration needed.")
            return
        
        # Add email column
        print("📝 Adding email column to employees table...")
        session.execute(text("""
            ALTER TABLE employees 
            ADD COLUMN email VARCHAR NOT NULL DEFAULT 'temp@gmail.com'
        """))
        
        # Make email unique
        print("📝 Creating unique constraint on email...")
        session.execute(text("""
            CREATE UNIQUE INDEX idx_employee_email ON employees(email)
        """))
        
        session.commit()
        print("✅ Migration completed successfully!")
        print("⚠️  Note: Existing employees have temporary email 'temp@gmail.com'")
        print("   Please update their emails manually or delete and recreate them.")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
