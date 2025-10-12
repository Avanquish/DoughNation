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
const API_URL = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

const fileUrl = (path) => {
  if (!path) return "";
  const clean = String(path).replace(/^\//, "");
  return `${API_URL}/${clean}`;
};
const mediaDataURL = (type, base64) =>
  type && base64 ? `data:${type};base64,${base64}` : "";

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
};
const formatBytes = (bytes) => {
  try {
    if (bytes == null) return "";
    const k = 1024,
      u = ["KB", "MB", "GB", "TB"];
    let i = -1;
    if (Math.abs(bytes) < k) return bytes + " B";
    do {
      bytes /= k;
      i++;
    } while (Math.abs(bytes) >= k && i < u.length - 1);
    return bytes.toFixed(1) + " " + u[i];
  } catch {
    return "";
  }
};

/* ==== Theme ==== */
const Styles = () => (
  <style>{`
    :root{
      --ink:#7a4f1c;
      --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
      --cream:#fff9f0; --line:rgba(0,0,0,.08);
    }

    /* Launcher */
    .icon-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;border:1px solid rgba(0,0,0,.08);background:#fff;color:var(--ink)}
    .icon-btn:hover{background:#fff4e6}

    /* Amber gradient badge — aligns with CharityNotification */
    .msg-badge{
      background: linear-gradient(90deg, var(--brand2), var(--brand3));
      border: 1px solid rgba(255,255,255,.65);
      box-shadow: 0 6px 16px rgba(201,124,44,.35);
    }

    .badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9999px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#fff;background:#ef4444}

    /* Subtle hover for the Messages launcher (no color changes) */
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

    /* Chat list dropdown */
    .chatlist-dropdown{
      width:360px; max-width:92vw; height:540px; max-height:calc(100vh - 96px);
      background:#fff; border:1px solid var(--line); border-radius:12px; box-shadow:0 18px 40px rgba(0,0,0,.18);
      transform:translateY(-6px); opacity:0; animation:clpop .16s ease forwards;
      display:flex; flex-direction:column; overflow:hidden;
    }
    @keyframes clpop{to{transform:translateY(0); opacity:1}}

    .cl-head{display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--line); background:var(--cream)}
    .cl-title{font-weight:800; font-size:18px; flex:1; color:var(--ink)}
    .cl-icon{display:inline-flex; width:28px; height:28px; align-items:center; justify-content:center; border:1px solid var(--line); border-radius:8px; background:#fff; color:#7a4f1c}
    .cl-icon:hover{background:#fff4e6}
    .cl-search{padding:10px 12px; border-bottom:1px solid var(--line)}
    .cl-search input{width:100%; border:1px solid #f2d4b5; background:#fff; padding:10px 12px; border-radius:9999px; outline:none}
    .cl-search input:focus{box-shadow:0 0 0 2px #E49A5233}

    .cl-list{flex:1; min-height:0; overflow:auto}
    .cl-row{padding:10px 12px; display:flex; gap:10px; align-items:flex-start; cursor:pointer}
    .cl-row:hover{background:#fff8e6}
    .avatar{width:42px; height:42px; border-radius:9999px; overflow:hidden; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-weight:800}
    .avatar.fallback{background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#7a4f1c; border:1px solid #fff3e0}
    .name{font-weight:700; color:var(--ink)}
    .snippet{font-size:13px; color:#6b4b2b; opacity:.8}
    .dot{width:8px; height:8px; border-radius:9999px; background:var(--brand2)}
    .time{font-size:12px; color:#8b6b48}
    .cl-foot{padding:10px 12px; border-top:1px solid var(--line); display:flex; justify-content:center}

    /* Dock / conversation */
    .dock-root{position:fixed; right:16px; bottom:16px; z-index:2100; pointer-events:none}
    .dock{
      width:380px; max-width:92vw; height:520px; max-height:calc(100vh - 64px);
      background:#fff; border:1px solid var(--line); border-radius:14px; box-shadow:0 18px 40px rgba(0,0,0,.18);
      display:flex; flex-direction:column; overflow:hidden; pointer-events:auto;
      transform:translateY(8px); opacity:0; animation:dock .18s ease forwards;
    }
    @keyframes dock{to{transform:translateY(0); opacity:1}}
    .dock-head{display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid var(--line);
      background:linear-gradient(110deg,#ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%)}
    .avatar-sm{width:28px; height:28px; border-radius:9999px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-weight:800; background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#7a4f1c; border:1px solid #fff3e0}
    .dock-title{font-weight:800; line-height:1.1; flex:1; min-width:0; color:var(--ink)}

    .pending-bar{display:flex; align-items:center; gap:8px; padding:6px 10px; background:#fffef9; border-bottom:1px solid #f4e4cf}
    .pending-toggle{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:9999px; border:1px solid #f1d9b8; background:#fff; font-weight:700; color:#7a4f1c}
    .pending-list{padding:8px 10px; background:#fffdf6; border-bottom:1px solid #f4e4cf}
    .pend-row{display:flex; align-items:center; gap:10px; padding:6px 0}
    .pend-meta{flex:1; min-width:0}
    .pend-title{font-weight:700; color:#6b4b2b}
    .pend-sub{font-size:12px; color:#7a4f1c; opacity:.9}
    .pend-actions{display:flex; gap:6px}
    .btn-mini{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:10px; border:1px solid #f2d4b5; background:#fff}
    .btn-mini.accept{background:linear-gradient(90deg,var(--brand1),var(--brand2)); color:#fff; border-color:transparent}

    .dock-scroll{flex:1; overflow:auto; padding:16px; background:#fff7ec}

    /* Message row and left controls */
    .msg-row{display:flex; align-items:center; gap:2px; margin:6px 0}
    .msg-row.right{justify-content:flex-end}
    .left-controls{position:relative; align-self:center}
    .icon-btn-tiny{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;border:1px solid var(--line);background:#fff;color:#7a4f1c}
    .icon-btn-tiny:hover{background:#fff4e6}

    /* Bubbles */
    .bubble{
      max-width:75%; padding:12px; border-radius:14px; word-break:break-word; overflow-wrap:anywhere;
      box-shadow:0 1px 0 rgba(0,0,0,.04); position:relative; border:0;
    }
    .bubble.me{ background:#FFE7C5; color:#4a2f17; border:1px solid #f4d9bf; }
    .bubble.them{ background:#fff; color:#4a2f17; margin-right:auto; border:1px solid #f2d4b5; }

    /* Media captions match sender text (dark brown) */
    .media-wrap{border-radius:12px; overflow:hidden}
    .media-wrap img, .media-wrap video{display:block;width:100%;height:auto;max-height:420px}
    .bubble.me .media-caption,
    .bubble.me .media-caption a,
    .bubble.me .media-caption strong,
    .bubble.me .media-caption em{ color:#4a2f17; }
    .media-caption{ display:block; margin-top:10px; background:transparent; border:0; color:inherit; line-height:1.25; max-width:100%; }

    /* Context menu */
    .ctx-menu{position:absolute; min-width:160px; background:#fff; border:1px solid rgba(0,0,0,.1); box-shadow:0 12px 28px rgba(0,0,0,.16); border-radius:8px; overflow:hidden; z-index:30}
    .left-controls .ctx-menu{ top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    .ctx-item{display:block; width:100%; text-align:left; padding:10px 12px; font-size:13px; color:#4a2f17; background:#fff; cursor:pointer}
    .ctx-item:hover, .ctx-item:focus-visible{background:#ffe7c5}

    .meta{display:flex; align-items:center; gap:6px; justify-content:flex-end; margin-top:6px}
    .btime{font-size:11px; opacity:.75; color:#3d2a16}
    .readmark{font-size:11px; opacity:.65; color:#3d2a16}
    .readmark.sent{opacity:.55}
    .readmark.read{opacity:1; color:#000}

    /* Composer (colors unchanged) */
    .dock-compose{display:flex; gap:8px; padding:8px; border-top:1px solid var(--line); background:#fff; align-items:center;}
    .compose-group{flex:1 1 auto; display:flex; align-items:flex-start; gap:8px; border:1px solid #f2d4b5; background:#fff; border-radius:20px; padding:10px 14px; overflow:hidden; min-width:0; flex-wrap:wrap; box-shadow:0 1px 0 rgba(0,0,0,.03)}
    .attach-btn{display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9999px; border:1px solid #f2d4b5; background:transparent; flex:0 0 auto;  align-self: center;}
    .attach-btn:hover{background:#fff7ec}
    .attach-chip{flex:0 1 55%; min-width:0; display:inline-flex; align-items:center; gap:6px; height:30px; padding:2px 10px; border-radius:9999px; background:#fff7ec; border:1px solid #f4d9bf; font-size:12px; color:#6b4b2b; box-shadow:inset 0 0 0 1px #fff}
    .attach-chip .thumb{width:20px; height:20px; border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #f1d6b7; background:#fff}
    .attach-chip .thumb img{width:100%; height:100%; object-fit:cover; border-radius:6px}
    .attach-chip .name{flex:1 1 auto; min-width:0; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600}
    .attach-chip .remove-attach{margin-left:2px; display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:9999px; background:transparent; border:0}
    .attach-chip .remove-attach:hover{background:#ffe7c5}

    /* Text input styles (multiline) */
    .compose-input{flex:1 1 auto; border:0; outline:none; background:transparent; color:#4a2f17; min-width:0; width:0; font-size:16px; line-height:1.4; padding:4px 0 6px; min-height:24px; max-height:140px; overflow-y:auto; resize:none;}
    .compose-input::placeholder,
    .compose-input::-webkit-input-placeholder,
    .compose-input::-moz-placeholder,
    .compose-input:-ms-input-placeholder{ color:#4a2f17; opacity:1; }

    .compose-group.has-attach .attach-chip{ margin-right:8px; }
    .compose-group.has-attach .compose-input{ flex:1 0 180px; }

    .dock-send{flex:0 0 auto; border-radius:9999px; padding:10px 16px; color:#fff; background:linear-gradient(90deg, var(--brand1), var(--brand2), var(--brand3)); box-shadow:0 6px 16px rgba(201,124,44,.22)}

    .scroll-btn{position:absolute; right:12px; bottom:70px; background:#ffffff; border:1px solid rgba(0,0,0,.08); border-radius:9999px; padding:6px 10px; font-weight:800; color:#7a4f1c; box-shadow:0 8px 18px rgba(0,0,0,.12)}
  `}</style>
);

/* ==== Component ==== */
export default function Messages({ currentUser: currentUserProp }) {
  /* UI */
  const [openList, setOpenList] = useState(false);
  const [openDock, setOpenDock] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  /* Data */
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

  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_messages")) || [];
    } catch {
      return [];
    }
  });
  const [activeChats, setActiveChats] = useState(() => {
    try {
      const raw = localStorage.getItem("active_chats");
      return raw
        ? new Map(
            Object.entries(JSON.parse(raw)).map(([k, v]) => [Number(k), v])
          )
        : new Map();
    } catch {
      return new Map();
    }
  });
  
  const [removedDonations, setRemovedDonations] = useState(() => {
  try {
    return new Set(JSON.parse(localStorage.getItem("removed_donations")) || []);
  } catch {
    return new Set();
  }
});

// Persist
useEffect(() => {
  localStorage.setItem("removed_donations", JSON.stringify([...removedDonations]));
}, [removedDonations]);

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
  setPendingCards((prev) => prev.filter((m) => m.id !== donationCardMessage.id));
};

  const [currentUser, setCurrentUser] = useState(currentUserProp || null);
  const [peerTyping, setPeerTyping] = useState(false);

  /* Refs */
  const wsRef = useRef(null);
  const dockScrollRef = useRef(null);
  const typingTimer = useRef(null);
  const messageRefs = useRef(new Map());
  const launcherWrapRef = useRef(null);
  const dropdownRef = useRef(null);
  const composeRef = useRef(null); // textarea in composer

  const setMsgRef = (id) => (el) => {
    if (el) messageRefs.current.set(id, el);
    else messageRefs.current.delete(id);
  };
  const jumpTo = (id) => {
    const el = messageRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const fetchAllDonationStatuses = async () => {
  try {
    const token = localStorage.getItem("token");
    const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    // Fetch all accepted + pending for the bakery
    const [acceptedRes, pendingRes] = await Promise.all([
      axios.get(`${API_URL}/donation/accepted`, opts),
      axios.get(`${API_URL}/donation/my_requests`, opts),
    ]);

    // Combine both accepted + pending
    const combined = [...acceptedRes.data, ...pendingRes.data];
    setAllDonationRequests(combined);

    // Track all inventory IDs that are accepted OR canceled
    const takenIds = new Set(
      combined
        .filter(d => d.status === "accepted" || d.status === "canceled")
        .map(d => d.bakery_inventory_id)
    );

    setAcceptedDonations(takenIds);

  } catch (err) {
    console.error("Error fetching donation statuses:", err);
  }
};

  const fetchRemovedProducts = async () => {
  try {
    const token = localStorage.getItem("token");
    const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const res = await axios.get(`${API_URL}/donation/accepted`, opts);

    // We’ll use bakery_inventory_id — represents the same product across all requests
    const removed = new Set(res.data.map(r => r.bakery_inventory_id));

    setRemovedProducts(removed);
  } catch (err) {
    console.error("Error fetching accepted donations:", err);
  }
};

// Fetch once on mount
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

  
  /* Close dropdown when clicking outside */
 useEffect(() => {
  const handler = (e) => {
    const wrap = launcherWrapRef.current;
    const drop = dropdownRef.current;
    if (!wrap) return;

    const path = e.composedPath?.() || (e.path || []);
    const clickedInside = path.includes(wrap) || (drop && path.includes(drop));

    if (!clickedInside) setOpenList(false);
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);

  /* Media preview */
  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview(null);
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  /* Decode current user if not provided */
  useEffect(() => {
    if (currentUserProp) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setCurrentUser({
        id: Number(decoded.sub),
        role: decoded.role?.toLowerCase?.() || "",
        email: decoded.email || "",
        name: decoded.name || "",
      });
    } catch (err) {
      console.error("Failed to decode token:", err);
    }
  }, [currentUserProp]);

  /* Persist */
  useEffect(() => {
    try {
      localStorage.setItem("chat_messages", JSON.stringify(messages));
    } catch {}
  }, [messages]);
  useEffect(() => {
    try {
      const obj = {};
      for (const [k, v] of activeChats.entries()) obj[k] = v;
      localStorage.setItem("active_chats", JSON.stringify(obj));
    } catch {}
  }, [activeChats]);

  /* Summaries */
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
  useEffect(() => {
    try {
      localStorage.setItem("messages_unread_total", String(totalUnread));
    } catch {}
  }, [totalUnread]);

  // To cancel send request donation cards if click cancel request
  useEffect(() => {
  const handleCancel = (e) => {
    const donation_id = e.detail?.donation_id;
    if (!donation_id) return;

    // Find all messages with this donation card
    const cardsToDelete = messages.filter(m => {
      try {
        const parsed = JSON.parse(m.content);
        return parsed?.donation?.id === donation_id && parsed.type === "donation_card";
      } catch {
        return false;
      }
    });

    // Delete each card
    cardsToDelete.forEach(m => deleteMessage(m.id));
  };

  window.addEventListener("donation_cancelled", handleCancel);
  return () => window.removeEventListener("donation_cancelled", handleCancel);
}, [messages]);



  /* WebSocket */
  useEffect(() => {
     console.log("[WS-DEBUG] useEffect triggered");
     console.log("[WS-DEBUG] currentUser:", currentUser);
     console.log("[WS-DEBUG] currentUser.id:", currentUser?.id);

    if (!currentUser || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) return;
    let reconnectTimerId;

    const connectWS = () => {
      const ws = new WebSocket(
        `${API_URL.replace(/^http/, "ws")}/ws/messages/${currentUser.id}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "get_active_chats" }));
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          switch (data.type) {
            case "message": {
              const m = {
                id: Number(data.id),
                sender_id: Number(data.sender_id),
                receiver_id: Number(data.receiver_id),
                content: data.content,
                image: data.image,
                video: data.video,
                media: data.media,
                media_type: data.media_type,
                timestamp: data.timestamp,
                is_read: data.is_read,
              };
              setMessages((p) => [...p, m]);

              try {
                const parsed = JSON.parse(data.content);
                if (
                  parsed.type === "confirmed_donation" &&
                  currentUser.role === "charity" &&
                  Number(data.receiver_id) === currentUser.id
                ) {
                  const key = `received_donations_${currentUser.id}`;
                  const raw = localStorage.getItem(key);
                  const existing = raw ? JSON.parse(raw) : [];
                  if (!existing.some((d) => d.id === parsed.donation.id)) {
                    const upd = [...existing, parsed.donation];
                    localStorage.setItem(key, JSON.stringify(upd));
                    window.dispatchEvent(new Event("received_donations_updated"));
                  }
                }
              } catch {}
              break;
            }
            case "delete_message":
              setMessages((p) => p.filter((m) => m.id !== data.id));
              break;
            case "donation_accepted":
              setMessages((p) =>
                p.map((m) => (m.id === data.id ? { ...m, accepted: true } : m))
              );
              break;
            case "donation_cancelled":
              setMessages((p) =>
                p.filter((m) => {
                  try {
                    const parsed = JSON.parse(m.content);
                    return !(
                      parsed?.donation?.id === data.donation_id &&
                      parsed.type === "donation_card"
                    );
                  } catch {
                    return true;
                  }
                })
              );
              break;
            case "history": {
              const incoming = (data.messages || []).map((m) => ({
                ...m,
                id: Number(m.id),
                sender_id: Number(m.sender_id),
                receiver_id: Number(m.receiver_id),
              }));

              // merge with localStorage copy
              try {
                const local = JSON.parse(localStorage.getItem("chat_messages")) || [];
                const merged = incoming.map((msg) => {
                  const localMatch = local.find((lm) => lm.id === msg.id);
                  return localMatch ? { ...msg, ...localMatch } : msg;
                });
                setMessages(merged);
              } catch {
                setMessages(incoming);
              }
              break;
            }

            case "active_chats": {
              const map = new Map();
              for (const c of data.chats || []) {
                if (c.peer)
                  map.set(Number(c.peer.id), {
                    ...c.peer,
                    ...c,
                    unread: c.unread || 0,
                  });
              }
              setActiveChats(map);
              break;
            }
            case "active_chats_update":
              setActiveChats((prev) => {
                const next = new Map(prev);
                if (data.chat?.peer) {
                  const id = Number(data.chat.peer.id);
                  const prevChat = next.get(id) || {};
                  next.set(id, {
                    ...prevChat,
                    ...data.chat.peer,
                    ...data.chat,
                    unread: prevChat.unread || 0,
                  });
                }
                return next;
              });
              break;
            case "typing":
              if (Number(data.sender_id) !== Number(currentUser.id))
                setPeerTyping(true);
              break;
            case "stop_typing":
              if (Number(data.sender_id) !== Number(currentUser.id))
                setPeerTyping(false);
              break;
            case "search_results":
              setSearchResults(data.results || []);
              break;
            default:
              console.warn("Unknown WS type", data.type);
          }
        } catch (e) {
          console.error("WS parse", e);
        }
      };

      ws.onclose = () => {
        reconnectTimerId = setTimeout(connectWS, 2000);
      };
    };

    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerId) clearTimeout(reconnectTimerId);
    };
  }, [currentUser]);

  /* External openers */
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
        if (donationRaw && wsRef.current?.readyState === WebSocket.OPEN) {
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
  

  /* Selecting a peer */
  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    setActiveChats((prev) => {
      const next = new Map(prev);
      if (next.has(Number(selectedUser.id)))
        next.get(Number(selectedUser.id)).unread = 0;
      return next;
    });

    const token = localStorage.getItem("token");
    const opts = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : { withCredentials: true };
    const notifId = `msg-${selectedUser.id}`;
    axios
      .patch(`${API_URL}/notifications/${notifId}/read`, {}, opts)
      .then(() => window.dispatchEvent(new Event("refresh_notifications")))
      .catch((e) => console.error("notif clear", e));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "get_history",
          peer_id: Number(selectedUser.id),
        })
      );
    }
  }, [selectedUser, currentUser]);

  useEffect(() => {
  fetchAllDonationStatuses();
}, [activeChats]);

  /* Mark inbound messages as read */
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

  /* Derived */
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

  /* Track pending donation cards */
  useEffect(() => {
  const cards = messages.filter((m) => {
    try {
      const p =
        typeof m.content === "string" ? JSON.parse(m.content) : m.content;
      const donationId = p?.donation?.id;
      const donation = p?.donation;
      const inventoryId = donation?.bakery_inventory_id;

      return p?.type === "donation_card" && !m.accepted && !removedDonations.has(donationId) && !acceptedDonations.has(donationId) &&  !removedProducts.has(inventoryId);
    } catch {
      return false;
    }
  });
  setPendingCards(cards);
}, [messages, removedDonations, acceptedDonations, removedProducts]);


  /* Scroll handling */
  useEffect(() => {
    const el = dockScrollRef.current;
    if (!el) return;
    const s = () => { el.scrollTop = el.scrollHeight; };
    s(); requestAnimationFrame(s);
  }, [filteredMessages, peerTyping]);
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

  /* Typing */
  const [newMessage, setNewMessage] = useState("");
  useEffect(() => {
    if (!wsRef.current || !selectedUser || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!currentUser) return;
    if (newMessage) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        sender_id: Number(currentUser.id),
        receiver_id: Number(selectedUser.id),
      }));
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      wsRef.current?.send(JSON.stringify({
        type: "stop_typing",
        sender_id: Number(currentUser.id),
        receiver_id: Number(selectedUser.id),
      }));
    }, 800);
  }, [newMessage, currentUser, selectedUser]);

  /* Search */
  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    if (wsRef.current?.readyState === WebSocket.OPEN && currentUser) {
      wsRef.current.send(JSON.stringify({
        type: "search",
        target: "users",
        query: q,
      }));
    }
  };

  const allUsers = useMemo(
    () => (search.trim() ? searchResults || [] : Array.from(activeChats.values())),
    [search, searchResults, activeChats]
  );
  const sidebarUsers = allUsers;

  /* Actions */
  const sendMessage = () => {
    if (!newMessage.trim() && !mediaFile) return;
    if (!selectedUser || !currentUser) return;

    const msg = {
      type: "message",
      sender_id: Number(currentUser.id),
      receiver_id: Number(selectedUser.id),
    };

    if (mediaFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const mediaData = reader.result.split(",")[1];
        msg.media = mediaData;
        msg.media_type = mediaFile.type;
        msg.content = newMessage.trim() || "";
        if (wsRef.current?.readyState === WebSocket.OPEN)
          wsRef.current.send(JSON.stringify(msg));
        setNewMessage("");
        setMediaFile(null);
      };
      reader.readAsDataURL(mediaFile);
    } else {
      msg.content = newMessage.trim();
      if (wsRef.current?.readyState === WebSocket.OPEN)
        wsRef.current.send(JSON.stringify(msg));
      setNewMessage("");
    }
  };

  const sendDonationCard = (donation, peer = selectedUser) => {
    if (!peer || !currentUser) return;
    const msg = {
      type: "message",
      sender_id: Number(currentUser.id),
      receiver_id: Number(peer.id),
      content: JSON.stringify({
        type: "donation_card",
        donation,
        originalCharityId: Number(currentUser.id),
      }),
    };
    wsRef.current?.send(JSON.stringify(msg));
    if (currentUser.role === "charity") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender_id: Number(currentUser.id),
          receiver_id: Number(peer.id),
          content: msg.content,
          timestamp: new Date().toISOString(),
          is_read: false,
        },
      ]);
    }
  };
 
  // Accept donation requested by charity 
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

  // Disable the buttons immediately
  setDisabledDonations(prev => new Set(prev).add(donation.id));

  try {
    const token = localStorage.getItem("token");
    const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    setAcceptedDonations(prev => new Set([...prev, donation.id]));

    setMessages(prev =>
      prev.map(m =>
        m.id === donationCardMessage.id ? { ...m, accepted: true } : m
      )
    );

    //  Tell backend that this donation is accepted
    const res = await axios.post(`${API_URL}/donation/accept/${donation.id}`,
    { charity_id: originalCharityId }, opts);
    const { accepted_charity_id, canceled_charities, donation_name } = res.data;
    
    // Refresh all donation statuses from backend (accepted + canceled)
    await fetchAllDonationStatuses();
    await fetchRemovedProducts();

    // Send WebSocket confirmation to accepted charity
    if (wsRef.current && accepted_charity_id) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          sender_id: Number(currentUser.id),
          receiver_id: Number(accepted_charity_id),
          content: JSON.stringify({
            type: "confirmed_donation",
            donation,
            message: `Your request for ${donation_name} was accepted! 🎉`,
          }),
        })
      );
    }

    // Notify canceled charities that donation is no longer available
    if (wsRef.current && canceled_charities?.length > 0) {
      canceled_charities.forEach(cid => {
        wsRef.current.send(
          JSON.stringify({
            type: "message",
            sender_id: Number(currentUser.id),
            receiver_id: Number(cid),
            content: JSON.stringify({
              type: "donation_unavailable",
              donation,
              message: `Sorry ${donation_name} has already been donated to other charity.`,
            }),
          })
        );
      });
    }

    toast.success(`You accepted the donation: ${donation_name}`);

  } catch (err) {
    console.error("Failed to accept donation:", err);
    toast.error("Failed to accept donation.");
  } finally {
    // Re-enable buttons
    setDisabledDonations(prev => {
      const copy = new Set(prev);
      copy.delete(donation.id);
      return copy;
    });
  }
};

 const cancelDonation = async (donationCardMessage) => {
  if (!donationCardMessage) return;

  let donation;
  try {
    const parsed = JSON.parse(donationCardMessage.content);
    donation = parsed.donation;
  } catch {
    console.error("Invalid donation card");
    return;
  }

  setDisabledDonations(prev => new Set(prev).add(donation.id));

  try {
    const token = localStorage.getItem("token");
    const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    await axios.post(`${API_URL}/donation/cancel/${donation.id}`, {}, opts);

    // Optionally refresh accepted list again if backend removes it
    const res = await axios.get(`${API_URL}/donation/accepted`, opts);
    setAcceptedDonations(new Set(res.data.map(d => d.id)));

    // remove cancelled message
    setMessages(prev => prev.filter(m => m.id !== donationCardMessage.id));

    // Optionally tell via WebSocket that it’s cancelled
    wsRef.current?.send(
      JSON.stringify({
        type: "donation_cancelled",
        donation_id: donation.id,
      })
    );
  } catch (err) {
    console.error("Failed to cancel donation:", err);
  } finally {
    setDisabledDonations(prev => {
      const copy = new Set(prev);
      copy.delete(donation.id);
      return copy;
    });
  }
};


  const deleteMessage = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    wsRef.current?.send(JSON.stringify({ type: "delete_message", id }));
  };
  const deleteForMe = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    wsRef.current?.send(JSON.stringify({ type: "delete_for_me", id }));
  };

  /* Render helpers */
const renderMessageBody = (m) => {
  try {
    const parsed =
      typeof m.content === "string" ? JSON.parse(m.content) : m.content;

    // Donation card (request)
  if (parsed?.type === "donation_card") {
  const d = parsed.donation || {};
  const iAmReceiver = Number(m.receiver_id) === Number(currentUser?.id);
  const accepted = m.accepted || acceptedDonations.has(d.id);

  console.log("🧩 Render donation:", {
    donation_id: d.id,
    allDonationRequests,
  });

 const isProductAcceptedOrCancelled = allDonationRequests.some(
  req =>
    req.bakery_inventory_id === d.id &&
    (req.status === "accepted" || req.status === "canceled")
);

  console.log("🎯 Hide check", {
  d_id: d.id,
  matched: allDonationRequests.filter(
     req =>
    req.bakery_inventory_id === d.id &&
    (req.status === "accepted" || req.status === "canceled")
  ),
});

  const hideButtons = isProductAcceptedOrCancelled;
  const isTaken = acceptedDonations.has(d.bakery_inventory_id);

  return {
    isMedia: false,
    body: (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800 }}>Donation Request</div>
        <div style={{ fontSize: 13 }}>
          {d.product_name || d.name || "Baked Goods"} • Qty: {d.quantity ?? "-"}
        </div>

        {!hideButtons && !accepted && iAmReceiver && !isTaken && (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button className="btn-mini accept" onClick={() => acceptDonation(m)}>
              <Check className="w-4 h-4" /> Accept
            </button>
            <button className="btn-mini" onClick={() => cancelDonation(m)}>
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>
    ),
  };
}
    // Confirmed donation (accepted)
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

    // Donation unavailable (accepted by someone else)
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

  // Default (plain text or media)
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
              <img src={mediaDataURL(m.media_type, m.media)} alt="attachment" />
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


  /* Auto-resize compose textarea */
  useEffect(() => {
    const ta = composeRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [mediaFile, newMessage]);

  return (
    <>
      <Styles />

      {/* Launcher + anchored dropdown wrapper */}
      <div className="relative inline-block" ref={launcherWrapRef}>
        <button
          type="button"
          className="icon-btn msg-launcher relative"
          aria-label="Open messages"
          title="Messages"
          onClick={() => {
            const willOpen = !openList;
            setOpenList(willOpen);
            if (willOpen) window.dispatchEvent(new Event("ui:messages-open"));
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

        {/* Chat list dropdown */}
        {openList && (
          <div className="absolute right-0 mt-2 z-[9998]" ref={dropdownRef}>
            <div className="chatlist-dropdown">
              <div className="cl-head">
                <div className="cl-title">Chats</div>
                <button className="cl-icon" onClick={() => setOpenList(false)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="cl-search">
                <input
                  value={search}
                  onChange={handleSearch}
                  placeholder={`Search...`}
                />
              </div>

              <div className="cl-list">
                {sidebarUsers.length === 0 ? (
                  <div className="p-4 text-sm text-[#6b4b2b] opacity-80">No conversations.</div>
                ) : (
                  sidebarUsers.map((u) => {
                    const sum = summaries.get(Number(u.id));
                    const last = sum?.last || u.last_message;
                    const unread = Number(sum?.unread || u.unread || 0);
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

                    let snippet = "No Conversation yet. Chat Now!";
                    if (last) {
                      try {
                        const p = JSON.parse(last.content);
                        snippet =
                          p.type === "donation_card"
                            ? "Donation Request"
                            : p.type === "confirmed_donation"
                            ? "Donation Request Confirmed"
                            : last.content || "—";
                      } catch {
                        snippet = last?.content || "—";
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
                              <div className="time shrink-0">{formatTime(last.timestamp)}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="snippet truncate">{snippet}</div>
                            {unread > 0 && <span className="dot" />}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: "#8b6b48" }} />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="cl-foot">
                <button className="seeall" onClick={() => setOpenList(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Docked chat */}
      {openDock && selectedUser && createPortal(
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
                  {(selectedUser.name || selectedUser.email || "#")[0]?.toUpperCase?.() || "?"}
                </div>
              )}
              <div className="dock-title truncate">
                {selectedUser.name || selectedUser.email || `#${selectedUser.id}`}
              </div>
              <div className="dock-actions">
                <button className="icon-btn" onClick={() => setOpenDock(false)} title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {pendingCards.length > 0 && (
              <div className="pending-bar">
                <button className="pending-toggle" onClick={() => setPendingOpen((v) => !v)}>
                  Pending donations ({pendingCards.length})
                </button>
              </div>
            )}
            {pendingOpen && pendingCards.length > 0 && (
              <div className="pending-list">
                {pendingCards.map((card) => {
                  let d = {};
                  try { d = JSON.parse(card.content).donation || {}; } catch {}
                  const iAmReceiver = Number(card.receiver_id) === Number(currentUser?.id);

                  return (
                    <div key={`pend-${card.id}`} className="pend-row">
                      <div className="pend-meta">
                        <div className="pend-title">{d.product_name || d.name || "Donation"}</div>
                        <div className="pend-sub">Qty: {d.quantity ?? "-"}</div>
                      </div>
                      <div className="pend-actions">
                        <button className="btn-mini" onClick={() => {jumpTo(card.id); setPendingOpen(false);}}>Open</button>
                        {iAmReceiver && (
                          <>
                            <button
                              className="btn-mini accept"
                              onClick={() => {acceptDonation(card); setPendingOpen(false);}}
                              disabled={disabledDonations.has(d.id)} 
                               
                            >
                              <Check className="w-4 h-4" /> Accept
                            </button>
                            <button
                              className="btn-mini"
                              onClick={() => {cancelDonation(card); setPendingOpen(false);}}
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
              {filteredMessages.map((m) => {
                const me = Number(m.sender_id) === Number(currentUser?.id);
                const render = renderMessageBody(m);
                return (
                  <div key={m.id} ref={setMsgRef(m.id)} className={`msg-row ${me ? "right" : "left"}`}>
                    {me && (
                      <div className="left-controls">
                        <button
                          className="icon-btn-tiny"
                          title="More"
                          aria-label="More"
                          onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                        {menuOpenId === m.id && (
                          <div className="ctx-menu">
                            <button
                              className="ctx-item"
                              onClick={() => {
                                setMenuOpenId(null);
                                setMessages((p) => p.filter((x) => x.id !== m.id));
                                wsRef.current?.send(JSON.stringify({ type: "delete_for_me", id: m.id }));
                              }}
                            >
                              Delete for me
                            </button>
                            <button
                              className="ctx-item"
                              onClick={() => {
                                setMenuOpenId(null);
                                setMessages((p) => p.filter((x) => x.id !== m.id));
                                wsRef.current?.send(JSON.stringify({ type: "delete_message", id: m.id }));
                              }}
                            >
                              Delete for everyone
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`bubble ${me ? "me" : "them"} ${render.isMedia ? "media-card" : ""}`}>
                      {render.body}
                      <div className="meta">
                        <div className="btime">{formatTime(m.timestamp)}</div>
                        {me && (
                          <div className={`readmark ${m.is_read ? "read" : "sent"}`}>
                            {m.is_read ? "✓✓" : "✓"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {peerTyping && (
                <div className="text-xs text-[#6b4b2b]">
                  {selectedUser?.name || "Peer"} is typing…
                </div>
              )}

              {showScrollButton && (
                <button
                  className="scroll-btn"
                  onClick={() => {
                    const el = dockScrollRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  }}
                >
                  ↓
                </button>
              )}
            </div>

            {/* Composer */}
            <div className="dock-compose">
              {/* Attach button OUTSIDE the text box */}
              <label title="Attach image/video" className="attach-btn" style={{ borderRadius: 9999 }}>
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

              {/* Bubble (Messenger-like shape, same colors) */}
              <div className={`compose-group${mediaFile ? " has-attach" : ""}`}>
                {mediaFile && (
                  <span
                    className="attach-chip"
                    title={`${mediaFile.type || "file"} • ${formatBytes(mediaFile.size)}`}
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

                {/* Multiline, auto-growing textarea. Enter sends. */}
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