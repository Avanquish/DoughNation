"""
Migration: Consolidate Part-time and Full-time into single Employee role

This migration updates the employee roles to consolidate Part-time and Full-time
into a single "Employee" role for simplified role management.

Changes:
- Update all "Part-time" roles to "Employee"
- Update all "Full-time" roles to "Employee"
- Update all "Part Time Staff" roles to "Employee"
- Update all "Full Time Staff" roles to "Employee"
- Manager role remains unchanged

Run with: python -m migrations.consolidate_employee_roles
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./doughnation.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def consolidate_employee_roles():
    """Consolidate Part-time and Full-time roles into Employee role"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("MIGRATION: Consolidating Employee Roles")
        print("=" * 60)
        
        # Get count of employees with old roles
        part_time_count = db.execute(text("""
            SELECT COUNT(*) FROM employees 
            WHERE role IN ('Part-time', 'Part Time Staff')
        """)).scalar()
        
        full_time_count = db.execute(text("""
            SELECT COUNT(*) FROM employees 
            WHERE role IN ('Full-time', 'Full Time Staff')
        """)).scalar()
        
        manager_count = db.execute(text("""
            SELECT COUNT(*) FROM employees 
            WHERE role = 'Manager'
        """)).scalar()
        
        print(f"\n📊 Current Employee Distribution:")
        print(f"  Part-time: {part_time_count}")
        print(f"  Full-time: {full_time_count}")
        print(f"  Manager: {manager_count}")
        print(f"  Total to update: {part_time_count + full_time_count}")
        
        if part_time_count == 0 and full_time_count == 0:
            print("\n✅ No employees to update. All roles are already consolidated.")
            return
        
        # Update Part-time roles
        if part_time_count > 0:
            print(f"\n🔄 Updating {part_time_count} Part-time employees to Employee...")
            db.execute(text("""
                UPDATE employees 
                SET role = 'Employee' 
                WHERE role IN ('Part-time', 'Part Time Staff')
            """))
            print(f"  ✅ Updated Part-time employees")
        
        # Update Full-time roles
        if full_time_count > 0:
            print(f"\n🔄 Updating {full_time_count} Full-time employees to Employee...")
            db.execute(text("""
                UPDATE employees 
                SET role = 'Employee' 
                WHERE role IN ('Full-time', 'Full Time Staff')
            """))
            print(f"  ✅ Updated Full-time employees")
        
        db.commit()
        
        # Verify the changes
        employee_count = db.execute(text("""
            SELECT COUNT(*) FROM employees 
            WHERE role = 'Employee'
        """)).scalar()
        
        final_manager_count = db.execute(text("""
            SELECT COUNT(*) FROM employees 
            WHERE role = 'Manager'
        """)).scalar()
        
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print(f"\n📊 New Employee Distribution:")
        print(f"  Employee: {employee_count}")
        print(f"  Manager: {final_manager_count}")
        print(f"\n📝 Summary:")
        print(f"  - Consolidated {part_time_count + full_time_count} employees into 'Employee' role")
        print(f"  - Manager roles unchanged: {manager_count}")
        print("\n🔄 Next steps:")
        print("  1. Restart the backend server")
        print("  2. Test employee login with new role structure")
        print("  3. Verify employee creation with Employee role")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    consolidate_employee_roles()
