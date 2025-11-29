import React, { useState, useEffect } from "react";
import { useSubmitGuard } from "../hooks/useDebounce";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import Swal from "sweetalert2";
import { Megaphone, FileText, CheckCircle2, Clock, Search, Trash2 } from "lucide-react";

export default function ComplaintModule({ isViewOnly = false }) {
  const [formData, setFormData] = useState({ subject: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- UI: search & pagination state ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

const formatDate = (s) => {
  if (!s) return "—";

  // Parse datetime string - treat as Philippines time (UTC+8)
  // Backend sends: "2024-11-29 18:40:00" (already in PH time)
  let dateStr = s;
  
  // Add 'T' if space exists (SQL datetime format)
  if (typeof s === "string" && s.includes(' ')) {
    dateStr = s.replace(' ', 'T');
  }
  
  // Parse as UTC first, then subtract 8 hours to get the correct UTC time
  // because the string is actually PH time (UTC+8)
  const d = new Date(dateStr + '+08:00'); // Tell JS this is UTC+8
  
  if (isNaN(d)) return "—";

  // Display in Philippines timezone
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

  const fetchComplaints = async () => {
    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/complaints/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // --- UI: reset to page 1 if there are new search or new complaints ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, complaints.length]);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setLoading(true);

    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      await axios.post("http://localhost:8000/complaints/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOpen(false);
      Swal.fire({
        icon: "success",
        title: "Concern Submitted",
        text: "Your concern has been successfully submitted.",
      });

      setFormData({ subject: "", description: "" });
      fetchComplaints();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err.response?.data?.detail ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (complaintId) => {
    if (isDeleting) return;
    
    const result = await Swal.fire({
      title: "Delete Concern?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#BF7327",
      cancelButtonColor: "#6b4b2b",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setIsDeleting(true);
    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      await axios.delete(`http://localhost:8000/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Your concern has been deleted.",
        timer: 2000,
        showConfirmButton: false,
      });

      fetchComplaints();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err.response?.data?.detail ||
          "Failed to delete concern. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const statusChip = (status) => {
    const s = String(status || "Pending")
      .trim()
      .toLowerCase();

    // Resolved = GREEN (match filters)
    if (s === "resolved") {
      return {
        label: "Resolved",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        // badge
        cls: "bg-green-100 border-green-200 text-green-800",
        // left accent bar
        bar: "bg-green-300",
      };
    }

    // In Review = YELLOW (match filters)
    if (s === "in review") {
      return {
        label: "In Review",
        icon: <Clock className="h-3.5 w-3.5" />,
        cls: "bg-amber-100 border-amber-200 text-amber-800",
        bar: "bg-amber-300",
      };
    }

    // Pending = RED (match filters)
    return {
      label: "Pending",
      icon: <Clock className="h-3.5 w-3.5" />,
      cls: "bg-red-100 border-red-200 text-red-800",
      bar: "bg-red-300",
    };
  };

  // --- UI: search + status filter + pagination ---
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // status priority: Pending (top), In Review (mid), Resolved (bottom)
  const getStatusPriority = (status) => {
    const v = (status || "").toLowerCase();
    if (v === "pending") return 0;
    if (v === "in review") return 1;
    if (v === "resolved") return 2;
    return 3;
  };

  // counts for filter chips
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

  // filter buttons
  const filterButtons = [
    { key: "All", label: `All (${statusCounts.All})`, tone: "bg-white" },
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

  // filter by status + search
  const filteredComplaints = [...complaints]
    .filter((c) => {
      const v = (c.status || "").toLowerCase();
      const filter = statusFilter.toLowerCase();
      const matchesStatus = filter === "all" ? true : v === filter;

      if (!normalizedSearch) return matchesStatus;

      const haystack = [c.subject, c.description, c.status]
        .map((f) => String(f || "").toLowerCase())
        .join(" ");

      return matchesStatus && haystack.includes(normalizedSearch);
    })
    .sort((a, b) => {
      const pa = getStatusPriority(a.status);
      const pb = getStatusPriority(b.status);
      if (pa !== pb) return pa - pb;

      const da = new Date(a.created_at || a.created || a.date);
      const db = new Date(b.created_at || b.created || b.date);
      return db - da;
    });

  const totalPages =
    filteredComplaints.length === 0
      ? 1
      : Math.ceil(filteredComplaints.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div className="relative mx-auto max-w-[1280px] p-2">
      {/* Title + trigger */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#4A2F17]">
          Concerns
        </h1>

        {!isViewOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-full px-5 py-2 text-white shadow-md
                           bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                           hover:brightness-[1.03]"
              >
                Submit Concern
              </Button>
            </DialogTrigger>

            <DialogContent
              className="max-w-lg overflow-hidden rounded-3xl border border-[#eadfce] p-0
                         bg-gradient-to-br from-[#FFF9F1] via-white to-[#FFF1E3]
                         shadow-[0_24px_80px_rgba(191,115,39,.25)]
                         [&>button]:hidden"
            >
              <div className="border-b border-[#eadfce] bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow-sm ring-1 ring-white/60">
                    <Megaphone
                      className="h-5 w-5"
                      style={{ color: "#BF7327" }}
                    />
                  </span>
                  <DialogHeader className="m-0 p-0">
                    <DialogTitle className="m-0 text-base font-semibold tracking-tight text-[#4A2F17] sm:text-lg">
                      Submit a Concern
                    </DialogTitle>
                  </DialogHeader>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#6b4b2b]">
                    Subject
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
                      <Megaphone
                        className="h-4 w-4 opacity-70"
                        style={{ color: "#BF7327" }}
                      />
                    </span>
                    <Input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="Enter concern subject"
                      className="rounded-2xl border-[#f2d4b5] bg-white/95 pl-10
                                 shadow-sm focus-visible:border-[#E49A52] focus-visible:ring-[#E49A52]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#6b4b2b]">
                    Description
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-3">
                      <FileText
                        className="h-4 w-4 opacity-70"
                        style={{ color: "#BF7327" }}
                      />
                    </span>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      placeholder="Describe your concern..."
                      rows={4}
                      className="rounded-2xl border-[#f2d4b5] bg-white/95 pl-10
                                 shadow-sm focus-visible:border-[#E49A52] focus-visible:ring-[#E49A52]"
                    />
                  </div>
                </div>

                <DialogFooter className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-full border border-[#f2d4b5] bg-white/90
                               text-[#6b4b2b] shadow-sm hover:bg-[#FFF3E6]
                               sm:w-auto sm:flex-1"
                    variant="outline"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full text-white
                               bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                               shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60
                               transition hover:-translate-y-0.5 hover:brightness-[1.03]
                               active:scale-95 sm:w-auto sm:flex-1"
                  >
                    {loading ? "Submitting..." : "Submit Concern"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="rounded-2xl border border-[#eadfce] bg-white/80 shadow-[0_2px_10px_rgba(93,64,28,.06)]">
        {/* --- UI: header + search bar --- */}
        <CardHeader className="space-y-3 pb-2">
          {/* Row 1: Title only */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-[#4A2F17]">
              My Concerns
            </CardTitle>
          </div>

          {/* Row 2: Filters LEFT, Search RIGHT */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* status filter pills */}
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

            {/* search bar – laging nasa right sa large screens */}
            <div className="relative w-full sm:w-64 md:w-80">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search concerns..."
                className="h-9 rounded-full border-[#f2d4b5] bg-white/95 pl-9 text-sm shadow-sm focus-visible:border-[#E49A52] focus-visible:ring-[#E49A52]"
              />
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
                <Search
                  className="h-3.5 w-3.5 text-[#4b5563]"
                  strokeWidth={2.2}
                />
              </span>
            </div>
          </div>
        </CardHeader>

        {/* --- UI: list + pagination --- */}
        <CardContent className="pb-4 pt-3">
          {complaints.length === 0 ? (
            <p className="text-sm text-gray-500">No concerns submitted yet.</p>
          ) : filteredComplaints.length === 0 ? (
            <p className="text-sm text-gray-500">
              No concerns match your search.
            </p>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3">
                {paginatedComplaints.map((c) => {
                  const chip = statusChip(c.status);
                  return (
                    <li
                      key={c.id}
                      className="relative overflow-hidden rounded-xl
                                 border border-[#f2e3cf] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
                                 px-4 py-3 text-sm shadow-[0_2px_8px_rgba(93,64,28,.06)]
                                 transition-all duration-200
                                 hover:scale-[1.005] hover:shadow-[0_10px_24px_rgba(191,115,39,.16)]
                                 hover:ring-1 hover:ring-[#E49A52]/35"
                    >
                      <div
                        className={`absolute left-0 top-0 h-full w-1 ${chip.bar}`}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-[15px] font-semibold leading-6 text-[#2b1a0b]">
                          {c.subject}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold ${chip.cls}`}
                          >
                            {chip.icon}
                            {chip.label}
                          </span>
                          {!isViewOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(c.id);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full
                                         border border-red-200 bg-red-50 text-red-600
                                         transition-all hover:bg-red-100 hover:border-red-300
                                         hover:shadow-sm active:scale-95"
                              title="Delete concern"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {c.description && (
                        <p className="mt-1.5 max-h-16 overflow-hidden text-[13px] leading-relaxed text-[#5b4a3b]">
                          {c.description}
                        </p>
                      )}

                      {c.admin_reply && (
                        <div className="mt-3 rounded-lg border border-[#d4f4dd] bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] p-3 shadow-sm">
                          <div className="mb-1.5 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#166534]" />
                            <span className="text-[12px] font-bold text-[#166534]">
                              Admin Response
                            </span>
                            {c.replied_at && (
                              <>
                                <span className="opacity-40 text-[#166534]">
                                  •
                                </span>
                                <span className="text-[11px] text-[#166534]/80">
                                  {formatDate(c.replied_at)}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[13px] leading-relaxed text-[#15803d]">
                            {c.admin_reply}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#6b4b2b]">
                        <span className="font-semibold text-[#4A2F17]">
                          Status:
                        </span>
                        <span className="capitalize">
                          {c.status || "Pending"}
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="font-semibold text-[#4A2F17]">
                          Created:
                        </span>
                        <span>
                          {formatDate(c.created_at || c.created || c.date)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-col items-center gap-2 border-t border-[#f2e3cf] pt-3 text-xs text-[#6b4b2b] sm:flex-row sm:justify-between">
                <span className="opacity-80">
                  Showing {startIndex + 1}–
                  {Math.min(startIndex + pageSize, filteredComplaints.length)}{" "}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
