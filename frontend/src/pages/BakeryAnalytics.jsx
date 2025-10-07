import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

const API = "https://api.doughnationhq.cloud";
const COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28", "#AA336A"];

const BakeryAnalytics = ({ currentUser }) => {
  const [stats, setStats] = useState({
    inventory: [],
    donations: [],
    employees: [],
    badges: [],
  });

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API}/analytics`, { headers });
        setStats(res.data || {});
      } catch (err) {
        console.error("Error fetching analytics data:", err);
      }
    };

    fetchStats();
  }, [currentUser?.id]);

  // Prepare data for charts
  const inventoryStatus = stats.inventory.reduce(
    (acc, item) => {
      const daysLeft = (new Date(item.expiration_date) - new Date()) / (1000 * 60 * 60 * 24);
      if (daysLeft < 0) acc.expired += 1;
      else if (daysLeft <= (Number(item.threshold) || 0)) acc.soon += 1;
      else acc.fresh += 1;
      return acc;
    },
    { fresh: 0, soon: 0, expired: 0 }
  );

  const donationStatus = stats.donations.reduce(
    (acc, d) => {
      if (d.status === "available") acc.uploaded += 1;
      else if (d.status === "donated") acc.donated += 1;
      return acc;
    },
    { uploaded: 0, donated: 0 }
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
      {/* Inventory Status Pie */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Inventory Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: "Fresh", value: inventoryStatus.fresh },
                { name: "Nearing Expiration", value: inventoryStatus.soon },
                { name: "Expired", value: inventoryStatus.expired },
              ]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              <Cell fill="#00C49F" />
              <Cell fill="#FFBB28" />
              <Cell fill="#FF8042" />
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Donations Bar Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Donations</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[
              { name: "Donations", Uploaded: donationStatus.uploaded, Donated: donationStatus.donated },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Uploaded" fill="#0088FE" />
            <Bar dataKey="Donated" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    </div>
  );
};

export default BakeryAnalytics;