import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import DonationTracking from "./DonationTracking";

const API = "http://localhost:8000";

const BakeryDonation = ({ highlightedDonationId }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const highlightedRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDonations = async () => {
    try {
      const res = await axios.get(`${API}/donations/`, { headers });
      console.log("Fetched donations:", res.data);
      setDonations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching donations:", err);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedDonationId, donations]);

  const today = new Date();

  const availableDonations = Array.isArray(donations)
  ? donations.filter(d => {
      const status = (d.status || "").toLowerCase();
      if (status !== "available") return false;
      if (!d.expiration_date || !d.threshold) return false;

      const expiration = new Date(d.expiration_date);
      const thresholdDays = Number(d.threshold) || 0;
      const thresholdDate = new Date(expiration.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

      return today >= thresholdDate;
    })
  : [];

  const requestedDonations = Array.isArray(donations)
    ? donations.filter(d => d.status === "requested")
    : [];

  const getCharityName = (donation) => {
    return donation.charity_name || donation.requested_by || donation.charity?.name || "Unknown";
  };

  const renderDonationCard = (donation, clickable = false) => {
    const isHighlighted = donation.id === highlightedDonationId;

    return (
      <div
        key={donation.id}
        ref={isHighlighted ? highlightedRef : null}
        className={`bg-white rounded-xl shadow-md overflow-hidden transition ${
          isHighlighted ? "ring-4 ring-blue-400" : "hover:shadow-lg"
        } ${clickable ? "cursor-pointer hover:scale-105" : ""}`}
        onClick={clickable ? () => setSelectedDonation(donation) : undefined}
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
          <h3 className="text-xl font-semibold text-gray-800">{donation.name}</h3>

          {/* Show "Requested by" only if status is requested */}
          {donation.status === "requested" && (
            <p className="text-gray-600 text-sm mb-1">
              Requested by: <span className="font-medium">{getCharityName(donation)}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Quantity:</span> {donation.quantity}
            </p>
            <p>
              <span className="font-medium">Threshold:</span> {donation.threshold ?? "—"}
            </p>
            <p>
              <span className="font-medium">Created:</span>{" "}
              {donation.creation_date
                ? new Date(donation.creation_date).toLocaleDateString()
                : "—"}
            </p>
            <p>
              <span className="font-medium">Expires:</span>{" "}
              {donation.expiration_date
                ? new Date(donation.expiration_date).toLocaleDateString()
                : "—"}
            </p>
          </div>

          {donation.description && (
            <p className="mt-2 text-gray-600 text-sm line-clamp-2">{donation.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Donations</h2>

      {loading ? (
        <p className="text-gray-500">Loading donations...</p>
      ) : (
        <>
          {/* Available for Donation */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">Available for Donation</h3>
            {availableDonations.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {availableDonations.map(d => renderDonationCard(d))}
              </div>
            ) : (
              <p className="text-gray-500">No available donations.</p>
            )}
          </div>

          {/* Requested by Charity */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">Requested by Charity</h3>
            {requestedDonations.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {requestedDonations.map(d => renderDonationCard(d, true))}
              </div>
            ) : (
              <p className="text-gray-500">No donations requested yet.</p>
            )}
          </div>
        </>
      )}

      {/* Modal for selected donation */}
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

            {selectedDonation.status === "requested" && (
              <p className="text-sm text-gray-600 mb-2">
                Requested by: <span className="font-medium">{getCharityName(selectedDonation)}</span>
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

            {/* Stepper */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-900 text-center">Product Status</h4>
              <DonationTracking currentStatus={selectedDonation.status || "being_packed"} />
              {/* Conditional Progress Button */}
              {selectedDonation.status === "requested" && (
                <div className="mt-4 flex justify-center">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                    onClick={() => {
                      // TODO: Call API to update donation status / progress stepper
                      console.log(`Progress donation ${selectedDonation.id} to next step`);
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

export default BakeryDonation;
