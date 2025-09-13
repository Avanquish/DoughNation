import { useEffect, useState } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa"; // use react-icons for stars

const API = "http://localhost:8000";

// Helper for star display
const StarRating = ({ rating }) => {
  const maxStars = 5;
  return (
    <div className="flex gap-1">
      {[...Array(maxStars)].map((_, i) => (
        <FaStar
          key={i}
          size={16}
          color={i < rating ? "#F6C17C" : "#ddd"} // gold for filled, gray for empty
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

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get(`${API}/feedback/charity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    try {
      const res = await axios.patch(
        `${API}/feedback/charity/${editing}`,
        { message: editMessage, rating: Number(editRating) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFeedbacks((prev) =>
        prev.map((f) =>
            f.id === editing
            ? { ...f, message: editMessage, rating: Number(editRating) } // merge updated fields
            : f
        )
        );
      setEditing(null);
    } catch (err) {
      console.error("Failed to update feedback:", err);
    }
  };

  const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
    path ? `${API}/${path}` : fallback;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">My Submitted Feedback</h2>
      {feedbacks.length === 0 && <p>No feedback submitted yet.</p>}
      <ul className="space-y-4">
        {feedbacks.map((f) => (
          <li key={f.id} className="border p-4 rounded-lg shadow">
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

                    <div className="flex justify-end gap-2 mt-2">
                    <button
                        onClick={saveEdit}
                        className="bg-green-500 text-white px-2 py-1 rounded"
                    >
                        Save
                    </button>
                    <button
                        onClick={cancelEdit}
                        className="bg-gray-300 px-2 py-1 rounded"
                    >
                        Cancel
                    </button>
                    </div>
                </div>
                ) : (
                <div>
                    <p><strong>Message:</strong> {f.message}</p>
                    <p><strong>Rating:</strong> <StarRating rating={f.rating || 0} /></p>
                    <p><strong>Submitted At:</strong> {new Date(f.created_at).toLocaleString()}</p>
                    {f.donation_request_id && <p><em>Donation Request</em></p>}
                    {f.direct_donation_id && <p><em>Direct Donation</em></p>}
                    <button
                    onClick={() => startEdit(f)}
                    className="bg-blue-500 text-white px-2 py-1 rounded mt-2"
                    >
                    Edit
                    </button>
                </div>
                )}
          </li>
        ))}
      </ul>
    </div>
  );
}
