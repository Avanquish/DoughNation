import { useEffect, useState } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa"; // for star ratings

const API = "http://localhost:8000";

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
  const [replying, setReplying] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get(`${API}/feedback/bakery`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFeedbacks(res.data);
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      }
    };
    fetchFeedbacks();
  }, []);

  const saveReply = async () => {
    if (!replying) return;

    const formData = new FormData();
    formData.append("reply_message", replyMessage);

    try {
      const res = await axios.patch(
        `${API}/feedback/bakery/${replying}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === replying ? { ...f, ...res.data } : f))
      );
      setReplying(null);
      setReplyMessage("");
    } catch (err) {
      console.error("Failed to reply:", err);
    }
  };

  const avatar = (path, fallback = `${API}/uploads/placeholder.png`) =>
    path ? `${API}/${path}` : fallback;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Submitted Feedback</h2>
      {feedbacks.length === 0 && <p>No feedback submitted yet.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbacks.map((f) => (
          <div
            key={f.id}
            className="border rounded-lg shadow-md p-4 flex flex-col bg-white justify-between"
          >
            <div>
              {/* Product Image */}
              {f.product_image && (
                <img
                  src={`${API}/${f.product_image}`}
                  alt={f.product_name}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              )}

              {/* Charity Info */}
              <div className="flex items-center mb-2">
                {f.charity_profile_picture && (
                  <img
                    src={avatar(f.charity_profile_picture)}
                    alt={f.charity_name}
                    className="w-10 h-10 rounded-full mr-2"
                  />
                )}
                <strong>{f.charity_name || "Unknown Charity"}</strong>
              </div>

              {/* Product Details */}
              {f.product_name && (
                <p className="text-sm mb-2">
                  <strong>{f.product_name}</strong> <br />
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

              {/* Media file */}
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
              <p className="text-xs italic text-gray-600 mb-2">
                {f.donation_request_id && "Donation Request"}
                {f.direct_donation_id && "Direct Donation"}
              </p>
            </div>
            
            {/* Bakery Reply Section */}
            <div className="mt-4 border-t pt-3">
              {f.reply_message ? (
                <p className="text-green-700 font-medium mt-2">
                  <strong>Bakery Reply:</strong> {f.reply_message}
                </p>
              ) : (
                <>
                  {replying === f.id ? (
                    <div>
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Write your reply..."
                        className="border w-full p-2 rounded mb-2"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={saveReply}
                          className="bg-green-500 text-white px-3 py-1 rounded"
                        >
                          Save Reply
                        </button>
                        <button
                          onClick={() => setReplying(null)}
                          className="bg-gray-300 px-3 py-1 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplying(f.id)}
                      className="bg-purple-500 text-white px-3 py-1 rounded mt-2"
                    >
                      Reply
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}