from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import database, models, schemas
from app.database import get_db
from fastapi.security import OAuth2PasswordBearer
import jwt

router = APIRouter(prefix="/analytics", tags=["Analytics"])

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/", response_model=schemas.AnalyticsResponse)
def get_analytics(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Bakery":
        raise HTTPException(status_code=403, detail="Access denied")

    inventory_items = db.query(models.BakeryInventory).filter(models.BakeryInventory.bakery_id == current_user.id).all()
    donations = db.query(models.Donation).filter(models.Donation.bakery_id == current_user.id).all()
    employees = db.query(models.Employee).filter(models.Employee.bakery_id == current_user.id).all()
    badges = db.query(models.Badge).filter(models.Badge.user_id == current_user.id).all()

    return {
        "inventory": inventory_items,
        "donations": donations,
        "employees": employees,
        "badges": badges,
    }