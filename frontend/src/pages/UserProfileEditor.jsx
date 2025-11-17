import React, { useState } from "react";
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
import { UserCog, Search, Save, AlertCircle } from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";

const UserProfileEditor = () => {
  const [searchUserId, setSearchUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  // Editable fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const fetchUser = async () => {
    if (!searchUserId) {
      Swal.fire("Error", "Please enter a user ID", "error");
      return;
    }

    try {
      setLoading(true);
      // Fetch user from users endpoint (we'll need to get all users and filter, or use status endpoint)
      const statuses = ["Active", "Pending", "Suspended", "Banned", "Deactivated"];
      let foundUser = null;

      for (const status of statuses) {
        try {
          const response = await api.get(`/admin/users/by-status/${status}`);
          const users = response.data.users || [];
          foundUser = users.find((u) => u.id === parseInt(searchUserId));
          if (foundUser) break;
        } catch (err) {
          // Continue searching
        }
      }

      if (!foundUser) {
        Swal.fire("Not Found", `User with ID ${searchUserId} not found`, "error");
        return;
      }

      setUser(foundUser);
      setName(foundUser.name || "");
      setEmail(foundUser.email || "");
      setContactPerson(foundUser.contact_person || "");
      setContactNumber(foundUser.contact_number || "");
      setAddress(foundUser.address || "");
      setAbout(foundUser.about || "");
      setLatitude(foundUser.latitude?.toString() || "");
      setLongitude(foundUser.longitude?.toString() || "");
    } catch (error) {
      console.error("Failed to fetch user:", error);
      Swal.fire("Error", "Failed to load user profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Swal.fire("Error", "No user loaded", "error");
      return;
    }

    // Validation
    if (!name.trim()) {
      Swal.fire("Error", "Name is required", "error");
      return;
    }
    if (!email.trim()) {
      Swal.fire("Error", "Email is required", "error");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire("Error", "Invalid email format", "error");
      return;
    }

    // Confirm changes
    const result = await Swal.fire({
      title: "Update User Profile",
      html: `
        <div class="text-left space-y-2">
          <p>You are about to update the profile for:</p>
          <p><strong>${user.name}</strong> (ID: ${user.id})</p>
          <p class="text-sm text-gray-600 mt-4">This action will be logged for audit purposes.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#BF7327",
      confirmButtonText: "Update Profile",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        email: email.trim(),
      };

      if (contactPerson.trim()) payload.contact_person = contactPerson.trim();
      if (contactNumber.trim()) payload.contact_number = contactNumber.trim();
      if (address.trim()) payload.address = address.trim();
      if (about.trim()) payload.about = about.trim();
      if (latitude && !isNaN(parseFloat(latitude))) {
        payload.latitude = parseFloat(latitude);
      }
      if (longitude && !isNaN(parseFloat(longitude))) {
        payload.longitude = parseFloat(longitude);
      }

      const response = await api.put(`/admin/users/${user.id}/profile`, payload);

      Swal.fire({
        title: "Success!",
        text: response.data.message,
        icon: "success",
      });

      // Refresh user data
      fetchUser();
    } catch (error) {
      console.error("Failed to update profile:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to update user profile",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const clearForm = () => {
    setUser(null);
    setSearchUserId("");
    setName("");
    setEmail("");
    setContactPerson("");
    setContactNumber("");
    setAddress("");
    setAbout("");
    setLatitude("");
    setLongitude("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            User Profile Editor
          </CardTitle>
          <CardDescription>
            Edit user profile information (admin correction only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Section */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="search-user-id">User ID</Label>
                <Input
                  id="search-user-id"
                  type="number"
                  placeholder="Enter user ID to load profile"
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") fetchUser();
                  }}
                />
              </div>
              <div className="pt-6">
                <Button
                  onClick={fetchUser}
                  disabled={loading || !searchUserId}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {loading ? "Loading..." : "Load User"}
                </Button>
              </div>
            </div>
          </div>

          {user && (
            <>
              {/* User Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Editing Profile</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-blue-800">
                      <div>
                        <span className="font-medium">User ID:</span> {user.id}
                      </div>
                      <div>
                        <span className="font-medium">Role:</span> {user.role}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {user.status}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Organization/Business Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-person">Contact Person</Label>
                    <Input
                      id="contact-person"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Primary contact name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-number">Contact Number</Label>
                    <Input
                      id="contact-number"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+1-555-0123"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full street address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about">About / Description</Label>
                  <Textarea
                    id="about"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Organization description..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g., 40.7128"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g., -74.0060"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !name.trim() || !email.trim()}
                    className="flex items-center gap-2 bg-[#BF7327] hover:bg-[#A05F1F]"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={clearForm}>
                    Clear Form
                  </Button>
                </div>
              </div>
            </>
          )}

          {!user && !loading && (
            <div className="text-center py-12 text-gray-500">
              <UserCog className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Enter a user ID above to load and edit their profile</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileEditor;
