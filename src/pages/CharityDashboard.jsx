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
  MessageCircleHeart,
  LogOut,
  Smile,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CharityDonation from "./CharityDonation.jsx";
import Messages from "./Messages.jsx";
import CharityReceived from "./CharityReceived.jsx";
import CharityNotification from "./CharityNotification.jsx";

const CharityDashboard = () => {
  const [name, setName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState("donation");
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

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
    const handleSwitch = () => setActiveTab("received");
    window.addEventListener("switch_to_received_tab", handleSwitch);
    return () =>
      window.removeEventListener("switch_to_received_tab", handleSwitch);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);
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

      /* Bakery-style segmented tabs */
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
      .chip{width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px;
        background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#8a5a25; border:1px solid #fff3e0}
      .metric{margin-top:.25rem; font-size:1.75rem; line-height:2rem; font-weight:900; letter-spacing:-.02em}

      /* Right-side icon cluster (matches Bakery) */
      .iconbar{display:flex; align-items:center; gap:.5rem}
      .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center;
        width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.9);
        border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14)}

      /* Logout button like Bakery */
      .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); color:#fff;
        border:1px solid rgba(255,255,255,.6); box-shadow:0 8px 26px rgba(201,124,44,.25)}
      .btn-logout:before{content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%;
        transform:rotate(10deg); background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%);
        animation: shine 3.2s linear infinite}
      @keyframes shine{from{left:-70%}to{left:120%}}
    `}</style>
  );

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
              Log Out
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

      {/* Header */}
      <header className="head">
        <div className="head-bg" />
        <div className="head-inner">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ring">
                <div>
                  <HeartHandshake className="h-6 w-6 text-amber-700" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="title-ink text-2xl sm:text-[26px] truncate">
                  {name}
                </h1>
                <span className="status-chip">{statusText}</span>
              </div>
            </div>
            <div className="iconbar">
              <div className="icon-btn">
                <Messages currentUser={currentUser} compact />
              </div>

              <div className="icon-btn">
                <CharityNotification />
              </div>

              {/* Simple profile initial (backend not wired yet) */}
              <span className="icon-btn" title="Profile">
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
              </span>

              <Button onClick={handleLogout} className="btn-logout flex items-center">
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
              <TabsTrigger value="donation">Donation</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="gwrap">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Donations Received
                        </p>
                        <div className="metric">0</div>
                      </div>
                      <div className="chip">
                        <PackageCheck className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Partnered Bakeries
                        </p>
                        <div className="metric">0</div>
                      </div>
                      <div className="chip">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="gwrap">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Badges Earned
                        </p>
                        <div className="metric">0</div>
                      </div>
                      <div className="chip">
                        <Smile className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="gwrap">
                <Card className="glass-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle>Recent Donations</CardTitle>
                    <CardDescription>
                      Donations you've recently accepted
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <div className="gwrap">
                <Card className="glass-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle>Feedback &amp; Ratings</CardTitle>
                    <CardDescription>
                      Feedback from your partnered bakeries
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Received */}
          <TabsContent value="received">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CardContent>
                  <CharityReceived />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle>Feedback</CardTitle>
                  <CardDescription>Charity feedback system</CardDescription>
                </CardHeader>
                <CardContent>
                  <MessageCircleHeart className="h-8 w-8 text-amber-700" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    You have no feedback yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Donation */}
          <TabsContent value="donation">
            <div className="gwrap">
              <Card className="glass-card shadow-none">
                <CharityDonation />
                <CardContent className="min-h-[40px]" />
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CharityDashboard;
