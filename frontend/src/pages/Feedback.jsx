import { useState } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Feedback({ donationId, isDirect, onSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(null); // UI only
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
      setHoverRating(null);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const modalRoot = document.getElementById("modal-root") || document.body;

  return (
    <>
      {/* Trigger button — same gradient style */}
      <button
        onClick={() => setIsOpen(true)}
        className="mt-6 w-full rounded-full py-3.5 px-4 text-sm sm:text-base text-white font-semibold
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
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10
                       bg-black/40 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-md max-h-[90vh]
                         rounded-3xl overflow-hidden bg-white
                         shadow-[0_18px_40px_rgba(0,0,0,.25)] ring-1 ring-black/10
                         flex flex-col transform transition-transform duration-300 scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#FFE4C5] via-[#FFD49B] to-[#F0A95F]">
                <h2 className="text-base sm:text-lg font-bold text-[#4A2F17]">
                  Submit Feedback
                </h2>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Feedback textarea */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[#4A2F17]">
                    Write your feedback
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your feedback..."
                    className="w-full rounded-2xl border border-[#f0e3d0] bg-[#FFFBF5]/80
                               px-3 py-2 text-sm text-[#3b2a18]
                               placeholder:text-[#c29b72]
                               focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E7B77A]"
                    rows={3}
                  />
                </div>

                {/* Rating: stars (no big select) */}
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-[#4A2F17]">
                    Rating
                  </label>

                  <div className="inline-flex items-center gap-2">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-[#f0e3d0]
                                 bg-[#FFFBF5] px-3 py-2"
                    >
                      {[1, 2, 3, 4, 5].map((value) => {
                        const active = (hoverRating ?? rating) >= value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            onMouseEnter={() => setHoverRating(value)}
                            onMouseLeave={() => setHoverRating(null)}
                            className={`transition-transform ${
                              active
                                ? "scale-110"
                                : "opacity-60 hover:opacity-100"
                            }`}
                          >
                            <svg
                              viewBox="0 0 20 20"
                              className={`w-5 h-5 ${
                                active ? "text-[#F6B94E]" : "text-[#D5B18A]"
                              }`}
                              fill="currentColor"
                            >
                              <path d="M10 1.5l2.47 4.99 5.51.8-3.99 3.89.94 5.47L10 13.9l-4.93 2.6.94-5.47-3.99-3.89 5.51-.8L10 1.5z" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-medium text-[#7b5836]">
                      {rating} / 5
                    </span>
                  </div>
                </div>

                {/* Upload */}
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-[#4A2F17]">
                    Upload Images/Videos
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs sm:text-sm
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0 file:font-semibold
                               file:bg-gradient-to-r file:from-[#E7B77A] file:to-[#D89555] file:text-white
                               hover:file:opacity-95"
                  />
                </div>

                {/* Preview selected files */}
                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map((file, i) => (
                      <p key={i} className="text-xs sm:text-sm text-[#7b5836]">
                        {file.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3 border-t border-[#f0e3d0] flex justify-end gap-2 bg-white">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-full text-sm font-medium
                             bg-white border border-[#f0e3d0] text-[#4A2F17]
                             hover:bg-[#FFFBF5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7B77A]
                             transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-white
                             bg-gradient-to-r from-[#E7B77A] to-[#D89555]
                             shadow-[0_6px_16px_rgba(191,115,39,.25)]
                             hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7B77A]
                             transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Send Reply
                </button>
              </div>
            </div>
          </div>,
          modalRoot
        )}
    </>
  );
}