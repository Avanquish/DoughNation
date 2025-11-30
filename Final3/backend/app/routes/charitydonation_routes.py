from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Body, Request, Header
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
from typing import List, Optional
from app.database import get_db
from app.timezone_utils import now_ph
from sqlalchemy import or_
from app import models, schemas, database, auth
from app.auth import ensure_verified_user, get_current_user
from app.schemas import DonationRequestCreate
from app.models import DonationCardChecking
from app import models, database

import os,json

from app.routes.binventory_routes import check_threshold_and_create_donation
from app.routes.cnotification import haversine
from app.crud import update_user_badges

router = APIRouter()
UPLOAD_DIR = "uploads/feedback"


def update_inventory_status(db: Session, inventory_id: int):
    """Update bakery inventory status based on quantity and requests."""
    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == inventory_id
    ).first()
    if not inventory_item:
        return

    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == inventory_id
    ).all()

    donation = db.query(models.Donation).filter(
        models.Donation.bakery_inventory_id == inventory_id
    ).first()

    # ✅ Priority 1: If inventory quantity is 0, status = "donated"
    if inventory_item.quantity <= 0:
        inventory_item.status = "donated"
        # Remove donation entry if exists
        if donation:
            db.delete(donation)
            
    # ✅ Priority 2: If there are ANY pending requests, status = "requested"
    elif any(r.status == "pending" for r in requests):
        inventory_item.status = "requested"
        
    # ✅ Priority 3: If quantity > 0 and no pending requests, status = "available"
    elif inventory_item.quantity > 0:
        inventory_item.status = "available"
        # Recreate donation if it was deleted but quantity returned
        if not donation:
            check_threshold_and_create_donation(db)
    else:
        inventory_item.status = "unavailable"

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

    # Validate requested quantity
    if payload.requested_quantity <= 0:
        raise HTTPException(status_code=400, detail="Requested quantity must be at least 1")
    
    if payload.requested_quantity > donation.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Requested quantity ({payload.requested_quantity}) exceeds available quantity ({donation.quantity})"
        )

    # KEY FIX: Check for existing requests by bakery_inventory_id (not donation_id)
    # This ensures we check the actual inventory item, not just the donation record
    existing_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.bakery_inventory_id == donation.bakery_inventory_id
    ).order_by(models.DonationRequest.id.desc()).all()  # Order by ID (database sequence), not timestamp

    # Check if there's already a PENDING request
    pending_request = next((r for r in existing_requests if r.status == "pending"), None)
    
    if pending_request:
        # Check current inventory to see if this pending request is still valid
        current_inventory = db.query(models.BakeryInventory).filter(
            models.BakeryInventory.id == donation.bakery_inventory_id
        ).first()
        
        if current_inventory and pending_request.donation_quantity > current_inventory.quantity:
            # Auto-cancel the outdated pending request
            pending_request.status = "canceled"
            pending_request.rdonated_by = f"Auto-canceled (Requested {pending_request.donation_quantity}, only {current_inventory.quantity} available)"
            db.commit()
            # Continue to create new request
        else:
            raise HTTPException(status_code=400, detail="You already have a pending request for this item. Please cancel it first to request a different quantity.")

    bakery = db.query(models.User).filter(models.User.id == payload.bakery_id).first()
    
    # Always create a NEW request (never reactivate cancelled ones)
    new_request = models.DonationRequest(
        donation_id=payload.donation_id,
        charity_id=current_user.id,
        bakery_id=payload.bakery_id,
        bakery_inventory_id=donation.bakery_inventory_id,
        timestamp=now_ph(),  #  Server time only, never used for logic
        status="pending",
        bakery_name=bakery.name,
        bakery_profile_picture=bakery.profile_picture,
        donation_name=donation.name,
        donation_image=donation.image,
        donation_quantity=payload.requested_quantity,
        donation_expiration=donation.expiration_date
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    update_inventory_status(db, donation.bakery_inventory_id)

    return {"message": "Donation request sent", "request_id": new_request.id}

@router.post("/donation/cancel/{request_id}")
async def cancel_donation_request(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    content_type = (request.headers.get("content-type") or "").lower()
    if content_type.startswith("application/json"):
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)
    
    charity_id = data.get("charity_id")
    donated_by = data.get("donated_by", "Unknown")
    
    # Find the donation request
    donation_req = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id
    ).first()
    
    if not donation_req:
        raise HTTPException(status_code=404, detail="Donation request not found")
    
    # ✅ Store the bakery_inventory_id BEFORE updating
    bakery_inventory_id = donation_req.bakery_inventory_id
    
    # Update donation request status
    donation_req.status = "canceled"
    
    # Determine who cancelled (bakery employee or charity)
    cancelled_by = "bakery" if current_user.role.lower() in ["bakery", "employee"] else "charity"
    cancel_message = "Donation request cancelled by bakery" if cancelled_by == "bakery" else "Donation request cancelled"

    # Find and update ALL message cards related to this donation
    messages_to_update = db.query(models.Message).filter(
        models.Message.is_card == True
    ).all()

    for msg in messages_to_update:
        try:
            content = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            if (content.get("type") == "donation_card" and 
                content.get("donation", {}).get("id") == request_id):
                
                # Update the message content to show cancelled with proper attribution
                donation_data = content.get("donation", {})
                msg.content = json.dumps({
                    "type": "donation_request_cancelled",
                    "donation": donation_data,
                    "message": cancel_message,
                    "cancelledBy": cancelled_by
                })
        except Exception as e:
            print(f"Error updating message {msg.id}: {e}")
            continue
    
    db.commit()

    #Update inventory status after cancelling
    update_inventory_status(db, bakery_inventory_id)
    
    return {
        "status": "ok",
        "request_id": request_id,
        "message": "Donation request cancelled"
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
    donated_by = payload.get("donated_by")
    
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

    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == donation_request.bakery_inventory_id
    ).first()

    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    requested_quantity = donation_request.donation_quantity

    if requested_quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid requested quantity")

    if inventory_item.quantity < requested_quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient inventory. Available: {inventory_item.quantity}, Requested: {requested_quantity}"
        )

    # Store the remaining quantity BEFORE reducing
    quantity_before = inventory_item.quantity
    
    # Reduce inventory quantity
    inventory_item.quantity -= requested_quantity

    if inventory_item.quantity < 0:
        inventory_item.quantity = 0

    # Store the remaining quantity AFTER reducing
    quantity_after = inventory_item.quantity

    # Update Donation table
    donation = db.query(models.Donation).filter(
        models.Donation.bakery_inventory_id == donation_request.bakery_inventory_id
    ).first()

    if donation:
        donation.quantity -= requested_quantity
        
        if donation.quantity <= 0:
            donation.quantity = 0

    # Mark THIS specific request as accepted
    donation_request.status = "accepted"
    donation_request.rdonated_by = donated_by or current_user.name or "Unknown"

    # Create checking record
    new_check = models.DonationCardChecking(
        donor_id=donation_request.bakery_id,
        recipient_id=donation_request.charity_id,
        donation_request_id=donation_request.id,
        status="accepted"
    )
    db.add(new_check)

    # Cancel requests that exceed remaining quantity
    canceled_charity_ids = []
    canceled_requests = []

    # Get all other pending requests for this inventory
    other_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == donation_request.bakery_inventory_id,
        models.DonationRequest.id != donation_request.id,
        models.DonationRequest.status == "pending"
    ).all()

    for r in other_requests:
        # Cancel if requested quantity exceeds remaining inventory
        if r.donation_quantity > quantity_after:
            r.status = "canceled"
            r.rdonated_by = f"Auto-canceled (Requested {r.donation_quantity}, only {quantity_after} remaining)"
            canceled_charity_ids.append(r.charity_id)
            canceled_requests.append({
                "request_id": r.id,
                "charity_id": r.charity_id,
                "requested_qty": r.donation_quantity,
                "remaining_qty": quantity_after
            })
    
    # Commit the cancellations first
    db.commit()
    db.refresh(inventory_item)
    db.refresh(donation_request)

    # Send simple italic messages for cancelled requests
    for cancel_info in canceled_requests:
        try:
            # Get the cancelled request details
            cancelled_req = db.query(models.DonationRequest).filter(
                models.DonationRequest.id == cancel_info["request_id"]
            ).first()
            
            if cancelled_req:
                # Create a card message with cancellation info
                cancellation_content = json.dumps({
                    "type": "donation_request_cancelled",
                    "donation": {
                        "id": cancel_info["request_id"],
                        "name": cancelled_req.donation_name,
                        "image": cancelled_req.donation_image,
                        "quantity": cancel_info["requested_qty"],
                        "expiration_date": cancelled_req.donation_expiration.isoformat() if cancelled_req.donation_expiration else None
                    },
                    "message": f"Your donation request has been cancelled. You requested {cancel_info['requested_qty']} units but only {cancel_info['remaining_qty']} remaining. You can request again.",
                    "reason": "insufficient_quantity",
                    "cancelledBy": "system"
                })
                
                cancellation_message = models.Message(
                    sender_id=current_user.id,
                    receiver_id=cancel_info["charity_id"],
                    content=cancellation_content,
                    timestamp=now_ph(),
                    is_read=False,
                    is_card=True
                )
                db.add(cancellation_message) 
        except Exception as e:
            print(f"Error sending cancellation message for request {cancel_info['request_id']}: {e}")
            continue

    # Commit message updates
    db.commit()

    # Update inventory status
    update_inventory_status(db, donation_request.bakery_inventory_id)
    
    # Trigger threshold check
    check_threshold_and_create_donation(db)

    return {
        "message": "Donation accepted successfully",
        "accepted_charity_id": donation_request.charity_id,
        "canceled_charities": canceled_charity_ids,
        "canceled_requests_details": canceled_requests,
        "request_id": request_id,
        "donation_name": donation_request.donation_name,
        "bakery_inventory_id": donation_request.bakery_inventory_id,
        "rdonated_by": donation_request.rdonated_by,
        "requested_quantity": requested_quantity,
        "quantity_before": quantity_before,
        "quantity_after": quantity_after,
        "remaining_inventory": inventory_item.quantity,
        "remaining_donation": donation.quantity if donation else 0,
        "is_fully_donated": quantity_after <= 0
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
            filename = f"{feedback.id}_{now_ph().strftime('%Y%m%d%H%M%S')}_{file.filename}"
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
            filename = f"{feedback.id}_{now_ph().strftime('%Y%m%d%H%M%S')}_{file.filename}"
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
    Get detailed status for each donation request.
    Returns individual request statuses so frontend can hide buttons per request.
    TIME-INDEPENDENT: Uses only database status, not timestamps.
    """
    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == bakery_inventory_id
    ).first()
    
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Get all requests, ordered by database ID (insertion order)
    all_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == bakery_inventory_id
    ).order_by(models.DonationRequest.id.desc()).all()  # Order by ID, not timestamp
    
    # Group by charity_id and keep ONLY the most recent request per charity
    # "Most recent" = highest ID number (latest insertion into database)
    charity_latest_request = {}
    for r in all_requests:
        cid = r.charity_id
        if cid not in charity_latest_request:
            # First time seeing this charity = this is their latest request (since we ordered by ID desc)
            charity_latest_request[cid] = r
    
    # Build status map - ONLY include the latest request per charity
    request_status_map = {}
    for r in charity_latest_request.values():
        # Backend decides button visibility based on DATABASE STATE ONLY
        # NO timestamp comparisons - purely based on status and quantity
        can_accept = (
            r.status == "pending" and 
            inventory_item.quantity > 0 and 
            r.donation_quantity <= inventory_item.quantity
        )
        
        can_cancel = r.status == "pending"
        
        request_status_map[r.id] = {
            "status": r.status,
            "charity_id": r.charity_id,
            "requested_quantity": r.donation_quantity,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,  # Only for display, not logic
            "accepted_by": r.rdonated_by if r.status == "accepted" else None,
            # Backend controls UI
            "show_accept_button": can_accept,
            "show_cancel_button": can_cancel,
            "can_be_accepted": can_accept,
            "is_latest": True  # Flag indicating this is the charity's latest request
        }
    
    # Also include older requests but mark them as non-latest (for reference only)
    for r in all_requests:
        if r.id not in request_status_map:  # Not the latest for this charity
            request_status_map[r.id] = {
                "status": r.status,
                "charity_id": r.charity_id,
                "requested_quantity": r.donation_quantity,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "accepted_by": r.rdonated_by if r.status == "accepted" else None,
                # Old requests never show buttons
                "show_accept_button": False,
                "show_cancel_button": False,
                "can_be_accepted": False,
                "is_latest": False  # Not the latest request
            }
    
    has_pending = any(r.status == "pending" for r in charity_latest_request.values())
    all_canceled = all(r.status == "canceled" for r in all_requests) if all_requests else False
    
    return {
        "bakery_inventory_id": bakery_inventory_id,
        "remaining_quantity": inventory_item.quantity,  # Current state from DB
        "has_pending": has_pending,
        "all_canceled": all_canceled,
        "total_requests": len(all_requests),
        "request_statuses": request_status_map,  # Only latest requests have buttons
        "current_time": now_ph().isoformat()  # Optional: for display only
    }
