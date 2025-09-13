import { useState } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Feedback({ donationId, isDirect, onSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/${isDirect ? "direct" : "donation"}/feedback/${donationId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, rating }),
      });

      onSubmitted?.(); // update parent state
      setIsOpen(false);
      setMessage("");
      setRating(5);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const modalRoot = document.getElementById("modal-root") || document.body;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
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
              className="bg-white p-6 rounded-2xl shadow-lg w-96 transform transition-transform duration-300 scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-4">Submit Feedback</h2>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your feedback..."
                className="w-full p-2 border rounded mb-4"
              />

              <label className="block mb-2 font-medium">Rating:</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full p-2 border rounded mb-4"
              >
                <option value={1}>⭐</option>
                <option value={2}>⭐⭐</option>
                <option value={3}>⭐⭐⭐</option>
                <option value={4}>⭐⭐⭐⭐</option>
                <option value={5}>⭐⭐⭐⭐⭐</option>
              </select>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
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
