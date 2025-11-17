import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  HelpingHand,
  Ban,
  UserX,
  AlertCircle,
  Activity,
} from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/analytics/dashboard");
      console.log("Analytics Response:", response.data);
      console.log("Security Data:", response.data.security);
      console.log("Audit Data:", response.data.audit);
      setAnalytics(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      Swal.fire("Error", "Failed to load analytics data", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BF7327] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const { users, donations, security, audit } = analytics;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.total || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {users?.new_this_week || 0} new this week
            </p>
          </CardContent>
        </Card>

        {/* Total Bakery Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Bakeries
            </CardTitle>
            <Building2 className="w-4 h-4 text-[#BF7327]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#BF7327]">
              {users?.bakeries || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered bakery accounts
            </p>
          </CardContent>
        </Card>

        {/* Total Charity Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Charities
            </CardTitle>
            <HelpingHand className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users?.charities || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered charity accounts
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
            <Activity className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users?.active || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {users?.total > 0
                ? Math.round((users.active / users.total) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Suspended Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Suspended
            </CardTitle>
            <UserX className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {users?.suspended || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Temporarily disabled</p>
          </CardContent>
        </Card>

        {/* Banned Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Banned
            </CardTitle>
            <Ban className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {users?.banned || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Permanently blocked</p>
          </CardContent>
        </Card>

        {/* Pending Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {users?.pending || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>By role and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#BF7327]" />
                  <span className="font-medium">Bakeries</span>
                </div>
                <span className="text-2xl font-bold">{users?.bakeries || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpingHand className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Charities</span>
                </div>
                <span className="text-2xl font-bold">
                  {users?.charities || 0}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">Pending Approval</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {users?.pending || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>
                  Recent statistics
                  {lastUpdated && (
                    <span className="block text-xs text-gray-400 mt-1">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Donations</span>
                <span className="text-xl font-bold">
                  {donations?.total || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Audit Events</span>
                <span className="text-xl font-bold">{audit?.total_events || 0}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">Failed Logins Today</span>
                <span
                  className={`text-xl font-bold ${
                    (security?.failed_logins_today || 0) > 10
                      ? "text-red-600"
                      : "text-gray-900"
                  }`}
                >
                  {security?.failed_logins_today || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Critical Events</span>
                <span
                  className={`text-xl font-bold ${
                    (security?.critical_events || 0) > 0
                      ? "text-red-600"
                      : "text-gray-900"
                  }`}
                >
                  {security?.critical_events || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status Summary</CardTitle>
          <CardDescription>
            Overview of all user account statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {users?.active || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Active</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {users?.pending || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Pending</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {users?.suspended || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Suspended</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {users?.banned || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Banned</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {users?.deactivated || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Deactivated</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {users?.rejected || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Rejected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
