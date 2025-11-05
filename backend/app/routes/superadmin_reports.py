from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.database import get_db
from app.models import SystemEvent, User
from app.auth import get_current_user
from datetime import datetime, timedelta
from typing import Optional, List
import json

router = APIRouter(prefix="/superadmin", tags=["Super Admin Reports"])

# Dependency to verify Super Admin access
def get_current_superadmin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify that the current user is a Super Admin."""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Access denied. Super Admin only.")
    
    # Additional check: You can add a super_admin flag to User model if needed
    # For now, we'll use Admin role as Super Admin
    return current_user

# ========== ENDPOINT 1: Get System Events with Filtering ==========
@router.get("/events")
def get_system_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity (info, warning, critical)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of events to return"),
    offset: int = Query(0, ge=0, description="Number of events to skip"),
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Retrieve system events with optional filtering.
    Returns paginated list of events with user details.
    """
    
    # Build query
    query = db.query(SystemEvent)
    
    # Apply filters
    if event_type:
        query = query.filter(SystemEvent.event_type == event_type)
    
    if severity:
        query = query.filter(SystemEvent.severity == severity)
    
    if user_id:
        query = query.filter(SystemEvent.user_id == user_id)
    
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(SystemEvent.timestamp >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            # Add 1 day to include events on end_date
            end = end + timedelta(days=1)
            query = query.filter(SystemEvent.timestamp < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    # Get total count before pagination
    total_count = query.count()
    
    # Order by timestamp descending (most recent first)
    query = query.order_by(SystemEvent.timestamp.desc())
    
    # Apply pagination
    events = query.offset(offset).limit(limit).all()
    
    # Format response with user details
    formatted_events = []
    for event in events:
        event_data = {
            "id": event.id,
            "event_type": event.event_type,
            "description": event.description,
            "severity": event.severity,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None,
            "metadata": json.loads(event.event_metadata) if event.event_metadata else None,
            "user": None
        }
        
        if event.user_id and event.user:
            event_data["user"] = {
                "id": event.user.id,
                "name": event.user.name,
                "email": event.user.email,
                "role": event.user.role
            }
        
        formatted_events.append(event_data)
    
    return {
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "events": formatted_events
    }

# ========== ENDPOINT 2: Get Event Statistics Summary ==========
@router.get("/events/summary")
def get_event_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Get aggregated statistics of system events.
    Returns counts by event type and severity.
    """
    
    # Build base query
    query = db.query(SystemEvent)
    
    # Apply date filters
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(SystemEvent.timestamp >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end + timedelta(days=1)
            query = query.filter(SystemEvent.timestamp < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    # Count by event type
    event_type_counts = db.query(
        SystemEvent.event_type,
        func.count(SystemEvent.id).label("count")
    ).filter(
        and_(
            SystemEvent.timestamp >= datetime.strptime(start_date, "%Y-%m-%d") if start_date else True,
            SystemEvent.timestamp < (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)) if end_date else True
        )
    ).group_by(SystemEvent.event_type).all()
    
    # Count by severity
    severity_counts = db.query(
        SystemEvent.severity,
        func.count(SystemEvent.id).label("count")
    ).filter(
        and_(
            SystemEvent.timestamp >= datetime.strptime(start_date, "%Y-%m-%d") if start_date else True,
            SystemEvent.timestamp < (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)) if end_date else True
        )
    ).group_by(SystemEvent.severity).all()
    
    # Total events
    total_events = query.count()
    
    # Recent critical events
    critical_events = db.query(SystemEvent).filter(
        and_(
            SystemEvent.severity == "critical",
            SystemEvent.timestamp >= datetime.strptime(start_date, "%Y-%m-%d") if start_date else True,
            SystemEvent.timestamp < (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)) if end_date else True
        )
    ).order_by(SystemEvent.timestamp.desc()).limit(10).all()
    
    return {
        "total_events": total_events,
        "event_types": {et: count for et, count in event_type_counts},
        "severities": {sev: count for sev, count in severity_counts},
        "recent_critical_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "description": e.description,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "user_id": e.user_id
            } for e in critical_events
        ]
    }

# ========== ENDPOINT 3: Get Specific Event Details ==========
@router.get("/events/{event_id}")
def get_event_details(
    event_id: int,
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific system event.
    """
    
    event = db.query(SystemEvent).filter(SystemEvent.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = {
        "id": event.id,
        "event_type": event.event_type,
        "description": event.description,
        "severity": event.severity,
        "timestamp": event.timestamp.isoformat() if event.timestamp else None,
        "metadata": json.loads(event.event_metadata) if event.event_metadata else None,
        "user": None
    }
    
    if event.user_id and event.user:
        event_data["user"] = {
            "id": event.user.id,
            "name": event.user.name,
            "email": event.user.email,
            "role": event.user.role,
            "contact_number": event.user.contact_number,
            "address": event.user.address
        }
    
    return event_data

# ========== ENDPOINT 4: Export Events Report ==========
@router.get("/events/export/data")
def export_events(
    event_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Export filtered events data for report generation.
    Returns all matching events without pagination.
    """
    
    # Build query
    query = db.query(SystemEvent)
    
    # Apply filters (same as get_system_events)
    if event_type:
        query = query.filter(SystemEvent.event_type == event_type)
    
    if severity:
        query = query.filter(SystemEvent.severity == severity)
    
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(SystemEvent.timestamp >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end + timedelta(days=1)
            query = query.filter(SystemEvent.timestamp < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    # Order by timestamp
    events = query.order_by(SystemEvent.timestamp.desc()).all()
    
    # Format for export
    export_data = []
    for event in events:
        export_data.append({
            "event_id": event.id,
            "event_type": event.event_type,
            "description": event.description,
            "severity": event.severity,
            "timestamp": event.timestamp.strftime("%Y-%m-%d %H:%M:%S") if event.timestamp else "",
            "user_id": event.user_id,
            "user_name": event.user.name if event.user else "N/A",
            "user_email": event.user.email if event.user else "N/A",
            "user_role": event.user.role if event.user else "N/A",
            "metadata": event.event_metadata
        })
    
    return {
        "total_records": len(export_data),
        "export_timestamp": datetime.utcnow().isoformat(),
        "filters_applied": {
            "event_type": event_type,
            "severity": severity,
            "start_date": start_date,
            "end_date": end_date
        },
        "events": export_data
    }

# ========== ENDPOINT 5: Get Available Event Types ==========
@router.get("/events/types/list")
def get_event_types(
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Get list of all event types in the system.
    """
    
    event_types = db.query(SystemEvent.event_type).distinct().all()
    
    return {
        "event_types": [et[0] for et in event_types],
        "predefined_types": [
            "failed_login",
            "unauthorized_access",
            "sos_alert",
            "geofence_breach",
            "uptime",
            "downtime"
        ]
    }