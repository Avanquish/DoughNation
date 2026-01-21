from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Date, DateTime, func, Enum, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, date
import enum
from enum import Enum as PyEnum
from app.timezone_utils import now_ph

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)  # Donor, Charity, or Admin
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)  # Now accepts any email (Gmail, etc.)
    contact_person = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    address = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)  # path to uploaded image
    proof_of_validity = Column(String, nullable=True)  # path to uploaded document
    created_at = Column(DateTime, default=now_ph)
    about = Column(Text, nullable=True)

    # Geofencing
    latitude = Column(Float, nullable=True)   # Charity location
    longitude = Column(Float, nullable=True)
    notification_radius_km = Column(Float, default=10)  # optional max radius
    
    # Admin verification (Donor/Charity accounts need admin approval)
    verified = Column(Boolean, default=False)
    
    # Account Status Management (Super Admin feature)
    status = Column(String, default="Pending", nullable=False)  # Active, Pending, Suspended, Banned, Deactivated, Rejected
    status_reason = Column(Text, nullable=True)  # Reason for suspension/ban/rejection
    status_changed_at = Column(DateTime, nullable=True)
    status_changed_by = Column(Integer, nullable=True)  # Admin ID who changed status
    suspended_until = Column(DateTime, nullable=True)  # For temporary suspensions
    banned_at = Column(DateTime, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    
    # Email verification fields
    email_verified = Column(Boolean, default=False)  # Tracks if user verified their email
    verification_token = Column(String, nullable=True)  # Token for email verification
    verification_token_expires = Column(DateTime, nullable=True)  # Token expiration
    
    # Password reset fields
    reset_token = Column(String, nullable=True)  # Token for password reset
    reset_token_expires = Column(DateTime, nullable=True)  # Reset token expiration
    
    # Default password tracking (for admin security)
    using_default_password = Column(Boolean, default=False)  # True if user is still using seeded/default password
    
    # OTP fields for forgot password
    forgot_password_otp = Column(String, nullable=True)  # 6-digit OTP code
    forgot_password_otp_expires = Column(DateTime, nullable=True)  # OTP expiration time
    
    # One-time password tracking (for ownership transfers and emergency resets)
    must_change_password = Column(Boolean, default=False)  # Forces password change on next login
    temp_password_created_at = Column(DateTime, nullable=True)  # When the temporary password was set

     # Parent side of the relationship
    inventory_items = relationship("DonorInventory", back_populates="bakery")

    # Parent side of donations
    donations = relationship("Donation", back_populates="bakery")

    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    received_messages = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")

    complaints = relationship("Complaint", back_populates="user", foreign_keys="Complaint.user_id")

    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    badge_progress = relationship("BadgeProgress", back_populates="user", cascade="all, delete-orphan")
    created_badges = relationship("Badge", back_populates="creator")
    
    # System events relationship
    events = relationship("SystemEvent", back_populates="user")

 
class DonorInventory(Base):
    __tablename__ = "bakery_inventory"  # Keep table name for database compatibility

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Keep column name for database compatibility
    created_by_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)  # Track which employee created it
    product_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)  # Required for food, optional for non-food
    threshold = Column(Integer, nullable=False)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default="available")
    
    # New fields for multi-type donations
    donation_type = Column(String, nullable=False, default="Food")  # Food, Clothes, School Supplies, Other
    category = Column(String, nullable=True)  # For non-food items: type/category
    condition = Column(String, nullable=True)  # For non-food items: New, Like New, Good, Fair


    bakery = relationship("User", back_populates="inventory_items")  # Keep relationship name for compatibility
    created_by_employee = relationship("Employee", back_populates="inventory_items")
    donations = relationship("Donation", back_populates="inventory_item", cascade="all, delete-orphan") 
    direct_donations = relationship("DirectDonation", back_populates="bakery_inventory", cascade="all, delete-orphan")

    
class EmployeeRole(str, enum.Enum):
    """Employee roles with access control levels"""
    MANAGER = "Manager"
    EMPLOYEE = "Employee"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, nullable=False, index=True)  # Unique Employee ID (e.g., EMP-5-001)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # Keep column name for database compatibility - refers to donor
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)  # Employee's Gmail address
    role = Column(String, nullable=False)  # Manager, Employee
    start_date = Column(Date, nullable=False)
    profile_picture = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # Password for employee login (optional, can be None for new employees)
    initial_password_hash = Column(String, nullable=True)  # Store initial password hash to prevent reuse
    password_changed = Column(Boolean, default=False)  # Track if employee has changed their password
    created_at = Column(DateTime, default=now_ph)
    updated_at = Column(DateTime, default=now_ph, onupdate=now_ph)
    
    # OTP fields for forgot password
    forgot_password_otp = Column(String, nullable=True)  # 6-digit OTP code
    forgot_password_otp_expires = Column(DateTime, nullable=True)  # OTP expiration time
    
    # One-time password tracking (for ownership transfers)
    must_change_password = Column(Boolean, default=False)  # Forces password change on next login
    temp_password_created_at = Column(DateTime, nullable=True)  # When the temporary password was set
    
    # Relationships
    bakery = relationship("User", backref="employees")  # Keep relationship name for compatibility - refers to donor
    inventory_items = relationship("DonorInventory", back_populates="created_by_employee")
    donations = relationship("Donation", back_populates="created_by_employee")
    password_history = relationship("EmployeePasswordHistory", back_populates="employee", passive_deletes=True)


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id", ondelete="CASCADE"), nullable=False)  # Keep column name for database compatibility
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Keep column name for database compatibility - refers to donor
    created_by_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)  # Track which employee created it
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)


    bakery = relationship("User", back_populates="donations")  # Keep relationship name for compatibility - refers to donor
    created_by_employee = relationship("Employee", back_populates="donations")
    inventory_item = relationship("DonorInventory", back_populates="donations")

class DonationRequest(Base):
    __tablename__ = "donation_requests"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id", ondelete="CASCADE"))
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id"))  # Keep column name for database compatibility
    charity_id = Column(Integer, ForeignKey("users.id"))
    bakery_id = Column(Integer, ForeignKey("users.id"))  # Keep column name for database compatibility - refers to donor
    timestamp = Column(DateTime, default=now_ph)
    status = Column(String, default="pending") 
    tracking_status = Column(String, default="preparing")
    tracking_completed_at = Column(DateTime, nullable=True) 
    feedback_submitted = Column(Boolean, default=False) 
    bakery_name = Column(String, nullable=True)  # Keep column name for database compatibility - refers to donor name
    bakery_profile_picture = Column(String, nullable=True)  # Keep column name for database compatibility - refers to donor profile
    donation_name = Column(String, nullable=True)
    donation_image = Column(String, nullable=True)
    donation_quantity = Column(Integer, nullable=True)
    donation_expiration = Column(DateTime, nullable=True)
    rdonated_by = Column(String, nullable=True)

    donation = relationship("Donation", backref="requests", passive_deletes=True)
    inventory_item = relationship("DonorInventory")  # Updated to use DonorInventory

    charity = relationship("User", foreign_keys=[charity_id])
    bakery = relationship("User", foreign_keys=[bakery_id])  # Keep relationship name for compatibility - refers to donor

class DonationCardChecking(Base):
    __tablename__ = "donationscardchecking"
    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer)
    recipient_id = Column(Integer)
    donation_request_id = Column(Integer, ForeignKey("donation_requests.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="pending")

    request = relationship("DonationRequest", backref="check_records")
    
class DirectDonation(Base):
    __tablename__ = "direct_donations"

    id = Column(Integer, primary_key=True, index=True)
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id"))  # Keep column name for database compatibility
    charity_id = Column(Integer, ForeignKey("users.id"))  # points to User (charity)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    donation_type = Column(String, nullable=False, default="Food")  # Food, Clothes, School Supplies, Other
    btracking_status = Column(String, default="preparing")
    btracking_completed_at = Column(DateTime, nullable=True)
    feedback_submitted = Column(Boolean, default=False)
    donated_by = Column(String, nullable=True) 

    created_at = Column(DateTime, default=now_ph)

    # Relationships
    bakery_inventory = relationship("DonorInventory")  # Updated to use DonorInventory
    charity = relationship("User") 

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    image = Column(String, nullable=True)     # optional image URL
    video = Column(String, nullable=True)     # optional video URL
    timestamp = Column(DateTime, default=func.now())
    is_card = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    deleted_for_sender = Column(Boolean, default=False)
    deleted_for_receiver = Column(Boolean, default=False)
    deleted_for_all = Column(Boolean, default=False)
    accepted_by_receiver = Column(Boolean, default=False)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])

class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notif_id = Column(String, index=True)
    read_at = Column(DateTime, default=now_ph)
    
    user = relationship("User", backref="read_notifications")

#---------Feedback------------
class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    donation_request_id = Column(Integer, ForeignKey("donation_requests.id", ondelete="CASCADE"), nullable=True)
    direct_donation_id = Column(Integer, ForeignKey("direct_donations.id", ondelete="CASCADE"), nullable=True)
    charity_id = Column(Integer, ForeignKey("users.id"))
    bakery_id = Column(Integer, ForeignKey("users.id"))  # Keep column name for database compatibility - refers to donor
    message = Column(String, nullable=False)
    rating = Column(Integer, nullable=True) 
    created_at = Column(DateTime, default=now_ph)
    product_name = Column(String, nullable=True)
    product_quantity = Column(Integer, nullable=True)
    product_image = Column(String, nullable=True)
    media_file = Column(String, nullable=True)
    reply_message = Column(String, nullable=True) 

    # Add these relationships
    charity = relationship("User", foreign_keys=[charity_id])
    bakery = relationship("User", foreign_keys=[bakery_id])  # Keep relationship name for compatibility - refers to donor

#--------Complaints------------
class ComplaintStatus(str, enum.Enum):
    pending = "Pending"
    in_review = "In Review"
    resolved = "Resolved"

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.pending)
    created_at = Column(DateTime, default=now_ph)
    updated_at = Column(DateTime, default=now_ph, onupdate=now_ph)
    
    # Admin reply fields
    admin_reply = Column(Text, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    replied_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="complaints", foreign_keys=[user_id])

#--------Badges------------    
class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50))
    description = Column(Text)
    icon_url = Column(String(255))
    is_special = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    target = Column(Integer, default=1)  # default target = 1 if not set

    creator = relationship("User", back_populates="created_badges", foreign_keys=[created_by])
    user_badges = relationship("UserBadge", back_populates="badge")

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="CASCADE"))
    unlocked_at = Column(TIMESTAMP, server_default=func.now())
    description = Column(Text, nullable=True)
    badge_name = Column(String, nullable=True)
    

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges", lazy="joined")

class BadgeProgress(Base):
    __tablename__ = "badge_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="CASCADE"))
    progress = Column(Integer, default=0)
    target = Column(Integer, default=1)

    user = relationship("User", back_populates="badge_progress")
    badge = relationship("Badge")

class PasswordHistory(Base):
    """Track password history for Users to prevent password reuse"""
    __tablename__ = "password_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    hashed_password = Column(String, nullable=False)  # Historical password hash
    changed_at = Column(DateTime, default=now_ph, nullable=False)
    
    user = relationship("User", backref="password_history")

class EmployeePasswordHistory(Base):
    """Track password history for Employees to prevent password reuse"""
    __tablename__ = "employee_password_history"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    hashed_password = Column(String, nullable=False)  # Historical password hash
    changed_at = Column(DateTime, default=now_ph, nullable=False)
    
    employee = relationship("Employee", back_populates="password_history", passive_deletes=True)

class SystemEvent(Base):
    __tablename__ = "system_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True, nullable=False)  # "failed_login", "unauthorized_access", "sos_alert", "geofence_breach", "uptime", "downtime"
    description = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for system-wide events
    timestamp = Column(DateTime, default=now_ph, index=True)
    severity = Column(String, default="info")  # "info", "warning", "critical"
    event_metadata = Column(String, nullable=True)  # JSON string for additional data (IP address, location, etc.)
    
    user = relationship("User", back_populates="events")

class EmailVerification(Base):
    """Temporary storage for email verification OTPs during registration"""
    __tablename__ = "email_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    otp_code = Column(String, nullable=True)  # 6-digit OTP code
    otp_expires = Column(DateTime, nullable=True)  # OTP expiration time
    verified = Column(Boolean, default=False)  # Whether email has been verified
    verified_at = Column(DateTime, nullable=True)  # When verification was completed
    created_at = Column(DateTime, default=now_ph)

class ThresholdNotification(Base):
    """Track threshold notifications shown to users for products"""
    __tablename__ = "threshold_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("bakery_inventory.id"), nullable=False, index=True)
    shown_at = Column(DateTime, default=now_ph, nullable=False)
    dismissed = Column(Boolean, default=False)  # User rejected/dismissed
    donated = Column(Boolean, default=False)  # User donated the product
    
    bakery = relationship("User")
    product = relationship("DonorInventory")

class AdminInventory(Base):
    """Admin inventory - items received from donors"""
    __tablename__ = "admin_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, nullable=False)
    image = Column(String, nullable=True)
    donation_type = Column(String, nullable=False, default="Food")
    category = Column(String, nullable=True)
    condition = Column(String, nullable=True)
    source = Column(String, nullable=False)  # "donation" or "manual"
    donated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    donation_request_id = Column(Integer, nullable=True)
    received_date = Column(Date, nullable=False, default=date.today)
    expiration_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=now_ph)
    updated_at = Column(DateTime, default=now_ph)

class AdminDonationRequest(Base):
    """Track donations from donors to admin (Scholars Of Sustenance)"""
    __tablename__ = "admin_donation_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id"), nullable=True)  # Nullable for direct donations
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    donation_name = Column(String, nullable=False)
    donation_image = Column(String, nullable=True)
    donation_quantity = Column(Integer, nullable=False)
    donation_expiration = Column(Date, nullable=True)
    donation_type = Column(String, nullable=False, default="Food")
    timestamp = Column(DateTime, default=now_ph)
    status = Column(String, default="pending")  # pending, accepted, rejected
    tracking_status = Column(String, default="preparing")  # preparing, in_transit, delivered
    tracking_completed_at = Column(DateTime, nullable=True)
    feedback_submitted = Column(Boolean, default=False)
    donor_name = Column(String, nullable=True)
    donor_profile_picture = Column(String, nullable=True)

class LoginAttempt(Base):
    """Track failed login attempts for account security"""
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, nullable=False, index=True)  # email or employee name
    login_type = Column(String, nullable=False)  # 'user' or 'employee'
    bakery_id = Column(Integer, nullable=True)  # For employee logins only
    failed_attempts = Column(Integer, default=0)
    total_failed_attempts = Column(Integer, default=0)  # Cumulative failures across all blocks
    block_level = Column(Integer, default=0)  # 0=no block, 1=5min, 2=10min, 3=30min, etc.
    blocked_until = Column(DateTime, nullable=True)
    last_attempt = Column(DateTime, default=now_ph)
    created_at = Column(DateTime, default=now_ph)

# Backward compatibility alias - allows existing code to use BakeryInventory
# This must come after all class definitions
BakeryInventory = DonorInventory
    