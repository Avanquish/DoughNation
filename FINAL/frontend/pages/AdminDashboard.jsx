import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCog, Building2, HelpingHand, ShieldCheck, LineChart,
  LogOut, Bell, BellRing, MessageSquare, AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

import AdminComplaint from "./AdminComplaint";

const AdminDashboard = () => {
  const [name, setName] = useState("Admin");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data
  const [stats, setStats] = useState({
    totalBakeries: 0,
    totalCharities: 0,
    totalUsers: 0,
    pendingUsersCount: 0,
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = pendingUsers.length + feedbacks.length;

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setName(decoded.name || "Admin");
    } catch (err){
      console.error("Error fetching admin dashboard stats:", err);
    }
  }, []);

  // Stats
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/admin-dashboard-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats({
          totalBakeries: res.data.totalBakeries,
          totalCharities: res.data.totalCharities,
          totalUsers: res.data.totalUsers,
          pendingUsersCount: res.data.pendingUsers,
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Pending users
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/pending-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingUsers(res.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Feedback / reports (safe fallbacks)
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const r1 = await axios.get("/admin/feedbacks", { headers });
        setFeedbacks(r1.data || []);
      } catch {
        try {
          const r2 = await axios.get("/feedbacks/pending", { headers });
          setFeedbacks(r2.data || []);
        } catch {
          setFeedbacks([]);
        }
      }
    })();
  }, []);

  // Actions
  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/verify-user/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers((p) => p.filter((u) => u.id !== id));
      setStats((p) => ({ ...p, pendingUsersCount: Math.max(0, p.pendingUsersCount - 1) }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/reject-user/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers((p) => p.filter((u) => u.id !== id));
      setStats((p) => ({ ...p, pendingUsersCount: Math.max(0, p.pendingUsersCount - 1) }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Overlay behavior
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e) => e.key === "Escape" && setNotifOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [notifOpen]);

  // Combined notifications
  const notifications = useMemo(() => {
    const reg = pendingUsers.map((u) => ({
      kind: "registration",
      id: `reg-${u.id}`,
      at: u.created_at || null,
      title: `New ${u.role} registration`,
      subtitle: `${u.name} · ${u.email}`,
    }));
    const fbs = feedbacks.map((f) => ({
      kind: "feedback",
      id: `fb-${f.id}`,
      at: f.created_at || f.date || null,
      title: f.type ? `${f.type} from ${f.charity_name}` : `New report from ${f.charity_name || "Charity"}`,
      subtitle: (f.summary || f.message || f.subject || "").toString().slice(0, 120),
    }));
    return [...reg, ...fbs].sort((a, b) => {
      if (a.at && b.at) return new Date(b.at) - new Date(a.at);
      return 0;
    });
  }, [pendingUsers, feedbacks]);

  // Header status chip text
  const statusText = useMemo(() => {
    switch (activeTab) {
      case "users": return "User Management";
      case "reports": return "Report Generation";
      case "validation": return "Validate Donations";
      case "badges": return "Assign Badges";
      case "feedback": return "Manage Feedback";
      default: return "Dashboard";
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen relative">
      {/* Theme styles (your design) */}
      <style>{`
        :root{
          --amber1:#fff7ec; --amber2:#ffe7c8; --amber3:#ffd6a1; --amber4:#f3c27e;
          --amber5:#e59b50; --amber6:#c97c2c; --coffee:#6f4a23; --coffee2:#7a5a34;
        }
        .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
        .page-bg::before,.page-bg::after{content:""; position:absolute; inset:0}
        .page-bg::before{
          background:
            radial-gradient(1200px 520px at 12% -10%, var(--amber1) 0%, var(--amber2) 40%, transparent 72%),
            radial-gradient(900px 420px at 110% 18%, rgba(255,208,153,.35), transparent 70%),
            linear-gradient(135deg, #FFF9EF 0%, #FFF2E3 60%, #FFE7D1 100%);
          animation: drift 26s ease-in-out infinite alternate; filter:saturate(1.02);
        }
        .page-bg::after{
          background: repeating-linear-gradient(-35deg, rgba(201,124,44,.06) 0 8px, rgba(201,124,44,0) 8px 18px);
          mix-blend-mode:multiply; opacity:.12; animation: pan 40s linear infinite;
        }
        .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.18}
        .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffe0b6, transparent 60%); animation: blob 18s ease-in-out infinite alternate;}
        .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffd3a0, transparent 58%); animation: blob 20s 2s ease-in-out infinite alternate;}
        @keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-18px,0)}}
        @keyframes pan{from{transform:translate3d(0,0,0)}to{transform:translate3d(-6%,-6%,0)}}
        @keyframes blob{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(24px,-20px,0) scale(1.04)}}

        .head{position:sticky; top:0; z-index:40; border-bottom:1px solid rgba(0,0,0,.06); backdrop-filter: blur(10px);}
        .head-bg{position:absolute; inset:0; z-index:-1; opacity:.95;
          background: linear-gradient(110deg, #ffffff 0%, #fff7ef 28%, #ffeddc 55%, #ffe6cf 100%);
          background-size: 220% 100%; animation: headerSlide 18s linear infinite;
        }
        @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
        .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
        .brand{display:flex; gap:.8rem; align-items:center}

        .ring{width:48px; height:48px; border-radius:9999px; padding:2px;
          background:conic-gradient(from 210deg, #F7C789, #E8A765, #C97C2C, #E8A765, #F7C789);
          animation: spin 10s linear infinite; box-shadow:0 10px 24px rgba(201,124,44,.16)}
        .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
        .badge-ico{transform-origin:50% 60%; animation: float 6s ease-in-out infinite; color:#C97C2C}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

        .title-ink{font-weight:800; letter-spacing:.2px;
          background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C);
          background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent; animation: ink 9s ease infinite}
        @keyframes ink{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem;
          padding:.28rem .6rem; font-size:.78rem; border-radius:9999px;
          color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0}

        .seg-wrap{max-width:80rem; margin:.75rem auto 0; padding:0 1rem;}
        .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.10); width:fit-content}
        .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
        .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,#F6C17C,#E49A52,#BF7327); box-shadow:0 8px 18px rgba(201,124,44,.28)}

        .btn-logout{position:relative; overflow:hidden; border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
          background:linear-gradient(90deg,#F6C17C,#E49A52,#BF7327); color:#fff; border:1px solid rgba(255,255,255,.6);
          box-shadow:0 8px 26px rgba(201,124,44,.25); transition:transform .18s ease, box-shadow .18s ease, filter .18s ease}
        .btn-logout:before{content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%; transform:rotate(10deg);
          background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%); animation: shine 3.2s linear infinite}
        @keyframes shine{from{left:-70%}to{left:120%}}
        .btn-logout:hover{transform:translateY(-1px) scale(1.02); box-shadow:0 12px 34px rgba(201,124,44,.32); filter:saturate(1.05)}

        .gwrap{position:relative; border-radius:16px; padding:1px;
          background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55));
          background-size:200% 200%; animation:borderShift 8s ease-in-out infinite}
        @keyframes borderShift{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
        .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
        .chip{width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px;
          background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#8a5a25; border:1px solid #fff3e0; box-shadow:0 6px 18px rgba(201,124,44,.16)}
        .hover-lift{transition:transform .35s cubic-bezier(.22,.98,.4,1), box-shadow .35s}
        .hover-lift:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(201,124,44,.14)}
        .reveal{opacity:0; transform:translateY(8px) scale(.985); animation:rise .6s ease forwards}
        .r1{animation-delay:.05s}.r2{animation-delay:.1s}.r3{animation-delay:.15s}.r4{animation-delay:.2s}
        @keyframes rise{to{opacity:1; transform:translateY(0) scale(1)}}
      `}</style>

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
                    <ShieldCheck className="badge-ico h-6 w-6" />
                  </div>
                </div>

                <div className="min-w-0">
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">{name}</h1>
                  <span className="status-chip">{statusText}</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Bell next to logout */}
            <div className="pt-1 flex items-center gap-3">
              <button
                aria-label="Open notifications"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#C97C2C] bg-white/90 hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C97C2C]/30"
              >
                {/* Force stroke color for the header notification icon */}
                <Bell className="h-4 w-4 text-[#C97C2C] [stroke:#C97C2C]" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </button>

              <Button onClick={handleLogout} className="btn-logout flex items-center">
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Overlay */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setNotifOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-title"
            className="w-full max-w-lg rounded-xl border bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                {/* Modal title icon with forced stroke color */}
                <BellRing className="h-5 w-5 text-[#C97C2C] [stroke:#C97C2C]" />
                <h3 id="notif-title" className="text-base font-semibold">Notifications</h3>
              </div>
              <button
                aria-label="Close"
                onClick={() => setNotifOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <ul className="max-h-[60vh] overflow-auto">
              {notifications.length ? (
                notifications.map((n) => (
                  <li key={n.id} className="p-4 border-b last:border-b-0">
                    <button
                      className="w-full text-left flex items-start gap-3"
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveTab(n.kind === "registration" ? "users" : "feedback");
                      }}
                    >
                      <div className="mt-0.5">
                        {n.kind === "registration" ? (
                          <BellRing className="h-5 w-5 text-[#C97C2C] [stroke:#C97C2C]" />
                        ) : (
                          <span className="inline-flex">
                            <MessageSquare className="h-5 w-5 text-[#C97C2C] [stroke:#C97C2C]" />
                            <AlertTriangle className="h-5 w-5 -ml-1 opacity-70 text-[#C97C2C] [stroke:#C97C2C]" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{n.title}</p>
                        {n.subtitle && (
                          <p className="text-xs text-muted-foreground">{n.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {n.at ? new Date(n.at).toLocaleDateString() : ""}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  You’re all caught up — no pending items.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Controller */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="seg-wrap">
          <div className="seg">
            <TabsList className="bg-transparent p-0 border-0">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="reports">Report Generation</TabsTrigger>
              <TabsTrigger value="validation">Validate Donations</TabsTrigger>
              <TabsTrigger value="badges">Assign Badges</TabsTrigger>
              <TabsTrigger value="feedback">Manage Feedback</TabsTrigger>
              <TabsTrigger value="complaints">Manage Complaints</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="gwrap reveal r1 hover-lift">
                <Card className="glass-card shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bakeries</p>
                        <p className="text-3xl font-extrabold">{stats.totalBakeries}</p>
                      </div>
                      <div className="chip">
                        <Building2 className="h-5 w-5" />
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
                        <p className="text-sm font-medium text-muted-foreground">Total Charities</p>
                        <p className="text-3xl font-extrabold">{stats.totalCharities}</p>
                      </div>
                      <div className="chip">
                        <HelpingHand className="h-5 w-5" />
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
                        <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                        <p className="text-3xl font-extrabold">{stats.totalUsers}</p>
                      </div>
                      <div className="chip">
                        <UserCog className="h-5 w-5" />
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
                        <p className="text-sm font-medium text-muted-foreground">Pending Users</p>
                        <p className="text-3xl font-extrabold">{stats.pendingUsersCount}</p>
                      </div>
                      <div className="chip">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Approve or reject pending registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingUsers.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-white/70">
                      <table className="w-full text-sm bg-white/80 backdrop-blur">
                        <thead className="bg-[#FFF3E6]">
                          <tr className="text-left">
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Proof</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingUsers.map((u) => (
                            <tr key={u.id} className="border-t border-white/70">
                              <td className="p-3">{u.name}</td>
                              <td className="p-3">{u.email}</td>
                              <td className="p-3">{u.role}</td>
                              <td className="p-3">
                                {u.proof_file ? (
                                  <a
                                    href={`http://localhost:8000/${u.proof_file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#C97C2C] underline"
                                  >
                                    View Proof
                                  </a>
                                ) : ("No file")}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2 justify-center">
                                  <Button size="sm" onClick={() => handleVerify(u.id)}>Approve</Button>
                                  <Button size="sm" variant="secondary" onClick={() => handleReject(u.id)}>Reject</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No pending users.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Report Generation */}
          <TabsContent value="reports" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle>Report Generation</CardTitle>
                  <CardDescription>Create and download administrative reports</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  (Placeholder — hook up your reporting UI here.)
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Validate Donations */}
          <TabsContent value="validation" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle>Validate Donations</CardTitle>
                  <CardDescription>Review and approve donation records</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  (Placeholder — add donation validation table/workflow.)
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Assign Badges */}
          <TabsContent value="badges" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle>Assign Badges</CardTitle>
                  <CardDescription>Give recognition to bakeries/charities</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  (Placeholder — badge assignment UI.)
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Feedback */}
          <TabsContent value="feedback" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle>Manage Feedback</CardTitle>
                  <CardDescription>Read and respond to charity reports</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  (Placeholder — feedback list/details. Bell alerts include these.)
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Complaints */}
          <TabsContent value="complaints" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle>Manage Complaints</CardTitle>
                  <CardDescription>Review and respond to user complaints</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <AdminComplaint />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;