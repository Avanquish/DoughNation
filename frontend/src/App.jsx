import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from './pages/Login';
import Home from './pages/Home';
import Register from './pages/Register';
import BakeryDashboard from "./pages/BakeryDashboard";
import CharityDashboard from "./pages/CharityDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute allowedRoles={["Bakery"]} />}>
            <Route path="/bakery-dashboard/:id" element={<BakeryDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["Charity"]} />}>
            <Route path="/charity-dashboard/:id" element={<CharityDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
            <Route path="/admin-dashboard/:id" element={<AdminDashboard />} />
          </Route>

          </Routes> 
  )
}

export default App;
