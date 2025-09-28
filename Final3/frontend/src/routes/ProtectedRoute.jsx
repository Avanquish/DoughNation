import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  const isRoleAllowed = allowedRoles.includes(user.role);

  return isRoleAllowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;