import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Status theme helper
const statusTheme = (status = "") => {
  const s = status.toLowerCase();
  switch (s) {
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

// Styles
const Styles = () => (
  <style>{`
    .panel-wrap{
      border:1px solid #eadfce;
      border-radius:24px;
      background: linear-gradient(165deg,#FFF9F1 0%,#FFF7ED 40%,#FFEFD9 100%);
      box-shadow:0 2px 8px rgba(93,64,28,.06);
    }
    .card{
      position:relative;
      overflow:hidden;
      border:1px solid #f2e3cf;
      border-radius:16px;
      background:rgba(255,255,255,.7);
      box-shadow:0 2px 10px rgba(93,64,28,.05);
      transition:transform .24s cubic-bezier(.2,.8,.2,1), box-shadow .24s ease, border-color .25s ease;
      will-change:transform;
      cursor: pointer;
    }
    .card::before{
      content:"";
      position:absolute;
      inset:-6px;
      border-radius:inherit;
      background:
        radial-gradient(360px 220px at 88% 18%, rgba(247,193,124,.28), rgba(247,193,124,0) 62%),
        linear-gradient(135deg, rgba(255,232,200,.28), rgba(255,255,255,0));
      opacity:0;
      transform:scale(.99);
      transition:opacity .22s ease, transform .22s ease;
      z-index:-1;
      pointer-events:none;
    }
    .card:hover{ transform: translateY(-4px) scale(1.01); box-shadow:0 14px 32px rgba(191,115,39,.18); border-color:#eadfce; }
    .card:hover::before{ opacity:1; transform:scale(1); }
    .img-zoom{ transition:transform .5s cubic-bezier(.2,.8,.2,1), filter .5s ease; border-radius:12px; }
    .card:hover .img-zoom{ transform:scale(1.04); filter:saturate(1.03); }
    .pill{ display:inline-flex; align-items:center; gap:.4rem; padding:.25rem .55rem; font-size:11px; font-weight:700;
           background:#FFEFD9; border:1px solid #f3ddc0; color:#6b4b2b; border-radius:999px;}
    .badge{
      display:inline-flex; align-items:center; gap:.45rem; font-size:11px; font-weight:700; padding:.3rem .6rem; border-radius:999px;
    }
    .meta-tile{ border:1px solid #f2e3cf; background:#fff; border-radius:10px; padding:.45rem .6rem; font-size:12px; color:#7b5836; }
    
    /* Modal styles */
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-backdrop { animation: modalFadeIn 0.2s ease; }
    .modal-content { animation: modalSlideUp 0.3s cubic-bezier(0.2,0.8,0.2,1); }
  `}</style>
);

export default function AdminDonationStatus() {
  const [incomingDonations, setIncomingDonations] = useState([]);
  const [outgoingDonations, setOutgoingDonations] = useState([]);
  const [activeTab, setActiveTab] = useState("incoming");
  const [selectedDonation, setSelectedDonation] = useState(null);

  // Search and pagination
  const [searchIncoming, setSearchIncoming] = useState("");
  const [searchOutgoing, setSearchOutgoing] = useState("");
  const [incomingPage, setIncomingPage] = useState(1);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const PAGE_SIZE = 9; // 3 columns x 3 rows

  useEffect(() => {
    fetchDonations();
    const interval = setInterval(fetchDonations, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");

      // Fetch incoming donations (from donors)
      const incomingRes = await axios.get(`${API}/admin-donations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIncomingDonations(incomingRes.data || []);

      // Fetch outgoing donations (to charities)
      const outgoingRes = await axios.get(`${API}/admin/outgoing-donations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOutgoingDonations(outgoingRes.data || []);
    } catch (error) {
      console.error("Failed to fetch donations:", error);
    }
  };

  const handleUpdateIncomingStatus = async (donationId, currentStatus) => {
    // Admin can only update from "in_transit" → "received" or "received" → "complete"
    if (currentStatus !== "in_transit" && currentStatus !== "received") return;

    const nextStatus = currentStatus === "in_transit" ? "received" : "complete";

    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await axios.put(
        `${API}/admin-donations/${donationId}/tracking`,
        { tracking_status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (nextStatus === "received") {
        Swal.fire({
          title: "Item Received!",
          html: `
            <p>Tracking status updated to <strong>${nextStatus.replace("_", " ")}</strong></p>
            <p class="text-sm text-green-600 mt-2 font-semibold">
              ✓ Item has been added to your inventory
            </p>
          `,
          icon: "success",
          confirmButtonColor: "#BF7326",
        });
      } else {
        Swal.fire({
          title: "Status Updated!",
          text: `Tracking status updated to ${nextStatus.replace("_", " ")}`,
          icon: "success",
          confirmButtonColor: "#BF7326",
        });
      }

      fetchDonations();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to update status",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
    }
  };

  const handleUpdateOutgoingStatus = async (donationId, currentStatus) => {
    const statusOrder = ["preparing", "ready_for_pickup", "in_transit", "received", "complete"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusOrder.length - 1) return;

    const nextStatus = statusOrder[currentIndex + 1];

    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await axios.post(
        `${API}/donation/tracking/${donationId}`,
        { tracking_status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire({
        title: "Status Updated!",
        text: `Tracking status updated to ${nextStatus.replace("_", " ")}`,
        icon: "success",
        confirmButtonColor: "#BF7326",
      });

      fetchDonations();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to update status",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
    }
  };

  // Filter and pagination helpers
  const filterDonations = (list, term) => {
    const q = term.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => {
      const fields = [
        d.donation_name,
        d.donor_name,
        d.charity_name,
        d.donation_quantity && String(d.donation_quantity),
        d.tracking_status,
      ];
      return fields.some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      );
    });
  };

  const filteredIncoming = filterDonations(incomingDonations, searchIncoming);
  const filteredOutgoing = filterDonations(outgoingDonations, searchOutgoing);

  const incomingTotalPages = Math.max(1, Math.ceil(filteredIncoming.length / PAGE_SIZE));
  const outgoingTotalPages = Math.max(1, Math.ceil(filteredOutgoing.length / PAGE_SIZE));

  const incomingStartIndex = (incomingPage - 1) * PAGE_SIZE;
  const incomingPageDonations = filteredIncoming.slice(
    incomingStartIndex,
    incomingStartIndex + PAGE_SIZE
  );

  const outgoingStartIndex = (outgoingPage - 1) * PAGE_SIZE;
  const outgoingPageDonations = filteredOutgoing.slice(
    outgoingStartIndex,
    outgoingStartIndex + PAGE_SIZE
  );

  // Reset page when search changes
  useEffect(() => {
    setIncomingPage(1);
  }, [searchIncoming, filteredIncoming.length]);

  useEffect(() => {
    setOutgoingPage(1);
  }, [searchOutgoing, filteredOutgoing.length]);

  // Status badge helper
  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
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

  // Avatar component
  const Avatar = ({ src, alt }) =>
    src ? (
      <img
        src={`${API}/${src}`}
        alt={alt}
        className="w-9 h-9 rounded-full object-cover border border-[#f2e3cf]"
      />
    ) : (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E49A52] to-[#BF7327] grid place-items-center text-white font-bold text-xs">
        {alt?.[0]?.toUpperCase() || "?"}
      </div>
    );

  // Pagination buttons
  const pagerBtn =
    "rounded-full border border-[#f2d4b5] bg-white px-3 py-1.5 text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <Styles />

      {/* HEADER + TABS */}
      <div className="p-6">
        <div className="mb-4">
          <h2
            className="text-3xl sm:text-4xl font-extrabold"
            style={{ color: "#6B4B2B" }}
          >
            Donation Status
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-[#f2e3cf] mb-4">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "incoming"
                ? "text-[#BF7326] border-b-4 border-[#BF7326]"
                : "text-gray-600 hover:text-[#8B4513]"
            }`}
          >
            Incoming ({incomingDonations.length})
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "outgoing"
                ? "text-[#BF7326] border-b-4 border-[#BF7326]"
                : "text-gray-600 hover:text-[#8B4513]"
            }`}
          >
            Outgoing ({outgoingDonations.length})
          </button>
        </div>

        {/* INCOMING TAB */}
        {activeTab === "incoming" && (
          <>
            {/* Search bar */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold" style={{ color: "#6B4B2B" }}>
                Donations from Donors
              </h2>

              <div className="relative w-full max-w-xs">
                <input
                  value={searchIncoming}
                  onChange={(e) => setSearchIncoming(e.target.value)}
                  placeholder="Search incoming donations..."
                  className="h-9 w-full rounded-full border border-[#f2d4b5] bg-white/95 pl-9 pr-3 text-sm text-[#4b3a28] shadow-sm outline-none focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                />
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-[#4b5563]"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    fill="none"
                  >
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16" y1="16" x2="21" y2="21" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="panel-wrap p-5">
              {incomingDonations.length === 0 ? (
                <div className="grid place-items-center h-48 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
                  <p className="text-sm" style={{ color: "#7b5836" }}>
                    No incoming donations yet
                  </p>
                </div>
              ) : filteredIncoming.length === 0 ? (
                <div className="grid place-items-center h-48 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
                  <p className="text-sm" style={{ color: "#7b5836" }}>
                    No donations match your search
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {incomingPageDonations.map((donation) => {
                      const isDonorHandling =
                        donation.tracking_status === "preparing" ||
                        donation.tracking_status === "ready_for_pickup";

                      return (
                        <div
                          key={donation.id}
                          className="card"
                          onClick={() => setSelectedDonation({ ...donation, type: "incoming" })}
                        >
                          {/* Image */}
                          <div className="relative h-36 overflow-hidden">
                            {donation.donation_image ? (
                              <img
                                src={`${API}/${donation.donation_image}`}
                                alt={donation.donation_name}
                                className="h-full w-full object-cover img-zoom"
                                onError={(e) => {
                                  e.currentTarget.src = `${API}/static/placeholder.png`;
                                }}
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
                                No Image
                              </div>
                            )}
                            <div className="absolute top-3 right-3">
                              <span className={`badge border ${getStatusBadge(donation.tracking_status)}`}>
                                {donation.tracking_status?.replace("_", " ").toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-3.5">
                            {/* Donor info */}
                            <div className="flex items-center mb-2 gap-2">
                              <Avatar 
                                src={donation.donor_profile_picture} 
                                alt={donation.donor_name} 
                              />
                              <div className="min-w-0">
                                <div
                                  className="text-sm font-semibold truncate"
                                  style={{ color: "#3b2a18" }}
                                >
                                  {donation.donor_name || "Anonymous Donor"}
                                </div>
                                <div className="text-[11px]" style={{ color: "#7b5836" }}>
                                  Donor
                                </div>
                              </div>
                            </div>

                            <h3 className="text-[15px] font-semibold" style={{ color: "#3b2a18" }}>
                              {donation.donation_name}
                            </h3>

                            {/* Pills */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="pill">Qty: {donation.donation_quantity}</span>
                              {donation.donation_expiration && (
                                <span className="pill" style={{ background: "#FFF6E9" }}>
                                  Exp: {new Date(donation.donation_expiration).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Meta tiles */}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {donation.timestamp && (
                                <div className="meta-tile">
                                  <div className="font-semibold">Donated</div>
                                  <div>{new Date(donation.timestamp).toLocaleDateString()}</div>
                                </div>
                              )}
                              <div className="meta-tile">
                                <div className="font-semibold">Status</div>
                                <div>{donation.tracking_status?.replace("_", " ")}</div>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="mt-3">
                              {isDonorHandling ? (
                                <div className="text-center py-1.5 px-3 bg-[#FFF6E9] border border-[#f3ddc0] rounded-full text-xs font-semibold text-[#8a5a25]">
                                  Donor is handling delivery
                                </div>
                              ) : donation.tracking_status === "in_transit" ? (
                                <button
                                  className="w-full rounded-full px-4 py-2 font-semibold transition
                                           bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                                           text-white hover:-translate-y-0.5 active:scale-95
                                           ring-1 ring-white/60 shadow-[0_10px_26px_rgba(201,124,44,.18)] text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateIncomingStatus(donation.id, donation.tracking_status);
                                  }}
                                >
                                  Mark as Received
                                </button>
                              ) : donation.tracking_status === "received" ? (
                                <button
                                  className="w-full rounded-full px-4 py-2 font-semibold transition
                                           bg-gradient-to-r from-[#4ade80] to-[#22c55e]
                                           text-white hover:-translate-y-0.5 active:scale-95
                                           ring-1 ring-white/60 shadow-[0_10px_26px_rgba(34,197,94,.18)] text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateIncomingStatus(donation.id, donation.tracking_status);
                                  }}
                                >
                                  Mark Complete
                                </button>
                              ) : (
                                <div className="text-center py-1.5 px-3 bg-[#e9ffe9] border border-[#c7f3c7] rounded-full text-xs font-semibold text-[#1c7c1c]">
                                  Complete
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {filteredIncoming.length > PAGE_SIZE && (
                    <div className="mt-4 flex flex-col items-center gap-2 text-xs text-[#6b4b2b] sm:flex-row sm:justify-between">
                      <span>
                        Showing {incomingStartIndex + 1}–
                        {Math.min(incomingStartIndex + PAGE_SIZE, filteredIncoming.length)} of{" "}
                        {filteredIncoming.length}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={incomingPage === 1}
                          onClick={() => setIncomingPage((p) => Math.max(1, p - 1))}
                          className={pagerBtn}
                        >
                          Previous
                        </button>
                        <span className="font-medium">
                          Page {incomingPage} of {incomingTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={incomingPage >= incomingTotalPages}
                          onClick={() => setIncomingPage((p) => Math.min(incomingTotalPages, p + 1))}
                          className={pagerBtn}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* OUTGOING TAB */}
        {activeTab === "outgoing" && (
          <>
            {/* Search bar */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold" style={{ color: "#6B4B2B" }}>
                Donations to Charities
              </h2>

              <div className="relative w-full max-w-xs">
                <input
                  value={searchOutgoing}
                  onChange={(e) => setSearchOutgoing(e.target.value)}
                  placeholder="Search outgoing donations..."
                  className="h-9 w-full rounded-full border border-[#f2d4b5] bg-white/95 pl-9 pr-3 text-sm text-[#4b3a28] shadow-sm outline-none focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                />
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-[#4b5563]"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    fill="none"
                  >
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16" y1="16" x2="21" y2="21" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6">
              {outgoingDonations.length === 0 ? (
                <div className="grid place-items-center h-48 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
                  <p className="text-sm" style={{ color: "#7b5836" }}>
                    No outgoing donations yet
                  </p>
                </div>
              ) : filteredOutgoing.length === 0 ? (
                <div className="grid place-items-center h-48 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
                  <p className="text-sm" style={{ color: "#7b5836" }}>
                    No donations match your search
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {outgoingPageDonations.map((donation) => {
                      const statusOrder = [
                        "preparing",
                        "ready_for_pickup",
                        "in_transit",
                        "received",
                        "complete",
                      ];
                      const currentIndex = statusOrder.indexOf(donation.tracking_status);
                      const canUpdate = currentIndex !== -1 && currentIndex < statusOrder.length - 1;

                      return (
                        <div
                          key={donation.id}
                          className="group rounded-2xl border border-[#f2e3cf] bg-white/70 shadow-[0_2px_10px_rgba(93,64,28,.05)] overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_14px_32px_rgba(191,115,39,.18)] hover:ring-1 hover:ring-[#E49A52]/35 cursor-pointer"
                          onClick={() => setSelectedDonation({ ...donation, type: "outgoing" })}
                        >
                          {/* Image header with status chip */}
                          <div className="relative h-40 overflow-hidden">
                            {donation.donation_image ? (
                              <img
                                src={`${API}/${donation.donation_image}`}
                                alt={donation.donation_name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src = `${API}/static/placeholder.png`;
                                }}
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
                                No Image
                              </div>
                            )}

                            {/* Status pill */}
                            <div
                              className={`absolute top-3 right-3 text-[11px] font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getStatusBadge(donation.tracking_status)}`}
                            >
                              {donation.tracking_status?.replace("_", " ").toUpperCase()}
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-4">
                            {/* Charity badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] grid place-items-center text-white font-bold text-xs">
                                {donation.charity_name?.[0]?.toUpperCase() || "C"}
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="text-sm font-semibold truncate"
                                  style={{ color: "#3b2a18" }}
                                >
                                  {donation.charity_name || "Charity"}
                                </div>
                                <div className="text-[11px]" style={{ color: "#7b5836" }}>
                                  Recipient
                                </div>
                              </div>
                            </div>

                            <h3 className="text-lg font-semibold" style={{ color: "#3b2a18" }}>
                              {donation.donation_name || donation.name}
                            </h3>

                            {/* Pills */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFEFD9] border border-[#f3ddc0] text-[#6b4b2b]">
                                Qty: {donation.donation_quantity || donation.quantity}
                              </span>
                              {donation.donation_type && (
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#FFF6E9] border border-[#f4e6cf] text-[#6b4b2b]">
                                  Type: {donation.donation_type}
                                </span>
                              )}
                            </div>

                            {/* Meta tiles */}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                                <div className="text-[11px] font-semibold text-[#7b5836]">
                                  Donated
                                </div>
                                <div className="text-sm text-[#3b2a18]">
                                  {new Date(donation.timestamp || donation.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                                <div className="text-[11px] font-semibold text-[#7b5836]">
                                  Expires
                                </div>
                                <div className="text-sm text-[#3b2a18]">
                                  {donation.expiration_date
                                    ? new Date(donation.expiration_date).toLocaleDateString()
                                    : "—"}
                                </div>
                              </div>
                            </div>

                            {/* Action button */}
                            <div className="mt-3">
                              {canUpdate ? (
                                <button
                                  className="w-full rounded-full px-4 py-2 font-semibold transition
                                           bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                                           text-white hover:-translate-y-0.5 active:scale-95
                                           ring-1 ring-white/60 shadow-[0_10px_26px_rgba(201,124,44,.18)] text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateOutgoingStatus(donation.id, donation.tracking_status);
                                  }}
                                >
                                  Update Status
                                </button>
                              ) : (
                                <div className="text-center py-1.5 px-3 bg-[#e9ffe9] border border-[#c7f3c7] rounded-full text-xs font-semibold text-[#1c7c1c]">
                                  Complete
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {filteredOutgoing.length > PAGE_SIZE && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        className="min-w-[80px] rounded-full border border-[#f2d4b5] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/95"
                        disabled={outgoingPage <= 1}
                        onClick={() => setOutgoingPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      <span className="text-xs sm:text-sm font-semibold text-[#6b4b2b]">
                        Page {outgoingPage} of {outgoingTotalPages}
                      </span>
                      <button
                        type="button"
                        className="min-w-[80px] rounded-full border border-[#f2d4b5] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/95"
                        disabled={outgoingPage >= outgoingTotalPages}
                        onClick={() => setOutgoingPage((p) => Math.min(outgoingTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedDonation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-backdrop"
          onClick={() => setSelectedDonation(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full mx-4 modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDonation(null)}
              className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center shadow-md text-[#6b4b2b] hover:bg-white hover:text-[#3b2a18] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image header */}
            <div className="relative h-56 overflow-hidden">
              {selectedDonation.donation_image ? (
                <img
                  src={`${API}/${selectedDonation.donation_image}`}
                  alt={selectedDonation.donation_name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `${API}/static/placeholder.png`;
                  }}
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
                  No Image Available
                </div>
              )}
              
              {/* Status badge in modal */}
              <div className="absolute top-4 left-4">
                <span className={`badge border ${getStatusBadge(selectedDonation.tracking_status)}`}>
                  {selectedDonation.tracking_status?.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* User badge */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={
                    selectedDonation.type === "incoming"
                      ? selectedDonation.donor_profile_picture
                      : selectedDonation.charity_profile_picture
                  }
                  alt={
                    selectedDonation.type === "incoming"
                      ? selectedDonation.donor_name
                      : selectedDonation.charity_name
                  }
                />
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate" style={{ color: "#3b2a18" }}>
                    {selectedDonation.type === "incoming"
                      ? selectedDonation.donor_name || "Anonymous Donor"
                      : selectedDonation.charity_name || "Charity"}
                  </div>
                  <div className="text-xs" style={{ color: "#7b5836" }}>
                    {selectedDonation.type === "incoming" ? "Donor" : "Recipient"}
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-3" style={{ color: "#3b2a18" }}>
                {selectedDonation.donation_name || selectedDonation.name}
              </h3>

              {/* Info grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#f2e3cf]">
                  <span className="text-sm text-[#7b5836]">Quantity</span>
                  <span className="text-sm font-semibold" style={{ color: "#3b2a18" }}>
                    {selectedDonation.donation_quantity || selectedDonation.quantity}
                  </span>
                </div>

                {selectedDonation.donation_type && (
                  <div className="flex items-center justify-between py-2 border-b border-[#f2e3cf]">
                    <span className="text-sm text-[#7b5836]">Type</span>
                    <span className="text-sm font-semibold" style={{ color: "#3b2a18" }}>
                      {selectedDonation.donation_type}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-[#f2e3cf]">
                  <span className="text-sm text-[#7b5836]">Donated On</span>
                  <span className="text-sm font-semibold" style={{ color: "#3b2a18" }}>
                    {new Date(
                      selectedDonation.timestamp || selectedDonation.created_at
                    ).toLocaleDateString()}
                  </span>
                </div>

                {(selectedDonation.donation_expiration || selectedDonation.expiration_date) && (
                  <div className="flex items-center justify-between py-2 border-b border-[#f2e3cf]">
                    <span className="text-sm text-[#7b5836]">Consume Before</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {new Date(
                        selectedDonation.donation_expiration || selectedDonation.expiration_date
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {selectedDonation.description && (
                  <div className="pt-3">
                    <div className="text-sm font-semibold mb-1" style={{ color: "#3b2a18" }}>
                      Description
                    </div>
                    <p className="text-sm text-[#7b5836] leading-relaxed">
                      {selectedDonation.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
