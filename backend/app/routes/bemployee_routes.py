from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil
from datetime import datetime

from app import database, models, schemas, auth
from app.auth import pwd_context  # For hashing default employee password

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
    role: str = Form(...),
    start_date: str = Form(...),  # Accept as string "YYYY-MM-DD"
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Allow bakery owners OR employees with Owner/Manager role
    if isinstance(current_auth, dict):
        # Employee token - check if they have Owner or Manager role
        employee_role = current_auth.get("employee_role", "").lower()
        if employee_role not in ["owner", "manager"]:
            raise HTTPException(status_code=403, detail="Only Owner and Manager employees can add employees")
        bakery_id = current_auth.get("bakery_id")
    else:
        # Bakery owner token
        if current_auth.role.lower() != "bakery":
            raise HTTPException(status_code=403, detail="Only bakeries can add employees")
        bakery_id = current_auth.id
    
    current_user = current_auth

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
        role=role,
        start_date=parsed_date,
        profile_picture=file_name,  # store only filename
        hashed_password=hashed_password  # ✅ Set default password
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

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

    # Check if this bakery has any employees
    employees = db.query(models.Employee).filter(models.Employee.bakery_id == bakery_id).all()
    
    print(f"📦 Bakery {bakery_id} has {len(employees)} employees")
    
    # If no employees exist and this is a bakery owner, automatically register the contact person
    if not employees and not isinstance(current_auth, dict):
        current_user = current_auth  # It's a User model for bakery owners
        print(f"🆕 Creating first employee from contact person: {current_user.contact_person}")
        # ✅ Set default password for first employee
        default_password = "Employee123!"
        hashed_password = pwd_context.hash(default_password)
        
        first_employee = models.Employee(
            bakery_id=current_user.id,
            name=current_user.contact_person,
            role="Owner",
            start_date=datetime.now().date(),  # ✅ Add start_date
            hashed_password=hashed_password  # ✅ Set default password
        )
        db.add(first_employee)
        db.flush()  # Flush to get the ID
        db.commit()
        db.refresh(first_employee)
        employees = [first_employee]
        print(f"✅ Contact person created as first employee: {first_employee.name} (ID: {first_employee.id})")

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
    # Allow bakery owners OR employees with Owner/Manager role
    if isinstance(current_auth, dict):
        # Employee token - check if they have Owner or Manager role
        employee_role = current_auth.get("employee_role", "").lower()
        if employee_role not in ["owner", "manager"]:
            raise HTTPException(status_code=403, detail="Only Owner and Manager employees can edit employees")
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
    # Allow bakery owners OR employees with Owner/Manager role
    if isinstance(current_auth, dict):
        # Employee token - check if they have Owner or Manager role
        employee_role = current_auth.get("employee_role", "").lower()
        if employee_role not in ["owner", "manager"]:
            raise HTTPException(status_code=403, detail="Only Owner and Manager employees can delete employees")
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