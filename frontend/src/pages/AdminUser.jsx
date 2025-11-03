import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { Button } from "@/components/ui/button";

const API = "https://api.doughnationhq.cloud"; // adjust if needed

const AdminUser = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);

  // ========= Proof viewer (UI only; no backend changes) =========
  const [proofOpen, setProofOpen] = useState(false);
  const [proofFor, setProofFor] = useState(null); // user object being viewed
  const [ackChecked, setAckChecked] = useState(false);
  const [reviewedProof, setReviewedProof] = useState(() => new Set()); // ids whose proof is reviewed

  // ✅ Fetch pending users (with token)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/pending-users`, {
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
        const res = await axios.get(`${API}/all-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const verifiedUsers = res.data.filter((u) => u.verified === true);
        setUsers(verifiedUsers);
      } catch (e) {
        console.error("Error fetching verified users:", e);
      }
    })();
  }, []);

  // ✅ Approve user (unchanged backend)
  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/verify-user/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire("Approved!", "User has been verified.", "success");
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      // refresh verified users (same as your original)
      const res = await axios.get(`${API}/all-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.filter((u) => u.verified === true));
    } catch (e) {
      console.error("Error verifying user:", e);
      Swal.fire("Error", "Failed to verify user.", "error");
    }
  };

  // ✅ Reject user (unchanged backend)
  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/reject-user/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire("Rejected!", "User has been rejected.", "info");
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      console.error("Error rejecting user:", e);
      Swal.fire("Error", "Failed to reject user.", "error");
    }
  };

  // ✅ Delete verified user (unchanged backend)
  const handleDeleteUser = async (id) => {
    const confirmDelete = await Swal.fire({
      title: "Are you sure?",
      text: "This user will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      Swal.fire("Deleted!", "User has been deleted.", "success");
    } catch (e) {
      console.error("Error deleting user:", e);
      Swal.fire("Error", "Failed to delete user.", "error");
    }
  };

  // ======== helpers: proof url + type detection (UI only) ========
  const getProofUrl = (u) => {
    // your original used u.proof_file — keep that, but accept a few aliases safely
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

  return (
    <div className="space-y-6">
      <div className="p-2 pt-4 sm:p-4 md:p-6">
        {/* 🔸 Pending Verification */}
        <div className="mt-3 rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#FFF9F1] via-[#FFF7ED] to-[#FFEFD9] shadow-[0_2px_8px_rgba(93,64,28,.06)] p-6 mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#6b4b2b]">
              User Verification
            </h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-white/80 border-[#f2e3cf] text-[#6b4b2b]">
              {pendingUsers.length} item{pendingUsers.length === 1 ? "" : "s"}
            </span>
          </div>

          {pendingUsers.length > 0 ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-[#e9d7c3] bg-white/95 shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#EADBC8] text-[#4A2F17]">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Name</th>
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Role</th>
                      <th className="p-3 font-semibold">Proof</th>
                      <th className="p-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2d4b5]">
                    {pendingUsers.map((u) => {
                      const url = getProofUrl(u);
                      const reviewed = reviewedProof.has(u.id);
                      return (
                        <tr
                          key={u.id}
                          className="odd:bg-white even:bg-white/80 hover:bg-[#fff6ec] transition-colors"
                        >
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
                                className={`rounded-full ${reviewed
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
            <p className="text-sm text-[#6b4b2b]/80">No pending users for verification.</p>
          )}
        </div>
      </div>

      {/* ===== Proof Viewer Modal (UI only) ===== */}
      {proofOpen && proofFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setProofOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-[#e9d7c3] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f2e3cf] bg-[#FFF7ED]">
              <h3 className="text-lg font-extrabold text-[#6b4b2b]">
                Proof – {proofFor.name}
              </h3>
              <p className="text-xs text-[#7b5836] truncate">
                {proofFor.email}
              </p>
            </div>

            <div className="p-5 max-h-[70vh] overflow-auto bg-white">
              {proofUrl ? (
                isImage(proofUrl) ? (
                  <img
                    src={proofUrl}
                    alt="Proof"
                    className="max-h-[60vh] w-auto mx-auto rounded-lg border border-[#f2e3cf]"
                  />
                ) : isPDF(proofUrl) ? (
                  <iframe
                    src={proofUrl}
                    title="Proof PDF"
                    className="w-full h-[60vh] rounded-lg border border-[#f2e3cf]"
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
                      className="inline-flex items-center px-4 py-2 rounded-full text-white font-semibold
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

            <div className="px-5 py-4 border-t border-[#f2e3cf] bg-white flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[#3b2a18]">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                />
                I have reviewed this proof.
              </label>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setProofOpen(false)}
                  className="rounded-full"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (!ackChecked) return;
                    markReviewed(proofFor.id);
                  }}
                  disabled={!ackChecked}
                  className={`rounded-full ${ackChecked
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
    </div>
  );
};

export default AdminUser;