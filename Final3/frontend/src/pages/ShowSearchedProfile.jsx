import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const API = "http://localhost:8000";

export default function ShowSearchedProfile({ id, onBack }) {
  const [profile, setProfile] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [badges, setBadges] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("about");

  useEffect(() => {
    if (!id) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/user/${id}`);
        setProfile(res.data);

        if (res.data.role.toLowerCase() === "bakery") {
          const invRes = await axios.get(`${API}/inventory?bakery_id=${id}`);
          setInventory(invRes.data || []);

          const badgeRes = await axios.get(`${API}/badges/user/${id}`);
          setBadges(badgeRes.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfile();
  }, [id]);

  const statusOf = (item) => {
    if (!item.expiration_date) return "fresh";
    const today = new Date();
    const exp = new Date(item.expiration_date);
    const threshold = Number(item.threshold) || 0;
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "expired";
    if (diff <= threshold) return "soon";
    return "fresh";
  };

  const statusCounts = useMemo(() => {
    const expired = inventory.filter((i) => statusOf(i) === "expired").length;
    const soon = inventory.filter((i) => statusOf(i) === "soon").length;
    const fresh = inventory.filter((i) => statusOf(i) === "fresh").length;
    return { expired, soon, fresh, total: inventory.length };
  }, [inventory]);

  const statusPie = [
    { name: "Fresh", value: statusCounts.fresh },
    { name: "Soon", value: statusCounts.soon },
    { name: "Expired", value: statusCounts.expired },
  ];

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="min-h-screen relative">
      {/* Hero Background */}
      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      {/* Header */}
      <header className="head">
        <div className="head-bg" />
        <div className="head-inner flex justify-between items-center px-4 sm:px-8">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              className="icon-btn flex items-center gap-1 px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-semibold"
              aria-label="Back to search results"
              title="Back to search results"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div>
              <h1 className="title-ink text-2xl sm:text-[26px]">{profile.name}</h1>
              <span className="status-chip">{profile.role.toUpperCase()} Profile</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <div className="relative bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-b from-orange-100 to-orange-200 rounded-2xl shadow p-6 mt-6">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 rounded-full border-4 border-orange-300 overflow-hidden">
                  <img
                    src={
                      profile.profile_picture
                        ? `${API}/${profile.profile_picture}`
                        : "/default-avatar.png"
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-brown-800">{profile.name}</h1>
                  <p className="text-gray-700">Welcome Visitors! Hope You Enjoy!</p>
                  {/* Message Button under text */}
                  <button
                    onClick={() => {
                      const peer = {
                        id: profile.id,
                        name: profile.name,
                        profile_picture: profile.profile_picture || null,
                      };
                      localStorage.setItem("open_chat_with", JSON.stringify(peer));
                      window.dispatchEvent(new Event("open_chat"));
                    }}
                    className="mt-3 px-4 py-2 rounded-md bg-orange-300 hover:bg-orange-400 text-white font-semibold text-sm"
                  >
                    Message
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="bg-transparent border-0 mb-4">
                  <TabsTrigger value="about">About</TabsTrigger>
                  {profile.role.toLowerCase() === "bakery" && (
                    <TabsTrigger value="analytics">Badges</TabsTrigger>
                  )}
                </TabsList>

                {/* About Tab */}
                <TabsContent value="about">
                  <Card className="shadow-sm border rounded-lg">
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                      <CardDescription>
                        {profile.role.toLowerCase() === "bakery"
                          ? "This bakery tracks products and donations."
                          : "This charity receives donations and supports communities."}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </TabsContent>

                {/* Analytics Tab (Bakery only) */}
                {profile.role.toLowerCase() === "bakery" && (
                  <TabsContent value="analytics" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Badges</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-4">
                        {badges && badges.length > 0 ? (
                          badges.map((userBadge) => (
                            <div key={userBadge.id} className="flex flex-col items-center">
                              <img
                                src={
                                  userBadge.badge?.icon_url
                                    ? `${API}/${userBadge.badge.icon_url}`
                                    : "/placeholder-badge.png"
                                }
                                alt={userBadge.badge?.name}
                                title={userBadge.badge?.name}
                                className="w-12 h-12 hover:scale-110 transition-transform"
                              />
                              <span className="text-xs mt-1">
                                {userBadge.badge_name && userBadge.badge_name.trim() !== ""
                                  ? userBadge.badge_name
                                  : userBadge.badge?.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">No badges unlocked yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
