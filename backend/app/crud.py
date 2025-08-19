from fastapi import HTTPException, status, UploadFile, File, Form
import os
import shutil
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from . import models, auth
from datetime import date

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
def create_employee(db: Session, bakery_id: int, name: str, role: str, start_date: date):
    employee = models.Employee(
        bakery_id=bakery_id,
        name=name,
        role=role,
        start_date=start_date
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

def list_employees(db: Session, bakery_id: int):
    return db.query(models.Employee).filter(models.Employee.bakery_id == bakery_id).all()

def update_employee(db: Session, employee_id: int, name: str, role: str, start_date: date):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return None

    employee.name = name
    employee.role = role
    employee.start_date = start_date

    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee_id: int):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return None

    db.delete(employee)
    db.commit()
    return employee

def list_donations(db: Session, bakery_id: int):
    return db.query(models.Donation).filter(models.Donation.bakery_id == bakery_id).all()