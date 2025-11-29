import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquareText,
  X,
  ChevronRight,
  Paperclip,
  MoreVertical,
  Image as ImageIcon,
  Video as VideoIcon,
  Check,
  XCircle,
} from "lucide-react";
import axios from "axios";

/* ==== Config & helpers ==== */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const CHAT_PAGE_SIZE = 5; // how many chats per page in chat list

const fileUrl = (path) => {
  if (!path) return "";
  const clean = String(path).replace(/^\//, "");
  return `${API_URL}/${clean}`;
};

const mediaDataURL = (type, base64) =>
  type && base64 ? `data:${type};base64,${base64}` : "";

/** Asia/Manila time formatting */
// --- Helpers to normalize timestamps and render in Asia/Manila ---
const toManilaDate = (ts) => {
  if (!ts) return null;

  // number => epoch ms
  if (typeof ts === "number") return new Date(ts);

  // string => ensure may timezone; if none, treat as UTC
  const s = String(ts).trim().replace(" ", "T"); // normalize 'YYYY-MM-DD HH:mm:ss'
  const hasTZ = /Z|[+-]\d{2}:\d{2}$/.test(s);
  return new Date(hasTZ ? s : `${s}Z`);
};

const formatTime = (ts) => {
  try {
    const d = toManilaDate(ts);
    if (!d || isNaN(d.getTime())) return String(ts);
    return new Intl.DateTimeFormat("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    }).format(d);
  } catch {
    return String(ts);
  }
};

/** Helpers for day separators (Asia/Manila) */
const dateInTz = (ts, tz = "Asia/Manila") =>
  // convert to the same local day regardless of client timezone
  new Date(new Date(ts).toLocaleString("en-US", { timeZone: tz }));

const sameDay = (a, b) => {
  const da = dateInTz(a);
  const db = dateInTz(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const formatDayLabel = (ts) =>
  dateInTz(ts).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/* ==== Theme / UI ==== */
const Styles = () => (
  <style>{`
    :root{
      --ink:#7a4f1c;
      --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
      --cream:#fff9f0; --line:rgba(0,0,0,.08);
    }

    .icon-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;border:1px solid rgba(0,0,0,.08);background:#fff;color:var(--ink)}
    .icon-btn:hover{background:#fff4e6}

    .msg-badge{
      background: linear-gradient(90deg, var(--brand2), var(--brand3));
      border: 1px solid rgba(255,255,255,.65);
      box-shadow: 0 6px 16px rgba(201,124,44,.35);
    }

    .badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9999px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#fff;background:#ef4444}

    .msg-launcher{
      will-change: transform, box-shadow;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .msg-launcher:hover{
      transform: translateY(-1px) scale(1.02);
      box-shadow: 0 8px 18px rgba(0,0,0,.08);
    }
    .msg-launcher:active{
      transform: translateY(0) scale(0.99);
      box-shadow: 0 4px 12px rgba(0,0,0,.06);
    }

    /* === UI: chat list wrapper / modal === */
    .chatlist-layer{
      position:absolute;
      right:0;
      top:100%;
      margin-top:8px;
      z-index:9998;
    }

    .chatlist-dropdown{
      width:360px; max-width:92vw; max-height:calc(100vh - 96px);
      background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 18px 40px rgba(0,0,0,.18);
      transform:translateY(-6px); opacity:0; animation:clpop .16s ease forwards;
      display:flex; flex-direction:column; overflow:hidden;
    }
    @keyframes clpop{to{transform:translateY(0); opacity:1}}

    .cl-head{display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid var(--line); background:var(--cream)}
    .cl-title{font-weight:800; font-size:18px; flex:1; color:var(--ink)}
    .cl-close-btn{
      margin-left:auto;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:30px;
      height:30px;
      border-radius:9999px;
      border:1px solid #f2d4b5;
      background:#fff;
      box-shadow:0 1px 0 rgba(0,0,0,.03);
      color:var(--ink);
      cursor:pointer;
    }
    .cl-close-btn:hover{background:#fff4e6;}
    .cl-search{padding:10px 14px; border-bottom:1px solid var(--line)}
    .cl-search input{width:100%; border:1px solid #f2d4b5; background:#fff; padding:10px 12px; border-radius:9999px; outline:none; font-size:14px;}
    .cl-search input:focus{box-shadow:0 0 0 2px #E49A5233}

    .cl-list{flex:1; min-height:0; overflow:auto; background:#fff;}
    .cl-row{padding:10px 14px; display:flex; gap:10px; align-items:flex-start; cursor:pointer; border-bottom:1px solid rgba(0,0,0,.03);}
    .cl-row:last-of-type{border-bottom:0;}
    .cl-row:hover{background:#fff8e6}
    .avatar{width:42px; height:42px; border-radius:9999px; overflow:hidden; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-weight:800}
    .avatar.fallback{background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#7a4f1c; border:1px solid #fff3e0}
    .name{font-weight:700; color:var(--ink); font-size:14px;}
    .snippet{font-size:13px; color:#6b4b2b; opacity:.8}
    .dot{width:8px; height:8px; border-radius:9999px; background:var(--brand2)}
    .time{font-size:12px; color:#8b6b48}
    .cl-foot{
      padding:10px 14px;
      border-top:1px solid var(--line);
      background:#fffdf7;
    }    

    .seeall{font-size:13px;font-weight:600;color:#7a4f1c;padding:6px 12px;border-radius:9999px;border:1px solid #f2d4b5;background:#fffaf3;}
    .seeall:hover{background:#ffe8c8;}

    .page-nav{display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;}
    .page-btn{font-size:12px;font-weight:600;color:#7a4f1c;padding:4px 10px;border-radius:9999px;border:1px solid #f2d4b5;background:#fff;}
    .page-btn:disabled{opacity:.4;cursor:default;}
    .page-label{flex:1;text-align:center;font-size:12px;color:#8b6b48;}

    /* === UI: dock / chat box polish === */
    .dock-root{position:fixed; right:16px; bottom:16px; z-index:2100; pointer-events:none}
    .dock{
      width:380px; max-width:92vw; height:520px; max-height:calc(100vh - 64px);
      background:linear-gradient(160deg,#ffffff 0%, #fffaf4 35%, #ffe8c8 100%);
      border:1px solid var(--line); border-radius:18px; box-shadow:0 18px 40px rgba(0,0,0,.18);
      display:flex; flex-direction:column; overflow:hidden; pointer-events:auto;
      transform:translateY(8px); opacity:0; animation:dock .18s ease forwards;
    }
    @keyframes dock{to{transform:translateY(0); opacity:1}}
    .dock-head{display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid var(--line);
      background:linear-gradient(110deg,#ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%)}
    .avatar-sm{width:30px; height:30px; border-radius:9999px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-weight:800; background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#7a4f1c; border:1px solid #fff3e0}
    .dock-title{font-weight:800; line-height:1.1; flex:1; min-width:0; color:var(--ink)}
    .dock-actions{display:flex;align-items:center;gap:6px;}

    .pending-bar{display:flex; align-items:center; gap:8px; padding:6px 10px; background:#fffef9; border-bottom:1px solid #f4e4cf}
    .pending-toggle{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:9999px; border:1px solid #f1d9b8; background:#fff; font-weight:700; color:#7a4f1c; font-size:12px;}
    .pending-list{padding:8px 10px; background:#fffdf6; border-bottom:1px solid #f4e4cf}
    .pend-row{display:flex; align-items:center; gap:10px; padding:6px 0}
    .pend-meta{flex:1; min-width:0}
    .pend-title{font-weight:700; color:#6b4b2b}
    .pend-sub{font-size:12px; color:#7a4f1c; opacity:.9}
    .pend-actions{display:flex; gap:6px}
    .btn-mini{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:10px; border:1px solid #f2d4b5; background:#fff; font-size:12px;}
    .btn-mini.accept{background:linear-gradient(90deg,var(--brand1),var(--brand2)); color:#fff; border-color:transparent}
    .btn-mini:disabled{opacity:0.5; cursor:not-allowed}

    .dock-scroll{flex:1; overflow:auto; padding:16px 16px 18px; background:radial-gradient(circle at top,#fffaf3 0,#fff7ec 40%,#ffe8cf 100%);}

    .msg-row{display:flex; align-items:flex-end; gap:6px; margin:8px 0}
    .msg-row.right{justify-content:flex-end}
    .msg-row.left{justify-content:flex-start}

    /* context menu opens to the LEFT of the 3 dots */
    .left-controls{ position:relative; align-self:flex-end; }
    .icon-btn-tiny{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:8px;border:1px solid var(--line);background:#fff;color:#7a4f1c}
    .icon-btn-tiny:hover{background:#fff4e6}
    .left-controls .ctx-menu{
      position:absolute;
      top:50%;
      transform: translateY(-50%);
      right: calc(100% + 8px);
      left:auto;
      min-width:160px; background:#fff; border:1px solid rgba(0,0,0,.1); box-shadow:0 12px 28px rgba(0,0,0,.16); border-radius:8px; overflow:hidden; z-index:30
    }
    .ctx-item{display:block; width:100%; text-align:left; padding:10px 12px; font-size:13px; color:#4a2f17; background:#fff; cursor:pointer}
    .ctx-item:hover, .ctx-item:focus-visible{background:#ffe7c5}

    .bubble{
      max-width:75%; padding:10px 12px 8px; border-radius:18px; word-break:break-word; overflow-wrap:anywhere;
      box-shadow:0 4px 8px rgba(0,0,0,.06); position:relative; border:0; font-size:14px;
    }
    .msg-row.right .bubble{border-bottom-right-radius:6px;}
    .msg-row.left .bubble{border-bottom-left-radius:6px;}

    .bubble.me{
      background:linear-gradient(135deg,#FFE7C5,#F6C17C);
      color:#4a2f17;
      border:1px solid #f4d9bf;
    }
    .bubble.them{
      background:#fff;
      color:#4a2f17;
      margin-right:auto;
      border:1px solid #f2d4b5;
    }

    .media-wrap{border-radius:12px; overflow:hidden; margin-bottom:4px;}
    .media-wrap img, .media-wrap video{display:block;width:100%;height:auto;max-height:420px}
    .bubble.me .media-caption,
    .bubble.me .media-caption a,
    .bubble.me .media-caption strong,
    .bubble.me .media-caption em{ color:#4a2f17; }
    .media-caption{ display:block; margin-top:6px; background:transparent; border:0; color:inherit; line-height:1.3; max-width:100%; }

    .meta{display:flex; align-items:center; gap:6px; justify-content:flex-end; margin-top:4px}
    .btime{font-size:11px; opacity:.75; color:#3d2a16}
    .readmark{font-size:11px; opacity:.65; color:#3d2a16}
    .readmark.sent{opacity:.55}
    .readmark.read{opacity:1; color:#000}

    .dock-compose{display:flex; gap:8px; padding:8px 10px; border-top:1px solid var(--line); background:#fffaf2; align-items:center;}
    .compose-group{flex:1 1 auto; display:flex; align-items:flex-start; gap:8px; border:1px solid #f2d4b5; background:#fff; border-radius:20px; padding:8px 12px; overflow:hidden; min-width:0; flex-wrap:wrap; box-shadow:0 1px 0 rgba(0,0,0,.03)}
    .attach-btn{display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9999px; border:1px solid #f2d4b5; background:#fff7ec; flex:0 0 auto; align-self:center;}
    .attach-btn:hover{background:#ffe8cf}
    .attach-chip{flex:0 1 55%; min-width:0; display:inline-flex; align-items:center; gap:6px; height:30px; padding:2px 10px; border-radius:9999px; background:#fff7ec; border:1px solid #f4d9bf; font-size:12px; color:#6b4b2b; box-shadow:inset 0 0 0 1px #fff}
    .attach-chip .thumb{width:20px; height:20px; border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #f1d6b7; background:#fff}
    .attach-chip .thumb img{width:100%; height:100%; object-fit:cover; border-radius:6px}
    .attach-chip .name{flex:1 1 auto; min-width:0; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600}
    .attach-chip .remove-attach{margin-left:2px; display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:9999px; background:transparent; border:0}
    .attach-chip .remove-attach:hover{background:#ffe7c5}

    .compose-input{flex:1 1 auto; border:0; outline:none; background:transparent; color:#4a2f17; min-width:0; width:0; font-size:15px; line-height:1.4; padding:4px 0 4px; min-height:24px; max-height:140px; overflow-y:auto; resize:none;}
    .compose-input::placeholder,
    .compose-input::-webkit-input-placeholder,
    .compose-input::-moz-placeholder,
    .compose-input:-ms-input-placeholder{ color:#4a2f17; opacity:0.7; }

    .compose-group.has-attach .attach-chip{ margin-right:8px; }
    .compose-group.has-attach .compose-input{ flex:1 0 180px; }

    .dock-send{flex:0 0 auto; border-radius:9999px; padding:10px 16px; font-size:14px; font-weight:700; color:#fff; background:linear-gradient(90deg, var(--brand1), var(--brand2), var(--brand3)); box-shadow:0 6px 16px rgba(201,124,44,.22); border:0;}
    .dock-send:hover{filter:brightness(1.03);}

    .scroll-btn{position:absolute; right:12px; bottom:70px; background:#ffffff; border:1px solid rgba(0,0,0,.08); border-radius:9999px; padding:6px 10px; font-weight:800; color:#7a4f1c; box-shadow:0 8px 18px rgba(0,0,0,.12); font-size:13px;}

    /* Typing tray (no background bar) */
    .typing-tray{ display:flex; align-items:center; gap:8px; padding:0 16px 6px; background:transparent !important; border:0 !important; box-shadow:none !important; }
    .typing-dot{ width:6px; height:6px; border-radius:9999px; background:var(--brand2); animation: blink 1s infinite ease-in-out; flex:0 0 auto; }
    .typing-text{ font-size:12px; font-weight:700; color:#1f1f1f; }
    @keyframes blink{ 50%{ opacity:.3 } }

    /* Deleted/tombstone bubble */
    .bubble.tombstone{
      background:#f7f7f7;
      color:#6b7280;
      border:1px dashed #e5e7eb;
      font-style:italic;
    }

    /* === Responsive tweaks (mobile) === */
    @media (max-width: 768px){
      .chatlist-layer{ position: fixed; top: 0; right: 0; bottom: 0; left: 0; margin-top: 0; background: transparent; z-index: 9999; display:flex; align-items:center; justify-content:center; pointer-events: none; }
      .chatlist-dropdown{ position: absolute; top: 50%; left: 4%; transform: translate(-50%, -50%); box-sizing: border-box; width: calc(100% - 32px); max-width: 360px; max-height: 80vh; margin: 0; border-radius: 22px; box-shadow: 0 18px 40px rgba(191,115,39,.25); pointer-events: auto; }

      .dock-root{ right:0; left:0; bottom:0; top:auto; display:flex; align-items:flex-end; justify-content:center; }
      .dock{ width:100%; max-width:100%; height:70vh; max-height:70vh; border-radius:18px 18px 0 0; box-shadow:0 -8px 24px rgba(0,0,0,.2); }
      .dock-head{ padding:12px 16px; }
      .dock-scroll{ padding:12px 12px 16px; }
      .dock-compose{ padding:10px 12px 12px; }
      .scroll-btn{ bottom:82px; right:16px; }
    }
      /* Centered day/date separator */
      .day-sep{display:flex;justify-content:center;margin:10px 0}
      .day-sep span{
        font-size:12px;font-weight:700;color:#8b6b48;
        background:#fff7ea;border:1px solid #f2d4b5;
        padding:6px 10px;border-radius:9999px;
        box-shadow:0 1px 0 rgba(0,0,0,.03);
      }
  `}</style>
);

export default function Messages({ currentUser: currentUserProp }) {
  /* UI State */
  const [openList, setOpenList] = useState(false);
  const [openDock, setOpenDock] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatPage, setChatPage] = useState(0); // for Prev/Next pages
  const [remoteTyping, setRemoteTyping] = useState(false); // UI-only indicator for peer typing

  /* Data State - All in Memory */
  const [messages, setMessages] = useState([]);
  const [activeChats, setActiveChats] = useState(new Map());
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingCards, setPendingCards] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [acceptedDonations, setAcceptedDonations] = useState(new Set());
  const [disabledDonations, setDisabledDonations] = useState(new Set());
  const [allDonationRequests, setAllDonationRequests] = useState([]);
  const [removedProducts, setRemovedProducts] = useState(new Set());
  const [removedDonations, setRemovedDonations] = useState(new Set());
  const [localTyping, setLocalTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(currentUserProp || null);
  const [, setLoading] = useState(false);
  const [inventoryStatuses, setInventoryStatuses] = useState(new Map());
  const [cancelledDonationIds, setCancelledDonationIds] = useState(new Set());
  const prevMessageCountRef = useRef(0);

  /* Refs */
  const dockScrollRef = useRef(null);
  const typingTimer = useRef(null);
  const messageRefs = useRef(new Map());
  const launcherWrapRef = useRef(null);
  const dropdownRef = useRef(null);
  const composeRef = useRef(null);
  const pollRef = useRef({ activeChats: null, history: null, inventory: null });
  const fetchedHistoryRef = useRef(new Set());
  const renderFetchRef = useRef(new Set());

  const setMsgRef = (id) => (el) => {
    if (el) messageRefs.current.set(id, el);
    else messageRefs.current.delete(id);
  };

  const jumpTo = (id) => {
    const el = messageRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---- Helper Functions ---- */
  const makeAuthOpts = () => {
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken || currentUser?.token;

    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const getCurrentUserName = () => {
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken;

    if (!token) return "Unknown";

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));

      if (decoded.type === "employee") {
        return decoded.employee_name || decoded.name || "Employee";
      } else {
        return decoded.name || "User";
      }
    } catch (err) {
      console.error("Failed to decode token:", err);
      return "Unknown";
    }
  };

  /* ---- Fetch Functions ---- */
  const fetchInventoryStatus = async (bakeryInventoryId) => {
    try {
      const opts = makeAuthOpts();
      const res = await axios.get(
        `${API_URL}/donation/inventory_status/${bakeryInventoryId}`,
        opts
      );

      setInventoryStatuses((prev) => {
        const next = new Map(prev);
        next.set(bakeryInventoryId, res.data);
        return next;
      });

      return res.data;
    } catch (err) {
      console.error("Error fetching inventory status:", err);
      return null;
    }
  };

  const fetchAllDonationStatuses = async () => {
    try {
      const opts = makeAuthOpts();
      const [acceptedRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/donation/accepted`, opts),
        axios.get(`${API_URL}/donation/my_requests`, opts),
      ]);

      const combined = [...acceptedRes.data, ...pendingRes.data];
      setAllDonationRequests(combined);

      const takenIds = new Set(
        combined
          .filter((d) => d.status === "accepted" || d.status === "canceled")
          .map((d) => d.bakery_inventory_id)
      );

      setAcceptedDonations(takenIds);
    } catch (err) {
      console.error("Error fetching donation statuses:", err);
    }
  };

  const fetchRemovedProducts = async () => {
    try {
      const opts = makeAuthOpts();
      const res = await axios.get(`${API_URL}/donation/accepted`, opts);
      const removed = new Set(res.data.map((r) => r.bakery_inventory_id));
      setRemovedProducts(removed);
    } catch (err) {
      console.error("Error fetching accepted donations:", err);
    }
  };

  const fetchActiveChats = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/messages/active_chats`,
        makeAuthOpts()
      );
      const map = new Map();
      for (const c of res.data.chats || []) {
        if (c.peer)
          map.set(Number(c.peer.id), {
            ...c.peer,
            ...c,
            unread: c.unread || 0,
          });
      }
      setActiveChats(map);

      for (const [peerId] of map.entries()) {
        if (fetchedHistoryRef.current.has(peerId)) continue;
        const hasLocal = messages.some(
          (m) =>
            Number(m.sender_id) === peerId || Number(m.receiver_id) === peerId
        );
        if (!hasLocal) {
          fetchedHistoryRef.current.add(peerId);
          fetchHistoryForPeer(peerId).catch(() => {
            fetchedHistoryRef.current.delete(peerId);
          });
          await new Promise((r) => setTimeout(r, 80));
        }
      }
    } catch (err) {
      console.debug("fetchActiveChats failed:", err?.message || err);
    }
  };

  const mergeIncomingMessages = (incoming) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [Number(m.id), m]));
      for (const m of incoming) {
        const id = Number(m.id);
        const prevMsg = byId.get(id);
        byId.set(id, prevMsg ? { ...m, ...prevMsg } : m);
      }
      const out = Array.from(byId.values()).sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      return out;
    });
  };

  const fetchHistoryForPeer = async (peerId) => {
    if (!peerId || !currentUser) return;
    try {
      const res = await axios.get(
        `${API_URL}/messages/history?peer_id=${Number(peerId)}`,
        makeAuthOpts()
      );
      const incoming = (res.data.messages || []).map((m) => ({
        ...m,
        id: Number(m.id),
        sender_id: Number(m.sender_id),
        receiver_id: Number(m.receiver_id),
      }));
      mergeIncomingMessages(incoming);
    } catch (err) {
      console.debug("fetchHistoryForPeer failed:", err?.message || err);
    }
  };

  /* ---- Message Actions ---- */
  const sendMessage = async () => {
    if (!newMessage.trim() && !mediaFile) return;
    if (!selectedUser || !currentUser) return;

    try {
      const opts = makeAuthOpts();
      if (mediaFile) {
        const form = new FormData();
        form.append("sender_id", Number(currentUser.id));
        form.append("receiver_id", Number(selectedUser.id));
        form.append("content", newMessage.trim() || "");
        form.append("file", mediaFile);
        await axios.post(`${API_URL}/messages/send`, form, {
          ...opts,
          headers: {
            ...(opts.headers || {}),
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        const payload = {
          sender_id: Number(currentUser.id),
          receiver_id: Number(selectedUser.id),
          content: newMessage.trim(),
        };
        await axios.post(`${API_URL}/messages/send`, payload, opts);
      }
      setNewMessage("");
      setMediaFile(null);

      fetchHistoryForPeer(selectedUser.id);
      fetchActiveChats();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const sendDonationCard = async (donation, peer = selectedUser) => {
    if (!peer || !currentUser) return;

    const donationCard = {
      ...donation,
      id: donation.id,
      request_id: donation.id,
      donation_request_id: donation.id,
      bakery_inventory_id: donation.bakery_inventory_id,
      product_name: donation.product_name || donation.name,
      name: donation.name,
      image: donation.image,
      quantity: donation.quantity || donation.donation_quantity,
      expiration_date: donation.expiration_date,
    };

    const content = JSON.stringify({
      type: "donation_card",
      donation: donationCard,
      originalCharityId: Number(currentUser.id),
    });

    try {
      await axios.post(
        `${API_URL}/messages/send`,
        {
          sender_id: Number(currentUser.id),
          receiver_id: Number(peer.id),
          content,
        },
        makeAuthOpts()
      );

      if (currentUser.role === "charity") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender_id: Number(currentUser.id),
            receiver_id: Number(peer.id),
            content,
            timestamp: new Date().toISOString(),
            is_read: false,
          },
        ]);
      }

      fetchActiveChats();
    } catch (err) {
      console.error("sendDonationCard failed:", err);
    }
  };

  const acceptDonation = async (donationCardMessage) => {
    if (!donationCardMessage || !currentUser) return;

    let donation;
    let originalCharityId;
    try {
      const parsed = JSON.parse(donationCardMessage.content);
      donation = parsed.donation;
      originalCharityId = parsed.originalCharityId;
    } catch {
      console.error("Invalid donation card");
      return;
    }

    setDisabledDonations((prev) => new Set(prev).add(donation.id));

    try {
      const opts = makeAuthOpts();
      setAcceptedDonations((prev) => new Set([...prev, donation.id]));

      setMessages((prev) =>
        prev.map((m) =>
          m.id === donationCardMessage.id ? { ...m, accepted: true } : m
        )
      );

      const userName = getCurrentUserName();

      const res = await axios.post(
        `${API_URL}/donation/accept/${donation.id}`,
        {
          charity_id: originalCharityId,
          donated_by: userName,
        },
        opts
      );
      const {
        accepted_charity_id,
        canceled_charities,
        donation_name,
        bakery_inventory_id,
      } = res.data;

      if (bakery_inventory_id) {
        await fetchInventoryStatus(bakery_inventory_id);
      }

      await fetchAllDonationStatuses();
      await fetchRemovedProducts();

      if (accepted_charity_id) {
        await axios.post(
          `${API_URL}/messages/send`,
          {
            sender_id: Number(currentUser.id),
            receiver_id: Number(accepted_charity_id),
            content: JSON.stringify({
              type: "confirmed_donation",
              donation,
              message: `Your request for ${donation_name} was accepted! 🎉`,
            }),
          },
          opts
        );
      }

      if (Array.isArray(canceled_charities) && canceled_charities.length > 0) {
        for (const cid of canceled_charities) {
          await axios.post(
            `${API_URL}/messages/send`,
            {
              sender_id: Number(currentUser.id),
              receiver_id: Number(cid),
              content: JSON.stringify({
                type: "donation_unavailable",
                donation,
                message: `Request cancelled: You requested ${donation?.quantity} quantity but only ${remainingQty} remaining. You can request again`,
              }),
            },
            opts
          );
        }
      }

      try {
        // optional toast hooks if present
        // eslint-disable-next-line no-undef
        toast?.success?.(`You accepted the donation: ${donation_name}`);
      } catch {}
      fetchActiveChats();
    } catch (err) {
      console.error("Failed to accept donation:", err);
      try {
        // eslint-disable-next-line no-undef
        toast?.error?.("Failed to accept donation.");
      } catch {}
    } finally {
      setDisabledDonations((prev) => {
        const copy = new Set(prev);
        copy.delete(donation.id);
        return copy;
      });
    }
  };

  const cancelDonation = async (donationCardMessage) => {
    if (!donationCardMessage || !currentUser) return;

    let donation;
    let originalCharityId;
    try {
      const parsed = JSON.parse(donationCardMessage.content);
      donation = parsed.donation;
      originalCharityId = parsed.originalCharityId ?? donation.charity_id;
    } catch {
      console.error("Invalid donation card");
      return;
    }

    setDisabledDonations((prev) => new Set(prev).add(donation.id));

    try {
      const opts = makeAuthOpts();

      // Change the message to show it's cancelled instead of deleting
      setMessages((prev) =>
        prev.map((m) =>
          m.id === donationCardMessage.id
            ? {
                ...m,
                cancelled: true,
                content: JSON.stringify({
                type: "donation_request_cancelled",
                donation,
                message: "Donation request cancelled by bakery",
                cancelledBy: "bakery"
              }),
              }
            : m
        )
      );

      const userName = getCurrentUserName();

      await axios.post(
        `${API_URL}/donation/cancel/${donation.id}`,
        {
          charity_id: originalCharityId,
          donated_by: userName,
        },
        opts
      );

      const detail = {
        request_id: donation.id,
        message_id: donationCardMessage.id,
        donation_id: donation.id || donation.id,
        charity_id: originalCharityId,
        cancelledBy: "bakery"  // <-- ADD THIS LINE
      };
      window.dispatchEvent(new CustomEvent("donation_cancelled", { detail })); 

      try {
        await axios.post(
          `${API_URL}/messages/send`,
          {
            sender_id: Number(currentUser.id),
            receiver_id: Number(originalCharityId),
            content: JSON.stringify({
              type: "donation_cancelled",
              donation,
              message: `Your donation request has been cancelled.`,
            }),
          },
          opts
        );
      } catch (err) {
        console.warn("Failed to notify charity", err);
      }
    } catch (err) {
      console.error("Failed to cancel donation:", err?.response?.data || err);
    } finally {
      setDisabledDonations((prev) => {
        const copy = new Set(prev);
        copy.delete(donation.id);
        return copy;
      });
    }
  };

  /* Unified delete */
  const deleteThisMessage = async (id, forEveryone = true) => {
  if (forEveryone) {
    // Delete for everyone - show tombstone
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              deleted_for_all: true,
              content: (() => {
                try {
                  const p =
                    typeof m.content === "string"
                      ? JSON.parse(m.content)
                      : m.content;
                  return JSON.stringify({ ...(p || {}), type: "deleted" });
                } catch {
                  return JSON.stringify({ type: "deleted" });
                }
              })(),
            }
          : m
      )
    );
  } else {
    // Delete for me only - remove from local state
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  try {
    await axios.post(
      `${API_URL}/messages/delete`,
      { id, for_all: forEveryone },
      makeAuthOpts()
    );
    fetchActiveChats();
  } catch (err) {
    console.debug("deleteThisMessage failed:", err?.message || err);
  }
};

  const removePendingDonation = (donationCardMessage) => {
    if (!donationCardMessage) return;
    let donationId;
    try {
      const p = JSON.parse(donationCardMessage.content);
      donationId = p.donation?.id;
    } catch {
      return;
    }
    setRemovedDonations((prev) => new Set(prev).add(donationId));
    setPendingCards((prev) =>
      prev.filter((m) => m.id !== donationCardMessage.id)
    );
  };

  /* ---- Render Helpers ---- */
  const renderMessageBody = (m) => {
    let parsed;

    try {
      if (typeof m.content === "string") {
        try {
          parsed = JSON.parse(m.content);
        } catch {
          parsed = { text: m.content };
        }
      } else {
        parsed = m.content;
      }

      // Deleted/tombstone support
      if (parsed?.type === "deleted" || m.deleted_for_all) {
        return {
          isMedia: false,
          tombstone: true,
          undeletable: true,
          body: (
            <div style={{ fontStyle: "italic" }}>
              <em>Message deleted for everyone</em>
            </div>
          ),
        };
      }

      if (parsed?.type === "donation_card") {
        const d = parsed.donation || {};
        const iAmReceiver = Number(m.receiver_id) === Number(currentUser?.id);

        const inventoryId = d.bakery_inventory_id;
        const requestId = d.id || d.request_id || d.donation_request_id;
        
        const inventoryStatus = inventoryStatuses.get(inventoryId);
        const employeeToken = localStorage.getItem("employeeToken");

        // KEY CHANGE: Check THIS specific request's status
        const thisRequestStatus = inventoryStatus?.request_statuses?.[requestId];
        
        // Hide buttons if THIS request is accepted or canceled
        const thisRequestIsAccepted = thisRequestStatus?.status === "accepted";
        const thisRequestIsCanceled = thisRequestStatus?.status === "canceled";
        const thisRequestIsPending = thisRequestStatus?.status === "pending";
        
        // Show buttons ONLY if:
        // This specific request is still "pending"
        // User is receiver (charity side viewing it)
        // Has employee token (bakery side)
        const shouldShowButtons = thisRequestIsPending && iAmReceiver && employeeToken && inventoryStatus;

        // Get remaining quantity for display
        const remainingQty = inventoryStatus?.remaining_quantity ?? null;
        const isInventoryEmpty = remainingQty !== null && remainingQty <= 0;

        return {
          isMedia: false,
          body: (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Donation Request</div>
              <div style={{ fontSize: 13 }}>
                {d.product_name || d.name || "Baked Goods"} • Requested Qty:{" "}
                {d.quantity ?? "-"}
              </div>

              {/* Show accepted badge for THIS specific request */}
              {thisRequestIsAccepted && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#166534", 
                  fontStyle: "italic",
                  padding: "6px 10px",
                  background: "#dcfce7",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <Check className="w-4 h-4" />
                  <span>
                    ✓ Accepted
                    {thisRequestStatus?.accepted_by && ` by ${thisRequestStatus.accepted_by}`}
                  </span>
                </div>
              )}

              {/* Show cancelled badge for THIS specific request */}
              {thisRequestIsCanceled && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#991b1b", 
                  fontStyle: "italic",
                  padding: "6px 10px",
                  background: "#fee2e2",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <XCircle className="w-4 h-4" />
                  <span>Request Cancelled (Inventory depleted)</span>
                </div>
              )}

              {/* Show available quantity ONLY for pending requests */}
              {thisRequestIsPending && remainingQty !== null && (
                <div style={{ 
                  fontSize: 11, 
                  color: isInventoryEmpty ? "#991b1b" : "#059669",
                  fontWeight: 600,
                  padding: "4px 8px",
                  background: isInventoryEmpty ? "#fee2e2" : "#d1fae5",
                  borderRadius: "6px",
                  border: `1px solid ${isInventoryEmpty ? "#fecaca" : "#6ee7b7"}`
                }}>
                  {isInventoryEmpty 
                    ? "⚠️ No inventory remaining" 
                    : `✓ Available: ${remainingQty} units`}
                </div>
              )}

              {/* Show buttons ONLY for pending requests with available inventory */}
              {shouldShowButtons && !isInventoryEmpty && (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button
                    className="btn-mini accept"
                    onClick={() => acceptDonation(m)}
                    disabled={disabledDonations.has(d.id)}
                  >
                    <Check className="w-4 h-4" /> Accept
                  </button>
                  <button
                    className="btn-mini"
                    onClick={() => cancelDonation(m)}
                    disabled={disabledDonations.has(d.id)}
                  >
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}

              {/* Warning if pending but no inventory */}
              {thisRequestIsPending && isInventoryEmpty && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#92400e",
                  fontStyle: "italic",
                  padding: "6px 10px",
                  background: "#fef3c7",
                  borderRadius: "8px",
                  border: "1px solid #fcd34d"
                }}>
                  ⚠️ This item has been fully donated to others
                </div>
              )}
            </div>
          ),
        };
      }

      if (parsed?.type === "confirmed_donation") {
        const { donation, message } = parsed;
        return {
          isMedia: false,
          body: (
            <div
              className="flex items-center gap-2 p-3 border rounded-2xl bg-green-50"
              style={{ alignItems: "center" }}
            >
              {donation?.image && (
                <img
                  src={`${API_URL}/${donation.image}`}
                  alt={donation.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    objectFit: "cover",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ color: "#166534" }}>
                  {message || "Your donation was accepted!"}
                </strong>
                <span style={{ fontSize: 13, color: "#374151" }}>
                  {donation?.name} • Qty: {donation?.quantity}
                </span>
              </div>
            </div>
          ),
        };
      }

      if (parsed?.type === "donation_unavailable") {
        const { donation, message } = parsed;
        return {
          isMedia: false,
          body: (
            <div
              className="flex items-center gap-2 p-3 border rounded-2xl bg-red-50"
              style={{ alignItems: "center" }}
            >
              {donation?.image && (
                <img
                  src={`${API_URL}/${donation.image}`}
                  alt={donation.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    objectFit: "cover",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ color: "#991b1b" }}>
                  {message || "This donation is no longer available."}
                </strong>
              </div>
            </div>
          ),
        };
      }

      if (parsed?.type === "donation_request_cancelled") {
        const { donation, message, cancelledBy } = parsed;
        const displayMessage = message || (cancelledBy === "bakery" ? "Donation request cancelled by bakery" : "Donation request cancelled");
        return {
          isMedia: false,
          undeletable: true,
          body: (
            <div style={{ fontStyle: "italic", color: "#6b7280" }}>
              <em>{displayMessage}</em>
            </div>
          ),
        };
      }

      if (parsed?.type === "donation_cancelled") {
        const { donation, message } = parsed;
        return {
          isMedia: false,
          body: (
            <div
              className="flex items-center gap-2 p-3 border rounded-2xl bg-red-50"
              style={{ alignItems: "center" }}
            >
              {donation?.image && (
                <img
                  src={`${API_URL}/${donation.image}`}
                  alt={donation.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    objectFit: "cover",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ color: "#991b1b" }}>
                  {message || "Donation request cancelled"}
                </strong>
                <span style={{ fontSize: 13, color: "#374151" }}>
                  {donation?.name} • Qty: {donation?.quantity}
                </span>
              </div>
            </div>
          ),
        };
      }
    } catch (err) {
      console.error("Parse error in renderMessageBody:", err);
    }

    const text = (m.content || "").trim();
    const hasImg =
      Boolean(m.image) || (m.media && m.media_type?.startsWith("image/"));
    const hasVid =
      Boolean(m.video) || (m.media && m.media_type?.startsWith("video/"));
    const hasMedia = hasImg || hasVid;

    if (hasMedia) {
      return {
        isMedia: true,
        body: (
          <>
            <div className="media-wrap">
              {m.image && <img src={fileUrl(m.image)} alt="attachment" />}
              {m.video && <video controls src={fileUrl(m.video)} />}
              {m.media && m.media_type?.startsWith("image/") && (
                <img
                  src={mediaDataURL(m.media_type, m.media)}
                  alt="attachment"
                />
              )}
              {m.media && m.media_type?.startsWith("video/") && (
                <video controls src={mediaDataURL(m.media_type, m.media)} />
              )}
            </div>
            {text && <div className="media-caption">{text}</div>}
          </>
        ),
      };
    }

    return { isMedia: false, body: <div>{text}</div> };
  };

  /* ---- Computed Summaries ---- */
  const summaries = useMemo(() => {
    const map = new Map();
    const me = Number(currentUser?.id);
    for (const m of messages) {
      const fromMe = Number(m.sender_id) === me;
      const peer = fromMe ? Number(m.receiver_id) : Number(m.sender_id);
      if (!peer) continue;
      const entry = map.get(peer) || { last: null, unread: 0 };
      if (!entry.last || new Date(m.timestamp) > new Date(entry.last.timestamp))
        entry.last = m;
      if (!fromMe && Number(m.receiver_id) === me && !m.is_read)
        entry.unread += 1;
      map.set(peer, entry);
    }
    return map;
  }, [messages, currentUser?.id]);

  const totalUnread = useMemo(() => {
    let t = 0;
    for (const [, s] of summaries.entries()) t += Number(s.unread || 0);
    for (const [id, c] of activeChats.entries())
      if (!summaries.has(id)) t += Number(c.unread || 0);
    return t;
  }, [summaries, activeChats]);

  const filteredMessages = useMemo(() => {
    if (!selectedUser || !currentUser) return [];
    return messages.filter(
      (m) =>
        (Number(m.sender_id) === Number(currentUser.id) &&
          Number(m.receiver_id) === Number(selectedUser.id)) ||
        (Number(m.sender_id) === Number(selectedUser.id) &&
          Number(m.receiver_id) === Number(currentUser.id))
    );
  }, [messages, selectedUser, currentUser]);

  const allUsers = useMemo(() => {
    const base = search.trim()
      ? searchResults || []
      : Array.from(activeChats.values() || []);

    // sort by last message timestamp DESC so recent chats are first
    const getTs = (u) => {
      const sum = summaries.get(Number(u.id));
      const last = sum?.last || u.last_message;
      if (!last?.timestamp) return 0;
      return new Date(last.timestamp).getTime() || 0;
    };

    return [...base].sort((a, b) => getTs(b) - getTs(a));
  }, [search, searchResults, activeChats, summaries]);

  const totalChatPages = Math.max(
    1,
    Math.ceil(allUsers.length / CHAT_PAGE_SIZE)
  );
  const safePage = Math.min(chatPage, totalChatPages - 1);
  const pagedUsers = allUsers.slice(
    safePage * CHAT_PAGE_SIZE,
    safePage * CHAT_PAGE_SIZE + CHAT_PAGE_SIZE
  );

  useEffect(() => {
    const handleNotifOpen = () => {
      setOpenList(false);
    };
    window.addEventListener("ui:notifications-open", handleNotifOpen);
    return () =>
      window.removeEventListener("ui:notifications-open", handleNotifOpen);
  }, []);

  /* ---- Effects ---- */
  useEffect(() => {
    fetchRemovedProducts();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchAccepted = async () => {
      try {
        const res = await axios.get(`${API_URL}/donation/accepted`, {
          headers: { Authorization: `Bearer ${currentUser?.token}` },
        });
        const ids = res.data.map((d) => d.donation_id || d.id);
        setAcceptedDonations(new Set(ids));
      } catch (err) {
        console.error("Error fetching accepted donations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccepted();
  }, [currentUser]);

  // UI-only: hide typing tray when dock closes or no active thread
  useEffect(() => {
    if (!openDock || !selectedUser) {
      setRemoteTyping(false);
    }
  }, [openDock, selectedUser]);

  // optional UI hook: trigger these custom events elsewhere to show/hide peer typing UI
  useEffect(() => {
    const onPeerTyping = () => setRemoteTyping(true);
    const onPeerStop = () => setRemoteTyping(false);
    window.addEventListener("messages:remote_typing", onPeerTyping);
    window.addEventListener("messages:remote_stop_typing", onPeerStop);
    return () => {
      window.removeEventListener("messages:remote_typing", onPeerTyping);
      window.removeEventListener("messages:remote_stop_typing", onPeerStop);
    };
  }, [selectedUser]);

  // reset chat page when search / list changes
  useEffect(() => {
    setChatPage(0);
  }, [search, allUsers.length]);

  useEffect(() => {
    const inventoryIds = new Set();

    messages.forEach((m) => {
      try {
        const parsed =
          typeof m.content === "string" ? JSON.parse(m.content) : m.content;
        if (
          parsed?.type === "donation_card" &&
          parsed?.donation?.bakery_inventory_id
        ) {
          inventoryIds.add(parsed.donation.bakery_inventory_id);
        }
      } catch {}
    });

    inventoryIds.forEach((id) => {
      fetchInventoryStatus(id);
    });
  }, [messages]);

  useEffect(() => {
    if (!selectedUser || filteredMessages.length === 0) return;

    const pollInterval = setInterval(() => {
      const inventoryIds = new Set();

      filteredMessages.forEach((m) => {
        try {
          const parsed =
            typeof m.content === "string" ? JSON.parse(m.content) : m.content;
          if (
            parsed?.type === "donation_card" &&
            parsed?.donation?.bakery_inventory_id
          ) {
            inventoryIds.add(parsed.donation.bakery_inventory_id);
          }
        } catch {}
      });

      inventoryIds.forEach((id) => {
        fetchInventoryStatus(id);
      });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedUser, filteredMessages]);

  useEffect(() => {
    const handler = (e) => {
      const wrap = launcherWrapRef.current;
      const drop = dropdownRef.current;
      if (!wrap) return;
      const path = e.composedPath?.() || e.path || [];
      const clickedInside =
        path.includes(wrap) || (drop && path.includes(drop));
      if (!clickedInside) setOpenList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview(null);
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  useEffect(() => {
    if (currentUserProp) return;

    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken;

    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));

      if (decoded.type === "employee") {
        setCurrentUser({
          id: Number(decoded.bakery_id),
          role: "employee",
          email: "",
          name: decoded.employee_name || decoded.name || "",
          token,
          employee_id: Number(decoded.employee_id),
          employee_role: decoded.employee_role,
          bakery_id: Number(decoded.bakery_id),
          is_employee: true,
        });
      } else {
        setCurrentUser({
          id: Number(decoded.sub),
          role: decoded.role?.toLowerCase?.() || decoded.type || "",
          email: decoded.email || "",
          name: decoded.name || "",
          token,
          is_employee: false,
        });
      }
    } catch (err) {
      console.error("Failed to decode token:", err);
    }
  }, [currentUserProp]);

  useEffect(() => {
    const handleCancel = (e) => {
      const donation_id = e.detail?.donation_id;
      const request_id = e.detail?.request_id;
      const cancelledBy = e.detail?.cancelledBy || "bakery"; // <-- GET cancelledBy from event
      if (!donation_id) return;

      setCancelledDonationIds((prev) => new Set(prev).add(donation_id));

      // Find donation cards to update (not delete)
      setMessages((prev) =>
        prev.map((m) => {
          try {
            const parsed = JSON.parse(m.content);
            // Check if this is the donation card that was cancelled
            if (
              parsed?.type === "donation_card" &&
              (parsed?.donation?.id === donation_id || 
              parsed?.donation?.donation_id === donation_id ||
              (request_id && parsed?.donation?.id === request_id))
            ) {
              // Update the message to show cancelled status
              const message = cancelledBy === "bakery" 
                ? "Donation request cancelled by bakery" 
                : "Donation request cancelled";
              
              return {
                ...m,
                cancelled: true,
                content: JSON.stringify({
                  type: "donation_request_cancelled",
                  donation: parsed.donation,
                  message: message,
                  cancelledBy: cancelledBy
                }),
              };
            }
            return m;
          } catch {
            return m;
          }
        })
      );
    };

    window.addEventListener("donation_cancelled", handleCancel);
    return () => window.removeEventListener("donation_cancelled", handleCancel);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    fetchActiveChats();

    if (pollRef.current.activeChats) clearInterval(pollRef.current.activeChats);
    pollRef.current.activeChats = setInterval(fetchActiveChats, 3000);

    if (pollRef.current.history) clearInterval(pollRef.current.history);
    pollRef.current.history = setInterval(() => {
      if (selectedUser) fetchHistoryForPeer(selectedUser.id);
    }, 2000);

    return () => {
      if (pollRef.current.activeChats)
        clearInterval(pollRef.current.activeChats);
      if (pollRef.current.history) clearInterval(pollRef.current.history);
      pollRef.current = { activeChats: null, history: null, inventory: null };
    };
  }, [currentUser, selectedUser]);

  useEffect(() => {
    const h = () => setOpenList(true);
    window.addEventListener("open_messenger", h);
    return () => window.removeEventListener("open_messenger", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      const id = Number(e.detail?.id);
      if (!id) return;
      const peer = activeChats.get(id) || {
        id,
        name: e.detail?.title || "Conversation",
      };
      setSelectedUser(peer);
      setOpenDock(true);
      setOpenList(true);
    };
    window.addEventListener("messages:open", h);
    return () => window.removeEventListener("messages:open", h);
  }, [activeChats]);

  useEffect(() => {
    if (!currentUser) return;
    const h = () => {
      try {
        const raw = localStorage.getItem("open_chat_with");
        if (!raw) return;
        const peer = JSON.parse(raw);
        setOpenList(false);
        setSelectedUser(peer);
        setOpenDock(true);

        const donationRaw = localStorage.getItem("send_donation");
        if (donationRaw) {
          const donation = JSON.parse(donationRaw);
          sendDonationCard(donation, peer);
          localStorage.removeItem("send_donation");
        }
      } catch (e) {
        console.error("open_chat fail", e);
      }
    };
    window.addEventListener("open_chat", h);
    return () => window.removeEventListener("open_chat", h);
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    setActiveChats((prev) => {
      const next = new Map(prev);
      if (next.has(Number(selectedUser.id)))
        next.get(Number(selectedUser.id)).unread = 0;
      return next;
    });

    const opts = makeAuthOpts();
    const notifId = `msg-${selectedUser.id}`;
    axios
      .patch(`${API_URL}/notifications/${notifId}/read`, {}, opts)
      .then(() => window.dispatchEvent(new Event("refresh_notifications")))
      .catch((e) => console.error("notif clear", e));

    fetchHistoryForPeer(selectedUser.id);
  }, [selectedUser, currentUser]);

  useEffect(() => {
    fetchAllDonationStatuses();
  }, [activeChats]);

  useEffect(() => {
    if (!selectedUser?.id || !currentUser?.id) return;
    setMessages((prev) => {
      let changed = false;
      const me = Number(currentUser.id);
      const peer = Number(selectedUser.id);
      const next = prev.map((m) => {
        const inbound =
          Number(m.sender_id) === peer && Number(m.receiver_id) === me;
        if (inbound && !m.is_read) {
          changed = true;
          return { ...m, is_read: true };
        }
        return m;
      });
      return changed ? next : prev;
    });
  }, [selectedUser?.id, currentUser?.id]);

  useEffect(() => {
    if (!selectedUser || !currentUser) {
      setPendingCards([]);
      return;
    }

    const me = Number(currentUser.id);
    const peer = Number(selectedUser.id);

    const cards = messages.filter((m) => {
      try {
        const isInConversation =
          (Number(m.sender_id) === me && Number(m.receiver_id) === peer) ||
          (Number(m.sender_id) === peer && Number(m.receiver_id) === me);

        if (!isInConversation) return false;

        const p =
          typeof m.content === "string" ? JSON.parse(m.content) : m.content;
        const donationId = p?.donation?.id;
        const donation = p?.donation;
        const inventoryId = donation?.bakery_inventory_id;

        const requestInDb = allDonationRequests.find(
          (req) =>
            req.id === donationId ||
            req.donation_id === donationId ||
            req.bakery_inventory_id === inventoryId
        );

        if (
          requestInDb &&
          (requestInDb.status === "canceled" ||
            requestInDb.status === "accepted")
        ) {
          return false;
        }

        const inventoryStatus = inventoryStatuses.get(inventoryId);
        if (inventoryStatus?.has_accepted) {
          return false;
        }

        return (
          p?.type === "donation_card" &&
          !m.accepted &&
          !m.cancelled &&
          !cancelledDonationIds.has(donationId) &&
          !removedDonations.has(donationId) &&
          !acceptedDonations.has(donationId) &&
          !removedProducts.has(inventoryId)
        );
      } catch {
        return false;
      }
    });
    setPendingCards(cards);
  }, [
    messages,
    removedDonations,
    acceptedDonations,
    removedProducts,
    selectedUser,
    currentUser,
    allDonationRequests,
    inventoryStatuses,
    cancelledDonationIds,
  ]);

  useEffect(() => {
    const el = dockScrollRef.current;
    if (!el) return;

    const messageCountChanged =
      filteredMessages.length !== prevMessageCountRef.current;
    prevMessageCountRef.current = filteredMessages.length;

    if (messageCountChanged) {
      const s = () => {
        el.scrollTop = el.scrollHeight;
      };
      s();
      requestAnimationFrame(s);
    }
  }, [filteredMessages, localTyping]);

  useEffect(() => {
    const el = dockScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollButton(!atBottom);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [dockScrollRef, filteredMessages]);

  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    if (newMessage) {
      setLocalTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setLocalTyping(false);
      }, 800);
    } else {
      setLocalTyping(false);
    }
  }, [newMessage, currentUser, selectedUser]);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearch(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(
        `${API_URL}/users/search?q=${encodeURIComponent(q)}`,
        makeAuthOpts()
      );
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.debug("search failed:", err?.message || err);
    }
  };

  useEffect(() => {
    const ta = composeRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [mediaFile, newMessage]);

  /* ---- Render ---- */
  return (
    <>
      <Styles />

      <div className="relative inline-block" ref={launcherWrapRef}>
        <button
          type="button"
          className="icon-btn msg-launcher relative"
          aria-label="Open messages"
          title="Messages"
          onClick={() => {
            setOpenList((prev) => {
              const willOpen = !prev;
              if (willOpen) {
                // 🔔 tell notifications to close
                window.dispatchEvent(new Event("ui:messages-open"));
              }
              return willOpen;
            });
          }}
        >
          <MessageSquareText className="h-[18px] w-[18px] text-black" />
          {totalUnread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[5px] rounded-full
                         text-[10px] font-bold flex items-center justify-center text-white msg-badge"
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>

        {openList && (
          <div className="chatlist-layer" ref={dropdownRef}>
            <div className="chatlist-dropdown">
              <div className="cl-head">
                <div className="cl-title">Chats</div>
                <button
                  type="button"
                  className="cl-close-btn"
                  aria-label="Close chats"
                  onClick={() => setOpenList(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="cl-search">
                <input
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search..."
                />
              </div>

              <div className="cl-list">
                {allUsers.length === 0 ? (
                  <div className="p-4 text-sm text-[#6b4b2b] opacity-80">
                    No conversations.
                  </div>
                ) : (
                  pagedUsers.map((u) => {
                    const sum = summaries.get(Number(u.id));
                    const last = sum?.last || u.last_message;
                    const unread = Number(sum?.unread || u.unread || 0);

                    // prefetch history if snippet would be donation-only and not involved
                    try {
                      const peerIdNum = Number(u.id);
                      const parsedLast =
                        typeof last?.content === "string"
                          ? JSON.parse(last.content)
                          : last?.content || null;
                      const donationTypes = [
                        "donation_card",
                        "confirmed_donation",
                        "donation_unavailable",
                        "donation_cancelled",
                        "donation_request_cancelled",
                      ];
                      const meId = Number(currentUser?.id);
                      const involved =
                        meId &&
                        (Number(last?.sender_id) === meId ||
                          Number(last?.receiver_id) === meId);
                      const hasLocal = messages.some(
                        (m) =>
                          Number(m.sender_id) === peerIdNum ||
                          Number(m.receiver_id) === peerIdNum
                      );
                      if (
                        parsedLast &&
                        donationTypes.includes(parsedLast.type) &&
                        !involved &&
                        !hasLocal
                      ) {
                        if (!renderFetchRef.current.has(peerIdNum)) {
                          renderFetchRef.current.add(peerIdNum);
                          fetchHistoryForPeer(peerIdNum).catch(() =>
                            renderFetchRef.current.delete(peerIdNum)
                          );
                        }
                      }
                    } catch {
                      /* ignore */
                    }

                    // avatar
                    const avatar = u.profile_picture ? (
                      <img
                        src={`${API_URL}/${u.profile_picture}`}
                        alt={u.name || u.email || "avatar"}
                        className="avatar"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div className="avatar fallback">
                        {(u.name || u.email || "#")[0]?.toUpperCase?.() || "?"}
                      </div>
                    );

                    // snippet logic (respects deleted)
                    let snippet = "Start a conversation";
                    if (last) {
                      try {
                        const parsed =
                          typeof last.content === "string"
                            ? JSON.parse(last.content)
                            : last.content || null;

                        const donationTypes = [
                          "donation_card",
                          "confirmed_donation",
                          "donation_unavailable",
                          "donation_cancelled",
                        ];

                        if (
                          parsed?.type === "deleted" ||
                          last.deleted_for_all
                        ) {
                          snippet = "Message deleted";
                        } else if (
                          parsed?.type === "donation_request_cancelled"
                        ) {
                          snippet = "Donation request cancelled";
                        } else if (
                          parsed &&
                          donationTypes.includes(parsed.type)
                        ) {
                          const me = Number(currentUser?.id);
                          const involved =
                            me &&
                            (Number(last.sender_id) === me ||
                              Number(last.receiver_id) === me);

                          if (involved) {
                            snippet =
                              parsed.type === "donation_card"
                                ? "Donation Request"
                                : parsed.type === "confirmed_donation"
                                ? "Donation Request Confirmed"
                                : parsed.type === "donation_request_cancelled"
                                ? "Donation request cancelled"
                                : parsed.message ||
                                  last.content ||
                                  "Donation Update";
                          } else {
                            const meId = Number(currentUser?.id);
                            const peerId = Number(u.id);
                            const convo = messages.filter(
                              (m) =>
                                (Number(m.sender_id) === meId &&
                                  Number(m.receiver_id) === peerId) ||
                                (Number(m.sender_id) === peerId &&
                                  Number(m.receiver_id) === meId)
                            );

                            let found = false;
                            for (let i = convo.length - 1; i >= 0; i--) {
                              const pm = convo[i];
                              try {
                                const p =
                                  typeof pm.content === "string"
                                    ? JSON.parse(pm.content)
                                    : pm.content || null;
                                if (!p || !donationTypes.includes(p.type)) {
                                  if (pm.content) {
                                    snippet = String(pm.content);
                                    found = true;
                                    break;
                                  } else if (pm.image) {
                                    snippet = "Photo";
                                    found = true;
                                    break;
                                  } else if (pm.video) {
                                    snippet = "Video";
                                    found = true;
                                    break;
                                  }
                                }
                              } catch {
                                if (pm.content) {
                                  snippet = String(pm.content);
                                  found = true;
                                  break;
                                }
                              }
                            }

                            if (!found) {
                              const lastDonationMessage = convo
                                .slice()
                                .reverse()
                                .find((pm) => {
                                  try {
                                    const parsedPm =
                                      typeof pm.content === "string"
                                        ? JSON.parse(pm.content)
                                        : pm.content;
                                    return (
                                      parsedPm &&
                                      donationTypes.includes(parsedPm.type)
                                    );
                                  } catch {
                                    return false;
                                  }
                                });

                              if (lastDonationMessage) {
                                try {
                                  const parsed2 = JSON.parse(
                                    lastDonationMessage.content
                                  );
                                  snippet =
                                    parsed2.type === "donation_card"
                                      ? "Donation Request"
                                      : parsed2.type === "confirmed_donation"
                                      ? "Donation Request Confirmed"
                                      : parsed2.message || "Donation Update";
                                } catch {
                                  snippet = "Start a conversation";
                                }
                              } else {
                                snippet = "Start a conversation";
                              }
                            }
                          }
                        } else {
                          snippet =
                            last.content ||
                            (last.image
                              ? "Photo"
                              : last.video
                              ? "Video"
                              : "Start a conversation");
                        }
                      } catch {
                        snippet = last?.content || "Start a conversation";
                      }
                    }

                    return (
                      <div
                        key={u.id}
                        className="cl-row"
                        onClick={() => {
                          setSelectedUser(u);
                          setOpenDock(true);
                          setOpenList(false);
                        }}
                      >
                        {avatar}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-6">
                            <div className="name truncate">
                              {u.name || u.email || `Conversation #${u.id}`}
                            </div>
                            {last?.timestamp && (
                              <div className="time shrink-0">
                                {formatTime(last.timestamp)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="snippet truncate">{snippet}</div>
                            {unread > 0 && <span className="dot" />}
                          </div>
                        </div>
                        <ChevronRight
                          className="w-4 h-4"
                          style={{ color: "#8b6b48" }}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="cl-foot">
                <div className="text-center text-[11px] text-[#8a5a25] mb-1">
                  Page {safePage + 1} of {totalChatPages}
                </div>

                <div className="page-nav">
                  <button
                    className="page-btn"
                    disabled={safePage === 0}
                    onClick={() => setChatPage((p) => (p > 0 ? p - 1 : 0))}
                  >
                    Prev
                  </button>

                  <button
                    className="page-btn"
                    disabled={safePage >= totalChatPages - 1}
                    onClick={() =>
                      setChatPage((p) => (p < totalChatPages - 1 ? p + 1 : p))
                    }
                  >
                    Next {safePage < totalChatPages - 1 ? "(older)" : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {openDock &&
        selectedUser &&
        createPortal(
          <div className="dock-root">
            <div className="dock">
              <div className="dock-head">
                {selectedUser.profile_picture ? (
                  <img
                    src={`${API_URL}/${selectedUser.profile_picture}`}
                    className="avatar-sm"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div className="avatar-sm">
                    {(selectedUser.name ||
                      selectedUser.email ||
                      "#")[0]?.toUpperCase?.() || "?"}
                  </div>
                )}
                <div className="dock-title truncate">
                  {selectedUser.name ||
                    selectedUser.email ||
                    `#${selectedUser.id}`}
                </div>
                <div className="dock-actions">
                  <button
                    className="icon-btn"
                    onClick={() => setOpenDock(false)}
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {pendingCards.length > 0 && (
                <div className="pending-bar">
                  <button
                    className="pending-toggle"
                    onClick={() => setPendingOpen((v) => !v)}
                  >
                    Pending donations ({pendingCards.length})
                  </button>
                </div>
              )}
              {pendingOpen && pendingCards.length > 0 && (
                <div className="pending-list">
                  {pendingCards.map((card) => {
                    let d = {};
                    try {
                      d = JSON.parse(card.content).donation || {};
                    } catch {}
                    const iAmReceiver =
                      Number(card.receiver_id) === Number(currentUser?.id);
                    const employeeToken = localStorage.getItem("employeeToken");

                    return (
                      <div key={`pend-${card.id}`} className="pend-row">
                        <div className="pend-meta">
                          <div className="pend-title">
                            {d.product_name || d.name || "Donation"}
                          </div>
                          <div className="pend-sub">
                            Qty: {d.quantity ?? "-"}
                          </div>
                        </div>
                        <div className="pend-actions">
                          <button
                            className="btn-mini"
                            onClick={() => {
                              jumpTo(card.id);
                              setPendingOpen(false);
                            }}
                          >
                            Open
                          </button>
                          {iAmReceiver && employeeToken && (
                            <>
                              <button
                                className="btn-mini accept"
                                onClick={() => {
                                  acceptDonation(card);
                                  setPendingOpen(false);
                                }}
                                disabled={disabledDonations.has(d.id)}
                              >
                                <Check className="w-4 h-4" /> Accept
                              </button>
                              <button
                                className="btn-mini"
                                onClick={() => {
                                  cancelDonation(card);
                                  setPendingOpen(false);
                                }}
                                disabled={disabledDonations.has(d.id)}
                              >
                                <XCircle className="w-4 h-4" /> Cancel
                              </button>

                              <button
                                className="btn-mini"
                                onClick={() => removePendingDonation(card)}
                              >
                                X
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div ref={dockScrollRef} className="dock-scroll">
                {filteredMessages.map((m, i) => {
                  const me = Number(m.sender_id) === Number(currentUser?.id);
                  const render = renderMessageBody(m);

                  // === Day separator: show when the day changes (Asia/Manila) ===
                  const prev = filteredMessages[i - 1];
                  const shouldShowDaySep =
                    !prev || !sameDay(prev?.timestamp, m.timestamp);

                  return (
                    <React.Fragment key={`${m.id}-${m.timestamp ?? ""}`}>
                      {shouldShowDaySep && (
                        <div className="day-sep">
                          <span>{formatDayLabel(m.timestamp)}</span>
                        </div>
                      )}

                      <div
                        ref={setMsgRef(m.id)}
                        className={`msg-row ${me ? "right" : "left"}`}
                      >
                        {me && !render.undeletable && (
                          <div className="left-controls">
                            <button
                              className="icon-btn-tiny"
                              title="More"
                              aria-label="More"
                              onClick={() =>
                                setMenuOpenId(menuOpenId === m.id ? null : m.id)
                              }
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>

                            {menuOpenId === m.id && (
                              <div className="ctx-menu">
                                <button
                                  className="ctx-item"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    deleteThisMessage(m.id, true); // for everyone
                                  }}
                                >
                                  Delete for everyone
                                </button>
                                <button
                                  className="ctx-item"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    deleteThisMessage(m.id, false); // for me only
                                  }}
                                >
                                  Delete for me
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className={`bubble ${me ? "me" : "them"} ${
                            render.isMedia ? "media-card" : ""
                          } ${render.tombstone ? "tombstone" : ""}`}
                        >
                          {render.body}

                          <div className="meta">
                            <div className="btime">
                              {formatTime(m.timestamp)}
                            </div>
                            {me && (
                              <div
                                className={`readmark ${
                                  m.is_read ? "read" : "sent"
                                }`}
                              >
                                {m.is_read ? "✓✓" : "✓"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {showScrollButton && (
                  <button
                    className="scroll-btn"
                    onClick={() => {
                      const el = dockScrollRef.current;
                      if (el)
                        el.scrollTo({
                          top: el.scrollHeight,
                          behavior: "smooth",
                        });
                    }}
                  >
                    ↓
                  </button>
                )}
              </div>

              {(localTyping || remoteTyping) &&
                filteredMessages.length > 0 &&
                openDock &&
                selectedUser && (
                  <div className="typing-tray">
                    <span className="typing-dot" />
                    <span className="typing-text truncate">
                      {remoteTyping
                        ? `${selectedUser.name || "They"} are typing…`
                        : "You are typing…"}
                    </span>
                  </div>
                )}

              <div className="dock-compose">
                <label
                  title="Attach image/video"
                  className="attach-btn"
                  style={{ borderRadius: 9999 }}
                >
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setMediaFile(f);
                    }}
                  />
                </label>

                <div
                  className={`compose-group${mediaFile ? " has-attach" : ""}`}
                >
                  {mediaFile && (
                    <span
                      className="attach-chip"
                      title={`${mediaFile.type || "file"} • ${formatBytes(
                        mediaFile.size
                      )}`}
                    >
                      <span className="thumb">
                        {mediaPreview ? (
                          mediaFile.type?.startsWith("image/") ? (
                            <img src={mediaPreview} alt="" />
                          ) : mediaFile.type?.startsWith("video/") ? (
                            <VideoIcon className="w-4 h-4" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )
                        ) : null}
                      </span>
                      <span className="name">{mediaFile.name}</span>
                      <button
                        className="remove-attach"
                        onClick={() => setMediaFile(null)}
                        aria-label="Remove attachment"
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  <textarea
                    ref={composeRef}
                    className="compose-input"
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={
                      mediaFile
                        ? mediaFile.type?.startsWith("image/")
                          ? "Add a caption for your image…"
                          : mediaFile.type?.startsWith("video/")
                          ? "Add a caption for your video…"
                          : "Add a caption for your file…"
                        : "Type a message…"
                    }
                  />
                </div>

                <button className="dock-send" onClick={sendMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}