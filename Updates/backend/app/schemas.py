from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

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
    
# ------------------ BAKERY INVENTORY ------------------
class BakeryInventoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int
    creation_date: date
    expiration_date: Optional[date] = None
    threshold: int
    uploaded: str 
    status: Optional[str] = "available"

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
    bakery_id: int
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
    bakery_name: str  
    bakery_profile_picture: Optional[str] = None 

    class Config:
        from_attributes = True

class DonationRequestCreate(BaseModel):
    donation_id: int
    bakery_id: int
    
class DonationRequestRead(BaseModel):
    id: int
    donation_id: Optional[int]
    charity_id: int
    bakery_id: int
    timestamp: datetime
    status: str

    class Config:
        orm_mode = True

# ------------------ DIRECT DONATION ------------------
class DirectDonationBase(BaseModel):
    name: str
    quantity: int
    threshold: int
    creation_date: date
    expiration_date: Optional[date] = None
    description: Optional[str] = None
    bakery_inventory_id: int
    charity_id: int
    image: Optional[str] = None

class DirectDonationCreate(DirectDonationBase):
    pass

class DirectDonationResponse(DirectDonationBase):
    id: int
    bakery_inventory_name: Optional[str] = None  # name of the product
    charity_name: Optional[str] = None          # name of the receiving charity
    charity_profile_picture: Optional[str] = None

    class Config:
        orm_mode = True
        
#---------Messages-----------
class MessageIn(BaseModel):
    receiver_id: int
    content: str
    image: Optional[str] = None   # URL or base64 string
    video: Optional[str] = None   # URL or base64 string


class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_profile_picture: Optional[str] = None
    receiver_id: int
    receiver_name: Optional[str] = None
    receiver_profile_picture: Optional[str] = None
    content: str
    image: Optional[str]
    video: Optional[str]
    timestamp: datetime
    is_read: bool
    is_card: bool 
    deleted_for_sender: bool
    deleted_for_receiver: bool
    accepted_by_receiver: bool

    class Config:
        orm_mode = True


class CharityOut(BaseModel):
    id: int
    name: str
    email: str
    profile_picture: Optional[str]

    class Config:
        orm_mode = True   


class BakeryOut(BaseModel):
    id: int
    name: str
    email: str
    profile_picture: Optional[str]

    class Config:
        orm_mode = True   
