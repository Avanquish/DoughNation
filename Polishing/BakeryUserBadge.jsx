import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const UserBadges = ({ userId }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      // Check for employee token first, then bakery owner token
      const employeeToken = localStorage.getItem("employeeToken");
      const bakeryToken = localStorage.getItem("token");
      const token = employeeToken || bakeryToken;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/badges/user/${userId}`, { headers });
      setBadges(res.data || []);
    } catch (err) {
      console.error(
        "Error fetching badges:",
        err.response?.data || err.message
      );
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchBadges();
  }, [userId]);

  return (
    <Card
      className="
        rounded-3xl
        border border-[#eadfce]
        bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
        shadow-[0_2px_8px_rgba(93,64,28,0.06)]
        transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
        hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
        hover:ring-1 hover:ring-[#E49A52]/35
      "
    >
      <CardContent className="p-4 sm:p-6 min-h-[260px] sm:min-h-[404px]">
        {loading ? (
          <div
            className="
              grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
              gap-4 max-h-[260px] sm:max-h-none overflow-y-auto pr-1
            "
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="
                  h-20 rounded-xl border border-[#f2e3cf] bg-white/60
                  overflow-hidden relative
                "
              >
                <span
                  className="
                    absolute inset-0 -translate-x-full
                    bg-gradient-to-r from-transparent via-white/60 to-transparent
                    animate-[shimmer_1.2s_infinite]
                  "
                />
              </div>
            ))}
          </div>
        ) : badges.length === 0 ? (
          <div
            className="
              flex items-center justify-center
              h-[220px] sm:h-[280px] rounded-2xl border border-[#f2e3cf] bg-white/60
              text-[#7b5836] text-sm sm:text-base text-center px-4
            "
          >
            No badges unlocked yet.
          </div>
        ) : (
          // === BADGES GRID (UI only) ===
          <div
            className="
              grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
              gap-4 max-h-[260px] sm:max-h-none overflow-y-auto pr-1
            "
          >
            {badges.map((b) => {
              const icon = b?.badge?.icon_url
                ? `${API}/${b.badge.icon_url}`
                : "/placeholder-badge.png";
              const name = b?.badge_name?.trim() || b?.badge?.name || "Badge";

              return (
                // === SINGLE BADGE CARD (UI only) ===
                <div
                  key={b.id}
                  className="
                    group relative flex flex-col items-center text-center
                    px-3 py-3
                    rounded-xl
                    min-h-[112px] w-full
                    border border-[#f2e3cf] bg-white/70
                    shadow-[0_2px_10px_rgba(93,64,28,0.05)]
                    transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                    hover:scale-[1.015]
                    hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
                    hover:ring-1 hover:ring-[#E49A52]/35
                  "
                  title={name}
                >
                  {/* Special ribbon */}
                  {b?.badge?.is_special && (
                    <span
                      className="
                        absolute -top-2 -right-2 text-[10px] font-extrabold
                        px-2 py-0.5 rounded-full
                        bg-[#FFE7C5] text-[#7a4f1c] border border-[#fff3e0]
                        shadow-[0_3px_10px_rgba(191,115,39,0.18)]
                      "
                    >
                      ★ Special
                    </span>
                  )}

                  <img
                    src={icon}
                    alt={name}
                    className="
                      w-12 h-12 object-contain mb-2
                      transition-transform duration-300
                      group-hover:scale-110
                    "
                    loading="lazy"
                  />
                  <p
                    className="
                      text-xs sm:text-[13px]
                      font-semibold text-[#6B4B2B]
                      leading-tight mt-1
                      max-h-[2.7em]
                      overflow-hidden
                    "
                  >
                    {name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* local keyframes for shimmer */}
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </Card>
  );
};

export default UserBadges;
  