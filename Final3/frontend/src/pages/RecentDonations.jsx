import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const API = "http://localhost:8000";

const RecentDonations = ({ userId }) => { // <-- accept optional userId
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(""); // role from backend

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let url = `${API}/recent_donations`;
      if (userId) {
        url += `?user_id=${userId}`; // fetch specific user if id provided
      }

      const res = await axios.get(url, { headers });
      const allDonations = res.data || [];

      if (allDonations.length > 0) {
        setRole(allDonations[0].charity_name ? "bakery" : "charity");
      }

      allDonations.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
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
  }, [userId]); // refetch if userId changes

  return (
    <Card className="glass-card border-0 shadow-none h-[400px]">
      <CardContent className="h-full flex flex-col">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : donations.length === 0 ? (
          <p className="text-gray-400">No donations found.</p>
        ) : (
          <ul className="space-y-2 overflow-y-auto flex-1">
            {donations.map((d) => {
              const completedAt = new Date(d.completed_at);
              return (
                <li
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-white/50 rounded-md shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{d.product_name}</p>
                    <p className="text-xs text-gray-600">
                      Type: <span className="font-semibold">{d.type === "direct" ? "Direct Donation" : "Donation Request"}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Quantity: <span className="font-semibold">{d.quantity}</span>
                    </p>
                    {role === "bakery" ? (
                      <p className="text-xs text-gray-600">
                        Received By Charity: <span className="font-semibold">{d.charity_name}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">
                        From Bakery: <span className="font-semibold">{d.bakery_name}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Completed at: {completedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle className="text-green-600 w-5 h-5 mt-2 sm:mt-0" />
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