import React, { useEffect, useState } from "react";
import DonationTracking from "./DonationTracking";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CharityReceived = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);

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

  // Load donations for this charity
  useEffect(() => {
    if (!currentUser || currentUser.role !== "charity") return;

    const fetchRequestedInventory = async () => {
      try {
        const res = await fetch(`${API}/donation/requests_inventory`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        // Display all donations, not just requested
        setReceivedDonations(data); 
      } catch (err) {
        console.error("Failed to load donations:", err);
      }
    };

    fetchRequestedInventory();
  }, [currentUser]);

  // WebSocket for live donation status updates
  useEffect(() => {
    if (!selectedDonation) return;

    const ws = new WebSocket(`${API.replace(/^http/, "ws")}/ws/donations/${selectedDonation.id}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status) {
        setSelectedDonation((prev) => ({ ...prev, status: data.status }));

        // Update the main list if status changed
        setReceivedDonations((prevList) =>
          prevList.map((d) =>
            d.id === selectedDonation.id ? { ...d, status: data.status } : d
          )
        );
      }
    };

    return () => ws.close();
  }, [selectedDonation]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Received Donations</h2>

      {receivedDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {receivedDonations.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedDonation(d)}
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
                <h3 className="text-lg font-semibold">{d.name}</h3>
                <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
                {d.expiration_date && (
                  <p className="text-sm text-red-500">
                    Expires: {new Date(d.expiration_date).toLocaleDateString()}
                  </p>
                )}
                {d.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{d.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Status: <span className="font-medium">{d.status}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No donations available.</p>
      )}

      {/* Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 backdrop-blur-sm bg-white/10"
            onClick={() => setSelectedDonation(null)}
          ></div>

          <div className="relative bg-white backdrop-blur-md rounded-xl shadow-lg w-11/12 max-w-lg p-6 z-10 border border-white/20">
            <button
              className="absolute top-3 right-3 text-gray-700 hover:text-black text-xl font-bold"
              onClick={() => setSelectedDonation(null)}
            >
              ✖
            </button>

            <h3 className="text-2xl font-bold mb-2">{selectedDonation.name}</h3>
            {selectedDonation.bakery_name && (
              <p className="text-sm text-gray-600 mb-2">From: {selectedDonation.bakery_name}</p>
            )}

            {selectedDonation.image ? (
              <img
                src={`${API}/${selectedDonation.image}`}
                alt={selectedDonation.name}
                className="h-60 w-full object-cover rounded-md mb-4"
              />
            ) : (
              <div className="h-60 w-full flex items-center justify-center bg-gray-100/50 text-gray-400 rounded-md mb-4">
                No Image
              </div>
            )}

            <p className="text-sm text-gray-800 mb-1">Quantity: {selectedDonation.quantity}</p>
            {selectedDonation.expiration_date && (
              <p className="text-sm text-red-600 mb-1">
                Expires: {new Date(selectedDonation.expiration_date).toLocaleDateString()}
              </p>
            )}
            {selectedDonation.description && (
              <p className="text-sm text-gray-800 mb-4">{selectedDonation.description}</p>
            )}

            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-900 text-center">Product Status</h4>
              <div className="w-full flex items-center justify-center px-2 sm:px-6">
                <DonationTracking currentStatus={selectedDonation.status} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharityReceived;
