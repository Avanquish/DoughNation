import React, { useEffect, useState, useRef } from "react";
import DonationTracking from "./DonationTracking";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CharityReceived = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [directDonations, setDirectDonations] = useState([]);
  const highlightedRef = useRef(null);

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
        const res = await fetch(`${API}/donations/requested_donation`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setReceivedDonations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load donations:", err);
      }
    };

    fetchRequestedInventory();
  }, [currentUser]);

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
        const data = await response.json();

        // Only donations for this charity
        const filtered = data.filter(
          (donation) => donation.charity_id === currentUser.id
        );

        setDirectDonations(filtered);
      } catch (error) {
        console.error("Failed to fetch direct donations:", error);
      }
    };

    fetchDirectDonations();
  }, [currentUser]);

  // Scroll to highlighted donation if needed
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [receivedDonations]);

  // Modal WebSocket for live status updates
  useEffect(() => {
    if (!selectedDonation) return;

    const ws = new WebSocket(`${API.replace(/^http/, "ws")}/ws/donations/${selectedDonation.id}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status) {
        setSelectedDonation(prev => ({ ...prev, status: data.status }));

        setReceivedDonations(prevList =>
          prevList.map(d =>
            d.id === selectedDonation.id ? { ...d, status: data.status } : d
          )
        );
      }
    };

    return () => ws.close();
  }, [selectedDonation]);

  const renderDonationCard = (donation) => (
    <div
      key={donation.id}
      ref={selectedDonation?.id === donation.id ? highlightedRef : null}
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:scale-105 transition-transform"
      onClick={() => setSelectedDonation(donation)}
    >
      {donation.image ? (
        <img
          src={`${API}/${donation.image}`}
          alt={donation.name}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">
          No Image
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold">{donation.name}</h3>
        <p className="text-sm text-gray-600">Quantity: {donation.quantity}</p>
        {donation.expiration_date && (
          <p className="text-sm text-red-500">
            Expires: {new Date(donation.expiration_date).toLocaleDateString()}
          </p>
        )}
        {donation.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{donation.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Status: <span className="font-medium">{donation.status}</span>
        </p>
        {donation.bakery_name && (
          <p className="text-sm text-gray-500 mt-1">
            From: <span className="font-medium">{donation.bakery_name}</span>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Requested Donations</h2>

      {receivedDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {receivedDonations.map(renderDonationCard)}
        </div>
      ) : (
        <p className="text-gray-500">No requested donations yet.</p>
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
              <p className="text-sm text-gray-600 mb-2">
                From: <span className="font-medium">{selectedDonation.bakery_name}</span>
              </p>
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

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-2">
              <p>
                <span className="font-medium">Quantity:</span> {selectedDonation.quantity}
              </p>
              <p>
                <span className="font-medium">Threshold:</span> {selectedDonation.threshold ?? "—"}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {selectedDonation.creation_date
                  ? new Date(selectedDonation.creation_date).toLocaleDateString()
                  : "—"}
              </p>
              <p>
                <span className="font-medium">Expires:</span>{" "}
                {selectedDonation.expiration_date
                  ? new Date(selectedDonation.expiration_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>

            {selectedDonation.description && (
              <p className="text-sm text-gray-800 mb-4">{selectedDonation.description}</p>
            )}

            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-900 text-center">Product Status</h4>
              <DonationTracking currentStatus={selectedDonation.status || "being_packed"} />

              {/* Optional: progress button for charity if needed */}
              {selectedDonation.status === "requested" && (
                <div className="mt-4 flex justify-center">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                    onClick={() => {
                      console.log(`Progress donation ${selectedDonation.id}`);
                      // TODO: API call to progress status
                    }}
                  >
                    Progress Step
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharityReceived;
