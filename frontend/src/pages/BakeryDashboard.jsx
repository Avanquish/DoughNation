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
  Store
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import BakeryInventory from "./BakeryInventory";
import BakeryEmployee from "./BakeryEmployee";
import BakeryDonation from "./BakeryDonation";
import Messages from "../pages/Messages";
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
import { Link } from "react-router-dom";

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
  const [employeeRole, setEmployeeRole] = useState(null);
  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false); // TRUE for bakery owner login, FALSE for employee login
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);  // You used this inside useEffect
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

  // initialize from URL, localStorage, or default (always prefer "dashboard" on fresh load)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("tab");

      // If URL has tab param, use it
      if (fromUrl && ALLOWED_TABS.includes(fromUrl)) return fromUrl;

      // Otherwise, check localStorage (but only if URL doesn't exist)
      const fromStorage = localStorage.getItem(TAB_KEY);
      if (fromStorage && ALLOWED_TABS.includes(fromStorage)) return fromStorage;

      // Default to dashboard
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
        setIsVerified(true);
        setIsViewOnly(false);
        
        // 🏢 FETCH BAKERY NAME FROM TOKEN (most reliable source)
        const employeeToken = localStorage.getItem("employeeToken");
        
        if (employeeToken) {
          try {
            const decoded = JSON.parse(atob(employeeToken.split(".")[1]));
            console.log("🔍 Decoded employee token:", decoded);
            
            // Token includes bakery_name from backend
            const bakeryNameFromToken = decoded.bakery_name;
            
            if (bakeryNameFromToken) {
              console.log("✅ Using bakery name from token:", bakeryNameFromToken);
              setBakeryName(bakeryNameFromToken);
            } else {
              // Fallback: fetch from backend if not in token
              console.log("⚠️ No bakery_name in token, fetching from backend...");
              fetchBakeryNameFromBackend(employee.bakery_id);
            }
          } catch (err) {
            console.error("❌ Failed to decode token:", err);
            // Fallback to backend fetch
            fetchBakeryNameFromBackend(employee.bakery_id);
          }
        } else {
          console.log("❌ No employee token found");
          fetchBakeryNameFromBackend(employee.bakery_id);
        }
      }
    }, [employee, id]);

    // Helper function to fetch bakery name from backend
    const fetchBakeryNameFromBackend = async (bakeryId) => {
      try {
        const employeeToken = localStorage.getItem("employeeToken");
        const res = await axios.get(`${API}/users/${bakeryId}`, {
          headers: { Authorization: `Bearer ${employeeToken}` }
        });
        
        if (res.data && res.data.name) {
          console.log("✅ Fetched bakery name from backend:", res.data.name);
          setBakeryName(res.data.name);
        } else {
          console.log("❌ No bakery name in response");
          setBakeryName("Bakery");
        }
      } catch (err) {
        console.error("❌ Failed to fetch bakery name:", err);
        setBakeryName("Bakery");
      }
    };

  // Determine which tabs are visible based on role
  const getVisibleTabs = () => {
    if (!isEmployeeMode || !employeeRole) {
      // All tabs visible for bakery owner
      return ALLOWED_TABS;
    }

    // Normalize role for comparison (remove spaces, hyphens, lowercase)
    const role = employeeRole.toLowerCase().replace(/[-\s]/g, "");

    // 👑 OWNER & MANAGER: Full access to ALL tabs
    if (role === "owner" || role === "manager") {
      return ALLOWED_TABS;
    }

    // 👷 FULL-TIME: Limited access
    // Can access: dashboard, inventory, donations, donation status, complaints, feedback (view only), badges
    // Cannot access: employee management, reports
    else if (role.includes("fulltime") || role === "full") {
      return ALLOWED_TABS.filter(
        (tab) => tab !== "employee" && tab !== "reports"
      );
    }

    // 🚫 PART-TIME: Should not be able to log in (handled at backend)
    // If they somehow access, show nothing
    else if (role.includes("parttime") || role === "part") {
      return [];
    }

    // Default: show all tabs (fallback for unknown roles)
    return ALLOWED_TABS;
  };

  const visibleTabs = getVisibleTabs();

  // keep URL & localStorage in sync with activeTab
  useEffect(() => {
    try {
      if (!activeTab) return;
      localStorage.setItem(TAB_KEY, activeTab);

      const params = new URLSearchParams(window.location.search);

      // For "dashboard"
      if (activeTab === "dashboard") {
        if (params.has("tab")) {
          params.delete("tab");
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""
            }${window.location.hash}`;
          window.history.replaceState({}, "", next);
        }
      } else {
        if (params.get("tab") !== activeTab) {
          params.set("tab", activeTab);
          const next = `${window.location.pathname}?${params.toString()}${window.location.hash
            }`;
          window.history.replaceState({}, "", next);
        }
      }
    } catch {
      // ignore persistence errors
    }
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let decoded;
    try {
      decoded = JSON.parse(atob(token.split(".")[1]));
      // Only set name and bakeryName for bakery owners (not employees)
      if (!isEmployeeMode) {
        setName(decoded.name || "Madam Bakery");
        setBakeryName(decoded.name || "Bakery");

        // ✅ If bakery owner (user with token, not employee), set view-only mode
        setIsViewOnly(true); // Bakery owners can only view, employees can perform CRUD
      }
      setIsVerified(decoded.is_verified);
      const userId =
        decoded.sub || decoded.id || decoded.user_id || decoded._id;
      if (!userId) {
        console.error("User ID missing in token:", decoded);
        return;
      }

      // Fetch badges for the user
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

    // Fetch badges for the bakery (so employees can see the bakery's badges)
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
      .catch((err) => {
        console.error("Failed to fetch badges for employee:", err);
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
    // Get the appropriate token based on mode
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
        .then((r) => setEmployeeCount((r.data || []).length))
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

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [isEmployeeMode]);

  // ui helpers
  const handleLogout = () => {
    if (isEmployeeMode) {
      // Employee logout
      employeeLogout();
    } else {
      // Bakery owner logout
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

  // If user is not verified, show "verification pending" screen
  // BUT: Employees bypass this check since they're part of a verified bakery
  if (!isVerified && !isEmployeeMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface to-primary/5 p-6">
        <Card className="max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle style={{ color: "#6B4B2B" }}>
              Account Verification Required
            </CardTitle>
            <CardDescription style={{ color: "#7b5836" }}>
              Hello {name}, your account is pending verification. Please wait
              until an admin verifies your account before using the dashboard
              features.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={handleLogout} variant="destructive">
              Back to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    box-shadow: 0 8px 24px rgba(201, 124, 44, .10);}
    .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
    .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

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
    .chip svg{
      width:22px; height:22px;
      color:#8a5a25;
    }
    
    .hover-lift{
      transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s;
    }
    .hover-lift:hover{
      transform:translateY(-4px); 
      box-shadow:0 18px 38px rgba(201,124,44,.14);
    }
    
    .reveal{
      opacity:0; 
      transform:translateY(8px) scale(.985); 
      animation:rise .6s ease forwards;
    }
    .r1{animation-delay:.05s}
    .r2{animation-delay:.1s}
    .r3{animation-delay:.15s}
    .r4{animation-delay:.2s}
    .r5{animation-delay:.25s}
    .r6{animation-delay:.3s}
    
    @keyframes rise{
      to{
        opacity:1; 
        transform:translateY(0) scale(1);
      }
    }

    .overlay-root{position:fixed; inset:0; z-index:50;}
    .overlay-bg{position:absolute; inset:0; background:rgba(0,0,0,.32); backdrop-filter: blur(6px); opacity:0; animation: showBg .2s ease forwards}
    @keyframes showBg{to{opacity:1}}
    .overlay-panel{position:relative; margin:6rem auto 2rem; width:min(92%, 560px); border-radius:16px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.18)}
    .overlay-enter{transform:translateY(10px) scale(.98); opacity:0; animation: pop .22s ease forwards}
    @keyframes pop{to{transform:translateY(0) scale(1); opacity:1}}

    .msg-wrap{position:relative}
    .msg-panel{position:absolute; right:0; top:48px; width:340px; background:rgba(255,255,255,.98); border:1px solid rgba(0,0,0,.06); border-radius:14px; box-shadow:0 18px 40px rgba(0,0,0,.14); overflow:hidden; animation: pop .18s ease forwards}
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
    
    @keyframes brandShimmer{
      0%{background-position:0% 50%}
      50%{background-position:100% 50%}
      100%{background-position:0% 50%}
    }
    
    @keyframes shimmer{
      from{transform:translateX(-100%)}
      to{transform:translateX(100%)}
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
        <div className={`glass-soft header-gradient-line header-skin sticky-boost ${scrolled ? "is-scrolled" : ""}`}>
          <div className="max-w-7xl mx-auto px-4 py-3 hdr-pad flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              {/* DoughNation Logo - Disabled when logged in */}
              {isVerified ? (
                <div className="flex items-center gap-3 cursor-not-allowed opacity-60" title="You are already logged in">
                  <img src="/images/DoughNationLogo.png" alt="DoughNation logo" className="shrink-0" style={{
                    width: "28px",
                    height: "28px", objectFit: "contain"
                  }} />
                  <span className="font-extrabold brand-pop" style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}>
                    DoughNation
                  </span>
                </div>
              ) : (
                <Link to="/" className="flex items-center gap-3">
                  <img src="/images/DoughNationLogo.png" alt="DoughNation logo" className="shrink-0" style={{
                    width: "28px",
                    height: "28px", objectFit: "contain"
                  }} />
                  <span className="font-extrabold brand-pop" style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}>
                    DoughNation
                  </span>
                </Link>
              )}

              {/* Employee & Bakery Name Display - Beside DoughNation */}
              {isEmployeeMode && (
                <div className="hidden lg:flex flex-col items-start justify-center ml-4 pl-4 border-l-2" style={{ borderColor: "#E3B57E" }}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" style={{ color: "#7a4f1c" }} />
                    <span className="text-sm font-semibold" style={{ color: "#7a4f1c" }}>
                      {name}
                    </span>
                    {employeeRole && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                          color: "#7a4f1c",
                          border: "1px solid #fff3e0"
                        }}
                      >
                        {employeeRole}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Store className="h-3.5 w-3.5" style={{ color: "#a47134" }} />
                    <span className="text-xs" style={{ color: "#a47134" }}>
                      {bakeryName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop nav */}
            <nav className="items-center gap-5" style={{ fontSize: 15 }}>
              <div className="pt-1 flex items-center gap-3 relative">
                <div className="iconbar">
                  <DashboardSearch size="sm" className="hidden md:flex" />

                  {/* Messages Button */}
                  <Messages1 currentUser={currentUser} />

                  {/* Notifications Bell */}
                  <BakeryNotification />

                  {/* Profile Icon */}
                  <button className="icon-btn" aria-label="Open profile" onClick={() =>
                    navigate(`/bakery-dashboard/${id}/profile`)}
                    title="Profile"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                      style={{
                        background: "linear-gradient(180deg,#FFE7C5,#F7C489)", color: "#7a4f1c",
                        border: "1px solid #fff3e0",
                      }}>
                      {name?.trim()?.charAt(0).toUpperCase() || " "}
                    </span>
                  </button>

                  <Button onClick={handleLogout} className="btn-logout flex items-center">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:flex">Log Out</span>
                  </Button>
                </div>
              </div>
            </nav>
          </div>
          {/* Mobile dropdown panel */}
          <div id="mobile-menu" className={`md:hidden transition-all duration-200 ease-out ${mobileOpen
            ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none"} overflow-hidden`}>
            <div className="px-4 pb-3 pt-1 flex flex-col">
              {/*
        <NotificationAction /> */}
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
            <TabsList className="flex items-center gap-1 bg-transparent p-0 border-0 overflow-x-auto no-scrollbar">
              {visibleTabs.includes("dashboard") && (
                <TabsTrigger value="dashboard" title="Dashboard"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("inventory") && (
                <TabsTrigger value="inventory" title="Inventory"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">
                  <PackageOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Inventory</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("donations") && (
                <TabsTrigger
                  value="donations" title="For Donations"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                >
                  <HandCoins className="w-4 h-4" />
                  <span className="hidden sm:inline">Donations</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("DONATIONstatus") && (
                <TabsTrigger
                  value="DONATIONstatus" title="Donation Status"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                >
                  <ListCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Donation Status</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("employee") && (
                <TabsTrigger
                  value="employee" title="Employees"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Employees</span>
                </TabsTrigger>

              )}
              {visibleTabs.includes("complaints") && (
                <TabsTrigger
                  value="complaints" title="Complaints"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                >
                  <MessageSquareWarning className="w-4 h-4" />
                  <span className="hidden sm:inline">Complaints</span>
                </TabsTrigger>

              )}
              {visibleTabs.includes("reports") && (
                <TabsTrigger
                  value="reports" title="Reports"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                >
                  <FileBarChart className="w-4 h-4" />
                  <span className="hidden sm:inline">Reports</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("feedback") && (
                <TabsTrigger
                  value="feedback" title="Feedback"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                >
                  <MessageSquareDot className="w-4 h-4" />
                  <span className="hidden sm:inline">Feedback</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes("badges") && (
                <TabsTrigger
                  value="badges" title="Achievements"
                  className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
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
          {/* View-Only Mode Banner for Bakery Owners */}
          {isViewOnly && (
            <div
              className="mb-6 p-4 rounded-lg border-2 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500"
              style={{
                background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)",
                borderColor: "#FFB74D",
                boxShadow: "0 4px 12px rgba(255, 152, 0, 0.15)"
              }}
            >
              <AlertTriangle
                className="h-5 w-5 mt-0.5 flex-shrink-0"
                style={{ color: "#F57C00" }}
              />
              <div className="flex-1">
                <h3
                  className="font-bold text-base mb-1"
                  style={{ color: "#E65100" }}
                >
                  View-Only Mode
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#7a4f1c" }}
                >
                  You are logged in as a <strong>Bakery Account</strong>. All data modification operations are disabled for this account, including:
                  <br />
                  • Cannot add, edit, or delete <strong>inventory items</strong>
                  <br />
                  • Cannot send <strong>donations</strong>
                  <br />
                  • Cannot add, edit, or delete <strong>employees</strong>
                  <br />
                  • Cannot <strong>submit complaints</strong>
                  <br />
                  • Cannot <strong>generate or download reports</strong>
                  <br />
                  • Cannot <strong>reply to feedback</strong>
                  <br /><br />
                  Only <strong>employees</strong> can perform these operations. You can view all information but cannot make changes.
                </p>
              </div>
            </div>
          )}

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stat cards */}
              <div className="gwrap reveal r1 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B4B2B" }}
                        >
                          Total Donations
                        </p>
                        <p
                          className="text-3xl font-extrabold"
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

              <div className="gwrap reveal r2 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B4B2B" }}
                        >
                          Product in Inventory
                        </p>
                        <p
                          className="text-3xl font-extrabold"
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

              <div className="gwrap reveal r3 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B4B2B" }}
                        >
                          Uploaded Products
                        </p>
                        <p
                          className="text-3xl font-extrabold"
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

              <div className="gwrap reveal r4 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B4B2B" }}
                        >
                          Employee
                        </p>
                        <p
                          className="text-3xl font-extrabold"
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

              <div className="gwrap reveal r5 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B4B2B" }}
                        >
                          Expired Product
                        </p>
                        <p
                          className="text-3xl font-extrabold"
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

              <div className="gwrap reveal r6 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B4B2B" }}
                        >
                          Nearing Expiration
                        </p>
                        <p
                          className="text-3xl font-extrabold"
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

                  {/* >>> BADGES GRID — EXACTLY 5 PER ROW + SMALLER ICONS <<< */}
                  <CardContent
                    className="
                      min-h-[404px]
                      grid
                      [grid-template-columns:repeat(5,minmax(0,1fr))]
                      gap-x-[clamp(12px,2.6vw,32px)]
                      gap-y-[clamp(10px,2vw,24px)]
                      items-start
                    "
                  >
                    {badges && badges.length > 0 ? (
                      badges.map((userBadge) => (
                        <div
                          key={userBadge.id}
                          className="flex flex-col items-center justify-start"
                        >
                          <img
                            src={
                              userBadge.badge?.icon_url
                                ? `${API}/${userBadge.badge.icon_url}`
                                : "/placeholder-badge.png"
                            }
                            alt={userBadge.badge?.name}
                            title={userBadge.badge?.name}
                            className="hover:scale-110 transition-transform"
                            style={{
                              /* smaller icons */
                              width: "clamp(44px,5.5vw,64px)",
                              height: "clamp(44px,5.5vw,64px)",
                              objectFit: "contain",
                            }}
                          />
                          {/* Keep label block-level; slightly narrower width to match smaller icon */}
                          <span
                            className="
                              block
                              text-[11px]
                              mt-2
                              leading-tight
                              text-center
                              truncate
                              w-[96px]
                            "
                            title={
                              userBadge.badge_name &&
                                userBadge.badge_name.trim() !== ""
                                ? userBadge.badge_name
                                : userBadge.badge?.name
                            }
                          >
                            {userBadge.badge_name &&
                              userBadge.badge_name.trim() !== ""
                              ? userBadge.badge_name
                              : userBadge.badge?.name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm" style={{ color: "#7b5836" }}>
                        No badges unlocked yet.
                      </p>
                    )}
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
                    isViewOnly={isViewOnly}
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
            <BakeryEmployee isViewOnly={isViewOnly} />
          </TabsContent>

          <TabsContent value="complaints" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <Complaint isViewOnly={isViewOnly} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BakeryReports isViewOnly={isViewOnly} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <BFeedback isViewOnly={isViewOnly} />
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