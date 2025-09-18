from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, database
from app.auth import get_current_employee 

def require_role(required_roles: list[str]):
    def role_checker(current_employee: models.Employee = Depends(get_current_employee)):
        if current_employee.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(required_roles)}",
            )
        return current_employee
    return role_checker