import React, { useEffect, useMemo, useState } from "react";
import { useSubmitGuard } from "../hooks/useDebounce";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut,
  ChevronLeft,
  User,
  HandCoins,
  Info,
  Phone,
  User as UserIcon,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Messages1 from "./Messages1";
import CharityNotification from "./CharityNotification";
import RecentDonations from "./RecentDonations";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

/* ===== Sub-tab state ===== */
const SUBTAB_KEY = "charity_profile_active_subtab";
const ALLOWED_SUBTABS = ["about", "history"];
const getInitialSubTab = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("sub");
    if (fromUrl && ALLOWED_SUBTABS.includes(fromUrl)) return fromUrl;

    const stored = localStorage.getItem(SUBTAB_KEY);
    if (stored && ALLOWED_SUBTABS.includes(stored)) return stored;

    return "about";
  } catch {
    return "about";
  }
};

export default function CharityProfile() {
  const { id } = useParams();
  const [name, setName] = useState("Charity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState(getInitialSubTab);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();

  /* ===== Change Password UI state ===== */
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const passScore = useMemo(
    () => Object.values(passwordChecks).filter(Boolean).length,
    [passwordChecks]
  );

  const getStrengthColor = () => {
    if (!newPassword) return "#e5e7eb"; // gray
    if (passScore <= 1) return "#f87171"; // red
    if (passScore <= 3) return "#fbbf24"; // amber
    if (passScore === 4) return "#60a5fa"; // blue
    return "#22c55e"; // green
  };

  const getStrengthLabel = () => {
    if (!newPassword) return "Add a strong password";
    if (passScore <= 1) return "Weak";
    if (passScore <= 3) return "Okay";
    if (passScore === 4) return "Good";
    return "Strong";
  };

  /* Keep URL + storage in sync with the current sub-tab */
  useEffect(() => {
    try {
      if (!activeSubTab) return;
      localStorage.setItem(SUBTAB_KEY, activeSubTab);

      const params = new URLSearchParams(window.location.search);
      if (params.get("sub") !== activeSubTab) {
        params.set("sub", activeSubTab);
        const next = `${window.location.pathname}?${params.toString()}${
          window.location.hash
        }`;
        window.history.replaceState({}, "", next);
      }
    } catch {}
  }, [activeSubTab]);

  /* Lock scroll when a modal is open */
  useEffect(() => {
    const anyOpen = isEditOpen || isChangePassOpen;
    document.documentElement.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isEditOpen, isChangePassOpen]);

  /* Fetch current user (first effect) */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;
        setProfilePic(user.profile_picture);
        setName(user.name);
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();

    // Listen for profile updates and refetch user data
    const handleProfileUpdate = () => {
      fetchUser();
    };

    window.addEventListener("profile:updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile:updated", handleProfileUpdate);
    };
  }, []);

  /* Logout */
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  /* Edit Profile */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const token = localStorage.getItem("token");

    const formData = new FormData();
    const name = e.target.name?.value;
    const contactPerson = e.target.contact_person?.value;
    const contactNumber = e.target.contact_number?.value;
    const about = e.target.about?.value;
    const profilePicture = e.target.profile_picture?.files[0];

    if (name) formData.append("name", name);
    if (contactPerson) formData.append("contact_person", contactPerson);
    if (contactNumber) formData.append("contact_number", contactNumber);
    if (about) formData.append("about", about);
    if (profilePicture) formData.append("profile_picture", profilePicture);

    if (formData.keys().next().done) {
      Swal.fire({
        icon: "warning",
        title: "No changes",
        text: "Please fill at least one field to save changes.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`${API}/edit`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setIsEditOpen(false);
      window.dispatchEvent(new Event("profile:updated"));

      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your changes have been saved successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "There was an error saving your changes. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Change Password (logic same, UI upgraded) */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const data = {
      current_password: e.target.current_password.value,
      new_password: e.target.new_password.value,
      confirm_password: e.target.confirm_password.value,
    };

    // Validation checks
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

    // Check uppercase letter requirement
    if (!/[A-Z]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one uppercase letter (A-Z)",
      });
      return;
    }

    // Check lowercase letter requirement
    if (!/[a-z]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one lowercase letter (a-z)",
      });
      return;
    }

    // Check number requirement
    if (!/[0-9]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one number (0-9)",
      });
      return;
    }

    // Check special character requirement
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.new_password)) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)",
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
      await axios.put(`${API}/changepass`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setIsChangePassOpen(false);
      setNewPassword("");
      setConfirmPassword("");

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
        text: "There was an error updating your password. Please try again.",
      });
    }
  };

  const handleDeactivateAccount = async () => {
    const result = await Swal.fire({
      title: "Deactivate Account?",
      html: `
        <p>Are you sure you want to deactivate your charity account?</p>
        <p class="text-sm text-gray-600 mt-2">This action will:</p>
        <ul class="text-sm text-left text-gray-600 mt-2 ml-4">
          <li>• Disable login access</li>
          <li>• Hide your charity from searches</li>
          <li>• Prevent receiving new donations</li>
        </ul>
        <p class="text-sm text-red-600 mt-3">Please enter your password to confirm:</p>
      `,
      input: "password",
      inputPlaceholder: "Enter your password",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, deactivate",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "Password is required!";
        }
      },
    });

    if (result.isConfirmed && result.value) {
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("password", result.value);

        await axios.post(`${API}/deactivate-account`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        // Immediately log out by clearing token
        localStorage.removeItem("token");

        Swal.fire({
          icon: "success",
          title: "Account Deactivated",
          text: "Your account has been deactivated successfully.",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          navigate("/");
        });
      } catch (err) {
        console.error("Deactivation error:", err);
        Swal.fire({
          icon: "error",
          title: "Deactivation Failed",
          text:
            err.response?.data?.detail ||
            "Failed to deactivate account. Please try again.",
        });
      }
    }
  };

  /* Second fetch user (kept as in your code) */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;
        setProfilePic(user.profile_picture);
        setName(user.name);
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);

  /* ===== CSS ===== */
  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
        --stat-bg1:#fff7ec;
        --stat-bg2:#ffe8cb;
        --stat-border:#e7b072;
      }

      .stat-card{
        background: linear-gradient(180deg, var(--stat-bg1), var(--stat-bg2));
        border: 1px solid var(--stat-border);
        border-radius: 12px;
        box-shadow: inset 0 1px 0 #ffffff, 0 10px 28px rgba(201,124,44,.12);
      }
      .stat-card:hover{
        transform: translateY(-2px) scale(1.02);
        box-shadow: inset 0 1px 0 #ffffff, 0 14px 36px rgba(201,124,44,.18);
      }

      /* About & Contacts blocks */
      .info-wrap{display:grid; gap:14px;}
      .info-block{
        background:linear-gradient(180deg,#ffffff,#fff8ef);
        border:1px solid rgba(0,0,0,.08);
        border-radius:12px;
        padding:12px 14px;
        box-shadow:inset 0 1px 0 #fff;
      }
      .info-title{
        display:flex; align-items:center; gap:.6rem;
        font-weight:800; color:var(--ink);
      }
      .info-text{
        margin-top:.45rem;
        font-size:15px; line-height:1.65;
        white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word;
        max-height:240px; overflow:auto;
      }

      .dl{display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;}
      .dlrow{
        display:grid;
        grid-template-columns: 36px 1fr;
        align-items:center;
        gap:.75rem;
        padding:.35rem .2rem;
        border-radius:10px;
      }
      .icon-badge{
        width:28px; height:28px; border-radius:9999px;
        display:inline-flex; align-items:center; justify-content:center;
        background:#fff4e6; border:1px solid #e7b072; box-shadow:inset 0 1px 0 #fff;
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

      .btn-pill{
        position:relative; overflow:hidden; border-radius:9999px; padding:.65rem 1.05rem;
        background:linear-gradient(135deg,#F6C17C,#BF7327); color:#fff; font-weight:700;
        border:1px solid rgba(255,255,255,.65); box-shadow:0 10px 28px rgba(201,124,44,.28);
        transition:transform .18s ease, box-shadow .18s ease;
      }
      .btn-pill:hover{ transform:translateY(-1px) scale(1.02); box-shadow:0 14px 36px rgba(201,124,44,.34); }

      .btn-change{
        border-radius:9999px; padding:.65rem 1.05rem; font-weight:800; color:var(--ink);
        background:linear-gradient(180deg,#ffffff,#fff6ea);
        border:1.5px solid #e7b072;
        box-shadow:inset 0 1px 0 #ffffff, 0 8px 20px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .btn-change:hover{ transform:translateY(-1px) scale(1.02); background:linear-gradient(180deg,#fffaf2,#ffe4c6); box-shadow:inset 0 1px 0 #ffffff, 0 12px 30px rgba(201,124,44,.24); }

      .seg-wrap{max-width:80rem; margin:.75rem auto 0;}
      .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.10);}
      .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55));}
      .tile{transition:transform .18s ease, box-shadow .18s ease;}
      .tile:hover{transform:translateY(-2px) scale(1.02); box-shadow:0 10px 28px rgba(201,124,44,.16);}

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

      /* Mobile header icons */
      @media (max-width: 480px){
        .hdr-container .iconbar{
          gap: .35rem;
        }

        .hdr-container .iconbar .icon-btn{
          width: 32px;
          height: 32px;
        }

        .hdr-container .iconbar .icon-btn svg{
          width: 16px;
          height: 16px;
        }

        .btn-logout{
          padding: .35rem .55rem;
        }

        .btn-logout svg{
          width: 16px;
          height: 16px;
        }

        .brand-pop{
          margin-right: .25rem;
        }
      }      

      /* ===== Danger Zone (About tab) ===== */
      .danger-zone{
        position:relative;
        border-radius:14px;
        padding:1rem 1.1rem 1.1rem;
        background:linear-gradient(135deg,#fef2f2,#fee2e2);
        border:1px solid rgba(248,113,113,.6);
        box-shadow:0 12px 30px rgba(248,113,113,.18);
        overflow:hidden;
      }
      .danger-zone::before{
        content:"";
        position:absolute;
        inset:0;
        background:radial-gradient(circle at top left, rgba(248,250,252,.85) 0, transparent 55%);
        opacity:.7;
        pointer-events:none;
      }

      .danger-zone-eyebrow{
        font-size:.68rem;
        text-transform:uppercase;
        letter-spacing:.12em;
        font-weight:700;
        color:rgba(127,29,29,.85);
      }
      .danger-zone-title{
        font-weight:800;
        font-size:1rem;
        color:#7f1d1d;
        margin-top:.25rem;
      }
      .danger-zone-text{
        font-size:.78rem;
        color:#b91c1c;
        margin-top:.4rem;
      }
      .danger-zone-list{
        margin-top:.5rem;
        font-size:.75rem;
        color:#7f1d1d;
        padding-left:1.1rem;
      }
      .danger-zone-list li{
        list-style:disc;
        margin-bottom:.15rem;
      }
      .danger-zone-icon{
        width:40px;
        height:40px;
        border-radius:9999px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(254,202,202,.9);
        border:1px solid rgba(248,113,113,.7);
        box-shadow:0 8px 18px rgba(248,113,113,.35);
        color:#7f1d1d;
        flex-shrink:0;
      }
      .danger-zone-btn{
        border-radius:9999px;
        padding:.55rem 1.1rem;
        font-weight:700;
        font-size:.8rem;
        background:linear-gradient(135deg,#dc2626,#b91c1c);
        border:1px solid rgba(254,242,242,.7);
        box-shadow:0 10px 26px rgba(220,38,38,.4);
      }
      .danger-zone-btn:hover{
        filter:brightness(1.02);
        transform:translateY(-1px);
        box-shadow:0 14px 32px rgba(185,28,28,.55);
      }

      .modal-input::-ms-reveal,
      .modal-input::-ms-clear {
        display: none;
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
            <Messages1 currentUser={currentUser} />
            <CharityNotification />
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
            onClick={() => navigate(`/charity-dashboard/${id}?tab=donation`)}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="avatar-ring shrink-0">
                <img
                  src={
                    profilePic ? `${API}/${profilePic}` : "/default-avatar.png"
                  }
                  alt="Profile"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
                  {name}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="btn-pill"
                    onClick={() => setIsEditOpen(true)}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    className="btn-change"
                    onClick={() => {
                      setIsChangePassOpen(true);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>

            {/* ===== Edit Profile Modal ===== */}
            {isEditOpen && (
              <div className="overlay-root" role="dialog" aria-modal="true">
                <div
                  className="overlay-bg"
                  onClick={() => setIsEditOpen(false)}
                />
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Edit Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-3" onSubmit={handleEditSubmit}>
                        {/* Charity Name */}
                        <div className="flex flex-col">
                          <p className="brown-title">Charity Name</p>
                          <input
                            type="text"
                            name="name"
                            defaultValue={name}
                            placeholder="Enter charity name"
                            className="w-full modal-input"
                          />
                        </div>

                        {/* Contact Person */}
                        <div className="flex flex-col">
                          <p className="brown-title">Contact Person</p>
                          <input
                            type="text"
                            name="contact_person"
                            defaultValue={currentUser?.contact_person || ""}
                            placeholder="Enter contact person name"
                            className="w-full modal-input"
                          />
                        </div>

                        {/* Contact Number */}
                        <div className="flex flex-col">
                          <p className="brown-title">Contact Number</p>
                          <input
                            type="text"
                            name="contact_number"
                            defaultValue={currentUser?.contact_number || ""}
                            placeholder="Enter contact number"
                            className="w-full modal-input"
                          />
                        </div>

                        {/* About Your Charity */}
                        <div className="flex flex-col">
                          <p className="brown-title">About Your Charity</p>
                          <textarea
                            name="about"
                            rows="4"
                            className="w-full modal-input resize-none"
                            defaultValue={currentUser?.about || ""}
                            placeholder="Tell about your charity, mission, and story..."
                          />
                        </div>

                        {/* Profile Picture */}
                        <div className="flex flex-col">
                          <p className="brown-title">Profile Picture</p>
                          <input
                            type="file"
                            name="profile_picture"
                            accept="image/*"
                            className="w-full modal-input"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="btn-pill">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ===== Change Password Modal ===== */}
            {isChangePassOpen && (
              <div className="overlay-root" role="dialog" aria-modal="true">
                <div
                  className="overlay-bg"
                  onClick={() => {
                    setIsChangePassOpen(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                />
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Change Password
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form
                        className="space-y-3"
                        onSubmit={handleChangePassword}
                      >
                        {/* Current password with eye icon */}
                        <div className="flex flex-col">
                          <p className="brown-title">Current Password</p>
                          <div className="relative">
                            <input
                              type={showCurrentPwd ? "text" : "password"}
                              name="current_password"
                              required
                              placeholder="Enter current password"
                              className="w-full modal-input pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPwd((s) => !s)}
                              aria-label={
                                showCurrentPwd
                                  ? "Hide password"
                                  : "Show password"
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                            >
                              {showCurrentPwd ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* New password with eye + strength meter */}
                        <div className="flex flex-col">
                          <p className="brown-title">New Password</p>
                          <div className="relative">
                            <input
                              type={showNewPwd ? "text" : "password"}
                              name="new_password"
                              required
                              placeholder="Create password"
                              className="w-full modal-input pr-10"
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPwd((s) => !s)}
                              aria-label={
                                showNewPwd ? "Hide password" : "Show password"
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                            >
                              {showNewPwd ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          {newPassword && (
                            <div className="mt-2">
                              <div className="h-2 w-full bg-[#FFE1BE]/70 rounded-full overflow-hidden">
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${(passScore / 5) * 100}%`,
                                    background: getStrengthColor(),
                                  }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-[#a47134]/80">
                                Strength:{" "}
                                <span className="font-semibold">
                                  {getStrengthLabel()}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Confirm new password with eye + match indicator */}
                        <div className="flex flex-col">
                          <p className="brown-title">Confirm New Password</p>
                          <div className="relative">
                            <input
                              type={showConfirmPwd ? "text" : "password"}
                              name="confirm_password"
                              required
                              placeholder="Re-enter new password"
                              className="w-full modal-input pr-10"
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPwd((s) => !s)}
                              aria-label={
                                showConfirmPwd
                                  ? "Hide password"
                                  : "Show password"
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A66B2E] hover:text-[#81531f]"
                            >
                              {showConfirmPwd ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>

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
                        </div>

                        {/* Password requirements */}
                        <div className="bg-[#FFF7EC] border border-[#FFE1BE] rounded-xl p-3 text-xs space-y-1.5">
                          <p className="font-semibold text-[#8f642a]">
                            Password Requirements
                          </p>
                          <ul className="space-y-1.5 text-[#a47134]">
                            <li className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  passwordChecks.length
                                    ? "bg-emerald-500"
                                    : "bg-[#E3B57E]"
                                }`}
                              />
                              At least 8 characters
                            </li>
                            <li className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  passwordChecks.upper
                                    ? "bg-emerald-500"
                                    : "bg-[#E3B57E]"
                                }`}
                              />
                              One uppercase letter
                            </li>
                            <li className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  passwordChecks.lower
                                    ? "bg-emerald-500"
                                    : "bg-[#E3B57E]"
                                }`}
                              />
                              One lowercase letter
                            </li>
                            <li className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  passwordChecks.number
                                    ? "bg-emerald-500"
                                    : "bg-[#E3B57E]"
                                }`}
                              />
                              One number
                            </li>
                            <li className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  passwordChecks.special
                                    ? "bg-emerald-500"
                                    : "bg-[#E3B57E]"
                                }`}
                              />
                              One special character
                            </li>
                          </ul>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setIsChangePassOpen(false);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="btn-pill">
                            Change Password
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ===== Subtabs ===== */}
            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="seg-wrap">
                  <div className="seg justify-center">
                    <TabsList className="flex items-center gap-1 bg-transparent p-0 border-0 overflow-x-auto no-scrollbar">
                      <TabsTrigger
                        value="about"
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
                      >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">About</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="history"
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
                      >
                        <HandCoins className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          Donation History
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {/* About */}
                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">About</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="info-wrap">
                          {/* About block with icon */}
                          <div className="info-block">
                            <div className="info-title">
                              <span className="icon-badge" aria-hidden>
                                <Info className="w-4 h-4" />
                              </span>
                              <span>About Your Charity</span>
                            </div>
                            <div className="info-text">
                              {currentUser?.about ||
                                "Tell more about your charity. Update this section in Edit Profile to display your story, mission, and donation preferences."}
                            </div>
                          </div>

                          {/* Contact Details with icon rows */}
                          {(currentUser?.contact_person ||
                            currentUser?.contact_number) && (
                            <div className="info-block">
                              <div className="info-title">
                                <span>Contact Details</span>
                              </div>
                              <div className="dl">
                                <div className="dlrow">
                                  <span
                                    className="icon-badge"
                                    title="Contact Person"
                                  >
                                    <UserIcon className="w-4 h-4" />
                                  </span>
                                  <span className="text-[15px] text-[#5b4632] break-words">
                                    {currentUser?.contact_person || "—"}
                                  </span>
                                </div>
                                <div className="dlrow">
                                  <span
                                    className="icon-badge"
                                    title="Contact Number"
                                  >
                                    <Phone className="w-4 h-4" />
                                  </span>
                                  <span className="text-[15px] text-[#5b4632] break-words">
                                    {currentUser?.contact_number || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      {/* Deactivate Account - Danger Zone */}
                      <CardContent className="pt-4 mt-4 border-t border-red-100">
                        <div className="danger-zone">
                          <div className="relative flex items-start gap-3">
                            {/* Icon bubble */}
                            <div className="danger-zone-icon">
                              <AlertTriangle className="w-5 h-5" />
                            </div>

                            {/* Text + button */}
                            <div className="flex-1">
                              <p className="danger-zone-eyebrow">
                                Account Status
                              </p>
                              <h3 className="danger-zone-title">Danger Zone</h3>

                              <p className="danger-zone-text">
                                Deactivating your charity will:
                              </p>

                              <ul className="danger-zone-list">
                                <li>Disable login access for this charity</li>
                                <li>
                                  Hide your charity from the DoughNation
                                  platform
                                </li>
                                <li>Prevent receiving new donations</li>
                              </ul>

                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-[0.7rem] text-red-500/80">
                                  This action cannot be undone without admin
                                  assistance.
                                </p>
                                <Button
                                  onClick={handleDeactivateAccount}
                                  variant="destructive"
                                  size="sm"
                                  className="danger-zone-btn"
                                >
                                  Deactivate Account
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Donation History */}
                <TabsContent value="history" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none h[560px] md:h-[560px] flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">
                          Donation History
                        </CardTitle>
                        <CardDescription>
                          Your completed donations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 overflow-auto">
                        <div className="h-full max-h-full">
                          <RecentDonations />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}