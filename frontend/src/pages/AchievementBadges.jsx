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

  // Fetch all badges for the current user
  useEffect(() => {
    if (!userId) return;
    axios
      .get("https://api.doughnationhq.cloud/badges/")
      .then((res) => setAllBadges(res.data));
    axios
      .get(`https://api.doughnationhq.cloud/badges/user/${userId}`)
      .then((res) => setUserBadges(res.data));
    axios
      .get(`https://api.doughnationhq.cloud/badges/progress/${userId}`)
      .then((res) => setBadgeProgress(res.data));
  }, [userId]);

  // Helpers to check if badge is unlocked and get progress
  const isUnlocked = (badgeId) =>
    userBadges.some((ub) => ub.badge_id === badgeId);

  // Helpers to get progress details
  const getProgress = (badgeId) => {
    const p = badgeProgress.find((x) => x.badge_id === badgeId);
    if (p) return { current: p.progress, target: p.target, percent: p.percent };
    return { current: 0, target: 100, percent: 0 };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                  className="text-base font-semibold text-center"
                  style={{ color: TITLE_COLOR }}
                >
                  {badge.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col items-center gap-2 pb-6">
                <img
                  src={
                    badge.icon_url
                      ? `https://api.doughnationhq.cloud/${badge.icon_url}`
                      : "/placeholder-badge.png"
                  }
                  alt={badge.name}
                  className={`w-20 h-20 mb-2 drop-shadow ${
                    unlocked ? "" : "grayscale opacity-60"
                  }`}
                />
                {/* Description */}
                <p
                  className="text-xs text-center mb-1"
                  style={{ color: SUBTEXT_COLOR }}
                >
                  {badge.description}
                </p>

                {/* Progress Bar */}
                <div className="w-full mt-1">
                  <Progress
                    value={progress.percent}
                    className="h-3 rounded-full"
                    style={{ backgroundColor: TRACK_BG }}
                  />
                  <p
                    className="text-[11px] text-center mt-1"
                    style={{ color: "#7b5836" }}
                  >
                    {progress.current}/{progress.target}
                  </p>
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