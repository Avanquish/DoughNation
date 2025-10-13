// CDonationStatus.jsx
import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

import Feedback from "./Feedback";

/* ---------------- Helpers ---------------- */

const statusOrder = ["preparing","ready_for_pickup","in_transit","received","complete"];

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

const statusTheme = (status = "") => {
  const s = status.toLowerCase();
  switch (s) {
    case "pending":
    case "preparing":
      return {
        text: "text-[#2457A3]",
        pill: "bg-[#E7F1FF] text-[#2457A3] border-[#cfe2ff]",
        ring: "ring-[#9cc3ff]",
        hoverRing: "hover:ring-[#2457A3]/35",
        bar: "bg-[#2457A3]",
      };
    case "ready_for_pickup":
      return {
        text: "text-[#8a5a25]",
        pill: "bg-[#FFF6E6] text-[#8a5a25] border-[#ffe7bf]",
        ring: "ring-[#ffd9a8]",
        hoverRing: "hover:ring-[#8a5a25]/35",
        bar: "bg-[#8a5a25]",
      };
    case "in_transit":
      return {
        text: "text-[#1c6b80]",
        pill: "bg-[#E9F7FF] text-[#1c6b80] border-[#cdeef9]",
        ring: "ring-[#a6e3f5]",
        hoverRing: "hover:ring-[#1c6b80]/35",
        bar: "bg-[#1c6b80]",
      };
    case "received":
      return {
        text: "text-[#2b7a3f]",
        pill: "bg-[#E9F9EF] text-[#2b7a3f] border-[#c7ecd5]",
        ring: "ring-[#b9edc8]",
        hoverRing: "hover:ring-[#2b7a3f]/35",
        bar: "bg-[#2b7a3f]",
      };
    case "complete":
    case "completed":
      return {
        text: "text-[#1c7c1c]",
        pill: "bg-[#e9ffe9] text-[#1c7c1c] border-[#c7f3c7]",
        ring: "ring-[#aeeea7]",
        hoverRing: "hover:ring-[#1c7c1c]/35",
        bar: "bg-[#1c7c1c]",
      };
    default:
      return {
        text: "text-slate-600",
        pill: "bg-slate-100 text-slate-600 border-slate-200",
        ring: "ring-slate-200",
        hoverRing: "hover:ring-slate-300",
        bar: "bg-slate-500",
      };
  }
};

// useful for pill class parity with bakery
const statusColor = (status) => statusTheme(status).pill;

const StatusIcon = ({ status, className = "w-6 h-6" }) => {
  const s = (status || "").toLowerCase();
  const common = "stroke-current";
  if (s === "preparing" || s === "pending")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M4 19h16M6 19l1.5-8h9L18 19M9 11V7a3 3 0 1 1 6 0v4" className={common} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (s === "ready_for_pickup")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M3 9l9-6 9 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" className={common} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" className={common} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (s === "in_transit")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7" className={common} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="18" r="1.75" className={common} strokeWidth="1.5" />
        <circle cx="17.5" cy="18" r="1.75" className={common} strokeWidth="1.5" />
      </svg>
    );
  if (s === "received")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4" className={common} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 13v5a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" className={common} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (s === "complete" || s === "completed")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M20 6L9 17l-5-5" className={common} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="8" className={common} strokeWidth="1.8" />
    </svg>
  );
};

const StatusPillInline = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${statusTheme(status).pill}`}>
    <StatusIcon status={(status || "").toLowerCase()} className="w-3.5 h-3.5" />
    {nice((status || "").toLowerCase())}
  </span>
);

/* Progress stepper */
const Stepper = ({ status }) => {
  const raw = (status || "pending").toLowerCase();
  const normalized = raw === "pending" ? "preparing" : raw;
  const idx = Math.max(0, statusOrder.indexOf(normalized));
  const pct = idx / (statusOrder.length - 1);
  const activeTheme = statusTheme(normalized);

  return (
    <div className="rounded-2xl border border-[#f2e3cf] bg-[#FFFBF5] p-5">
      <div className="relative mx-8">
        <div className="h-1 w-full rounded-full bg-[#EFD7BE]" />
        <div className={`h-1 rounded-full absolute left-0 top-0 ${activeTheme.bar} transition-all`} style={{ width: `${pct * 100}%` }} />
        <div className="absolute inset-x-0 -top-6 flex justify-between items-end">
          {statusOrder.map((s, i) => {
            const theme = statusTheme(s);
            const active = i === idx;
            const passed = i < idx || normalized === "complete";
            return (
              <div key={s} className="flex flex-col items-center min-w-[78px]">
                <div className={`w-12 h-12 rounded-full grid place-items-center shadow transition-all duration-300
                  ${theme.text}
                  ${active ? `translate-y-[-6px] ring-2 ${theme.ring} bg-white` : passed ? "bg-white" : "bg-[#EADFCC]"}`}>
                  <StatusIcon status={passed && i === statusOrder.length - 1 ? "complete" : s} className="w-6 h-6" />
                </div>
                <span className={`mt-2 text-[13px] ${active ? "font-semibold text-[#3b2a18]" : "text-[#6b4b2b]"}`}>{nice(s)}</span>
              </div>
            );
          })}
        </div>
        <div className="pt-12" />
      </div>
    </div>
  );
};

/* ---------------- Component ---------------- */

const CDonationStatus = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [localStatus, setLocalStatus] = useState("preparing");

  // Load current user
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

  // Track current (visual) status for the modal
  useEffect(() => {
    if (selectedDonation) {
      setLocalStatus(
        selectedDonation.tracking_status ??
          selectedDonation.btracking_status ??
          "preparing"
      );
    }
  }, [selectedDonation]);

  // Fetch all
  const fetchAllDonations = async () => {
    if (!currentUser || currentUser.role !== "charity") return;
    const token = localStorage.getItem("token");
    try {
      const resNormal = await fetch(`${API}/donation/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataNormal = await resNormal.json();
      const activeNormal = dataNormal.filter((d) => d.tracking_status !== "complete");

      setReceivedDonations(
        activeNormal
          .filter((d) => d.status === "accepted")
          .map((d) => ({ ...d, request_id: d.request_id || d.id }))
      );
      setPendingDonations(activeNormal.filter((d) => d.status === "pending"));

      const resDirect = await fetch(`${API}/direct/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataDirect = await resDirect.json();
      setDirectDonations(dataDirect.filter((d) => d.btracking_status !== "complete"));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllDonations();
  }, [currentUser]);

  const markAsReceived = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/donation/received/${donationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to mark donation as received");
      await fetchAllDonations();
    } catch (err) {
      console.error(err);
    }
  };

  const markDirectAsReceived = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/direct/received/${donationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to mark direct donation as received");
      await fetchAllDonations();
    } catch (err) {
      console.error(err);
    }
  };

  // Highlight listeners
  useEffect(() => {
    const handler = (storageKey, prefix) => {
      const id = localStorage.getItem(storageKey);
      if (id) {
        setHighlightedId(Number(id));
        const el = document.getElementById(`${prefix}-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedId(null), 3000);
        localStorage.removeItem(storageKey);
      }
    };
    const donationHandler = () => handler("highlight_donation", "received");
    const donationStatusHandler = () => handler("highlight_donationStatus_donation", "received");
    const acceptedHandler = () => handler("highlight_accepted_request", "accepted");

    window.addEventListener("highlight_donation", donationHandler);
    window.addEventListener("highlight_donationStatus_donation", donationStatusHandler);
    window.addEventListener("highlight_accepted_request", acceptedHandler);
    return () => {
      window.removeEventListener("highlight_donation", donationHandler);
      window.removeEventListener("highlight_donationStatus_donation", donationStatusHandler);
      window.removeEventListener("highlight_accepted_request", acceptedHandler);
    };
  }, []);

  /* ---------- UI blocks ---------- */

  const SectionShell = ({ title, count, children }) => (
    <div className="rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6 mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#4A2F17]">{title}</h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-white/80 border-[#f2e3cf] text-[#6b4b2b]">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </div>
      {children}
    </div>
  );

  const chip = (txt) => (
    <span className="text-[11px] font-semibold px-2 py-1 rounded-full border bg-[#FFEFD9] border-[#f3ddc0] text-[#6b4b2b]">
      {txt}
    </span>
  );

  const Card = ({ d, onClick, kind }) => {
    const isDirect = kind === "direct";
    const idKey = kind === "normal" ? d.request_id || d.id : d.donation_id || d.id;

    const status =
      kind === "pending"
        ? "pending"
        : isDirect
        ? d.btracking_status || "preparing"
        : d.tracking_status || "preparing";

    const left = daysUntil(d.expiration_date);
    const showExpiry = Number.isFinite(left) && left >= 0;
    const theme = statusTheme(status);
    const isHighlighted =
      highlightedId === Number(idKey) ||
      highlightedId === Number(d.id) ||
      highlightedId === Number(d.request_id);

    return (
      <div
        id={`${kind === "normal" ? "accepted" : kind === "pending" ? "pending" : "received"}-${idKey}`}
        onClick={onClick}
        className={`group rounded-2xl border border-[#f2e3cf] bg-white/70 shadow-[0_2px_10px_rgba(93,64,28,.05)]
                    overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.015]
                    hover:shadow-[0_14px_32px_rgba(191,115,39,.18)] hover:ring-1 ${theme.hoverRing}
                    ${isHighlighted ? `ring-2 ${theme.ring}` : ""} flex flex-col h-[320px]`}
      >
        <div className="relative h-40 overflow-hidden">
          {d.image ? (
            <img src={`${API}/${d.image}`} alt={d.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">No Image</div>
          )}
          {showExpiry && (
            <div className="absolute top-3 right-3 text-[11px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#fff8e6] border-[#ffe7bf] text-[#8a5a25]">
              Expires in {left} {left === 1 ? "day" : "days"}
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-lg font-semibold text-[#3b2a18] line-clamp-1">{d.name}</h4>
            <StatusPillInline status={status} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {chip(`Qty: ${d.quantity}`)}
            {d.threshold != null && chip(`Threshold: ${d.threshold}`)}
          </div>

          {d.description && <p className="mt-3 text-sm text-[#7b5836] line-clamp-2">{d.description}</p>}

          {d.bakery_name && (
            <div className="mt-3 hidden md:block">
              <p className="text-[12px] font-semibold text-[#7b5836] mb-1">Donation From</p>
              <div className="flex items-center gap-2">
                {d.bakery_profile_picture ? (
                  <img src={`${API}/${d.bakery_profile_picture}`} alt={d.bakery_name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 grid place-items-center text-gray-600">?</div>
                )}
                <span className="text-sm font-medium line-clamp-1">{d.bakery_name}</span>
              </div>
            </div>
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
        {items.length ? items.map(renderItem) : <p className="text-sm text-[#7b5836]">{emptyText}</p>}
      </div>
    </div>
  );

  /* ---------- Requested board: ONLY Pending & Preparing ---------- */
  const colPending = pendingDonations;
  const colPreparing = receivedDonations.filter(
    (d) => (d.tracking_status || "preparing").toLowerCase() !== "complete"
  );

  /* ---------- Direct board ---------- */
  const colDirectPending = [];
  const colDirectPreparing = directDonations.filter(
    (d) => (d.btracking_status || "preparing").toLowerCase() !== "complete"
  );

  /* ---------------- Render ---------------- */

  return (
    <div className="relative mx-auto max-w-[1280px] px-6 py-8">
      <h2 className="mb-6 text-3xl sm:text-4xl font-extrabold text-[#4A2F17]">Donation Status</h2>

      {/* Requested Donations */}
      <SectionShell title="Requested Donations" count={pendingDonations.length + receivedDonations.length}>
        <div className="grid gap-4 md:grid-cols-2">
          <ScrollColumn
            title={`Pending (${colPending.length})`}
            items={colPending}
            emptyText="No pending items."
            renderItem={(d) => <Card key={d.id} d={d} kind="pending" onClick={() => setSelectedDonation(d)} />}
          />
          <ScrollColumn
            title={`Preparing (${colPreparing.length})`}
            items={colPreparing}
            emptyText="No preparing items."
            renderItem={(d) => <Card key={d.id} d={d} kind="normal" onClick={() => setSelectedDonation(d)} />}
          />
        </div>
      </SectionShell>

      {/* Direct Donations */}
      <SectionShell title="Direct Donations" count={directDonations.length}>
        <div className="grid gap-4 md:grid-cols-2">
          <ScrollColumn
            title={`Pending (${colDirectPending.length})`}
            items={colDirectPending}
            emptyText="No pending items."
            renderItem={(d) => <Card key={d.id} d={d} kind="direct" onClick={() => setSelectedDonation(d)} />}
          />
          <ScrollColumn
            title={`Preparing (${colDirectPreparing.length})`}
            items={colDirectPreparing}
            emptyText="No preparing items."
            renderItem={(d) => <Card key={d.id} d={d} kind="direct" onClick={() => setSelectedDonation(d)} />}
          />
        </div>
      </SectionShell>

      {/* ===== Details Modal (design matched to BDonationStatus) ===== */}
      {selectedDonation && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4
                     bg-[#FFF1E3]/70 backdrop-blur-sm"
          onClick={() => setSelectedDonation(null)}
        >
          <div
            className="w-full max-w-4xl rounded-3xl overflow-hidden
                       bg-white shadow-[0_24px_60px_rgba(191,115,39,.25)] ring-1 ring-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (gradient + round close button) */}
            <div className="relative px-6 py-4 bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#4A2F17]">Donation Details</h3>
              <button
                onClick={() => setSelectedDonation(null)}
                className="absolute right-4 top-1/2 -translate-y-1/2
                           h-9 w-9 rounded-full grid place-items-center
                           bg-white text-[#4A2F17] shadow hover:scale-105 transition
                           cursor-pointer ring-1 ring-[#E3C6A3] hover:ring-[#E49A52]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E49A52]"
                aria-label="Close details"
                title="Close"
                type="button"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Image + status pill (sizes/rounding matched) */}
              {selectedDonation.image && (
                <div className="relative">
                  <img
                    src={`${API}/${selectedDonation.image}`}
                    alt={selectedDonation.name}
                    className="h-64 md:h-80 w-full object-cover rounded-2xl"
                  />
                  <span
                    className={`absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded-full border ${statusColor(
                      selectedDonation.tracking_status ??
                        selectedDonation.btracking_status ??
                        "preparing"
                    )}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <StatusIcon
                        status={(selectedDonation.tracking_status ?? selectedDonation.btracking_status ?? "preparing").toLowerCase()}
                        className="w-3.5 h-3.5"
                      />
                      {nice((selectedDonation.tracking_status ?? selectedDonation.btracking_status ?? "preparing").toLowerCase())}
                    </span>
                  </span>
                </div>
              )}

              {/* Title & summary grid (exact layout like bakery) */}
              <div className="mt-5 grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <h3 className="text-2xl font-semibold text-[#3b2a18]">
                    {selectedDonation.name}
                  </h3>
                  {selectedDonation.description && (
                    <p className="text-sm text-[#7b5836] mt-2">
                      {selectedDonation.description}
                    </p>
                  )}
                </div>
                <div className="col-span-12 md:col-span-3">
                  <div className="rounded-xl border border-[#f2e3cf] bg-white/70 p-3">
                    <div className="text-xs text-[#7b5836]">Quantity</div>
                    <div className="text-lg font-semibold text-[#3b2a18]">
                      {selectedDonation.quantity}
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-3">
                  <div className="rounded-xl border border-[#f2e3cf] bg-white/70 p-3">
                    <div className="text-xs text-[#7b5836]">Expires</div>
                    <div className="text-lg font-semibold text-[#3b2a18]">
                      {selectedDonation.expiration_date
                        ? new Date(selectedDonation.expiration_date).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stepper spacing to match bakery */}
              <div className="mt-6">
                <Stepper status={localStatus} />
              </div>

              {/* Charity CTA (style matched only) */}
              {(selectedDonation.tracking_status ?? selectedDonation.btracking_status) === "in_transit" && (
                <button
                  onClick={async () => {
                    if (selectedDonation.btracking_status !== undefined) {
                      await markDirectAsReceived(selectedDonation.id);
                    } else {
                      await markAsReceived(selectedDonation.id);
                    }
                    setSelectedDonation((prev) => ({
                      ...prev,
                      tracking_status: prev?.tracking_status ? "received" : prev?.tracking_status,
                      btracking_status: prev?.btracking_status ? "received" : prev?.btracking_status,
                    }));
                    await fetchAllDonations();
                  }}
                  className="mt-6 w-full rounded-full px-5 py-3 font-semibold text-white
                             bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                             shadow-[0_10px_26px_rgba(201,124,44,.25)]
                             hover:brightness-[1.05] transition"
                >
                  Mark as Received
                </button>
              )}

              {((selectedDonation.tracking_status ?? selectedDonation.btracking_status)?.toLowerCase() === "received") &&
                !selectedDonation.feedback_submitted && (
                  <div className="mt-4">
                    <Feedback
                      donationId={selectedDonation.id}
                      isDirect={selectedDonation.btracking_status !== undefined}
                      onSubmitted={async () => {
                        setSelectedDonation((prev) => ({ ...prev, feedback_submitted: true }));
                        await fetchAllDonations();
                      }}
                    />
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CDonationStatus;
