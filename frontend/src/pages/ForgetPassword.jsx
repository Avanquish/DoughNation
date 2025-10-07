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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // step 1 = email, 2 = date, 3 = reset
  const [email, setEmail] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Background parallax effect
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
    const nx = (e.clientX / w - 0.5) * -1;
    const ny = (e.clientY / h - 0.5) * -1;
    targetRef.current = { x: nx, y: ny };
  };
  const onMouseLeave = () => (targetRef.current = { x: 0, y: 0 });

  // Handlers for each step
  const handleValidateEmail = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/forgot-password/check-email", {
        email,
      });
      if (res.data.valid) {
        Swal.fire({
          icon: "success",
          title: "Email Found",
          text: "Please confirm your registration date.",
          confirmButtonColor: "#16a34a",
        });
        setStep(2);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Email Not Found",
        text: err.response?.data?.detail || "This email is not registered.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const handleValidateDate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/forgot-password/check-date", {
        email,
        registration_date: registrationDate,
      });
      if (res.data.valid) {
        Swal.fire({
          icon: "success",
          title: "Authentication Passed",
          text: "You can now reset your password.",
          confirmButtonColor: "#16a34a",
        });
        setStep(3);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Invalid Date",
        text: err.response?.data?.detail || "The date you entered is incorrect.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

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
      const res = await axios.post("http://localhost:8000/forgot-password/reset", {
        email,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

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

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-6"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
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
      <div className="relative z-20 w-full max-w-[650px]">
        <Card className="relative rounded-[22px] backdrop-blur-2xl bg-white/45 border-white/50 shadow-[0_16px_56px_rgba(0,0,0,0.16)]">
          <div className="absolute inset-0 pointer-events-none rounded-[22px] bg-gradient-to-b from-[#FFF8F0]/45 via-transparent to-[#FFF8F0]/35" />

          <CardHeader className="text-center relative pt-5 pb-3">
            <CardTitle className="text-[28px] sm:text-[34px] bg-gradient-to-r from-[#f8b86a] via-[#dd9f53] to-[#ce893b] bg-clip-text text-transparent">
              Reset Password
            </CardTitle>
            <CardDescription>
              {step === 1 && "Enter your registered email."}
              {step === 2 && "Confirm your registration date."}
              {step === 3 && "Set a new password."}
            </CardDescription>
          </CardHeader>

          <CardContent className="relative pt-2 pb-6 px-6">
            {step === 1 && (
              <form onSubmit={handleValidateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Registered Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Next
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleValidateDate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationDate">Date of Registration</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Next
                </Button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Reset Password
                </Button>
              </form>
            )}

            <div className="text-center text-sm mt-4">
              <Link to="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
            </div>
            <div className="text-center text-sm mt-2">
              <Link to="/" className="text-primary hover:underline">
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