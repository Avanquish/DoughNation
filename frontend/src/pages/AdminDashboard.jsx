import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  UserCog,
  Building2,
  HelpingHand,
  ShieldCheck,
  LineChart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

const AdminDashboard = () => {
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [stats, setStats] = useState({
    totalBakeries: 0,
    totalCharities: 0,
    totalUsers: 0,
    pendingUsersCount: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Admin User");
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    }
  }, []);

  // Fetch Admin Dashboard Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/admin-dashboard-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats({
          totalBakeries: res.data.totalBakeries,
          totalCharities: res.data.totalCharities,
          totalUsers: res.data.totalUsers,
          pendingUsersCount: res.data.pendingUsers,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Fetch Pending Users (for table)
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/pending-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingUsers(res.data);
      } catch (error) {
        console.error("Error fetching pending users:", error);
      }
    };
    fetchPending();
  }, []);

  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/verify-user/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      setStats(prev => ({ ...prev, pendingUsersCount: prev.pendingUsersCount - 1 }));
    } catch (error) {
      console.error("Error verifying user:", error);
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/reject-user/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      setStats(prev => ({ ...prev, pendingUsersCount: prev.pendingUsersCount - 1 }));
    } catch (error) {
      console.error("Error rejecting user:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-primary/5">
      {/* HEADER */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-admin-light rounded-lg">
                <ShieldCheck className="h-6 w-6 text-admin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{name}</h1>
                <p className="text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
            <Button variant="admin" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">System Analytics</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Bakeries</p>
                    <p className="text-lg font-medium">{stats.totalBakeries}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-primary" />
                </CardContent>
              </Card>
              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Charities</p>
                    <p className="text-lg font-medium">{stats.totalCharities}</p>
                  </div>
                  <HelpingHand className="h-8 w-8 text-success" />
                </CardContent>
              </Card>
              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-lg font-medium">{stats.totalUsers}</p>
                  </div>
                  <UserCog className="h-8 w-8 text-admin" />
                </CardContent>
              </Card>
              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Users</p>
                    <p className="text-lg font-medium">{stats.pendingUsersCount}</p>
                  </div>
                  <UserCog className="h-8 w-8 text-admin" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Approve or reject pending user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length > 0 ? (
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Role</th>
                        <th className="p-2 text-left">Proof</th>
                        <th className="p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((user) => (
                        <tr key={user.id} className="border-t">
                          <td className="p-2">{user.name}</td>
                          <td className="p-2">{user.email}</td>
                          <td className="p-2">{user.role}</td>
                          <td className="p-2">
                            {user.proof_file ? (
                              <a
                                href={`http://localhost:8000/${user.proof_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                              >
                                View Proof
                              </a>
                            ) : (
                              "No file"
                            )}
                          </td>
                          <td className="p-2 flex gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleVerify(user.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReject(user.id)}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending users.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>Graphs and statistics coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
