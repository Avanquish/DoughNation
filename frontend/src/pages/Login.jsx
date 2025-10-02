// React & router basics
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

// Auth context & API helper
import { useAuth } from "../context/AuthContext";
import axios from "axios";

// Swal Alerts
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
import { Heart, Store, Building2 } from "lucide-react";

// Role tabs config
const ROLES = [
  { value: "Bakery", label: "Bakery", icon: Store },
  { value: "Charity", label: "Charity", icon: Heart },
  { value: "Admin", label: "Admin", icon: Building2 },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Bakery");

  // Parallax
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/login", {
        email,
        password,
        role,
      });

      const token = res.data.access_token;
      login(token);

      const { sub, role: actualRole } = JSON.parse(atob(token.split(".")[1]));
      if (actualRole !== role) {
        // ✅ SweetAlert2 for unauthorized role
        Swal.fire({
          icon: "error",
          title: "Unauthorized",
          text: `You are not authorized to log in as ${role}.`,
        });
        return;
      }

      if (actualRole === "Bakery") navigate(`/bakery-dashboard/${sub}`);
      else if (actualRole === "Charity") navigate(`/charity-dashboard/${sub}`);
      else if (actualRole === "Admin") navigate(`/admin-dashboard/${sub}`);
    } catch (error) {
      console.error("Login error:", error);
      const detail =
        error.response?.data?.detail ||
        "Login failed. Please check your credentials.";

      // ✅ SweetAlert2 for login failure
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: detail,
      });
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
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

      {/* Local styles + MEDIA QUERIES */}
      <style>{`
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
        .left-content { position: relative; z-index: 2; }
        .give-illu{
          position:absolute;
          right: clamp(18px, 3vw, 40px);
          bottom: clamp(18px, 4vh, 44px);
          width: clamp(100px, 38vw, 220px);
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 10px 24px rgba(0,0,0,.12));
          pointer-events: none;
          z-index: 1;
        }

        /* ========== Phones ========== */
        @media screen and (min-width:300px) and (max-width:574px){
          .left-hero-surface{ border-right: none; }
          .brand-head{ font-size: 32px !important; line-height: 1.08 !important; }
          .left-copy-padding{ padding-bottom: clamp(120px, 30vw, 200px) !important; }
          .give-illu{ right: max(10px, 3vw); bottom: max(10px, 3vh); width: clamp(88px, 36vw, 140px); }
          .login-card{ max-width: 520px; border-radius: 22px; }
          .login-card .shrink-pad{ padding-left: 14px; padding-right: 14px; }
          .login-tabs{ height: 44px !important; }
          .login-tabs button{ font-size: 13px !important; }
          .login-card input[type="email"],
          .login-card input[type="password"]{ height: 44px !important; }
          .login-card .login-btn{ height: 44px !important; }
        }

        /* ========== Small tablets ========== */
        @media screen and (min-width:575px) and (max-width:767px){
          .brand-head{ font-size: 44px !important; }
          .login-card{ max-width: 580px; border-radius: 24px; }
          .login-tabs{ height: 48px !important; }
          .login-tabs button{ font-size: 14px !important; }
          .login-card input[type="email"],
          .login-card input[type="password"]{ height: 48px !important; }
          .login-card .login-btn{ height: 48px !important; }
          .give-illu{ width: clamp(130px, 32vw, 180px); }
        }

        /* ========== Large tablets ========== */
        @media screen and (min-width:768px) and (max-width:959px){
          .brand-head{ font-size: 52px !important; }
          .login-card{ max-width: 640px; }
          .login-tabs{ height: 50px !important; }
          .login-card input[type="email"],
          .login-card input[type="password"]{ height: 50px !important; }
          .login-card .login-btn{ height: 50px !important; }
          .give-illu{ width: clamp(150px, 28vw, 210px); }
        }

        /* ========== Small desktops ========== */
        @media screen and (min-width:1368px) and (max-width:1920px){
          .brand-head{ font-size: 58px !important; }
          .login-card{ max-width: 660px; }
          .give-illu{ width: clamp(170px, 24vw, 240px); }
        }

        /* ========== Large desktops========== */
        @media screen and (min-width:1921px) and (max-width:4096px){
          .brand-head{ font-size: 60px !important; }
          .login-card{ max-width: 680px; }
          .give-illu{ width: clamp(190px, 22vw, 260px); }
        }
      `}</style>

      {/* Layout */}
      <div className="relative z-20 flex flex-col md:flex-row min-h-screen">
        {/* RIGHT (Login card) — first on mobile */}
        <section className="order-1 md:order-2 md:basis-[55%] flex items-center justify-center px-6 pt-6 md:pt-0 py-10">
          <Card
            className="login-card relative w-full max-w-[640px] rounded-[26px] backdrop-blur-2xl bg-white/50 border-white/60 shadow-[0_16px_56px_rgba(0,0,0,0.16)]"
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
                  className="h-14 sm:h-16 md:h-[82px] w-auto max-w-[520px] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,.06)]"
                  style={{
                    animation: "headPop 700ms cubic-bezier(.2,.7,.2,1) both",
                  }}
                />
              </div>

              <CardTitle
                className="relative z-10 mt-2 text-[30px] sm:text[36px] md:text-[40px]
                           bg-gradient-to-r from-[#FFC66E] via-[#E88A1A] to-[#B86A1E]
                           bg-clip-text text-transparent"
                style={{
                  animation:
                    "headBounce 800ms cubic-bezier(.2,.7,.2,1) both 80ms",
                }}
              >
                Welcome Back
              </CardTitle>

              <CardDescription
                className="relative z-10 text-[14px] sm:text-[16px]
                           bg-gradient-to-r from-[#C17B2A] via-[#AD6A21] to-[#8E5216]
                           bg-clip-text text-transparent"
                style={{
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
                      className="absolute top-1 bottom-1 left-0 z-0 rounded-full
                                 bg-[linear-gradient(180deg,#FFE3B8_0%,#F6BE83_100%)] transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] pointer-events-none"
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

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[#8f642a] font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 md:h-12 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] focus-visible:ring-offset-0"
                  />
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
                >
                  Sign In as {role}
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

        {/* LEFT (DoughNation info) — second on mobile */}
        <section className="order-2 md:order-1 left-hero relative md:basis-[45%] min-h-[52vh] md:min-h-screen flex mt-4 md:mt-0">
          <div className="left-hero-surface absolute inset-0" />
          <div className="relative w-full h-full flex items-center">
            <div className="left-content w-full px-6 md:px-8 lg:px-12 py-10 left-copy-padding">
              <h1 className="brand-head text-[38px] sm:text-[52px] lg:text-[60px] leading-[1.04] font-extrabold bg-gradient-to-r from-[#FFC062] via-[#E88A1A] to-[#B86A1E] bg-clip-text text-transparent">
                DOUGHNATION
              </h1>

              <p className="mt-5 text-[16px] sm:text-[17px] text-[#8f642a] max-w-[52ch]">
                Sign in to manage inventory and move surplus bread to nearby
                charities.
              </p>

              <ul className="mt-6 space-y-4 text-[#8f642a]">
                <li className="flex items-start gap-3">
                  <Store className="h-5 w-5 mt-0.5 text-[#ce893b]" />
                  <span>
                    Bakery — Track inventory, and schedule donation pickups.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Heart className="h-5 w-5 mt-0.5 text-[#ce893b]" />
                  <span>
                    Charity — See nearby bread offers, claim what you can use,
                    coordinate fast.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 mt-0.5 text-[#ce893b]" />
                  <span>
                    Admin — Manage roles, partners, analytics, and full donation
                    logs.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Illustration (under text) */}
          <img
            src="/images/GivingDonation.png"
            alt="Giving donation"
            className="give-illu"
          />
        </section>
      </div>
    </div>
  );
};

export default Login;