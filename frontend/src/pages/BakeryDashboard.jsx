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
  Bell,
  MessageSquareText,
  X,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import BakeryInventory from "./BakeryInventory";
import BakeryEmployee from "./BakeryEmployee";
import BakeryDonation from "./BakeryDonation";
import Messages from "../pages/Messages";
import Complaint from "../pages/Complaint";
import BakeryReportGeneration from "../pages/BakeryReportGeneration";

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

const BakeryDashboard = () => {
  const { id } = useParams();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);
  const [name, setName] = useState("Bakery");
  const [activeTab, setActiveTab] = useState("dashboard");

  const [highlightedDonationId, setHighlightedDonationId] = useState(null);

  // Panels
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);

  // Live data for cards
  const [inventory, setInventory] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [uploadedProducts, setUploadedProducts] = useState(0);
  const [donatedProducts, setDonatedProducts] = useState(0);

  // Notification unread tracking
  const [readProductIds, setReadProductIds] = useState(new Set());
  const [readMessageIds, setReadMessageIds] = useState(new Set());

  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  // Fetch info
  useEffect(() => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Madam Bakery");
        setIsVerified(decoded.is_verified);
      }
    } catch (err){
      console.error("Error fetching bakery dashboard stats:", err);
    }

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
          const available = (r.data || []).filter((d) => d.status === "available").length;
          setUploadedProducts(available);
        })
        .catch(() => setUploadedProducts(0));

      const loadDonatedProducts = () =>
      axios
        .get(`${API}/donations`, { headers })
        .then((r) => {
          const donated = (r.data || []).filter((d) => d.status === "donated").length;
          setDonatedProducts(donated);
        })
        .catch(() => setDonatedProducts(0));

    // initial
    loadInventory();
    loadEmployees();
    loadUploadedProducts();
    loadDonatedProducts();

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

  useEffect(() => {
    // Example: fetch from localStorage or API
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);
  }, []);

  // read ?tab= from URL (e.g. /bakery-dashboard/:id?tab=inventory)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab");
    const allowed = ["dashboard", "inventory", "donations", "employee"];
    if (tabFromUrl && allowed.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
      requestAnimationFrame(() =>
        window.scrollTo({ top: 0, behavior: "smooth" })
      );
    }
  }, [location.search]);

  useEffect(() => {
  if (activeTab !== "donations") {
    setHighlightedDonationId(null);
  }
}, [activeTab]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalProducts = inventory.length;
    const expiredProducts = inventory.filter((i) => statusOf(i) === "expired").length;
    const nearingExpiration = inventory.filter((i) => statusOf(i) === "soon").length;
    return {
      totalDonations: donatedProducts,
      totalInventory: totalProducts,
      uploadedProducts,
      donatedProducts,
      employeeCount,
      expiredProducts,
      nearingExpiration,
    };
  }, [inventory, employeeCount, uploadedProducts, donatedProducts]);

  // Notifs
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
        status: st, // "expired" | "soon" | "fresh"
        days: d,
        dateText: item.expiration_date,
      });
    }
    return arr.sort((a, b) => {
      if (a.status !== b.status) return a.status === "expired" ? -1 : 1;
      return (a.days ?? 0) - (b.days ?? 0);
    });
  }, [inventory]);

  // design-only message notifs (no backend yet)
  const messageNotifs = useMemo(
    () => [
      { id: "msg-1", title: "New message (design)", snippet: "Placeholder only" },
      { id: "msg-2", title: "New message (design)", snippet: "Placeholder only" },
    ],
    []
  );

  const unreadProductCount = useMemo(
    () => productAlerts.filter((n) => !readProductIds.has(n.id)).length,
    [productAlerts, readProductIds]
  );
  const unreadMessageCount = useMemo(
    () => messageNotifs.filter((m) => !readMessageIds.has(m.id)).length,
    [messageNotifs, readMessageIds]
  );
  const totalUnread = unreadProductCount + unreadMessageCount;

  // ui helpers
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const statusText = useMemo(() => {
    switch (activeTab) {
      default:
        return (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Verified
          </span>
        );
    }
  }, [activeTab]);

  const openInventory = () => {
    setActiveTab("inventory");
    navigate(`/bakery-dashboard/${id}?tab=inventory`, { replace: true });
    setIsNotifOpen(false);
    setIsMsgOpen(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  useEffect(() => {
    document.documentElement.style.overflow = isNotifOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isNotifOpen]);

  const handleClickProductNotification = (n) => {
    setReadProductIds((prev) => {
      const next = new Set(prev);
      next.add(n.id);
      return next;
    });
    openInventory();
  };

  const handleClickMessageNotification = (m) => {
    setReadMessageIds((prev) => {
      const next = new Set(prev);
      next.add(m.id);
      return next;
    });
    setIsNotifOpen(false);
    setIsMsgOpen(true);
  };

    // If user is not verified, show "verification pending" screen
  if (!isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface to-primary/5 p-6">
        <Card className="max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle>Account Verification Required</CardTitle>
            <CardDescription>
              Hello {name}, your account is pending verification.  
              Please wait until an admin verifies your account before using the dashboard features.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={handleLogout} variant="destructive">
              Log Out
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

      .seg-wrap{max-width:80rem; margin:.75rem auto 0; padding:0 1rem;}
      .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.08); width:fit-content}
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
      .chip{width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px; background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#8a5a25; border:1px solid #fff3e0; box-shadow:0 6px 18px rgba(201,124,44,.18)}
      .hover-lift{transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s}
      .hover-lift:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(201,124,44,.14)}
      .reveal{opacity:0; transform:translateY(8px) scale(.985); animation:rise .6s ease forwards}
      .r1{animation-delay:.05s}.r2{animation-delay:.1s}.r3{animation-delay:.15s}.r4{animation-delay:.2s}.r5{animation-delay:.25s}.r6{animation-delay:.3s}
      @keyframes rise{to{opacity:1; transform:translateY(0) scale(1)}}

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
                    <svg width="28" height="28" viewBox="0 0 64 48" aria-hidden="true" className="bread">
                      <rect x="4" y="12" rx="12" ry="12" width="56" height="28" fill="#E8B06A" />
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
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">{name}</h1>
                  <span className="status-chip">{statusText}</span>
                </div>
              </div>
            </div>

            <div className="pt-1 iconbar">
              {/* messages (design for now)*/}
              <div className="msg-wrap">
                {isMsgOpen && (
                  <div className="msg-panel">
                    <div className="p-3 flex items-center justify-between border-b border-[rgba(0,0,0,.06)] bg-[#fff9f0]">
                      <div className="font-semibold text-sm text-[var(--ink)]">Messages</div>
                      <button
                        className="rounded-md p-1 hover:bg-black/5"
                        aria-label="Close messages"
                        onClick={() => setIsMsgOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ul className="max-h-[360px] overflow-auto">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <li key={idx} className="p-3 flex items-start gap-3 cursor-default">
                          <div className="chip shrink-0 skeleton" style={{ width: 40, height: 40, borderRadius: 9999 }} />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 rounded skeleton w-2/3" />
                            <div className="h-3 rounded skeleton w-5/6" />
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-30" />
                        </li>
                      ))}
                    </ul>
                    <div className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setIsMsgOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* notif icon */}
              <button
                className="icon-btn"
                aria-label="Open notifications"
                onClick={() => {
                  setIsNotifOpen(true);
                  setIsMsgOpen(false);
                }}
              >
                <Bell className="h-[18px] w-[18px]" />
                {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
              </button>

              {/* profile icon */}
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
                  {name ?.trim()?.charAt(0).toUpperCase() || " "}
                </span>
              </button>

              <Button onClick={handleLogout} className="btn-logout flex items-center">
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* notifs overlay */}
      {isNotifOpen && (
        <div className="overlay-root" role="dialog" aria-modal="true" aria-label="Notifications">
          <div className="overlay-bg" onClick={() => setIsNotifOpen(false)} />
          <div className="overlay-panel overlay-enter">
            <Card className="glass-card shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Product alerts & message notifications</CardDescription>
                  </div>
                  <button
                    className="rounded-md p-2 hover:bg-black/5"
                    aria-label="Close notifications"
                    onClick={() => setIsNotifOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <ul className="max-h-[60vh] overflow-auto divide-y divide-[rgba(0,0,0,.06)]">
                  <li className="p-3 text-xs font-semibold text-[var(--ink)] bg-[#fff9f0]">Inventory</li>
                  {productAlerts.length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">No inventory alerts.</li>
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
                          <div className="chip mt-0.5">
                            {n.status === "expired" ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold truncate">{n.name}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{n.dateText}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {n.status === "expired"
                                ? `${n.quantity} item(s) expired`
                                : `${n.quantity} item(s) expiring in ${n.days} day(s)`}
                            </p>
                            <div
                              className="mt-1 inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full border"
                              style={{
                                background: n.status === "expired" ? "#fff1f0" : "#fff8e6",
                                borderColor: n.status === "expired" ? "#ffd6d6" : "#ffe7bf",
                                color: n.status === "expired" ? "#c92a2a" : "#8a5a25",
                              }}
                            >
                              {n.status === "expired" ? "Expired" : "Expires Soon"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      </li>
                    ))}

                  <li className="p-3 text-xs font-semibold text-[var(--ink)] bg-[#fff9f0]">Messages</li>
                  {messageNotifs.filter((m) => !readMessageIds.has(m.id)).length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">No message notifications.</li>
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
                          <div className="chip mt-0.5">
                            <MessageSquareText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{m.title}</p>
                            <p className="text-sm text-muted-foreground">{m.snippet}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      </li>
                    ))}

                  <li className="p-4 bg-[#fff9f0]">
                    <div className="flex items-center gap-3">
                      <div className="chip">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">Inventory Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Expired: {stats.expiredProducts} • Nearing Expiration: {stats.nearingExpiration}
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>

                <div className="p-3 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsNotifOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={openInventory}>View Inventory</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Messages currentUser={currentUser} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="seg-wrap">
          <div className="seg">
            <TabsList className="bg-transparent p-0 border-0">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
              <TabsTrigger value="employee">Employee</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="reports">Report Generation</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="gwrap reveal r1 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Donations</p>
                        <p className="text-3xl font-extrabold">{stats.totalDonations}</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Product in Inventory</p>
                        <p className="text-3xl font-extrabold">{stats.totalInventory}</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Uploaded Products</p>
                        <p className="text-3xl font-extrabold">{stats.uploadedProducts}</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Employee</p>
                        <p className="text-3xl font-extrabold">{stats.employeeCount}</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Expired Product</p>
                        <p className="text-3xl font-extrabold">{stats.expiredProducts}</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Nearing Expiration</p>
                        <p className="text-3xl font-extrabold">{stats.nearingExpiration}</p>
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
                    <CardTitle>Recent Donations</CardTitle>
                    <CardDescription>Not connected yet</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[120px]" />
                </Card>
              </div>

              <div className="gwrap hover-lift reveal">
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

          <TabsContent value="inventory" className="reveal">
            <BakeryInventory />
          </TabsContent>

          <TabsContent value="donations" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <TabsContent value="donations" className="reveal">
                    <BakeryDonation highlightedDonationId={highlightedDonationId} />
                  </TabsContent>
                </CardHeader>
                <CardContent className="min-h-[120px]" />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employee" className="reveal">
            <BakeryEmployee />
          </TabsContent>

          <TabsContent value="complaints" className="reveal">
            <Complaint />
          </TabsContent>

          <TabsContent value="reports" className="reveal">
            <BakeryReportGeneration />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default BakeryDashboard;