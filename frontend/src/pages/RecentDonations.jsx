import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const API = "http://localhost:8000";

// Display recent donations, optionally filtered by userId
const RecentDonations = ({ userId }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  // Fetch recent donations
  const fetchDonations = async () => {
    try {
      setLoading(true);
      // Get the appropriate token (employee token takes priority if it exists)
      const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let url = `${API}/recent_donations`;
      if (userId) url += `?user_id=${userId}`;

      const res = await axios.get(url, { headers });
      const allDonations = res.data || [];
      if (allDonations.length > 0) {
        setRole(allDonations[0].charity_name ? "bakery" : "charity");
      }
      allDonations.sort(
        (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
      );
      setDonations(allDonations);
    } catch (err) {
      console.error("Error fetching donations:", err);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [userId]);

  // Render
  return (
    <Card
      className="
        rounded-3xl
        border border-[#eadfce]
        bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
        shadow-[0_2px_8px_rgba(93,64,28,0.06)]
        h-[400px]
        transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
        hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
        hover:ring-1 hover:ring-[#E49A52]/35
      "
    >
      <CardContent className="h-full flex flex-col p-5">
        {loading ? (
          <p className="text-[#7a4f1c]">Loading...</p>
        ) : donations.length === 0 ? (
          <p className="text-[#7b5836]">No donations found.</p>
        ) : (
          <ul className="space-y-3 overflow-y-auto pr-1 flex-1">
            {donations.map((d) => {
              const completedAt = new Date(d.completed_at);
              return (
                <li
                  key={d.id}
                  className="
                    rounded-2xl border border-[#f2e3cf]
                    bg-white/70
                    shadow-[0_2px_10px_rgba(93,64,28,0.05)]
                    p-4
                    transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                    hover:scale-[1.015]
                    hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
                    hover:ring-1 hover:ring-[#E49A52]/35
                  "
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#3b2a18]">
                        {d.product_name}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFEFD9] text-[#6b4b2b] border border-[#f3ddc0]">
                          {d.type === "direct"
                            ? "Direct Donation"
                            : "Donation Request"}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF6E9] text-[#6b4b2b] border border-[#f4e6cf]">
                          Qty:
                          <span className="ml-1 font-semibold">
                            {d.quantity}
                          </span>
                        </span>
                        {role === "bakery" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF8EE] text-[#6b4b2b] border border-[#f0e2cc]">
                            Charity:
                            <span className="ml-1 font-semibold">
                              {d.charity_name}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF8EE] text-[#6b4b2b] border border-[#f0e2cc]">
                            Bakery:
                            <span className="ml-1 font-semibold">
                              {d.bakery_name}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7b5836]">
                        Completed: {completedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-green-700/80">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentDonations;