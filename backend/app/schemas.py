from pydantic import BaseModel, EmailStr
from typing import Optional, List
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
    about: Optional[str] = None 
    address: str
    profile_picture: Optional[str] = None
    proof_of_validity: Optional[str] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str  # Changed from EmailStr to str - now accepts both email and employee name
    password: str
    role: str | None = None  # Optional role for validation (Bakery, Charity, Admin)

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
    
class ResetPassword(BaseModel):
    email: EmailStr
    registration_date: date
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
    status: Optional[str] = "available"

class BakeryInventoryCreate(BakeryInventoryBase):
    image: Optional[str] = None  # Can be uploaded as file in FastAPI

class BakeryInventoryOut(BakeryInventoryBase):
    id: int
    bakery_id: int
    product_id: str
    image: Optional[str] = None

    class Config:
        from_attributes = True

class BakeryInventoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    creation_date: Optional[date] = None
    expiration_date: Optional[date] = None
    threshold: Optional[int] = None
    uploaded: Optional[str] = None
    image: Optional[str] = None
        
# ------------------ BAKERY EMPLOYEE ------------------
class EmployeeBase(BaseModel):
    name: str
    email: EmailStr  # Employee's Gmail address
    role: str  # Manager, Full-time, Part-time
    start_date: date

class EmployeeCreate(EmployeeBase):
    password: Optional[str] = None  # Optional password for login

class EmployeeLogin(BaseModel):
    """Employee login with employee_id and password"""
    employee_id: str  # Changed from 'name' to 'employee_id'
    password: str

class EmployeeChangePassword(BaseModel):
    """Employee password change request"""
    current_password: str
    new_password: str
    confirm_password: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[date] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None  # Optional password update

class EmployeeOut(BaseModel):
    id: int
    employee_id: Optional[str] = None  # Unique Employee ID (e.g., EMP-5-001)
    bakery_id: int
    name: str
    email: str  # Employee's Gmail address
    role: str
    start_date: date
    profile_picture: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EmployeeTokenResponse(BaseModel):
    """Employee login response with token"""
    access_token: str
    token_type: str
    employee_id: int
    employee_name: str
    employee_role: str
    bakery_id: int
    bakery_name: str

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
    distance_km: Optional[float] = None  #Add this to show kn on donation available cards
 

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
    bakery_inventory_id: int  # ← ADD THIS
    timestamp: datetime
    status: str
    donation_name: Optional[str] = None
    donation_image: Optional[str] = None
    donation_quantity: Optional[int] = None
    donation_expiration: Optional[datetime] = None
    bakery_name: Optional[str] = None
    bakery_profile_picture: Optional[str] = None

    class Config:
        from_attributes = True
        
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
    btracking_status: Optional[str] = None 
    bakery_name: Optional[str] = None              
    bakery_profile_picture: Optional[str] = None
    donated_by: Optional[str] = None  # Add this field


    class Config:
        from_attributes = True
        
#---------Donation Tracking----------
class TrackingUpdate(BaseModel):
    tracking_status: str

class bTrackingUpdate(BaseModel):
    btracking_status: str

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
        
# ------------------ FEEDBACK ------------------
class FeedbackCreate(BaseModel):
    message: str
    rating: Optional[int] = None  # make rating optional if not always required

class FeedbackOut(BaseModel):
    id: int
    message: str
    rating: Optional[int]
    created_at: datetime
    charity_id: int
    donation_id: Optional[int] = None
    direct_donation_id: Optional[int] = None

    class Config:
        from_attributes = True

#Fetch feedback on charity
class FeedbackRead(BaseModel):
    id: int
    donation_request_id: Optional[int] = None
    direct_donation_id: Optional[int] = None
    charity_id: int
    bakery_id: int
    message: str
    rating: Optional[int] = None
    reply_message: Optional[str] 
    created_at: datetime
    bakery_name: Optional[str] = None
    bakery_profile_picture: Optional[str] = None
    product_name: Optional[str] = None
    product_quantity: Optional[int] = None
    product_image: Optional[str] = None
    media_file: Optional[str] = None
    charity_name: Optional[str] = None
    charity_profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

class FeedbackUpdate(BaseModel):
    message: Optional[str] = None
    rating: Optional[int] = None

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
        
# ---------- Badges ----------
class BadgeBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None

class BadgeCreate(BadgeBase):
    user_id: int
    pass

class BadgeResponse(BadgeBase):
    id: int
    name: str
    icon_url: Optional[str]
    is_special: bool
    created_by: Optional[int]

    class Config:
        from_attributes = True

class UserBadgeBase(BaseModel):
    user_id: int
    badge_id: int
    badge_name: Optional[str] = None 
    description: Optional[str] = None

class UserBadgeResponse(BaseModel):
    id: int
    user_id: int
    badge_id: int
    badge_name: Optional[str] = None
    description: Optional[str] = None
    unlocked_at: Optional[datetime] = None
    badge: BadgeResponse

    class Config:
        from_attributes = True

class BadgeProgressBase(BaseModel):
    user_id: int
    badge_id: int
    progress: int
    target: int

class BadgeProgressResponse(BadgeProgressBase):
    id: Optional [int]

    class Config:
        from_attributes = True
        
# ------------- Analytics ---------------
class InventoryItem(BaseModel):
    id: int
    product_name: str
    quantity: int
    expiration_date: Optional[date]

    class Config:
        from_attributes = True

class DonationItem(BaseModel):
    id: int
    product_name: str
    quantity: int
    status: str

    class Config:
        from_attributes = True

class EmployeeItem(BaseModel):
    id: int
    name: str
    role: str

    class Config:
        from_attributes = True

class BadgeItem(BaseModel):
    id: int
    name: str
    image: str

    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    inventory: List[InventoryItem]
    donations: List[DonationItem]
    employees: List[EmployeeItem]
    badges: List[BadgeItem] 