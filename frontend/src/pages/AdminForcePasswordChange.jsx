import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
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
import { Lock, Eye, EyeOff, AlertTriangle, ShieldCheck } from "lucide-react";

const AdminForcePasswordChange = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Include at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Include at least one lowercase letter");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Include at least one number");
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Include at least one special character");
    }
    
    if (password === "admin1234") {
      errors.push("Cannot use the default password");
    }
    
    if (password === "Employee123!") {
      errors.push("Cannot use the employee default password");
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        Swal.fire({
          icon: "error",
          title: "Passwords Don't Match",
          text: "Please make sure both passwords are identical.",
          confirmButtonColor: "#A97142",
        });
        setIsSubmitting(false);
        return;
      }

      // Validate password strength
      const validationErrors = validatePassword(newPassword);
      if (validationErrors.length > 0) {
        Swal.fire({
          icon: "error",
          title: "Weak Password",
          html: `<ul style="text-align: left; margin-left: 20px;">${validationErrors.map(err => `<li>${err}</li>`).join('')}</ul>`,
          confirmButtonColor: "#A97142",
        });
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem("token");
      
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Error",
          text: "Please log in again.",
          confirmButtonColor: "#A97142",
        });
        navigate("/login");
        return;
      }

      // Call the force password change endpoint
      const response = await axios.put(
        "http://localhost:8000/admin/force-change-password",
        {
          current_password: "", // Not needed for forced change
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Clear token to force fresh login with new password
        localStorage.removeItem("token");
        localStorage.removeItem("admin_active_tab");
        
        Swal.fire({
          icon: "success",
          title: "Password Changed Successfully!",
          text: "Your password has been updated. Please log in again with your new password.",
          confirmButtonColor: "#A97142",
        }).then(() => {
          // Redirect to home page for fresh login
          navigate("/");
        });
      }
    } catch (error) {
      console.error("Password change error:", error);

      let errorMessage = "Failed to change password. Please try again.";
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Swal.fire({
        icon: "error",
        title: "Password Change Failed",
        text: errorMessage,
        confirmButtonColor: "#A97142",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = (password) => {
    const errors = validatePassword(password);
    if (password.length === 0) return { strength: 0, label: "Empty", color: "bg-gray-300" };
    if (errors.length > 3) return { strength: 25, label: "Weak", color: "bg-red-500" };
    if (errors.length > 1) return { strength: 50, label: "Fair", color: "bg-yellow-500" };
    if (errors.length === 1) return { strength: 75, label: "Good", color: "bg-blue-500" };
    return { strength: 100, label: "Strong", color: "bg-green-500" };
  };

  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-orange-200">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full blur-lg opacity-50"></div>
              <div className="relative bg-gradient-to-r from-orange-500 to-yellow-500 p-4 rounded-full">
                <ShieldCheck className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
            Security Alert
          </CardTitle>
          <CardDescription className="text-base">
            Change your default password to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Default Password Detected</p>
                <p>
                  For security reasons, you must change your password before accessing the admin dashboard.
                  Please create a strong, unique password.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 border-2 focus:border-orange-400 transition-colors"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Password Strength:</span>
                    <span className={`font-semibold ${
                      strength.label === "Strong" ? "text-green-600" :
                      strength.label === "Good" ? "text-blue-600" :
                      strength.label === "Fair" ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.strength}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 border-2 focus:border-orange-400 transition-colors"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  {newPassword === confirmPassword ? (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600 font-medium">Passwords don't match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One number
                </li>
                <li className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One special character
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || newPassword !== confirmPassword || !newPassword}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Changing Password...
                </span>
              ) : (
                "Change Password & Continue"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help?{" "}
              <a href="mailto:support@doughnation.com" className="text-orange-600 hover:text-orange-700 font-semibold">
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminForcePasswordChange;
