import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import ThresholdAlertModal from "@/components/ui/ThresholdAlertModal";
import Swal from "sweetalert2";

const ThresholdAlertContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ThresholdAlertProvider = ({ children }) => {
  const [alertQueue, setAlertQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Get token from either regular user or employee
  const getToken = () => {
    return localStorage.getItem("token") || localStorage.getItem("employeeToken");
  };

  // Check if user is Owner or Manager
  const isOwnerOrManager = () => {
    const employeeToken = localStorage.getItem("employeeToken");
    const userToken = localStorage.getItem("token");
    
    // If employee token exists, check employee role
    if (employeeToken) {
      try {
        const decoded = JSON.parse(atob(employeeToken.split(".")[1]));
        const employeeRole = decoded.employee_role?.toLowerCase();
        return employeeRole === "manager";
      } catch (e) {
        return false;
      }
    }
    
    // If user token exists, they are the owner (donor)
    if (userToken) {
      try {
        const decoded = JSON.parse(atob(userToken.split(".")[1]));
        const userRole = decoded.role?.toLowerCase();
        // Owner is identified by having "donor" or "bakery" role
        return userRole === "donor" || userRole === "bakery";
      } catch (e) {
        return false;
      }
    }
    
    return false;
  };

  // Check for threshold alerts
  const checkThresholdAlerts = useCallback(async () => {
    const token = getToken();
    console.log("🔍 Checking threshold alerts...");
    console.log("Token exists:", !!token);
    
    if (!token || isChecking) {
      console.log("❌ Skipped check - No token or already checking");
      return;
    }

    // Only check for Owner or Manager roles
    if (!isOwnerOrManager()) {
      console.log("❌ Skipped check - User is not Owner or Manager");
      return;
    }

    try {
      setIsChecking(true);
      console.log("📡 Fetching from:", `${API_URL}/threshold-alerts`);
      
      const response = await axios.get(`${API_URL}/threshold-alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const products = response.data || [];
      console.log("✅ Response received:", products);
      
      if (products.length > 0) {
        console.log(`🎯 Found ${products.length} products at threshold`);
        console.log("Products:", products);
        setAlertQueue(products);
      } else {
        console.log("ℹ️ No products at threshold");
      }
    } catch (error) {
      console.error("❌ Error checking threshold alerts:", error);
      console.error("Error details:", error.response?.data);
      // Don't show error to user - just log it
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Show next alert from queue
  useEffect(() => {
    console.log("📋 Alert queue length:", alertQueue.length);
    console.log("🎬 Current alert:", currentAlert);
    
    if (alertQueue.length > 0 && !currentAlert) {
      console.log("🚀 Showing alert for:", alertQueue[0].name);
      setCurrentAlert(alertQueue[0]);
    }
  }, [alertQueue, currentAlert]);

  // Record action on backend
  const recordAction = async (productId, action) => {
    const token = getToken();
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/threshold-action`,
        {
          product_id: productId,
          action: action,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error recording threshold action:", error);
    }
  };

  // Handle Donate action
  const handleDonate = async () => {
    if (!currentAlert) return;

    try {
      const token = getToken();
      
      // Create donation to admin
      const donationResponse = await axios.post(
        `${API_URL}/donate-to-admin`,
        {
          inventory_item_id: currentAlert.id,
          quantity: currentAlert.quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Record the threshold action
      await recordAction(currentAlert.id, "donate");

      // Show success message
      await Swal.fire({
        title: "Donation Created!",
        html: `
          <p>Your donation of <strong>${currentAlert.name}</strong> has been created successfully!</p>
          <p class="text-sm text-gray-600 mt-2">
            You can track the donation status in the "Donation Status" tab.
          </p>
          <p class="text-sm text-green-600 mt-1 font-semibold">
            Current Status: Preparing
          </p>
        `,
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#E49A52",
      });

      // Move to next alert
      moveToNextAlert();
      
      // Trigger refresh events for other components
      window.dispatchEvent(new Event('refreshDonations'));
      window.dispatchEvent(new Event('refreshInventory'));
    } catch (error) {
      console.error("Error handling donate:", error);
      Swal.fire({
        title: "Error",
        text: error.response?.data?.detail || "Failed to create donation. Please try again.",
        icon: "error",
        confirmButtonColor: "#E49A52",
      });
    }
  };

  // Handle Reject/Dismiss action
  const handleReject = async () => {
    if (!currentAlert) return;

    try {
      // Record the action
      await recordAction(currentAlert.id, "dismiss");

      // Move to next alert without message
      moveToNextAlert();
    } catch (error) {
      console.error("Error handling reject:", error);
      // Still move to next even if recording fails
      moveToNextAlert();
    }
  };

  // Move to next alert in queue
  const moveToNextAlert = () => {
    setAlertQueue((prev) => prev.slice(1));
    setCurrentAlert(null);
  };

  // Check on mount and when user logs in
  useEffect(() => {
    const token = getToken();
    if (token) {
      checkThresholdAlerts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic check every 5 minutes
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const interval = setInterval(() => {
      checkThresholdAlerts();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkThresholdAlerts]);

  // Listen for custom events to trigger checks
  useEffect(() => {
    const handleCheckThreshold = () => {
      checkThresholdAlerts();
    };

    window.addEventListener("checkThresholdAlerts", handleCheckThreshold);
    
    return () => {
      window.removeEventListener("checkThresholdAlerts", handleCheckThreshold);
    };
  }, [checkThresholdAlerts]);

  return (
    <ThresholdAlertContext.Provider
      value={{
        checkThresholdAlerts,
        alertCount: alertQueue.length,
      }}
    >
      {children}
      
      {/* Render modal if there's a current alert */}
      {currentAlert && (
        <ThresholdAlertModal
          product={currentAlert}
          onDonate={handleDonate}
          onReject={handleReject}
          onClose={handleReject}
        />
      )}
    </ThresholdAlertContext.Provider>
  );
};

export const useThresholdAlert = () => {
  const context = useContext(ThresholdAlertContext);
  if (!context) {
    throw new Error("useThresholdAlert must be used within ThresholdAlertProvider");
  }
  return context;
};
