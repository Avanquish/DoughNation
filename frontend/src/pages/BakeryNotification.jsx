import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Bell, ExternalLink, X, ChevronRight } from "lucide-react";

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
const PAGE_SIZE = 10;

export default function BakeryNotification() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [anchor, setAnchor] = useState(null);

  const dropdownRef = useRef(null); // notif panel
  const cardRef = useRef(null); // quick-view card

  const [productPage, setProductPage] = useState(1);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth <= 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // ---------- helpers for read state ----------
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

  // ---------- fetch notifications ----------
  const fetchNotifications = async () => {
    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/notifications/all`, opts);
      let { products = [], system_notifications = [] } = res.data || {};

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
          return bd - ad; // newest first
        });

      setProducts(normProducts);
      setSystemNotifications(system_notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAsRead = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p))
    );
    const bag = getReadFromStorage();
    if (!bag.includes(id)) saveReadToStorage([...bag, id]);
  };

  const markSystemNotificationAsRead = async (notif) => {
    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      await axios.patch(`${API}/notifications/${notif.id}/read`, {}, opts);
      
      setSystemNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark system notification as read", err);
    }
  };

  const openProductCard = async (notif, target) => {
    try {
      markAsRead(notif.id);

      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const pid = notif.product_id ?? notif.id;
      const r = await axios.get(`${API}/get_product/${pid}`, opts);
      const product = r.data?.product || null;
      setSelectedProduct(product);

      // scroll panel to top on mobile para laging kita yung quick view
      if (isMobile && dropdownRef.current) {
        const scroller =
          dropdownRef.current.querySelector(".notif-scroll") ||
          dropdownRef.current;
        scroller.scrollTop = 0;
      }

      // anchor (desktop only – mobile ignores, desktop uses)
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

  useEffect(() => {
    setProductPage(1);
  }, [products.length]);

  // ---------- outside click closes (panel + quick view) ----------
  useEffect(() => {
    const onDown = (e) => {
      const inDropdown =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      const inCard = cardRef.current && cardRef.current.contains(e.target);
      if (!inDropdown && !inCard) {
        setOpen(false);
        setSelectedProduct(null);
        setAnchor(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);



  const unreadProducts = products.filter((p) => !p.read).length;
  const unreadSystemNotifications = systemNotifications.filter((n) => !n.read).length;
  const totalUnread = unreadProducts + unreadSystemNotifications;

  const getName = (p) => p?.product_name ?? p?.name ?? p?.title ?? "Product";
  const getImage = (p) => p?.image_path ?? p?.image ?? p?.imageUrl ?? null;



  const jumpToInventory = (product) => {
    const detail = {
      id: Number(product?.id ?? product?.product_id ?? product?.productId ?? 0),
      name: (product?.name || product?.product_name || "").trim(),
    };

    setOpen(false);
    setSelectedProduct(null);
    setAnchor(null);

    window.dispatchEvent(new CustomEvent("inventory:focus", { detail }));

    sessionStorage.setItem("inventory:bypassVerifyOnce", "1");
    sessionStorage.setItem("inventory:focusDetail", JSON.stringify(detail));

    const current = new URL(window.location.href);
    const pathMatch = current.pathname.match(/\/bakery-dashboard\/([^/]+)/);
    const hashMatch = current.hash.match(/#\/bakery-dashboard\/([^/?#]+)/);
    const bakeryId =
      (pathMatch && pathMatch[1]) || (hashMatch && hashMatch[1]) || "1";
    const targetPath = `/bakery-dashboard/${bakeryId}?tab=inventory`;

    if (pathMatch) {
      window.location.assign(`${current.origin}${targetPath}`);
    } else if (hashMatch || current.hash.startsWith("#")) {
      current.hash = `#${targetPath}`;
      window.location.assign(current.toString());
    } else {
      window.location.assign(`${current.origin}${targetPath}`);
    }
  };

  // keep anchored card inside viewport (desktop)
  useEffect(() => {
    if (!selectedProduct || !anchor || isMobile) return;

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
  }, [selectedProduct, anchor, isMobile]);

  const productTotalPages = Math.max(
    1,
    Math.ceil(products.length / PAGE_SIZE) || 1
  );

  const pagedProducts = products.slice(
    (productPage - 1) * PAGE_SIZE,
    productPage * PAGE_SIZE
  );

  const handleClosePanel = () => {
    setOpen(false);
    setSelectedProduct(null);
    setAnchor(null);
  };

  // ---------- shared panel body ----------
  const renderNotificationPanelContent = () => (
    <div className="gwrap rounded-2xl shadow-xl w-full">
      <div className="glass-card rounded-[18px] overflow-hidden">
        {/* header with title + X close */}
        <div className="cl-head">
          <div className="cl-title">Notifications</div>
          <button
            type="button"
            className="cl-close-btn"
            aria-label="Close notifications"
            onClick={handleClosePanel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex items-center">
          {[
            { key: "products", label: "Products", count: unreadProducts },
            { key: "system", label: "Announcements", count: unreadSystemNotifications },
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

        {/* list body + MOBILE quick view inside panel */}
        <div className="max-h-[55vh] sm:max-h-80 overflow-y-auto bg-white notif-scroll">
          {isMobile && selectedProduct && (
            <div className="px-3 pt-3 pb-3 border-b border-[rgba(0,0,0,0.06)] bg-[#fffaf4]">
              <div
                ref={cardRef}
                className="relative rounded-[14px] p-3 bg-white shadow-sm"
              >
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
                    <strong>Threshold:</strong>{" "}
                    {selectedProduct.threshold ?? "-"} days
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
                      boxShadow: "0 6px 16px rgba(201,124,44,25)",
                      border: "1px solid rgba(255,255,255,6)",
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View in Inventory
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* actual lists */}
          <div className="divide-y">
            {tab === "products" && (
              <div>
                {products.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    No product alerts
                  </div>
                ) : (
                  pagedProducts.map((n) => (
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

            {tab === "system" && (
              <div>
                {systemNotifications.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    No announcements
                  </div>
                ) : (
                  systemNotifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markSystemNotificationAsRead(notif)}
                      className={`w-full p-4 text-left transition-colors ${
                        notif.read
                          ? "bg-white hover:bg-[#fff6ec]"
                          : "bg-[rgba(255,246,236,1)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <UnreadCircle read={notif.read} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-[14px] font-bold ${
                              notif.read ? "text-[#6b4b2b]" : "text-[#4f371f]"
                            }`}>
                              {notif.title}
                            </h4>
                            {notif.priority === "urgent" && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800">
                                URGENT
                              </span>
                            )}
                            {notif.priority === "high" && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800">
                                HIGH
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-[#6b4b2b] whitespace-pre-wrap">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                            <span>{notif.notification_type}</span>
                            {notif.sent_at && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(notif.sent_at).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* pagination + close */}
        {tab === "products" && (
          <div className="px-3 pt-2 pb-2 bg-white border-t border-[rgba(0,0,0,0.04)] text-[#8a5a25]">
            <div className="text-center text-[11px] mb-1">
              Page {productPage} of {productTotalPages}
            </div>
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <button
                onClick={() => setProductPage((p) => (p > 1 ? p - 1 : p))}
                disabled={productPage === 1}
                className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setProductPage((p) => (p < productTotalPages ? p + 1 : p))
                }
                disabled={productPage >= productTotalPages}
                className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="px-3 py-2 text-[11px] text-[#8a5a25] bg-white/70">
          Tip: Click a product alert to view quick details or jump to Inventory.
        </div>
      </div>
    </div>
  );

  // ---------- render ----------
  return (
    <div className="relative inline-block">
      {/* bell */}
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
              boxShadow: "0 6px 16px rgba(201,124,44,35)",
              border: "1px solid rgba(255,255,255,65)",
            }}
          >
            {totalUnread}
          </span>
        )}
      </button>

      {/* NOTIF PANEL */}
      {open && (
        <div className="chatlist-layer" ref={dropdownRef}>
          <div className="chatlist-dropdown">
            {renderNotificationPanelContent()}
          </div>
        </div>
      )}

      {/* QUICK VIEW CARD – DESKTOP ONLY */}
      {selectedProduct && anchor && !isMobile && (
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
                    boxShadow: "0 6px 16px rgba(201,124,44,25)",
                    border: "1px solid rgba(255,255,255,6)",
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