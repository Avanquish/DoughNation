import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Package, Heart } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AdminDonations = () => {
  const [inventory, setInventory] = useState([]);
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9; // 3 columns × 3 rows like BakeryDonation

  // Donation form state
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [donationForm, setDonationForm] = useState({
    charity_id: "",
    quantity: "",
  });

  useEffect(() => {
    fetchInventory();
    fetchCharities();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/inventory/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharities = async () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/charities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCharities(response.data || []);
    } catch (error) {
      console.error("Failed to fetch charities:", error);
    }
  };

  const handleDonate = async () => {
    if (!selectedItem || !donationForm.charity_id || !donationForm.quantity) {
      Swal.fire({
        title: "Missing Information",
        text: "Please select charity and enter quantity",
        icon: "warning",
        confirmButtonColor: "#BF7326",
      });
      return;
    }

    if (parseInt(donationForm.quantity) > selectedItem.quantity) {
      Swal.fire({
        title: "Invalid Quantity",
        text: "Donation quantity exceeds available stock",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
      return;
    }

    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await axios.post(
        `${API}/admin/donate`,
        {
          inventory_item_id: selectedItem.id,
          charity_id: donationForm.charity_id,
          quantity: parseInt(donationForm.quantity),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Swal.fire({
        title: "Donation Created!",
        text: "Your donation has been sent to the charity",
        icon: "success",
        confirmButtonColor: "#BF7326",
      });

      setShowDonationForm(false);
      setSelectedItem(null);
      setDonationForm({ charity_id: "", quantity: "" });
      fetchInventory();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.detail || "Failed to create donation",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
    }
  };

  // Filter and pagination
  const availableInventory = inventory.filter((item) => item.quantity > 0);
  
  const totalPages = Math.max(1, Math.ceil(availableInventory.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedItems = availableInventory.slice(startIndex, startIndex + PAGE_SIZE);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  const pagerBtn =
    "min-w-[80px] rounded-full border border-[#f2d4b5] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/95";

  const openDonationForm = (item) => {
    setSelectedItem(item);
    setDonationForm({ charity_id: "", quantity: "" });
    setShowDonationForm(true);
  };

  return (
    <div className="space-y-2">
      {/* Header - matching BakeryDonation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-0 pt-1">
        <h2
          className="text-3xl sm:text-3xl font-extrabold"
          style={{ color: "#6B4B2B" }}
        >
          For Donations
        </h2>
      </div>

      {/* Cards Container */}
      <div className="rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-60 rounded-2xl bg-white/70 border border-[#f2e3cf] overflow-hidden"
              >
                <div className="h-32 bg-[#FFF6E9] animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 bg-[#F7E7CF] rounded animate-pulse" />
                  <div className="h-3 w-full bg-[#F7E7CF] rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-[#F7E7CF] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : availableInventory.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-[#f2e3cf] bg-white/70 shadow-[0_2px_10px_rgba(93,64,28,.05)] overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)] hover:ring-1 hover:ring-[#E49A52]/35"
                >
                  <div className="relative h-40 overflow-hidden">
                    {item.image ? (
                      <img
                        src={`${API}/${item.image}`}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center bg-[#FFF6E9]">
                        <Package className="w-8 h-8" style={{ color: "#b88a5a" }} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 text-[11px] font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-green-50 border-green-200 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Available
                    </div>
                  </div>

                  <div className="p-4">
                    <h3
                      className="text-lg font-semibold mb-1 truncate"
                      style={{ color: "#6b4b2b" }}
                    >
                      {item.name}
                    </h3>

                    <div className="space-y-1.5 text-xs" style={{ color: "#7b5836" }}>
                      <div className="flex items-center justify-between">
                        <span>Quantity:</span>
                        <span className="font-semibold">{item.quantity}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Type:</span>
                        <span className="font-semibold">{item.donation_type || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Source:</span>
                        <span className="font-semibold capitalize">{item.source || "N/A"}</span>
                      </div>
                      {item.expiration_date && (
                        <div className="flex items-center justify-between">
                          <span>Expires:</span>
                          <span className="font-semibold text-red-600">
                            {new Date(item.expiration_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openDonationForm(item)}
                      className="mt-4 w-full rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(201,124,44,.25)] hover:-translate-y-0.5 active:scale-95 transition"
                    >
                      Donate This Item
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  className={pagerBtn}
                  disabled={!canPrev}
                  onClick={() => canPrev && setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span className="text-xs sm:text-sm font-semibold text-[#6b4b2b]">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  className={pagerBtn}
                  disabled={!canNext}
                  onClick={() => canNext && setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="grid place-items-center h-48 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
            <p className="text-sm" style={{ color: "#7b5836" }}>
              No items available for donation.
            </p>
          </div>
        )}
      </div>

      {/* Donation Form Modal */}
      {showDonationForm && selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDonationForm(false);
            setSelectedItem(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-[#8B4513] mb-6">
              Donate to Charity
            </h3>

            {/* Selected Item Info */}
            <div className="mb-6 p-4 bg-[#FFF6E6] border-2 border-[#E49A52] rounded-lg">
              {selectedItem.image && (
                <img
                  src={`${API}/${selectedItem.image}`}
                  alt={selectedItem.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <p className="text-sm text-gray-600 mb-1">Selected Item:</p>
              <p className="font-bold text-[#4A2F17] text-lg">{selectedItem.name}</p>
              <p className="text-sm text-gray-600 mt-2">
                Available: <span className="font-semibold">{selectedItem.quantity}</span>
              </p>
              <p className="text-xs text-gray-500">{selectedItem.donation_type}</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Select Charity *
                </label>
                <select
                  value={donationForm.charity_id}
                  onChange={(e) =>
                    setDonationForm({ ...donationForm, charity_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                >
                  <option value="">-- Choose Charity --</option>
                  {charities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Donation Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.quantity}
                  value={donationForm.quantity}
                  onChange={(e) =>
                    setDonationForm({ ...donationForm, quantity: e.target.value })
                  }
                  placeholder="Enter quantity"
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDonate}
                  className="flex-1 px-4 py-3 bg-[#BF7326] text-white rounded-lg hover:bg-[#8B4513] font-semibold"
                >
                  Send Donation
                </button>
                <button
                  onClick={() => {
                    setShowDonationForm(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-[#BF7326] text-[#8B4513] rounded-lg hover:bg-[#FFF6E6] font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDonations;
