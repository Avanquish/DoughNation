// ShowSearchedProfile.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChevronLeft, HeartHandshake, MessageSquareText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const API = "http://localhost:8000";

export default function ShowSearchedProfile({ id, onBack }) {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("about");

  // ---------- Styles ----------
  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --grad1:#FFFCF6; --grad2:#FFF3E3; --grad3:#FFE9CF; --grad4:#F9D9AE;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
        --border:rgba(0,0,0,.06);
      }
      .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
      .page-bg::before,.page-bg::after{content:""; position:absolute; inset:0}
      .page-bg::before{
        background:
          radial-gradient(1200px 520px at 12% -10%, var(--grad1) 0%, var(--grad2) 45%, transparent 70%),
          radial-gradient(900px 420px at 110% 18%, rgba(255,208,153,.28), transparent 70%),
          linear-gradient(135deg, #FFFEFB 0%, #FFF8ED 60%, #FFEFD9 100%);
      }
      .page-bg::after{background: repeating-linear-gradient(-35deg, rgba(201,124,44,.045) 0 8px, rgba(201,124,44,0) 8px 18px); mix-blend-mode:multiply; opacity:.10}
      .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.14}
      .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%)}
      .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%)}

      .head{position:sticky; top:0; z-index:40; border-bottom:1px solid var(--border); backdrop-filter: blur(10px);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.96;
        background: linear-gradient(110deg, #ffffff 0%, #fff9f1 28%, #ffefd9 55%, #ffe5c2 100%);
        background-size: 220% 100%;
        animation: headerSlide 18s linear infinite;
      }
      @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
      .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
      .title-ink{font-weight:800; letter-spacing:.2px; background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C); -webkit-background-clip:text; background-clip:text; color:transparent}
      .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem; padding:.30rem .72rem; font-size:.82rem; border-radius:9999px; color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0; font-weight:800;}
      .icon-btn{display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.92); border:1px solid var(--border); box-shadow:0 6px 16px rgba(201,124,44,.14);}

      .ring{width:48px; height:48px; border-radius:9999px; padding:2px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}

      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(201,124,44,.10)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.0)), linear-gradient(135deg,#fbeedc,#f7cea1);}

      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      /* Tabs */
      .subseg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.08); width:fit-content}
      .subseg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .subseg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      /* Message button (square-ish boxed) */
      .msg-btn{
        display:inline-flex; align-items:center; gap:.45rem;
        background:linear-gradient(90deg, var(--brand1), var(--brand2), var(--brand3));
        color:white; border:none; border-radius:12px;
        font-weight:800; padding:.58rem 1.1rem; font-size:.92rem;
        box-shadow:0 8px 18px rgba(201,124,44,.25); transition:transform .18s ease;
      }
      .msg-btn:hover{ transform:translateY(-2px); }
      .msg-btn svg{ width:18px; height:18px; }
    `}</style>
  );

  // ---------- Data ----------
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

  const role = (profile.role || "").toLowerCase() === "bakery" ? "bakery" : "charity";
  const handleBack = () => (typeof onBack === "function" ? onBack() : window.history.back());

  // Message dock trigger (connected to Messages.jsx behavior you’re using)
  const handleMessageClick = () => {
    window.dispatchEvent(
      new CustomEvent("messages:open", {
        detail: { id: Number(profile.id), title: profile.name },
      })
    );
  };

  return (
    <div className="min-h-screen relative">
      <Styles />
      <div className="page-bg">
        <span className="blob a" />
        <span className="blob b" />
      </div>

      {/* Header (unchanged colors) */}
      <header className="head">
        <div className="head-bg" />
        <div className="head-inner">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button className="icon-btn" aria-label="Back" onClick={handleBack}>
                  <ChevronLeft className="h-[18px] w-[18px]" />
                </button>

                <div className="ring">
                  <div>
                    {role === "bakery" ? (
                      <svg width="28" height="28" viewBox="0 0 64 48" aria-hidden="true">
                        <rect x="4" y="12" rx="12" ry="12" width="56" height="28" fill="#E8B06A" />
                        <path
                          d="M18 24c0-3 3-5 7-5s7 2 7 5m4 0c0-3 3-5 7-5s7 2 7 5"
                          stroke="#9A5E22" strokeWidth="2.2" strokeLinecap="round" fill="none"
                        />
                      </svg>
                    ) : (
                      <HeartHandshake className="h-6 w-6 text-amber-700" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 ml-1">
                  {/* Raised name: slightly negative top margin */}
                  <h1 className="title-ink text-3xl sm:text-[32px] leading-tight truncate -mt-1 sm:-mt-2">
                    {profile.name}
                  </h1>
                  <span className="status-chip">{(profile.role || "Profile") + " Profile"}</span>
                </div>
              </div>
            </div>

            {/* Removed header-right message button as requested */}
            <div className="pt-1" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="avatar-ring shrink-0">
                <img
                  src={
                    profile.profile_picture
                      ? `${API}/${String(profile.profile_picture).replace(/^\//, "")}`
                      : "/default-avatar.png"
                  }
                  alt="Profile"
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Name higher here as well for the big hero title */}
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)] -mt-2">
                  {profile.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome to this public profile.
                </p>

                {/* Message button placed UNDER the name (left side), per screenshot */}
                <div className="mt-3">
                  <button className="msg-btn" onClick={handleMessageClick}>
                    <MessageSquareText /> Message
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs – only About; badges stay inside About for bakery */}
            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="subseg">
                  <TabsList className="bg-transparent p-0 border-0">
                    <TabsTrigger value="about">About</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="about" className="pt-6">
                  <Card className="shadow-none border border-[var(--border)]">
                    <CardHeader className="pb-2">
                      <CardTitle style={{ color: "#7a4f1c" }}>About</CardTitle>
                      <CardDescription>
                        {role === "bakery"
                          ? "This bakery tracks products and donations."
                          : "This charity receives donations and supports communities."}
                      </CardDescription>
                    </CardHeader>

                    {role === "bakery" && (
                      <CardContent className="space-y-4">
                        <h3 className="text-[var(--ink)] text-lg font-semibold">Badges</h3>
                        <div className="flex flex-wrap gap-4">
                          {badges && badges.length > 0 ? (
                            badges.map((userBadge) => (
                              <div key={userBadge.id} className="flex flex-col items-center">
                                <img
                                  src={
                                    userBadge.badge?.icon_url
                                      ? `${API}/${String(userBadge.badge.icon_url).replace(/^\//, "")}`
                                      : "/placeholder-badge.png"
                                  }
                                  alt={userBadge.badge?.name}
                                  title={userBadge.badge?.name}
                                  className="w-12 h-12 hover:scale-110 transition-transform"
                                />
                                <span className="text-xs mt-1 text-[var(--ink)]">
                                  {userBadge.badge_name && userBadge.badge_name.trim() !== ""
                                    ? userBadge.badge_name
                                    : userBadge.badge?.name}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              No badges unlocked yet.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}