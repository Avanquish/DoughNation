import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSubmitGuard } from "../hooks/useDebounce";
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
import { Pencil, Trash2, Plus, Search, KeyRound } from "lucide-react";
import axios from "../api/axios";
import Swal from "sweetalert2";

// Helpers
const API_BASE =
  (axios?.defaults?.baseURL && axios.defaults.baseURL.replace(/\/$/, "")) ||
  "http://localhost:8000";
const toUrl = (p) => {
  if (!p) return null;
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
};

const BakeryEmployee = ({ isViewOnly = false }) => {
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- pagination (max 10 per page) ---
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Get the appropriate token (employee token takes priority if it exists)
  const token =
    localStorage.getItem("employeeToken") || localStorage.getItem("token");

  // Check if current user is an owner (not an employee)
  const isOwner = !localStorage.getItem("employeeToken");
  
  // Check if current user is a manager
  const [isManager, setIsManager] = useState(false);
  
  useEffect(() => {
    const employeeToken = localStorage.getItem("employeeToken");
    if (employeeToken) {
      try {
        const decoded = JSON.parse(atob(employeeToken.split(".")[1]));
        setIsManager(decoded.employee_role?.toLowerCase() === "manager");
      } catch (e) {
        setIsManager(false);
      }
    }
  }, []);
  
  const canEditEmail = isOwner || isManager;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    start_date: "",
    profile_image_file: null,
  });
  const [preview, setPreview] = useState(null);

  // OTP verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const filteredEmployees = useMemo(() => {
    // First, filter out employees with "Owner" role
    const activeEmployees = employees.filter((emp) => 
      emp?.role?.toLowerCase() !== "owner"
    );

    const term = searchTerm.trim().toLowerCase();
    if (!term) return activeEmployees;

    return activeEmployees.filter((emp) => {
      const fields = [emp?.name, emp?.email, emp?.role, emp?.employee_id];
      return fields.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [employees, searchTerm]);

  // --- derived pagination values ---
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE)),
    [filteredEmployees.length]
  );

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  // kapag nagbago ang search, balik sa page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // siguraduhin na valid pa rin yung currentPage
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

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

  // pagination button style
  const pagerBtn =
    "min-w-[80px] rounded-full border border-[#f2d4b5] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/95";

  // Data fetching
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/employees`, { headers });
      setEmployees(res.data || []);
    } catch (e) {
      console.error("employees", e);
    }
  }, [headers]);



  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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
      email: "",
      role: "",
      start_date: new Date().toISOString().split("T")[0],
      profile_image_file: null,
    });
    // Reset OTP states
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode("");
    setIsDialogOpen(true);
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp?.name || "",
      email: emp?.email || "",
      role: emp?.role || "",
      start_date: emp?.start_date || "",
      profile_image_file: null,
    });
    setPreview(emp?.profile_picture ? toUrl(emp.profile_picture) : null);
    // Reset OTP states (not needed for edit)
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode("");
    setIsDialogOpen(true);
  };

  // Send OTP to email
  const sendOtp = async () => {
    const { email } = formData;
    
    if (!email) {
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "error",
        title: "Email Required",
        text: "Please enter an email address first.",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
      return;
    }

    // Gmail validation
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain !== "gmail.com" && domain !== "googlemail.com") {
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please use a Gmail address (@gmail.com).",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
      return;
    }

    setOtpSending(true);
    try {
      await axios.post(`${API_BASE}/send-email-verification`, { email });
      setOtpSent(true);
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "success",
        title: "OTP Sent!",
        text: `A verification code has been sent to ${email}. Please check your inbox.`,
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
    } catch (error) {
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "error",
        title: "Failed to Send OTP",
        text: error?.response?.data?.detail || "Unable to send verification code. Please try again.",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "error",
        title: "Invalid OTP",
        text: "Please enter the 6-digit verification code.",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
      return;
    }

    setOtpVerifying(true);
    try {
      await axios.post(`${API_BASE}/verify-email-otp`, {
        email: formData.email,
        otp_code: otpCode,
      });
      setOtpVerified(true);
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "success",
        title: "Email Verified!",
        text: "The email has been successfully verified.",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
    } catch (error) {
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "error",
        title: "Verification Failed",
        text: error?.response?.data?.detail || "Invalid or expired verification code. Please try again.",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
    } finally {
      setOtpVerifying(false);
    }
  };

  // Save (add or edit)
  const handleSave = async () => {
    if (isSaving) return;
    
    // For new employees, require OTP verification
    if (!editingEmployee && !otpVerified) {
      setIsDialogOpen(false);
      await Swal.fire({
        icon: "error",
        title: "Email Not Verified",
        text: "Please verify the email address with OTP before adding the employee.",
        confirmButtonColor: "#C97C2C",
      });
      setIsDialogOpen(true);
      return;
    }
    
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

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("email", formData.email);
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
      setFormData({
        name: "",
        email: "",
        role: "",
        start_date: "",
        profile_image_file: null,
      });

      // Show success with employee ID for new employees
      if (!editingEmployee) {
        const newEmployees = await axios.get(`${API_BASE}/employees`, {
          headers,
        });
        const latestEmployee = newEmployees.data[newEmployees.data.length - 1];

        Swal.fire({
          title: "Success!",
          html: `
            <div class="space-y-3">
              <p>Employee added successfully!</p>
              <p class="text-sm text-gray-600">Login credentials have been sent to <strong>${
                formData.email
              }</strong></p>
              <div class="bg-gradient-to-r from-[#FFF6E9] to-[#FFE7C5] p-4 rounded-lg border border-[#E49A52]">
                <p class="text-sm font-semibold text-[#6b4b2b] mb-2">Employee Login Credentials:</p>
                <div class="space-y-1">
                  <p class="text-xs text-[#7b5836]"><strong>Employee ID:</strong> <span class="font-mono text-[#E49A52]">${
                    latestEmployee?.employee_id || "N/A"
                  }</span></p>
                  <p class="text-xs text-[#7b5836]"><strong>Default Password:</strong> <span class="font-mono">Employee123!</span></p>
                </div>
                <p class="text-xs text-[#8a5a25] mt-2 italic">Employee must change password on first login</p>
              </div>
            </div>
          `,
          icon: "success",
          confirmButtonColor: "#C97C2C",
          width: "500px",
        });
      } else {
        Swal.fire({
          title: "Success!",
          text: "Employee updated.",
          icon: "success",
          confirmButtonColor: "#C97C2C",
        });
      }
    } catch (e) {
      console.error("save employee", e);
      Swal.fire({
        title: "Error",
        text: "Could not save employee.",
        icon: "error",
        confirmButtonColor: "#C97C2C",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (isDeleting) return;
    
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

    setIsDeleting(true);
    try {
      await axios.delete(`/employees/${id}`, { headers });
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
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async (emp) => {
    const ok = await Swal.fire({
      title: "Reset Password?",
      html: `
        <div class="space-y-3">
          <p>Reset password for <strong>${emp.name}</strong>?</p>
          <p class="text-sm text-gray-600">A new temporary password will be sent to <strong>${emp.email}</strong></p>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-left">
            <p class="text-xs text-yellow-800">
              <strong>Note:</strong> The employee will need to change this password on their next login.
            </p>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset Password",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#C97C2C",
      width: "450px",
    });
    if (!ok.isConfirmed) return;

    try {
      const response = await axios.post(
        `/employees/${emp.id}/reset-password`,
        {},
        { headers }
      );
      
      Swal.fire({
        title: "Password Reset!",
        html: `
          <div class="space-y-3">
            <p>Password has been reset successfully for <strong>${emp.name}</strong></p>
            <p class="text-sm text-gray-600">Login credentials have been sent to <strong>${emp.email}</strong></p>
            <div class="bg-gradient-to-r from-[#FFF6E9] to-[#FFE7C5] p-4 rounded-lg border border-[#E49A52]">
              <p class="text-sm font-semibold text-[#6b4b2b] mb-2">New Login Credentials:</p>
              <div class="space-y-1">
                <p class="text-xs text-[#7b5836]"><strong>Employee ID:</strong> <span class="font-mono text-[#E49A52]">${response.data.employee_id}</span></p>
                <p class="text-xs text-[#7b5836]"><strong>New Password:</strong> <span class="font-mono">Employee123!</span></p>
              </div>
              <p class="text-xs text-[#8a5a25] mt-2 italic">Employee must change password on next login</p>
            </div>
          </div>
        `,
        icon: "success",
        confirmButtonColor: "#C97C2C",
        width: "500px",
      });
    } catch (e) {
      console.error("reset password", e);
      const errorMsg = e.response?.data?.detail || "Could not reset password.";
      Swal.fire({
        title: "Error",
        text: errorMsg,
        icon: "error",
        confirmButtonColor: "#C97C2C",
      });
    }
  };

  // Render
  return (
    <div className="space-y-6">
      {/* Employee Management Section (header + list) */}
      <div className="rounded-2xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] px-4 sm:px-6 py-4 sm:py-6">
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4A2F17]">
            Employee Management
          </h2>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end">
            {/* --- UI: search bar --- */}
            <div className="relative w-full max-w-xs">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employees..."
                className="h-9 rounded-full border-[#f2d4b5] bg-white/95 pl-9 text-sm shadow-sm focus-visible:border-[#E49A52] focus-visible:ring-[#E49A52]"
              />
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
                <Search
                  className="h-3.5 w-3.5 text-[#4b5563]"
                  strokeWidth={2.2}
                />
              </span>
            </div>

            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-white/85 border border-[#efdcc3] text-[#6b4b2b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E49A52]" />
              {filteredEmployees.length}{" "}
              {filteredEmployees.length === 1 ? "Employee" : "Employees"}
            </span>

            {!isViewOnly && (
              <Button
                onClick={openAdd}
                className={`${primaryBtn} !h-10 sm:!h-11 !px-4 sm:!px-5 text-sm sm:text-base`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            )}
          </div>
        </div>

        {/* Subtle divider */}
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[#f1ddc9] to-transparent" />

        {/* Employee Cards Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7">
          {employees.length ? (
            filteredEmployees.length ? (
              paginatedEmployees.map((emp) => {
                const img = emp.profile_picture
                  ? toUrl(emp.profile_picture)
                  : null;
                const initial = (emp?.name || "?").charAt(0).toUpperCase();

                return (
                  <div
                    key={emp.id}
                    className="transform-gpu rounded-2xl border border-[#f2e3cf] bg-white/90 shadow-[0_6px_18px_rgba(33,20,8,.06)] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_36px_rgba(191,115,39,.18)]"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-white shadow bg-[#FFE7C5] grid place-items-center">
                            {img ? (
                              <img
                                src={img}
                                alt={emp.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg sm:text-xl font-bold text-[#8a5a25]">
                                {initial}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-semibold text-[#2f1f12]">
                              {emp.name}
                            </h3>
                            {emp.employee_id && (
                              <div className="mt-1 mb-2">
                                <span className="text-xs sm:text-sm font-mono font-bold px-2.5 py-1 rounded-md bg-gradient-to-r from-[#E49A52] to-[#D68942] text-white shadow-sm">
                                  {emp.employee_id}
                                </span>
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                                {emp.role || "—"}
                              </span>
                              <span className="text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-[#E9F9EF] border border-[#c7ecd5] text-[#2b7a3f]">
                                Start: {emp.start_date || "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isViewOnly && (
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
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
                        )}
                      </div>

                      {emp.access_rights && (
                        <div className="mt-5 text-xs sm:text-sm text-[#7b5836]">
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
                <div className="rounded-2xl border border-[#eadfce] bg-white/70 p-6 text-center text-[#7b5836] text-sm">
                  No employees match your search.
                </div>
              </div>
            )
          ) : (
            <div className="col-span-full">
              <div className="rounded-2xl border border-[#eadfce] bg-white/70 p-6 text-center text-[#7b5836]">
                No employees found.
              </div>
            </div>
          )}
        </div>

        {/* --- Pagination controls (Prev / Next) --- */}
        {filteredEmployees.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => canPrev && setCurrentPage((p) => p - 1)}
              disabled={!canPrev}
              className={pagerBtn}
            >
              Prev
            </button>
            <span className="text-xs sm:text-sm font-semibold text-[#6b4b2b]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => canNext && setCurrentPage((p) => p + 1)}
              disabled={!canNext}
              className={pagerBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="
            w-[min(92vw,480px)] sm:max-w-[860px]
            rounded-2xl border border-[#eadfce] p-0 overflow-hidden
            bg-gradient-to-b from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
            flex flex-col max-h-[calc(100vh-3rem)]
            [&>button.absolute.right-4.top-4]:hidden
          "
        >
          {/* Sticky header */}
          <div className={`${sectionHeader} sticky top-0 z-10`}>
            <DialogHeader className="p-0">
              <DialogTitle className="text-[#6b4b2b]">
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </DialogTitle>
              {editingEmployee?.employee_id && (
                <div className="mt-2">
                  <span className="text-xs text-[#7b5836] font-medium">
                    Employee ID:{" "}
                  </span>
                  <span className="text-sm font-mono font-bold px-2 py-1 rounded bg-gradient-to-r from-[#E49A52] to-[#D68942] text-white shadow-sm">
                    {editingEmployee.employee_id}
                  </span>
                </div>
              )}
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

            {/* Email */}
            <div className="sm:col-span-2">
              <label className={labelTone}>Email Address (Gmail)</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="e.g., employee@gmail.com"
                  value={formData.email}
                  onChange={(e) => {
                    handleChange("email", e.target.value);
                    // Reset OTP states when email changes
                    if (!editingEmployee) {
                      setOtpSent(false);
                      setOtpVerified(false);
                      setOtpCode("");
                    }
                  }}
                  className={inputTone}
                  disabled={(editingEmployee && !canEditEmail) || otpVerified}
                />
                {!editingEmployee && (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending || !formData.email || otpVerified}
                    className="flex-shrink-0 rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-4 py-2 text-sm font-semibold shadow-md hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpSending ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                )}
              </div>
              {!editingEmployee ? (
                <>
                  <p className="text-xs text-[#8a5a25] mt-1.5 italic">
                    Login credentials will be sent to this email address
                  </p>
                  {otpVerified && (
                    <p className="text-xs text-green-600 mt-1 font-semibold flex items-center gap-1">
                      <span className="inline-block w-4 h-4 rounded-full bg-green-600 text-white text-[10px] leading-4 text-center">✓</span>
                      Email verified
                    </p>
                  )}
                </>
              ) : !canEditEmail ? (
                <p className="text-xs text-red-600 mt-1.5 italic">
                  Only owners and managers can change email addresses
                </p>
              ) : null}
            </div>

            {/* OTP Verification (only for new employees) */}
            {!editingEmployee && otpSent && !otpVerified && (
              <div className="sm:col-span-2">
                <div className="bg-[#FFF6EC] border border-[#f2e3cf] rounded-xl p-4">
                  <label className={labelTone}>Verification Code</label>
                  <p className="text-xs text-[#7b5836] mb-2">
                    Enter the 6-digit code sent to {formData.email}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtpCode(value);
                      }}
                      className={`${inputTone} font-mono text-center text-lg tracking-widest`}
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otpVerifying || otpCode.length !== 6}
                      className="flex-shrink-0 rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-4 py-2 text-sm font-semibold shadow-md hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {otpVerifying ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className="mt-2 text-xs text-[#E49A52] hover:text-[#D68942] font-semibold underline"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {/* Reset Password Button (Owner only, Edit mode only) */}
            {editingEmployee && isOwner && (
              <div className="sm:col-span-2">
                <div className="bg-[#FFF6EC] border border-[#f2e3cf] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FFE7C5] grid place-items-center">
                      <KeyRound className="h-5 w-5 text-[#E49A52]" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-[#4A2F17] mb-1">Reset Password</h4>
                      <p className="text-xs text-[#7b5836] mb-3">
                        Reset this employee's password to the default temporary password. They will be required to change it on their next login.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setTimeout(() => handleResetPassword(editingEmployee), 100);
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-4 py-2 text-sm font-semibold shadow-md hover:brightness-105 transition"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  <SelectItem
                    value="Employee"
                    className="
                      py-2 px-3 cursor-pointer
                      hover:bg-[#f6f6f6] data-[highlighted]:bg-[#f6f6f6]
                      focus:bg-[#f6f6f6]
                      data-[state=checked]:bg-transparent data-[state=checked]:text-inherit
                    "
                  >
                    Employee
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
                readOnly
                disabled
                className="bg-gray-100 rounded-md border-[#f2d4b5] cursor-not-allowed"
              />
            </div>
          </div>

          {/* Sticky footer */}
          <DialogFooter className="sticky bottom-0 z-10 border-t bg-white/95 p-3 sm:p-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDialogOpen(false);
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                setPreview(null);
                // Reset OTP states
                setOtpSent(false);
                setOtpVerified(false);
                setOtpCode("");
              }}
              className="rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-5 py-2 shadow-sm hover:bg-white/90 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className={primaryBtn}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BakeryEmployee;