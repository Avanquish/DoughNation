import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";

const EmployeeAuthContext = createContext();

export const EmployeeAuthProvider = ({ children }) => {
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
      token
    };
    setEmployee(employeeData);
    localStorage.setItem("employeeToken", token);
  };

  const logout = () => {
    setEmployee(null);
    localStorage.removeItem("employeeToken");
  };

  return (
    <EmployeeAuthContext.Provider value={{ employee, login, logout }}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export const useEmployeeAuth = () => useContext(EmployeeAuthContext);
