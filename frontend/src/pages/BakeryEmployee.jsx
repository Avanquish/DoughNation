import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import axios from "../api/axios";
import Swal from "sweetalert2";

// Helpers
const API_BASE =
  (axios?.defaults?.baseURL && axios.defaults.baseURL.replace(/\/$/, "")) ||
  "https://api.doughnationhq.cloud";
const toUrl = (p) => {
  if (!p) return null;
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
};

const BakeryEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [verified, setVerified] = useState(false);
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

  // Styles
  const labelTone = "block text-sm font-semibold text-[#6b4b2b]";
  const inputTone =
    "w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]";
  const sectionHeader =
    "p-4 sm:p-5 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]";
  const primaryBtn =
    "rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 font-semibold shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60";

  // Action button styles
  const actionBtnBase =
    "h-11 w-11 grid place-items-center rounded-full transition-all duration-200 shadow-[0_2px_6px_rgba(33,20,8,.06)] ring-1";
  const actionEdit =
    "bg-white/95 ring-[#eadfce] border border-[#eadfce] hover:bg-[#FFF6E9] hover:shadow-[0_8px_18px_rgba(191,115,39,.18)] hover:-translate-y-0.5";
  const actionDelete =
    "bg-[#fff3f3] ring-[#ffdede] border border-[#ffdede] hover:bg-[#ffeaea] hover:shadow-[0_8px_18px_rgba(200,30,30,.15)] hover:-translate-y-0.5";

  // Data fetching
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/employees`, { headers });
      setEmployees(res.data || []);
    } catch (e) {
      console.error("employees", e);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (verified) fetchEmployees();
  }, [verified]);

  // Helpers
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
    setFormData({
      name: "",
      role: "",
      start_date: "",
      profile_image_file: null,
    });
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

  // Handle verification
  const handleVerify = () => {
    const found = employees.find(
      (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
    );
    if (found) {
      Swal.fire({
        title: "Access Granted",
        text: `Welcome, ${found.name}!`,
        icon: "success",
        timer: 1400,
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

  // Save (add or edit)
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
        await axios.put(`${API_BASE}/employees/${editingEmployee.id}`, fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${API_BASE}/employees/`, fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      }

      await fetchEmployees();
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(null);
      setEditingEmployee(null);
      setIsDialogOpen(false);
      setFormData({
        name: "",
        role: "",
        start_date: "",
        profile_image_file: null,
      });

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
      await axios.delete(`${API_BASE}/employees/${id}`, { headers });
      await fetchEmployees();
      Swal.fire({
        title: "Deleted!",
        icon: "success",
        confirmButtonColor: "#C97C2C",
      });
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

  // Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-3xl font-extrabold text-[#4A2F17]">
            Employee Management
          </h2>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full bg-white/85 border border-[#efdcc3] text-[#6b4b2b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E49A52]" />
              {employees.length}{" "}
              {employees.length === 1 ? "Employee" : "Employees"}
            </span>

            <Button
              onClick={openAdd}
              disabled={employees.length > 0 && !verified}
              className={primaryBtn}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      {/* Verification Overlay */}
      {employees.length > 0 && !verified && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-white/60 backdrop-blur-md pt-20 sm:pt-24">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden max-w-md w-full">
            <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <h2 className="text-xl font-semibold text-[#4A2F17] text-center">
                Verify Access
              </h2>
            </div>
            <div className="p-6">
              <label
                className="block text-sm font-semibold text-[#6b4b2b]"
                htmlFor="verify_name"
              >
                Employee Name
              </label>
              <input
                id="verify_name"
                type="text"
                placeholder="e.g., Lisa"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] mt-1"
              />
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleVerify}
                  className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 font-semibold shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 active:scale-95"
                >
                  Enter Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Cards */}
      {verified && (
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {employees.length ? (
            employees.map((emp) => {
              const img = emp.profile_picture
                ? toUrl(emp.profile_picture)
                : null;
              const initial = (emp?.name || "?").charAt(0).toUpperCase();
              return (
                <div
                  key={emp.id}
                  className="transform-gpu rounded-2xl border border-[#f2e3cf] bg-white/90 shadow-[0_6px_18px_rgba(33,20,8,.06)] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_36px_rgba(191,115,39,.18)]"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white shadow bg-[#FFE7C5] grid place-items-center">
                          {img ? (
                            <img
                              src={img}
                              alt={emp.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold text-[#8a5a25]">
                              {initial}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-[#2f1f12]">
                            {emp.name}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                              {emp.role || "—"}
                            </span>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#E9F9EF] border border-[#c7ecd5] text-[#2b7a3f]">
                              Start: {emp.start_date || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          aria-label="Edit employee"
                          onClick={() => openEdit(emp)}
                          className={`${actionBtnBase} ${actionEdit}`}
                          title="Edit"
                        >
                          <Pencil
                            className="h-5 w-5 text-[#3b2a18]"
                            strokeWidth={2.4}
                          />
                        </button>
                        <button
                          aria-label="Delete employee"
                          onClick={() => handleDelete(emp.id)}
                          className={`${actionBtnBase} ${actionDelete}`}
                          title="Delete"
                        >
                          <Trash2
                            className="h-5 w-5 text-[#8f1f1f]"
                            strokeWidth={2.4}
                          />
                        </button>
                      </div>
                    </div>

                    {emp.access_rights && (
                      <div className="mt-5 text-sm text-[#7b5836]">
                        <span className="font-semibold text-[#6b4b2b]">
                          Access:
                        </span>{" "}
                        {emp.access_rights}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full">
              <div className="rounded-2xl border border-[#eadfce] bg-white/70 p-6 text-center text-[#7b5836]">
                No employees found.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Dialog — SAME FEEL AS DONATE NOW */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="
            fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            w-[min(94vw,900px)] sm:max-w-[860px]
            rounded-2xl border border-[#eadfce] p-0 overflow-hidden
            backdrop:bg-black/30
            flex flex-col max-h-[calc(100vh-7rem)]
            [&>button.absolute.right-4.top-4]:hidden
          "
        >
          {/* Sticky header */}
          <div className={`${sectionHeader} sticky top-0 z-10`}>
            <DialogHeader className="p-0">
              <DialogTitle className="text-[#6b4b2b]">
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-auto p-4 sm:p-5 grid gap-3 sm:grid-cols-2">
            {/* Profile photo (full width row) */}
            <div className="sm:col-span-2">
              <label className={labelTone}>Profile photo</label>
              <div className="mt-1 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-white/70 bg-[#FFE7C5] grid place-items-center">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-[#8a5a25]">
                      {(formData.name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageChange(e.target.files?.[0] || null)
                  }
                  className="bg-white rounded-md border-[#f2d4b5]"
                />
              </div>
            </div>

            {/* Name */}
            <div className="sm:col-span-2">
              <label className={labelTone}>Full Name</label>
              <input
                placeholder="e.g., Lisa"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={inputTone}
              />
            </div>

            {/* Role */}
            <div className="sm:col-span-2">
              <label className={labelTone}>Role</label>
              <Select
                value={formData.role}
                onValueChange={(v) => handleChange("role", v)}
              >
                <SelectTrigger className="bg-white rounded-md border-[#f2d4b5] focus:ring-2 focus:ring-[#E49A52]">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>

                <SelectContent
                  position="popper"
                  sideOffset={8}
                  className="
      z-[9999] rounded-md border border-[#f2d4b5] bg-white
      shadow-[0_12px_30px_rgba(33,20,8,.12)] overflow-hidden
      [&_svg]:hidden
    "
                >
                  {" "}
                  <SelectItem
                    value="Part Time Staff"
                    className="
        py-2 px-3 cursor-pointer
        hover:bg-[#f6f6f6] data-[highlighted]:bg-[#f6f6f6]
        focus:bg-[#f6f6f6]
        data-[state=checked]:bg-transparent data-[state=checked]:text-inherit
      "
                  >
                    Part Time Staff
                  </SelectItem>
                  <SelectItem
                    value="Full Time Staff"
                    className="
        py-2 px-3 cursor-pointer
        hover:bg-[#f6f6f6] data-[highlighted]:bg-[#f6f6f6]
        focus:bg-[#f6f6f6]
        data-[state=checked]:bg-transparent data-[state=checked]:text-inherit
      "
                  >
                    Full Time Staff
                  </SelectItem>
                  <SelectItem
                    value="Manager"
                    className="
        py-2 px-3 cursor-pointer
        hover:bg-[#f6f6f6] data-[highlighted]:bg-[#f6f6f6]
        focus:bg-[#f6f6f6]
        data-[state=checked]:bg-transparent data-[state=checked]:text-inherit
      "
                  >
                    Manager
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start date */}
            <div className="sm:col-span-2">
              <label className={labelTone}>Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className="bg-white rounded-md border-[#f2d4b5]"
              />
            </div>
          </div>

          {/* Sticky footer */}
          <DialogFooter className="sticky bottom-0 z-10 border-t bg-white p-3 sm:p-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDialogOpen(false);
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                setPreview(null);
              }}
              className="rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-5 py-2 shadow-sm hover:bg-white/90 transition"
            >
              Cancel
            </button>
            <button onClick={handleSave} className={primaryBtn}>
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BakeryEmployee;