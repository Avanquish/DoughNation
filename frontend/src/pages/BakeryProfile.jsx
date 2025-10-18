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
  Clock,
  AlertTriangle,
  LogOut,
  MessageSquareText,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Messages from "./Messages";
import BakeryNotification from "./BakeryNotification";
import RecentDonations from "./RecentDonations";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

// Helpers for product status
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

// Sub-tab state management
const SUBTAB_KEY = "bakery_profile_active_subtab";
const ALLOWED_SUBTABS = ["about", "history", "analytics"];
const getInitialSubTab = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("sub");
    if (fromUrl && ALLOWED_SUBTABS.includes(fromUrl)) return fromUrl;

    const stored = localStorage.getItem(SUBTAB_KEY);
    if (stored && ALLOWED_SUBTABS.includes(stored)) return stored;

    return "about";
  } catch {
    return "about";
  }
};

export default function BakeryProfile() {
  const { id } = useParams();
  const [name, setName] = useState("Bakery Name");
  const [activeSubTab, setActiveSubTab] = useState(getInitialSubTab); // <- changed
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [readProductIds, setReadProductIds] = useState(new Set());
  const [readMessageIds, setReadMessageIds] = useState(new Set());
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [badges, setBadges] = useState([]);

  const navigate = useNavigate();

  // keep data fresh: inventory, employees
  useEffect(() => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Bakery Name");
        setCurrentUser(decoded);
      }
    } catch (err) {
      console.error("Error fetching bakery profile stats:", err);
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

    loadInventory();
    loadEmployees();

    const onInventoryChange = () => loadInventory();
    const onEmployeesChange = () => loadEmployees();
    window.addEventListener("inventory:changed", onInventoryChange);
    window.addEventListener("employees:changed", onEmployeesChange);

    const onFocus = () => {
      loadInventory();
      loadEmployees();
    };
    window.addEventListener("focus", onFocus);

    const poll = setInterval(() => {
      loadInventory();
      loadEmployees();
    }, 10000);

    return () => {
      window.removeEventListener("inventory:changed", onInventoryChange);
      window.removeEventListener("employees:changed", onEmployeesChange);
      window.removeEventListener("focus", onFocus);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;
        setProfilePic(user.profile_picture);
        setName(user.name);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);

  const userId = id;
  useEffect(() => {
    axios
      .get(`${API}/badges/user/${userId}`)
      .then((res) => setBadges(res.data))
      .catch((err) => console.error(err));
  }, [userId]);

  // persist sub-tab across reloads
  useEffect(() => {
    try {
      if (!activeSubTab) return;
      localStorage.setItem(SUBTAB_KEY, activeSubTab);

      const params = new URLSearchParams(window.location.search);
      if (params.get("sub") !== activeSubTab) {
        params.set("sub", activeSubTab);
        const next = `${window.location.pathname}?${params.toString()}${
          window.location.hash
        }`;
        window.history.replaceState({}, "", next);
      }
    } catch {}
  }, [activeSubTab]);

  // calculate inventory status counts
  const statusCounts = useMemo(() => {
    const expired = inventory.filter((i) => statusOf(i) === "expired").length;
    const soon = inventory.filter((i) => statusOf(i) === "soon").length;
    const fresh = inventory.filter((i) => statusOf(i) === "fresh").length;
    return { expired, soon, fresh, total: inventory.length };
  }, [inventory]);

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
        status: st,
        days: d,
        dateText: item.expiration_date,
      });
    }
    return arr.sort((a, b) =>
      a.status !== b.status
        ? a.status === "expired"
          ? -1
          : 1
        : (a.days ?? 0) - (b.days ?? 0)
    );
  }, [inventory]);

  const messageNotifs = useMemo(
    () => [
      {
        id: "msg-1",
        title: "New message (design)",
        snippet: "Placeholder only",
      },
      {
        id: "msg-2",
        title: "New message (design)",
        snippet: "Placeholder only",
      },
    ],
    []
  );

  // UX tweaks: prevent background scroll when notif open
  useEffect(() => {
    document.documentElement.style.overflow = isNotifOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isNotifOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleClickProductNotification = (n) => {
    setReadProductIds((p) => {
      const next = new Set(p);
      next.add(n.id);
      return next;
    });
    navigate(`/bakery-dashboard/${id}?tab=inventory`);
  };

  const handleClickMessageNotification = (m) => {
    setReadMessageIds((p) => new Set(p).add(m.id));
    setIsNotifOpen(false);
    setIsMsgOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const formData = new FormData();
    const name = e.target.name?.value;
    const contactPerson = e.target.contact_person?.value;
    const contactNumber = e.target.contact_number?.value;
    const address = e.target.address?.value;
    const profilePicture = e.target.profile_picture?.files[0];

    if (name) formData.append("name", name);
    if (contactPerson) formData.append("contact_person", contactPerson);
    if (contactNumber) formData.append("contact_number", contactNumber);
    if (address) formData.append("address", address);
    if (profilePicture) formData.append("profile_picture", profilePicture);

    if (formData.keys().next().done) {
      Swal.fire({
        icon: "warning",
        title: "No changes",
        text: "Please fill at least one field to save changes.",
      });
      return;
    }

    try {
      await axios.put(`${API}/edit`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setIsEditOpen(false);
      window.dispatchEvent(new Event("profile:updated"));

      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your changes have been saved successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "There was an error saving your changes. Please try again.",
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const data = {
      current_password: e.target.current_password.value,
      new_password: e.target.new_password.value,
      confirm_password: e.target.confirm_password.value,
    };

    if (data.new_password !== data.confirm_password) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    try {
      await axios.put(`${API}/changepass`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setIsChangePassOpen(false);
      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been changed successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to change password:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "There was an error updating your password. Please try again.",
      });
    }
  };

  // Styles
  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --grad1:#FFFCF6; --grad2:#FFF3E3; --grad3:#FFE9CF; --grad4:#F9D9AE;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
      }

      .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
      .page-bg::before,.page-bg::after{content:""; position:absolute; inset:0}
      .page-bg::before{
        background:
          radial-gradient(1200px 520px at 12% -10%, var(--grad1) 0%, var(--grad2) 45%, transparent 70%),
          radial-gradient(900px 420px at 110% 18%, rgba(255,208,153,.28), transparent 70%),
          linear-gradient(135deg, #FFFEFB 0%, #FFF8ED 60%, #FFEFD9 100%);
        animation: drift 26s ease-in-out infinite alternate;
      }
              .page-bg::after{
        background: repeating-linear-gradient(-35deg, rgba(201,124,44,.045) 0 8px, rgba(201,124,44,0) 8px 18px);
        mix-blend-mode:multiply; opacity:.10; animation: pan 40s linear infinite;
      }
      .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.14}
      .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%); animation: blob 18s ease-in-out infinite alternate;}
      .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%); animation: blob 20s 2s ease-in-out infinite alternate;}
      @keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-18px,0)}}
      @keyframes pan{from{transform:translate3d(0,0,0)}to{transform:translate3d(-6%,-6%,0)}}
      @keyframes blob{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(24px,-20px,0) scale(1.04)}}

      .head{position:sticky; top:0; z-index:40; border-bottom:1px solid rgba(0,0,0,.06); backdrop-filter: blur(10px);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.96;
        background: linear-gradient(110deg, #ffffff 0%, #fff9f1 28%, #ffefd9 55%, #ffe5c2 100%);
        background-size: 220% 100%;
        animation: headerSlide 18s linear infinite;
      }
      @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
      .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
      .brand{display:flex; gap:.8rem; align-items:center}
      .ring{width:48px; height:48px; border-radius:9999px; padding:2px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789); animation: spin 10s linear infinite; box-shadow:0 10px 24px rgba(201,124,44,.16)}
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
      @keyframes spin{to{transform:rotate(360deg)}}
      .bread{transform-origin:50% 60%; animation: float 6s ease-in-out infinite}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      .title-ink{font-weight:800; letter-spacing:.2px; background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C); -webkit-background-clip:text; background-clip:text; color:transparent}

      /* 'Profile' pill */
      .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem; padding:.30rem .72rem; font-size:.82rem; border-radius:9999px; color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0; font-weight:800;}

      .iconbar{display:flex; align-items:center; gap:.5rem}
      .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.92); border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14); transition:transform .18s ease, box-shadow .18s ease}
      .icon-btn:hover{transform:translateY(-1px); box-shadow:0 10px 22px rgba(201,124,44,.20)}

      /* Buttons */
.btn-logout{
  position:relative; overflow:hidden;
  border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
  background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
  color:#fff; border:1px solid rgba(255,255,255,.6);
  box-shadow:0 8px 26px rgba(201,124,44,.25);
  transition:transform .18s ease, box-shadow .18s ease, filter .18s ease;
}
.btn-logout:before{
  content:""; position:absolute; top:-40%; bottom:-40%; left:-70%; width:60%;
  transform:rotate(10deg);
  background:linear-gradient(90deg, rgba(255,255,255,.26), rgba(255,255,255,0) 55%);
  animation: shine 3.2s linear infinite;
}
@keyframes shine { from{ left:-70% } to{ left:120% } }
.btn-logout:hover{
  transform:translateY(-1px) scale(1.02);
  box-shadow:0 12px 34px rgba(201,124,44,.32);
  filter:saturate(1.05);
}

      .btn-pill{
        position:relative; overflow:hidden; border-radius:9999px; padding:.65rem 1.05rem;
        background:linear-gradient(135deg,#F6C17C,#BF7327); color:#fff; font-weight:700;
        border:1px solid rgba(255,255,255,.65); box-shadow:0 10px 28px rgba(201,124,44,.28);
        transition:transform .18s ease, box-shadow .18s ease;
      }
      .btn-pill:hover{ transform:translateY(-1px) scale(1.02); box-shadow:0 14px 36px rgba(201,124,44,.34); }
      .btn-change{
        border-radius:9999px; padding:.65rem 1.05rem; font-weight:800; color:var(--ink);
        background:linear-gradient(180deg,#ffffff,#fff6ea);
        border:1.5px solid #e7b072;
        box-shadow:inset 0 1px 0 #ffffff, 0 8px 20px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .btn-change:hover{ transform:translateY(-1px) scale(1.02); background:linear-gradient(180deg,#fffaf2,#ffe4c6); box-shadow:inset 0 1px 0 #ffffff, 0 12px 30px rgba(201,124,44,.24); }

      /* hero + avatar */
      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(201,124,44,.10)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.0)), linear-gradient(135deg,#fbeedc,#f7cea1);}
      .hero-pattern{position:absolute; inset:0; opacity:.10}
      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      /* inner segment tabs like dashboard seg */
      .subseg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.08); width:fit-content}
      .subseg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .subseg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      /* overlay + modals */
      .overlay-root{position:fixed; inset:0; z-index:50;}
      .overlay-bg{position:absolute; inset:0; background:rgba(0,0,0,.32); backdrop-filter: blur(6px); opacity:0; animation: showBg .2s ease forwards}
      @keyframes showBg{to{opacity:1}}
      .overlay-panel{position:relative; margin:6rem auto 2rem; width:min(92%, 560px); border-radius:16px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.18)}
      .overlay-enter{transform:translateY(10px) scale(.98); opacity:0; animation: pop .22s ease forwards}
      @keyframes pop{to{transform:translateY(0) scale(1); opacity:1}}

      .modal-card{background:rgba(255,255,255,.96); backdrop-filter: blur(8px); border-radius:16px; border:1px solid rgba(0,0,0,.06); transition: transform .2s ease, box-shadow .2s ease;}
      .modal-card:hover{transform: scale(1.01); box-shadow: 0 28px 70px rgba(0,0,0,.22);}
      .modal-head{background:linear-gradient(180deg,#fff,#fff8ef); border-bottom:1px solid rgba(0,0,0,.06)}
      .modal-input{border-radius:10px; padding:.65rem .8rem; border:1px solid rgba(0,0,0,.18)}
      .modal-input:focus{outline:none; border-color:#E49A52; box-shadow:0 0 0 3px rgba(228,154,82,.2)}

      /* titles */
      .brown-title { color: #7a4f1c; }

      /* dashboard-like wrappers + chips for tiles */
      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55)); background-size:200% 200%; animation:borderShift 8s ease-in-out infinite}
      @keyframes borderShift{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .chip{width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px; background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#8a5a25; border:1px solid #fff3e0; box-shadow:0 6px 18px rgba(201,124,44,.18)}

      /* hover zooms */
      .card-zoom{ transition:transform .18s ease, box-shadow .18s ease; will-change: transform; }
      .card-zoom:hover{ transform:translateY(-2px) scale(1.02); box-shadow:0 18px 44px rgba(201,124,44,.18); }
      .tile{ transition:transform .18s ease, box-shadow .18s ease; will-change: transform; }
      .tile:hover{ transform:translateY(-2px) scale(1.02); box-shadow:0 10px 28px rgba(201,124,44,.16); }

      /* NOTIFICATION THEME — match with dashboard */
      .notif-card{ background:linear-gradient(180deg,#ffffff,#fff8ef); }
      .notif-head{ background:linear-gradient(90deg,#FFE7C5,#F6C17C,#E49A52); color:#572f00; }
      .notif-section{ padding:.6rem .9rem; font-size:.78rem; font-weight:800; color:#7a4f1c; background:linear-gradient(180deg,#fff7ec,#ffefd9); }
    `}</style>
  );

  const statusPie = [
    { name: "Fresh", value: statusCounts.fresh },
    { name: "Soon", value: statusCounts.soon },
    { name: "Expired", value: statusCounts.expired },
  ];

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
              <div className="brand gap-2">
                {/* Go Back beside rotating logo */}
                <button
                  className="icon-btn"
                  aria-label="Back to dashboard"
                  title="Back to Dashboard"
                  onClick={() =>
                    navigate(`/bakery-dashboard/${id}?tab=dashboard`)
                  }
                >
                  <ChevronLeft className="h-[18px] w-[18px]" />
                </button>

                {/* Rotating ring + bread glyph */}
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

                <div className="min-w-0 ml-1">
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">
                    {name}
                  </h1>
                  <span className="status-chip">Profile</span>
                </div>
              </div>
            </div>

            {/* Right-side actions */}
            <div className="pt-1 iconbar">
              <Messages currentUser={currentUser} />
              <BakeryNotification />
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

      {/* Notifications overlay */}
      {isNotifOpen && (
        <div
          className="overlay-root"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
        >
          <div className="overlay-bg" onClick={() => setIsNotifOpen(false)} />
          <div className="overlay-panel overlay-enter">
            <Card className="modal-card notif-card">
              <CardHeader className="pb-2 modal-head notif-head">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="brown-title">Notifications</CardTitle>
                    <CardDescription>
                      Product alerts & message notifications
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
                  <li className="notif-section">Inventory</li>
                  {productAlerts.length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">
                      No inventory alerts.
                    </li>
                  )}
                  {productAlerts
                    .filter((n) => !readProductIds.has(n.id))
                    .map((n) => (
                      <li
                        key={n.id}
                        className="p-4 hover:bg黑/5 cursor-pointer"
                        onClick={() => handleClickProductNotification(n)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="chip mt-0.5">
                            {n.status === "expired" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold truncate">{n.name}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {n.dateText}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {n.status === "expired"
                                ? `${n.quantity} item(s) expired`
                                : `${n.quantity} item(s) expiring in ${n.days} day(s)`}
                            </p>
                            <div
                              className="mt-1 inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full border"
                              style={{
                                background:
                                  n.status === "expired"
                                    ? "#fff1f0"
                                    : "#fff8e6",
                                borderColor:
                                  n.status === "expired"
                                    ? "#ffd6d6"
                                    : "#ffe7bf",
                                color:
                                  n.status === "expired"
                                    ? "#c92a2a"
                                    : "#8a5a25",
                              }}
                            >
                              {n.status === "expired"
                                ? "Expired"
                                : "Expires Soon"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      </li>
                    ))}

                  <li className="notif-section">Messages</li>
                  {messageNotifs.filter((m) => !readMessageIds.has(m.id))
                    .length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">
                      No message notifications.
                    </li>
                  )}
                  {messageNotifs
                    .filter((m) => !readMessageIds.has(m.id))
                    .map((m) => (
                      <li
                        key={m.id}
                        className="p-4 hover:bg黑/5 cursor-pointer"
                        onClick={() => handleClickMessageNotification(m)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="chip mt-0.5">
                            <MessageSquareText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{m.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {m.snippet}
                            </p>
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
                          Expired: {statusCounts.expired} • Nearing Expiration:{" "}
                          {statusCounts.soon}
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
                <div className="p-3 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsNotifOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() =>
                      navigate(`/bakery-dashboard/${id}?tab=inventory`)
                    }
                  >
                    View Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* hero + subtabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />
          <div className="hero-pattern" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="avatar-ring shrink-0">
                <img
                  src={
                    profilePic ? `${API}/${profilePic}` : "/default-avatar.png"
                  }
                  alt="Profile Picture"
                  className="h-32 w-32 rounded-full object-cover"
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
                    className="btn-pill"
                    onClick={() => setIsEditOpen(true)}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    className="btn-change"
                    onClick={() => setIsChangePassOpen(true)}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditOpen && (
              <div className="overlay-root" role="dialog">
                <div
                  className="overlay-bg"
                  onClick={() => setIsEditOpen(false)}
                />
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Edit Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-3" onSubmit={handleEditSubmit}>
                        <div className="flex flex-col">
                          <p className="brown-title">Bakery Name</p>
                          <input
                            type="text"
                            name="name"
                            defaultValue={name}
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Contact Person</p>
                          <input
                            type="text"
                            name="contact_person"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Contact Number</p>
                          <input
                            type="text"
                            name="contact_number"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Address</p>
                          <input
                            type="text"
                            name="address"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Profile Picture</p>
                          <input
                            type="file"
                            name="profile_picture"
                            accept="image/*"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="btn-pill">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Change Password Modal */}
            {isChangePassOpen && (
              <div className="overlay-root" role="dialog">
                <div
                  className="overlay-bg"
                  onClick={() => setIsChangePassOpen(false)}
                />
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Change Password
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form
                        className="space-y-3"
                        onSubmit={handleChangePassword}
                      >
                        <div className="flex flex-col">
                          <p className="brown-title">Current Password</p>
                          <input
                            type="password"
                            name="current_password"
                            required
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">New Password</p>
                          <input
                            type="password"
                            name="new_password"
                            required
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Confirm New Password</p>
                          <input
                            type="password"
                            name="confirm_password"
                            required
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsChangePassOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="btn-pill">
                            Change Password
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Subtabs (About / Donation History / Analytics) */}
            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="subseg">
                  <TabsList className="bg-transparent p-0 border-0">
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="history">Donation History</TabsTrigger>
                    <TabsTrigger value="analytics">
                      Analytics &amp; Badges
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">About</CardTitle>
                        <CardDescription>
                          Tell donors more about your bakery
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-[15px] leading-relaxed">
                          Update this section in <em>Edit Profile</em> to
                          display your story, mission, and donation preferences.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="tile p-4 rounded-lg border bg-white/70">
                            <div className="text-sm text-muted-foreground">
                              Employees
                            </div>
                            <div className="text-2xl font-bold">
                              {employeeCount}
                            </div>
                          </div>
                          <div className="tile p-4 rounded-lg border bg-white/70">
                            <div className="text-sm text-muted-foreground">
                              Products Tracked
                            </div>
                            <div className="text-2xl font-bold">
                              {statusCounts.total}
                            </div>
                          </div>
                          <div className="tile p-4 rounded-lg border bg-white/70">
                            <div className="text-sm text-muted-foreground">
                              Active Alerts
                            </div>
                            <div className="text-2xl font-bold">
                              {statusCounts.expired + statusCounts.soon}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Donation History */}
                <TabsContent value="history" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none h-[560px] flex flex-col card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">
                          Donation History
                        </CardTitle>
                        <CardDescription>
                          Your completed donations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 overflow-auto">
                        <div className="h-full max-h-full">
                          <RecentDonations />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="pt-6 space-y-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">Badges</CardTitle>
                        <CardDescription />
                      </CardHeader>
                      <CardContent className="min-h-[80px] flex flex-wrap gap-4">
                        {badges && badges.length > 0 ? (
                          badges.map((userBadge) => (
                            <div
                              key={userBadge.id}
                              className="flex flex-col items-center"
                            >
                              <img
                                src={
                                  userBadge.badge?.icon_url
                                    ? `${API}/${userBadge.badge.icon_url}`
                                    : "/placeholder-badge.png"
                                }
                                alt={userBadge.badge?.name}
                                title={userBadge.badge?.name}
                                className="w-12 h-12 hover:scale-110 transition-transform"
                              />
                              <span className="text-xs mt-1">
                                {userBadge.badge_name &&
                                userBadge.badge_name.trim() !== ""
                                  ? userBadge.badge_name
                                  : userBadge.badge?.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">
                            No badges unlocked yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">
                          Data Visualization
                        </CardTitle>
                        <CardDescription>
                          Inventory status at a glance
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="tile p-4 rounded-lg border bg-white/70">
                          <div className="text-sm text-muted-foreground mb-2">
                            Total
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Fresh",
                                      value: statusCounts.fresh,
                                    },
                                    { name: "Soon", value: statusCounts.soon },
                                    {
                                      name: "Expired",
                                      value: statusCounts.expired,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={2}
                                >
                                  {["#68b266", "#f3c04f", "#e05b5b"].map(
                                    (c, i) => (
                                      <Cell key={i} fill={c} />
                                    )
                                  )}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="tile p-4 rounded-lg border bg-white/70">
                          <div className="text-sm text-muted-foreground mb-2">
                            Fresh vs Soon
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Fresh",
                                      value: statusCounts.fresh,
                                    },
                                    { name: "Soon", value: statusCounts.soon },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={50}
                                  outerRadius={75}
                                >
                                  <Cell fill="#68b266" />
                                  <Cell fill="#f3c04f" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="tile p-4 rounded-lg border bg-white/70">
                          <div className="text-sm text-muted-foreground mb-2">
                            Expired Share
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Expired",
                                      value: statusCounts.expired,
                                    },
                                    {
                                      name: "Other",
                                      value: Math.max(
                                        statusCounts.total -
                                          statusCounts.expired,
                                        0
                                      ),
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={50}
                                  outerRadius={75}
                                >
                                  <Cell fill="#e05b5b" />
                                  <Cell fill="#e5decf" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
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