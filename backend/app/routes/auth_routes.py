from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, Form, File, HTTPException
from sqlalchemy.orm import Session
from app import crud, auth, database, schemas, models
from app.auth import create_access_token, get_current_user, verify_password
from passlib.context import CryptContext

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

#User Management
@router.post("/register")
async def register(
    role: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    contact_person: str = Form(...),
    contact_number: str = Form(...),
    address: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    profile_picture: UploadFile = File(...),
    proof_of_validity: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    return crud.create_user(
        db, role, name, email, contact_person, contact_number, address,
        password, confirm_password, profile_picture, proof_of_validity
    )

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {
        "sub": str(db_user.id),
        "role": db_user.role,
        "name": db_user.name,
        "is_verified": db_user.verified
    }

    token = create_access_token(token_data)
    return {"access_token": token, "token_type": "bearer"}

# Get current user info
@router.get("/information", response_model=schemas.UserOut)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """
    Get the currently logged-in user's information.
    """
    return current_user

# Edit profile
@router.put("/edit", response_model=schemas.UserOut)
async def edit_user(
    name: Optional[str] = Form(None),
    contact_person: Optional[str] = Form(None),
    contact_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    profile_picture: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.update_user_info(
        db,
        current_user.id,
        name,
        contact_person,
        contact_number,
        address,
        profile_picture
    )

# Change password
@router.put("/changepass", response_model=dict)
def change_password(
    payload: schemas.ChangePassword,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)  
):
    return crud.change_user_password(
        db,
        current_user.id,
        payload.current_password,
        payload.new_password,
        payload.confirm_password
    )

# Forgot password with registration date verification
# Step 1: Check if email exists
@router.post("/forgot-password/check-email")
def check_email(data: dict, db: Session = Depends(database.get_db)):
    email = data.get("email")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    return {"valid": True}

# Step 2: Verify registration date
@router.post("/forgot-password/check-date")
def check_date(data: dict, db: Session = Depends(database.get_db)):
    email = data.get("email")
    registration_date = data.get("registration_date")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    # Compare only the date part to avoid datetime mismatch
    if str(user.created_at.date()) != str(registration_date):
        raise HTTPException(status_code=400, detail="Registration date does not match")

    return {"valid": True}

# Step 3: Reset password
@router.post("/forgot-password/reset")
def reset_password(data: dict, db: Session = Depends(database.get_db)):
    email = data.get("email")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    hashed_pw = pwd_context.hash(new_password)
    user.hashed_password = hashed_pw
    db.commit()
    db.refresh(user)

    return {"message": "Password reset successful"}


# ==================== EMPLOYEE LOGIN ====================

@router.get("/debug/bakeries")
def debug_bakeries(db: Session = Depends(database.get_db)):
    """DEBUG ONLY - Show all bakeries and their contact persons"""
    bakeries = db.query(models.User).filter(models.User.role == "Bakery").all()
    return {
        "total": len(bakeries),
        "bakeries": [
            {
                "id": bakery.id,
                "name": bakery.name,
                "email": bakery.email,
                "contact_person": bakery.contact_person,
                "contact_person_repr": repr(bakery.contact_person)
            }
            for bakery in bakeries
        ]
    }


@router.get("/debug/employees")
def debug_employees(db: Session = Depends(database.get_db)):
    """DEBUG ONLY - Show all employees in database"""
    all_emps = db.query(models.Employee).all()
    return {
        "total": len(all_emps),
        "employees": [
            {
                "id": emp.id,
                "name": emp.name,
                "name_repr": repr(emp.name),
                "bakery_id": emp.bakery_id,
                "role": emp.role,
                "role_repr": repr(emp.role),
                "has_password": bool(emp.hashed_password)
            }
            for emp in all_emps
        ]
    }


@router.get("/test-connection")
def test_connection(db: Session = Depends(database.get_db)):
    """Simple test to verify database connection is working"""
    try:
        # Test user query
        user_count = db.query(models.User).count()
        emp_count = db.query(models.Employee).count()
        
        return {
            "status": "✅ Connected",
            "users": user_count,
            "employees": emp_count
        }
    except Exception as e:
        return {
            "status": "❌ Error",
            "error": str(e)
        }


@router.get("/employee-name/{bakery_id}")
def migrate_employees(db: Session = Depends(database.get_db)):
    """DEBUG/MIGRATION ONLY - Create employees for all bakeries that don't have any"""
    from app.auth import pwd_context
    from datetime import date
    
    bakeries = db.query(models.User).filter(models.User.role == "Bakery").all()
    created_count = 0
    skipped_count = 0
    
    print(f"\n🔄 MIGRATION: Processing {len(bakeries)} bakeries...")
    
    for bakery in bakeries:
        # Check if bakery already has employees
        existing_emps = db.query(models.Employee).filter(
            models.Employee.bakery_id == bakery.id
        ).all()
        
        if existing_emps:
            print(f"⏭️  Bakery {bakery.id} ({bakery.name}) already has {len(existing_emps)} employees, skipping")
            skipped_count += 1
            continue
        
        # Create employee from contact person
        try:
            default_password = "Employee123!"
            hashed_password = pwd_context.hash(default_password)
            
            employee = models.Employee(
                bakery_id=bakery.id,
                name=bakery.contact_person,
                role="Owner",
                start_date=date.today(),
                hashed_password=hashed_password
            )
            db.add(employee)
            db.commit()
            db.refresh(employee)
            print(f"✅ Created employee for bakery {bakery.id}: {employee.name}")
            created_count += 1
        except Exception as e:
            print(f"❌ Failed to create employee for bakery {bakery.id}: {str(e)}")
            db.rollback()
    
    print(f"\n🎉 MIGRATION COMPLETE: Created {created_count}, Skipped {skipped_count}")
    return {
        "message": "Migration complete",
        "created": created_count,
        "skipped": skipped_count
    }


@router.get("/employee-name/{bakery_id}")
def get_employee_name(bakery_id: int, db: Session = Depends(database.get_db)):
    """Get the first employee (contact person) name for a bakery"""
    try:
        from datetime import date
        
        print(f"\n{'='*80}")
        print(f"🔍 GET_EMPLOYEE_NAME CALLED: bakery_id={bakery_id}")
        
        # Directly query and return - no complex logic
        employee = db.query(models.Employee).filter(
            models.Employee.bakery_id == bakery_id
        ).first()
        
        if employee:
            print(f"✅ Found employee: {employee.name}")
            print(f"{'='*80}\n")
            return {
                "employee_name": employee.name,
                "employee_id": employee.id,
                "bakery_id": employee.bakery_id,
                "role": employee.role
            }
        
        print(f"❌ No employee found for bakery {bakery_id}")
        # Try to create from contact person
        bakery = db.query(models.User).filter(models.User.id == bakery_id).first()
        if not bakery or not bakery.contact_person:
            print(f"❌ No contact person for bakery {bakery_id}")
            print(f"{'='*80}\n")
            raise HTTPException(status_code=404, detail="No employee or contact person found")
        
        # Create employee from contact person
        print(f"📝 Creating employee from contact person: {bakery.contact_person}")
        hashed_password = pwd_context.hash("Employee123!")
        employee = models.Employee(
            bakery_id=bakery_id,
            name=bakery.contact_person,
            role="Owner",
            start_date=date.today(),
            hashed_password=hashed_password
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)
        print(f"✅ Employee created: {employee.name} (ID: {employee.id})")
        print(f"{'='*80}\n")
        
        return {
            "employee_name": employee.name,
            "employee_id": employee.id,
            "bakery_id": employee.bakery_id,
            "role": employee.role
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR in get_employee_name: {str(e)}")
        import traceback
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/employee-login", response_model=schemas.EmployeeTokenResponse)
def employee_login(
    credentials: schemas.EmployeeLogin,
    db: Session = Depends(database.get_db)
):
    """
    Employee login using name and password.
    
    - Part-time employees cannot log in (returns 403)
    - Other roles (Owner, Manager, Full-time) can log in
    """
    try:
        print(f"\n{'='*80}")
        print(f"🔍 LOGIN ATTEMPT")
        print(f"  Name: '{credentials.name}' (type: {type(credentials.name).__name__}, len: {len(credentials.name)})")
        print(f"  Bakery ID: {credentials.bakery_id} (type: {type(credentials.bakery_id).__name__})")
        print(f"  Password: {'*' * len(credentials.password)} (len: {len(credentials.password)})")
        
        # Debug: Show ALL employees in database (across all bakeries)
        all_emps_in_db = db.query(models.Employee).all()
        print(f"\n📊 TOTAL EMPLOYEES IN DATABASE: {len(all_emps_in_db)}")
        for emp in all_emps_in_db:
            print(f"   - ID: {emp.id}, Name: '{emp.name}' (repr: {repr(emp.name)}), Bakery: {emp.bakery_id}, Role: {emp.role}, Has Password: {emp.hashed_password is not None}")
        
        # Query employee by name and bakery_id
        print(f"\n🔎 SEARCHING for: name == '{credentials.name}' AND bakery_id == {credentials.bakery_id}")
        employee = db.query(models.Employee).filter(
            models.Employee.name == credentials.name,
            models.Employee.bakery_id == credentials.bakery_id
        ).first()
        
        # If not found with exact match, try case-insensitive
        if not employee:
            print(f"⚠️  Exact match failed, trying case-insensitive match...")
            employee = db.query(models.Employee).filter(
                models.Employee.name.ilike(credentials.name),
                models.Employee.bakery_id == credentials.bakery_id
            ).first()
            if employee:
                print(f"✅ Case-insensitive match found!")

        if not employee:
            # Debug: show employees for THIS bakery
            bakery_employees = db.query(models.Employee).filter(
                models.Employee.bakery_id == credentials.bakery_id
            ).all()
            print(f"\n❌ NO MATCH FOUND!")
            print(f"📦 Employees for bakery {credentials.bakery_id}: {len(bakery_employees)}")
            for emp in bakery_employees:
                print(f"   - ID: {emp.id}, Name: '{emp.name}' (repr: {repr(emp.name)}), Role: {emp.role}")
                # Check each field
                name_matches = emp.name == credentials.name
                print(f"     Name match: {name_matches} ('{emp.name}' == '{credentials.name}')")
            print(f"{'='*80}\n")
            raise HTTPException(status_code=404, detail="Employee not found")
        
        print(f"✅ MATCH FOUND: {employee.name} (ID: {employee.id}, Role: {employee.role})")
        
        # Part-time employees cannot log in
        if employee.role == "Part-time":
            print(f"❌ Part-time employees cannot log in")
            print(f"{'='*80}\n")
            raise HTTPException(
                status_code=403,
                detail="Part-time employees cannot log in"
            )

        # Verify password
        if not employee.hashed_password:
            print(f"❌ Employee has no hashed password set!")
            print(f"{'='*80}\n")
            raise HTTPException(status_code=401, detail="Employee has no password set. Please contact your bakery owner.")
        
        password_is_valid = verify_password(credentials.password, employee.hashed_password)
        print(f"🔐 Password verification: {password_is_valid}")
        
        if not password_is_valid:
            print(f"❌ Password verification failed")
            print(f"{'='*80}\n")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create JWT token with employee data
        token_data = {
            "sub": str(employee.id),
            "employee_id": employee.id,
            "employee_name": employee.name,
            "employee_role": employee.role,
            "bakery_id": employee.bakery_id,
            "type": "employee"  # Distinguish from user tokens
        }

        token = create_access_token(token_data)
        
        print(f"✅ LOGIN SUCCESSFUL for {employee.name}")
        print(f"{'='*80}\n")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "employee_id": employee.id,
            "employee_name": employee.name,
            "employee_role": employee.role,
            "bakery_id": employee.bakery_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR in employee_login: {str(e)}")
        import traceback
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/employee-info")
def get_employee_info(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_employee_user)
):
    """
    Get the currently logged-in employee's information.
    Requires a valid employee JWT token.
    """
    employee = db.query(models.Employee).filter(
        models.Employee.id == current_user["employee_id"]
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {
        "id": employee.id,
        "name": employee.name,
        "role": employee.role,
        "bakery_id": employee.bakery_id,
        "profile_picture": employee.profile_picture
    }


# ==================== EMPLOYEE PASSWORD CHANGE ====================

@router.post("/employee-change-password")
def employee_change_password(
    data: schemas.EmployeeChangePassword,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_employee_user)
):
    """
    Allow employee to change their password.
    Requires current password for verification (security).
    """
    print(f"\n{'='*80}")
    print(f"🔐 EMPLOYEE PASSWORD CHANGE REQUEST")
    print(f"   Employee ID: {current_user['employee_id']}")
    print(f"   Employee Name: {current_user['employee_name']}")
    print(f"   Bakery ID: {current_user['bakery_id']}")
    
    employee = db.query(models.Employee).filter(
        models.Employee.id == current_user["employee_id"]
    ).first()

    if not employee:
        print(f"❌ Employee not found in database")
        print(f"{'='*80}\n")
        raise HTTPException(status_code=404, detail="Employee not found")

    print(f"✅ Employee found: {employee.name}")

    # Verify current password
    password_valid = verify_password(data.current_password, employee.hashed_password)
    print(f"🔑 Current password valid: {password_valid}")
    
    if not password_valid:
        print(f"❌ Current password is incorrect")
        print(f"{'='*80}\n")
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    # Verify passwords match
    if data.new_password != data.confirm_password:
        print(f"❌ New passwords do not match")
        print(f"{'='*80}\n")
        raise HTTPException(status_code=400, detail="New passwords do not match")

    # Password must be at least 8 characters
    if len(data.new_password) < 8:
        print(f"❌ Password too short (min 8 chars)")
        print(f"{'='*80}\n")
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Hash and update password
    hashed_password = pwd_context.hash(data.new_password)
    employee.hashed_password = hashed_password
    db.commit()

    print(f"✅ Password changed successfully for {employee.name}")
    print(f"{'='*80}\n")

    return {
        "message": "Password changed successfully",
        "employee_id": employee.id,
        "employee_name": employee.name
    }