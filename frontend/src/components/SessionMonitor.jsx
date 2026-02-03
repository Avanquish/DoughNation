import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const SessionMonitor = () => {
  const navigate = useNavigate();
  const { user, logout: userLogout } = useAuth();
  const { employee, logout: employeeLogout } = useEmployeeAuth();
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryReason, setExpiryReason] = useState("expired");
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef(null);

  // Configuration
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
  const CHECK_INTERVAL = 60 * 1000; // Check every 1 minute

  // Check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      // Decode JWT token to get expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      
      // Token is expired if current time is past expiration
      return now >= exp;
    } catch (e) {
      console.error("Error decoding token:", e);
      return true;
    }
  };

  // Update last activity time
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  // Handle session expiry
  const handleSessionExpiry = (reason = "expired") => {
    setExpiryReason(reason);
    setShowExpiryModal(true);
    
    // Clear tokens
    if (user) {
      userLogout();
    }
    if (employee) {
      employeeLogout();
    }
  };

  // Handle modal close and redirect to login
  const handleModalClose = () => {
    setShowExpiryModal(false);
    
    // Redirect based on which type of user was logged in
    if (employee) {
      navigate("/employee-login");
    } else {
      navigate("/login");
    }
  };

  // Check session validity
  const checkSession = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const inactiveMinutes = Math.floor(timeSinceLastActivity / 60000);

    // Get the appropriate token
    const token = localStorage.getItem("employeeToken") || localStorage.getItem("token");
    
    // Check if user/employee is logged in
    if (!user && !employee) {
      return; // No one is logged in, no need to check
    }

    const userType = user ? `${user.role || 'User'}` : 'Employee';
    console.log(`[SessionMonitor] Checking ${userType} session - Inactive for ${inactiveMinutes} minutes`);

    // Check token expiration
    if (token && isTokenExpired(token)) {
      console.log(`[SessionMonitor] ${userType} token has expired`);
      handleSessionExpiry("expired");
      return;
    }

    // Check inactivity timeout
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      console.log(`[SessionMonitor] ${userType} session expired due to inactivity (${inactiveMinutes} minutes)`);
      handleSessionExpiry("inactivity");
      return;
    }
  };

  useEffect(() => {
    // Only monitor if user or employee is logged in
    if (!user && !employee) {
      return;
    }

    const userType = user ? `User (${user.role || 'unknown role'})` : 'Employee';
    console.log(`[SessionMonitor] Starting session monitoring for ${userType} - Inactivity timeout: 10 minutes`);

    // Activity listeners
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click"
    ];

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Initial activity update
    updateActivity();

    // Set up periodic session check
    checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, employee]); // Re-run when user or employee changes

  return (
    <Dialog open={showExpiryModal} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Session Expired</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {expiryReason === "inactivity" ? (
              <span>
                Your session has expired due to <strong>inactivity</strong>. 
                For your security, you have been logged out.
              </span>
            ) : (
              <span>
                Your session has <strong>expired</strong>. Please log in again to continue.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>Security Tip:</strong> For your protection, we automatically log you out after 
            {expiryReason === "inactivity" 
              ? " 10 minutes of inactivity" 
              : " your session expires"
            }.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleModalClose}
            className="bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white hover:opacity-90"
          >
            Go to Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionMonitor;