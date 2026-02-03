import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  CheckCircle2, 
  XCircle,
  LogOut,
  ChevronLeft,
  User,
  Mail,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import Swal from "sweetalert2";
import Messages1 from "./Messages1";
import BakeryNotification from "./BakeryNotification";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminProfile() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [name, setName] = useState("Admin");
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
        setName(res.data.name || "Admin");
      } catch (err) {
        console.error("Failed to fetch user:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
        }
      }
    };

    fetchUser();
  }, [navigate]);

  const passwordChecks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    }),
    [newPassword]
  );

  const allChecksPassed = useMemo(
    () => Object.values(passwordChecks).every(Boolean),
    [passwordChecks]
  );

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all fields",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    if (!allChecksPassed) {
      Swal.fire({
        icon: "warning",
        title: "Password Requirements Not Met",
        text: "Please ensure your password meets all requirements.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      Swal.fire({
        icon: "warning",
        title: "Same Password",
        text: "New password must be different from current password",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/admin/change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been changed successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to change password:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.response?.data?.detail || "Failed to change password",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleBack = () => {
    navigate("/admin-dashboard");
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF5E6 0%, #FFE8CC 100%)" }}>
      {/* Header with Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e8d8c2] shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#7b5836] hover:text-[#BF7327] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Dashboard</span>
            </button>

            {/* Center: Title */}
            <h1 className="text-xl font-bold text-[#6b4b2b]">Admin Profile</h1>

            {/* Right: Messages, Notifications, Logout */}
            <div className="flex items-center gap-3">
              {currentUser && <Messages1 currentUser={currentUser} />}
              <BakeryNotification />
              
              <Button
                onClick={handleLogout}
                className="btn-logout flex items-center gap-2 bg-gradient-to-r from-[#F6C17C] to-[#E49A52] hover:from-[#E49A52] hover:to-[#BF7327] text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:flex">Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Profile Header Card */}
          {currentUser && (
            <Card className="border-[#e8d8c2] shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#F6C17C] to-[#E49A52] flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-[#3b2a18]">{currentUser.name}</h2>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 text-[#7b5836]">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{currentUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#BF7327]" />
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-[#F6C17C] to-[#E49A52] text-white">
                          {currentUser.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Information Card */}
          {currentUser && (
            <Card className="border-[#e8d8c2] shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-[#6b4b2b] flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#fff7ec] rounded-lg border border-[#e8d8c2]">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Full Name</p>
                    <p className="text-base font-medium text-[#3b2a18]">{currentUser.name}</p>
                  </div>
                  <div className="p-4 bg-[#fff7ec] rounded-lg border border-[#e8d8c2]">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Email Address</p>
                    <p className="text-base font-medium text-[#3b2a18]">{currentUser.email}</p>
                  </div>
                  <div className="p-4 bg-[#fff7ec] rounded-lg border border-[#e8d8c2]">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Role</p>
                    <p className="text-base font-medium text-[#3b2a18]">{currentUser.role}</p>
                  </div>
                  <div className="p-4 bg-[#fff7ec] rounded-lg border border-[#e8d8c2]">
                    <p className="text-sm font-semibold text-[#7b5836] mb-1">Account Status</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Password Card */}
          <Card className="border-[#e8d8c2] shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#6b4b2b] flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div className="relative">
              <label className="block text-sm font-semibold text-[#7b5836] mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e8d8c2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BF7327]"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b5836] hover:text-[#BF7327]"
                >
                  {showCurrentPwd ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="relative">
              <label className="block text-sm font-semibold text-[#7b5836] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e8d8c2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BF7327]"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b5836] hover:text-[#BF7327]"
                >
                  {showNewPwd ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div className="mt-3 space-y-2 text-sm">
                  <PasswordCheck
                    passed={passwordChecks.length}
                    label="At least 8 characters"
                  />
                  <PasswordCheck
                    passed={passwordChecks.upper}
                    label="One uppercase letter"
                  />
                  <PasswordCheck
                    passed={passwordChecks.lower}
                    label="One lowercase letter"
                  />
                  <PasswordCheck
                    passed={passwordChecks.number}
                    label="One number"
                  />
                  <PasswordCheck
                    passed={passwordChecks.special}
                    label="One special character (!@#$%^&*...)"
                  />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-sm font-semibold text-[#7b5836] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e8d8c2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BF7327]"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b5836] hover:text-[#BF7327]"
                >
                  {showConfirmPwd ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#F6C17C] to-[#E49A52] hover:from-[#E49A52] hover:to-[#BF7327] text-white font-semibold py-2 rounded-lg transition-all"
              >
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ passed, label }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-400" />
      )}
      <span className={passed ? "text-green-600" : "text-gray-500"}>
        {label}
      </span>
    </div>
  );
}
