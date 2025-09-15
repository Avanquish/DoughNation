from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Date, DateTime, func, Enum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)  # Bakery or Charity
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    contact_person = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    address = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)  # path to uploaded image
    proof_of_validity = Column(String, nullable=True)  # path to uploaded document
    
    verified = Column(Boolean, default=False)

     # Parent side of the relationship
    inventory_items = relationship("BakeryInventory", back_populates="bakery")

    # Parent side of donations
    donations = relationship("Donation", back_populates="bakery")

    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    received_messages = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")

    complaints = relationship("Complaint", back_populates="user")

 
class BakeryInventory(Base):
    __tablename__ = "bakery_inventory"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
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
    donations = relationship("Donation", back_populates="inventory_item", cascade="all, delete-orphan") 
    direct_donations = relationship("DirectDonation", back_populates="bakery_inventory", cascade="all, delete-orphan")

    
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Manager, Staff, etc.
    start_date = Column(Date, nullable=False)
    profile_picture = Column(String, nullable=True)
    
    bakery = relationship("User", backref="employees")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id", ondelete="CASCADE"), nullable=False)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)


    bakery = relationship("User", back_populates="donations")
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
    feedback_submitted = Column(Boolean, default=False) 
    bakery_name = Column(String, nullable=True)
    bakery_profile_picture = Column(String, nullable=True)
    donation_name = Column(String, nullable=True)
    donation_image = Column(String, nullable=True)
    donation_quantity = Column(Integer, nullable=True)
    donation_expiration = Column(DateTime, nullable=True)

    donation = relationship("Donation", backref="requests", passive_deletes=True)
    inventory_item = relationship("BakeryInventory")

class DirectDonation(Base):
    __tablename__ = "direct_donations"

    id = Column(Integer, primary_key=True, index=True)
    bakery_inventory_id = Column(Integer, ForeignKey("bakery_inventory.id"))
    charity_id = Column(Integer, ForeignKey("users.id"))  # 👈 points to User (charity)
    
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    btracking_status = Column(String, default="preparing")
    feedback_submitted = Column(Boolean, default=False)

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
