from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Body, Header
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
from typing import List, Optional
from app.database import get_db
from sqlalchemy import or_
from app import models, schemas, database, auth
from app.auth import ensure_verified_user
from app.schemas import DonationRequestCreate
from app.models import DonationCardChecking

import os

from app.routes.binventory_routes import check_threshold_and_create_donation
from app.routes.cnotification import haversine
from app.crud import update_user_badges

router = APIRouter()
UPLOAD_DIR = "uploads/feedback"


def update_inventory_status(db: Session, inventory_id: int):
    """Update bakery inventory status based on all related donation requests."""
    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == inventory_id
    ).first()
    if not inventory_item:
        return

    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == inventory_id
    ).all()

    if any(r.status == "accepted" for r in requests):
        inventory_item.status = "donated"
    elif any(r.status == "pending" for r in requests):
        inventory_item.status = "requested"
    else:
        inventory_item.status = "available"

    db.commit()
    db.refresh(inventory_item)


@router.get("/available", response_model=List[schemas.DonationRead])
def get_available_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    today = date.today()
    donations = (
        db.query(models.Donation, models.User)
        .join(models.User, models.User.id == models.Donation.bakery_id)
        .filter(models.Donation.quantity > 0)
        .filter((models.Donation.expiration_date == None) | (models.Donation.expiration_date >= today))
        .all()
    )

    donation_list = []
    for donation, bakery in donations:
        donation_dict = donation.__dict__.copy()
        donation_dict["bakery_name"] = bakery.name
        donation_dict["bakery_profile_picture"] = bakery.profile_picture 
        if donation_dict.get("image"):
            donation_dict["image"] = donation_dict["image"]

        distance_km = None
        if (
            current_user.latitude is not None and current_user.longitude is not None
            and bakery.latitude is not None and bakery.longitude is not None
        ):
            distance_km = round(haversine(bakery.latitude, bakery.longitude, current_user.latitude, current_user.longitude), 1)
        donation_dict["distance_km"] = distance_km

        donation_list.append(schemas.DonationRead(**donation_dict))

    return donation_list


@router.post("/donation/request")
def request_donation(
    payload: DonationRequestCreate,  
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    pending_feedback_normal = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.status == "accepted",
        models.DonationRequest.tracking_status != "complete",
        models.DonationRequest.feedback_submitted.is_(False)
    ).count()

    pending_feedback_direct = db.query(models.DirectDonation).filter(
        models.DirectDonation.charity_id == current_user.id,
        models.DirectDonation.btracking_status != "complete",
        models.DirectDonation.feedback_submitted.is_(False)
    ).count()

    total_not_complete = pending_feedback_normal + pending_feedback_direct

    if total_not_complete >= 3:
        raise HTTPException(
            status_code=400,
            detail=f"You have {total_not_complete} donations not complete. Please complete."
        )
    
    donation = db.query(models.Donation).filter(models.Donation.id == payload.donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.quantity <= 0:
        raise HTTPException(status_code=400, detail="Donation not available")

    # ✅ CRITICAL: Check if ANY request for this bakery_inventory_id has been accepted
    has_accepted = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == donation.bakery_inventory_id,
        models.DonationRequest.status == "accepted"
    ).first()
    
    if has_accepted:
        raise HTTPException(
            status_code=400, 
            detail="This donation has already been accepted by another charity"
        )

    existing_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.donation_id == payload.donation_id
    ).first()

    if existing_request:
        if existing_request.status == "pending":
            raise HTTPException(status_code=400, detail="You already requested this donation")
        elif existing_request.status == "accepted":
            raise HTTPException(status_code=400, detail="Donation already accepted")
        elif existing_request.status == "canceled":
            # Check again before re-requesting
            has_accepted = db.query(models.DonationRequest).filter(
                models.DonationRequest.bakery_inventory_id == donation.bakery_inventory_id,
                models.DonationRequest.status == "accepted"
            ).first()
            
            if has_accepted:
                raise HTTPException(
                    status_code=400,
                    detail="This donation has already been accepted by another charity"
                )
            
            existing_request.status = "pending"
            existing_request.timestamp = datetime.utcnow()
            db.commit()
            db.refresh(existing_request)
            update_inventory_status(db, donation.bakery_inventory_id)
            return {"message": "Donation re-requested", "request_id": existing_request.id}

    bakery = db.query(models.User).filter(models.User.id == payload.bakery_id).first()
    new_request = models.DonationRequest(
        donation_id=payload.donation_id,
        charity_id=current_user.id,
        bakery_id=payload.bakery_id,
        bakery_inventory_id=donation.bakery_inventory_id,
        timestamp=datetime.utcnow(),
        status="pending",
        bakery_name=bakery.name,
        bakery_profile_picture=bakery.profile_picture,
        donation_name=donation.name,
        donation_image=donation.image,
        donation_quantity=donation.quantity,
        donation_expiration=donation.expiration_date
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    update_inventory_status(db, donation.bakery_inventory_id)

    return {"message": "Donation request sent", "request_id": new_request.id}


@router.post("/donation/cancel/{request_id}")
def cancel_donation_request(
    request_id: int,
    payload: dict = Body(...),  # ✅ Accept body payload
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    charity_id = payload.get("charity_id")
    donated_by = payload.get("donated_by")  # ✅ Get name from frontend
    
    query = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id
    )
    if charity_id:
        query = query.filter(models.DonationRequest.charity_id == charity_id)
    else:
        query = query.filter(
            or_(
                models.DonationRequest.charity_id == current_user.id,
                models.DonationRequest.bakery_id == current_user.id
            )
        )
    request_obj = query.first()

    if not request_obj or request_obj.status != "pending":
        raise HTTPException(status_code=404, detail="Pending request not found or you are not authorized")

    # ✅ Store who canceled it
    request_obj.rdonated_by = donated_by or current_user.name or "Unknown"
    request_obj.status = "canceled"
    bakery_inventory_id = request_obj.bakery_inventory_id
    db.commit()
    
    update_inventory_status(db, bakery_inventory_id)
    
    return {
        "message": "Donation request canceled",
        "bakery_inventory_id": bakery_inventory_id,
        "rdonated_by": request_obj.rdonated_by
    }

@router.get("/donation/my_requests", response_model=List[schemas.DonationRequestRead])
def my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.status == "pending"
    ).all()
    return requests


@router.post("/donation/accept/{request_id}")
def accept_donation(
    request_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    charity_id = payload.get("charity_id")
    donated_by = payload.get("donated_by")  # ✅ Get name from frontend
    
    if not charity_id:
        raise HTTPException(status_code=400, detail="charity_id required")
    
    if not donated_by:
        raise HTTPException(status_code=400, detail="donated_by (employee/owner name) required")

    donation_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.bakery_id == current_user.id,
        models.DonationRequest.charity_id == charity_id,
        models.DonationRequest.status == "pending"
    ).first()

    if not donation_request:
        raise HTTPException(status_code=404, detail="Pending donation request not found")

    has_accepted = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == donation_request.bakery_inventory_id,
        models.DonationRequest.status == "accepted",
        models.DonationRequest.id != request_id
    ).first()
    
    if has_accepted:
        raise HTTPException(
            status_code=400,
            detail="This donation has already been accepted by another charity"
        )

    # ✅ Update bakery inventory quantity
    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == donation_request.bakery_inventory_id
    ).first()
    
    if inventory_item:
        # Get the donation to find the quantity being donated
        donation = db.query(models.Donation).filter(
            models.Donation.id == donation_request.donation_id
        ).first()
        
        if donation:
            donated_quantity = donation.quantity
            
            # Reduce inventory quantity by donated amount
            inventory_item.quantity -= donated_quantity
            
            # Ensure quantity doesn't go below 0
            if inventory_item.quantity < 0:
                inventory_item.quantity = 0
            
            # Update donation quantity to 0 since it's all donated
            donation.quantity = 0

    # ✅ Store who accepted it
    donation_request.status = "accepted"
    donation_request.rdonated_by = donated_by or current_user.name or "Unknown"

    new_check = models.DonationCardChecking(
        donor_id=donation_request.bakery_id,
        recipient_id=donation_request.charity_id,
        donation_request_id=donation_request.id,
        status="accepted"
    )
    db.add(new_check)

    # ✅ Auto-cancel other requests
    other_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == donation_request.bakery_inventory_id,
        models.DonationRequest.id != donation_request.id,
        models.DonationRequest.status == "pending"
    ).all()
    canceled_charity_ids = []
    for r in other_requests:
        r.status = "canceled"
        r.rdonated_by = f"Auto-canceled (Accepted by {donation_request.rdonated_by})"
        canceled_charity_ids.append(r.charity_id)

    db.commit()

    update_inventory_status(db, donation_request.bakery_inventory_id)
    check_threshold_and_create_donation(db)

    return {
        "message": "Donation accepted and others canceled",
        "accepted_charity_id": donation_request.charity_id,
        "canceled_charities": canceled_charity_ids,
        "request_id": request_id,
        "donation_name": donation_request.donation_name,
        "bakery_inventory_id": donation_request.bakery_inventory_id,
        "rdonated_by": donation_request.rdonated_by,
        "inventory_quantity_updated": inventory_item.quantity if inventory_item else None
    }

@router.get("/donation/received")
def received_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=403, detail="Not authorized")

    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id
    ).all()

    result = []
    for r in requests:
        if r.status in ["accepted", "pending"]:
            donation_inventory = db.query(models.BakeryInventory).filter(
                models.BakeryInventory.id == r.bakery_inventory_id
            ).first()
            bakery = db.query(models.User).filter(
                models.User.id == donation_inventory.bakery_id
            ).first() if donation_inventory else None

            result.append({
                "id": r.id,
                "donation_id": r.donation_id,
                "status": r.status,
                "tracking_status": r.tracking_status,
                "tracking_completed_at": r.tracking_completed_at,
                "feedback_submitted": r.feedback_submitted,
                "name": r.donation_name,
                "image": r.donation_image,
                "quantity": r.donation_quantity,
                "expiration_date": r.donation_expiration,
                "bakery_name": bakery.name if bakery else "Unknown bakery",
                "bakery_profile_picture": bakery.profile_picture if bakery else None
            })

    return result


@router.post("/donation/received/{request_id}")
def mark_received(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    request_obj = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.charity_id == current_user.id
    ).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Donation request not found")

    if request_obj.tracking_status != "in_transit":
        raise HTTPException(status_code=400, detail="Donation not ready to be received")

    request_obj.tracking_status = "received"
    db.commit()
    db.refresh(request_obj)
    return {"message": "Donation marked as received"}


@router.post("/donation/feedback/{request_id}")
async def submit_feedback(
    request_id: int,
    message: str = Form(...),
    rating: int = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    request_obj = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.charity_id == current_user.id
    ).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Donation request not found")

    feedback = models.Feedback(
        donation_request_id=request_obj.id,
        charity_id=current_user.id,
        bakery_id=request_obj.bakery_id,
        message=message,
        rating=rating,
        product_name=request_obj.donation_name,
        product_quantity=request_obj.donation_quantity,
        product_image=request_obj.donation_image
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    saved_files = []
    if files:
        for file in files:
            filename = f"{feedback.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)

            with open(file_path, "wb") as f:
                f.write(await file.read())

            saved_files.append(f"feedback/{filename}")

        feedback.media_file = ",".join(saved_files)
        db.commit()
        db.refresh(feedback)

    request_obj.feedback_submitted = True
    request_obj.tracking_status = "complete"
    if not request_obj.tracking_completed_at: 
        request_obj.tracking_completed_at = date.today()
    db.commit()
    db.refresh(request_obj)

    update_user_badges(db, request_obj.bakery_id)

    return {"message": "Feedback submitted and donation marked complete"}


@router.get("/direct/mine", response_model=List[schemas.DirectDonationResponse])
def get_my_direct_donations(
    db: Session = Depends(get_db),
    current_user=Depends(ensure_verified_user),
):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=403, detail="Not authorized")

    donations = db.query(models.DirectDonation).filter(
        models.DirectDonation.charity_id == current_user.id
    ).all()

    result = []
    for d in donations:
        bakery_inventory = db.query(models.BakeryInventory).filter(
            models.BakeryInventory.id == d.bakery_inventory_id
        ).first()
        bakery = db.query(models.User).filter(
            models.User.id == bakery_inventory.bakery_id
        ).first() if bakery_inventory else None

        result.append({
            "id": d.id,
            "donation_id": d.id,
            "name": d.name,
            "quantity": d.quantity,
            "threshold": d.threshold,
            "creation_date": d.creation_date.isoformat() if d.creation_date else None,
            "expiration_date": d.expiration_date.isoformat() if d.expiration_date else None,
            "description": d.description,
            "bakery_inventory_id": d.bakery_inventory_id,
            "charity_id": d.charity_id,
            "image": d.image,
            "btracking_status": d.btracking_status,
            "btracking_completed_at": d.btracking_completed_at.isoformat() if d.btracking_completed_at else None,
            "feedback_submitted": d.feedback_submitted or False,
            "bakery_name": bakery.name if bakery else "Unknown bakery",
            "bakery_profile_picture": bakery.profile_picture if bakery else None
        })

    return result


@router.post("/direct/received/{direct_donation_id}")
def mark_direct_received(
    direct_donation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user)
):
    donation = db.query(models.DirectDonation).filter(
        models.DirectDonation.id == direct_donation_id,
        models.DirectDonation.charity_id == current_user.id
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Direct donation not found")

    if donation.btracking_status not in ["in_transit", "preparing"]:
        raise HTTPException(status_code=400, detail="Donation not ready to be received")

    donation.btracking_status = "received"
    db.commit()
    db.refresh(donation)

    return {"message": "Direct donation marked as received"}


@router.post("/direct/feedback/{direct_donation_id}")
async def submit_direct_feedback(
    direct_donation_id: int,
    message: str = Form(...),
    rating: int = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user)
):
    donation = db.query(models.DirectDonation).filter(
        models.DirectDonation.id == direct_donation_id,
        models.DirectDonation.charity_id == current_user.id
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Direct donation not found")

    if not donation.bakery_inventory:
        raise HTTPException(status_code=400, detail="Direct donation is missing bakery inventory")

    feedback = models.Feedback(
        direct_donation_id=donation.id,
        charity_id=current_user.id,
        bakery_id=donation.bakery_inventory.bakery_id,
        message=message,
        rating=rating,
        product_name=donation.name,
        product_quantity=donation.quantity,
        product_image=donation.image
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    saved_files = []
    if files:
        for file in files:
            filename = f"{feedback.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)

            with open(file_path, "wb") as f:
                f.write(await file.read())

            saved_files.append(f"feedback/{filename}")

        feedback.media_file = ",".join(saved_files)
        db.commit()
        db.refresh(feedback)

    donation.feedback_submitted = True
    donation.btracking_status = "complete"
    if not donation.btracking_completed_at: 
        donation.btracking_completed_at = date.today()
    db.commit()
    db.refresh(donation)

    update_user_badges(db, donation.bakery_inventory.bakery_id)

    return {"message": "Feedback submitted successfully"}


@router.get("/donation/accepted")
def get_accepted_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    query = db.query(models.DonationRequest).filter(
        models.DonationRequest.status.in_(["accepted"])
    )

    if current_user.role.lower() == "charity":
        query = query.filter(models.DonationRequest.charity_id == current_user.id)
    elif current_user.role.lower() == "bakery":
        query = query.filter(models.DonationRequest.bakery_id == current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Invalid user role")

    requests = query.all()

    return [
        {
            "id": r.id,
            "donation_id": r.donation_id,
            "status": r.status,
            "bakery_inventory_id": r.bakery_inventory_id,
            "charity_id": r.charity_id,
            "donation_name": r.donation_name,
            "donation_image": r.donation_image,
        }
        for r in requests 
    ]


@router.get("/donation/inventory_status/{bakery_inventory_id}")
def get_inventory_status(
    bakery_inventory_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    """
    Get the status of all donation requests for a specific bakery inventory item.
    
    Returns:
        - has_accepted: True if ANY request has been accepted for this inventory
        - has_pending: True if there are pending requests
        - all_canceled: True if ALL requests are canceled
        - total_requests: Total number of requests for this inventory
    """
    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == bakery_inventory_id
    ).all()
    
    # Check if ANY request has been ACCEPTED for this inventory
    # If so, hide all buttons for everyone
    has_accepted = any(r.status == "accepted" for r in requests)
    
    # Check if there are pending requests
    has_pending = any(r.status == "pending" for r in requests)
    
    # Check if ALL requests are canceled
    all_canceled = all(r.status == "canceled" for r in requests) if requests else False
    
    return {
        "bakery_inventory_id": bakery_inventory_id,
        "has_accepted": has_accepted,      # ← KEY FLAG: Hide buttons if true
        "has_pending": has_pending,
        "all_canceled": all_canceled,
        "total_requests": len(requests),
        "requests": [
            {
                "id": r.id,
                "status": r.status,
                "charity_id": r.charity_id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None
            }
            for r in requests
        ]
    }
