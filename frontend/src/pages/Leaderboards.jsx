import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Crown, Medal } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

const Leaderboards = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">🏆 Bakery Leaderboard</h2>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-3 text-center">Rank</th>
            <th className="p-3 text-center">Bakery</th>
            <th className="p-3 text-center">Total Donated</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((bakery) => (
            <tr key={bakery.bakery_id} className="border-b hover:bg-gray-100">
              <td className="p-3 font-semibold text-center">#{bakery.rank}</td>
              <td className="p-3 text-center">{bakery.bakery_name}</td>
              <td className="p-3 text-center">{bakery.total_donated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboards;