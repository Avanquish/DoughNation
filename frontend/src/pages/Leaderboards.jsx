import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

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
        Swal.fire("Error", err.response?.data?.detail || "Failed to load leaderboard", "error");
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center">Loading leaderboard...</p>;

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
