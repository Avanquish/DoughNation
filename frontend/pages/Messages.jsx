import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

export default function Messenger({ setActiveTab, setHighlightedDonationId }) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [pendingCards, setPendingCards] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem("chat_messages");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChats, setActiveChats] = useState(() => {
    try {
      const raw = localStorage.getItem("active_chats");
      return raw
        ? new Map(Object.entries(JSON.parse(raw)).map(([k, v]) => [Number(k), v]))
        : new Map();
    } catch {
      return new Map();
    }
  });

  const wsRef = useRef(null);
  const listRef = useRef(null);
  const typingTimer = useRef(null);

  // Decode current user from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setCurrentUser({
        id: Number(decoded.sub),
        role: decoded.role.toLowerCase(),
        email: decoded.email || "",
        name: decoded.name || "",
      });
    } catch (err) {
      console.error("Failed to decode token:", err);
    }
  }, []);

  // Persist messages and activeChats
  useEffect(() => {
    try {
      localStorage.setItem("chat_messages", JSON.stringify(messages));
    } catch {}
  }, [messages]);

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

  useEffect(() => {
    try {
      const obj = {};
      for (const [k, v] of activeChats.entries()) obj[k] = v;
      localStorage.setItem("active_chats", JSON.stringify(obj));
    } catch {}
  }, [activeChats]);

  // Open chat if triggered by external event (donation request)
  useEffect(() => {
    if (!currentUser) return;

    const handler = () => {
      try {
        const raw = localStorage.getItem("open_chat_with");
        if (!raw) return;
        const peer = JSON.parse(raw);

        setOpen(true);
        setSelectedUser(peer);

        const donationRaw = localStorage.getItem("send_donation");
        if (donationRaw && wsRef.current?.readyState === WebSocket.OPEN) {
          const donation = JSON.parse(donationRaw);
          sendDonationCard(donation, peer);
          localStorage.removeItem("send_donation");
        }
      } catch (err) {
        console.error("Failed to open chat:", err);
      }
    };

    window.addEventListener("open_chat", handler);
    return () => window.removeEventListener("open_chat", handler);
  }, [currentUser]);

  // Clear notification for this charity when chat is opened directly
useEffect(() => {
  if (!selectedUser || !currentUser) return;

  // Reset unread count in sidebar instantly
  setActiveChats((prev) => {
    const newMap = new Map(prev);
    if (newMap.has(selectedUser.id)) {
      const chat = newMap.get(selectedUser.id);
      newMap.set(selectedUser.id, { ...chat, unread: 0 });
    }
    return newMap;
  });

  //  Mark notification as read on backend
  const token = localStorage.getItem("token");
  const opts = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : { withCredentials: true };

  const notifId = `msg-${selectedUser.id}`;

  axios
    .patch(`${API_URL}/notifications/${notifId}/read`, {}, opts)
    .then(() => {
      console.log("Cleared notification for", notifId);
      window.dispatchEvent(new Event("refresh_notifications"));
    })
    .catch((err) => console.error("Failed to clear notification:", err));
}, [selectedUser, currentUser]);


  // WebSocket setup
  useEffect(() => {
    if (!currentUser || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) return;

    let reconnectTimerId;

    const connectWS = () => {
      const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws/messages/${currentUser.id}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnecting(false);
        ws.send(JSON.stringify({ type: "get_active_chats" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "message":
              setMessages((prev) => [
                ...prev,
                {
                  id: Number(data.id),
                  sender_id: Number(data.sender_id),
                  receiver_id: Number(data.receiver_id),
                  content: data.content,
                  image: data.image,
                  video: data.video,
                  timestamp: data.timestamp,
                  is_read: data.is_read,
                },
              ]);

              // Only for charity receiving confirmed donation
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
                  const isDuplicate = existing.some(d => d.id === parsed.donation.id);
                  if (!isDuplicate) {
                    const updated = [...existing, parsed.donation];
                    localStorage.setItem(key, JSON.stringify(updated));
                    setReceivedDonations(updated);
                  }
                }
              } catch {}

              break;

            case "delete_message":
              setMessages((prev) => prev.filter((m) => m.id !== data.id));
              break;

             case "donation_accepted":
              setMessages(prev => prev.map(m => m.id === data.id ? { ...m, accepted: true } : m));
              break;

             case "donation_cancelled":
              setMessages(prev => prev.filter(m => {
                try {
                  const parsed = JSON.parse(m.content);
                    return !(parsed?.donation?.id === data.donation_id && parsed.type === "donation_card");
                } catch { return true; }
             }));
              break;

            case "history":
              setMessages(data.messages.map(m => ({
                ...m,
                id: Number(m.id),
                sender_id: Number(m.sender_id),
                receiver_id: Number(m.receiver_id),
              })));
              break;

            case "active_chats":
              setActiveChats(() => {
                const newMap = new Map();
                for (const c of data.chats) {
                  if (c.peer) {
                    newMap.set(c.peer.id, { ...c.peer, ...c, unread: c.unread || 0 });
                  }
                }
                return newMap;
              });
              break;

            case "active_chats_update":
              setActiveChats((prev) => {
                const newMap = new Map(prev);
                if (data.chat?.peer) {
                  const prevChat = newMap.get(data.chat.peer.id) || {};
                  newMap.set(data.chat.peer.id, {
                    ...prevChat,
                    ...data.chat.peer,
                    ...data.chat,
                    unread: prevChat.unread || 0,
                  });
                }
                return newMap;
              });
              break;

            case "typing":
              if (data.sender_id !== currentUser.id) setPeerTyping(true);
              break;

            case "stop_typing":
              if (data.sender_id !== currentUser.id) setPeerTyping(false);
              break;

            case "search_results":
              setSearchResults(data.results || []);
              break;

            default:
              console.warn("Unknown WS message type:", data.type);
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      ws.onclose = () => {
        setConnecting(true);
        reconnectTimerId = setTimeout(connectWS, 2000);
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerId) clearTimeout(reconnectTimerId);
    };
  }, [currentUser]);

  // Pre-filter messages for selected user
  const filteredMessages = useMemo(() => {
    if (!selectedUser || !currentUser) return [];
    return messages.filter(
      (m) =>
        (Number(m.sender_id) === Number(currentUser.id) && Number(m.receiver_id) === Number(selectedUser.id)) ||
        (Number(m.sender_id) === Number(selectedUser.id) && Number(m.receiver_id) === Number(currentUser.id))
    );
  }, [messages, selectedUser, currentUser]);

  // Instant scroll when selecting user
  useEffect(() => {
    if (!selectedUser || !listRef.current) return;

    // Scroll to bottom immediately
    setTimeout(() => {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 0);

    // Mark unread as read instantly
    setActiveChats((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(selectedUser.id)) newMap.get(selectedUser.id).unread = 0;
      return newMap;
    });

    // Fetch latest history from server in background
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "get_history", peer_id: selectedUser.id }));
    }
  }, [selectedUser]);
 

  // Auto-scroll when new message or peer typing
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;

     // Scroll twice: once immediately, once in next animation frame
    scroll();
    requestAnimationFrame(scroll);
  }, [filteredMessages, peerTyping]);

  // Auto Scroll if click the message button 💬
  useEffect(() => {
  if (open && listRef.current) {
    const scroll = () => {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    };

    // Scroll twice: once immediately, once in next animation frame
    scroll();
    requestAnimationFrame(scroll);
  }
}, [open, filteredMessages]);

// Track scroll position
useEffect(() => {
  if (!listRef.current) return;

  const handleScroll = () => {
    const el = listRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollButton(!isAtBottom); // show button if NOT at bottom
  };

  const el = listRef.current;
  el.addEventListener("scroll", handleScroll);

  // Initial check
  handleScroll();

  return () => el.removeEventListener("scroll", handleScroll);
}, [listRef, filteredMessages]);

  // Typing events
  useEffect(() => {
    if (!wsRef.current || !selectedUser || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (newMessage) {
      wsRef.current.send(
        JSON.stringify({ type: "typing", sender_id: currentUser.id, receiver_id: selectedUser.id })
      );
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      wsRef.current?.send(
        JSON.stringify({ type: "stop_typing", sender_id: currentUser.id, receiver_id: selectedUser.id })
      );
    }, 800);
  }, [newMessage, currentUser, selectedUser]);
  
  // Search
  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "search",
        target: currentUser.role === "charity" ? "bakeries" : "charities",
        query: q
      }));
    }
  };

  // Send message
const sendMessage = () => {
  if (!newMessage.trim() && !videoFile) return;
  if (!selectedUser || !currentUser) return;

  // Prepare basic message payload
  const msg = {
    type: "message",
    sender_id: Number(currentUser.id),
    receiver_id: Number(selectedUser.id),
  };

  if (videoFile) {
    // Handle image/video file
    const reader = new FileReader();
    reader.onload = () => {
      const mediaData = reader.result.split(",")[1];
      msg.media = mediaData;
      msg.media_type = videoFile.type;
      msg.content = newMessage.trim() || "";

      // Send via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      }

      // Clear input
      setNewMessage("");
      setVideoFile(null);
    };
    reader.readAsDataURL(videoFile);
  } else {
    // Text-only message
    msg.content = newMessage.trim();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }

    setNewMessage("");
  }
};

  // Send donation card
  const sendDonationCard = (donation, peer = selectedUser) => {
  if (!peer || !currentUser) return;

  const msg = {
    type: "message",
    sender_id: Number(currentUser.id), // charity sending request
    receiver_id: Number(peer.id), // bakery receiving
    content: JSON.stringify({ type: "donation_card", donation, originalCharityId: currentUser.id }),
  };

  wsRef.current.send(JSON.stringify(msg));

  // Only append locally **if current user is the sender**
  if (currentUser.role === "charity") {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender_id: currentUser.id,
        receiver_id: peer.id,
        content: JSON.stringify({ type: "donation_card", donation, originalCharityId: currentUser.id }),
        timestamp: new Date().toISOString(),
        is_read: false,
      },
    ]);
  }
};

  // Accept donation and send copy to charity "Received" tab
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

  // Call backend to mark request as accepted
  try {
    const token = localStorage.getItem("token");
    const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    await axios.post(`${API_URL}/donation/accept/${donation.id}`, {}, opts);
  } catch (err) {
    console.error("Failed to mark donation as accepted:", err);
  }

  //  Send confirmation message to charity
  const msg = {
    type: "message",
    sender_id: Number(currentUser.id),
    receiver_id: Number(originalCharityId),
    content: JSON.stringify({ type: "confirmed_donation", donation }),
  };
  wsRef.current?.send(JSON.stringify(msg));

  //  Update local state
  setMessages((prev) =>
    prev.map((m) => {
      try {
        const parsed = JSON.parse(m.content);
        if (parsed.donation?.id === donation.id && parsed.type === "donation_card") {
          return { ...m, accepted: true };
        }
      } catch {}
      return m;
    })
  );

  //  Persist accepted donations locally
  const key = `accepted_donations_${currentUser.id}`;
  const raw = localStorage.getItem(key);
  const accepted = raw ? JSON.parse(raw) : [];
  if (!accepted.includes(donation.id)) {
    accepted.push(donation.id);
    localStorage.setItem(key, JSON.stringify(accepted));
  }
};

  // Delete message for everyone
  const deleteMessage = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "delete_message", id }));
    }
  };

  // Delete message only user not everyone
const deleteForMe = (id) => {
  setMessages((prev) => prev.filter((m) => m.id !== id));
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({ type: "delete_for_me", id }));
  }
};

//  Track pending donation cards
useEffect(() => {
  const cards = messages.filter((m) => {
    try {
      const parsed = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
      return parsed?.type === "donation_card" && !m.accepted; // only unaccepted
    } catch {
      return false;
    }
  });
  setPendingCards(cards);
}, [messages]);

  // Sidebar summaries
  const summaries = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const peerId = m.sender_id === currentUser?.id ? m.receiver_id : m.sender_id;
      if (!peerId) continue;
      const entry = map.get(peerId) || { last: null, unread: 0 };
      if (!entry.last || new Date(m.timestamp) > new Date(entry.last.timestamp)) {
        entry.last = m;
      }
      if (m.receiver_id === currentUser?.id && !m.is_read) entry.unread += 1;
      map.set(peerId, entry);
    }
    return map;
  }, [messages, currentUser?.id]);

  const sidebarUsers = useMemo(() => {
    if (search.trim() !== "") return searchResults;
    return Array.from(activeChats.values());
  }, [search, searchResults, activeChats]);

  const totalUnread = useMemo(() => {
  let sum = 0;
  activeChats.forEach((chat) => {
    sum += chat.unread || 0;
  });
  return sum;
}, [activeChats]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg text-2xl flex items-center justify-center z-50"
      >
        💬
      {totalUnread > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
        {totalUnread}
      </span>
      )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 w-[700px] h-[500px] bg-white shadow-2xl rounded-2xl border flex overflow-hidden z-50">
          {/* Sidebar */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder={`Search ${currentUser?.role === "charity" ? "bakeries" : "charities"}...`}
                value={search}
                onChange={handleSearch}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarUsers.length === 0 ? (
                <p className="p-3 text-gray-500">
                  {search.trim() !== "" ? "No results found" : "Start chatting"}
                </p>
              ) : (
                sidebarUsers.map((u) => {
                  const sum = summaries.get(u.id);
                  const lastText = (() => {
                    const last = sum?.last || u.last_message;
                      if (!last) return "No messages yet";

                         try {
                            const parsed = JSON.parse(last.content);
                            if (parsed.type === "donation_card") {
                            return "Donation Request";
                          }
                          } catch {
                                  // Not JSON, just plain text
                          }

                          try {
                            const parsed = JSON.parse(last.content);
                            if (parsed.type === "confirmed_donation") {
                            return "Donation Request Confirmed";
                          }
                          } catch {
                                  // Not JSON, just plain text
                          }

                      if (last.image) return "Sent Image";
                      if (last.video) return "Sent Video";
                        return last.content || "No messages yet";
                  })();
                  const unreadCount = sum?.unread ?? u.unread ?? 0;
                  return (
                    <div
                      key={u.id}
                      className={`p-3 flex items-center cursor-pointer hover:bg-gray-100 ${selectedUser?.id === u.id ? "bg-gray-200" : ""}`}
                      onClick={() => {
                        // Logit the can't allowed to click user in sidebar if there's an open chat need to close chat
                        if ((filteredMessages.length > 0) || newMessage.trim() !== "") {
                        return;
                        }
                        setSelectedUser(u);
                        }}
                    >
                      <img
                        src={u.profile_picture ? `${API_URL}/${u.profile_picture}` : "/default.png"}
                        alt={u.name}
                        className="w-10 h-10 rounded-full mr-2"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500 truncate">{lastText}</div>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                <div className="border-b p-3 font-medium flex items-center">
                  <button onClick={() => setSelectedUser(null)} className="ml-3 mr-4 text-3xl text-black font-bold">←</button>
                  <img
                    src={selectedUser.profile_picture ? `${API_URL}/${selectedUser.profile_picture}` : "/default.png"}
                    className="w-10 h-10 rounded-full mr-2"
                  />
                  <div className="truncate">{selectedUser.name}</div>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto text-gray-600 hover:text-black">✖</button>
                  {connecting && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
                </div>

                {/* Dropdown for pending donation requests */}
                {pendingCards.length > 0 && (
                  <div className="px-3 py-2 border-b bg-yellow-50">
                    <details>
                      <summary className="cursor-pointer font-semibold text-yellow-800">
                        Pending Donation Requests ({pendingCards.length})
                      </summary>
                      <ul className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {pendingCards.map((m) => {
                          let donation = null;
                          try {
                            const parsed = JSON.parse(m.content);
                            donation = parsed?.donation;
                          } catch {}
                          if (!donation) return null;

                          return (
                            <li
                              key={`dropdown-${m.id}`}
                              className="cursor-pointer hover:bg-yellow-200 p-2 rounded"
                              onClick={(e) => {
                                setHighlightedId(m.id);
                                const el = document.getElementById(`msg-${m.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                                //  Close the dropdown
                              const details = e.currentTarget.closest("details");
                                if (details) details.open = false;
                            }}
                            >
                              <span className="font-medium">{donation.name}</span>{" "}
                              <span className="text-sm text-gray-600">(Qty: {donation.quantity})</span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </div>
                )}

                 {/* Floating scroll-to-bottom button */}
                 {showScrollButton && (
                <div className="absolute bottom-15 right-45 -translate-x-1/2 z-20">
                  <button
                    onClick={() => {
                      if (listRef.current) {
                        listRef.current.scrollTo({
                        top: listRef.current.scrollHeight,
                        behavior: "smooth",
                      });
                    }
                  }}
                  className="flex items-center text-3xl bg-transparent text-yellow-900 px-4 py-2 rounded-full shadow-md hover:bg-gray-300"
                  > ↓ </button>
                </div>
                 )}
                
                <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {currentUser && selectedUser && filteredMessages.map((m) => {
                    const isSent = Number(m.sender_id) === Number(currentUser.id);

                        // Parse content
                        let content;
                        try {
                          const parsed = JSON.parse(m.content);
                          if (parsed.type === "donation_card") {
                            const donation = parsed.donation;
                            content = (
                              <Card 
                              id={`msg-${m.id}`} //scroll target
                              className={`shadow-lg rounded-2xl mt-2 ${
                              highlightedId === m.id ? "ring-4 ring-yellow-400" : ""
                            }`}>
                                <CardContent className="p-4">
                                  {donation.image ? (
                                    <img src={`${API_URL}/${donation.image}`} alt={donation.name} className="h-40 w-full object-cover" />
                                  ) : (
                                    <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
                                  )}
                                  <h2 className="text-lg font-semibold mt-2">{donation.name}</h2>
                                  <p className="text-sm text-gray-500">From {donation.bakery_name}</p>
                                  <p className="text-sm">Quantity: {donation.quantity}</p>
                                  {donation.expiration_date && (
                                    <p className="text-sm text-red-500">Expires: {donation.expiration_date}</p>
                                  )}

                                  <p> I want to claim this products</p>

                                 {/* Buttons only visible to bakery */}
                                {currentUser?.role === "bakery" && (
                                  <>
                                    <div>
                                      <button 
                                        className="bg-blue-500 text-white px-3 py-1 rounded mt-2"
                                        onClick={() => {
                                          setHighlightedDonationId(donation.id); // pass id
                                          setActiveTab("donations"); // switch tab
                                        }}
                                        >View product</button>
                                    </div>
                                    <div>
                                      <button 
                                        className="bg-green-500 text-white px-3 py-1 rounded mt-2"
                                        onClick={() => acceptDonation(m)}
                                      >Accept</button>
                                    </div>
                                  </>
                                )}
                                </CardContent>
                              </Card>
                            );
                          } else if (parsed.type === "confirmed_donation") {
                            const donation = parsed.donation;
                              content = (
                              <Card className="shadow-md rounded-xl border border-green-500 mt-2 bg-green-50">
                                <CardContent className="p-4">
                                    <h2 className="text-lg font-semibold text-green-700">{donation.name}</h2>
                                    <p className="text-sm text-gray-600">Quantity: {donation.quantity}</p>
                                    <p className="text-sm text-green-600 font-medium"> Confirmed </p>
                                </CardContent>
                              </Card>
                          );
                          } else {
                            content = <div>{m.content}</div>;
                          }
                        } catch {
                          content = <div>{m.content}</div>;
                        }

                        return (
                          <div key={m.id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                            <div className={`relative px-3 py-2 rounded-lg max-w-xs break-words ${isSent ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
                              {content}

                              {m.image && <img src={`${API_URL}${m.image}`} className="mt-2 rounded max-w-full" />}
                              {m.video && <video controls src={`${API_URL}${m.video}`} className="mt-2 rounded max-w-full" />}

                              <div className={`text-[10px] opacity-75 mt-1 text-right ${!isSent ? "text-gray-600" : ""}`}>
                                {formatTime(m.timestamp)} {isSent && (m.is_read ? "✓✓" : "✓")}
                              </div>

                              {isSent && (
                                <div className="absolute top-0 -left-6">
                                  <button className="p-1 text-gray-500 hover:text-black"
                                    onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}>⋮</button>
                                  {menuOpenId === m.id && (
                                    <div className="absolute right-0 mt-1 w-24 bg-gray-500 border rounded shadow-lg text-sm z-10 w-40">
                                      {/* Delete message for single  not everyone*/}
                                        <button
                                          onClick={() => { deleteForMe(m.id); setMenuOpenId(null); }}
                                          className="block w-full text-left px-3 py-1 hover:bg-gray-400 whitespace-nowrap"
                                        > Delete </button>

                                      {/* Delete message for evryone */}
                                      <button
                                        onClick={() => { deleteMessage(m.id); setMenuOpenId(null); }}
                                        className="block w-full text-left px-3 py-1 hover:bg-gray-400">Delete For Everyone</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  }
                  {peerTyping && <div className="text-xs text-gray-500">{selectedUser.name} is typing…</div>}
                </div>

                <div className="border-t p-2 flex items-center bg-white border rounded">
                  <label className="cursor-pointer mr-2 p-2 rounded-full hover:bg-gray-100">
                    📎
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) setVideoFile(file);
                    }} />
                  </label>

                  <input className="flex-1 border rounded px-2 py-1 mr-2"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message…" />

                  <button onClick={sendMessage} className="bg-blue-500 text-white px-4 py-1 rounded">Send</button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
