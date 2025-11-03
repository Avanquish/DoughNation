import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

/* ---------------- Helpers ---------------- */
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

/* Single source of truth for colors per status */
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
    case "cancelled":
    case "canceled":
    case "declined":
    case "expired":
    case "failed":
      return {
        text: "text-[#8a1f1f]",
        pill: "bg-[#FFE9E9] text-[#8a1f1f] border-[#ffd0d0]",
        ring: "ring-[#f7b0b0]",
        hoverRing: "hover:ring-[#8a1f1f]/35",
        bar: "bg-[#8a1f1f]",
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

const statusColor = (status) => statusTheme(status).pill;

const getRequesterName = (d) =>
  d?.requester_name ||
  d?.requested_by_name ||
  d?.requested_by ||
  d?.charity_name ||
  d?.charity?.name ||
  d?.charity ||
  "Unknown Charity";

const isComplete = (d) => {
  const s = (d.tracking_status || d.status || "").toLowerCase();
  return s === "complete" || s === "completed";
};

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
    preparing.push(d);
  });
  return { pending, preparing, complete };
};

const prioritySort = (list = []) => {
  const score = (d) => {
    const s = (d.tracking_status || d.status || "").toLowerCase();
    const isDone = s === "complete" || s === "completed";
    const expiry = daysUntil(d.expiration_date);
    const expScore = Number.isFinite(expiry)
      ? expiry
      : Number.POSITIVE_INFINITY;
    const raw = (d.tracking_status || d.status || "pending").toLowerCase();
    const normalized = raw === "pending" ? "preparing" : raw;
    const idx = statusOrder.indexOf(normalized);
    const stageScore = idx >= 0 ? idx : statusOrder.length;
    return { isDone, expScore, stageScore };
  };
  return [...list].sort((a, b) => {
    const A = score(a),
      B = score(b);
    if (A.isDone !== B.isDone) return A.isDone ? 1 : -1;
    if (A.expScore !== B.expScore) return A.expScore - B.expScore;
    return A.stageScore - B.stageScore;
  });
};

/* ---------------- Icons (stroke follows current text color) ---------------- */
const StatusIcon = ({ status, className = "w-6 h-6" }) => {
  const s = (status || "").toLowerCase();
  const common = "stroke-current";
  if (s === "preparing" || s === "pending")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M4 19h16M6 19l1.5-8h9L18 19M9 11V7a3 3 0 1 1 6 0v4"
          className={common}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (s === "ready_for_pickup")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M3 9l9-6 9 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
          className={common}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 22V12h6v10"
          className={common}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (s === "in_transit")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M3 7h11v10H3zM14 11h4l3 3v3h-7"
          className={common}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="7.5"
          cy="18"
          r="1.75"
          className={common}
          strokeWidth="1.5"
        />
        <circle
          cx="17.5"
          cy="18"
          r="1.75"
          className={common}
          strokeWidth="1.5"
        />
      </svg>
    );
  if (s === "received")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M12 3v12m0 0l-4-4m4 4l4-4"
          className={common}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 13v5a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5"
          className={common}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (s === "complete" || s === "completed")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M20 6L9 17l-5-5"
          className={common}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="8" className={common} strokeWidth="1.8" />
    </svg>
  );
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${statusColor(
      status
    )}`}
  >
    <StatusIcon status={(status || "").toLowerCase()} className="w-3.5 h-3.5" />
    {nice((status || "").toLowerCase())}
  </span>
);

/* ---------------------------------------------------------- */

const BDonationStatus = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [acceptedNorm, setAcceptedNorm] = useState([]);
  const [pendingNorm, setPendingNorm] = useState([]);
  const [mapped, setMapped] = useState([]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== "bakerystatus") {
      url.searchParams.set("tab", "bakerystatus");
      window.history.replaceState({}, "", url.toString());
    }
    sessionStorage.setItem("activeTab", "bakerystatus");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));

      // Handle employee token
      if (decoded.type === "employee") {
        setCurrentUser({
          id: decoded.bakery_id,
          role: "bakery",
          employeeName: decoded.employee_name,
          employeeRole: decoded.employee_role,
          isEmployee: true, // Flag to identify employee
        });
        return;
      }

      // Handle regular user token
      setCurrentUser({
        id: Number(decoded.sub),
        role: decoded.role.toLowerCase(),
        email: decoded.email || "",
        name: decoded.name || "",
        isEmployee: false, // Flag to identify non-employee
      });
    } catch (err) {
      console.error("Failed to decode token:", err);
    }
  }, []);

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
    const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
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

  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");

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
              tracking_status: (
                d.tracking_status ||
                d.status ||
                ""
              ).toLowerCase(),
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
              tracking_status: (
                d.btracking_status ||
                d.tracking_status ||
                d.status ||
                "pending"
              ).toLowerCase(),
            }))
          );
        } catch (e) {
          console.error("Failed to fetch direct donations:", e);
        }
      })();
    }
  }, [currentUser]);

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
      const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const res = await axios.get(`${API}/employees`, opts);
      setEmployees(res.data || []);
    } catch (e) {
      console.error("Failed to fetch employees:", e);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    setReceivedDonations([...acceptedNorm, ...pendingNorm]);
    setDirectDonations(mapped);
  }, [acceptedNorm, pendingNorm, mapped]);

  /* ---------------- UI shells ---------------- */
  const Section = ({ title, count, children }) => (
    <div className="rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6 mb-8">
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

  const Card = ({ d, onClick }) => {
    const left = daysUntil(d.expiration_date);
    const showExpiry = Number.isFinite(left) && left >= 0;
    const stat = (d.tracking_status || d.status || "pending").toLowerCase();
    const theme = statusTheme(stat);
    
    // Only allow clicks for employees
    const handleClick = currentUser?.isEmployee ? onClick : undefined;
    const cursorClass = currentUser?.isEmployee ? "cursor-pointer" : "cursor-not-allowed opacity-60";

    return (
      <div
        id={`received-${d.donation_id || d.id}`}
        onClick={handleClick}
        className={`group rounded-2xl border border-[#f2e3cf] bg-white/70
                  shadow-[0_2px_10px_rgba(93,64,28,.05)]
                  overflow-hidden transition-all duration-300 ${cursorClass}
                  ${currentUser?.isEmployee ? `hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)] hover:ring-1 ${theme.hoverRing}` : ''}
                  ${highlightedId === (d.donation_id || d.id)
            ? `ring-2 ${theme.ring}`
            : ""
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
            <StatusPill status={d.tracking_status || d.status} />
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

          {/* —— NEW: Requester / Charity block —— */}
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
          {/* —— END: Requester / Charity block —— */}
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
        {items.length ? (
          items.map(renderItem)
        ) : (
          <p className="text-sm text-[#7b5836]">{emptyText}</p>
        )}
      </div>
    </div>
  );

  /* ---------------- Progress stepper: icon + exact palette ---------------- */
  const Stepper = ({ status }) => {
    const raw = (status || "pending").toLowerCase();
    const normalized = raw === "pending" ? "preparing" : raw;
    const idx = Math.max(0, statusOrder.indexOf(normalized));
    const pct = idx / (statusOrder.length - 1);

    const activeTheme = statusTheme(normalized);

    return (
      <div className="rounded-2xl border border-[#f2e3cf] bg-[#FFFBF5] p-5">
        <div className="relative">
          <div className="relative mx-8">
            <div className="h-1 w-full rounded-full bg-[#EFD7BE]" />
            <div
              className={`h-1 rounded-full absolute left-0 top-0 ${activeTheme.bar} transition-all`}
              style={{ width: `${pct * 100}%` }}
            />
            <div className="absolute inset-x-0 -top-6 flex justify-between items-end">
              {statusOrder.map((s, i) => {
                const theme = statusTheme(s);
                const active = i === idx;
                const passed = i < idx || normalized === "complete";
                return (
                  <div
                    key={s}
                    className="flex flex-col items-center min-w-[78px]"
                  >
                    <div
                      className={`w-12 h-12 rounded-full grid place-items-center shadow transition-all duration-300
                        ${theme.text}
                        ${active
                          ? `translate-y-[-6px] ring-2 ${theme.ring} bg-white`
                          : passed
                            ? "bg-white"
                            : "bg-[#EADFCC]"
                        }`}
                    >
                      <StatusIcon
                        status={
                          passed && i === statusOrder.length - 1
                            ? "complete"
                            : s
                        }
                        className="w-6 h-6"
                      />
                    </div>
                    <span
                      className={`mt-2 text-[13px] ${active
                          ? "font-semibold text-[#3b2a18]"
                          : "text-[#6b4b2b]"
                        }`}
                    >
                      {nice(s)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pt-12" />
        </div>
      </div>
    );
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="relative mx-auto max-w-[1280px] p-2">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl sm:text-3xl font-extrabold" style={{ color: "#6B4B2B" }}>
          Donation Status
        </h1>
      </div>

      {/* Requested */}
      <Section title="Requested Donations" count={receivedDonations.length}>
        {receivedDonations.length > 0 ? (
          (() => {
            const { pending, preparing, complete } = bucketize4(
              sortByStatus(receivedDonations)
            );
            return (
              <div className="grid gap-4 md:grid-cols-3">
                <ScrollColumn
                  title={`Pending (${pending.length})`}
                  items={prioritySort(pending)}
                  emptyText="No pending items."
                  renderItem={(d) => (
                    <Card
                      key={`req-p-${d.id}`}
                      d={d}
                      onClick={() => setSelectedDonation(d)}
                    />
                  )}
                />
                <ScrollColumn
                  title={`Preparing (${preparing.length})`}
                  items={prioritySort(preparing)}
                  emptyText="No preparing items."
                  renderItem={(d) => (
                    <Card
                      key={`req-prep-${d.id}`}
                      d={d}
                      onClick={() => setSelectedDonation(d)}
                    />
                  )}
                />
                <ScrollColumn
                  title={`Complete (${complete.length})`}
                  items={prioritySort(complete)}
                  emptyText="No completed items."
                  renderItem={(d) => (
                    <Card
                      key={`req-c-${d.id}`}
                      d={d}
                      onClick={() => setSelectedDonation(d)}
                    />
                  )}
                />
              </div>
            );
          })()
        ) : (
          <p className="text-[#7b5836]">No donations yet.</p>
        )}
      </Section>

      {/* Direct */}
      <Section title="Direct Donations" count={directDonations.length}>
        {directDonations.length > 0 ? (
          (() => {
            const { preparing, complete } = bucketize4(
              sortByStatus(directDonations)
            );
            return (
              <div className="grid gap-4 md:grid-cols-2">
                <ScrollColumn
                  title={`Preparing (${preparing.length})`}
                  items={prioritySort(preparing)}
                  emptyText="No preparing items."
                  renderItem={(d) => (
                    <Card
                      key={`dir-prep-${d.id}`}
                      d={d}
                      onClick={() => setSelectedDonation(d)}
                    />
                  )}
                />
                <ScrollColumn
                  title={`Complete (${complete.length})`}
                  items={prioritySort(complete)}
                  emptyText="No completed items."
                  renderItem={(d) => (
                    <Card
                      key={`dir-c-${d.id}`}
                      d={d}
                      onClick={() => setSelectedDonation(d)}
                    />
                  )}
                />
              </div>
            );
          })()
        ) : (
          <p className="text-[#7b5836]">No direct donations yet.</p>
        )}
      </Section>

      {/* ===== Details Modal ===== */}
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
            {/* Header */}
            <div className="relative px-6 py-4 bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#4A2F17]">
                Donation Details
              </h3>
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
              {/* Image + status */}
              {selectedDonation.image && (
                <div className="relative">
                  <img
                    src={`${API}/${selectedDonation.image}`}
                    alt={selectedDonation.name}
                    className="h-64 md:h-80 w-full object-cover rounded-2xl"
                  />
                  <span
                    className={`absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded-full border ${statusColor(
                      selectedDonation.tracking_status ||
                      selectedDonation.status
                    )}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <StatusIcon
                        status={(
                          selectedDonation.tracking_status ||
                          selectedDonation.status ||
                          ""
                        ).toLowerCase()}
                        className="w-3.5 h-3.5"
                      />
                      {nice(
                        (
                          selectedDonation.tracking_status ||
                          selectedDonation.status ||
                          ""
                        ).toLowerCase()
                      )}
                    </span>
                  </span>
                </div>
              )}

              {/* Title & summary */}
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
                        ? new Date(
                          selectedDonation.expiration_date
                        ).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stepper */}
              <div className="mt-6">
                <Stepper status={selectedDonation.tracking_status} />
              </div>

              {/* CTA*/}
              {currentUser?.isEmployee && 
                (selectedDonation.tracking_status === "preparing" ||
                selectedDonation.tracking_status === "ready_for_pickup") && (
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
                           hover:brightness-[1.05] transition"
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