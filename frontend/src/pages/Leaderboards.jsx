import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Crown,
  Medal,
  TrendingUp,
  Users,
  PackageCheck,
  Building2,
  HeartHandshake,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Leaderboards = () => {
  const [bakeryLeaderboard, setBakeryLeaderboard] = useState([]);
  const [charityLeaderboard, setCharityLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bakeries");

  // Fetch all leaderboard data on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(`${API}/leaderboard/summary`, { headers }),
      axios.get(`${API}/leaderboard/charities`, { headers }),
      axios.get(`${API}/leaderboard/stats`, { headers }),
    ])
      .then(([bakeryRes, charityRes, statsRes]) => {
        setBakeryLeaderboard(bakeryRes.data);
        setCharityLeaderboard(charityRes.data);
        setStats(statsRes.data);
        setLoading(false);
      })
      .catch((err) => {
        Swal.fire(
          "Error",
          err.response?.data?.detail || "Failed to load leaderboard data",
          "error"
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-center text-[#6b4b2b]">
          Loading leaderboard data...
        </p>
      </div>
    );
  }

  const RankBadge = ({ rank }) => {
    if (rank === 1)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow">
          <Crown className="w-4 h-4" /> #{rank}
        </span>
      );
    if (rank === 2)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-[#6b4b2b] bg-gradient-to-r from-[#FFF1DC] via-[#FFE4C2] to-[#F4CD9C] ring-1 ring-white/70">
          <Medal className="w-4 h-4 text-[#8a5a25]" /> #{rank}
        </span>
      );
    if (rank === 3)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-[#6b4b2b] bg-gradient-to-r from-[#FFF5E6] via-[#FFE7CF] to-[#F1CFA5] ring-1 ring-white/70">
          <Medal className="w-4 h-4 text-[#8a5a25]" /> #{rank}
        </span>
      );
    return <span className="font-bold text-[#6b4b2b]">#{rank}</span>;
  };

  const formatNumber = (n) => (typeof n === "number" ? n.toLocaleString() : n);
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const LeaderboardTable = ({ data, type }) => (
    <div className="overflow-hidden rounded-2xl bg-white/95 shadow ring-1 ring-[#e9d7c3]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-[#EADBC8] text-[#4A2F17]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold w-[100px]">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                {type === "bakery" ? "Bakery" : "Charity"}
              </th>
              <th className="px-4 py-3 text-right font-semibold w-[120px]">
                Count
              </th>
              <th className="px-4 py-3 text-right font-semibold w-[140px]">
                Total Items
              </th>
              <th className="px-4 py-3 text-right font-semibold w-[140px]">
                Latest Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f2d4b5]">
            {data.map((item) => {
              const topRow =
                item.rank === 1
                  ? "bg-gradient-to-r from-[#FFF3E6] via-[#FFE6CC] to-[#FFE0BF]"
                  : item.rank === 2
                  ? "bg-gradient-to-r from-[#FFF7ED] via-[#FFF0DE] to-[#FFE6CF]"
                  : item.rank === 3
                  ? "bg-gradient-to-r from-[#FFFAF2] via-[#FFF2E3] to-[#FFE9D3]"
                  : "bg-white";

              return (
                <tr
                  key={type === "bakery" ? item.bakery_id : item.charity_id}
                  className={`${topRow} hover:bg-[#fff6ec] transition-all duration-150 hover:shadow-sm`}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={item.rank} />
                  </td>
                  <td className="px-4 py-3 text-[#3b2a18] font-medium">
                    {type === "bakery" ? item.bakery_name : item.charity_name}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#6b4b2b]">
                    {formatNumber(
                      type === "bakery"
                        ? item.total_donations
                        : item.total_received
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-[#2a170a]">
                    {formatNumber(
                      type === "bakery"
                        ? item.total_quantity
                        : item.total_quantity_received
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#7b5836] text-xs">
                    {formatDate(
                      type === "bakery"
                        ? item.latest_donation_date
                        : item.latest_received_date
                    )}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[#6b4b2b]/70"
                >
                  No data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-white to-[#FFF9F1] border-[#e8d8c2] shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.01]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#6b4b2b] flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Bakeries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2a170a]">
                {stats.active_bakeries} / {stats.total_bakeries}
              </div>
              <p className="text-xs text-[#7b5836] mt-1">Active contributors</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-[#FFF9F1] border-[#e8d8c2] shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.01]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#6b4b2b] flex items-center gap-2">
                <HeartHandshake className="w-4 h-4" />
                Charities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2a170a]">
                {stats.active_charities} / {stats.total_charities}
              </div>
              <p className="text-xs text-[#7b5836] mt-1">Active recipients</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-[#FFF9F1] border-[#e8d8c2] shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.01]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#6b4b2b] flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                Total Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2a170a]">
                {formatNumber(stats.total_items_donated)}
              </div>
              <p className="text-xs text-[#7b5836] mt-1">
                Items donated ({formatNumber(stats.total_donations_completed)}{" "}
                donations)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Tabs */}
      <div className="rounded-3xl bg-gradient-to-br overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Header with Tabs */}
          <div className="px-2 pt-2 pb-4 border-b border-[#e8d8c2]/70">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="bg-[#EADBC8]/50 p-1 rounded-xl w-full sm:w-auto">
                <TabsTrigger
                  value="bakeries"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:to-[#E49A52] data-[state=active]:text-white rounded-lg px-6"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Bakeries
                </TabsTrigger>
                <TabsTrigger
                  value="charities"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:to-[#E49A52] data-[state=active]:text-white rounded-lg px-6"
                >
                  <HeartHandshake className="w-4 h-4 mr-2" />
                  Charities
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <TabsContent value="bakeries" className="mt-0">
              <LeaderboardTable data={bakeryLeaderboard} type="bakery" />
              <p className="mt-4 text-center text-[#6b4b2b]/70 text-xs">
                Rankings based on total donated items (completed donations only)
              </p>
            </TabsContent>

            <TabsContent value="charities" className="mt-0">
              <LeaderboardTable data={charityLeaderboard} type="charity" />
              <p className="mt-4 text-center text-[#6b4b2b]/70 text-xs">
                Rankings based on total received items (completed donations
                only)
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboards;