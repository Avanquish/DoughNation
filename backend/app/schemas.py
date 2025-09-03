from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

from enum import Enum

# ------------------ USER MANAGEMENT  ------------------
class UserCreate(BaseModel):
    role: str  # Bakery or Charity
    name: str
    email: EmailStr
    contact_person: str
    contact_number: str
    address: str
    password: str
    confirm_password: str

class UserOut(BaseModel):
    id: int
    role: str
    name: str
    email: EmailStr
    contact_person: str
    contact_number: str
    address: str
    profile_picture: Optional[str] = None
    proof_of_validity: Optional[str] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    
class UserUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    
class ChangePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


# ------------------ BAKERY INVENTORY ------------------
class BakeryInventoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int
    creation_date: date
    expiration_date: Optional[date] = None
    threshold: int
    uploaded: str 

class BakeryInventoryCreate(BakeryInventoryBase):
    image: Optional[str] = None  # Can be uploaded as file in FastAPI

class BakeryInventoryOut(BakeryInventoryBase):
    id: int
    bakery_id: int
    image: Optional[str] = None

    class Config:
        from_attributes = True
        
# ------------------ BAKERY EMPLOYEE ------------------
class EmployeeBase(BaseModel):
    name: str
    role: str
    start_date: date

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeOut(EmployeeBase):
    id: int
    bakery_id: int

    class Config:
        from_attributes = True

# ------------------ DONATION ------------------
class DonationBase(BaseModel):
    id: int
    name: str
    quantity: int
    creation_date: date
    expiration_date: Optional[date] = None
    bakery_inventory_id: int
    image: Optional[str] = None
    threshold: Optional[int] = None
    uploaded: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

class DonationCreate(BaseModel):
    name: str
    quantity: int
    creation_date: date
    expiration_date: Optional[date] = None
    bakery_inventory_id: int
    image: Optional[str] = None
    threshold: Optional[int] = None
    uploaded: Optional[str] = None
    description: Optional[str] = None

class DonationRead(DonationBase):
    bakery_id: int
    bakery_name: str   # add this

    class Config:
        from_attributes = True
        

#---------Messages-----------
class MessageIn(BaseModel):
    receiver_id: int
    content: str

class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True


class CharityOut(BaseModel):
    id: int
    name: str
    email: str
    profile_picture: Optional[str]

    class Config:
        from_attributes = True   


class BakeryOut(BaseModel):
    id: int
    name: str
    email: str
    profile_picture: Optional[str]

    class Config:
        from_attributes = True   

#--------Complaint-----------
class ComplaintStatus(str, Enum):
    pending = "Pending"
    in_review = "In Review"
    resolved = "Resolved"
    
class ComplaintBase(BaseModel):
    subject: str
    description: str

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintUpdateStatus(BaseModel):
    status: ComplaintStatus

class ComplaintOut(ComplaintBase):
    id: int
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime 
    user_id: int
    user_name: Optional[str] = None  
    user_email: Optional[str] = None  

    class Config:
        from_attributes = True