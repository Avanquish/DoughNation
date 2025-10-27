import React, { useEffect, useMemo, useRef, useState } from "react";
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
  UserCog,
  Building2,
  HelpingHand,
  ShieldCheck,
  LogOut,
  Bell,
  UserCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import AdminComplaint from "./AdminComplaint";
import AdminReports from "./AdminReports";
import AdminUser from "./AdminUser";
import Leaderboards from "./Leaderboards";
import UserMenu from "./UserMenu";
import NavBar from "./NavBar";

// Tab persistence
const ADMIN_TAB_KEY = "admin_active_tab";
const ADMIN_ALLOWED_TABS = [
  "dashboard",
  "users",
  "reports",
  "track",
  "badges",
  "complaints",
];

// Small unread/read circle indicator
function UnreadCircle({ read }) {
  return (
    <span
      aria-hidden
      className={`inline-block mr-2 rounded-full align-middle shrink-0 ${read
        ? "w-2.5 h-2.5 border border-[#BF7327] bg-transparent"
        : "w-2.5 h-2.5 border border-[#BF7327] bg-[#BF7327]"
        }`}
      title={read ? "Read" : "Unread"}
    />
  );
}

const AdminDashboard = () => {
  const [name, setName] = useState("Admin");
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("tab");
      if (fromUrl && ADMIN_ALLOWED_TABS.includes(fromUrl)) return fromUrl;

      const fromStorage = localStorage.getItem(ADMIN_TAB_KEY);
      if (fromStorage && ADMIN_ALLOWED_TABS.includes(fromStorage))
        return fromStorage;
    } catch { }
    // Default to "dashboard" as landing tab
    return "dashboard";
  });

  // Keep tab on reload
  useEffect(() => {
    try {
      if (!activeTab) return;
      localStorage.setItem(ADMIN_TAB_KEY, activeTab);

      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") !== activeTab) {
        params.set("tab", activeTab);
        const next = `${window.location.pathname}?${params.toString()}${window.location.hash
          }`;
        window.history.replaceState({}, "", next);
      }
    } catch { }
  }, [activeTab]);

  // Data
  const [stats, setStats] = useState({
    totalBakeries: 0,
    totalCharities: 0,
    totalUsers: 0,
    pendingUsersCount: 0,
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [complaints, setComplaints] = useState([]);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState(new Set());
  const [notifTab, setNotifTab] = useState("verifications"); // "verifications" | "complaints" | "reports"
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setName(decoded.name || "Admin");
    } catch (err) {
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
          totalUsers: res.data.totalUsers - 1,
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

  // Feedback / reports
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

  // Complaints
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/complaints", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setComplaints(res.data || []);
      } catch (e) {
        console.error(e);
        setComplaints([]);
      }
    })();
  }, []);

  // Actions
  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `/verify-user/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPendingUsers((p) => p.filter((u) => u.id !== id));
      setStats((p) => ({
        ...p,
        pendingUsersCount: Math.max(0, p.pendingUsersCount - 1),
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `/reject-user/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPendingUsers((p) => p.filter((u) => u.id !== id));
      setStats((p) => ({
        ...p,
        pendingUsersCount: Math.max(0, p.pendingUsersCount - 1),
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e) => {
      const inDrop =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      const inBell = bellRef.current && bellRef.current.contains(e.target);
      if (!inDrop && !inBell) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notifOpen]);

  // Notifications list
  const notifications = useMemo(() => {
    const reg = pendingUsers.map((u) => ({
      kind: "registration",
      id: `reg-${u.id}`,
      at: u.created_at || null,
      title: `New ${u.role} registration`,
      subtitle: `${u.name} \u00B7 ${u.email}`,
    }));
    const fbs = feedbacks.map((f) => ({
      kind: "feedback",
      id: `fb-${f.id}`,
      at: f.created_at || f.date || null,
      title: f.type
        ? `${f.type} from ${f.charity_name}`
        : `New report from ${f.charity_name || "Charity"}`,
      subtitle: (f.summary || f.message || f.subject || "")
        .toString()
        .slice(0, 120),
    }));
    const complaintsNotifs = complaints.map((c) => ({
      kind: "complaint",
      id: `comp-${c.id}`,
      at: c.created_at || null,
      title: `Complaint from ${c.user_name || "User"}`,
      subtitle: (c.subject || c.description || "").toString().slice(0, 120),
    }));
    return [...reg, ...fbs, ...complaintsNotifs]
      .sort((a, b) => (a.at && b.at ? new Date(b.at) - new Date(a.at) : 0))
      .map((n) => ({
        ...n,
        isRead: readNotifs.has(n.id),
      }));
  }, [pendingUsers, feedbacks, complaints, readNotifs]);

  // Action: mark as read
  const markAsRead = async (notifId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `/notifications/mark-read/${notifId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReadNotifs((prev) => new Set(prev).add(notifId));
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/notifications/read", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReadNotifs(new Set(res.data || []));
      } catch (e) {
        console.error("Failed to load read notifications:", e);
      }
    })();
  }, []);

  const notifCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Header status text
  const statusText = useMemo(() => {
    const map = {
      dashboard: "Dashboard",
      users: "User Management",
      reports: "Report Generation",
      track: "Bakery Leaderboards",
      complaints: "Manage Complaints",
    };
    return map[activeTab] ?? "Dashboard";
  }, [activeTab]);

  // Categorized lists & unread counts
  const verificationList = notifications.filter(
    (n) => n.kind === "registration"
  );
  const complaintsList = notifications.filter((n) => n.kind === "complaint");
  const reportsList = notifications.filter((n) => n.kind === "feedback");

  const unreadVerifications = verificationList.filter((n) => !n.isRead).length;
  const unreadComplaints = complaintsList.filter((n) => !n.isRead).length;
  const unreadReports = reportsList.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen relative">
      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      {/* Header */}
      <NavBar />

      {/* Controller */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* <div className="seg-wrap">
          <div className="seg">
            <TabsList className="bg-transparent p-0 border-0">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="users">Manage Users</TabsTrigger>
              <TabsTrigger value="track">Donation Monitoring</TabsTrigger>
              <TabsTrigger value="complaints">Manage Complaints</TabsTrigger>
              <TabsTrigger value="reports">Report Generation</TabsTrigger>
            </TabsList>
          </div>
        </div> */}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat: Total Bakeries */}
              <div className="stat reveal r1">
                <div className="stat-inner">
                  <div>
                    <p className="stat-title">Total Bakeries</p>
                    <p className="stat-value">{stats.totalBakeries}</p>
                  </div>
                  <div className="stat-ico">
                    <Building2 />
                  </div>
                </div>
              </div>

              {/* Stat: Total Charities */}
              <div className="stat reveal r2">
                <div className="stat-inner">
                  <div>
                    <p className="stat-title">Total Charities</p>
                    <p className="stat-value">{stats.totalCharities}</p>
                  </div>
                  <div className="stat-ico">
                    <HelpingHand />
                  </div>
                </div>
              </div>

              {/* Stat: Total Users */}
              <div className="stat reveal r3">
                <div className="stat-inner">
                  <div>
                    <p className="stat-title">Total Users</p>
                    <p className="stat-value">{stats.totalUsers}</p>
                  </div>
                  <div className="stat-ico">
                    <UserCog />
                  </div>
                </div>
              </div>

              {/* Stat: Pending Users */}
              <div className="stat reveal r4">
                <div className="stat-inner">
                  <div>
                    <p className="stat-title">Pending Users</p>
                    <p className="stat-value">{stats.pendingUsersCount}</p>
                  </div>
                  <div className="stat-ico">
                    <ShieldCheck />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-3xl font-extrabold text-[#6b4b2b]">
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminUser />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Report Generation */}
          <TabsContent value="reports" className="reveal">
            <div>
              <AdminReports />
            </div>
          </TabsContent>

          {/* Leaderboards */}
          <TabsContent value="track" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="text-sm text-muted-foreground">
                  <Leaderboards />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Complaints */}
          <TabsContent value="complaints" className="reveal">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-3xl font-extrabold text-[#6b4b2b]">
                    Manage Complaints
                  </CardTitle>
                  <CardDescription>
                    Review and respond to user complaints
                  </CardDescription>
                </CardHeader>
                <CardContent>
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