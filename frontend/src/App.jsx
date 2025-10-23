import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import EmployeeProtectedRoute from "./routes/EmployeeProtectedRoute";
import BakeryDashboardRoute from "./routes/BakeryDashboardRoute";

import Login from './pages/Login';
import EmployeeChangePassword from './pages/EmployeeChangePassword';
import Home from './pages/Home';
import Register from './pages/Register';
import BakeryDashboard from "./pages/BakeryDashboard";
import CharityDashboard from "./pages/CharityDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/BakeryProfile";
import CharityProfile from "./pages/CharityProfile";
import ForgotPassword from "./pages/ForgetPassword";
import PrivacyTerms from "./pages/PrivacyTerms";

function App() {
  return (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/employee-change-password" element={<EmployeeProtectedRoute><EmployeeChangePassword /></EmployeeProtectedRoute>} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/privacy-terms" element={<PrivacyTerms/>} />

          {/* Unified Bakery Dashboard Route - handles both bakery owners and employees */}
          <Route path="/bakery-dashboard/:id" element={<BakeryDashboardRoute><BakeryDashboard /></BakeryDashboardRoute>} />
          
          {/* Bakery Profile - accessible by both bakery owners and employees */}
          <Route path="/bakery-dashboard/:id/profile" element={<BakeryDashboardRoute><Profile /></BakeryDashboardRoute>} />

          <Route element={<ProtectedRoute allowedRoles={["Charity"]} />}>
            <Route path="/charity-dashboard/:id" element={<CharityDashboard />} />
            <Route path="/charity-dashboard/:id/profile" element={<CharityProfile />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
            <Route path="/admin-dashboard/:id" element={<AdminDashboard />} />
          </Route>

          </Routes> 
  )
}

export default App;
