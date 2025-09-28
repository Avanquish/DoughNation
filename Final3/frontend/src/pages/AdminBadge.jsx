import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

// ✅ Attach token globally to every request
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AdminBadge = () => {
  const [users, setUsers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [badgeName, setBadgeName] = useState(""); // ✅ New state for custom badge name
  const [description, setDescription] = useState("");

  // Fetch bakery users & admin badges
  useEffect(() => {
    axios
      .get("http://localhost:8000/badges/bakery-users")
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Error fetching users:", err));

    axios
      .get("http://localhost:8000/badges/admin-badge")
      .then((res) => setBadges(res.data))
      .catch((err) => console.error("Error fetching badges:", err));
  }, []);

  const handleGiveBadge = async () => {
    if (!selectedUser || !selectedBadge) {
      Swal.fire("Error", "Please select both a user and a badge.", "error");
      return;
    }

    try {
      await axios.post("http://localhost:8000/badges/assign", {
        user_id: selectedUser,
        badge_id: selectedBadge.id,
        badge_name: badgeName || selectedBadge.name, // ✅ use input or fallback
        description: description || null,
      });

      Swal.fire("Success", "Badge assigned successfully!", "success");
      setSelectedUser("");
      setSelectedBadge(null);
      setBadgeName("");
      setDescription("");
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.detail || "Failed to assign badge.",
        "error"
      );
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white shadow rounded-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center">
        🎖️ Assign Badge to Bakery User
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div>
          {/* User Select */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Select User:
            </label>
            <select
              className="w-full p-2 border rounded-lg"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">-- Choose User --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Badge Name Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Badge Name:
            </label>
            <input
              type="text"
              className="w-full p-3 border rounded-lg"
              placeholder="Enter custom badge name (optional)"
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
            />
          </div>

          {/* Manual Description */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Description:
            </label>
            <textarea
              className="w-full p-3 border rounded-lg"
              placeholder="Enter custom description for this badge..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
          </div>

          <button
            onClick={handleGiveBadge}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full"
          >
            ✅ Assign Badge
          </button>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <label className="block text-gray-700 font-semibold mb-4">
            Select Badge:
          </label>
          <div className="grid grid-cols-1 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition ${
                  selectedBadge?.id === badge.id
                    ? "border-blue-500 bg-blue-50"
                    : ""
                }`}
              >
                <img
                  src={`http://localhost:8000/${badge.icon_url}`}
                  alt={badge.name}
                  className="w-12 h-12 mr-4 object-contain"
                />
                <div>
                  <p className="font-semibold">{badge.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBadge;