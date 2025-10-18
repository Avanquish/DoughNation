import { useState } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Feedback({ donationId, isDirect, onSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [files, setFiles] = useState([]); // store images/videos

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("message", message);
      formData.append("rating", rating);

      // append all selected files
      files.forEach((file) => {
        formData.append("files", file);
      });

      await fetch(
        `${API}/${isDirect ? "direct" : "donation"}/feedback/${donationId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      onSubmitted?.(); // update parent
      setIsOpen(false);
      setMessage("");
      setRating(5);
      setFiles([]);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const modalRoot = document.getElementById("modal-root") || document.body;

  return (
    <>
      {/* Trigger button — match system (BDonationStatus) */}
      <button
        onClick={() => setIsOpen(true)}
        className="mt-6 w-full rounded-full py-4 px-4 text-white font-semibold
                   bg-gradient-to-r from-[#E7B77A] to-[#D89555]
                   shadow-[0_6px_16px_rgba(191,115,39,.25)]
                   hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7B77A]
                   transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Submit Feedback
      </button>

      {/* Modal */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-white p-6 rounded-2xl shadow-2xl w-96 transform transition-transform duration-300 scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header — subtle system gradient bar */}
              <div className="mb-4 -mx-6 -mt-6 px-6 py-3 rounded-t-2xl bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
                <h2 className="text-base sm:text-lg font-bold text-[#4A2F17]">
                  Submit Feedback
                </h2>
              </div>

              {/* Inputs — light system shell */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your feedback..."
                className="w-full p-3 rounded-xl border border-[#f0e3d0] bg-white/80 focus:bg-white
                           focus:outline-none focus:ring-2 focus:ring-[#E7B77A] text-sm mb-4"
                rows={4}
              />

              <label className="block mb-2 text-sm font-medium text-[#4A2F17]">
                Rating
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[#f0e3d0] bg-white/80 focus:bg-white
                           focus:outline-none focus:ring-2 focus:ring-[#E7B77A] text-sm mb-4"
              >
                <option value={1}>⭐</option>
                <option value={2}>⭐⭐</option>
                <option value={3}>⭐⭐⭐</option>
                <option value={4}>⭐⭐⭐⭐</option>
                <option value={5}>⭐⭐⭐⭐⭐</option>
              </select>

              <label className="block mb-2 text-sm font-medium text-[#4A2F17]">
                Upload Images/Videos
              </label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="mb-4 block w-full text-sm file:mr-4 file:py-2.5 file:px-4
                           file:rounded-full file:border-0 file:font-semibold
                           file:bg-gradient-to-r file:from-[#E7B77A] file:to-[#D89555] file:text-white
                           hover:file:opacity-95"
              />

              {/* Preview selected files */}
              {files.length > 0 && (
                <div className="mb-4 space-y-2">
                  {files.map((file, i) => (
                    <p key={i} className="text-sm text-[#7b5836]">
                      {file.name}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions — Cancel (subtle), Save (primary gradient) */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-full font-medium
                             bg-white border border-[#f0e3d0] text-[#4A2F17]
                             hover:bg-[#FFFBF5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7B77A]
                             transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-full text-white font-semibold
                             bg-gradient-to-r from-[#E7B77A] to-[#D89555]
                             shadow-[0_6px_16px_rgba(191,115,39,.25)]
                             hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7B77A]
                             transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Save Feedback
                </button>
              </div>
            </div>
          </div>,
          modalRoot
        )}
    </>
  );
}