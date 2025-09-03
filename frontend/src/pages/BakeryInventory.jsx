import React, { useEffect, useMemo, useState } from "react";
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
  if (d < 0) return "expired";
  if (d <= (Number(item.threshold) || 0)) return "soon";
  return "fresh";
};
const rowTone = (s) =>
  s === "expired"
    ? "bg-red-300 hover:bg-red-100/70"
    : s === "soon"
    ? "bg-amber-200 hover:bg-amber-100/70"
    : "bg-green-200 hover:bg-green-100/70";

// Unique Product ID generator
const productCode = (name) => {
  const base = (name || "").trim().toUpperCase().replace(/[^A-Z0-9 ]+/g, "");
  const words = base.split(/\s+/).filter(Boolean);
  const prefix =
    (words[0]?.[0] || "P") + (words[1]?.[0] || words[0]?.[1] || "R");

  // Add timestamp + random part
  const unique = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, "0");

  return `${prefix}-${unique}`;
};

// Overlays
function Overlay({ onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);
  const node = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
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
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" onClick={onClose} />
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

export default function BakeryInventory() {
  const [inventory, setInventory] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    item_name: "",
    quantity: 1,
    creation_date: "",
    expiration_date: "",
    description: "",
    image_file: null,
    threshold: 1,
    uploaded: "",
  });

  // Filters
  const [query, setQuery] = useState("");                // name search
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'fresh' | 'soon' | 'expired'

  // Bakery tones
  const labelTone = "block text-sm font-medium text-[#6b4b2b]";
  const inputTone =
    "w-full rounded-md border border-[#f2d4b5] bg-white/95 p-2 outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]";
  const sectionHeader =
    "p-5 sm:p-6 border-b bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]";
  const primaryBtn =
    "px-4 py-2 rounded-md text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow";
  const outlineBtn =
    "px-4 py-2 rounded-md border border-[#f2d4b5] text-[#6b4b2b] bg-white hover:bg-white/80";

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
    fetchInventory();
    fetchEmployees();
  }, []);

  // Status counts (for chips)
  const statusCounts = useMemo(() => {
    const counts = { all: inventory.length, fresh: 0, soon: 0, expired: 0 };
    for (const it of inventory) {
      counts[statusOf(it)]++;
    }
    return counts;
  }, [inventory]);

  // Combined filter (name + status)
  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter((it) => {
      const nameOk = !q || (it.name || "").toLowerCase().includes(q);
      const st = statusOf(it);
      const statusOk = statusFilter === "all" || st === statusFilter;
      return nameOk && statusOk;
    });
  }, [inventory, query, statusFilter]);

  // crud
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", form.item_name);
    fd.append("quantity", form.quantity);
    fd.append("creation_date", form.creation_date);
    fd.append("expiration_date", form.expiration_date);
    fd.append("threshold", form.threshold);
    fd.append("uploaded", form.uploaded);
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
    const ok = await Swal.fire({
      title: "Are you sure?",
      text: "This can't be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
    if (!ok.isConfirmed) return;

    await axios.delete(`${API}/inventory/${id}`, { headers });
    setSelectedItem(null);
    await fetchInventory();
    window.dispatchEvent(new CustomEvent("inventory:changed"));
    Swal.fire({ title: "Deleted!", icon: "success" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const ok = await Swal.fire({
      title: "Save changes?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!ok.isConfirmed) return;

    const fd = new FormData();
    fd.append("name", selectedItem.name);
    fd.append("quantity", selectedItem.quantity);
    fd.append("creation_date", selectedItem.creation_date);
    fd.append("expiration_date", selectedItem.expiration_date);
    fd.append("threshold", selectedItem.threshold);
    fd.append("uploaded", selectedItem.uploaded || "");
    fd.append("description", selectedItem.description || "");
    if (selectedItem.image_file) fd.append("image", selectedItem.image_file);

    await axios.put(`${API}/inventory/${selectedItem.id}`, fd, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });

    Swal.fire({ title: "Updated!", icon: "success" });
    setIsEditing(false);
    setSelectedItem(null);
    await fetchInventory();
    window.dispatchEvent(new CustomEvent("inventory:changed"));
  };

  return (
    <div className="p-6 relative">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">Bakery Inventory</h1>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Status filter chips */}
          <div className="flex items-center gap-2 bg-white/80 rounded-full px-2 py-1 ring-1 ring-black/5 shadow-sm">
            {[
              { key: "all", label: "All", tone: "bg-white" },
              { key: "fresh", label: `Fresh (${statusCounts.fresh})`, tone: "bg-green-100" },
              { key: "soon", label: `Soon (${statusCounts.soon})`, tone: "bg-amber-100" },
              { key: "expired", label: `Expired (${statusCounts.expired})`, tone: "bg-red-100" },
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

          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-4 py-2 shadow-md ring-1 ring-white/60"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl shadow ring-1 ring-black/5 bg-white/80 backdrop-blur-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#FFD8B6] text-left font-semibold text-gray-700">
              <th className="p-3">Product ID</th>
              <th className="p-3">Product</th>
              <th className="p-3">Image</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Created</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Threshold</th>
              <th className="p-3">Uploaded By</th>
              <th className="p-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length ? (
              filteredInventory.map((item) => {
                const st = statusOf(item);
                return (
                  <tr
                    key={item.id}
                    className={`border-t cursor-pointer transition-colors ${rowTone(st)}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEditing(false);
                    }}
                  >
                    <td className="p-3">
                      <span title="Same name = same ID">{productCode(item.name)}</span>
                    </td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">
                      {item.image ? (
                        <img
                          src={`${API}/${item.image}`}
                          alt={item.name}
                          className="h-10 w-10 object-cover rounded"
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
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-10 text-gray-500 text-center" colSpan={9}>
                  {(query || statusFilter !== "all")
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
              <h2 className="text-xl font-semibold text-[#6b4b2b]">Add Product</h2>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                  <label htmlFor="prod_name" className={labelTone}>Name</label>
                  <input
                    id="prod_name"
                    className={inputTone}
                    placeholder="e.g., Garlic Bread"
                    value={form.item_name}
                    onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Product ID: <code>{productCode(form.item_name)}</code>
                  </p>
                </div>

                <div>
                  <label htmlFor="prod_image" className={labelTone}>Picture</label>
                  <input
                    id="prod_image"
                    type="file"
                    accept="image/*"
                    className={inputTone}
                    onChange={(e) => setForm({ ...form, image_file: e.target.files[0] })}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prod_created" className={labelTone}>Creation Date</label>
                    <input
                      id="prod_created"
                      type="date"
                      className={inputTone}
                      value={form.creation_date}
                      onChange={(e) => setForm({ ...form, creation_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_threshold" className={labelTone}>Threshold (days)</label>
                    <input
                      id="prod_threshold"
                      type="number"
                      className={inputTone}
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value || 0) })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_exp" className={labelTone}>Expiration Date</label>
                    <input
                      id="prod_exp"
                      type="date"
                      className={inputTone}
                      value={form.expiration_date}
                      onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_qty" className={labelTone}>Quantity</label>
                    <input
                      id="prod_qty"
                      type="number"
                      className={inputTone}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value || 0) })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="prod_desc" className={labelTone}>Description</label>
                  <textarea
                    id="prod_desc"
                    className={`${inputTone} min-h-[90px]`}
                    placeholder="Add a short description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="prod_uploader" className={labelTone}>Uploaded By</label>
                  <select
                    id="prod_uploader"
                    className={inputTone}
                    value={form.uploaded}
                    onChange={(e) => setForm({ ...form, uploaded: e.target.value })}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className={outlineBtn}>
                    Cancel
                  </button>
                  <button type="submit" className={primaryBtn}>
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Overlay>
      )}

      {/* Details / Edit */}
      <SlideOver open={!!selectedItem} onClose={() => setSelectedItem(null)} width={620}>
        {selectedItem && !isEditing && (
          <>
            {/* Colored header like Add/Edit */}
            <div className={sectionHeader}>
              <h3 className="text-lg font-semibold text-[#6b4b2b]">Product Details</h3>
            </div>

            <div className="p-5 space-y-2 text-sm overflow-auto">
              <p>
                <strong className="text-[#6b4b2b]">Product ID:</strong>{" "}
                {productCode(selectedItem.name)}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Name:</strong> {selectedItem.name}
              </p>
              <p>
                <strong className="text-[#6b4b2b]">Quantity:</strong> {selectedItem.quantity}
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
                  className="w-full h-200 object-cover rounded-lg shadow-sm"
                />
              )}
            </div>

            <div className="mt-auto p-5 flex justify-end gap-2 border-t bg-white">
              <button onClick={() => handleDelete(selectedItem.id)} className="px-4 py-2 rounded-md bg-red-500 text-white">
                Delete
              </button>
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-md bg-green-600 text-white">
                Edit
              </button>
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 rounded-md border text-gray-700">
                Close
              </button>
            </div>
          </>
        )}

        {selectedItem && isEditing && (
          <form onSubmit={handleUpdate} className="h-full flex flex-col">
            <div className={sectionHeader}>
              <h3 className="text-lg font-semibold text-[#6b4b2b]">Edit Product</h3>
            </div>
            <div className="p-5 space-y-3 overflow-auto">
              <div className="text-xs text-gray-500">
                Product ID: <code>{productCode(selectedItem.name)}</code>
              </div>

              <input
                className={inputTone}
                value={selectedItem.name}
                onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                required
              />
              <input
                type="file"
                accept="image/*"
                className={inputTone}
                onChange={(e) => setSelectedItem({ ...selectedItem, image_file: e.target.files[0] })}
              />
              <input
                type="number"
                className={inputTone}
                value={selectedItem.quantity}
                onChange={(e) =>
                  setSelectedItem({ ...selectedItem, quantity: parseInt(e.target.value || 0) })
                }
                required
              />
              <input
                type="number"
                className={inputTone}
                value={selectedItem.threshold}
                onChange={(e) =>
                  setSelectedItem({ ...selectedItem, threshold: parseInt(e.target.value || 0) })
                }
                required
              />
              <select
                className={inputTone}
                value={selectedItem.uploaded || ""}
                onChange={(e) => setSelectedItem({ ...selectedItem, uploaded: e.target.value })}
                required
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
              <input
                type="date"
                className={inputTone}
                value={selectedItem.creation_date}
                onChange={(e) => setSelectedItem({ ...selectedItem, creation_date: e.target.value })}
                required
              />
              <input
                type="date"
                className={inputTone}
                value={selectedItem.expiration_date}
                onChange={(e) => setSelectedItem({ ...selectedItem, expiration_date: e.target.value })}
                required
              />
              <textarea
                className={`${inputTone} min-h-[90px]`}
                value={selectedItem.description || ""}
                onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
              />
            </div>
            <div className="mt-auto p-5 flex justify-end gap-2 border-t bg-white">
              <button type="button" onClick={() => setIsEditing(false)} className={outlineBtn}>
                Cancel
              </button>
              <button type="submit" className={primaryBtn}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}