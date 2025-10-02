import { Navigate, Outlet } from "react-router-dom";
import jwtDecode from "jwt-decode";

const PrivateRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/" replace />;

  try {
    const decoded = jwtDecode(token);
    const isRoleAllowed = allowedRoles.includes(decoded.role);

    return isRoleAllowed ? <Outlet /> : <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;
