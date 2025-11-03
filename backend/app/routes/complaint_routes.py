from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, database, auth, models

router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"]
    )

# Create Complaint
@router.post("/", response_model=schemas.ComplaintOut)
def create_complaint(
    complaint: schemas.ComplaintCreate,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract user ID from either employee or user token
    if isinstance(current_auth, dict):
        # Employee token - use bakery_id as user_id for complaint
        user_id = current_auth.get("bakery_id")
    else:
        # Regular user token
        user_id = current_auth.id
    
    return crud.create_complaint(db, complaint, user_id)

# Get complaints of the logged-in user
@router.get("/me", response_model=list[schemas.ComplaintOut])
def get_my_complaints(
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract user ID from either employee or user token
    if isinstance(current_auth, dict):
        # Employee token - use bakery_id to get bakery's complaints
        user_id = current_auth.get("bakery_id")
    else:
        # Regular user token
        user_id = current_auth.id
    
    return db.query(models.Complaint).filter(
        models.Complaint.user_id == user_id
    ).all()

# Get all complaints (admin only)
@router.get("/", response_model=list[schemas.ComplaintOut])
def get_all_complaints(
    db: Session = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_complaints(db)

# Update complaint status (admin only)
@router.put("/{complaint_id}/status", response_model=schemas.ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    status: schemas.ComplaintUpdateStatus,
    db: Session = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    complaint = crud.update_complaint_status(db, complaint_id, status.status)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint