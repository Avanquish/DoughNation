import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helpers
const statusOrder = [
  "preparing",
  "ready_for_pickup",
  "in_transit",
  "received",
  "complete",
];

const nice = (s = "") =>
  s.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((d - t) / (1000 * 60 * 60 * 24));
};

const statusColor = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "pending":
      return "bg-[#E7F1FF] text-[#2457A3] border-[#cfe2ff]";
    case "preparing":
      return "bg-[#E7F1FF] text-[#2457A3] border-[#cfe2ff]";
    case "ready_for_pickup":
      return "bg-[#FFF6E6] text-[#8a5a25] border-[#ffe7bf]";
    case "in_transit":
      return "bg-[#E9F7FF] text-[#1c6b80] border-[#cdeef9]";
    case "received":
      return "bg-[#E9F9EF] text-[#2b7a3f] border-[#c7ecd5]";
    case "complete":
    case "completed":
      return "bg-[#e9ffe9] text-[#1c7c1c] border-[#c7f3c7]";
    case "cancelled":
    case "canceled":
    case "declined":
    case "expired":
    case "failed":
      return "bg-[#FFE9E9] text-[#8a1f1f] border-[#ffd0d0]";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

// Generic resolver
const getRequesterName = (d) =>
  d?.requester_name ||
  d?.requested_by_name ||
  d?.requested_by ||
  d?.charity_name ||
  d?.charity?.name ||
  d?.charity ||
  "Unknown Charity";

// ---- Bucket + priority helpers ----
const isComplete = (d) => {
  const s = (d.tracking_status || d.status || "").toLowerCase();
  return s === "complete" || s === "completed";
};


// NEW: split into 4 buckets — pending, preparing (active flow), complete
const bucketize4 = (list = []) => {
  const pending = [];
  const preparing = [];
  const complete = [];
  list.forEach((d) => {
    const raw = (d.tracking_status || d.status || "").toLowerCase();

    if (isComplete(d)) {
      complete.push(d);
      return;
    }
    if (raw === "pending") {
      pending.push(d);
      return;
    }
    // Active flow (preparing / ready_for_pickup / in_transit / received / unknown non-final)
    preparing.push(d);
  });
  return { pending, preparing, complete, };
};

const prioritySort = (list = []) => {
  const score = (d) => {
    const s = (d.tracking_status || d.status || "").toLowerCase();
    const isDone = s === "complete" || s === "completed";
    const expiry = daysUntil(d.expiration_date);
    const expScore = Number.isFinite(expiry) ? expiry : Number.POSITIVE_INFINITY;
    const raw = (d.tracking_status || d.status || "pending").toLowerCase();
    const normalized = raw === "pending" ? "preparing" : raw;
    const idx = statusOrder.indexOf(normalized);
    const stageScore = idx >= 0 ? idx : statusOrder.length;
    return { isDone, expScore, stageScore };
  };
  return [...list].sort((a, b) => {
    const A = score(a), B = score(b);
    if (A.isDone !== B.isDone) return A.isDone ? 1 : -1;   // non-complete first
    if (A.expScore !== B.expScore) return A.expScore - B.expScore; // sooner expiry first
    return A.stageScore - B.stageScore; // earlier stage first
  });
};
// -----------------------------------

const BDonationStatus = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [verified, setVerified] = useState(false); // Access control 
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [employees, setEmployees] = useState([]);
  const canModify = ["Manager", "Full Time Staff", "Manager/Owner"].includes(employeeRole);

  const [acceptedNorm, setAcceptedNorm] = useState([]);
  const [pendingNorm, setPendingNorm] = useState([]);
  const [mapped, setMapped] = useState([]);

  // Set "Bakery Status" tab on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== "bakerystatus") {
      url.searchParams.set("tab", "bakerystatus");
      window.history.replaceState({}, "", url.toString());
    }
    sessionStorage.setItem("activeTab", "bakerystatus");
  }, []);

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

  // Make status sort stable (map "pending" to earliest step)
  const sortByStatus = (donations) =>
    donations.slice().sort((a, b) => {
      const norm = (s) => {
        const x = (s || "pending").toLowerCase();
        return x === "pending" ? "preparing" : x;
        };
      return (
        statusOrder.indexOf(norm(a.tracking_status || a.status)) -
        statusOrder.indexOf(norm(b.tracking_status || b.status))
      );
    });

  const handleUpdateTracking = async (
    donationId,
    currentStatus,
    isDirect = false
  ) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const nextStatusMap = {
      preparing: "ready_for_pickup",
      ready_for_pickup: "in_transit",
      in_transit: "received",
      received: "completed",
    };
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    const endpoint = isDirect
      ? `${API}/direct/tracking/${donationId}`
      : `${API}/donation/tracking/${donationId}`;

    try {
      const body = isDirect
        ? { btracking_status: nextStatus }
        : { tracking_status: nextStatus };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (isDirect) {
          setDirectDonations((prev) =>
            prev.map((d) =>
              d.id === donationId ? { ...d, tracking_status: nextStatus } : d
            )
          );
        } else {
          setReceivedDonations((prev) =>
            prev.map((d) =>
              d.id === donationId ? { ...d, tracking_status: nextStatus } : d
            )
          );
        }
        if (selectedDonation && selectedDonation.id === donationId) {
          setSelectedDonation({
            ...selectedDonation,
            tracking_status: nextStatus,
          });
        }
      }
    } catch (err) {
      console.error("Failed to update tracking status:", err);
    }
  };

  // Fetch accepted + pending (merge) for Requested; Direct separately
  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem("token");

    if (currentUser.role === "charity" || currentUser.role === "bakery") {
      const url =
        currentUser.role === "charity"
          ? `${API}/donation/received`
          : `${API}/donation/requests`;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          const accepted = (data || []).filter((d) => d.status === "accepted");
          const pending = (data || []).filter((d) => d.status === "pending");

          setAcceptedNorm(
            accepted.map((d) => ({
              ...d,
              tracking_status: (d.tracking_status || d.status || "").toLowerCase(),
            }))
          );
          setPendingNorm(
            pending.map((d) => ({
              ...d,
              tracking_status: "pending",
            }))
          );
        })
        .catch((err) =>
          console.error("Failed to fetch requests/received:", err)
        );
    }

    if (currentUser.role === "bakery") {
      (async () => {
        try {
          const resp = await fetch(`${API}/direct/bakery`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await resp.json();
          setMapped(
            (data || []).map((d) => ({
              ...d,
              tracking_status:
                (d.btracking_status || d.tracking_status || d.status || "pending").toLowerCase(),
            }))
          );
        } catch (e) {
          console.error("Failed to fetch direct donations:", e);
        }
      })();
    }
  }, [currentUser]);

  // Highlight helper
  useEffect(() => {
    const handler = () => {
      const id = localStorage.getItem("highlight_received_donation");
      if (id) {
        setHighlightedId(Number(id));
        const el = document.getElementById(`received-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedId(null), 3000);
        localStorage.removeItem("highlight_received_donation");
      }
    };
    window.addEventListener("highlight_received_donation", handler);
    return () =>
      window.removeEventListener("highlight_received_donation", handler);
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${API}/employees`, opts);
      setEmployees(res.data || []);
    } catch (e) {
      console.error("Failed to fetch employees:", e);
    }
  };
    
      useEffect(() => {
        fetchEmployees();
      }, []);
  
   // Fetch status if verified.
      useEffect(() => {
        if (verified) setReceivedDonations([...acceptedNorm, ...pendingNorm]); setDirectDonations(mapped);
      }, [verified]);

   // Employee verification.
    const handleVerify = () => {
    const found = employees.find(
      (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
    );

    if (found) {
      setVerified(true);
      setEmployeeRole(found.role || "");
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


  // Section shell
  const Section = ({ title, count, children }) => (
    <div
      className="
        rounded-3xl border border-[#eadfce]
        bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
        shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6 mb-8
      "
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#4A2F17]">
          {title}
        </h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-white/80 border-[#f2e3cf] text-[#6b4b2b]">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </div>
      {children}
    </div>
  );

  // Card
  const Card = ({ d, onClick }) => {
    const left = daysUntil(d.expiration_date);
    const showExpiry = Number.isFinite(left) && left >= 0;
    const displayName = getRequesterName(d);
    const avatar = d?.charity_profile_picture;

    return (
      <div
        id={`received-${d.donation_id || d.id}`}
        onClick={onClick}
        className={`group rounded-2xl border border-[#f2e3cf] bg-white/70
                    shadow-[0_2px_10px_rgba(93,64,28,.05)]
                    overflow-hidden transition-all duration-300 cursor-pointer
                    hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)]
                    hover:ring-1 hover:ring-[#E49A52]/35
                    ${highlightedId === (d.donation_id || d.id) ? "ring-2 ring-[#E49A52]" : ""}`}
      >
        <div className="relative h-40 overflow-hidden">
          {d.image ? (
            <img
              src={`${API}/${d.image}`}
              alt={d.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
              No Image
            </div>
          )}
          {showExpiry && (
            <div className="absolute top-3 right-3 text-[11px] font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#fff8e6] border-[#ffe7bf] text-[#8a5a25]">
              Expires in {left} {left === 1 ? "day" : "days"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-lg font-semibold text-[#3b2a18]">{d.name}</h4>
            <span
              className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusColor(
                d.tracking_status || d.status
              )}`}
            >
              {nice((d.tracking_status || d.status || "").toLowerCase())}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFEFD9] border border-[#f3ddc0] text-[#6b4b2b]">
              Qty: {d.quantity}
            </span>
            {d.threshold != null && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                Threshold: {d.threshold}
              </span>
            )}
          </div>

<div className="mt-4">
  {d.status === "pending" ? (
    <>
      <p className="text-[12px] font-semibold text-[#7b5836] mb-1">
        Requested By:
      </p>
      {Array.isArray(d.requested_by) && d.requested_by.length > 0 ? (
        <div className="space-y-2">
          {d.requested_by.map((req, i) => (
            <div key={i} className="flex items-center gap-2">
              {req.profile_picture ? (
                <img
                  src={`${API}/${req.profile_picture}`}
                  alt={req.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 grid place-items-center text-gray-600">
                  ?
                </div>
              )}
              <span className="text-sm font-medium text-[#4A2F17]">
                {req.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-sm text-gray-500">No requests yet</span>
      )}
    </>
  ) : (
    <>
      <p className="text-[12px] font-semibold text-[#7b5836] mb-1">
        Donation For:
      </p>
      <div className="flex items-center gap-2">
        {d.charity_profile_picture ? (
          <img
            src={`${API}/${d.charity_profile_picture}`}
            alt={d.charity_name || "Charity"}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 grid place-items-center text-gray-600">
            ?
          </div>
        )}
        <span className="text-sm font-medium text-[#4A2F17]">
          {d.charity_name || "—"}
        </span>
      </div>
    </>
  )}
</div>

          {d.description && (
            <p className="mt-3 text-sm text-[#7b5836] line-clamp-2">
              {d.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  const ScrollColumn = ({ title, items, emptyText, renderItem }) => (
    <div className="flex flex-col rounded-xl border border-[#f2e3cf] bg-white/60">
      <div className="sticky top-0 z-10 px-4 py-2 border-b border-[#f2e3cf] bg-white/90 rounded-t-xl">
        <p className="text-sm font-semibold text-[#4A2F17]">{title}</p>
      </div>
      <div className="max-h-[520px] overflow-y-auto p-4 space-y-4">
        {items.length ? items.map(renderItem) : (
          <p className="text-sm text-[#7b5836]">{emptyText}</p>
        )}
      </div>
    </div>
  );

const sectionHeader = "border-b border-[#eadfce] bg-[#FFF6E9] px-4 py-2";
const labelTone = "block text-sm font-medium text-[#6b4b2b]";
const inputTone = "w-full border border-[#eadfce] rounded-md p-2 outline-none focus:ring-2 focus:ring-[#E49A52]";
const pillSolid = "bg-[#E49A52] text-white px-4 py-2 rounded-full hover:bg-[#d0833f] transition";


  // Main render
  return (
    <div className="relative mx-auto max-w-[1280px] px-6 py-8">
      {/* Verification Modal, only shows if employees exist */}
      {!verified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-40">
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#4A2F17]">
          Donation Status
        </h2>
      </div>

      {/* ===== Requested Donations: Pending → Preparing → Complete ===== */}
      <Section title="Requested Donations" count={receivedDonations.length}>
        {receivedDonations.length > 0 ? (
          (() => {
            const { pending, preparing, complete } = bucketize4(sortByStatus(receivedDonations));
            return (
              <div className="grid gap-4 md:grid-cols-3">
                <ScrollColumn
                  title={`Pending (${pending.length})`}
                  items={prioritySort(pending)}
                  emptyText="No pending items."
                  renderItem={(d) => (
                    <Card key={`req-p-${d.id}`} d={d} onClick={() => setSelectedDonation(d)} />
                  )}
                />
                <ScrollColumn 
                  title={`Preparing (${preparing.length})`}
                  items={prioritySort(preparing)}
                  emptyText="No preparing items."
                  renderItem={(d) => (
                    <Card key={`req-prep-${d.id}`} d={d} onClick={() => setSelectedDonation(d)} />
                  )}
                />
                <ScrollColumn
                  title={`Complete (${complete.length})`}
                  items={prioritySort(complete)}
                  emptyText="No completed items."
                  renderItem={(d) => (
                    <Card key={`req-c-${d.id}`} d={d} onClick={() => setSelectedDonation(d)} />
                  )}
                />
              </div>
            );
          })()
        ) : (
          <p className="text-[#7b5836]">No donations yet.</p>
        )}
      </Section>

      {/* ===== Direct Donations: Pending → Preparing → Complete ===== */}
      <Section title="Direct Donations" count={directDonations.length}>
        {directDonations.length > 0 ? (
          (() => {
            const { preparing, complete } = bucketize4(sortByStatus(directDonations));
            return (
              <div className="grid gap-4 md:grid-cols-2">
                <ScrollColumn
                  title={`Preparing (${preparing.length})`}
                  items={prioritySort(preparing)}
                  emptyText="No preparing items."
                  renderItem={(d) => (
                    <Card key={`dir-prep-${d.id}`} d={d} onClick={() => setSelectedDonation(d)} />
                  )}
                />
                <ScrollColumn
                  title={`Complete (${complete.length})`}
                  items={prioritySort(complete)}
                  emptyText="No completed items."
                  renderItem={(d) => (
                    <Card key={`dir-c-${d.id}`} d={d} onClick={() => setSelectedDonation(d)} />
                  )}
                />
              </div>
            );
          })()
        ) : (
          <p className="text-[#7b5836]">No direct donations yet.</p>
        )}
      </Section>

      {/* Modal */}
      {selectedDonation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedDonation(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#4A2F17]">
                  Donation Details
                </h3>
                <button
                  className="text-[#4A2F17]/70 hover:text-[#4A2F17] text-2xl leading-none"
                  onClick={() => setSelectedDonation(null)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Image + status pill */}
              {selectedDonation.image && (
                <div className="relative">
                  <img
                    src={`${API}/${selectedDonation.image}`}
                    alt={selectedDonation.name}
                    className="h-56 w-full object-cover rounded-xl"
                  />
                  <span
                    className={`absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded-full border ${statusColor(
                      selectedDonation.tracking_status || selectedDonation.status
                    )}`}
                  >
                    {nice(
                      (selectedDonation.tracking_status ||
                        selectedDonation.status ||
                        ""
                      ).toLowerCase()
                    )}
                  </span>
                </div>
              )}

              {/* Title + details */}
              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-[#3b2a18]">
                    {selectedDonation.name}
                  </h3>
                  {selectedDonation.description && (
                    <p className="text-sm text-[#7b5836] mt-2">
                      {selectedDonation.description}
                    </p>
                  )}
                  <div className="mt-3 text-sm text-[#7b5836] space-y-1">
                    <div>
                      Quantity:{" "}
                      <span className="font-semibold">
                        {selectedDonation.quantity}
                      </span>
                    </div>
                    {selectedDonation.expiration_date && (
                      <div>
                        Expires:{" "}
                        <span className="font-semibold">
                          {new Date(
                            selectedDonation.expiration_date
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stepper */}
              <div className="mt-7 px-3 py-4 rounded-xl bg-white border border-[#f0e3d0]">
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-0 right-0 top-4 h-1 bg-gray-200 rounded" />
                  <div
                    className="absolute left-0 top-4 h-1 bg-green-500 rounded transition-all"
                    style={{
                      width: `${
                        (Math.max(
                          0,
                          statusOrder.indexOf(
                            ((selectedDonation.tracking_status || "pending").toLowerCase() ===
                            "complete"
                              ? "complete"
                              : (selectedDonation.tracking_status || "pending").toLowerCase()) ===
                            "pending"
                              ? "preparing"
                              : (selectedDonation.tracking_status || "pending").toLowerCase()
                          )
                        ) /
                          (statusOrder.length - 1)) *
                        100
                      }%`,
                    }}
                  />
                  {statusOrder.map((status, idx) => {
                    const raw = (selectedDonation.tracking_status || "pending").toLowerCase();
                    const normalized = raw === "pending" ? "preparing" : raw;
                    const currentIndex = statusOrder.indexOf(
                      normalized === "complete" ? "complete" : normalized
                    );
                    const isActive = idx <= currentIndex;
                    const isLast = idx === statusOrder.length - 1;
                    return (
                      <div
                        key={status}
                        className="flex flex-col items-center z-10 w-20"
                      >
                        <div
                          className={`w-9 h-9 rounded-full grid place-items-center text-white font-bold shadow ${
                            isActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          {isLast && (normalized === "complete" || normalized === "completed")
                            ? "✓"
                            : idx + 1}
                        </div>
                        <span
                          className={`mt-2 text-xs text-center ${
                            idx === currentIndex &&
                            normalized !== "complete" &&
                            normalized !== "completed"
                              ? "font-semibold"
                              : ""
                          }`}
                        >
                          {nice(status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              {(selectedDonation.tracking_status === "preparing" ||
                selectedDonation.tracking_status === "ready_for_pickup") &&  canModify &&(
                <button
                  onClick={() =>
                    handleUpdateTracking(
                      selectedDonation.id,
                      selectedDonation.tracking_status,
                      selectedDonation.btracking_status !== undefined
                    )
                  }
                  className="mt-6 w-full rounded-full px-5 py-3 font-semibold text-white
                             bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                             shadow-[0_10px_26px_rgba(201,124,44,.25)]
                             hover:brightness-[1.05]"
                >
                  {selectedDonation.tracking_status === "preparing"
                    ? "Mark as Ready for Pickup"
                    : "Mark as In Transit"}
                </button>
                
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BDonationStatus;