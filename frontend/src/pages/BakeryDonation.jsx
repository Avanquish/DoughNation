import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

const Donation = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [verified, setVerified] = useState(false); 
  const [employeeName, setEmployeeName] = useState(""); 
  const [employees, setEmployees] = useState([]); 

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`${API}/employees`, { headers });
        setEmployees(res.data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/donations`, { headers });
      setDonations(res.data);
    } catch (err) {
      console.error("Error fetching donations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    const found = employees.find(
      (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
    );
    if (found) {
      Swal.fire({
        title: "Access Granted",
        text: `Welcome, ${found.name}!`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      setVerified(true);
      fetchDonations(); 
    } else {
      Swal.fire({
        title: "Employee Not Found",
        text: "Please enter a valid employee name.",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
      setVerified(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Donations</h2>

      {/* Verification Box - not fullscreen */}
      {!verified && (
        <div className="flex justify-center mt-10">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Verify Access
            </h2>
            <input
              type="text"
              placeholder="Enter employee name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="w-full p-2 border rounded mb-3"
            />
            <button
              onClick={handleVerify}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Enter Donations
            </button>
          </div>
        </div>
      )}

      {/* Donation contents only show if verified */}
      {verified && (
        <>
          {loading ? (
            <p className="text-gray-500">Loading donations...</p>
          ) : donations.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {donations.map((donation) => (
                <div
                  key={donation.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  {donation.image ? (
                    <img
                      src={`${API}/${donation.image}`}
                      alt={donation.name}
                      className="h-40 w-full object-cover"
                      onError={(e) =>
                        (e.currentTarget.src = `${API}/static/placeholder.png`)
                      }
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center bg-gray-100 text-gray-400">
                      No Image
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {donation.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      Uploaded by:{" "}
                      <span className="font-medium">{donation.uploaded || "—"}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Quantity:</span>{" "}
                        {donation.quantity}
                      </p>
                      <p>
                        <span className="font-medium">Threshold:</span>{" "}
                        {donation.threshold ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium">Created:</span>{" "}
                        {donation.creation_date
                          ? new Date(donation.creation_date).toLocaleDateString()
                          : "—"}
                      </p>
                      <p>
                        <span className="font-medium">Expires:</span>{" "}
                        {donation.expiration_date
                          ? new Date(donation.expiration_date).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    {donation.description && (
                      <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                        {donation.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No donations found.</p>
          )}
        </>
      )}
    </div>
  );
};

export default Donation;
