import { Navigate } from "react-router-dom";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";

/**
 * EmployeeProtectedRoute - Guards routes that require employee authentication
 * Redirects to home (/) if not authenticated
 */
const EmployeeProtectedRoute = ({ children }) => {
  const { employee } = useEmployeeAuth();

  console.log("🔒 EmployeeProtectedRoute - Employee data:", employee);

  if (!employee) {
    console.log("❌ No employee data, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("✅ Employee authenticated, rendering protected content");
  return children;
};

export default EmployeeProtectedRoute;
