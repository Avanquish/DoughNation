import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = "https://api.doughnationhq.cloud/";

// Helpers
const isExpired = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= today;
};
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};
const statusOf = (donation) => {
  const d = daysUntil(donation?.expiration_date);
  if (d === null) return "fresh";
  if (d <= 0) return "expired";
  if (d <= (Number(donation?.threshold) || 0)) return "soon";
  return "fresh";
};
const statusChip = (d) => {
  const st = statusOf(d);
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
    const dleft = daysUntil(d.expiration_date);
    return {
      text: dleft === 1 ? "Expires in 1 day" : `Expires in ${dleft} days`,
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
  `}</style>
);

export default function CharityDonation() {
  const [donations, setDonations] = useState([]);
  const [requestedDonations, setRequestedDonations] = useState({}); // donation_id -> request_id

// Fetching data
  useEffect(() => {
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
        Swal.fire("Error", "Failed to fetch donations", "error");
      }
    };

    fetchData();
  }, []);

  // Request donation
  const requestDonation = async (donation) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/donation/request`,
        { donation_id: donation.id, bakery_id: donation.bakery_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const requestId = res.data.request_id;
      setRequestedDonations((prev) => {
        const updated = { ...prev, [donation.id]: requestId };
        localStorage.setItem("requestedDonations", JSON.stringify(updated));
        return updated;
      });

      // Handoff to Messenger
      const bakeryInfo = {
        id: donation.bakery_id,
        name: donation.bakery_name,
        profile_picture: donation.bakery_profile_picture || null,
      };
      localStorage.setItem("open_chat_with", JSON.stringify(bakeryInfo));
      localStorage.setItem("send_donation", JSON.stringify(donation));
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
      await axios.post(
        `${API}/donation/cancel/${request_id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRequestedDonations((prev) => {
        const updated = { ...prev };
        delete updated[donation_id];
        localStorage.setItem("requestedDonations", JSON.stringify(updated));
        return updated;
      });

      window.dispatchEvent(
        new CustomEvent("donation_cancelled", { detail: { donation_id } })
      );

      Swal.fire("Success", "Donation request canceled", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to cancel donation request", "error");
    }
  };

  return (
    <>
      <Styles />

      {/* HEADER + CONTENT PANEL */}
      <div className="space-y-4 p-6">
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {donations.map((donation) => {
                const requestId = requestedDonations[donation.id];
                const isRequested = !!requestId;
                const chip = statusChip(donation);

                return (
                  <div
                    key={donation.id}
                    className={`
                      card-bouncy group overflow-hidden
                      hover:ring-1 hover:ring-[#E49A52]/35
                    `}
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
                          <div className="text-[11px]" style={{ color: "#7b5836" }}>
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
                              ? new Date(donation.creation_date).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                        <div className="rounded-lg border border-[#f2e3cf] bg-white/60 p-2">
                          <div className="font-semibold">Expires</div>
                          <div>
                            {donation.expiration_date
                              ? new Date(donation.expiration_date).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {/* description */}
                      {donation.description && (
                        <p className="mt-3 text-sm" style={{ color: "#7b5836" }}>
                          {donation.description}
                        </p>
                      )}

                      {/* actions (logic unchanged) */}
                      <div className="mt-4 space-y-2">
                        <button
                          className={`w-full rounded-full px-4 py-2 font-semibold transition
                                      ring-1 ring-white/60 shadow-[0_10px_26px_rgba(201,124,44,.18)]
                                      ${isRequested
                                        ? "bg-gradient-to-r from-[#D9D9D9] to-[#BDBDBD] text-white cursor-not-allowed"
                                        : "bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white hover:-translate-y-0.5 active:scale-95"
                                      }`}
                          disabled={isRequested}
                          onClick={() => requestDonation(donation)}
                        >
                          {isRequested ? "Request Sent" : "Request Donation"}
                        </button>

                        {isRequested && (
                          <button
                            className="w-full rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-4 py-2 shadow-sm hover:bg-white/90 transition"
                            onClick={() => cancelRequest(donation.id)}
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
          )}
        </div>
      </div>
    </>
  );
}