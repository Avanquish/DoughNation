// src/components/NotificationBell.jsx
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Bell } from "lucide-react";

const API = "http://localhost:8000";
const CARD_WIDTH = 280;
const STORAGE_KEY = "readNotifications"; // localStorage key

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const dropdownRef = useRef(null);
  const cardRef = useRef(null);
  const itemRefs = useRef({});

  // Load read state from localStorage
  const getReadFromStorage = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored || [];
    } catch {
      return [];
    }
  };

  // Save read state to localStorage
  const saveReadToStorage = (ids) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/notifications`, opts);
      const storedRead = getReadFromStorage();

      // Merge backend with stored read state
      const fetched = (res.data.notifications || []).map((n) => ({
        ...n,
        read: storedRead.includes(n.id),
      }));

      //  sort: unread first, then newest expiration_date
      fetched.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.expiration_date) - new Date(a.expiration_date);
      });

      setNotifications(fetched);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // Mark as read (frontend + storage)
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    const stored = getReadFromStorage();
    if (!stored.includes(id)) {
      const updated = [...stored, id];
      saveReadToStorage(updated);
    }
  };

  // Fetch product details and compute card position
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

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 1000);
    return () => clearInterval(iv);
  }, []);

  // Close when clicking outside
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

  const getName = (p) => p?.product_name ?? p?.name ?? p?.title ?? "Product";
  const getImage = (p) => p?.image_path ?? p?.image ?? p?.imageUrl ?? null;

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50"
        >
          <div className="p-2 text-gray-700 font-semibold border-b">
            Notifications
          </div>

          <div className="max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-2 text-gray-500">No notifications</div>
            ) : (
              notifications.map((n) => (
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
                    markAsRead(n.id); // ✅ persist in localStorage
                    fetchProductDetails(n.product_id ?? n.id, e.currentTarget);
                  }}
                >
                  {n.message}
                </div>
              ))
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
          {/* Arrow */}
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

          {/* Close Button */}
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 font-bold"
            onClick={() => {
              setSelectedProduct(null);
              setAnchor(null);
            }}
          >
            ×
          </button>

          {/* Product Content */}
          <h3 className="text-lg font-semibold mb-1">{getName(selectedProduct)}</h3>
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
