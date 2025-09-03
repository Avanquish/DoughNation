import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  Heart,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

export default function DonationList() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  // 🔎 Fetch donations immediately
  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/donations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Donation API response:", res.data); // 👈 debug
      setDonations(res.data);
    } catch (err) {
      console.error("Error fetching donations:", err);
      setError("Failed to load donations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <Heart className="mr-2 text-red-500" /> Available Donations
      </h2>

      {loading && <p>Loading donations...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {donations.length > 0 ? (
          donations.map((donation, idx) => (
            <Card key={idx} className="shadow-lg">
              <CardHeader>
                <CardTitle>{donation.name || "Unnamed Item"}</CardTitle>
                <CardDescription>
                  Uploaded by: {donation.uploaded || "Unknown"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {donation.image && (
                  <img
                    src={`${API}/${donation.image}`}
                    alt={donation.name}
                    className="w-full h-40 object-cover rounded mb-2"
                  />
                )}
                <p>
                  <Package className="inline mr-2" /> Quantity:{" "}
                  {donation.quantity}
                </p>
                <p>
                  <Clock className="inline mr-2" /> Created:{" "}
                  {donation.creation_date}
                </p>
                <p>
                  <AlertTriangle className="inline mr-2" /> Expiration:{" "}
                  {donation.expiration_date}
                </p>
                <p>Description: {donation.description || "No description"}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          !loading && <p>No donations available.</p>
        )}
      </div>
    </div>
  );
}
