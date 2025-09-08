import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, Link } from "react-router-dom";

// Map & geocoding bits
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// UI kit pieces
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, Store, MapPin } from "lucide-react";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Default map center (Manila as a friendly starting point)
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
        setFormData((prev) => ({
          ...prev,
          address: "Error retrieving address",
        }));
      }
    },
  });

  return null;
};

export default function Register() {
  const navigate = useNavigate();

 // Form fields
  const [formData, setFormData] = useState({
    name: "",
    role: "bakery", // "bakery" or "charity" (admin pre-defined in the backend)
    email: "",
    contact_person: "",
    contact_number: "",
    address: "",
    password: "",
    confirm_password: "",
  });

  // File uploads
  const [profilePicture, setProfilePicture] = useState(null);
  const [proofOfValidity, setProofOfValidity] = useState(null);

  // Map-selected location
  const [location, setLocation] = useState(null);

  // Email availability feedback
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [emailChecking, setEmailChecking] = useState(false);

  // One-liner to update any single form field by key
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };


  const checkEmailAvailability = async (email) => {
    if (!email || !email.includes("@")) return; // skip clearly invalid input
    setEmailChecking(true);
    try {
      const res = await axios.get("http://localhost:8000/check-email", {
        params: { email },
      });
      setEmailAvailable(res.data.available);
    } catch (error) {
      console.error("Email check failed:", error);
      setEmailAvailable(true);
    } finally {
      setEmailChecking(false);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { role, email, password, confirm_password } = formData;

    // Simple email validation by role
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
    if (profilePicture) submitData.append("profile_picture", profilePicture);
    if (proofOfValidity)
      submitData.append("proof_of_validity", proofOfValidity);
    if (location) {
      submitData.append("latitude", location.lat);
      submitData.append("longitude", location.lng);
    }

    try {
      await axios.post("http://localhost:8000/register", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
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

  const bgRef = useRef(null);
  const rafRef = useRef(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  const enableParallax =
    typeof window !== "undefined" &&
    window.matchMedia &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(pointer: coarse)").matches;

  const lerp = (a, b, t) => a + (b - a) * t;

  const loop = () => {
    const max = 22;
    currentRef.current.x = lerp(
      currentRef.current.x,
      targetRef.current.x * max,
      0.075
    );
    currentRef.current.y = lerp(
      currentRef.current.y,
      targetRef.current.y * max,
      0.075
    );
    if (bgRef.current) {
      bgRef.current.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0) scale(1.06)`;
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (!enableParallax) return;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enableParallax]);

  const onMouseMove = (e) => {
    if (!enableParallax) return;
    const { innerWidth: w, innerHeight: h } = window;
    const nx = (e.clientX / w - 0.5) * -1;
    const ny = (e.clientY / h - 0.5) * -1;
    targetRef.current = { x: nx, y: ny };
  };
  const onMouseLeave = () => {
    targetRef.current = { x: 0, y: 0 };
  };

  const tabsListRef = useRef(null);
  const triggerRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const recalcIndicator = () => {
    const list = tabsListRef.current;
    const i = formData.role === "charity" ? 1 : 0;
    const btn = triggerRefs.current[i];
    if (!list || !btn) return;
    const listBox = list.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    setIndicator({
      left: Math.round(btnBox.left - listBox.left),
      width: Math.round(btnBox.width),
    });
  };

  useEffect(() => {
    const id = requestAnimationFrame(recalcIndicator);
    const onResize = () => requestAnimationFrame(recalcIndicator);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(recalcIndicator);
    return () => cancelAnimationFrame(id);
  }, [formData.role]);

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-6"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Background image */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat will-change-transform pointer-events-none filter blur-[2px] brightness-95 saturate-98"
        style={{
          backgroundImage: "url('/images/bakeryregistration.jpg')",
          transform: "scale(1.06)",
        }}
      />
      <div className="absolute inset-0 z-10 bg-[#FFF8F0]/20" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(120%_120%_at_50%_10%,rgba(0,0,0,0)_65%,rgba(0,0,0,0.10)_100%)]" />

      <style>{`
        @keyframes fadeUp { 0% { opacity: 0; transform: translateY(12px);} 100% { opacity:1; transform:translateY(0);} }
        @keyframes brandPop { 0% { opacity:0; transform:translateY(8px) scale(.98); letter-spacing:.2px;}
                              60% { opacity:1; transform:translateY(-4px) scale(1.02); letter-spacing:.5px;}
                             100% { opacity:1; transform:translateY(0) scale(1); letter-spacing:0;} }
        @keyframes titleBounce { 0% { opacity:0; transform:translateY(18px) scale(.96);}
                                55% { opacity:1; transform:translateY(-6px) scale(1.04);}
                               100% { opacity:1; transform:translateY(0) scale(1);} }
        @keyframes subFade { 0% { opacity:0; transform:translateY(8px);} 100% { opacity:1; transform:translateY(0);} }
      `}</style>

      {/* Main card */}
      <div className="relative z-20 w-full max-w-[650px]">
        <Card
          className="relative rounded-[22px] backdrop-blur-2xl bg-white/45 border-white/50 shadow-[0_16px_56px_rgba(0,0,0,0.16)]"
          style={{ animation: "fadeUp 480ms ease-out both" }}
        >

          <div className="absolute inset-0 pointer-events-none rounded-[22px] bg-gradient-to-b from-[#FFF8F0]/45 via-transparent to-[#FFF8F0]/35" />

          {/* Header */}
          <CardHeader className="text-center relative pt-5 pb-3">
            <div
              className="flex items-center justify-center gap-2 mb-1 will-change-transform"
              style={{
                animation: "brandPop 700ms cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: "40ms",
              }}
            >
              <span className="text-[22px] sm:text-[24px] font-extrabold tracking-wide bg-gradient-to-r from-[#fed09b] via-[#e0a864] to-[#c38437] bg-clip-text text-transparent">
                DoughNation
              </span>
            </div>

            <CardTitle
              className="mt-0 text-[28px] sm:text-[34px] bg-gradient-to-r from-[#f8b86a] via-[#dd9f53] to-[#ce893b] bg-clip-text text-transparent will-change-transform"
              style={{
                animation:
                  "titleBounce 800ms cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: "160ms",
              }}
            >
              Create Account
            </CardTitle>
            <CardDescription
              className="text-[14px] sm:text-[16px] bg-gradient-to-r from-[#E3B57E] via-[#C39053] to-[#A66B2E] bg-clip-text text-transparent will-change-transform"
              style={{
                animation: "subFade 520ms ease-out both",
                animationDelay: "320ms",
              }}
            >
              Get started with DoughNation today and make a difference for
              tomorrow!
            </CardDescription>
          </CardHeader>

          {/* Body */}
          <CardContent className="relative pt-2 pb-6">
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              encType="multipart/form-data"
            >
              {/* Role selector */}
              <Tabs
                value={formData.role}
                onValueChange={(val) => {
                  handleInputChange("role", val);
                  requestAnimationFrame(recalcIndicator);
                }}
                className="w-full"
              >
                <TabsList
                  ref={tabsListRef}
                  className="relative grid w-full grid-cols-2
                             h-12 p-1 rounded-full overflow-hidden
                             bg-white/75 backdrop-blur border border-white/70"
                >
                  <span
                    aria-hidden
                    className="absolute top-1 bottom-1 left-0 z-0 rounded-full
                               bg-[linear-gradient(180deg,#FFE3B8_0%,#F6BE83_100%)]
                               transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]
                               pointer-events-none"
                    style={{
                      transform: `translateX(${indicator.left}px)`,
                      width: indicator.width,
                      willChange: "transform,width",
                    }}
                  />
                  {[
                    { value: "bakery", label: "Bakery", icon: Store },
                    { value: "charity", label: "Charity", icon: Heart },
                  ].map((r, i) => {
                    const Icon = r.icon;
                    return (
                      <TabsTrigger
                        key={r.value}
                        value={r.value}
                        ref={(el) => (triggerRefs.current[i] = el)}
                        className="relative z-10 h-full rounded-full
                                   flex items-center justify-center gap-2 px-4
                                   text-[15px] font-medium
                                   text-[#B67B3C] hover:text-[#945c23]
                                   data-[state=active]:text-[#734515]
                                   transition-[color,transform] hover:scale-[1.02] active:scale-[.98]"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{r.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Bakery-only */}
                <TabsContent value="bakery" className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[#8f642a]">
                      Bakery Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                      className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                    />
                  </div>
                </TabsContent>

                {/* Charity-only */}
                <TabsContent value="charity" className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[#8f642a]">
                      Organization Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                      className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-[#8f642a]">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={(e) => checkEmailAvailability(e.target.value)}
                  required
                  className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                />
                {!emailAvailable && (
                  <p className="text-red-500 text-sm">
                    This email is already taken.
                  </p>
                )}
                {emailChecking && (
                  <p className="text-sm text-gray-500 italic">
                    Checking email availability...
                  </p>
                )}
              </div>

              {/* Contact person + number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#8f642a]">Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) =>
                      handleInputChange("contact_person", e.target.value)
                    }
                    required
                    className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] focus-visible:ring-[#E3B57E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#8f642a]">Contact Number</Label>
                  <Input
                    value={formData.contact_number}
                    onChange={(e) =>
                      handleInputChange("contact_number", e.target.value)
                    }
                    required
                    className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] focus-visible:ring-[#E3B57E]"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-[#8f642a]">
                  <MapPin className="h-4 w-4" /> Address
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                  className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] placeholder:text-[#E3B57E] focus-visible:ring-[#E3B57E]"
                />
              </div>

              {/* Click the map to place a marker and auto-fill address via reverse geocoding */}
              <div className="rounded-xl overflow-hidden border border-[#FFE1BE]/70 shadow-sm">
                <MapContainer
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  zoom={13}
                  scrollWheelZoom={
                    typeof window !== "undefined"
                      ? window.innerWidth > 768
                      : false
                  }
                  style={{ height: 260, width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector
                    setLocation={setLocation}
                    setFormData={setFormData}
                  />
                  {location && (
                    <Marker position={[location.lat, location.lng]} />
                  )}
                </MapContainer>
              </div>

              {/* Password + confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#8f642a]">Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    required
                    className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] focus-visible:ring-[#E3B57E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#8f642a]">Confirm Password</Label>
                  <Input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) =>
                      handleInputChange("confirm_password", e.target.value)
                    }
                    required
                    className="h-11 bg-white/85 border-[#FFE1BE] text-[#6c471d] focus-visible:ring-[#E3B57E]"
                  />
                </div>
              </div>

              {/* Required files */}
              <div className="space-y-1.5">
                <Label className="text-[#8f642a]">Profile Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setProfilePicture(e.target.files?.[0] || null)
                  }
                  required
                  className="bg-white/85 border-[#FFE1BE] text-[#6c471d]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8f642a]">Proof of Validity</Label>
                <Input
                  type="file"
                  onChange={(e) =>
                    setProofOfValidity(e.target.files?.[0] || null)
                  }
                  required
                  className="bg-white/85 border-[#FFE1BE] text-[#6c471d]"
                />
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="h-11 md:h-12 w-full text-[15px] sm:text-[16px] text-[#FFE1BE] bg-gradient-to-r from-[#C39053] to-[#E3B57E] hover:from-[#E3B57E] hover:to-[#C39053] border border-[#FFE1BE]/60 shadow-md rounded-xl transition-transform duration-150 active:scale-[0.99]"
                disabled={!emailAvailable}
              >
                Create Account
              </Button>

              {/* Helpful links */}
              <div className="text-center text-sm">
                <span className="text-[#a47134]/90">
                  Already have an account?{" "}
                </span>
                <Link
                  to="/login"
                  className="text-[#b88950] hover:text-[#8f5a1c] transition-colors"
                >
                  Sign in
                </Link>
              </div>
              <div className="text-center text-sm">
                <Link
                  to="/"
                  className="text-[#ad7631] hover:text-[#8f5a1c] transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}