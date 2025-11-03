import React, { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
      background:#e9f9ef; border:1px solid #c7ecd5; color:#2b7a3f;
    }
    .badge.red{ background:#fff1f0; border-color:#ffd6d6; color:#c92a2a; }
    .meta-tile{ border:1px solid #f2e3cf; background:#fff; border-radius:10px; padding:.45rem .6rem; font-size:12px; color:#7b5836; }
  `}</style>
);

const CharityReceived = () => {
  const [receivedDonations, setReceivedDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]); // kept for parity (unused visually)
  const [directDonations, setDirectDonations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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

  // Fetch bakery normal donations
  useEffect(() => {
    if (!currentUser || currentUser.role !== "charity") return;

    const fetchReceivedDonations = async () => {
      try {
        const response = await fetch(`${API}/donation/received`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch received donations");
        const data = await response.json();

        const accepted = data.filter(
          (d) => d.status === "accepted" && d.tracking_status === "complete"
        );
        setReceivedDonations(accepted);
      } catch (error) {
        console.error("Failed to fetch received donations:", error);
      }
    };

    fetchReceivedDonations();
  }, [currentUser]);

  // Fetch direct donation
  useEffect(() => {
    if (!currentUser || currentUser.role !== "charity") return;

    const fetchDirectDonations = async () => {
      try {
        const response = await fetch(`${API}/direct/mine`, {
          method: "GET",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch direct donations");
        const data = await response.json();

        const filtered = data.filter(
          (donation) =>
            donation.charity_id === currentUser.id &&
            donation.btracking_status === "complete"
        );
        setDirectDonations(filtered);
      } catch (error) {
        console.error("Failed to fetch direct donations:", error);
      }
    };

    fetchDirectDonations();
  }, [currentUser]);

  // Avatar component
  const Avatar = ({ src, alt }) =>
    src ? (
      <img
        src={`${API}/${src}`}
        alt={alt}
        className="w-9 h-9 rounded-full object-cover border border-[#f2e3cf]"
      />
    ) : (
      <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-600 border border-[#f2e3cf]">
        N/A
      </div>
    );

  const Card = ({ d }) => (
    <div className="card">
      <div className="relative h-40 overflow-hidden">
        {d.image ? (
          <img
            src={`${API}/${d.image}`}
            alt={d.name}
            className="h-full w-full object-cover img-zoom"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
            No Image
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="badge">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M21 7l-8 10-5-5-5 6h18z" />
            </svg>
            Completed
          </span>
        </div>
      </div>

      <div className="p-4">
        {d.bakery_name && (
          <div className="flex items-center mb-2 gap-2">
            <Avatar src={d.bakery_profile_picture} alt={d.bakery_name} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "#3b2a18" }}>
                {d.bakery_name}
              </div>
              <div className="text-[11px]" style={{ color: "#7b5836" }}>
                Donor
              </div>
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold" style={{ color: "#3b2a18" }}>
          {d.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="pill">Qty: {d.quantity}</span>
          {d.expiration_date && (
            <span className="pill" style={{ background: "#FFF6E9" }}>
              Expires: {new Date(d.expiration_date).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {d.tracking_completed_at && (
            <div className="meta-tile">
              <div className="font-semibold">Completed</div>
              <div>{new Date(d.tracking_completed_at).toLocaleDateString()}</div>
            </div>
          )}
          {/* spacer tile for neat grid */}
          <div className="meta-tile">
            <div className="font-semibold">Type</div>
            <div>Normal</div>
          </div>
        </div>
      </div>
    </div>
  );

  const DirectCard = ({ d }) => (
    <div className="card">
      <div className="relative h-40 overflow-hidden">
        {d.image ? (
          <img
            src={`${API}/${d.image}`}
            alt={d.name}
            className="h-full w-full object-cover img-zoom"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-[#FFF6E9] text-[#b88a5a]">
            No Image
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="badge">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M21 7l-8 10-5-5-5 6h18z" />
            </svg>
            Completed
          </span>
        </div>
      </div>

      <div className="p-4">
        {d.bakery_name && (
          <div className="flex items-center mb-2 gap-2">
            <Avatar src={d.bakery_profile_picture} alt={d.bakery_name} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "#3b2a18" }}>
                {d.bakery_name}
              </div>
              <div className="text-[11px]" style={{ color: "#7b5836" }}>
                Donor
              </div>
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold" style={{ color: "#3b2a18" }}>
          {d.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="pill">Qty: {d.quantity}</span>
          {d.expiration_date && (
            <span className="pill" style={{ background: "#FFF6E9" }}>
              Expires: {new Date(d.expiration_date).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {d.btracking_completed_at && (
            <div className="meta-tile">
              <div className="font-semibold">Completed</div>
              <div>{new Date(d.btracking_completed_at).toLocaleDateString()}</div>
            </div>
          )}
          <div className="meta-tile">
            <div className="font-semibold">Type</div>
            <div>Direct</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <Styles />

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: "#6B4B2B" }}>
          Received Donations
        </h2>
      </div>

      {/* NEW: Requested Donations subtitle (matches Direct Donations styling) */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold" style={{ color: "#6B4B2B" }}>
          Requested Donations
        </h2>
      </div>

      {/* Normal Donations */}
      <div className="panel-wrap p-5 mb-8">
        {receivedDonations.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {receivedDonations.map((d) => (
              <Card key={d.id} d={d} />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center h-40 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
            <p className="text-sm" style={{ color: "#7b5836" }}>
              No donations received yet.
            </p>
          </div>
        )}
      </div>

      {/* Direct Donations */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold" style={{ color: "#6B4B2B" }}>
          Direct Donations
        </h2>
      </div>
      <div className="panel-wrap p-5">
        {directDonations.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {directDonations.map((d) => (
              <DirectCard key={d.id} d={d} />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center h-40 rounded-2xl border border-[#eadfce] bg-white/60 shadow-[0_2px_8px_rgba(93,64,28,.06)]">
            <p className="text-sm" style={{ color: "#7b5836" }}>
              No direct donations received yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharityReceived;