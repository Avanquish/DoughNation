import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Swal from "sweetalert2";
import { Eye, EyeOff, Lock, Shield, AlertCircle } from "lucide-react";

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

const OneTimePasswordChange = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
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

  useEffect(() => {
    // Get user info from token
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUserInfo(decoded);

      // If user doesn't need to change password, redirect
      if (!decoded.must_change_password) {
        Swal.fire({
          title: "No Action Required",
          text: "You don't need to change your password.",
          icon: "info",
        }).then(() => {
          if (decoded.type === "bakery") {
            navigate(`/bakery-dashboard/${decoded.sub}`);
          } else if (decoded.type === "charity") {
            navigate(`/charity-dashboard/${decoded.sub}`);
          } else if (decoded.type === "admin") {
            navigate(`/admin-dashboard/${decoded.sub}`);
          } else {
            navigate("/");
          }
        });
      }
    } catch (error) {
      console.error("Failed to decode token:", error);
      navigate("/login");
    }
  }, [navigate]);

  // Check password strength
  useEffect(() => {
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[!@#$%^&*]/.test(newPassword)) strength++;
    setPasswordStrength(strength);
  }, [newPassword]);

  // Get strength color and text
  const getStrengthInfo = () => {
    if (passwordStrength === 0) return { color: "#e5e7eb", text: "Weak" };
    if (passwordStrength === 1) return { color: "#f87171", text: "Weak" };
    if (passwordStrength === 2) return { color: "#f59e0b", text: "Fair" };
    if (passwordStrength === 3) return { color: "#60a5fa", text: "Good" };
    return { color: "#22c55e", text: "Strong" };
  };

  const strengthInfo = getStrengthInfo();

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&*)";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      Swal.fire({
        title: "Error",
        text: "Passwords do not match",
        icon: "error",
      });
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Swal.fire({
        title: "Weak Password",
        text: passwordError,
        icon: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.put("/change-one-time-password", {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      Swal.fire({
        title: "Success!",
        html: `
          <div class="text-left">
            <p class="mb-3">${response.data.message}</p>
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
              <p class="text-sm text-green-800 font-semibold mb-2">✅ Your account is now secure</p>
              <ul class="text-sm text-green-700 space-y-1">
                <li>• Your one-time password has been replaced</li>
                <li>• You can now access all features</li>
                <li>• Keep your new password safe</li>
              </ul>
            </div>
          </div>
        `,
        icon: "success",
        confirmButtonText: "Go to Dashboard",
      }).then(() => {
        // Clear token and require re-login with new password
        localStorage.removeItem("token");
        navigate("/login", {
          state: {
            message: "Password changed successfully. Please login with your new password.",
          },
        });
      });
    } catch (error) {
      console.error("Failed to change password:", error);
      Swal.fire({
        title: "Error",
        text:
          error.response?.data?.detail ||
          "Failed to change password. Please try again.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ padding: "clamp(1rem, 2.5vw, 1.5rem)" }}
    >
      {/* Fluid tokens + animations */}
      <style>{`
        :root{
          --space-1: clamp(.5rem, 1.2vw, .75rem);
          --space-2: clamp(.75rem, 1.6vw, 1rem);
          --space-3: clamp(1rem, 2.2vw, 1.5rem);
          --space-4: clamp(1.25rem, 3vw, 2rem);
          --title-lg: clamp(1.5rem, 1rem + 1.6vw, 2.2rem);
          --title-md: clamp(1.35rem, 1rem + 1.4vw, 2rem);
          --title-sm: clamp(1.05rem, .9rem + .8vw, 1.25rem);
          --text: clamp(.95rem, .85rem + .25vw, 1.05rem);
          --radius: clamp(14px, 2vw, 20px);
        }
        @keyframes fadeUp { 0%{opacity:0; transform:translateY(12px)} 100%{opacity:1; transform:translateY(0)} }
        @keyframes brandPop { 0%{opacity:0; transform:translateY(8px) scale(.98); letter-spacing:.2px;}
                              60%{opacity:1; transform:translateY(-4px) scale(1.02); letter-spacing:.5px;}
                             100%{opacity:1; transform:translateY(0) scale(1); letter-spacing:0;} }
        @keyframes titleBounce { 0%{opacity:0; transform:translateY(18px) scale(.96);}
                                55%{opacity:1; transform:translateY(-6px) scale(1.04);}
                               100%{opacity:1; transform:translateY(0) scale(1);} }
        @keyframes subFade { 0%{opacity:0; transform:translateY(8px);} 100%{opacity:1; transform:translateY(0);} }

        /* hide native reveal controls */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display:none; }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-textfield-decoration-container,
        input[type="password"]::-webkit-clear-button {
          display:none !important; visibility:hidden; pointer-events:none;
        }
      `}</style>

      {/* Background (parallax) */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat will-change-transform pointer-events-none filter blur-[2px] brightness-95 saturate-98"
        style={{
          backgroundImage: "url('/images/bakeryregistration.jpg')",
          transform: "scale(1.06)",
        }}
      />
      <div className="absolute inset-0 z-10 bg-[#FFF8F0]/20" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(120%_120%_at_50%_10%,rgba(0,0,0,0)_65%,rgba(0,0,0,0.10)_100%)]" />

      {/* Main content */}
      <div
        className="relative z-20 w-full"
        style={{ maxWidth: "min(92vw, 720px)" }}
      >
        <Card
          className="relative backdrop-blur-2xl bg-white/55 border-white/60 shadow-[0_16px_56px_rgba(0,0,0,0.16)] overflow-hidden"
          style={{
            animation: "fadeUp 480ms ease-out both",
            borderRadius: "var(--radius)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-[inherit] bg-gradient-to-b from-[#FFF8F0]/45 via-transparent to-[#FFF8F0]/35" />

          <CardHeader className="text-center relative pt-6 pb-4">
            <div
              className="flex items-center justify-center gap-2 mb-1"
              style={{
                animation: "brandPop 700ms cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: "40ms",
              }}
            >
              <div className="bg-gradient-to-br from-[#fed09b] via-[#e0a864] to-[#c38437] p-3 rounded-full shadow">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>

            <CardTitle
              className="bg-gradient-to-r from-[#f8b86a] via-[#dd9f53] to-[#ce893b] bg-clip-text text-transparent"
              style={{
                animation:
                  "titleBounce 800ms cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: "160ms",
                fontSize: "var(--title-md)",
              }}
            >
              Change Your Password
            </CardTitle>

            <CardDescription
              className="bg-gradient-to-r from-[#E3B57E] via-[#C39053] to-[#A66B2E] bg-clip-text text-transparent"
              style={{
                animation: "subFade 520ms ease-out both",
                animationDelay: "320ms",
                fontSize: "var(--text)",
              }}
            >
              One-time password must be changed for security
            </CardDescription>
          </CardHeader>

          <CardContent className="relative pt-3 pb-8 px-5 sm:px-8">
            {/* Info banner */}
            <div className="mb-6 p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    One-Time Password Detected
                  </p>
                  <p className="text-xs text-amber-700">
                    For security reasons, you must change your one-time password
                    before accessing the system. This is a mandatory security
                    requirement.
                  </p>
                </div>
              </div>
            </div>

            {userInfo && (
              <div className="mb-6 p-4 bg-[#FFF7EC] border border-[#FFE1BE] rounded-xl">
                <p className="text-sm text-[#6c471d]">
                  <span className="font-semibold">Account:</span>{" "}
                  {userInfo.name || userInfo.email}
                </p>
                <p className="text-sm text-[#6c471d]">
                  <span className="font-semibold">Role:</span>{" "}
                  {userInfo.role || userInfo.type}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="newPassword"
                  className="text-[#8f642a]"
                  style={{ fontSize: "var(--title-sm)" }}
                >
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Create new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none pl-11 pr-11 h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] rounded-xl"
                    disabled={loading}
                    style={{ fontSize: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                    disabled={loading}
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="h-2 w-full bg-[#FFE1BE]/70 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(passwordStrength / 5) * 100}%`,
                          background: strengthInfo.color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#a47134]/80">
                      Strength:{" "}
                      <span className="font-semibold">{strengthInfo.text}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-[#8f642a]"
                  style={{ fontSize: "var(--title-sm)" }}
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none pl-11 pr-11 h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] rounded-xl"
                    disabled={loading}
                    style={{ fontSize: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                    disabled={loading}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* passwords match indicator */}
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
                        Passwords don't match
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Password Requirements */}
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
                        /[!@#$%^&*]/.test(newPassword)
                          ? "bg-emerald-500"
                          : "bg-[#E3B57E]"
                      }`}
                    />
                    One special character (!@#$%^&*)
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E] hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  loading ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword ||
                  newPassword.length < 8 ||
                  !/[A-Z]/.test(newPassword) ||
                  !/[a-z]/.test(newPassword) ||
                  !/[0-9]/.test(newPassword) ||
                  !/[!@#$%^&*]/.test(newPassword)
                }
                style={{
                  height: "clamp(2.75rem, 2.2rem + .8vw, 3rem)",
                  fontSize: "clamp(.92rem, .9rem + .2vw, 1.05rem)",
                }}
              >
                {loading ? (
                  <>
                    <Shield className="w-4 h-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="mt-4 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.08)] bg-amber-50/80 border-l-4 border-l-amber-400 rounded-2xl">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">
              🔒 <strong>Security Note:</strong> After changing your password,
              you will be logged out and required to login again with your new
              credentials.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OneTimePasswordChange;