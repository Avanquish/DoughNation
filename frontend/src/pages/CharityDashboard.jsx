import React, { useEffect, useState } from "react";

const CharityDashboard = () => {
  const [name, setName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Charity User");
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen p-6 bg-orange-50">
      <h1 className="text-2xl font-bold mb-4 text-orange-700">
        Welcome Charity, {name}
      </h1>
      <p>This is your personalized dashboard.</p>
      {/* Add bakery-specific features here */}
    </div>
  );
};

export default CharityDashboard;