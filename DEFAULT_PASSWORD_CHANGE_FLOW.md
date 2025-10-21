# 🔐 Default Password Change Flow - Implementation Guide

## Overview
This document describes the automatic password change flow for employees logging in with the default password "Employee123!".

## 📋 Summary of Changes

When an employee logs in with the default password, they are automatically redirected to the password change page before accessing the dashboard.

---

## 🔧 Technical Implementation

### 1. Backend Changes (`auth_routes.py`)

#### Detection of Default Password
**Location**: `backend/app/routes/auth_routes.py` (lines ~117-127)

```python
# 🔐 CHECK IF EMPLOYEE IS USING DEFAULT PASSWORD
is_default_password = verify_password("Employee123!", authenticated_employee.hashed_password)

# Generate employee token
token_data = {
    "type": "employee",
    "employee_id": authenticated_employee.id,
    "employee_name": authenticated_employee.name,
    "employee_role": authenticated_employee.role,
    "bakery_id": authenticated_employee.bakery_id,
    "sub": str(authenticated_employee.bakery_id),
    "requires_password_change": is_default_password  # ✨ NEW FLAG
}
```

**What it does**:
- Checks if the employee's password matches the default "Employee123!"
- Adds `requires_password_change: true/false` flag to the JWT token
- Frontend can detect this flag and redirect accordingly

---

#### New Token After Password Change
**Location**: `backend/app/routes/auth_routes.py` (lines ~600-618)

```python
# 🔑 GENERATE NEW TOKEN (without requires_password_change flag)
new_token_data = {
    "type": "employee",
    "employee_id": employee.id,
    "employee_name": employee.name,
    "employee_role": employee.role,
    "bakery_id": employee.bakery_id,
    "sub": str(employee.bakery_id),
    "requires_password_change": False  # ✅ Password has been changed
}
new_token = create_access_token(new_token_data)

return {
    "message": "Password changed successfully",
    "employee_id": employee.id,
    "employee_name": employee.name,
    "access_token": new_token,  # ✨ Return new token
    "token_type": "bearer"
}
```

**What it does**:
- After successful password change, generates a NEW token
- New token has `requires_password_change: false`
- Employee can now access dashboard without being redirected

---

### 2. Frontend Changes

#### A. Login Component (`Login.jsx`)

**Location**: `frontend/src/pages/Login.jsx` (lines ~138-163)

```javascript
if (accountType === "employee") {
    // Employee login - use EmployeeAuthContext
    employeeLogin(token);
    localStorage.setItem("bakery_id_for_employee_login", decoded.bakery_id);
    
    // 🔐 CHECK IF EMPLOYEE NEEDS TO CHANGE DEFAULT PASSWORD
    if (decoded.requires_password_change) {
        Swal.fire({
            icon: "info",
            title: "Password Change Required",
            text: "For security, please change your default password",
            timer: 2000,
            showConfirmButton: false
        });
        
        // Redirect to password change page
        setTimeout(() => {
            navigate("/employee-change-password");
        }, 2000);
        return; // ✨ STOP HERE - don't go to dashboard
    }
    
    // Navigate to bakery dashboard (only if password is changed)
    navigate(`/bakery-dashboard/${decoded.bakery_id}`);
    
    Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: `Logged in as ${decoded.employee_name} (${decoded.employee_role})`,
        timer: 2000,
        showConfirmButton: false
    });
}
```

**What it does**:
- Decodes the token to check `requires_password_change` flag
- If `true`: Shows info message and redirects to `/employee-change-password`
- If `false`: Normal login, redirects to dashboard

---

#### B. Employee Auth Context (`EmployeeAuthContext.jsx`)

**Location**: `frontend/src/context/EmployeeAuthContext.jsx` (lines ~7-37)

```javascript
const [employee, setEmployee] = useState(() => {
    const token = localStorage.getItem("employeeToken");
    if (!token) return null;
    try {
        const decoded = jwtDecode(token);
        return {
            employee_id: decoded.employee_id,
            employee_name: decoded.employee_name,
            employee_role: decoded.employee_role,
            bakery_id: decoded.bakery_id,
            requires_password_change: decoded.requires_password_change || false, // ✨ NEW
            token
        };
    } catch {
        localStorage.removeItem("employeeToken");
        return null;
    }
});

const login = (token) => {
    const decoded = jwtDecode(token);
    const employeeData = {
        employee_id: decoded.employee_id,
        employee_name: decoded.employee_name,
        employee_role: decoded.employee_role,
        bakery_id: decoded.bakery_id,
        requires_password_change: decoded.requires_password_change || false, // ✨ NEW
        token
    };
    setEmployee(employeeData);
    localStorage.setItem("employeeToken", token);
};
```

**What it does**:
- Stores the `requires_password_change` flag in the employee context
- Available throughout the app if needed for additional checks

---

#### C. Employee Change Password (`EmployeeChangePassword.jsx`)

**Location**: `frontend/src/pages/EmployeeChangePassword.jsx` (lines ~165-182)

```javascript
const response = await axios.post(
    `${API}/employee-change-password`,
    {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
    },
    {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }
);

// 🔑 UPDATE TOKEN WITH NEW ONE (without requires_password_change flag)
if (response.data.access_token) {
    const newToken = response.data.access_token;
    employeeLogin(newToken); // ✨ Update context with new token
}

Swal.fire({
    icon: "success",
    title: "Password Changed",
    text: "Your password has been updated successfully!",
    timer: 1500,
});

// Redirect to dashboard
setTimeout(() => {
    navigate(`/bakery-dashboard/${employee?.bakery_id}?mode=employee`);
}, 1500);
```

**What it does**:
- After successful password change, receives new token from backend
- Updates the EmployeeAuthContext with new token (has `requires_password_change: false`)
- Redirects to dashboard - employee can now access normally

---

## 🔄 Complete User Flow

### First Login (Default Password)

```
1. Employee enters name + "Employee123!" → Login.jsx
2. Backend authenticates and returns token with requires_password_change: true
3. Login.jsx detects flag is true
4. Shows "Password Change Required" message
5. Redirects to /employee-change-password
6. Employee changes password
7. Backend returns NEW token with requires_password_change: false
8. Context updated with new token
9. Redirects to dashboard
10. ✅ Employee can now use the system normally
```

### Subsequent Logins (Custom Password)

```
1. Employee enters name + custom password → Login.jsx
2. Backend authenticates and returns token with requires_password_change: false
3. Login.jsx detects flag is false
4. Directly redirects to dashboard
5. ✅ Normal access
```

---

## 🎯 Key Features

### Security
- ✅ Default password detection on backend (secure)
- ✅ Forces password change before system access
- ✅ New token issued after password change
- ✅ No way to bypass the password change flow

### User Experience
- ✅ Automatic redirection (no manual steps)
- ✅ Clear messaging about why password change is needed
- ✅ Password strength indicator
- ✅ Seamless transition after password change

### Token Management
- ✅ Old token includes `requires_password_change: true`
- ✅ New token includes `requires_password_change: false`
- ✅ Context automatically updated with new token
- ✅ No need to re-login after password change

---

## 🧪 Testing Checklist

### Test Case 1: First Login with Default Password
- [ ] Login with employee name + "Employee123!"
- [ ] Verify "Password Change Required" message appears
- [ ] Verify redirect to /employee-change-password
- [ ] Change password successfully
- [ ] Verify redirect to dashboard
- [ ] Verify dashboard loads normally

### Test Case 2: Login After Password Change
- [ ] Logout from dashboard
- [ ] Login with employee name + new custom password
- [ ] Verify NO redirect to password change page
- [ ] Verify dashboard loads directly

### Test Case 3: Password Change Validation
- [ ] Try weak password (should warn)
- [ ] Try mismatched passwords (should error)
- [ ] Try password less than 8 characters (should error)
- [ ] Try same as current password (should error)

### Test Case 4: Token Verification
- [ ] After first login, check token in browser DevTools
  - Should have `requires_password_change: true`
- [ ] After password change, check new token
  - Should have `requires_password_change: false`

---

## 🐛 Troubleshooting

### Issue: Employee stuck on password change page
**Solution**: Check if backend is returning new token with `requires_password_change: false`

### Issue: Employee can access dashboard with default password
**Solution**: Check if Login.jsx is properly checking the `decoded.requires_password_change` flag

### Issue: Token not updating after password change
**Solution**: Ensure `employeeLogin(newToken)` is called in EmployeeChangePassword.jsx

### Issue: Employee redirected to password change on every login
**Solution**: Verify backend is setting `requires_password_change: false` after successful password change

---

## 📝 Files Modified

### Backend
- ✅ `backend/app/routes/auth_routes.py`
  - Added default password detection
  - Modified token to include `requires_password_change` flag
  - Modified password change endpoint to return new token

### Frontend
- ✅ `frontend/src/pages/Login.jsx`
  - Added check for `requires_password_change` flag
  - Added redirect logic to password change page

- ✅ `frontend/src/context/EmployeeAuthContext.jsx`
  - Added `requires_password_change` to employee state

- ✅ `frontend/src/pages/EmployeeChangePassword.jsx`
  - Modified to receive and use new token from backend
  - Updated context with new token

---

## ✅ Implementation Complete

The default password change flow is now fully integrated into the unified login system. Employees using the default password "Employee123!" will be automatically redirected to change their password before accessing the dashboard.

**Default Password**: `Employee123!`
**Minimum New Password Length**: 8 characters
**Route**: `/employee-change-password`
