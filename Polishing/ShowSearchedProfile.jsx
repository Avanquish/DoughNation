import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  MessageSquareText,
  Info,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const API = "http://localhost:8000";

export default function ShowSearchedProfile({ id, onBack }) {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("about");

  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
        --stat-bg1:#fff7ec; --stat-bg2:#ffe8cb; --stat-border:#e7b072;
        --border:rgba(0,0,0,.06);
      }

      .page-bg{position:fixed; inset:0; z-index:-10; pointer-events:none;}
      .page-bg::before{content:""; position:absolute; inset:0;
        background:linear-gradient(135deg,#FFFEFB 0%, #FFF8ED 60%, #FFEFD9 100%);
      }

      /* ===== HEADER (styles kept in case you re-use later; component header removed in JSX) ===== */
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
      .brand-pop{
        background:linear-gradient(90deg,#E3B57E 0%, #F3C27E 25%, #E59B50 50%, #C97C2C 75%, #E3B57E 100%);
        background-size:300% 100%;
        -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
        animation:brandShimmer 6s ease-in-out infinite;
        letter-spacing:.2px; font-weight:800; font-size:clamp(1.15rem,1rem + 1vw,1.6rem);
      }
      @keyframes brandShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

      /* ===== HERO (mirror BakeryProfile) ===== */
      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(201,124,44,.10)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.0)), linear-gradient(135deg,#fbeedc,#f7cea1);}
      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      /* floating back button inside hero (right) */
      .back-fab-hero{
        position:absolute; right:16px; top:16px;
        width:46px; height:46px; border-radius:9999px;
        display:flex; align-items:center; justify-content:center;
        background:#fff; border:1px solid rgba(0,0,0,.06);
        box-shadow:0 10px 22px rgba(201,124,44,.18);
        transition:transform .18s ease, box-shadow .18s ease;
        z-index:50;
      }
      .back-fab-hero:hover{transform:translateY(-1px); box-shadow:0 14px 30px rgba(201,124,44,.24);}

      /* Buttons (pill) */
      .btn-pill{
        position:relative; overflow:hidden; border-radius:9999px; padding:.65rem 1.05rem;
        background:linear-gradient(135deg,#F6C17C,#BF7327); color:#fff; font-weight:700;
        border:1px solid rgba(255,255,255,.65); box-shadow:0 10px 28px rgba(201,124,44,.28);
        transition:transform .18s ease, box-shadow .18s ease;
      }
      .btn-pill:hover{ transform:translateY(-1px) scale(1.02); box-shadow:0 14px 36px rgba(201,124,44,.34); }

      /* Segmented tabs like BakeryProfile */
      .seg-wrap{max-width:80rem; margin:.75rem auto 0;}
      .seg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.10);}
      .seg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .seg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      /* Card frame + glow border like BakeryProfile */
      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55));}
      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .card-zoom{transition:transform .18s ease, box-shadow .18s ease;}
      .card-zoom:hover{transform:translateY(-2px) scale(1.02); box-shadow:0 18px 44px rgba(201,124,44,.18);}

      /* About & Contacts blocks (same pattern) */
      .info-wrap{display:grid; gap:14px;}
      .info-block{
        background:linear-gradient(180deg,#ffffff,#fff8ef);
        border:1px solid rgba(0,0,0,.08);
        border-radius:12px;
        padding:12px 14px;
        box-shadow:inset 0 1px 0 #fff;
      }
      .info-title{display:flex; align-items:center; gap:.6rem; font-weight:800; color:var(--ink);}
      .info-text{
        margin-top:.45rem; font-size:15px; line-height:1.65;
        white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; max-height:240px; overflow:auto;
      }
      .dl{display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;}
      .dlrow{display:grid; grid-template-columns:36px 1fr; align-items:center; gap:.75rem; padding:.35rem .2rem; border-radius:10px;}
      .icon-badge{
        width:28px; height:28px; border-radius:9999px;
        display:inline-flex; align-items:center; justify-content:center;
        background:#fff4e6; border:1px solid #e7b072; box-shadow:inset 0 1px 0 #fff;
      }

      .brown-title{color:#7a4f1c;}
      .msg-btn{
        display:inline-flex; align-items:center; gap:.45rem;
        background:linear-gradient(90deg, var(--brand1), var(--brand2), var(--brand3));
        color:#fff; border:none; border-radius:12px;
        font-weight:800; padding:.58rem 1.1rem; font-size:.92rem;
        box-shadow:0 8px 18px rgba(201,124,44,.25); transition:transform .18s ease;
      }
      .msg-btn:hover{ transform:translateY(-2px); }
      .msg-btn svg{ width:18px; height:18px; }

      /* === TOP SPACING FIX === */

      /* MOBILE*/
      @media (max-width: 767px) {
        .searched-profile-wrapper {
          padding-top: 140px;
        }
      }

      /* TABLET / DESKTOP */
      @media (min-width: 768px) {
        .searched-profile-wrapper {
          padding-top: 48px;
        }
      }
    `}</style>
  );

  /* ===== Data ===== */
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/user/${id}`);
        setProfile(res.data);
        if ((res.data.role || "").toLowerCase() === "bakery") {
          const badgeRes = await axios.get(`${API}/badges/user/${id}`);
          setBadges(badgeRes.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [id]);

  if (!profile) return <div>Loading...</div>;

  const role =
    (profile.role || "").toLowerCase() === "bakery" ? "bakery" : "charity";
  const handleBack =
    typeof onBack === "function" ? onBack : () => window.history.back();

  const handleMessageClick = () => {
    window.dispatchEvent(
      new CustomEvent("messages:open", {
        detail: { id: Number(profile.id), title: profile.name },
      })
    );
  };

  return (
    <div className="min-h-screen relative searched-profile-wrapper">
      <Styles />
      <div className="page-bg" />

      {/* ===== HERO ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />

          {/* floating back button */}
          <button
            className="back-fab-hero"
            aria-label="Back"
            title="Back"
            onClick={handleBack}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="avatar-ring shrink-0">
                <img
                  src={
                    profile.profile_picture
                      ? `${API}/${String(profile.profile_picture).replace(
                          /^\//,
                          ""
                        )}`
                      : "/default-avatar.png"
                  }
                  alt="Profile"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
                  {profile.name}
                </h2>

                <div className="mt-3">
                  <button className="msg-btn" onClick={handleMessageClick}>
                    <MessageSquareText /> Message
                  </button>
                </div>
              </div>
            </div>

            {/* ===== Subtabs (seg) ===== */}
            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="seg-wrap">
                  <div className="seg justify-center">
                    <TabsList className="bg-transparent p-0 border-0">
                      <TabsTrigger
                        value="about"
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] hover:bg-amber-50"
                      >
                        About
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {/* ===== About ===== */}
                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-2">
                        <CardTitle className="brown-title">About</CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        <div className="info-wrap">
                          {/* About block with icon */}
                          <div className="info-block">
                            <div className="info-title">
                              <span className="icon-badge" aria-hidden>
                                <Info className="w-4 h-4" />
                              </span>
                              <span>
                                {role === "bakery"
                                  ? "About This Bakery"
                                  : "About This Charity"}
                              </span>
                            </div>
                            <div className="info-text">
                              {profile?.about ||
                                (role === "bakery"
                                  ? "This bakery tracks products and donations."
                                  : "This charity receives donations and supports communities.")}
                            </div>
                          </div>

                          {/* Contact Details (icon rows) */}
                          {(profile?.contact_person ||
                            profile?.contact_number) && (
                            <div className="info-block">
                              <div className="info-title">
                                <span>Contact Details</span>
                              </div>
                              <div className="dl">
                                {profile?.contact_person && (
                                  <div className="dlrow">
                                    <span
                                      className="icon-badge"
                                      title="Contact Person"
                                    >
                                      <UserIcon className="w-4 h-4" />
                                    </span>
                                    <span className="text-[15px] text-[#5b4632] break-words">
                                      {profile.contact_person}
                                    </span>
                                  </div>
                                )}
                                {profile?.contact_number && (
                                  <div className="dlrow">
                                    <span
                                      className="icon-badge"
                                      title="Contact Number"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </span>
                                    <span className="text-[15px] text-[#5b4632] break-words">
                                      {profile.contact_number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Badges (only for bakery profiles) */}
                          {role === "bakery" && (
                            <div className="info-block">
                              <div className="info-title">
                                <span>Badges</span>
                              </div>
                              {badges && badges.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-2">
                                  {badges.map((userBadge) => (
                                    <div
                                      key={userBadge.id}
                                      className="flex flex-col items-center"
                                    >
                                      <img
                                        src={
                                          userBadge.badge?.icon_url
                                            ? `${API}/${String(
                                                userBadge.badge.icon_url
                                              ).replace(/^\//, "")}`
                                            : "/placeholder-badge.png"
                                        }
                                        alt={userBadge.badge?.name}
                                        title={userBadge.badge?.name}
                                        className="w-12 h-12 hover:scale-110 transition-transform"
                                      />
                                      <span className="text-xs mt-1">
                                        {userBadge.badge_name &&
                                        userBadge.badge_name.trim() !== ""
                                          ? userBadge.badge_name
                                          : userBadge.badge?.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm mt-1">
                                  No badges unlocked yet.
                                </p>
                              )}
                            </div>
                          )}
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
