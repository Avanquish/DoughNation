import React, { useState, useEffect } from "react";
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
import { Megaphone, FileText, CheckCircle2, Clock, Search } from "lucide-react";

export default function ComplaintModule({ isViewOnly = false }) {
  const [formData, setFormData] = useState({ subject: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [open, setOpen] = useState(false);

  // --- UI: search & pagination state ---
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US");
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
  }, [searchTerm, complaints.length]);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    }
  };

  const statusChip = (status) => {
    const s = String(status || "Pending")
      .trim()
      .toLowerCase();

    if (s === "resolved") {
      return {
        label: "Resolved",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        cls: "bg-[#FFE8C2] border-[#F0D3A6] text-[#7A4A1B]",
        bar: "bg-[#F6C17C]",
      };
    }

    if (s === "in review") {
      return {
        label: "In Review",
        icon: <Clock className="h-3.5 w-3.5" />,
        cls: "bg-[#FFF6E9] border-[#f4e6cf] text-[#8a5a25]",
        bar: "bg-[#FAD7A5]",
      };
    }

    return {
      label: "Pending",
      icon: <Clock className="h-3.5 w-3.5" />,
      cls: "bg-[#FFF1F1] border-[#f5caca] text-[#991b1b]",
      bar: "bg-[#F6C0C0]",
    };
  };

  // --- UI: search filtering + pagination ---
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredComplaints = complaints.filter((c) => {
    if (!normalizedSearch) return true;
    const fields = [c.subject, c.description, c.status];
    return fields.some((f) =>
      String(f || "")
        .toLowerCase()
        .includes(normalizedSearch)
    );
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
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold text-[#4A2F17]">
            My Concerns
          </CardTitle>

          <div className="relative w-full max-w-xs">
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
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold ${chip.cls}`}
                        >
                          {chip.icon}
                          {chip.label}
                        </span>
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
