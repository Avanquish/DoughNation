import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react";

const API = "http://localhost:8000";

const EmployeeChangePassword = () => {
  const { employee, logout: employeeLogout } = useEmployeeAuth();
  const navigate = useNavigate();

  // Debug: Check if component is rendering
  useEffect(() => {
    console.log("🔍 EmployeeChangePassword component mounted");
    console.log("Employee data:", employee);
  }, [employee]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

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

  // Check password strength
  useEffect(() => {
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
    setPasswordStrength(strength);
  }, [newPassword]);

  // Get strength color and text
  const getStrengthInfo = () => {
    if (passwordStrength === 0) return { color: "bg-gray-200", text: "Weak" };
    if (passwordStrength === 1) return { color: "bg-red-400", text: "Weak" };
    if (passwordStrength === 2) return { color: "bg-yellow-400", text: "Fair" };
    if (passwordStrength === 3) return { color: "bg-blue-400", text: "Good" };
    return { color: "bg-green-400", text: "Strong" };
  };

  const strengthInfo = getStrengthInfo();

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Validation
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all fields",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "Passwords Don't Match",
        text: "New password and confirm password must match",
      });
      return;
    }

    if (newPassword.length < 8) {
      Swal.fire({
        icon: "warning",
        title: "Password Too Short",
        text: "Password must be at least 8 characters",
      });
      return;
    }

    if (currentPassword === newPassword) {
      Swal.fire({
        icon: "warning",
        title: "Same Password",
        text: "New password must be different from current password",
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("employeeToken");
      
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Error",
          text: "No authentication token found. Please login again.",
        });
        navigate("/");
        return;
      }

      console.log("📤 Sending password change request with token");
      
      await axios.post(
        `${API}/employee-change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Show success message and wait for it to complete
      await Swal.fire({
        icon: "success",
        title: "Password Changed Successfully!",
        text: "Your password has been updated. Please login again with your new password.",
        timer: 2000,
        showConfirmButton: false,
      });

      // Clear employee session, tab preference, and redirect to Home page
      employeeLogout();
      localStorage.removeItem("bakery_active_tab"); // Clear stored tab
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Password change error:", error);
      const detail =
        error.response?.data?.detail ||
        "Failed to change password. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Password Change Failed",
        text: detail,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If no employee data is loaded, redirect to home after timeout
  useEffect(() => {
    if (!employee) {
      const timer = setTimeout(() => {
        console.log("⚠️ No employee data found, redirecting to home page");
        navigate("/", { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [employee, navigate]);

  // If no employee data is loaded, show loading
  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-[#fef9f0] to-[#efe8d8] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg text-gray-600">Loading employee data...</p>
              <p className="text-sm text-gray-500 mt-2">
                Redirecting to home page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-[#2d1f0f]">
              Change Password
            </CardTitle>
            <CardDescription className="text-[#8a5a25]">
              Update your password (required on first login)
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Info banner */}
            <div className="mb-6 p-3 bg-blue-50 border-l-4 border-l-blue-400 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  For security, please set a new password on your first login.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[#2d1f0f]">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="border-[#d4a574] bg-white text-[#2d1f0f] pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a5a25] hover:text-[#2d1f0f]"
                    disabled={isLoading}
                  >
                    {showCurrent ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#2d1f0f]">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-[#d4a574] bg-white text-[#2d1f0f] pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a5a25] hover:text-[#2d1f0f]"
                    disabled={isLoading}
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1 h-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all ${
                            i < passwordStrength
                              ? strengthInfo.color
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#8a5a25]">
                      Strength: <span className="font-semibold">{strengthInfo.text}</span>
                    </p>
                  </div>
                )}

                <p className="text-xs text-[#a47134]/80">
                  Use a mix of letters, numbers & symbols (min 8 characters).
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#2d1f0f]">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-[#d4a574] bg-white text-[#2d1f0f] pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a5a25] hover:text-[#2d1f0f]"
                    disabled={isLoading}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Passwords match indicator */}
              {newPassword && confirmPassword && (
                <div
                  className={`text-sm p-2 rounded ${
                    newPassword === confirmPassword
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {newPassword === confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords don't match"}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full mt-6 bg-gradient-to-r from-[#d4a574] to-[#8a5a25] hover:from-[#c49564] hover:to-[#7a4a15] text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="mt-4 border-0 shadow-lg bg-amber-50 border-l-4 border-l-amber-400">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">
              <strong>Default password:</strong> Employee123!
              <br />
              <strong>Remember:</strong> Change it to something secure that only you know.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeChangePassword;
