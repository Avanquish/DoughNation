"""
Super Admin Routes
==================
Comprehensive governance and management endpoints for Super Admin.

Features:
1. User Account Control (Suspend, Ban, Deactivate, Reactivate)
2. Audit Log Viewer
3. Notification Management
4. Emergency Override Actions
5. Advanced Analytics
6. User Profile Editing
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, case
from typing import List, Optional
from datetime import datetime, timedelta, date
from pydantic import BaseModel
import app.models as models
import app.admin_models as admin_models
from app.database import get_db
from app.auth import get_current_user, pwd_context
from app.email_utils import send_email
import json
from app import database, auth
from app.timezone_utils import now_ph, today_ph, get_day_start_ph, get_day_end_ph

router = APIRouter(prefix="/admin", tags=["Super Admin"]) 

# Admin-only check
def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user


# ==================== PYDANTIC SCHEMAS ====================

class UserStatusUpdate(BaseModel):
    user_id: int
    new_status: str  # Active, Suspended, Banned, Deactivated
    reason: str
    duration_days: Optional[int] = None  # For temporary suspensions
    violation_type: Optional[str] = None  # For bans


class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str
    target_all: bool = False
    target_role: Optional[str] = None  # "Bakery" or "Charity"
    target_user_id: Optional[int] = None
    send_email: bool = False
    priority: str = "normal"
    expires_at: Optional[datetime] = None


class EmergencyPasswordReset(BaseModel):
    user_id: int
    reason: str
    new_password: str
    ticket_number: Optional[str] = None


class OwnershipTransferCreate(BaseModel):
    bakery_id: int
    to_employee_id: int
    reason: str
    transfer_type: str  # emergency, planned, temporary, permanent
    is_temporary: bool = False
    duration_days: Optional[int] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    about: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ==================== HELPER FUNCTIONS ====================

def log_audit_event(
    db: Session,
    event_type: str,
    description: str,
    actor_id: Optional[int] = None,
    actor_type: str = "Admin",
    target_id: Optional[int] = None,
    target_type: Optional[str] = None,
    event_data: Optional[dict] = None,
    severity: str = "info",
    success: bool = True,
    ip_address: Optional[str] = None
):
    """Helper function to create audit log entries in system_events table"""
    from sqlalchemy import text
    
    # Merge additional info into event_data
    full_event_data = event_data or {}
    if target_id:
        full_event_data["target_id"] = target_id
    if target_type:
        full_event_data["target_type"] = target_type
    if actor_type:
        full_event_data["actor_type"] = actor_type
    if ip_address:
        full_event_data["ip_address"] = ip_address
    if not success:
        full_event_data["success"] = False
    
    # Insert into system_events table
    insert_query = text("""
        INSERT INTO system_events (event_type, description, user_id, timestamp, severity, event_metadata)
        VALUES (:event_type, :description, :user_id, :timestamp, :severity, :event_metadata)
    """)
    
    db.execute(insert_query, {
        "event_type": event_type,
        "description": description,
        "user_id": actor_id,
        "timestamp": now_ph(),
        "severity": severity,
        "event_metadata": json.dumps(full_event_data) if full_event_data else None
    })
    db.commit()
    
    return True


def require_super_admin(current_user: models.User):
    """Ensure the current user is a Super Admin"""
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user


# ==================== 1. USER ACCOUNT CONTROL ====================

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """
    Update user account status (Suspend, Ban, Deactivate, Reactivate).
    Super Admin only.
    """
    require_super_admin(current_admin)
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from modifying other admins
    if user.role.lower() == "admin":
        raise HTTPException(status_code=403, detail="Cannot modify admin accounts")
    
    old_status = user.status
    new_status = status_update.new_status
    
    # Validate status
    valid_statuses = ["Active", "Suspended", "Banned", "Deactivated", "Rejected"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Update user status
    user.status = new_status
    user.status_reason = status_update.reason
    user.status_changed_at = now_ph()
    user.status_changed_by = current_admin.id
    
    # Handle specific status types
    if new_status == "Suspended":
        if status_update.duration_days:
            user.suspended_until = now_ph() + timedelta(days=status_update.duration_days)
        user.verified = False  # Disable access
        
    elif new_status == "Banned":
        user.banned_at = now_ph()
        user.verified = False
        
    elif new_status == "Deactivated":
        user.deactivated_at = now_ph()
        user.verified = False
        
    elif new_status == "Active":
        # Reactivate user
        user.verified = True
        user.suspended_until = None
        user.banned_at = None
        user.deactivated_at = None
    
    db.commit()
    db.refresh(user)
    
    # Record status change in history
    status_history = admin_models.UserStatusHistory(
        user_id=user_id,
        old_status=old_status,
        new_status=new_status,
        reason=status_update.reason,
        changed_by_admin_id=current_admin.id,
        duration_days=status_update.duration_days,
        expires_at=user.suspended_until,
        violation_type=status_update.violation_type
    )
    db.add(status_history)
    db.commit()
    
    # Log audit event
    log_audit_event(
        db=db,
        event_type=f"user_{new_status.lower()}",
        description=f"User {user.name} status changed from {old_status} to {new_status}: {status_update.reason}",
        actor_id=current_admin.id,
        target_id=user_id,
        target_type="User",
        event_data={
            "old_status": old_status,
            "new_status": new_status,
            "reason": status_update.reason,
            "duration_days": status_update.duration_days
        },
        severity="warning" if new_status in ["Suspended", "Banned"] else "info"
    )
    
    return {
        "message": f"User status updated to {new_status}",
        "user_id": user_id,
        "old_status": old_status,
        "new_status": new_status,
        "expires_at": user.suspended_until.isoformat() if user.suspended_until else None
    }


@router.get("/users/by-status/{status}")
def get_users_by_status(
    status: str,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all users with a specific status"""
    require_super_admin(current_admin)
    
    users = db.query(models.User).filter(
        models.User.status == status,
        models.User.role != "Admin"
    ).offset(skip).limit(limit).all()
    
    return {
        "status": status,
        "count": len(users),
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "status": u.status,
                "status_reason": u.status_reason,
                "status_changed_at": u.status_changed_at,
                "suspended_until": u.suspended_until,
                "banned_at": u.banned_at
            }
            for u in users
        ]
    }


# ==================== 2. AUDIT LOG VIEWER ====================

@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user), 
    event_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    target_id: Optional[int] = None,
    severity: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Comprehensive audit log viewer with filters.
    Super Admin only.
    Queries from system_events table.
    """
    require_super_admin(current_admin)
    
    # Query directly from system_events table using raw SQL or the correct model
    from sqlalchemy import text
    
    # Build the base query
    base_query = "SELECT * FROM system_events WHERE 1=1"
    count_query = "SELECT COUNT(*) FROM system_events WHERE 1=1"
    params = {}
    
    # Apply filters
    if event_type:
        base_query += " AND event_type = :event_type"
        count_query += " AND event_type = :event_type"
        params["event_type"] = event_type
    
    if actor_id:
        base_query += " AND user_id = :actor_id"
        count_query += " AND user_id = :actor_id"
        params["actor_id"] = actor_id
    
    if severity:
        base_query += " AND severity = :severity"
        count_query += " AND severity = :severity"
        params["severity"] = severity
    
    if start_date:
        base_query += " AND timestamp >= :start_date"
        count_query += " AND timestamp >= :start_date"
        params["start_date"] = start_date
    
    if end_date:
        base_query += " AND timestamp <= :end_date"
        count_query += " AND timestamp <= :end_date"
        params["end_date"] = end_date
    
    # Get total count
    total_result = db.execute(text(count_query), params).scalar()
    total_count = total_result or 0
    
    # Add ordering and pagination
    base_query += " ORDER BY timestamp DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    # Execute query
    result = db.execute(text(base_query), params)
    logs = result.fetchall()
    
    # Get column names for mapping
    column_names = result.keys()
    
    # Helper function to get user name by ID
    def get_user_name(user_id):
        if not user_id:
            return "System"
        user = db.query(models.User).filter(models.User.id == user_id).first()
        return user.name if user else "Unknown"
    
    # Format response to match what frontend expects
    formatted_logs = []
    for log in logs:
        # Convert row to dict
        log_dict = dict(zip(column_names, log))
        
        # Parse event_data JSON if it exists
        event_data = log_dict.get("event_data")
        if event_data and isinstance(event_data, str):
            try:
                event_data = json.loads(event_data)
            except:
                event_data = {}
        elif not event_data:
            event_data = {}
        
        # Extract target info from event_data if available
        target_name = event_data.get("email") or event_data.get("target_name") or "N/A"
        target_type = event_data.get("role") or event_data.get("target_type") or "User"
        
        # Determine success based on event_type
        event_type_lower = (log_dict.get("event_type") or "").lower()
        success = "failed" not in event_type_lower and "error" not in event_type_lower
        
        formatted_logs.append({
            "id": log_dict.get("id"),
            "timestamp": log_dict.get("timestamp").isoformat() if log_dict.get("timestamp") else None,
            "event_type": log_dict.get("event_type"),
            "event_category": categorize_event(log_dict.get("event_type")),
            "description": log_dict.get("description"),
            "actor_id": log_dict.get("user_id"),
            "actor_type": "Admin" if log_dict.get("user_id") == 1 else "User",
            "actor_name": get_user_name(log_dict.get("user_id")),
            "target_id": None,
            "target_type": target_type,
            "target_name": target_name,
            "severity": log_dict.get("severity") or "info",
            "success": success,
            "ip_address": event_data.get("ip_address"),
            "user_agent": event_data.get("user_agent"),
            "session_id": event_data.get("session_id"),
            "error_message": event_data.get("reason") if not success else None,
            "metadata": event_data
        })
    
    return {
        "total_count": total_count,
        "page": skip // limit + 1 if limit > 0 else 1,
        "limit": limit,
        "logs": formatted_logs
    }


def categorize_event(event_type: str) -> str:
    """Helper function to categorize events"""
    if not event_type:
        return "Other"
    
    event_type_lower = event_type.lower()
    
    if "login" in event_type_lower:
        return "Authentication"
    elif "user" in event_type_lower or "admin" in event_type_lower:
        return "User Management"
    elif "password" in event_type_lower:
        return "Security"
    elif "transfer" in event_type_lower:
        return "Ownership"
    elif "notification" in event_type_lower:
        return "Communication"
    else:
        return "System"

@router.get("/audit-logs/export")
def export_audit_logs(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user),
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Export audit logs as PDF with auto-fitting table format"""
    require_super_admin(current_admin)
    
    from sqlalchemy import text
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Build query
    base_query = "SELECT * FROM system_events WHERE 1=1"
    params = {}
    
    if event_type:
    # Handle admin_crud as multiple event types
        if event_type == "admin_crud":
            base_query += " AND event_type IN ('ADMIN_UPDATE_USER', 'ADMIN_MANUAL_REGISTRATION', 'ADMIN_DELETE_USER')"
        else:
            base_query += " AND event_type = :event_type"
            params["event_type"] = event_type
    
    if severity:
        base_query += " AND severity = :severity"
        params["severity"] = severity
    
    if start_date:
        base_query += " AND timestamp >= :start_date"
        params["start_date"] = start_date
    
    if end_date:
        base_query += " AND timestamp <= :end_date"
        params["end_date"] = end_date
    
    base_query += " ORDER BY timestamp DESC LIMIT 1000"
    
    result = db.execute(text(base_query), params)
    logs = result.fetchall()
    column_names = result.keys()
    
    # Helper function to get user info
    def get_user_info(user_id):
        if not user_id:
            return "System"
        user = db.query(models.User).filter(models.User.id == user_id).first()
        return user.name if user else "Unknown"
    
    # Create PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=15,
        leftMargin=15,
        topMargin=35,
        bottomMargin=20,
        title="DoughNation Audit Logs Report"
    )
    
    # Container for PDF elements
    elements = []
    styles = getSampleStyleSheet()
    
    # Add title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#4A2F17'),
        spaceAfter=8,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    title = Paragraph("<b>DoughNation - Audit Logs Report</b>", title_style)
    elements.append(title)
    
    # Add metadata
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b4b2b'),
        spaceAfter=12
    )
    
    meta_info = f"<b>Generated:</b> {now_ph().strftime('%B %d, %Y at %H:%M:%S PHT')} | "
    meta_info += f"<b>By:</b> {current_admin.name} | "
    meta_info += f"<b>Total Records:</b> {len(logs)}"
    
    if event_type or severity or start_date or end_date:
        meta_info += "<br/><b>Filters Applied:</b> "
        filters = []
        if event_type:
            filters.append(f"Event Type: {event_type}")
        if severity:
            filters.append(f"Severity: {severity}")
        if start_date:
            filters.append(f"From: {start_date.strftime('%Y-%m-%d')}")
        if end_date:
            filters.append(f"To: {end_date.strftime('%Y-%m-%d')}")
        meta_info += ", ".join(filters)
    
    meta_para = Paragraph(meta_info, meta_style)
    elements.append(meta_para)
    elements.append(Spacer(1, 0.2 * inch))
    
    # Define styles for table cells with auto-wrapping
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#4A2F17'),
        alignment=TA_CENTER,
        leading=11
    )
    
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#4A2F17'),
        wordWrap='CJK',
        alignment=TA_LEFT
    )
    
    cell_style_center = ParagraphStyle(
        'CellStyleCenter',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#4A2F17'),
        alignment=TA_CENTER
    )
    
    # Prepare table data with Paragraphs for auto-wrapping
    table_data = [[
        Paragraph('<b>Timestamp</b>', header_style),
        Paragraph('<b>Event Type</b>', header_style),
        Paragraph('<b>Actor</b>', header_style),
        Paragraph('<b>Severity</b>', header_style),
        Paragraph('<b>Description</b>', header_style)
    ]]
    
    for log in logs:
        log_dict = dict(zip(column_names, log))
        
        timestamp = log_dict.get("timestamp")
        if timestamp:
            timestamp_str = timestamp.strftime('%Y-%m-%d<br/>%H:%M:%S')
        else:
            timestamp_str = "N/A"
        
        event_type_val = log_dict.get("event_type") or "N/A"
        actor_name = get_user_info(log_dict.get("user_id"))
        severity_val = (log_dict.get("severity") or "info").upper()
        description = log_dict.get("description") or "No description"
        
        # Create Paragraph objects for each cell - this enables auto-wrapping
        table_data.append([
            Paragraph(timestamp_str, cell_style_center),
            Paragraph(event_type_val, cell_style),
            Paragraph(actor_name, cell_style),
            Paragraph(severity_val, cell_style_center),
            Paragraph(description, cell_style)
        ])
    
    # Calculate available width (landscape A4 = 11.69 inches)
    available_width = landscape(A4)[0] - 30  # Subtract margins
    
    # Optimized column widths that fit within landscape A4
    # Total should be ~11.4 inches
    col_widths = [
        1.0 * inch,   # Timestamp - narrower
        1.5 * inch,   # Event Type - medium
        1.1 * inch,   # Actor - narrow
        0.7 * inch,   # Severity - very narrow
        4.5 * inch    # Description - widest for details
    ]
    
    # Create table
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    # Apply comprehensive table styling
    table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EADBC8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#4A2F17')),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        # Body styling
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#4A2F17')),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Timestamp centered
        ('ALIGN', (1, 1), (2, -1), 'LEFT'),    # Event Type and Actor left
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Severity centered
        ('ALIGN', (4, 1), (4, -1), 'LEFT'),    # Description left
        ('VALIGN', (0, 1), (-1, -1), 'TOP'),   # All content aligned to top
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        
        # Grid and borders
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D4B896')),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor('#BF7327')),
        
        # Alternating row colors for better readability
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FFF9F1')]),
        
        # Word wrap enabled (handled by Paragraph objects)
        ('WORDWRAP', (0, 0), (-1, -1), True),
    ]))
    
    elements.append(table)
    
    # Add footer note
    elements.append(Spacer(1, 0.2 * inch))
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER
    )
    footer = Paragraph(
        f"<i>This is an official audit log report from DoughNation System. "
        f"Report generated on {now_ph().strftime('%B %d, %Y')}.  </i>",
        footer_style
    )
    elements.append(footer)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Generate filename with timestamp
    filename = f"DoughNation_Audit_Logs_{now_ph().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    # Return as streaming response
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/admin_profile")
def get_admin_profile(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_admin),
):
    """Get admin profile for report headers"""
    admin_profile_picture = None
    if current_user.profile_picture:
        if not current_user.profile_picture.startswith('uploads/'):
            admin_profile_picture = f"uploads/profile_pictures/{current_user.profile_picture}"
        else:
            admin_profile_picture = current_user.profile_picture
    
    return {
        "profile_picture": admin_profile_picture,
        "name": current_user.name,
        "email": current_user.email
    }

# ==================== 3. NOTIFICATION MANAGEMENT ====================

@router.post("/notifications/send")
def send_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """
    Send system notification (broadcast, role-targeted, or user-specific).
    Super Admin only.
    """
    require_super_admin(current_admin)
    
    # Create notification record
    notif = admin_models.SystemNotification(
        title=notification.title,
        message=notification.message,
        notification_type=notification.notification_type,
        target_all=notification.target_all,
        target_role=notification.target_role,
        target_user_id=notification.target_user_id,
        send_email=notification.send_email,
        send_in_app=True,
        sent_by_admin_id=current_admin.id,
        sent_at=now_ph(),
        priority=notification.priority,
        expires_at=notification.expires_at
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    
    # Determine recipients
    recipients = []
    
    if notification.target_all:
        recipients = db.query(models.User).filter(models.User.role != "Admin").all()
    elif notification.target_role:
        recipients = db.query(models.User).filter(models.User.role == notification.target_role).all()
    elif notification.target_user_id:
        user = db.query(models.User).filter(models.User.id == notification.target_user_id).first()
        if user:
            recipients = [user]
    
    # Create notification receipts for in-app delivery
    for recipient in recipients:
        receipt = admin_models.NotificationReceipt(
            notification_id=notif.id,
            user_id=recipient.id,
            delivered_at=now_ph()
        )
        db.add(receipt)
        
        # Send email if requested
        if notification.send_email:
            send_email(
                to_email=recipient.email,
                subject=notification.title,
                html_content=f"""
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
                <hr>
                <p><small>This is a system notification from DoughNation Admin.</small></p>
                """
            )
    
    db.commit()
    
    # Log audit event
    log_audit_event(
        db=db,
        event_type="notification_sent",
        description=f"Notification sent: {notification.title} to {len(recipients)} recipients",
        actor_id=current_admin.id,
        event_data={
            "notification_id": notif.id,
            "recipient_count": len(recipients),
            "target_all": notification.target_all,
            "target_role": notification.target_role
        }
    )
    
    return {
        "message": "Notification sent successfully",
        "notification_id": notif.id,
        "recipients_count": len(recipients),
        "sent_at": notif.sent_at
    }


@router.get("/notifications/history")
def get_notification_history(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50
):
    """Get history of all sent notifications"""
    require_super_admin(current_admin)
    
    notifications = db.query(admin_models.SystemNotification)\
        .order_by(desc(admin_models.SystemNotification.created_at))\
        .offset(skip).limit(limit).all()
    
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "target_all": n.target_all,
                "target_role": n.target_role,
                "sent_at": n.sent_at,
                "priority": n.priority,
                "recipient_count": len(n.receipts) if n.receipts else 0
            }
            for n in notifications
        ]
    }


# ==================== 4. EMERGENCY OVERRIDE ACTIONS ====================

@router.post("/emergency/password-reset")
def emergency_password_reset(
    reset_data: EmergencyPasswordReset,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """
    Emergency password reset for user account recovery.
    Super Admin only. Creates audit trail.
    """
    require_super_admin(current_admin)
    
    user = db.query(models.User).filter(models.User.id == reset_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent resetting admin passwords
    if user.role.lower() == "admin":
        raise HTTPException(status_code=403, detail="Cannot reset admin passwords")
    
    # Store old password hash for audit
    old_password_hash = user.hashed_password
    
    # Set new password
    user.hashed_password = pwd_context.hash(reset_data.new_password)
    db.commit()
    
    # Create emergency override record
    override = admin_models.EmergencyOverride(
        action_type="password_reset",
        reason=reset_data.reason,
        ticket_number=reset_data.ticket_number,
        admin_id=current_admin.id,
        admin_name=current_admin.name,
        target_user_id=user.id,
        target_user_name=user.name,
        target_user_email=user.email,
        old_value="[password_hash]",
        new_value="[new_password_hash]",
        status="executed",
        executed_at=now_ph()
    )
    db.add(override)
    db.commit()
    
    # Log audit event
    log_audit_event(
        db=db,
        event_type="emergency_password_reset",
        description=f"Emergency password reset for user {user.name} by admin {current_admin.name}",
        actor_id=current_admin.id,
        target_id=user.id,
        target_type="User",
        event_data={
            "reason": reset_data.reason,
            "ticket_number": reset_data.ticket_number
        },
        severity="critical"
    )
    
    # Send notification email to user
    send_email(
        to_email=user.email,
        subject="Emergency Password Reset - DoughNation",
        html_content=f"""
        <h2>Emergency Password Reset</h2>
        <p>Dear {user.name},</p>
        <p>Your password has been reset by the system administrator for the following reason:</p>
        <p><strong>{reset_data.reason}</strong></p>
        <p>Your new temporary password is: <strong>{reset_data.new_password}</strong></p>
        <p>Please log in and change your password immediately.</p>
        <p>If you did not request this, please contact support immediately.</p>
        <hr>
        <p><small>Ticket: {reset_data.ticket_number or 'N/A'}</small></p>
        """
    )
    
    return {
        "message": "Password reset successful",
        "user_id": user.id,
        "user_email": user.email,
        "override_id": override.id
    }


@router.post("/emergency/ownership-transfer")
def create_ownership_transfer(
    transfer: OwnershipTransferCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """
    Transfer bakery ownership from owner to employee.
    Used for business continuity in emergencies.
    Super Admin only.
    """
    require_super_admin(current_admin)
    
    # Verify bakery exists
    bakery = db.query(models.User).filter(
        models.User.id == transfer.bakery_id,
        models.User.role == "Bakery"
    ).first()
    
    if not bakery:
        raise HTTPException(status_code=404, detail="Bakery not found")
    
    # Verify employee exists and belongs to this bakery
    employee = db.query(models.Employee).filter(
        models.Employee.id == transfer.to_employee_id,
        models.Employee.bakery_id == transfer.bakery_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found or doesn't belong to this bakery")
    
    # Store old owner information for audit trail
    old_contact_person = bakery.contact_person
    old_email = bakery.email
    
    # Store employee information
    employee_name = employee.name
    employee_email = employee.email
    employee_profile_picture = employee.profile_picture
    
    # Transfer ownership: Update bakery's contact person and email to employee's details
    # Note: Bakery profile picture remains unchanged (keeps original registration photo)
    bakery.contact_person = employee.name
    bakery.email = employee.email
    
    # Change employee role to "Owner" (they remain in the employees table with Owner role)
    employee.role = "Owner"
    
    db.commit()
    
    # Calculate expiration for temporary transfers
    expires_at = None
    if transfer.is_temporary and transfer.duration_days:
        expires_at = now_ph() + timedelta(days=transfer.duration_days)
    
    # Create ownership transfer record
    ownership_transfer = admin_models.OwnershipTransfer(
        bakery_id=transfer.bakery_id,
        from_owner_id=bakery.id,
        to_employee_id=transfer.to_employee_id,
        reason=transfer.reason,
        transfer_type=transfer.transfer_type,
        authorized_by_admin_id=current_admin.id,
        is_temporary=transfer.is_temporary,
        expires_at=expires_at,
        new_owner_name=employee_name,
        new_owner_email=employee_email,
        status="active"
    )
    db.add(ownership_transfer)
    db.commit()
    db.refresh(ownership_transfer)
    
    # Create emergency override record
    override = admin_models.EmergencyOverride(
        action_type="ownership_transfer",
        reason=transfer.reason,
        admin_id=current_admin.id,
        admin_name=current_admin.name,
        target_user_id=bakery.id,
        target_user_name=bakery.name,
        old_value=f"Owner: {old_contact_person} ({old_email})",
        new_value=f"New Owner: {employee_name} ({employee_email})",
        transferred_to_employee_id=transfer.to_employee_id,
        status="executed",
        executed_at=now_ph(),
        event_data={
            "transfer_type": transfer.transfer_type,
            "is_temporary": transfer.is_temporary,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "old_contact_person": old_contact_person,
            "old_email": old_email,
            "new_contact_person": employee_name,
            "new_email": employee_email
        }
    )
    db.add(override)
    db.commit()
    
    # Log audit event
    log_audit_event(
        db=db,
        event_type="ownership_transfer",
        description=f"Ownership transfer: Bakery {bakery.name} → Employee {employee_name} ({transfer.transfer_type})",
        actor_id=current_admin.id,
        target_id=bakery.id,
        target_type="Bakery",
        event_data={
            "employee_id": transfer.to_employee_id,
            "employee_name": employee_name,
            "transfer_type": transfer.transfer_type,
            "is_temporary": transfer.is_temporary,
            "reason": transfer.reason
        },
        severity="critical"
    )
    
    # Send notification to new owner (former employee)
    send_email(
        to_email=employee_email,
        subject="Bakery Ownership Transfer - DoughNation",
        html_content=f"""
        <h2>Ownership Transfer Notification</h2>
        <p>Dear {employee_name},</p>
        <p>You have been designated as the {'Acting' if transfer.is_temporary else 'New'} Owner/Contact Person for <strong>{bakery.name}</strong>.</p>
        <p><strong>Transfer Type:</strong> {transfer.transfer_type.capitalize()}</p>
        <p><strong>Reason:</strong> {transfer.reason}</p>
        {f'<p><strong>Duration:</strong> {transfer.duration_days} days (expires: {expires_at.strftime("%Y-%m-%d")})</p>' if expires_at else '<p><strong>Duration:</strong> Permanent</p>'}
        <p><strong>Previous Owner:</strong> {old_contact_person} ({old_email})</p>
        <p><strong>Your New Status:</strong></p>
        <ul>
            <li>You are now the Bakery Owner</li>
            <li>Your role has been updated to "Owner" in the system</li>
            <li>Login Email: {employee_email}</li>
            <li>Contact Person: {employee_name}</li>
        </ul>
        <p><strong>⚠️ Important:</strong> You now have full ownership access with Owner role.</p>
        <p>The bakery's contact person and email have been updated to your details.</p>
        <p>Please contact the administrator if you have any questions.</p>
        <hr>
        <p><small>This is an emergency action performed by Super Admin: {current_admin.name}</small></p>
        """
    )
    
    # Send notification to old owner
    try:
        send_email(
            to_email=old_email,
            subject="Bakery Ownership Transfer Notice - DoughNation",
            html_content=f"""
            <h2>Ownership Transfer Notice</h2>
            <p>Dear {old_contact_person},</p>
            <p>This is to inform you that ownership of <strong>{bakery.name}</strong> has been transferred.</p>
            <p><strong>Transfer Type:</strong> {transfer.transfer_type.capitalize()}</p>
            <p><strong>New Owner:</strong> {employee_name} ({employee_email})</p>
            <p><strong>Reason:</strong> {transfer.reason}</p>
            {f'<p><strong>Duration:</strong> {transfer.duration_days} days (expires: {expires_at.strftime("%Y-%m-%d")})</p>' if expires_at else '<p><strong>Duration:</strong> Permanent</p>'}
            <p>If you have questions or concerns about this transfer, please contact DoughNation support.</p>
            <hr>
            <p><small>This is an emergency action performed by Super Admin: {current_admin.name}</small></p>
            """
        )
    except Exception as e:
        print(f"Failed to send notification to old owner: {e}")
    
    return {
        "message": "Ownership transfer completed successfully",
        "transfer_id": ownership_transfer.id,
        "bakery_name": bakery.name,
        "previous_owner": old_contact_person,
        "new_owner": employee_name,
        "new_contact_email": employee_email,
        "transfer_type": transfer.transfer_type,
        "is_temporary": transfer.is_temporary,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "employee_role_updated": True,
        "new_role": "Owner"
    }


# ==================== 5. USER PROFILE EDITING ====================

@router.put("/users/{user_id}/profile")
def update_user_profile(
    user_id: int,
    profile_update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """
    Edit user profile details (Super Admin can correct/update any field).
    """
    require_super_admin(current_admin)
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Store old values for audit
    old_values = {}
    updates = {}
    
    # Update fields if provided
    if profile_update.name is not None:
        old_values["name"] = user.name
        user.name = profile_update.name
        updates["name"] = profile_update.name
        
    if profile_update.email is not None:
        old_values["email"] = user.email
        user.email = profile_update.email
        updates["email"] = profile_update.email
        
    if profile_update.contact_person is not None:
        old_values["contact_person"] = user.contact_person
        user.contact_person = profile_update.contact_person
        updates["contact_person"] = profile_update.contact_person
        
    if profile_update.contact_number is not None:
        old_values["contact_number"] = user.contact_number
        user.contact_number = profile_update.contact_number
        updates["contact_number"] = profile_update.contact_number
        
    if profile_update.address is not None:
        old_values["address"] = user.address
        user.address = profile_update.address
        updates["address"] = profile_update.address
        
    if profile_update.about is not None:
        user.about = profile_update.about
        updates["about"] = profile_update.about
        
    if profile_update.latitude is not None:
        user.latitude = profile_update.latitude
        updates["latitude"] = profile_update.latitude
        
    if profile_update.longitude is not None:
        user.longitude = profile_update.longitude
        updates["longitude"] = profile_update.longitude
    
    db.commit()
    db.refresh(user)
    
    # Log audit event
    log_audit_event(
        db=db,
        event_type="admin_edit_user",
        description=f"Admin {current_admin.name} updated profile for {user.name}",
        actor_id=current_admin.id,
        target_id=user_id,
        target_type="User",
        event_data={
            "updated_fields": list(updates.keys()),
            "old_values": old_values,
            "new_values": updates
        },
        severity="info"
    )
    
    return {
        "message": "User profile updated successfully",
        "user_id": user_id,
        "updated_fields": list(updates.keys())
    }


# ==================== 6. ADVANCED ANALYTICS ====================

@router.get("/analytics/dashboard")
def get_admin_dashboard_analytics(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """
    Comprehensive system analytics for Super Admin dashboard.
    """
    require_super_admin(current_admin)
    
    # User statistics - only count verified users
    total_users = db.query(models.User).filter(
        models.User.role != "Admin",
        models.User.verified == True
    ).count()
    active_users = db.query(models.User).filter(
        models.User.status == "Active",
        models.User.role != "Admin"
    ).count()
    suspended_users = db.query(models.User).filter(
        models.User.status == "Suspended",
        models.User.role != "Admin"
    ).count()
    banned_users = db.query(models.User).filter(
        models.User.status == "Banned",
        models.User.role != "Admin"
    ).count()
    pending_users = db.query(models.User).filter(
        models.User.status == "Pending",
        models.User.role != "Admin"
    ).count()
    deactivated_users = db.query(models.User).filter(
        models.User.status == "Deactivated",
        models.User.role != "Admin"
    ).count()
    rejected_users = db.query(models.User).filter(
        models.User.status == "Rejected",
        models.User.role != "Admin"
    ).count()
    
    total_bakeries = db.query(models.User).filter(
        models.User.role == "Bakery",
        models.User.verified == True
    ).count()
    total_charities = db.query(models.User).filter(
        models.User.role == "Charity",
        models.User.verified == True
    ).count()
    
    # Donation statistics
    total_donations = db.query(models.Donation).count()
    
    # Recent activity (last 7 days) - Philippines timezone
    week_ago = now_ph() - timedelta(days=7)
    new_users_week = db.query(models.User).filter(
        models.User.created_at >= week_ago.date(),
        models.User.role != "Admin"
    ).count()
    
    # Audit log statistics - Query from SystemEvent table
    total_events = db.query(models.SystemEvent).count()
    critical_events = db.query(models.SystemEvent).filter(
        models.SystemEvent.severity == "critical"
    ).count()
    
    # Get today's date range (00:00:00 to 23:59:59) in Philippines timezone
    today_start = get_day_start_ph()
    today_end = get_day_end_ph()
    
    failed_logins_today = db.query(models.SystemEvent).filter(
        models.SystemEvent.event_type == "failed_login",
        models.SystemEvent.timestamp >= today_start,
        models.SystemEvent.timestamp <= today_end
    ).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "suspended": suspended_users,
            "banned": banned_users,
            "pending": pending_users,
            "deactivated": deactivated_users,
            "rejected": rejected_users,
            "bakeries": total_bakeries,
            "charities": total_charities,
            "new_this_week": new_users_week
        },
        "donations": {
            "total": total_donations
        },
        "security": {
            "failed_logins_today": failed_logins_today,
            "critical_events": critical_events
        },
        "audit": {
            "total_events": total_events
        }
    }


@router.get("/analytics/trends")
def get_system_trends(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user),
    days: int = 30
):
    """
    Get system usage trends over time (donations, logins, new users).
    """
    require_super_admin(current_admin)
    
    start_date = now_ph() - timedelta(days=days)
    
    # This would ideally query SystemAnalytics table if populated
    # For now, return basic trend data
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "message": "Trend analytics would show daily/weekly/monthly aggregated data",
        "note": "Implement background job to populate SystemAnalytics table"
    }


# ==================== 7. EMERGENCY OVERRIDE HISTORY ====================

@router.get("/emergency/history")
def get_emergency_override_history(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50
):
    """View all emergency override actions"""
    require_super_admin(current_admin)
    
    overrides = db.query(admin_models.EmergencyOverride)\
        .order_by(desc(admin_models.EmergencyOverride.created_at))\
        .offset(skip).limit(limit).all()
    
    return {
        "overrides": [
            {
                "id": o.id,
                "created_at": o.created_at,
                "action_type": o.action_type,
                "reason": o.reason,
                "admin_name": o.admin_name,
                "target_user_name": o.target_user_name,
                "status": o.status,
                "executed_at": o.executed_at
            }
            for o in overrides
        ]
    }


# ==================== HELPER ENDPOINTS FOR EMERGENCY PANEL ====================

@router.get("/emergency/bakeries-list")
def get_bakeries_for_emergency(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """Get list of all bakeries for emergency panel dropdown"""
    require_super_admin(current_admin)
    
    bakeries = db.query(models.User).filter(
        models.User.role == "Bakery"
    ).order_by(models.User.name).all()
    
    return {
        "bakeries": [
            {
                "id": b.id,
                "name": b.name,
                "email": b.email,
                "contact_person": b.contact_person,
                "verified": b.verified,
                "status": b.status
            }
            for b in bakeries
        ]
    }


@router.get("/emergency/bakery/{bakery_id}/employees")
def get_bakery_employees_for_emergency(
    bakery_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user)
):
    """Get list of employees for a specific bakery, prioritizing Managers"""
    require_super_admin(current_admin)
    
    # Verify bakery exists
    bakery = db.query(models.User).filter(
        models.User.id == bakery_id,
        models.User.role == "Bakery"
    ).first()
    
    if not bakery:
        raise HTTPException(status_code=404, detail="Bakery not found")
    
    # Get all employees for this bakery
    employees = db.query(models.Employee).filter(
        models.Employee.bakery_id == bakery_id
    ).order_by(
        # Prioritize Manager role, then Owner, then alphabetically
        case(
            (models.Employee.role == "Manager", 1),
            (models.Employee.role == "Owner", 2),
            else_=3
        ),
        models.Employee.name
    ).all()
    
    return {
        "bakery_id": bakery_id,
        "bakery_name": bakery.name,
        "employees": [
            {
                "id": e.id,
                "employee_id": e.employee_id,
                "name": e.name,
                "email": e.email,
                "role": e.role,
                "is_manager": e.role == "Manager",
                "is_owner": e.role == "Owner"
            }
            for e in employees
        ]
    }
