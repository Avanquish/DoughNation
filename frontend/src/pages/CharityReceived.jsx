import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

const CharityReceived = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
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

  // Fetch bakery normal donations
useEffect(() => {
  if (!currentUser || currentUser.role !== "charity") return;

  const fetchReceivedDonations = async () => {
    try {
      const response = await fetch(`${API}/donation/received`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch received donations");
      }
      const data = await response.json();

      // Accepted but only those fully completed
      const accepted = data.filter(
        (d) => d.status === "accepted" && d.tracking_status === "complete"
      );

      setReceivedDonations(accepted);
    } catch (error) {
      console.error("Failed to fetch received donations:", error);
    }
  };

  fetchReceivedDonations();
}, [currentUser]);

  // Fetch direct donations for this charity
useEffect(() => {
  if (!currentUser || currentUser.role !== "charity") return;

  const fetchDirectDonations = async () => {
    try {
      const response = await fetch(`${API}/direct/mine`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch direct donations");
      }
      const data = await response.json();

      // Only donations for this charity that are completed
      const filtered = data.filter(
        (donation) =>
          donation.charity_id === currentUser.id &&
          donation.btracking_status === "complete"
      );

      setDirectDonations(filtered);
    } catch (error) {
      console.error("Failed to fetch direct donations:", error);
    }
  };

  fetchDirectDonations();
}, [currentUser]);
  

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Received Donations</h2>

      {/* Normal Donations Cards */}
      {receivedDonations.length > 0 ? (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {receivedDonations.map((d) => (
          <div
            key={d.id}
            className= "bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300"
              
          >
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
              {d.bakery_name && (
                <div className="flex items-center mb-2">
                  {d.bakery_profile_picture ? (
                    <img
                      src={`${API}/${d.bakery_profile_picture}`}
                      alt={d.bakery_name}
                      className="w-8 h-8 rounded-full mr-2 object-cover"
                    />
                      ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex items-center justify-center text-xs text-gray-600">
                        N/A
                      </div>
                  )}
                    <span className="text-sm font-medium">{d.bakery_name}</span>
                  </div>
                )}
              <h3 className="text-lg font-semibold">{d.name}</h3>
              <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
              {d.expiration_date && (
                <p className="text-sm text-red-500">
                  Expires: {new Date(d.expiration_date).toLocaleDateString()}
                </p>
              )}
              {d.tracking_completed_at && (
                <p className="text-sm text-black-500">
                  Donation Complete: {new Date(d.tracking_completed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">No donations received yet.</p>
    )}

      {/* Direct Donations */}
      <h2 className="text-2xl font-bold mb-4 mt-8">Direct Donations</h2>

      {directDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {directDonations.map((d) => (
            <div
              key={d.id}
              className= "bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300"
            >
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
                {d.bakery_name && (
                <div className="flex items-center mb-2">
                  {d.bakery_profile_picture ? (
                    <img
                      src={`${API}/${d.bakery_profile_picture}`}
                      alt={d.bakery_name}
                      className="w-8 h-8 rounded-full mr-2 object-cover"
                    />
                      ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex items-center justify-center text-xs text-gray-600">
                        N/A
                      </div>
                  )}
                    <span className="text-sm font-medium">{d.bakery_name}</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold">{d.name}</h3>
                <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
                {d.expiration_date && (
                  <p className="text-sm text-red-500">
                    Expires: {new Date(d.expiration_date).toLocaleDateString()}
                  </p>
                )}
                {d.btracking_completed_at && (
                <p className="text-sm text-black-500">
                  Donation Complete: {new Date(d.btracking_completed_at).toLocaleDateString()}
                </p>
              )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No direct donations received yet.</p>
      )}
    </div>
  );
};

export default CharityReceived;