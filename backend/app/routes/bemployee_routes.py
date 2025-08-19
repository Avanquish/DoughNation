from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app import models, database, schemas, auth, crud

router = APIRouter()

# ------------------ CREATE EMPLOYEE ------------------
@router.post("/employees", response_model=schemas.EmployeeOut)
def add_employee(
    name: str = Form(...),
    role: str = Form(...),
    start_date: date = Form(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can add employees")

    return crud.create_employee(
        db=db,
        bakery_id=current_user.id,
        name=name,
        role=role,
        start_date=start_date
    )


# ------------------ LIST EMPLOYEES ------------------
@router.get("/employees", response_model=List[schemas.EmployeeOut])
def get_employees(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can view employees")

    return crud.list_employees(db, bakery_id=current_user.id)


# ------------------ UPDATE EMPLOYEE ------------------
@router.put("/employees/{employee_id}", response_model=schemas.EmployeeOut)
def edit_employee(
    employee_id: int,
    name: str = Form(...),
    role: str = Form(...),
    start_date: date = Form(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can edit employees")

    # Ensure the employee belongs to the current bakery
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == current_user.id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    updated = crud.update_employee(
        db=db,
        employee_id=employee_id,
        name=name,
        role=role,
        start_date=start_date
    )
    return updated


# ------------------ DELETE EMPLOYEE ------------------
@router.delete("/employees/{employee_id}", response_model=schemas.EmployeeOut)
def remove_employee(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can delete employees")

    # Ensure the employee belongs to the current bakery
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.bakery_id == current_user.id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    deleted = crud.delete_employee(db, employee_id=employee_id)
    return deleted
