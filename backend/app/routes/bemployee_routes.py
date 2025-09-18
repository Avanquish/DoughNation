from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil
from datetime import datetime

from app import database, models, schemas, auth

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
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can add employees")

    # parse date safely
    try:
        parsed_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    file_name = None
    if profile_picture:
        safe_name = f"{current_user.id}_{int(datetime.now().timestamp())}_{profile_picture.filename}"
        save_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        file_name = safe_name

    employee = models.Employee(
        bakery_id=current_user.id,
        name=name,
        role=role,
        start_date=parsed_date,
        profile_picture=file_name  # store only filename
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
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can view employees")

    employees = db.query(models.Employee).filter(models.Employee.bakery_id == current_user.id).all()

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
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can edit employees")

    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == current_user.id
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
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can delete employees")

    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == current_user.id
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