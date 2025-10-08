import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

import Feedback from "./Feedback";

// Helpers
const statusOrder = ["preparing", "ready_for_pickup", "in_transit", "received", "complete"];

const nice = (s = "") => s.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((d - t) / (1000 * 60 * 60 * 24));
};

const statusColor = (status) => {
  switch (status) {
    case "preparing":
      return "bg-[#E7F1FF] text-[#2457A3] border-[#cfe2ff]";
    case "ready_for_pickup":
      return "bg-[#FFF6E6] text-[#8a5a25] border-[#ffe7bf]";
    case "in_transit":
      return "bg-[#E9F7FF] text-[#1c6b80] border-[#cdeef9]";
    case "received":
      return "bg-[#E9F9EF] text-[#2b7a3f] border-[#c7ecd5]";
    case "complete":
      return "bg-[#e9ffe9] text-[#1c7c1c] border-[#c7f3c7]";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const chip = (txt) => (
  <span className="text-[11px] font-semibold px-2 py-1 rounded-full border bg-[#FFEFD9] border-[#f3ddc0] text-[#6b4b2b]">
    {txt}
  </span>
);

const CDonationStatus = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [localStatus, setLocalStatus] = useState("preparing");
  const highlightRequestId = localStorage.getItem("highlight_accepted_request");

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
      // Normal donations
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

      // Direct donations
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

  // Mark normal as received 
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

  // Mark direct as received 
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
    const donationStatusHandler = () =>
      handler("highlight_donationStatus_donation", "received");
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

  const Section = ({ title, count, children }) => (
    <div
      className="
        rounded-3xl border border-[#eadfce]
        bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
        shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6 mb-8
      "
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#4A2F17]">{title}</h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-white/80 border-[#f2e3cf] text-[#6b4b2b]">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </div>
      {children}
    </div>
  );

  const Card = ({ d, onClick, kind }) => {
    // kind: "normal" | "direct" | "pending"
    const isDirect = kind === "direct";
    const idKey =
      kind === "normal"
        ? (d.request_id || d.id)
        : (d.donation_id || d.id);

    const status =
      kind === "pending"
        ? null
        : (isDirect ? (d.btracking_status || "preparing") : (d.tracking_status || "preparing"));

    const left = daysUntil(d.expiration_date);
    const showExpiry = Number.isFinite(left) && left >= 0;

    return (
      <div
        id={`${kind === "normal" ? "accepted" : kind === "pending" ? "pending" : "received"}-${idKey}`}
        onClick={onClick}
        className={`group rounded-2xl border border-[#f2e3cf] bg-white/70
                    shadow-[0_2px_10px_rgba(93,64,28,.05)]
                    overflow-hidden transition-all duration-300 cursor-pointer
                    hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)]
                    hover:ring-1 hover:ring-[#E49A52]/35
                    ${
                      highlightedId === idKey || String(idKey) === highlightRequestId
                        ? "ring-2 ring-[#E49A52]"
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
            <div
              className="absolute top-3 right-3 text-[11px] font-bold
                         inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
                         bg-[#fff8e6] border-[#ffe7bf] text-[#8a5a25]"
            >
              Expires in {left} {left === 1 ? "day" : "days"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-lg font-semibold text-[#3b2a18]">{d.name}</h4>

            {status && (
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusColor(
                  status
                )}`}
              >
                {nice(status)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {chip(`Qty: ${d.quantity}`)}
            {d.threshold != null && chip(`Threshold: ${d.threshold}`)}
          </div>

          {d.description && (
            <p className="mt-3 text-sm text-[#7b5836] line-clamp-2">{d.description}</p>
          )}

          {/* Bakery info */}
          {d.bakery_name && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold text-[#7b5836] mb-1">Donation From</p>
              <div className="flex items-center gap-2">
                {d.bakery_profile_picture ? (
                  <img
                    src={`${API}/${d.bakery_profile_picture}`}
                    alt={d.bakery_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 grid place-items-center text-gray-600">?</div>
                )}
                <span className="text-sm font-medium">{d.bakery_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="relative mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#4A2F17]">Donation Status</h2>
      </div>

      {/* Pending Donations (accepted, not complete) */}
      <Section title="Pending Donations" count={receivedDonations.length}>
        {receivedDonations.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {receivedDonations.map((d) => (
              <Card key={d.id} d={d} kind="normal" onClick={() => setSelectedDonation(d)} />
            ))}
          </div>
        ) : (
          <p className="text-[#7b5836]">No donations received yet.</p>
        )}
      </Section>

      {/* Direct Donations (not complete) */}
      <Section title="Direct Donations" count={directDonations.length}>
        {directDonations.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {directDonations.map((d) => (
              <Card key={d.id} d={d} kind="direct" onClick={() => setSelectedDonation(d)} />
            ))}
          </div>
        ) : (
          <p className="text-[#7b5836]">No direct donations received yet.</p>
        )}
      </Section>

      {/* Requested Donations (pending requests) */}
      <Section title="Requested Donations" count={pendingDonations.length}>
        {pendingDonations.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pendingDonations.map((d) => (
              <Card key={d.id} d={d} kind="pending" onClick={() => setSelectedDonation(d)} />
            ))}
          </div>
        ) : (
          <p className="text-[#7b5836]">No requested donations.</p>
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
                <h3 className="text-lg font-semibold text-[#4A2F17]">Donation Details</h3>
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
                      (selectedDonation.tracking_status ??
                        selectedDonation.btracking_status ??
                        "preparing")
                    )}`}
                  >
                    {nice(
                      selectedDonation.tracking_status ??
                        selectedDonation.btracking_status ??
                        "preparing"
                    )}
                  </span>
                </div>
              )}

              {/* Title/details */}
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
                      Quantity: <span className="font-semibold">{selectedDonation.quantity}</span>
                    </div>
                    {selectedDonation.expiration_date && (
                      <div>
                        Expires:{" "}
                        <span className="font-semibold">
                          {new Date(selectedDonation.expiration_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* From bakery */}
              {selectedDonation.bakery_name && (
                <div className="mt-5">
                  <p className="text-[12px] font-semibold text-[#7b5836] mb-1">Donation From</p>
                  <div className="flex items-center gap-2">
                    {selectedDonation.bakery_profile_picture ? (
                      <img
                        src={`${API}/${selectedDonation.bakery_profile_picture}`}
                        alt={selectedDonation.bakery_name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-300 grid place-items-center text-gray-600">
                        ?
                      </div>
                    )}
                    <span className="text-sm font-medium">
                      {selectedDonation.bakery_name}
                    </span>
                  </div>
                </div>
              )}

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
                            (localStatus === "complete" ? "complete" : localStatus) || "preparing"
                          )
                        ) /
                          (statusOrder.length - 1)) *
                        100
                      }%`,
                    }}
                  />
                  {statusOrder.map((status, idx) => {
                    const currentIndex = statusOrder.indexOf(
                      (localStatus === "complete" ? "complete" : localStatus) || "preparing"
                    );
                    const isActive = idx <= currentIndex;
                    const isLast = idx === statusOrder.length - 1;
                    return (
                      <div key={status} className="flex flex-col items-center z-10 w-20">
                        <div
                          className={`w-9 h-9 rounded-full grid place-items-center text-white font-bold
                                      ${isActive ? "bg-green-500" : "bg-gray-300"}
                                      ${idx === currentIndex && !isLast ? "-translate-y-1.5 scale-105" : ""}`}
                        >
                          {idx + 1}
                        </div>
                        <span className="mt-1.5 text-[11px] text-center">
                          {status.replaceAll("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic action(s) */}
              <div className="mt-6 space-y-3">
                {/* Received button (when in_transit) */}
                {(selectedDonation.tracking_status ?? selectedDonation.btracking_status) ===
                  "in_transit" && (
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
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Mark as Received
                  </button>
                )}

                {/* Feedback button (when received and not yet submitted) */}
                {((selectedDonation.tracking_status ??
                  selectedDonation.btracking_status)?.toLowerCase() === "received") &&
                  !selectedDonation.feedback_submitted && (
                    <Feedback
                      donationId={selectedDonation.id}
                      isDirect={selectedDonation.btracking_status !== undefined}
                      onSubmitted={async () => {
                        setSelectedDonation((prev) => ({ ...prev, feedback_submitted: true }));
                        await fetchAllDonations();
                      }}
                    />
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CDonationStatus;