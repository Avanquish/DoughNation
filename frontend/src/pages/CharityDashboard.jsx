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
  HeartHandshake,
  PackageCheck,
  LogOut,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CharityDonation from "./CharityDonation.jsx";
import Messages from "./Messages.jsx";
import CharityReceived from "./CharityReceived.jsx";
import CharityNotification from "./CharityNotification.jsx";
import CDonationStatus from "./CDonationStatus.jsx";
import CFeedback from "./CFeedback.jsx";
import RecentDonations from "./RecentDonations.jsx";
import DashboardSearch from "./DashboardSearch.jsx";
import Complaint from "./Complaint.jsx";
import CharityReports from "./CharityReports.jsx";

const API = "http://localhost:8000";
const TAB_KEY = "charity_active_tab";
const ALLOWED_TABS = [
  "dashboard",
  "donation",
  "donationStatus",
  "received",
  "feedback",
  // keep these to match the visible tabs and URL-sync behavior
  "complaints",
  "reports",
];

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
      .ring{width:48px; height:48px; border-radius:9999px; padding:2px; background:conic-gradient(from 210deg, #F7C789, #E8A765, #C97C2C, #E8A765, #F7C789); box-shadow:0 10px 24px rgba(201,124,44,.16); animation: spin 10s linear infinite; will-change: transform}
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
      .logo{transform-origin:50% 60%;}
      @keyframes spin{to{transform:rotate(360deg)}}
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
      .chip{width:54px; height:54px; display:grid; place-items:center; border-radius:9999px; background: radial-gradient(120% 120% at 30% 25%, #ffe6c6 0%, #f7c489 55%, #e8a765 100%); box-shadow: 0 10px 24px rgba(201,124,44,.20), inset 0 1px 0 rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.8);}
      .chip svg{width:22px; height:22px; color:#8a5a25}

      .hover-lift{transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s}
      .hover-lift:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(201,124,44,.14)}
      .reveal{opacity:0; transform:translateY(8px) scale(.985); animation:rise .6s ease forwards}
      .r1{animation-delay:.05s}.r2{animation-delay:.1s}.r3{animation-delay:.15s}.r4{animation-delay:.2s}.r5{animation-delay:.25s}.r6{animation-delay:.3s}
      @keyframes rise{to{opacity:1; transform:translateY(0) scale(1)}}
      /* ensure rotating ring like bakery */
      .ring{animation: spin 10s linear infinite; will-change: transform}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion: reduce){ .ring{animation:none} }
  `}</style>
);

const CharityDashboard = () => {
  const [name, setName] = useState("");
  const [isVerified, setIsVerified] = useState(false);

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
        // keep currentUser if you already set it elsewhere; we don't change logic beyond UI
        setCurrentUser((prev) => prev || { id: decoded.sub || decoded.id });
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
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

  const statusText = useMemo(() => {
    switch (activeTab) {
      case "donation":
        return "Donation";
      case "received":
        return "Received";
      case "feedback":
        return "Feedback";
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

      {/* Header */}
      <header className="head">
        <div className="head-bg" />
        <div className="head-inner">
          {/* same alignment & cluster as bakery */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="brand">
                <div className="ring">
                  <div>
                    <HeartHandshake className="h-6 w-6 text-amber-700 logo" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">
                    {name}
                  </h1>
                  {verifiedPill && (
                    <span className="status-chip">{verifiedPill}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right icon cluster: search, messages, bell, profile, logout */}
            <div className="iconbar">
              <DashboardSearch size="sm" />

              <div className="icon-btn">
                <Messages currentUser={currentUser} compact />
              </div>

              <div className="icon-btn">
                <CharityNotification />
              </div>

              <button
                className="icon-btn"
                title="Profile"
                onClick={() =>
                  navigate(`/charity-dashboard/${currentUser?.id || 0}/profile`)
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
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs styled like bakery */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (ALLOWED_TABS.includes(v)) setActiveTab(v);
        }}
      >
        <div className="seg-wrap">
          <div className="seg">
            <TabsList className="bg-transparent p-0 border-0">
              <TabsTrigger value="donation">Available Donation</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="donationStatus">Donation Status</TabsTrigger>
              <TabsTrigger value="received">Donation Received</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="reports">Generate Reports</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
              {/* metric card */}
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
            <Complaint />
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="reveal">
            <CharityReports />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CharityDashboard;