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
import { FileText, Download, Filter, AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";

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
  const [limit] = useState(50);

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [eventTypeFilter, severityFilter, startDate, endDate, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        skip: (page * limit).toString(),
        limit: limit.toString(),
      });

      if (eventTypeFilter) params.append("event_type", eventTypeFilter);
      if (severityFilter) params.append("severity", severityFilter);
      if (startDate) params.append("start_date", new Date(startDate).toISOString());
      if (endDate) params.append("end_date", new Date(endDate).toISOString());

      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(response.data.logs || []);
      setTotalCount(response.data.total_count || 0);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      Swal.fire("Error", "Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", new Date(startDate).toISOString());
      if (endDate) params.append("end_date", new Date(endDate).toISOString());

      const response = await api.get(`/admin/audit-logs/export?${params.toString()}`);
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Swal.fire("Success", "Audit logs exported successfully", "success");
    } catch (error) {
      console.error("Failed to export logs:", error);
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
      info: { bg: "bg-blue-100", text: "text-blue-800", icon: Info },
      warning: { bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertTriangle },
      error: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle },
      critical: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
    };

    const badge = badges[severity] || badges.info;
    const Icon = badge.icon;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {severity}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const showLogDetails = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BF7327] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Log Viewer
              </CardTitle>
              <CardDescription>
                Complete system event tracking and monitoring
              </CardDescription>
            </div>
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Select value={eventTypeFilter || "all"} onValueChange={(value) => setEventTypeFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="login_success">Login Success</SelectItem>
                <SelectItem value="failed_login">Failed Login</SelectItem>
                <SelectItem value="user_suspended">User Suspended</SelectItem>
                <SelectItem value="user_banned">User Banned</SelectItem>
                <SelectItem value="USER_REACTIVATED">User Reactivated</SelectItem>
                <SelectItem value="USER_SELF_DEACTIVATE">User Self-Deactivated</SelectItem>
                <SelectItem value="emergency_password_reset">Emergency Password Reset</SelectItem>
                <SelectItem value="ownership_transfer">Ownership Transfer</SelectItem>
                <SelectItem value="admin_edit_user">Admin Edit User</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter || "all"} onValueChange={(value) => setSeverityFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />

            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />

            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </Button>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {logs.length} of {totalCount} events
            {(eventTypeFilter || severityFilter || startDate || endDate) && " (filtered)"}
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{log.event_type}</div>
                        <div className="text-xs text-gray-500">{log.event_category}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.actor_name || "System"}</div>
                        <div className="text-xs text-gray-500">{log.actor_type}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.target_name || "N/A"}</div>
                        <div className="text-xs text-gray-500">{log.target_type}</div>
                      </TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <span className="text-green-600 text-sm">✓ Success</span>
                        ) : (
                          <span className="text-red-600 text-sm">✗ Failed</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showLogDetails(log)}
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

          {/* Pagination */}
          {totalCount > limit && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {Math.ceil(totalCount / limit)}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= totalCount}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this event
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Event ID</div>
                  <div className="font-mono">{selectedLog.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Timestamp</div>
                  <div>{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Event Type</div>
                  <div>{selectedLog.event_type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Category</div>
                  <div>{selectedLog.event_category || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Severity</div>
                  <div>{getSeverityBadge(selectedLog.severity)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Status</div>
                  <div>
                    {selectedLog.success ? (
                      <span className="text-green-600">✓ Success</span>
                    ) : (
                      <span className="text-red-600">✗ Failed</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Description</div>
                <div className="bg-gray-50 p-3 rounded-lg">{selectedLog.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Actor</div>
                  <div>{selectedLog.actor_name || "System"}</div>
                  <div className="text-sm text-gray-500">{selectedLog.actor_type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Target</div>
                  <div>{selectedLog.target_name || "N/A"}</div>
                  <div className="text-sm text-gray-500">{selectedLog.target_type}</div>
                </div>
              </div>

              {selectedLog.ip_address && (
                <div>
                  <div className="text-sm font-medium text-gray-600">IP Address</div>
                  <div className="font-mono text-sm">{selectedLog.ip_address}</div>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <div className="text-sm font-medium text-gray-600">User Agent</div>
                  <div className="text-sm text-gray-600 break-all">{selectedLog.user_agent}</div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Additional Data</div>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Error Message</div>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-800">
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
