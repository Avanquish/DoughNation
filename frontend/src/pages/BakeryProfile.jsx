import React, { useEffect, useMemo, useState } from "react";
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
  Package,
  Clock,
  AlertTriangle,
  LogOut,
  MessageSquareText,
  X,
  ChevronRight,
  ChevronLeft,
  User,
  HandCoins,
  BarChart3,
  Info,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import Messages1 from "./Messages1";
import BakeryNotification from "./BakeryNotification";
import RecentDonations from "./RecentDonations";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

/* ===== Helpers ===== */
const parseDate = (s) => (s ? new Date(s) : null);
const daysUntil = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};
const statusOf = (item) => {
  const d = daysUntil(item.expiration_date);
  if (d === null) return "fresh";
  if (d < 0) return "expired";
  if (d <= (Number(item.threshold) || 0)) return "soon";
  return "fresh";
};

const SUBTAB_KEY = "bakery_profile_active_subtab";
const ALLOWED_SUBTABS = ["about", "history", "analytics"];
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

export default function BakeryProfile() {
  const [name, setName] = useState("Bakery Name");
  const [activeSubTab, setActiveSubTab] = useState(getInitialSubTab);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [inventory, setInventory] = useState([]);

  // ===== Change Password UI-only state (show/hide + meter) =====
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

  const [employeeCount, setEmployeeCount] = useState(0);
  const [readProductIds, setReadProductIds] = useState(new Set());
  const [readMessageIds, setReadMessageIds] = useState(new Set());
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [badges, setBadges] = useState([]);
  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [bakeryId, setBakeryId] = useState(null);

  const navigate = useNavigate();

  /* ===== auth decode ===== */
  useEffect(() => {
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");

    if (employeeToken) {
      try {
        const decoded = JSON.parse(atob(employeeToken.split(".")[1]));
        setIsEmployeeMode(true);
        setBakeryId(decoded.bakery_id);
        setName(decoded.bakery_name || decoded.name || "Bakery Name");
        setCurrentUser({
          employee_name: decoded.employee_name,
          role: decoded.employee_role,
          bakery_id: decoded.bakery_id,
        });
      } catch (err) {
        console.error("Error decoding employee token:", err);
      }
    } else if (bakeryToken) {
      try {
        const decoded = JSON.parse(atob(bakeryToken.split(".")[1]));
        setIsEmployeeMode(false);
        setBakeryId(decoded.sub);
        setName(decoded.name || "Bakery Name");
        setCurrentUser(decoded);
      } catch (err) {
        console.error("Error decoding bakery token:", err);
      }
    }
  }, []);

  /* ===== data refresh ===== */
  useEffect(() => {
    if (!bakeryId) return;

    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadInventory = () =>
      axios
        .get(`${API}/inventory`, { headers })
        .then((r) => setInventory(r.data || []))
        .catch(() => setInventory([]));

    const loadEmployees = () =>
      axios
        .get(`${API}/employees`, { headers })
        .then((r) => {
          const activeEmployees = (r.data || []).filter(
            (emp) => emp?.role?.toLowerCase() !== "owner"
          );
          setEmployeeCount(activeEmployees.length);
        })
        .catch(() => setEmployeeCount(0));

    loadInventory();
    loadEmployees();

    const onInventoryChange = () => loadInventory();
    const onEmployeesChange = () => loadEmployees();
    window.addEventListener("inventory:changed", onInventoryChange);
    window.addEventListener("employees:changed", onEmployeesChange);

    const onFocus = () => {
      loadInventory();
      loadEmployees();
    };
    window.addEventListener("focus", onFocus);

    const poll = setInterval(() => {
      loadInventory();
      loadEmployees();
    }, 10000);

    return () => {
      window.removeEventListener("inventory:changed", onInventoryChange);
      window.removeEventListener("employees:changed", onEmployeesChange);
      window.removeEventListener("focus", onFocus);
      clearInterval(poll);
    };
  }, [bakeryId]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!bakeryId) return;

      try {
        const employeeToken = localStorage.getItem("employeeToken");
        const bakeryToken = localStorage.getItem("token");
        const token = employeeToken || bakeryToken;

        if (!token) return;

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;
        setProfilePic(user.profile_picture);
        setName(user.name);

        // If employee mode, preserve employee info from token
        if (employeeToken) {
          const decoded = JSON.parse(atob(employeeToken.split(".")[1]));
          setCurrentUser({
            ...user, // bakery details
            employee_name: decoded.employee_name,
            role: decoded.employee_role,
          });
        } else {
          setCurrentUser(user); // full user object for owner
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
    window.addEventListener("profile:updated", fetchUser);
    return () => window.removeEventListener("profile:updated", fetchUser);
  }, [bakeryId]);

  useEffect(() => {
    if (!bakeryId) return;
    axios
      .get(`${API}/badges/user/${bakeryId}`)
      .then((res) => setBadges(res.data))
      .catch((err) => console.error(err));
  }, [bakeryId]);

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

  const statusCounts = useMemo(() => {
    const expired = inventory.filter((i) => statusOf(i) === "expired").length;
    const soon = inventory.filter((i) => statusOf(i) === "soon").length;
    const fresh = inventory.filter((i) => statusOf(i) === "fresh").length;
    return { expired, soon, fresh, total: inventory.length };
  }, [inventory]);

  const productAlerts = useMemo(() => {
    const arr = [];
    for (const item of inventory) {
      const st = statusOf(item);
      if (st === "fresh") continue;
      const d = daysUntil(item.expiration_date);
      arr.push({
        id: `inv-${item.id}`,
        name: item.name,
        quantity: item.quantity,
        status: st,
        days: d,
        dateText: item.expiration_date,
      });
    }
    return arr.sort((a, b) =>
      a.status !== b.status
        ? a.status === "expired"
          ? -1
          : 1
        : (a.days ?? 0) - (b.days ?? 0)
    );
  }, [inventory]);

  const messageNotifs = useMemo(
    () => [
      {
        id: "msg-1",
        title: "New message (design)",
        snippet: "Placeholder only",
      },
      {
        id: "msg-2",
        title: "New message (design)",
        snippet: "Placeholder only",
      },
    ],
    []
  );

  useEffect(() => {
    const anyOverlayOpen = isEditOpen || isChangePassOpen || isNotifOpen;
    document.documentElement.style.overflow = anyOverlayOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isEditOpen, isChangePassOpen, isNotifOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("bakery_active_tab");
    localStorage.removeItem("bakery_id_for_employee_login");
    navigate("/");
  };

  const handleClickProductNotification = (n) => {
    setReadProductIds((p) => {
      const next = new Set(p);
      next.add(n.id);
      return next;
    });
    navigate(`/bakery-dashboard/${bakeryId}?tab=inventory`);
  };

  const handleClickMessageNotification = (m) => {
    setReadMessageIds((p) => new Set(p).add(m.id));
    setIsNotifOpen(false);
    setIsMsgOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken;

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

      const errorMessage =
        err.response?.data?.detail ||
        "There was an error saving your changes. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: errorMessage,
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken;

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
      // ✅ Use different endpoint based on who is logged in
      const endpoint = employeeToken
        ? "/employee-change-password"
        : "/changepass";
      const method = employeeToken ? "post" : "put"; // Employee uses POST, Bakery uses PUT

      await axios({
        method: method,
        url: `${API}${endpoint}`,
        data: data,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setIsChangePassOpen(false);

      // ✅ If employee changed password successfully, update token and show message
      if (employeeToken) {
        Swal.fire({
          icon: "success",
          title: "Password Changed Successfully!",
          text: "Your password has been updated.",
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Password Updated",
          text: "Your password has been changed successfully.",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Failed to change password:", err);

      const errorMessage =
        err.response?.data?.detail ||
        "There was an error updating your password. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: errorMessage,
      });
    }
  };

  const handleDeactivateAccount = async () => {
    // Only allow owner to deactivate (check if employee mode or if contact_person matches)
    const result = await Swal.fire({
      title: "Deactivate Account?",
      html: `
        <p>Are you sure you want to deactivate your bakery account?</p>
        <p class="text-sm text-gray-600 mt-2">This action will:</p>
        <ul class="text-sm text-left text-gray-600 mt-2 ml-4">
          <li>• Disable login access</li>
          <li>• Hide your bakery from searches</li>
          <li>• Prevent new donations</li>
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

        // Immediately log out by clearing tokens
        localStorage.removeItem("token");
        localStorage.removeItem("employeeToken");

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

      /* ===== About & Contacts blocks (icons + tidy alignment) ===== */
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
        z-index:50; /* important para hindi matakpan */
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

      .overlay-root{position:fixed; inset:0; z-index:100;} /* mas mataas para di matakpan */
      .overlay-bg{
        position:absolute; inset:0;
        background:rgba(0,0,0,.45);         /* darken */
        backdrop-filter: blur(6px);          /* blur the page behind */
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

  const statusPie = [
    { name: "Fresh", value: statusCounts.fresh },
    { name: "Soon", value: statusCounts.soon },
    { name: "Expired", value: statusCounts.expired },
  ];

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
            onClick={() =>
              navigate(`/bakery-dashboard/${bakeryId}?tab=dashboard`)
            }
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
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-[var(--ink)]">
                    {isEmployeeMode
                      ? currentUser?.employee_name || "Employee"
                      : currentUser?.contact_person || "Owner"}
                  </span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {isEmployeeMode ? currentUser?.role || "Employee" : "Owner"}
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {/* Only owner can edit profile */}
                  {!isEmployeeMode && (
                    <Button
                      className="btn-pill"
                      onClick={() => setIsEditOpen(true)}
                    >
                      Edit Profile
                    </Button>
                  )}
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
                        {/* Bakery Name */}
                        <div className="flex flex-col">
                          <p className="brown-title">Bakery Name</p>
                          <input
                            type="text"
                            name="name"
                            defaultValue={name}
                            placeholder="Enter bakery name"
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

                        {/* About Your Bakery */}
                        <div className="flex flex-col">
                          <p className="brown-title">About Your Bakery</p>
                          <textarea
                            name="about"
                            rows="4"
                            className="w-full modal-input resize-none"
                            defaultValue={currentUser?.about || ""}
                            placeholder="Tell about your bakery, mission, and story..."
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

                {/* animated panel */}
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Change Password
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      {/* --- KEEP your existing form exactly as-is below --- */}
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

                        {/* New password with eye icon + strength meter */}
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

                          {/* strength meter (visual only) */}
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

                        {/* Confirm new password with eye icon + match text */}
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

                          {/* password match indicator – UI only */}
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

                        {/* Password requirements (same style as Register) */}
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

                        {/* Existing buttons – untouched */}
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

                      <TabsTrigger
                        value="analytics"
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          Analytics &amp; Badges
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {/* About */}
                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">About</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="info-wrap">
                          {/* About Your Bakery (icon + text) */}
                          <div className="info-block">
                            <div className="info-title">
                              <span className="icon-badge" aria-hidden>
                                <Info className="w-4 h-4" />
                              </span>
                              <span>About Your Bakery</span>
                            </div>
                            <div className="info-text">
                              {currentUser?.about ||
                                "Tell more about your bakery. Update this section in Edit Profile to display your story, mission, and donation preferences."}
                            </div>
                          </div>

                          {/* Contact Details title (text) with icon rows */}
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

                        {/* Stats tiles */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="tile stat-card p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground">
                              Employees
                            </div>
                            <div className="text-2xl font-bold">
                              {employeeCount}
                            </div>
                          </div>
                          <div className="tile stat-card p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground">
                              Products Tracked
                            </div>
                            <div className="text-2xl font-bold">
                              {statusCounts.total}
                            </div>
                          </div>
                          <div className="tile stat-card p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground">
                              Active Alerts
                            </div>
                            <div className="text-2xl font-bold">
                              {statusCounts.expired + statusCounts.soon}
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      {/* Deactivate Account - Only for Owner */}
                      {!isEmployeeMode && (
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
                                <h3 className="danger-zone-title">
                                  Danger Zone
                                </h3>

                                <p className="danger-zone-text">
                                  Deactivating your bakery will:
                                </p>

                                <ul className="danger-zone-list">
                                  <li>Disable login access for this bakery</li>
                                  <li>
                                    Hide your bakery from the DoughNation
                                    platform
                                  </li>
                                  <li>
                                    Prevent new donations from being requested
                                  </li>
                                </ul>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-[0.7rem] text-red-500/80">
                                    Only the bakery owner can perform this
                                    action.
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
                      )}
                    </Card>
                  </div>
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none h-[560px] flex flex-col card-zoom">
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

                {/* Analytics */}
                <TabsContent value="analytics" className="pt-6 space-y-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">Badges</CardTitle>
                      </CardHeader>
                      <CardContent className="min-h-[80px] flex flex-wrap gap-4">
                        {badges && badges.length > 0 ? (
                          badges.map((userBadge) => (
                            <div
                              key={userBadge.id}
                              className="flex flex-col items-center"
                            >
                              <img
                                src={
                                  userBadge.badge?.icon_url
                                    ? `${API}/${userBadge.badge.icon_url}`
                                    : "/placeholder-badge.png"
                                }
                                alt={userBadge.badge?.name}
                                title={userBadge.badge?.name}
                                className="w-12 h-12 hover:scale-110 transition-transform"
                              />
                              <span className="text-xs mt-1">
                                {userBadge.badge_name &&
                                userBadge.badge_name.trim() !== ""
                                  ? userBadge.badge_name
                                  : userBadge.badge?.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">
                            No badges unlocked yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">
                          Data Visualization
                        </CardTitle>
                        <CardDescription>
                          Inventory status at a glance
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="tile stat-card p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-2">
                            Total
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Fresh",
                                      value: statusCounts.fresh,
                                    },
                                    { name: "Soon", value: statusCounts.soon },
                                    {
                                      name: "Expired",
                                      value: statusCounts.expired,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={2}
                                >
                                  {["#68b266", "#f3c04f", "#e05b5b"].map(
                                    (c, i) => (
                                      <Cell key={i} fill={c} />
                                    )
                                  )}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="tile stat-card p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-2">
                            Fresh vs Soon
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Fresh",
                                      value: statusCounts.fresh,
                                    },
                                    { name: "Soon", value: statusCounts.soon },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={50}
                                  outerRadius={75}
                                >
                                  <Cell fill="#68b266" />
                                  <Cell fill="#f3c04f" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="tile stat-card p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-2">
                            Expired Share
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Expired",
                                      value: statusCounts.expired,
                                    },
                                    {
                                      name: "Other",
                                      value: Math.max(
                                        statusCounts.total -
                                          statusCounts.expired,
                                        0
                                      ),
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={50}
                                  outerRadius={75}
                                >
                                  <Cell fill="#e05b5b" />
                                  <Cell fill="#e5decf" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
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

      {/* ===== Notifications overlay ===== */}
      {isNotifOpen && (
        <div
          className="overlay-root"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
        >
          <div className="overlay-bg" onClick={() => setIsNotifOpen(false)} />
          <div className="overlay-panel overlay-enter">
            <Card className="modal-card">
              <CardHeader className="pb-2 modal-head">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="brown-title">Notifications</CardTitle>
                    <CardDescription>
                      Product alerts & message notifications
                    </CardDescription>
                  </div>
                  <button
                    className="rounded-md p-2 hover:bg-black/5"
                    aria-label="Close"
                    onClick={() => setIsNotifOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="max-h-[60vh] overflow-auto divide-y divide-[rgba(0,0,0,.06)]">
                  <li className="px-4 py-2 text-xs font-bold text-[var(--ink)] bg-[#fff7ec]">
                    Inventory
                  </li>

                  {productAlerts.length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">
                      No inventory alerts.
                    </li>
                  )}

                  {productAlerts
                    .filter((n) => !readProductIds.has(n.id))
                    .map((n) => (
                      <li
                        key={n.id}
                        className="p-4 hover:bg-black/5 cursor-pointer"
                        onClick={() => handleClickProductNotification(n)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center border bg-[#FFF1DE] text-[#8a5a25]">
                            {n.status === "expired" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold truncate">{n.name}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {n.dateText}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {n.status === "expired"
                                ? `${n.quantity} item(s) expired`
                                : `${n.quantity} item(s) expiring in ${n.days} day(s)`}
                            </p>
                            <div
                              className="mt-1 inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full border"
                              style={{
                                background:
                                  n.status === "expired"
                                    ? "#fff1f0"
                                    : "#fff8e6",
                                borderColor:
                                  n.status === "expired"
                                    ? "#ffd6d6"
                                    : "#ffe7bf",
                                color:
                                  n.status === "expired"
                                    ? "#c92a2a"
                                    : "#8a5a25",
                              }}
                            >
                              {n.status === "expired"
                                ? "Expired"
                                : "Expires Soon"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      </li>
                    ))}

                  <li className="px-4 py-2 text-xs font-bold text-[var(--ink)] bg-[#fff7ec]">
                    Messages
                  </li>

                  {messageNotifs.filter((m) => !readMessageIds.has(m.id))
                    .length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">
                      No message notifications.
                    </li>
                  )}

                  {messageNotifs
                    .filter((m) => !readMessageIds.has(m.id))
                    .map((m) => (
                      <li
                        key={m.id}
                        className="p-4 hover:bg-black/5 cursor-pointer"
                        onClick={() => handleClickMessageNotification(m)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center border bg-[#FFF1DE] text-[#8a5a25]">
                            <MessageSquareText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{m.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {m.snippet}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      </li>
                    ))}

                  <li className="p-4 bg-[#fff9f0]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center border bg-[#FFF1DE] text-[#8a5a25]">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">Inventory Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Expired: {statusCounts.expired} • Nearing Expiration:{" "}
                          {statusCounts.soon}
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
                <div className="p-3 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsNotifOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() =>
                      navigate(`/bakery-dashboard/${bakeryId}?tab=inventory`)
                    }
                  >
                    View Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}