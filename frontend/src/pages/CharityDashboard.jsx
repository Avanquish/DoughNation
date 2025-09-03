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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CharityDonation from "./../pages/CharityDonation";
import DonationTracking from "./../pages/DonationTracking";
import Messages from "../pages/Messages.jsx"
import Complaint from "./Complaint";

const CharityDashboard = () => {
  const [name, setName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("donation");
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setName(decoded.name || "Charity User");
        setIsVerified(decoded.is_verified);
        setUserId(decoded.id); // store user id for profile redirect
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    }
  }, []);

  useEffect(() => {
      // Example: fetch from localStorage or API
      const user = JSON.parse(localStorage.getItem("user"));
      setCurrentUser(user);
    }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // If user is not verified, show "verification pending" screen
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
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(`/charity-dashboard/${userId}/profile`)}>
                Profile
              </Button>
              <Button variant="charity" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
            < Messages currentUser={currentUser}/>
          </div>
        </div>
      </div>

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

          {/* Dashboard tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-elegant">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Donations Received</p>
                    </div>
                    <PackageCheck className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Partnered Bakeries</p>
                    </div>
                    <Users className="h-8 w-8 text-charity" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Badges Earned</p>
                    </div>
                    <Smile className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Donations + Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Recent Donations</CardTitle>
                  <CardDescription>Donations you've recently accepted</CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Feedback & Ratings</CardTitle>
                  <CardDescription>Feedback from your partnered bakeries</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/* Received Donations tab */}
          <TabsContent value="received">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Received Donations</CardTitle>
                <CardDescription>Track all items you've received</CardDescription>
              </CardHeader>
              <CardContent>
                <DonationTracking></DonationTracking>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback tab */}
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

          {/* Donation tab */}
          <TabsContent value="donation">
            <CharityDonation />
          </TabsContent>

          {/* Donation tab */}
          <TabsContent value="complaint">
            <Complaint />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CharityDashboard;