from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, Form, File, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
from app import crud, auth, database, schemas, models
from app.auth import create_access_token, get_current_user, verify_password
from app.event_logger import log_system_event
from passlib.context import CryptContext
from app.timezone_utils import now_ph, to_ph_timezone

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
    
    🔐 EMPLOYEE LOGIN FLOW
    """
    print(f"\n{'='*80}")
    print(f"🔐 UNIFIED LOGIN ATTEMPT")
    print(f"   Identifier: '{user.email}'")
    print(f"   Password: {'*' * len(user.password)}")
    print(f"   Expected Role (from slider): {user.role if user.role else 'Not specified'}")
    
    identifier = user.email.strip()
    
    # STEP 1: Try to find User account (Bakery/Charity/Admin) by EMAIL
    db_user = db.query(models.User).filter(models.User.email == identifier).first()
    
    if db_user:
        # ✅ VALIDATE ROLE MATCHES SLIDER SELECTION
        if user.role and db_user.role != user.role:
            print(f"❌ Role mismatch - User is {db_user.role}, but slider shows {user.role}")
            print(f"{'='*80}\n")
            
            # Log failed login attempt (role mismatch)
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Failed login attempt - Role mismatch: User {db_user.email} is {db_user.role}, attempted login as {user.role}",
                severity="warning",
                user_id=db_user.id,
                metadata={"email": db_user.email, "actual_role": db_user.role, "attempted_role": user.role, "reason": "role_mismatch"}
            )
            
            raise HTTPException(
                status_code=403, 
                detail=f"Account role mismatch. This account is registered as '{db_user.role}'. Please select '{db_user.role}' on the login slider and try again."
            )
        
        # Found a User account - verify password
        if not verify_password(user.password, db_user.hashed_password):
            print(f"❌ Invalid password for User account")
            print(f"{'='*80}\n")
            
            # Check if admin tried to use default password after changing it
            if db_user.role == "Admin" and user.password == "admin1234" and not db_user.using_default_password:
                log_system_event(
                    db=db,
                    event_type="failed_login",
                    description=f"Admin attempted to use old default password after changing it: {db_user.email}",
                    severity="warning",
                    user_id=db_user.id,
                    metadata={"email": db_user.email, "role": db_user.role, "reason": "default_password_after_change"}
                )
                raise HTTPException(
                    status_code=401, 
                    detail="Default password is no longer valid. Please use your new password."
                )
            
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
        
        # Check account status
        if db_user.status == "Suspended":
            # Check if suspension has expired
            if db_user.suspended_until and db_user.suspended_until > now_ph():
                remaining_days = (db_user.suspended_until - now_ph()).days
                print(f"❌ Account suspended until {db_user.suspended_until}")
                log_system_event(
                    db=db,
                    event_type="failed_login",
                    description=f"Login attempt on suspended account: {db_user.email}",
                    severity="warning",
                    user_id=db_user.id,
                    metadata={"email": db_user.email, "reason": "account_suspended", "suspended_until": str(db_user.suspended_until)}
                )
                raise HTTPException(
                    status_code=403, 
                    detail=f"Account is suspended until {db_user.suspended_until.strftime('%Y-%m-%d %H:%M:%S')}. Remaining: {remaining_days} days. Reason: {db_user.status_reason or 'Not specified'}"
                )
            else:
                # Suspension expired, automatically set to Active
                db_user.status = "Active"
                db_user.suspended_until = None
                db.commit()
        
        if db_user.status == "Banned":
            print(f"❌ Account is banned")
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Login attempt on banned account: {db_user.email}",
                severity="warning",
                user_id=db_user.id,
                metadata={"email": db_user.email, "reason": "account_banned"}
            )
            raise HTTPException(
                status_code=403, 
                detail=f"Account is permanently banned. Reason: {db_user.status_reason or 'Not specified'}"
            )
        
        if db_user.status == "Deactivated":
            # Allow bakery and charity owners to reactivate by logging in
            if db_user.role in ["Bakery", "Charity"]:
                print(f"🔄 Auto-reactivating deactivated {db_user.role} account: {db_user.email}")
                db_user.status = "Active"
                db_user.deactivated_at = None
                db.commit()
                
                log_system_event(
                    db=db,
                    event_type="USER_REACTIVATED",
                    description=f"{db_user.role} account auto-reactivated upon login: {db_user.email}",
                    severity="info",
                    user_id=db_user.id,
                    metadata={"email": db_user.email, "role": db_user.role, "reactivation_method": "owner_login"}
                )
            else:
                # Admin accounts cannot auto-reactivate
                print(f"❌ Account is deactivated")
                log_system_event(
                    db=db,
                    event_type="failed_login",
                    description=f"Login attempt on deactivated account: {db_user.email}",
                    severity="warning",
                    user_id=db_user.id,
                    metadata={"email": db_user.email, "reason": "account_deactivated"}
                )
                raise HTTPException(
                    status_code=403, 
                    detail="Account has been deactivated. Please contact support."
                )
        
        print(f"✅ User authenticated: {db_user.name} (Role: {db_user.role})")
        print(f"   Role validation: PASSED")
        print(f"{'='*80}\n")
        
        # 🔐 CHECK IF ADMIN IS USING DEFAULT PASSWORD
        using_default_password = False
        if db_user.role == "Admin" and db_user.using_default_password:
            using_default_password = True
            print(f"⚠️  SECURITY WARNING: Admin is using default password and must change it")
        
        # Generate token with type based on role
        token_data = {
            "sub": str(db_user.id),
            "type": db_user.role.lower(),  # "bakery", "charity", or "admin"
            "role": db_user.role,
            "name": db_user.name,
            "contact_person": db_user.contact_person,  # Owner's name
            "is_verified": db_user.verified,
            "using_default_password": using_default_password  # Flag for frontend
        }
        
        token = create_access_token(token_data)
        
        # ✅ LOG SUCCESSFUL USER LOGIN
        log_system_event(
            db=db,
            event_type="login_success",
            description=f"User {db_user.name} ({db_user.email}) logged in successfully as {db_user.role}",
            severity="info",
            user_id=db_user.id,
            metadata={
                "email": db_user.email,
                "role": db_user.role,
                "name": db_user.name
            }
        )
        
        return {"access_token": token, "token_type": "bearer"}
    
    # STEP 2: Try to find Employee account by EMPLOYEE_ID
    # Search for employee by unique employee_id (e.g., EMP-5-001)
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == identifier
    ).first()
    
    if not employee:
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
    
    # Verify password for employee
    if not employee.hashed_password or not verify_password(user.password, employee.hashed_password):
        print(f"❌ Invalid password for Employee: {employee.employee_id}")
        print(f"{'='*80}\n")
        
        # Log failed employee login attempt (invalid password)
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Failed employee login attempt - Invalid password: {identifier}",
            severity="warning",
            user_id=None,
            metadata={"attempted_employee_id": identifier, "reason": "invalid_password"}
        )
        
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Store authenticated employee
    authenticated_employee = employee
    
    print(f"✅ Employee authenticated: {authenticated_employee.name} (Role: {authenticated_employee.role})")
    print(f"   Bakery ID: {authenticated_employee.bakery_id}")
    print(f"{'='*80}\n")

    # Check bakery owner's account status
    bakery = db.query(models.User).filter(models.User.id == authenticated_employee.bakery_id).first()
    
    if not bakery:
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Employee login failed - Bakery account not found: {authenticated_employee.employee_id}",
            severity="error",
            user_id=None,
            metadata={"employee_id": authenticated_employee.employee_id, "bakery_id": authenticated_employee.bakery_id}
        )
        raise HTTPException(status_code=403, detail="Associated bakery account not found")
    
    # Block employee login if bakery owner's account is deactivated
    if bakery.status == "Deactivated":
        print(f"❌ Bakery owner account is deactivated")
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Employee login blocked - Bakery owner account deactivated: {authenticated_employee.employee_id}",
            severity="warning",
            user_id=bakery.id,
            metadata={"employee_id": authenticated_employee.employee_id, "bakery_status": "Deactivated"}
        )
        raise HTTPException(
            status_code=403,
            detail="Cannot log in. The bakery owner's account has been deactivated. Please contact the owner to reactivate the account."
        )
    
    # Block employee login if bakery owner is suspended
    if bakery.status == "Suspended":
        if bakery.suspended_until and bakery.suspended_until > now_ph():
            remaining_days = (bakery.suspended_until - now_ph()).days
            print(f"❌ Bakery owner account is suspended")
            log_system_event(
                db=db,
                event_type="failed_login",
                description=f"Employee login blocked - Bakery owner suspended: {authenticated_employee.employee_id}",
                severity="warning",
                user_id=bakery.id,
                metadata={"employee_id": authenticated_employee.employee_id, "bakery_status": "Suspended", "suspended_until": str(bakery.suspended_until)}
            )
            raise HTTPException(
                status_code=403,
                detail=f"Cannot log in. The bakery owner's account is suspended until {bakery.suspended_until.strftime('%Y-%m-%d %H:%M:%S')}. Remaining: {remaining_days} days."
            )
    
    # Block employee login if bakery owner is banned
    if bakery.status == "Banned":
        print(f"❌ Bakery owner account is banned")
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Employee login blocked - Bakery owner banned: {authenticated_employee.employee_id}",
            severity="warning",
            user_id=bakery.id,
            metadata={"employee_id": authenticated_employee.employee_id, "bakery_status": "Banned"}
        )
        raise HTTPException(
            status_code=403,
            detail="Cannot log in. The bakery owner's account has been banned. Please contact support."
        )
    
    bakery_name = bakery.name if bakery else "Bakery"
    bakery_verified = bakery.verified if bakery else False

    # 🔐 CHECK IF EMPLOYEE STILL HAS DEFAULT PASSWORD
    # Use password_changed flag - more reliable than comparing hashes
    requires_password_change = not authenticated_employee.password_changed
    
    print(f"🔑 Password status - Changed: {authenticated_employee.password_changed}, Requires change: {requires_password_change}")
    
    # Generate employee token
    token_data = {
        "type": "employee",
        "employee_id": authenticated_employee.id,
        "employee_unique_id": authenticated_employee.employee_id,  # NEW: Include unique employee_id (e.g., EMP-5-001)
        "employee_name": authenticated_employee.name,
        "employee_role": authenticated_employee.role,
        "bakery_id": authenticated_employee.bakery_id,
        "bakery_name": bakery_name,
        "bakery_verified": bakery_verified,  # Include bakery verification status
        "sub": str(authenticated_employee.bakery_id),  # For compatibility
        "requires_password_change": requires_password_change  # Flag for first-time login
    }
    
    token = create_access_token(token_data)
    
    # ✅ LOG SUCCESSFUL EMPLOYEE LOGIN
    log_system_event(
        db=db,
        event_type="login_success",
        description=f"Employee {authenticated_employee.name} ({authenticated_employee.employee_id}) logged in successfully to bakery: {bakery_name}",
        severity="info",
        user_id=authenticated_employee.bakery_id,
        metadata={
            "employee_id": authenticated_employee.employee_id,
            "employee_name": authenticated_employee.name,
            "employee_role": authenticated_employee.role,
            "bakery_id": authenticated_employee.bakery_id,
            "bakery_name": bakery_name
        }
    )
    
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
    about: Optional[str] = Form(None),
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
        about,
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

# 🔐 ADMIN FORCE PASSWORD CHANGE (Security Enhancement)
@router.put("/admin/force-change-password", response_model=dict)
def admin_force_change_password(
    payload: schemas.ChangePassword,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Force password change for admin accounts using default credentials.
    This endpoint allows admin to change password without requiring current password verification
    when using_default_password flag is True.
    """
    # Verify user is actually an admin
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Only admin accounts can use this endpoint"
        )
    
    # Validate new passwords match
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New passwords do not match"
        )
    
    # Validate password strength
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )
    
    # Prevent using the same default password
    if payload.new_password == "admin1234":
        raise HTTPException(
            status_code=400,
            detail="Cannot use the default password. Please choose a new, strong password."
        )
    
    # Prevent using employee default password
    if payload.new_password == "Employee123!":
        raise HTTPException(
            status_code=400,
            detail="Cannot use the employee default password. Please choose a different password."
        )
    
    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if crud.check_password_history(db, current_user.id, payload.new_password, is_employee=False):
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )
    
    # Save old password to history before updating
    crud.save_password_to_history(db, current_user.id, current_user.hashed_password, is_employee=False)
    
    # Hash and update password
    hashed_password = pwd_context.hash(payload.new_password)
    current_user.hashed_password = hashed_password
    current_user.using_default_password = False  # Clear the flag
    
    db.commit()
    db.refresh(current_user)
    
    # Log the password change
    log_system_event(
        db=db,
        event_type="admin_password_changed",
        description=f"Admin {current_user.name} successfully changed password from default",
        severity="info",
        user_id=current_user.id,
        metadata={
            "email": current_user.email,
            "forced_change": True,
            "reason": "default_password_security"
        }
    )
    
    return {
        "message": "Password changed successfully. You can now access the system.",
        "success": True
    }

# ==================== USER FORGOT PASSWORD ====================
# Note: The new email-based password reset system is in email_verification_routes.py
# These legacy registration-date verification endpoints are kept for backward compatibility
# New implementations should use:
#   - POST /auth/forgot-password?email={email} - Send reset email
#   - POST /auth/reset-password - Reset with token

# Legacy Step 1: Check if email exists
# ==================== USER FORGOT PASSWORD (OTP-based) ====================

@router.post("/forgot-password/send-otp")
def send_password_reset_otp(data: dict, db: Session = Depends(database.get_db)):
    """Send OTP to user's email for password reset"""
    import random
    from datetime import datetime, timedelta
    from app.email_utils import send_otp_email
    
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Set OTP expiration (10 minutes from now)
    otp_expires = now_ph() + timedelta(minutes=10)
    
    # Store OTP in database
    user.forgot_password_otp = otp_code
    user.forgot_password_otp_expires = otp_expires
    db.commit()
    
    # Send OTP via email
    email_sent = send_otp_email(email, otp_code, user.name)
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    return {"message": "OTP sent successfully to your email", "valid": True}


@router.post("/forgot-password/verify-otp")
def verify_password_reset_otp(data: dict, db: Session = Depends(database.get_db)):
    """Verify OTP code for password reset"""
    from datetime import datetime
    
    email = data.get("email")
    otp_code = data.get("otp_code")
    
    if not email or not otp_code:
        raise HTTPException(status_code=400, detail="Email and OTP code are required")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    
    # Check if OTP exists
    if not user.forgot_password_otp:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
    
    # Check if OTP has expired
    otp_expires_aware = to_ph_timezone(user.forgot_password_otp_expires)
    if otp_expires_aware < now_ph():
        user.forgot_password_otp = None
        user.forgot_password_otp_expires = None
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Verify OTP
    if user.forgot_password_otp != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    return {"message": "OTP verified successfully", "valid": True}


@router.post("/forgot-password/reset-with-otp")
def reset_password_with_otp(data: dict, db: Session = Depends(database.get_db)):
    """Reset password after OTP verification"""
    from datetime import datetime
    
    email = data.get("email")
    otp_code = data.get("otp_code")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    if not all([email, otp_code, new_password, confirm_password]):
        raise HTTPException(status_code=400, detail="All fields are required")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    
    # Verify OTP one more time
    if not user.forgot_password_otp or user.forgot_password_otp != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    otp_expires_aware = to_ph_timezone(user.forgot_password_otp_expires)
    if otp_expires_aware < now_ph():
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Check if passwords match
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # 🚫 PREVENT OWNERS FROM USING EMPLOYEE DEFAULT PASSWORD
    EMPLOYEE_DEFAULT_PASSWORD = "Employee123!"
    if new_password == EMPLOYEE_DEFAULT_PASSWORD:
        raise HTTPException(
            status_code=400, 
            detail="Cannot use the employee default password. Please choose a different password for security reasons."
        )
    
    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if crud.check_password_history(db, user.id, new_password, is_employee=False):
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )
    
    # Save old password to history before updating
    crud.save_password_to_history(db, user.id, user.hashed_password, is_employee=False)
    
    # Update password
    hashed_pw = pwd_context.hash(new_password)
    user.hashed_password = hashed_pw
    
    # Clear OTP
    user.forgot_password_otp = None
    user.forgot_password_otp_expires = None
    
    db.commit()
    db.refresh(user)
    
    return {"message": "Password reset successful"}


# ==================== LEGACY USER FORGOT PASSWORD (Date-based) ====================

@router.post("/forgot-password/check-email")
def check_email(data: dict, db: Session = Depends(database.get_db)):
    """Legacy endpoint - prefer using /auth/forgot-password for email-based reset"""
    email = data.get("email")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    return {"valid": True}

# Legacy Step 2: Verify registration date
@router.post("/forgot-password/check-date")
def check_date(data: dict, db: Session = Depends(database.get_db)):
    """Legacy endpoint - prefer using /auth/forgot-password for email-based reset"""
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

# Legacy Step 3: Reset password
@router.post("/forgot-password/reset")
def reset_password(data: dict, db: Session = Depends(database.get_db)):
    """Legacy endpoint - prefer using /auth/forgot-password for email-based reset"""
    email = data.get("email")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # 🚫 PREVENT OWNERS FROM USING EMPLOYEE DEFAULT PASSWORD
    EMPLOYEE_DEFAULT_PASSWORD = "Employee123!"
    if new_password == EMPLOYEE_DEFAULT_PASSWORD:
        raise HTTPException(
            status_code=400, 
            detail="Cannot use the employee default password. Please choose a different password for security reasons."
        )
    
    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if crud.check_password_history(db, user.id, new_password, is_employee=False):
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )
    
    # Save old password to history before updating
    crud.save_password_to_history(db, user.id, user.hashed_password, is_employee=False)

    hashed_pw = pwd_context.hash(new_password)
    user.hashed_password = hashed_pw
    db.commit()
    db.refresh(user)

    return {"message": "Password reset successful"}


# ==================== EMPLOYEE FORGOT PASSWORD (OTP-based) ====================

@router.post("/employee/forgot-password/send-otp")
def send_employee_password_reset_otp(data: dict, db: Session = Depends(database.get_db)):
    """Send OTP to employee's email for password reset"""
    import random
    from datetime import datetime, timedelta
    from app.email_utils import send_otp_email
    
    employee_id = data.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")
    
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get bakery info
    bakery = db.query(models.User).filter(models.User.id == employee.bakery_id).first()
    bakery_name = bakery.name if bakery else "Unknown Bakery"
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Set OTP expiration (10 minutes from now)
    otp_expires = now_ph() + timedelta(minutes=10)
    
    # Store OTP in database
    employee.forgot_password_otp = otp_code
    employee.forgot_password_otp_expires = otp_expires
    db.commit()
    
    # Send OTP via email
    email_sent = send_otp_email(employee.email, otp_code, employee.name)
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    return {
        "message": "OTP sent successfully to your email",
        "valid": True,
        "bakery_name": bakery_name,
        "email": employee.email  # Return masked email for confirmation
    }


@router.post("/employee/forgot-password/verify-otp")
def verify_employee_password_reset_otp(data: dict, db: Session = Depends(database.get_db)):
    """Verify OTP code for employee password reset"""
    from datetime import datetime
    
    employee_id = data.get("employee_id")
    otp_code = data.get("otp_code")
    
    if not employee_id or not otp_code:
        raise HTTPException(status_code=400, detail="Employee ID and OTP code are required")
    
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if OTP exists
    if not employee.forgot_password_otp:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
    
    # Check if OTP has expired
    otp_expires_aware = to_ph_timezone(employee.forgot_password_otp_expires)
    if otp_expires_aware < now_ph():
        employee.forgot_password_otp = None
        employee.forgot_password_otp_expires = None
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Verify OTP
    if employee.forgot_password_otp != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    return {"message": "OTP verified successfully", "valid": True}


@router.post("/employee/forgot-password/reset-with-otp")
def reset_employee_password_with_otp(data: dict, db: Session = Depends(database.get_db)):
    """Reset employee password after OTP verification"""
    from datetime import datetime
    
    employee_id = data.get("employee_id")
    otp_code = data.get("otp_code")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    if not all([employee_id, otp_code, new_password, confirm_password]):
        raise HTTPException(status_code=400, detail="All fields are required")
    
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify OTP one more time
    if not employee.forgot_password_otp or employee.forgot_password_otp != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    otp_expires_aware = to_ph_timezone(employee.forgot_password_otp_expires)
    if otp_expires_aware < now_ph():
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Check if passwords match
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if employee.hashed_password and crud.check_password_history(db, employee.id, new_password, is_employee=True):
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )
    
    # Save old password to history before updating (if exists)
    if employee.hashed_password:
        crud.save_password_to_history(db, employee.id, employee.hashed_password, is_employee=True)
    
    # Update password
    hashed_pw = pwd_context.hash(new_password)
    employee.hashed_password = hashed_pw
    
    # Clear OTP
    employee.forgot_password_otp = None
    employee.forgot_password_otp_expires = None
    
    db.commit()
    db.refresh(employee)
    
    return {"message": "Password reset successful"}


# ==================== LEGACY EMPLOYEE FORGOT PASSWORD (Date-based) ====================

# Step 1: Check if employee_id exists
@router.post("/employee/forgot-password/check-employee-id")
def check_employee_id(data: dict, db: Session = Depends(database.get_db)):
    employee_id = data.get("employee_id")
    
    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")
    
    # Find employee by employee_id (unique identifier like EMP-5-001)
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get bakery info for display
    bakery = db.query(models.User).filter(models.User.id == employee.bakery_id).first()
    bakery_name = bakery.name if bakery else "Unknown Bakery"
    
    return {"valid": True, "bakery_name": bakery_name}

# Step 2: Verify employee registration date
@router.post("/employee/forgot-password/check-date")
def check_employee_date(data: dict, db: Session = Depends(database.get_db)):
    employee_id = data.get("employee_id")
    registration_date = data.get("registration_date")
    
    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")

    # Find employee by employee_id
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Compare only the date part - employee has created_at as DateTime
    # Convert datetime to date for comparison
    employee_date = employee.created_at.date() if hasattr(employee.created_at, 'date') else employee.created_at
    
    if str(employee_date) != str(registration_date):
        raise HTTPException(status_code=400, detail="Registration date does not match")

    return {"valid": True}

# Step 3: Reset employee password
@router.post("/employee/forgot-password/reset")
def reset_employee_password(data: dict, db: Session = Depends(database.get_db)):
    employee_id = data.get("employee_id")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")

    # Find employee by employee_id
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if employee.hashed_password and crud.check_password_history(db, employee.id, new_password, is_employee=True):
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )
    
    # Save old password to history before updating (if exists)
    if employee.hashed_password:
        crud.save_password_to_history(db, employee.id, employee.hashed_password, is_employee=True)

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
    
    - Manager and Employee roles can log in
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

    # 🔐 PREVENT REUSING LAST 5 PASSWORDS
    if crud.check_password_history(db, employee.id, data.new_password, is_employee=True):
        print(f"❌ Employee attempted to reuse one of last 5 passwords")
        print(f"{'='*80}\n")
        raise HTTPException(
            status_code=400,
            detail="Cannot reuse any of your last 5 passwords. Please choose a different password for security reasons."
        )

    # 🚫 PREVENT REUSE OF INITIAL DEFAULT PASSWORD
    if employee.initial_password_hash:
        is_initial_password = verify_password(data.new_password, employee.initial_password_hash)
        print(f"🔍 Checking if new password matches initial password: {is_initial_password}")
        
        if is_initial_password:
            print(f"❌ Employee attempted to reuse initial default password")
            print(f"{'='*80}\n")
            raise HTTPException(
                status_code=400, 
                detail="Cannot reuse the initial default password. Please choose a different password for security."
            )
    
    # Save old password to history before updating
    crud.save_password_to_history(db, employee.id, employee.hashed_password, is_employee=True)

    # Hash and update password
    hashed_password = pwd_context.hash(data.new_password)
    employee.hashed_password = hashed_password
    employee.password_changed = True  # ✅ Mark password as changed
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
    Also creates an employee record for bakeries (matching self-registration behavior)
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
    
    # 🆕 CREATE EMPLOYEE RECORD FOR BAKERIES (matching self-registration behavior)
    if role == "Bakery":
        try:
            # Generate unique employee_id (format: EMP-{bakery_id}-001)
            employee_count = db.query(models.Employee).filter(
                models.Employee.bakery_id == new_user.id
            ).count()
            employee_unique_id = f"EMP-{new_user.id}-{str(employee_count + 1).zfill(3)}"
            
            # Create employee from contact person with default password
            default_employee_password = "Employee123!"
            employee_hashed_password = pwd_context.hash(default_employee_password)
            
            new_employee = models.Employee(
                employee_id=employee_unique_id,
                bakery_id=new_user.id,
                name=contact_person,
                role="Owner",
                start_date=date.today(),
                hashed_password=employee_hashed_password,
                created_at=date.today()
            )
            
            db.add(new_employee)
            db.commit()
            db.refresh(new_employee)
            
            print(f"✅ Created employee record for bakery: {new_employee.name} (ID: {new_employee.employee_id})")
            
        except Exception as e:
            print(f"⚠️ Warning: Failed to create employee record: {str(e)}")
            # Don't fail the entire registration if employee creation fails
            # The user account is already created and committed
    
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
        "verified": new_user.verified,
        "employee_created": role == "Bakery"  # Indicate if employee was created
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
    status: Optional[str] = Form(None),
    suspension_days: Optional[int] = Form(None),
    status_reason: Optional[str] = Form(None),
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
    
    # Track status change for audit log
    old_status = user.status
    status_changed = False
    
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
    if status and status != old_status:
        # Validate status
        valid_statuses = ["Active", "Pending", "Suspended", "Banned", "Deactivated"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        user.status = status
        user.status_changed_at = now_ph()
        user.status_changed_by = current_user.id
        status_changed = True
        
        # Handle suspension
        if status == "Suspended":
            if suspension_days and suspension_days > 0:
                from datetime import timedelta
                user.suspended_until = now_ph() + timedelta(days=suspension_days)
            else:
                raise HTTPException(status_code=400, detail="Suspension days must be provided for Suspended status")
        else:
            # Clear suspension if status is not Suspended
            user.suspended_until = None
        
        # Store reason if provided
        if status_reason:
            user.status_reason = status_reason
    
    db.commit()
    db.refresh(user)
    
    # Log the event
    if status_changed:
        log_system_event(
            db=db,
            event_type="USER_STATUS_CHANGED",
            description=f"Admin {current_user.name} changed user {user.name} (ID: {user_id}) status from {old_status} to {status}",
            severity="warning" if status in ["Suspended", "Banned", "Deactivated"] else "info",
            user_id=current_user.id
        )
    
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
            "address": user.address,
            "status": user.status
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


@router.post("/deactivate-account")
def deactivate_account(
    password: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Allow users to deactivate their own account
    For bakeries: Only the owner (contact_person matches employee with role='Owner') can deactivate
    For charities: Any user can deactivate their account
    Requires password confirmation
    """
    # Verify password
    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Check if user is bakery and verify ownership
    if current_user.role == "Bakery":
        # Get the employee token to check if they are the owner
        # For bakery users, we need to verify they are the owner
        owner_employee = db.query(models.Employee).filter(
            models.Employee.bakery_id == current_user.id,
            models.Employee.role == "Owner"
        ).first()
        
        if not owner_employee:
            raise HTTPException(
                status_code=403, 
                detail="Only the bakery owner can deactivate the account"
            )
        
        # If logged in as user (not employee), verify contact_person matches owner
        if current_user.contact_person != owner_employee.name:
            raise HTTPException(
                status_code=403,
                detail="Only the bakery owner can deactivate the account"
            )
    
    # Admin accounts cannot be deactivated this way
    if current_user.role == "Admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be self-deactivated"
        )
    
    # Deactivate the account
    current_user.status = "Deactivated"
    current_user.deactivated_at = now_ph()
    db.commit()
    
    # Log the event
    log_system_event(
        db=db,
        event_type="USER_SELF_DEACTIVATE",
        description=f"User {current_user.name} ({current_user.role}) deactivated their own account",
        severity="info",
        user_id=current_user.id
    )
    
    return {
        "message": "Account deactivated successfully",
        "deactivated_at": current_user.deactivated_at
    }