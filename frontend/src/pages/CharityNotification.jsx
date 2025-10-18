import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

<<<<<<< HEAD
=======
// Small unread/read circle indicator
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
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

const API = "https://api.doughnationhq.cloud";
const STORAGE_KEY = "readNotifications";

export default function NotificationBell() {
  const [tab, setTab] = useState("donations");
  const [donations, setDonations] = useState([]);
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [priorityDonations, setPriorityDonations] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const navigate = useNavigate();

<<<<<<< HEAD
=======
  const [priorityDonations, setPriorityDonations] = useState([]);

  const prevRequestStatusRef = useRef({});
  // helpers for localStorage
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
  const getReadFromStorage = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };
  const saveReadToStorage = (ids) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  // ✅ Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };
      const res = await axios.get(`${API}/notifications/charity`, opts);
      const {
        messages: msgs = [],
        donations: dons = [],
        received_donations: rDons = [],
        geofence_notifications: geofences = [],
      } = res.data || {};

      const storedRead = getReadFromStorage();

      setMessages(msgs.map((m) => ({ ...m })));

      setPriorityDonations(
<<<<<<< HEAD
        geofences.map((g) => ({
=======
        (geofences || []).map((g) => ({
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
          ...g,
          read: storedRead.includes(g.id),
        }))
      );

      setDonations(
<<<<<<< HEAD
        dons.map((d) => ({
=======
        (dons || []).map((d) => ({
          ...d,
          read: storedRead.includes(d.id),
        }))
      );

      // Build "Received" rows based on real status
      const nextStatusMap = {};

      // Use backend "type" field to decide message
      const mapped = (rDons || []).map((d) => {
        let message;
        switch (d.type) {
          case "direct":
            message = `${d.bakery_name} sent a donation`;
            break;
          case "request":
            message = `${d.bakery_name} accepted your request`;
            break;
          case "request_declined":
            message = `${d.bakery_name} declined your request`;
            break;
          default:
            message = `Update from ${d.bakery_name}`;
        }

        const wasRead = storedRead.includes(d.id);

        return {
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
          ...d,
          read: storedRead.includes(d.id),
        }))
      );

      setReceivedDonations(
        rDons.map((d) => ({
          ...d,
          read: storedRead.includes(d.id),
          message:
            d.type === "direct"
              ? `${d.bakery_name} sent a donation`
              : d.type === "request"
              ? `${d.bakery_name} accepted your request`
              : d.type === "request_declined"
              ? `${d.bakery_name} declined your request`
              : `Update from ${d.bakery_name}`,
        }))
      );
    } catch (err) {
      console.error("❌ Failed to fetch notifications", err);
    }
  };

  const markNotificationAsRead = async (id) => {
    const stored = getReadFromStorage();
    if (!stored.includes(id)) saveReadToStorage([...stored, id]);

    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };
      await axios.patch(`${API}/notifications/${id}/read`, {}, opts);
    } catch (err) {
      console.error("❌ Failed to mark notification as read", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        bellRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCountDonations = donations.filter((d) => !d.read).length;
  const unreadCountMessages = messages.length;
  const unreadCountReceivedDonations = receivedDonations.filter(
    (d) => !d.read
  ).length;
  const totalUnread =
    unreadCountDonations + unreadCountMessages + unreadCountReceivedDonations;

  const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
    path ? `${API}/${path}` : fallback;

<<<<<<< HEAD
  // ✅ FIXED — click handler for geofence / priority donation
  const handlePriorityDonationClick = (d) => {
    markNotificationAsRead(d.id);
    setOpen(false);

    // Save donation ID for donation tab
    localStorage.setItem("highlight_donation", d.id);

    // 🔹 1️⃣ Switch to donation tab (for UI in parent)
    window.dispatchEvent(new CustomEvent("switch_to_donation_tab"));

    // 🔹 2️⃣ Wait a bit then trigger modal open
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("open_donation_modal", {
          detail: { donationId: d.id },
        })
      );
    }, 400);
  };

  const handleNormalDonationClick = (d) => {
    markNotificationAsRead(d.id);
    setOpen(false);

    localStorage.setItem("highlight_donation", d.donation_id || d.id);
    window.dispatchEvent(new CustomEvent("switch_to_donation_tab"));

    setTimeout(() => {
      window.dispatchEvent(new Event("highlight_donation"));
    }, 200);
=======
  // --- Click Handlers ---
  const handleNormalDonationClick = (d) => {
    // remove it from the state
    setDonations((prev) => prev.filter((don) => don.id !== d.id));

    // still navigate + mark read
    localStorage.setItem("highlight_donation", d.donation_id || d.id);
    window.dispatchEvent(new CustomEvent("switch_to_donation_tab"));
    setTimeout(
      () => window.dispatchEvent(new Event("highlight_donation")),
      100
    );
    markNotificationAsRead(d.id);
    setOpen(false);
  };

  const handlePriorityDonationClick = (d) => {
    if (d.status === "pending") {
      // remove if pending
      setPriorityDonations((prev) => prev.filter((don) => don.id !== d.id));
    }

    // navigate + mark read
    localStorage.setItem("highlight_donation", d.id);
    window.dispatchEvent(new CustomEvent("switch_to_donation_tab"));
    setTimeout(
      () => window.dispatchEvent(new Event("highlight_donation")),
      100
    );
    markNotificationAsRead(d.id);
    setOpen(false);
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
  };

  return (
    <div className="relative inline-block">
      {/* Bell Icon */}
      <button
        ref={bellRef}
        className="icon-btn"
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen((s) => !s)}
      >
        <Bell className="w-[18px] h-[18px] text-black" />
        {totalUnread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 text-[10px] font-extrabold leading-none px-[6px] py-[3px] rounded-full text-white"
            style={{
              background: "linear-gradient(90deg, #E49A52, #BF7327)",
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
          ref={dropdownRef}
          className="absolute right-0 mt-2 z-[9998] w-[460px] max-w-[90vw]"
        >
          <div className="gwrap rounded-2xl shadow-xl">
            <div className="glass-card rounded-[14px] overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center">
                {[
                  {
                    key: "donations",
                    label: "Donations",
                    count: unreadCountDonations,
                  },
                  {
                    key: "messages",
                    label: "Messages",
                    count: unreadCountMessages,
                  },
                  {
                    key: "receivedDonations",
                    label: "Received",
                    count: unreadCountReceivedDonations,
                  },
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
                              "linear-gradient(90deg, #F6C17C, #E49A52, #BF7327)",
                          }
<<<<<<< HEAD
                        : {}
=======
                        : { background: "transparent" }
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
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

              {/* Content */}
              <div className="max-h-80 overflow-y-auto">
<<<<<<< HEAD
                {tab === "donations" && (
                  <div>
                    {/* Geofence / Priority Donations */}
=======
                {/* Donations */}
                {tab === "donations" && (
                  <div>
                    {/* Priority Donations */}
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                    {priorityDonations.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50">
                          Priority: Expiring Donations
                        </div>
                        <div className="divide-y">
                          {priorityDonations.map((d) => (
                            <button
                              key={d.id}
                              className={`w-full p-3 flex items-center gap-2 text-left transition-colors ${
                                d.read
                                  ? "bg-white hover:bg-[#fff6ec]"
                                  : "bg-[rgba(255,230,230,1)]"
                              }`}
                              onClick={() => handlePriorityDonationClick(d)}
                            >
                              <UnreadCircle read={d.read} />
                              <img
                                src={avatar(d.bakery_profile_picture)}
                                alt={d.bakery_name}
                                className="w-8 h-8 rounded-full object-cover border"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[13px] leading-tight ${
                                    d.read
                                      ? "text-[#6b4b2b]"
                                      : "text-red-700 font-semibold"
                                  }`}
                                >
                                  <strong>{d.bakery_name}</strong>: {d.name} (
                                  {d.quantity}){" "}
                                  <span className="ml-1 text-xs text-gray-500">
                                    Exp:{" "}
                                    {new Date(
                                      d.expiration_date
                                    ).toLocaleDateString()}{" "}
                                    {d.distance_km != null &&
<<<<<<< HEAD
                                      `• ${d.distance_km} km`}
                                  </span>
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 shrink-0 text-[#8b6b48]" />
=======
                                      `• Approx ${d.distance_km} km`}
                                  </span>
                                </p>
                              </div>
                              <ChevronRight
                                className="w-4 h-4 shrink-0"
                                style={{ color: "#8b6b48" }}
                              />
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Normal Donations */}
                    <div>
                      <div className="px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50">
                        New Uploaded Donations
                      </div>
                      {donations.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No donation alerts
                        </div>
                      ) : (
                        <div className="divide-y">
                          {donations.map((d) => (
                            <button
                              key={d.id}
                              className={`w-full p-3 flex items-center gap-2 text-left transition-colors ${
                                d.read
                                  ? "bg-white hover:bg-[#fff6ec]"
                                  : "bg-[rgba(255,246,236,1)]"
                              }`}
<<<<<<< HEAD
                              onClick={() => handleNormalDonationClick(d)}
=======
                              onClick={() => {
                                localStorage.setItem(
                                  "highlight_donation",
                                  d.donation_id || d.id
                                );
                                window.dispatchEvent(
                                  new CustomEvent("switch_to_donation_tab")
                                );
                                setTimeout(
                                  () =>
                                    window.dispatchEvent(
                                      new Event("highlight_donation")
                                    ),
                                  100
                                );
                                markNotificationAsRead(d.id);
                                setOpen(false);
                              }}
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                            >
                              <UnreadCircle read={d.read} />
                              <img
                                src={avatar(d.bakery_profile_picture)}
                                alt={d.bakery_name}
                                className="w-8 h-8 rounded-full object-cover border"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[13px] leading-tight ${
                                    d.read
                                      ? "text-[#6b4b2b]"
                                      : "text-[#4f371f] font-semibold"
                                  }`}
                                >
                                  <strong>{d.bakery_name}</strong>: {d.name} (
                                  {d.quantity})
<<<<<<< HEAD
                                  {d.distance_km && (
                                    <span className="ml-1 text-xs text-gray-400">
                                      • {d.distance_km} km
=======
                                  {d.distance_km != null && (
                                    <span className="ml-1 text-xs text-gray-400">
                                      • Approx {d.distance_km} km
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                                    </span>
                                  )}
                                </p>
                              </div>
<<<<<<< HEAD
                              <ChevronRight className="w-4 h-4 shrink-0 text-[#8b6b48]" />
=======
                              <ChevronRight
                                className="w-4 h-4 shrink-0"
                                style={{ color: "#8b6b48" }}
                              />
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

<<<<<<< HEAD
=======
                {/* Received Donations */}
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                {tab === "receivedDonations" && (
                  <div>
                    {receivedDonations.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No received updates
                      </div>
                    ) : (
                      receivedDonations.map((d) => (
                        <button
                          key={d.id}
                          className={`w-full p-3 flex items-center gap-2 text-left transition-colors ${
                            d.read
                              ? "bg-white hover:bg-[#fff6ec]"
                              : "bg-[rgba(255,246,236,1)]"
                          }`}
                          onClick={() => {
                            localStorage.setItem(
                              "highlight_donationStatus_donation",
                              d.donation_id || d.id
                            );
                            window.dispatchEvent(
                              new CustomEvent("switch_to_donationStatus_tab")
                            );
                            setTimeout(
                              () =>
                                window.dispatchEvent(
                                  new Event("highlight_donationStatus_donation")
                                ),
<<<<<<< HEAD
                              200
=======
                              100
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                            );
                            markNotificationAsRead(d.id);
                            setOpen(false);
                          }}
                        >
                          <UnreadCircle read={d.read} />
                          <img
                            src={avatar(d.bakery_profile_picture)}
                            alt={d.bakery_name}
                            className="w-8 h-8 rounded-full object-cover border"
                          />
<<<<<<< HEAD
=======

>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[13px] leading-tight ${
                                d.read
                                  ? "text-[#6b4b2b]"
                                  : "text-[#4f371f] font-semibold"
                              }`}
                            >
                              {d.message}
                            </p>
                          </div>
<<<<<<< HEAD
                          <ChevronRight className="w-4 h-4 shrink-0 text-[#8b6b48]" />
=======
                          <ChevronRight
                            className="w-4 h-4 shrink-0"
                            style={{ color: "#8b6b48" }}
                          />
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
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
                          className="w-full p-3 flex items-center gap-2 text-left hover:bg-[#fff6ec] transition-colors"
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
<<<<<<< HEAD
                            await markNotificationAsRead(m.id);
=======
                            try {
                              await markNotificationAsRead(m.id);
                            } catch {}
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                            window.dispatchEvent(new Event("open_chat"));
                            setMessages((prev) =>
                              prev.filter((x) => x.id !== m.id)
                            );
                            setOpen(false);
<<<<<<< HEAD
=======
                            setMessages((prev) =>
                              prev.filter((x) => x.id !== m.id)
                            );
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                          }}
                        >
                          <UnreadCircle read={false} />
                          <img
                            src={avatar(m.sender_profile_picture)}
                            alt={m.sender_name}
                            className="w-8 h-8 rounded-full object-cover border"
                          />
<<<<<<< HEAD
=======

>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
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
<<<<<<< HEAD
                          <ChevronRight className="w-4 h-4 shrink-0 text-[#8b6b48]" />
=======
                          <ChevronRight
                            className="w-4 h-4 shrink-0"
                            style={{ color: "#8b6b48" }}
                          />
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="px-3 py-2 text-[11px] text-[#8a5a25] bg-white/70">
<<<<<<< HEAD
                Tip: Click a donation to jump to the correct tab and open it.
=======
                Tip: Click a donation to jump to the correct tab and highlight
                it.
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
