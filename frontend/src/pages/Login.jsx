import { useState, useEffect, useRef } from "react";
import { useSubmitGuard } from "../hooks/useDebounce";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Store, Building2, Eye, EyeOff, Lock } from "lucide-react";

const ROLES = [
  { value: "Bakery", label: "Bakery", icon: Store },
  { value: "Charity", label: "Charity", icon: Heart },
  { value: "Admin", label: "Admin", icon: Building2 },
];

const Login = () => {
  const { login } = useAuth();
  const { login: employeeLogin } = useEmployeeAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(""); // Changed from 'email' - now accepts email OR name
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Bakery");
  const [showPass, setShowPass] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
  const loop = () => {
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
  };

  useEffect(() => {
    if (!enableParallax) return;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enableParallax]);

  const onMouseMove = (e) => {
    if (!enableParallax) return;
    const { innerWidth: w, innerHeight: h } = window;
    targetRef.current = {
      x: (e.clientX / w - 0.5) * -1,
      y: (e.clientY / h - 0.5) * -1,
    };
  };
  const onMouseLeave = () => (targetRef.current = { x: 0, y: 0 });

  // Tabs indicator
  const tabsListRef = useRef(null);
  const triggerRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measureIndicator = () => {
    const list = tabsListRef.current;
    const i = ROLES.findIndex((r) => r.value === role);
    const btn = triggerRefs.current[i];
    if (!list || !btn) return;
    const listBox = list.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    setIndicator({
      left: Math.round(btnBox.left - listBox.left),
      width: Math.round(btnBox.width),
    });
  };

  useEffect(() => {
    const raf = requestAnimationFrame(measureIndicator);
    const onResize = () => requestAnimationFrame(measureIndicator);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(measureIndicator);
    return () => cancelAnimationFrame(raf);
  }, [role]);

  // Handle unified login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    try {
      // 🔑 UNIFIED LOGIN: Send identifier (email or name) and password
      const res = await axios.post("http://localhost:8000/login", {
        email: identifier, // Backend still uses 'email' field, but accepts name too
        password,
        role, // Optional: can help with validation
      });

      const token = res.data.access_token;

      // 🔍 DECODE TOKEN to determine account type
      const decoded = JSON.parse(atob(token.split(".")[1]));
      console.log("🔐 Decoded token:", decoded);

      const accountType = decoded.type; // "bakery", "charity", "admin", or "employee"

      // ✅ VALIDATE: Employees can ONLY log in when slider is set to "Bakery"
      if (accountType === "employee" && role !== "Bakery") {
        Swal.fire({
          icon: "error",
          title: "Invalid Login Type",
          text: "Employee login is only allowed when the login type is set to 'Bakery'. Please switch the slider to Bakery and try again.",
          confirmButtonColor: "#A97142",
        });
        return; // Exit early - prevent login
      }

      // Store appropriate token
      if (accountType === "employee") {
        // Employee login - use EmployeeAuthContext

        // 🚫 CHECK IF BAKERY IS VERIFIED
        if (!decoded.bakery_verified) {
          Swal.fire({
            icon: "warning",
            title: "Bakery Not Verified",
            text: "Your bakery account is pending admin verification. Please wait until the bakery is verified before accessing the system.",
            confirmButtonColor: "#A97142",
          });
          return; // Exit early - prevent login
        }

        employeeLogin(token); // ✅ This updates the context AND localStorage
        localStorage.setItem("bakery_id_for_employee_login", decoded.bakery_id);

        // 🔐 CHECK IF EMPLOYEE NEEDS TO CHANGE DEFAULT PASSWORD
        if (decoded.requires_password_change) {
          Swal.fire({
            icon: "info",
            title: "Password Change Required",
            text: "For security, please change your default password",
            timer: 2000,
            showConfirmButton: false,
          });

          // Redirect to password change page
          setTimeout(() => {
            navigate("/employee-change-password");
          }, 2000);
          return;
        }

        // Clear any stored tab preference and navigate to bakery dashboard
        localStorage.setItem("bakery_active_tab", "dashboard");
        navigate(`/bakery-dashboard/${decoded.bakery_id}`);

        Swal.fire({
          icon: "success",
          title: "Welcome!",
          text: `Logged in as ${decoded.employee_name} (${decoded.employee_role})`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        // Regular user login (Bakery/Charity/Admin)
        login(token); // Use existing auth context

        const userId = decoded.sub;

        // Role-based redirection
        if (accountType === "bakery") {
          // 🚫 CHECK IF BAKERY IS VERIFIED
          if (!decoded.is_verified) {
            Swal.fire({
              icon: "warning",
              title: "Account Not Verified",
              text: "Your bakery account is pending admin verification. Please wait until an admin verifies your account before accessing the system.",
              confirmButtonColor: "#A97142",
            });
            // Clear the token since they can't access yet
            localStorage.removeItem("token");
            return; // Exit early - prevent navigation
          }

          // Clear any stored tab preference
          localStorage.setItem("bakery_active_tab", "dashboard");
          navigate(`/bakery-dashboard/${userId}`);
        } else if (accountType === "charity") {
          // 🚫 CHECK IF CHARITY IS VERIFIED
          if (!decoded.is_verified) {
            Swal.fire({
              icon: "warning",
              title: "Account Not Verified",
              text: "Your charity account is pending admin verification. Please wait until an admin verifies your account before accessing the system.",
              confirmButtonColor: "#A97142",
            });
            // Clear the token since they can't access yet
            localStorage.removeItem("token");
            return; // Exit early - prevent navigation
          }

          // Set default tab to "donation" (Available Donation)
          localStorage.setItem("charity_active_tab", "donation");
          navigate(`/charity-dashboard/${userId}`);
        } else if (accountType === "admin") {
          // 🔐 CHECK IF ADMIN NEEDS TO CHANGE DEFAULT PASSWORD
          if (decoded.using_default_password) {
            Swal.fire({
              icon: "warning",
              title: "Password Change Required",
              text: "For security, you must change your default password before accessing the system.",
              confirmButtonColor: "#A97142",
            });

            // Redirect to admin force password change page
            setTimeout(() => {
              navigate("/admin-force-password-change");
            }, 2000);
            return;
          }

          // Set default tab to "dashboard"
          localStorage.setItem("admin_active_tab", "dashboard");
          navigate(`/admin-dashboard/${userId}`);
        }

        // Success message based on account type
        let roleDisplay = "Owner"; // Default for Bakery/Charity owners
        if (accountType === "admin") {
          roleDisplay = "Admin";
        }

        Swal.fire({
          icon: "success",
          title: "Welcome Back!",
          text: `Logged in as ${decoded.contact_person} (${roleDisplay})`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please check your credentials.";

      if (error.response?.status === 403) {
        // Part-time employee blocked
        errorMessage =
          error.response.data.detail ||
          "Access denied. Part-time employees cannot log in to the system.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: errorMessage,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Render
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <style>{`
        :root{
          --space-1: clamp(.5rem, 1.2vw, .75rem);
          --space-2: clamp(.75rem, 1.6vw, 1rem);
          --space-3: clamp(1rem, 2.2vw, 1.5rem);
          --space-4: clamp(1.25rem, 3vw, 2rem);
          --radius: clamp(14px, 2.2vw, 22px);
          --title-xl: clamp(32px, 2.2rem + 2vw, 42px);
          --title-md: clamp(16px, .9rem + .8vw, 18px);
          --text: clamp(.95rem, .9rem + .2vw, 1.05rem);
        }

        @keyframes cardIn {
          0% { opacity: 0; transform: translateY(18px) scale(.96); }
          60%{ opacity: 1; transform: translateY(-6px) scale(1.01); }
          100%{ opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes headPop {
          0% { opacity:0; transform: translateY(12px) scale(.98); letter-spacing:.2px; }
          55%{ opacity:1; transform: translateY(-6px) scale(1.02); letter-spacing:.4px; }
          100%{ opacity:1; transform: translateY(0) scale(1); letter-spacing:0; }
        }
        @keyframes headBounce {
          0% { opacity:0; transform: translateY(16px) scale(.96); }
          55%{ opacity:1; transform: translateY(-4px) scale(1.03); }
          100%{ opacity:1; transform: translateY(0) scale(1); }
        }

        .left-hero-surface{
          background: linear-gradient(180deg,#fff9f2 0%,#fff4e8 40%,#ffe7cd 100%);
          border-right: 1px solid rgba(255,255,255,0.65);
          z-index: 0;
        }
        .left-wrap{ position:relative; overflow:hidden; }   /* contain absolute illu */
        .left-content{ position:relative; z-index:2; }      /* copy above image */

        .give-illu{
          position:absolute;
          right: clamp(18px, 3vw, 40px);
          bottom: clamp(18px, 4vh, 44px);
          width: clamp(180px, 28vw, 320px);
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 10px 24px rgba(0,0,0,.12));
          pointer-events: none;
          user-select: none;
          z-index: 1;                 /* stays UNDER .left-content */
          opacity: .95;
        }

        /* Desktop: reserve space so text never collides with the image */
        @media (min-width: 1025px){
          .left-content{ padding-right: clamp(140px, 20vw, 280px); }
        }

        /* ≤1024px: hide illustration & remove extra right padding */
        @media (max-width: 1024px){
          .give-illu{ display:none; }
          .left-content{ padding-right: 0; }
        }

        /* hide native reveal/clear so only our eye toggler shows */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-textfield-decoration-container,
        input[type="password"]::-webkit-clear-button {
          display: none !important; visibility: hidden; pointer-events: none;
        }

        @media (max-width: 380px){
          .shrink-pad{padding-left: var(--space-3) !important; padding-right: var(--space-3) !important;}
          .left-copy-padding{padding-left: var(--space-3) !important; padding-right: var(--space-3) !important;}
        }
      `}</style>

      {/* Background */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat will-change-transform pointer-events-none filter blur-[2px] brightness-90 saturate-95"
        style={{
          backgroundImage: "url('/images/bakerylogin.jpg')",
          transform: "scale(1.06)",
        }}
      />
      <div className="absolute inset-0 z-10 bg-[#FFF8F0]/20" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(120%_120%_at_50%_10%,rgba(0,0,0,0)_65%,rgba(0,0,0,0.10)_100%)]" />

      {/* Layout */}
      <div className="relative z-20 flex flex-col md:flex-row min-h-screen">
        {/* Login card */}
        <section className="order-1 md:order-2 md:basis-[55%] flex items-center justify-center px-6 pt-6 md:pt-0 py-10">
          <Card
            className="login-card relative w-full max-w-[680px] rounded-[26px] backdrop-blur-2xl bg-white/55 border-white/60 shadow-[0_16px_56px_rgba(0,0,0,0.16)]"
            style={{ animation: "cardIn 720ms cubic-bezier(.2,.7,.2,1) both" }}
          >
            <div className="absolute inset-0 pointer-events-none rounded-[26px] bg-gradient-to-b from-[#FFF8F0]/50 via-transparent to-[#FFF0E0]/45" />

            <CardHeader className="text-center relative pt-6 pb-2 shrink-pad">
              <div className="absolute inset-x-6 -top-2 h-28 rounded-2xl bg-white/55 blur-xl -z-0" />
              <div className="relative z-10 flex justify-center pt-1">
                <img
                  src="/images/DoughNationLogo.png"
                  alt="DoughNation"
                  loading="eager"
                  decoding="async"
                  className="h-[56px] sm:h-[64px] md:h-[82px] w-auto max-w-[520px] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,.06)]"
                  style={{
                    animation: "headPop 700ms cubic-bezier(.2,.7,.2,1) both",
                  }}
                />
              </div>

              <CardTitle
                className="relative z-10 mt-2 font-extrabold bg-gradient-to-r from-[#FFC66E] via-[#E88A1A] to-[#B86A1E] bg-clip-text text-transparent"
                style={{
                  fontSize: "var(--title-xl)",
                  animation:
                    "headBounce 800ms cubic-bezier(.2,.7,.2,1) both 80ms",
                }}
              >
                Welcome Back
              </CardTitle>

              <CardDescription
                className="relative z-10 bg-gradient-to-r from-[#C17B2A] via-[#AD6A21] to-[#8E5216] bg-clip-text text-transparent"
                style={{
                  fontSize: "var(--title-md)",
                  animation:
                    "headPop 680ms cubic-bezier(.2,.7,.2,1) both 120ms",
                }}
              >
                Sign in to your account
              </CardDescription>
            </CardHeader>

            <CardContent className="relative pt-2 pb-6 shrink-pad">
              <form onSubmit={handleLogin} className="space-y-4">
                <Tabs value={role} onValueChange={setRole} className="w-full">
                  <TabsList
                    ref={tabsListRef}
                    className="login-tabs relative grid w-full grid-cols-3 h-12 p-1 rounded-full overflow-hidden bg-white/75 backdrop-blur border border-white/70"
                  >
                    <span
                      aria-hidden
                      className="absolute top-1 bottom-1 left-0 z-0 rounded-full bg-[linear-gradient(180deg,#FFE3B8_0%,#F6BE83_100%)] transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] pointer-events-none"
                      style={{
                        transform: `translateX(${indicator.left}px)`,
                        width: indicator.width,
                        willChange: "transform,width",
                      }}
                    />
                    {ROLES.map((r, i) => {
                      const Icon = r.icon;
                      return (
                        <TabsTrigger
                          key={r.value}
                          value={r.value}
                          ref={(el) => (triggerRefs.current[i] = el)}
                          className="relative z-10 h-full rounded-full flex items-center justify-center gap-2 px-4 text-[15px] font-medium text-[#B67B3C]
                                     hover:text-[#945c23] hover:scale-[1.02] active:scale-[.98]
                                     data-[state=active]:text-[#734515] transition-[color,transform]"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{r.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                {/* Identifier (Email or Employee ID) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="identifier"
                    className="text-[#8f642a] font-medium"
                  >
                    Username
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={
                      role === "Bakery"
                        ? "Enter your Email or Employee ID"
                        : "Enter your Email"
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="h-11 md:h-12 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] focus-visible:ring-offset-0"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-[#8f642a] font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="appearance-none pl-11 pr-11 h-11 md:h-12 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] focus-visible:ring-offset-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                    >
                      {showPass ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between text-[13px] sm:text-[14px]">
                  <label className="inline-flex items-center gap-2 text-[#946e40] hover:text-[#7b5527] transition-colors">
                    <input type="checkbox" className="accent-[#b78c57]" />
                    Remember me
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[#b88950] hover:text-[#8f5a1c] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="login-btn h-11 md:h-12 w-full text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E]
                             hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Signing In...' : `Sign In as ${role}`}
                </Button>

                {/* Bottom links */}
                <div className="text-center text-[13.5px] sm:text-[14px]">
                  <span className="text-[#a47134]/90">
                    Don't have an account?{" "}
                  </span>
                  <Link
                    to="/register"
                    className="text-[#b88950] hover:text-[#8f5a1c] transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
                <div className="text-center text-[13.5px] sm:text-[15px]">
                  <Link
                    to="/"
                    className="text-[#ad7631] hover:text-[#8f5a1c] transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

         {/* DoughNation info */}
        <section className="order-2 md:order-1 left-hero relative md:basis-[45%] min-h-[52vh] md:min-h-screen flex mt-4 md:mt-0">
          <div className="left-hero-surface absolute inset-0" />
          <div className="left-wrap relative w-full h-full flex items-center">
            <div className="left-content w-full px-6 md:px-8 lg:px-12 py-10 left-copy-padding">
              <h1
                className="leading-[1.04] font-extrabold bg-gradient-to-r from-[#FFC062] via-[#E88A1A] to-[#B86A1E] bg-clip-text text-transparent"
                style={{ fontSize: "clamp(34px, 6vw, 60px)" }}
              >
                DOUGHNATION
              </h1>

              <p
                className="mt-5 text-[#8f642a] max-w-[52ch]"
                style={{ fontSize: "var(--text)" }}
              >
                Sign in with your Gmail account (Bakery, Charity, or Admin) or
                your bakery employee ID to manage inventory and donations.
              </p>

              <ul
                className="mt-6 space-y-4 text-[#8f642a]"
                style={{ fontSize: "var(--text)" }}
              >
                <li className="flex items-start gap-3">
                  <Store className="h-5 w-5 mt-0.5 text-[#ce893b]" />
                  <span>
                    Bakery Owners & Employees — Track inventory, manage
                    donations, and connect with charities.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Heart className="h-5 w-5 mt-0.5 text-[#ce893b]" />
                  <span>
                    Charities — View nearby bread offers, claim donations, and
                    schedule pickups with partner bakeries.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 mt-0.5 text-[#ce893b]" />
                  <span>
                    Admins — Oversee the entire system, including user
                    verification, managing audit logs, performing maintenance,
                    and more.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Hide image */}
          <img
            src="/images/givingdonation.png"
            alt=""
            aria-hidden="true"
            className="give-illu"
          />
        </section>
      </div>
    </div>
  );
};

export default Login;