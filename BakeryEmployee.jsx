import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

const BakeryEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [verified, setVerified] = useState(false);   // For Access control if user exist.
  const [employeeName, setEmployeeName] = useState("");  // input name to verify.

  const [formData, setFormData] = useState({
    name: "",
    role: "Staff",
    start_date: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`, { headers });
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

    useEffect(() => {
    fetchEmployees();
  }, []);

 // Fetch inventory if verified.
  useEffect(() => {
    if (verified) fetchEmployees();
  }, [verified]);

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

  // Handle form changes
  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Save (Add or Edit)
  const handleSave = async () => {
    if (editingEmployee) {
      // Close dialog first to remove backdrop
      setIsDialogOpen(false);

      // Show confirmation before editing
      const result = await Swal.fire({
        title: "Save Changes?",
        text: "Are you sure you want to update this employee's details?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Save",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) {
        // Reopen dialog if canceled
        setIsDialogOpen(true);
        return;
      }
    }

    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("role", formData.role);
      fd.append("start_date", formData.start_date);

      if (editingEmployee) {
        await axios.put(`${API}/employees/${editingEmployee.id}`, fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${API}/employees`, fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      }

      fetchEmployees();
      setIsDialogOpen(false);
      setEditingEmployee(null);
      setFormData({ name: "", role: "Staff", start_date: "" });

      Swal.fire({
        title: "Success!",
        text: editingEmployee ? "Employee updated successfully." : "Employee added successfully.",
        icon: "success",
      });
    } catch (err) {
      console.error("Error saving employee:", err);
      Swal.fire({
        title: "Error",
        text: "Something went wrong while saving the employee.",
        icon: "error",
      });
    }
  };

  // Delete employee
  const handleDelete = async (id) => {
    // Close dialog if open (prevents backdrop blocking)
    setIsDialogOpen(false);

    const result = await Swal.fire({
      title: "Delete Employee?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API}/employees/${id}`, { headers });
      fetchEmployees();
      Swal.fire({
        title: "Deleted!",
        text: "Employee has been removed.",
        icon: "success",
      });
    } catch (err) {
      console.error("Error deleting employee:", err);
      Swal.fire({
        title: "Error",
        text: "Something went wrong while deleting the employee.",
        icon: "error",
      });
    }
  };

return (
  <div className="p-6">
    {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-3xl font-bold">Employee Management</h2>
      <Button
        onClick={() => {
          setIsDialogOpen(true);
          setEditingEmployee(null);
          setFormData({ name: "", role: "Staff", start_date: "" });
        }}
        // Only disable Add Employee if there are employees but user is not verified
        disabled={employees.length > 0 && !verified}
      >
        <Plus className="mr-2 h-4 w-4" /> Add Employee
      </Button>
    </div>

    {/* Verification Modal, only shows if employees exist */}
    {employees.length > 0 && !verified && (
      <div className="fixed inset-50 flex items-center justify-center bg-transparent bg-opacity-40 z-50">
        <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Verify Access
          </h2>
          <input
            type="text"
            placeholder="Enter employee name"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            className="w-full p-2 border rounded mb-3"
          />
          <button
            onClick={handleVerify}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Enter Inventory
          </button>
        </div>
      </div>
    )}

    {/* Employee List (only shows after verified, or if no employees yet) */}
    {(verified || employees.length === 0) && (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {employees.length > 0 ? (
          employees.map((emp) => (
            <div
              key={emp.id}
              className="relative bg-white shadow-md rounded-xl p-5 border hover:shadow-lg transition-shadow duration-300"
            >
              {/* Actions */}
              <div className="absolute top-3 right-3 flex space-x-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setEditingEmployee(emp);
                    setFormData({
                      name: emp.name,
                      role: emp.role,
                      start_date: emp.start_date,
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(emp.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Employee Info */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                  {emp.name.charAt(0)}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{emp.name}</h3>
                <p className="text-sm text-gray-500">{emp.role}</p>
                <div className="mt-4 w-full border-t pt-3 text-sm text-gray-600">
                  <p>
                    <strong>Start Date:</strong> {emp.start_date}
                  </p>
                  {emp.access_rights && (
                    <p>
                      <strong>Access:</strong> {emp.access_rights}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 col-span-full text-center">
            No employees found. Please add one.
          </p>
        )}
      </div>
    )}

    {/* Dialog Form */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingEmployee ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
        </DialogHeader>

        {/* Form Fields */}
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Select
            value={formData.role}
            onValueChange={(value) => handleChange("role", value)}
          >
            <SelectTrigger className="bg-white text-black">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
              <SelectItem value="Part Time Staff">Part Time Staff</SelectItem>
              <SelectItem value="Full Time Staff">Full Time Staff</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  );
};

export default BakeryEmployee;