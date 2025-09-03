import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Fetch all complaints
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://127.0.0.1:8000/complaints/", {
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
        `http://127.0.0.1:8000/complaints/${id}/status`,
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
        <CardHeader>
          <CardTitle>📋 Complaints Management</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p>No complaints submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Created</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="p-3">{c.id}</td>
                      <td className="p-3">{c.user_name || "Unknown"}</td>
                      <td className="p-3">{c.subject}</td>
                      <td className="p-3">{c.description}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            c.status === "pending"
                              ? "secondary"
                              : c.status === "resolved"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {new Date(c.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Select
                          onValueChange={(val) => updateStatus(c.id, val)}
                          defaultValue={c.status}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Change" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Review">In Review</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
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
