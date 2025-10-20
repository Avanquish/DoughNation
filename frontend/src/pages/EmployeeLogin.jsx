import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import axios from "axios";
import Swal from "sweetalert2";

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Lock, Users } from "lucide-react";

const API = "http://localhost:8000";

const EmployeeLogin = () => {
  const { login } = useEmployeeAuth();
  const navigate = useNavigate();

  const [employeeName, setEmployeeName] = useState("");
  const [password, setPassword] = useState("");
  const [bakeryId, setBakeryId] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Extract bakery_id from URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bakeryIdFromUrl = params.get("bakery_id");
    
    if (bakeryIdFromUrl) {
      const bakeryIdInt = parseInt(bakeryIdFromUrl, 10);
      setBakeryId(bakeryIdInt.toString());
    } else {
      // Fallback to localStorage if available
      const storedBakeryId = localStorage.getItem("bakery_id_for_employee_login");
      if (storedBakeryId) {
        const bakeryIdInt = parseInt(storedBakeryId, 10);
        setBakeryId(bakeryIdInt.toString());
      }
    }
  }, []);

  // Parallax background
  const bgRef = useRef(null);
  const rafRef = useRef(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  const enableParallax =
    typeof window !== "undefined" &&
    window.matchMedia &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(pointer: coarse)").matches;

  const lerp = (a, b, t) => a + (b - a) * t;

  const loop = useCallback(() => {
    const max = 22;
    currentRef.current.x = lerp(
      currentRef.current.x,
      targetRef.current.x * max,
      0.075
    );
    currentRef.current.y = lerp(
      currentRef.current.y,
      targetRef.current.y * max,
      0.075
    );
    if (bgRef.current) {
      bgRef.current.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0) scale(1.06)`;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (!enableParallax) return;
    const raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enableParallax, loop]);

  const onMouseMove = (e) => {
    if (!enableParallax) return;
    const { innerWidth: w, innerHeight: h } = window;
    targetRef.current = {
      x: (e.clientX / w - 0.5) * -1,
      y: (e.clientY / h - 0.5) * -1,
    };
  };

  const onMouseLeave = () => (targetRef.current = { x: 0, y: 0 });

  // Handle employee login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!employeeName.trim() || !password.trim() || !bakeryId.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all fields",
      });
      return;
    }

    setIsLoading(true);
    try {
      const loginData = {
        name: employeeName,
        password,
        bakery_id: parseInt(bakeryId),
      };
      
      console.log("📤 Sending employee login request:", loginData);
      
      const res = await axios.post(`${API}/employee-login`, loginData);

      console.log("📥 Login response:", res.data);
      
      const token = res.data.access_token;
      const employeeData = res.data;

      // IMPORTANT: Clear any bakery owner token to avoid conflicts
      localStorage.removeItem("token");
      
      // Store employee token and employee data using the context
      login(token);

      // Clear the temporary bakery_id from localStorage
      localStorage.removeItem("bakery_id_for_employee_login");

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome, ${employeeData.employee_name}!`,
        timer: 1500,
        showConfirmButton: false,
      });

      // Check if using default password - if so, redirect to password change
      const isDefaultPassword = password === "Employee123!";
      
      // Redirect to password change if default password, otherwise to dashboard
      setTimeout(() => {
        if (isDefaultPassword) {
          console.log("🔄 Redirecting to password change page (default password detected)");
          navigate("/employee-change-password");
        } else {
          console.log(`🔄 Redirecting to bakery dashboard (bakery_id: ${employeeData.bakery_id})`);
          navigate(`/bakery-dashboard/${employeeData.bakery_id}?mode=employee`);
        }
      }, 1500);
    } catch (error) {
      console.error("❌ Employee login error:", error);
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
      
      const detail =
        error.response?.data?.detail ||
        "Login failed. Please check your credentials.";
      
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: detail,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-[#fef9f0] to-[#efe8d8] flex items-center justify-center p-4 relative overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Background decoration */}
      <div
        ref={bgRef}
        className="absolute inset-0 opacity-40 will-change-transform"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238a5a25' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-[#d4a574] to-[#8a5a25] p-3 rounded-full">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-[#2d1f0f]">
              Employee Login
            </CardTitle>
            <CardDescription className="text-[#8a5a25]">
              Log in to your bakery employee account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Employee Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#2d1f0f]">
                  Employee Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="border-[#d4a574] bg-white text-[#2d1f0f] placeholder-gray-400"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#2d1f0f]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-[#d4a574] bg-white text-[#2d1f0f] pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a5a25] hover:text-[#2d1f0f]"
                    disabled={isLoading}
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bakery ID */}
              <div className="space-y-2">
                <Label htmlFor="bakeryId" className="text-[#2d1f0f]">
                  Bakery ID
                </Label>
                <Input
                  id="bakeryId"
                  type="number"
                  placeholder="123"
                  value={bakeryId}
                  onChange={(e) => setBakeryId(e.target.value)}
                  className="border-[#d4a574] bg-gray-100 text-[#2d1f0f] placeholder-gray-400"
                  disabled={true}
                  title="Bakery ID is pre-filled from your login"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full mt-6 bg-gradient-to-r from-[#d4a574] to-[#8a5a25] hover:from-[#c49564] hover:to-[#7a4a15] text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Login
                  </>
                )}
              </Button>

              {/* Links */}
              <div className="text-center space-y-2 text-sm">
                <Link
                  to="/"
                  className="block text-[#8a5a25] hover:text-[#d4a574] transition"
                >
                  Back to User Login
                </Link>
                <p className="text-gray-500">
                  Don't have an employee account?{" "}
                  <span className="text-[#8a5a25] font-semibold">
                    Contact your bakery manager
                  </span>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-4 border-0 shadow-lg bg-blue-50 border-l-4 border-l-blue-400">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> This login is exclusively for bakery employees.
              If you're a bakery owner or charity representative, please use the{" "}
              <Link to="/" className="text-[#8a5a25] font-semibold hover:underline">
                main login page
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeLogin;
