import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import UnlockModalBadge from "@/components/ui/UnlockModalBadge";
import { jwtDecode } from "jwt-decode"; // ✅ Vite-compatible import

const AchievementBadges = () => {
  const [allBadges, setAllBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [badgeProgress, setBadgeProgress] = useState([]);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const prevBadgeIds = useRef(
    new Set(JSON.parse(localStorage.getItem("shownBadges") || "[]"))
  );

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded?.id || decoded?.user_id || decoded?.sub;

  useEffect(() => {
    if (!userId) return;

    // Fetch all badges
    axios.get("https://api.doughnationhq.cloud/badges/").then((res) => setAllBadges(res.data));

    // Fetch unlocked badges
    axios
      .get(`https://api.doughnationhq.cloud/badges/user/${userId}`)
      .then((res) => setUserBadges(res.data));

    // Fetch progress for each badge
    axios
      .get(`https://api.doughnationhq.cloud/badges/progress/${userId}`)
      .then((res) => setBadgeProgress(res.data));
  }, [userId]);

  const isUnlocked = (badgeId) =>
    userBadges.some((ub) => ub.badge_id === badgeId);

  const getProgress = (badgeId) => {
    const progress = badgeProgress.find((p) => p.badge_id === badgeId);
    if (progress) {
      return { current: progress.progress, target: progress.target };
    }
    return { current: 0, target: 100 }; // default if no progress
  };

  // Detect newly unlocked badge
  useEffect(() => {
    if (userBadges.length > 0) {
      const latestBadge = userBadges[userBadges.length - 1];
      const latestBadgeId = latestBadge.badge_id;

      if (!prevBadgeIds.current.has(latestBadgeId)) {
        const badgeObj = allBadges.find((b) => b.id === latestBadgeId);
        if (badgeObj) {
          setUnlockedBadge(badgeObj);
          prevBadgeIds.current.add(latestBadgeId);
          localStorage.setItem(
            "shownBadges",
            JSON.stringify(Array.from(prevBadgeIds.current))
          );
        }
      }
    }
  }, [userBadges, allBadges]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Achievement Badges 🎖</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {allBadges.map((badge) => {
          const unlocked = isUnlocked(badge.id);
          const progress = getProgress(badge.id);

          return (
            <Card
              key={badge.id}
              className={`transition transform hover:scale-105 shadow-lg rounded-2xl border-2 ${
                unlocked ? "border-green-500 bg-white" : "border-gray-300 bg-gray-100 opacity-70"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-center">{badge.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <img
                  src={badge.icon_url ? `https://api.doughnationhq.cloud/${badge.icon_url}` : "/placeholder-badge.png"}
                  alt={badge.name}
                  className={`w-20 h-20 mb-3 ${unlocked ? "" : "grayscale opacity-60"}`}
                />
                <p className="text-sm text-gray-600 text-center mb-2">{badge.description}</p>

                {/* Progress */}
                <div className="w-full">
                  <Progress value={progress.percent} className="h-3 rounded-full mb-1" />
                  <p className="text-xs text-gray-500 text-center">
                    {progress.current}/{progress.target}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {unlockedBadge && (
        <UnlockModalBadge
          badge={unlockedBadge}
          onClose={() => setUnlockedBadge(null)}
        />
      )}
    </div>
  );
};

export default AchievementBadges;