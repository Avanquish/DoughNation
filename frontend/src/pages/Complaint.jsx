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

export default function ComplaintModule() {
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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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

  return (
    <div className="relative mx-auto max-w-[1280px] px-6 py-8">
      {/* Title */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#4A2F17]">
          Complaints
        </h1>

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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#4A2F17]">
                Submit a Complaint
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#6b4b2b]">
                  Subject
                </label>
                <Input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Enter complaint subject"
                  className="border-[#f2d4b5] focus-visible:ring-[#E49A52]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#6b4b2b]">
                  Description
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Describe your issue..."
                  rows={4}
                  className="border-[#f2d4b5] focus-visible:ring-[#E49A52]"
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full text-white
                             bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                             hover:brightness-[1.03]"
                >
                  {loading ? "Submitting..." : "Submit Complaint"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List wrapper card */}
      <Card className="rounded-2xl border border-black/10 bg-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
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
              {complaints.map((c) => (
                <li
                  key={c.id}
                  className="rounded-2xl border border-black/10 bg-[#FFF6EC]
                             px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                             transform-gpu transition-all duration-300
                             ease-[cubic-bezier(.2,.9,.4,1)]
                             hover:scale-[1.02]
                             hover:shadow-[0_12px_30px_rgba(191,115,39,0.20)]
                             hover:ring-1 hover:ring-[#E49A52]/40
                             motion-reduce:hover:scale-100"
                >
                  <p className="text-xl font-semibold text-[#2b1a0b]">
                    {c.subject}
                  </p>

                  {c.description && (
                    <p className="mt-2 text-[15px] text-[#5b4a3b]">
                      {c.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
                    <p className="text-[#6b4b2b]">
                      <span className="font-semibold text-[#4A2F17]">
                        Status:
                      </span>{" "}
                      <span className="font-medium capitalize">
                        {c.status || "Pending"}
                      </span>
                    </p>
                    <p className="text-[#6b4b2b]">
                      <span className="font-semibold text-[#4A2F17]">
                        Created:
                      </span>{" "}
                      <span className="font-medium">
                        {formatDate(c.created_at || c.created || c.date)}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}