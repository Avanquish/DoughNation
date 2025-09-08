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
} from "lucide-react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import BakeryInventory from "./BakeryInventory";
import BakeryEmployee from "./BakeryEmployee";
import BakeryReports from "./BakeryReports";
import BakeryDonation from "./BakeryDonation";
import Messages from "./Messages";
import BakeryNotification from "./BakeryNotification";

const API = "http://localhost:8000";

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

//Dashboard
const BakeryDashboard = () => {
  const { id } = useParams();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  const [name, setName] = useState("Bakery");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Live data for cards
  const [inventory, setInventory] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);

  const navigate = useNavigate();

  // Fetch info
  useEffect(() => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Bakery");
      }
    } catch {}

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

    // initial
    loadInventory();
    loadEmployees();

    // listen for cross-page updates
    const onInventoryChange = () => loadInventory();
    const onEmployeesChange = () => loadEmployees();
    window.addEventListener("inventory:changed", onInventoryChange);
    window.addEventListener("employees:changed", onEmployeesChange);

    // refresh on focus
    const onFocus = () => {
      loadInventory();
      loadEmployees();
    };
    window.addEventListener("focus", onFocus);

    // safety polling
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
  }, []);

  // jump to Inventory when notifications request it
  useEffect(() => {
    const onOpen = (e) => {
      const detail = e.detail || {};
      setActiveTab("inventory");
      const base = `/bakery-dashboard/${id}`;
      navigate(`${base}?tab=inventory`, { replace: true });

      // ask Inventory to focus the specific item
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("inventory:focus", { detail }));
      });
    };

    window.addEventListener("inventory:open", onOpen);
    return () => window.removeEventListener("inventory:open", onOpen);
  }, [id, navigate]);

  // read ?tab= from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab");
    const allowed = ["dashboard", "inventory", "donation", "employee", "reports"];

    if (tabFromUrl && allowed.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab("dashboard");
    }

    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }, [location.search]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalProducts = inventory.length;
    const expiredProducts = inventory.filter(
      (i) => statusOf(i) === "expired"
    ).length;
    const nearingExpiration = inventory.filter(
      (i) => statusOf(i) === "soon"
    ).length;
    return {
      totalDonations: 0, // not wired yet
      totalInventory: totalProducts,
      uploadedProducts: 0, // not wired yet
      employeeCount,
      expiredProducts,
      nearingExpiration,
    };
  }, [inventory, employeeCount]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const statusText = useMemo(() => {
    switch (activeTab) {
      case "inventory":
        return "Inventory";
      case "employee":
        return "Employee";
      case "reports":
        return "Reports";
      default:
        return "Dashboard";
    }
  }, [activeTab]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);
  }, []);

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

      .seg-wrap{max-width:80rem; margin:.75rem auto 0; padding:0 1rem;}
      .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.08); width:fit-content}
      .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      .iconbar{display:flex; align-items:center; gap:.5rem}
      .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.9); border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14); transition:transform .18s ease, box-shadow .18s ease}
      .icon-btn:hover{transform:translateY(-1px); box-shadow:0 10px 22px rgba(201,124,44,.20)}

      .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); color:#fff; border:1px solid rgba(255,255,255,.6); box-shadow:0 8px 26px rgba(201,124,44,.25); transition:transform .18s ease, box-shadow .18s ease, filter .18s ease}
      .btn-logout:before{content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%; transform:rotate(10deg); background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%); animation: shine 3.2s linear infinite}
      @keyframes shine{from{left:-70%}to{left:120%}}
      .btn-logout:hover{transform:translateY(-1px) scale(1.02); box-shadow:0 12px 34px rgba(201,124,44,.32); filter:saturate(1.05)}

      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55)); background-size:200% 200%; animation:borderShift 8s ease-in-out infinite}
      @keyframes borderShift{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .chip{width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px; background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#8a5a25; border:1px solid #fff3e0; box-shadow:0 6px 18px rgba(201,124,44,.18)}
      .hover-lift{transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s}
      .hover-lift:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(201,124,44,.14)}

      /* (message/notification overlay styles left here in case other pages still use them) */
    `}</style>
  );

  return (
    <div className="min-h-screen relative">
      <Styles />

      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      <header className="head">
        <div className="head-bg" />
        <div className="head-inner">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="brand">
                <div className="ring">
                  <div>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 64 48"
                      aria-hidden="true"
                      className="bread"
                    >
                      <rect
                        x="4"
                        y="12"
                        rx="12"
                        ry="12"
                        width="56"
                        height="28"
                        fill="#E8B06A"
                      />
                      <path
                        d="M18 24c0-3 3-5 7-5s7 2 7 5m4 0c0-3 3-5 7-5s7 2 7 5"
                        stroke="#9A5E22"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">
                    {name}
                  </h1>
                  <span className="status-chip">{statusText}</span>
                </div>
              </div>
            </div>

            <div className="pt-1 iconbar">
              {/* Messages Button */}
              <Messages currentUser={currentUser} />

              {/* Notifications Bell */}
              <BakeryNotification />

              {/* Profile Icon */}
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
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          const base = `/bakery-dashboard/${id}`;
          const url = v === "dashboard" ? base : `${base}?tab=${v}`;
          navigate(url, { replace: true });
        }}
      >
        <div className="seg-wrap">
          <div className="seg">
            <TabsList className="bg-transparent p-0 border-0">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="donation">Donations</TabsTrigger>
              <TabsTrigger value="employee">Employee</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Donations
                        </p>
                        <p className="text-3xl font-extrabold">
                          {stats.totalDonations}
                        </p>
                      </div>
                      <div className="chip">
                        <Heart className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Product in Inventory
                        </p>
                        <p className="text-3xl font-extrabold">
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

              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Uploaded Products
                        </p>
                        <p className="text-3xl font-extrabold">
                          {stats.uploadedProducts}
                        </p>
                      </div>
                      <div className="chip">
                        <Upload className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Employee
                        </p>
                        <p className="text-3xl font-extrabold">
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

              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Expired Product
                        </p>
                        <p className="text-3xl font-extrabold">
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

              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Nearing Expiration
                        </p>
                        <p className="text-3xl font-extrabold">
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
              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle>Recent Donations</CardTitle>
                    <CardDescription>Not connected yet</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[120px]" />
                </Card>
              </div>

              <div className="gwrap hover-lift">
                <Card className="glass-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle>Achievements &amp; Badges</CardTitle>
                    <CardDescription>Your donation milestones</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[120px]" />
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <BakeryInventory />
          </TabsContent>

          <TabsContent value="donation">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <BakeryDonation />
                <CardContent className="min-h-[120px]" />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employee">
            <BakeryEmployee />
          </TabsContent>

          <TabsContent value="reports">
            <BakeryReports
              inventory={inventory}
              employeeCount={employeeCount}
              bakeryName={name}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default BakeryDashboard;

