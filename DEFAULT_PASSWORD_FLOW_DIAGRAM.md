# 🔐 Default Password Change Flow - Visual Guide

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EMPLOYEE LOGIN FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   Employee enters   │
│  Name + Password    │
│   at Login Page     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Backend checks    │
│   if password ==    │
│  "Employee123!"     │
└──────────┬──────────┘
           │
           ▼
    ┌──────┴──────┐
    │             │
    ▼             ▼
YES (Default)   NO (Custom)
    │             │
    ▼             ▼
┌─────────┐   ┌─────────┐
│ Token:  │   │ Token:  │
│ req_pwd │   │ req_pwd │
│ = TRUE  │   │ = FALSE │
└────┬────┘   └────┬────┘
     │             │
     ▼             ▼
┌─────────────┐ ┌──────────────┐
│ Login.jsx   │ │ Login.jsx    │
│ detects     │ │ detects      │
│ flag = true │ │ flag = false │
└─────┬───────┘ └──────┬───────┘
      │                │
      ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Show message │  │ Show success │
│ "Password    │  │ message      │
│ Change       │  │              │
│ Required"    │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   Redirect   │  │   Redirect   │
│   to Change  │  │   to         │
│   Password   │  │   Dashboard  │
│   Page       │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 │
┌──────────────┐         │
│   Employee   │         │
│   changes    │         │
│   password   │         │
└──────┬───────┘         │
       │                 │
       ▼                 │
┌──────────────┐         │
│   Backend    │         │
│   returns    │         │
│   NEW token  │         │
│   req_pwd =  │         │
│   FALSE      │         │
└──────┬───────┘         │
       │                 │
       ▼                 │
┌──────────────┐         │
│   Update     │         │
│   context    │         │
│   with new   │         │
│   token      │         │
└──────┬───────┘         │
       │                 │
       ▼                 │
┌──────────────┐         │
│   Redirect   │         │
│   to         │         │
│   Dashboard  │         │
└──────┬───────┘         │
       │                 │
       └────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │   Dashboard   │
        │    Access     │
        │   Granted     │
        └───────────────┘
```

---

## Token Structure

### First Login (Default Password)
```json
{
  "type": "employee",
  "employee_id": 123,
  "employee_name": "John Doe",
  "employee_role": "Owner",
  "bakery_id": 456,
  "sub": "456",
  "requires_password_change": true  ← 🔴 BLOCKS DASHBOARD ACCESS
}
```

### After Password Change
```json
{
  "type": "employee",
  "employee_id": 123,
  "employee_name": "John Doe",
  "employee_role": "Owner",
  "bakery_id": 456,
  "sub": "456",
  "requires_password_change": false  ← 🟢 ALLOWS DASHBOARD ACCESS
}
```

---

## Component Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                        │
└──────────────────────────────────────────────────────────────┘

Login.jsx
    │
    ├─► Decodes token
    │
    ├─► Checks: decoded.requires_password_change
    │
    ├─► IF TRUE:
    │       ├─► Shows SweetAlert message
    │       └─► navigate("/employee-change-password")
    │
    └─► IF FALSE:
            ├─► Shows success message
            └─► navigate("/bakery-dashboard/:id")

─────────────────────────────────────────────────────────────

EmployeeChangePassword.jsx
    │
    ├─► Validates password inputs
    │
    ├─► Sends POST /employee-change-password
    │
    ├─► Receives NEW token (requires_password_change: false)
    │
    ├─► Calls employeeLogin(newToken)
    │       │
    │       └─► Updates EmployeeAuthContext
    │
    └─► navigate("/bakery-dashboard/:id")

─────────────────────────────────────────────────────────────

EmployeeAuthContext.jsx
    │
    ├─► Stores employee data + requires_password_change flag
    │
    ├─► login(token) function:
    │       ├─► Decodes token
    │       ├─► Extracts all fields including requires_password_change
    │       ├─► Saves to localStorage
    │       └─► Updates state
    │
    └─► Available app-wide via useEmployeeAuth()

─────────────────────────────────────────────────────────────

BakeryDashboard.jsx
    │
    ├─► Reads employee from context
    │
    ├─► Sets isEmployeeMode = true
    │
    ├─► Sets isVerified = true (bypasses verification check)
    │
    └─► Renders dashboard based on employee role
```

---

## Backend Endpoints

### 1. POST `/login` (Unified Login)

**Request**:
```json
{
  "email": "John Doe",  // Employee name
  "password": "Employee123!"
}
```

**Response** (First login with default password):
```json
{
  "access_token": "eyJ...",  // Contains requires_password_change: true
  "token_type": "bearer"
}
```

---

### 2. POST `/employee-change-password`

**Request**:
```json
{
  "current_password": "Employee123!",
  "new_password": "MyNewPassword123!",
  "confirm_password": "MyNewPassword123!"
}
```

**Response**:
```json
{
  "message": "Password changed successfully",
  "employee_id": 123,
  "employee_name": "John Doe",
  "access_token": "eyJ...",  // NEW token with requires_password_change: false
  "token_type": "bearer"
}
```

---

## State Management

### LocalStorage Keys

```javascript
// Employee token (contains all employee data)
localStorage.getItem("employeeToken")

// Bakery ID for employee login (helper)
localStorage.getItem("bakery_id_for_employee_login")
```

### Context State

```javascript
// EmployeeAuthContext state
{
  employee_id: 123,
  employee_name: "John Doe",
  employee_role: "Owner",
  bakery_id: 456,
  requires_password_change: false,  // ← Updated after password change
  token: "eyJ..."
}
```

---

## Security Checks

### Backend Security
```
✅ Password hashed with bcrypt
✅ Default password checked server-side
✅ Current password verification required for change
✅ New password minimum 8 characters
✅ JWT token with expiration
✅ Token includes requires_password_change flag
```

### Frontend Security
```
✅ Token stored in localStorage (HttpOnly not possible in React SPA)
✅ Automatic redirect if requires_password_change = true
✅ Password strength indicator
✅ Password mismatch validation
✅ Context-based authentication
✅ Protected routes with EmployeeProtectedRoute
```

---

## Password Validation Rules

### Current Implementation
```
✅ Minimum 8 characters
✅ Must not match current password
✅ Must match confirmation field
✅ Strength indicator (Weak/Fair/Good/Strong)
```

### Strength Calculation
```javascript
let strength = 0;
if (length >= 8)           strength++  // 1 point
if (has uppercase)         strength++  // 1 point
if (has numbers)           strength++  // 1 point
if (has special chars)     strength++  // 1 point

Total: 0-4 points
0-1 = Weak (Red)
2   = Fair (Yellow)
3   = Good (Blue)
4   = Strong (Green)
```

---

## Error Handling

### Login Errors
```
401 Unauthorized    → Invalid credentials
403 Forbidden       → Part-time employee blocked
422 Unprocessable   → Validation error
500 Server Error    → Backend issue
```

### Password Change Errors
```
401 Unauthorized    → Current password incorrect
400 Bad Request     → Passwords don't match
400 Bad Request     → Password too short
404 Not Found       → Employee not found
500 Server Error    → Database/backend issue
```

---

## Success Messages

### First Login
```
🔵 Info: "Password Change Required"
"For security, please change your default password"
```

### Password Changed
```
✅ Success: "Password Changed"
"Your password has been updated successfully!"
```

### Subsequent Login
```
✅ Success: "Welcome!"
"Logged in as John Doe (Owner)"
```

---

## Testing Scenarios

### Scenario 1: Brand New Employee
```
1. Admin creates employee → default password = "Employee123!"
2. Employee logs in → redirected to change password
3. Employee changes password → redirected to dashboard
4. Employee can now use system normally
```

### Scenario 2: Employee Forgot Custom Password
```
1. Admin/Manager resets password → back to "Employee123!"
2. Employee logs in → redirected to change password again
3. Employee sets new password → access granted
```

### Scenario 3: Multiple Login Sessions
```
1. Employee logs in from Browser A → changes password
2. Old token in Browser B becomes invalid (has requires_password_change: true)
3. Employee must re-login from Browser B
4. New login uses custom password → direct dashboard access
```

---

## Troubleshooting Guide

### Problem: Infinite redirect loop
**Symptoms**: Page keeps redirecting to password change
**Check**: 
- Backend returning new token after password change?
- New token has requires_password_change: false?
- employeeLogin(newToken) being called?

---

### Problem: Can bypass password change
**Symptoms**: Employee accesses dashboard with default password
**Check**:
- Login.jsx checking decoded.requires_password_change?
- Early return after redirect?

---

### Problem: Token not updating
**Symptoms**: Old token still in localStorage after password change
**Check**:
- Backend returning access_token in response?
- Frontend calling employeeLogin(newToken)?
- Context updating correctly?

---

## Future Enhancements

### Possible Additions
```
⬜ Password expiration (force change every 90 days)
⬜ Password history (can't reuse last 5 passwords)
⬜ Account lockout after failed attempts
⬜ Email notification on password change
⬜ Two-factor authentication (2FA)
⬜ Password complexity requirements (uppercase, numbers, symbols)
```

---

## Summary

✅ **Automatic Detection**: Backend detects default password
✅ **Forced Change**: Employee cannot access dashboard without changing password
✅ **Seamless Flow**: Automatic redirects with clear messaging
✅ **Token Management**: New token issued after password change
✅ **Security**: Server-side validation and hashing
✅ **User Experience**: Password strength indicator and validation

The default password change flow is now fully integrated into the DoughNation system!
