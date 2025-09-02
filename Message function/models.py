from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Date, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

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

    
class BakeryInventory(Base):
    __tablename__ = "bakery_inventory"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    threshold = Column(Integer, nullable=False)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)


    bakery = relationship("User", back_populates="inventory_items")
    donations = relationship("Donation", back_populates="inventory_item", cascade="all, delete-orphan") 

    
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Manager, Staff, etc.
    start_date = Column(Date, nullable=False)
    
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

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Date, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

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

    
class BakeryInventory(Base):
    __tablename__ = "bakery_inventory"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    creation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    threshold = Column(Integer, nullable=False)
    uploaded = Column(String, nullable=False)
    description = Column(String, nullable=True)


    bakery = relationship("User", back_populates="inventory_items")
    donations = relationship("Donation", back_populates="inventory_item", cascade="all, delete-orphan") 

    
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    bakery_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Manager, Staff, etc.
    start_date = Column(Date, nullable=False)
    
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

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])
