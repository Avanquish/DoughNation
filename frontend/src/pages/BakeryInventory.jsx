import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

// Helpers
const parseDate = (s) => (s ? new Date(s) : null);
const daysUntil = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};
const statusOf = (item) => {
  const d = daysUntil(item.expiration_date);
  if (d === null) return "fresh";
  if (d <= 0) return "expired";
  if (d <= (Number(item.threshold) || 0)) return "soon";
  return "fresh";
};

const rowTone = (s) =>
  s === "expired"
    ? "bg-red-300 hover:bg-red-100/70"
    : s === "soon"
    ? "bg-amber-200 hover:bg-amber-100/70"
    : "bg-green-200 hover:bg-green-100/70";

// Product ID Generator
const productCode = (name) => {
  const base = (name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, "");
  if (!base) return "PRD-00000";
  const words = base.split(/\s+/).filter(Boolean);
  const prefix =
    (words[0]?.[0] || "P") + (words[1]?.[0] || words[0]?.[1] || "R");
  let hash = 5381;
  for (let i = 0; i < base.length; i++)
    hash = ((hash << 5) + hash) ^ base.charCodeAt(i);
  const num = Math.abs(hash) % 100000;
  return `${prefix}-${num.toString().padStart(5, "0")}`;
};

// Overlays
function Overlay({ onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);
  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />
      <div
        className="relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
  return ReactDOM.createPortal(node, document.body);
}

function SlideOver({ open, onClose, children, width = 620 }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/5 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="absolute right-8 md:right-12 top-6 bottom-6 bg-white shadow-2xl border border-black/15 rounded-xl max-w-[92vw] overflow-hidden"
        style={{ width }}
      >
        <div className="h-full flex flex-col">{children}</div>
      </aside>
    </div>,
    document.body
  );
}

//  DonationStatus
function DonationStatus({ status }) {
  const key = String(status || "available").toLowerCase();
  const styles =
    key === "requested"
      ? { label: "Requested", dot: "bg-blue-500", text: "text-blue-700" }
      : key === "donated"
      ? { label: "Donated", dot: "bg-amber-500", text: "text-amber-700" }
      : key === "unavailable"
      ? { label: "Unavailable", dot: "bg-red-500", text: "text-red-700" }
      : { label: "Available", dot: "bg-green-600", text: "text-green-700" };

  return (
    <span className={`inline-flex items-center gap-2 ${styles.text}`}>
      <span
        className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
        aria-hidden="true"
      />
      <span className="font-medium leading-none">{styles.label}</span>
    </span>
  );
}

export default function BakeryInventory() {
  const [inventory, setInventory] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [verified, setVerified] = useState(false); // Access control
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const canModify = ["Manager", "Full Time Staff", "Manager/Owner"].includes(employeeRole);

  const [form, setForm] = useState({
    item_name: "",
    quantity: 1,
    creation_date: "",
    expiration_date: "",
    description: "",
    image_file: null,
    threshold: 1,
    uploaded: employeeName || "", // Initialize with employee name if available
  });

  const [showDirectDonation, setShowDirectDonation] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'fresh' | 'soon' | 'expired'

  // Selection (bulk)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const masterRef = useRef(null);

  // Tones
  const labelTone = "block text-sm font-medium text-[#6b4b2b]";
  const inputTone =
    "w-full rounded-md border border-[#f2d4b5] bg-white/95 p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]";
  const sectionHeader =
    "p-5 sm:p-6 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]";

  // Buttons
  const bounce =
    "transition-transform duration-150 hover:-translate-y-0.5 active:scale-95";
  const pillSolid = `rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 ${bounce}`;
  const pillOutline = `rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-5 py-2 shadow-sm hover:bg-white/90 ${bounce}`;

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchInventory = async () => {
    const res = await axios.get(`${API}/inventory`, { headers });
    setInventory(res.data);
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
    fetchEmployees();
  }, []);

  // Fetch inventory if verified.
  useEffect(() => {
    if (verified) fetchInventory();
  }, [verified]);


  // Employee verification.
  const handleVerify = () => {
  const found = employees.find(
    (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
  );

  if (found) {
    setVerified(true);
    setEmployeeRole(found.role || ""); // store role
    setEmployeeName(found.name); // Store the verified employee name
    setForm((prev) => ({ ...prev, uploaded: found.name }));
    Swal.fire({
      title: "Access Granted",
      text: `Welcome, ${found.name}! Role: ${found.role}`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  } else {
    Swal.fire({
      title: "Employee Not Found",
      text: "Please enter a valid employee name.",
      icon: "error",
    });
  }
};

  // From Notifs
  useEffect(() => {
    let retryTimer = null;

    const focusItem = (detail) => {
      const wantedId = Number(detail?.id);
      const wantedName = (detail?.name || "").toLowerCase();

      let attempts = 0;
      const MAX_ATTEMPTS = 30; // ~4.5s total
      const INTERVAL_MS = 150;

      const tryFind = () => {
        attempts += 1;

        let item = null;
        if (wantedId) item = inventory.find((it) => Number(it.id) === wantedId);
        if (!item && wantedName)
          item = inventory.find(
            (it) => (it.name || "").toLowerCase() === wantedName
          );

        if (item) {
          setSelectedItem(item);
          setIsEditing(false);

          requestAnimationFrame(() => {
            const row = document.querySelector(`tr[data-item-id="${item.id}"]`);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
              row.classList.add("ring-2", "ring-[#E49A52]");
              setTimeout(
                () => row.classList.remove("ring-2", "ring-[#E49A52]"),
                1600
              );
            }
          });
          return;
        }

        if (attempts < MAX_ATTEMPTS) {
          retryTimer = setTimeout(tryFind, INTERVAL_MS);
        }
      };

      tryFind();
    };

    const handler = (e) => focusItem(e.detail || {});
    window.addEventListener("inventory:focus", handler);
    return () => {
      window.removeEventListener("inventory:focus", handler);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [inventory]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: inventory.length, fresh: 0, soon: 0, expired: 0 };
    for (const it of inventory) counts[statusOf(it)]++;
    return counts;
  }, [inventory]);

  // Filtered list
  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter((it) => {
      const nameOk = !q || (it.name || "").toLowerCase().includes(q);
      const st = statusOf(it);
      const statusOk = statusFilter === "all" || st === statusFilter;
      return nameOk && statusOk;
    });
  }, [inventory, query, statusFilter]);

  // Master checkbox state
  useEffect(() => {
    if (!masterRef.current) return;
    const idsOnPage = filteredInventory.map((it) => it.id);
    const selectedOnPage = idsOnPage.filter((id) => selectedIds.has(id));
    masterRef.current.indeterminate =
      selectedOnPage.length > 0 && selectedOnPage.length < idsOnPage.length;
    masterRef.current.checked =
      idsOnPage.length > 0 && selectedOnPage.length === idsOnPage.length;
  }, [filteredInventory, selectedIds]);

  // CRUD
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canModify) {
      Swal.fire("Permission Denied", "You are not allowed to add products.", "error");
        return;
    }

    const fd = new FormData();
    fd.append("name", form.item_name);
    fd.append("quantity", form.quantity);
    fd.append("creation_date", form.creation_date);
    fd.append("expiration_date", form.expiration_date);
    fd.append("threshold", form.threshold);
    fd.append("uploaded", employeeName || form.uploaded);
    fd.append("description", form.description);
    if (form.image_file) fd.append("image", form.image_file);

    await axios.post(`${API}/inventory`, fd, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });

    setForm({
      item_name: "",
      quantity: 1,
      creation_date: "",
      expiration_date: "",
      description: "",
      image_file: null,
      threshold: 1,
      uploaded: "",
    });
    setShowForm(false);
    await fetchInventory();
    window.dispatchEvent(new CustomEvent("inventory:changed"));
  };

  const handleDelete = async (id) => {

    if (!canModify) {
      Swal.fire("Permission Denied", "You are not allowed to delete products.", "error");
        return;
    }

    const ok = await Swal.fire({
      title: "Are you sure?",
      text: "This can't be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#A97142",
      cancelButtonColor: "#C1A78C",
      confirmButtonText: "Delete",
    });
    if (!ok.isConfirmed) return;

    await axios.delete(`${API}/inventory/${id}`, { headers });
    setSelectedItem(null);
    await fetchInventory();
    window.dispatchEvent(new CustomEvent("inventory:changed"));
    Swal.fire({
      title: "Deleted!",
      icon: "success",
      confirmButtonColor: "#A97142",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!canModify) {
      Swal.fire("Permission Denied", "You are not allowed to edit products.", "error");
        return;
    }

    if (!selectedItem) return;

    const ok = await Swal.fire({
      title: "Save changes?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: "#A97142",
    });
    if (!ok.isConfirmed) return;

    const fd = new FormData();
    fd.append("name", selectedItem.name);
    fd.append("quantity", selectedItem.quantity);
    fd.append("creation_date", selectedItem.creation_date);
    fd.append("expiration_date", selectedItem.expiration_date);
    fd.append("threshold", selectedItem.threshold);
    fd.append("uploaded", employeeName || selectedItem.uploaded || "");
    fd.append("description", selectedItem.description || "");
    if (selectedItem.image_file) fd.append("image", selectedItem.image_file);

    await axios.put(`${API}/inventory/${selectedItem.id}`, fd, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });

    Swal.fire({
      title: "Updated!",
      icon: "success",
      confirmButtonColor: "#A97142",
    });
    setIsEditing(false);
    setSelectedItem(null);
    await fetchInventory();
    window.dispatchEvent(new CustomEvent("inventory:changed"));
  };

  // Selection helpers
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllOnPage = (checked) => {
    const idsOnPage = filteredInventory.map((it) => it.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) idsOnPage.forEach((id) => next.add(id));
      else idsOnPage.forEach((id) => next.delete(id));
      return next;
    });
  };
  const selectExpiredAll = () => {
    const ids = inventory
      .filter((it) => statusOf(it) === "expired")
      .map((it) => it.id);
    setSelectedIds(new Set(ids));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const deleteSelected = async () => {
    const ids = [...selectedIds];

    if (!ids.length) return;
    const ok = await Swal.fire({
      title: `Delete ${ids.length} selected item${ids.length > 1 ? "s" : ""}?`,
      text: "This can't be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#A97142",
      cancelButtonColor: "#C1A78C",
    });
    if (!ok.isConfirmed) return;

    await Promise.all(
      ids.map((id) => axios.delete(`${API}/inventory/${id}`, { headers }))
    );
    clearSelection();
    await fetchInventory();
    window.dispatchEvent(new CustomEvent("inventory:changed"));
    Swal.fire({
      title: "Deleted!",
      text: `${ids.length} item(s) removed.`,
      icon: "success",
      confirmButtonColor: "#A97142",
    });
  };

  const selectedCount = selectedIds.size;

  // Pre-fill donation form when opened
  useEffect(() => {
    if (selectedItem && showDirectDonation) {
      setDirectForm({
        name: selectedItem.name || "",
        quantity: "",
        threshold: selectedItem.threshold || "",
        creation_date: selectedItem.creation_date
          ? selectedItem.creation_date.split("T")[0]
          : "",
        expiration_date: selectedItem.expiration_date
          ? selectedItem.expiration_date.split("T")[0]
          : "",
        description: selectedItem.description || "",
        charity_id: "",
        image_file: null,
      });
    }
  }, [selectedItem, showDirectDonation]);

  // Load charities
  useEffect(() => {
    async function fetchCharities() {
      try {
        const res = await axios.get(`${API}/charities`);
        setCharities(res.data);
      } catch (err) {
        console.error("Failed to fetch charities:", err);
      }
    }
    fetchCharities();
  }, []);

  return (
    <div className="p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-[#6b4b2b]">Bakery Inventory</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-white/80 rounded-full px-2 py-1 ring-1 ring-black/5 shadow-sm">
            {[
              { key: "all", label: "All", tone: "bg-white" },
              {
                key: "fresh",
                label: `Fresh (${statusCounts.fresh})`,
                tone: "bg-green-100",
              },
              {
                key: "soon",
                label: `Soon (${statusCounts.soon})`,
                tone: "bg-amber-100",
              },
              {
                key: "expired",
                label: `Expired (${statusCounts.expired})`,
                tone: "bg-red-100",
              },
            ].map(({ key, label, tone }) => {
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={
                    "text-xs sm:text-sm rounded-full px-3 py-1 transition " +
                    (active
                      ? "text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow"
                      : `text-[#6b4b2b] ${tone} hover:brightness-95`)
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Name filter */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by product name…"
              className="w-[220px] sm:w-[260px] rounded-full bg-white/90 ring-1 ring-black/10 px-4 py-2 pr-9 shadow-sm outline-none focus:ring-2 focus:ring-[#E49A52]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>
           {canModify && (
          <button onClick={() => setShowForm(true)} className={pillSolid}>
            + Add Product
          </button>
           )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm text-[#6b4b2b]">
          Selected: <strong>{selectedCount}</strong>
        </span>
        <button
          onClick={selectExpiredAll}
          className={pillOutline}
          title="Select all expired items"
        >
          Select Expired
        </button>
        {canModify && (
        <button
          onClick={deleteSelected}
          disabled={!selectedCount}
          className={`${pillSolid} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Delete Selected
        </button>
        )}
        {selectedCount > 0 && (
          <button onClick={clearSelection} className={pillOutline}>
            Clear Selection
          </button>
        )}
      </div>

      {/* Verification Modal*/}
      {employees.length > 0 && !verified && (
        <div className="fixed inset-0 z-50 flex items-start mt-[20vh] justify-center bg-transparent bg-opacity-40">
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
                  Enter Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl shadow ring-1 ring-black/5 bg-white/80 backdrop-blur-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#EADBC8] text-left font-semibold text-[#4A2F17]">
              <th className="p-3 w-10">
                {/* Master checkbox */}
                <input
                  ref={masterRef}
                  type="checkbox"
                  onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                  className="h-4 w-4 accent-[#A97142]"
                  aria-label="Select all on page"
                />
              </th>
              <th className="p-3">Product ID</th>
              <th className="p-3">Product</th>
              <th className="p-3">Image</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Created</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Threshold</th>
              <th className="p-3">Uploaded By</th>
              <th className="p-3">Description</th>
              <th className="p-3">Donation Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length ? (
              filteredInventory.map((item) => {
                const st = statusOf(item);
                const checked = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    data-item-id={item.id}
                    className={`group border-t cursor-pointer transition-colors ${rowTone(
                      st
                    )}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEditing(false);
                      setShowDirectDonation(false);
                    }}
                  >
                    {/* Row checkbox */}
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#A97142]"
                        checked={checked}
                        onChange={() => toggleSelectOne(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    </td>

                    <td className="p-3">
                      <span title="Same name = same ID">
                        {item.product_id ?? item.id ?? "—"}
                      </span>
                    </td>

                    {/* Product name bold */}
                    <td className="p-3 font-semibold text-[#4A2F17]">
                      {item.name}
                    </td>

                    <td className="p-3">
                      {item.image ? (
                        <img
                          src={`${API}/${item.image}`}
                          alt={item.name}
                          className="h-10 w-10 object-cover rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3">{item.creation_date?.slice(0, 10)}</td>
                    <td className="p-3">{item.expiration_date}</td>
                    <td className="p-3">{item.threshold}</td>
                    <td className="p-3">{item.uploaded || "System"}</td>
                    <td className="p-3">{item.description}</td>

                    {/* Donation Status */}
                    <td className="p-3 bg-[#FFF6EC] transition-colors group-hover:bg-transparent">
                      <DonationStatus status={item.status} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-10 text-gray-500 text-center" colSpan={11}>
                  {query || statusFilter !== "all"
                    ? "No products match your filters."
                    : "No items found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <div className="mx-auto bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
            <div className={sectionHeader}>
              <h2 className="text-xl font-semibold text-[#6b4b2b]">
                Add Product
              </h2>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                  <label htmlFor="prod_name" className={labelTone}>
                    Name
                  </label>
                  <input
                    id="prod_name"
                    className={inputTone}
                    placeholder="e.g., Garlic Bread"
                    value={form.item_name}
                    onChange={(e) =>
                      setForm({ ...form, item_name: e.target.value })
                    }
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Product ID: <code>{form.product_id ?? "—"}</code>
                  </p>
                </div>

                <div>
                  <label htmlFor="prod_image" className={labelTone}>
                    Picture
                  </label>
                  <input
                    id="prod_image"
                    type="file"
                    accept="image/*"
                    className={inputTone}
                    onChange={(e) =>
                      setForm({ ...form, image_file: e.target.files[0] })
                    }
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prod_created" className={labelTone}>
                      Creation Date
                    </label>
                    <input
                      id="prod_created"
                      type="date"
                      className={inputTone}
                      value={form.creation_date}
                      onChange={(e) =>
                        setForm({ ...form, creation_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_threshold" className={labelTone}>
                      Threshold (days)
                    </label>
                    <input
                      id="prod_threshold"
                      type="number"
                      className={inputTone}
                      value={form.threshold}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          threshold: parseInt(e.target.value || 0, 10),
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_exp" className={labelTone}>
                      Expiration Date
                    </label>
                    <input
                      id="prod_exp"
                      type="date"
                      className={inputTone}
                      value={form.expiration_date}
                      onChange={(e) =>
                        setForm({ ...form, expiration_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_qty" className={labelTone}>
                      Quantity
                    </label>
                    <input
                      id="prod_qty"
                      type="number"
                      className={inputTone}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quantity: parseInt(e.target.value || 0, 10),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="prod_desc" className={labelTone}>
                    Description
                  </label>
                  <textarea
                    id="prod_desc"
                    className={`${inputTone} min-h-[90px]`}
                    placeholder="Add a short description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                 <div>
                  <label htmlFor="prod_uploader" className={labelTone}>
                    Uploaded By
                  </label>
                  <input
                    id="prod_uploader"
                    type="text"
                    className={inputTone}
                    value={employeeName}
                    disabled
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className={pillOutline}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={pillSolid}>
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Overlay>
      )}

      {/* Details / Edit */}
      <SlideOver
        open={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
        }}
        width={620}
      >
        {selectedItem && !isEditing && !showDirectDonation && (
          <>
            <div className={sectionHeader}>
              <h3 className="text-lg font-semibold text-[#6b4b2b]">
                Product Details
              </h3>
            </div>

            <div className="p-5 space-y-2 text-sm overflow-auto">
              <p>
                <strong className="text-[#6b4b2b]">Product ID:</strong>{" "}
                {selectedItem.product_id ?? selectedItem.id ?? "—"}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Name:</strong>{" "}
                {selectedItem.name}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Quantity:</strong>{" "}
                {selectedItem.quantity}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Threshold:</strong>{" "}
                {selectedItem.threshold} day(s)
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Creation Date:</strong>{" "}
                {selectedItem.creation_date}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Expiration Date:</strong>{" "}
                {selectedItem.expiration_date}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Uploaded By:</strong>{" "}
                {selectedItem.uploaded || "System"}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Description:</strong>{" "}
                {selectedItem.description}
              </p>

              {selectedItem.image && (
                <img
                  src={`${API}/${selectedItem.image}`}
                  alt="Product"
                  className="w-full object-cover rounded-lg shadow-sm"
                />
              )}
            </div>

            <div className="mt-auto p-5 flex flex-wrap gap-2 justify-end border-t bg-white">
              {canModify && (
                <>
                  <button onClick={() => handleDelete(selectedItem.id)} className={pillSolid}>
                    Delete
                  </button>
                  <button onClick={() => setIsEditing(true)} className={pillSolid}>
                    Edit
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setShowDirectDonation(false);
                }}
                className={pillOutline}
              >
                Close
              </button>
            </div>
          </>
        )}

        {selectedItem && isEditing && (
          <form onSubmit={handleUpdate} className="h-full flex flex-col">
            <div className={sectionHeader}>
              <h3 className="text-lg font-semibold text-[#6b4b2b]">
                Edit Product
              </h3>
            </div>
            <div className="p-5 space-y-3 overflow-auto">
              <div className="text-xs text-gray-500">
                Product ID:{" "}
                <code>{selectedItem.product_id ?? selectedItem.id ?? "—"}</code>
              </div>

              <input
                className={inputTone}
                value={selectedItem.name}
                onChange={(e) =>
                  setSelectedItem({ ...selectedItem, name: e.target.value })
                }
                required
              />
              <input
                type="file"
                accept="image/*"
                className={inputTone}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    image_file: e.target.files[0],
                  })
                }
              />
              <input
                type="number"
                className={inputTone}
                value={selectedItem.quantity}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    quantity: parseInt(e.target.value || 0, 10),
                  })
                }
                required
              />
              <input
                type="number"
                className={inputTone}
                value={selectedItem.threshold}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    threshold: parseInt(e.target.value || 0, 10),
                  })
                }
                required
              />
              <div>
                <label htmlFor="prod_uploader" className={labelTone}>
                </label>
                <input
                  id="prod_uploader"
                  type="text"
                  className={inputTone}
                  value={employeeName}
                  disabled
                />
              </div>
              <input
                type="date"
                className={inputTone}
                value={selectedItem.creation_date}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    creation_date: e.target.value,
                  })
                }
                required
              />
              <input
                type="date"
                className={inputTone}
                value={selectedItem.expiration_date}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    expiration_date: e.target.value,
                  })
                }
                required
              />
              <textarea
                className={`${inputTone} min-h-[90px]`}
                value={selectedItem.description || ""}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="mt-auto p-5 flex justify-end gap-2 border-t bg-white">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={pillOutline}
              >
                Cancel
              </button>
              <button type="submit" className={pillSolid}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}