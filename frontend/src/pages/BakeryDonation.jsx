import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import DonationTracking from "./DonationTracking";
import ReactDOM from "react-dom";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

const isExpired = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= today;
};

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
  const [selectedDonation, setSelectedDonation] = useState(null);
  const highlightedRef = useRef(null);
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
  const [employees, setEmployees] = useState([]);
  const [verified, setVerified] = useState(false); // Access control (unchanged logic)
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");

    // Tones
  const labelTone = "block text-sm font-medium text-[#6b4b2b]";
  const inputTone =
    "w-full rounded-md border border-[#f2d4b5] bg-white/95 p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]";
  const sectionHeader =
    "p-5 sm:p-6 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]";
  
  const bounce =
    "transition-transform duration-150 hover:-translate-y-0.5 active:scale-95";
  const pillSolid = `rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 ${bounce}`;

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

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`, { headers });
      setEmployees(res.data);
    } catch (e) {
      console.error("employees", e);
    }
  };

  useEffect(() => {
    fetchDonations();
    fetchEmployees();
  }, []);

  // Role checks
  const canDonate = () =>
    employeeRole === "Manager" || employeeRole === "Full Time Staff";

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedDonationId, donations]);

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

  // Employee verification
    const handleVerify = () => {
      const found = employees.find(
        (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
      );
      if (found) {
        Swal.fire({
          title: "Access Granted",
          text: `Welcome, ${found.name}!`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        setVerified(true);
        setEmployeeRole(found.role);
      } else {
        Swal.fire({
          title: "Employee Not Found",
          text: "Please enter a valid employee name.",
          icon: "error",
        });
      }
    };

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Donations</h2>
        {/* Only show Donate Now button after verification */}
          {verified && (
            <button
              onClick={() => setShowDonate(true)}
              className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Donate Now!
            </button>
          )}
        </div>

      {loading ? (
        <p className="text-gray-500">Loading donations...</p>
      ) : (
        <>
          {/* Verification Modal */}
          {!verified && (
            <div className="fixed inset-25 z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl ring-1 overflow-hidden max-w-md w-full">
                <div className={sectionHeader}>
                  <h2 className="text-xl font-semibold text-[#6b4b2b] text-center">
                    Verify Access
                  </h2>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="space-y-3">
                    <label className={labelTone} htmlFor="verify_name">
                      Employee Name
                    </label>
                    <input
                      id="verify_name"
                      type="text"
                      placeholder="Enter employee name"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                      className={inputTone}
                    />
                    <p className="text-xs text-gray-500">
                      Type your name exactly as saved by HR to continue.
                    </p>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={handleVerify} className={pillSolid}>
                      Enter Donation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Only show donations after verification */}
          {verified && (
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

                  if (!canDonate()) {
                        Swal.fire(
                          "Access Denide",
                          "You are not allowed to add products.",
                          "error"
                        );
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
