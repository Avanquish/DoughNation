import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

// Adds auth token to all requests
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

// Admin interface to assign badges to bakery users
const AdminBadge = () => {
  const [users, setUsers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [badgeName, setBadgeName] = useState("");
  const [description, setDescription] = useState("");

  // Fetch bakery users
  useEffect(() => {
    axios
      .get("https://api.doughnationhq.cloud/badges/bakery-users")
      .then((res) => setUsers(res.data || []))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  // Fetch admin badges (limit to 4)
  useEffect(() => {
    axios
      .get("https://api.doughnationhq.cloud/badges/admin-badge")
      .then((res) =>
        setBadges(Array.isArray(res.data) ? res.data.slice(0, 4) : [])
      )
      .catch((err) => console.error("Error fetching badges:", err));
  }, []);

  // Handle badge assignment
  const handleGiveBadge = async () => {
    if (!selectedUser || !selectedBadge) {
      Swal.fire("Error", "Please select both a user and a badge.", "error");
      return;
    }

    try {
      // Use badgeName if provided, else fallback to selectedBadge.name
      await axios.post("https://api.doughnationhq.cloud/badges/assign", {
        user_id: selectedUser,
        badge_id: selectedBadge.id,
        badge_name: badgeName || selectedBadge.name, // use custom name if provided
        description: description || null,
      });

      // Success feedback
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
    <div className="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-[#FFF5EA] via-[#FFF0DE] to-[#FFE9CE] ring-1 ring-black/10 shadow-sm">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 border-b border-[#e8d8c2]/70 text-center">
          <h2 className="text-3xl font-extrabold text-[#6b4b2b]">
            Assign Badge to Bakery User
          </h2>
          <p className="mt-1 text-sm text-[#7b5836]">
            Choose a user, select a badge, and optionally customize its name and
            description.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white/90 ring-1 ring-[#e9d7c3] shadow">
              <div className="p-5 space-y-5">
                {/* User Select */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#6b4b2b]">
                    Select User
                  </label>
                  <select
                    className="w-full rounded-lg border border-[#f2d4b5] bg-white px-3 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
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

                {/* Badge Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#6b4b2b]">
                    Badge Name (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-[#f2d4b5] bg-white px-3 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    placeholder="e.g., Community Hero"
                    value={badgeName}
                    onChange={(e) => setBadgeName(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#6b4b2b]">
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-[#f2d4b5] bg-white px-3 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    placeholder="Add a short description for this badge…"
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleGiveBadge}
                  className="w-full rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2.5 font-semibold shadow-md ring-1 ring-white/60 hover:brightness-95"
                >
                  Assign Badge
                </button>
              </div>
            </div>

            {/* Badges grid (limit to 4) */}
            <div className="rounded-2xl bg-white/90 ring-1 ring-[#e9d7c3] shadow">
              <div className="p-5">
                <h3 className="mb-4 text-lg font-extrabold text-[#6b4b2b]">
                  Available Badges
                </h3>

                <div className="grid sm:grid-cols-2 gap-3">
                  {badges.slice(0, 4).map((badge) => {
                    const isActive = selectedBadge?.id === badge.id;
                    const iconSrc = badge.icon_url
                      ? `https://api.doughnationhq.cloud/${badge.icon_url}`
                      : badge.icon
                      ? badge.icon
                      : null;

                    return (
                      <button
                        type="button"
                        key={badge.id || badge.name}
                        onClick={() => setSelectedBadge(badge)}
                        className={`text-left flex items-center gap-3 p-3 rounded-xl transition
                                    ring-1 shadow-sm w-full
                                    ${
                                      isActive
                                        ? "bg-[#FFF5E6] ring-[#E49A52]"
                                        : "bg-white/90 ring-[#f2e3cf] hover:bg-[#fff6ec]"
                                    }`}
                      >
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt={badge.name}
                            className="w-12 h-12 object-contain rounded-md border border-[#f2e3cf] bg-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-md grid place-items-center bg-[#FFEFD9] border border-[#f3ddc0] text-[#6b4b2b] text-sm font-bold">
                            {badge?.name
                              ? badge.name.charAt(0).toUpperCase()
                              : "B"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#3b2a18] truncate">
                            {badge.name || "Untitled Badge"}
                          </p>
                          {badge.description && (
                            <p className="text-[11px] text-[#7b5836] truncate">
                              {badge.description}
                            </p>
                          )}
                          {isActive && (
                            <p className="text-[11px] font-medium text-[#8a5a25]">
                              Selected
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {badges.length === 0 && (
                    <p className="text-sm text-[#6b4b2b]/70">
                      No badges available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBadge;