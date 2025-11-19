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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, History, MessageSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import api from "../api/axios";
import Swal from "sweetalert2";

// ── UI THEME TOKENS  ──
const tones = {
  textDark: "#4A2F17",
  textMed: "#6b4b2b",
  ring: "ring-1 ring-black/10",
  // Darker, richer gradient for primary actions
  pillPrimary:
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#F0A955] via-[#DE7F21] to-[#B45A0D] shadow-md shadow-[#B45A0D]/35 ring-1 ring-white/60 hover:-translate-y-0.5 active:scale-95 transition-all",
  pillGhost:
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium border border-[#f2d4b5] bg-white text-[#6b4b2b] shadow-sm hover:bg-[#FFF6EC] hover:-translate-y-0.5 active:scale-95 transition-all",
};

// Shared SelectItem style
const selectItemClass =
  "relative flex w-full select-none items-center rounded-lg pl-8 pr-3 py-2 text-sm outline-none cursor-pointer text-[#4A2F17] hover:bg-[#FFF6EC] focus:bg-[#FFEFD9] data-[state=checked]:bg-[#FFEFD9] data-[state=checked]:font-semibold";

const NotificationCenter = () => {
  const [activeTab, setActiveTab] = useState("compose");

  // Compose state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState(
    "system_announcement"
  );
  const [targetAll, setTargetAll] = useState(true);
  const [targetRole, setTargetRole] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [priority, setPriority] = useState("normal");
  const [expiresAt, setExpiresAt] = useState("");
  const [sending, setSending] = useState(false);

  // History state
  const [notifications, setNotifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === "history") {
      fetchNotificationHistory();
    }
  }, [activeTab]);

  const fetchNotificationHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get("/admin/notifications/history");
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notification history:", error);
      Swal.fire("Error", "Failed to load notification history", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendNotification = async () => {
    // Validation
    if (!title.trim()) {
      Swal.fire("Error", "Please enter a title", "error");
      return;
    }
    if (!message.trim()) {
      Swal.fire("Error", "Please enter a message", "error");
      return;
    }

    try {
      setSending(true);

      const payload = {
        title: title.trim(),
        message: message.trim(),
        notification_type: notificationType,
        target_all: targetAll,
        send_email: sendEmail,
        priority,
      };

      // Add targeting
      if (!targetAll) {
        if (targetRole) {
          payload.target_role = targetRole;
        } else if (targetUserId) {
          payload.target_user_id = parseInt(targetUserId);
        } else {
          Swal.fire("Error", "Please select a target audience", "error");
          setSending(false);
          return;
        }
      }

      // Add expiration if set
      if (expiresAt) {
        payload.expires_at = new Date(expiresAt).toISOString();
      }

      const response = await api.post("/admin/notifications/send", payload);

      Swal.fire(
        "Success!",
        `Notification sent to ${response.data.recipients_count} user(s)`,
        "success"
      );

      // Clear form
      setTitle("");
      setMessage("");
      setNotificationType("system_announcement");
      setTargetAll(true);
      setTargetRole("");
      setTargetUserId("");
      setSendEmail(true);
      setPriority("normal");
      setExpiresAt("");

      // Switch to history tab
      setActiveTab("history");
    } catch (error) {
      console.error("Failed to send notification:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to send notification",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  // ── Priority badge styling ──
  const getPriorityBadge = (priority) => {
    const badges = {
      low: "bg-slate-100 text-slate-700",
      normal: "bg-[#FFEFD9] text-[#7b5836]",
      high: "bg-amber-100 text-amber-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold capitalize ${
          badges[priority] || badges.normal
        }`}
      >
        {priority}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full space-y-4">
      {/* OUTER CARD WRAPPER */}
      <Card className="border-none bg-transparent shadow-none">
        <div
          className={`overflow-hidden rounded-[28px] bg-white ${tones.ring}`}
        >
          {/* Hidden title */}
          <CardHeader className="p-0 h-0 border-none bg-transparent">
            <div className="sr-only">
              <CardTitle>Notification Center</CardTitle>
              <CardDescription>
                Send system-wide announcements and targeted notifications
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="bg-white pt-4 pb-5 sm:pt-5 sm:pb-6 px-3 sm:px-6 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* TOP BAR */}
              <div className="w-full">
                <TabsList className="flex w-full items-center justify-between rounded-full border border-[#f2d4b5] bg-white px-2 py-2 shadow-sm">
                  <TabsTrigger
                    value="compose"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-medium text-[#7b5836] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-[#B45A0D]/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F0A955] data-[state=active]:via-[#DE7F21] data-[state=active]:to-[#B45A0D] transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Compose</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-medium text-[#7b5836] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-[#B45A0D]/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F0A955] data-[state=active]:via-[#DE7F21] data-[state=active]:to-[#B45A0D] transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── COMPOSE TAB CONTENT ── */}
              <TabsContent value="compose" className="mt-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  {/* LEFT */}
                  <div className="space-y-3">
                    {/* Title + Message */}
                    <div className="rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor="title"
                          className="text-xs font-semibold tracking-wide text-[#7b5836] uppercase"
                        >
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="title"
                          placeholder="e.g., System Maintenance Notice"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="h-9 text-sm rounded-xl border-[#f2d4b5] bg-white/90 focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="message"
                          className="text-xs font-semibold tracking-wide text-[#7b5836] uppercase"
                        >
                          Message <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Enter your notification message..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={5}
                          className="text-sm rounded-xl border-[#f2d4b5] bg-white/90 focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                        />
                        <p className="text-[10px] text-gray-500 text-right">
                          {message.length} characters
                        </p>
                      </div>
                    </div>

                    {/* Type + Priority */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor="type"
                          className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase"
                        >
                          Notification Type
                        </Label>
                        <Select
                          value={notificationType}
                          onValueChange={setNotificationType}
                        >
                          <SelectTrigger className="h-9 rounded-full border-[#f2d4b5] bg-white px-3 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="z-50 max-h-60 overflow-y-auto rounded-2xl border border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                            <SelectItem
                              value="system_announcement"
                              className={selectItemClass}
                            >
                              System Announcement
                            </SelectItem>
                            <SelectItem
                              value="alert"
                              className={selectItemClass}
                            >
                              Alert
                            </SelectItem>
                            <SelectItem
                              value="warning"
                              className={selectItemClass}
                            >
                              Warning
                            </SelectItem>
                            <SelectItem
                              value="info"
                              className={selectItemClass}
                            >
                              Information
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="priority"
                          className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase"
                        >
                          Priority
                        </Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="h-9 rounded-full border-[#f2d4b5] bg-white px-3 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent className="z-50 max-h-60 overflow-y-auto rounded-2xl border border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                            <SelectItem value="low" className={selectItemClass}>
                              Low
                            </SelectItem>
                            <SelectItem
                              value="normal"
                              className={selectItemClass}
                            >
                              Normal
                            </SelectItem>
                            <SelectItem
                              value="high"
                              className={selectItemClass}
                            >
                              High
                            </SelectItem>
                            <SelectItem
                              value="urgent"
                              className={selectItemClass}
                            >
                              Urgent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div className="rounded-2xl border border-[#f2d4b5] bg-white px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                      <Label className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                        Target Audience
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="target-all"
                            checked={targetAll}
                            onCheckedChange={(checked) => {
                              setTargetAll(checked);
                              if (checked) {
                                setTargetRole("");
                                setTargetUserId("");
                              }
                            }}
                          />
                          <label
                            htmlFor="target-all"
                            className="text-sm font-medium leading-none text-[#4A2F17]"
                          >
                            Send to all users
                          </label>
                        </div>

                        {!targetAll && (
                          <div className="pl-6 space-y-3">
                            <div className="space-y-1">
                              <Label
                                htmlFor="target-role"
                                className="text-xs font-medium text-[#6b4b2b]"
                              >
                                Or select role:
                              </Label>
                              <Select
                                value={targetRole}
                                onValueChange={(val) => {
                                  setTargetRole(val);
                                  setTargetUserId("");
                                }}
                              >
                                <SelectTrigger className="h-9 rounded-full border-[#f2d4b5] bg-white px-3 text-xs sm:text-sm shadow-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="z-50 max-h-60 overflow-y-auto rounded-2xl border border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                                  <SelectItem
                                    value=""
                                    className={selectItemClass}
                                  >
                                    None
                                  </SelectItem>
                                  <SelectItem
                                    value="Bakery"
                                    className={selectItemClass}
                                  >
                                    All Bakeries
                                  </SelectItem>
                                  <SelectItem
                                    value="Charity"
                                    className={selectItemClass}
                                  >
                                    All Charities
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor="target-user"
                                className="text-xs font-medium text-[#6b4b2b]"
                              >
                                Or specific user ID:
                              </Label>
                              <Input
                                id="target-user"
                                type="number"
                                placeholder="Enter user ID"
                                value={targetUserId}
                                onChange={(e) => {
                                  setTargetUserId(e.target.value);
                                  setTargetRole("");
                                }}
                                className="h-9 rounded-xl border-[#f2d4b5] bg-white text-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery + Expiration */}
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-[#f2d4b5] bg-white px-3 py-3 sm:px-4 sm:py-4 space-y-2">
                        <Label className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                          Delivery Options
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="send-email"
                            checked={sendEmail}
                            onCheckedChange={setSendEmail}
                          />
                          <label
                            htmlFor="send-email"
                            className="text-sm font-medium leading-none text-[#4A2F17]"
                          >
                            Also send via email
                          </label>
                        </div>
                        <p className="text-[11px] text-gray-500 pl-6">
                          In-app notifications are always sent.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#f2d4b5] bg-white px-3 py-3 sm:px-4 sm:py-4 space-y-2">
                        <Label
                          htmlFor="expires"
                          className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase"
                        >
                          Expiration Date (optional)
                        </Label>
                        <Input
                          id="expires"
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="h-9 rounded-xl border-[#f2d4b5] bg-white text-xs sm:text-sm focus:ring-[#DE7F21] focus-visible:ring-[#DE7F21]"
                        />
                        <p className="text-[11px] text-gray-500">
                          Notification will automatically hide after this date.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: PREVIEW */}
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-3 py-3 sm:px-4 sm:py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                          Preview
                        </span>
                        <span className="text-[10px] text-[#6b4b2b]/70">
                          Live preview of your notification
                        </span>
                      </div>
                      <div className="rounded-2xl bg-white border border-[#f2d4b5] px-3 py-3 sm:px-4 sm:py-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFEFD9]">
                              <Bell className="w-3 h-3 text-[#B45A0D]" />
                            </div>
                            <h3 className="text-sm font-semibold text-[#4A2F17]">
                              {title || "Notification Title"}
                            </h3>
                          </div>
                          {getPriorityBadge(priority)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                          {message ||
                            "Your notification message will appear here..."}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-gray-500">
                          <span className="capitalize">
                            Type: {notificationType}
                          </span>
                          <span>•</span>
                          <span>
                            Target:{" "}
                            {targetAll
                              ? "All Users"
                              : targetRole
                              ? `All ${targetRole}s`
                              : targetUserId
                              ? `User #${targetUserId}`
                              : "Not selected"}
                          </span>
                          {sendEmail && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <span role="img" aria-label="email">
                                  📧
                                </span>
                                Email included
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SEND BUTTON */}
                <div className="pt-2 flex flex-col items-center sm:flex-row sm:justify-end">
                  <Button
                    onClick={handleSendNotification}
                    disabled={sending || !title.trim() || !message.trim()}
                    className={`${tones.pillPrimary} w-full sm:w-auto justify-center text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {sending ? "Sending..." : "Send Notification"}
                    </span>
                    <span className="sm:hidden">
                      {sending ? "Sending…" : "Send"}
                    </span>
                  </Button>
                </div>
              </TabsContent>

              {/* ── HISTORY TAB CONTENT ── */}
              <TabsContent value="history" className="mt-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#FFEFD9]">
                        <History className="w-6 h-6 text-[#B45A0D]" />
                      </div>
                      <p className="text-sm font-medium text-[#4A2F17]">
                        Loading history...
                      </p>
                      <p className="text-xs text-gray-500">
                        Fetching previously sent notifications.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <div
                      className={`inline-block min-w-full align-middle rounded-2xl border border-[#f2d4b5] bg-white shadow-sm ${tones.ring}`}
                    >
                      <Table className="min-w-[720px] text-xs sm:text-sm">
                        <TableHeader>
                          <TableRow className="bg-[#EADBC8]">
                            <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                              Sent At
                            </TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                              Title
                            </TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                              Type
                            </TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                              Target
                            </TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                              Priority
                            </TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17] text-center">
                              Recipients
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notifications.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="py-8 sm:py-10">
                                <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEFD9]">
                                    <History className="w-5 h-5 text-[#B45A0D]" />
                                  </div>
                                  <p className="text-sm font-semibold text-[#4A2F17]">
                                    No notifications sent yet
                                  </p>
                                  <p className="max-w-sm text-[11px] text-gray-500">
                                    When you send announcements, they&apos;ll
                                    appear here with delivery details.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            notifications.map((notif) => (
                              <TableRow
                                key={notif.id}
                                className="group transition-colors hover:bg-[#FFF6EC]"
                              >
                                <TableCell className="font-mono text-[10px] sm:text-[11px] text-gray-700 align-top whitespace-nowrap">
                                  {formatDate(notif.sent_at)}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="text-xs sm:text-sm font-semibold text-[#4A2F17]">
                                    {notif.title}
                                  </div>
                                  <div className="text-[10px] sm:text-[11px] text-gray-500 max-w-xs truncate">
                                    {notif.message}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm align-top capitalize text-[#4A2F17]">
                                  {notif.notification_type}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm align-top text-[#4A2F17]">
                                  {notif.target_all
                                    ? "All Users"
                                    : notif.target_role
                                    ? `${notif.target_role}s`
                                    : "Specific User"}
                                </TableCell>
                                <TableCell className="align-top">
                                  {getPriorityBadge(notif.priority)}
                                </TableCell>
                                <TableCell className="align-top text-center text-xs sm:text-sm font-semibold text-[#4A2F17]">
                                  {notif.recipient_count}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
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

export default NotificationCenter;