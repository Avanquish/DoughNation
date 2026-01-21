"""
Login Security Manager
Handles failed login attempts tracking and account blocking with escalating timeouts
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import LoginAttempt
from app.timezone_utils import now_ph, to_ph_timezone


# Block duration configuration (in minutes)
BLOCK_DURATIONS = {
    0: 0,      # No block
    1: 5,      # First block: 5 minutes after 5 failed attempts
    2: 10,     # Second block: 10 minutes after 2 more failed attempts
    3: 30,     # Third block: 30 minutes after more failed attempts
    4: 60,     # Fourth block: 1 hour
    5: 180,    # Fifth block: 3 hours
    6: 360,    # Sixth block: 6 hours
    7: 720,    # Seventh block: 12 hours
    8: 1440,   # Eighth block: 24 hours
}

# Failed attempts thresholds for each block level
ATTEMPT_THRESHOLDS = {
    0: 5,   # 5 attempts before first block
    1: 2,   # 2 more attempts before second block
    2: 2,   # 2 more attempts before third block
    3: 2,   # 2 more attempts for subsequent blocks
}


def get_login_attempt(db: Session, identifier: str, login_type: str, bakery_id: int = None) -> LoginAttempt:
    """Get or create login attempt record"""
    if login_type == "employee" and bakery_id:
        attempt = db.query(LoginAttempt).filter(
            LoginAttempt.identifier == identifier,
            LoginAttempt.login_type == login_type,
            LoginAttempt.bakery_id == bakery_id
        ).first()
    else:
        attempt = db.query(LoginAttempt).filter(
            LoginAttempt.identifier == identifier,
            LoginAttempt.login_type == login_type
        ).first()
    
    if not attempt:
        attempt = LoginAttempt(
            identifier=identifier,
            login_type=login_type,
            bakery_id=bakery_id,
            failed_attempts=0,
            total_failed_attempts=0,
            block_level=0,
            blocked_until=None
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
    
    return attempt


def check_login_block(db: Session, identifier: str, login_type: str, bakery_id: int = None):
    """
    Check if login is currently blocked
    Raises HTTPException if blocked with remaining time
    """
    attempt = get_login_attempt(db, identifier, login_type, bakery_id)
    
    if attempt.blocked_until:
        # Ensure both datetimes are timezone-aware for comparison
        blocked_until_aware = to_ph_timezone(attempt.blocked_until) if attempt.blocked_until.tzinfo is None else attempt.blocked_until
        now = now_ph()
        
        if blocked_until_aware > now:
            remaining = blocked_until_aware - now
            remaining_minutes = int(remaining.total_seconds() / 60)
            remaining_seconds = int(remaining.total_seconds() % 60)
            
            if remaining_minutes > 0:
                time_msg = f"{remaining_minutes} minute{'s' if remaining_minutes != 1 else ''}"
                if remaining_seconds > 0:
                    time_msg += f" and {remaining_seconds} second{'s' if remaining_seconds != 1 else ''}"
            else:
                time_msg = f"{remaining_seconds} second{'s' if remaining_seconds != 1 else ''}"
            
            raise HTTPException(
                status_code=429,
                detail={
                    "message": f"Too many failed login attempts. Account is temporarily blocked.",
                    "blocked_until": blocked_until_aware.isoformat(),
                    "remaining_time": time_msg,
                    "block_level": attempt.block_level,
                    "total_failures": attempt.total_failed_attempts
                }
            )
        
        # If block has expired, reset failed attempts for this block level
        if blocked_until_aware <= now:
            attempt.failed_attempts = 0
            attempt.blocked_until = None
            db.commit()


def record_failed_attempt(db: Session, identifier: str, login_type: str, bakery_id: int = None):
    """
    Record a failed login attempt and apply blocking if threshold reached
    """
    attempt = get_login_attempt(db, identifier, login_type, bakery_id)
    
    # Increment counters
    attempt.failed_attempts += 1
    attempt.total_failed_attempts += 1
    attempt.last_attempt = now_ph()
    
    # Get threshold for current block level
    threshold = ATTEMPT_THRESHOLDS.get(attempt.block_level, 2)
    
    # Check if we need to escalate the block
    if attempt.failed_attempts >= threshold:
        attempt.block_level += 1
        block_minutes = BLOCK_DURATIONS.get(attempt.block_level, 1440)  # Default to 24 hours max
        attempt.blocked_until = now_ph() + timedelta(minutes=block_minutes)
        attempt.failed_attempts = 0  # Reset attempts for next block level
        
        db.commit()
        db.refresh(attempt)
        
        # Raise exception with block info
        raise HTTPException(
            status_code=429,
            detail={
                "message": f"Too many failed login attempts. Account blocked for {block_minutes} minutes.",
                "blocked_until": attempt.blocked_until.isoformat(),
                "block_duration_minutes": block_minutes,
                "block_level": attempt.block_level,
                "total_failures": attempt.total_failed_attempts,
                "attempts_at_this_level": threshold
            }
        )
    
    db.commit()


def clear_login_attempts(db: Session, identifier: str, login_type: str, bakery_id: int = None):
    """Clear login attempts after successful login"""
    attempt = get_login_attempt(db, identifier, login_type, bakery_id)
    
    # Keep the record but reset counters and block
    attempt.failed_attempts = 0
    attempt.total_failed_attempts = 0
    attempt.block_level = 0
    attempt.blocked_until = None
    
    db.commit()


def get_remaining_attempts(db: Session, identifier: str, login_type: str, bakery_id: int = None) -> dict:
    """Get remaining attempts before block"""
    attempt = get_login_attempt(db, identifier, login_type, bakery_id)
    
    threshold = ATTEMPT_THRESHOLDS.get(attempt.block_level, 2)
    remaining = threshold - attempt.failed_attempts
    
    return {
        "remaining_attempts": remaining,
        "threshold": threshold,
        "current_failures": attempt.failed_attempts,
        "total_failures": attempt.total_failed_attempts,
        "block_level": attempt.block_level
    }
