"""
Migration: Add Super Admin Extended Features
==============================================
Adds comprehensive tables and fields for Super Admin governance features.

New Tables:
- audit_logs: Complete system event tracking
- system_notifications: Admin notification management
- notification_receipts: Track notification delivery
- emergency_overrides: Emergency admin actions
- ownership_transfers: Bakery ownership transfers
- user_status_history: Account status change history
- system_analytics: Aggregated system metrics
- notification_templates: Reusable notification templates

Updated Tables:
- users: Add status management fields

Run with: python -m migrations.add_superadmin_features
"""

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    if not table_exists(table_name):
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def add_superadmin_features():
    """Add all Super Admin governance features"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("MIGRATION: Adding Super Admin Extended Features")
        print("=" * 80)
        
        # ==================== UPDATE USERS TABLE ====================
        print("\n📋 Updating users table with status management fields...")
        
        fields_to_add = [
            ("status", "VARCHAR DEFAULT 'Pending'"),
            ("status_reason", "TEXT"),
            ("status_changed_at", "TIMESTAMP"),
            ("status_changed_by", "INTEGER"),
            ("suspended_until", "TIMESTAMP"),
            ("banned_at", "TIMESTAMP"),
            ("deactivated_at", "TIMESTAMP")
        ]
        
        for field_name, field_type in fields_to_add:
            if not column_exists('users', field_name):
                print(f"  ➕ Adding {field_name} to users table...")
                db.execute(text(f"ALTER TABLE users ADD COLUMN {field_name} {field_type}"))
                print(f"  ✅ Added {field_name}")
            else:
                print(f"  ⏭️  {field_name} already exists")
        
        db.commit()
        
        # ==================== CREATE AUDIT_LOGS TABLE ====================
        print("\n📋 Creating audit_logs table...")
        
        if not table_exists('audit_logs'):
            db.execute(text("""
                CREATE TABLE audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    event_type VARCHAR NOT NULL,
                    event_category VARCHAR,
                    description TEXT NOT NULL,
                    actor_id INTEGER,
                    actor_type VARCHAR,
                    actor_name VARCHAR,
                    target_id INTEGER,
                    target_type VARCHAR,
                    target_name VARCHAR,
                    ip_address VARCHAR,
                    user_agent VARCHAR,
                    session_id VARCHAR,
                    event_data JSON,
                    severity VARCHAR DEFAULT 'info',
                    success BOOLEAN DEFAULT 1,
                    error_message TEXT,
                    FOREIGN KEY (actor_id) REFERENCES users(id)
                )
            """))
            
            # Create indexes
            db.execute(text("CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp)"))
            db.execute(text("CREATE INDEX idx_audit_event_type ON audit_logs(event_type)"))
            db.execute(text("CREATE INDEX idx_audit_actor ON audit_logs(actor_id)"))
            
            print("  ✅ Created audit_logs table with indexes")
        else:
            print("  ⏭️  audit_logs table already exists")
        
        # ==================== CREATE SYSTEM_NOTIFICATIONS TABLE ====================
        print("\n📋 Creating system_notifications table...")
        
        if not table_exists('system_notifications'):
            db.execute(text("""
                CREATE TABLE system_notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    title VARCHAR NOT NULL,
                    message TEXT NOT NULL,
                    notification_type VARCHAR NOT NULL,
                    target_all BOOLEAN DEFAULT 0,
                    target_role VARCHAR,
                    target_user_id INTEGER,
                    send_email BOOLEAN DEFAULT 0,
                    send_in_app BOOLEAN DEFAULT 1,
                    sent_at TIMESTAMP,
                    sent_by_admin_id INTEGER NOT NULL,
                    is_draft BOOLEAN DEFAULT 0,
                    template_name VARCHAR,
                    priority VARCHAR DEFAULT 'normal',
                    expires_at TIMESTAMP,
                    notification_data JSON,
                    FOREIGN KEY (sent_by_admin_id) REFERENCES users(id),
                    FOREIGN KEY (target_user_id) REFERENCES users(id)
                )
            """))
            print("  ✅ Created system_notifications table")
        else:
            print("  ⏭️  system_notifications table already exists")
        
        # ==================== CREATE NOTIFICATION_RECEIPTS TABLE ====================
        print("\n📋 Creating notification_receipts table...")
        
        if not table_exists('notification_receipts'):
            db.execute(text("""
                CREATE TABLE notification_receipts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    notification_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    read_at TIMESTAMP,
                    is_read BOOLEAN DEFAULT 0,
                    FOREIGN KEY (notification_id) REFERENCES system_notifications(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            print("  ✅ Created notification_receipts table")
        else:
            print("  ⏭️  notification_receipts table already exists")
        
        # ==================== CREATE EMERGENCY_OVERRIDES TABLE ====================
        print("\n📋 Creating emergency_overrides table...")
        
        if not table_exists('emergency_overrides'):
            db.execute(text("""
                CREATE TABLE emergency_overrides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    action_type VARCHAR NOT NULL,
                    reason TEXT NOT NULL,
                    ticket_number VARCHAR UNIQUE,
                    admin_id INTEGER NOT NULL,
                    admin_name VARCHAR NOT NULL,
                    target_user_id INTEGER NOT NULL,
                    target_user_name VARCHAR NOT NULL,
                    target_user_email VARCHAR,
                    old_value TEXT,
                    new_value TEXT,
                    transferred_to_employee_id INTEGER,
                    requires_approval BOOLEAN DEFAULT 1,
                    approved_by_admin_id INTEGER,
                    approved_at TIMESTAMP,
                    status VARCHAR DEFAULT 'pending',
                    executed_at TIMESTAMP,
                    reverted_at TIMESTAMP,
                    override_data JSON,
                    ip_address VARCHAR,
                    FOREIGN KEY (admin_id) REFERENCES users(id),
                    FOREIGN KEY (target_user_id) REFERENCES users(id),
                    FOREIGN KEY (transferred_to_employee_id) REFERENCES employees(id),
                    FOREIGN KEY (approved_by_admin_id) REFERENCES users(id)
                )
            """))
            print("  ✅ Created emergency_overrides table")
        else:
            print("  ⏭️  emergency_overrides table already exists")
        
        # ==================== CREATE OWNERSHIP_TRANSFERS TABLE ====================
        print("\n📋 Creating ownership_transfers table...")
        
        if not table_exists('ownership_transfers'):
            db.execute(text("""
                CREATE TABLE ownership_transfers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    bakery_id INTEGER NOT NULL,
                    from_owner_id INTEGER NOT NULL,
                    to_employee_id INTEGER NOT NULL,
                    reason TEXT NOT NULL,
                    transfer_type VARCHAR NOT NULL,
                    authorized_by_admin_id INTEGER NOT NULL,
                    status VARCHAR DEFAULT 'active',
                    is_temporary BOOLEAN DEFAULT 0,
                    expires_at TIMESTAMP,
                    reverted_at TIMESTAMP,
                    new_owner_name VARCHAR NOT NULL,
                    new_owner_email VARCHAR NOT NULL,
                    notes TEXT,
                    transfer_data JSON,
                    FOREIGN KEY (bakery_id) REFERENCES users(id),
                    FOREIGN KEY (from_owner_id) REFERENCES users(id),
                    FOREIGN KEY (to_employee_id) REFERENCES employees(id),
                    FOREIGN KEY (authorized_by_admin_id) REFERENCES users(id)
                )
            """))
            print("  ✅ Created ownership_transfers table")
        else:
            print("  ⏭️  ownership_transfers table already exists")
        
        # ==================== CREATE USER_STATUS_HISTORY TABLE ====================
        print("\n📋 Creating user_status_history table...")
        
        if not table_exists('user_status_history'):
            db.execute(text("""
                CREATE TABLE user_status_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    old_status VARCHAR,
                    new_status VARCHAR NOT NULL,
                    reason TEXT NOT NULL,
                    changed_by_admin_id INTEGER NOT NULL,
                    duration_days INTEGER,
                    expires_at TIMESTAMP,
                    violation_type VARCHAR,
                    notes TEXT,
                    status_data JSON,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (changed_by_admin_id) REFERENCES users(id)
                )
            """))
            print("  ✅ Created user_status_history table")
        else:
            print("  ⏭️  user_status_history table already exists")
        
        # ==================== CREATE SYSTEM_ANALYTICS TABLE ====================
        print("\n📋 Creating system_analytics table...")
        
        if not table_exists('system_analytics'):
            db.execute(text("""
                CREATE TABLE system_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    period_type VARCHAR NOT NULL,
                    total_users INTEGER DEFAULT 0,
                    active_users INTEGER DEFAULT 0,
                    new_users INTEGER DEFAULT 0,
                    total_bakeries INTEGER DEFAULT 0,
                    total_charities INTEGER DEFAULT 0,
                    suspended_users INTEGER DEFAULT 0,
                    banned_users INTEGER DEFAULT 0,
                    total_donations INTEGER DEFAULT 0,
                    donations_completed INTEGER DEFAULT 0,
                    donations_pending INTEGER DEFAULT 0,
                    total_quantity_donated INTEGER DEFAULT 0,
                    total_logins INTEGER DEFAULT 0,
                    failed_logins INTEGER DEFAULT 0,
                    peak_hour INTEGER,
                    avg_session_duration REAL,
                    geographic_data JSON,
                    complaints_filed INTEGER DEFAULT 0,
                    complaints_resolved INTEGER DEFAULT 0,
                    notifications_sent INTEGER DEFAULT 0,
                    error_count INTEGER DEFAULT 0,
                    security_alerts INTEGER DEFAULT 0,
                    analytics_data JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            db.execute(text("CREATE INDEX idx_analytics_date ON system_analytics(date)"))
            print("  ✅ Created system_analytics table with index")
        else:
            print("  ⏭️  system_analytics table already exists")
        
        # ==================== CREATE NOTIFICATION_TEMPLATES TABLE ====================
        print("\n📋 Creating notification_templates table...")
        
        if not table_exists('notification_templates'):
            db.execute(text("""
                CREATE TABLE notification_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR UNIQUE NOT NULL,
                    title VARCHAR NOT NULL,
                    message TEXT NOT NULL,
                    category VARCHAR,
                    default_priority VARCHAR DEFAULT 'normal',
                    send_email_default BOOLEAN DEFAULT 0,
                    created_by_admin_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
                )
            """))
            print("  ✅ Created notification_templates table")
        else:
            print("  ⏭️  notification_templates table already exists")
        
        db.commit()
        
        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\n📝 Summary:")
        print("  - Updated users table with status management fields")
        print("  - Created audit_logs table for complete system event tracking")
        print("  - Created system_notifications and notification_receipts tables")
        print("  - Created emergency_overrides table")
        print("  - Created ownership_transfers table")
        print("  - Created user_status_history table")
        print("  - Created system_analytics table")
        print("  - Created notification_templates table")
        print("\n🔄 Next steps:")
        print("  1. Add the new routes to main.py")
        print("  2. Import admin_models in your application")
        print("  3. Restart the backend server")
        print("  4. Test Super Admin features")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_superadmin_features()
