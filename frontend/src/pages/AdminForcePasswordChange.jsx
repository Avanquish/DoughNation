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

  // === PASSWORD VALIDATION LOGIC (UNCHANGED) ===
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

    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
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

  // === SUBMIT HANDLER (LOGIC UNCHANGED) ===
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
          html: `<ul style="text-align: left; margin-left: 20px;">${validationErrors
            .map((err) => `<li>${err}</li>`)
            .join("")}</ul>`,
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
        "https://api.doughnationhq.cloud/admin/force-change-password",
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

  // === PASSWORD STRENGTH (UNCHANGED LOGIC, UI ONLY) ===
  const passwordStrength = (password) => {
    const errors = validatePassword(password);
    if (password.length === 0)
      return { strength: 0, label: "Empty", color: "bg-gray-300" };
    if (errors.length > 3)
      return { strength: 25, label: "Weak", color: "bg-red-500" };
    if (errors.length > 1)
      return { strength: 50, label: "Fair", color: "bg-yellow-500" };
    if (errors.length === 1)
      return { strength: 75, label: "Good", color: "bg-blue-500" };
    return { strength: 100, label: "Strong", color: "bg-green-500" };
  };

  const strength = passwordStrength(newPassword);

  // === MAIN RETURN (ALL UI / STYLING SECTION) ===
  return (
    <div
      className="relative min-h-svh overflow-hidden flex items-center justify-center p-4 sm:p-6"
      style={{ background: "#fffaf3", color: "#1e2329" }}
    >
      {/* === GLOBAL SMALL STYLES FOR THIS SCREEN ONLY === */}
      <style>{`
        :root {
          --title-lg: clamp(26px, 2vw + 1rem, 36px);
          --brand: clamp(22px, 1.1vw + 1rem, 24px);
        }

        /* Hide browser's built-in password reveal icon (Edge/IE) */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* === BACKGROUND LAYERS === */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat will-change-transform pointer-events-none filter blur-[2px] brightness-90 saturate-95"
        style={{
          backgroundImage: "url('/images/bakeryregistration.jpg')",
          transform: "scale(1.06)",
        }}
      />
      <div className="absolute inset-0 z-10 bg-[#FFF8F0]/30" />
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_10%,rgba(0,0,0,0)_65%,rgba(0,0,0,0.10)_100%)]" />

      {/* === MAIN CARD WRAPPER === */}
      <div className="relative z-20 w-full max-w-[480px]">
        <Card className="relative rounded-[22px] backdrop-blur-2xl bg-white/60 border-white/60 shadow-[0_16px_56px_rgba(0,0,0,0.18)]">
          <div className="absolute inset-0 pointer-events-none rounded-[22px] bg-gradient-to-b from-[#FFF8F0]/55 via-transparent to-[#FFF8F0]/45" />

          {/* === HEADER / BRAND AREA === */}
          <CardHeader className="relative z-10 text-center pt-6 pb-4 space-y-2">
            <div className="flex items-center justify-center mb-1">
              <span
                className="font-extrabold tracking-wide bg-gradient-to-r from-[#fed09b] via-[#e0a864] to-[#c38437] bg-clip-text text-transparent"
                style={{ fontSize: "var(--brand)" }}
              >
                DoughNation
              </span>
            </div>

            {/* Icon + title */}
            <div className="flex justify-center mb-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f8b86a] to-[#dd9f53] rounded-full blur-lg opacity-60" />
                <div className="relative bg-gradient-to-r from-[#f5b15f] to-[#d18b3b] p-4 rounded-full shadow-md">
                  <ShieldCheck className="h-11 w-11 text-white" />
                </div>
              </div>
            </div>

            <CardTitle
              className="text-3xl font-bold bg-gradient-to-r from-[#f8b86a] via-[#dd9f53] to-[#ce893b] bg-clip-text text-transparent"
              style={{ fontSize: "var(--title-lg)" }}
            >
              Security Alert
            </CardTitle>
            <CardDescription className="text-sm sm:text-base bg-gradient-to-r from-[#E3B57E] via-[#C39053] to-[#A66B2E] bg-clip-text text-transparent">
              Change your default password to continue to the admin dashboard.
            </CardDescription>
          </CardHeader>

          {/* === CONTENT / FORM AREA === */}
          <CardContent className="relative z-10 pt-1 pb-6">
            {/* === WARNING BANNER === */}
            <div className="bg-[#FFF4E5] border border-[#F6BE83]/70 rounded-xl p-4 mb-6 shadow-[0_8px_22px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FDE2BF] text-[#b76a23] flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="text-sm text-[#7a4c1c]">
                  <p className="font-semibold mb-1">
                    Default Password Detected
                  </p>
                  <p className="text-xs sm:text-sm leading-relaxed">
                    For security reasons, you must change your password before
                    accessing the admin dashboard. Please create a strong,
                    unique password you don&apos;t use anywhere else.
                  </p>
                </div>
              </div>
            </div>

            {/* === FORM START === */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* === NEW PASSWORD FIELD === */}
              <div className="space-y-2">
                <Label
                  htmlFor="newPassword"
                  className="text-sm font-semibold text-[#8f642a]"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#d3a36b]" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-xl bg-white/90 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] focus:border-[#E3B57E] transition-[border,box-shadow]"
                    placeholder="Create new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f] transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* === PASSWORD STRENGTH INDICATOR === */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#a47134]/85">
                        Password Strength:
                      </span>
                      <span
                        className={`font-semibold ${
                          strength.label === "Strong"
                            ? "text-emerald-600"
                            : strength.label === "Good"
                            ? "text-blue-600"
                            : strength.label === "Fair"
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#FFE1BE]/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.strength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* === CONFIRM PASSWORD FIELD === */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-semibold text-[#8f642a]"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#d3a36b]" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-xl bg-white/90 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] focus:border-[#E3B57E] transition-[border,box-shadow]"
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* === PASSWORDS MATCH / NOT MATCH INDICATOR === */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-xs mt-2">
                    {newPassword === confirmPassword ? (
                      <>
                        <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                        <span className="text-emerald-700 font-medium">
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-rose-500 rounded-full" />
                        <span className="text-rose-600 font-medium">
                          Passwords don&apos;t match
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* === PASSWORD REQUIREMENTS BOX === */}
              <div className="bg-[#FFF7EC] border border-[#FFE1BE] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#8f642a] mb-2">
                  Password Requirements
                </p>
                <ul className="text-xs text-[#a47134] space-y-1.5">
                  <li className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        newPassword.length >= 8
                          ? "bg-emerald-500"
                          : "bg-[#E3B57E]"
                      }`}
                    />
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        /[A-Z]/.test(newPassword)
                          ? "bg-emerald-500"
                          : "bg-[#E3B57E]"
                      }`}
                    />
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        /[a-z]/.test(newPassword)
                          ? "bg-emerald-500"
                          : "bg-[#E3B57E]"
                      }`}
                    />
                    One lowercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        /[0-9]/.test(newPassword)
                          ? "bg-emerald-500"
                          : "bg-[#E3B57E]"
                      }`}
                    />
                    One number
                  </li>
                  <li className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
                          ? "bg-emerald-500"
                          : "bg-[#E3B57E]"
                      }`}
                    />
                    One special character
                  </li>
                </ul>
              </div>

              {/* === SUBMIT BUTTON === */}
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  newPassword !== confirmPassword ||
                  !newPassword
                }
                className="w-full h-12 text-[15px] sm:text-[16px] text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E] hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Changing Password...
                  </span>
                ) : (
                  "Change Password & Continue"
                )}
              </Button>
            </form>

            {/* === FOOTER TEXT / SUPPORT LINK === */}
            <div className="mt-6 text-center space-y-1">
              <p className="text-[11px] text-[#b88950]/80">
                This extra step keeps your DoughNation admin account safe.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminForcePasswordChange;