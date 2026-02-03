import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  CheckCircle2, 
  XCircle,
  LogOut,
  ChevronLeft,
  User,
  Mail,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import Swal from "sweetalert2";
import Messages1 from "./Messages1";
import BakeryNotification from "./BakeryNotification";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminProfile() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [name, setName] = useState("Scholars Of Sustenance");
  const [adminId, setAdminId] = useState(null);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
        setName("Scholars Of Sustenance");
        setAdminId(res.data.id);
        setProfilePic(res.data.profile_picture);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
        }
      }
    };

    fetchUser();
  }, [navigate]);

  const passwordChecks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    }),
    [newPassword]
  );

  const allChecksPassed = useMemo(
    () => Object.values(passwordChecks).every(Boolean),
    [passwordChecks]
  );

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const data = {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    };

    if (!data.current_password || !data.new_password || !data.confirm_password) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all fields",
      });
      return;
    }

    if (data.new_password !== data.confirm_password) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    if (data.new_password.length < 8) {
      Swal.fire({
        icon: "warning",
        title: "Password Too Short",
        text: "Password must be at least 8 characters",
      });
      return;
    }

    if (!/[A-Z]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one uppercase letter (A-Z)",
      });
      return;
    }

    if (!/[a-z]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one lowercase letter (a-z)",
      });
      return;
    }

    if (!/[0-9]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one number (0-9)",
      });
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
      });
      return;
    }

    if (data.current_password === data.new_password) {
      Swal.fire({
        icon: "warning",
        title: "Same Password",
        text: "New password must be different from current password",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/admin/change-password`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangePassOpen(false);

      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been changed successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to change password:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.response?.data?.detail || "Failed to change password",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleBack = () => {
    if (adminId) {
      navigate(`/admin-dashboard/${adminId}`);
    } else {
      navigate("/");
    }
  };

  /* ===== CSS ===== */
  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
      }

      .page-bg{position:fixed; inset:0; z-index:-10; pointer-events:none;}
      .page-bg::before{content:""; position:absolute; inset:0;
        background:linear-gradient(135deg,#FFFEFB 0%, #FFF8ED 60%, #FFEFD9 100%);
      }

      .head{position:sticky; top:0; z-index:80; border-bottom:1px solid rgba(0,0,0,.06);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.92;
        background: linear-gradient(110deg, #ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%);
        background-size: 220% 100%;
        animation: headerSlide 18s linear infinite;
      }
      @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
      .hdr-container{max-width:80rem; margin:0 auto; padding:.9rem 1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem;}

      .brand-left{display:flex; align-items:center; gap:.75rem;}
      .brand-left img{width:28px; height:28px; object-fit:contain;}
      .brand-pop {
        background: linear-gradient(90deg, #E3B57E 0%, #F3C27E 25%, #E59B50 50%, #C97C2C 75%, #E3B57E 100%);
        background-size: 300% 100%;
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        animation: brandShimmer 6s ease-in-out infinite;
        letter-spacing:.2px; font-weight:800; font-size: clamp(1.15rem, 1rem + 1vw, 1.6rem);
      }
      @keyframes brandShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

      .iconbar{display:flex; align-items:center; gap:.5rem}

      .btn-logout{
        border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
        color:#fff; border:1px solid rgba(255,255,255,.6);
        box-shadow:0 8px 26px rgba(201,124,44,.25);
        transition:transform .18s ease, box-shadow .18s ease, filter .18s ease;
      }
      .btn-logout:hover{transform:translateY(-1px) scale(1.02); box-shadow:0 12px 34px rgba(201,124,44,.32); filter:saturate(1.05);}

      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(201,124,44,.10)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.0)), linear-gradient(135deg,#fbeedc,#f7cea1);}
      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      .back-fab-hero{
        position:absolute; right:16px; top:16px;
        width:46px; height:46px; border-radius:9999px;
        display:flex; align-items:center; justify-content:center;
        background:#fff; border:1px solid rgba(0,0,0,.06);
        box-shadow:0 10px 22px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease;
        z-index:50;
      }
      .back-fab-hero:hover{transform:translateY(-1px); box-shadow:0 14px 30px rgba(201,124,44,.24);}

      .btn-change{
        border-radius:9999px; padding:.65rem 1.05rem; font-weight:800; color:var(--ink);
        background:linear-gradient(180deg,#ffffff,#fff6ea);
        border:1.5px solid #e7b072;
        box-shadow:inset 0 1px 0 #ffffff, 0 8px 20px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .btn-change:hover{ transform:translateY(-1px) scale(1.02); background:linear-gradient(180deg,#fffaf2,#ffe4c6); box-shadow:inset 0 1px 0 #ffffff, 0 12px 30px rgba(201,124,44,.24); }

      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55));}

      .brown-title{color:#7a4f1c;}

      .overlay-root{position:fixed; inset:0; z-index:100;}
      .overlay-bg{
        position:absolute; inset:0;
        background:rgba(0,0,0,.45);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        opacity:0; animation: overlayFade .22s ease forwards;
      }
      @keyframes overlayFade{to{opacity:1}}

      .overlay-panel{
        position:relative;
        margin:6rem auto 2rem;
        width:min(92%, 560px);
        border-radius:16px; overflow:hidden;
        box-shadow:0 24px 64px rgba(0,0,0,.18);
      }
      .overlay-enter{
        transform:translateY(10px) scale(.98);
        opacity:0; animation: modalPop .22s ease forwards;
      }
      @keyframes modalPop{to{transform:translateY(0) scale(1); opacity:1}}

      .modal-card{background:rgba(255,255,255,.96); backdrop-filter: blur(8px); border-radius:16px; border:1px solid rgba(0,0,0,.06);}
      .modal-head{background:linear-gradient(180deg,#fff,#fff8ef); border-bottom:1px solid rgba(0,0,0,.06)}
      .modal-input{border-radius:10px; padding:.65rem .8rem; border:1px solid rgba(0,0,0,.18)}
      .modal-input:focus{outline:none; border-color:#E49A52; box-shadow:0 0 0 3px rgba(228,154,82,.2)}

      .info-block{
        background:linear-gradient(180deg,#ffffff,#fff8ef);
        border:1px solid rgba(0,0,0,.08);
        border-radius:12px;
        padding:16px;
        box-shadow:inset 0 1px 0 #fff;
      }
    `}</style>
  );

  return (
    <div className="min-h-screen relative">
      <Styles />
      <div className="page-bg" />

      {/* ===== HEADER ===== */}
      <header className="head">
        <div className="head-bg" />
        <div className="hdr-container">
          <div className="brand-left">
            <img src="/images/DoughNationLogo.png" alt="DoughNation" />
            <span className="brand-pop">DoughNation</span>
          </div>

          <div className="iconbar">
            {currentUser && <Messages1 currentUser={currentUser} />}
            <BakeryNotification />
            <Button
              onClick={handleLogout}
              className="btn-logout flex items-center"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:flex">Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />

          <button
            className="back-fab-hero"
            aria-label="Back to dashboard"
            title="Back"
            onClick={handleBack}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="avatar-ring shrink-0">
                <img
                  src={
                    profilePic ? `${API}/${profilePic}` : "/images/admin_profile.png"
                  }
                  alt="Profile"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
                  {name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-[var(--ink)]">
                    {currentUser?.email || ""}
                  </span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {currentUser?.role || "Admin"}
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="btn-change"
                    onClick={() => {
                      setIsChangePassOpen(true);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Account Information Card ===== */}
        {currentUser && (
          <div className="gwrap">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold brown-title flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="info-block">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Full Name</p>
                    <p className="text-base font-medium text-[#3b2a18]">Scholars Of Sustenance</p>
                  </div>
                  <div className="info-block">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Email Address</p>
                    <p className="text-base font-medium text-[#3b2a18]">{currentUser.email}</p>
                  </div>
                  <div className="info-block">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Role</p>
                    <p className="text-base font-medium text-[#3b2a18]">Super Admin</p>
                  </div>
                  <div className="info-block">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Account Status</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== Change Password Modal ===== */}
        {isChangePassOpen && (
          <div className="overlay-root" role="dialog" aria-modal="true">
            <div
              className="overlay-bg"
              onClick={() => setIsChangePassOpen(false)}
            />
            <div className="overlay-panel overlay-enter">
              <Card className="modal-card">
                <CardHeader className="modal-head">
                  <CardTitle className="text-center brown-title flex items-center justify-center gap-2">
                    <Lock className="w-5 h-5" />
                    Change Password
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6">
                  <form className="space-y-4" onSubmit={handleChangePassword}>
                    {/* Current Password */}
                    <div className="flex flex-col">
                      <p className="brown-title mb-1 text-sm font-semibold">Current Password</p>
                      <div className="relative">
                        <input
                          type={showCurrentPwd ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full modal-input pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b5836]"
                        >
                          {showCurrentPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="flex flex-col">
                      <p className="brown-title mb-1 text-sm font-semibold">New Password</p>
                      <div className="relative">
                        <input
                          type={showNewPwd ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full modal-input pr-10"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPwd(!showNewPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b5836]"
                        >
                          {showNewPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Password Requirements */}
                      {newPassword && (
                        <div className="mt-3 space-y-2 text-sm">
                          <PasswordCheck
                            passed={passwordChecks.length}
                            label="At least 8 characters"
                          />
                          <PasswordCheck
                            passed={passwordChecks.upper}
                            label="One uppercase letter"
                          />
                          <PasswordCheck
                            passed={passwordChecks.lower}
                            label="One lowercase letter"
                          />
                          <PasswordCheck
                            passed={passwordChecks.number}
                            label="One number"
                          />
                          <PasswordCheck
                            passed={passwordChecks.special}
                            label="One special character (!@#$%^&*...)"
                          />
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col">
                      <p className="brown-title mb-1 text-sm font-semibold">Confirm New Password</p>
                      <div className="relative">
                        <input
                          type={showConfirmPwd ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full modal-input pr-10"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b5836]"
                        >
                          {showConfirmPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Passwords do not match
                        </p>
                      )}
                      {confirmPassword && newPassword === confirmPassword && (
                        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Passwords match
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsChangePassOpen(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-[#F6C17C] to-[#BF7327] hover:from-[#E49A52] hover:to-[#C97C2C] text-white"
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordCheck({ passed, label }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-400" />
      )}
      <span className={passed ? "text-green-600" : "text-gray-500"}>
        {label}
      </span>
    </div>
  );
}
