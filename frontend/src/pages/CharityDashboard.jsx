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
import { HeartHandshake, PackageCheck, LogOut, CheckCircle } from "lucide-react";
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

const API = "https://api.doughnationhq.cloud";
const TAB_KEY = "charity_active_tab";
const ALLOWED_TABS = [
  "dashboard",
  "donation",
  "donationStatus",
  "received",
  "feedback",
];

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
      if (params.get("tab") !== activeTab) {
        params.set("tab", activeTab);
        const next = `${window.location.pathname}?${params.toString()}${
          window.location.hash
        }`;
        window.history.replaceState({}, "", next);
      }
    } catch {}
  }, [activeTab]);

  const [currentUser, setCurrentUser] = useState(null);
  const [totals, setTotals] = useState({
    grand_total: 0,
    normal_total: 0,
    direct_total: 0,
  });

  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
      }

      /* Background */
      .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
      .page-bg::before, .page-bg::after{content:""; position:absolute; inset:0}
      .page-bg::before{
        background:
          radial-gradient(1200px 520px at 12% -10%, #fff7ec 0%, #ffe7c8 42%, transparent 70%),
          radial-gradient(900px 420px at 110% 18%, rgba(255,208,153,.40), transparent 70%),
          linear-gradient(135deg, #FFF9EF 0%, #FFF2E3 60%, #FFE7D1 100%);
      }
      .page-bg::after{
        background: repeating-linear-gradient(-35deg, rgba(201,124,44,.06) 0 8px, rgba(201,124,44,0) 8px 18px);
        mix-blend-mode:multiply; opacity:.12;
      }
      .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.22}
      .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%);}
      .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%);}

      /* Header */
      .head{position:sticky; top:0; z-index:40; border-bottom:1px solid rgba(0,0,0,.06); backdrop-filter: blur(10px);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.92;
        background: linear-gradient(110deg, #ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%);
      }
      .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
      .brand{display:flex; gap:.8rem; align-items:center}
      .ring{width:48px; height:48px; border-radius:9999px; padding:2px;
        background:conic-gradient(from 210deg, #F7C789, #E8A765, #C97C2C, #E8A765, #F7C789)}
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}

      .title-ink{font-weight:800; letter-spacing:.2px;
        background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C);
        -webkit-background-clip:text; background-clip:text; color:transparent}
      .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem;
        padding:.28rem .6rem; font-size:.78rem; border-radius:9999px;
        color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0}

      /* Tabs */
      .tabwrap{max-width:80rem; margin:.75rem auto 0; padding:0 1rem;}
      .tabbar{display:flex; gap:.5rem; background:rgba(255,255,255,.95); border:1px solid rgba(0,0,0,.06);
        border-radius:16px; padding:.4rem; box-shadow:0 10px 26px rgba(201,124,44,.15); width:fit-content}
      .tabbar [role="tab"]{border-radius:12px; padding:.6rem 1rem; color:#6b4b2b; font-weight:800; letter-spacing:.2px}
      .tabbar [role="tab"][data-state="active"]{color:#fff;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
        box-shadow:0 8px 18px rgba(201,124,44,.28)}

      /* Cards */
      .gwrap{position:relative; border-radius:16px; padding:1px;
        background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55))}
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
      .metric{margin-top:.25rem; font-size:1.75rem; line-height:2rem; font-weight:900; letter-spacing:-.02em}

      /* Right-side icon cluster */
      .iconbar{display:flex; align-items:center; gap:.5rem}
      .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center;
        width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.9);
        border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14)}

      /* Logout */
      .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); color:#fff;
        border:1px solid rgba(255,255,255,.6); box-shadow:0 8px 26px rgba(201,124,44,.25)}
      .btn-logout:before{content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%;
        transform:rotate(10deg); background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%);
        animation: shine 3.2s linear infinite}
      @keyframes shine{from{left:-70%}to{left:120%}}

      /* Spinning logo (unchanged) */
      @keyframes spin360 { to { transform: rotate(360deg); } }
      .logo-spin { animation: spin360 8s linear infinite; transform-origin: center; }
      .logo-spin:hover { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) { .logo-spin { animation: none; } }

      /* >>> NEW: simple bounce-on-hover for specific icons only <<< */
      .bounce-hover{transition: transform .18s cubic-bezier(.34,1.56,.64,1);}
      .bounce-hover:hover{transform: translateY(-2px) scale(1.06);}
      .bounce-hover:active{transform: translateY(0) scale(.98);}
    `}</style>
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "FoodCharity");
        setIsVerified(decoded.is_verified);
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    }
  }, []);

  useEffect(() => {
    const handleSwitch = () => setActiveTab("donation");
    window.addEventListener("switch_to_donation_tab", handleSwitch);
    return () =>
      window.removeEventListener("switch_to_donation_tab", handleSwitch);
  }, []);

  useEffect(() => {
    const handleSwitch = () => setActiveTab("donationStatus");
    window.addEventListener("switch_to_donationStatus_tab", handleSwitch);
    return () =>
      window.removeEventListener("switch_to_donationStatus_tab", handleSwitch);
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

  // Verified pill content (shown only when verified)
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
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ring">
                <div>
                  {/* Spinning charity logo */}
                  <HeartHandshake className="h-6 w-6 text-amber-700 logo-spin" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="title-ink text-2xl sm:text-[26px] truncate">
                  {name}
                </h1>
                {verifiedPill && <span className="status-chip">{verifiedPill}</span>}
              </div>
            </div>

            {/* search + icons */}
            <div className="iconbar">
              <DashboardSearch size="sm" />

              <div className="icon-btn">
                <Messages currentUser={currentUser} compact />
              </div>

              {/* Bouncy notification icon */}
              <div className="icon-btn bounce-hover">
                <CharityNotification />
              </div>

              {/* Bouncy profile icon */}
              <button
                className="icon-btn cursor-pointer bounce-hover"
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="tabwrap">
          <div className="tabbar">
            <TabsList className="bg-transparent p-0 border-0">
              <TabsTrigger value="donation">Available Donation</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="donationStatus">Donation Status</TabsTrigger>
              <TabsTrigger value="received">Donation Received</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
              <div className="gwrap">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle
                          style={{ color: "#6B4B2B", fontWeight: "700" }}
                        >
                          Total Donations Received
                        </CardTitle>
                        <div className="metric">{totals.grand_total}</div>
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
              <div className="gwrap min-h-[560px]">
                <Card className="glass-card shadow-none h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: "#6B4B2B", fontWeight: "700" }}>
                      Recent Donations
                    </CardTitle>
                    <CardDescription>
                      A quick look at your latest completed donations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1">
                    <RecentDonations />
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap min-h-[560px]">
                <Card className="glass-card shadow-none h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: "#6B4B2B", fontWeight: "700" }}>
                      Feedback &amp; Ratings
                    </CardTitle>
                    <CardDescription>
                      Feedback from your partnered bakeries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1" />
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="received">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CardContent>
                  <CharityReceived />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle style={{ color: "#6B4B2B", fontWeight: "700" }}>
                    Feedback
                  </CardTitle>
                </CardHeader>
                <CFeedback />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="donation">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CharityDonation />
                <CardContent className="min-h-[40px]" />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="donationStatus">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CDonationStatus />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="complaints" className="reveal">
              <Complaint />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CharityDashboard;