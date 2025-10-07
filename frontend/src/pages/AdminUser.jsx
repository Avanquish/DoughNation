import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { Button } from "@/components/ui/button";

const API = "https://api.doughnationhq.cloud/"; // adjust if needed

const AdminUser = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);

  // ✅ Fetch pending users (with token)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/pending-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingUsers(res.data || []);
      } catch (e) {
        console.error("Error fetching pending users:", e);
      }
    })();
  }, []);

  // ✅ Fetch verified users (with token)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/all-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const verifiedUsers = res.data.filter((u) => u.verified === true);
        setUsers(verifiedUsers);
      } catch (e) {
        console.error("Error fetching verified users:", e);
      }
    })();
  }, []);

  // ✅ Approve user
  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/verify-user/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Swal.fire("Approved!", "User has been verified.", "success");
      setPendingUsers(pendingUsers.filter((u) => u.id !== id));
      // refresh verified users
      const res = await axios.get(`${API}/all-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.filter((u) => u.verified === true));
    } catch (e) {
      console.error("Error verifying user:", e);
      Swal.fire("Error", "Failed to verify user.", "error");
    }
  };

  // ✅ Reject user
  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/reject-user/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Swal.fire("Rejected!", "User has been rejected.", "info");
      setPendingUsers(pendingUsers.filter((u) => u.id !== id));
    } catch (e) {
      console.error("Error rejecting user:", e);
      Swal.fire("Error", "Failed to reject user.", "error");
    }
  };

  // ✅ Delete verified user
  const handleDeleteUser = async (id) => {
    const confirmDelete = await Swal.fire({
      title: "Are you sure?",
      text: "This user will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.id !== id));
      Swal.fire("Deleted!", "User has been deleted.", "success");
    } catch (e) {
      console.error("Error deleting user:", e);
      Swal.fire("Error", "Failed to delete user.", "error");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white shadow rounded-2xl">
      {/* 🔹 Pending Users */}
      <h2 className="text-2xl font-bold mb-4">⏳ Users for Verification</h2>
      {pendingUsers.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/70 mb-8">
          <table className="w-full text-sm bg-white/80 backdrop-blur">
            <thead className="bg-[#FFF3E6]">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Proof</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u) => (
                <tr key={u.id} className="border-t border-white/70">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    {u.proof_file ? (
                      <a
                        href={`${API}/${u.proof_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C97C2C] underline"
                      >
                        View Proof
                      </a>
                    ) : (
                      "No file"
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={() => handleVerify(u.id)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReject(u.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-8">
          No pending users.
        </p>
      )}

      {/* 🔹 Verified Users */}
      <h2 className="text-2xl font-bold mb-4">✅ Verified Users</h2>
      {users.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/70">
          <table className="w-full text-sm bg-white/80 backdrop-blur">
            <thead className="bg-[#FFF3E6]">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/70">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 text-center">
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No verified users.</p>
      )}
    </div>
  );
};

export default AdminUser;
