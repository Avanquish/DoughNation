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
import { Megaphone, FileText, CheckCircle2, Clock } from "lucide-react";

export default function ComplaintModule({ isViewOnly = false }) {
  const [formData, setFormData] = useState({ subject: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [open, setOpen] = useState(false);

  const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US");
  };

  const fetchComplaints = async () => {
    try {
      // Get the appropriate token (employee token takes priority if it exists)
      const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/complaints/me", {
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

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the appropriate token (employee token takes priority if it exists)
      const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
      await axios.post("http://127.0.0.1:8000/complaints/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOpen(false);
      Swal.fire({
        icon: "success",
        title: "Complaint Submitted",
        text: "Your complaint has been successfully submitted.",
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

  // small helper for list chip look
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

  return (
    <div className="relative mx-auto max-w-[1280px] px-6 py-8">
      {/* Title + trigger */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#4A2F17]">
          Complaints
        </h1>

        {!isViewOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-full px-5 py-2 text-white shadow-md
                           bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                           hover:brightness-[1.03]"
              >
                Submit Complaint
              </Button>
            </DialogTrigger>

          {/* Submit dialog (unchanged logic; refreshed look) */}
          <DialogContent
            className="max-w-lg overflow-hidden rounded-3xl border border-[#eadfce] p-0
                       bg-gradient-to-br from-[#FFF9F1] via-white to-[#FFF1E3]
                       shadow-[0_24px_80px_rgba(191,115,39,.25)]"
          >
            <div className="bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199] border-b border-[#eadfce] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-full grid place-items-center bg-white/80 ring-1 ring-white/60 shadow-sm">
                  <Megaphone className="h-5 w-5" style={{ color: "#BF7327" }} />
                </span>
                <DialogHeader className="p-0 m-0">
                  <DialogTitle className="m-0 text-base sm:text-lg font-semibold tracking-tight text-[#4A2F17]">
                    Submit a Complaint
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
                    placeholder="Enter complaint subject"
                    className="pl-10 border-[#f2d4b5] bg-white/95
                               focus-visible:ring-[#E49A52] focus-visible:border-[#E49A52]
                               rounded-2xl shadow-sm"
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
                    placeholder="Describe your issue..."
                    rows={4}
                    className="pl-10 border-[#f2d4b5] bg-white/95
                               focus-visible:ring-[#E49A52] focus-visible:border-[#E49A52]
                               rounded-2xl shadow-sm"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full text-white
                             bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                             shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60
                             hover:-translate-y-0.5 active:scale-95 transition
                             hover:brightness-[1.03]"
                >
                  {loading ? "Submitting..." : "Submit Complaint"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* === Enhanced list === */}
      <Card className="rounded-2xl border border-[#eadfce] bg-white/80 shadow-[0_2px_10px_rgba(93,64,28,.06)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold text-[#4A2F17]">
            My Complaints
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-6 pt-4">
          {complaints.length === 0 ? (
            <p className="text-gray-500">No complaints submitted yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {complaints.map((c) => {
                const chip = statusChip(c.status);
                return (
                  <li
                    key={c.id}
                    className="relative rounded-2xl overflow-hidden
                               border border-[#f2e3cf] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
                               px-5 py-4 shadow-[0_2px_8px_rgba(93,64,28,.06)]
                               transition-all duration-300
                               hover:scale-[1.01] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)]
                               hover:ring-1 hover:ring-[#E49A52]/35"
                  >
                    {/* subtle status accent bar */}
                    <div
                      className={`absolute left-0 top-0 h-full w-1.5 ${chip.bar}`}
                    />

                    {/* header: subject + status chip */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold text-[#2b1a0b] leading-7">
                        {c.subject}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] text-[11px] font-semibold rounded-full border ${chip.cls}`}
                      >
                        {chip.icon}
                        {chip.label}
                      </span>
                    </div>

                    {/* body */}
                    {c.description && (
                      <p className="mt-2 text-[15px] text-[#5b4a3b] leading-relaxed">
                        {c.description}
                      </p>
                    )}

                    {/* footer meta */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#6b4b2b]">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}