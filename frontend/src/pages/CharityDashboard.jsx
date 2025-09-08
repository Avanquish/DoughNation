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
  HeartHandshake,
  PackageCheck,
  MessageCircleHeart,
  Smile,
  Users,
  User,
  Bell,
  MessageSquare,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import CharityDonation from "./../pages/CharityDonation";
import DonationTracking from "./../pages/DonationTracking";
import Messages from "../pages/Messages.jsx";
import Complaint from "./Complaint";
import CharityReceived from "./CharityReceived.jsx";

const CharityDashboard = () => {
  const [name, setName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("donation");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]); // <-- Notifications list
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch notifications on mount
  useEffect(() => {
    // Example: fetch notifications from API or localStorage
    const notifData = JSON.parse(localStorage.getItem("notifications")) || [];
    setNotifications(notifData);
  }, []);

  // You can also fetch user info from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Charity User");
        setIsVerified(decoded.is_verified);
        setUserId(decoded.id);
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Render verification screen if not verified
  if (!isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface to-primary/5 p-6">
        <Card className="max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle>Account Verification Required</CardTitle>
            <CardDescription>
              Hello {name}, your account is pending verification.  
              Please wait until an admin verifies your account before using the dashboard features.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={handleLogout} variant="destructive">
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-primary/5">
      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-charity-light rounded-lg">
                <HeartHandshake className="h-6 w-6 text-charity" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{name}</h1>
                <p className="text-muted-foreground">Charity Dashboard</p>
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-4">
              {/* Notification Icon with badge */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className="p-2"
                  onClick={() => setIsNotificationOpen(true)}
                >
                  <Bell className="h-6 w-6 text-foreground" />
                </Button>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                className="p-2"
              >
                <Messages currentUser={currentUser} />
              </Button>

              <Button
                variant="ghost"
                className="p-2"
                onClick={() => navigate(`/charity-dashboard/${userId}/profile`)}
              >
                <User className="h-6 w-6 text-foreground" />
              </Button>

              <Button variant="charity" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      

      {/* Notification Modal */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full"
              onClick={() => setIsNotificationOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">Notifications</h2>

            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no new notifications.</p>
            ) : (
              <ul className="space-y-3">
                {notifications.map((notif, index) => (
                  <li key={index} className="border-b border-gray-200 pb-2">
                    <p className="text-sm font-medium">{notif.bakeryName} has offered a donation!</p>
                    <p className="text-xs text-muted-foreground">
                      Product: {notif.productName} | Quantity: {notif.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notif.timestamp), "PPP p")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tabs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-5">
            <TabsTrigger value="donation">Donation</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="received">To Receive</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="complaint">Complaints</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total Donations Received</p>
                  <PackageCheck className="h-8 w-8 text-primary" />
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Partnered Bakeries</p>
                  <Users className="h-8 w-8 text-charity" />
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardContent className="p-6 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Badges Earned</p>
                  <Smile className="h-8 w-8 text-success" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="received">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Received Donations</CardTitle>
                <CardDescription>Track all items you've received</CardDescription>
              </CardHeader>
              <CardContent>
                <CharityReceived />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Feedback</CardTitle>
                <CardDescription>Charity feedback system</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageCircleHeart className="h-8 w-8 text-charity" />
                <p className="mt-4 text-sm text-muted-foreground">You have no feedback yet.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donation">
            <CharityDonation />
          </TabsContent>

          <TabsContent value="complaint">
            <Complaint />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CharityDashboard;