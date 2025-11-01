
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


    .chatlist-dropdown{
      width:360px; max-width:92vw; max-height:calc(100vh - 96px);
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
    .btn-mini:disabled{opacity:0.5; cursor:not-allowed}

    .dock-scroll{flex:1; overflow:auto; padding:16px; background:#fff7ec}

    .msg-row{display:flex; align-items:center; gap:2px; margin:6px 0}
    .msg-row.right{justify-content:flex-end}
    .left-controls{position:relative; align-self:center}
    .icon-btn-tiny{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;border:1px solid var(--line);background:#fff;color:#7a4f1c}
    .icon-btn-tiny:hover{background:#fff4e6}

    .bubble{
      max-width:75%; padding:12px; border-radius:14px; word-break:break-word; overflow-wrap:anywhere;
      box-shadow:0 1px 0 rgba(0,0,0,.04); position:relative; border:0;
    }
    .bubble.me{ background:#FFE7C5; color:#4a2f17; border:1px solid #f4d9bf; }
    .bubble.them{ background:#fff; color:#4a2f17; margin-right:auto; border:1px solid #f2d4b5; }

    .media-wrap{border-radius:12px; overflow:hidden}
    .media-wrap img, .media-wrap video{display:block;width:100%;height:auto;max-height:420px}
    .bubble.me .media-caption,
    .bubble.me .media-caption a,
    .bubble.me .media-caption strong,
    .bubble.me .media-caption em{ color:#4a2f17; }
    .media-caption{ display:block; margin-top:10px; background:transparent; border:0; color:inherit; line-height:1.25; max-width:100%; }

    .ctx-menu{position:absolute; min-width:160px; background:#fff; border:1px solid rgba(0,0,0,.1); box-shadow:0 12px 28px rgba(0,0,0,.16); border-radius:8px; overflow:hidden; z-index:30}
    .left-controls .ctx-menu{ top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    .ctx-item{display:block; width:100%; text-align:left; padding:10px 12px; font-size:13px; color:#4a2f17; background:#fff; cursor:pointer}
    .ctx-item:hover, .ctx-item:focus-visible{background:#ffe7c5}

    .meta{display:flex; align-items:center; gap:6px; justify-content:flex-end; margin-top:6px}
    .btime{font-size:11px; opacity:.75; color:#3d2a16}
    .readmark{font-size:11px; opacity:.65; color:#3d2a16}
    .readmark.sent{opacity:.55}
    .readmark.read{opacity:1; color:#000}

    .dock-compose{display:flex; gap:8px; padding:8px; border-top:1px solid var(--line); background:#fff; align-items:center;}
    .compose-group{flex:1 1 auto; display:flex; align-items:flex-start; gap:8px; border:1px solid #f2d4b5; background:#fff; border-radius:20px; padding:10px 14px; overflow:hidden; min-width:0; flex-wrap:wrap; box-shadow:0 1px 0 rgba(0,0,0,.03)}
    .attach-btn{display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9999px; border:1px solid #f2d4b5; background:transparent; flex:0 0 auto; align-self:center;}
    .attach-btn:hover{background:#fff7ec}
    .attach-chip{flex:0 1 55%; min-width:0; display:inline-flex; align-items:center; gap:6px; height:30px; padding:2px 10px; border-radius:9999px; background:#fff7ec; border:1px solid #f4d9bf; font-size:12px; color:#6b4b2b; box-shadow:inset 0 0 0 1px #fff}
    .attach-chip .thumb{width:20px; height:20px; border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #f1d6b7; background:#fff}
    .attach-chip .thumb img{width:100%; height:100%; object-fit:cover; border-radius:6px}
    .attach-chip .name{flex:1 1 auto; min-width:0; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600}
    .attach-chip .remove-attach{margin-left:2px; display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:9999px; background:transparent; border:0}
    .attach-chip .remove-attach:hover{background:#ffe7c5}

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

export default function Messages({ currentUser: currentUserProp }) {
  /* UI State */
  const [openList, setOpenList] = useState(false);
  const [openDock, setOpenDock] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");

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
    // Check for employee token first, then bakery owner token
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken || currentUser?.token;

    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
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
      const res = await axios.get(`${API_URL}/messages/active_chats`, makeAuthOpts());
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
          (m) => Number(m.sender_id) === peerId || Number(m.receiver_id) === peerId
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
          headers: { ...(opts.headers || {}), "Content-Type": "multipart/form-data" },
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

    // Include ALL fields needed for the donation card
    const donationCard = {
      ...donation,
      id: donation.id,                           // Original donation ID
      request_id: donation.id,                   // Request ID
      donation_request_id: donation.id,
      bakery_inventory_id: donation.bakery_inventory_id,  // CRITICAL: Include this
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
        prev.map((m) => (m.id === donationCardMessage.id ? { ...m, accepted: true } : m))
      );

      const res = await axios.post(
        `${API_URL}/donation/accept/${donation.id}`,
        { charity_id: originalCharityId },
        opts
      );
      const { accepted_charity_id, canceled_charities, donation_name, bakery_inventory_id } = res.data;

      // ✅ Refresh inventory status
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
                message: `Sorry ${donation_name} has already been donated to other charity.`,
              }),
            },
            opts
          );
        }
      }

      try {
        toast?.success?.(`You accepted the donation: ${donation_name}`);
      } catch { }
      fetchActiveChats();
    } catch (err) {
      console.error("Failed to accept donation:", err);
      try {
        toast?.error?.("Failed to accept donation.");
      } catch { }
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

      setMessages((prev) =>
        prev.map((m) => (m.id === donationCardMessage.id ? { ...m, cancelled: true } : m))
      );

      await axios.post(
        `${API_URL}/donation/cancel/${donation.id}`,
        { charity_id: originalCharityId },
        opts
      );

      setMessages((prev) => prev.filter((m) => m.id !== donationCardMessage.id));
      fetchActiveChats?.();

      try {
        await deleteMessage(donationCardMessage.id, { for_all: true });
      } catch (err) {
        console.error(err);
      }

      const detail = {
        request_id: donation.id,
        message_id: donationCardMessage.id,
        donation_id: donation.id || donation.id,
        charity_id: originalCharityId,
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

  const deleteMessage = async (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await axios.post(`${API_URL}/messages/delete`, { id, for_all: true }, makeAuthOpts());
      fetchActiveChats();
    } catch (err) {
      console.debug("deleteMessage failed:", err?.message || err);
    }
  };

  const deleteForMe = async (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await axios.post(`${API_URL}/messages/delete`, { id, for_all: false }, makeAuthOpts());
      fetchActiveChats();
    } catch (err) {
      console.debug("deleteForMe failed:", err?.message || err);
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
    setPendingCards((prev) => prev.filter((m) => m.id !== donationCardMessage.id));
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

      if (parsed?.type === "donation_card") {
        const d = parsed.donation || {};
        const iAmReceiver = Number(m.receiver_id) === Number(currentUser?.id);

        // Check inventory status using bakery_inventory_id
        const inventoryId = d.bakery_inventory_id;
        const inventoryStatus = inventoryStatuses.get(inventoryId);

        // DEBUG
        console.log(`[DONATION] Card ID: ${d.id}, Inventory ID: ${inventoryId}`, {
          inventoryStatus,
          allCachedInventoryIds: Array.from(inventoryStatuses.keys()),
          hasAccepted: inventoryStatus?.has_accepted
        });

        // ✅ Hide buttons ONLY if ANY request for this inventory has been accepted
        const hasAccepted = inventoryStatus?.has_accepted || false;

        // Show buttons if NOT accepted (and status data has loaded)
        const shouldShowButtons = !hasAccepted && inventoryStatus;

        return {
          isMedia: false,
          body: (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Donation Request</div>
              <div style={{ fontSize: 13 }}>
                {d.product_name || d.name || "Baked Goods"} • Qty: {d.quantity ?? "-"}
              </div>

              {shouldShowButtons && iAmReceiver && (
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
                <span style={{ fontSize: 13, color: "#374151" }}>
                  {donation?.name} • Qty: {donation?.quantity}
                </span>
              </div>
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
    const hasImg = Boolean(m.image) || (m.media && m.media_type?.startsWith("image/"));
    const hasVid = Boolean(m.video) || (m.media && m.media_type?.startsWith("video/"));
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

  const allUsers = useMemo(
    () => (search.trim() ? searchResults || [] : Array.from(activeChats.values())),
    [search, searchResults, activeChats]
  );

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

  // ✅ Fetch inventory statuses when messages change
  useEffect(() => {
    const inventoryIds = new Set();

    messages.forEach((m) => {
      try {
        const parsed = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
        if (parsed?.type === "donation_card" && parsed?.donation?.bakery_inventory_id) {
          inventoryIds.add(parsed.donation.bakery_inventory_id);
        }
      } catch { }
    });

    inventoryIds.forEach((id) => {
      // Always fetch to ensure we have the latest status
      fetchInventoryStatus(id);
    });
  }, [messages]);

  // Poll inventory statuses every 3 seconds for active donation cards
  useEffect(() => {
    if (!selectedUser || filteredMessages.length === 0) return;

    const pollInterval = setInterval(() => {
      const inventoryIds = new Set();

      filteredMessages.forEach((m) => {
        try {
          const parsed = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
          if (parsed?.type === "donation_card" && parsed?.donation?.bakery_inventory_id) {
            inventoryIds.add(parsed.donation.bakery_inventory_id);
          }
        } catch { }
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
      const path = e.composedPath?.() || (e.path || []);
      const clickedInside = path.includes(wrap) || (drop && path.includes(drop));
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

    // Check for employee token first, then bakery owner token
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    const token = employeeToken || bakeryToken;

    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));

      // Handle employee token
      if (decoded.type === "employee") {
        // IMPORTANT: Use bakery_id as the main ID so employees receive bakery messages
        setCurrentUser({
          id: Number(decoded.bakery_id), // ✅ Use bakery_id, not employee_id
          role: "employee",
          email: "",
          name: decoded.employee_name || decoded.name || "",
          token,
          employee_id: Number(decoded.employee_id),
          employee_role: decoded.employee_role,
          bakery_id: Number(decoded.bakery_id),
          is_employee: true, // Flag to identify employee users
        });
      }
      // Handle bakery/charity/admin token
      else {
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
      if (!donation_id) return;

      setCancelledDonationIds((prev) => new Set(prev).add(donation_id));

      const cardsToDelete = messages.filter((m) => {
        try {
          const parsed = JSON.parse(m.content);
          return parsed?.donation?.donation_id === donation_id && parsed.type === "donation_card";
        } catch {
          return false;
        }
      });

      cardsToDelete.forEach((m) => deleteMessage(m.id));
    };

    window.addEventListener("donation_cancelled", handleCancel);
    return () => window.removeEventListener("donation_cancelled", handleCancel);
  }, [messages]);

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
      if (pollRef.current.activeChats) clearInterval(pollRef.current.activeChats);
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
      if (next.has(Number(selectedUser.id))) next.get(Number(selectedUser.id)).unread = 0;
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
        const inbound = Number(m.sender_id) === peer && Number(m.receiver_id) === me;
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
        // Only include messages in THIS conversation
        const isInConversation =
          (Number(m.sender_id) === me && Number(m.receiver_id) === peer) ||
          (Number(m.sender_id) === peer && Number(m.receiver_id) === me);

        if (!isInConversation) return false;

        const p = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
        const donationId = p?.donation?.id;
        const donation = p?.donation;
        const inventoryId = donation?.bakery_inventory_id;

        // Check if this donation request has been canceled or accepted in the database
        // Try multiple ID fields to match
        const requestInDb = allDonationRequests.find(
          (req) =>
            req.id === donationId ||
            req.donation_id === donationId ||
            req.bakery_inventory_id === inventoryId
        );

        // If found in DB, check its status
        if (requestInDb && (requestInDb.status === "canceled" || requestInDb.status === "accepted")) {
          console.log(`[PENDING] Filtering out donation ${donationId}, status: ${requestInDb.status}`);
          return false;
        }

        // Also check if the inventory item has been accepted by checking inventoryStatuses
        const inventoryStatus = inventoryStatuses.get(inventoryId);
        if (inventoryStatus?.has_accepted) {
          console.log(`[PENDING] Filtering out donation ${donationId}, inventory ${inventoryId} has been accepted`);
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
  }, [messages, removedDonations, acceptedDonations, removedProducts, selectedUser, currentUser, allDonationRequests, inventoryStatuses]);

  useEffect(() => {
    const el = dockScrollRef.current;
    if (!el) return;

    const messageCountChanged = filteredMessages.length !== prevMessageCountRef.current;
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
      const res = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(q)}`, makeAuthOpts());
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
            const willOpen = !openList;
            setOpenList(willOpen);
            if (willOpen) window.dispatchEvent(new Event("ui:messages-open"));
          }}
        >
          <MessageSquareText className="h-[18px] w-[18px] text-black" />
          {totalUnread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[5px] rounded-full
                         text-[10px] font-bold flex items-center justify-content text-white msg-badge"
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>

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
                <input value={search} onChange={handleSearch} placeholder="Search..." />
              </div>

              <div className="cl-list">
                {allUsers.length === 0 ? (
                  <div className="p-4 text-sm text-[#6b4b2b] opacity-80">No conversations.</div>
                ) : (
                  allUsers.map((u) => {
                    const sum = summaries.get(Number(u.id));
                    const last = sum?.last || u.last_message;
                    const unread = Number(sum?.unread || u.unread || 0);

                    try {
                      const peerIdNum = Number(u.id);
                      const parsedLast = typeof last?.content === "string" ? JSON.parse(last.content) : last?.content || null;
                      const donationTypes = ["donation_card", "confirmed_donation", "donation_unavailable", "donation_cancelled"];
                      const meId = Number(currentUser?.id);
                      const involved = meId && (Number(last?.sender_id) === meId || Number(last?.receiver_id) === meId);
                      const hasLocal = messages.some(
                        (m) => Number(m.sender_id) === peerIdNum || Number(m.receiver_id) === peerIdNum
                      );
                      if (parsedLast && donationTypes.includes(parsedLast.type) && !involved && !hasLocal) {
                        if (!renderFetchRef.current.has(peerIdNum)) {
                          renderFetchRef.current.add(peerIdNum);
                          fetchHistoryForPeer(peerIdNum).catch(() => renderFetchRef.current.delete(peerIdNum));
                        }
                      }
                    } catch (e) {
                      /* ignore */
                    }

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

                        if (parsed && donationTypes.includes(parsed.type)) {
                          const me = Number(currentUser?.id);
                          const involved = me && (Number(last.sender_id) === me || Number(last.receiver_id) === me);

                          if (involved) {
                            snippet =
                              parsed.type === "donation_card"
                                ? "Donation Request"
                                : parsed.type === "confirmed_donation"
                                  ? "Donation Request Confirmed"
                                  : parsed.message || last.content || "Donation Update";
                          } else {
                            const meId = Number(currentUser?.id);
                            const peerId = Number(u.id);
                            const convo = messages.filter(
                              (m) =>
                                (Number(m.sender_id) === meId && Number(m.receiver_id) === peerId) ||
                                (Number(m.sender_id) === peerId && Number(m.receiver_id) === meId)
                            );

                            let found = false;
                            for (let i = convo.length - 1; i >= 0; i--) {
                              const pm = convo[i];
                              try {
                                const p = typeof pm.content === "string" ? JSON.parse(pm.content) : pm.content || null;
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
                              const lastDonationMessage = convo.slice().reverse().find((pm) => {
                                try {
                                  const parsed = typeof pm.content === "string" ? JSON.parse(pm.content) : pm.content;
                                  return parsed && donationTypes.includes(parsed.type);
                                } catch {
                                  return false;
                                }
                              });

                              if (lastDonationMessage) {
                                try {
                                  const parsed = JSON.parse(lastDonationMessage.content);
                                  snippet =
                                    parsed.type === "donation_card"
                                      ? "Donation Request"
                                      : parsed.type === "confirmed_donation"
                                        ? "Donation Request Confirmed"
                                        : parsed.message || "Donation Update";
                                  found = true;
                                } catch {
                                  snippet = "Start a conversation";
                                }
                              } else {
                                snippet = "Start a conversation";
                              }
                            }
                          }
                        } else {
                          snippet = last.content || (last.image ? "Photo" : last.video ? "Video" : "Start a conversation");
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
                            <div className="name truncate">{u.name || u.email || `Conversation #${u.id}`}</div>
                            {last?.timestamp && <div className="time shrink-0">{formatTime(last.timestamp)}</div>}
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
                <button className="seeall" onClick={() => setOpenList(false)}>
                  Close
                </button>
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
                  <img src={`${API_URL}/${selectedUser.profile_picture}`} className="avatar-sm" style={{ objectFit: "cover" }} />
                ) : (
                  <div className="avatar-sm">{(selectedUser.name || selectedUser.email || "#")[0]?.toUpperCase?.() || "?"}</div>
                )}
                <div className="dock-title truncate">{selectedUser.name || selectedUser.email || `#${selectedUser.id}`}</div>
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
                    try {
                      d = JSON.parse(card.content).donation || {};
                    } catch { }
                    const iAmReceiver = Number(card.receiver_id) === Number(currentUser?.id);

                    return (
                      <div key={`pend-${card.id}`} className="pend-row">
                        <div className="pend-meta">
                          <div className="pend-title">{d.product_name || d.name || "Donation"}</div>
                          <div className="pend-sub">Qty: {d.quantity ?? "-"}</div>
                        </div>
                        <div className="pend-actions">
                          <button className="btn-mini" onClick={() => { jumpTo(card.id); setPendingOpen(false); }}>
                            Open
                          </button>
                          {iAmReceiver && (
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

                              <button className="btn-mini" onClick={() => removePendingDonation(card)}>
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
                    <div key={`${m.id}-${m.timestamp ?? ""}`} ref={setMsgRef(m.id)} className={`msg-row ${me ? "right" : "left"}`}>
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
                                  deleteForMe(m.id);
                                }}
                              >
                                Delete for me
                              </button>
                              <button
                                className="ctx-item"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setMessages((p) => p.filter((x) => x.id !== m.id));
                                  deleteMessage(m.id);
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
                          {me && <div className={`readmark ${m.is_read ? "read" : "sent"}`}>{m.is_read ? "✓✓" : "✓"}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {localTyping && <div className="text-xs text-[#6b4b2b]">{selectedUser?.name || "Peer"} is typing…</div>}

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

              <div className="dock-compose">
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

                <div className={`compose-group${mediaFile ? " has-attach" : ""}`}>
                  {mediaFile && (
                    <span className="attach-chip" title={`${mediaFile.type || "file"} • ${formatBytes(mediaFile.size)}`}>
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
                      <button className="remove-attach" onClick={() => setMediaFile(null)} aria-label="Remove attachment" title="Remove attachment">
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