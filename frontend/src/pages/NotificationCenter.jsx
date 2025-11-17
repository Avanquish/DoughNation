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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Bell, Send, History, MessageSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import api from "../api/axios";
import Swal from "sweetalert2";

const NotificationCenter = () => {
  const [activeTab, setActiveTab] = useState("compose");
  
  // Compose state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState("system_announcement");
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

  const getPriorityBadge = (priority) => {
    const badges = {
      low: "bg-gray-100 text-gray-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Center
          </CardTitle>
          <CardDescription>
            Send system-wide announcements and targeted notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4 mt-6">
              {/* Notification Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., System Maintenance Notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Notification Message */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Enter your notification message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-gray-500">
                  {message.length} characters
                </p>
              </div>

              {/* Notification Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Notification Type</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_announcement">
                      System Announcement
                    </SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label>Target Audience</Label>
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
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send to all users
                    </label>
                  </div>

                  {!targetAll && (
                    <div className="pl-6 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="target-role">Or select role:</Label>
                        <Select
                          value={targetRole}
                          onValueChange={(val) => {
                            setTargetRole(val);
                            setTargetUserId("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            <SelectItem value="Bakery">All Bakeries</SelectItem>
                            <SelectItem value="Charity">All Charities</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target-user">Or specific user ID:</Label>
                        <Input
                          id="target-user"
                          type="number"
                          placeholder="Enter user ID"
                          value={targetUserId}
                          onChange={(e) => {
                            setTargetUserId(e.target.value);
                            setTargetRole("");
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Options */}
              <div className="space-y-2">
                <Label>Delivery Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                  />
                  <label
                    htmlFor="send-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Also send via email
                  </label>
                </div>
                <p className="text-xs text-gray-500 pl-6">
                  In-app notifications are always sent
                </p>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expires">Expiration Date (optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Notification will automatically hide after this date
                </p>
              </div>

              {/* Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-sm font-medium text-gray-600 mb-2">Preview</div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{title || "Notification Title"}</h3>
                    {getPriorityBadge(priority)}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {message || "Your notification message will appear here..."}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Type: {notificationType}</span>
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
                        <span>📧 Email included</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendNotification}
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Send Notification"}
              </Button>
            </TabsContent>

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
                        <TableHead>Sent At</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Recipients</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No notifications sent yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        notifications.map((notif) => (
                          <TableRow key={notif.id}>
                            <TableCell className="font-mono text-xs">
                              {formatDate(notif.sent_at)}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{notif.title}</div>
                              <div className="text-xs text-gray-500 max-w-xs truncate">
                                {notif.message}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {notif.notification_type}
                            </TableCell>
                            <TableCell className="text-sm">
                              {notif.target_all
                                ? "All Users"
                                : notif.target_role
                                ? `${notif.target_role}s`
                                : "Specific User"}
                            </TableCell>
                            <TableCell>{getPriorityBadge(notif.priority)}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {notif.recipient_count}
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

export default NotificationCenter;
