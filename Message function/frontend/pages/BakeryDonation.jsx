import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const BakeryDonation = ({ highlightedDonationId }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const highlightedRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDonations = async () => {
    try {
      const res = await axios.get(`${API}/donations`, { headers });
      setDonations(res.data);
    } catch (err) {
      console.error("Error fetching donations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // Scroll to highlighted card when donations load
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedDonationId, donations]);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Donations</h2>

      {loading ? (
        <p className="text-gray-500">Loading donations...</p>
      ) : donations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {donations.map((donation) => {
            const isHighlighted = donation.id === highlightedDonationId;
            return (
              <div
                key={donation.id}
                ref={isHighlighted ? highlightedRef : null}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition 
                  ${isHighlighted ? "ring-4 ring-blue-400" : "hover:shadow-lg"}`}
              >
                {/* Image */}
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

                {/* Card Body */}
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {donation.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Uploaded by:{" "}
                    <span className="font-medium">
                      {donation.uploaded || "—"}
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Quantity:</span>{" "}
                      {donation.quantity}
                    </p>
                    <p>
                      <span className="font-medium">Threshold:</span>{" "}
                      {donation.threshold ?? "—"}
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
                    <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                      {donation.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No donations found.</p>
      )}
    </div>
  );
};

export default BakeryDonation;
