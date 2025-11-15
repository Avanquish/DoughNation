import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Bell, ChevronRight } from "lucide-react";

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

const API = "http://localhost:8000";
const STORAGE_KEY = "readNotifications";
const PAGE_SIZE = 10;

export default function NotificationBell() {
  const [tab, setTab] = useState("donations"); // donations | messages | receivedDonations

  const [donations, setDonations] = useState([]);
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [priorityDonations, setPriorityDonations] = useState([]);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // pagination states
  const [donationPage, setDonationPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);

  // --- helpers for localStorage ---
  const getReadFromStorage = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const saveReadToStorage = (ids) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const sortByNewest = (arr) =>
    [...arr].sort((a, b) => {
      const ad = new Date(
        a.created_at || a.timestamp || a.date || a.createdAt || 0
      ).getTime();
      const bd = new Date(
        b.created_at || b.timestamp || b.date || b.createdAt || 0
      ).getTime();
      return bd - ad; // newest first
    });

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/notifications/charity`, opts);
      let {
        messages: msgs = [],
        donations: dons = [],
        received_donations: rDons = [],
        geofence_notifications: geofences = [],
      } = res.data || {};

      const storedRead = getReadFromStorage();

      // messages
      setMessages(sortByNewest(msgs || []).map((m) => ({ ...m })));

      // priority / geofence
      setPriorityDonations(
        sortByNewest(geofences || []).map((g) => ({
          ...g,
          read: storedRead.includes(g.id),
        }))
      );

      // new uploaded donations
      setDonations(
        sortByNewest(dons || []).map((d) => ({
          ...d,
          read: storedRead.includes(d.id),
        }))
      );

      // received donations (status updates)
      const mapped = sortByNewest(rDons || []).map((d) => {
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
          ...d,
          message,
          read: wasRead,
        };
      });

      setReceivedDonations(mapped);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // mark as read
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
      console.error("Failed to mark notification as read", err);
    }
  };

  // effects
  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 2000);
    return () => clearInterval(iv);
  }, []);

  // reset page when list size changes
  useEffect(() => {
    setDonationPage(1);
  }, [donations.length, priorityDonations.length]);
  useEffect(() => {
    setMessagePage(1);
  }, [messages.length]);
  useEffect(() => {
    setReceivedPage(1);
  }, [receivedDonations.length]);

  // close when clicking outside
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

  // counts
  const unreadCountDonations = donations.filter((d) => !d.read).length;
  const unreadCountMessages = messages.length;
  const unreadCountReceivedDonations = receivedDonations.filter(
    (d) => !d.read
  ).length;
  const totalUnread =
    unreadCountDonations + unreadCountMessages + unreadCountReceivedDonations;

  // avatar helper
  const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
    path ? `${API}/${path}` : fallback;

  // --- pagination math ---
  const combinedDonationList = [...priorityDonations, ...donations];

  const donationTotalPages = Math.max(
    1,
    Math.ceil(combinedDonationList.length / PAGE_SIZE) || 1
  );
  const messageTotalPages = Math.max(
    1,
    Math.ceil(messages.length / PAGE_SIZE) || 1
  );
  const receivedTotalPages = Math.max(
    1,
    Math.ceil(receivedDonations.length / PAGE_SIZE) || 1
  );

  // slice for current page
  const pagedDonations = combinedDonationList.slice(
    (donationPage - 1) * PAGE_SIZE,
    donationPage * PAGE_SIZE
  );
  const pagedMessages = messages.slice(
    (messagePage - 1) * PAGE_SIZE,
    messagePage * PAGE_SIZE
  );
  const pagedReceived = receivedDonations.slice(
    (receivedPage - 1) * PAGE_SIZE,
    receivedPage * PAGE_SIZE
  );

  // --- Click Handlers ---
  const handleDonationClick = (d) => {
    const donationId =
      d.donation_id || d.linked_donation || d.donation?.id || d.id;

    if (!donationId) {
      console.warn("⚠️ No donation_id found for:", d);
      return;
    }

    // Remove from local lists
    if (d.priority || d.status === "pending") {
      setPriorityDonations((prev) => prev.filter((don) => don.id !== d.id));
    } else {
      setDonations((prev) => prev.filter((don) => don.id !== d.id));
    }

    // Switch to Available Donations tab
    window.dispatchEvent(new CustomEvent("switch_to_donation_tab"));

    // Highlight donation after tab switch
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("highlight_donation", {
          detail: { donation_id: donationId },
        })
      );
    }, 800);

    markNotificationAsRead(d.id);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Bell */}
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

      {/* Dropdown – same wrapper style as bakery notif */}
      {open && (
        <div className="chatlist-layer" ref={dropdownRef}>
          <div className="chatlist-dropdown w-[460px] max-w-[90vw]">
            <div className="gwrap rounded-2xl shadow-xl w-full">
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

                {/* LIST AREA */}
                <div className="max-h-80 overflow-y-auto bg-white">
                  {/* Donations (priority + normal) */}
                  {tab === "donations" && (
                    <div>
                      {combinedDonationList.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No donation alerts
                        </div>
                      ) : (
                        <div className="divide-y">
                          {pagedDonations.map((d) => {
                            const isPriority =
                              d.priority === true ||
                              d.type === "geofence" ||
                              priorityDonations.some((pd) => pd.id === d.id);

                            return (
                              <button
                                key={d.id}
                                className={`w-full p-3 flex items-center gap-2 text-left transition-colors ${
                                  d.read
                                    ? "bg-white hover:bg-[#fff6ec]"
                                    : isPriority
                                    ? "bg-[rgba(255,230,230,1)]"
                                    : "bg-[rgba(255,246,236,1)]"
                                }`}
                                onClick={() =>
                                  handleDonationClick({
                                    ...d,
                                    priority: isPriority,
                                  })
                                }
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
                                        : isPriority
                                        ? "text-red-700 font-semibold"
                                        : "text-[#4f371f] font-semibold"
                                    }`}
                                  >
                                    <strong>{d.bakery_name}</strong>: {d.name} (
                                    {d.quantity})
                                    <span className="ml-1 text-xs text-gray-500">
                                      {d.expiration_date &&
                                        `Exp: ${new Date(
                                          d.expiration_date
                                        ).toLocaleDateString()}`}
                                      {d.distance_km != null &&
                                        ` • Approx ${d.distance_km} km`}
                                    </span>
                                  </p>
                                </div>
                                <ChevronRight
                                  className="w-4 h-4 shrink-0"
                                  style={{ color: "#8b6b48" }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Received Donations */}
                  {tab === "receivedDonations" && (
                    <div>
                      {receivedDonations.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No received updates
                        </div>
                      ) : (
                        pagedReceived.map((d) => (
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
                                    new Event(
                                      "highlight_donationStatus_donation"
                                    )
                                  ),
                                100
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
                            <ChevronRight
                              className="w-4 h-4 shrink-0"
                              style={{ color: "#8b6b48" }}
                            />
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Messages */}
                  {tab === "messages" && (
                    <div>
                      {messages.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No messages
                        </div>
                      ) : (
                        pagedMessages.map((m) => (
                          <button
                            key={m.id}
                            className="w-full p-3 flex items-center gap-2 text-left hover:bg-[#fff6ec] transition-colors"
                            onClick={async () => {
                              const peer = {
                                id: m.sender_id,
                                name: m.sender_name,
                                profile_picture:
                                  m.sender_profile_picture || null,
                              };
                              localStorage.setItem(
                                "open_chat_with",
                                JSON.stringify(peer)
                              );
                              try {
                                await markNotificationAsRead(m.id);
                              } catch {}
                              window.dispatchEvent(new Event("open_chat"));
                              setOpen(false);
                              setMessages((prev) =>
                                prev.filter((x) => x.id !== m.id)
                              );
                            }}
                          >
                            <UnreadCircle read={false} />
                            <img
                              src={avatar(m.sender_profile_picture)}
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

                {/* FOOTERS WITH PREV / CLOSE / NEXT (always visible) */}
                {tab === "donations" && (
                  <div className="px-3 pt-2 pb-2 bg-white border-t border-[rgba(0,0,0,0.04)] text-[#8a5a25]">
                    <div className="text-center text-[11px] mb-1">
                      Page {donationPage} of {donationTotalPages}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <button
                        onClick={() =>
                          setDonationPage((p) => (p > 1 ? p - 1 : p))
                        }
                        disabled={
                          donationPage === 1 ||
                          combinedDonationList.length === 0
                        }
                        className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-1 rounded-full border border-[#f2d4b5] bg-[#fffdf7] font-semibold text-[#7a4f1c]"
                      >
                        Close
                      </button>
                      <button
                        onClick={() =>
                          setDonationPage((p) =>
                            p < donationTotalPages ? p + 1 : p
                          )
                        }
                        disabled={
                          donationPage >= donationTotalPages ||
                          combinedDonationList.length === 0
                        }
                        className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {tab === "receivedDonations" && (
                  <div className="px-3 pt-2 pb-2 bg-white border-t border-[rgba(0,0,0,0.04)] text-[#8a5a25]">
                    <div className="text-center text-[11px] mb-1">
                      Page {receivedPage} of {receivedTotalPages}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <button
                        onClick={() =>
                          setReceivedPage((p) => (p > 1 ? p - 1 : p))
                        }
                        disabled={
                          receivedPage === 1 || receivedDonations.length === 0
                        }
                        className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-1 rounded-full border border-[#f2d4b5] bg-[#fffdf7] font-semibold text-[#7a4f1c]"
                      >
                        Close
                      </button>
                      <button
                        onClick={() =>
                          setReceivedPage((p) =>
                            p < receivedTotalPages ? p + 1 : p
                          )
                        }
                        disabled={
                          receivedPage >= receivedTotalPages ||
                          receivedDonations.length === 0
                        }
                        className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {tab === "messages" && (
                  <div className="px-3 pt-2 pb-2 bg-white border-t border-[rgba(0,0,0,0.04)] text-[#8a5a25]">
                    <div className="text-center text-[11px] mb-1">
                      Page {messagePage} of {messageTotalPages}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <button
                        onClick={() =>
                          setMessagePage((p) => (p > 1 ? p - 1 : p))
                        }
                        disabled={messagePage === 1 || messages.length === 0}
                        className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-1 rounded-full border border-[#f2d4b5] bg-[#fffdf7] font-semibold text-[#7a4f1c]"
                      >
                        Close
                      </button>
                      <button
                        onClick={() =>
                          setMessagePage((p) =>
                            p < messageTotalPages ? p + 1 : p
                          )
                        }
                        disabled={
                          messagePage >= messageTotalPages ||
                          messages.length === 0
                        }
                        className="px-3 py-1 rounded-full border border-[#f2d4b5] bg-[#fffaf3] font-semibold disabled:opacity-40 disabled:cursor-default"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className="px-3 py-2 text-[11px] text-[#8a5a25] bg-white/70">
                  Tip: Click a donation to jump to the correct tab and highlight
                  it.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
