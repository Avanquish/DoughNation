import React, { useEffect, useState } from "react";
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
  LogOut,
  MessageSquareText,
  Bell,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";

export default function CharityProfile() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = new Set(["about", "history", "analytics"]);

  const [name, setName] = useState("Charity4Us");
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const q = searchParams.get("cptab");
    const saved = localStorage.getItem("charityProfileTab");
    return validTabs.has(q) ? q : validTabs.has(saved) ? saved : "about";
  });
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Charity4Us");
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = isNotifOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isNotifOpen]);

  // Sync tab to URL + localStorage (no history spam)
  useEffect(() => {
    localStorage.setItem("charityProfileTab", activeSubTab);
    const next = new URLSearchParams(searchParams);
    if (next.get("cptab") !== activeSubTab) {
      next.set("cptab", activeSubTab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  // React to back/forward changing ?cptab
  useEffect(() => {
    const q = searchParams.get("cptab");
    if (q && validTabs.has(q) && q !== activeSubTab) setActiveSubTab(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Back to CharityDashboard, restoring last tab
  const goBack = () => {
    const last = localStorage.getItem("charityDashTab") || "dashboard";
    navigate(`/charity-dashboard/${id}?tab=${last}`, { replace: true });
  };

  // ===== Styles to match Bakery (plus animated logo) =====
  const Styles = () => (
    <style>{`
      :root{--ink:#7a4f1c; --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327}
      .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
      .page-bg::before{content:""; position:absolute; inset:0;
        background:linear-gradient(135deg,#FFF9EF 0%,#FFF2E3 60%,#FFE7D1 100%);}
      .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.22}
      .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%)}
      .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%)}

      .head{position:sticky; top:0; z-index:40; border-bottom:1px solid rgba(0,0,0,.06); backdrop-filter:blur(10px);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.92;
        background:linear-gradient(110deg,#ffffff 0%,#fff8ec 28%,#ffeccd 55%,#ffd7a6 100%); background-size:220% 100%;}
      .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
      .brand{display:flex; gap:.8rem; align-items:center}
      .ring{
        width:48px; height:48px; border-radius:9999px; padding:2px;
        background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789);
        animation:ringSpin 12s linear infinite; box-shadow:0 10px 24px rgba(201,124,44,.16);
      }
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
      .brand-icon{
        transform-origin:50% 60%;
        filter:drop-shadow(0 2px 4px rgba(201,124,44,.25));
        animation:iconFloat 5.5s ease-in-out infinite;
        color:#9A5E22;
      }
      @keyframes ringSpin { to { transform: rotate(360deg) } }
      @keyframes iconFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

      .title-ink{font-weight:800; letter-spacing:.2px;
        background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C); background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent}
      .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem; padding:.28rem .6rem;
        font-size:.78rem; border-radius:9999px; color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0}

      .iconbar{display:flex; align-items:center; gap:.5rem}
      .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px;
        border-radius:9999px; background:rgba(255,255,255,.9); border:1px solid rgba(0,0,0,.06)}
      .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); color:#fff; border:1px solid rgba(255,255,255,.6)}

      .overlay-root{position:fixed; inset:0; z-index:50;}
      .overlay-bg{position:absolute; inset:0; background:rgba(0,0,0,.32); backdrop-filter:blur(6px); opacity:0; animation:showBg .2s ease forwards}
      @keyframes showBg{to{opacity:1}}
      .overlay-panel{position:relative; margin:6rem auto 2rem; width:min(92%,560px); border-radius:16px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.18)}
      .overlay-enter{transform:translateY(10px) scale(.98); opacity:0; animation:pop .22s ease forwards}
      @keyframes pop{to{transform:translateY(0) scale(1); opacity:1}}

      .msg-wrap{position:relative}
      .msg-panel{position:absolute; right:0; top:48px; width:340px; background:rgba(255,255,255,.98); border:1px solid rgba(0,0,0,.06);
        border-radius:14px; box-shadow:0 18px 40px rgba(0,0,0,.14); overflow:hidden; animation:pop .18s ease forwards}
      .skeleton{position:relative; overflow:hidden; background:#f3f3f3}
      .skeleton::after{content:""; position:absolute; inset:0; transform:translateX(-100%);
        background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.6), rgba(255,255,255,0)); animation:shimmer 1.2s infinite}
      @keyframes shimmer{100%{transform:translateX(100%)}}

      .gwrap{position:relative; border-radius:16px; padding:1px;
        background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55)); background-size:200% 200%}
      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .chip{width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px;
        background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#8a5a25; border:1px solid #fff3e0}

      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 16px 40px rgba(201,124,44,.12)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0)), linear-gradient(135deg,#f9e7cf,#f7c78a);}
      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px;
        background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      .subseg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem;
        box-shadow:0 8px 24px rgba(201,124,44,.08); width:fit-content}
      .subseg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .subseg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3))}

      /* bakery-style primary buttons */
      .btn-primary{
        position:relative; overflow:hidden;
        border-radius:9999px; padding:.58rem 1.1rem; gap:.5rem;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
        color:#fff; border:1px solid rgba(255,255,255,.6);
        box-shadow:0 8px 26px rgba(201,124,44,.25);
      }
      .bouncy{transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;}
      .bouncy:hover{transform: translateY(-1px) scale(1.02); box-shadow:0 12px 34px rgba(201,124,44,.30); filter:saturate(1.03);}
      .bouncy:active{transform: translateY(0) scale(.98);}
    `}</style>
  );

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="brand">
                <div className="ring">
                  <div>
                    <HeartHandshake className="h-6 w-6 brand-icon" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">
                    {name}
                  </h1>
                  <span className="status-chip">Profile</span>
                </div>
              </div>
            </div>

            <div className="pt-1 iconbar">
              <button
                className="icon-btn"
                aria-label="Back to dashboard"
                title="Back to Dashboard"
                onClick={goBack}
              >
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>

              <div className="msg-wrap">
                <button
                  className="icon-btn"
                  aria-label="Open messages"
                  onClick={() => {
                    setIsMsgOpen((v) => !v);
                    setIsNotifOpen(false);
                  }}
                >
                  <MessageSquareText className="h-[18px] w-[18px]" />
                </button>
                {isMsgOpen && (
                  <div className="msg-panel">
                    <div className="p-3 flex items-center justify-between border-b border-[rgba(0,0,0,.06)] bg-[#fff9f0]">
                      <div className="font-semibold text-sm text-[var(--ink)]">
                        Messages
                      </div>
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
                        <li
                          key={idx}
                          className="p-3 flex items-start gap-3 cursor-default"
                        >
                          <div
                            className="chip skeleton"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 9999,
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 rounded skeleton w-2/3" />
                            <div className="h-3 rounded skeleton w-5/6" />
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-30" />
                        </li>
                      ))}
                    </ul>
                    <div className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsMsgOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="icon-btn"
                aria-label="Open notifications"
                onClick={() => {
                  setIsNotifOpen(true);
                  setIsMsgOpen(false);
                }}
              >
                <Bell className="h-[18px] w-[18px]" />
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

      {/* Notifications (placeholder, same overlay shell) */}
      {isNotifOpen && (
        <div
          className="overlay-root"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
        >
          <div className="overlay-bg" onClick={() => setIsNotifOpen(false)} />
          <div className="overlay-panel overlay-enter">
            <Card className="glass-card shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                      Donation & message notifications
                    </CardDescription>
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
                  <li className="p-3 text-xs font-semibold text-[var(--ink)] bg-[#fff9f0]">
                    Donations
                  </li>
                  <li className="p-6 text-sm text-muted-foreground">
                    No donation alerts.
                  </li>
                  <li className="p-3 text-xs font-semibold text-[var(--ink)] bg-[#fff9f0]">
                    Messages
                  </li>
                  <li className="p-6 text-sm text-muted-foreground">
                    No message notifications.
                  </li>
                </ul>
                <div className="p-3 text-right">
                  <Button variant="ghost" onClick={() => setIsNotifOpen(false)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Hero + sub-tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="avatar-ring shrink-0">
                <img
                  alt="Charity Avatar"
                  src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=400&auto=format&fit=crop"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
                  {name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome to your public profile.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="btn-primary bouncy"
                    onClick={() =>
                      navigate(`/charity-dashboard/${id}/profile/edit`)
                    }
                  >
                    Edit Profile
                  </Button>
                  <Button
                    className="btn-primary bouncy"
                    onClick={() => navigate("/change-password")}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="subseg">
                  <TabsList className="bg-transparent p-0 border-0">
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="history">Donation History</TabsTrigger>
                    <TabsTrigger value="analytics">
                      Analytics & Badges
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle>About</CardTitle>
                        <CardDescription>
                          Tell donors and partners more about your org
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-[15px] leading-relaxed">
                          Update this section in <em>Edit Profile</em> to
                          display your mission, programs, and the communities
                          you serve.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg border bg-white/70">
                            <div className="text-sm text-muted-foreground">
                              Partnered Bakeries
                            </div>
                            <div className="text-2xl font-bold">0</div>
                          </div>
                          <div className="p-4 rounded-lg border bg-white/70">
                            <div className="text-sm text-muted-foreground">
                              Donations Received
                            </div>
                            <div className="text-2xl font-bold">0</div>
                          </div>
                          <div className="p-4 rounded-lg border bg-white/70">
                            <div className="text-sm text-muted-foreground">
                              Badges
                            </div>
                            <div className="text-2xl font-bold">0</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle>Donation History</CardTitle>
                        <CardDescription>
                          Recent donations will appear here
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="min-h-[140px]" />
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="pt-6 space-y-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle>Badges</CardTitle>
                        <CardDescription />
                      </CardHeader>
                      <CardContent className="min-h-[80px]" />
                    </Card>
                  </div>

                  <div className="gwrap">
                    <Card className="glass-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle>Activity Overview</CardTitle>
                        <CardDescription>
                          Your recent progress at a glance
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg border bg-white/70 text-center">
                          <div className="text-sm text-muted-foreground">
                            Total Donations
                          </div>
                          <div className="text-2xl font-bold">0</div>
                        </div>
                        <div className="p-4 rounded-lg border bg-white/70 text-center">
                          <div className="text-sm text-muted-foreground">
                            Bakeries
                          </div>
                          <div className="text-2xl font-bold">0</div>
                        </div>
                        <div className="p-4 rounded-lg border bg-white/70 text-center">
                          <div className="text-sm text-muted-foreground">
                            Badges
                          </div>
                          <div className="text-2xl font-bold">0</div>
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