// src/pages/CharityDonationFeed.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

export default function CharityDonationFeed() {
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/available`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDonations(res.data);
      } catch {
        Swal.fire("Error", "Failed to fetch donations", "error");
      }
    };

    fetchDonations();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      {donations.map((donation) => (
        <Card key={donation.id} className="shadow-lg rounded-2xl">
          <CardContent className="p-4">
            {donation.image && (
              <img
                src={donation.image}
                alt={donation.name}
                className="w-full h-40 object-cover rounded-xl"
              />
            )}
            <h2 className="text-lg font-semibold mt-2">{donation.name}</h2>
            <p className="text-sm text-gray-500">From {donation.bakery_name}</p>
            <p className="text-sm">Quantity: {donation.quantity}</p>
            {donation.expiration_date && (
              <p className="text-sm text-red-500">
                Expires: {donation.expiration_date}
              </p>
            )}
            <Button className="mt-3 w-full">Request Donation</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
