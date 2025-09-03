import React, { useState, useEffect, useMemo, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

export default function Messenger() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
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

  // persist messages and activeChats
  useEffect(() => {
    try {
      localStorage.setItem("chat_messages", JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to persist chat messages:", err);
    }
  }, [messages]);

  useEffect(() => {
    try {
      const obj = {};
      for (const [k, v] of activeChats.entries()) obj[k] = v;
      localStorage.setItem("active_chats", JSON.stringify(obj));
    } catch (err) {
      console.error("Failed to persist active chats:", err);
    }
  }, [activeChats]);

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

  // WebSocket setup
  useEffect(() => {
    if (!currentUser) return;
    let reconnectTimerId;

    const connectWS = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
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
                  timestamp: data.timestamp,
                  is_read: data.is_read,
                },
              ]);
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

  // Fetch history when selecting a user
  useEffect(() => {
    if (selectedUser && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "get_history", peer_id: selectedUser.id })
      );
      setActiveChats((prev) => {
        const newMap = new Map(prev);
        if (newMap.has(selectedUser.id)) {
          newMap.get(selectedUser.id).unread = 0;
        }
        return newMap;
      });
    }
  }, [selectedUser, currentUser]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, peerTyping]);

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
  if (!newMessage.trim() || !selectedUser || wsRef.current?.readyState !== WebSocket.OPEN) return;

  const msg = {
    type: "message",
    sender_id: Number(currentUser.id),
    receiver_id: Number(selectedUser.id),
    content: newMessage.trim(),
  };

  // Send via WebSocket only
  wsRef.current.send(JSON.stringify(msg));
  setNewMessage(""); // clear input
};


  // Sidebar users
  const sidebarUsers = useMemo(() => {
    if (search.trim() !== "") return searchResults;
    return Array.from(activeChats.values());
  }, [search, searchResults, activeChats]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg text-2xl flex items-center justify-center z-50"
      >
        💬
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
                  const lastText = sum?.last?.content || u.last_message?.content || "No messages yet";
                  const unreadCount = sum?.unread ?? u.unread ?? 0;
                  return (
                    <div
                      key={u.id}
                      className={`p-3 flex items-center cursor-pointer hover:bg-gray-100 ${
                        selectedUser?.id === u.id ? "bg-gray-200" : ""
                      }`}
                      onClick={() => setSelectedUser(u)}
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
                  <button onClick={() => setOpen(false)} className="ml-auto text-gray-600 hover:text-black">✖</button>
                  {connecting && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {currentUser && selectedUser &&
                  messages
                    .filter(
                      (m) =>
                          (Number(m.sender_id) === Number(currentUser.id) && Number(m.receiver_id) === Number(selectedUser.id)) ||
                          (Number(m.sender_id) === Number(selectedUser.id) && Number(m.receiver_id) === Number(currentUser.id))
                    )
                  .map((m) => {
                    const isSent = Number(m.sender_id) === Number(currentUser.id); // true if current user sent the message
                      return (
                        <div key={m.id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                            <div className={`px-3 py-2 rounded-lg max-w-xs break-words ${isSent ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
                              <div>{m.content}</div>
                                <div className={`text-[10px] opacity-75 mt-1 text-right ${!isSent ? "text-gray-600" : ""}`}>
                                  {formatTime(m.timestamp)} {isSent && (m.is_read ? "✓✓" : "✓")}
                                </div>
                              </div>
                        </div>
                      );
                    })
                  }
                  {peerTyping && selectedUser && (
                  <div className="text-xs text-gray-500">{selectedUser.name} is typing…</div>
                  )}
              </div>

                <div className="border-t p-2 flex bg-white">
                  <input
                    className="flex-1 border rounded px-2 py-1 mr-2"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message…"
                  />
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