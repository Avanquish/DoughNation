import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

const AdminUser = () => {
  const [users, setUsers] = useState([]);

  // ✅ Fetch all users
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:8000/all-users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ✅ Delete a user
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
      const res = await fetch(`http://localhost:8000/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      setUsers(users.filter((u) => u.id !== id)); // update UI
      Swal.fire("Deleted!", "User has been deleted.", "success");
    } catch (error) {
      console.error("Error deleting user:", error);
      Swal.fire("Error", "Failed to delete user.", "error");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white shadow rounded-2xl">
      <h2 className="text-2xl font-bold mb-4">👥 All Registered Users</h2>

      {users.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-300">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
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
        <p className="text-sm text-gray-500">No registered users found.</p>
      )}
    </div>
  );
};

export default AdminUser;
