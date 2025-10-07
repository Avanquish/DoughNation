import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Bell, ExternalLink, X, ChevronRight } from "lucide-react";

// Small unread/read circle indicator
function UnreadCircle({ read }) {
  return (
    <span
      aria-hidden
      className={`inline-block mr-2 rounded-full align-middle shrink-0 ${
        read
          ? "w-2.5 h-2.5 border border-[#BF7327] bg-transparent"
          : "w-2.5 h-2.5 border border-[#BF7327] bg-[#BF7327]"
      }`}
      title={read ? "Read" : "Unread"}
    />
  );
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const STORAGE_KEY = "readNotifications";
const CARD_WIDTH = 340;

export default function BakeryNotification() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [anchor, setAnchor] = useState(null);

  const dropdownRef = useRef(null);
  const cardRef = useRef(null);

  // helpers
  const getReadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const saveReadToStorage = (ids) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

  // fetch notifs
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/notifications/all`, opts);
      let { products = [], messages = [] } = res.data || {};

      const read = getReadFromStorage();

      const normProducts = (products || [])
        .map((n) => ({
          ...n,
          id: String(n.id),
          read: read.includes(String(n.id)),
        }))
        .sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1; // unread first
          const ad = new Date(a.expiration_date || a.created_at || 0);
          const bd = new Date(b.expiration_date || b.created_at || 0);
          return bd - ad;
        });

      const normMessages = (messages || []).map((m) => ({
        ...m,
        id: String(m.id),
      }));

      setProducts(normProducts);
      setMessages(normMessages);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // selection & read
  const markAsRead = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p))
    );
    const bag = getReadFromStorage();
    if (!bag.includes(id)) saveReadToStorage([...bag, id]);
  };

  const openProductCard = async (notif, target) => {
    try {
      markAsRead(notif.id);

      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const pid = notif.product_id ?? notif.id;
      const r = await axios.get(`${API}/get_product/${pid}`, opts);
      const product = r.data?.product || null;
      setSelectedProduct(product);
      const rect = target.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2 + window.scrollY;

      let side = "right";
      let left = rect.right + 12;
      if (rect.right + 12 + CARD_WIDTH > window.innerWidth) {
        side = "left";
        left = rect.left - 12 - CARD_WIDTH;
        if (left < 8) left = 8;
      }
      let top = centerY;
      const minTop = 16 + window.scrollY;
      const maxTop = window.scrollY + window.innerHeight - 16;
      if (top < minTop) top = minTop;
      if (top > maxTop) top = maxTop;

      setAnchor({ top, left, side });
    } catch (e) {
      console.error("Failed to open product card", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 4000);
    return () => clearInterval(iv);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onDown = (e) => {
      const withinDropdown =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      const withinCard = cardRef.current && cardRef.current.contains(e.target);
      if (!withinDropdown && !withinCard) {
        setOpen(false);
        setSelectedProduct(null);
        setAnchor(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Auto-clear a single message notification when chat opens directly
  useEffect(() => {
    const handleOpenChat = async () => {
      try {
        const peerRaw = localStorage.getItem("open_chat_with");
        if (!peerRaw) return;
        const peer = JSON.parse(peerRaw);
        const match = messages.find((m) => m.sender_id === peer.id);
        if (!match) return;

        const token = localStorage.getItem("token");
        const opts = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : { withCredentials: true };
        await axios.patch(`${API}/notifications/${match.id}/read`, {}, opts);
        setMessages((prev) => prev.filter((x) => x.id !== match.id));
      } catch (err) {
        console.error("Failed to auto-clear notif on chat open", err);
      }
    };
    window.addEventListener("open_chat", handleOpenChat);
    return () => window.removeEventListener("open_chat", handleOpenChat);
  }, [messages]);

  const unreadProducts = products.filter((p) => !p.read).length;
  const unreadMessages = messages.length;
  const totalUnread = unreadProducts + unreadMessages;

  const getName = (p) => p?.product_name ?? p?.name ?? p?.title ?? "Product";
  const getImage = (p) => p?.image_path ?? p?.image ?? p?.imageUrl ?? null;

  const openChatWith = async (m) => {
    const peer = {
      id: m.sender_id,
      name: m.sender_name,
      profile_picture: m.sender_profile_picture || null,
    };
    localStorage.setItem("open_chat_with", JSON.stringify(peer));

    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };
      await axios.patch(`${API}/notifications/${m.id}/read`, {}, opts);
    } catch (err) {
      console.error("Failed to mark message notif as read", err);
    }

    window.dispatchEvent(new Event("open_chat"));
    setOpen(false);
  };

  const jumpToInventory = (product) => {
    const detail = {
      id: Number(product?.id ?? product?.product_id ?? product?.productId ?? 0),
      name: (product?.name || product?.product_name || "").trim(),
    };

    setOpen(false);
    setSelectedProduct(null);
    setAnchor(null);

    window.dispatchEvent(new CustomEvent("inventory:open", { detail }));
  };

  useEffect(() => {
    if (!selectedProduct || !anchor) return;

    const adjust = () => {
      const el = cardRef.current;
      if (!el) return;

      const pad = 16;
      const h = el.getBoundingClientRect().height;
      const half = h / 2;

      const viewTop = window.scrollY + pad;
      const viewBottom = window.scrollY + window.innerHeight - pad;

      let top = anchor.top;

      if (top - half < viewTop) top = viewTop + half;
      if (top + half > viewBottom) top = viewBottom - half;

      if (Math.abs(top - anchor.top) > 0.5) {
        setAnchor((a) => (a ? { ...a, top } : a));
      }
    };

    requestAnimationFrame(adjust);
    window.addEventListener("resize", adjust);
    window.addEventListener("scroll", adjust, { passive: true });
    return () => {
      window.removeEventListener("resize", adjust);
      window.removeEventListener("scroll", adjust);
    };
  }, [selectedProduct, anchor]);

  return (
    <div className="relative inline-block">
      {/* Bell button */}
      <button
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (!willOpen) {
            setSelectedProduct(null);
            setAnchor(null);
          }
        }}
        title="Notifications"
      >
        <Bell className="w-[18px] h-[18px] text-black" />
        {totalUnread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 text-[10px] font-extrabold leading-none px-[6px] py-[3px] rounded-full text-white"
            style={{
              background:
                "linear-gradient(90deg, var(--brand2, #E49A52), var(--brand3, #BF7327))",
              boxShadow: "0 6px 16px rgba(201,124,44,.35)",
              border: "1px solid rgba(255,255,255,.65)",
            }}
          >
            {totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-[9998] w/[460px] w-[460px] max-w-[90vw]"
          ref={dropdownRef}
        >
          <div className="gwrap rounded-2xl shadow-xl">
            <div className="glass-card rounded-[14px] overflow-hidden">
              {/* Tabs header */}
              <div className="flex items-center">
                {[
                  { key: "products", label: "Products", count: unreadProducts },
                  { key: "messages", label: "Messages", count: unreadMessages },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                      tab === t.key
                        ? "text-white"
                        : "text-[#6b4b2b] hover:text-[#4f371f]"
                    }`}
                    style={
                      tab === t.key
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
                        style={{ color: tab === t.key ? "#fff" : "#BF7327" }}
                      >
                        ({t.count})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y">
                {tab === "products" && (
                  <div>
                    {products.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No product alerts
                      </div>
                    ) : (
                      products.map((n) => (
                        <button
                          key={n.id}
                          onClick={(e) => openProductCard(n, e.currentTarget)}
                          className={`w-full p-3 focus:outline-none transition-colors flex items-center ${
                            n.read
                              ? "bg-white hover:bg-[#fff6ec]"
                              : "bg-[rgba(255,246,236,1)]"
                          }`}
                        >
                          <UnreadCircle read={n.read} />
                          <p
                            className={`text-[13px] text-left flex-1 ${
                              n.read
                                ? "text-[#6b4b2b]"
                                : "text-[#4f371f] font-semibold"
                            }`}
                          >
                            {n.message}
                          </p>
                          <ChevronRight
                            className="w-4 h-4 shrink-0"
                            style={{ color: "#8b6b48" }}
                          />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {tab === "messages" && (
                  <div>
                    {messages.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No messages
                      </div>
                    ) : (
                      messages.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => openChatWith(m)}
                          className="w-full p-3 flex items-center gap-2 text-left hover:bg-[#fff6ec]"
                        >
                          <UnreadCircle read={false} />
                          <img
                            src={
                              m.sender_profile_picture
                                ? `${API}/${m.sender_profile_picture}`
                                : `${API}/uploads/placeholder.png`
                            }
                            alt={m.sender_name}
                            className="w-8 h-8 rounded-full object-cover border"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-tight">
                              <span className="font-bold text-[#6b4b2b]">
                                {m.sender_name}:
                              </span>{" "}
                              <span className="text-[#6b4b2b]">
                                {m.preview}
                              </span>
                            </p>
                          </div>
                          <ChevronRight
                            className="w-4 h-4 shrink-0"
                            style={{ color: "#8b6b48" }}
                          />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* footer */}
              <div className="px-3 py-2 text-[11px] text-[#8a5a25] bg-white/70">
                Tip: Click a product alert to view quick details or jump to
                Inventory.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product quick card (anchored) */}
      {selectedProduct && anchor && (
        <div
          ref={cardRef}
          className="fixed z-[9999]"
          style={{
            top: anchor.top,
            left: anchor.left,
            transform: "translateY(-50%)",
          }}
        >
          <div
            className="relative gwrap rounded-2xl shadow-xl"
            style={{ width: CARD_WIDTH }}
          >
            <div className="glass-card rounded-[14px] p-4">
              <span
                aria-hidden
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45"
                style={{
                  background: "white",
                  borderLeft: "1px solid rgba(0,0,0,.06)",
                  borderTop: "1px solid rgba(0,0,0,.06)",
                  right: anchor.side === "left" ? "-6px" : "auto",
                  left: anchor.side === "right" ? "-6px" : "auto",
                }}
              />

              <button
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5"
                onClick={() => {
                  setSelectedProduct(null);
                  setAnchor(null);
                }}
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4 text-[#6b4b2b]" />
              </button>

              <h3 className="text-[15px] font-extrabold text-[#6b4b2b] mb-1">
                {getName(selectedProduct)}
              </h3>
              <div className="space-y-1 text-[12px] text-[#6b4b2b]">
                <p>
                  <strong>Quantity:</strong> {selectedProduct.quantity ?? "-"}
                </p>
                <p>
                  <strong>Creation Date:</strong>{" "}
                  {selectedProduct.creation_date
                    ? new Date(
                        selectedProduct.creation_date
                      ).toLocaleDateString()
                    : "-"}
                </p>
                <p>
                  <strong>Expiration Date:</strong>{" "}
                  {selectedProduct.expiration_date
                    ? new Date(
                        selectedProduct.expiration_date
                      ).toLocaleDateString()
                    : "-"}
                </p>
                <p>
                  <strong>Threshold:</strong> {selectedProduct.threshold ?? "-"}{" "}
                  days
                </p>
              </div>

              {getImage(selectedProduct) && (
                <img
                  src={`${API}/${getImage(selectedProduct)}`}
                  alt={getName(selectedProduct)}
                  className="mt-3 w-full h-36 object-cover rounded-md border"
                />
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className="status-chip">Quick view</span>
                <button
                  onClick={() => jumpToInventory(selectedProduct)}
                  className="inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-full text-white"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--brand1,#F6C17C), var(--brand2,#E49A52), var(--brand3,#BF7327))",
                    boxShadow: "0 6px 16px rgba(201,124,44,.25)",
                    border: "1px solid rgba(255,255,255,.6)",
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View in Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}