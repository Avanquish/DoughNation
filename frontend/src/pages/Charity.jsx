import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import DataTable from "./DatatableSample";

const API = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

const columns = [
    { accessorKey: "id", header: "ID", isHide: "true" },
    { accessorKey: "name", header: "Name", isHide: "false" },
    { accessorKey: "email", header: "Email", isHide: "false" },
    { accessorKey: "contact_person", header: "Contact Person", isHide: "false" },
    { accessorKey: "contact_number", header: "Contact Number", isHide: "false" },
    { accessorKey: "address", header: "Address", isHide: "false" },
    { accessorKey: "created_at", header: "Created Date", isHide: "false",
      cell: ({ row }) => {
        const date = row.original.created_at;
        if (!date) return "—";
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    { accessorKey: "status", header: "Account Status", isHide: "false", 
      cell: ({ row }) => {
        const status = row.original.status || 'Pending';
        const statusColors = {
          'Active': 'bg-green-100 text-green-800',
          'Pending': 'bg-yellow-100 text-yellow-800',
          'Suspended': 'bg-orange-100 text-orange-800',
          'Banned': 'bg-red-100 text-red-800',
          'Deactivated': 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      }
    },
    { accessorKey: "verified", header: "Verification", isHide: "false", 
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          row.original.verified 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.original.verified ? 'Verified' : 'Unverified'}
        </span>
      )
    },
];const Charity = () => {
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch charities from API
    const fetchCharities = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API}/admin/charities`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setCharities(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching charities:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to load charities"
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCharities();
    }, []);

    // CRUD Handlers
    const handleCreate = async (newData) => {
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("role", "Charity");
            formData.append("name", newData.name);
            formData.append("email", newData.email);
            formData.append("contact_person", newData.contact_person);
            formData.append("contact_number", newData.contact_number);
            formData.append("address", newData.address);
            formData.append("password", newData.password);
            formData.append("confirm_password", newData.confirm_password);
            
            // Add location coordinates if provided
            if (newData.latitude) {
                formData.append("latitude", newData.latitude);
            }
            if (newData.longitude) {
                formData.append("longitude", newData.longitude);
            }
            
            // Add files if provided
            if (newData.profile_picture) {
                formData.append("profile_picture", newData.profile_picture);
            }
            if (newData.proof_of_validity) {
                formData.append("proof_of_validity", newData.proof_of_validity);
            }

            const response = await axios.post(`${API}/admin/register-user`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Charity created successfully",
                timer: 2000
            });

            fetchCharities(); // Refresh the list
            return response.data;
        } catch (error) {
            console.error("Error creating charity:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.response?.data?.detail || "Failed to create charity"
            });
            throw error;
        }
    };

    const handleUpdate = async (id, updatedData) => {
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            if (updatedData.name) formData.append("name", updatedData.name);
            if (updatedData.email) formData.append("email", updatedData.email);
            if (updatedData.contact_person) formData.append("contact_person", updatedData.contact_person);
            if (updatedData.contact_number) formData.append("contact_number", updatedData.contact_number);
            if (updatedData.address) formData.append("address", updatedData.address);
            if (updatedData.latitude) formData.append("latitude", updatedData.latitude);
            if (updatedData.longitude) formData.append("longitude", updatedData.longitude);

            const response = await axios.put(`${API}/admin/update-user/${id}`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Charity updated successfully",
                timer: 2000
            });

            fetchCharities(); // Refresh the list
            return response.data;
        } catch (error) {
            console.error("Error updating charity:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.response?.data?.detail || "Failed to update charity"
            });
            throw error;
        }
    };

    const handleDelete = async (id) => {
        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "You won't be able to revert this!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "Yes, delete it!"
            });

            if (result.isConfirmed) {
                const token = localStorage.getItem("token");
                await axios.delete(`${API}/admin/delete-user/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire({
                    icon: "success",
                    title: "Deleted!",
                    text: "Charity has been deleted.",
                    timer: 2000
                });
                fetchCharities(); // Refresh the list
            }
        } catch (error) {
            console.error("Error deleting charity:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.response?.data?.detail || "Failed to delete charity"
            });
            throw error;
        }
    };

    const handleForceDelete = async (id, charityName) => {
        try {
            const result = await Swal.fire({
                title: "⚠️ Force Delete User?",
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p style="margin-bottom: 15px; font-weight: 600; color: #d33;">
                            You are about to <strong>FORCE DELETE</strong> "${charityName}".
                        </p>
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-bottom: 15px;">
                            <p style="margin: 5px 0; font-weight: bold; color: #856404;">This will permanently delete:</p>
                            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                                <li>The charity account</li>
                                <li>All donation records</li>
                                <li>All related data</li>
                            </ul>
                        </div>
                        <p style="color: #d33; font-weight: 600;">
                            ⚠️ This action cannot be undone!
                        </p>
                    </div>
                `,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                cancelButtonColor: "#6c757d",
                confirmButtonText: "Yes, Force Delete!",
                cancelButtonText: "Cancel",
                width: "600px"
            });

            if (result.isConfirmed) {
                const token = localStorage.getItem("token");
                const response = await axios.delete(`${API}/admin/force-delete-user/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                await Swal.fire({
                    icon: "success",
                    title: "Force Deleted!",
                    text: response.data.message,
                    timer: 3000
                });

                fetchCharities(); // Refresh the list
            }
        } catch (error) {
            console.error("Error force deleting charity:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.response?.data?.detail || "Failed to force delete charity"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-2 pt-4 sm:p-4 md:p-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#6b4b2b]">Charities</h2>
                    <p className="mt-1 text-sm text-[#7b5836]">Manage charity accounts</p>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6b4b2b]"></div>
                        </div>
                    ) : (
                        <DataTable 
                            columns={columns} 
                            data={charities}
                            onCreate={handleCreate}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onForceDelete={handleForceDelete}
                            entityType="Charity"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Charity;