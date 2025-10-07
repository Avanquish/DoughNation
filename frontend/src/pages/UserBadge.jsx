import React, { useEffect, useState } from "react";
import axios from "axios";
import { Award } from "lucide-react";

const API = "https://api.doughnationhq.cloud/";

const UserBadge = ({ currentUser }) => {
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) {
      setBadges([]);
      setLoadingBadges(false);
      return;
    }

    // Use embedded badges if present
    if (currentUser.badges && currentUser.badges.length > 0) {
      const normalized = currentUser.badges.map((b) =>
        b.badge ? b : { id: b.id, badge: b }
      );
      setBadges(normalized);
      setLoadingBadges(false);
      return;
    }

    // Otherwise fetch
    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API}/badges/user/${currentUser.id}`, {
          headers,
        });
        const normalized = (res.data || []).map((b) =>
          b.badge ? b : { id: b.id, badge: b }
        );
        setBadges(normalized);
      } catch (err) {
        console.error("Error fetching badges:", err);
        setBadges([]);
      } finally {
        setLoadingBadges(false);
      }
    };

    fetchBadges();
  }, [currentUser]);

  if (loadingBadges) {
    return (
      <div
        className="
          w-full rounded-2xl p-4
          bg-[linear-gradient(180deg,#FFFBF4_0%,#FFF4E6_55%,#FDEDD9_100%)]
          border border-[#f2dec2]
          shadow-[0_6px_18px_rgba(82,46,14,.06)]
          text-sm text-[#7b5836]
        "
      >
        Loading badges...
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div
        className="
          w-full rounded-2xl p-6
          bg-[linear-gradient(180deg,#FFFBF4_0%,#FFF4E6_55%,#FDEDD9_100%)]
          border border-dashed border-[#e9d7bf]
          shadow-[0_6px_18px_rgba(82,46,14,.05)]
          flex items-center gap-3 text-[#7b5836]
        "
      >
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/70 border border-[#f2e3cf]">
          <Award className="w-5 h-5 text-[#C08B47]" />
        </div>
        <div>
          <p className="font-medium text-[#3b2a18]">No badges unlocked yet.</p>
          <p className="text-xs text-[#8b6a49]">
            Complete actions to earn your first badge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((userBadge) => (
        <div
          key={userBadge.id}
          className="
            flex flex-col items-center p-2 rounded-xl w-20
            bg-[linear-gradient(180deg,#FFFDF8_0%,#FFF6EA_100%)]
            border border-[#f2e3cf]
            shadow-[0_2px_10px_rgba(145,86,24,.06)]
            hover:scale-[1.05] transition-transform
            text-[#5f4529]
          "
          title={userBadge.badge?.name || "Badge"}
        >
          <img
            src={
              userBadge.badge?.icon_url
                ? `${API}/${userBadge.badge.icon_url}`
                : "/placeholder-badge.png"
            }
            alt={userBadge.badge?.name || "Badge"}
            className="w-10 h-10 object-contain mb-1"
          />
          <span className="text-[11px] text-center">
            {userBadge.badge?.name || "Unknown"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default UserBadge;