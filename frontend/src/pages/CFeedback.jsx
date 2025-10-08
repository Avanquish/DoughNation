import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa";

const API = "https://api.doughnationhq.cloud";

// Color Palette
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

const StarDisplay = ({ rating = 0 }) => {
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

const Badge = ({ tone = "blue", children }) => {
  const tones = {
    blue: { bg: "#e8f3ff", border: "#cfe6ff", text: "#1f5faa", dot: "#E49A52" },
    green: {
      bg: "#e9f9ef",
      border: "#c7ecd5",
      text: "#1b5c30",
      dot: "#2cc27b",
    },
  };
  const t = tones[tone] || tones.blue;
  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border"
      style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: t.dot }}
      />
      {children}
    </span>
  );
};

const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
  path ? `${API}/${path}` : fallback;

export default function MyFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [editFile, setEditFile] = useState(null);
  const token = localStorage.getItem("token");
  const rootRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/feedback/charity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFeedbacks(res.data);
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      }
    })();
  }, []); 

  useEffect(() => {
    const container = rootRef.current?.parentElement;
    if (!container) return;
    const hs = Array.from(container.querySelectorAll("h1,h2,h3"));
    const matches = hs.filter(
      (h) => (h.textContent || "").trim().toLowerCase() === "feedback"
    );
    if (matches.length > 1) matches[0].style.display = "none";
  }, []);

  const startEdit = (f) => {
    setEditing(f.id);
    setEditMessage(f.message);
    setEditRating(f.rating || 0);
    setEditFile(null);
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditMessage("");
    setEditRating(0);
    setEditFile(null);
  };
  const saveEdit = async () => {
    if (!editing) return;
    const formData = new FormData();
    if (editMessage) formData.append("message", editMessage);
    if (editRating) formData.append("rating", editRating);
    if (editFile) formData.append("media_file", editFile);

    try {
      const res = await axios.patch(
        `${API}/feedback/charity/${editing}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === editing ? { ...f, ...res.data } : f))
      );
      cancelEdit();
    } catch (err) {
      console.error("Failed to update feedback:", err);
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
          <p className="mt-1 text-sm" style={{ color: brand.subtext }}>
            Your submitted feedback to bakeries, with edit options.
          </p>
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
              const mediaUrl = f.media_file
                ? `${API}/uploads/${f.media_file}`
                : null;
              const isVideo = mediaUrl
                ? /\.(mp4|webm|ogg)$/i.test(f.media_file)
                : false;

              // bakery reply fields (variations handled)
              const replyText =
                f.bakery_reply ??
                f.reply ??
                f.reply_message ??
                (typeof f.response === "string" ? f.response : undefined) ??
                (typeof f.bakery_response === "string"
                  ? f.bakery_response
                  : undefined);

              const repliedAt =
                f.reply_created_at ??
                f.bakery_reply_created_at ??
                f.response_created_at ??
                null;

              return (
                <div key={f.id} className={cardBase}>
                  {/* Media header */}
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

                    <div className="absolute top-3 left-3 flex gap-2">
                      {f.donation_request_id && (
                        <Badge tone="blue">Donation Request</Badge>
                      )}
                      {f.direct_donation_id && (
                        <Badge tone="green">Direct Donation</Badge>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    {/* Bakery identity */}
                    <div className="flex items-center gap-3">
                      {f.bakery_profile_picture && (
                        <img
                          src={avatar(f.bakery_profile_picture)}
                          alt={f.bakery_name}
                          className="w-11 h-11 rounded-full border border-[#f2e3cf] object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <div
                          className="font-semibold truncate"
                          style={{ color: "#3b2a18" }}
                        >
                          {f.bakery_name || "Unknown Bakery"}
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
                        Rating&nbsp;
                        <StarDisplay rating={f.rating || 0} />
                      </Pill>
                    </div>

                    {/* Feedback content (view or edit) */}
                    {editing === f.id ? (
                      <div className="mt-4">
                        <div
                          className="text-[13px] font-bold tracking-wide"
                          style={{ color: brand.text, letterSpacing: ".02em" }}
                        >
                          EDIT FEEDBACK
                        </div>

                        <textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          placeholder="Update your feedback."
                          className="mt-2 w-full rounded-xl border border-[#f2d4b5] bg-white p-2.5 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                        />

                        <label
                          className="block mt-3 text-sm font-semibold"
                          style={{ color: brand.text }}
                        >
                          Rating
                        </label>
                        <select
                          value={editRating}
                          onChange={(e) =>
                            setEditRating(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded-xl border border-[#f2d4b5] bg-white p-2.5 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                        >
                          {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                              {"⭐".repeat(r)}
                            </option>
                          ))}
                        </select>

                        <label
                          className="block mt-3 text-sm font-semibold"
                          style={{ color: brand.text }}
                        >
                          Replace / add media (image/video)
                        </label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) =>
                            setEditFile(e.target.files?.[0] || null)
                          }
                          className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-[#f2d4b5] file:bg-white file:px-4 file:py-1.5 hover:file:bg-white/95"
                        />

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button onClick={saveEdit} className={primaryBtn}>
                            Save Changes
                          </button>
                          <button onClick={cancelEdit} className={cancelBtn}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Original message */}
                        <p
                          className="mt-3 text-[15px] leading-relaxed"
                          style={{ color: brand.text }}
                        >
                          {f.message}
                        </p>

                        {/* Attached media preview */}
                        {mediaUrl && (
                          <div
                            className="mt-4 overflow-hidden rounded-2xl border"
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

                        {/* Bakery Reply */}
                        {replyText && (
                          <div className="mt-4 rounded-xl border px-4 py-3 flex items-start gap-3 bg-emerald-50 border-emerald-200">
                            <span className="mt-0.5 inline-block h-5 w-1.5 rounded-full bg-emerald-400/90"></span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold tracking-wide text-emerald-800">
                                Bakery Reply
                                {repliedAt && (
                                  <span className="ml-2 font-normal text-emerald-700/80">
                                    • {new Date(repliedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm leading-relaxed text-emerald-900">
                                {replyText}
                              </p>
                            </div>
                          </div>
                        )} 

                        {/* Edit button */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => startEdit(f)}
                            className={primaryBtn}
                          >
                            Edit
                          </button>
                        </div>
                      </>
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