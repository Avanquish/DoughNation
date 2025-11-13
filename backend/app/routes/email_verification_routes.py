"""
New Authentication Routes for Email Verification and Password Reset
These routes handle the new Gmail-based authentication flow
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app import database, models, schemas
from app.crud import pwd_context
from app.email_utils import (
    send_verification_email,
    send_password_reset_email,
    send_password_changed_confirmation
)
import secrets


router = APIRouter(prefix="/auth", tags=["Authentication"])


def generate_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(database.get_db)):
    """
    Verify user's email address using the token sent to their email
    
    Args:
        token: Verification token from email
        
    Returns:
        Success message if verification is successful
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    # Find user with this verification token
    user = db.query(models.User).filter(
        models.User.verification_token == token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Check if token has expired
    if user.verification_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new one."
        )
    
    # Check if email is already verified
    if user.email_verified:
        return {
            "message": "Email already verified",
            "email": user.email
        }
    
    # Verify the email
    user.email_verified = True
    user.verification_token = None  # Clear the token
    user.verification_token_expires = None
    
    db.commit()
    
    print(f"✅ Email verified for user: {user.email}")
    
    return {
        "message": "Email verified successfully! You can now log in once your account is approved by an admin.",
        "email": user.email,
        "role": user.role
    }


@router.post("/resend-verification")
def resend_verification_email(email: str, db: Session = Depends(database.get_db)):
    """
    Resend verification email to user
    
    Args:
        email: User's email address
        
    Returns:
        Success message if email is sent
        
    Raises:
        HTTPException: If user not found or email already verified
    """
    user = db.query(models.User).filter(models.User.email == email.lower().strip()).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Generate new verification token
    verification_token = generate_token()
    verification_expires = datetime.utcnow() + timedelta(hours=24)
    
    user.verification_token = verification_token
    user.verification_token_expires = verification_expires
    
    db.commit()
    
    # Send verification email
    try:
        send_verification_email(user.email, user.name, verification_token)
        print(f"✅ Verification email resent to {user.email}")
        
        return {
            "message": "Verification email sent successfully",
            "email": user.email
        }
    except Exception as e:
        print(f"❌ Failed to send verification email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later."
        )


@router.post("/forgot-password")
def request_password_reset(email: str, db: Session = Depends(database.get_db)):
    """
    Request a password reset - sends email with reset link
    
    Args:
        email: User's email address
        
    Returns:
        Success message (always returns success even if user not found for security)
    """
    user = db.query(models.User).filter(models.User.email == email.lower().strip()).first()
    
    # For security, always return success even if user doesn't exist
    # This prevents email enumeration attacks
    if not user:
        print(f"⚠️  Password reset requested for non-existent email: {email}")
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }
    
    # Generate reset token
    reset_token = generate_token()
    reset_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    user.reset_token = reset_token
    user.reset_token_expires = reset_expires
    
    db.commit()
    
    # Send password reset email
    try:
        send_password_reset_email(user.email, user.name, reset_token)
        print(f"✅ Password reset email sent to {user.email}")
    except Exception as e:
        print(f"❌ Failed to send password reset email: {str(e)}")
    
    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
def reset_password(
    token: str,
    new_password: str,
    confirm_password: str,
    db: Session = Depends(database.get_db)
):
    """
    Reset password using the token from email
    
    Args:
        token: Reset token from email
        new_password: New password
        confirm_password: Confirm new password
        
    Returns:
        Success message if password is reset
        
    Raises:
        HTTPException: If token is invalid, expired, or passwords don't match
    """
    # Validate passwords match
    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate password strength (minimum 8 characters)
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Find user with this reset token
    user = db.query(models.User).filter(
        models.User.reset_token == token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token has expired
    if user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new password reset."
        )
    
    # Hash new password
    user.hashed_password = pwd_context.hash(new_password)
    
    # Clear reset token
    user.reset_token = None
    user.reset_token_expires = None
    
    db.commit()
    
    print(f"✅ Password reset successfully for user: {user.email}")
    
    # Send confirmation email
    try:
        send_password_changed_confirmation(user.email, user.name)
    except Exception as e:
        print(f"⚠️  Failed to send password change confirmation: {str(e)}")
    
    return {
        "message": "Password reset successfully. You can now log in with your new password.",
        "email": user.email
    }


@router.get("/check-verification-status/{email}")
def check_verification_status(email: str, db: Session = Depends(database.get_db)):
    """
    Check if an email is verified and account is approved
    Useful for showing status on login page
    
    Args:
        email: User's email address
        
    Returns:
        Verification status information
    """
    user = db.query(models.User).filter(models.User.email == email.lower().strip()).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "email": user.email,
        "email_verified": user.email_verified,
        "admin_approved": user.verified,
        "can_login": user.email_verified and user.verified,
        "role": user.role,
        "message": _get_status_message(user)
    }


def _get_status_message(user: models.User) -> str:
    """Helper function to generate status message"""
    if not user.email_verified:
        return "Please verify your email address. Check your inbox for the verification link."
    elif not user.verified:
        return "Your email is verified. Waiting for admin approval to activate your account."
    else:
        return "Your account is fully verified and ready to use!"
