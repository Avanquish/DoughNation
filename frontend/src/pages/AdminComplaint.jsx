import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Swal from "sweetalert2";
import { Grid2x2, Search as SearchIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatDate = (s) => {
  if (!s) return "—";

  let value = s;

  // pag walang timezone, treat as UTC para hindi mag-shift
  if (
    typeof s === "string" &&
    !/[zZ]|[+\-]\d{2}:\d{2}$/.test(s) // no Z or +08:00, etc.
  ) {
    value = s + "Z";
  }

  const d = new Date(value);
  if (isNaN(d)) return "—";

  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  // --- UI: search + status filter + pagination ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // max 10 concerns per page

  // --- COLUMN VISIBILITY STATE ---
  const columnConfig = [
    { key: "id", label: "ID" },
    { key: "user", label: "User" },
    { key: "subject", label: "Subject" },
    { key: "details", label: "Details" },
    { key: "status", label: "Status" },
    { key: "created", label: "Created" },
    { key: "actions", label: "Actions" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(
    columnConfig.reduce((acc, col) => {
      acc[col.key] = true;
      return acc;
    }, {})
  );

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auth token for API requests
  const token = localStorage.getItem("token");

  // Fetch all complaints
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://api.doughnationhq.cloud/complaints/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // sort by created_at asc para stable base order
      const sortedComplaints = [...res.data].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      setComplaints(sortedComplaints);
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
        `https://api.doughnationhq.cloud/complaints/${selectedComplaint.id}/reply`,
        {
          message: replyMessage,
          status: "Resolved",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire({
        icon: "success",
        title: "Reply Sent",
        text: "Your reply has been sent to the user and the user concern has been marked as resolved.",
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
        text:
          err.response?.data?.detail ||
          "An error occurred while sending the reply.",
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

  // kapag nagbago search / filter / length -> balik page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, complaints.length]);

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

  // --- HELPER: status priority for sorting (Pending top, In Review mid, Resolved bottom) ---
  const getStatusPriority = (status) => {
    const v = (status || "").toLowerCase();
    if (v === "pending") return 0;
    if (v === "in review") return 1;
    if (v === "resolved") return 2;
    return 3;
  };

  // --- COUNTS FOR FILTER CHIPS ---
  const statusCounts = complaints.reduce(
    (acc, c) => {
      acc.All += 1;
      const v = (c.status || "").toLowerCase();
      if (v === "pending") acc.Pending += 1;
      else if (v === "in review") acc["In Review"] += 1;
      else if (v === "resolved") acc.Resolved += 1;
      return acc;
    },
    { All: 0, Pending: 0, "In Review": 0, Resolved: 0 }
  );

  // --- DERIVED: filtered + sorted complaints ---
  const filteredComplaints = [...complaints]
    .filter((c) => {
      // status filter
      const v = (c.status || "").toLowerCase();
      const filter = statusFilter.toLowerCase();
      const matchesStatus = filter === "all" ? true : v === filter;

      // search filter (user, subject, description, status)
      const term = searchTerm.trim().toLowerCase();
      if (!term) return matchesStatus;

      const haystack = [c.user_name, c.subject, c.description, c.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && haystack.includes(term);
    })
    .sort((a, b) => {
      // 1) status priority
      const pa = getStatusPriority(a.status);
      const pb = getStatusPriority(b.status);
      if (pa !== pb) return pa - pb;

      // 2) created_at desc (latest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });

  // --- PAGINATION COMPUTE (max 10 per page) ---
  const totalPages =
    filteredComplaints.length === 0
      ? 1
      : Math.ceil(filteredComplaints.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;

  const paginatedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );

  // --- STATUS FILTER CHIPS ---
  const filterButtons = [
    {
      key: "All",
      label: `All (${statusCounts.All})`,
      tone: "bg-white",
    },
    {
      key: "Pending",
      label: `Pending (${statusCounts.Pending})`,
      tone: "bg-red-100",
    },
    {
      key: "In Review",
      label: `In Review (${statusCounts["In Review"]})`,
      tone: "bg-amber-100",
    },
    {
      key: "Resolved",
      label: `Resolved (${statusCounts.Resolved})`,
      tone: "bg-green-100",
    },
  ];

  return (
    <div className="p-2 sm:p-2">
      <div className="">
        <div className="p-2">
          {loading ? (
            <p className="text-center text-[#6b4b2b]">
              Loading user concerns...
            </p>
          ) : complaints.length === 0 ? (
            <div className="rounded-2xl bg-white/90 ring-1 ring-[#e9d7c3] shadow p-8 text-center text-[#6b4b2b]/80">
              No user concerns submitted yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-white/95 ring-1 ring-[#e9d7c3] shadow overflow-hidden">
              {/* --- TOP TOOLBAR --- */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {/* LEFT SIDE: filters + column button */}
                  <div className="flex flex-col gap-2 items-stretch sm:flex-row sm:flex-wrap sm:items-center">
                    {/* Status filter pills */}
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#FFF6EC] px-1 py-1 shadow-sm ring-1 ring-[#f2e3cf]">
                      {filterButtons.map(({ key, label, tone }) => {
                        const active = statusFilter === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            className={
                              "text-xs sm:text-sm rounded-full px-3 py-1 transition font-semibold " +
                              (active
                                ? "text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow"
                                : `text-[#6b4b2b] ${tone} hover:brightness-95`)
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Column dropdown button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#f2d4b5] bg-white px-4 py-2 text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-white/90 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
                          data-dropdown-trigger
                        >
                          <Grid2x2 className="w-4 h-4" />
                          <span>Column</span>
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="start"
                        sideOffset={8}
                        className="z-50 bg-white p-2 rounded-xl border border-[#f2d4b5] shadow-lg"
                      >
                        {columnConfig.map((col) => (
                          <DropdownMenuCheckboxItem
                            key={col.key}
                            checked={visibleColumns[col.key]}
                            onCheckedChange={() => toggleColumn(col.key)}
                            className="pl-8 pr-3 py-2 rounded-lg hover:bg-[#FFF6EC] focus:bg-[#FFF1E2] cursor-pointer text-sm text-[#4A2F17]"
                          >
                            {col.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* RIGHT SIDE: search bar */}
                  <div className="w-full sm:w-72 md:w-80">
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded-full border border-[#e5e7eb] bg-white/90 py-2 pl-9 pr-3 text-sm text-[#374151] shadow-sm focus:outline-none
                                   focus:ring-2 focus:ring-[#E49A52] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* --- TABLE --- */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  {/* Header */}
                  <thead className="bg-[#EADBC8] text-[#4A2F17]">
                    <tr>
                      {visibleColumns.id && (
                        <th className="px-3 py-3 text-center font-semibold w-[70px]">
                          ID
                        </th>
                      )}
                      {visibleColumns.user && (
                        <th className="px-3 py-3 text-left font-semibold w-[160px]">
                          User
                        </th>
                      )}
                      {visibleColumns.subject && (
                        <th className="px-3 py-3 text-left font-semibold w-[220px]">
                          Subject
                        </th>
                      )}
                      {visibleColumns.details && (
                        <th className="px-3 py-3 text-left font-semibold">
                          Details
                        </th>
                      )}
                      {visibleColumns.status && (
                        <th className="px-3 py-3 text-center font-semibold w-[120px]">
                          Status
                        </th>
                      )}
                      {visibleColumns.created && (
                        <th className="px-3 py-3 text-center font-semibold w-[170px]">
                          Created
                        </th>
                      )}
                      {visibleColumns.actions && (
                        <th className="px-3 py-3 text-center font-semibold w-[200px]">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  {/* Rows */}
                  <tbody className="divide-y divide-[#f2d4b5]">
                    {filteredComplaints.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-[#6b4b2b]"
                        >
                          No user concerns match your filter/search.
                        </td>
                      </tr>
                    ) : (
                      paginatedComplaints.map((c, index) => (
                        <tr
                          key={c.id}
                          className="odd:bg-white even:bg-white/80 hover:bg-[#fff6ec] relative z-[1] transition-colors duration-200 hover:shadow-[0_12px_28px_rgba(201,124,44,0.18)] hover:ring-1 hover:ring-[#e9d7c3]"
                        >
                          {visibleColumns.id && (
                            <td className="px-3 py-3 text-center font-medium text-[#6b4b2b]">
                              {startIndex + index + 1}
                            </td>
                          )}
                          {visibleColumns.user && (
                            <td className="px-3 py-3 text-[#3b2a18]">
                              {c.user_name || "Unknown"}
                            </td>
                          )}
                          {visibleColumns.subject && (
                            <td className="px-3 py-3 text-[#3b2a18]">
                              {c.subject}
                            </td>
                          )}
                          {visibleColumns.details && (
                            <td className="px-3 py-3 text-[#7b5836]">
                              {c.description}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-3 py-3 text-center">
                              <StatusPill value={c.status} />
                            </td>
                          )}
                          {visibleColumns.created && (
                            <td className="px-3 py-3 text-center text-[#7b5836]">
                              {formatDate(c.created_at)}
                            </td>
                          )}

                          {visibleColumns.actions && (
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {/* STATUS DROPDOWN */}
                                <Select
                                  onValueChange={(val) =>
                                    updateStatus(c.id, val)
                                  }
                                  defaultValue={c.status}
                                >
                                  <SelectTrigger className="w-[150px] justify-between rounded-full border border-[#f2e3cf] bg-[#FFF9F1] px-4 py-2 text-xs sm:text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-[#FFEBD5] focus:ring-2 focus:ring-[#E49A52] focus:ring-offset-0">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>

                                  <SelectContent className="min-w-[180px] rounded-2xl border border-[#f2e3cf] bg-white shadow-xl py-1">
                                    <SelectItem
                                      value="Pending"
                                      className="relative cursor-pointer select-none px-4 py-2 text-sm text-[#4A2F17] outline-none data-[highlighted]:bg-[#FFF6EC] data-[highlighted]:text-[#4A2F17] data-[state=checked]:bg-[#FFF1DA] data-[state=checked]:font-semibold [&>span:first-child]:hidden"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                                        <span>Pending</span>
                                      </div>
                                    </SelectItem>

                                    <SelectItem
                                      value="In Review"
                                      className="relative cursor-pointer select-none px-4 py-2 text-sm text-[#4A2F17] outline-none data-[highlighted]:bg-[#FFF6EC] data-[highlighted]:text-[#4A2F17] data-[state=checked]:bg-[#FFF1DA] data-[state=checked]:font-semibold [&>span:first-child]:hidden"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#FACC15]" />
                                        <span>In Review</span>
                                      </div>
                                    </SelectItem>

                                    <SelectItem
                                      value="Resolved"
                                      className="relative cursor-pointer select-none px-4 py-2 text-sm text-[#4A2F17] outline-none data-[highlighted]:bg-[#FFF6EC] data-[highlighted]:text-[#4A2F17] data-[state=checked]:bg-[#FFF1DA] data-[state=checked]:font-semibold [&>span:first-child]:hidden"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                                        <span>Resolved</span>
                                      </div>
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
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Footer stripe */}
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

              {/* --- PAGINATION FOOTER --- */}
              <div className="flex flex-col gap-2 px-4 py-3 border-t border-[#f2d4b5] text-xs text-[#6b4b2b] sm:flex-row sm:items-center sm:justify-between">
                <span className="opacity-80">
                  Showing {filteredComplaints.length === 0 ? 0 : startIndex + 1}
                  –{Math.min(startIndex + pageSize, filteredComplaints.length)}{" "}
                  of {filteredComplaints.length}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 rounded-full border-[#f2d4b5] bg-white/90 px-3 text-xs"
                  >
                    Previous
                  </Button>

                  <span className="text-[11px] font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="h-8 rounded-full border-[#f2d4b5] bg-white/90 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6
                     bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="w-full max-w-lg sm:max-w-2xl
           max-h-[78vh] sm:max-h-[72vh]
           rounded-3xl overflow-hidden bg-white
           shadow-[0_24px_60px_rgba(0,0,0,.25)] ring-1 ring-black/10
           flex flex-col
           translate-y-10 sm:translate-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
              <h3 className="text-xl font-extrabold text-[#4A2F17]">
                Send Reply to User Concern
              </h3>
              <p className="text-sm text-[#6b4b2b] mt-1">
                Concern ID: {selectedComplaint.id}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#4A2F17] mb-2">
                  User Concern Details:
                </p>
                <div className="rounded-xl bg-[#FFF9F1] border border-[#f2e3cf] p-4">
                  <p className="text-sm text-[#6b4b2b]">
                    <strong>User:</strong>{" "}
                    {selectedComplaint.user_name || "Unknown"}
                  </p>
                  <p className="text-sm text-[#6b4b2b] mt-2">
                    <strong>Subject:</strong> {selectedComplaint.subject}
                  </p>
                  <p className="text-sm text-[#7b5836] mt-2">
                    <strong>Created:</strong>{" "}
                    {formatDate(selectedComplaint.created_at)}
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
                  This message will be sent to the user and the concerns will be
                  marked as "Resolved".
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