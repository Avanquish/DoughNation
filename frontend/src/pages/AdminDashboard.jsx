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
  UserCircle,
  LayoutDashboard,
  Users,
  HandCoins,
  MessageSquareWarning,
  FileBarChart,
  Microwave,
  Store
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import AdminComplaint from "./AdminComplaint";
import AdminReports from "./AdminReports";
import AdminUser from "./AdminUser";
import Leaderboards from "./Leaderboards";
import DataTable from "./DatatableSample";
import NavBar from "./NavBar";
import Bakery from "./Bakery";
import Charity from "./Charity";
import { Link } from "react-router-dom";


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


const data = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer" },
]

const columns = [
  { accessorKey: "id", header: "ID", isHide: "true" },
  { accessorKey: "name", header: "Name", isHide: "false" },
  { accessorKey: "email", header: "Email", isHide: "false" },
  { accessorKey: "role", header: "Role", isHide: "false" },
]

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
      bakeries: "Bakeries",
      charities: "Charities",
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

  const [showTop, setShowTop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  const Styles = () => (
    <style>{`
      :root {
    --amber1: #fff7ec;
    --amber2: #ffe7c8;
    --amber3: #ffd6a1;
    --amber4: #f3c27e;
    --amber5: #e59b50;
    --amber6: #c97c2c;
    --coffee: #6f4a23;
    --coffee2: #7a5a34;
    --radius: 0.625rem;
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.704);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
}

.header-skin {
    position: relative
}

.header-skin.glass-soft {
    background: none !important;
    border-color: rgba(201, 124, 44, .18)
}

.header-skin::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
        linear-gradient(180deg, var(--hdrSoft) 0%, var(--hdrMed) 65%, var(--hdrSoft) 100%),
        radial-gradient(900px 240px at 8% 120%, rgba(243, 194, 126, .32) 0%, rgba(243, 194, 126, 0) 60%),
        radial-gradient(900px 240px at 92% 120%, rgba(235, 183, 132, .28) 0%, rgba(235, 183, 132, 0) 60%);
    mask-image: linear-gradient(to bottom, #000 86%, transparent 100%);
}

.header-skin::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-image: radial-gradient(rgba(227, 181, 126, .21) 20%, transparent 21%);
    background-size: 12px 12px;
    background-position: 0 0;
    animation: dotsDrift 36s linear infinite;
    opacity: .33;
    mix-blend-mode: multiply;
    mask-image: linear-gradient(to bottom, #000 80%, transparent 100%);
}

.sticky-boost {
    transition: box-shadow .25s ease, backdrop-filter .25s ease;
    border-bottom: 1px solid rgba(201, 124, 44, .14)
}

.sticky-boost.is-scrolled {
    box-shadow: 0 10px 28px rgba(201, 124, 44, .18)
}

.nav-link {
    position: relative
}

.nav-link:after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -6px;
    height: 2px;
    background: linear-gradient(90deg, var(--amber4), var(--amber6));
    transform: scaleX(0);
    transform-origin: 0 50%;
    transition: transform .35s
}

.nav-link:hover:after {
    transform: scaleX(1)
}

.header-gradient-line {
    position: relative
}

.header-gradient-line:after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--amber5), var(--amber6), transparent);
    opacity: .5
}

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

@keyframes brandShimmer {
    0% {
        background-position: 0% 50%
    }

    50% {
        background-position: 100% 50%
    }

    100% {
        background-position: 0% 50%
    }
}

.logo-bread {
    transform-origin: 50% 60%;
    filter: drop-shadow(0 2px 4px rgba(201, 124, 44, .25));
    animation: logoFloat 5.5s ease-in-out infinite
}

@keyframes logoFloat {

    0%,
    100% {
        transform: translateY(0) rotate(0)
    }

    50% {
        transform: translateY(-4px) rotate(-2deg)
    }
}

.page-bg {
    position: fixed;
    inset: 0;
    z-index: -10;
    overflow: hidden;
    pointer-events: none;
}

.page-bg::before,
.page-bg::after {
    content: "";
    position: absolute;
    inset: 0
}

.page-bg::before {
    background:
        radial-gradient(1200px 520px at 12% -10%, var(--amber1) 0%, var(--amber2) 40%, transparent 72%),
        radial-gradient(900px 420px at 110% 18%, rgba(255, 208, 153, .35), transparent 70%),
        linear-gradient(135deg, #FFF9EF 0%, #FFF2E3 60%, #FFE7D1 100%);
    animation: drift 26s ease-in-out infinite alternate;
    filter: saturate(1.02);
}

.page-bg::after {
    background: repeating-linear-gradient(-35deg, rgba(201, 124, 44, .06) 0 8px, rgba(201, 124, 44, 0) 8px 18px);
    mix-blend-mode: multiply;
    opacity: .12;
    animation: pan 40s linear infinite;
}

.blob {
    position: absolute;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    filter: blur(36px);
    mix-blend-mode: multiply;
    opacity: .18
}

.blob.a {
    left: -120px;
    top: 30%;
    background: radial-gradient(circle at 35% 35%, #ffe0b6, transparent 60%);
    animation: blob 18s ease-in-out infinite alternate;
}

.blob.b {
    right: -140px;
    top: 6%;
    background: radial-gradient(circle at 60% 40%, #ffd3a0, transparent 58%);
    animation: blob 20s 2s ease-in-out infinite alternate;
}

@keyframes drift {
    from {
        transform: translate3d(0, 0, 0)
    }

    to {
        transform: translate3d(24px, -18px, 0)
    }
}

@keyframes pan {
    from {
        transform: translate3d(0, 0, 0)
    }

    to {
        transform: translate3d(-6%, -6%, 0)
    }
}

@keyframes blob {
    from {
        transform: translate3d(0, 0, 0) scale(1)
    }

    to {
        transform: translate3d(24px, -20px, 0) scale(1.04)
    }

}

.head {
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid rgba(0, 0, 0, .06);
    backdrop-filter: blur(10px);
}

.head-bg {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: .95;
    background: linear-gradient(110deg, #ffffff 0%, #fff7ef 28%, #ffeddc 55%, #ffe6cf 100%);
    background-size: 220% 100%;
    animation: headerSlide 18s linear infinite;
}

@keyframes headerSlide {
    0% {
        background-position: 0% 50%
    }

    100% {
        background-position: 100% 50%
    }
}

.head-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: .9rem 1rem;
}

.brand {
    display: flex;
    gap: .8rem;
    align-items: center
}

.ring {
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    padding: 2px;
    background: conic-gradient(from 210deg, #F7C789, #E8A765, #C97C2C, #E8A765, #F7C789);
    animation: spin 10s linear infinite;
    box-shadow: 0 10px 24px rgba(201, 124, 44, .16)
}

.ring>div {
    width: 100%;
    height: 100%;
    border-radius: 9999px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center
}

.badge-ico {
    transform-origin: 50% 60%;
    animation: float 6s ease-in-out infinite;
    color: #C97C2C
}

@keyframes spin {
    to {
        transform: rotate(360deg)
    }
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0)
    }

    50% {
        transform: translateY(-6px)
    }
}

.title-ink {
    font-weight: 800;
    letter-spacing: .2px;
    background: linear-gradient(90deg, #F3B56F, #E59B50, #C97C2C);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: ink 9s ease infinite
}

@keyframes ink {
    0% {
        background-position: 0% 50%
    }

    50% {
        background-position: 100% 50%
    }

    100% {
        background-position: 0% 50%
    }
}

.status-chip {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    margin-top: .15rem;
    padding: .28rem .6rem;
    font-size: .78rem;
    font-weight: 800;
    border-radius: 9999px;
    color: #7a4f1c;
    background: linear-gradient(180deg, #FFE7C5, #F7C489);
    border: 1px solid #fff3e0
}

.seg-wrap {
    max-width: 80rem;
    margin: .75rem auto 0;
    // padding: 0 1rem;
}

.seg {
    display: flex;
    gap: .4rem;
    background: rgba(255, 255, 255, .94);
    border: 1px solid rgba(0, 0, 0, .07);
    border-radius: 12px;
    padding: .3rem;
    box-shadow: 0 8px 24px rgba(201, 124, 44, .10);
    /* width: fit-content */
}

@media (max-width: 640px) {
  .seg .TabsList {
    justify-content: center;
  }
}

.seg [role="tab"] {
    border-radius: 10px;
    padding: .48rem .95rem;
    color: #6b4b2b;
    font-weight: 700
}

.seg [role="tab"][data-state="active"] {
    color: #fff;
    background: linear-gradient(90deg, #F6C17C, #E49A52, #BF7327);
    box-shadow: 0 8px 18px rgba(201, 124, 44, .28)
}

.btn-logout {
    position: relative;
    overflow: hidden;
    border-radius: 9999px;
    padding: .58rem .95rem;
    gap: .5rem;
    background: linear-gradient(90deg, #F6C17C, #E49A52, #BF7327);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .6);
    box-shadow: 0 8px 26px rgba(201, 124, 44, .25);
    transition: transform .18s ease, box-shadow .18s ease, filter .18s ease
}

.btn-logout:before {
    content: "";
    position: absolute;
    top: -40%;
    bottom: -40%;
    left: -70%;
    width: 60%;
    transform: rotate(10deg);
    background: linear-gradient(90deg, rgba(255, 255, 255, .26), rgba(255, 255, 255, 0) 55%);
    animation: shine 3.2s linear infinite
}

@keyframes shine {
    from {
        left: -70%
    }

    to {
        left: 120%
    }
}

.btn-logout:hover {
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 12px 34px rgba(201, 124, 44, .32);
    filter: saturate(1.05)
}

.gwrap {
    position: relative;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(247, 199, 137, .9), rgba(201, 124, 44, .55));
    background-size: 200% 200%;
    animation: borderShift 8s ease-in-out infinite
}

@keyframes borderShift {
    0% {
        background-position: 0% 0%
    }

    50% {
        background-position: 100% 100%
    }

    100% {
        background-position: 0% 0%
    }
}

.glass-card {
    border-radius: 15px;
    background: rgba(255, 255, 255, .94);
    backdrop-filter: blur(8px)
}

.chip {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: linear-gradient(180deg, #FFE7C5, #F7C489);
    color: #8a5a25;
    border: 1px solid #fff3e0;
    box-shadow: 0 6px 18px rgba(201, 124, 44, .16)
}

// .hover-lift {
//     transition: transform .35s cubic-bezier(.22, .98, .4, 1), box-shadow .35s
// }

// .hover-lift:hover {
//     transform: translateY(-4px);
//     box-shadow: 0 18px 38px rgba(201, 124, 44, .14)
// }

.reveal {
    opacity: 0;
    transform: translateY(8px) scale(.985);
    animation: rise .6s ease forwards
}

.r1 {
    animation-delay: .05s
}

.r2 {
    animation-delay: .1s
}

.r3 {
    animation-delay: .15s
}

.r4 {
    animation-delay: .2s
}

@keyframes rise {
    to {
        opacity: 1;
        transform: translateY(0) scale(1)
    }
}

/* (Original) had bounce on hover; keep it here but override below */
.bell-icon {
    transition: transform .18s ease;
}

.icon-btn:hover svg {
    animation: bell-bounce .8s cubic-bezier(.22, 1, .36, 1) 1;
}

@keyframes bell-bounce {
    0% {
        transform: translateY(0);
    }

    30% {
        transform: translateY(-3px);
    }

    60% {
        transform: translateY(0);
    }

    80% {
        transform: translateY(-1.5px);
    }

    100% {
        transform: translateY(0);
    }
}

.bell-anim {
    animation: bell-bounce 1.2s cubic-bezier(.22, 1, .36, 1) infinite;
}

.stat {
    position: relative;
    border-radius: 16px;
    padding: 1px;
    will-change: transform;
}

.stat::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(247, 199, 137, .9), rgba(201, 124, 44, .45));
    opacity: .9;
    filter: saturate(1.02);
}

.stat-inner {
    position: relative;
    border-radius: 15px;
    background: rgba(255, 255, 255, .94);
    backdrop-filter: blur(8px);
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    box-shadow: 0 10px 24px rgba(201, 124, 44, .10);
    transition: box-shadow .25s cubic-bezier(.22, .98, .4, 1), transform .25s cubic-bezier(.22, .98, .4, 1);
}

.stat:hover .stat-inner {
    box-shadow: 0 16px 36px rgba(201, 124, 44, .18);
    transform: translateY(-2px);
}

.stat-title {
    font-size: .95rem;
    font-weight: 700;
    color: #2b2b2b;
}

.stat-value {
    font-size: 2rem;
    line-height: 1;
    font-weight: 800;
    color: #2a170a;
    margin-top: .25rem;
    letter-spacing: .2px;
}

.stat-ico {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 9999px;
    background: radial-gradient(120% 120% at 30% 25%, #ffe6c6 0%, #f7c489 55%, #e8a765 100%);
    box-shadow: 0 10px 24px rgba(201, 124, 44, .20), inset 0 1px 0 rgba(255, 255, 255, .8);
    border: 1px solid rgba(255, 255, 255, .8);
}

.stat-ico svg {
    width: 22px;
    height: 22px;
    color: #8a5a25;
}

/* ---------- Bakery-style icon button + NO BOUNCE (OVERRIDES) ---------- */
.icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, .9);
    border: 1px solid rgba(0, 0, 0, .06);
    box-shadow: 0 6px 16px rgba(201, 124, 44, .14);
    transition: transform .18s ease, box-shadow .18s ease;
}

.icon-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(201, 124, 44, .20);
}

/* Force-disable any bell animation even if earlier rules exist */
.icon-btn:hover svg,
.icon-btn .bell-icon {
    animation: none !important;
    transform: none !important;
}

.user-action-bg{
    background: radial-gradient(120% 120% at 30% 25%, #ffe6c6 0%, #f7c489 55%, #e8a765 100%);
    box-shadow: 0 10px 24px rgba(201, 124, 44, .20), inset 0 1px 0 rgba(255, 255, 255, .8);
}

@theme inline {
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --color-sidebar: var(--sidebar);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-ring: var(--sidebar-ring);
}

.dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.488 0.243 264.376);
    --chart-2: oklch(0.696 0.17 162.48);
    --chart-3: oklch(0.769 0.188 70.08);
    --chart-4: oklch(0.627 0.265 303.9);
    --chart-5: oklch(0.645 0.246 16.439);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
    }
  body {
    @apply bg-background text-foreground;
    }
}

thead{
    background: #EADBC8;
    color: #4A2F17;
}`}</style>
  );

  return (
    <div className="min-h-screen relative w-full">
      <Styles />
      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      {/* Header */}
      <header className="head fixed top-0 left-0 right-0 z-[80]">
        <div className="head-bg" />
        <div
          className={`glass-soft header-gradient-line header-skin sticky-boost ${scrolled ? "is-scrolled" : ""
            }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 hdr-pad flex items-center justify-between relative">
            {/* DoughNation Logo - Disabled when admin is logged in */}
            {localStorage.getItem("token") ? (
              <div className="flex items-center gap-3 cursor-not-allowed opacity-60" title="You are already logged in">
                <img
                  src="/images/DoughNationLogo.png"
                  alt="DoughNation logo"
                  className="shrink-0"
                  style={{ width: "28px", height: "28px", objectFit: "contain" }}
                />
                <span
                  className="font-extrabold brand-pop"
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
                  style={{ width: "28px", height: "28px", objectFit: "contain" }}
                />
                <span
                  className="font-extrabold brand-pop"
                  style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}
                >
                  DoughNation
                </span>
              </Link>
            )}

            {/* Desktop nav */}
            <nav
              className="items-center gap-5"
              style={{ fontSize: 15 }}>
              <div className="pt-1 flex items-center gap-3 relative">
                <button
                  className="icon-btn relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-full
 bg-white border border-black/10 shadow-md
 hover:shadow-lg transition
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  aria-label="Notifications"
                  onClick={() => setNotifOpen((v) => !v)}
                  title="Notifications"
                >
                  {/* Add bell-icon so overrides apply */}
                  <Bell className="w-[18px] h-[18px] text-black bell-icon" />
                  {notifCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-[10px] font-extrabold leading-none px-[6px] py-[3px] rounded-full text-white"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--brand2, #E49A52), var(--brand3, #BF7327))",
                        boxShadow: "0 6px 16px rgba(201,124,44,.35)",
                        border: "1px solid rgba(255,255,255,.65)",
                      }}
                    >
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {notifOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 top-12 z-[60] w-[460px] max-w-[90vw]"
                  >
                    <div className="gwrap rounded-2xl shadow-xl">
                      <div className="glass-card rounded-[14px] overflow-hidden">
                        {/* Tabs header */}
                        <div className="flex items-center">
                          {[
                            {
                              key: "verifications",
                              label: "Verifications",
                              count: unreadVerifications,
                            },
                            {
                              key: "complaints",
                              label: "Complaints",
                              count: unreadComplaints,
                            },
                            {
                              key: "reports",
                              label: "Reports",
                              count: unreadReports,
                            },
                          ].map((t) => (
                            <button
                              key={t.key}
                              onClick={() => setNotifTab(t.key)}
                              className={`flex-1 py-2.5 text-sm font-bold transition-colors ${notifTab === t.key
                                ? "text-white"
                                : "text-[#6b4b2b] hover:text-[#4f371f]"
                                }`}
                              style={
                                notifTab === t.key
                                  ? {
                                    background:
                                      "linear-gradient(90deg, var(--brand1,#F6C17C), var(--brand2,#E49A52), var(--brand3,#BF7327))",
                                  }
                                  : { background: "transparent" }
                              }
                            >
                              {t.label}
                              {t.count > 0 && (
                                <span
                                  className="ml-1 text-[11px] font-extrabold"
                                  style={{
                                    color:
                                      notifTab === t.key ? "#fff" : "#BF7327",
                                  }}
                                >
                                  ({t.count})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Lists */}
                        <div className="max-h-80 overflow-y-auto divide-y">
                          {/* VERIFICATIONS */}
                          {notifTab === "verifications" && (
                            <div>
                              {verificationList.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500">
                                  No verification alerts
                                </div>
                              ) : (
                                verificationList.map((n) => (
                                  <button
                                    key={n.id}
                                    onClick={() => {
                                      markAsRead(n.id);
                                      setNotifOpen(false);
                                      setActiveTab("users");
                                    }}
                                    className={`w-full p-3 focus:outline-none transition-colors flex items-center ${n.isRead
                                      ? "bg-white hover:bg-[#fff6ec]"
                                      : "bg-[rgba(255,246,236,1)]"
                                      }`}
                                  >
                                    <UnreadCircle read={n.isRead} />
                                    <div className="text-left flex-1">
                                      <p
                                        className={`text-[13px] ${n.isRead
                                          ? "text-[#6b4b2b]"
                                          : "text-[#4f371f] font-semibold"
                                          }`}
                                      >
                                        {n.title}
                                      </p>
                                      {n.subtitle && (
                                        <p className="text-[12px] text-[#6b4b2b]">
                                          {n.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {n.at
                                        ? new Date(n.at).toLocaleDateString()
                                        : ""}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}

                          {/* COMPLAINTS */}
                          {notifTab === "complaints" && (
                            <div>
                              {complaintsList.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500">
                                  No complaints
                                </div>
                              ) : (
                                complaintsList.map((n) => (
                                  <button
                                    key={n.id}
                                    onClick={() => {
                                      markAsRead(n.id);
                                      setNotifOpen(false);
                                      setActiveTab("complaints");
                                    }}
                                    className={`w-full p-3 focus:outline-none transition-colors flex items-center ${n.isRead
                                      ? "bg-white hover:bg-[#fff6ec]"
                                      : "bg-[rgba(255,246,236,1)]"
                                      }`}
                                  >
                                    <UnreadCircle read={n.isRead} />
                                    <div className="text-left flex-1">
                                      <p
                                        className={`text-[13px] ${n.isRead
                                          ? "text-[#6b4b2b]"
                                          : "text-[#4f371f] font-semibold"
                                          }`}
                                      >
                                        {n.title}
                                      </p>
                                      {n.subtitle && (
                                        <p className="text-[12px] text-[#6b4b2b]">
                                          {n.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {n.at
                                        ? new Date(n.at).toLocaleDateString()
                                        : ""}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}

                          {/* REPORTS */}
                          {notifTab === "reports" && (
                            <div>
                              {reportsList.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500">
                                  No reports
                                </div>
                              ) : (
                                reportsList.map((n) => (
                                  <button
                                    key={n.id}
                                    onClick={() => {
                                      markAsRead(n.id);
                                      setNotifOpen(false);
                                      setActiveTab("reports");
                                    }}
                                    className={`w-full p-3 focus:outline-none transition-colors flex items-center ${n.isRead
                                      ? "bg-white hover:bg-[#fff6ec]"
                                      : "bg-[rgba(255,246,236,1)]"
                                      }`}
                                  >
                                    <UnreadCircle read={n.isRead} />
                                    <div className="text-left flex-1">
                                      <p
                                        className={`text-[13px] ${n.isRead
                                          ? "text-[#6b4b2b]"
                                          : "text-[#4f371f] font-semibold"
                                          }`}
                                      >
                                        {n.title}
                                      </p>
                                      {n.subtitle && (
                                        <p className="text-[12px] text-[#6b4b2b]">
                                          {n.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {n.at
                                        ? new Date(n.at).toLocaleDateString()
                                        : ""}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 text-[11px] text-[#8a5a25] bg-white/70">
                          Tip: Click a notification to jump to its section.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleLogout}
                  className="btn-logout flex items-center"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:flex">Log Out</span>
                </Button>
              </div>
            </nav>
          </div>
          {/* Mobile dropdown panel */}
          <div
            id="mobile-menu"
            className={`md:hidden transition-all duration-200 ease-out ${mobileOpen
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
              } overflow-hidden`}
          >
            <div className="px-4 pb-3 pt-1 flex flex-col">
              {/* <NotificationAction /> */}
            </div>
          </div>
        </div>
      </header>

      {/* Controller */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="seg-wrap">
          <div className="seg justify-center">
            <TabsList
              className="
          flex items-center gap-1
          bg-transparent p-0 border-0
          overflow-x-auto no-scrollbar
        "
            >
              <TabsTrigger
                value="dashboard" title="Dashboard"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>

              <TabsTrigger
                value="users" title="Users"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">User Verification</span>
              </TabsTrigger>

              <TabsTrigger
                value="bakeries" title="Bakeries"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <Microwave className="w-4 h-4" />
                <span className="hidden sm:inline">Bakeries</span>
              </TabsTrigger>

              <TabsTrigger
                value="charities" title="Charities"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Charities</span>
              </TabsTrigger>

              <TabsTrigger
                value="track" title="Donations"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <HandCoins className="w-4 h-4" />
                <span className="hidden sm:inline">Donations</span>
              </TabsTrigger>

              <TabsTrigger
                value="reports" title="Reports"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <FileBarChart className="w-4 h-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>

              <TabsTrigger
                value="complaints" title="Complaints"
                className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              >
                <MessageSquareWarning className="w-4 h-4" />
                <span className="hidden sm:inline">Complaints</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto lg:px-3 lg:py-3">
          <div className="px-2 py-2">
            <h1 className="title-ink text-2xl sm:text-[26px] truncate">
              {name}
            </h1>
            <span className="status-chip">{statusText}</span>
          </div>
          {/* Dashboard */}
          <TabsContent value="dashboard" className="reveal px-2">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <div className="space-y-6">
                    <div className="p-6">
                      <div>
                        <h2 className="text-3xl font-extrabold text-[#6b4b2b]">Dashboard</h2>
                        <p className="mt-1 text-sm text-[#7b5836]">Metrics</p>
                      </div>
                    </div>
                  </div>
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bakeries */}
          <TabsContent value="bakeries" className="reveal px-2">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <Bakery />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Charities */}
          <TabsContent value="charities" className="reveal px-2">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <Charity />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="reveal px-2">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent>
                  <AdminUser />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Report Generation */}
          <TabsContent value="reports" className="reveal px-2">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <AdminReports />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaderboards */}
          <TabsContent value="track" className="reveal px-2">
            <div className="gwrap hover-lift">
              <Card className="glass-card shadow-none">
                <CardContent className="sm:p-4 md:p-6 text-sm text-muted-foreground">
                  <div className="space-y-6">
                    <div className="p-2 pt-4 sm:p-4 md:p-6">
                      <div>
                        <h2 className="text-3xl font-extrabold text-[#6b4b2b]">Donation Leaderboards</h2>
                        <p className="mt-1 text-sm text-[#7b5836]">Track top performers by donations</p>
                      </div>
                    </div>
                  </div>
                  <Leaderboards />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Complaints */}
          <TabsContent value="complaints" className="reveal px-2">
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