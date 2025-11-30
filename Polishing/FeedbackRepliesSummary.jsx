import { useEffect, useState } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa";
import { MessageSquare, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const API = "http://localhost:8000";

const StarDisplay = ({ rating = 0 }) => {
  const max = 5;
  return (
    <div className="inline-flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <FaStar key={i} size={14} color={i < rating ? "#F6C17C" : "#E6E6E6"} />
      ))}
    </div>
  );
};

export default function FeedbackRepliesSummary() {
  const [feedbackWithReplies, setFeedbackWithReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await axios.get(`${API}/feedback/charity`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filter only feedback that has replies from bakeries
        const withReplies = res.data.filter((f) => {
          const replyText =
            f.bakery_reply ??
            f.reply ??
            f.reply_message ??
            (typeof f.response === "string" ? f.response : undefined) ??
            (typeof f.bakery_response === "string"
              ? f.bakery_response
              : undefined);
          return replyText && replyText.trim().length > 0;
        });

        // Sort by most recent reply
        const sorted = withReplies.sort((a, b) => {
          const dateA =
            a.reply_created_at ??
            a.bakery_reply_created_at ??
            a.response_created_at ??
            a.created_at;
          const dateB =
            b.reply_created_at ??
            b.bakery_reply_created_at ??
            b.response_created_at ??
            b.created_at;
          return new Date(dateB) - new Date(dateA);
        });

        // Take only the 5 most recent
        setFeedbackWithReplies(sorted.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [token]);

  // ---------- Loading state ----------
  if (loading) {
    return (
      <Card
        className="
          rounded-3xl
          border border-[#eadfce]
          bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
          shadow-[0_2px_8px_rgba(93,64,28,0.06)]
          h-auto max-h-[420px]
          md:h-[400px] md:max-h-none
          transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
          hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
          hover:ring-1 hover:ring-[#E49A52]/35
        "
      >
        <CardContent className="h-full flex flex-col p-4 sm:p-5">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[#7a4f1c]">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------- Empty state (matches "No donations found." UI) ----------
  if (feedbackWithReplies.length === 0) {
    return (
      <Card
        className="
          rounded-3xl
          border border-[#eadfce]
          bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
          shadow-[0_2px_8px_rgba(93,64,28,0.06)]
          h-auto max-h-[420px]
          md:h-[400px] md:max-h-none
          transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
          hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
          hover:ring-1 hover:ring-[#E49A52]/35
        "
      >
        <CardContent className="h-full flex flex-col p-4 sm:p-5">
          <div className="flex-1 flex items-center justify-center">
            <p
              className="
                text-sm text-[#7b5836]
                bg-white/70 border border-[#f2e3cf]
                rounded-2xl px-4 py-6
                text-center
              "
            >
              No bakery feedback yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="
        rounded-3xl
        border border-[#eadfce]
        bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
        shadow-[0_2px_8px_rgba(93,64,28,0.06)]
        h-auto max-h-[420px]
        md:h-[400px] md:max-h-none
        transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
        hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
        hover:ring-1 hover:ring-[#E49A52]/35
      "
    >
      <CardContent className="h-full flex flex-col p-4 sm:p-5">
        <ul className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[320px] md:max-h-none">
          {feedbackWithReplies.map((f) => {
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
              <li
                key={f.id}
                className="
                  rounded-2xl border border-[#f2e3cf]
                  bg-white/70
                  shadow-[0_2px_10px_rgba(93,64,28,0.05)]
                  p-3 sm:p-4
                  transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                  hover:scale-[1.015]
                  hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
                  hover:ring-1 hover:ring-[#E49A52]/35
                "
              >
                {/* Bakery info & rating */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {f.bakery_profile_picture ? (
                      <img
                        src={`${API}/${f.bakery_profile_picture}`}
                        alt={f.bakery_name}
                        className="w-8 h-8 rounded-full border border-[#f2e3cf] object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full border border-[#f2e3cf] flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "linear-gradient(180deg,#FFE7C5,#F7C489)",
                        }}
                      >
                        <Store className="h-4 w-4 text-[#7a4f1c]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-[#3b2a18] truncate">
                        {f.bakery_name || "Unknown Bakery"}
                      </div>
                      <div className="text-xs text-[#7b5836]">
                        {f.product_name || "Donated Item"}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StarDisplay rating={f.rating || 0} />
                  </div>
                </div>

                {/* Your feedback */}
                <div className="mb-2">
                  <div className="text-xs font-semibold text-[#7b5836] mb-1">
                    Your Feedback:
                  </div>
                  <p className="text-sm text-[#6b4b2b] line-clamp-2">
                    {f.message}
                  </p>
                </div>

                {/* Bakery reply */}
                <div className="rounded-lg bg-gradient-to-br from-[#e9f9ef] to-[#f0fdf4] border border-[#c7ecd5] px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="h-3 w-3 text-[#16a34a]" />
                    <span className="text-xs font-semibold text-[#16a34a]">
                      Bakery Reply
                    </span>
                    {repliedAt && (
                      <span className="text-[10px] text-[#16a34a]/70 ml-auto">
                        {new Date(repliedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1b5c30] leading-relaxed line-clamp-3">
                    {replyText}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
