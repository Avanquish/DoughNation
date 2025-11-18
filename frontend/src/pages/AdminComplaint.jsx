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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Swal from "sweetalert2";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

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

  // Send reply to user
  const sendReply = async () => {
    if (!selectedComplaint || !replyMessage.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please enter a reply message.",
      });
      return;
    }

    try {
      await axios.post(
        `http://localhost:8000/complaints/${selectedComplaint.id}/reply`,
        { 
          message: replyMessage,
          status: "Resolved" 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire({
        icon: "success",
        title: "Reply Sent",
        text: "Your reply has been sent to the user and the complaint has been marked as resolved.",
        timer: 2500,
        showConfirmButton: false,
      });

      setSelectedComplaint(null);
      setReplyMessage("");
      fetchComplaints();
    } catch (err) {
      console.error("Error sending reply:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Send Reply",
        text: err.response?.data?.detail || "An error occurred while sending the reply.",
      });
    }
  };

  // Open reply dialog
  const openReplyDialog = (complaint) => {
    setSelectedComplaint(complaint);
    setReplyMessage("");
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
                      <th className="px-3 py-3 text-center font-semibold w-[200px]">
                        Actions
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
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Select
                              onValueChange={(val) => updateStatus(c.id, val)}
                              defaultValue={c.status}
                            >
                              <SelectTrigger className="w-[120px] rounded-full bg-white ring-1 ring-[#f2e3cf] text-[#6b4b2b] font-semibold text-xs">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>

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

                            <Button
                              onClick={() => openReplyDialog(c)}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-white
                                       bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                                       shadow-sm hover:brightness-105"
                              size="sm"
                            >
                              Send Message
                            </Button>
                          </div>
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

      {/* Reply Modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6
                     bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh]
                       rounded-3xl overflow-hidden bg-white
                       shadow-[0_24px_60px_rgba(0,0,0,.25)] ring-1 ring-black/10
                       flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
              <h3 className="text-xl font-extrabold text-[#4A2F17]">
                Send Reply to Complaint
              </h3>
              <p className="text-sm text-[#6b4b2b] mt-1">
                Complaint ID: {selectedComplaint.id} | Subject: {selectedComplaint.subject}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#4A2F17] mb-2">
                  Complaint Details:
                </p>
                <div className="rounded-xl bg-[#FFF9F1] border border-[#f2e3cf] p-4">
                  <p className="text-sm text-[#6b4b2b]">
                    <strong>User:</strong> {selectedComplaint.user_name || "Unknown"}
                  </p>
                  <p className="text-sm text-[#6b4b2b] mt-2">
                    <strong>Subject:</strong> {selectedComplaint.subject}
                  </p>
                  <p className="text-sm text-[#7b5836] mt-2">
                    <strong>Created:</strong> {new Date(selectedComplaint.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Your Reply Message <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply to the user here..."
                  rows={6}
                  className="w-full rounded-xl border-[#f2e3cf] focus:ring-2 focus:ring-[#E49A52] resize-none"
                />
                <p className="text-xs text-[#7b5836] mt-2">
                  This message will be sent to the user and the complaint will be marked as "Resolved".
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#FFF9F1] border-t border-[#f2e3cf] flex items-center justify-end gap-3">
              <Button
                onClick={() => setSelectedComplaint(null)}
                variant="outline"
                className="rounded-full border-[#e9d7c3] text-[#6b4b2b] hover:bg-[#fff6ec]"
              >
                Cancel
              </Button>
              <Button
                onClick={sendReply}
                className="rounded-full px-5 font-semibold text-white
                         bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                         shadow-md hover:brightness-105"
              >
                Send Reply & Resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}