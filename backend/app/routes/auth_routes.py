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