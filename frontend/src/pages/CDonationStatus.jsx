import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

import Feedback from "./Feedback";

const CDonationStatus = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [localStatus, setLocalStatus] = useState("preparing");
  const highlightRequestId = localStorage.getItem("highlight_accepted_request");

  const statusOrder = ["preparing", "ready_for_pickup", "in_transit", "received", "complete"];



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

  // Update localStatus whenever selectedDonation changes
useEffect(() => {
  if (selectedDonation) {
    setLocalStatus(selectedDonation.tracking_status ?? selectedDonation.btracking_status ?? "preparing");
  }
}, [selectedDonation]);

  // Function to fetch all donations (normal + direct)
  const fetchAllDonations = async () => {
    if (!currentUser || currentUser.role !== "charity") return;
    const token = localStorage.getItem("token");

    try {
      // Normal donations
      const resNormal = await fetch(`${API}/donation/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataNormal = await resNormal.json();
      const activeNormal = dataNormal.filter(d => d.tracking_status !== "complete");

      setReceivedDonations(
        activeNormal
          .filter(d => d.status === "accepted")
          .map(d => ({ ...d, request_id: d.request_id || d.id }))
      );
      setPendingDonations(activeNormal.filter(d => d.status === "pending"));

      // Direct donations
      const resDirect = await fetch(`${API}/direct/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataDirect = await resDirect.json();
      setDirectDonations(dataDirect.filter(d => d.btracking_status !== "complete"));
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch donations when currentUser loads
  useEffect(() => {
    fetchAllDonations();
  }, [currentUser]);

  // Mark normal donation as received
  const markAsReceived = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/donation/received/${donationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to mark donation as received");

      await fetchAllDonations(); // reload donations
    } catch (err) {
      console.error(err);
    }
  };

  // Mark direct donation as received
  const markDirectAsReceived = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/direct/received/${donationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to mark direct donation as received");

      await fetchAllDonations(); // reload donations
    } catch (err) {
      console.error(err);
    }
  };

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
                 onClick={() => setSelectedDonation(d)} 
              >
                {d.image ? (
                  <img src={`${API}/${d.image}`} alt={d.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
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
                    <p className="text-sm text-red-500">{`Expires: ${new Date(d.expiration_date).toLocaleDateString()}`}</p>
                  )}
                    <span className="text-sm font-medium">Status: {statusText(tracking)}</span>
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
                 onClick={() => setSelectedDonation(d)} 
              >
                {d.image ? (
                  <img src={`${API}/${d.image}`} alt={d.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
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
                    <p className="text-sm text-red-500">{`Expires: ${new Date(d.expiration_date).toLocaleDateString()}`}</p>
                  )}
                    <span className="text-sm font-medium">Status: {statusText(d.btracking_status)}</span>
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


{/* --- MODAL --- */}
{selectedDonation && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
       onClick={() => setSelectedDonation(null)}>
    <div className="bg-white rounded-xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
      
      <button
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 font-bold text-2xl"
        onClick={() => setSelectedDonation(null)}
      >
        ×
      </button>

      {selectedDonation.image && (
        <img src={`${API}/${selectedDonation.image}`} alt={selectedDonation.name}
             className="h-48 w-full object-cover rounded-md mb-4"/>
      )}

      <h3 className="text-xl font-semibold">{selectedDonation.name}</h3>

      <p className="mt-2 text-sm text-gray-600">Quantity: {selectedDonation.quantity}</p>

      {selectedDonation.expiration_date && (
        <p className="text-sm text-red-500 mt-2">
          Expires: {new Date(selectedDonation.expiration_date).toLocaleDateString()}
        </p>
      )}

        {/* Stepper */}
<div className="flex items-center justify-between w-full mt-6 relative">
  {statusOrder.map((status, idx) => {
    const statusValue =
      selectedDonation.tracking_status ??
      selectedDonation.btracking_status ??
      "preparing";

    const currentIndex = statusOrder.indexOf(statusValue);
    const isCompleted = statusValue === "complete";

    return (
      <div key={status} className="flex-1 flex flex-col items-center relative">
        {/* Left connector */}
        {idx > 0 && (
          <div
            className={`absolute top-4 left-0 w-1/2 h-1 z-0 ${
              isCompleted || idx - 1 < currentIndex
                ? "bg-green-500"
                : "bg-gray-300"
            }`}
          ></div>
        )}

        {/* Right connector */}
        {idx < statusOrder.length - 1 && (
          <div
            className={`absolute top-4 right-0 w-1/2 h-1 z-0 ${
              isCompleted || idx < currentIndex
                ? "bg-green-500"
                : "bg-gray-300"
            }`}
          ></div>
        )}

        {/* Circle */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white z-10 transition-all duration-300 ${
            isCompleted
              ? "bg-green-500"
              : idx < currentIndex
              ? "bg-green-500"
              : idx === currentIndex
              ? "bg-green-500 -translate-y-2 scale-110"
              : "bg-gray-300"
          }`}
        >
          {isCompleted && idx === statusOrder.length - 1 ? "✓" : idx + 1}
        </div>

        {/* Label */}
        <span
          className={`mt-2 text-xs text-center transition-all duration-300 ${
            idx === currentIndex && !isCompleted
              ? "-translate-y-2 font-semibold"
              : ""
          }`}
        >
          {status.replaceAll("_", " ")}
        </span>
      </div>
    );
  })}
</div>


     {/* Status + Dynamic Button */}
      <div className="mt-4 flex items-center justify-between">
        {/* Received button */}
        {(selectedDonation.tracking_status ?? selectedDonation.btracking_status) === "in_transit" && (
          <button
            onClick={async () => {
              if (selectedDonation.btracking_status !== undefined) {
                await markDirectAsReceived(selectedDonation.id);
              } else {
                await markAsReceived(selectedDonation.id);
              }
              // Update local state
              setSelectedDonation((prev) => ({
                ...prev,
                tracking_status: prev.tracking_status ? "received" : prev.tracking_status,
                btracking_status: prev.btracking_status ? "received" : prev.btracking_status,
              }));
              await fetchAllDonations();
            }}
            className="mt-6 w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Received
          </button>
        )}

        {/* Feedback button */}
        {((selectedDonation.tracking_status ?? selectedDonation.btracking_status)?.toLowerCase() === "received") &&
          !selectedDonation.feedback_submitted && (
            <Feedback 
              donationId={selectedDonation.id}
              isDirect={selectedDonation.btracking_status !== undefined}
              onSubmitted={() => {
                setDirectDonations((prev) =>
                  prev.map((don) =>
                    don.id === selectedDonation.id
                      ? { ...don, feedback_submitted: true, btracking_status: "complete" }
                      : don
                  )
                );
                setReceivedDonations((prev) =>
                  prev.map((don) =>
                    don.id === selectedDonation.id
                      ? { ...don, feedback_submitted: true, tracking_status: "complete" }
                      : don
                  )
                );
                // Update modal state
                setSelectedDonation((prev) => ({
                  ...prev,
                  feedback_submitted: true,
                  tracking_status: prev.tracking_status ? "complete" : prev.tracking_status,
                  btracking_status: prev.btracking_status ? "complete" : prev.btracking_status,
                }));
              }}
            />
          )}
      </div>

      {/* Expired warning */}
      {selectedDonation.expiration_date &&
        new Date(selectedDonation.expiration_date) < new Date() && (
          <p className="mt-4 text-center text-red-500 font-semibold">
            This donation has expired
          </p>
        )}
    </div>
  </div>
)}


    </div>
  );
};

export default CDonationStatus;