from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from app.timezone_utils import now_ph
from fastapi.security import OAuth2PasswordBearer
from app import models, schemas, database 
from sqlalchemy.orm import Session
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = now_ph() + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> models.User:
    if not SECRET_KEY or not ALGORITHM:
        raise RuntimeError("SECRET_KEY or ALGORITHM environment variable not set")
    
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Missing authentication token",
                            headers={"WWW-Authenticate": "Bearer"})
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
        # Convert sub to int if possible (user ID)
        try:
            user_id = int(sub)
            user = db.query(models.User).filter(models.User.id == user_id).first()
        except ValueError:
            # fallback: assume sub is email
            user = db.query(models.User).filter(models.User.email == sub).first()
        
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        print(f"Authenticated user: {user.id} | role: {user.role}")
        return user

    except JWTError as e:
        print("JWT decode error:", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Could not validate credentials",
                            headers={"WWW-Authenticate": "Bearer"})


def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def ensure_verified_user(current_user: models.User = Depends(get_current_user)):
    """
    Use this dependency on endpoints that must be accessible only to verified users.
    """
    if not current_user.verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending verification")
    return current_user

def get_current_employee(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),  # assuming you already have this
):
    employee = db.query(models.Employee).filter(
        models.Employee.id == current_user.id   # FIX: was Employee.user_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return employee


def get_current_employee_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Validate employee JWT token and return employee data.
    Returns dict with employee_id, employee_name, employee_role, bakery_id.
    """
    print(f"\n{'='*80}")
    print(f"🔐 GET_CURRENT_EMPLOYEE_USER CALLED")
    print(f"   Token received: {token[:50]}..." if token else "   Token: None")
    
    if not SECRET_KEY or not ALGORITHM:
        raise RuntimeError("SECRET_KEY or ALGORITHM environment variable not set")

    if not token:
        print(f"❌ No token provided")
        print(f"{'='*80}\n")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ Token decoded successfully")
        print(f"   Payload: {payload}")
        
        # Check if this is an employee token
        token_type = payload.get("type")
        print(f"   Token type: {token_type}")
        
        if token_type != "employee":
            print(f"❌ Invalid token type (expected 'employee', got '{token_type}')")
            print(f"{'='*80}\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type. Employee token required."
            )

        employee_id = payload.get("employee_id")
        print(f"   Employee ID from token: {employee_id}")
        
        if not employee_id:
            print(f"❌ No employee_id in token payload")
            print(f"{'='*80}\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # Verify employee still exists
        employee = db.query(models.Employee).filter(
            models.Employee.id == employee_id
        ).first()

        if not employee:
            print(f"❌ Employee ID {employee_id} not found in database")
            print(f"{'='*80}\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee not found"
            )

        print(f"✅ Employee authenticated: {employee.name} (ID: {employee.id})")
        print(f"{'='*80}\n")

        return {
            "employee_id": employee.id,
            "employee_name": employee.name,
            "employee_role": employee.role,
            "bakery_id": employee.bakery_id
        }

    except JWTError as e:
        print(f"❌ JWT decode error: {str(e)}")
        print(f"{'='*80}\n")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_current_user_or_employee(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
):
    """
    Unified authentication that accepts BOTH bakery owner tokens AND employee tokens.
    
    Returns:
        - For bakery owner tokens: User model instance
        - For employee tokens: dict with employee_id, employee_name, employee_role, bakery_id
    """
    if not SECRET_KEY or not ALGORITHM:
        raise RuntimeError("SECRET_KEY or ALGORITHM environment variable not set")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        
        # Employee token
        if token_type == "employee":
            employee_id = payload.get("employee_id")
            if not employee_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid employee token payload"
                )
            
            employee = db.query(models.Employee).filter(
                models.Employee.id == employee_id
            ).first()
            
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Employee not found"
                )
            
            # Return employee data in dict format
            return {
                "type": "employee",
                "employee_id": employee.id,
                "employee_name": employee.name,
                "employee_role": employee.role,
                "bakery_id": employee.bakery_id,
                "user_id": employee.bakery_id  # For compatibility with existing code
            }
        
        # Bakery owner token (standard user token)
        else:
            sub = payload.get("sub")
            if sub is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
            
            try:
                user_id = int(sub)
                user = db.query(models.User).filter(models.User.id == user_id).first()
            except ValueError:
                user = db.query(models.User).filter(models.User.email == sub).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            
            # Return user model for bakery owners
            return user
    
    except JWTError as e:
        print(f"JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_bakery_id_from_auth(current_auth):
    """
    Helper to extract bakery_id from either User model or employee dict.
    
    Args:
        current_auth: Either a User model (bakery owner) or dict (employee)
    
    Returns:
        bakery_id (int)
    """
    if isinstance(current_auth, dict):
        # Employee authentication
        return current_auth.get("bakery_id")
    else:
        # User model (bakery owner)
        return current_auth.id


def check_employee_role_access(
    required_roles: list,
    current_employee: dict = Depends(get_current_employee_user)
) -> dict:
    """
    Check if employee has required role for accessing an endpoint.
    
    Args:
        required_roles: List of allowed roles (e.g., ["Manager", "Employee"])
    
    Returns:
        employee data if access allowed
    """
    if current_employee["employee_role"] not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {', '.join(required_roles)}"
        )
    return current_employee


def can_edit_own_only(
    resource_creator_id: int,
    current_employee: dict = Depends(get_current_employee_user)
) -> dict:
    """
    Check if employee can only edit their own resources.
    Owners and Managers can edit anything from their bakery.
    Employees can only edit their own.
    
    Args:
        resource_creator_id: The ID of the employee who created the resource
    
    Returns:
        employee data if access allowed
    """
    role = current_employee["employee_role"]
    employee_id = current_employee["employee_id"]

    # Owners and Managers can edit any resource from their bakery
    if role in ["Owner", "Manager"]:
        return current_employee

    # Employees can only edit their own resources
    if role == "Employee" and resource_creator_id == employee_id:
        return current_employee

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You can only edit your own records"
    )