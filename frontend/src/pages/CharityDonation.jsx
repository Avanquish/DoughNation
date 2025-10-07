import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";

const API = "https://api.doughnationhq.cloud";

export default function CharityDonationFeed() {
  const [donations, setDonations] = useState([]);
  const [requestedDonations, setRequestedDonations] = useState({}); // Map donation_id → request_id

  // Fetch donations and user's pending requests
  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch all available donations
        const res = await axios.get(`${API}/available`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDonations(res.data);

        // Fetch user's pending donation requests
        const pendingRes = await axios.get(`${API}/donation/my_requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const requestsMap = {};
        pendingRes.data.forEach((req) => {
          requestsMap[req.donation_id] = req.id;
        });
        setRequestedDonations(requestsMap);

        // Save in localStorage for persistence
        localStorage.setItem("requestedDonations", JSON.stringify(requestsMap));
      } catch (err) {
        Swal.fire("Error", "Failed to fetch donations", "error");
        console.error(err);
      }
    };

    fetchDonations();
  }, []);

  // Request a donation
  const requestDonation = async (donation) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${API}/donation/request`,
        { donation_id: donation.id, bakery_id: donation.bakery_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const requestId = res.data.request_id;
      setRequestedDonations((prev) => {
        const updated = { ...prev, [donation.id]: requestId };
        localStorage.setItem("requestedDonations", JSON.stringify(updated));
        return updated;
      });

      // Prepare bakery info for Messenger
      const bakeryInfo = {
        id: donation.bakery_id,
        name: donation.bakery_name,
        profile_picture: donation.bakery_profile_picture || null,
      };

      // Trigger Messenger to open chat
      localStorage.setItem("open_chat_with", JSON.stringify(bakeryInfo));
      localStorage.setItem("send_donation", JSON.stringify(donation));
      window.dispatchEvent(new Event("open_chat"));

      Swal.fire("Success", "Donation request sent!", "success");
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.detail || "Failed to request donation",
        "error"
      );
      console.error(err);
    }
  };

  // Cancel a donation request
  const cancelRequest = async (donation_id) => {
    const request_id = requestedDonations[donation_id];
    if (!request_id) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/donation/cancel/${request_id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRequestedDonations((prev) => {
        const updated = { ...prev };
        delete updated[donation_id];
        localStorage.setItem("requestedDonations", JSON.stringify(updated));
        return updated;
      });

      // Notify Messenger
      window.dispatchEvent(
        new CustomEvent("donation_cancelled", { detail: { donation_id } })
      );

      Swal.fire("Success", "Donation request canceled", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to cancel donation request", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      {donations.length === 0 ? (
        <div className="col-span-full text-center text-gray-500 text-lg">
          No Available Donation
        </div>
      ) : (
        donations.map((donation) => {
          const requestId = requestedDonations[donation.id];
          const isRequested = !!requestId;

          return (
            <Card key={donation.id} className="shadow-lg rounded-2xl">
              <CardContent className="p-4">
                {donation.image ? (
                  <img
                    src={`${API}/${donation.image}`}
                    alt={donation.name}
                    className="h-40 w-full object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = `${API}/static/placeholder.png`;
                    }}
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
                    No Image
                  </div>
                )}

                <div className="flex items-center mt-2 space-x-2">
                  {/* Bakery profile image */}
                  <img
                    src={
                      donation.bakery_profile_picture
                        ? `${API}/${donation.bakery_profile_picture}`
                        : `${API}/uploads/placeholder.png`
                    }
                    alt={donation.bakery_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>

                <h2 className="text-lg font-semibold mt-2">{donation.name}</h2>
                <p className="text-sm text-gray-500">From {donation.bakery_name}</p>
                <p className="text-sm">Quantity: {donation.quantity}</p>
                {donation.expiration_date && (
                  <p className="text-sm text-red-500">
                    Expires: {donation.expiration_date}
                  </p>
                )}

                <Button
                  className="mt-2 w-full text-black"
                  disabled={isRequested}
                  onClick={() => requestDonation(donation)}
                >
                  {isRequested ? "Request Sent" : "Request Donation"}
                </Button>

                {isRequested && (
                  <Button
                    variant="destructive"
                    className="mt-2 w-full"
                    onClick={() => cancelRequest(donation.id)}
                  >
                    Cancel Request
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
