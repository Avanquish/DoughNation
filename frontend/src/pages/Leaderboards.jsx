import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Crown, Medal } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Leaderboards = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard data on mount
  useEffect(() => {
    axios
      .get(`${API}/leaderboard/bakery`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setLeaderboard(res.data);
        setLoading(false);
      })
      .catch((err) => {
        Swal.fire(
          "Error",
          err.response?.data?.detail || "Failed to load leaderboard",
          "error"
        );
        setLoading(false);
      });
  }, []);

  if (loading)
    return <p className="text-center text-[#6b4b2b]">Loading leaderboard...</p>;

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

  return (
    <div className="p-4 sm:p-6">
      {/* Outer panel  */}
      <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_8px_24px_rgba(201,124,44,0.12)] border border-[#e8d8c2]">
        {/* Title section */}
        <div className="text-center px-6 pt-8 pb-4 border-b border-[#e8d8c2]/70">
          <h2 className="text-3xl font-extrabold text-[#6b4b2b]">
            Bakery Leaderboard
          </h2>
          <p className="mt-1 text-sm text-[#7b5836]">
            Top bakeries ranked by total donations
          </p>
        </div>

        {/* Table container */}
        <div className="p-6">
          <div className="overflow-hidden rounded-2xl bg-white/95 shadow ring-1 ring-[#e9d7c3]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                {/* Header */}
                <thead className="bg-[#EADBC8] text-[#4A2F17]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-[140px]">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Bakery
                    </th>
                    <th className="px-4 py-3 text-right font-semibold w-[180px]">
                      Total Donated
                    </th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-[#f2d4b5]">
                  {leaderboard.map((b) => {
                    const topRow =
                      b.rank === 1
                        ? "bg-gradient-to-r from-[#FFF3E6] via-[#FFE6CC] to-[#FFE0BF]"
                        : b.rank === 2
                        ? "bg-gradient-to-r from-[#FFF7ED] via-[#FFF0DE] to-[#FFE6CF]"
                        : b.rank === 3
                        ? "bg-gradient-to-r from-[#FFFAF2] via-[#FFF2E3] to-[#FFE9D3]"
                        : "bg-white";

                    return (
                      <tr
                        key={b.bakery_id}
                        className={`${topRow} hover:bg-[#fff6ec] transition-colors transform-gpu hover:scale-[1.015] hover:shadow-[0_12px_28px_rgba(201,124,44,0.18)] hover:ring-1 hover:ring-[#e9d7c3] relative z-[1] transition-transform duration-200`}
                      >
                        <td className="px-4 py-3">
                          <RankBadge rank={b.rank} />
                        </td>
                        <td className="px-4 py-3 text-[#3b2a18] font-medium">
                          {b.bakery_name}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#2a170a]">
                          {formatNumber(b.total_donated)}
                        </td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-[#6b4b2b]/70"
                      >
                        No data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-center text-[#6b4b2b]/70 text-xs">
            Rankings update automatically as donations change.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;