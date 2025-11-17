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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Key,
  Users,
  History,
  ShieldAlert,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import api from "../api/axios";
import Swal from "sweetalert2";

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
  }, [activeTab]);

  useEffect(() => {
    // Fetch employees when bakery is selected
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
        api.get("/admin/charities")
      ]);
      
      console.log("Bakeries response:", bakeriesRes.data);
      console.log("Charities response:", charitiesRes.data);
      
      // Backend returns User objects directly, role field contains "Bakery" or "Charity"
      const allUsers = [
        ...(bakeriesRes.data || []),
        ...(charitiesRes.data || [])
      ].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      
      console.log("Combined users:", allUsers);
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
      const response = await api.get(`/admin/emergency/bakery/${bakeryIdValue}/employees`);
      setEmployees(response.data.employees || []);
      
      // Auto-select first Manager if available
      const managers = response.data.employees.filter(e => e.is_manager);
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
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const handlePasswordReset = async () => {
    // Validation
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

    // Get selected user details
    const selectedUser = users.find(u => u.id.toString() === resetUserId);
    const userName = selectedUser ? selectedUser.name : `User ID ${resetUserId}`;
    const userType = selectedUser ? selectedUser.role : "User";

    // Confirmation
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

      const response = await api.post("/admin/emergency/password-reset", payload);

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

      // Clear form
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
    // Validation
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

    // Confirmation
    const result = await Swal.fire({
      title: "Ownership Transfer",
      html: `
        <div class="text-left space-y-2">
          <p><strong>Bakery ID:</strong> ${bakeryId}</p>
          <p><strong>New Owner (Employee ID):</strong> ${toEmployeeId}</p>
          <p><strong>Transfer Type:</strong> ${transferType}</p>
          <p><strong>Temporary:</strong> ${isTemporary ? `Yes (${durationDays} days)` : "No (Permanent)"}</p>
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

      const response = await api.post("/admin/emergency/ownership-transfer", payload);

      Swal.fire({
        title: "Ownership Transfer Successful",
        html: `
          <div class="text-left space-y-2">
            <p><strong>Bakery:</strong> ${response.data.bakery_name}</p>
            <p><strong>Previous Owner:</strong> ${response.data.previous_owner}</p>
            <p><strong>New Owner:</strong> ${response.data.new_owner}</p>
            <p><strong>New Contact Email:</strong> ${response.data.new_contact_email}</p>
            <p><strong>Type:</strong> ${response.data.transfer_type}</p>
            ${response.data.expires_at ? `<p><strong>Expires:</strong> ${new Date(response.data.expires_at).toLocaleString()}</p>` : "<p><strong>Status:</strong> Permanent Transfer</p>"}
            <p class="text-sm text-gray-600 mt-4">Transfer ID: ${response.data.transfer_id}</p>
            <p class="text-sm text-amber-600 mt-2">⚠️ The bakery's contact person and email have been updated.</p>
            <p class="text-sm text-green-600 mt-2">✅ The employee's role has been changed to "Owner".</p>
          </div>
        `,
        icon: "success",
      });

      // Clear form
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <div>
              <CardTitle className="text-red-600">Emergency Control Panel</CardTitle>
              <CardDescription>
                Critical administrative actions - Use with extreme caution
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">⚠️ Emergency Actions Warning</p>
              <p>
                All actions performed here are logged and audited. These features should
                only be used in genuine emergency situations. Misuse may result in
                accountability measures.
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="password-reset" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Password Reset
              </TabsTrigger>
              <TabsTrigger value="ownership-transfer" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Ownership Transfer
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Password Reset Tab */}
            <TabsContent value="password-reset" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="user-select">
                  Bakery / Charity Name <span className="text-red-500">*</span>
                </Label>
                <Select value={resetUserId} onValueChange={setResetUserId}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a bakery or charity"} />
                  </SelectTrigger>
                  <SelectContent>
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
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role}) {!user.verified && "(Unverified)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Found {users.length} user(s)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-reason">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reset-reason"
                  placeholder="Describe why emergency password reset is needed (e.g., user locked out, account compromise, etc.)"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">
                  New Password <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="text"
                    placeholder="Generate or enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                  >
                    Generate
                  </Button>
                </div>
                {newPassword && (
                  <p className="text-xs text-gray-600">
                    Password length: {newPassword.length} characters
                  </p>
                )}
              </div>

              <Button
                onClick={handlePasswordReset}
                disabled={resetting || !resetUserId || !resetReason.trim() || !newPassword}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {resetting ? "Resetting..." : "Reset Password"}
              </Button>
            </TabsContent>

            {/* Ownership Transfer Tab */}
            <TabsContent value="ownership-transfer" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bakery-select">
                    Bakery Name <span className="text-red-500">*</span>
                  </Label>
                  <Select value={bakeryId} onValueChange={setBakeryId}>
                    <SelectTrigger id="bakery-select">
                      <SelectValue placeholder={loadingBakeries ? "Loading bakeries..." : "Select a bakery"} />
                    </SelectTrigger>
                    <SelectContent>
                      {bakeries.length === 0 && !loadingBakeries ? (
                        <div className="py-6 text-center text-sm text-gray-500">
                          No bakeries available
                        </div>
                      ) : (
                        bakeries.map((bakery) => (
                          <SelectItem key={bakery.id} value={bakery.id.toString()}>
                            {bakery.name} {!bakery.verified && "(Unverified)"} - {bakery.status}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-select">
                    Employee Name <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={toEmployeeId} 
                    onValueChange={setToEmployeeId}
                    disabled={!bakeryId || loadingEmployees}
                  >
                    <SelectTrigger id="employee-select">
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
                    <SelectContent>
                      {employees.length === 0 && !loadingEmployees && bakeryId ? (
                        <div className="py-6 text-center text-sm text-gray-500">
                          No employees found for this bakery
                        </div>
                      ) : (
                        employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.name} ({employee.role})
                            {employee.is_manager && " ⭐"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {employees.some(e => e.is_manager) && (
                    <p className="text-xs text-gray-600">
                      ⭐ = Manager (Recommended for ownership transfer)
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-type">Transfer Type</Label>
                <Select value={transferType} onValueChange={setTransferType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-temporary"
                    checked={isTemporary}
                    onCheckedChange={setIsTemporary}
                  />
                  <label
                    htmlFor="is-temporary"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Temporary Transfer (auto-revert)
                  </label>
                </div>
              </div>

              {isTemporary && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Select
                    value={durationDays.toString()}
                    onValueChange={(val) => setDurationDays(parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="transfer-reason">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="transfer-reason"
                  placeholder="Describe why ownership transfer is needed (e.g., owner hospitalized, business continuity, etc.)"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleOwnershipTransfer}
                disabled={transferring || !bakeryId || !toEmployeeId || !transferReason.trim()}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {transferring ? "Transferring..." : "Execute Ownership Transfer"}
              </Button>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BF7327] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading history...</p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action Type</TableHead>
                        <TableHead>Target User</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No emergency actions recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        history.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">
                              {formatDate(item.created_at)}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{item.action_type}</span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{item.target_user_name}</div>
                              <div className="text-xs text-gray-500">
                                ID: {item.target_user_id}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{item.admin_name}</TableCell>
                            <TableCell className="max-w-xs truncate text-sm">
                              {item.reason}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === "executed"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
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
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyControlPanel;
