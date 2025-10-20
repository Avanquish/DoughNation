import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import EmployeeProtectedRoute from "./routes/EmployeeProtectedRoute";

import Login from './pages/Login';
import EmployeeLogin from './pages/EmployeeLogin';
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
          <Route path="/employee-login" element={<EmployeeLogin />} />
          <Route path="/employee-change-password" element={<EmployeeProtectedRoute><EmployeeChangePassword /></EmployeeProtectedRoute>} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/privacy-terms" element={<PrivacyTerms/>} />

          <Route element={<ProtectedRoute allowedRoles={["Bakery"]} />}>
            <Route path="/bakery-dashboard/:id" element={<BakeryDashboard />} />
            <Route path="/bakery-dashboard/:id/profile" element={<Profile />} />
          </Route>

          {/* Employee routes - when accessing bakery dashboard as employee */}
          <Route element={<EmployeeProtectedRoute />}>
            <Route path="/bakery-dashboard/:id" element={<BakeryDashboard />} />
          </Route>

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
