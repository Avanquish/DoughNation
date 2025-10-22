import { Navigate } from "react-router-dom";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";

/**
 * BakeryDashboardRoute - Unified route guard for BakeryDashboard
 * Allows access for:
 * 1. Bakery owners (with valid "token" in localStorage)
 * 2. Employees (with valid "employeeToken" in localStorage)
 * 
 * Redirects to home (/) if neither authentication is present
 */
const BakeryDashboardRoute = ({ children }) => {
  const { employee } = useEmployeeAuth();

  console.log("🔒 BakeryDashboardRoute - Checking authentication");

  // Check for employee authentication first
  if (employee) {
    console.log("✅ Employee authenticated:", employee.employee_name);
    return children;
  }

  // Check for bakery owner authentication
  const bakeryToken = localStorage.getItem("token");
  if (bakeryToken) {
    try {
      const decoded = JSON.parse(atob(bakeryToken.split(".")[1]));
      
      // Verify it's a bakery token
      if (decoded.type === "bakery" || decoded.role === "Bakery") {
        console.log("✅ Bakery owner authenticated:", decoded.name);
        return children;
      }
    } catch (error) {
      console.error("❌ Invalid bakery token:", error);
    }
  }

  // Neither employee nor bakery owner is authenticated
  console.log("❌ No valid authentication, redirecting to home");
  return <Navigate to="/" replace />;
};

export default BakeryDashboardRoute;
