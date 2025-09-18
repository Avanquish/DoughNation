import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import UnlockModalBadge from "@/pages/UnlockModalBadge";
import { jwtDecode } from "jwt-decode";

const AchievementBadges = () => {
  const [allBadges, setAllBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const prevBadgeIds = useRef(new Set()); // track already unlocked badge IDs

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded?.id || decoded?.user_id || decoded?.sub;

  useEffect(() => {
    if (!userId) return;

    // Fetch all badges
    axios
      .get("http://localhost:8000/badges/")
      .then((res) => {
        console.log("All Badges:", res.data);
        setAllBadges(res.data);
      })
      .catch((err) => console.error("Error fetching badges:", err));

    // Fetch user badges
    axios
      .get(`http://localhost:8000/badges/user/${userId}`)
      .then((res) => {
        console.log("User Badges:", res.data);
        setUserBadges(res.data);
      })
      .catch((err) => console.error("Error fetching user badges:", err));
  }, [userId]);

  // Detect newly unlocked badge
  useEffect(() => {
    if (userBadges.length > 0) {
      const latestBadge = userBadges[userBadges.length - 1];
      const latestBadgeId = latestBadge.badge?.id || latestBadge.badge_id;

      if (!prevBadgeIds.current.has(latestBadgeId)) {
        setUnlockedBadge(latestBadge.badge || latestBadge);
        prevBadgeIds.current.add(latestBadgeId);
      }
    }
  }, [userBadges]);

  // Helper: check if a badge is unlocked
  const isUnlocked = (badgeId) =>
    userBadges.some(
      (ub) => ub.badge?.id === badgeId || ub.badge_id === badgeId
    );

  // Helper: get progress if available
  const getProgress = (badgeId) => {
    const progressData = userBadges.find(
      (ub) => ub.badge?.id === badgeId || ub.badge_id === badgeId
    );
    if (progressData?.progress !== undefined && progressData?.target) {
      return Math.min(
        100,
        Math.round((progressData.progress / progressData.target) * 100)
      );
    }
    return 0; // fallback
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Achievement Badges 🎖
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {allBadges.map((badge) => {
          const unlocked = isUnlocked(badge.id);
          const progress = getProgress(badge.id);

          return (
            <Card
              key={badge.id}
              className={`transition transform hover:scale-105 shadow-lg rounded-2xl border-2 ${
                unlocked
                  ? "border-green-500 bg-white"
                  : "border-gray-300 bg-gray-100 opacity-70"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-center">
                  {badge.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <img
                  src={badge.icon_url ? `http://localhost:8000/${badge.icon_url}` : "/placeholder-badge.png"}
                  alt={badge.name}
                  className={`w-20 h-20 mb-3 ${
                    unlocked ? "" : "grayscale opacity-60"
                  }`}
                />
                <p className="text-sm text-gray-600 text-center">
                  {badge.description}
                </p>

                {/* Show progress if not unlocked */}
                {!unlocked && (
                  <div className="mt-4 w-full">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-center mt-1">
                      Progress: {progress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unlock Modal */}
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
