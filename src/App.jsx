import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./pages/Login";
import Home from "./pages/Home";
import PrivacyTerms from "./pages/PrivacyTerms";
import Register from "./pages/Register";
import BakeryProfile from "./pages/BakeryProfile";
import CharityProfile from "./pages/CharityProfile";
import BakeryDashboard from "./pages/BakeryDashboard";
import CharityDashboard from "./pages/CharityDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy-terms" element={<PrivacyTerms />} />

      <Route element={<ProtectedRoute allowedRoles={["Bakery"]} />}>
        <Route path="/bakery-dashboard/:id" element={<BakeryDashboard />} />
        <Route
          path="/bakery-dashboard/:id/profile"
          element={<BakeryProfile />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Charity"]} />}>
        <Route path="/charity-dashboard/:id" element={<CharityDashboard />} />
        <Route
          path="/charity-dashboard/:id/profile"
          element={<CharityProfile />}
        />
        <Route path="/charity-profile" element={<CharityProfile />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
        <Route path="/admin-dashboard/:id" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
