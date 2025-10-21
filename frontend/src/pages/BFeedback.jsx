import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";

const API = "http://localhost:8000";

// Color palette
const brand = {
  text: "#6b4b2b",
  subtext: "#7b5836",
  chipBorder: "#f2e3cf",
  cardBorder: "#f2e3cf",
  star: "#F6C17C",
};

const headerWrap =
  "rounded-[28px] border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)]";

const cardBase =
  "group rounded-3xl border bg-white/70 border-[#f2e3cf] shadow-[0_2px_12px_rgba(93,64,28,.06)] overflow-hidden transition-all duration-300 hover:scale-[1.012] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)] hover:ring-1 hover:ring-[#E49A52]/35";

const primaryBtn =
  "rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 font-semibold shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 active:scale-95";
const cancelBtn =
  "rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-5 py-2 shadow-sm hover:bg-white/90 transition-transform hover:-translate-y-0.5 active:scale-95";

// Star rating component
const StarRating = ({ rating = 0 }) => {
  const max = 5;
  return (
    <div className="inline-flex gap-1 align-middle">
      {Array.from({ length: max }).map((_, i) => (
        <FaStar key={i} size={16} color={i < rating ? brand.star : "#E6E6E6"} />
      ))}
    </div>
  );
};

const Pill = ({ children }) => (
  <span
    className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF6E9] border"
    style={{ borderColor: brand.chipBorder, color: brand.text }}
  >
    {children}
  </span>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border bg-[#e8f3ff] border-[#cfe6ff] text-[#1f5faa]">
    <span className="w-2.5 h-2.5 rounded-full bg-[#E49A52]" />
    {children}
  </span>
);

// Helpers
const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
  path ? `${API}/${path}` : fallback;

export default function BakeryFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [replying, setReplying] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  
  // Get token (employee token takes priority)
  const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
  
  // Check if user is a full-time employee (view-only mode)
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Full-time employees have view-only access
        if (decoded.type === "employee" && decoded.employee_role) {
          const role = decoded.employee_role.toLowerCase().replace(/[-\s]/g, "");
          setIsViewOnly(role.includes("fulltime") || role === "full");
        }
      } catch (e) {
        console.error("Failed to decode token:", e);
      }
    }
  }, [token]);
  
  const rootRef = useRef(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get(`${API}/feedback/bakery`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFeedbacks(res.data || []);
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      }
    };
    fetchFeedbacks();
  }, [token]);

  // Hide duplicate outer "Feedback" header if present
  useEffect(() => {
    const container = rootRef.current?.parentElement;
    if (!container) return;
    const hs = Array.from(container.querySelectorAll("h1,h2,h3"));
    const matches = hs.filter(
      (h) => (h.textContent || "").trim().toLowerCase() === "feedback"
    );
    if (matches.length > 1) matches[0].style.display = "none";
  }, []);

  const saveReply = async () => {
    if (!replying) return;
    const formData = new FormData();
    formData.append("reply_message", replyMessage);
    try {
      const res = await axios.patch(
        `${API}/feedback/bakery/${replying}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === replying ? { ...f, ...res.data } : f))
      );
      setReplying(null);
      setReplyMessage("");
    } catch (err) {
      console.error("Failed to reply:", err);
    }
  };

  return (
    <div
      ref={rootRef}
      className="min-h-[65vh] pb-10"
      style={{
        background:
          "radial-gradient(1200px 600px at 10% -10%, #FFF7ED 0%, #FFF7ED 40%, rgba(255,255,255,0) 60%), radial-gradient(1000px 500px at 120% 10%, #FFEFD9 0%, #FFF9F1 50%, rgba(255,255,255,0) 65%)",
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className={`${headerWrap} px-6 py-5`}>
          <h1
            className="text-[34px] sm:text-[40px] md:text-[46px] leading-[1.1] font-extrabold tracking-tight"
            style={{ color: brand.text }}
          >
            Feedback
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 mt-6">
        {feedbacks.length === 0 ? (
          <div className={`${headerWrap} grid place-items-center h-56`}>
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm" style={{ color: brand.subtext }}>
                No feedback submitted yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {feedbacks.map((f) => {
              // Show only Donation Request badge; remove Direct Donation label
              const donationType = f.donation_request_id ? (
                <Badge>Donation Request</Badge>
              ) : null;

              const mediaUrl = f.media_file
                ? `${API}/uploads/${f.media_file}`
                : null;
              const isVideo = mediaUrl
                ? /\.(mp4|webm|ogg)$/i.test(f.media_file)
                : false;

              return (
                <div key={f.id} className={cardBase}>
                  {/* Media */}
                  <div className="relative aspect-[16/10] bg-[#FFF6E9]">
                    {f.product_image ? (
                      <img
                        src={`${API}/${f.product_image}`}
                        alt={f.product_name || "Product"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid place-items-center h-full">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: brand.text }}
                        >
                          {f.product_name || "Donated Item"}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">{donationType}</div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    {/* Charity identity */}
                    <div className="flex items-center gap-3">
                      {f.charity_profile_picture && (
                        <img
                          src={avatar(f.charity_profile_picture)}
                          alt={f.charity_name}
                          className="w-11 h-11 rounded-full border border-[#f2e3cf] object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <div
                          className="font-semibold truncate"
                          style={{ color: "#3b2a18" }}
                        >
                          {f.charity_name || "Unknown Charity"}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: brand.subtext }}
                        >
                          {new Date(f.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Meta chips */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {f.product_name && <Pill>{f.product_name}</Pill>}
                      {typeof f.product_quantity !== "undefined" && (
                        <Pill>Qty: {f.product_quantity}</Pill>
                      )}
                      <Pill>
                        Rating:&nbsp;
                        <StarRating rating={f.rating || 0} />
                      </Pill>
                    </div>

                    {/* Message */}
                    <div className="mt-4">
                      <div
                        className="text-[13px] font-bold tracking-wide"
                        style={{ color: brand.text, letterSpacing: ".02em" }}
                      >
                        FEEDBACK
                      </div>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: "#4b3a28" }}
                      >
                        {f.message || "—"}
                      </p>
                    </div>

                    {/* Extra media (optional) */}
                    {mediaUrl && (
                      <div
                        className="mt-3 rounded-xl overflow-hidden border"
                        style={{ borderColor: brand.cardBorder }}
                      >
                        {isVideo ? (
                          <video
                            controls
                            className="w-full h-36 object-cover bg-black/5"
                            src={mediaUrl}
                          />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt="Feedback media"
                            className="w-full h-36 object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* Reply */}
                    {!isViewOnly && (
                      <div
                        className="mt-5 pt-4 border-t"
                        style={{ borderColor: brand.cardBorder }}
                      >
                        {f.reply_message ? (
                          <div className="rounded-xl bg-[#e9f9ef] border border-[#c7ecd5] px-3.5 py-2 text-[13px] text-[#1b5c30]">
                            <span className="font-semibold">Bakery Reply:</span>{" "}
                            {f.reply_message}
                          </div>
                        ) : replying === f.id ? (
                          <div>
                            <textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Write your reply..."
                              className="w-full rounded-xl border border-[#f2d4b5] bg-white p-2.5 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                            />
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              <button onClick={saveReply} className={primaryBtn}>
                                Save Reply
                              </button>
                              <button
                                onClick={() => {
                                  setReplying(null);
                                  setReplyMessage("");
                                }}
                                className={cancelBtn}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplying(f.id)}
                            className={`${primaryBtn} mt-1`}
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Show reply if it exists, even in view-only mode */}
                    {isViewOnly && f.reply_message && (
                      <div
                        className="mt-5 pt-4 border-t"
                        style={{ borderColor: brand.cardBorder }}
                      >
                        <div className="rounded-xl bg-[#e9f9ef] border border-[#c7ecd5] px-3.5 py-2 text-[13px] text-[#1b5c30]">
                          <span className="font-semibold">Bakery Reply:</span>{" "}
                          {f.reply_message}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}