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
  Heart,
  Upload,
  Clock,
  Users,
  AlertTriangle,
  LogOut,
  CheckCircle,
  LayoutDashboard,
  PackageOpen,
  HandCoins,
  ListCheck,
  FileBarChart,
  MessageSquareWarning,
  MessageSquareDot,
  Medal,
  Store,
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import BakeryInventory from "./BakeryInventory";
import BakeryEmployee from "./BakeryEmployee";
import BakeryDonation from "./BakeryDonation";
import Complaint from "../pages/Complaint";
import BakeryReports from "../pages/BakeryReports";
import BakeryNotification from "./BakeryNotification";
import BDonationStatus from "./BDonationStatus";
import BFeedback from "./BFeedback";
import BakeryAnalytics from "./BakeryAnalytics";
import AchievementBadges from "./AchievementBadges";
import RecentDonations from "./RecentDonations";
import DashboardSearch from "./DashboardSearch";
import UserBadge from "./UserBadge";
import Messages1 from "./Messages1";

const API = "http://localhost:8000";

// Stable keys for tab persistence
const TAB_KEY = "bakery_active_tab";
const ALLOWED_TABS = [
  "dashboard",
  "inventory",
  "donations",
  "DONATIONstatus",
  "employee",
  "complaints",
  "reports",
  "feedback",
  "badges",
];

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

const BakeryDashboard = () => {
  const { id } = useParams();
  const { employee, logout: employeeLogout } = useEmployeeAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [name, setName] = useState("Bakery");
  const [bakeryName, setBakeryName] = useState("");
  const [ownerName, setOwnerName] = useState(""); // Owner's name (contact_person)
  const [employeeRole, setEmployeeRole] = useState(null);
  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setShowTop(y > 320);
      setScrolled(y > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // initialize from URL, localStorage, or default
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("tab");
      if (fromUrl && ALLOWED_TABS.includes(fromUrl)) return fromUrl;

      const fromStorage = localStorage.getItem(TAB_KEY);
      if (fromStorage && ALLOWED_TABS.includes(fromStorage)) return fromStorage;

      return "dashboard";
    } catch {
      return "dashboard";
    }
  });

  const [badges, setBadges] = useState([]);
  const [highlightedDonationId, setHighlightedDonationId] = useState(null);
  const [totals, setTotals] = useState({
    grand_total: 0,
    normal_total: 0,
    direct_total: 0,
  });
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  // Live data for cards
  const [inventory, setInventory] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [uploadedProducts, setUploadedProducts] = useState(0);
  const [donatedProducts, setDonatedProducts] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  // Detect employee mode and set role
  useEffect(() => {
    if (employee && employee.bakery_id === parseInt(id)) {
      setIsEmployeeMode(true);
      setEmployeeRole(employee.employee_role);
      setName(employee.employee_name);

      const employeeToken = localStorage.getItem("employeeToken");

      if (employeeToken) {
        try {
          const decoded = JSON.parse(atob(employeeToken.split(".")[1]));
          const bakeryNameFromToken = decoded.bakery_name;
          const bakeryVerifiedFromToken = decoded.bakery_verified;

          if (bakeryNameFromToken) {
            setBakeryName(bakeryNameFromToken);
          } else {
            fetchBakeryNameFromBackend(employee.bakery_id);
          }

          if (bakeryVerifiedFromToken !== undefined) {
            setIsVerified(bakeryVerifiedFromToken);
          } else {
            setIsVerified(false);
          }
        } catch {
          fetchBakeryNameFromBackend(employee.bakery_id);
          setIsVerified(false);
        }
      } else {
        fetchBakeryNameFromBackend(employee.bakery_id);
        setIsVerified(false);
      }
    }
  }, [employee, id]);

  // Helper function to fetch bakery name from backend
  const fetchBakeryNameFromBackend = async (bakeryId) => {
    try {
      const employeeToken = localStorage.getItem("employeeToken");
      const res = await axios.get(`${API}/users/${bakeryId}`, {
        headers: { Authorization: `Bearer ${employeeToken}` },
      });

      if (res.data && res.data.name) {
        setBakeryName(res.data.name);
      } else {
        setBakeryName("Bakery");
      }
    } catch {
      setBakeryName("Bakery");
    }
  };

  // Determine which tabs are visible based on role
  const getVisibleTabs = () => {
    if (!isEmployeeMode || !employeeRole) return ALLOWED_TABS;

    const role = employeeRole.toLowerCase().replace(/[-\s]/g, "");

    // Owner and Manager have full access
    if (role === "owner" || role === "manager") return ALLOWED_TABS;
    // Employee cannot access Employee tab and Reports
    else if (role === "employee")
      return ALLOWED_TABS.filter(
        (tab) => tab !== "employee" && tab !== "reports"
      );

    return ALLOWED_TABS;
  };

  const visibleTabs = getVisibleTabs();

  // keep URL & localStorage in sync with activeTab
  useEffect(() => {
    try {
      if (!activeTab) return;
      localStorage.setItem(TAB_KEY, activeTab);

      const params = new URLSearchParams(window.location.search);
      if (activeTab === "dashboard") {
        if (params.has("tab")) {
          params.delete("tab");
          const next = `${window.location.pathname}${
            params.toString() ? `?${params.toString()}` : ""
          }${window.location.hash}`;
          window.history.replaceState({}, "", next);
        }
      } else {
        if (params.get("tab") !== activeTab) {
          params.set("tab", activeTab);
          const next = `${window.location.pathname}?${params.toString()}${
            window.location.hash
          }`;
          window.history.replaceState({}, "", next);
        }
      }
    } catch {
      // ignore
    }
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      if (!isEmployeeMode) {
        setName(decoded.contact_person || "Owner");
        setOwnerName(decoded.contact_person || "Owner");
        setBakeryName(decoded.name || "Bakery");
      }
      setIsVerified(decoded.is_verified);
      const userId =
        decoded.sub || decoded.id || decoded.user_id || decoded._id;
      if (!userId) return;

      axios
        .get(`${API}/badges/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setBadges(res.data || []);
          setCurrentUser({
            id: userId,
            name: decoded.name,
            is_verified: decoded.is_verified,
            badges: res.data || [],
          });
        })
        .catch(() => {
          setBadges([]);
          setCurrentUser({
            id: userId,
            name: decoded.name,
            is_verified: decoded.is_verified,
            badges: [],
          });
        });
    } catch {
      // token decode error
    }
  }, [isEmployeeMode]);

  // Fetch badges for employees (using bakery_id)
  useEffect(() => {
    if (!isEmployeeMode || !employee || !employee.bakery_id) return;

    const employeeToken = localStorage.getItem("employeeToken");
    if (!employeeToken) return;

    axios
      .get(`${API}/badges/user/${employee.bakery_id}`, {
        headers: { Authorization: `Bearer ${employeeToken}` },
      })
      .then((res) => {
        setBadges(res.data || []);
        setCurrentUser({
          id: employee.bakery_id,
          name: employee.employee_name,
          is_verified: true,
          badges: res.data || [],
          employee_id: employee.employee_id,
          employee_role: employee.employee_role,
        });
      })
      .catch(() => {
        setBadges([]);
        setCurrentUser({
          id: employee.bakery_id,
          name: employee.employee_name,
          is_verified: true,
          badges: [],
          employee_id: employee.employee_id,
          employee_role: employee.employee_role,
        });
      });
  }, [isEmployeeMode, employee]);

  // Fetch inventory, employees, uploaded and donated products
  useEffect(() => {
    const token = isEmployeeMode
      ? localStorage.getItem("employeeToken")
      : localStorage.getItem("token");
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

    const loadUploadedProducts = () =>
      axios
        .get(`${API}/donations`, { headers })
        .then((r) => {
          const available = (r.data || []).filter(
            (d) => d.status === "available"
          ).length;
          setUploadedProducts(available);
        })
        .catch(() => setUploadedProducts(0));

    const loadDonatedProducts = () =>
      axios
        .get(`${API}/donations`, { headers })
        .then((r) => {
          const donated = (r.data || []).filter(
            (d) => d.status === "donated"
          ).length;
          setDonatedProducts(donated);
        })
        .catch(() => setDonatedProducts(0));

    loadInventory();
    loadEmployees();
    loadUploadedProducts();
    loadDonatedProducts();

    const onInventoryChange = () => loadInventory();
    const onEmployeesChange = () => loadEmployees();
    window.addEventListener("inventory:changed", onInventoryChange);
    window.addEventListener("employees:changed", onEmployeesChange);

    const onFocus = () => {
      loadInventory();
      loadEmployees();
    };
    window.addEventListener("focus", onFocus);

    const pollId = setInterval(() => {
      loadInventory();
      loadEmployees();
    }, 10000);

    return () => {
      window.removeEventListener("inventory:changed", onInventoryChange);
      window.removeEventListener("employees:changed", onEmployeesChange);
      window.removeEventListener("focus", onFocus);
      clearInterval(pollId);
    };
  }, [isEmployeeMode]);

  useEffect(() => {
    if (activeTab !== "donations") {
      setHighlightedDonationId(null);
    }
  }, [activeTab]);

  // Stats state - will be fetched from backend
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalInventory: 0,
    uploadedProducts: 0,
    donatedProducts: 0,
    employeeCount: 0,
    expiredProducts: 0,
    nearingExpiration: 0,
  });

  // Fetch stats from backend using Philippine timezone
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = isEmployeeMode
          ? localStorage.getItem("employeeToken")
          : localStorage.getItem("token");

        const res = await axios.get(`${API}/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }
    };

    fetchStats();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [isEmployeeMode]);

  // ui helpers
  const handleLogout = () => {
    if (isEmployeeMode) {
      employeeLogout();
    } else {
      localStorage.removeItem("token");
    }
    navigate("/");
  };

  const statusText = useMemo(() => {
    return (
      <span
        className="flex items-center gap-1 font-bold"
        style={{ color: "#16a34a" }}
      >
        <CheckCircle className="w-4 h-4 text-green-600" />
        Verified
      </span>
    );
  }, []);

  // Fetch the computed Donation Send
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const token = isEmployeeMode
          ? localStorage.getItem("employeeToken")
          : localStorage.getItem("token");

        const res = await fetch(`${API}/bakery/total_donations_sent`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setTotals(data);
      } catch {
        // ignore
      }
    };

    fetchTotals();
  }, [isEmployeeMode]);

  // Fetch uploaded products
  useEffect(() => {
    const fetchUploadedProducts = async () => {
      try {
        const token = isEmployeeMode
          ? localStorage.getItem("employeeToken")
          : localStorage.getItem("token");

        const res = await fetch(`${API}/bakery/total_products_for_donation`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch uploaded products");

        const data = await res.json();
        setUploadedProducts(data.total_products || 0);
      } catch {
        setUploadedProducts(0);
      }
    };

    fetchUploadedProducts();
  }, [isEmployeeMode]);

  // ================= CSS (UI only) =================
  const Styles = () => (
    <style>{`
    :root{
      --ink:#7a4f1c;
      --grad1:#FFF7EC; --grad2:#FFE7C8; --grad3:#FFD6A1; --grad4:#F3C27E;
      --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
    }

    .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
    .page-bg::before, .page-bg::after{content:""; position:absolute; inset:0}
    .page-bg::before{
      background:
        radial-gradient(1200px 520px at 12% -10%, var(--grad1) 0%, var(--grad2) 42%, transparent 70%),
        radial-gradient(900px 420px at 110% 18%, rgba(255,208,153,.40), transparent 70%),
        linear-gradient(135deg, #FFF9EF 0%, #FFF2E3 60%, #FFE7D1 100%);
      animation: drift 26s ease-in-out infinite alternate;
    }
    .page-bg::after{
      background:
        repeating-linear-gradient(-35deg, rgba(201,124,44,.06) 0 8px, rgba(201,124,44,0) 8px 18px);
      mix-blend-mode:multiply; opacity:.12; animation: pan 40s linear infinite;
    }
    .blob{position:absolute; width:420px; height:420px; border-radius:50%;
      filter:blur(36px); mix-blend-mode:multiply; opacity:.22}
    .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%); animation: blob 18s ease-in-out infinite alternate;}
    .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%); animation: blob 20s 2s ease-in-out infinite alternate;}
    @keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-18px,0)}}
    @keyframes pan{from{transform:translate3d(0,0,0)}to{transform:translate3d(-6%,-6%,0)}}
    @keyframes blob{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(24px,-20px,0) scale(1.04)}}

    .head{position:sticky; top:0; z-index:40; border-bottom:1px solid rgba(0,0,0,.06); backdrop-filter: blur(10px);}
    .head-bg{position:absolute; inset:0; z-index:-1; opacity:.92;
      background:
        linear-gradient(110deg, #ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%);
      background-size: 220% 100%;
      animation: headerSlide 18s linear infinite;
    }
    @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
    .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
    .brand{display:flex; gap:.8rem; align-items:center}
    .ring{width:48px; height:48px; border-radius:9999px; padding:2px; background:conic-gradient(from 210deg, #F7C789, #E8A765, #C97C2C, #E8A765, #F7C789); animation: spin 10s linear infinite; box-shadow:0 10px 24px rgba(201,124,44,.16)}
    .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
    .bread{transform-origin:50% 60%; animation: float 6s ease-in-out infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    .title-ink{font-weight:800; letter-spacing:.2px; background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C); background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent; animation: ink 9s ease infinite}
    @keyframes ink{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem; padding:.28rem .6rem; font-size:.78rem; border-radius:9999px; color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0}

    .seg-wrap{max-width: 80rem;margin: .75rem auto 0;}
    .seg{display: flex;
    gap: .4rem;
    background: rgba(255, 255, 255, .94);
    border: 1px solid rgba(0, 0, 0, .07);
    border-radius: 12px;
    padding: .3rem;
    box-shadow: 0 8px 24px rgba(201,124,44, .10);}
    .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
    .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}
    .seg [role="tab"]:hover{ background:#FFF2E0; }
    .seg [role="tab"][data-state="active"]{
      color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
      box-shadow:0 8px 18px rgba(201,124,44,.28)
    }

    .iconbar{display:flex; align-items:center; gap:.5rem}
    .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.9); border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14); transition:transform .18s ease, box-shadow .18s ease}
    .icon-btn:hover{transform:translateY(-1px); box-shadow:0 10px 22px rgba(201,124,44,.20)}
    .badge{position:absolute; top:-4px; right:-4px; min-width:18px; height:18px; padding:0 4px; border-radius:9999px; background:linear-gradient(180deg,#ff6b6b,#e03131); color:#fff; font-size:11px; line-height:18px; text-align:center; font-weight:800; box-shadow:0 4px 10px rgba(224,49,49,.35)}

    .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); color:#fff; border:1px solid rgba(255,255,255,.6); box-shadow:0 8px 26px rgba(201,124,44,.25); transition:transform .18s ease, box-shadow .18s ease, filter .18s ease}
    .btn-logout:before{content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%; transform:rotate(10deg); background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%); animation: shine 3.2s linear infinite}
    @keyframes shine{from{left:-70%}to{left:120%}}
    .btn-logout:hover{transform:translateY(-1px) scale(1.02); box-shadow:0 12px 34px rgba(201,124,44,.32); filter:saturate(1.05)}

    .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55)); background-size:200% 200%; animation:borderShift 8s ease-in-out infinite}
    @keyframes borderShift{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
    .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
    
    .chip{
      width:54px; height:54px;
      display:grid; place-items:center;
      border-radius:9999px;
      background: radial-gradient(120% 120% at 30% 25%, #ffe6c6 0%, #f7c489 55%, #e8a765 100%);
      box-shadow: 0 10px 24px rgba(201,124,44,.20), inset 0 1px 0 rgba(255,255,255,.8);
      border: 1px solid rgba(255,255,255,.8);
    }
    .chip svg{ width:22px; height:22px; color:#8a5a25; }
    
    .hover-lift{ transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s; }
    .hover-lift:hover{ transform:translateY(-4px); box-shadow:0 18px 38px rgba(201,124,44,.14); }
    
    .reveal{ opacity:0; transform:translateY(8px) scale(.985); animation:rise .6s ease forwards; }
    .r1{animation-delay:.05s} .r2{animation-delay:.1s} .r3{animation-delay:.15s}
    .r4{animation-delay:.2s} .r5{animation-delay:.25s} .r6{animation-delay:.3s}
    @keyframes rise{ to{ opacity:1; transform:translateY(0) scale(1);} }

    .overlay-root{position:fixed; inset:0; z-index:50;}
    .overlay-bg{position:absolute; inset:0; background:rgba(0,0,0,.32); backdrop-filter: blur(6px); opacity:0; animation: showBg .2s ease forwards}
    @keyframes showBg{to{opacity:1}}
    .overlay-panel{position:relative; margin:6rem auto 2rem; width:min(92%, 560px); border-radius:16px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.18)}
    .overlay-enter{transform:translateY(10px) scale(.98); opacity:0; animation: pop .22s ease forwards}
    @keyframes pop{to{transform:translateY(0) scale(1); opacity:1}}

    /* ==== Notifications & Messages POPUP (under header icons) ==== */
    .msg-wrap{
      position:relative;
    }

    .msg-panel{
      position:absolute;
      right:0;
      top:52px;
      width:360px;
      border-radius:18px;
      overflow:hidden;
      background:
        linear-gradient(
          to bottom,
          #FFF2DF 0px,
          #FFE7CB 54px,
          #FFFFFF 54px,
          #FFFFFF 100%
        );
      border:1px solid rgba(243,194,126,.9);
      box-shadow:
        0 18px 40px rgba(0,0,0,.16),
        0 0 0 1px rgba(255,255,255,.7);
      animation: pop .18s ease forwards;
      backdrop-filter: blur(6px);
      z-index:60;
    }

    .msg-panel-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:10px 16px;
      font-size:.9rem;
      font-weight:600;
      color:#7a4f1c;
    }
    .msg-panel-header-title{
      display:flex;
      align-items:center;
      gap:.5rem;
    }
    .msg-panel-header-title svg{
      width:16px;
      height:16px;
    }
    .msg-panel-header-close{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:26px;
      height:26px;
      border-radius:9999px;
      border:1px solid rgba(244,204,150,.9);
      background:#fff7ec;
      box-shadow:0 4px 8px rgba(201,124,44,.25);
      cursor:pointer;
      transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .msg-panel-header-close:hover{
      background:#ffe9cf;
      transform:translateY(-1px);
      box-shadow:0 6px 14px rgba(201,124,44,.32);
    }

    .msg-panel-body{
      padding:8px 0 10px;
      max-height:420px;
      overflow-y:auto;
      background:#ffffff;
    }

    .msg-panel-footer{
      padding:8px 16px 12px;
      border-top:1px solid rgba(240,210,168,.85);
      background:#ffffff;
      font-size:.88rem;
      color:#7a4f1c;
      text-align:center;
    }

    @media (max-width:480px){
      .msg-panel{
        right:8px;
        width:min(100vw - 24px, 360px);
      }
    }

    .skeleton{position:relative; overflow:hidden; background:#f3f3f3}
    .skeleton::after{content:""; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.6), rgba(255,255,255,0)); animation: shimmer 1.2s infinite}
    
    .brand-pop {
      background: linear-gradient(90deg, #E3B57E 0%, #F3C27E 25%, #E59B50 50%, #C97C2C 75%, #E3B57E 100%);
      background-size: 300% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
      animation: brandShimmer 6s ease-in-out infinite;
      letter-spacing: .2px;
    }
    @keyframes brandShimmer{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes shimmer{ from{transform:translateX(-100%)} to{transform:translateX(100%)} }

    /* ===== UI PATCH: tighter but neat icons on small screens ===== */

    /* === SCROLLABLE TABS STRIP (dashboard tabs) === */
    .tabs-scroll{
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch; 
      flex-wrap: nowrap;                  
    }
    .tabs-scroll::-webkit-scrollbar{
      display: none;                      
    }
      
    @media (max-width: 480px){
      .iconbar{
        gap: .35rem;
}

      .iconbar .icon-btn{
        width: 32px;
        height: 32px;
      }

      .iconbar .icon-btn svg{
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

      .brand-title{
        margin-right: .25rem;  
      }
    }

    /* === DASHBOARD STAT CARDS (MOBILE-ONLY SIZE TWEAK) === */
    .dashboard-stat-card .stat-card-content{
      transition: padding .2s ease;
    }

    @media (max-width: 640px){
      .dashboard-stat-grid{
        gap: 1rem; /* mas dikit ng konti yung pagitan ng cards sa mobile */
      }

      .dashboard-stat-card .stat-card-content{
        padding: 0.75rem 0.9rem; /* mas maliit na padding sa mobile */
      }

      .dashboard-stat-card .stat-label{
        font-size: 0.78rem;
      }

      .dashboard-stat-card .stat-value{
        font-size: 1.5rem;
        line-height: 1.7rem;
      }

      .dashboard-stat-card .chip{
        width: 42px;
        height: 42px;
      }

      .dashboard-stat-card .chip svg{
        width: 18px;
        height: 18px;
      }
    }

    .hdr-left{ flex: 1 1 auto; min-width: 0; }
    .hdr-right{ flex: 0 0 auto; margin-left: auto; }
    }
  `}</style>
  );

  return (
    <div className="min-h-screen relative">
      <Styles />

      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      <header className="head fixed top-0 left-0 right-0 z-[80]">
        <div className="head-bg" />
        <div
          className={`glass-soft header-gradient-line header-skin sticky-boost ${
            scrolled ? "is-scrolled" : ""
          }`}
        >
          {/* ===== Header Row (brand on left, icons on right) ===== */}
          <div className="max-w-7xl mx-auto px-4 py-3 hdr-pad flex items-center justify-between relative">
            {/* LEFT: brand + (desktop) identity */}
            <div className="flex items-center gap-3 hdr-left">
              {isVerified ? (
                <div
                  className="flex items-center gap-3 cursor-not-allowed opacity-60"
                  title="You are already logged in"
                >
                  <img
                    src="/images/DoughNationLogo.png"
                    alt="DoughNation logo"
                    className="shrink-0"
                    style={{
                      width: "28px",
                      height: "28px",
                      objectFit: "contain",
                    }}
                  />
                  <span
                    className="brand-title font-extrabold brand-pop"
                    style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}
                  >
                    DoughNation
                  </span>
                </div>
              ) : (
                <Link to="/" className="flex items-center gap-3">
                  <img
                    src="/images/DoughNationLogo.png"
                    alt="DoughNation logo"
                    className="shrink-0"
                    style={{
                      width: "28px",
                      height: "28px",
                      objectFit: "contain",
                    }}
                  />
                  <span
                    className="brand-title font-extrabold brand-pop"
                    style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}
                  >
                    DoughNation
                  </span>
                </Link>
              )}

              {/* Owner/Employee & Bakery Name (desktop only) */}
              {(isEmployeeMode || ownerName) && (
                <div
                  className="hidden lg:flex flex-col items-start justify-center ml-4 pl-4 border-l-2"
                  style={{ borderColor: "#E3B57E" }}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" style={{ color: "#7a4f1c" }} />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#7a4f1c" }}
                    >
                      {name}
                    </span>
                    {employeeRole ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                          color: "#7a4f1c",
                          border: "1px solid #fff3e0",
                        }}
                      >
                        {employeeRole}
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                          color: "#7a4f1c",
                          border: "1px solid #fff3e0",
                        }}
                      >
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Store
                      className="h-3.5 w-3.5"
                      style={{ color: "#a47134" }}
                    />
                    <span className="text-xs" style={{ color: "#a47134" }}>
                      {bakeryName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: actions */}
            <nav
              className="items-center gap-5 hdr-right"
              style={{ fontSize: 15 }}
            >
              <div className="pt-1 flex items-center gap-2 sm:gap-3 relative">
                <div className="iconbar shrink-0">
                  {/* desktop search only; mobile search below */}
                  <DashboardSearch size="sm" className="hidden md:flex" />

                  {/* Messages */}
                  <Messages1 currentUser={currentUser} />

                  {/* Notifications */}
                  <BakeryNotification />

                  {/* Profile */}
                  <button
                    className="icon-btn"
                    aria-label="Open profile"
                    onClick={() => navigate(`/bakery-dashboard/${id}/profile`)}
                    title="Profile"
                  >
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                      style={{
                        background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                        color: "#7a4f1c",
                        border: "1px solid #fff3e0",
                      }}
                    >
                      {name?.trim()?.charAt(0).toUpperCase() || " "}
                    </span>
                  </button>

                  <Button
                    onClick={handleLogout}
                    className="btn-logout flex items-center"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:flex">Log Out</span>
                  </Button>
                </div>
              </div>
            </nav>
          </div>

          {/* ===== Mobile info & search strip (UI-only) ===== */}
          {(isEmployeeMode || ownerName) && (
            <div className="md:hidden px-4 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: "#7a4f1c" }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#7a4f1c" }}
                  >
                    {name}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{
                      background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                      color: "#7a4f1c",
                      border: "1px solid #fff3e0",
                    }}
                  >
                    {employeeRole ? employeeRole : "Owner"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" style={{ color: "#a47134" }} />
                <span className="text-xs" style={{ color: "#a47134" }}>
                  {bakeryName}
                </span>
              </div>

              {/* Mobile search (same component) */}
              <div className="w-full">
                <DashboardSearch size="sm" className="md:hidden w-full" />
              </div>
            </div>
          )}

          {/* Mobile dropdown panel (left as-is) */}
          <div
            id="mobile-menu"
            className={`md:hidden transition-all duration-200 ease-out ${
              mobileOpen
                ? "max-h-96 opacity-100"
                : "max-h-0 opacity-0 pointer-events-none"
            } overflow-hidden`}
          >
            <div className="px-4 pb-3 pt-1 flex flex-col">
              {/* extra mobile content */}
            </div>
          </div>
        </div>
      </header>

      {unlockedBadge && (
        <UnlockModalBadge
          badge={unlockedBadge}
          onClose={() => setUnlockedBadge(null)}
        />
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (visibleTabs.includes(v)) setActiveTab(v);
        }}
      >
        <div className="seg-wrap">
          <div className="seg justify-center">
            <TabsList className="tabs-scroll flex items-center gap-1 bg-transparent p-0 border-0">
              {visibleTabs.includes("dashboard") && (
                <TabsTrigger
                  value="dashboard"
                  title="Dashboard"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("inventory") && (
                <TabsTrigger
                  value="inventory"
                  title="Inventory"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <PackageOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Inventory</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("donations") && (
                <TabsTrigger
                  value="donations"
                  title="For Donations"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <HandCoins className="w-4 h-4" />
                  <span className="hidden sm:inline">Donations</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("DONATIONstatus") && (
                <TabsTrigger
                  value="DONATIONstatus"
                  title="Donation Status"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <ListCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Donation Status</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("employee") && (
                <TabsTrigger
                  value="employee"
                  title="Employees"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Employees</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("complaints") && (
                <TabsTrigger
                  value="complaints"
                  title="Concerns"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <MessageSquareWarning className="w-4 h-4" />
                  <span className="hidden sm:inline">Concerns</span>
                </TabsTrigger>
              )}

              {visibleTabs.includes("reports") && (
                <TabsTrigger
                  value="reports"
                  title="Reports"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <FileBarChart className="w-4 h-4" />
                  <span className="hidden sm:inline">Reports</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("feedback") && (
                <TabsTrigger
                  value="feedback"
                  title="Feedback"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <MessageSquareDot className="w-4 h-4" />
                  <span className="hidden sm:inline">Feedback</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("badges") && (
                <TabsTrigger
                  value="badges"
                  title="Achievements"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full text-[#6b4b2b] hover:bg-amber-50"
                >
                  <Medal className="w-4 h-4" />
                  <span className="hidden sm:inline">Achievements</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-2 py-2">
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 dashboard-stat-grid">
              {/* Stat cards */}
              <div className="gwrap reveal r1 hover-lift dashboard-stat-card">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-4 sm:p-5 md:p-6 stat-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium stat-label"
                          style={{ color: "#6B4B2B" }}
                        >
                          Total Donations
                        </p>
                        <p
                          className="text-3xl font-extrabold stat-value"
                          style={{ color: "#2b1a0b" }}
                        >
                          {totals.grand_total.toLocaleString()}
                        </p>
                      </div>
                      <div className="chip">
                        <Heart className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap reveal r2 hover-lift dashboard-stat-card">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-4 sm:p-5 md:p-6 stat-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium stat-label"
                          style={{ color: "#6B4B2B" }}
                        >
                          Product in Inventory
                        </p>
                        <p
                          className="text-3xl font-extrabold stat-value"
                          style={{ color: "#2b1a0b" }}
                        >
                          {stats.totalInventory}
                        </p>
                      </div>
                      <div className="chip">
                        <Package className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap reveal r3 hover-lift dashboard-stat-card">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-4 sm:p-5 md:p-6 stat-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium stat-label"
                          style={{ color: "#6B4B2B" }}
                        >
                          Uploaded Products
                        </p>
                        <p
                          className="text-3xl font-extrabold stat-value"
                          style={{ color: "#2b1a0b" }}
                        >
                          {uploadedProducts}
                        </p>
                      </div>
                      <div className="chip">
                        <Upload className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap reveal r4 hover-lift dashboard-stat-card">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-4 sm:p-5 md:p-6 stat-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium stat-label"
                          style={{ color: "#6B4B2B" }}
                        >
                          Employee
                        </p>
                        <p
                          className="text-3xl font-extrabold stat-value"
                          style={{ color: "#2b1a0b" }}
                        >
                          {stats.employeeCount}
                        </p>
                      </div>
                      <div className="chip">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap reveal r5 hover-lift dashboard-stat-card">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-4 sm:p-5 md:p-6 stat-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium stat-label"
                          style={{ color: "#6B4B2B" }}
                        >
                          Expired Product
                        </p>
                        <p
                          className="text-3xl font-extrabold stat-value"
                          style={{ color: "#2b1a0b" }}
                        >
                          {stats.expiredProducts}
                        </p>
                      </div>
                      <div className="chip">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap reveal r6 hover-lift dashboard-stat-card">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-4 sm:p-5 md:p-6 stat-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium stat-label"
                          style={{ color: "#6B4B2B" }}
                        >
                          Nearing Expiration
                        </p>
                        <p
                          className="text-3xl font-extrabold stat-value"
                          style={{ color: "#2b1a0b" }}
                        >
                          {stats.nearingExpiration}
                        </p>
                      </div>
                      <div className="chip">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="gwrap hover-lift reveal">
                <Card className="glass-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: "#6B4B2B" }}>
                      Recent Donations
                    </CardTitle>
                    <CardDescription style={{ color: "#7b5836" }}>
                      <RecentDonations />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[10px]" />
                </Card>
              </div>

              <div className="gwrap hover-lift reveal">
                <Card className="glass-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: "#6B4B2B" }}>
                      Achievements &amp; Badges
                    </CardTitle>
                    <CardDescription style={{ color: "#7b5836" }}>
                      Your donation milestones
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <div
                      className="
          mt-2
          rounded-3xl
          border border-[#eadfce]
          bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
          shadow-[0_2px_8px_rgba(93,64,28,0.06)]
          h-auto max-h-[420px]
          md:h-[400px] md:max-h-none
        "
                    >
                      <div
                        className="
            bg-white/70
            border border-[#f2e3cf]
            rounded-2xl
            px-4 py-4
            sm:px-5 sm:py-5
            h-full
          "
                      >
                        {badges && badges.length > 0 ? (
                          <div className="max-h-[260px] lg:max-h-none overflow-y-auto">
                            <div
                              className="
                  grid
                  grid-cols-3 sm:grid-cols-4 lg:grid-cols-5
                  gap-x-8 gap-y-6
                "
                            >
                              {badges.map((userBadge) => {
                                const displayName =
                                  userBadge.badge_name &&
                                  userBadge.badge_name.trim() !== ""
                                    ? userBadge.badge_name
                                    : userBadge.badge?.name;

                                return (
                                  <div
                                    key={userBadge.id}
                                    className="flex flex-col items-center gap-2"
                                  >
                                    <img
                                      src={
                                        userBadge.badge?.icon_url
                                          ? `${API}/${userBadge.badge.icon_url}`
                                          : "/placeholder-badge.png"
                                      }
                                      alt={displayName}
                                      title={displayName}
                                      className="hover:scale-110 transition-transform"
                                      style={{
                                        width: "clamp(48px,5.5vw,64px)",
                                        height: "clamp(48px,5.5vw,64px)",
                                        objectFit: "contain",
                                      }}
                                    />
                                    <span
                                      className="
                          block
                          text-[11px]
                          leading-tight
                          text-center
                          text-[#7b5836]
                          max-w-[110px]
                          whitespace-normal
                        "
                                    >
                                      {displayName}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p
                            className="
                text-sm
                text-center
                text-[#7b5836]
              "
                          >
                            No badges unlocked yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="gwrap hover-lift reveal">
              <Card className="glass-card shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle style={{ color: "#6B4B2B" }}>Analytics</CardTitle>
                  <BakeryAnalytics currentUser={currentUser} />{" "}
                </CardHeader>
                <CardContent className="min-h-[120px]" />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BakeryInventory />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="donations" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BakeryDonation
                    highlightedDonationId={highlightedDonationId}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="DONATIONstatus" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BDonationStatus />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employee" className="reveal">
            <BakeryEmployee />
          </TabsContent>

          <TabsContent value="complaints" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <Complaint />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BakeryReports />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BFeedback />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="badges" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <AchievementBadges />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default BakeryDashboard;