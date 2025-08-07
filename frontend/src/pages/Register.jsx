import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, Store, MapPin } from "lucide-react";

// Leaflet icon setup
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const defaultCenter = { lat: 14.5995, lng: 120.9842 };

const LocationSelector = ({ setLocation, setFormData }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setLocation({ lat, lng });

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await response.json();
        const address = data?.display_name || "Unknown location";
        setFormData((prev) => ({ ...prev, address }));
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        setFormData((prev) => ({ ...prev, address: "Error retrieving address" }));
      }
    },
  });

  return null;
};

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    role: "bakery",
    email: "",
    contact_person: "",
    contact_number: "",
    address: "",
    password: "",
    confirm_password: "",
  });

  const [profilePicture, setProfilePicture] = useState(null);
  const [proofOfValidity, setProofOfValidity] = useState(null);
  const [location, setLocation] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [emailChecking, setEmailChecking] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const checkEmailAvailability = async (email) => {
    if (!email.includes("@")) return;

    setEmailChecking(true);
    try {
      const res = await axios.get("http://localhost:8000/check-email", {
        params: { email },
      });
      setEmailAvailable(res.data.available);
    } catch (error) {
      console.error("Email check failed:", error);
      setEmailAvailable(true); // fail-safe fallback
    } finally {
      setEmailChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { role, email, password, confirm_password } = formData;
    const domain = email.split("@")[1];
    const allowedDomains = {
      bakery: "bakery.com",
      charity: "charity.com",
      admin: "admin.com",
    };

    if (!allowedDomains[role] || domain !== allowedDomains[role]) {
      return Swal.fire({
        icon: "error",
        title: "Invalid Email Domain",
        text: `Email must end with @${allowedDomains[role]} for ${role} users.`,
      });
    }

    if (password !== confirm_password) {
      return Swal.fire({
        icon: "error",
        title: "Passwords do not match",
        text: "Please ensure both passwords match.",
      });
    }

    if (!emailAvailable) {
      return Swal.fire({
        icon: "error",
        title: "Email Already Used",
        text: "Please use a different email address.",
      });
    }

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submitData.append(key, value);
    });
    submitData.append("profile_picture", profilePicture);
    submitData.append("proof_of_validity", proofOfValidity);
    if (location) {
      submitData.append("latitude", location.lat);
      submitData.append("longitude", location.lng);
    }

    try {
      await axios.post("http://localhost:8000/register", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      Swal.fire({
        icon: "success",
        title: "Registration Successful",
        text: "You have successfully registered.",
      }).then(() => navigate("/"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: error?.response?.data?.detail || "Something went wrong.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">DoughNation</span>
          </div>
          <p className="text-muted-foreground">Join our community of giving</p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Join DoughNation and make a difference</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
              <Tabs value={formData.role} onValueChange={(val) => handleInputChange("role", val)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bakery" className="flex items-center gap-1">
                    <Store className="h-4 w-4" /> Bakery
                  </TabsTrigger>
                  <TabsTrigger value="charity" className="flex items-center gap-1">
                    <Heart className="h-4 w-4" /> Charity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bakery" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Bakery Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required />
                  </div>
                </TabsContent>
                <TabsContent value="charity" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    handleInputChange("email", e.target.value);
                  }}
                  onBlur={(e) => checkEmailAvailability(e.target.value)}
                  required
                />
                {!emailAvailable && (
                  <p className="text-red-500 text-sm">This email is already taken.</p>
                )}
                {emailChecking && (
                  <p className="text-sm text-gray-500 italic">Checking email availability...</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange("contact_person", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={formData.contact_number}
                    onChange={(e) => handleInputChange("contact_number", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</Label>
                <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} required />
              </div>

              <div className="h-64 rounded border overflow-hidden">
                <MapContainer
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  zoom={13}
                  scrollWheelZoom={window.innerWidth > 768}
                  style={{ height: "250px", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector setLocation={setLocation} setFormData={setFormData} />
                  {location && <Marker position={[location.lat, location.lng]} />}
                </MapContainer>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={formData.confirm_password} onChange={(e) => handleInputChange("confirm_password", e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <Input type="file" accept="image/*" onChange={(e) => setProfilePicture(e.target.files[0])} required />
              </div>

              <div className="space-y-2">
                <Label>Proof of Validity</Label>
                <Input type="file" onChange={(e) => setProofOfValidity(e.target.files[0])} required />
              </div>

              <Button type="submit" className="w-full" disabled={!emailAvailable}>
                Create Account
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </div>
              <div className="text-center text-sm">
                <Link to="/" className="text-muted-foreground hover:underline">Back to Home</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
