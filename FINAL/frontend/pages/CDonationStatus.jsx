import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

import Feedback from "./Feedback";

const CDonationStatus = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightRequestId = localStorage.getItem("highlight_accepted_request");


  // Load current user from token
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

  // Normal donations functions
  const markAsReceived = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/donation/received/${donationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setReceivedDonations((prev) =>
        prev.map((d) =>
          d.id === donationId ? { ...d, tracking_status: "received" } : d
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

const handleFeedbackChange = (id, field, value) => {
  setFeedbackInputs(prev => ({
    ...prev,
    [id]: { ...prev[id], [field]: value }
  }));
};

const saveFeedback = async (donationId, isDirect = false) => {
  try {
    const token = localStorage.getItem("token");
    const payload = feedbackInputs[donationId] || { message: "", rating: null };

    await fetch(`${API}/${isDirect ? "direct" : "donation"}/feedback/${donationId}`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (isDirect) {
      setDirectDonations(prev =>
       prev.filter(d => d.id !== donationId)
      );
    } else {
      setReceivedDonations(prev =>
       prev.filter(d => d.id !== donationId)
      );
    }
  } catch (err) {
    console.error(err);
  }
};

  // Direct donations functions
  const markDirectAsReceived = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/direct/received/${donationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setDirectDonations((prev) =>
        prev.map((d) =>
          d.id === donationId ? { ...d, tracking_status: "received" } : d
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch normal donations
  useEffect(() => {
    if (!currentUser || currentUser.role !== "charity") return;
    const fetchNormal = async () => {
      try {
        const res = await fetch(`${API}/donation/received`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();

        const active = data.filter(d => d.tracking_status !== "complete");

        // Keep request_id around
      setReceivedDonations(
        active
          .filter(d => d.status === "accepted")
          .map(d => ({
            ...d,
            request_id: d.request_id || d.id, // fallback so highlight works
          }))
      );
        setPendingDonations(active.filter(d => d.status === "pending"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchNormal();
  }, [currentUser]);

  // Fetch direct donations
 useEffect(() => {
  if (!currentUser || currentUser.role !== "charity") return;
  const fetchDirect = async () => {
    try {
      const res = await fetch(`${API}/direct/mine`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      console.log("Direct donations fetched:", data);
      setDirectDonations(data.filter(d => d.btracking_status !== "complete"));
    } catch (err) {
      console.error(err);
    }
  };
  fetchDirect();
}, [currentUser]);

  // Highlight from notifications
useEffect(() => {
  const handler = (storageKey, prefix) => {
    const id = localStorage.getItem(storageKey);
    if (id) {
      setHighlightedId(Number(id));
      const el = document.getElementById(`${prefix}-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightedId(null), 3000);
      localStorage.removeItem(storageKey);
    }
  };

  const donationHandler = () => handler("highlight_donation", "received");
  const donationStatusHandler = () => handler("highlight_donationStatus_donation", "received");
  const acceptedHandler = () => handler("highlight_accepted_request", "accepted");

  window.addEventListener("highlight_donation", donationHandler);
  window.addEventListener("highlight_donationStatus_donation", donationStatusHandler);
  window.addEventListener("highlight_accepted_request", acceptedHandler);

  return () => {
    window.removeEventListener("highlight_donation", donationHandler);
    window.removeEventListener("highlight_donationStatus_donation", donationStatusHandler);
    window.removeEventListener("highlight_accepted_request", acceptedHandler);
  };
}, []);


  // Safe function to render status text
  const statusText = (status) => (status ? status.replaceAll("_", " ").toUpperCase() : "IN_TRANSIT");

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Received Donations</h2>
      {receivedDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {receivedDonations.map((d) => {
            const tracking = d.tracking_status || "in_transit";
            const feedback = d.feedback_submitted || false;
            return (
             <div
                key={d.id}
                id={`accepted-${d.request_id || d.id}`}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                  highlightedId === (d.request_id || d.id) || String(d.request_id || d.id) === highlightRequestId
                    ? "border-4 border-amber-500 bg-amber-100"
                    : ""
                }`}
              >
                {d.image ? (
                  <img src={`${API}/${d.image}`} alt={d.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{d.name}</h3>
                  <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
                  {d.expiration_date && (
                    <p className="text-sm text-red-500">{`Expires: ${new Date(d.expiration_date).toLocaleDateString()}`}</p>
                  )}
                  {d.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{d.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium">Status: {statusText(tracking)}</span>
                    {["in_transit"].includes(tracking) && (
                      <button onClick={() => markAsReceived(d.id)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        Received
                      </button>
                    )}
                    {tracking === "received" && !feedback && (
                      <Feedback
                        donationId={d.id}
                        isDirect={false}
                        onSubmitted={() =>
                          setReceivedDonations((prev) =>
                            prev.map((don) =>
                              don.id === d.id
                                ? { ...don, feedback_submitted: true, tracking_status: "complete" }
                                : don
                            )
                          )
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No donations received yet.</p>
      )}

      {/* Direct Donations */}
      <h2 className="text-2xl font-bold mb-4 mt-8">Direct Donations</h2>
      {directDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {directDonations.map((d) => {
            const tracking = d.tracking_status || "in_transit";
            const feedback = d.feedback_submitted || false;
            return (
              <div
                key={d.id}
                id={`received-${d.donation_id || d.id}`}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                  highlightedId === (d.donation_id || d.id) ? "border-4 border-amber-500 bg-amber-100" : ""
                }`}
              >
                {d.image ? (
                  <img src={`${API}/${d.image}`} alt={d.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{d.name}</h3>
                  <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
                  {d.expiration_date && (
                    <p className="text-sm text-red-500">{`Expires: ${new Date(d.expiration_date).toLocaleDateString()}`}</p>
                  )}
                  {d.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{d.description}</p>
                  )}


                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium">Status: {statusText(d.btracking_status)}</span>
                    {d.btracking_status === "in_transit" &&(
                      <button onClick={() => markDirectAsReceived(d.id)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        Received
                      </button>
                    )}
                    {d.btracking_status?.toLowerCase() === "received" && !d.feedback_submitted && (
                        <Feedback
                          donationId={d.id}
                          isDirect={true}
                          onSubmitted={() =>
                            setDirectDonations((prev) =>
                              prev.map((don) =>
                                don.id === d.id
                                  ? { ...don, feedback_submitted: true, btracking_status: "complete" }
                                  : don
                              )
                            )
                          }
                        />
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No direct donations received yet.</p>
      )}

      {/* Pending Donations */}
      <h2 className="text-2xl font-bold mb-4 mt-8">Pending Donations</h2>
      {pendingDonations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pendingDonations.map((d) => (
            <div
              key={d.id}
              id={`pending-${d.donation_id || d.id}`}
              className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                highlightedId === (d.donation_id || d.id) ? "border-4 border-amber-500 bg-amber-100" : ""
              }`}
            >
              {d.image ? (
                <img src={`${API}/${d.image}`} alt={d.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold">{d.name}</h3>
                <p className="text-sm text-gray-600">Quantity: {d.quantity}</p>
                {d.expiration_date && (
                  <p className="text-sm text-red-500">{`Expires: ${new Date(d.expiration_date).toLocaleDateString()}`}</p>
                )}
                {d.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{d.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No pending donations.</p>
      )}
    </div>
  );
};

export default CDonationStatus;
