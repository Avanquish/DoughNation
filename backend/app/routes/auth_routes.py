from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, Form, File, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app import crud, auth, database, schemas, models
from app.auth import create_access_token, get_current_user, verify_password
from app.event_logger import log_system_event
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
def unified_login(user: schemas.UserLogin, db: Session = Depends(database.get_db)):
    """
    🔑 UNIFIED LOGIN SYSTEM
    
    Supports both User (Bakery/Charity/Admin) and Employee accounts:
    - Users log in with EMAIL + PASSWORD
    - Employees log in with NAME + PASSWORD (identifier field accepts name)
    
    Returns JWT with:
    - type: "bakery" | "charity" | "admin" | "employee"
    - role: user's specific role
    - appropriate ID fields
    
    🚫 RESTRICTION: Part-time employees CANNOT log in
    """
    print(f"\n{'='*80}")
    print(f"🔐 UNIFIED LOGIN ATTEMPT")
    print(f"   Identifier: '{user.email}'")
    print(f"   Password: {'*' * len(user.password)}")
    
    identifier = user.email.strip()
    
    # STEP 1: Try to find User account (Bakery/Charity/Admin) by EMAIL
    db_user = db.query(models.User).filter(models.User.email == identifier).first()
    
    if db_user:
        # Found a User account - verify password
        if not verify_password(user.password, db_user.hashed_password):
            print(f"❌ Invalid password for User account")
            print(f"{'='*80}\n")
            
            # Log failed user login attempt (invalid password)
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Failed login attempt - Invalid password for user: {db_user.email} ({db_user.role})",
                severity="warning",
                user_id=db_user.id,
                metadata={"email": db_user.email, "role": db_user.role, "reason": "invalid_password"}
            )
            
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        print(f"✅ User authenticated: {db_user.name} (Role: {db_user.role})")
        print(f"{'='*80}\n")
        
        # Generate token with type based on role
        token_data = {
            "sub": str(db_user.id),
            "type": db_user.role.lower(),  # "bakery", "charity", or "admin"
            "role": db_user.role,
            "name": db_user.name,
            "is_verified": db_user.verified
        }
        
        token = create_access_token(token_data)
        return {"access_token": token, "token_type": "bearer"}
    
    # STEP 2: Try to find Employee account by NAME
    # Search across ALL bakeries (employee might not know bakery_id at login)
    employees = db.query(models.Employee).filter(
        models.Employee.name == identifier
    ).all()
    
    if not employees:
        print(f"❌ No User or Employee found with identifier: '{identifier}'")
        print(f"{'='*80}\n")
        
        # Log failed login attempt (account not found)
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Failed login attempt - Account not found: {identifier}",
            severity="warning",
            user_id=None,
            metadata={"attempted_identifier": identifier, "reason": "account_not_found"}
        )
        
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # If multiple employees with same name exist, try to authenticate with each
    authenticated_employee = None
    for emp in employees:
        if emp.hashed_password and verify_password(user.password, emp.hashed_password):
            authenticated_employee = emp
            break
    
    if not authenticated_employee:
        print(f"❌ Invalid password for Employee account(s)")
        print(f"{'='*80}\n")
        
        # Log failed employee login attempt (invalid password)
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Failed employee login attempt - Invalid password: {identifier}",
            severity="warning",
            user_id=None,
            metadata={"attempted_name": identifier, "reason": "invalid_password", "employee_count": len(employees)}
        )
        
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 🚫 BLOCK PART-TIME EMPLOYEES
    employee_role_normalized = authenticated_employee.role.lower().replace("-", "").replace(" ", "")
    if "parttime" in employee_role_normalized or employee_role_normalized == "part":
        print(f"🚫 Part-time employee login blocked: {authenticated_employee.name}")
        print(f"{'='*80}\n")
        
        # Log failed employee login attempt (part-time restriction)
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Failed employee login attempt - Part-time restriction: {authenticated_employee.name} (Bakery ID: {authenticated_employee.bakery_id})",
            severity="warning",
            user_id=None,
            metadata={"employee_name": authenticated_employee.name, "bakery_id": authenticated_employee.bakery_id, "reason": "part_time_restriction"}
        )
        
        raise HTTPException(
            status_code=403, 
            detail="Part-time employees cannot access the system. Please contact your manager if you believe this is an error."
        )
    
    print(f"✅ Employee authenticated: {authenticated_employee.name} (Role: {authenticated_employee.role})")
    print(f"   Bakery ID: {authenticated_employee.bakery_id}")
    print(f"{'='*80}\n")

    bakery = db.query(models.User).filter(models.User.id == authenticated_employee.bakery_id).first()
    bakery_name = bakery.name if bakery else "Bakery"

    # 🔐 CHECK IF EMPLOYEE IS USING DEFAULT PASSWORD
    is_default_password = verify_password("Employee123!", authenticated_employee.hashed_password)
    
    # Generate employee token
    token_data = {
        "type": "employee",
        "employee_id": authenticated_employee.id,
        "employee_name": authenticated_employee.name,
        "employee_role": authenticated_employee.role,
        "bakery_id": authenticated_employee.bakery_id,
        "bakery_name": bakery_name,
        "sub": str(authenticated_employee.bakery_id),  # For compatibility
        "requires_password_change": is_default_password  # Flag for first-time login
    }
    
    token = create_access_token(token_data)
    return {"access_token": token, "token_type": "bearer", "bakery_name": bakery_name}

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
    from datetime import datetime, date
    
    email = data.get("email")
    registration_date = data.get("registration_date")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    # Handle both datetime and date objects
    if isinstance(user.created_at, datetime):
        user_date = user.created_at.date()
    elif isinstance(user.created_at, date):
        user_date = user.created_at
    else:
        user_date = str(user.created_at).split()[0]
    
    # Compare as strings in YYYY-MM-DD format
    if str(user_date) != str(registration_date):
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


# ==================== EMPLOYEE FORGOT PASSWORD ====================

# Step 1: Check if employee name exists with bakery verification
@router.post("/employee/forgot-password/check-name")
def check_employee_name(data: dict, db: Session = Depends(database.get_db)):
    name = data.get("name")
    bakery_name = data.get("bakery_name")
    
    if not bakery_name:
        raise HTTPException(status_code=400, detail="Bakery name is required")
    
    # Find the bakery first
    bakery = db.query(models.User).filter(
        models.User.role == "Bakery",
        models.User.name == bakery_name
    ).first()
    
    if not bakery:
        raise HTTPException(status_code=404, detail="Bakery not found")
    
    # Find employee associated with this bakery
    employee = db.query(models.Employee).filter(
        models.Employee.name == name,
        models.Employee.bakery_id == bakery.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in this bakery")
    
    return {"valid": True, "bakery_id": bakery.id}

# Step 2: Verify employee registration date with bakery verification
@router.post("/employee/forgot-password/check-date")
def check_employee_date(data: dict, db: Session = Depends(database.get_db)):
    name = data.get("name")
    bakery_name = data.get("bakery_name")
    registration_date = data.get("registration_date")
    
    if not bakery_name:
        raise HTTPException(status_code=400, detail="Bakery name is required")

    # Find the bakery first
    bakery = db.query(models.User).filter(
        models.User.role == "Bakery",
        models.User.name == bakery_name
    ).first()
    
    if not bakery:
        raise HTTPException(status_code=404, detail="Bakery not found")
    
    # Find employee associated with this bakery
    employee = db.query(models.Employee).filter(
        models.Employee.name == name,
        models.Employee.bakery_id == bakery.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in this bakery")

    # Compare only the date part - employee has created_at as DateTime
    # Convert datetime to date for comparison
    employee_date = employee.created_at.date() if hasattr(employee.created_at, 'date') else employee.created_at
    
    if str(employee_date) != str(registration_date):
        raise HTTPException(status_code=400, detail="Registration date does not match")

    return {"valid": True}

# Step 3: Reset employee password with bakery verification
@router.post("/employee/forgot-password/reset")
def reset_employee_password(data: dict, db: Session = Depends(database.get_db)):
    name = data.get("name")
    bakery_name = data.get("bakery_name")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    if not bakery_name:
        raise HTTPException(status_code=400, detail="Bakery name is required")

    # Find the bakery first
    bakery = db.query(models.User).filter(
        models.User.role == "Bakery",
        models.User.name == bakery_name
    ).first()
    
    if not bakery:
        raise HTTPException(status_code=404, detail="Bakery not found")
    
    # Find employee associated with this bakery
    employee = db.query(models.Employee).filter(
        models.Employee.name == name,
        models.Employee.bakery_id == bakery.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in this bakery")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    hashed_pw = pwd_context.hash(new_password)
    employee.hashed_password = hashed_pw
    db.commit()
    db.refresh(employee)

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
            
            # Log failed employee login attempt (employee not found)
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Failed employee login attempt - Employee not found: {credentials.name} (Bakery ID: {credentials.bakery_id})",
                severity="warning",
                user_id=None,
                metadata={"attempted_name": credentials.name, "bakery_id": credentials.bakery_id, "reason": "employee_not_found"}
            )
            
            raise HTTPException(status_code=404, detail="Employee not found")
        
        print(f"✅ MATCH FOUND: {employee.name} (ID: {employee.id}, Role: {employee.role})")
        
        # Part-time employees cannot log in
        if employee.role == "Part-time":
            print(f"❌ Part-time employees cannot log in")
            print(f"{'='*80}\n")
            
            # Log failed employee login attempt (part-time restriction)
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Failed employee login attempt - Part-time employee tried to login: {employee.name} (Bakery ID: {credentials.bakery_id})",
                severity="warning",
                user_id=None,
                metadata={"employee_name": employee.name, "bakery_id": credentials.bakery_id, "reason": "part_time_restriction"}
            )
            
            raise HTTPException(
                status_code=403,
                detail="Part-time employees cannot log in"
            )

        # Verify password
        if not employee.hashed_password:
            print(f"❌ Employee has no hashed password set!")
            print(f"{'='*80}\n")
            
            # Log failed employee login attempt (no password set)
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Failed employee login attempt - No password set: {employee.name} (Bakery ID: {credentials.bakery_id})",
                severity="warning",
                user_id=None,
                metadata={"employee_name": employee.name, "bakery_id": credentials.bakery_id, "reason": "no_password_set"}
            )
            
            raise HTTPException(status_code=401, detail="Employee has no password set. Please contact your bakery owner.")
        
        password_is_valid = verify_password(credentials.password, employee.hashed_password)
        print(f"🔐 Password verification: {password_is_valid}")
        
        if not password_is_valid:
            print(f"❌ Password verification failed")
            print(f"{'='*80}\n")
            
            # Log failed employee login attempt (invalid password)
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Failed employee login attempt - Invalid password: {employee.name} (Bakery ID: {credentials.bakery_id})",
                severity="warning",
                user_id=None,
                metadata={"employee_name": employee.name, "bakery_id": credentials.bakery_id, "reason": "invalid_password"}
            )
            
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

        # Fetch bakery name
        bakery = db.query(models.User).filter(models.User.id == employee.bakery_id).first()
        bakery_name = bakery.name if bakery else "Bakery"
        
        print(f"✅ LOGIN SUCCESSFUL for {employee.name}")
        print(f"{'='*80}\n")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "employee_id": employee.id,
            "employee_name": employee.name,
            "employee_role": employee.role,
            "bakery_id": employee.bakery_id,
            "bakery_name": bakery_name 
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

    # 🔑 GENERATE NEW TOKEN (without requires_password_change flag)
    new_token_data = {
        "type": "employee",
        "employee_id": employee.id,
        "employee_name": employee.name,
        "employee_role": employee.role,
        "bakery_id": employee.bakery_id,
        "sub": str(employee.bakery_id),
        "requires_password_change": False  # Password has been changed
    }
    new_token = create_access_token(new_token_data)

    return {
        "message": "Password changed successfully",
        "employee_id": employee.id,
        "employee_name": employee.name,
        "access_token": new_token,  # Return new token
        "token_type": "bearer"
    }


# ================== ADMIN MANUAL REGISTRATION ==================
@router.post("/admin/register-user")
async def admin_manual_register(
    role: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    contact_person: str = Form(...),
    contact_number: str = Form(...),
    address: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    profile_picture: UploadFile = File(None),
    proof_of_validity: UploadFile = File(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Admin manual user registration - creates fully verified accounts
    Only admins can use this endpoint
    Follows same format as regular registration but bypasses verification
    """
    # Verify that current user is an admin
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can manually register users")
    
    # Validate role
    if role not in ["Bakery", "Charity"]:
        raise HTTPException(status_code=400, detail="Role must be either 'Bakery' or 'Charity'")
    
    # Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate passwords match
    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Validate password length
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Hash password
    hashed_password = pwd_context.hash(password)
    
    # Handle file uploads (same as regular registration)
    import os
    import uuid
    from pathlib import Path
    
    profile_picture_path = None
    proof_of_validity_path = None
    
    if profile_picture and profile_picture.filename:
        upload_dir = Path("uploads/profile_pictures")
        upload_dir.mkdir(parents=True, exist_ok=True)
        ext = os.path.splitext(profile_picture.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(await profile_picture.read())
        profile_picture_path = str(file_path)
    
    if proof_of_validity and proof_of_validity.filename:
        upload_dir = Path("uploads/proofs")
        upload_dir.mkdir(parents=True, exist_ok=True)
        ext = os.path.splitext(proof_of_validity.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(await proof_of_validity.read())
        proof_of_validity_path = str(file_path)
    
    # Create new user
    new_user = models.User(
        role=role,
        name=name,
        email=email,
        contact_person=contact_person,
        contact_number=contact_number,
        address=address,
        hashed_password=hashed_password,
        profile_picture=profile_picture_path,
        proof_of_validity=proof_of_validity_path,
        latitude=latitude,
        longitude=longitude,
        verified=True,  # Admin-created accounts are auto-verified
        created_at=date.today()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log the event
    log_system_event(
        db=db,
        event_type="ADMIN_MANUAL_REGISTRATION",
        description=f"Admin {current_user.name} manually registered {role} account: {name} ({email})",
        severity="info",
        user_id=current_user.id
    )
    
    return {
        "message": f"{role} account created successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "verified": new_user.verified
    }


@router.put("/admin/update-user/{user_id}")
def admin_update_user(
    user_id: int,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    contact_person: Optional[str] = Form(None),
    contact_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Admin update user information
    Only admins can use this endpoint
    """
    # Verify that current user is an admin
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    # Find the user to update
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if name:
        user.name = name
    if email:
        # Check if email is already taken by another user
        existing = db.query(models.User).filter(
            models.User.email == email,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = email
    if contact_person:
        user.contact_person = contact_person
    if contact_number:
        user.contact_number = contact_number
    if address:
        user.address = address
    if latitude is not None:
        user.latitude = latitude
    if longitude is not None:
        user.longitude = longitude
    
    db.commit()
    db.refresh(user)
    
    # Log the event
    log_system_event(
        db=db,
        event_type="ADMIN_UPDATE_USER",
        description=f"Admin {current_user.name} updated user {user.name} (ID: {user_id})",
        severity="info",
        user_id=current_user.id
    )
    
    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "contact_person": user.contact_person,
            "contact_number": user.contact_number,
            "address": user.address
        }
    }


@router.delete("/admin/delete-user/{user_id}")
def admin_delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Admin delete user account
    Only admins can use this endpoint
    """
    # Verify that current user is an admin
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    # Find the user to delete
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting admin accounts
    if user.role == "Admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts")
    
    # Store user info for logging before deletion
    user_name = user.name
    user_email = user.email
    user_role = user.role
    
    # Delete the user
    db.delete(user)
    db.commit()
    
    # Log the event
    log_system_event(
        db=db,
        event_type="ADMIN_DELETE_USER",
        description=f"Admin {current_user.name} deleted {user_role} account: {user_name} ({user_email})",
        severity="warning",
        user_id=current_user.id
    )
    
    return {
        "message": f"User {user_name} deleted successfully"
    }