import React, { useEffect, useMemo, useState } from "react";
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
  PackageCheck,
  LogOut,
  CheckCircle,
  Gift,
  LayoutGrid,
  Clock,
  HandCoins,
  MessageSquare,
  AlertTriangle,
  FileText,
  Users,
  Store,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import CharityDonation from "./CharityDonation.jsx";
import CharityReceived from "./CharityReceived.jsx";
import CharityNotification from "./CharityNotification.jsx";
import CDonationStatus from "./CDonationStatus.jsx";
import CFeedback from "./CFeedback.jsx";
import RecentDonations from "./RecentDonations.jsx";
import DashboardSearch from "./DashboardSearch.jsx";
import Complaint from "./Complaint.jsx";
import CharityReports from "./CharityReports.jsx";
import Messages1 from "./Messages1.jsx";

const API = "http://localhost:8000";
const TAB_KEY = "charity_active_tab";
const ALLOWED_TABS = [
  "dashboard",
  "donation",
  "donationStatus",
  "received",
  "feedback",
  "complaints",
  "reports",
];

/* ================= UI STYLES ONLY ================= */
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
      background: linear-gradient(110deg, #ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%);
      background-size: 220% 100%;
      animation: headerSlide 18s linear infinite;
    }
    @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}

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
    @keyframes brandShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

    .seg-wrap{max-width:80rem; margin:.75rem auto 0;}
    .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.10);}
    .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
    .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

    .iconbar{display:flex; align-items:center; gap:.5rem}
    .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.9); border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14); transition:transform .18s ease, box-shadow .18s ease}
    .icon-btn:hover{transform:translateY(-1px); box-shadow:0 10px 22px rgba(201,124,44,.20)}

    .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); color:#fff; border:1px solid rgba(255,255,255,.6); box-shadow:0 8px 26px rgba(201,124,44,.25); transition:transform .18s ease, box-shadow .18s ease, filter .18s ease}
    .btn-logout:before{content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%; transform:rotate(10deg); background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%); animation: shine 3.2s linear infinite}
    @keyframes shine{from{left:-70%}to{left:120%}}
    .btn-logout:hover{
      transform: translateY(-1px) scale(1.02);
      box-shadow: 0 12px 34px rgba(201,124,44,.32);
      filter: saturate(1.05);
    }

    .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55)); background-size:200% 200%; animation:borderShift 8s ease-in-out infinite}
    @keyframes borderShift{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
    .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
    .chip{width:54px; height:54px; display:grid; place-items:center; border-radius:9999px; background: radial-gradient(120% 120% at 30% 25%, #ffe6c6 0%, #f7c489 55%, #e8a765 100%); box-shadow: 0 10px 24px rgba(201,124,44,.20), inset 0 1px 0 rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.8);}
    .chip svg{width:22px; height:22px; color:#8a5a25}

    .hover-lift{transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s}
    .hover-lift:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(201,124,44,.14)}
    .reveal{opacity:0; transform:translateY(8px) scale(.985); animation:rise .6s ease forwards}
    .r1{animation-delay:.05s}.r2{animation-delay:.1s}.r3{animation-delay:.15s}.r4{animation-delay:.2s}.r5{animation-delay:.25s}.r6{animation-delay:.3s}
    @keyframes rise{to{opacity:1; transform:translateY(0) scale(1)}}

    /* Small UI tweaks for mobile (similar to BakeryDashboard) */
    @media (max-width: 420px){
      .iconbar .icon-btn{ width:36px; height:36px; }
      .brand-title{ margin-right:.25rem; }
    }
    .hdr-left{ flex: 1 1 auto; min-width: 0; }
    .hdr-right{ flex: 0 0 auto; margin-left: auto; }
  `}</style>
);

const CharityDashboard = () => {
  const [name, setName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("tab");
      if (fromUrl && ALLOWED_TABS.includes(fromUrl)) return fromUrl;

      const fromStorage = localStorage.getItem(TAB_KEY);
      if (fromStorage && ALLOWED_TABS.includes(fromStorage)) return fromStorage;

      return "donation";
    } catch {
      return "donation";
    }
  });

  const navigate = useNavigate();

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

  useEffect(() => {
    try {
      if (!activeTab) return;
      localStorage.setItem(TAB_KEY, activeTab);
      const params = new URLSearchParams(window.location.search);
      if (activeTab === "donation") {
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
    } catch {}
  }, [activeTab]);

  const [currentUser, setCurrentUser] = useState(null);
  const [totals, setTotals] = useState({
    grand_total: 0,
    normal_total: 0,
    direct_total: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "FoodCharity");
        setIsVerified(decoded.is_verified);
        setCurrentUser((prev) => prev || { id: decoded.sub || decoded.id });
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handleSwitchDonation = () => setActiveTab("donation");
    window.addEventListener("switch_to_donation_tab", handleSwitchDonation);
    return () =>
      window.removeEventListener(
        "switch_to_donation_tab",
        handleSwitchDonation
      );
  }, []);

  useEffect(() => {
    const handleSwitchStatus = () => setActiveTab("donationStatus");
    window.addEventListener("switch_to_donationStatus_tab", handleSwitchStatus);
    return () =>
      window.removeEventListener(
        "switch_to_donationStatus_tab",
        handleSwitchStatus
      );
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Chip text = current tab (instead of "Owner")
  const statusText = useMemo(() => {
    switch (activeTab) {
      case "donation":
        return "Donation";
      case "donationStatus":
        return "Donation Status";
      case "received":
        return "Received";
      case "feedback":
        return "Feedback";
      case "complaints":
        return "Complaints";
      case "reports":
        return "Reports";
      default:
        return "Dashboard";
    }
  }, [activeTab]);

  const verifiedPill = useMemo(() => {
    if (!isVerified) return null;
    return (
      <span
        className="flex items-center gap-1 font-bold"
        style={{ color: "#16a34a" }}
      >
        <CheckCircle className="w-4 h-4 text-green-600" />
        Verified
      </span>
    );
  }, [isVerified]);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const res = await fetch(`${API}/charity/total_donations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setTotals(data);
      } catch {}
    };
    fetchTotals();
  }, []);

  if (!isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface to-primary/5 p-6">
        <Card className="max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle>Account Verification Required</CardTitle>
            <CardDescription>
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

  return (
    <div className="min-h-screen relative">
      <Styles />

      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      {/* ================= HEADER ================= */}
      <header className="head fixed top-0 left-0 right-0 z-[80]">
        <div className="head-bg" />
        <div
          className={`glass-soft header-gradient-line header-skin sticky-boost ${
            scrolled ? "is-scrolled" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 hdr-pad flex items-center justify-between relative">
            {/* LEFT: brand + (desktop) charity identity */}
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

              {/* Identity block (desktop) */}
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
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                      color: "#7a4f1c",
                      border: "1px solid #fff3e0",
                    }}
                  >
                    {statusText}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Store className="h-3.5 w-3.5" style={{ color: "#a47134" }} />
                  <span className="text-xs" style={{ color: "#a47134" }}>
                    Charity
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: header actions */}
            <nav
              className="items-center gap-5 hdr-right"
              style={{ fontSize: 15 }}
            >
              <div className="pt-1 flex items-center gap-3 relative">
                <div className="iconbar">
                  {/* desktop search only; mobile search below */}
                  <DashboardSearch size="sm" className="hidden md:flex" />

                  {/* Messages Button */}
                  <Messages1 currentUser={currentUser} />

                  {/* Notifications Bell */}
                  <CharityNotification />

                  {/* Profile Icon */}
                  <button
                    className="icon-btn"
                    title="Profile"
                    onClick={() =>
                      navigate(
                        `/charity-dashboard/${currentUser?.id || 0}/profile`
                      )
                    }
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
          {name && (
            <div className="md:hidden px-4 pb-3 space-y-2">
              {/* row: user + current tab */}
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
                  {statusText}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" style={{ color: "#a47134" }} />
                <span className="text-xs" style={{ color: "#a47134" }}>
                  Charity
                </span>
              </div>

              {/* mobile search bar */}
              <div className="w-full">
                <DashboardSearch size="sm" className="md:hidden w-full" />
              </div>
            </div>
          )}

          {/* Mobile dropdown panel (placeholder) */}
          <div
            id="mobile-menu"
            className={`md:hidden transition-all duration-200 ease-out ${
              mobileOpen
                ? "max-h-96 opacity-100"
                : "max-h-0 opacity-0 pointer-events-none"
            } overflow-hidden`}
          >
            <div className="px-4 pb-3 pt-1 flex flex-col">
              {/* reserved for extra mobile content */}
            </div>
          </div>
        </div>
      </header>

      {/* ================= TABS ================= */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (ALLOWED_TABS.includes(v)) setActiveTab(v);
        }}
      >
        <div className="seg-wrap">
          <div className="seg justify-center">
            <TabsList className="bg-transparent p-0 border-0 flex flex-wrap gap-2">
              <TabsTrigger
                value="donation"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">Available Donation</span>
              </TabsTrigger>

              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>

              <TabsTrigger
                value="donationStatus"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Donation Status</span>
              </TabsTrigger>

              <TabsTrigger
                value="received"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <HandCoins className="w-4 h-4" />
                <span className="hidden sm:inline">Donation Received</span>
              </TabsTrigger>

              <TabsTrigger
                value="feedback"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Feedback</span>
              </TabsTrigger>

              <TabsTrigger
                value="complaints"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Complaints</span>
              </TabsTrigger>

              <TabsTrigger
                value="reports"
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="max-w-7xl mx-auto px-1 py-4">
          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
              <div className="gwrap reveal r1 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle
                          style={{ color: "#6B4B2B", fontWeight: 700 }}
                        >
                          Total Donations Received
                        </CardTitle>
                        <div
                          className="text-3xl font-extrabold"
                          style={{ color: "#2b1a0b" }}
                        >
                          {totals.grand_total}
                        </div>
                      </div>
                      <div className="chip">
                        <PackageCheck className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="gwrap hover-lift reveal">
                <Card className="glass-card shadow-none h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: "#6B4B2B", fontWeight: 700 }}>
                      Recent Donations
                    </CardTitle>
                    <CardDescription style={{ color: "#7b5836" }}>
                      A quick look at your latest completed donations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1">
                    <RecentDonations />
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap hover-lift reveal">
                <Card className="glass-card shadow-none h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: "#6B4B2B", fontWeight: 700 }}>
                      Feedback &amp; Ratings
                    </CardTitle>
                    <CardDescription style={{ color: "#7b5836" }}>
                      Feedback from your partnered bakeries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1" />
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Available Donation */}
          <TabsContent value="donation" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CharityDonation />
                <CardContent className="min-h-[40px]" />
              </Card>
            </div>
          </TabsContent>

          {/* Donation Status */}
          <TabsContent value="donationStatus" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CDonationStatus />
              </Card>
            </div>
          </TabsContent>

          {/* Received */}
          <TabsContent value="received" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent>
                  <CharityReceived />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle style={{ color: "#6B4B2B", fontWeight: 700 }}>
                    Feedback
                  </CardTitle>
                </CardHeader>
                <CFeedback />
              </Card>
            </div>
          </TabsContent>

          {/* Complaints */}
          <TabsContent value="complaints" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none p-4">
                <Complaint />
              </Card>
            </div>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none p-4">
                <CharityReports />
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CharityDashboard;
