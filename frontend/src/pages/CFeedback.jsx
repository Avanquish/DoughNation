import { useEffect, useState } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa"; // for star ratings

const API = "https://api.doughnationhq.cloud";

// Helper for star display
const StarRating = ({ rating }) => {
  const maxStars = 5;
  return (
    <div className="flex gap-1">
      {[...Array(maxStars)].map((_, i) => (
        <FaStar
          key={i}
          size={16}
          color={i < rating ? "#F6C17C" : "#ddd"} // gold vs gray
        />
      ))}
    </div>
  );
};

export default function MyFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [editFile, setEditFile] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get(`${API}/feedback/charity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Fetched feedback data:", res.data);
        setFeedbacks(res.data);
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      }
    };
    fetchFeedbacks();
  }, []);

  const startEdit = (f) => {
    setEditing(f.id);
    setEditMessage(f.message);
    setEditRating(f.rating || 0);
  };

  const cancelEdit = () => setEditing(null);

const saveEdit = async () => {
  if (!editing) return; // safety guard

  const formData = new FormData();
  if (editMessage) formData.append("message", editMessage);
  if (editRating) formData.append("rating", editRating);
  if (editFile) formData.append("media_file", editFile);

  try {
    const res = await axios.patch(
      `${API}/feedback/charity/${editing}`, // use `editing` as feedbackId
      formData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Update state with new data from backend
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === editing ? { ...f, ...res.data } : f))
    );

    setEditing(null); // exit edit mode
  } catch (err) {
    console.error("Failed to update feedback:", err);
  }
};

  const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
    path ? `${API}/${path}` : fallback;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">My Submitted Feedback</h2>
      {feedbacks.length === 0 && <p>No feedback submitted yet.</p>}

      {/* Grid layout for cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbacks.map((f) => (
          <div
            key={f.id}
            className="border rounded-lg shadow-md p-4 flex flex-col bg-white"
          >
            {editing === f.id ? (
              <div>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="border w-full p-2 rounded mb-2"
                />

                <label className="block mb-1 font-medium">Rating:</label>
                <select
                  value={editRating}
                  onChange={(e) => setEditRating(Number(e.target.value))}
                  className="w-full p-2 border rounded mb-2"
                >
                  <option value={1}>⭐</option>
                  <option value={2}>⭐⭐</option>
                  <option value={3}>⭐⭐⭐</option>
                  <option value={4}>⭐⭐⭐⭐</option>
                  <option value={5}>⭐⭐⭐⭐⭐</option>
                </select>

                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setEditFile(e.target.files[0])}
                  className="mb-2"
                />

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={saveEdit}
                    className="bg-green-500 text-white px-3 py-1 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="bg-gray-300 px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Product Image */}
                {f.product_image && (
                  <img
                    src={`${API}/${f.product_image}`}
                    alt={f.product_name}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                )}

                {/* Bakery Info */}
                <div className="flex items-center mb-2">
                  {f.bakery_profile_picture && (
                    <img
                      src={avatar(f.bakery_profile_picture)}
                      alt={f.bakery_name}
                      className="w-10 h-10 rounded-full mr-2"
                    />
                  )}
                  <strong>{f.bakery_name || "Unknown Bakery"}</strong>
                </div>

                {/* Product Details */}
                {f.product_name && (
                  <p className="text-sm mb-2">
                    <strong>{f.product_name}</strong> <br></br>
                    <strong>Quantity: {f.product_quantity}</strong>
                  </p>
                )}

                {/* Feedback Message */}
                <h1 className="text-center font-bold text-lg my-4">FEEDBACK</h1>
                <p className="text-gray-700 mb-2">
                  <strong>Message:</strong> {f.message}
                </p>
                {/* Rating */}
                <div className="mb-2">
                  <strong>Rating:</strong>{" "}
                  <StarRating rating={f.rating || 0} />
                </div>

                 {/* Media file (image/video from charity feedback) */}
                  {f.media_file && (() => {
                    const mediaUrl = `${API}/uploads/${f.media_file}`;
                    return f.media_file.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video
                        controls
                        className="w-full h-32 object-cover rounded mb-3"
                        src={mediaUrl}
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Feedback media"
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    );
                  })()}

                {/* Submitted At */}
                <p className="text-xs text-gray-500 mb-2">
                  {new Date(f.created_at).toLocaleString()}
                </p>

                {/* Donation Type */}
                <p className="text-xs italic text-gray-600">
                  {f.donation_request_id && "Donation Request"}
                  {f.direct_donation_id && "Direct Donation"}
                </p>

                {/* Bakery Reply */}
                {f.reply_message && (
                  <p className="text-green-700 font-medium mt-2 border-t pt-2">
                    <strong>Bakery Reply:</strong> {f.reply_message}
                  </p>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => startEdit(f)}
                  className="bg-blue-500 text-white px-3 py-1 rounded mt-3 max-auto"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}