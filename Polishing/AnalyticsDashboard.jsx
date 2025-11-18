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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#F6C17C] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#7b5836] text-sm">
            Loading analytics, whipping up the numbers...
          </p>
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
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#FFF7EB] via-[#FFF3E2] to-[#FFE7CC] p-2.5 sm:p-5 border border-[#e9d7c3] shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 mb-3 sm:mb-5">
          {/* Total Users */}
          <Card className="bg-gradient-to-br from-white to-[#FFF9F1] border-[#e8d8c2] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#7b5836] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FFF3E0] p-1">
                  <Users className="w-4 h-4 text-[#BF7327]" />
                </span>
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="flex items-end justify-between">
                <div className="text-xl sm:text-2xl font-extrabold text-[#2a170a]">
                  {users?.total || 0}
                </div>
              </div>
              <p className="mt-1 text-[9px] sm:text-[11px] text-[#7b5836] flex items-center gap-1">
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-[3px]">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </span>
                <span className="font-semibold">
                  {users?.new_this_week || 0} new
                </span>
                <span className="text-[#a27a4a]">this week</span>
              </p>
            </CardContent>
          </Card>

          {/* Total Bakeries */}
          <Card className="bg-gradient-to-br from-white to-[#FFF9F1] border-[#e8d8c2] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#7b5836] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FFF0DA] p-1">
                  <Building2 className="w-4 h-4 text-[#BF7327]" />
                </span>
                Total Bakeries
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="text-xl sm:text-2xl font-extrabold text-[#BF7327]">
                {users?.bakeries || 0}
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#7b5836] mt-1">
                Registered bakery accounts
              </p>
            </CardContent>
          </Card>

          {/* Total Charities */}
          <Card className="bg-gradient-to-br from-white to-[#F6FFF7] border-[#d4ecd6] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#2f5e3f] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-1">
                  <HelpingHand className="w-4 h-4 text-emerald-600" />
                </span>
                Total Charities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                {users?.charities || 0}
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#386f48] mt-1">
                Registered charity accounts
              </p>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="bg-gradient-to-br from-white to-[#F1FFF5] border-[#cbe9d6] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#2f5e3f] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-1">
                  <Activity className="w-4 h-4 text-emerald-500" />
                </span>
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                {users?.active || 0}
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#386f48] mt-1">
                {users?.total > 0
                  ? Math.round((users.active / users.total) * 100)
                  : 0}
                % of total users
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 mb-3 sm:mb-5">
          {/* Suspended Users */}
          <Card className="bg-gradient-to-br from-white to-[#FFF8E6] border-[#f3dfb9] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#7b5836] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-yellow-50 p-1">
                  <UserX className="w-4 h-4 text-[#f59e0b]" />
                </span>
                Suspended
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="text-xl sm:text-2xl font-extrabold text-[#d97706]">
                {users?.suspended || 0}
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#a16207] mt-1">
                Temporarily disabled accounts
              </p>
            </CardContent>
          </Card>

          {/* Banned Users */}
          <Card className="bg-gradient-to-br from-white to-[#FFF1F1] border-[#f5d0d0] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#7b3b36] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-red-50 p-1">
                  <Ban className="w-4 h-4 text-[#ef4444]" />
                </span>
                Banned
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="text-xl sm:text-2xl font-extrabold text-[#b91c1c]">
                {users?.banned || 0}
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#7f1d1d] mt-1">
                Permanently blocked accounts
              </p>
            </CardContent>
          </Card>

          {/* Pending Users */}
          <Card className="bg-gradient-to-br from-white to-[#FFF6EB] border-[#f7d7ae] shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200 rounded-2xl col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-[#7b5836] flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-orange-50 p-1">
                  <AlertCircle className="w-4 h-4 text-[#f97316]" />
                </span>
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2.5 sm:pb-3">
              <div className="text-xl sm:text-2xl font-extrabold text-[#ea580c]">
                {users?.pending || 0}
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#9a3412] mt-1">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-5">
          {/* User Distribution */}
          <Card className="bg-white/95 border-[#e8d8c2] shadow-sm rounded-2xl hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#2a170a]">
                User Distribution
              </CardTitle>
              <CardDescription className="text-xs text-[#7b5836]">
                Breakdown by role and status
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#FFF1DC] p-2">
                      <Building2 className="w-5 h-5 text-[#BF7327]" />
                    </span>
                    <span className="font-medium text-[#3b2a18]">Bakeries</span>
                  </div>
                  <span className="text-lg sm:text-2xl font-extrabold text-[#2a170a]">
                    {users?.bakeries || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-2">
                      <HelpingHand className="w-5 h-5 text-emerald-600" />
                    </span>
                    <span className="font-medium text-[#3b2a18]">
                      Charities
                    </span>
                  </div>
                  <span className="text-lg sm:text-2xl font-extrabold text-emerald-700">
                    {users?.charities || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-dashed border-[#f0e0cd]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-orange-50 p-2">
                      <AlertCircle className="w-5 h-5 text-[#f97316]" />
                    </span>
                    <span className="font-medium text-[#3b2a18]">
                      Pending Approval
                    </span>
                  </div>
                  <span className="text-lg sm:text-2xl font-extrabold text-[#ea580c]">
                    {users?.pending || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Activity */}
          <Card className="bg-white/95 border-[#e8d8c2] shadow-sm rounded-2xl hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-[#2a170a] flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#FFF1DC] p-1.5">
                      <Activity className="w-4 h-4 text-[#BF7327]" />
                    </span>
                    System Activity
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7b5836] mt-1">
                    Recent statistics and security signals
                  </CardDescription>
                  {lastUpdated && (
                    <p className="text-[10px] text-[#a07640] mt-1">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-full border border-[#f1dec7] bg-white/80 hover:bg-[#FFF3E2] px-2.5 py-1.5"
                >
                  <Activity
                    className={`w-4 h-4 text-[#BF7327] ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-[11px] font-medium text-[#6b4b2b]">
                    Refresh
                  </span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7b5836] flex items-center gap-2">
                    Total Donations
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-[#2a170a]">
                    {donations?.total || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7b5836]">
                    Total Audit Events
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-[#2a170a]">
                    {audit?.total_events || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-dashed border-[#f0e0cd]">
                  <span className="text-sm text-[#7b5836]">
                    Failed Logins Today
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-extrabold ${
                      (security?.failed_logins_today || 0) > 10
                        ? "text-red-600"
                        : "text-[#2a170a]"
                    }`}
                  >
                    {security?.failed_logins_today || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7b5836]">
                    Critical Events
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-extrabold ${
                      (security?.critical_events || 0) > 0
                        ? "text-red-600"
                        : "text-[#2a170a]"
                    }`}
                  >
                    {security?.critical_events || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/95 border-[#e8d8c2] shadow-sm rounded-2xl hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.02] transition-all duration-200">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm font-semibold text-[#2a170a]">
              Account Status Summary
            </CardTitle>
            <CardDescription className="text-xs text-[#7b5836]">
              Overview of all user account statuses
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="text-center p-2.5 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl border border-emerald-100 shadow-[0_1px_3px_rgba(16,185,129,0.2)] hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.03] transition-all duration-200">
                <div className="text-lg sm:text-2xl font-extrabold text-emerald-700">
                  {users?.active || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-800 mt-1 font-medium">
                  Active
                </div>
              </div>
              <div className="text-center p-2.5 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100/60 rounded-2xl border border-orange-100 hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.03] transition-all duration-200">
                <div className="text-lg sm:text-2xl font-extrabold text-orange-600">
                  {users?.pending || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-orange-800 mt-1 font-medium">
                  Pending
                </div>
              </div>
              <div className="text-center p-2.5 sm:p-4 bg-gradient-to-br from-yellow-50 to-yellow-100/60 rounded-2xl border border-yellow-100 hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.03] transition-all duration-200">
                <div className="text-lg sm:text-2xl font-extrabold text-yellow-600">
                  {users?.suspended || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-yellow-800 mt-1 font-medium">
                  Suspended
                </div>
              </div>
              <div className="text-center p-2.5 sm:p-4 bg-gradient-to-br from-red-50 to-red-100/60 rounded-2xl border border-red-100 hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.03] transition-all duration-200">
                <div className="text-lg sm:text-2xl font-extrabold text-red-600">
                  {users?.banned || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-red-800 mt-1 font-medium">
                  Banned
                </div>
              </div>
              <div className="text-center p-2.5 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100/60 rounded-2xl border border-gray-100 hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.03] transition-all duration-200">
                <div className="text-lg sm:text-2xl font-extrabold text-gray-700">
                  {users?.deactivated || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-700 mt-1 font-medium">
                  Deactivated
                </div>
              </div>
              <div className="text-center p-2.5 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100/60 rounded-2xl border border-purple-100 hover:shadow-md hover:-translate-y-[2px] hover:scale-[1.03] transition-all duration-200">
                <div className="text-lg sm:text-2xl font-extrabold text-purple-600">
                  {users?.rejected || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-purple-800 mt-1 font-medium">
                  Rejected
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
