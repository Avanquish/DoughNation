"""
Email Utility Module
Handles all email-related functionality including SMTP configuration and email sending
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")  # Your Gmail address
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")  # App-specific password
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FRONTEND_URL = os.getenv("FRONTEND_URL")


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email using SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️  SMTP credentials not configured. Email not sent.")
        print(f"   Would have sent to: {to_email}")
        print(f"   Subject: {subject}")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"DoughNation <{FROM_EMAIL}>"
        message["To"] = to_email
        
        # Attach HTML content
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Connect to SMTP server and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
        return False


def send_verification_email(to_email: str, user_name: str, verification_token: str) -> bool:
    """
    Send account verification email
    
    Args:
        to_email: User's email address
        user_name: User's name
        verification_token: Unique verification token
        
    Returns:
        bool: True if sent successfully
    """
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #FFC062 0%, #E88A1A 100%); 
                       padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #E88A1A; 
                      color: white; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍞 DoughNation</h1>
            </div>
            <div class="content">
                <h2>Welcome to DoughNation, {user_name}!</h2>
                <p>Thank you for registering with DoughNation. Your account has been created and is pending verification by our admin team.</p>
                <p>Once your account is verified, you'll receive another email notification and will be able to access all features.</p>
                <p>To verify your email address, please click the button below:</p>
                <a href="{verification_link}" class="button">Verify Email Address</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{verification_link}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create this account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 DoughNation. All rights reserved.</p>
                <p>Connecting bakeries with charities to reduce food waste.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "Verify Your DoughNation Account", html_content)


def send_account_verified_email(to_email: str, user_name: str, role: str) -> bool:
    """
    Send email notification when account is verified by admin
    
    Args:
        to_email: User's email address
        user_name: User's name
        role: User's role (Bakery/Charity)
        
    Returns:
        bool: True if sent successfully
    """
    login_link = f"{FRONTEND_URL}/login"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                       padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #28a745; 
                      color: white; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; margin: 20px 0; }}
            .success-icon {{ font-size: 48px; text-align: center; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍞 DoughNation</h1>
            </div>
            <div class="content">
                <div class="success-icon">✅</div>
                <h2>Account Verified!</h2>
                <p>Dear {user_name},</p>
                <p>Great news! Your {role} account has been verified and approved by our admin team.</p>
                <p>You can now log in and start using all the features of DoughNation:</p>
                <ul>
                    <li>{'Manage your bakery inventory and donations' if role == 'Bakery' else 'Browse available donations from bakeries'}</li>
                    <li>{'Schedule and track donations to charities' if role == 'Bakery' else 'Request and receive donations'}</li>
                    <li>View analytics and reports</li>
                    <li>Connect with {'charities' if role == 'Bakery' else 'bakeries'} in your area</li>
                </ul>
                <a href="{login_link}" class="button">Log In Now</a>
                <p>Thank you for joining DoughNation in our mission to reduce food waste and help those in need!</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 DoughNation. All rights reserved.</p>
                <p>Connecting bakeries with charities to reduce food waste.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "Your DoughNation Account is Verified! 🎉", html_content)


def send_password_reset_email(to_email: str, user_name: str, reset_token: str) -> bool:
    """
    Send password reset email
    
    Args:
        to_email: User's email address
        user_name: User's name
        reset_token: Unique password reset token
        
    Returns:
        bool: True if sent successfully
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                       padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #dc3545; 
                      color: white; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; margin: 20px 0; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; 
                       padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍞 DoughNation</h1>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_link}</p>
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2025 DoughNation. All rights reserved.</p>
                <p>Connecting bakeries with charities to reduce food waste.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "Reset Your DoughNation Password", html_content)


def send_password_changed_confirmation(to_email: str, user_name: str) -> bool:
    """
    Send confirmation email after password is successfully changed
    
    Args:
        to_email: User's email address
        user_name: User's name
        
    Returns:
        bool: True if sent successfully
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                       padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .success-icon {{ font-size: 48px; text-align: center; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍞 DoughNation</h1>
            </div>
            <div class="content">
                <div class="success-icon">✅</div>
                <h2>Password Changed Successfully</h2>
                <p>Hi {user_name},</p>
                <p>This email confirms that your DoughNation account password was successfully changed.</p>
                <p>If you did not make this change, please contact our support team immediately.</p>
                <p>For security reasons, we recommend:</p>
                <ul>
                    <li>Using a strong, unique password</li>
                    <li>Not sharing your password with anyone</li>
                    <li>Logging out from devices you don't use</li>
                </ul>
            </div>
            <div class="footer">
                <p>&copy; 2025 DoughNation. All rights reserved.</p>
                <p>Connecting bakeries with charities to reduce food waste.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "Your Password Has Been Changed", html_content)


def send_employee_credentials_email(
    to_email: str, 
    employee_name: str, 
    employee_id: str, 
    default_password: str,
    bakery_name: str,
    is_reset: bool = False
) -> bool:
    """
    Send employee login credentials email
    
    Args:
        to_email: Employee's email address
        employee_name: Employee's name
        employee_id: Employee's unique ID (e.g., EMP-5-001)
        default_password: One-time default password
        bakery_name: Name of the bakery
        is_reset: Whether this is a password reset (True) or new account (False)
        
    Returns:
        bool: True if sent successfully
    """
    login_url = f"{FRONTEND_URL}/login"
    
    # Different titles and messages for reset vs new account
    if is_reset:
        email_title = f"Password Reset - {bakery_name}"
        greeting = f"<h2>Password Reset for {bakery_name}</h2>"
        intro = f"<p>Hi {employee_name},</p><p>Your password has been reset by the bakery owner. Here are your new login credentials:</p>"
    else:
        email_title = f"Your {bakery_name} Employee Account Credentials"
        greeting = f"<h2>Welcome to {bakery_name}!</h2>"
        intro = f"<p>Hi {employee_name},</p><p>You have been added as an employee at <strong>{bakery_name}</strong> on DoughNation. Here are your login credentials:</p>"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #FFC062 0%, #E88A1A 100%); 
                       padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .credentials-box {{ background: white; border: 2px solid #E88A1A; 
                               padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .credential-item {{ margin: 15px 0; padding: 10px; background: #f8f9fa; 
                               border-radius: 4px; }}
            .credential-label {{ font-weight: bold; color: #E88A1A; }}
            .credential-value {{ font-family: 'Courier New', monospace; font-size: 16px; 
                                color: #333; margin-top: 5px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #E88A1A; 
                      color: white; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; margin: 20px 0; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; 
                       padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍞 DoughNation</h1>
            </div>
            <div class="content">
                {greeting}
                {intro}
                
                <div class="credentials-box">
                    <div class="credential-item">
                        <div class="credential-label">Employee ID:</div>
                        <div class="credential-value">{employee_id}</div>
                    </div>
                    <div class="credential-item">
                        <div class="credential-label">One-Time Password:</div>
                        <div class="credential-value">{default_password}</div>
                    </div>
                </div>
                
                <p>Click the button below to login:</p>
                <a href="{login_url}" class="button">Login to DoughNation</a>
                
                <div class="warning">
                    <strong>⚠️ Important Security Notice:</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li><strong>Change your password immediately</strong> after your {'next' if is_reset else 'first'} login</li>
                        <li>This is a temporary password - do not share it with anyone</li>
                        <li>Use your Employee ID ({employee_id}) to login, not your email</li>
                        <li>Keep your credentials secure and confidential</li>
                    </ul>
                </div>
                
                <p>If you have any questions or did not expect this email, please contact your bakery manager.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 DoughNation. All rights reserved.</p>
                <p>Connecting bakeries with charities to reduce food waste.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, email_title, html_content)


def send_otp_email(to_email: str, otp_code: str, recipient_name: str = "User") -> bool:
    """
    Send OTP code for password reset
    
    Args:
        to_email: Recipient email address
        otp_code: 6-digit OTP code
        recipient_name: Name of the recipient
        
    Returns:
        bool: True if sent successfully
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #FFC062 0%, #E88A1A 100%); 
                       padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .otp-box {{ background: white; border: 2px dashed #E88A1A; border-radius: 8px; 
                       padding: 20px; margin: 20px 0; text-align: center; }}
            .otp-code {{ font-size: 32px; font-weight: bold; color: #E88A1A; 
                        letter-spacing: 8px; font-family: 'Courier New', monospace; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; 
                       padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
                <h2>Hello {recipient_name},</h2>
                <p>You requested to reset your password. Use the verification code below to proceed:</p>
                
                <div class="otp-box">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your verification code is:</p>
                    <div class="otp-code">{otp_code}</div>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">This code expires in 10 minutes</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>Never share this code with anyone</li>
                        <li>DoughNation will never ask for your code via phone or email</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                </div>
                
                <p>Enter this code on the password reset page to continue.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 DoughNation. All rights reserved.</p>
                <p>Connecting bakeries with charities to reduce food waste.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "Password Reset Verification Code", html_content)