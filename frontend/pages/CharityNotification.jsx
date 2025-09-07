import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000";
const STORAGE_KEY = "readNotifications";

export default function NotificationBell() {
  const [tab, setTab] = useState("donations");
  const [donations, setDonations] = useState([]);
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const navigate = useNavigate();

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

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : { withCredentials: true };

      const res = await axios.get(`${API}/notifications/charity`, opts);
      let { messages: msgs, donations: dons, received_donations: rDons } = res.data;

      const storedRead = getReadFromStorage();

      setMessages(msgs.map((m) => ({ ...m, read: storedRead.includes(m.id) })));
      setDonations(dons.map((d) => ({ ...d, read: storedRead.includes(d.id) })));
      
      setReceivedDonations(
        rDons.map((d) => ({
          ...d,
          read: storedRead.includes(d.id),
          message: `${d.bakery_name} accepted your request`
          
        }))
      );
    } catch (err) {
      console.error("Failed to fetch notifications", err);
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
      console.error("Failed to mark notification as read", err);
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
  const unreadCountReceivedDonations = receivedDonations.filter((d) => !d.read).length;
  const totalUnread = unreadCountDonations + unreadCountMessages + unreadCountReceivedDonations;

  return (
    <div className="relative inline-block">
      <button
        ref={bellRef}
        className="relative p-2 text-gray-700 hover:text-gray-900"
        onClick={() => setOpen((s) => !s)}
      >
        <Bell size={24} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50"
        >
          <div className="flex border-b">
            {[
              { key: "donations", label: "New Donation" },
              { key: "messages", label: "Messages" },
              { key: "receivedDonations", label: "Received Donation" },
            ].map((t) => (
              <button
                key={t.key}
                className={`flex-1 py-2 text-sm font-semibold ${
                  tab === t.key ? "bg-gray-200" : "bg-white"
                }`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === "donations" && unreadCountDonations > 0 && (
                  <span className="ml-1 text-red-600">({unreadCountDonations})</span>
                )}
                {t.key === "messages" && unreadCountMessages > 0 && (
                  <span className="ml-1 text-red-600">({unreadCountMessages})</span>
                )}
                {t.key === "receivedDonations" && unreadCountReceivedDonations > 0 && (
                  <span className="ml-1 text-red-600">({unreadCountReceivedDonations})</span>
                )}
              </button>
            ))}
          </div>

          <div className="max-h-60 overflow-y-auto">
            {/* Donations */}
            {tab === "donations" &&
              donations.map((d) => (
                <div
                  key={d.id}
                  className={`p-2 border-b text-sm cursor-pointer ${
                    !d.read ? "bg-gray-400 font-bold" : "bg-white text-gray-700"
                  }`}
                  onClick={() => {
                    localStorage.setItem("highlight_donation", d.donation_id || d.id);
                    window.dispatchEvent(new CustomEvent("switch_to_donation_tab"));
                    setTimeout(
                      () => window.dispatchEvent(new Event("highlight_donation")),
                      100
                    );
                    markNotificationAsRead(d.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    <img
                      src={
                        d.bakery_profile_picture
                          ? `${API}/${d.bakery_profile_picture}`
                          : `${API}/uploads/placeholder.png`
                      }
                      alt={d.bakery_name}
                      className="w-6 h-6 rounded-full mr-2 object-cover"
                    />
                    <div>
                      <strong>{d.bakery_name}</strong>: {d.name} ({d.quantity})
                    </div>
                  </div>
                </div>
              ))}

            {/* Received Donations (direct + accepted cards) */}
            {tab === "receivedDonations" &&
              receivedDonations.map((d) => (
                <div
                  key={d.id}
                  className={`p-2 border-b text-sm cursor-pointer ${
                    !d.read ? "bg-gray-400 font-bold" : "bg-white text-gray-700"
                  }`}
                  onClick={() => {
                    localStorage.setItem("highlight_received_donation", d.donation_id || d.id);
                    window.dispatchEvent(new CustomEvent("switch_to_received_tab"));
                    setTimeout(
                      () => window.dispatchEvent(new Event("highlight_received_donation")),
                      100
                    );
                    markNotificationAsRead(d.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    <img
                      src={
                        d.bakery_profile_picture
                          ? `${API}/${d.bakery_profile_picture}`
                          : `${API}/uploads/placeholder.png`
                      }
                      alt={d.bakery_name}
                      className="w-6 h-6 rounded-full mr-2 object-cover"
                    />
                    <div>
                      {d.quantity ? (
                      <>
                        <strong>{d.bakery_name}</strong>: Send Donation
                      </>
                      ) : (
                      <>
                        <strong>{d.bakery_name}</strong> accepted your request
                      </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

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
                        localStorage.setItem("open_chat_with", JSON.stringify(peer));

                        await markNotificationAsRead(m.id);
                        window.dispatchEvent(new Event("open_chat"));
                        setOpen(false);
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
    </div>
  );
}
