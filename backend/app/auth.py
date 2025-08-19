from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app import models, database
from sqlalchemy.orm import Session
import os

# -------------------- CONFIG --------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")  # fallback for dev
ALGORITHM = os.getenv("ALGORITHM", "HS256")            # default to HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# -------------------- UTILS --------------------
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# -------------------- USER HELPERS --------------------
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")  # should always be user_id
        if sub is None:
            raise credentials_exception

        user = db.query(models.User).filter(models.User.id == int(sub)).first()
        if not user:
            raise credentials_exception
        return user
    except JWTError:
        raise credentials_exception


# -------------------- ROLE-BASED ACCESS --------------------
def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

def get_current_bakery(current_user: models.User = Depends(get_current_user)):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bakery access required")
    return current_user

def get_current_charity(current_user: models.User = Depends(get_current_user)):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Charity access required")
    return current_user


# -------------------- VERIFICATION --------------------
def ensure_verified_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending verification")
    return current_user
