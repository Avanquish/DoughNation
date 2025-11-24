import React, { useEffect, useMemo, useState } from "react";
import { useSubmitGuard } from "../hooks/useDebounce";
import Swal from "sweetalert2";
import axios from "axios";
import { Button } from "@/components/ui/button";

const API = "http://localhost:8000"; // adjust if needed

// 🔹 UI CONSTANT: how many rows per page in pending table
const PENDING_PAGE_SIZE = 10;

const AdminUser = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ========= Proof viewer (UI only; no backend changes) =========
  const [proofOpen, setProofOpen] = useState(false);
  const [proofFor, setProofFor] = useState(null); // user object being viewed
  const [ackChecked, setAckChecked] = useState(false);
  const [reviewedProof, setReviewedProof] = useState(() => new Set()); // ids whose proof is reviewed

  // ========= Rejection modal =========
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // 🔹 UI: Pagination state for pending users table
  const [pendingPage, setPendingPage] = useState(0);

  // ✅ Fetch pending users (with token)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/admin/pending-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingUsers(res.data || []);
      } catch (e) {
        console.error("Error fetching pending users:", e);
      }
    })();
  }, []);

  // ✅ Fetch verified users (with token)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/admin/all-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const verifiedUsers = res.data.filter((u) => u.verified === true);
        setUsers(verifiedUsers);
      } catch (e) {
        console.error("Error fetching verified users:", e);
      }
    })();
  }, []);

  // 🔹 UI helper: length of pendingUsers
  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(pendingUsers.length / PENDING_PAGE_SIZE) - 1
    );
    setPendingPage((prev) => Math.min(prev, maxPage));
  }, [pendingUsers.length]);

  // ✅ Approve user (unchanged backend)
  const handleVerify = async (id) => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/admin/verify-user/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from pending users immediately
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));

      // Refresh verified users
      try {
        const res = await axios.get(`${API}/admin/all-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data.filter((u) => u.verified === true));
      } catch (fetchError) {
        console.error("Error fetching updated users:", fetchError);
        // Don't fail the whole operation if refresh fails
      }

      Swal.fire("Approved!", "User has been verified.", "success");
    } catch (e) {
      console.error("Error verifying user:", e);
      Swal.fire("Error", "Failed to verify user.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // ✅ Reject user - opens modal to get rejection reason
  const handleReject = (id) => {
    setRejectUserId(id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  // ✅ Confirm rejection with reason
  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      Swal.fire("Error", "Please provide a reason for rejection.", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/admin/reject-user/${rejectUserId}`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire(
        "Rejected!",
        "User has been rejected and notified via email.",
        "info"
      );
      setPendingUsers((prev) => prev.filter((u) => u.id !== rejectUserId));
      setRejectModalOpen(false);
      setRejectUserId(null);
      setRejectionReason("");
    } catch (e) {
      console.error("Error rejecting user:", e);
      Swal.fire("Error", "Failed to reject user.", "error");
    }
  };

  // ✅ Delete verified user (unchanged backend)
  const handleDeleteUser = async (id) => {
    if (isDeleting) return;
    
    const confirmDelete = await Swal.fire({
      title: "Are you sure?",
      text: "This user will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirmDelete.isConfirmed) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      Swal.fire("Deleted!", "User has been deleted.", "success");
    } catch (e) {
      console.error("Error deleting user:", e);
      Swal.fire("Error", "Failed to delete user.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ======== helpers: proof url + type detection (UI only) ========
  const getProofUrl = (u) => {
    const raw =
      u?.proof_file ??
      u?.proof_url ??
      u?.proof ??
      u?.document_url ??
      (Array.isArray(u?.documents) ? u.documents[0] : null);

    if (!raw) return null;
    const isAbs = /^https?:\/\//i.test(String(raw));
    return isAbs ? String(raw) : `${API}/${String(raw).replace(/^\/+/, "")}`;
  };
  const isImage = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
  const isPDF = (url) => /\.pdf(\?.*)?$/i.test(url);

  // 🔹 UI helper:"creation/registered" date field for user
  const getCreatedAtRaw = (u) =>
    u?.created_at ??
    u?.createdAt ??
    u?.creation_date ??
    u?.created ??
    u?.createdDate ??
    u?.registered_at ??
    u?.registeredAt ??
    null;

  // 🔹 UI helper: format registration date
  const formatCreatedDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // open viewer
  const openProof = (user) => {
    setProofFor(user);
    setAckChecked(false);
    setProofOpen(true);
  };
  const markReviewed = (userId) => {
    setReviewedProof((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    setProofOpen(false);
  };

  const proofUrl = useMemo(
    () => (proofFor ? getProofUrl(proofFor) : null),
    [proofFor]
  );

  // 🔹 UI: derived pagination values for pending users
  const totalPendingPages = Math.max(
    1,
    Math.ceil(pendingUsers.length / PENDING_PAGE_SIZE)
  );
  const paginatedPendingUsers = useMemo(() => {
    const start = pendingPage * PENDING_PAGE_SIZE;
    return pendingUsers.slice(start, start + PENDING_PAGE_SIZE);
  }, [pendingUsers, pendingPage]);

  const canPrevPending = pendingPage > 0;
  const canNextPending =
    (pendingPage + 1) * PENDING_PAGE_SIZE < pendingUsers.length;

  return (
    <div className="space-y-6">
      <div className="p-2 pt-4 sm:p-4 md:p-6">
        {/* 🔸 Pending Verification */}
        <div className="mt-3 rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] p-4 sm:p-6 mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#fff4e4]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 sm:h-5 sm:w-5 text-[#c47a27]"
                  aria-hidden="true"
                >
                  <rect
                    x="6"
                    y="4"
                    width="12"
                    height="16"
                    rx="2"
                    ry="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M10 9h4M10 12h4M10 15h2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[#4A2F17]">
                  Verification queue
                </p>
                <p className="text-xs text-[#8b6a44]">
                  New sign-ups will appear here when they need review.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-white/80 border-[#f2e3cf] text-[#6b4b2b]">
                {pendingUsers.length} item{pendingUsers.length === 1 ? "" : "s"}
              </span>

              {pendingUsers.length === 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e8f7ee] text-[#166534] border border-[#bbecd0]">
                  All clear
                </span>
              )}
            </div>
          </div>

          {pendingUsers.length > 0 ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-[#e9d7c3] bg-white/95 shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#EADBC8] text-[#4A2F17]">
                    <tr className="text-left">
                      {/* 🔹 NEW COLUMN: Registered date (before Name) */}
                      <th className="p-3 font-semibold whitespace-nowrap">
                        Registered
                      </th>
                      <th className="p-3 font-semibold">Name</th>
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Role</th>
                      <th className="p-3 font-semibold">Proof</th>
                      <th className="p-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2d4b5]">
                    {paginatedPendingUsers.map((u) => {
                      const url = getProofUrl(u);
                      const reviewed = reviewedProof.has(u.id);
                      const createdRaw = getCreatedAtRaw(u);
                      const createdDateLabel = formatCreatedDate(createdRaw);

                      return (
                        <tr
                          key={u.id}
                          className="odd:bg-white even:bg-white/80 hover:bg-[#fff6ec] transition-colors"
                        >
                          {/* 🔹 Cell for Registered date */}
                          <td className="p-3 align-top">
                            {createdDateLabel ? (
                              <span className="text-xs font-semibold text-[#4A2F17] whitespace-nowrap">
                                {createdDateLabel}
                              </span>
                            ) : (
                              <span className="text-xs text-[#8b6a44]">—</span>
                            )}
                          </td>

                          <td className="p-3 text-[#3b2a18]">{u.name}</td>
                          <td className="p-3 text-[#3b2a18]">{u.email}</td>
                          <td className="p-3 text-[#3b2a18]">{u.role}</td>
                          <td className="p-3">
                            {url ? (
                              <div className="flex items-center gap-3">
                                {isImage(url) ? (
                                  <button
                                    onClick={() => openProof(u)}
                                    className="block"
                                    title="View proof"
                                  >
                                    <img
                                      src={url}
                                      alt="Proof"
                                      className="h-14 w-20 object-cover rounded-md border border-[#f2e3cf] bg-white hover:ring-2 hover:ring-[#E49A52] transition"
                                    />
                                  </button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openProof(u)}
                                    className="rounded-full"
                                  >
                                    View Proof
                                  </Button>
                                )}
                                {reviewed ? (
                                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#e8f7ee] text-[#166534] ring-1 ring-[#bbecd0]">
                                    Reviewed
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#fff7e6] text-[#8a5a25] ring-1 ring-[#f3ddc0]">
                                    Not reviewed
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#7b5836]">No file</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={() => reviewed && handleVerify(u.id)}
                                disabled={!reviewed}
                                className={`rounded-full ${
                                  reviewed
                                    ? "bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] text-white hover:brightness-105"
                                    : "bg-gray-300 text-white"
                                }`}
                                title={
                                  reviewed
                                    ? "Approve this user"
                                    : "View and mark the proof as reviewed first"
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleReject(u.id)}
                                className="rounded-full bg-gradient-to-r from-[#ef4444] via-[#dc2626] to-[#b91c1c] text-white hover:brightness-105"
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-dashed border-[#e9d7c3] bg-gradient-to-br from-[#FFFDF8] via-[#FFF7EB] to-[#FFECD5] px-6 py-10 text-center shadow-inner">
              <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#fff4e4]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 sm:h-7 sm:w-7 text-[#c47a27]"
                  aria-hidden="true"
                >
                  <rect
                    x="6"
                    y="4"
                    width="12"
                    height="16"
                    rx="2"
                    ry="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M10 9h4M10 12h4M10 15h2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#4A2F17]">
                You’re all caught up
              </h3>
              <p className="mt-1 text-sm text-[#6b4b2b]/80">
                There are currently no accounts waiting for verification.
              </p>
              <p className="mt-4 text-xs text-[#b07b3a]">
                Keep this page open – new requests will show up here
                automatically.
              </p>
            </div>
          )}

          {/* 🔹 UI: Pagination footer (Prev / Next) */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[#8b6a44]">
              Page{" "}
              <span className="font-semibold">
                {pendingUsers.length === 0 ? 1 : pendingPage + 1}
              </span>{" "}
              of <span className="font-semibold">{totalPendingPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => canPrevPending && setPendingPage((p) => p - 1)}
                disabled={!canPrevPending}
                className="rounded-full px-4 py-1 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-[#f2d4b5] text-[#6b4b2b]"
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => canNextPending && setPendingPage((p) => p + 1)}
                disabled={!canNextPending}
                className="rounded-full px-4 py-1 text-xs sm:text-sm bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Proof Viewer Modal (UI only) ===== */}
      {proofOpen && proofFor && (
        <div
          className="fixed inset-0 z-50 
               flex items-start sm:items-center justify-center
               px-3 sm:px-4 pt-20 pb-6 sm:py-10"
        >
          {" "}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setProofOpen(false)}
          />
          <div
            className="relative z-10 
             w-full max-w-xs sm:max-w-xl lg:max-w-3xl
             rounded-3xl bg-white shadow-2xl ring-1 ring-[#e9d7c3]
             overflow-hidden max-h-[75vh] sm:max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#f2e3cf] bg-[#FFF7ED]">
              <h3 className="text-base sm:text-lg font-extrabold text-[#6b4b2b]">
                Proof – {proofFor.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#7b5836] truncate">
                {proofFor.email}
              </p>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 flex-1 overflow-auto bg-white">
              {proofUrl ? (
                isImage(proofUrl) ? (
                  <img
                    src={proofUrl}
                    alt="Proof"
                    className="max-h-[45vh] sm:max-h-[60vh] w-full object-contain mx-auto rounded-xl border border-[#f2e3cf]"
                  />
                ) : isPDF(proofUrl) ? (
                  <iframe
                    src={proofUrl}
                    title="Proof PDF"
                    className="w-full h-[45vh] sm:h-[60vh] rounded-xl border border-[#f2e3cf]"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-[#6b4b2b] mb-3">
                      This file can be opened in a new tab.
                    </p>
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-semibold
                           bg-gradient-to-r from-[#6b4b2b] via-[#5b3e21] to-[#3b2a18]"
                    >
                      Open Proof
                    </a>
                  </div>
                )
              ) : (
                <p className="text-center text-[#7b5836]">No proof provided.</p>
              )}
            </div>

            {/* Footer / actions */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-[#f2e3cf] bg-[#FFF9F2] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-start gap-2 text-xs sm:text-sm text-[#3b2a18]">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-[2px]"
                />
                <span className="leading-snug">
                  I have reviewed this proof.
                </span>
              </label>

              <div className="flex items-center gap-2 sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setProofOpen(false)}
                  className="rounded-full px-4 py-2 text-xs sm:text-sm"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (!ackChecked) return;
                    markReviewed(proofFor.id);
                  }}
                  disabled={!ackChecked}
                  className={`rounded-full px-4 py-2 text-xs sm:text-sm ${
                    ackChecked
                      ? "bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] text-white"
                      : "bg-gray-300 text-white"
                  }`}
                >
                  Mark as reviewed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== /Modal ===== */}

      {/* ===== Rejection Reason Modal ===== */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#eadfce] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#f2e3cf] bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <h3 className="text-base sm:text-lg font-semibold text-[#4A2F17]">
                Reject Account Registration
              </h3>
              <p className="text-xs text-[#7b5836] mt-1">
                Please provide a reason for rejecting this account
              </p>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#6b4b2b] mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this account is being rejected..."
                  rows={5}
                  className="w-full rounded-xl border border-[#f2d4b5] bg-white/95 p-3 text-sm
                           shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]
                           outline-none resize-none"
                />
                <p className="text-xs text-[#8b6a44] mt-1">
                  This reason will be sent to the user via email.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#f2e3cf] bg-[#FFF9F2] flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectUserId(null);
                  setRejectionReason("");
                }}
                className="rounded-full px-4 py-2 text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={!rejectionReason.trim()}
                className={`rounded-full px-4 py-2 text-sm ${
                  rejectionReason.trim()
                    ? "bg-gradient-to-r from-[#ef4444] via-[#dc2626] to-[#b91c1c] text-white hover:brightness-105"
                    : "bg-gray-300 text-white cursor-not-allowed"
                }`}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ===== /Rejection Modal ===== */}
    </div>
  );
};

export default AdminUser;