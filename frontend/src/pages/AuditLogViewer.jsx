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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── UI theme tokens (visual only) ──
const tones = {
  textDark: "#4A2F17",
  textMed: "#6b4b2b",
  headerGrad: "bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]",
  ring: "ring-1 ring-black/10",
  pillPrimary:
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow-md shadow-[#BF7327]/25 ring-1 ring-white/60 hover:-translate-y-0.5 active:scale-95 transition-all",
  pillGhost:
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium border border-[#f2d4b5] bg-white text-[#6b4b2b] shadow-sm hover:bg-[#FFF6EC] hover:-translate-y-0.5 active:scale-95 transition-all",
};

const API_URL = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";
const normalizePath = (path) => path.replace(/\\/g, "/");

// ── Shared classes for all SelectItem ──
const selectItemClass =
  "relative flex w-full select-none items-center rounded-lg pl-8 pr-3 py-2 text-sm outline-none cursor-pointer text-[#4A2F17] hover:bg-[#FFF6EC] focus:bg-[#FFEFD9] data-[state=checked]:bg-[#FFEFD9] data-[state=checked]:font-semibold";

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [adminProfile, setAdminProfile] = useState(null);

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchAdminProfile = async () => {
    try {
      const response = await api.get("/admin/admin_profile");
      setAdminProfile(response.data);
    } catch (error) {
      console.error("Failed to fetch admin profile:", error);
    }
  };

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeFilter, severityFilter, startDate, endDate, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        skip: (page * limit).toString(),
        limit: limit.toString(),
      });

      // Handle admin_crud as multiple event types (client-side filter)
      if (eventTypeFilter === "admin_crud") {
        // Don't add event_type filter - we'll filter client-side
      } else if (eventTypeFilter && eventTypeFilter !== "all") {
        params.append("event_type", eventTypeFilter);
      }

      if (severityFilter && severityFilter !== "all") {
        params.append("severity", severityFilter);
      }

      // Fix: Proper date range handling
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.append("start_date", start.toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append("end_date", end.toISOString());
      }

      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      let filteredLogs = response.data.logs || [];

      // Client-side filter for admin CRUD operations
      if (eventTypeFilter === "admin_crud") {
        const adminCrudTypes = [
          "ADMIN_UPDATE_USER",
          "ADMIN_MANUAL_REGISTRATION",
          "ADMIN_DELETE_USER",
        ];
        filteredLogs = filteredLogs.filter((log) =>
          adminCrudTypes.includes(log.event_type)
        );
      }

      setLogs(filteredLogs);
      setTotalCount(response.data.total_count || 0);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      Swal.fire("Error", "Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    // Fetch all logs matching the current filters (not limited by pagination)
    try {
      const params = new URLSearchParams();

      // Handle admin_crud as multiple event types (client-side filter)
      if (eventTypeFilter === "admin_crud") {
        // Don't add event_type filter - we'll filter client-side
      } else if (eventTypeFilter && eventTypeFilter !== "all") {
        params.append("event_type", eventTypeFilter);
      }

      if (severityFilter && severityFilter !== "all") {
        params.append("severity", severityFilter);
      }

      // Fix: Proper date range handling
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.append("start_date", start.toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append("end_date", end.toISOString());
      }

      // Fetch ALL logs without pagination limits
      params.append("skip", "0");
      params.append("limit", "10000"); // Large number to get all records

      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      let allLogs = response.data.logs || [];

      // Client-side filter for admin CRUD operations
      if (eventTypeFilter === "admin_crud") {
        const adminCrudTypes = [
          "ADMIN_UPDATE_USER",
          "ADMIN_MANUAL_REGISTRATION",
          "ADMIN_DELETE_USER",
        ];
        allLogs = allLogs.filter((log) =>
          adminCrudTypes.includes(log.event_type)
        );
      }

      if (allLogs.length === 0) {
        Swal.fire(
          "Warning",
          "No logs found matching the current filters",
          "warning"
        );
        return;
      }

      const doc = new jsPDF("landscape", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 30; // Equal margins on both sides
      const availableWidth = pageWidth - margin * 2;
      let currentY = 40;

      // Base64 conversion function for images
      const toBase64 = (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.95));
          };
          img.onerror = () => resolve(null);
          img.src = url + "?t=" + Date.now();
        });

      // Header - Admin Profile Picture
      if (adminProfile && adminProfile.profile_picture) {
        try {
          const adminImgUrl = `${API_URL}/${normalizePath(
            adminProfile.profile_picture
          )}`;
          const adminImgBase64 = await toBase64(adminImgUrl);

          if (adminImgBase64) {
            const logoSize = 120;
            const imgX = (pageWidth - logoSize) / 2;
            doc.addImage(
              adminImgBase64,
              "JPEG",
              imgX,
              currentY,
              logoSize,
              logoSize
            );
            currentY += logoSize + 15;
          }
        } catch (err) {
          console.error("Failed to load admin profile picture:", err);
        }
      }

      // Organization Name
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 34, 34);
      doc.text(
        "Scholars of Sustenance (SOS) | A Global Food Rescue Foundation",
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 18;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85, 85, 85);
      doc.text("SOS Philippines", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 12;

      // Address
      doc.text(
        "72 Maayusin Street, Up Village, Diliman, Quezon City Philippines 1101",
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 12;

      // Contact Info
      doc.text(
        "Contact: +63 917 866 7728 | Email: sosph@scholarsofsustenance.org",
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 20;

      // Report Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("AUDIT LOG REPORT", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 18;

      // Generated Date
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(136, 136, 136);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 15;

      // Filter info
      if (startDate || endDate || eventTypeFilter || severityFilter) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        let filterText = "Filters: ";
        if (startDate) filterText += `From: ${startDate} `;
        if (endDate) filterText += `To: ${endDate} `;
        if (eventTypeFilter && eventTypeFilter !== "all")
          filterText += `Event: ${eventTypeFilter} `;
        if (severityFilter && severityFilter !== "all")
          filterText += `Severity: ${severityFilter}`;
        doc.text(filterText, pageWidth / 2, currentY, { align: "center" });
        currentY += 10;
      }

      currentY += 15;

      // Table
      const headers = [
        "Timestamp",
        "Event Type",
        "Actor",
        "Severity",
        "Status",
        "Description",
      ];

      const rows = allLogs.map((log) => [
        formatDate(log.timestamp),
        log.event_type || "",
        log.actor_name || "System",
        (log.severity || "").toUpperCase(),
        log.success ? "Success" : "Failed",
        // eslint-disable-next-line no-control-regex
        (log.description || "No description").replace(/[^\x00-\x7F]/g, ""), // Remove special characters
      ]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: currentY,
        styles: {
          fontSize: 9,
          cellPadding: 5,
          valign: "middle",
          halign: "center",
          overflow: "linebreak",
          cellWidth: "wrap",
          font: "helvetica",
          fontStyle: "normal",
          lineColor: [212, 184, 150],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [185, 115, 39],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          font: "helvetica",
          fontSize: 10,
        },
        columnStyles: {
          0: {
            cellWidth: availableWidth * 0.115,
            halign: "center",
            font: "helvetica",
          }, // Timestamp
          1: {
            cellWidth: availableWidth * 0.14,
            halign: "center",
            font: "helvetica",
          }, // Event Type
          2: {
            cellWidth: availableWidth * 0.11,
            halign: "center",
            font: "helvetica",
          }, // Actor
          3: {
            cellWidth: availableWidth * 0.085,
            halign: "center",
            font: "helvetica",
          }, // Severity
          4: {
            cellWidth: availableWidth * 0.085,
            halign: "center",
            font: "helvetica",
          }, // Status
          5: {
            cellWidth: availableWidth * 0.465,
            halign: "center",
            font: "helvetica",
          }, // Description
        },
        margin: { left: margin, right: margin },
        tableWidth: availableWidth,
        theme: "grid",
      });

      doc.save(
        `Audit_Log_Report_${new Date().toISOString().split("T")[0]}.pdf`
      );
      Swal.fire(
        "Success",
        "Audit logs exported as PDF successfully",
        "success"
      );
    } catch (error) {
      console.error("Failed to export audit logs:", error);
      Swal.fire("Error", "Failed to export audit logs", "error");
    }
  };

  const clearFilters = () => {
    setEventTypeFilter("");
    setSeverityFilter("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      info: {
        bg: "bg-sky-50",
        text: "text-sky-700",
        icon: Info,
        dot: "bg-sky-500",
      },
      warning: {
        bg: "bg-amber-50",
        text: "text-amber-800",
        icon: AlertTriangle,
        dot: "bg-amber-500",
      },
      error: {
        bg: "bg-orange-50",
        text: "text-orange-800",
        icon: AlertCircle,
        dot: "bg-orange-500",
      },
      critical: {
        bg: "bg-red-50",
        text: "text-red-800",
        icon: XCircle,
        dot: "bg-red-500",
      },
    };

    const badge = badges[severity] || badges.info;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
      >
        <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
        <Icon className="w-3 h-3" />
        <span className="capitalize">{severity}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    // Parse the datetime string - backend already sends in Philippine timezone
    const date = new Date(dateString);

    // Display in Philippine time (backend timestamps are already in PHT)
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  };

  const showLogDetails = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#FFEFD9]">
            <FileText className="w-6 h-6 text-[#BF7327]" />
          </div>
          <p className="mt-1 text-sm font-medium text-[#4A2F17]">
            Loading audit logs...
          </p>
          <p className="text-xs text-gray-500">
            Please wait while we fetch recent system activity.
          </p>
        </div>
      </div>
    );
  }

  // Total Pages for Pagination UI (always >= 1, max 10 per page because limit=10)
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / limit) || 1);

  return (
    <div className="w-full space-y-4">
      <Card className="border-none bg-transparent shadow-none">
        <div
          className={`overflow-hidden rounded-[28px] bg-white ${tones.ring}`}
        >
          <CardHeader className="p-0 h-0 border-none bg-transparent">
            <div className="sr-only">
              <CardTitle>System Activity</CardTitle>
              <CardDescription>
                Filter and export your audit logs
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="bg-white pt-4 pb-5 sm:pt-5 sm:pb-6 px-3 sm:px-6 space-y-5">
            <div className="rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-3 py-3 sm:px-5 sm:py-4 shadow-[0_8px_18px_rgba(0,0,0,0.03)]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 sm:gap-4">
                {/* Event type */}
                <div className="space-y-1 lg:col-span-2">
                  <span className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Event
                  </span>
                  <Select
                    value={eventTypeFilter || "all"}
                    onValueChange={(value) =>
                      setEventTypeFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#E49A52] focus-visible:ring-[#E49A52]">
                      <SelectValue placeholder="All Events" />
                    </SelectTrigger>
                    <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                      <SelectItem value="all" className={selectItemClass}>
                        All Events
                      </SelectItem>
                      <SelectItem
                        value="login_success"
                        className={selectItemClass}
                      >
                        Login Success
                      </SelectItem>
                      <SelectItem
                        value="failed_login"
                        className={selectItemClass}
                      >
                        Failed Login
                      </SelectItem>
                      <SelectItem
                        value="user_suspended"
                        className={selectItemClass}
                      >
                        User Suspended
                      </SelectItem>
                      <SelectItem
                        value="user_banned"
                        className={selectItemClass}
                      >
                        User Banned
                      </SelectItem>
                      <SelectItem
                        value="USER_REACTIVATED"
                        className={selectItemClass}
                      >
                        User Reactivated
                      </SelectItem>
                      <SelectItem
                        value="USER_SELF_DEACTIVATE"
                        className={selectItemClass}
                      >
                        User Self-Deactivated
                      </SelectItem>
                      <SelectItem
                        value="emergency_password_reset"
                        className={selectItemClass}
                      >
                        Emergency Password Reset
                      </SelectItem>
                      <SelectItem
                        value="ownership_transfer"
                        className={selectItemClass}
                      >
                        Ownership Transfer
                      </SelectItem>
                      <SelectItem
                        value="admin_crud"
                        className={selectItemClass}
                      >
                        Admin Edit User
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Severity */}
                <div className="space-y-1 lg:col-span-1">
                  <span className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Severity
                  </span>
                  <Select
                    value={severityFilter || "all"}
                    onValueChange={(value) =>
                      setSeverityFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#E49A52] focus-visible:ring-[#E49A52]">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-2xl border border-[#f2d4b5] bg-white shadow-lg text-sm py-1">
                      <SelectItem value="all" className={selectItemClass}>
                        All Severities
                      </SelectItem>
                      <SelectItem value="info" className={selectItemClass}>
                        Info
                      </SelectItem>
                      <SelectItem value="warning" className={selectItemClass}>
                        Warning
                      </SelectItem>
                      <SelectItem value="error" className={selectItemClass}>
                        Error
                      </SelectItem>
                      <SelectItem value="critical" className={selectItemClass}>
                        Critical
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start date */}
                <div className="space-y-1 lg:col-span-1">
                  <span className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    From
                  </span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#E49A52] focus-visible:ring-[#E49A52]"
                  />
                </div>

                {/* End date */}
                <div className="space-y-1 lg:col-span-1">
                  <span className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    To
                  </span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-full border-[#f2d4b5] bg-white/90 px-4 text-xs sm:text-sm shadow-sm focus:ring-[#E49A52] focus-visible:ring-[#E49A52]"
                  />
                </div>

                {/* Clear button */}
                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className={`${tones.pillGhost} w-full justify-center text-xs sm:text-sm`}
                  >
                    <Filter className="w-4 h-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* ROW */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] text-[#6b4b2b]/80">
                  Showing {logs.length} of {totalCount} events
                  {(eventTypeFilter ||
                    severityFilter ||
                    startDate ||
                    endDate) && <span> (filtered)</span>}
                </div>

                <div className="flex flex-col items-end gap-1 sm:gap-2">
                  <div className="hidden sm:block text-[11px] text-[#6b4b2b]/80">
                    Tip: Combine date range + severity to quickly find critical
                    incidents.
                  </div>
                  <Button
                    onClick={handleExport}
                    className={`${tones.pillPrimary} w-full sm:w-auto justify-center text-xs sm:text-sm`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export Logs</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Logs table ── */}
            <div className="w-full overflow-x-auto">
              <div
                className={`inline-block min-w-full align-middle rounded-2xl border border-[#f2d4b5] bg-white shadow-sm ${tones.ring}`}
              >
                <Table className="text-xs sm:text-sm min-w-[720px]">
                  <TableHeader>
                    <TableRow className="bg-[#EADBC8]">
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                        Timestamp
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                        Event
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                        Actor
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                        Target
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                        Severity
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17]">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#4A2F17] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      // ── Empty state ──
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 sm:py-10">
                          <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEFD9]">
                              <FileText className="w-5 h-5 text-[#BF7327]" />
                            </div>
                            <p className="text-sm font-semibold text-[#4A2F17]">
                              No audit logs found
                            </p>
                            <p className="max-w-sm text-[11px] text-gray-500">
                              Try adjusting the filters or expanding your date
                              range to see more activity.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="group transition-colors hover:bg-[#FFF6EC]"
                        >
                          <TableCell className="font-mono text-[10px] sm:text-[11px] text-gray-700 align-top whitespace-nowrap">
                            {formatDate(log.timestamp)}
                          </TableCell>

                          <TableCell className="align-top">
                            <div className="text-xs sm:text-sm font-semibold text-[#4A2F17]">
                              {log.event_type}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">
                              {log.event_category}
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            <div className="text-xs sm:text-sm text-[#4A2F17]">
                              {log.actor_name || "System"}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">
                              {log.actor_type}
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            <div className="text-xs sm:text-sm text-[#4A2F17]">
                              {log.target_name || "N/A"}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">
                              {log.target_type}
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            {getSeverityBadge(log.severity)}
                          </TableCell>

                          <TableCell className="align-top">
                            {log.success ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] sm:text-xs font-semibold text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[10px] sm:text-xs font-semibold text-red-700">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                Failed
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="align-top text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => showLogDetails(log)}
                              className="rounded-full border-[#f2d4b5] bg-white px-3 py-1 text-[10px] sm:text-xs font-medium text-[#6b4b2b] shadow-sm hover:bg-[#FFF6EC]"
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ── Pagination ── */}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] sm:text-xs text-gray-500">
                Page {page + 1} of {totalPages} • Showing {logs.length} of{" "}
                {totalCount} events
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={page === 0}
                  className={`${tones.pillGhost} w-full sm:w-auto justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPage((prev) =>
                      prev + 1 >= totalPages ? prev : prev + 1
                    )
                  }
                  disabled={page + 1 >= totalPages}
                  className={`${tones.pillPrimary} w-full sm:w-auto justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Log Details Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-hidden p-0 [&>button[aria-label='Close']]:top-3 [&>button[aria-label='Close']]:right-3">
          <DialogHeader
            className={`${tones.headerGrad} px-4 sm:px-6 py-3 sm:py-4 border-b border-black/5`}
          >
            <DialogTitle className="text-sm sm:text-base text-[#4A2F17]">
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-[#7b5836] text-xs sm:text-sm font-medium">
              Complete information about this event
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Event ID
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#4A2F17] break-all">
                    {selectedLog.id}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#f2d4b5] bg-[#FFF9F1] px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Timestamp
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-[#4A2F17]">
                    {formatDate(selectedLog.timestamp)}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Event Type
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-semibold text-[#4A2F17]">
                    {selectedLog.event_type}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Category
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-[#4A2F17]">
                    {selectedLog.event_category || "N/A"}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3 flex flex-col gap-1">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Severity
                  </div>
                  <div>{getSeverityBadge(selectedLog.severity)}</div>
                </div>
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3 flex flex-col gap-1">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Status
                  </div>
                  <div>
                    {selectedLog.success ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] sm:text-xs font-semibold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[10px] sm:text-xs font-semibold text-red-800">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                  Description
                </div>
                <div className="rounded-2xl bg-[#FFF9F1] px-4 py-3 text-xs sm:text-sm text-[#4A2F17]">
                  {selectedLog.description || "No description provided."}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Actor
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-semibold text-[#4A2F17]">
                    {selectedLog.actor_name || "System"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {selectedLog.actor_type}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Target
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-semibold text-[#4A2F17]">
                    {selectedLog.target_name || "N/A"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {selectedLog.target_type}
                  </div>
                </div>
              </div>

              {selectedLog.ip_address && (
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    IP Address
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#4A2F17]">
                    {selectedLog.ip_address}
                  </div>
                </div>
              )}

              {selectedLog.user_agent && (
                <div className="rounded-2xl border border-[#f2d4b5] bg-white px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    User Agent
                  </div>
                  <div className="mt-1 text-[11px] sm:text-xs text-gray-600 break-all">
                    {selectedLog.user_agent}
                  </div>
                </div>
              )}

              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                      Additional Data
                    </div>
                    <pre className="max-h-40 overflow-auto rounded-2xl bg-[#0f172a] px-4 py-3 text-[10px] sm:text-[11px] leading-relaxed text-slate-100">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

              {selectedLog.error_message && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold tracking-wide text-[#7b5836] uppercase">
                    Error Message
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-800">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogViewer;