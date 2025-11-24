import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Eye, EyeOff, User, Store, KeyRound } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("user"); // 'user' or 'employee'
  const [step, setStep] = useState(1); // 1=identifier, 2=OTP, 3=reset
  const [identifier, setIdentifier] = useState(""); // email for user, employee_id for employee
  const [bakeryName, setBakeryName] = useState(""); // Display only - auto-populated for employee
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Background parallax
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
    const nx = (e.clientX / w - 0.5) * -1;
    const ny = (e.clientY / h - 0.5) * -1;
    targetRef.current = { x: nx, y: ny };
  };
  const onMouseLeave = () => (targetRef.current = { x: 0, y: 0 });

  // Reset form when account type changes
  useEffect(() => {
    setStep(1);
    setIdentifier("");
    setBakeryName("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResendTimer(0);
  }, [accountType]);

  // Resend OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle Step 1: Send OTP to email/employee
  const handleSendOTP = async (e) => {
    e.preventDefault();
    try {
      const endpoint =
        accountType === "employee"
          ? "http://localhost:8000/employee/forgot-password/send-otp"
          : "http://localhost:8000/forgot-password/send-otp";

      const payload =
        accountType === "employee"
          ? { employee_id: identifier }
          : { email: identifier };

      const res = await axios.post(endpoint, payload);

      if (res.data.valid) {
        // For employees, store the bakery name returned from the server
        if (accountType === "employee" && res.data.bakery_name) {
          setBakeryName(res.data.bakery_name);
        }

        Swal.fire({
          icon: "success",
          title: "OTP Sent",
          text: `A 6-digit verification code has been sent to ${
            accountType === "employee" ? "your email" : "your registered email"
          }`,
          confirmButtonColor: "#16a34a",
        });
        setStep(2);
        setResendTimer(60); // 60 seconds cooldown
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title:
          accountType === "employee" ? "Employee Not Found" : "Email Not Found",
        text:
          err.response?.data?.detail ||
          (accountType === "employee"
            ? "Employee not found."
            : "This email is not registered."),
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const endpoint =
        accountType === "employee"
          ? "http://localhost:8000/employee/forgot-password/verify-otp"
          : "http://localhost:8000/forgot-password/verify-otp";

      const payload =
        accountType === "employee"
          ? {
              employee_id: identifier,
              otp_code: otpCode,
            }
          : { email: identifier, otp_code: otpCode };

      const res = await axios.post(endpoint, payload);

      if (res.data.valid) {
        Swal.fire({
          icon: "success",
          title: "OTP Verified",
          text: "You can now reset your password.",
          confirmButtonColor: "#16a34a",
        });
        setStep(3);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Invalid OTP",
        text:
          err.response?.data?.detail ||
          "The OTP code is incorrect or has expired.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Handle Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "Passwords do not match",
        text: "Please make sure both passwords are the same.",
        confirmButtonColor: "#dc2626",
      });
    }
    try {
      const endpoint =
        accountType === "employee"
          ? "http://localhost:8000/employee/forgot-password/reset-with-otp"
          : "http://localhost:8000/forgot-password/reset-with-otp";

      const payload =
        accountType === "employee"
          ? {
              employee_id: identifier,
              otp_code: otpCode,
              new_password: newPassword,
              confirm_password: confirmPassword,
            }
          : {
              email: identifier,
              otp_code: otpCode,
              new_password: newPassword,
              confirm_password: confirmPassword,
            };

      const res = await axios.post(endpoint, payload);

      Swal.fire({
        icon: "success",
        title: "Password Reset Successful",
        text: res.data.message || "You can now log in with your new password.",
        confirmButtonColor: "#16a34a",
      }).then(() => navigate("/login"));
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Password Reset Failed",
        text: err.response?.data?.detail || "Something went wrong.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    try {
      const endpoint =
        accountType === "employee"
          ? "http://localhost:8000/employee/forgot-password/send-otp"
          : "http://localhost:8000/forgot-password/send-otp";

      const payload =
        accountType === "employee"
          ? { employee_id: identifier }
          : { email: identifier };

      await axios.post(endpoint, payload);

      Swal.fire({
        icon: "success",
        title: "OTP Resent",
        text: "A new verification code has been sent to your email.",
        confirmButtonColor: "#16a34a",
      });
      setResendTimer(60);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to Resend OTP",
        text: err.response?.data?.detail || "Please try again later.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const steps = [
    {
      id: 1,
      label: accountType === "employee" ? "Verify Employee ID" : "Verify Email",
      Icon: accountType === "employee" ? User : Mail,
    },
    { id: 2, label: "Enter OTP", Icon: KeyRound },
    { id: 3, label: "Set Password", Icon: Lock },
  ];

  const passStrength = (() => {
    const p = newPassword;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  // ----- UI: Sliding indicator for the account-type tabs -----
  const tabsListRef = useRef(null);
  const triggerRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measureIndicator = () => {
    const list = tabsListRef.current;
    const i = accountType === "user" ? 0 : 1;
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
  }, [accountType]);
  // -----------------------------------------------------------------------

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ padding: "clamp(1rem, 2.5vw, 1.5rem)" }}
    >
      {/* Fluid style */}
      <style>{`
        :root{
          --space-1: clamp(.5rem, 1.2vw, .75rem);
          --space-2: clamp(.75rem, 1.6vw, 1rem);
          --space-3: clamp(1rem, 2.2vw, 1.5rem);
          --space-4: clamp(1.25rem, 3vw, 2rem);
          --title-lg: clamp(1.5rem, 1rem + 1.6vw, 2.2rem);
          --title-md: clamp(1.35rem, 1rem + 1.4vw, 2rem);
          --title-sm: clamp(1.1rem, .9rem + .8vw, 1.35rem);
          --text: clamp(.95rem, .85rem + .25vw, 1.05rem);
          --radius: clamp(20px, 2.4vw, 26px);
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

        /* Hide native password reveal buttons */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-textfield-decoration-container,
        input[type="password"]::-webkit-clear-button {
          display: none !important; visibility: hidden; pointer-events: none;
        }
      `}</style>

      {/* Background */}
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

      {/* Main card */}
      <div className="relative z-20 w-full flex items-center justify-center min-h-screen">
        <Card
          className="relative w-full max-w-[720px] rounded-[26px] backdrop-blur-2xl bg-white/55 border-white/60 shadow-[0_16px_56px_rgba(0,0,0,0.16)] overflow-hidden"
          style={{ animation: "cardIn 720ms cubic-bezier(.2,.7,.2,1) both" }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-[26px] bg-gradient-to-b from-[#FFF8F0]/50 via-transparent to-[#FFF0E0]/45" />

          <CardHeader className="text-center relative pt-6 pb-2">
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
                fontSize: "clamp(32px, 2.2rem + 2vw, 42px)",
                animation:
                  "headBounce 800ms cubic-bezier(.2,.7,.2,1) both 80ms",
              }}
            >
              Reset Password
            </CardTitle>

            <CardDescription
              className="relative z-10 bg-gradient-to-r from-[#C17B2A] via-[#AD6A21] to-[#8E5216] bg-clip-text text-transparent"
              style={{
                fontSize: "clamp(16px, .9rem + .8vw, 18px)",
                animation: "headPop 680ms cubic-bezier(.2,.7,.2,1) both 120ms",
              }}
            >
              {step === 1 &&
                accountType === "employee" &&
                "Enter your employee ID so we can send you a verification code."}
              {step === 1 &&
                accountType === "user" &&
                "Enter your registered email so we can send you a verification code."}
              {step === 2 && "Enter the 6-digit code sent to your email."}
              {step === 3 && "Create a strong new password to get back in."}
            </CardDescription>
          </CardHeader>

          {/* Account Type Tabs with sliding indicator */}
          <div className="px-6 pt-2 pb-1">
            <Tabs
              value={accountType}
              onValueChange={setAccountType}
              className="w-full"
            >
              <TabsList
                ref={tabsListRef}
                className="relative grid w-full grid-cols-2 h-12 p-1 rounded-full overflow-hidden bg-white/75 backdrop-blur border border-white/70"
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
                <TabsTrigger
                  value="user"
                  ref={(el) => (triggerRefs.current[0] = el)}
                  className="relative z-10 h-full rounded-full flex items-center justify-center gap-2 px-4 text-[15px] font-medium text-[#B67B3C]
                             hover:text-[#945c23] hover:scale-[1.02] active:scale-[.98]
                             data-[state=active]:text-[#734515] transition-[color,transform]"
                >
                  <Mail className="h-4 w-4" />
                  <span>User Account</span>
                </TabsTrigger>
                <TabsTrigger
                  value="employee"
                  ref={(el) => (triggerRefs.current[1] = el)}
                  className="relative z-10 h-full rounded-full flex items-center justify-center gap-2 px-4 text-[15px] font-medium text-[#B67B3C]
                             hover:text-[#945c23] hover:scale-[1.02] active:scale-[.98]
                             data-[state=active]:text-[#734515] transition-[color,transform]"
                >
                  <Store className="h-4 w-4" />
                  <span>Employee</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Stepper */}
          <div className="px-6 pt-3">
            <ol className="flex items-center justify-between gap-2 sm:gap-3">
              {steps.map(({ id, label, Icon }) => {
                const active = step === id;
                const done = step > id;
                return (
                  <li key={id} className="flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "relative h-10 w-10 sm:h-11 sm:w-11 rounded-full grid place-items-center border transition-all",
                          active
                            ? "bg-[#FFE3B8]/80 border-[#F6BE83] shadow-[0_0_0_4px_rgba(246,190,131,.25)]"
                            : done
                            ? "bg-emerald-100/70 border-emerald-300"
                            : "bg-white/70 border-[#FFE1BE]",
                        ].join(" ")}
                      >
                        <Icon
                          className={[
                            "h-5 w-5",
                            active
                              ? "text-[#A66B2E]"
                              : done
                              ? "text-emerald-700"
                              : "text-[#C39053]",
                          ].join(" ")}
                        />
                      </div>
                      <span
                        className="mt-2 text-center"
                        style={{
                          color: "#8f642a",
                          fontSize: "clamp(.72rem, .65rem + .35vw, .9rem)",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <CardContent className="relative pt-4 pb-7 px-6">
            {/* STEP 1: Send OTP */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                {/* Employee ID / Email Field */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="identifier"
                    className="text-[#8f642a] font-medium"
                    style={{ fontSize: "var(--title-sm)" }}
                  >
                    {accountType === "employee"
                      ? "Employee ID"
                      : "Registered Email"}
                  </Label>
                  <div className="relative">
                    {accountType === "employee" ? (
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                    ) : (
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                    )}
                    <Input
                      id="identifier"
                      type={accountType === "employee" ? "text" : "email"}
                      placeholder={
                        accountType === "employee"
                          ? "EMP-X-XXX"
                          : "your.email@gmail.com"
                      }
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className="pl-11 h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] rounded-xl"
                      style={{ fontSize: "var(--text)" }}
                    />
                  </div>
                  {accountType === "employee" && (
                    <p className="text-xs text-[#a47134]/80 mt-1">
                      Enter your unique Employee ID (e.g., EMP-X-XXX)
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E]
                             hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-transform active:scale-[0.99]"
                  style={{
                    fontSize: "clamp(.92rem, .9rem + .2vw, 1.05rem)",
                  }}
                >
                  Send Verification Code
                </Button>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="otpCode"
                    className="text-[#8f642a] font-medium"
                    style={{ fontSize: "var(--title-sm)" }}
                  >
                    Verification Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                    <Input
                      id="otpCode"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      required
                      maxLength={6}
                      className="pl-11 h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] rounded-xl text-center text-2xl tracking-widest font-mono"
                      style={{ fontSize: "var(--text)" }}
                    />
                  </div>
                  <p className="text-xs text-[#a47134]/80 mt-1">
                    Check your email for the 6-digit verification code
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E]
                             hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-transform active:scale-[0.99]"
                  style={{
                    fontSize: "clamp(.92rem, .9rem + .2vw, 1.05rem)",
                  }}
                >
                  Verify Code
                </Button>

                {/* Resend OTP Button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0}
                    className={`text-sm ${
                      resendTimer > 0
                        ? "text-[#C39053]/50 cursor-not-allowed"
                        : "text-[#b88950] hover:text-[#8f5a1c] cursor-pointer"
                    } transition-colors`}
                  >
                    {resendTimer > 0
                      ? `Resend code in ${resendTimer}s`
                      : "Didn't receive code? Resend"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Reset Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="newPassword"
                    className="text-[#8f642a] font-medium"
                    style={{ fontSize: "var(--title-sm)" }}
                  >
                    Password
                  </Label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="Create new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="appearance-none pl-11 pr-11 h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] rounded-xl"
                      style={{ fontSize: "var(--text)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      aria-label={showNew ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                    >
                      {showNew ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* strength meter UI */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="h-2 w-full bg-[#FFE1BE]/70 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(passStrength / 4) * 100}%`,
                            background: (() => {
                              if (passStrength === 0) return "#e5e7eb"; // gray
                              if (passStrength === 1) return "#f87171"; // red
                              if (passStrength === 2) return "#f59e0b"; // amber
                              if (passStrength === 3) return "#60a5fa"; // blue
                              return "#22c55e"; // green
                            })(),
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#a47134]/80">
                        Strength:{" "}
                        <span className="font-semibold">
                          {(() => {
                            if (passStrength <= 1) return "Weak";
                            if (passStrength === 2) return "Fair";
                            if (passStrength === 3) return "Good";
                            return "Strong";
                          })()}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-[#8f642a] font-medium"
                    style={{ fontSize: "var(--title-sm)" }}
                  >
                    Confirm Password
                  </Label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E3B57E]" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="appearance-none pl-11 pr-11 h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E] rounded-xl"
                      style={{ fontSize: "var(--text)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* passwords match banner */}
                  {newPassword && confirmPassword && (
                    <div
                      className={`mt-2 text-sm p-2 rounded-xl border ${
                        newPassword === confirmPassword
                          ? "bg-emerald-50/80 text-emerald-700 border-emerald-200"
                          : "bg-rose-50/80 text-rose-700 border-rose-200"
                      }`}
                    >
                      {newPassword === confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords don't match"}
                    </div>
                  )}
                </div>

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
                          /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
                            ? "bg-emerald-500"
                            : "bg-[#E3B57E]"
                        }`}
                      />
                      One special character
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E] hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-transform active:scale-[0.99]"
                  style={{ fontSize: "clamp(.92rem, .9rem + .2vw, 1.05rem)" }}
                >
                  Reset Password
                </Button>
              </form>
            )}

            {/* Links */}
            <div
              className="text-center mt-6"
              style={{ fontSize: "var(--text)" }}
            >
              <Link
                to="/login"
                className="text-[#b88950] hover:text-[#8f5a1c] transition-colors"
              >
                Back to Login
              </Link>
            </div>
            <div
              className="text-center mt-2"
              style={{ fontSize: "var(--text)" }}
            >
              <Link
                to="/"
                className="text-[#ad7631] hover:text-[#8f5a1c] transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
