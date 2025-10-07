import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import axios from "../api/axios";
import Swal from "sweetalert2";

// Try to use the axios instance baseURL, fallback to localhost
const API_BASE =
  (axios?.defaults?.baseURL && axios.defaults.baseURL.replace(/\/$/, "")) ||
  "https://api.doughnationhq.cloud/";

// Build an absolute URL from possibly-relative path
const toUrl = (p) => {
  if (!p) return null;
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
};

const BakeryEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [verified, setVerified] = useState(false); // Access control (unchanged logic)
  const [employeeName, setEmployeeName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    start_date: "",
    profile_image_file: null,
  });
  const [preview, setPreview] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Tones
  const labelTone = "block text-sm font-medium text-[#6b4b2b]";
  const inputTone =
    "w-full rounded-md border border-[#f2d4b5] bg-white/95 p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]";
  const sectionHeader =
    "p-5 sm:p-6 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]";

  // Buttons
  const bounce =
    "transition-transform duration-150 hover:-translate-y-0.5 active:scale-95";
  const pillSolid = `rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 ${bounce}`;

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/employees`, { headers });
      setEmployees(res.data);
    } catch (e) {
      console.error("employees", e);
    }
  };

    useEffect(() => {
        fetchEmployees();
      }, []);

 // Fetch inventory if verified.
  useEffect(() => {
    if (verified) fetchEmployees();
  }, [verified]);

  // helpers
  const handleChange = (key, value) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const handleImageChange = (file) => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFormData((p) => ({ ...p, profile_image_file: file || null }));
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const openAdd = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setEditingEmployee(null);
    setFormData({ name: "", role: "", start_date: "", profile_image_file: null });
    setIsDialogOpen(true);
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp?.name || "",
      role: emp?.role || "",
      start_date: emp?.start_date || "",
      profile_image_file: null,
    });
    setPreview(emp?.profile_picture ? toUrl(emp.profile_picture) : null);
    setIsDialogOpen(true);
  };

  // Employee verification.
  const handleVerify = () => {
    const found = employees.find(
      (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
      );
      if (found) {
        Swal.fire({
          title: "Access Granted",
          text: `Welcome, ${found.name}!`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        setVerified(true);
      } else {
        Swal.fire({
          title: "Employee Not Found",
          text: "Please enter a valid employee name.",
          icon: "error",
        });
      }
    };

  // save
  const handleSave = async () => {
    if (editingEmployee) {
      setIsDialogOpen(false);
      const ok = await Swal.fire({
        title: "Save Changes?",
        text: "Update this employee's details?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Save",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#C97C2C",
      });
      if (!ok.isConfirmed) {
        setIsDialogOpen(true);
        return;
      }
    }

    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("role", formData.role);
      fd.append("start_date", formData.start_date);

      if (formData.profile_image_file) {
        fd.append("profile_picture", formData.profile_image_file);
      }

      if (editingEmployee) {
        await axios.put(`/employees/${editingEmployee.id}`, fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post("/employees/", fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      }

      await fetchEmployees();
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(null);
      setEditingEmployee(null);
      setIsDialogOpen(false);
      setFormData({ name: "", role: "", start_date: "", profile_image_file: null });

      Swal.fire({
        title: "Success!",
        text: editingEmployee ? "Employee updated." : "Employee added.",
        icon: "success",
        confirmButtonColor: "#C97C2C",
      });
    } catch (e) {
      console.error("save employee", e);
      Swal.fire({
        title: "Error",
        text: "Could not save employee.",
        icon: "error",
        confirmButtonColor: "#C97C2C",
      });
    }
  };

  const handleDelete = async (id) => {
    setIsDialogOpen(false);
    const ok = await Swal.fire({
      title: "Delete Employee?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#C97C2C",
    });
    if (!ok.isConfirmed) return;

    try {
      await axios.delete(`/employees/${id}`, { headers });
      await fetchEmployees();
      Swal.fire({ title: "Deleted!", icon: "success", confirmButtonColor: "#C97C2C" });
    } catch (e) {
      console.error("delete employee", e);
      Swal.fire({
        title: "Error",
        text: "Could not delete employee.",
        icon: "error",
        confirmButtonColor: "#C97C2C",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="gwrap hover-lift reveal r1">
        <div className="glass-card p-5 rounded-[15px] shadow-none border border-white/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Employee Management</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add, edit, or remove bakery employees
              </p>
            </div>
            <Button onClick={openAdd} 
              //Only disable Add Employee if there are employees but user is not verified
              disabled={employees.length > 0 && !verified}

            className="btn-logout flex items-center gap-2">

              <Plus className="h-4 w-4" />
              <span>Add Employee</span>
            </Button>
          </div>
        </div>
      </div>

    {/* Verification Modal, only shows if employees exist */}
    {employees.length > 0 && !verified && (
      <div className="fixed inset-35 z-50 flex items-center justify-center bg-transparent bg-opacity-40">
        <div className="bg-white rounded-2xl shadow-2xl ring-1 overflow-hidden max-w-md w-full">
          <div className={sectionHeader}>
            <h2 className="text-xl font-semibold text-[#6b4b2b] text-center">
              Verify Access
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="space-y-3">
              <label className={labelTone} htmlFor="verify_name">
                Employee Name
              </label>
              <input
                id="verify_name"
                type="text"
                placeholder="Enter employee name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                className={inputTone}
              />
              <p className="text-xs text-gray-500">
                Type your name exactly as saved by HR to continue.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={handleVerify} className={pillSolid}>
                Enter Employee
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Only show employee cards if verified */}
      {verified && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {employees.length ? (
            employees.map((emp) => {
              const img = emp.profile_picture ? toUrl(emp.profile_picture) : null;
              const initial = (emp?.name || "?").charAt(0).toUpperCase();
              return (
                <div key={emp.id} className="gwrap hover-lift reveal">
                  <div className="glass-card shadow-none rounded-[15px] p-5 relative border border-white/70">
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="bg-white/80 backdrop-blur hover:bg-white"
                        onClick={() => openEdit(emp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(emp.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-white/70 shadow bg-[#FFE7C5] flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-[#8a5a25]">{initial}</span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold">{emp.name}</h3>
                      <p className="text-sm text-muted-foreground">{emp.role}</p>

                      <div className="mt-4 w-full border-t border-white/70 pt-3 text-sm text-gray-700">
                        <p>
                          <strong className="text-[#6b4b2b]">Start Date:</strong>{" "}
                          <span className="text-[#6b4b2b]/80">{emp.start_date}</span>
                        </p>
                        {emp.access_rights && (
                          <p>
                            <strong className="text-[#6b4b2b]">Access:</strong>{" "}
                            <span className="text-[#6b4b2b]/80">{emp.access_rights}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="gwrap reveal hover-lift col-span-full">
              <div className="glass-card rounded-[15px] p-6 border border-white/70 text-center">
                <p className="text-gray-600">No employees found.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border border-white/70">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* image picker + preview */}
            <div>
              <label className="block text-sm font-medium text-[#6b4b2b] mb-1">
                Profile photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-white/70 bg-[#FFE7C5] flex items-center justify-center">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-[#8a5a25]">
                      {(formData.name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                  className="bg-white/90"
                />
              </div>
            </div>

            <Input
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="bg-white/90"
            />

            <Select value={formData.role} onValueChange={(v) => handleChange("role", v)}>
              <SelectTrigger className="bg-white/90">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="Part Time Staff" className="hover:bg-gray-100">Part Time Staff</SelectItem>
                <SelectItem value="Full Time Staff" className="hover:bg-gray-100">Full Time Staff</SelectItem>
                <SelectItem value="Manager" className="hover:bg-gray-100">Manager</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className="bg-white/90"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="btn-logout">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BakeryEmployee;