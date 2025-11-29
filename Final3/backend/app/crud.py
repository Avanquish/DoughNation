import random
from typing import Optional
from fastapi import HTTPException, status, UploadFile, File, Form
import os
import shutil
from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app import schemas
from . import models, auth
from datetime import date, datetime, timedelta, timezone
from app.timezone_utils import now_ph, today_ph

from app.routes.geofence import geocode_address, get_coordinates_osm
from app.product_id_generator import generate_product_id


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==================== PASSWORD HISTORY HELPERS ====================

def check_password_history(db: Session, user_id: int, new_password: str, is_employee: bool = False) -> bool:
    """
    Check if password was used in last 5 passwords.
    Returns True if password is in history (should be blocked), False if password is unique.
    """
    if is_employee:
        # Check employee password history
        history = db.query(models.EmployeePasswordHistory).filter(
            models.EmployeePasswordHistory.employee_id == user_id
        ).order_by(models.EmployeePasswordHistory.changed_at.desc()).limit(5).all()
    else:
        # Check user password history
        history = db.query(models.PasswordHistory).filter(
            models.PasswordHistory.user_id == user_id
        ).order_by(models.PasswordHistory.changed_at.desc()).limit(5).all()
    
    # Check if new password matches any of the last 5 passwords
    for entry in history:
        if pwd_context.verify(new_password, entry.hashed_password):
            return True  # Password found in history, should be blocked
    
    return False  # Password is unique

def save_password_to_history(db: Session, user_id: int, hashed_password: str, is_employee: bool = False):
    """
    Save password to history and maintain only last 5 passwords.
    """
    if is_employee:
        # Save to employee password history
        new_entry = models.EmployeePasswordHistory(
            employee_id=user_id,
            hashed_password=hashed_password,
            changed_at=now_ph()
        )
        db.add(new_entry)
        db.flush()
        
        # Keep only last 5 passwords
        history_count = db.query(models.EmployeePasswordHistory).filter(
            models.EmployeePasswordHistory.employee_id == user_id
        ).count()
        
        if history_count > 5:
            # Delete oldest entries
            oldest_entries = db.query(models.EmployeePasswordHistory).filter(
                models.EmployeePasswordHistory.employee_id == user_id
            ).order_by(models.EmployeePasswordHistory.changed_at.asc()).limit(history_count - 5).all()
            
            for entry in oldest_entries:
                db.delete(entry)
    else:
        # Save to user password history
        new_entry = models.PasswordHistory(
            user_id=user_id,
            hashed_password=hashed_password,
            changed_at=now_ph()
        )
        db.add(new_entry)
        db.flush()
        
        # Keep only last 5 passwords
        history_count = db.query(models.PasswordHistory).filter(
            models.PasswordHistory.user_id == user_id
        ).count()
        
        if history_count > 5:
            # Delete oldest entries
            oldest_entries = db.query(models.PasswordHistory).filter(
                models.PasswordHistory.user_id == user_id
            ).order_by(models.PasswordHistory.changed_at.asc()).limit(history_count - 5).all()
            
            for entry in oldest_entries:
                db.delete(entry)

# ==================== END PASSWORD HISTORY HELPERS ====================

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

    # Email domain validation - must use Gmail
    email_domain = email.split("@")[-1]
    if email_domain != "gmail.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be a valid Gmail address (@gmail.com)"
        )
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    #Contact Number limitation set to 11 numbers only
    if contact_number and len(contact_number) != 11:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact number must be 11 digits"
        )

    # Password requirements validation
    import re
    password_errors = []
    if len(password) < 8:
        password_errors.append("At least 8 characters")
    if not re.search(r'[A-Z]', password):
        password_errors.append("One uppercase letter")
    if not re.search(r'[a-z]', password):
        password_errors.append("One lowercase letter")
    if not re.search(r'[0-9]', password):
        password_errors.append("One number")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        password_errors.append("One special character")
    
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password requirements not met: {', '.join(password_errors)}"
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

    # Geocode the address
    latitude, longitude = get_coordinates_osm(address)

    if not latitude or not longitude:
        raise HTTPException(
            status_code=400,
            detail="Could not fetch latitude/longitude for the provided address"
        )

    # Hash password and create user
    hashed_password = pwd_context.hash(password)

    db_user = models.User(
        role=role.strip().capitalize(),
        name=name,
        email=email,
        contact_person=contact_person,
        contact_number=contact_number,
        address=address,
        latitude=latitude,
        longitude=longitude,
        hashed_password=hashed_password,
        profile_picture=profile_pic_path,
        proof_of_validity=proof_path,
        verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    print(f"\n🔍 DEBUG: User created")
    print(f"   ID: {db_user.id}")
    print(f"   Name: {db_user.name}")
    print(f"   Email: {db_user.email}")
    print(f"   Role (db): {db_user.role}")
    print(f"   Role (variable): {role}")
    print(f"   Contact Person: {contact_person}")
    print(f"   Role check: role.lower() == 'bakery' => {role.lower()} == 'bakery' => {role.lower() == 'bakery'}")
    
    # 🆕 If bakery, automatically create contact person as first employee
    if role.lower() == "bakery":
        try:
            print(f"\n✅ ROLE CHECK PASSED - Creating first employee for bakery {db_user.id}: {contact_person}")
            # Default password for first employee
            default_password = "Employee123!"
            hashed_emp_password = pwd_context.hash(default_password)
            
            # Verify the employee doesn't already exist
            existing_emp = db.query(models.Employee).filter(
                models.Employee.bakery_id == db_user.id,
                models.Employee.name == contact_person
            ).first()
            
            if existing_emp:
                print(f"⚠️  Employee already exists: {existing_emp.name}")
                return db_user
            
            # Generate unique employee_id in format: EMP-{BAKERY_ID}-{SEQUENCE}
            existing_count = db.query(models.Employee).filter(models.Employee.bakery_id == db_user.id).count()
            sequence = existing_count + 1
            employee_id = f"EMP-{db_user.id}-{sequence:03d}"  # Format: EMP-2-001
            
            # Ensure uniqueness (in case of concurrent creation)
            while db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first():
                sequence += 1
                employee_id = f"EMP-{db_user.id}-{sequence:03d}"
            
            first_employee = models.Employee(
                employee_id=employee_id,  # Generated unique employee ID
                bakery_id=db_user.id,
                name=contact_person,
                email=email,  # Use bakery owner's email for first employee
                role="Owner",
                start_date=date.today(),  # ✅ Set start date to today
                hashed_password=hashed_emp_password
            )
            db.add(first_employee)
            db.commit()
            db.refresh(first_employee)
            print(f"✅ EMPLOYEE CREATED: {first_employee.name} (ID: {first_employee.id}, Employee ID: {first_employee.employee_id}, bakery_id: {first_employee.bakery_id}, password_set: {bool(first_employee.hashed_password)})")
        except Exception as e:
            print(f"❌ ERROR creating first employee: {str(e)}")
            import traceback
            traceback.print_exc()
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create first employee: {str(e)}")
    else:
        print(f"❌ ROLE CHECK FAILED - role.lower()={role.lower()}, not 'bakery', skipping employee creation")
    
    return db_user

#Update User Information
#Update User Information
def update_user_info(
    db: Session,
    user_id: int,
    name: Optional[str] = None,
    contact_person: Optional[str] = None,
    contact_number: Optional[str] = None,
    about: Optional[str] = None,
    profile_picture: UploadFile = None
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role.lower() == "admin":
        raise HTTPException(status_code=403, detail="Admin information cannot be edited")

    # VALIDATE contact_person if being changed (only for bakeries)
    if contact_person is not None and contact_person != "" and user.role.lower() == "bakery":
        # Check if the new contact person exists as an employee
        employee = db.query(models.Employee).filter(
            models.Employee.bakery_id == user_id,
            models.Employee.name == contact_person
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=400, 
                detail=f"Employee '{contact_person}' not found in your bakery. Please add them as an employee first."
            )
        
        # Employee found, update contact person
        user.contact_person = contact_person

    if name is not None and name != "": 
        user.name = name
    # Only update contact_person if not already handled above
    if contact_person is not None and contact_person != "" and user.role.lower() != "bakery":
        user.contact_person = contact_person
    if contact_number is not None and contact_number != "":
        user.contact_number = contact_number
    if about is not None and about != "":
        user.about = about
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
    
    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if check_password_history(db, user_id, new_password, is_employee=False):
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )

    # Save old password to history before updating
    save_password_to_history(db, user_id, user.hashed_password, is_employee=False)
    
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

    admin_email = "doughnation04@gmail.com"
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
        profile_picture="uploads/profile_pictures/admin_profile.png",
        proof_of_validity="uploads/proofs/default_proof.pdf",
        verified=True,
        using_default_password=True  # Flag admin as using default password
    )

    db.add(default_admin)
    db.commit()
    
# ------------------ BAKERY INVENTORY ------------------
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
    import random

    if isinstance(creation_date, str):
        server_creation_date = datetime.strptime(creation_date, "%Y-%m-%d").date()
    else:
        server_creation_date = creation_date

    image_path = None
    if image:
        if isinstance(image, UploadFile):
            os.makedirs("uploads/inventory_images", exist_ok=True)
            image_path = f"uploads/inventory_images/{image.filename}"
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
        elif isinstance(image, str):
            image_path = image

    # Generate unique product ID with sequential numbering per product type
    product_id = generate_product_id(db, name, bakery_id)
    
    item = models.BakeryInventory(
        bakery_id=bakery_id,
        product_id=product_id,
        name=name,
        image=image_path,
        quantity=quantity,
        creation_date=server_creation_date,
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
    item.creation_date = datetime.strptime(creation_date, "%Y-%m-%d").date() if isinstance(creation_date, str) else creation_date
    item.quantity = quantity
    item.quantity = quantity
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
    profile_picture: Optional[UploadFile] = None  # 👈 put it here
):
    picture_path = None

    # Handle upload if picture is provided
    if profile_picture:
        filename = f"{bakery_id}_{int(now_ph().timestamp())}_{profile_picture.filename}"
        file_path = os.path.join(EMPLOYEE_UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)

        picture_path = f"{EMPLOYEE_UPLOAD_DIR}/{filename}"

    # Create employee record
    employee = models.Employee(
        bakery_id=bakery_id,
        name=name,
        role=role,
        start_date=start_date,
        profile_picture=picture_path  # 👈 save path or None
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
        filename = f"{employee.bakery_id}_{int(now_ph().timestamp())}_{profile_picture.filename}"
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
    complaint.updated_at = now_ph()
    db.commit()
    db.refresh(complaint)
    return complaint

#-----------Donation-------------------

def list_donations(db: Session, bakery_id: int):
    return db.query(models.Donation).filter(models.Donation.bakery_id == bakery_id).all()


# ------------------ Badges ------------------
ALLOWED_BADGES = ["Bakery Star", "Community Champion", "Legendary Donor"]

def create_badge(db: Session, badge: schemas.BadgeCreate):
    if badge.name not in ALLOWED_BADGES:
        raise ValueError(f"Invalid badge name: {badge.name}. Allowed: {ALLOWED_BADGES}")

    db_badge = models.Badge(name=badge.name, user_id=badge.user_id)
    db.add(db_badge)
    db.commit()
    db.refresh(db_badge)
    return db_badge

def get_all_badges(db: Session):
    return db.query(models.Badge).filter(models.Badge.id.in_([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]))

def get_admin_badges(db: Session):
    return db.query(models.Badge).filter(models.Badge.name.in_([" ", "Bakery Star", "Community Champion", "Legendary Donor"])).all()

def get_badge_by_name(db: Session, name: str):
    return db.query(models.Badge).filter(models.Badge.name == name).first()

# -------- User Badge CRUD --------
def assign_badge_to_user(
    db: Session, 
    user_id: int, 
    badge_id: int, 
    badge_name: str = None, 
    description: str = None
):
    # Prevent duplicate user-badge
    exists = db.query(models.UserBadge).filter_by(user_id=user_id, badge_id=badge_id).first()
    if exists:
        return exists

    # ✅ Fetch badge if name not provided
    badge = db.query(models.Badge).filter_by(id=badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")

    if not badge_name:
        badge_name = badge.name  # ✅ fallback to the real badge name

    new_user_badge = models.UserBadge(
        user_id=user_id, 
        badge_id=badge_id, 
        badge_name=badge_name, 
        description=description
    )

    db.add(new_user_badge)
    db.commit()
    db.refresh(new_user_badge)
    return new_user_badge

def get_user_badges(db: Session, user_id: int):
    return (
        db.query(models.UserBadge)
        .options(joinedload(models.UserBadge.badge))
        .filter(models.UserBadge.user_id == user_id)
        .all()
        )

# -------- Badge Progress --------
def update_progress(db: Session, user_id: int, badge_id: int, increment: int = 1, total_quantity: int = None):
    progress = db.query(models.BadgeProgress).filter_by(user_id=user_id, badge_id=badge_id).first()
    
    # Get badge info for quantity-based targets
    badge = db.query(models.Badge).filter_by(id=badge_id).first()
    
    # Set target based on badge type
    target = 1  # default target
    if badge and badge.category == "Quantity-Based":
        if badge.name == "Bread Saver":
            target = 10
        elif badge.name == "Basket Filler":
            target = 50
        elif badge.name == "Loaf Legend":
            target = 100
        elif badge.name == "Ton of Goodness":
            target = 500
            
    if not progress:
        progress = models.BadgeProgress(user_id=user_id, badge_id=badge_id, progress=0, target=target)
        db.add(progress)
    
    # Update progress based on donation quantity or increment
    if total_quantity is not None:
        progress.progress = total_quantity  # Set absolute progress for quantity badges
    else:
        progress.progress += increment
        
    # Ensure we update the target
    progress.target = target
    
    db.commit()
    db.refresh(progress)

    # Auto unlock if completed
    if progress.progress >= progress.target:
        assign_badge_to_user(db, user_id, badge_id)
    return progress

# --------- Seed Badges ---------
def seed_badges(db: Session):
    badges_data = [
        # Donation Frequency
        {"name": "First Loaf", "category": "Donation Frequency", "description": "Awarded for making the first donation.", "icon_url": "uploads/badge_images/First Loaf.png"},
        {"name": "Weekly Giver", "category": "Donation Frequency", "description": "Donated at least once a week for a month.", "icon_url": "uploads/badge_images/Weekly Giver.png"},
        {"name": "Monthly Habit", "category": "Donation Frequency", "description": "Donated consistently every month for 3 months.", "icon_url": "uploads/badge_images/Monthly Habit.png"},
        {"name": "Donation Streaker", "category": "Donation Frequency", "description": "Donated 7 days in a row.", "icon_url": "uploads/badge_images/Donation Streaker.png"},

        # Quantity-Based
        {"name": "Bread Saver", "category": "Quantity-Based", "description": "Donated 10 items in total." , "icon_url": "uploads/badge_images/Bread Saver.png"},
        {"name": "Basket Filler", "category": "Quantity-Based", "description": "Donated 50 items in total.", "icon_url": "uploads/badge_images/Basket Filler.png"},
        {"name": "Loaf Legend", "category": "Quantity-Based", "description": "Donated 100+ items in total.", "icon_url": "uploads/badge_images/Loaf Legend.png"},
        {"name": "Ton of Goodness", "category": "Quantity-Based", "description": "Reached 500+ donated items.", "icon_url": "uploads/badge_images/Ton of Goodness.png"},

        # Impact Badges
        {"name": "Community Helper", "category": "Impact", "description": "Donated to at least 3 different charities.", "icon_url": "uploads/badge_images/Community Helper.png"},
        {"name": "Neighborhood Hero", "category": "Impact", "description": "Donations served 100+ people.", "icon_url": "uploads/badge_images/Neighborhood Hero.png"},
        {"name": "Hunger Fighter", "category": "Impact", "description": "Donations served 500+ people.", "icon_url": "uploads/badge_images/Hunger Fighter.png"},
        {"name": "Hope Giver", "category": "Impact", "description": "Donations served 1000+ people.", "icon_url": "uploads/badge_images/Hope Giver.png"},

        # Timeliness
        {"name": "Early Riser", "category": "Timeliness", "description": "Donated before 9 AM.", "icon_url": "uploads/badge_images/Early Riser.png"},
        {"name": "Right on Time", "category": "Timeliness", "description": "Donated before expiration threshold.", "icon_url": "uploads/badge_images/Right on Time.png"},
        {"name": "Freshness Keeper", "category": "Timeliness", "description": "90%+ of donations made before threshold date.", "icon_url": "uploads/badge_images/Freshness Keeper.png"},

        # Milestones
        {"name": "One Month Donator", "category": "Milestone", "description": "Active for 1 month.", "icon_url": "uploads/badge_images/One Month Donator.png"},
        {"name": "Six-Month Supporter", "category": "Milestone", "description": "Active for 6 months.", "icon_url": "uploads/badge_images/Six-Month Supporter.png"},
        {"name": "Year of Goodness", "category": "Milestone", "description": "Donating for 1 year straight.", "icon_url": "uploads/badge_images/Year of Goodness.png"},

        # Special Events
        {"name": "Holiday Spirit", "category": "Special Event", "description": "Donated during Christmas or New Year week.", "icon_url": "uploads/badge_images/Holiday Spirit.png"},
        {"name": "Share the Love", "category": "Special Event", "description": "Donated on Valentine’s Day.", "icon_url": "uploads/badge_images/Share the Love.png"},
        {"name": "Ramadan Generosity", "category": "Special Event", "description": "Donated during Ramadan.", "icon_url": "uploads/badge_images/Ramadan Generosity.png"},
        {"name": "World Hunger Day Hero", "category": "Special Event", "description": "Donated on World Hunger Day.", "icon_url": "uploads/badge_images/World Hunger Day Hero.png"},

        # Collaboration
        {"name": "Team Player", "category": "Collaboration", "description": "Donated in collaboration with another bakery.", "icon_url": "uploads/badge_images/Team Player.png"},
        {"name": "Charity Partner’s Favorite", "category": "Collaboration", "description": "Recognized by charity for consistent quality.", "icon_url": "uploads/badge_images/Charity Favorite.png"},

        # Top Recognition
        {"name": "Bakery Star", "category": "Recognition", "description": "Top donator of the month.", "icon_url": "uploads/badge_images/Bakery Star.png"},
        {"name": "Community Champion", "category": "Recognition", "description": "Top donator of the quarter.", "icon_url": "uploads/badge_images/Community Champion.png"},
        {"name": "Legendary Donor", "category": "Recognition", "description": "Long-term high-impact donator.", "icon_url": "uploads/badge_images/Legendary Donor.png"},
        
        #Default Logo
        {"name": " ", "category": "Recognition", "description": "Default badge for testing.", "icon_url": "uploads/badge_images/default_badge.png"}
    ]

    for data in badges_data:
        existing = db.query(models.Badge).filter_by(name=data["name"]).first()
        if not existing:
            badge = models.Badge(**data)
            db.add(badge)
    db.commit()
    
# ------------------ Updates Badge Progress Every Donation Completion ------------------
    
def get_completed_donation_count(db: Session, user_id: int) -> int:
    """Count all completed donations (direct + request) for a given user."""
    # Direct donations where btracking_status == 'complete'
    direct_count = (
        db.query(models.DirectDonation)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(
            models.BakeryInventory.bakery_id == user_id,
            models.DirectDonation.btracking_status.ilike("complete")
        )
        .count()
    )

    # Request donations where tracking_status == 'complete'
    request_count = (
        db.query(models.DonationRequest)
        .filter(
            models.DonationRequest.bakery_id == user_id,
            models.DonationRequest.tracking_status.ilike("complete")
        )
        .count()
    )

    return direct_count + request_count

# ---------------- Helper ----------------
def get_philippine_time():
    """Get current time in Philippine timezone (UTC+8)."""
    return now_ph()

def to_datetime(value):
    """Convert date or datetime to datetime with Philippine timezone awareness."""
    from app.timezone_utils import PHILIPPINES_TZ
    
    if value is None:
        return get_philippine_time()
    
    if isinstance(value, datetime):
        # If already timezone-aware, convert to Philippine time
        if value.tzinfo is not None:
            return value.astimezone(PHILIPPINES_TZ)
        # If naive datetime, assume it's already in Philippine time
        return value.replace(tzinfo=PHILIPPINES_TZ)
    
    if isinstance(value, date):
        # Convert date to datetime at midnight Philippine time
        dt = datetime.combine(value, datetime.min.time())
        return dt.replace(tzinfo=PHILIPPINES_TZ)
    
    return value  # fallback

def donation_date(donation):
    """Get the main date of a donation object in Philippine time."""
    if hasattr(donation, "timestamp"):
        return to_datetime(donation.timestamp)  # DonationRequest
    if hasattr(donation, "creation_date"):
        return to_datetime(donation.creation_date)  # DirectDonation
    return get_philippine_time()


# ---------------- Main Badge Update ----------------
def update_user_badges(db: Session, user_id: int):
    """Update all badges for a user based on multiple criteria."""
    user = db.query(models.User).get(user_id)
    if not user:
        return

    # ---------------- Fetch all donations ----------------
    if user.role.lower() == "bakery":
        # For bakeries, get completed donations they've made
        donation_requests = (
            db.query(models.DonationRequest)
            .filter(
                models.DonationRequest.bakery_id == user_id,
                models.DonationRequest.tracking_status.ilike("complete")
            )
            .all()
        )

        # Get all completed direct donations
        direct_donations = (
            db.query(models.DirectDonation)
            .join(
                models.BakeryInventory,
                models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id
            )
            .filter(
                models.BakeryInventory.bakery_id == user_id,
                models.DirectDonation.btracking_status.ilike("complete")
            )
            .all()
        )

        # Get all donation items (for quantity tracking)
        all_quantity_donations = (
            db.query(models.Donation)
            .filter(models.Donation.bakery_id == user_id)
            .all()
        )
    else:
        # For charities, get donations they've received
        donation_requests = (
            db.query(models.DonationRequest)
            .filter(
                models.DonationRequest.charity_id == user_id,
                models.DonationRequest.tracking_status.ilike("complete")
            )
            .all()
        )
        
        direct_donations = (
            db.query(models.DirectDonation)
            .filter(
                models.DirectDonation.charity_id == user_id,
                models.DirectDonation.btracking_status.ilike("complete")
            )
            .all()
        )
        all_quantity_donations = []

    donations = donation_requests + direct_donations

    def has_badge(badge_id):
        return db.query(models.UserBadge).filter_by(user_id=user_id, badge_id=badge_id).first()

    # ---------------- 1. Donation Frequency Badges ----------------
    # First Loaf - Awarded for first completed donation
    completed_donations = [d for d in donations if (
        hasattr(d, 'tracking_status') and d.tracking_status.lower() == 'complete'
    ) or (
        hasattr(d, 'btracking_status') and d.btracking_status.lower() == 'complete'
    )]
    
    if completed_donations and not has_badge(1):
        db.add(models.UserBadge(user_id=user_id, badge_id=1))

    # Weekly Giver (donated at least once per week for last 4 weeks)
    current_time = get_philippine_time()
    one_month_ago = current_time - timedelta(days=30)
    weekly_donations = [d for d in completed_donations if donation_date(d) >= one_month_ago]
    donation_weeks = set()
    
    for donation in weekly_donations:
        donation_date_val = donation_date(donation)
        year, week, _ = donation_date_val.isocalendar()
        donation_weeks.add((year, week))
    
    if len(donation_weeks) >= 4 and not has_badge(2):
        db.add(models.UserBadge(user_id=user_id, badge_id=2))

    # Monthly Habit - donated every month for last 3 months
    three_months_ago = current_time - timedelta(days=90)
    monthly_donations = [d for d in completed_donations if donation_date(d) >= three_months_ago]
    donation_months = set()
    
    for donation in monthly_donations:
        donation_date_val = donation_date(donation)
        donation_months.add((donation_date_val.year, donation_date_val.month))
    
    if len(donation_months) >= 3 and not has_badge(3):
        db.add(models.UserBadge(user_id=user_id, badge_id=3))

    # Donation Streaker - 7 days in a row
    donation_dates = sorted(set(donation_date(d).date() for d in completed_donations))
    max_streak = 1
    current_streak = 1
    
    for i in range(1, len(donation_dates)):
        if (donation_dates[i] - donation_dates[i-1]).days == 1:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1
            
    if max_streak >= 7 and not has_badge(4):
        db.add(models.UserBadge(user_id=user_id, badge_id=4))

    # ---------------- 2. Quantity-Based Badges ----------------
    # Calculate total items only from completed donations
    total_items = (
        sum(d.donation_quantity or 0 for d in donation_requests if d.tracking_status.lower() == "complete")
        + sum(d.quantity or 0 for d in direct_donations if d.btracking_status.lower() == "complete")
    )

    quantity_badges = [
        (5, 10),    # Bread Saver
        (6, 50),    # Basket Filler
        (7, 100),   # Loaf Legend
        (8, 500),   # Ton of Goodness
    ]
    for badge_id, threshold in quantity_badges:
        # Update progress for each quantity badge
        update_progress(db, user_id, badge_id, total_quantity=total_items)
        
        # If threshold reached, add badge if not already present
        if total_items >= threshold and not has_badge(badge_id):
            db.add(models.UserBadge(user_id=user_id, badge_id=badge_id))

    # ---------------- 3. Impact Badges ----------------
    # Get unique charities from both types of donations
    request_charities = {d.charity_id for d in donation_requests if d.charity_id}
    direct_charities = {d.charity_id for d in direct_donations if d.charity_id}
    charities = request_charities.union(direct_charities)

    # Estimate people served based on quantity (assume 1 item serves 1 person)
    total_people_served = total_items

    impact_badges = [
        (9, len(charities) >= 3),         # Community Helper
        (10, total_people_served >= 100), # Neighborhood Hero
        (11, total_people_served >= 500), # Hunger Fighter
        (12, total_people_served >= 1000),# Hope Giver
    ]
    for badge_id, condition in impact_badges:
        if condition and not has_badge(badge_id):
            db.add(models.UserBadge(user_id=user_id, badge_id=badge_id))

    # ---------------- 4. Timeliness & Freshness Badges ----------------
    early_donations = [d for d in donations if donation_date(d).hour < 9]
    if early_donations and not has_badge(13):
        db.add(models.UserBadge(user_id=user_id, badge_id=13))  # Early Riser

    on_time_donations = [
        d for d in donations
        if (to_datetime(getattr(d, "expiration_date", get_philippine_time())) - donation_date(d)) >= timedelta(hours=24)
    ]
    if on_time_donations and not has_badge(14):
        db.add(models.UserBadge(user_id=user_id, badge_id=14))  # Right on Time

    freshness_rate = len(on_time_donations) / len(donations) if donations else 0
    if freshness_rate >= 0.9 and not has_badge(15):
        db.add(models.UserBadge(user_id=user_id, badge_id=15))  # Freshness Keeper

    # ---------------- 5. Milestone/Anniversary Badges ----------------
    first_donation_date = min((donation_date(d) for d in donations), default=None)
    if first_donation_date:
        days_active = (current_time - first_donation_date).days
        milestones = [
            (16, 30),   # One Month Donator
            (17, 180),  # Six-Month Supporter
            (18, 365),  # Year of Goodness
        ]
        for badge_id, day_threshold in milestones:
            if days_active >= day_threshold and not has_badge(badge_id):
                db.add(models.UserBadge(user_id=user_id, badge_id=badge_id))

    # ---------------- 6. Special Event / Seasonal Badges ----------------
    for d in donations:
        dt = donation_date(d)
        # Holiday Spirit – Christmas/New Year (Dec 24–31)
        if dt.month == 12 and 24 <= dt.day <= 31 and not has_badge(19):
            db.add(models.UserBadge(user_id=user_id, badge_id=19))
        # Share the Love – Valentine’s Day (Feb 14)
        if dt.month == 2 and dt.day == 14 and not has_badge(20):
            db.add(models.UserBadge(user_id=user_id, badge_id=20))
        # Ramadan Generosity – Feb 15 to Mar 20
        if (dt.month == 2 and dt.day >= 15) or (dt.month == 3 and dt.day <= 20):
            if not has_badge(21):
                db.add(models.UserBadge(user_id=user_id, badge_id=21))
        # World Hunger Day Hero – May 28
        if dt.month == 5 and dt.day == 28 and not has_badge(22):
            db.add(models.UserBadge(user_id=user_id, badge_id=22))

    db.commit()
