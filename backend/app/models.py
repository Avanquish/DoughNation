from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Date, DateTime, func, Enum, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, date
import enum
from enum import Enum as PyEnum

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)  # Bakery, Charity, or Admin
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)  # Now accepts any email (Gmail, etc.)
    contact_person = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    address = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)  # path to uploaded image
    proof_of_validity = Column(String, nullable=True)  # path to uploaded document
    created_at = Column(Date, default=date.today)
    about = Column(Text, nullable=True)

    # Geofencing
    latitude = Column(Float, nullable=True)   # Charity location
    longitude = Column(Float, nullable=True)
    notification_radius_km = Column(Float, default=10)  # optional max radius
    
    # Admin verification (Bakery/Charity accounts need admin approval)
    verified = Column(Boolean, default=False)
    
    # Email verification fields
    email_verified = Column(Boolean, default=False)  # Tracks if user verified their email
    verification_token = Column(String, nullable=True)  # Token for email verification
    verification_token_expires = Column(DateTime, nullable=True)  # Token expiration
    
    # Password reset fields
    reset_token = Column(String, nullable=True)  # Token for password reset
    reset_token_expires = Column(DateTime, nullable=True)  # Reset token expiration
    
    # OTP fields for forgot password
    forgot_password_otp = Column(String, nullable=True)  # 6-digit OTP code
    forgot_password_otp_expires = Column(DateTime, nullable=True)  # OTP expiration time

     # Parent side of the relationship
    inventory_items = relationship("BakeryInventory", back_populates="bakery")

    # Parent side of donations
    donations = relationship("Donation", back_populates="bakery")

    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    received_messages = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")

    complaints = relationship("Complaint", back_populates="user")

    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    badge_progress = relationship("BadgeProgress", back_populates="user", cascade="all, delete-orphan")
    created_badges = relationship("Badge", back_populates="creator")
    
    # System events relationship
    events = relationship("SystemEvent", back_populates="user")

 
class BakeryInventory(Base):
    __tablename__ = "bakery_inventory"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # Track which employee created it
    product_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    threshold = Column(Integer, nullable=False)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default="available")


    bakery = relationship("User", back_populates="inventory_items")
    created_by_employee = relationship("Employee", back_populates="inventory_items")
    donations = relationship("Donation", back_populates="inventory_item", cascade="all, delete-orphan") 
    direct_donations = relationship("DirectDonation", back_populates="bakery_inventory", cascade="all, delete-orphan")

    
class EmployeeRole(str, enum.Enum):
    """Employee roles with access control levels"""
    MANAGER = "Manager"
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, nullable=False, index=True)  # Unique Employee ID (e.g., EMP-5-001)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)  # Employee's Gmail address
    role = Column(String, nullable=False)  # Manager, Full-time, Part-time
    start_date = Column(Date, nullable=False)
    profile_picture = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # Password for employee login (optional, can be None for new employees)
    initial_password_hash = Column(String, nullable=True)  # Store initial password hash to prevent reuse
    password_changed = Column(Boolean, default=False)  # Track if employee has changed their password
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # OTP fields for forgot password
    forgot_password_otp = Column(String, nullable=True)  # 6-digit OTP code
    forgot_password_otp_expires = Column(DateTime, nullable=True)  # OTP expiration time
    
    # Relationships
    bakery = relationship("User", backref="employees")
    inventory_items = relationship("BakeryInventory", back_populates="created_by_employee")
    donations = relationship("Donation", back_populates="created_by_employee")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id", ondelete="CASCADE"), nullable=False)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # Track which employee created it
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)


    bakery = relationship("User", back_populates="donations")
    created_by_employee = relationship("Employee", back_populates="donations")
    inventory_item = relationship("BakeryInventory", back_populates="donations")

class DonationRequest(Base):
    __tablename__ = "donation_requests"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id", ondelete="CASCADE"))
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id"))
    charity_id = Column(Integer, ForeignKey("users.id"))
    bakery_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending") 
    tracking_status = Column(String, default="preparing")
    tracking_completed_at = Column(Date, nullable=True) 
    feedback_submitted = Column(Boolean, default=False) 
    bakery_name = Column(String, nullable=True)
    bakery_profile_picture = Column(String, nullable=True)
    donation_name = Column(String, nullable=True)
    donation_image = Column(String, nullable=True)
    donation_quantity = Column(Integer, nullable=True)
    donation_expiration = Column(DateTime, nullable=True)
    rdonated_by = Column(String, nullable=True)

    donation = relationship("Donation", backref="requests", passive_deletes=True)
    inventory_item = relationship("BakeryInventory")

    charity = relationship("User", foreign_keys=[charity_id])
    bakery = relationship("User", foreign_keys=[bakery_id])

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
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id"))
    charity_id = Column(Integer, ForeignKey("users.id"))  # points to User (charity)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    btracking_status = Column(String, default="preparing")
    btracking_completed_at = Column(Date, nullable=True)
    feedback_submitted = Column(Boolean, default=False)
    donated_by = Column(String, nullable=True) 

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bakery_inventory = relationship("BakeryInventory")
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
    accepted_by_receiver = Column(Boolean, default=False)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])

class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notif_id = Column(String, index=True)
    read_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="read_notifications")

#---------Feedback------------
class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    donation_request_id = Column(Integer, ForeignKey("donation_requests.id", ondelete="CASCADE"), nullable=True)
    direct_donation_id = Column(Integer, ForeignKey("direct_donations.id", ondelete="CASCADE"), nullable=True)
    charity_id = Column(Integer, ForeignKey("users.id"))
    bakery_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String, nullable=False)
    rating = Column(Integer, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)
    product_name = Column(String, nullable=True)
    product_quantity = Column(Integer, nullable=True)
    product_image = Column(String, nullable=True)
    media_file = Column(String, nullable=True)
    reply_message = Column(String, nullable=True) 

    # Add these relationships
    charity = relationship("User", foreign_keys=[charity_id])
    bakery = relationship("User", foreign_keys=[bakery_id])

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="complaints")

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

class SystemEvent(Base):
    __tablename__ = "system_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True, nullable=False)  # "failed_login", "unauthorized_access", "sos_alert", "geofence_breach", "uptime", "downtime"
    description = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for system-wide events
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    severity = Column(String, default="info")  # "info", "warning", "critical"
    event_metadata = Column(String, nullable=True)  # JSON string for additional data (IP address, location, etc.)
    
    user = relationship("User", back_populates="events")
    