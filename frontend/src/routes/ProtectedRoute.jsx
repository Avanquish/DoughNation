import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  const isRoleAllowed = allowedRoles.includes(user.role);

  // 🔐 CHECK IF ADMIN NEEDS TO CHANGE DEFAULT PASSWORD
  if (user.role === "Admin" && user.using_default_password) {
    return <Navigate to="/admin-force-password-change" replace />;
  }

  return isRoleAllowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;