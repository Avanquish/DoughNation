import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ChevronLeft, User, HandCoins } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Messages from "./Messages";
import CharityNotification from "./CharityNotification";
import RecentDonations from "./RecentDonations";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

/* ===== Sub-tab state ===== */
const SUBTAB_KEY = "charity_profile_active_subtab";
const ALLOWED_SUBTABS = ["about", "history"];
const getInitialSubTab = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("sub");
    if (fromUrl && ALLOWED_SUBTABS.includes(fromUrl)) return fromUrl;

    const stored = localStorage.getItem(SUBTAB_KEY);
    if (stored && ALLOWED_SUBTABS.includes(stored)) return stored;

    return "about";
  } catch {
    return "about";
  }
};

export default function CharityProfile() {
  const { id } = useParams();
  const [name, setName] = useState("Charity");
  const [activeSubTab, setActiveSubTab] = useState(getInitialSubTab);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();

  /* Keep URL + storage in sync with the current sub-tab */
  useEffect(() => {
    try {
      if (!activeSubTab) return;
      localStorage.setItem(SUBTAB_KEY, activeSubTab);

      const params = new URLSearchParams(window.location.search);
      if (params.get("sub") !== activeSubTab) {
        params.set("sub", activeSubTab);
        const next = `${window.location.pathname}?${params.toString()}${
          window.location.hash
        }`;
        window.history.replaceState({}, "", next);
      }
    } catch {}
  }, [activeSubTab]);

  /* Fetch current user */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API}/information`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;
        setProfilePic(user.profile_picture);
        setName(user.name);
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);

  /* Logout */
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  /* Edit Profile */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const formData = new FormData();
    const name = e.target.name?.value;
    const contactPerson = e.target.contact_person?.value;
    const contactNumber = e.target.contact_number?.value;
    const address = e.target.address?.value;
    const profilePicture = e.target.profile_picture?.files[0];

    if (name) formData.append("name", name);
    if (contactPerson) formData.append("contact_person", contactPerson);
    if (contactNumber) formData.append("contact_number", contactNumber);
    if (address) formData.append("address", address);
    if (profilePicture) formData.append("profile_picture", profilePicture);

    if (formData.keys().next().done) {
      Swal.fire({
        icon: "warning",
        title: "No changes",
        text: "Please fill at least one field to save changes.",
      });
      return;
    }

    try {
      await axios.put(`${API}/edit`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setIsEditOpen(false);
      window.dispatchEvent(new Event("profile:updated"));
      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your changes have been saved successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "There was an error saving your changes. Please try again.",
      });
    }
  };

  /* Change Password */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const data = {
      current_password: e.target.current_password.value,
      new_password: e.target.new_password.value,
      confirm_password: e.target.confirm_password.value,
    };

    if (data.new_password !== data.confirm_password) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    try {
      await axios.put(`${API}/changepass`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setIsChangePassOpen(false);
      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been changed successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to change password:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "There was an error updating your password. Please try again.",
      });
    }
  };

  /* ===== CSS ===== */
  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
      }

      .page-bg{position:fixed; inset:0; z-index:-10; pointer-events:none;}
      .page-bg::before{content:""; position:absolute; inset:0;
        background:linear-gradient(135deg,#FFFEFB 0%, #FFF8ED 60%, #FFEFD9 100%);
      }

      /* ===== HEADER (same as BakeryProfile) ===== */
      .head{position:sticky; top:0; z-index:80; border-bottom:1px solid rgba(0,0,0,.06);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.92;
        background: linear-gradient(110deg, #ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%);
        background-size: 220% 100%;
        animation: headerSlide 18s linear infinite;
      }
      @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
      .hdr-container{max-width:80rem; margin:0 auto; padding:.9rem 1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem;}

      .brand-left{display:flex; align-items:center; gap:.75rem;}
      .brand-left img{width:28px; height:28px; object-fit:contain;}
      .brand-pop {
        background: linear-gradient(90deg, #E3B57E 0%, #F3C27E 25%, #E59B50 50%, #C97C2C 75%, #E3B57E 100%);
        background-size: 300% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        animation: brandShimmer 6s ease-in-out infinite;
        letter-spacing:.2px;
        font-weight:800;
        font-size: clamp(1.15rem, 1rem + 1vw, 1.6rem);
      }
      @keyframes brandShimmer{
        0%{background-position:0% 50%}
        50%{background-position:100% 50%}
        100%{background-position:0% 50%}
      }

      .iconbar{display:flex; align-items:center; gap:.5rem}
      .icon-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.92); border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 16px rgba(201,124,44,.14); transition:transform .18s ease, box-shadow .18s ease}
      .icon-btn:hover{transform:translateY(-1px); box-shadow:0 10px 22px rgba(201,124,44,.20)}

      .btn-logout{
        position:relative; overflow:hidden;
        border-radius:9999px; padding:.58rem .95rem; gap:.5rem;
        background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3));
        color:#fff; border:1px solid rgba(255,255,255,.6);
        box-shadow:0 8px 26px rgba(201,124,44,.25);
        transition:transform .18s ease, box-shadow .18s ease, filter .18s ease;
      }
      .btn-logout:hover{transform:translateY(-1px) scale(1.02); box-shadow:0 12px 34px rgba(201,124,44,.32); filter:saturate(1.05);}

      /* ===== HERO (same as BakeryProfile) ===== */
      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(201,124,44,.10)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.0)), linear-gradient(135deg,#fbeedc,#f7cea1);}
      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      .back-fab-hero{
        position:absolute; right:16px; top:16px;
        width:46px; height:46px; border-radius:9999px;
        display:flex; align-items:center; justify-content:center;
        background:#fff; border:1px solid rgba(0,0,0,.06);
        box-shadow:0 10px 22px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease;
        z-index: 50;
      }
      .back-fab-hero:hover{transform:translateY(-1px); box-shadow:0 14px 30px rgba(201,124,44,.24);}

      .btn-pill{position:relative; overflow:hidden; border-radius:9999px; padding:.65rem 1.05rem;
        background:linear-gradient(135deg,#F6C17C,#BF7327); color:#fff; font-weight:700;
        border:1px solid rgba(255,255,255,.65); box-shadow:0 10px 28px rgba(201,124,44,.28);
        transition:transform .18s ease, box-shadow .18s ease;}
      .btn-pill:hover{ transform:translateY(-1px) scale(1.02); box-shadow:0 14px 36px rgba(201,124,44,.34); }
      .btn-change{
        border-radius:9999px; padding:.65rem 1.05rem; font-weight:800; color:var(--ink);
        background:linear-gradient(180deg,#ffffff,#fff6ea);
        border:1.5px solid #e7b072;
        box-shadow:inset 0 1px 0 #ffffff, 0 8px 20px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .btn-change:hover{ transform:translateY(-1px) scale(1.02); background:linear-gradient(180deg,#fffaf2,#ffe4c6); box-shadow:inset 0 1px 0 #ffffff, 0 12px 30px rgba(201,124,44,.24); }

      /* ===== Subtabs (same visual as BakeryProfile) ===== */
      .seg-wrap{max-width:80rem; margin:.75rem auto 0;}
      .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.10);}
      .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      /* ===== Cards & modal styles (matching BakeryProfile) ===== */
      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55));}

      .overlay-root{position:fixed; inset:0; z-index:60;}
      .overlay-bg{position:absolute; inset:0; background:rgba(0,0,0,.32); backdrop-filter: blur(6px); opacity:0; animation: showBg .2s ease forwards}
      @keyframes showBg{to{opacity:1}}
      .overlay-panel{position:relative; margin:6rem auto 2rem; width:min(92%, 560px); border-radius:16px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.18)}
      .overlay-enter{transform:translateY(10px) scale(.98); opacity:0; animation: pop .22s ease forwards}
      @keyframes pop{to{transform:translateY(0) scale(1); opacity:1}}
      .modal-card{background:rgba(255,255,255,.96); backdrop-filter: blur(8px); border-radius:16px; border:1px solid rgba(0,0,0,.06);}
      .modal-head{background:linear-gradient(180deg,#fff,#fff8ef); border-bottom:1px solid rgba(0,0,0,.06)}
      .brown-title{color:#7a4f1c;}
      .modal-input{border-radius:10px; padding:.65rem .8rem; border:1px solid rgba(0,0,0,.18)}
      .modal-input:focus{outline:none; border-color:#E49A52; box-shadow:0 0 0 3px rgba(228,154,82,.2)}
    `}</style>
  );

  return (
    <div className="min-h-screen relative">
      <Styles />
      <div className="page-bg" />

      {/* ===== HEADER ===== */}
      <header className="head">
        <div className="head-bg" />
        <div className="hdr-container">
          <div className="brand-left">
            <img src="/images/DoughNationLogo.png" alt="DoughNation" />
            <span className="brand-pop">DoughNation</span>
          </div>

          <div className="iconbar">
            <Messages currentUser={currentUser} />
            <CharityNotification />
            <Button
              onClick={handleLogout}
              className="btn-logout flex items-center"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:flex">Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />

          <button
            className="back-fab-hero"
            aria-label="Back to dashboard"
            title="Back"
            onClick={() => navigate(`/charity-dashboard/${id}?tab=donation`)}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="avatar-ring shrink-0">
                <img
                  src={
                    profilePic ? `${API}/${profilePic}` : "/default-avatar.png"
                  }
                  alt="Profile"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
                  {name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome to your public profile.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="btn-pill"
                    onClick={() => setIsEditOpen(true)}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    className="btn-change"
                    onClick={() => setIsChangePassOpen(true)}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>

            {/* ===== Edit Profile Modal ===== */}
            {isEditOpen && (
              <div className="overlay-root" role="dialog">
                <div
                  className="overlay-bg"
                  onClick={() => setIsEditOpen(false)}
                />
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Edit Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-3" onSubmit={handleEditSubmit}>
                        <div className="flex flex-col">
                          <p className="brown-title">Charity Name</p>
                          <input
                            type="text"
                            name="name"
                            defaultValue={name}
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Contact Person</p>
                          <input
                            type="text"
                            name="contact_person"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Contact Number</p>
                          <input
                            type="text"
                            name="contact_number"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Address</p>
                          <input
                            type="text"
                            name="address"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Profile Picture</p>
                          <input
                            type="file"
                            name="profile_picture"
                            accept="image/*"
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="btn-pill">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ===== Change Password Modal ===== */}
            {isChangePassOpen && (
              <div className="overlay-root" role="dialog">
                <div
                  className="overlay-bg"
                  onClick={() => setIsChangePassOpen(false)}
                />
                <div className="overlay-panel overlay-enter">
                  <Card className="modal-card">
                    <CardHeader className="modal-head">
                      <CardTitle className="text-center brown-title">
                        Change Password
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form
                        className="space-y-3"
                        onSubmit={handleChangePassword}
                      >
                        <div className="flex flex-col">
                          <p className="brown-title">Current Password</p>
                          <input
                            type="password"
                            name="current_password"
                            required
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">New Password</p>
                          <input
                            type="password"
                            name="new_password"
                            required
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="brown-title">Confirm New Password</p>
                          <input
                            type="password"
                            name="confirm_password"
                            required
                            className="w-full modal-input"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsChangePassOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="btn-pill">
                            Change Password
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ===== Subtabs ===== */}
            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="seg-wrap">
                  <div className="seg justify-center">
                    <TabsList className="flex items-center gap-1 bg-transparent p-0 border-0 overflow-x-auto no-scrollbar">
                      <TabsTrigger
                        value="about"
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
                      >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">About</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="history"
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
                      >
                        <HandCoins className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          Donation History
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {/* About */}
                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">About</CardTitle>
                        <CardDescription>
                          Tell donors more about your charity
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-[15px] leading-relaxed">
                          Update this section in <em>Edit Profile</em> to
                          display your story, mission, and donation preferences.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Donation History */}
                <TabsContent value="history" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none h-[560px] flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">
                          Donation History
                        </CardTitle>
                        <CardDescription>
                          Your completed donations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 overflow-auto">
                        <div className="h-full max-h-full">
                          <RecentDonations />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
