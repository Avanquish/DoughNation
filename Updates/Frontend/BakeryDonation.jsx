import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

// helper: treat items expiring today or earlier as expired (consistent with inventory logic)
const isExpired = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= today;
};

// Reusable overlay (same behavior as Add Product overlay)
function Overlay({ onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 pt-16 pb-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />

      {/* Container */}
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}

const BakeryDonation = ({ highlightedDonationId }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const highlightedRef = useRef(null);

  // modal + form state
  const [showDonate, setShowDonate] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [charities, setCharities] = useState([]);
  const [form, setForm] = useState({
    bakery_inventory_id: "",
    name: "",
    quantity: 1,
    threshold: 1,
    creation_date: "",
    expiration_date: "",
    description: "",
    charity_id: "",
    image_file: null,
  });

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

  // inventory/charities for modal
  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      // Exclude donated/requested AND any expired items from being selectable for donation
      const ok = (res.data || []).filter((it) => {
        const s = String(it.status || "").toLowerCase();
        const expired = isExpired(it.expiration_date);
        return s !== "donated" && s !== "requested" && !expired;
      });
      setInventory(ok);
    } catch (e) {
      console.error("inventory", e);
    }
  };

  const fetchCharities = async () => {
    try {
      const res = await axios.get(`${API}/charities`, { headers });
      setCharities(res.data);
    } catch (e) {
      console.error("charities", e);
    }
  };

  useEffect(() => {
    if (!showDonate) return;
    fetchInventory();
    fetchCharities();
  }, [showDonate]);

  const onPickInventory = (idStr) => {
    const id = parseInt(idStr || 0, 10);
    const item = inventory.find((x) => Number(x.id) === id);
    if (!item) {
      setForm((f) => ({ ...f, bakery_inventory_id: "", name: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      bakery_inventory_id: idStr,
      name: item.name || "",
      threshold: item.threshold ?? 1,
      creation_date: item.creation_date ? String(item.creation_date).split("T")[0] : "",
      expiration_date: item.expiration_date ? String(item.expiration_date).split("T")[0] : "",
      description: item.description || "",
    }));
  };

  return (
    <div className="p-6">
      {/* Header with Donate button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Donations</h2>
        <button
          onClick={() => setShowDonate(true)}
          className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Donate Now!
        </button>
      </div>

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

      {/* --- Create Donation Modal (now rendered via Overlay/Portal) --- */}
      {showDonate && (
        <Overlay onClose={() => setShowDonate(false)}>
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 flex flex-col max-h-[calc(100vh-7rem)] overflow-hidden"
          >
            {/* Sticky header */}
            <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199] sticky top-0 z-10">
              <h3 className="text-lg font-semibold text-[#6b4b2b]">Create Donation</h3>
            </div>

            {/* Scrollable body */}
            <form
              id="donationForm"
              className="flex-1 overflow-auto p-4 sm:p-5 grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (!form.bakery_inventory_id) {
                    Swal.fire("Missing item", "Please choose an inventory item.", "error");
                    return;
                  }

                  // extra safety: block donations for expired items even if somehow listed
                  const chosen = inventory.find((x) => Number(x.id) === parseInt(form.bakery_inventory_id, 10));
                  if (chosen && isExpired(chosen.expiration_date)) {
                    Swal.fire("Not allowed", "Expired products cannot be donated.", "error");
                    return;
                  }

                  const fd = new FormData();
                  fd.append("bakery_inventory_id", parseInt(form.bakery_inventory_id, 10));
                  fd.append("name", form.name);
                  fd.append("quantity", form.quantity);
                  fd.append("threshold", form.threshold);
                  fd.append("creation_date", form.creation_date);
                  if (form.expiration_date) fd.append("expiration_date", form.expiration_date);
                  fd.append("description", form.description || "");
                  fd.append("charity_id", parseInt(form.charity_id, 10));
                  if (form.image_file) fd.append("image", form.image_file);

                  await axios.post(`${API}/direct`, fd, {
                    headers: { ...headers, "Content-Type": "multipart/form-data" },
                  });

                  Swal.fire("Success", "Donation recorded!", "success");
                  setShowDonate(false);
                  setForm({
                    bakery_inventory_id: "",
                    name: "",
                    quantity: 1,
                    threshold: 1,
                    creation_date: "",
                    expiration_date: "",
                    description: "",
                    charity_id: "",
                    image_file: null,
                  });
                  fetchDonations();
                } catch (err) {
                  console.error("Donation create error:", err?.response?.data || err);
                  Swal.fire("Error", "Could not save donation.", "error");
                }
              }}
            >
              {/* Inventory item */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Inventory Item</label>
                <select
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.bakery_inventory_id}
                  onChange={(e) => onPickInventory(e.target.value)}
                  required
                >
                  <option value="">Select item to donate</option>
                  {inventory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} (Qty: {it.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Name</label>
                <input
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Charity */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Charity</label>
                <select
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.charity_id}
                  onChange={(e) => setForm({ ...form, charity_id: e.target.value })}
                  required
                >
                  <option value="">Select Charity</option>
                  {charities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Quantity</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: parseInt(e.target.value || 0, 10) })
                  }
                  required
                />
              </div>

              {/* Threshold */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Threshold (days)</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.threshold}
                  onChange={(e) =>
                    setForm({ ...form, threshold: parseInt(e.target.value || 0, 10) })
                  }
                  required
                />
              </div>

              {/* Creation Date */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Creation Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.creation_date}
                  onChange={(e) => setForm({ ...form, creation_date: e.target.value })}
                  required
                />
              </div>

              {/* Expiration Date */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Expiration Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  value={form.expiration_date}
                  onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                />
              </div>

              {/* Image */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[#6b4b2b]">Picture (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52]"
                  onChange={(e) => setForm({ ...form, image_file: e.target.files[0] })}
                />
              </div>

              {/* Description (full width) */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#6b4b2b]">Description</label>
                <textarea
                  className="w-full rounded-md border border-[#f2d4b5] bg-white p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] min-h[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </form>

            {/* Sticky footer */}
            <div className="sticky bottom-0 z-10 border-t bg-white p-3 sm:p-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDonate(false)}
                className="rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-5 py-2 shadow-sm hover:bg-white/90 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="donationForm"
                className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                Save Donation
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
};

export default BakeryDonation;
