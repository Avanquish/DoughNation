import { useState } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="mt-6 w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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

              <label className="block mb-2 font-medium">Upload Images/Videos:</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="mb-4"
              />

              {/* Preview selected files */}
              {files.length > 0 && (
                <div className="mb-4 space-y-2">
                  {files.map((file, i) => (
                    <p key={i} className="text-sm text-gray-600">
                      {file.name}
                    </p>
                  ))}
                </div>
              )}

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