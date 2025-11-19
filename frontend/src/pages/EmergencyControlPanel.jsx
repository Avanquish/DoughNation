import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Key, Users, History } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import api from "../api/axios";
import Swal from "sweetalert2";

const tones = {
  textDark: "#4A2F17",
  textMed: "#6b4b2b",
  headerGrad: "bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]",
  ring: "ring-1 ring-black/10",
  surfaceSoft: "bg-[#FFF9F1]",
  borderSoft: "border-[#f2d4b5]",

  pillDanger:
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#F0A955] via-[#DE7F21] to-[#B45A0D] shadow-md shadow-[#B45A0D]/35 hover:-translate-y-0.5 active:scale-95 transition-all",
  pillGhost:
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-medium border border-[#f2d4b5] bg-white text-[#6b4b2b] shadow-sm hover:bg-[#FFF6EC] hover:-translate-y-0.5 active:scale-95 transition-all",
};

const EmergencyControlPanel = () => {
  const [activeTab, setActiveTab] = useState("password-reset");

  // Password Reset State
  const [resetUserId, setResetUserId] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Ownership Transfer State
  const [bakeryId, setBakeryId] = useState("");
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferType, setTransferType] = useState("emergency");
  const [isTemporary, setIsTemporary] = useState(true);
  const [durationDays, setDurationDays] = useState(30);
  const [transferring, setTransferring] = useState(false);

  // Bakery and Employee Lists
  const [bakeries, setBakeries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingBakeries, setLoadingBakeries] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    } else if (activeTab === "ownership-transfer") {
      fetchBakeries();
    } else if (activeTab === "password-reset") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (bakeryId) {
      fetchEmployees(bakeryId);
    } else {
      setEmployees([]);
      setToEmployeeId("");
    }
  }, [bakeryId]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const [bakeriesRes, charitiesRes] = await Promise.all([
        api.get("/admin/bakeries"),
        api.get("/admin/charities"),
      ]);

      const allUsers = [
        ...(bakeriesRes.data || []),
        ...(charitiesRes.data || []),
      ].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      Swal.fire("Error", "Failed to load users list", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchBakeries = async () => {
    try {
      setLoadingBakeries(true);
      const response = await api.get("/admin/emergency/bakeries-list");
      setBakeries(response.data.bakeries || []);
    } catch (error) {
      console.error("Failed to fetch bakeries:", error);
      Swal.fire("Error", "Failed to load bakeries list", "error");
    } finally {
      setLoadingBakeries(false);
    }
  };

  const fetchEmployees = async (bakeryIdValue) => {
    try {
      setLoadingEmployees(true);
      const response = await api.get(
        `/admin/emergency/bakery/${bakeryIdValue}/employees`
      );
      setEmployees(response.data.employees || []);

      const managers = response.data.employees.filter((e) => e.is_manager);
      if (managers.length > 0) {
        setToEmployeeId(managers[0].id.toString());
      } else if (response.data.employees.length > 0) {
        setToEmployeeId(response.data.employees[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      Swal.fire("Error", "Failed to load employees for this bakery", "error");
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get("/admin/emergency/history");
      setHistory(response.data.overrides || []);
    } catch (error) {
      console.error("Failed to fetch emergency history:", error);
      Swal.fire("Error", "Failed to load emergency action history", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const handlePasswordReset = async () => {
    if (!resetUserId) {
      Swal.fire("Error", "Please enter a user ID", "error");
      return;
    }
    if (!resetReason.trim()) {
      Swal.fire("Error", "Please provide a reason for this action", "error");
      return;
    }
    if (!newPassword) {
      Swal.fire("Error", "Please generate or enter a new password", "error");
      return;
    }

    const selectedUser = users.find((u) => u.id.toString() === resetUserId);
    const userName = selectedUser
      ? selectedUser.name
      : `User ID ${resetUserId}`;
    const userType = selectedUser ? selectedUser.role : "User";

    const result = await Swal.fire({
      title: "Emergency Password Reset",
      html: `
        <div class="text-left space-y-2">
          <p><strong>${userType}:</strong> ${userName}</p>
          <p><strong>Reason:</strong> ${resetReason}</p>
          <p class="text-red-600 font-semibold mt-4">⚠️ This action will be logged and audited.</p>
          <p class="text-gray-600">The user will receive the new password via email.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Reset Password",
    });

    if (!result.isConfirmed) return;

    try {
      setResetting(true);

      const payload = {
        user_id: parseInt(resetUserId),
        reason: resetReason.trim(),
        new_password: newPassword,
      };

      const response = await api.post(
        "/admin/emergency/password-reset",
        payload
      );

      Swal.fire({
        title: "Password Reset Successful",
        html: `
          <div class="text-left space-y-2">
            <p>Password has been reset for user ID ${resetUserId}</p>
            <p><strong>Email sent to:</strong> ${response.data.user_email}</p>
            <p class="text-sm text-gray-600 mt-4">Override ID: ${response.data.override_id}</p>
          </div>
        `,
        icon: "success",
      });

      setResetUserId("");
      setResetReason("");
      setNewPassword("");
    } catch (error) {
      console.error("Failed to reset password:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to reset password",
        "error"
      );
    } finally {
      setResetting(false);
    }
  };

  const handleOwnershipTransfer = async () => {
    if (!bakeryId) {
      Swal.fire("Error", "Please enter a bakery ID", "error");
      return;
    }
    if (!toEmployeeId) {
      Swal.fire("Error", "Please enter an employee ID", "error");
      return;
    }
    if (!transferReason.trim()) {
      Swal.fire("Error", "Please provide a reason for this transfer", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Ownership Transfer",
      html: `
        <div class="text-left space-y-2">
          <p><strong>Bakery ID:</strong> ${bakeryId}</p>
          <p><strong>New Owner (Employee ID):</strong> ${toEmployeeId}</p>
          <p><strong>Transfer Type:</strong> ${transferType}</p>
          <p><strong>Temporary:</strong> ${
            isTemporary ? `Yes (${durationDays} days)` : "No (Permanent)"
          }</p>
          <p><strong>Reason:</strong> ${transferReason}</p>
          <p class="text-red-600 font-semibold mt-4">⚠️ This will transfer bakery ownership!</p>
          <p class="text-amber-700 text-sm">
            • The bakery's Contact Person will be changed to the employee's name<br/>
            • The bakery's email will be changed to the employee's email<br/>
            • The employee's role will be changed to "Owner"<br/>
            • The new owner will have full account access
          </p>
          <p class="text-gray-600 text-sm mt-2">Both parties will be notified via email.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Execute Transfer",
    });

    if (!result.isConfirmed) return;

    try {
      setTransferring(true);

      const payload = {
        bakery_id: parseInt(bakeryId),
        to_employee_id: parseInt(toEmployeeId),
        reason: transferReason.trim(),
        transfer_type: transferType,
        is_temporary: isTemporary,
      };

      if (isTemporary) {
        payload.duration_days = durationDays;
      }

      const response = await api.post(
        "/admin/emergency/ownership-transfer",
        payload
      );

      Swal.fire({
        title: "Ownership Transfer Successful",
        html: `
          <div class="text-left space-y-2">
            <p><strong>Bakery:</strong> ${response.data.bakery_name}</p>
            <p><strong>Previous Owner:</strong> ${
              response.data.previous_owner
            }</p>
            <p><strong>New Owner:</strong> ${response.data.new_owner}</p>
            <p><strong>New Contact Email:</strong> ${
              response.data.new_contact_email
            }</p>
            <p><strong>Type:</strong> ${response.data.transfer_type}</p>
            ${
              response.data.expires_at
                ? `<p><strong>Expires:</strong> ${new Date(
                    response.data.expires_at
                  ).toLocaleString()}</p>`
                : "<p><strong>Status:</strong> Permanent Transfer</p>"
            }
            <p class="text-sm text-gray-600 mt-4">Transfer ID: ${
              response.data.transfer_id
            }</p>
            <p class="text-sm text-amber-600 mt-2">⚠️ The bakery's contact person and email have been updated.</p>
            <p class="text-sm text-green-600 mt-2">✅ The employee's role has been changed to \"Owner\".</p>
          </div>
        `,
        icon: "success",
      });

      setBakeryId("");
      setToEmployeeId("");
      setTransferReason("");
      setTransferType("emergency");
      setIsTemporary(true);
      setDurationDays(30);
    } catch (error) {
      console.error("Failed to transfer ownership:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to transfer ownership",
        "error"
      );
    } finally {
      setTransferring(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full space-y-4">
      <Card className="border-none bg-transparent shadow-none">
        <div
          className={`overflow-hidden rounded-[28px] bg-white ${tones.ring}`}
        >
          {/* ── Header warning bar ── */}
          <CardHeader
            className={`${tones.headerGrad} px-4 sm:px-6 py-3 sm:py-4 border-b border-[#f2d4b5]/60`}
          >
            <div className="w-full rounded-2xl border border-[#f2d4b5] bg-[#FFF7EA] px-3 py-2 sm:px-4 sm:py-2.5 flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="w-4 h-4 text-[#DE7F21] mt-0.5 shrink-0" />
              <div className="text-[11px] sm:text-xs text-[#7b5836]">
                <p className="font-semibold mb-0.5">
                  Emergency Actions Warning
                </p>
                <p>
                  All actions performed here are logged and audited. These
                  features should only be used in genuine emergency situations.
                  Misuse may result in accountability measures.
                </p>
              </div>
            </div>
          </CardHeader>

          {/* ───────────────────────── Content + Tabs ───────────────────────── */}
          <CardContent className="bg-white pt-4 pb-5 sm:pt-5 sm:pb-6 px-3 sm:px-6 space-y-5">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              {/* Tabs selector */}
              <div className="space-y-2">
                <TabsList className="flex w-full items-center justify-between rounded-full border border-[#f2d4b5] bg-white px-2 py-2 shadow-sm">
                  <TabsTrigger
                    value="password-reset"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-medium text-[#7b5836] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-[#B45A0D]/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F0A955] data-[state=active]:via-[#DE7F21] data-[state=active]:to-[#B45A0D] transition-all"
                  >
                    <Key className="w-4 h-4" />
                    <span className="hidden sm:inline">Password Reset</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="ownership-transfer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-medium text-[#7b5836] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-[#B45A0D]/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F0A955] data-[state=active]:via-[#DE7F21] data-[state=active]:to-[#B45A0D] transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Ownership Transfer</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-medium text-[#7b5836] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-[#B45A0D]/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F0A955] data-[state=active]:via-[#DE7F21] data-[state=active]:to-[#B45A0D] transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>
                <p className="text-[11px] text-[#6b4b2b]/80">
                  Choose the emergency action you need. Double-check details
                  before executing any change.
                </p>
              </div>

              {/* ───────────────────────── Password Reset Tab ───────────────────────── */}
              <TabsContent
                value="password-reset"
                className="mt-2 space-y-4 rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-3 py-4 sm:px-5 sm:py-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-[#4A2F17]">
                        Emergency Password Reset
                      </h3>
                      <p className="text-[11px] text-[#7b5836]">
                        Use when a bakery/charity cannot access their account or
                        security is at risk.
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#7b5836]">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Immediate effect · User notified by email</span>
                    </div>
                  </div>
                </div>

                {/* SELECT USER */}
                <div className="space-y-2">
                  <Label
                    htmlFor="user-select"
                    className="text-xs font-semibold text-[#4A2F17]"
                  >
                    Bakery / Charity Name{" "}
                    <span className="text-[#DE7F21]">*</span>
                  </Label>
                  <Select value={resetUserId} onValueChange={setResetUserId}>
                    <SelectTrigger
                      id="user-select"
                      className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                    >
                      <SelectValue
                        placeholder={
                          loadingUsers
                            ? "Loading users..."
                            : "Select a bakery or charity"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                      {loadingUsers ? (
                        <div className="py-6 text-center text-sm text-gray-500">
                          Loading...
                        </div>
                      ) : users.length === 0 ? (
                        <div className="py-6 text-center text-sm text-gray-500">
                          No users available
                        </div>
                      ) : (
                        users.map((user) => (
                          <SelectItem
                            key={user.id}
                            value={user.id.toString()}
                            className="relative flex w-full select-none items-center rounded-lg pl-8 pr-3 py-2 text-sm outline-none cursor-pointer text-[#4A2F17] hover:bg-[#FFF6EC] focus:bg-[#FFEFD9] data-[state=checked]:bg-[#FFEFD9] data-[state=checked]:font-semibold"
                          >
                            {user.name} ({user.role}){" "}
                            {!user.verified && "(Unverified)"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-gray-500">
                    Found {users.length} user(s)
                  </p>
                </div>

                {/* REASON */}
                <div className="space-y-2">
                  <Label
                    htmlFor="reset-reason"
                    className="text-xs font-semibold text-[#4A2F17]"
                  >
                    Reason <span className="text-[#DE7F21]">*</span>
                  </Label>
                  <Textarea
                    id="reset-reason"
                    placeholder="Describe why emergency password reset is needed (e.g., user locked out, account compromise, etc.)"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    rows={4}
                    className="rounded-2xl border-[#f2d4b5] bg-white/90 text-xs sm:text-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                  />
                </div>

                {/* NEW PASSWORD */}
                <div className="space-y-2">
                  <Label
                    htmlFor="new-password"
                    className="text-xs font-semibold text-[#4A2F17]"
                  >
                    New Password <span className="text-[#DE7F21]">*</span>
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="new-password"
                      type="text"
                      placeholder="Generate or enter password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 flex-1 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                      className={`${tones.pillGhost} w-full sm:w-auto`}
                    >
                      Generate
                    </Button>
                  </div>
                  {newPassword && (
                    <p className="text-[11px] text-gray-600">
                      Password length: {newPassword.length} characters
                    </p>
                  )}
                </div>

                {/* PRIMARY ACTION BUTTON */}
                <div className="pt-2">
                  <Button
                    onClick={handlePasswordReset}
                    disabled={
                      resetting ||
                      !resetUserId ||
                      !resetReason.trim() ||
                      !newPassword
                    }
                    className={`${tones.pillDanger} w-full sm:w-auto justify-center disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {resetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </TabsContent>

              {/* ───────────────────────── Ownership Transfer Tab ───────────────────────── */}
              <TabsContent
                value="ownership-transfer"
                className="mt-2 space-y-4 rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-3 py-4 sm:px-5 sm:py-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-[#4A2F17]">
                        Emergency Ownership Transfer
                      </h3>
                      <p className="text-[11px] text-[#7b5836]">
                        Reassign a bakery to a different employee for business
                        continuity.
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#7b5836]">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Updates contact person, email &amp; role</span>
                    </div>
                  </div>
                </div>

                {/* BAKERY + EMPLOYEE */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="bakery-select"
                      className="text-xs font-semibold text-[#4A2F17]"
                    >
                      Bakery Name <span className="text-[#DE7F21]">*</span>
                    </Label>
                    <Select value={bakeryId} onValueChange={setBakeryId}>
                      <SelectTrigger
                        id="bakery-select"
                        className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                      >
                        <SelectValue
                          placeholder={
                            loadingBakeries
                              ? "Loading bakeries..."
                              : "Select a bakery"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                        {bakeries.length === 0 && !loadingBakeries ? (
                          <div className="py-6 text-center text-sm text-gray-500">
                            No bakeries available
                          </div>
                        ) : (
                          bakeries.map((bakery) => (
                            <SelectItem
                              key={bakery.id}
                              value={bakery.id.toString()}
                              className="relative flex w-full select-none items-center rounded-lg pl-8 pr-3 py-2 text-sm outline-none cursor-pointer text-[#4A2F17] hover:bg-[#FFF6EC] focus:bg-[#FFEFD9] data-[state=checked]:bg-[#FFEFD9] data-[state=checked]:font-semibold"
                            >
                              {bakery.name} {!bakery.verified && "(Unverified)"}{" "}
                              - {bakery.status}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="employee-select"
                      className="text-xs font-semibold text-[#4A2F17]"
                    >
                      Employee Name <span className="text-[#DE7F21]">*</span>
                    </Label>
                    <Select
                      value={toEmployeeId}
                      onValueChange={setToEmployeeId}
                      disabled={!bakeryId || loadingEmployees}
                    >
                      <SelectTrigger
                        id="employee-select"
                        className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                      >
                        <SelectValue
                          placeholder={
                            !bakeryId
                              ? "Select a bakery first"
                              : loadingEmployees
                              ? "Loading employees..."
                              : "Select an employee"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                        {employees.length === 0 &&
                        !loadingEmployees &&
                        bakeryId ? (
                          <div className="py-6 text-center text-sm text-gray-500">
                            No employees found for this bakery
                          </div>
                        ) : (
                          employees.map((employee) => (
                            <SelectItem
                              key={employee.id}
                              value={employee.id.toString()}
                              className="relative flex w-full select-none items-center rounded-lg pl-8 pr-3 py-2 text-sm outline-none cursor-pointer text-[#4A2F17] hover:bg-[#FFF6EC] focus:bg-[#FFEFD9] data-[state=checked]:bg-[#FFEFD9] data-[state=checked]:font-semibold"
                            >
                              {employee.name} ({employee.role})
                              {employee.is_manager && " ⭐"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {employees.some((e) => e.is_manager) && (
                      <p className="text-[11px] text-gray-600">
                        ⭐ = Manager (Recommended for ownership transfer)
                      </p>
                    )}
                  </div>
                </div>

                {/* TRANSFER TYPE + TEMPORARY */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="transfer-type"
                      className="text-xs font-semibold text-[#4A2F17]"
                    >
                      Transfer Type
                    </Label>
                    <Select
                      value={transferType}
                      onValueChange={setTransferType}
                    >
                      <SelectTrigger className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                        <SelectItem value="permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="is-temporary"
                        checked={isTemporary}
                        onCheckedChange={setIsTemporary}
                      />
                      <label
                        htmlFor="is-temporary"
                        className="text-xs sm:text-sm font-medium leading-none text-[#4A2F17]"
                      >
                        Temporary Transfer (auto-revert)
                      </label>
                    </div>
                    {isTemporary && (
                      <div className="space-y-2 pt-2">
                        <Label
                          htmlFor="duration"
                          className="text-xs font-semibold text-[#4A2F17]"
                        >
                          Duration (days)
                        </Label>
                        <Select
                          value={durationDays.toString()}
                          onValueChange={(val) =>
                            setDurationDays(parseInt(val))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* REASON */}
                <div className="space-y-2">
                  <Label
                    htmlFor="transfer-reason"
                    className="text-xs font-semibold text-[#4A2F17]"
                  >
                    Reason <span className="text-[#DE7F21]">*</span>
                  </Label>
                  <Textarea
                    id="transfer-reason"
                    placeholder="Describe why ownership transfer is needed (e.g., owner hospitalized, business continuity, etc.)"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    rows={4}
                    className="rounded-2xl border-[#f2d4b5] bg-white/90 text-xs sm:text-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                  />
                </div>

                {/* PRIMARY ACTION BUTTON */}
                <div className="pt-2">
                  <Button
                    onClick={handleOwnershipTransfer}
                    disabled={
                      transferring ||
                      !bakeryId ||
                      !toEmployeeId ||
                      !transferReason.trim()
                    }
                    className={`${tones.pillDanger} w-full sm:w-auto justify-center disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {transferring
                      ? "Transferring..."
                      : "Execute Ownership Transfer"}
                  </Button>
                </div>
              </TabsContent>

              {/* ───────────────────────── History Tab ───────────────────────── */}
              <TabsContent
                value="history"
                className="mt-2 rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-3 py-4 sm:px-5 sm:py-5"
              >
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#BF7327] mx-auto" />
                      <p className="mt-4 text-sm text-[#4A2F17]">
                        Loading history...
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Fetching previous emergency overrides.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#4A2F17]">
                          Emergency Action History
                        </h3>
                        <p className="text-[11px] text-[#7b5836]">
                          Review past password resets and ownership transfers.
                        </p>
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                      <div className="inline-block min-w-full align-middle rounded-2xl border border-[#f2d4b5] bg-white shadow-sm">
                        <Table className="min-w-[720px] text-xs sm:text-sm">
                          <TableHeader>
                            <TableRow className="bg-[#EADBC8]">
                              <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                                Date
                              </TableHead>
                              <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                                Action Type
                              </TableHead>
                              <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                                Target User
                              </TableHead>
                              <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                                Admin
                              </TableHead>
                              <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                                Reason
                              </TableHead>
                              <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                                Status
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {history.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No emergency actions recorded
                                </TableCell>
                              </TableRow>
                            ) : (
                              history.map((item) => (
                                <TableRow
                                  key={item.id}
                                  className="group transition-colors hover:bg-[#FFF6EC]"
                                >
                                  <TableCell className="font-mono text-[10px] sm:text-[11px] text-gray-700 whitespace-nowrap align-top">
                                    {formatDate(item.created_at)}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <span className="text-xs sm:text-sm font-medium text-[#4A2F17]">
                                      {item.action_type}
                                    </span>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <div className="text-xs sm:text-sm text-[#4A2F17]">
                                      {item.target_user_name}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      ID: {item.target_user_id}
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top text-xs sm:text-sm text-[#4A2F17]">
                                    {item.admin_name}
                                  </TableCell>
                                  <TableCell className="max-w-xs align-top text-xs sm:text-sm text-[#4A2F17]">
                                    <span className="line-clamp-2 sm:line-clamp-3">
                                      {item.reason}
                                    </span>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                                        item.status === "executed"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : item.status === "pending"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default EmergencyControlPanel;