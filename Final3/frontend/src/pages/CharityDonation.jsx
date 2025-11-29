import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

// Helpers (using server date)
const isExpired = (dateStr, serverDate) => {
  if (!dateStr || !serverDate) return false;
  const d = new Date(dateStr);
  const [year, month, day] = serverDate.split("-").map(Number);
  const t = new Date(year, month - 1, day);
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < t;
};

const daysUntil = (dateStr, serverDate) => {
  if (!dateStr || !serverDate) return null;
  const d = new Date(dateStr);
  const [year, month, day] = serverDate.split("-").map(Number);
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

const statusChip = (d, serverDate) => {
  const st = statusOf(d, serverDate);
  if (st === "expired") {
    return {
      text: "Expired",
      cls: "bg-[#fff1f0] border-[#ffd6d6] text-[#c92a2a]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      ),
    };
  }
  if (st === "soon") {
    const dleft = daysUntil(d.expiration_date, serverDate);
    return {
      text: dleft === 1 ? "Consume Before 1 day" : `Consume Before ${dleft} days`,
      cls: "bg-[#fff8e6] border-[#ffe7bf] text-[#8a5a25]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M12 1a11 11 0 1011 11A11.013 11.013 0 0012 1zm1 11H7V6h2v4h4z" />
        </svg>
      ),
    };
  }
  return {
    text: "Fresh",
    cls: "bg-[#e9f9ef] border-[#c7ecd5] text-[#2b7a3f]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M21 7l-8 10-5-5-5 6h18z" />
      </svg>
    ),
  };
};

// Styles
const Styles = () => (
  <style>{`
    .card-bouncy{
      position: relative;
      z-index: 0;
      overflow: visible;
      border:1px solid #f2e3cf;
      border-radius:16px;
      background:rgba(255,255,255,.7);
      box-shadow:0 2px 10px rgba(93,64,28,.05);
      transition:
        transform .24s cubic-bezier(.2,.8,.2,1),
        box-shadow .24s ease,
        border-color .25s ease;
      will-change: transform;
    }
    .card-bouncy::before{
      content:"";
      position:absolute;
      inset:-6px; /* thin border of the background tint */
      border-radius:inherit;
      background:
        radial-gradient(360px 220px at 88% 18%, rgba(247,193,124,.32), rgba(247,193,124,0) 62%),
        linear-gradient(135deg, rgba(255,232,200,.35), rgba(255,255,255,0));
      opacity:0;
      transform:scale(.99);
      transition:opacity .22s ease, transform .22s ease;
      z-index:-1;
      pointer-events:none;
    }
    .card-bouncy:hover::before{ opacity:1; transform:scale(1); }
    .card-bouncy:hover{
      transform: translateY(-5px) scale(1.015);
      box-shadow:0 14px 32px rgba(191,115,39,.18);
      border-color:#eadfce;
    }
    .donation-img{
      transition: transform .5s cubic-bezier(.2,.8,.2,1), filter .5s ease;
      border-radius:12px;
    }
    .card-bouncy:hover .donation-img{ transform:scale(1.05); filter:saturate(1.02); }

    /* Zoom animation for modal */
  @keyframes zoomInModal {
    0% {
      opacity: 0;
      transform: scale(0.85);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  .zoom-modal {
    animation: zoomInModal 0.3s ease forwards;
  }
  `}</style>
);

export default function CharityDonation() {
  const [donations, setDonations] = useState([]);
  const [requestedDonations, setRequestedDonations] = useState({}); // donation_id -> request_id
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [currentServerDate, setCurrentServerDate] = useState(null);
  const [quantityModal, setQuantityModal] = useState(null);

  // pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Fetch server date on mount
  useEffect(() => {
    const fetchServerDate = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/server-time`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentServerDate(res.data.date);
      } catch (err) {
        console.error("Failed to fetch server date:", err);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        setCurrentServerDate(`${yyyy}-${mm}-${dd}`);
      }
    };

    fetchServerDate();
    const interval = setInterval(fetchServerDate, 60 * 60 * 1000); // Refresh every hour
    return () => clearInterval(interval);
  }, []);

  // Fetching data
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Available donations
      const res = await axios.get(`${API}/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonations(res.data || []);

      // My pending requests
      const pendingRes = await axios.get(`${API}/donation/my_requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const map = {};
      (pendingRes.data || []).forEach((req) => {
        map[req.donation_id] = req.id;
      });
      setRequestedDonations(map);
      localStorage.setItem("requestedDonations", JSON.stringify(map));
    } catch (err) {
      console.error(err);
      // Don't show error popup on auto-refresh
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 3 seconds (was 1 second - too fast!)
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, []);

  // keep page within bounds when donations change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(donations.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [donations.length, page]);

  // Request donation
  const requestDonation = async (donation, requestedQty) => {
  console.log("DONATION OBJECT BEING REQUESTED:", donation);
  console.log("bakery_inventory_id on donation:", donation.bakery_inventory_id);
  console.log("Requested Quantity:", requestedQty);
  
  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${API}/donation/request`,
      { 
        donation_id: donation.id, 
        bakery_id: donation.bakery_id,
        requested_quantity: requestedQty // Send the requested quantity
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const requestId = res.data.request_id;

    const requestRes = await axios.get(`${API}/donation/my_requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const newRequest = requestRes.data.find((req) => req.id === requestId);

    setRequestedDonations((prev) => {
      const updated = { ...prev, [donation.id]: requestId };
      return updated;
    });

    const donationCardData = {
      ...newRequest,
      id: newRequest.id,
      product_name: donation.name,
      name: donation.name,
      image: donation.image,
      quantity: requestedQty, // Use the requested quantity here
      expiration_date: donation.expiration_date,
      bakery_id: donation.bakery_id,
      bakery_name: donation.bakery_name,
      bakery_profile_picture: donation.bakery_profile_picture,
      bakery_inventory_id: newRequest.bakery_inventory_id,
    };

    const bakeryInfo = {
      id: donation.bakery_id,
      name: donation.bakery_name,
      profile_picture: donation.bakery_profile_picture || null,
    };

    localStorage.setItem("open_chat_with", JSON.stringify(bakeryInfo));
    localStorage.setItem("send_donation", JSON.stringify(donationCardData));
    window.dispatchEvent(new Event("open_chat"));

    Swal.fire("Success", "Donation request sent!", "success");
  } catch (err) {
    console.error(err);
    Swal.fire(
      "Error",
      err.response?.data?.detail || "Failed to request donation",
      "error"
    );
  }
};

  const cancelRequest = async (donation_id) => {
    const request_id = requestedDonations[donation_id];
    if (!request_id) return;

    try {
      const token = localStorage.getItem("token");
      
      // Get charity_id from token
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const charity_id = decoded.sub;
      
      await axios.post(
        `${API}/donation/cancel/${request_id}`,
        { charity_id: charity_id }, // Pass charity_id to match backend expectations
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRequestedDonations((prev) => {
        const updated = { ...prev };
        delete updated[donation_id];
        localStorage.setItem("requestedDonations", JSON.stringify(updated));
        return updated;
      });

      // Trigger event to update messages with cancelledBy: "charity"
      window.dispatchEvent(
        new CustomEvent("donation_cancelled", { 
          detail: { 
            donation_id, 
            request_id,
            cancelledBy: "charity"  // <-- ADD THIS
          } 
        })
      );

      Swal.fire("Success", "Donation request canceled", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to cancel donation request", "error");
    }
  };

  // Listen for highlight_donation event (from notification)
  useEffect(() => {
    const handleHighlightDonation = (e) => {
      const donationId = Number(e.detail?.donation_id);
      console.log(
        "🟢 [Event Received] highlight_donation fired with ID:",
        donationId
      );
      if (!donationId) return;
      console.warn(
        "⚠️ [HighlightDonation] No donation_id found in event detail."
      );

      const targetDonation = donations.find((d) => Number(d.id) === donationId);
      console.log("🔍 [HighlightDonation] Searching donation in main list...");
      if (!targetDonation) return;

      setSelectedDonation(targetDonation);

      const element = document.getElementById(`donation-${donationId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("animate-highlight");
        setTimeout(() => element.classList.remove("animate-highlight"), 1500);
      }
    };

    window.addEventListener("highlight_donation", handleHighlightDonation);
    return () =>
      window.removeEventListener("highlight_donation", handleHighlightDonation);
  }, [donations]);

  //Cancel is auto trigger if bakery click cancel in cards
  useEffect(() => {
    const handleExternalCancel = (e) => {
      const donationId = Number(e?.detail?.donation_id);
      if (!donationId) return;
      console.log("Received external cancel event for donation:", donationId);

      // Remove request mapping if present
      setRequestedDonations((prev) => {
        const updated = { ...prev };
        if (updated.hasOwnProperty(donationId)) {
          delete updated[donationId];
        }
        // keep localStorage sync if you still use it elsewhere (optional)
        try {
          localStorage.setItem("requestedDonations", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Remove donation card from visible list
      setDonations((prev) =>
        prev.filter((d) => Number(d.id) !== Number(donationId))
      );

      // Optional small feedback
      Swal.fire("Info", "Donation request canceled", "info");
    };

    window.addEventListener(
      "donation_cancelled_by_messages",
      handleExternalCancel
    );
    window.addEventListener("donation_cancelled", handleExternalCancel);
    return () => {
      window.removeEventListener(
        "donation_cancelled_by_messages",
        handleExternalCancel
      );
      window.removeEventListener("donation_cancelled", handleExternalCancel);
    };
  }, []);

  // pagination derived values
  const totalPages = Math.max(1, Math.ceil(donations.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageDonations = donations.slice(startIndex, startIndex + PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pagerBtn =
    "min-w-[80px] rounded-full border border-[#f2d4b5] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#6b4b2b] shadow-sm hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/95";

  return (
    <>
      <Styles />

      {/* HEADER + CONTENT PANEL */}
      <div
        className={`space-y-4 p-6 transition-all duration-300 ${
          selectedDonation ? "blur-sm" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-3xl sm:text-4xl font-extrabold"
            style={{ color: "#6B4B2B" }}
          >
            Available Donations
          </h2>
        </div>

        <div
          className="
            rounded-3xl border border-[#eadfce]
            bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9]
            shadow-[0_2px_8px_rgba(93,64,28,.06)]
            p-6
          "
        >
          {donations.length === 0 ? (
            <div
              className="grid place-items-center h-48 rounded-2xl border border-[#eadfce]
                         bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]"
            >
              <p className="text-sm" style={{ color: "#7b5836" }}>
                No Available Donation
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {pageDonations.map((donation) => {
                  const requestId = requestedDonations[donation.id];
                  const isRequested = !!requestId;
                  const chip = statusChip(donation, currentServerDate);

                  return (
                    <div
                      key={donation.id}
                      id={`donation-${donation.id}`}
                      className={`
                        card-bouncy group overflow-hidden
                        hover:ring-1 hover:ring-[#E49A52]/35 donation-card cursor-pointer
                      `}
                      onClick={() => setSelectedDonation(donation)}
                    >
                      {/* Image header with status chip */}
                      <div className="relative h-40 overflow-hidden">
                        {donation.image ? (
                          <img
                            src={`${API}/${donation.image}`}
                            alt={donation.name}
                            className="h-full w-full object-cover donation-img"
                            onError={(e) => {
                              e.currentTarget.src = `${API}/static/placeholder.png`;
                            }}
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
                            No Image
                          </div>
                        )}

                        <div
                          className={`
                          absolute top-3 right-3 text-[11px] font-bold
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${chip.cls}
                        `}
                        >
                          {chip.icon}
                          {chip.text}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4">
                        {/* Bakery badge */}
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              donation.bakery_profile_picture
                                ? `${API}/${donation.bakery_profile_picture}`
                                : `${API}/uploads/placeholder.png`
                            }
                            alt={donation.bakery_name}
                            className="h-10 w-10 rounded-full object-cover border border-[#f2e3cf]"
                          />
                          <div className="min-w-0">
                            <div
                              className="text-sm font-semibold truncate"
                              style={{ color: "#3b2a18" }}
                            >
                              {donation.bakery_name}
                            </div>
                            <div
                              className="text-[11px]"
                              style={{ color: "#7b5836" }}
                            >
                              Donor
                            </div>
                          </div>
                        </div>

                        <h3
                          className="text-lg font-semibold mt-3"
                          style={{ color: "#3b2a18" }}
                        >
                          {donation.name}
                        </h3>

                        {/* meta chips */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                                     bg-[#FFEFD9] border border-[#f3ddc0]"
                            style={{ color: "#6b4b2b" }}
                          >
                            Qty: {donation.quantity}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                                     bg-[#FFF6E9] border border-[#f4e6cf]"
                            style={{ color: "#6b4b2b" }}
                          >
                            Threshold: {donation.threshold ?? "—"}
                          </span>
                        </div>

                        {/* dates grid */}
                        <div
                          className="mt-3 grid grid-cols-2 gap-2 text-xs"
                          style={{ color: "#7b5836" }}
                        >
                          <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                            <div className="font-semibold">Created</div>
                            <div>
                              {donation.creation_date
                                ? new Date(
                                    donation.creation_date
                                  ).toLocaleDateString()
                                : "—"}
                            </div>
                          </div>
                          <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                            <div className="font-semibold">Consume Before</div>
                            <div>
                              {donation.expiration_date
                                ? new Date(
                                    donation.expiration_date
                                  ).toLocaleDateString()
                                : "—"}
                            </div>
                          </div>
                        </div>

                        {/* description */}
                        {donation.description && (
                          <p
                            className="mt-3 text-sm"
                            style={{ color: "#7b5836" }}
                          >
                            {donation.description}
                          </p>
                        )}
                        {donation.distance_km !== null && (
                          <span className="text-gray-400">
                            Approx: {donation.distance_km} km
                          </span>
                        )}

                        {/* actions */}
                        <div className="mt-4 space-y-2">
                          <button
                            className={`w-full rounded-full px-4 py-2 font-semibold transition
                                      ring-1 ring-white/60 shadow-[0_10px_26px_rgba(201,124,44,.18)]
                                      ${
                                        isRequested
                                          ? "bg-gradient-to-r from-[#D9D9D9] to-[#BDBDBD] text-white cursor-not-allowed"
                                          : "bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white hover:-translate-y-0.5 active:scale-95"
                                      }`}
                            disabled={isRequested}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuantityModal({ donation, requestedQty: 1 });
                            }}
                          >
                            {isRequested ? "Request Sent" : "Request Donation"}
                          </button>

                          {isRequested && (
                            <button
                              className="w-full rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-4 py-2 shadow-sm hover:bg-white/90 transition"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                cancelRequest(donation.id);
                              }}
                            >
                              Cancel Request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {donations.length > 0 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    className={pagerBtn}
                    disabled={!canPrev}
                    onClick={() => canPrev && setPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="text-xs sm:text-sm font-semibold text-[#6b4b2b]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className={pagerBtn}
                    disabled={!canNext}
                    onClick={() => canNext && setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedDonation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedDonation(null)} // close when clicking outside
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()} // prevent close on inner click
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDonation(null)}
              className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-md rounded-full p-1 shadow-md text-[#6b4b2b] hover:text-[#3b2a18] transition"
            >
              ✕
            </button>

            {/* Image header with status chip */}
            <div className="relative h-48 overflow-hidden">
              {selectedDonation.image ? (
                <img
                  src={`${API}/${selectedDonation.image}`}
                  alt={selectedDonation.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `${API}/static/placeholder.png`;
                  }}
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
                  No Image
                </div>
              )}

              {/* Status chip (same logic as main donation cards) */}
              {(() => {
                const chip = statusChip(selectedDonation, currentServerDate);
                return (
                  <div
                    className={`absolute top-3 right-3 text-[11px] font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${chip.cls}`}
                  >
                    {chip.icon}
                    {chip.text}
                  </div>
                );
              })()}
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Bakery info */}
              <div className="flex items-center gap-2">
                <img
                  src={
                    selectedDonation.bakery_profile_picture
                      ? `${API}/${selectedDonation.bakery_profile_picture}`
                      : `${API}/uploads/placeholder.png`
                  }
                  alt={selectedDonation.bakery_name}
                  className="h-10 w-10 rounded-full object-cover border border-[#f2e3cf]"
                />
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: "#3b2a18" }}
                  >
                    {selectedDonation.bakery_name}
                  </div>
                  <div className="text-[11px]" style={{ color: "#7b5836" }}>
                    Donor
                  </div>
                </div>
              </div>

              <h3
                className="text-lg font-semibold mt-3"
                style={{ color: "#3b2a18" }}
              >
                {selectedDonation.name}
              </h3>

              {/* Meta chips */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                            bg-[#FFEFD9] border border-[#f3ddc0]"
                  style={{ color: "#6b4b2b" }}
                >
                  Qty: {selectedDonation.quantity}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                            bg-[#FFF6E9] border border-[#f4e6cf]"
                  style={{ color: "#6b4b2b" }}
                >
                  Threshold: {selectedDonation.threshold ?? "—"}
                </span>
              </div>

              {/* Dates grid */}
              <div
                className="mt-3 grid grid-cols-2 gap-2 text-xs"
                style={{ color: "#7b5836" }}
              >
                <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                  <div className="font-semibold">Created</div>
                  <div>
                    {selectedDonation.creation_date
                      ? new Date(
                          selectedDonation.creation_date
                        ).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                  <div className="font-semibold">Consume Before</div>
                  <div>
                    {selectedDonation.expiration_date
                      ? new Date(
                          selectedDonation.expiration_date
                        ).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedDonation.description && (
                <p className="mt-3 text-sm" style={{ color: "#7b5836" }}>
                  {selectedDonation.description}
                </p>
              )}
              {selectedDonation.distance_km !== null && (
                <span className="text-gray-400 text-xs">
                  Approx: {selectedDonation.distance_km} km
                </span>
              )}

              {/* Action buttons */}
              <div className="mt-4 space-y-2">
                <button
                  className="w-full rounded-full px-4 py-2 bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327]
                            text-white font-semibold shadow-md hover:-translate-y-0.5 active:scale-95 transition"
                  onClick={() => {
                    setQuantityModal({ donation: selectedDonation, requestedQty: 1 });
                    setSelectedDonation(null);
                  }}
                >
                  Request Donation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Quantity Modal */}
      {quantityModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setQuantityModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full mx-4 transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setQuantityModal(null)}
              className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-md rounded-full p-1 shadow-md text-[#6b4b2b] hover:text-[#3b2a18] transition"
            >
              ✕
            </button>

            <div className="p-6">
              <h3 className="text-xl font-bold text-[#3b2a18] mb-4">
                Request Quantity
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6b4b2b] mb-2">
                    Product: {quantityModal.donation.name}
                  </label>
                  <p className="text-xs text-[#7b5836]">
                    Available: {quantityModal.donation.quantity} units
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6b4b2b] mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={quantityModal.donation.quantity}
                      value={quantityModal.requestedQty}
                      onChange={(e) => {
                        const val = e.target.value;
                        
                        // Allow empty string for deletion
                        if (val === '') {
                          setQuantityModal({ ...quantityModal, requestedQty: '' });
                          return;
                        }
                        
                        let num = parseInt(val);
                        
                        // Auto-cap if exceeds max
                        if (num > quantityModal.donation.quantity) {
                          num = quantityModal.donation.quantity;
                        }
                        
                        setQuantityModal({ ...quantityModal, requestedQty: num });
                      }}
                      onBlur={(e) => {
                        // Set to 1 if empty when user leaves the field
                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                          setQuantityModal({ ...quantityModal, requestedQty: 1 });
                        }
                      }}
                      className="flex-1 rounded-lg border border-[#f2e3cf] px-3 py-2 text-[#3b2a18] focus:outline-none focus:ring-2 focus:ring-[#E49A52]"
                    />
                    <button
                      onClick={() => setQuantityModal({ ...quantityModal, requestedQty: quantityModal.donation.quantity })}
                      className="px-4 py-2 bg-[#FFF6E9] border border-[#f2e3cf] rounded-lg text-[#6b4b2b] font-semibold hover:bg-[#FFEFD9] transition"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setQuantityModal(null)}
                    className="flex-1 rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-4 py-2 shadow-sm hover:bg-white/90 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      requestDonation(quantityModal.donation, quantityModal.requestedQty);
                      setQuantityModal(null);
                    }}
                    className="flex-1 rounded-full px-4 py-2 bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white font-semibold shadow-md hover:-translate-y-0.5 active:scale-95 transition"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
