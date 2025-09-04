import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CharityReceived = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);

  // Load current user
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setCurrentUser({
        id: Number(decoded.sub),
        role: decoded.role.toLowerCase(),
        email: decoded.email || "",
        name: decoded.name || "",
      });
    } catch (err) {
      console.error("Failed to decode token:", err);
    }
  }, []);

  // Load donations for this charity
  useEffect(() => {
    if (!currentUser || currentUser.role !== "charity") return;

    const key = `received_donations_${currentUser.id}`;
    try {
      const raw = localStorage.getItem(key);
      const donations = raw ? JSON.parse(raw) : [];
      setReceivedDonations(donations);
    } catch (err) {
      console.error("Failed to load received donations:", err);
    }
  }, [currentUser]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Received Donations</h2>

      {receivedDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {receivedDonations.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {d.image ? (
                <img
                  src={`${API}/${d.image}`}
                  alt={d.name}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">
                  No Image
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold">{d.name}</h3>
                <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
                {d.expiration_date && (
                  <p className="text-sm text-red-500">
                    Expires: {new Date(d.expiration_date).toLocaleDateString()}
                  </p>
                )}
                {d.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {d.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No donations received yet.</p>
      )}
    </div>
  );
};

export default CharityReceived;
