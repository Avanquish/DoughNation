// frontend/src/components/NotificationBell.jsx
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000";
const CARD_WIDTH = 280;
const STORAGE_KEY = "readNotifications"; // localStorage key

export default function NotificationBell() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [donations, setDonations] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const dropdownRef = useRef(null);
  const cardRef = useRef(null);
  const itemRefs = useRef({});
  const navigate = useNavigate();

  // --- LocalStorage helpers ---
  const getReadFromStorage = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored || [];
    } catch {
      return [];
    }
  };
  const saveReadToStorage = (ids) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  // --- Fetch notifications ---
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/notifications/all`, opts);
      let { products, messages } = res.data;

      // normalize IDs to string
      products = (products || []).map((n) => ({ ...n, id: String(n.id) }));
      messages = (messages || []).map((m) => ({ ...m, id: String(m.id) }));

      const storedRead = getReadFromStorage();

      const mergedProducts = products.map((n) => ({
        ...n,
        read: storedRead.includes(n.id),
      }));

      mergedProducts.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.expiration_date) - new Date(a.expiration_date);
      });

      setProducts(mergedProducts);
      setMessages(messages);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // --- Mark product notification as read ---
  const markAsRead = (id) => {
    setProducts((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const stored = getReadFromStorage();
    if (!stored.includes(id)) {
      const updated = [...stored, id];
      saveReadToStorage(updated);
    }
  };

  // --- Fetch product details ---
  const fetchProductDetails = async (id, targetEl) => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/get_product/${id}`, opts);
      const product = res.data.product;
      setSelectedProduct(product);

      const rect = targetEl.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2 + window.scrollY;
      let side = "right";
      let left;

      if (rect.right + 12 + CARD_WIDTH > window.innerWidth) {
        side = "left";
        left = rect.left - 12 - CARD_WIDTH;
        if (left < 8) left = 8;
      } else {
        left = rect.right + 12;
      }

      let top = itemCenterY;
      const minTop = 16 + window.scrollY;
      const maxTop = window.innerHeight - 16 + window.scrollY;
      if (top < minTop) top = minTop;
      if (top > maxTop) top = maxTop;

      setAnchor({ top, left, side, itemCenterY });
    } catch (err) {
      console.error("Failed to fetch product details", err);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        cardRef.current &&
        !cardRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSelectedProduct(null);
        setAnchor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const refresh = () => fetchNotifications();
    window.addEventListener("refresh_notifications", refresh);
    return () => window.removeEventListener("refresh_notifications", refresh);
  }, []);

  // --- Auto-clear message notif when Messenger opens directly ---
  useEffect(() => {
    const handleOpenChat = async () => {
      try {
        const peerRaw = localStorage.getItem("open_chat_with");
        if (!peerRaw) return;
        const peer = JSON.parse(peerRaw);

        // find message notification for this sender
        const match = messages.find((m) => m.sender_id === peer.id);
        if (!match) return;

        const token = localStorage.getItem("token");
        const opts = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : { withCredentials: true };

        await axios.patch(`${API}/notifications/${match.id}/read`, {}, opts);

        // remove from state
        setMessages((prev) => prev.filter((m) => m.id !== match.id));
      } catch (err) {
        console.error("Failed to auto-clear notif on chat open", err);
      }
    };

    window.addEventListener("open_chat", handleOpenChat);
    return () => window.removeEventListener("open_chat", handleOpenChat);
  }, [messages]);
  

  // --- Helpers ---
  const getName = (p) => p?.product_name ?? p?.name ?? p?.title ?? "Product";
  const getImage = (p) => p?.image_path ?? p?.image ?? p?.imageUrl ?? null;
  const unreadCountProducts = products.filter((n) => !n.read).length;
  const unreadCountMessages = messages.length;
  const totalUnread =
    unreadCountProducts + unreadCountMessages;

  return (
    <div className="relative inline-block">
      {/* Bell Icon */}
      <button
        className="relative p-2 text-gray-700 hover:text-gray-900"
        onClick={() => {
          setOpen((s) => !s);
          if (open === true) {
            setSelectedProduct(null);
            setAnchor(null);
          }
        }}
      >
        <Bell size={24} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50"
        >
          <div className="flex border-b">
            {["products", "messages"].map((t) => (
              <button
                key={t}
                className={`flex-1 py-2 text-sm font-semibold ${
                  tab === t ? "bg-gray-200" : "bg-white"
                }`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "products" && unreadCountProducts > 0 && (
                  <span className="ml-1 text-red-600">
                    ({unreadCountProducts})
                  </span>
                )}
                {t === "messages" && unreadCountMessages > 0 && (
                  <span className="ml-1 text-red-600">
                    ({unreadCountMessages})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="max-h-60 overflow-y-auto">
            {/* Products */}
            {tab === "products" && (
              <>
                {products.length === 0 ? (
                  <div className="p-2 text-gray-500">No product alerts</div>
                ) : (
                  products.map((n) => (
                    <div
                      key={n.id}
                      ref={(el) => {
                        if (el) itemRefs.current[n.id] = el;
                      }}
                      className={`p-2 border-b text-sm cursor-pointer ${
                        !n.read
                          ? "bg-gray-400 font-bold"
                          : "bg-white text-gray-700"
                      } hover:bg-gray-100`}
                      onClick={(e) => {
                        markAsRead(n.id);
                        fetchProductDetails(
                          n.product_id ?? n.id,
                          e.currentTarget
                        );
                      }}
                    >
                      {n.message}
                    </div>
                  ))
                )}
              </>
            )}

            {/* Messages */}
            {tab === "messages" && (
              <>
                {messages.length === 0 ? (
                  <div className="p-2 text-gray-500">No messages</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 border-b text-sm flex items-center hover:bg-gray-100 cursor-pointer"
                      onClick={async () => {
                        const peer = {
                          id: m.sender_id,
                          name: m.sender_name,
                          profile_picture: m.sender_profile_picture || null,
                        };
                        localStorage.setItem(
                          "open_chat_with",
                          JSON.stringify(peer)
                        );

                        try {
                          const token = localStorage.getItem("token");
                          const opts = token
                            ? { headers: { Authorization: `Bearer ${token}` } }
                            : { withCredentials: true };
                          await axios.patch(
                            `${API}/notifications/${m.id}/read`,
                            {},
                            opts
                          );
                        } catch (err) {
                          console.error(
                            "Failed to mark notification as read",
                            err
                          );
                        }

                        window.dispatchEvent(new Event("open_chat"));
                        setOpen(false);

                        // remove only this message notif
                        setMessages((prev) =>
                          prev.filter((msg) => msg.id !== m.id)
                        );
                      }}
                    >
                      <img
                        src={
                          m.sender_profile_picture
                            ? `${API}/${m.sender_profile_picture}`
                            : `${API}/uploads/placeholder.png`
                        }
                        alt={m.sender_name}
                        className="w-8 h-8 rounded-full mr-2 object-cover"
                      />
                      <div>
                        <strong>{m.sender_name}:</strong> {m.preview}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
      </div>
    </div>
  )}

      {/* Product Card */}
      {selectedProduct && anchor && (
        <div
          ref={cardRef}
          className="fixed bg-white border border-black shadow-lg rounded-lg p-4 w-[280px] z-[9999]"
          style={{
            top: `${anchor.top}px`,
            left: `${anchor.left}px`,
            transform: "translateY(-50%)",
          }}
        >
          {anchor.side === "right" ? (
            <div
              className="absolute -left-2 w-0 h-0 border-t-[10px] border-b-[10px] border-r-[10px] border-transparent border-r-black"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            />
          ) : (
            <div
              className="absolute -right-2 w-0 h-0 border-t-[10px] border-b-[10px] border-l-[10px] border-transparent border-l-black"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            />
          )}

          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 font-bold"
            onClick={() => {
              setSelectedProduct(null);
              setAnchor(null);
            }}
          >
            ×
          </button>

          <h3 className="text-lg font-semibold mb-1">
            {getName(selectedProduct)}
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Quantity:</strong> {selectedProduct.quantity ?? "-"}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Creation Date:</strong>{" "}
            {selectedProduct.expiration_date
              ? new Date(selectedProduct.creation_date).toLocaleDateString()
              : "-"}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Expiration Date:</strong>{" "}
            {selectedProduct.expiration_date
              ? new Date(selectedProduct.expiration_date).toLocaleDateString()
              : "-"}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Threshold:</strong> {selectedProduct.threshold ?? "-"} days
          </p>

          {getImage(selectedProduct) && (
            <img
              src={`${API}/${getImage(selectedProduct)}`}
              alt={getName(selectedProduct)}
              className="mt-2 w-full h-36 object-cover rounded"
            />
          )}
        </div>
      )}
    </div>
  );
}
