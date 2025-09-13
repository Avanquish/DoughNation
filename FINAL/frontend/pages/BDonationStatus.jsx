import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CharityReceived = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

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

const handleUpdateTracking = async (donationId, currentStatus, isDirect = false) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const nextStatusMap = {
    preparing: "ready_for_pickup",
    ready_for_pickup: "in_transit",
    in_transit: "received",
    received: "completed",
  };
  const nextStatus = nextStatusMap[currentStatus];
  if (!nextStatus) return;

  const endpoint = isDirect
    ? `${API}/direct/tracking/${donationId}`
    : `${API}/donation/tracking/${donationId}`;

  try {
    const body = isDirect
      ? { btracking_status: nextStatus } // <-- important for direct donations
      : { tracking_status: nextStatus };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      // Update state for UI
      if (isDirect) {
        setDirectDonations((prev) =>
          prev.map((d) =>
            d.id === donationId ? { ...d, tracking_status: nextStatus } : d
          )
        );
      } else {
        setReceivedDonations((prev) =>
          prev.map((d) =>
            d.id === donationId ? { ...d, tracking_status: nextStatus } : d
          )
        );
      }
    }
  } catch (err) {
    console.error("Failed to update tracking status:", err);
  }
};

  useEffect(() => {
  if (!currentUser) return;

  const token = localStorage.getItem("token");

  if (currentUser.role === "charity") {
    // Charity → fetch own received donations
    fetch(`${API}/donation/received`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const accepted = data.filter((d) => d.status === "accepted");
        const pending = data.filter((d) => d.status === "pending");
        setReceivedDonations(accepted);
        setPendingDonations(pending);
      })
      .catch((err) => console.error("Failed to fetch charity donations:", err));
  }

  if (currentUser.role === "bakery") {
    // Bakery → fetch all requests for their inventory
    fetch(`${API}/donation/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const accepted = data.filter((d) => d.status === "accepted");
        const pending = data.filter((d) => d.status === "pending");
        setReceivedDonations(accepted);
        setPendingDonations(pending);
      })
      .catch((err) => console.error("Failed to fetch bakery requests:", err));
  }
}, [currentUser]);



// Fetch direct donations
useEffect(() => {
  if (!currentUser || currentUser.role !== "bakery") return;

  const fetchDirectDonations = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API}/direct/bakery`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      // Map backend field `btracking_status` to frontend `tracking_status`
      const mappedData = data.map(d => ({
        ...d,
        tracking_status: d.btracking_status || "preparing", // this ensures we use the saved status
      }));

      setDirectDonations(mappedData);
    } catch (error) {
      console.error("Failed to fetch direct donations:", error);
    }
  };

  fetchDirectDonations();
}, [currentUser]);

  // Highlight when triggered from message.jsx
  useEffect(() => {
    const handler = () => {
      const id = localStorage.getItem("highlight_received_donation");
      if (id) {
        setHighlightedId(Number(id));
        const el = document.getElementById(`received-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Remove highlight after 3s
        setTimeout(() => setHighlightedId(null), 3000);

        localStorage.removeItem("highlight_received_donation");
      }
    };

    window.addEventListener("highlight_received_donation", handler);
    return () =>
      window.removeEventListener("highlight_received_donation", handler);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Donations</h2>

      {/* Normal Donations Cards */}
      {receivedDonations.length > 0 ? (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {receivedDonations.map((d) => (
          <div
            key={d.id}
            id={`received-${d.donation_id || d.id}`}
            className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
              highlightedId === (d.donation_id || d.id)
                ? "border-4 border-amber-500 bg-amber-100"
                : ""
            }`}
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
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {d.description}
                </p>
              )}

                {/* Tracking Status */}
                {d.status === "accepted" && (
                    <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium">
                        Status: {d.tracking_status.replaceAll("_", " ").toUpperCase()}
                    </span>
                    {/* Show button only if preparing or ready_for_pickup */}
                        {(d.tracking_status === "preparing" || d.tracking_status === "ready_for_pickup") && (
                        <button
                            onClick={() => handleUpdateTracking(d.id, d.tracking_status)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                            {d.tracking_status === "preparing"
                            ? "Ready for Pickup"
                            : "In Transit"}
                        </button>
                        )}
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">No donations yet.</p>
    )}

      {/* Direct Donations */}
      <h2 className="text-2xl font-bold mb-4 mt-8">Direct Donations</h2>

      {directDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {directDonations.map((d) => (
            <div
              key={d.id}
              id={`received-${d.donation_id || d.id}`}
              className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                highlightedId === (d.donation_id || d.id)
                  ? "border-4 border-amber-500 bg-amber-100"
                  : ""
              }`}
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
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {d.description}
                  </p>
                )}

                
                {/* Tracking Status */}
                    <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium">
                        Status: {d.tracking_status.replaceAll("_", " ").toUpperCase()}
                    </span>
                    {/* Show button only if preparing or ready_for_pickup */}
                        {(d.tracking_status === "preparing" || d.tracking_status === "ready_for_pickup") && (
                          <button
                            onClick={() => handleUpdateTracking(d.id, d.tracking_status, true)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          >
                            {d.tracking_status === "preparing" ? "Ready for Pickup" : "In Transit"}
                          </button>
                        )}
                    </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No direct donations yet.</p>
      )}


    <h2 className="text-2xl font-bold mb-4 mt-8">Pending Request</h2>
    {pendingDonations.length > 0 ? (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pendingDonations.map((d) => (
        <div
            key={d.id}
            id={`pending-${d.donation_id || d.id}`}
            className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
            highlightedId === (d.donation_id || d.id)
                ? "border-4 border-amber-500 bg-amber-100"
                : ""
            }`}
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
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {d.description}
                </p>
            )}
            </div>
        </div>
        ))}
    </div>
    ) : (
    <p className="text-gray-500">No pending request.</p>
    )}
    </div>
  );
};

export default CharityReceived;