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
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await axios.get(`${API}/badges/user/${userId}`, { headers });
    console.log("✅ API response:", res.data); // Debug log
    setBadges(res.data || []);
  } catch (err) {
    console.error("❌ Error fetching badges:", err.response?.data || err.message);
    setBadges([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (userId) {
      fetchBadges();
    }
  }, [userId]);

  return (
    <Card className="glass-card border-0 shadow-none">
      <CardContent className="h-full flex flex-col">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : badges.length === 0 ? (
          <p className="text-gray-400">No badges unlocked yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex flex-col items-center p-2 bg-white/50 rounded-md shadow-sm"
              >
                <img
                  src={`${API}/${b.badge.icon_url}`}
                  alt={b.badge.name}
                  className="w-12 h-12 object-contain mb-1"
                />
                <p className="text-xs font-medium text-center">{b.badge.name}</p>
                {b.badge.is_special && (
                  <span className="text-[10px] text-yellow-600 font-bold">
                    ★ Special
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserBadges;