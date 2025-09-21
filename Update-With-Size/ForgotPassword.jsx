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
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ---------- same parallax background used by Register ----------
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

  // ---------- Animations + Media Queries ----------
  const styleKeyframes = `
    @keyframes fadeUp { 0% { opacity:0; transform: translateY(12px);} 100% { opacity:1; transform: translateY(0);} }
    @keyframes brandPop { 0% { opacity:0; transform:translateY(8px) scale(.98); letter-spacing:.2px;}
                          60% { opacity:1; transform:translateY(-4px) scale(1.02); letter-spacing:.5px;}
                         100% { opacity:1; transform:translateY(0) scale(1); letter-spacing:0;} }
    @keyframes titleBounce { 0% { opacity:0; transform:translateY(18px) scale(.96);}
                            55% { opacity:1; transform:translateY(-6px) scale(1.04);}
                           100% { opacity:1; transform:translateY(0) scale(1);} }
    @keyframes subFade { 0% { opacity:0; transform:translateY(8px);} 100% { opacity:1; transform:translateY(0);} }

    /* ===== Phones ===== */
    @media screen and (min-width:300px) and (max-width:574px){
      .fp-card{ border-radius:20px !important; }
      .fp-head .brand{ font-size:22px !important; }
      .fp-head .title{ font-size:26px !important; }
      .fp-head .sub{ font-size:14px !important; }
      .fp-input, .fp-btn{ height:44px !important; }
      .fp-card .pad-sides{ padding-left:14px !important; padding-right:14px !important; }
    }

    /* ===== Small tablets ===== */
    @media screen and (min-width:575px) and (max-width:767px){
      .fp-head .brand{ font-size:24px !important; }
      .fp-head .title{ font-size:30px !important; }
      .fp-input, .fp-btn{ height:48px !important; }
    }

    /* ===== Large tablets ===== */
    @media screen and (min-width:768px) and (max-width:959px){
      .fp-head .title{ font-size:32px !important; }
      .fp-input, .fp-btn{ height:50px  !important; }
    }

    /* ===== Small desktops ===== */
    @media screen and (min-width:1368px) and (max-width:1920px){
      .fp-head .title{ font-size:34px !important; }
      .fp-input, .fp-btn{ height:50px !important; }
    }

    /* ===== Large desktops ===== */
    @media screen and (min-width:1921px) and (max-width:4096px){
      .fp-head .title{ font-size:36px !important; }
      .fp-input, .fp-btn{ height:50px !important; }
    }
  `;

  // ---------- submit ----------
  const handleReset = async (e) => {
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
      const res = await axios.post("http://localhost:8000/forgot-password", {
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
      console.error("Reset error:", err);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-6"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Background and overlays — same look as Register */}
      <style>{styleKeyframes}</style>
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
        <Card
          className="fp-card relative rounded-[22px] backdrop-blur-2xl bg-white/45 border-white/50 shadow-[0_16px_56px_rgba(0,0,0,0.16)]"
          style={{ animation: "fadeUp 480ms ease-out both" }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-[22px] bg-gradient-to-b from-[#FFF8F0]/45 via-transparent to-[#FFF8F0]/35" />

          <CardHeader className="fp-head text-center relative pt-5 pb-3 pad-sides">
            <div
              className="flex items-center justify-center gap-2 mb-1"
              style={{
                animation: "brandPop 700ms cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: "40ms",
              }}
            >
              <span className="brand text-[22px] sm:text-[24px] font-extrabold tracking-wide bg-gradient-to-r from-[#fed09b] via-[#e0a864] to-[#c38437] bg-clip-text text-transparent">
                DoughNation
              </span>
            </div>

            <CardTitle
              className="title mt-0 text-[28px] sm:text-[34px] bg-gradient-to-r from-[#f8b86a] via-[#dd9f53] to-[#ce893b] bg-clip-text text-transparent"
              style={{
                animation:
                  "titleBounce 800ms cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: "160ms",
              }}
            >
              Reset Password
            </CardTitle>

            <CardDescription
              className="sub text-[14px] sm:text-[16px] bg-gradient-to-r from-[#E3B57E] via-[#C39053] to-[#A66B2E] bg-clip-text text-transparent"
              style={{
                animation: "subFade 520ms ease-out both",
                animationDelay: "320ms",
              }}
            >
              Enter your registered email and set a new password
            </CardDescription>
          </CardHeader>

          <CardContent className="relative pt-2 pb-6 pad-sides">
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#8f642a]">
                  Registered Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="fp-input h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-[#8f642a]">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="fp-input h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[#8f642a]">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="fp-input h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                />
              </div>

              <Button
                type="submit"
                className="fp-btn h-11 md:h-12 w-full text-[15px] sm:text-[16px] text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E] hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-transform duration-150 active:scale-[0.99]"
              >
                Reset Password
              </Button>

              <div className="text-center text-sm">
                <Link
                  to="/login"
                  className="text-[#b88950] hover:text-[#8f5a1c] transition-colors"
                >
                  Back to Login
                </Link>
              </div>
              <div className="text-center text-sm">
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
      </div>
    </div>
  );
};

export default ForgotPassword;
