"""
Helper utilities for logging system events and alerts.
This module provides functions to create system event logs for security incidents,
alerts, and system status changes.
"""

from sqlalchemy.orm import Session
from app.models import SystemEvent
from datetime import datetime
import json
from typing import Optional, Dict, Any


def log_system_event(
    db: Session,
    event_type: str,
    description: str,
    severity: str = "info",
    user_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> SystemEvent:
    """
    Log a system event to the database.
    
    Args:
        db: Database session
        event_type: Type of event (e.g., "failed_login", "unauthorized_access", "sos_alert")
        description: Human-readable description of the event
        severity: Event severity level ("info", "warning", "critical")
        user_id: ID of the user associated with the event (optional)
        metadata: Additional data to store as JSON (optional)
    
    Returns:
        The created SystemEvent object
    
    Example:
        ```python
        log_system_event(
            db=db,
            event_type="failed_login",
            description=f"Failed login attempt for email: {email}",
            severity="warning",
            metadata={"ip_address": "192.168.1.1", "attempted_email": email}
        )
        ```
    """
    
    # Validate severity
    valid_severities = ["info", "warning", "critical"]
    if severity not in valid_severities:
        severity = "info"
    
    # Validate event type
    valid_event_types = [
        "failed_login",
        "unauthorized_access",
        "sos_alert",
        "geofence_breach",
        "uptime",
        "downtime"
    ]
    
    if event_type not in valid_event_types:
        # Allow custom event types but log a warning
        print(f"Warning: Using custom event type '{event_type}' not in predefined list")
    
    # Create event
    event = SystemEvent(
        event_type=event_type,
        description=description,
        severity=severity,
        user_id=user_id,
        timestamp=datetime.utcnow(),
        event_metadata=json.dumps(metadata) if metadata else None
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event


def log_failed_login(db: Session, email: str, ip_address: Optional[str] = None):
    """Log a failed login attempt."""
    metadata = {"attempted_email": email}
    if ip_address:
        metadata["ip_address"] = ip_address
    
    return log_system_event(
        db=db,
        event_type="failed_login",
        description=f"Failed login attempt for email: {email}",
        severity="warning",
        metadata=metadata
    )


def log_unauthorized_access(
    db: Session,
    user_id: int,
    resource: str,
    ip_address: Optional[str] = None
):
    """Log an unauthorized access attempt."""
    metadata = {"resource": resource}
    if ip_address:
        metadata["ip_address"] = ip_address
    
    return log_system_event(
        db=db,
        event_type="unauthorized_access",
        description=f"Unauthorized access attempt to: {resource}",
        severity="critical",
        user_id=user_id,
        metadata=metadata
    )


def log_sos_alert(
    db: Session,
    user_id: int,
    location: Optional[Dict[str, float]] = None,
    message: Optional[str] = None
):
    """Log an SOS or emergency alert."""
    metadata = {}
    if location:
        metadata["latitude"] = location.get("latitude")
        metadata["longitude"] = location.get("longitude")
    if message:
        metadata["message"] = message
    
    return log_system_event(
        db=db,
        event_type="sos_alert",
        description=f"SOS alert triggered by user ID {user_id}",
        severity="critical",
        user_id=user_id,
        metadata=metadata if metadata else None
    )


def log_geofence_breach(
    db: Session,
    user_id: int,
    charity_id: int,
    distance_km: float
):
    """Log a geofence breach alert."""
    return log_system_event(
        db=db,
        event_type="geofence_breach",
        description=f"Geofence breach detected: User {user_id} outside charity {charity_id}'s range",
        severity="warning",
        user_id=user_id,
        metadata={
            "charity_id": charity_id,
            "distance_km": distance_km
        }
    )


def log_system_uptime(db: Session, uptime_seconds: int):
    """Log system uptime status."""
    return log_system_event(
        db=db,
        event_type="uptime",
        description=f"System uptime: {uptime_seconds} seconds",
        severity="info",
        metadata={"uptime_seconds": uptime_seconds}
    )


def log_system_downtime(db: Session, duration_seconds: int, reason: Optional[str] = None):
    """Log system downtime event."""
    metadata = {"duration_seconds": duration_seconds}
    if reason:
        metadata["reason"] = reason
    
    description = f"System downtime detected: {duration_seconds} seconds"
    if reason:
        description += f" - Reason: {reason}"
    
    return log_system_event(
        db=db,
        event_type="downtime",
        description=description,
        severity="critical",
        metadata=metadata
    )
