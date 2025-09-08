import random
from typing import Optional
from fastapi import HTTPException, status, UploadFile, File, Form
import os
import shutil
from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload

from app import schemas
from . import models, auth
from datetime import date, datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_user(
    db: Session,
    role: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    contact_person: str = Form(...),
    contact_number: str = Form(...),
    address: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    profile_picture: UploadFile = File(...),
    proof_of_validity: UploadFile = File(...)
):
    
    # Clean role input
    role = role.strip().lower()

    # Email domain validation based on role
    valid_domains = {
        "bakery": "bakery.com",
        "charity": "charity.com",
        "admin": "admin.com",
    }

    email_domain = email.split("@")[-1]
    if role not in valid_domains or email_domain != valid_domains[role]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email must end with @{valid_domains.get(role, 'yourdomain.com')} for role '{role}'"
        )
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check password confirmation
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # Save profile picture
    os.makedirs("uploads/profile_pictures", exist_ok=True)
    profile_pic_path = f"uploads/profile_pictures/{profile_picture.filename}"
    with open(profile_pic_path, "wb") as buffer:
        shutil.copyfileobj(profile_picture.file, buffer)

    # Save proof of validity
    os.makedirs("uploads/proofs", exist_ok=True)
    proof_path = f"uploads/proofs/{proof_of_validity.filename}"
    with open(proof_path, "wb") as buffer:
        shutil.copyfileobj(proof_of_validity.file, buffer)

    # Hash password and create user
    hashed_password = pwd_context.hash(password)
    db_user = models.User(
        role=role.strip().capitalize(),
        name=name,
        email=email,
        contact_person=contact_person,
        contact_number=contact_number,
        address=address,
        hashed_password=hashed_password,
        profile_picture=profile_pic_path,
        proof_of_validity=proof_path,
        verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

#Update User Information
def update_user_info(
    db: Session,
    user_id: int,
    name: Optional[str] = None,
    contact_person: Optional[str] = None,
    contact_number: Optional[str] = None,
    address: Optional[str] = None,
    profile_picture: UploadFile = None
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role.lower() == "admin":
        raise HTTPException(status_code=403, detail="Admin information cannot be edited")

    if name is not None and name != "":
        user.name = name
    if contact_person is not None and contact_person != "":
        user.contact_person = contact_person
    if contact_number is not None and contact_number != "":
        user.contact_number = contact_number
    if address is not None and address != "":
        user.address = address

    if profile_picture:
        os.makedirs("uploads/profile_pictures", exist_ok=True)
        profile_pic_path = f"uploads/profile_pictures/{profile_picture.filename}"
        with open(profile_pic_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        user.profile_picture = profile_pic_path

    db.commit()
    db.refresh(user)
    return user

#Change Password
def change_user_password(db: Session, user_id: int, current_password: str, new_password: str, confirm_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role.lower() == "admin":
        raise HTTPException(status_code=403, detail="Admin password cannot be changed")

    if not auth.verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    user.hashed_password = pwd_context.hash(new_password)
    db.commit()
    return {"message": "Password updated successfully"}


#login w/ authentication
def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if user and auth.verify_password(password, user.hashed_password):
        return user
    return None

#predefined admin
def seed_admin_user(db: Session):
    from .models import User

    admin_email = "admin@admin.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()

    if existing_admin:
        print("[✔] Admin already exists.")
        return

    default_admin = User(
        role="Admin",
        name="Super Admin",
        email=admin_email,
        contact_person="System",
        contact_number="0000-000-0000",
        address="Head Office",
        hashed_password=pwd_context.hash("admin1234"), 
        profile_picture="uploads/profile_pictures/default_admin.png",
        proof_of_validity="uploads/proofs/default_proof.pdf",
        verified=True
    )

    db.add(default_admin)
    db.commit()
    
# ------------------ BAKERY INVENTORY ------------------
def generate_product_id(name: str):
    base = (name or "P").upper().replace(" ", "")
    prefix = "".join(name.split())[:3].upper()
    unique = str(int(datetime.now().timestamp()))[-6:] + str(random.randint(100, 999))
    return f"{prefix}-{unique}"

def create_inventory(
    db: Session,
    bakery_id: int,
    name: str,
    image,
    quantity: int,
    creation_date: str,
    expiration_date: str,
    threshold: int,
    uploaded: str,
    description: str = None
):
    from datetime import datetime

    image_path = None
    if image:
        if isinstance(image, UploadFile):
            os.makedirs("uploads/inventory_images", exist_ok=True)
            image_path = f"uploads/inventory_images/{image.filename}"
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
        elif isinstance(image, str):
            image_path = image

    item = models.BakeryInventory(
        bakery_id=bakery_id,
        product_id=generate_product_id(name),
        name=name,
        image=image_path,
        quantity=quantity,
        creation_date=datetime.strptime(creation_date, "%Y-%m-%d").date(),
        expiration_date=datetime.strptime(expiration_date, "%Y-%m-%d").date() if expiration_date else None,
        threshold=threshold,
        uploaded=uploaded,
        description=description
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_inventory(db: Session, bakery_id: int):
    return db.query(models.BakeryInventory).filter(models.BakeryInventory.bakery_id == bakery_id).all()

def update_inventory(
    db: Session,
    inventory_id: int,
    bakery_id: int,
    name: str,
    image,
    quantity: int,
    creation_date: str,
    expiration_date: str,
    threshold: int,
    uploaded: str,
    description: str = None
):
    from datetime import datetime

    # Find the item
    item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == inventory_id,
        models.BakeryInventory.bakery_id == bakery_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Update basic fields
    item.name = name
    item.quantity = quantity
    item.creation_date = datetime.strptime(creation_date, "%Y-%m-%d").date()
    item.expiration_date = datetime.strptime(expiration_date, "%Y-%m-%d").date() if expiration_date else None
    item.threshold = threshold
    item.uploaded = uploaded
    item.description = description

    # Handle image update
    if image:
        if isinstance(image, UploadFile):
            os.makedirs("uploads/inventory_images", exist_ok=True)
            image_path = f"uploads/inventory_images/{image.filename}"
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            item.image = image_path
        elif isinstance(image, str):
            item.image = image  # keep existing path

    db.commit()
    db.refresh(item)
    return item


def delete_inventory(db: Session, inventory_id: int, bakery_id: int):
    # Find the item
    item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == inventory_id,
        models.BakeryInventory.bakery_id == bakery_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Remove the image file if it exists
    if item.image and os.path.exists(item.image):
        os.remove(item.image)

    # Delete from DB
    db.delete(item)
    db.commit()

# ------------------ BAKERY EMPLOYEE ------------------
EMPLOYEE_UPLOAD_DIR = "uploads/employee_pictures"
os.makedirs(EMPLOYEE_UPLOAD_DIR, exist_ok=True)

def create_employee(
    db: Session,
    bakery_id: int,
    name: str,
    role: str,
    start_date: date,
    profile_picture: Optional[UploadFile] = None
):
    picture_path = None

    if profile_picture:
        filename = f"{bakery_id}_{int(datetime.utcnow().timestamp())}_{profile_picture.filename}"
        file_path = os.path.join(EMPLOYEE_UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        picture_path = f"{EMPLOYEE_UPLOAD_DIR}/{filename}"

    employee = models.Employee(
        bakery_id=bakery_id,
        name=name,
        role=role,
        start_date=start_date,
        profile_picture=picture_path
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def list_employees(db: Session, bakery_id: int):
    return db.query(models.Employee).filter(models.Employee.bakery_id == bakery_id).all()


def update_employee(
    db: Session,
    employee_id: int,
    name: Optional[str] = None,
    role: Optional[str] = None,
    start_date: Optional[date] = None,
    profile_picture: Optional[UploadFile] = None
):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return None

    if name is not None:
        employee.name = name
    if role is not None:
        employee.role = role
    if start_date is not None:
        employee.start_date = start_date

    if profile_picture:
        filename = f"{employee.bakery_id}_{int(datetime.utcnow().timestamp())}_{profile_picture.filename}"
        file_path = os.path.join(EMPLOYEE_UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        employee.profile_picture = f"{EMPLOYEE_UPLOAD_DIR}/{filename}"

    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee_id: int):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return None

    # delete profile picture from disk if exists
    if employee.profile_picture and os.path.exists(employee.profile_picture):
        os.remove(employee.profile_picture)

    db.delete(employee)
    db.commit()
    return employee

# ------------------ Complaint ------------------
# Create Complaint
def create_complaint(db: Session, complaint: schemas.ComplaintCreate, user_id: int):
    db_complaint = models.Complaint(
        subject=complaint.subject,
        description=complaint.description,
        status="Pending",
        user_id=user_id
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint

# Get all complaints
def get_complaints(db: Session):
    complaints = (
        db.query(models.Complaint)
        .options(joinedload(models.Complaint.user))
        .all()
    )

    result = []
    for c in complaints:
        result.append(
            schemas.ComplaintOut(
                id=c.id,
                subject=c.subject,
                description=c.description,
                status=c.status,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user_id=c.user_id,
                user_name=c.user.name if c.user else None,
                user_email=c.user.email if c.user else None,
            )
        )
    return result

# Update complaint status
def update_complaint_status(db: Session, complaint_id: int, status: str):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        return None
    complaint.status = status
    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)
    return complaint

# ------------------ Donations ------------------
# --- Helper: compute freshness status ---
def compute_freshness(item: models.Donation):
    today = date.today()
    if item.expiration_date:
        days_left = (item.expiration_date - today).days
        if days_left < 0:
            return "expired"
        elif days_left <= item.threshold:
            return "soon"
    return "fresh"

# --- CRUD Operations ---

def get_available_donations(db: Session):
    donations = db.query(models.Donation).filter(models.Donation.status == "available").all()
    # attach freshness dynamically
    return [
        {
            **donation.__dict__,
            "freshness": compute_freshness(donation)
        }
        for donation in donations if compute_freshness(donation) != "expired"
    ]

def request_donation(db: Session, donation_id: int, charity_id: int):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != "available":
        raise HTTPException(status_code=400, detail="Donation not available")

    # update status
    donation.status = "requested"

    # create request record
    request = models.DonationRequest(
        donation_id=donation.id,
        charity_id=charity_id,
        bakery_id=donation.bakery_id,
        status="pending"
    )
    db.add(request)
    db.commit()
    db.refresh(donation)
    return donation

def confirm_donation(db: Session, donation_id: int):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != "requested":
        raise HTTPException(status_code=400, detail="Donation is not requested")

    donation.status = "donated"
    db.commit()
    db.refresh(donation)
    return donation

def auto_create_donation(db: Session, inventory_item: models.BakeryInventory):
    """Check if inventory reached threshold or expired, then create donation."""
    today = date.today()

    freshness = "fresh"
    if inventory_item.expiration_date:
        days_left = (inventory_item.expiration_date - today).days
        if days_left < 0:
            freshness = "expired"
        elif inventory_item.threshold and days_left <= inventory_item.threshold:
            freshness = "soon"

    # Only create donation if soon/expired and no donation exists yet
    existing = db.query(models.Donation).filter(
        models.Donation.bakery_inventory_id == inventory_item.id
    ).first()

    if freshness in ["soon", "expired"] and not existing:
        donation = models.Donation(
            bakery_inventory_id=inventory_item.id,
            bakery_id=inventory_item.bakery_id,
            name=inventory_item.name,
            image=inventory_item.image,
            quantity=inventory_item.quantity,
            threshold=inventory_item.threshold,
            creation_date=inventory_item.creation_date,
            expiration_date=inventory_item.expiration_date,
            uploaded=inventory_item.uploaded,
            description=inventory_item.description,
            status="available",  # 🔥 auto-mark as available
        )
        db.add(donation)
        db.commit()
        db.refresh(donation)
        return donation
    return None


def create_inventory_item(db: Session, item: schemas.BakeryInventoryCreate, bakery_id: int):
    new_item = models.BakeryInventory(**item.dict(), bakery_id=bakery_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # 🔥 Check if donation needs to be created
    auto_create_donation(db, new_item)

    return new_item


def update_inventory_item(db: Session, item_id: int, item_update: schemas.BakeryInventoryUpdate):
    item = db.query(models.BakeryInventory).filter(models.BakeryInventory.id == item_id).first()
    if not item:
        return None

    for key, value in item_update.dict(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    # 🔥 Check again after update
    auto_create_donation(db, item)

    return item

def sync_donation_with_inventory(db: Session, inventory_item: models.BakeryInventory):
    """Keep donation status in sync with inventory quantity."""
    donation = db.query(models.Donation).filter(
        models.Donation.bakery_inventory_id == inventory_item.id
    ).first()

    if not donation:
        return None

    if inventory_item.quantity <= 0:
        donation.status = "unavailable"
    else:
        # Only mark available if not already donated/requested
        if donation.status in ["unavailable", "available"]:
            donation.status = "available"

    db.commit()
    db.refresh(donation)
    return donation


def update_inventory_item(db: Session, item_id: int, item_update: schemas.BakeryInventoryUpdate):
    item = db.query(models.BakeryInventory).filter(models.BakeryInventory.id == item_id).first()
    if not item:
        return None

    for key, value in item_update.dict(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    # 🔥 Check freshness threshold
    auto_create_donation(db, item)

    # 🔥 Sync donation with quantity
    sync_donation_with_inventory(db, item)

    return item