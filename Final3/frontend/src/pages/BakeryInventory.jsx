import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

// Helpers
const parseDate = (s) => (s ? new Date(s) : null);

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

// NEW: keep number inputs blank when user clears them
const toIntOrEmpty = (v) => (v === "" ? "" : parseInt(v, 10));

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

  // Get logged-in user's name from token
  const [uploaderName, setUploaderName] = useState("");
  const [serverDate, setServerDate] = useState('');
  const [currentServerDate, setCurrentServerDate] = useState(null); 
  const [templateInfo, setTemplateInfo] = useState(null);

  const [form, setForm] = useState({
    item_name: "",
    quantity: 1,
    creation_date: "", 
    expiration_date: "",
    description: "",
    image_file: null,
    threshold: 0,
    uploaded: "", // Will be set from token
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

  // Get the appropriate token (employee token takes priority if it exists)
  const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch server date on mount
  useEffect(() => {
    const fetchServerDate = async () => {
      try {
        const res = await axios.get(`${API}/server-time`, { headers });
        setCurrentServerDate(res.data.date);
      } catch (err) {
        console.error("Failed to fetch server date:", err);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setCurrentServerDate(`${yyyy}-${mm}-${dd}`);
      }
    };
    
    fetchServerDate();
    const interval = setInterval(fetchServerDate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const daysUntil = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d || !currentServerDate) return null;
    
    const [year, month, day] = currentServerDate.split('-').map(Number);
    const serverToday = new Date(year, month - 1, day);
    serverToday.setHours(0, 0, 0, 0);
    
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - serverToday) / (1000 * 60 * 60 * 24));
  };
  
  const statusOf = (item) => {
    const d = daysUntil(item.expiration_date);
    if (d === null) return "fresh";
    if (d <= 0) return "expired";
    
    const threshold = Number(item.threshold);
    
    if (threshold === 0 && d <= 1) return "soon";
    if (d <= threshold) return "soon";
    
    return "fresh";
  };

  //To fetch server date when form opens
  useEffect(() => {
    if (showForm) {
      axios.get(`${API}/server-time`, { headers })
        .then(res => {
          const date = new Date(res.data.date);
          const formatted = date.toLocaleDateString('en-US');
          setServerDate(formatted);
        })
        .catch(() => setServerDate('Server date'));
    }
  }, [showForm]);

  const fetchProductTemplate = async (productName) => {
    if (!productName.trim()) {
      setTemplateInfo(null);
      // Clear fields when product name is empty
      setForm(prev => ({
        ...prev,
        threshold: 0,
        expiration_date: ""
      }));
      return;
    }
    
    try {
      // Normalize: trim, lowercase, and remove all spaces for flexible matching
      const normalizedName = productName.trim().toLowerCase().replace(/\s+/g, '');
      
      const res = await axios.get(
        `${API}/inventory/template/${encodeURIComponent(normalizedName)}`,
        { headers }
      );
      
      if (res.data.exists) {
        setTemplateInfo(res.data);
        
        // Auto-fill threshold
        setForm(prev => ({
          ...prev,
          threshold: res.data.threshold
        }));
        
        // Auto-calculate expiration date using UTC to avoid timezone shifts
        const serverTimeRes = await axios.get(`${API}/server-time`, { headers });
        const todayStr = serverTimeRes.data.date; 
        
        // Parse as UTC date to avoid timezone issues
        const [year, month, day] = todayStr.split('-').map(Number);
        const todayUTC = new Date(Date.UTC(year, month - 1, day));
        
        // Add shelf life days
        const expirationUTC = new Date(todayUTC);
        expirationUTC.setUTCDate(expirationUTC.getUTCDate() + res.data.shelf_life_days);
        
        // Format as YYYY-MM-DD
        const expYear = expirationUTC.getUTCFullYear();
        const expMonth = String(expirationUTC.getUTCMonth() + 1).padStart(2, '0');
        const expDay = String(expirationUTC.getUTCDate()).padStart(2, '0');
        const expirationStr = `${expYear}-${expMonth}-${expDay}`;
        
        setForm(prev => ({
          ...prev,
          expiration_date: expirationStr
        }));
        
        Swal.fire({
          icon: 'info',
          title: 'Product Already Exists',
          text: `Auto-filled: ${res.data.shelf_life_days} days shelf life, ${res.data.threshold} days threshold`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Clear fields when template doesn't exist
        setTemplateInfo(null);
        setForm(prev => ({
          ...prev,
          threshold: 0,
          expiration_date: ""
        }));
      }
    } catch (err) {
      console.error("Template fetch failed:", err);
      setTemplateInfo(null);
      // Clear fields on error
      setForm(prev => ({
        ...prev,
        threshold: 0,
        expiration_date: ""
      }));
    }
  };

  // Decode token to get user name on mount
  useEffect(() => {
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");
    
    let name = "";
    
    if (employeeToken) {
      // Decode employee JWT token
      try {
        const payload = JSON.parse(atob(employeeToken.split('.')[1]));
        name = payload.employee_name || "";
      } catch (e) {
        console.error("Failed to decode employee token", e);
      }
    } else if (bakeryToken) {
      // Decode bakery owner JWT token
      try {
        const payload = JSON.parse(atob(bakeryToken.split('.')[1]));
        name = payload.name || "";
      } catch (e) {
        console.error("Failed to decode bakery token", e);
      }
    }
    
    setUploaderName(name);
    setForm(prev => ({ ...prev, uploaded: name }));
  }, []);

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

  // Fetch inventory immediately
  useEffect(() => {
    fetchInventory();
  }, []);

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
      threshold: 0,
      uploaded: uploaderName, // Reset to logged-in user's name
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
    fd.append("uploaded", selectedItem.uploaded || "");
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
            {" "}
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
          <button onClick={() => setShowForm(true)} className={pillSolid}>
            + Add Product
          </button>
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
        <button 
          onClick={() => {
            if (!selectedCount) {
              Swal.fire({
                title: "No Items Selected",
                text: "Please select at least one item to delete.",
                icon: "error",
                confirmButtonColor: "#A97142",
              });
              return;
            }
            
            // Filter to get only items uploaded by current user
            const userItems = filteredInventory.filter(
              item => selectedIds.has(item.id) && item.uploaded === uploaderName
            );
            
            // Check if any items belong to other users
            const otherUserItems = filteredInventory.filter(
              item => selectedIds.has(item.id) && item.uploaded !== uploaderName
            );
            
            if (userItems.length === 0) {
              Swal.fire({
                title: "Access Denied",
                text: "None of the selected items were uploaded by you.",
                icon: "error",
                confirmButtonColor: "#A97142",
              });
              return;
            }
            
            // Show warning if some items will be skipped
            if (otherUserItems.length > 0) {
              Swal.fire({
                title: "Partial Deletion",
                text: `Only ${userItems.length} of ${selectedCount} selected items will be deleted. Items uploaded by others will be skipped.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#A97142",
                cancelButtonColor: "#d33",
                confirmButtonText: "Delete My Items",
                cancelButtonText: "Cancel"
              }).then((result) => {
                if (result.isConfirmed) {
                  // Delete only user's items
                  userItems.forEach(item => handleDelete(item.id));
                  clearSelection();
                }
              });
              return;
            }
            
            // All selected items belong to user
            deleteSelected();
          }}
          className={pillSolid}
        >
          Delete Selected
        </button>
        {selectedCount > 0 && (
          <button onClick={clearSelection} className={pillOutline}>
            Clear Selection
          </button>
        )}
      </div>

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
                      <DonationStatus 
                            status={(currentServerDate && statusOf(item) === "expired") ? "unavailable" : item.status} 
                          />
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
                    className={`${inputTone} rounded-2xl`}
                    placeholder="e.g., Pandesal"
                    value={form.item_name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setForm({ ...form, item_name: newName });
                      
                      // Auto-fetch template as user types (debounced check)
                      if (newName.trim().length >= 3) {
                        fetchProductTemplate(newName);
                      } else {
                        setTemplateInfo(null);
                      }
                    }}
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
                    className={`${inputTone} rounded-2xl file:mr-2 file:rounded-full file:border-0 file:bg-[#FFEFD9] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#6b4b2b]`}
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
                      type="text"
                      className={`${inputTone} rounded-2xl bg-gray-100 cursor-not-allowed`}
                      value={serverDate || 'Loading...'}
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label htmlFor="prod_threshold" className={labelTone}>
                      Threshold (days)
                    </label>
                    <input
                      id="prod_threshold"
                      type="number"
                      min="0"
                      className={`${inputTone} rounded-2xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        templateInfo || !form.expiration_date ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      value={form.threshold}
                      onChange={(e) => {
                        const value = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                        
                        // Real-time validation if expiration date is set
                        if (form.expiration_date && value !== "") {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          const expDate = new Date(form.expiration_date);
                          expDate.setHours(0, 0, 0, 0);
                          
                          const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                          const maxThreshold = Math.max(0, daysUntilExpiration - 1);
                          
                          // If value exceeds max threshold, cap it and show error
                          if (value > maxThreshold) {
                            Swal.fire({
                              title: "Threshold Exceeded",
                              text: `Maximum threshold is ${maxThreshold} day${maxThreshold !== 1 ? 's' : ''}. Value has been adjusted automatically.`,
                              icon: "warning",
                              confirmButtonColor: "#A97142",
                              timer: 3000
                            });
                            
                            setForm({
                              ...form,
                              threshold: maxThreshold,
                            });
                            e.target.setCustomValidity('');
                          } else {
                            setForm({
                              ...form,
                              threshold: value,
                            });
                            e.target.setCustomValidity('');
                          }
                        } else {
                          setForm({
                            ...form,
                            threshold: value,
                          });
                        }
                      }}
                      onFocus={(e) => {
                        // Prevent interaction if expiration date not set
                        if (!form.expiration_date) {
                          e.target.blur();
                          Swal.fire({
                            title: "Expiration Date Required",
                            text: "Please select an expiration date first before setting the threshold.",
                            icon: "info",
                            confirmButtonColor: "#A97142",
                            timer: 2500
                          });
                        }
                      }}
                      readOnly={!!templateInfo || !form.expiration_date}
                      disabled={!!templateInfo || !form.expiration_date}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {!form.expiration_date ? (
                        <span className="text-amber-600 font-medium">⚠️ Please select expiration date first</span>
                      ) : (
                        (() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const expDate = new Date(form.expiration_date);
                          expDate.setHours(0, 0, 0, 0);
                          const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                          const maxThreshold = Math.max(0, days - 1);
                          return `Max threshold: ${maxThreshold} day${maxThreshold !== 1 ? 's' : ''} (product expires in ${days} days)`;
                        })()
                      )}
                    </p>
                  </div>
                 <div>
                  <label htmlFor="prod_exp" className={labelTone}>
                    Expiration Date
                  </label>
                  <input
                    id="prod_exp"
                    type="date"
                    min={currentServerDate ? (() => {
                      // Parse server date (format: YYYY-MM-DD)
                      const [year, month, day] = currentServerDate.split('-').map(Number);
                      const serverToday = new Date(year, month - 1, day);
                      
                      // Add 1 day for tomorrow
                      serverToday.setDate(serverToday.getDate() + 1);
                      
                      // Format back to YYYY-MM-DD
                      const yyyy = serverToday.getFullYear();
                      const mm = String(serverToday.getMonth() + 1).padStart(2, '0');
                      const dd = String(serverToday.getDate()).padStart(2, '0');
                      return `${yyyy}-${mm}-${dd}`;
                    })() : ''}
                    className={`${inputTone} rounded-2xl ${
                      templateInfo ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={form.expiration_date}
                    onChange={(e) =>
                      setForm({ ...form, expiration_date: e.target.value })
                    }
                    readOnly={!!templateInfo}
                    disabled={!!templateInfo}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least tomorrow ({currentServerDate ? (() => {
                      const [year, month, day] = currentServerDate.split('-').map(Number);
                      const tomorrow = new Date(year, month - 1, day);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return tomorrow.toLocaleDateString('en-US');
                    })() : ''})
                  </p>
                </div>
                  <div>
                    <label htmlFor="prod_qty" className={labelTone}>
                      Quantity
                    </label>
                    <input
                      id="prod_qty"
                      type="number"
                      className={`${inputTone} rounded-2xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quantity: toIntOrEmpty(e.target.value),
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
                    className={`${inputTone} rounded-2xl min-h-[90px]`}
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
                    className={`${inputTone} rounded-2xl bg-gray-100`}
                    value={form.uploaded}
                    readOnly
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-filled from your login
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setTemplateInfo(null);
                      setForm({
                        item_name: "",
                        quantity: 1,
                        creation_date: "",
                        expiration_date: "",
                        description: "",
                        image_file: null,
                        threshold: 0,
                        uploaded: uploaderName,
                      });
                    }}
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
              <button 
                onClick={() => {
                  if (selectedItem.uploaded !== uploaderName) {
                    Swal.fire({
                      title: "Access Denied",
                      text: `Only ${selectedItem.uploaded || "the uploader"} can delete this item.`,
                      icon: "error",
                      confirmButtonColor: "#A97142",
                    });
                    return;
                  }
                  handleDelete(selectedItem.id);
                }}
                className={pillSolid}
                title={selectedItem.uploaded !== uploaderName ? "Only the uploader can delete this item" : ""}
              >
                Delete
              </button>

              <button 
                onClick={() => {
                  if (selectedItem.uploaded !== uploaderName) {
                    Swal.fire({
                      title: "Access Denied",
                      text: `Only ${selectedItem.uploaded || "the uploader"} can edit this item.`,
                      icon: "error",
                      confirmButtonColor: "#A97142",
                    });
                    return;
                  }
                  setIsEditing(true);
                }}
                className={pillSolid}
                title={selectedItem.uploaded !== uploaderName ? "Only the uploader can edit this item" : ""}
              >
                Edit
              </button>

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
              <h2 className="text-xl font-semibold text-[#6b4b2b]">
                Edit Product
              </h2>
            </div>
            <div className="p-5 space-y-4 overflow-auto">
              <div className="text-xs text-gray-500">
                Product ID:{" "}
                <code>{selectedItem.product_id ?? selectedItem.id ?? "—"}</code>
              </div>

              <div>
                <label className={labelTone} htmlFor="edit_name">
                  Name
                </label>
                <input
                  id="edit_name"
                  className={`${inputTone} rounded-2xl`}
                  value={selectedItem.name}
                  onChange={(e) =>
                    setSelectedItem({ ...selectedItem, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className={labelTone} htmlFor="edit_image">
                  Picture
                </label>
                <input
                  id="edit_image"
                  type="file"
                  accept="image/*"
                  className={`${inputTone} rounded-2xl file:mr-2 file:rounded-full file:border-0 file:bg-[#FFEFD9] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#6b4b2b]`}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      image_file: e.target.files[0],
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to keep the current image.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelTone} htmlFor="edit_qty">
                    Quantity
                  </label>
                  <input
                    id="edit_qty"
                    type="number"
                    className={`${inputTone} rounded-2xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    value={selectedItem.quantity}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        quantity: toIntOrEmpty(e.target.value),
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label className={labelTone} htmlFor="edit_threshold">
                    Threshold (days)
                  </label>
                  <input
                    id="edit_threshold"
                    type="number"
                    className={`${inputTone} rounded-2xl bg-gray-100 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    value={selectedItem.threshold}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        threshold: toIntOrEmpty(e.target.value),
                      })
                    }
                    readOnly
                    disabled
                    required
                  />
                </div>

                <div>
                  <label className={labelTone} htmlFor="edit_created">
                    Creation Date
                  </label>
                  <input
                    id="edit_created"
                    type="date"
                    className={`${inputTone} rounded-2xl bg-gray-100 cursor-not-allowed`}
                    value={selectedItem.creation_date}
                    readOnly
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Creation date cannot be modified
                  </p>
                </div>

                <div>
                  <label className={labelTone} htmlFor="edit_exp">
                    Expiration Date
                  </label>
                  <input
                    id="edit_exp"
                    type="date"
                    className={`${inputTone} rounded-2xl bg-gray-100 cursor-not-allowed`}
                    value={selectedItem.expiration_date}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        expiration_date: e.target.value,
                      })
                    }
                    readOnly
                    disabled
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelTone} htmlFor="edit_uploaded">
                  Uploaded By
                </label>
                <input
                  id="edit_uploaded"
                  type="text"
                  className={`${inputTone} rounded-2xl bg-gray-100 cursor-not-allowed`}
                  value={selectedItem.uploaded || ""}
                  readOnly
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500">
                  Uploader cannot be modified
                </p>
              </div>
              
              <div>
                <label className={labelTone} htmlFor="edit_desc">
                  Description
                </label>
                <textarea
                  id="edit_desc"
                  className={`${inputTone} rounded-2xl min-h-[90px]`}
                  value={selectedItem.description || ""}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            {/* === /CHANGED === */}

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


