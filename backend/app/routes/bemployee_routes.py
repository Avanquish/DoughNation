from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil
from datetime import datetime

from app import database, models, schemas, auth
from app.auth import pwd_context  # For hashing default employee password
from app.email_utils import send_employee_credentials_email  # For sending login credentials

router = APIRouter(prefix="/employees", tags=["Employees"])

UPLOAD_DIR = "uploads/employee_pictures"
os.makedirs(UPLOAD_DIR, exist_ok=True)

BASE_EMPLOYEE_PATH = "/uploads/employee_pictures/"


# ✅ Helper to build full URL
def build_employee_url(request: Request, filename: Optional[str]):
    if not filename:
        return None
    return str(request.base_url).rstrip("/") + BASE_EMPLOYEE_PATH + filename


# 📌 CREATE employee
@router.post("/", response_model=schemas.EmployeeOut)
def create_employee(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    role: str = Form(...),
    start_date: str = Form(...),  # Accept as string "YYYY-MM-DD"
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Allow bakery owners OR employees with Manager role
    if isinstance(current_auth, dict):
        # Employee token - check if they have Manager role
        employee_role = current_auth.get("employee_role", "").lower()
        if employee_role not in ["manager"]:
            raise HTTPException(status_code=403, detail="Only Manager employees can add employees")
        bakery_id = current_auth.get("bakery_id")
    else:
        # Bakery owner token
        if current_auth.role.lower() != "bakery":
            raise HTTPException(status_code=403, detail="Only bakeries can add employees")
        bakery_id = current_auth.id
    
    current_user = current_auth

    # ✅ Validate Gmail email
    if not (email.lower().endswith("@gmail.com") or email.lower().endswith("@googlemail.com")):
        raise HTTPException(status_code=400, detail="Only Gmail addresses (@gmail.com) are allowed")
    
    # ✅ Check if email already exists
    existing_employee = db.query(models.Employee).filter(models.Employee.email == email).first()
    if existing_employee:
        raise HTTPException(status_code=400, detail="An employee with this email already exists")

    # parse date safely
    try:
        parsed_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    file_name = None
    if profile_picture:
        safe_name = f"{bakery_id}_{int(datetime.now().timestamp())}_{profile_picture.filename}"
        save_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        file_name = safe_name

    # ✅ Set default password (employee must change on first login)
    default_password = "Employee123!"
    hashed_password = pwd_context.hash(default_password)

    # ✅ Generate unique employee_id in format: EMP-{BAKERY_ID}-{SEQUENCE}
    # Get count of existing employees for this bakery to determine sequence number
    existing_count = db.query(models.Employee).filter(models.Employee.bakery_id == bakery_id).count()
    sequence = existing_count + 1
    employee_id = f"EMP-{bakery_id}-{sequence:03d}"  # Format: EMP-5-001, EMP-5-002, etc.
    
    # Ensure uniqueness (in case of concurrent creation)
    while db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first():
        sequence += 1
        employee_id = f"EMP-{bakery_id}-{sequence:03d}"

    employee = models.Employee(
        employee_id=employee_id,  # NEW: Set generated employee_id
        bakery_id=bakery_id,
        name=name,
        email=email,  # ✅ Store employee email
        role=role,
        start_date=parsed_date,
        profile_picture=file_name,  # store only filename
        hashed_password=hashed_password,  # ✅ Set default password
        initial_password_hash=hashed_password,  # ✅ Store initial password hash to prevent reuse
        password_changed=False  # ✅ Flag that password hasn't been changed yet
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    # ✅ Get bakery name for email
    bakery = db.query(models.User).filter(models.User.id == bakery_id).first()
    bakery_name = bakery.name if bakery else "Your Bakery"
    
    # ✅ Send email with login credentials
    try:
        send_employee_credentials_email(
            to_email=email,
            employee_name=name,
            employee_id=employee_id,
            default_password=default_password,
            bakery_name=bakery_name
        )
        print(f"✅ Credentials email sent to {email}")
    except Exception as e:
        print(f"⚠️ Failed to send credentials email: {str(e)}")
        # Don't fail the employee creation if email fails

    # ✅ attach full URL
    employee.profile_picture = build_employee_url(request, employee.profile_picture)
    return employee


# 📌 LIST employees (only bakery can view their employees)
@router.get("/", response_model=List[schemas.EmployeeOut])
def get_employees(
    request: Request,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Get bakery_id from either user or employee
    bakery_id = auth.get_bakery_id_from_auth(current_auth)

    # Get all employees for this bakery
    employees = db.query(models.Employee).filter(models.Employee.bakery_id == bakery_id).all()
    
    print(f"📦 Bakery {bakery_id} has {len(employees)} employees")

    # ✅ attach full URL for each
    for emp in employees:
        emp.profile_picture = build_employee_url(request, emp.profile_picture)
    return employees


# 📌 UPDATE employee
@router.put("/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(
    request: Request,
    employee_id: int,
    name: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Allow bakery owners OR employees with Manager role
    if isinstance(current_auth, dict):
        # Employee token - check if they have Manager role
        employee_role = current_auth.get("employee_role", "").lower()
        if employee_role not in ["manager"]:
            raise HTTPException(status_code=403, detail="Only Manager employees can edit employees")
        bakery_id = current_auth.get("bakery_id")
    else:
        # Bakery owner token
        if current_auth.role.lower() != "bakery":
            raise HTTPException(status_code=403, detail="Only bakeries can edit employees")
        bakery_id = current_auth.id
    
    current_user = current_auth

    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == bakery_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if name:
        employee.name = name
    if role:
        employee.role = role
    if start_date:
        try:
            employee.start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    if profile_picture:
        safe_name = f"{employee_id}_{int(datetime.now().timestamp())}_{profile_picture.filename}"
        save_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        employee.profile_picture = safe_name

    db.commit()
    db.refresh(employee)

    # ✅ attach full URL
    employee.profile_picture = build_employee_url(request, employee.profile_picture)
    return employee


# 📌 DELETE employee
@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Allow bakery owners OR employees with Manager role
    if isinstance(current_auth, dict):
        # Employee token - check if they have Manager role
        employee_role = current_auth.get("employee_role", "").lower()
        if employee_role not in ["manager"]:
            raise HTTPException(status_code=403, detail="Only Manager employees can delete employees")
        bakery_id = current_auth.get("bakery_id")
    else:
        # Bakery owner token
        if current_auth.role.lower() != "bakery":
            raise HTTPException(status_code=403, detail="Only bakeries can delete employees")
        bakery_id = current_auth.id
    
    current_user = current_auth

    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == bakery_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # delete stored picture if exists
    if employee.profile_picture:
        path = os.path.join(UPLOAD_DIR, employee.profile_picture)
        if os.path.exists(path):
            os.remove(path)

    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully"}


# 📌 RESET employee password (Owner only)
@router.post("/{employee_id}/reset-password")
def reset_employee_password(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Only allow bakery OWNERS (not employees) to reset passwords
    if isinstance(current_auth, dict):
        # This is an employee token - deny access
        raise HTTPException(status_code=403, detail="Only bakery owners can reset employee passwords")
    
    # Bakery owner token
    if current_auth.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakery owners can reset employee passwords")
    
    bakery_id = current_auth.id

    # Find the employee
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == bakery_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate new temporary password
    new_password = "Employee123!"
    hashed_password = pwd_context.hash(new_password)
    
    # Update employee password
    employee.hashed_password = hashed_password
    employee.password_changed = False  # Mark that they need to change it on next login
    employee.initial_password_hash = hashed_password  # Update initial password hash
    
    db.commit()

    # Get bakery name for email
    bakery = db.query(models.User).filter(models.User.id == bakery_id).first()
    bakery_name = bakery.name if bakery else "Your Bakery"
    
    # Send email with new credentials
    try:
        send_employee_credentials_email(
            to_email=employee.email,
            employee_name=employee.name,
            employee_id=employee.employee_id,
            default_password=new_password,
            bakery_name=bakery_name,
            is_reset=True  # Indicate this is a password reset
        )
        print(f"✅ Password reset email sent to {employee.email}")
    except Exception as e:
        print(f"⚠️ Failed to send password reset email: {str(e)}")
        # Don't fail the password reset if email fails

    return {
        "message": "Password reset successfully",
        "employee_id": employee.employee_id,
        "email": employee.email,
        "new_password": new_password
    }