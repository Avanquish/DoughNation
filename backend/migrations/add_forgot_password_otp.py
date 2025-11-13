"""
Migration: Add OTP fields for forgot password functionality

This migration adds OTP (One-Time Password) fields to both User and Employee tables
for secure password reset functionality.

Changes:
- Add forgot_password_otp column to users table
- Add forgot_password_otp_expires column to users table
- Add forgot_password_otp column to employees table
- Add forgot_password_otp_expires column to employees table

Run with: python -m migrations.add_forgot_password_otp
"""

from sqlalchemy import create_engine, text, Column, String, DateTime, inspect
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def add_otp_columns():
    """Add OTP columns to users and employees tables"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("MIGRATION: Adding OTP fields for forgot password")
        print("=" * 60)
        
        # Add OTP fields to users table
        print("\n📋 Checking users table...")
        
        if not column_exists('users', 'forgot_password_otp'):
            print("  ➕ Adding forgot_password_otp column to users table...")
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN forgot_password_otp VARCHAR
            """))
            print("  ✅ Added forgot_password_otp column")
        else:
            print("  ⏭️  forgot_password_otp column already exists")
        
        if not column_exists('users', 'forgot_password_otp_expires'):
            print("  ➕ Adding forgot_password_otp_expires column to users table...")
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN forgot_password_otp_expires TIMESTAMP
            """))
            print("  ✅ Added forgot_password_otp_expires column")
        else:
            print("  ⏭️  forgot_password_otp_expires column already exists")
        
        # Add OTP fields to employees table
        print("\n📋 Checking employees table...")
        
        if not column_exists('employees', 'forgot_password_otp'):
            print("  ➕ Adding forgot_password_otp column to employees table...")
            db.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN forgot_password_otp VARCHAR
            """))
            print("  ✅ Added forgot_password_otp column")
        else:
            print("  ⏭️  forgot_password_otp column already exists")
        
        if not column_exists('employees', 'forgot_password_otp_expires'):
            print("  ➕ Adding forgot_password_otp_expires column to employees table...")
            db.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN forgot_password_otp_expires TIMESTAMP
            """))
            print("  ✅ Added forgot_password_otp_expires column")
        else:
            print("  ⏭️  forgot_password_otp_expires column already exists")
        
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("\n📝 Summary:")
        print("  - OTP fields added to users table")
        print("  - OTP fields added to employees table")
        print("  - Backend routes updated for OTP-based password reset")
        print("\n🔄 Next steps:")
        print("  1. Restart the backend server")
        print("  2. Update frontend to use new OTP flow")
        print("  3. Test password reset with OTP")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_otp_columns()
