import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import UnlockModalBadge from "@/components/ui/UnlockModalBadge";
import { jwtDecode } from "jwt-decode";

// Palette
const UNLOCKED_BORDER = "#E49A52";
const LOCKED_BORDER = "#e8d6bb";
const UNLOCKED_RING = "#E49A52";
const HOVER_RING = "#D88C3A";
const TRACK_BG = "#f3e3cf";
const TITLE_COLOR = "#6B4B2B";
const SUBTEXT_COLOR = "#6b4b2b";

// Catalogue for achievement badges
const AchievementBadges = () => {
  const [allBadges, setAllBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [badgeProgress, setBadgeProgress] = useState([]);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  // Tracks which badge IDs have already shown the “unlocked” modal locally.
  const prevBadgeIds = useRef(
    new Set(JSON.parse(localStorage.getItem("shownBadges") || "[]"))
  );

  // To identify current user
  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded?.id || decoded?.user_id || decoded?.sub;

  // Function to fetch all badge data
  const fetchBadgeData = React.useCallback(async () => {
    if (!userId) return;
    try {
      const [badgesRes, userBadgesRes, progressRes] = await Promise.all([
        axios.get("http://localhost:8000/badges/"),
        axios.get(`http://localhost:8000/badges/user/${userId}`),
        axios.get(`http://localhost:8000/badges/progress/${userId}`),
      ]);

      setAllBadges(badgesRes.data);
      setUserBadges(userBadgesRes.data);
      setBadgeProgress(progressRes.data);
    } catch (error) {
      console.error("Error fetching badge data:", error);
    }
  }, [userId]);

  // Initial fetch and refresh setup
  useEffect(() => {
    fetchBadgeData();

    // Set up auto-refresh interval
    const interval = setInterval(fetchBadgeData, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchBadgeData]);

  // Helpers to check if badge is unlocked and get progress
  const isUnlocked = (badgeId) =>
    userBadges.some((ub) => ub.badge_id === badgeId);

  // Helpers to get progress details
  const getProgress = (badgeId) => {
    const p = badgeProgress.find((x) => x.badge_id === badgeId);
    if (p) {
      const calculatedPercent = Math.min(
        100,
        Math.round((p.progress / p.target) * 100)
      );
      return {
        percent: calculatedPercent,
        isNearCompletion: calculatedPercent >= 75, // Flag for badges near completion (75% or more)
      };
    }

    // Default progress based on badge category
    const badge = allBadges.find((b) => b.id === badgeId);
    if (badge) {
      return {
        percent: 0,
        isNearCompletion: false,
      };
    }

    return {
      percent: 0,
      isNearCompletion: false,
    };
  };

  // Show modal if a new badge is unlocked
  useEffect(() => {
    if (userBadges.length > 0) {
      const latestBadgeId = userBadges[userBadges.length - 1].badge_id;
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
      {/* Page Title */}
      <h1
        className="text-3xl font-bold mb-8 text-center"
        style={{ color: TITLE_COLOR }}
      >
        Achievement Badges
      </h1>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
        {allBadges.map((badge) => {
          const unlocked = isUnlocked(badge.id);
          const progress = getProgress(badge.id);

          return (
            <Card
              key={badge.id}
              className={`
                rounded-3xl
                ${unlocked ? "border-3" : "border"}  
                bg-[linear-gradient(180deg,#FFF1E0_0%,#FBE3C4_55%,#F7D4A6_100%)]
                shadow-[0_6px_18px_rgba(82,46,14,.08)]
                transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                hover:scale-[1.02] hover:shadow-[0_16px_38px_rgba(145,86,24,.20)]
                hover:ring-1
                ${unlocked ? "ring-1 ring-[#E49A52]/50" : ""}
              `}
              style={{
                borderColor: unlocked ? UNLOCKED_BORDER : LOCKED_BORDER,
                opacity: unlocked ? 1 : 0.92,
                boxShadow: unlocked
                  ? "0 10px 26px rgba(145,86,24,.18)"
                  : "0 6px 18px rgba(82,46,14,.08)",
                ...(unlocked
                  ? { ["--tw-ring-color"]: `${UNLOCKED_RING}80` }
                  : {}),
              }}
              onMouseEnter={(e) =>
                e.currentTarget.style.setProperty(
                  "--tw-ring-color",
                  `${HOVER_RING}73`
                )
              }
              onMouseLeave={(e) =>
                e.currentTarget.style.setProperty(
                  "--tw-ring-color",
                  unlocked ? `${UNLOCKED_RING}80` : ""
                )
              }
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-base font-semibold text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] mx-auto"
                  style={{ color: TITLE_COLOR }}
                  title={badge.name} // keeps full title in tooltip
                >
                  {badge.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col items-center gap-2 pb-4">
                <img
                  src={
                    badge.icon_url
                      ? `http://localhost:8000/${badge.icon_url}`
                      : "/placeholder-badge.png"
                  }
                  alt={badge.name}
                  className={`w-20 h-20 mb-2 drop-shadow ${
                    unlocked ? "" : "grayscale opacity-60"
                  }`}
                />
                {/* Description */}
                <p
                  className="text-xs text-center mb-1 h-4 whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ color: SUBTEXT_COLOR }}
                  title={badge.description}
                >
                  {badge.description}
                </p>

                {/* Progress Bar */}
                <div className="w-full mt-1">
                  <Progress
                    value={unlocked ? 100 : progress.percent}
                    className={`h-3 rounded-full transition-all duration-500 ${
                      unlocked
                        ? "bg-[#E49A52]"
                        : progress.isNearCompletion
                        ? "bg-[#F7B977]"
                        : ""
                    }`}
                    style={{
                      backgroundColor: TRACK_BG,
                      "--progress-fill": unlocked
                        ? "#E49A52"
                        : progress.isNearCompletion
                        ? "#F7B977"
                        : "#8B5E3C",
                    }}
                  />
                  <div className="flex justify-center items-center mt-1">
                    <p
                      className={`text-[11px] text-center font-medium transition-colors duration-300 ${
                        progress.isNearCompletion ? "text-[#E49A52]" : ""
                      }`}
                      style={{
                        color: unlocked
                          ? "#E49A52"
                          : progress.isNearCompletion
                          ? "#C17B35"
                          : "#7b5836",
                      }}
                    >
                      {unlocked ? "Complete!" : `${progress.percent}%`}
                    </p>
                  </div>
                </div>
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
