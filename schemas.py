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