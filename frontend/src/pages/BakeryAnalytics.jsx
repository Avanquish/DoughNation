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
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/analytics`, { headers });
      console.log("DashAnalytics", res.data);
      setStats(res.data || {});
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    }
  };

  fetchStats();
}, []); // removed dependency on currentUser?.id


// Prepare data for charts
const inventoryStatus = {
  fresh: stats.inventory?.fresh || 0,
  soon: stats.inventory?.soon || 0,
  expired: stats.inventory?.expired || 0,
};

const donationStatus = {
  uploaded: stats.donations?.uploaded || 0,
  donated: stats.donations?.donated || 0,
};

const combinedData = [
  {
    name: "All Charity",
    Inventory:
      (inventoryStatus.fresh || 0) +
      (inventoryStatus.soon || 0) +
      (inventoryStatus.expired || 0),
    Donations:
      (donationStatus.uploaded || 0) + (donationStatus.donated || 0),
  },
];

const XAxisTick = ({ x, y, payload }) => {
  const value = String(payload?.value ?? "");
  const words = value.split(" ");
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (test.length > 12) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" dy={12} fontSize={12} fill="#7c5d3b">
        {lines.map((l, i) => (
          <tspan key={i} x="0" dy={i === 0 ? 0 : 12}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
};


  return (
    <div className="w-full mx-auto px-6 lg:px-10 py-8 max-w-[1500px]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inventory Status Pie */}
        <div
          className="rounded-3xl border border-[#eadfce] 
                     bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
                     shadow-[0_2px_8px_rgba(93,64,28,0.06)]
                     p-7 min-h-[420px]
                     transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                     hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
                     hover:ring-1 hover:ring-[#E49A52]/35"
        >
          <h3
            className="text-xl font-semibold mb-5"
            style={{ color: "#7a4f1c" }}
          >
            Inventory Status
          </h3>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
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
                  outerRadius={130}
                  innerRadius={60}
                  fill="#8884d8"
                  label
                  paddingAngle={2}
                >
                  <Cell fill="#00C49F" />
                  <Cell fill="#FFBB28" />
                  <Cell fill="#FF8042" />
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ color: "#6b4b2b" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donations Bar Chart */}
        <div
          className="rounded-3xl border border-[#eadfce]
                     bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
                     shadow-[0_2px_8px_rgba(93,64,28,0.06)]
                     p-7 min-h-[420px]
                     transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                     hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
                     hover:ring-1 hover:ring-[#E49A52]/35"
        >
          <h3
            className="text-xl font-semibold mb-5"
            style={{ color: "#7a4f1c" }}
          >
            Donations
          </h3>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: "Donations",
                    Uploaded: donationStatus.uploaded,
                    Donated: donationStatus.donated,
                  },
                ]}
                margin={{ top: 10, right: 24, left: 0, bottom: 10 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eadfce" />
                <XAxis tickMargin={8} dataKey="name" stroke="#7c5d3b" />
                <YAxis allowDecimals={false} stroke="#7c5d3b" />
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ color: "#6b4b2b" }}
                />
                <Bar
                  dataKey="Uploaded"
                  fill="#0088FE"
                  barSize={70}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="Donated"
                  fill="#00C49F"
                  barSize={70}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charity Donation Tracking */}
      <div
        className="mt-10 rounded-3xl border border-[#eadfce]
                  bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
                  shadow-[0_2px_8px_rgba(93,64,28,0.06)]
                  p-7 min-h-[420px]
                  transition-all duration-300 ease-[cubic-bezier(.2,.9,.4,1)]
                  hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,0.18)]
                  hover:ring-1 hover:ring-[#E49A52]/35"
      >
        <h3 className="text-xl font-semibold mb-5" style={{ color: "#7a4f1c" }}>
          Charity Donation Tracking
        </h3>

        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.charities || []}
              margin={{ top: 10, right: 24, left: 0, bottom: 40 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eadfce" />
              <XAxis
                dataKey="name"
                tickMargin={8}
                stroke="#7c5d3b"
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis allowDecimals={false} stroke="#7c5d3b" />

              {/* Custom Tooltip */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: "#fff9f1",
                            border: "1px solid #eadfce",
                            borderRadius: "10px",
                            padding: "10px 14px",
                            lineHeight: "1.4em",
                            color: "#6b4b2b",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                            {data.name}
                          </div>
                          <div>
                            Total Donation Transaction:{" "}
                            <strong>{data["Total Donation Transaction"] || 0}</strong>
                          </div>
                          <div>
                            Total Donation Given:{" "}
                            <strong>{data["Total Donation Given"] || 0}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

              <Bar
                dataKey="Total Donation Transaction"
                fill="#0088FE"
                barSize={70}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BakeryAnalytics;