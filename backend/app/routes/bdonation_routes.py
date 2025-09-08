from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app import models, database, auth, schemas
from datetime import datetime
from app.auth import ensure_verified_user
from app.database import get_db

router = APIRouter(prefix="/donations", tags=["donations"])

# ------------------ GET DONATIONS FOR BAKERY ------------------
@router.get("/")
def get_donations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    donations = (
        db.query(models.Donation)
        .filter(models.Donation.bakery_id == current_user.id)
        .options(joinedload(models.Donation.requests).joinedload(models.DonationRequest.charity))
        .all()
    )

    result = []
    for d in donations:
        donation_data = d.__dict__.copy()

        if d.status == "requested" and d.requests:
            # Pick the latest request (by timestamp) that is 'requested'
            request = next(
                (r for r in sorted(d.requests, key=lambda x: x.timestamp, reverse=True)
                 if r.status == "requested"),
                None
            )
            if request and request.charity:
                donation_data["charity_name"] = request.charity.name
            else:
                donation_data["charity_name"] = "Unknown Charity"

        result.append(donation_data)

    return result


# ------------------ CONFIRM REQUEST ------------------
@router.post("/confirm-request")
def confirm_donation_request(
    request: schemas.DonationRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user),
):
    # 1. Find the donation
    donation = db.query(models.Donation).filter(
        models.Donation.id == request.donation_id,
        models.Donation.bakery_id == current_user.id  # ensure bakery owns it
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    if donation.status != "available":
        raise HTTPException(
            status_code=400,
            detail=f"Donation cannot be confirmed. Current status: {donation.status}"
        )

    # 2. Update status → requested
    donation.status = "requested"

    # 3. Create a record in DonationRequest table (if you want to track requests separately)
    donation_request = models.DonationRequest(
        donation_id=request.donation_id,
        charity_id=request.charity_id,
        bakery_id=current_user.id,
        status="requested"
    )
    db.add(donation_request)

    # 4. Commit changes
    db.commit()
    db.refresh(donation)

    return {"message": "Donation request confirmed", "donation": donation}


# ------------------ DECLINE REQUEST ------------------
@router.put("/decline/{request_id}")
def decline_request(
    request_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    request = db.query(models.DonationRequest).filter(models.DonationRequest.id == request_id).first()
    if not request or request.status != "pending":
        raise HTTPException(status_code=400, detail="Invalid or already processed request")

    donation = db.query(models.Donation).filter(models.Donation.id == request.donation_id).first()
    if not donation or donation.bakery_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this donation")

    # ✅ Decline request
    request.status = "declined"
    donation.status = "available"

    db.commit()
    return {"message": "Donation request declined", "donation_status": donation.status}


# ------------------ PROGRESS DONATION STATUS ------------------
@router.patch("/{donation_id}/progress")
def progress_donation_status(
    donation_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    donation = db.query(models.Donation).filter(
        models.Donation.id == donation_id,
        models.Donation.bakery_id == current_user.id
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    # 🔑 Ensure donation is already confirmed/requested
    if donation.status not in ["requested", "being_packed", "ready_for_pickup", "in_transit", "donated"]:
        raise HTTPException(status_code=400, detail="Donation is not yet confirmed")

    status_flow = ["requested", "being_packed", "ready_for_pickup", "in_transit", "donated"]

    try:
        current_index = status_flow.index(donation.status)
        if current_index < len(status_flow) - 1:
            donation.status = status_flow[current_index + 1]
            db.commit()
            db.refresh(donation)
        else:
            return {"message": "Donation already at final status", "status": donation.status}
    except ValueError:
        # fallback if status was tampered
        donation.status = "being_packed"
        db.commit()
        db.refresh(donation)

    return {"id": donation.id, "status": donation.status}

# ------------------ DIRECTLY UPDATE DONATION STATUS ------------------
@router.put("/{donation_id}/status")
def update_donation_status(
    donation_id: int,
    status: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    donation = db.query(models.Donation).filter(
        models.Donation.id == donation_id,
        models.Donation.bakery_id == current_user.id
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found or not owned by your bakery")

    # only allow safe transitions
    allowed_statuses = [
        "available", "requested", "being_packed", "ready_for_pickup", "in_transit", "donated"
    ]
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    donation.status = status
    donation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(donation)

    return {"message": "Donation status updated", "id": donation.id, "status": donation.status}
