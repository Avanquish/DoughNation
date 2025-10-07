import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "https://api.doughnationhq.cloud";

const UserBadge = ({ currentUser }) => {
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) {
      setBadges([]);
      setLoadingBadges(false);
      return;
    }

    // If badges already exist in currentUser, use them
    if (currentUser.badges && currentUser.badges.length > 0) {
      // Normalize badges: either nested (userBadge.badge) or flat
      const normalized = currentUser.badges.map((b) => {
        if (b.badge) return b; // already nested
        return { id: b.id, badge: b }; // wrap flat badge
      });
      setBadges(normalized);
      setLoadingBadges(false);
      return;
    }

    // Otherwise, fetch from API
    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API}/badges/user/${currentUser.id}`, { headers });

        const normalized = (res.data || []).map((b) => {
          if (b.badge) return b; // already nested
          return { id: b.id, badge: b }; // wrap flat badge
        });

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

  return (
    <div className="flex flex-wrap gap-3 min-h-[100px]">
      {loadingBadges ? (
        <p className="text-sm text-gray-400">Loading badges...</p>
      ) : badges.length > 0 ? (
        badges.map((userBadge) => (
          <div
            key={userBadge.id}
            className="flex flex-col items-center p-2 rounded-lg w-20 hover:scale-105 transition-transform bg-green-100"
          >
            <img
              src={
                userBadge.badge?.icon_url
                  ? `${API}/${userBadge.badge.icon_url}`
                  : "/placeholder-badge.png"
              }
              alt={userBadge.badge?.name || "Badge"}
              title={userBadge.badge?.name || "Badge"}
              className="w-10 h-10 object-contain mb-1"
            />
            <span className="text-xs text-center">{userBadge.badge?.name || "Unknown"}</span>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-400">No badges unlocked yet.</p>
      )}
    </div>
  );
};

export default UserBadge;
