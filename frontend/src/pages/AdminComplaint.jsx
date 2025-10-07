import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Fetch all complaints
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://api.doughnationhq.cloud/complaints/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update complaint status
  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(
        `https://api.doughnationhq.cloud/complaints/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchComplaints(); // refresh
    } catch (err) {
      console.error("Error updating complaint status:", err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex justify-center">
          <CardTitle className="text-xl font-bold text-center">
            📋 Complaints Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p>No complaints submitted yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 text-sm font-semibold text-gray-700">
                  <tr>
                    <th className="p-3 border text-center">ID</th>
                    <th className="p-3 border text-center">User</th>
                    <th className="p-3 border text-center">Subject</th>
                    <th className="p-3 border text-center">Description</th>
                    <th className="p-3 border text-center">Status</th>
                    <th className="p-3 border text-center">Created</th>
                    <th className="p-3 border text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  {complaints.map((c) => (
                    <tr key={c.id} className="bg-white hover:bg-gray-50">
                      <td className="p-3 border text-center">{c.id}</td>
                      <td className="p-3 border text-center">
                        {c.user_name || "Unknown"}
                      </td>
                      <td className="p-3 border text-center">{c.subject}</td>
                      <td className="p-3 border">{c.description}</td>
                      <td className="p-3 border text-center">
                        <Badge
                          variant={
                            c.status.toLowerCase() === "pending"
                              ? "secondary"
                              : c.status.toLowerCase() === "resolved"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 border text-center">
                        {new Date(c.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 border text-center">
                        <Select
                          onValueChange={(val) => updateStatus(c.id, val)}
                          defaultValue={c.status}
                        >
                          <SelectTrigger className="w-[130px] bg-white">
                            <SelectValue placeholder="Change" />
                          </SelectTrigger>

                          {/* ✅ White dropdown, no checkmarks */}
                          <SelectContent className="bg-white shadow-md rounded-md">
                            <SelectItem
                              value="Pending"
                              className="[&>[data-state=checked]]:hidden"
                            >
                              Pending
                            </SelectItem>
                            <SelectItem
                              value="In Review"
                              className="[&>[data-state=checked]]:hidden"
                            >
                              In Review
                            </SelectItem>
                            <SelectItem
                              value="Resolved"
                              className="[&>[data-state=checked]]:hidden"
                            >
                              Resolved
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
