import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
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

  // Fetch user complaints
  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/complaints/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://127.0.0.1:8000/complaints/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        icon: "success",
        title: "Complaint Submitted",
        text: "Your complaint has been successfully submitted.",
      });

      setFormData({ subject: "", description: "" });
      fetchComplaints(); // refresh list
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
    <div className="flex flex-col items-center py-10 space-y-6">
      {/* Submit Complaint Button & Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="bg-[var(--brand2)] hover:bg-[var(--brand3)] text-white">
            Submit Complaint
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit a Complaint</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <Input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="Enter complaint subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Describe your issue..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-[var(--brand2)] hover:bg-[var(--brand3)] text-white"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Complaint"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complaints List */}
      <Card className="w-full max-w-2xl shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            My Complaints
          </CardTitle>
        </CardHeader>
        <CardContent>
          {complaints.length === 0 ? (
            <p className="text-gray-500">No complaints submitted yet.</p>
          ) : (
            <ul className="space-y-3">
              {complaints.map((c) => (
                <li
                  key={c.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition"
                >
                  <p className="font-semibold">{c.subject}</p>
                  <p className="text-sm text-gray-600">{c.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Status:{" "}
                    <span className="font-medium capitalize">
                      {c.status || "Pending"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}