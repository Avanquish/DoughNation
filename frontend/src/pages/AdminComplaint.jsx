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

  // Auth token for API requests
  const token = localStorage.getItem("token");

  // Fetch all complaints
  const fetchComplaints = async () => {
    //
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8000/complaints/", {
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
        `http://localhost:8000/complaints/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchComplaints();
    } catch (err) {
      console.error("Error updating complaint status:", err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // DESIGN
  const StatusPill = ({ value }) => {
    const v = (value || "").toLowerCase();
    const styles =
      v === "resolved"
        ? "bg-[#e8f7ee] text-[#166534] ring-[#bbecd0]"
        : v === "in review"
          ? "bg-[#fff7e6] text-[#8a5a25] ring-[#f3ddc0]"
          : "bg-[#fff1f1] text-[#991b1b] ring-[#f5caca]";
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ring-1 ${styles}`}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="p-2 sm:p-2">
      <div className="">
        <div className="p-2">
          {loading ? (
            <p className="text-center text-[#6b4b2b]">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <div className="rounded-2xl bg-white/90 ring-1 ring-[#e9d7c3] shadow p-8 text-center text-[#6b4b2b]/80">
              No complaints submitted yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-white/95 ring-1 ring-[#e9d7c3] shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  {/* Header */}
                  <thead className="bg-[#EADBC8] text-[#4A2F17]">
                    <tr>
                      <th className="px-3 py-3 text-center font-semibold w-[70px]">
                        ID
                      </th>
                      <th className="px-3 py-3 text-left font-semibold w-[160px]">
                        User
                      </th>
                      <th className="px-3 py-3 text-left font-semibold w-[220px]">
                        Subject
                      </th>
                      <th className="px-3 py-3 text-left font-semibold">
                        Details
                      </th>
                      <th className="px-3 py-3 text-center font-semibold w-[120px]">
                        Status
                      </th>
                      <th className="px-3 py-3 text-center font-semibold w-[170px]">
                        Created
                      </th>
                      <th className="px-3 py-3 text-center font-semibold w-[150px]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  {/* Rows */}
                  <tbody className="divide-y divide-[#f2d4b5]">
                    {complaints.map((c) => (
                      <tr
                        key={c.id}
                        className="odd:bg-white even:bg-white/80 hover:bg-[#fff6ec] relative z-[1] transform-gpu transition-colors transition-transform duration-200 hover:scale-[1.015] hover:shadow-[0_12px_28px_rgba(201,124,44,0.18)] hover:ring-1 hover:ring-[#e9d7c3]"
                      >
                        {" "}
                        <td className="px-3 py-3 text-center font-medium text-[#6b4b2b]">
                          {c.id}
                        </td>
                        <td className="px-3 py-3 text-[#3b2a18]">
                          {c.user_name || "Unknown"}
                        </td>
                        <td className="px-3 py-3 text-[#3b2a18]">
                          {c.subject}
                        </td>
                        <td className="px-3 py-3 text-[#7b5836]">
                          {c.description}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <StatusPill value={c.status} />
                        </td>
                        <td className="px-3 py-3 text-center text-[#7b5836]">
                          {new Date(c.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Select
                            onValueChange={(val) => updateStatus(c.id, val)}
                            defaultValue={c.status}
                          >
                            <SelectTrigger className="w-[140px] rounded-full bg-white ring-1 ring-[#f2e3cf] text-[#6b4b2b] font-semibold">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>

                            {/* White dropdown */}
                            <SelectContent className="bg-white shadow-lg rounded-md ring-1 ring-[#f2e3cf]">
                              <SelectItem
                                value="Pending"
                                className="relative pl-8 pr-8 py-2 text-sm rounded-sm cursor-default select-none outline-none
               data-[highlighted]:bg-[#fff6ec] data-[highlighted]:text-[#6b4b2b]
               data-[state=checked]:font-semibold"
                              >
                                Pending
                              </SelectItem>

                              <SelectItem
                                value="In Review"
                                className="relative pl-8 pr-8 py-2 text-sm rounded-sm cursor-default select-none outline-none
               data-[highlighted]:bg-[#fff6ec] data-[highlighted]:text-[#6b4b2b]
               data-[state=checked]:font-semibold"
                              >
                                In Review
                              </SelectItem>

                              <SelectItem
                                value="Resolved"
                                className="relative pl-8 pr-8 py-2 text-sm rounded-sm cursor-default select-none outline-none
               data-[highlighted]:bg-[#fff6ec] data-[highlighted]:text-[#6b4b2b]
               data-[state=checked]:font-semibold"
                              >
                                Resolved
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Footer */}
                  <tfoot>
                    <tr>
                      <td
                        colSpan={7}
                        className="h-2 bg-gradient-to-r from-transparent via-[#fbead5] to-transparent"
                      />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}