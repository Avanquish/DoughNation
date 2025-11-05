import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Heart, Clock, AlertTriangle, Package } from "lucide-react";

const API = "http://localhost:8000";

/* ---------- helpers (using server date) ---------- */
const isExpired = (dateStr, serverDate) => {
  if (!dateStr || !serverDate) return false;
  const d = new Date(dateStr);
  const [year, month, day] = serverDate.split('-').map(Number);
  const t = new Date(year, month - 1, day);
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= t;
};

const daysUntil = (dateStr, serverDate) => {
  if (!dateStr || !serverDate) return null;
  const d = new Date(dateStr);
  const [year, month, day] = serverDate.split('-').map(Number);
  const t = new Date(year, month - 1, day);
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - t) / (1000 * 60 * 60 * 24));
};

const statusOf = (donation, serverDate) => {
  const d = daysUntil(donation?.expiration_date, serverDate);
  if (d === null) return "fresh";
  if (d <= 0) return "expired";
  
  const threshold = Number(donation?.threshold);
  
  // Match inventory logic: threshold 0 means check if d <= 1
  if (threshold === 0 && d <= 1) return "soon";
  if (d <= threshold) return "soon";
  
  return "fresh";
};

/* ---------- overlay ---------- */
function Overlay({ onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 pt-16 pb-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

<button
  type="button"
  className="shrink-0 h-7 px-3 rounded-full border border-[#f2d4b5] bg-white hover:bg-[#FFF6E9] transition shadow-sm"
  onClick={() =>
    setForm((f) => {
      const id = parseInt(f.bakery_inventory_id || 0, 10);
      const chosen = inventory.find((x) => Number(x.id) === id);
      if (!chosen) {
        Swal.fire("Pick an item", "Select an inventory item first.", "warning");
        return f;
      }
      const maxQ = Number(chosen.quantity) || 0;
      return { ...f, quantity: maxQ };
    })
  }
  aria-label="Set to max quantity"
  title="Max"
>
  <span className="text-[11px] font-semibold tracking-wide text-[#6b4b2b]">
    MAX
  </span>
</button>;

/* ---------- tiny UI helpers ---------- */
const Pill = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]",
    good: "bg-[#E9F9EF] border border-[#c7ecd5] text-[#2b7a3f]",
    warn: "bg-[#fff8e6] border border-[#ffe7bf] text-[#8a5a25]",
    danger: "bg-[#fff1f0] border border-[#ffdede] text-[#c92a2a]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] text-[11px] font-semibold rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
};
const leftBadge = (d) => {
  if (d === null) return { tone: "good", label: "Fresh" };
  if (d <= 0) return { tone: "danger", label: "Expired" };
  return { tone: d <= 3 ? "warn" : "good", label: `Expires in ${d} days` };
};

const getCurrentUserName = () => {
  const employeeToken = localStorage.getItem("employeeToken");
  const bakeryToken = localStorage.getItem("token");
  const token = employeeToken || bakeryToken;

  if (!token) return "Unknown";

  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    
    if (decoded.type === "employee") {
      // Employee token
      return decoded.employee_name || decoded.name || "Employee";
    } else {
      // Bakery/Charity token
      return decoded.name || "User";
    }
  } catch (err) {
    console.error("Failed to decode token:", err);
    return "Unknown";
  }
};

/* ---------- main component ---------- */
const BakeryDonation = ({ highlightedDonationId, isViewOnly = false }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const highlightedRef = useRef(null);

  // modal + data
  const [showDonate, setShowDonate] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [charities, setCharities] = useState({ recommended: [], rest: [] });
  const [recommendedInventory, setRecommendedInventory] = useState({
    recommended: [],
    rest: [],
  });

  // custom dropdown states
  const [openInv, setOpenInv] = useState(false);
  const [openChar, setOpenChar] = useState(false);
  const [currentServerDate, setCurrentServerDate] = useState(null);

  const [form, setForm] = useState({
    bakery_inventory_id: "",
    name: "",
    quantity: 0,
    threshold: 1,
    creation_date: "",
    expiration_date: "",
    description: "",
    charity_id: "",
    image_file: null,
  });

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
  const interval = setInterval(fetchServerDate, 60 * 60 * 1000); // Refresh every hour
  return () => clearInterval(interval);
}, []);

  /* ---------- data fetch ---------- */
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`, { headers });
      setEmployees(res.data || []);
    } catch {}
  };
  const fetchDonations = async () => {
    try {
      const res = await axios.get(`${API}/donations`, { headers });
      setDonations(res.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };
  const getRecommendedInventory = (items) => {
    const RECOMMENDED_DAYS = 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let rec = items.filter((it) => {
      if (!it.expiration_date) return false;
      const d = new Date(it.expiration_date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      return diff > 0 && diff <= RECOMMENDED_DAYS;
    });
    if (!rec.length && items.length) {
      const nearest = items
        .filter((i) => i.expiration_date)
        .sort(
          (a, b) => new Date(a.expiration_date) - new Date(b.expiration_date)
        );
      if (nearest.length) rec = [nearest[0]];
    }
    const recIds = new Set(rec.map((i) => i.id));
    return { recommended: rec, rest: items.filter((i) => !recIds.has(i.id)) };
  };
  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      const ok = (res.data || []).filter((it) => {
        const s = String(it.status || "").toLowerCase();
        const isExpiredItem = isExpired(it.expiration_date, currentServerDate);
        return (
          s !== "donated" && 
          s !== "requested" && 
          !isExpiredItem  // Filter out expired items
        );
      });
      setInventory(ok);
      setRecommendedInventory(getRecommendedInventory(ok));
    } catch {}
  };
  const fetchCharities = async () => {
    try {
      const res = await axios.get(`${API}/charities/recommended`, { headers });
      setCharities(res.data || { recommended: [], rest: [] });
    } catch {}
  };

  useEffect(() => {
    fetchEmployees();
  }, []);
  useEffect(() => {
    fetchDonations();
  }, []);
  useEffect(() => {
    if (showDonate && currentServerDate) {
      fetchInventory();
      fetchCharities();
    }
  }, [showDonate, currentServerDate]);

  /* ---------- UX niceties ---------- */
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedDonationId, donations]);

  // close dropdowns on Esc while modal is open
  useEffect(() => {
    if (!showDonate) return;
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setOpenInv(false);
        setOpenChar(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [showDonate]);

  /* ---------- inventory pick ---------- */
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
      creation_date: item.creation_date
        ? String(item.creation_date).split("T")[0]
        : "",
      expiration_date: item.expiration_date
        ? String(item.expiration_date).split("T")[0]
        : "",
      description: item.description || "",
    }));
  };

  /* ---------- card chip ---------- */
  const statusChip = (d) => {
    const st = statusOf(d, currentServerDate);
    if (st === "expired") {
      return {
        text: "Expired",
        cls: "bg-[#fff1f0] border-[#ffd6d6] text-[#c92a2a]",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      };
    }
    if (st === "soon") {
      return {
        text:
          daysUntil(d.expiration_date, currentServerDate) === 1
            ? "Expires in 1 day"
            : `Expires in ${daysUntil(d.expiration_date, currentServerDate)} days`,
        cls: "bg-[#fff8e6] border-[#ffe7bf] text-[#8a5a25]",
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }
    return {
      text: "Fresh",
      cls: "bg-[#e9f9ef] border-[#c7ecd5] text-[#2b7a3f]",
      icon: <Package className="w-3.5 h-3.5" />,
    };
  };

  const sortedDonations = [...donations].sort((a, b) => {
    const da = daysUntil(a.expiration_date, currentServerDate);
    const db = daysUntil(b.expiration_date, currentServerDate);
    const ua = da !== null && da <= 2 ? 0 : 1;
    const ub = db !== null && db <= 2 ? 0 : 1;
    if (ua !== ub) return ua - ub;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  /* ---------- UI ---------- */
  return (
    <div className="space-y-2">
      {/* header row */}
      <div className="flex items-center justify-between">
        <h2
          className="text-3xl sm:text-3xl font-extrabold"
          style={{ color: "#6B4B2B" }}
        >For Donations
        </h2>
        {!isViewOnly && (
          <button
            onClick={() => setShowDonate(true)}
            className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-6 py-2.5 font-semibold shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60 hover:-translate-y-0.5 active:scale-95 transition"
          >
            Donate Now!
          </button>
        )}
      </div>

      {/* cards */}
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
        ) : donations.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedDonations.map((d) => {
              const chip = statusChip(d);
              const isHighlighted = d.id === highlightedDonationId;
              return (
                <div
                  key={d.id}
                  ref={isHighlighted ? highlightedRef : null}
                  className={`group rounded-2xl border border-[#f2e3cf] bg-white/70 shadow-[0_2px_10px_rgba(93,64,28,.05)] overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)] hover:ring-1 hover:ring-[#E49A52]/35 ${
                    isHighlighted ? "ring-2 ring-[#E49A52]" : ""
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    {d.image ? (
                      <img
                        src={`${API}/${d.image}`}
                        alt={d.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center bg-[#FFF6E9]">
                        <Heart
                          className="w-6 h-6"
                          style={{ color: "#b88a5a" }}
                        />
                      </div>
                    )}
                    <div
                      className={`absolute top-3 right-3 text-[11px] font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${chip.cls}`}
                    >
                      {chip.icon}
                      {chip.text}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: "#3b2a18" }}
                    >
                      {d.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFEFD9] border border-[#f3ddc0] text-[#6b4b2b]">
                        Qty: {d.quantity ?? "—"}
                      </span>
                      {d.threshold != null && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                          Threshold: {d.threshold}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                        <div className="text-[11px] font-semibold text-[#7b5836]">
                          Created
                        </div>
                        <div className="text-sm text-[#3b2a18]">
                          {d.creation_date
                            ? new Date(d.creation_date).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                        <div className="text-[11px] font-semibold text-[#7b5836]">
                          Expires
                        </div>
                        <div className="text-sm text-[#3b2a18]">
                          {d.expiration_date
                            ? new Date(d.expiration_date).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {d.description ? (
                      <p className="mt-3 text-sm text-[#7b5836] leading-relaxed">
                        {d.description}
                      </p>
                    ) : null}
                    {/* === end restored block === */}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid place-items-center h-48 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
            <p className="text-sm" style={{ color: "#7b5836" }}>
              No donations found.
            </p>
          </div>
        )}
      </div>

      {/* modal */}
      {showDonate && (
        <Overlay
          onClose={() => {
            setOpenInv(false);
            setOpenChar(false);
            setShowDonate(false);
          }}
        >
          <div className="relative w-full max-w-4xl rounded-[2rem] overflow-visible shadow-[0_24px_80px_rgba(191,115,39,.25)] ring-1 ring-[#E49A52]/30 bg-gradient-to-br from-[#FFF9F1] via-white to-[#FFF1E3]">
            {/* header */}
            <div className="sticky top-0 z-10 p-4 sm:p-5 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199] border-b border-[#eadfce] rounded-t-[2rem]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-[#6b4b2b]">
                  Create Donation
                </h3>
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/70 border border-white/60 text-[#6b4b2b] shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#E49A52]" />
                  Prioritize near-expiry stock & under-served charities.
                </div>
              </div>
            </div>

            {/* body */}
            <form
              id="donationForm"
              className="p-4 sm:p-6 grid grid-cols-12 gap-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!form.bakery_inventory_id) {
                  Swal.fire(
                    "Missing item",
                    "Please choose an inventory item.",
                    "error"
                  );
                  return;
                }
                const chosen = inventory.find(
                  (x) => Number(x.id) === parseInt(form.bakery_inventory_id, 10)
                );
                if (chosen && isExpired(chosen.expiration_date, currentServerDate)) {
                  Swal.fire(
                    "Not allowed",
                    "Expired products cannot be donated.",
                    "error"
                  );
                  return;
                }
                try {
                  const fd = new FormData();
                  fd.append(
                    "bakery_inventory_id",
                    parseInt(form.bakery_inventory_id, 10)
                  );
                  fd.append("name", form.name);
                  fd.append("quantity", form.quantity);
                  fd.append("threshold", form.threshold);
                  fd.append("creation_date", form.creation_date);
                  if (form.expiration_date)
                    fd.append("expiration_date", form.expiration_date);
                  fd.append("description", form.description || "");
                  fd.append("charity_id", parseInt(form.charity_id, 10));
                  if (form.image_file) fd.append("image", form.image_file);

                  const donatedBy = getCurrentUserName();
                  fd.append("donated_by", donatedBy);

                  await axios.post(`${API}/direct`, fd, {
                    headers: {
                      ...headers,
                      "Content-Type": "multipart/form-data",
                    },
                  });

                  Swal.fire("Success", "Donation recorded!", "success");
                  setShowDonate(false);
                  setForm({
                    bakery_inventory_id: "",
                    name: "",
                    quantity: 0,
                    threshold: 1,
                    creation_date: "",
                    expiration_date: "",
                    description: "",
                    charity_id: "",
                    image_file: null,
                  });
                  fetchDonations();
                } catch (err) {
                  Swal.fire("Error", "Could not save donation.", "error");
                }
              }}
            >
              {/* LEFT column */}
              <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-5">
                {/* Inventory */}
                <div className="col-span-12">
                  <label className="block text-sm font-semibold text-[#6b4b2b] mb-1.5">
                    Inventory Item
                  </label>
                  <div
                    className="relative"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget))
                        setOpenInv(false);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenChar(false);
                        setOpenInv((v) => !v);
                      }}
                      className="w-full text-left rounded-2xl border border-[#f2d4b5] bg-white/95 px-4 py-3.5 pr-10 text-[15px] outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52] transition flex items-center justify-between"
                    >
                      <span className="truncate text-[#3b2a18]">
                        {(() => {
                          const chosen = inventory.find(
                            (x) => Number(x.id) === +form.bakery_inventory_id
                          );
                          if (!chosen) return "Select item to donate";
                          const left = daysUntil(chosen.expiration_date, currentServerDate);
                          const chip = leftBadge(left);
                          return (
                            <span className="inline-flex items-center gap-2">
                              <span className="truncate">
                                {chosen.name}{" "}
                                <span className="text-[#7b5836]">
                                  (Qty: {chosen.quantity})
                                </span>
                              </span>
                              <Pill tone={chip.tone}>{chip.label}</Pill>
                            </span>
                          );
                        })()}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`transition ${openInv ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M7 10l5 5 5-5"
                          stroke="#BF7327"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {openInv && (
                      <div
                        tabIndex={-1}
                        className="absolute left-0 right-0 z-20 mt-2 w-full rounded-2xl border border-[#f2e3cf] bg-white shadow-2xl overflow-hidden"
                      >
                        <div className="max-h-64 overflow-auto divide-y divide-[#f6ebdc]">
                          {recommendedInventory.recommended.length > 0 && (
                            <div className="py-2">
                              <div className="px-4 pb-1 text-[11px] font-semibold text-[#8a5a25] uppercase tracking-wide">
                                Recommended — Soon to Expire
                              </div>
                              {recommendedInventory.recommended
                                .slice()
                                .sort(
                                  (a, b) =>
                                    (daysUntil(a.expiration_date, currentServerDate) ?? Infinity) -
                                    (daysUntil(b.expiration_date, currentServerDate) ?? Infinity)
                                )
                                .map((it) => {
                                  const left = daysUntil(it.expiration_date, currentServerDate);
                                  const chip = leftBadge(left);
                                  return (
                                    <button
                                      key={it.id}
                                      type="button"
                                      onClick={() => {
                                        onPickInventory(String(it.id));
                                        setOpenInv(false);
                                      }}
                                      className="w-full px-4 py-2.5 hover:bg-[#FFF6E9] focus:bg-[#FFF6E9] flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-6 w-6 rounded-full overflow-hidden bg-[#EDE7DB] grid place-items-center">
                                          <img
                                            src={it.image ? `${API}/${it.image}` : "/placeholder.png"}
                                            alt={it.name}
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                        <span className="truncate">
                                          {it.name}
                                        </span>
                                        <span className="text-[#7b5836] text-sm">
                                          · Qty {it.quantity}
                                        </span>
                                      </div>
                                      <Pill tone={chip.tone}>{chip.label}</Pill>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                          {recommendedInventory.rest.length > 0 && (
                            <div className="py-2">
                              <div className="px-4 pb-1 text-[11px] font-semibold text-[#8a5a25] uppercase tracking-wide">
                                Other Items
                              </div>
                              {recommendedInventory.rest
                                .slice()
                                .sort((a, b) => {
                                  const da =
                                    daysUntil(a.expiration_date, currentServerDate) ?? Infinity;
                                  const db =
                                    daysUntil(b.expiration_date, currentServerDate) ?? Infinity;
                                  return da - db;
                                })
                                .map((it) => {
                                  const left = daysUntil(it.expiration_date, currentServerDate);
                                  const chip = leftBadge(left);
                                  return (
                                    <button
                                      key={it.id}
                                      type="button"
                                      onClick={() => {
                                        onPickInventory(String(it.id));
                                        setOpenInv(false);
                                      }}
                                      className="w-full px-4 py-2.5 hover:bg-[#FFF6E9] focus:bg-[#FFF6E9] flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-6 w-6 rounded-full overflow-hidden bg-[#EDE7DB] grid place-items-center">
                                          <img
                                            src={it.image ? `${API}/${it.image}` : "/placeholder.png"}
                                            alt={it.name}
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                        <span className="truncate">
                                          {it.name}
                                        </span>
                                        <span className="text-[#7b5836] text-sm">
                                          · Qty {it.quantity}
                                        </span>
                                      </div>
                                      <Pill tone={chip.tone}>{chip.label}</Pill>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#7b5836]">
                    Tip: Near-expiry items are bubbled to the top.
                  </p>
                </div>

                {/* Row: Name + Quantity */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-semibold text-[#6b4b2b] mb-1.5">
                    Name
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-[#f2d4b5] bg-white/95 px-4 py-3.5 text-[15px] outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52] transition"
                      placeholder="e.g., Cookies"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M4 7h16M4 12h10M4 17h7"
                          stroke="#BF7327"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-semibold text-[#6b4b2b] mb-1.5">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="shrink-0 h-12 w-12 grid place-items-center rounded-2xl border border-[#f2d4b5] bg-white hover:bg-[#FFF6E9] transition shadow-sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          quantity: Math.max(0, Number(f.quantity) - 1),
                        }))
                      }
                      aria-label="Decrease quantity"
                    >
                      <span className="text-xl leading-none text-[#6b4b2b]">
                        −
                      </span>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={(() => {
                        const chosen = inventory.find(
                          (x) => Number(x.id) === +form.bakery_inventory_id
                        );
                        return chosen ? Number(chosen.quantity) : 0;
                      })()}
                      className="w-full rounded-2xl border border-[#f2d4b5] bg-white/95 px-4 py-3.5 text-center text-[15px] outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52] transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.replace(
                          /^0+(?=\d)/,
                          ""
                        );
                      }}
                      onChange={(e) =>
                        setForm((f) => {
                          const chosen = inventory.find(
                            (x) => Number(x.id) === +f.bakery_inventory_id
                          );
                          const maxQ = chosen ? Number(chosen.quantity) : 0;
                          const s =
                            e.target.value === "" ? "0" : e.target.value;
                          const n = parseInt(s, 10);
                          const val = Number.isFinite(n) ? n : 0;
                          return {
                            ...f,
                            quantity: Math.min(maxQ, Math.max(0, val)),
                          };
                        })
                      }
                      value={Number(form.quantity)}
                      required
                      aria-label="Quantity"
                    />

                    <button
                      type="button"
                      className="shrink-0 h-12 w-12 grid place-items-center rounded-2xl border border-[#f2d4b5] bg-white hover:bg-[#FFF6E9] transition shadow-sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          quantity: (() => {
                            const chosen = inventory.find(
                              (x) => Number(x.id) === +f.bakery_inventory_id
                            );
                            const maxQ = chosen
                              ? Number(chosen.quantity)
                              : Infinity;
                            return Math.min(maxQ, Number(f.quantity) + 1);
                          })(),
                        }))
                      }
                      aria-label="Increase quantity"
                    >
                      <span className="text-xl leading-none text-[#6b4b2b]">
                        ＋
                      </span>
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-[11px] text-[#7b5836]">
                      Use the stepper to quickly match demand.
                    </p>
                    <button
                      type="button"
                      className="shrink-0 h-7 px-3 rounded-full border border-[#f2d4b5] bg-white hover:bg-[#FFF6E9] transition shadow-sm"
                      onClick={() =>
                        setForm((f) => {
                          const id = parseInt(f.bakery_inventory_id || 0, 10);
                          const chosen = inventory.find(
                            (x) => Number(x.id) === id
                          );
                          if (!chosen) {
                            Swal.fire(
                              "Pick an item",
                              "Select an inventory item first.",
                              "warning"
                            );
                            return f;
                          }
                          const maxQ = Number(chosen.quantity) || 0;
                          return { ...f, quantity: maxQ };
                        })
                      }
                      aria-label="Set to max quantity"
                      title="Max"
                    >
                      <span className="text-[11px] font-semibold tracking-wide text-[#6b4b2b]">
                        MAX
                      </span>
                    </button>
                  </div>
                </div>

                {/* Charity */}
                <div className="col-span-12">
                  <label className="block text-sm font-semibold text-[#6b4b2b] mb-1.5">
                    Charity
                  </label>
                  <div
                    className="relative"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget))
                        setOpenChar(false);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenInv(false);
                        setOpenChar((v) => !v);
                      }}
                      className="w-full text-left rounded-2xl border border-[#f2d4b5] bg-white/95 px-4 py-3.5 pr-10 text-[15px] outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52] transition flex items-center justify-between"
                    >
                      <span className="truncate text-[#3b2a18]">
                        {(() => {
                          const all = [
                            ...(charities.recommended || []),
                            ...(charities.rest || []),
                          ];
                          const c = all.find(
                            (x) => Number(x.id) === +form.charity_id
                          );
                          if (!c) return "Select Charity";
                          return (
                            <span className="inline-flex items-center gap-2">
                              <span className="truncate">{c.name}</span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                                {c.transaction_count} donations
                              </span>
                            </span>
                          );
                        })()}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`transition ${openChar ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M7 10l5 5 5-5"
                          stroke="#BF7327"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {openChar && (
                      <div
                        tabIndex={-1}
                        className="absolute left-0 right-0 z-[120] mt-2 w-full rounded-2xl border border-[#f2e3cf] bg-white shadow-2xl overflow-hidden"
                      >
                        <div className="max-h-56 overflow-auto divide-y divide-[#f6ebdc]">
                          {charities.recommended?.length > 0 && (
                            <div className="py-2">
                              <div className="px-4 pb-1 text-[11px] font-semibold text-[#8a5a25] uppercase tracking-wide">
                                Recommended (Low Donations)
                              </div>
                              {charities.recommended.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({
                                      ...f,
                                      charity_id: String(c.id),
                                    }));
                                    setOpenChar(false);
                                  }}
                                  className="w-full px-4 py-2.5 hover:bg-[#FFF6E9] focus:bg-[#FFF6E9] flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={c.profile_picture ? `${import.meta.env.VITE_API_URL}/${c.profile_picture}` : "/default-avatar.png"}
                                      alt={c.name}
                                      className="h-6 w-6 rounded-full object-cover border border-gray-200"
                                    />
                                    <span className="truncate">{c.name}</span>
                                  </div>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                                    {c.transaction_count} donations
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {charities.rest?.length > 0 && (
                            <div className="py-2">
                              <div className="px-4 pb-1 text-[11px] font-semibold text-[#8a5a25] uppercase tracking-wide">
                                Other Charities
                              </div>
                              {charities.rest.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({
                                      ...f,
                                      charity_id: String(c.id),
                                    }));
                                    setOpenChar(false);
                                  }}
                                  className="w-full px-4 py-2.5 hover:bg-[#FFF6E9] focus:bg-[#FFF6E9] flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={c.profile_picture ? `${import.meta.env.VITE_API_URL}/${c.profile_picture}` : "/default-avatar.png"}
                                      alt={c.name}
                                      className="h-6 w-6 rounded-full object-cover border border-gray-200"
                                    />
                                    <span className="truncate">{c.name}</span>
                                  </div>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                                    {c.transaction_count} donations
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT column – preview */}
              <div className="col-span-12 lg:col-span-5">
                <div className="h-full rounded-2xl border border-[#f2e3cf] bg-white/70 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#6b4b2b]">
                      Selected Item Preview
                    </h4>
                    {form.bakery_inventory_id ? (
                      <Pill tone="good">Ready to donate</Pill>
                    ) : (
                      <Pill>Pick an item</Pill>
                    )}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-[#7b5836]">
                    {(() => {
                      const chosen = inventory.find(
                        (x) =>
                          Number(x.id) ===
                          parseInt(form.bakery_inventory_id || 0, 10)
                      );
                      if (!chosen)
                        return (
                          <p className="text-[#7b5836]/70">
                            Nothing selected yet.
                          </p>
                        );
                      const leftDays = daysUntil(chosen.expiration_date, currentServerDate);
                      const chip = leftBadge(leftDays);
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                              <div className="text-xs font-semibold">Name</div>
                              <div className="truncate">{chosen.name}</div>
                            </div>
                            <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                              <div className="text-xs font-semibold">
                                Qty Available
                              </div>
                              <div>{chosen.quantity}</div>
                            </div>
                            <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                              <div className="text-xs font-semibold">
                                Created
                              </div>
                              <div>
                                {chosen.creation_date
                                  ? new Date(
                                      chosen.creation_date
                                    ).toLocaleDateString()
                                  : "—"}
                              </div>
                            </div>
                            <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                              <div className="text-xs font-semibold">
                                Expires
                              </div>
                              <div>
                                {chosen.expiration_date
                                  ? new Date(
                                      chosen.expiration_date
                                    ).toLocaleDateString()
                                  : "—"}
                              </div>
                            </div>
                          </div>
                          <div className="pt-1">
                            <Pill tone={chip.tone}>{chip.label}</Pill>
                          </div>

                          {/* ADDED: show inventory image here (direct donation preview) */}
                          {chosen.image && (
                            <div className="mt-3 rounded-xl border border-[#f2e3cf] overflow-hidden">
                              <img
                                src={`${API}/${chosen.image}`}
                                alt={chosen.name}
                                className="w-full h-40 object-cover"
                              />
                            </div>
                          )}

                          {chosen.description && (
                            <p className="mt-2 text-[13px] leading-relaxed">
                              {chosen.description}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </form>

            {/* footer */}
            <div className="sticky bottom-0 z-10 p-3 sm:p-4 bg-white/90 backdrop-blur border-t border-[#eadfce] flex items-center justify-end gap-2 rounded-b-[2rem]">
              <button
                type="button"
                onClick={() => {
                  setOpenInv(false);
                  setOpenChar(false);
                  setShowDonate(false);
                }}
                className="rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-5 py-2 shadow-sm hover:bg-white/90 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="donationForm"
                className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 font-semibold shadow-[0_10px_26px_rgba(201,124,44,.25)] ring-1 ring-white/60 hover:-translate-y-0.5 active:scale-95 transition"
              >
                Donate Now!
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
};

export default BakeryDonation;