"""
Super Admin Extended Models
===========================
Additional models for comprehensive Super Admin governance features:
- User Account Status Management
- Audit Logs / Activity Tracking
- Notification System
- Emergency Override & Ownership Transfer
- Advanced Analytics Tracking
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Date, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


# ==================== ENUMS ====================

class UserStatus(str, enum.Enum):
    """User account status for governance"""
    ACTIVE = "Active"
    PENDING = "Pending"  # Awaiting admin approval
    SUSPENDED = "Suspended"  # Temporarily disabled
    BANNED = "Banned"  # Permanently blocked
    DEACTIVATED = "Deactivated"  # User-requested or soft delete
    REJECTED = "Rejected"  # Admin rejected registration


class AuditEventType(str, enum.Enum):
    """Types of auditable events in the system"""
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    
    # User Account Events
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_SUSPENDED = "user_suspended"
    USER_BANNED = "user_banned"
    USER_REACTIVATED = "user_reactivated"
    
    # Admin Actions
    ADMIN_APPROVAL = "admin_approval"
    ADMIN_REJECTION = "admin_rejection"
    ADMIN_EDIT_USER = "admin_edit_user"
    ADMIN_OVERRIDE = "admin_override"
    
    # Donation Events
    DONATION_CREATED = "donation_created"
    DONATION_UPDATED = "donation_updated"
    DONATION_DELETED = "donation_deleted"
    DONATION_ACCEPTED = "donation_accepted"
    DONATION_REJECTED = "donation_rejected"
    DONATION_COMPLETED = "donation_completed"
    
    # Inventory Events
    INVENTORY_ADDED = "inventory_added"
    INVENTORY_UPDATED = "inventory_updated"
    INVENTORY_DELETED = "inventory_deleted"
    
    # Employee Events
    EMPLOYEE_ADDED = "employee_added"
    EMPLOYEE_UPDATED = "employee_updated"
    EMPLOYEE_DELETED = "employee_deleted"
    EMPLOYEE_LOGIN = "employee_login"
    
    # Notification Events
    NOTIFICATION_SENT = "notification_sent"
    ANNOUNCEMENT_SENT = "announcement_sent"
    EMAIL_SENT = "email_sent"
    
    # Emergency Actions
    EMERGENCY_PASSWORD_RESET = "emergency_password_reset"
    OWNERSHIP_TRANSFER = "ownership_transfer"
    ACCOUNT_RECOVERY = "account_recovery"
    
    # Complaint Events
    COMPLAINT_FILED = "complaint_filed"
    COMPLAINT_RESOLVED = "complaint_resolved"
    
    # System Events
    SYSTEM_ERROR = "system_error"
    SECURITY_ALERT = "security_alert"


class NotificationType(str, enum.Enum):
    """Types of notifications"""
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    USER_SPECIFIC = "user_specific"
    ROLE_TARGETED = "role_targeted"  # All bakeries or all charities
    ALERT = "alert"
    WARNING = "warning"
    INFO = "info"


class EmergencyActionType(str, enum.Enum):
    """Types of emergency admin actions"""
    PASSWORD_RESET = "password_reset"
    EMAIL_CHANGE = "email_change"
    OWNERSHIP_TRANSFER = "ownership_transfer"
    ACCOUNT_UNLOCK = "account_unlock"
    ACCESS_RECOVERY = "access_recovery"
    EMPLOYEE_PROMOTION = "employee_promotion"


# ==================== MODELS ====================

class AuditLog(Base):
    """
    Comprehensive audit logging for all system events.
    Tracks who did what, when, and from where.
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Event Information
    event_type = Column(String, nullable=False, index=True)  # From AuditEventType enum
    event_category = Column(String, nullable=True)  # Authentication, User, Donation, etc.
    description = Column(Text, nullable=False)
    
    # Actor Information (who performed the action)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null for system events
    actor_type = Column(String, nullable=True)  # User, Employee, Admin, System
    actor_name = Column(String, nullable=True)  # Cached for deleted users
    
    # Target Information (what was affected)
    target_id = Column(Integer, nullable=True)  # ID of affected resource
    target_type = Column(String, nullable=True)  # User, Donation, Inventory, etc.
    target_name = Column(String, nullable=True)
    
    # Technical Details
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    
    # Additional Context
    event_data = Column(JSON, nullable=True)  # Flexible JSON field for extra data
    severity = Column(String, default="info")  # info, warning, error, critical
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    actor = relationship("User", foreign_keys=[actor_id], backref="audit_actions")


class SystemNotification(Base):
    """
    Centralized notification system for Super Admin announcements.
    Supports broadcast, targeted, and individual notifications.
    """
    __tablename__ = "system_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Notification Content
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, nullable=False)  # From NotificationType enum
    
    # Targeting
    target_all = Column(Boolean, default=False)  # Broadcast to all users
    target_role = Column(String, nullable=True)  # "Bakery" or "Charity" for role-specific
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Specific user
    
    # Delivery
    send_email = Column(Boolean, default=False)  # Also send via email
    send_in_app = Column(Boolean, default=True)  # Show in app notifications
    
    # Status
    sent_at = Column(DateTime, nullable=True)
    sent_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_draft = Column(Boolean, default=False)
    
    # Templates
    template_name = Column(String, nullable=True)  # For reusable templates
    
    # Priority
    priority = Column(String, default="normal")  # low, normal, high, urgent
    expires_at = Column(DateTime, nullable=True)  # Auto-hide after date
    
    # Metadata
    notification_data = Column(JSON, nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sent_by_admin_id], backref="sent_notifications")
    target_user = relationship("User", foreign_keys=[target_user_id], backref="received_admin_notifications")


class NotificationReceipt(Base):
    """
    Tracks who received and read each notification.
    """
    __tablename__ = "notification_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("system_notifications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    delivered_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    
    # Relationships
    notification = relationship("SystemNotification", backref="receipts")
    user = relationship("User", backref="notification_receipts")


class EmergencyOverride(Base):
    """
    Tracks Super Admin emergency actions for business continuity.
    Examples: Password resets, ownership transfers, account recovery.
    """
    __tablename__ = "emergency_overrides"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Action Details
    action_type = Column(String, nullable=False)  # From EmergencyActionType enum
    reason = Column(Text, nullable=False)  # Justification for emergency action
    ticket_number = Column(String, unique=True, nullable=True)  # External ticket reference
    
    # Admin Performing Action
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_name = Column(String, nullable=False)  # Cached
    
    # Target User/Account
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_name = Column(String, nullable=False)  # Cached
    target_user_email = Column(String, nullable=True)  # Before change
    
    # Action-Specific Data
    old_value = Column(Text, nullable=True)  # Original value (email, owner, etc.)
    new_value = Column(Text, nullable=True)  # New value
    transferred_to_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # Approval & Security
    requires_approval = Column(Boolean, default=True)
    approved_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Status
    status = Column(String, default="pending")  # pending, approved, executed, reverted
    executed_at = Column(DateTime, nullable=True)
    reverted_at = Column(DateTime, nullable=True)
    
    # Metadata
    event_data = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    
    # Relationships
    admin = relationship("User", foreign_keys=[admin_id], backref="emergency_actions_performed")
    target_user = relationship("User", foreign_keys=[target_user_id], backref="emergency_actions_received")
    transferred_to_employee = relationship("Employee", foreign_keys=[transferred_to_employee_id])
    approver = relationship("User", foreign_keys=[approved_by_admin_id])


class OwnershipTransfer(Base):
    """
    Tracks ownership transfers from bakery owner to employees.
    Used for business continuity when owner is unavailable.
    """
    __tablename__ = "ownership_transfers"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Transfer Details
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # The bakery account
    from_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Original owner
    to_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)  # New owner
    
    # Reason & Authorization
    reason = Column(Text, nullable=False)
    transfer_type = Column(String, nullable=False)  # emergency, planned, temporary, permanent
    authorized_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Status
    status = Column(String, default="active")  # active, reverted, expired
    is_temporary = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=True)  # For temporary transfers
    reverted_at = Column(DateTime, nullable=True)
    
    # New Owner Details (snapshot at transfer time)
    new_owner_name = Column(String, nullable=False)
    new_owner_email = Column(String, nullable=False)
    
    # Metadata
    notes = Column(Text, nullable=True)
    transfer_data = Column(JSON, nullable=True)
    
    # Relationships
    bakery = relationship("User", foreign_keys=[bakery_id], backref="ownership_transfers")
    from_owner = relationship("User", foreign_keys=[from_owner_id])
    to_employee = relationship("Employee", foreign_keys=[to_employee_id], backref="ownership_received")
    authorized_by = relationship("User", foreign_keys=[authorized_by_admin_id])


class UserStatusHistory(Base):
    """
    Tracks all status changes for user accounts (suspensions, bans, reactivations).
    Provides complete audit trail for account status.
    """
    __tablename__ = "user_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Status Change
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    
    # Change Details
    reason = Column(Text, nullable=False)
    changed_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration_days = Column(Integer, nullable=True)  # For temporary suspensions
    expires_at = Column(DateTime, nullable=True)
    
    # Additional Context
    violation_type = Column(String, nullable=True)  # For bans: spam, abuse, fraud, etc.
    notes = Column(Text, nullable=True)
    status_data = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="status_history")
    changed_by = relationship("User", foreign_keys=[changed_by_admin_id])


class SystemAnalytics(Base):
    """
    Aggregated analytics data for advanced Super Admin insights.
    Stores daily/weekly/monthly snapshots for performance tracking.
    """
    __tablename__ = "system_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    period_type = Column(String, nullable=False)  # daily, weekly, monthly
    
    # User Metrics
    total_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    new_users = Column(Integer, default=0)
    total_bakeries = Column(Integer, default=0)
    total_charities = Column(Integer, default=0)
    suspended_users = Column(Integer, default=0)
    banned_users = Column(Integer, default=0)
    
    # Donation Metrics
    total_donations = Column(Integer, default=0)
    donations_completed = Column(Integer, default=0)
    donations_pending = Column(Integer, default=0)
    total_quantity_donated = Column(Integer, default=0)
    
    # Activity Metrics
    total_logins = Column(Integer, default=0)
    failed_logins = Column(Integer, default=0)
    peak_hour = Column(Integer, nullable=True)  # Hour of day (0-23)
    avg_session_duration = Column(Float, nullable=True)  # In minutes
    
    # Geographic Metrics
    geographic_data = Column(JSON, nullable=True)  # Distribution by location
    
    # Engagement Metrics
    complaints_filed = Column(Integer, default=0)
    complaints_resolved = Column(Integer, default=0)
    notifications_sent = Column(Integer, default=0)
    
    # System Health
    error_count = Column(Integer, default=0)
    security_alerts = Column(Integer, default=0)
    
    # Additional Metrics
    analytics_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class NotificationTemplate(Base):
    """
    Reusable notification templates for Super Admin.
    Allows quick sending of common messages.
    """
    __tablename__ = "notification_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Template Settings
    category = Column(String, nullable=True)  # maintenance, update, alert, etc.
    default_priority = Column(String, default="normal")
    send_email_default = Column(Boolean, default=False)
    
    # Metadata
    created_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    is_active = Column(Boolean, default=True)
    
    # Relationships
    creator = relationship("User", backref="notification_templates")
