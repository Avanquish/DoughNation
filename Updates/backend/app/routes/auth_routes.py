from fastapi import APIRouter, Depends, UploadFile, Form, File, HTTPException
from sqlalchemy.orm import Session
from app import crud, auth, database, schemas, models
from app.auth import create_access_token, verify_password

router = APIRouter()

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