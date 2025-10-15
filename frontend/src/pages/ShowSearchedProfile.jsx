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
        animation: drift 26s ease-in-out infinite alternate;
      }
      .page-bg::after{
        background: repeating-linear-gradient(-35deg, rgba(201,124,44,.045) 0 8px, rgba(201,124,44,0) 8px 18px);
        mix-blend-mode:multiply; opacity:.10; animation: pan 40s linear infinite;
      }
      .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.14}
      .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%); animation: blob 18s ease-in-out infinite alternate;}
      .blob.b{right:-140px; top:6%; background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%); animation: blob 20s 2s ease-in-out infinite alternate;}
      @keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-18px,0)}}
      @keyframes pan{from{transform:translate3d(0,0,0)}to{transform:translate3d(-6%,-6%,0)}}
      @keyframes blob{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(24px,-20px,0) scale(1.04)}}

      .head{position:sticky; top:0; z-index:40; border-bottom:1px solid var(--border); backdrop-filter: blur(10px);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.96;
        background: linear-gradient(110deg, #ffffff 0%, #fff9f1 28%, #ffefd9 55%, #ffe5c2 100%);
        background-size: 220% 100%;
        animation: headerSlide 18s linear infinite;
      }
      @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
      .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}
      .title-ink{font-weight:800; letter-spacing:.2px; background:linear-gradient(90deg,#F3B56F,#E59B50,#C97C2C); -webkit-background-clip:text; background-clip:text; color:transparent}

      .icon-btn{display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.92); border:1px solid var(--border); box-shadow:0 6px 16px rgba(201,124,44,.14); transition:transform .18s ease, box-shadow .18s ease}
      .icon-btn:hover{transform:translateY(-1px); box-shadow:0 10px 22px rgba(201,124,44,.20)}
      .ring{width:48px; height:48px; border-radius:9999px; padding:2px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789); animation: spin 10s linear infinite; box-shadow:0 10px 24px rgba(201,124,44,.16)}
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
      @keyframes spin{to{transform:rotate(360deg)}}
      .bread{transform-origin:50% 60%; animation: float 6s ease-in-out infinite}
      .charity-float{transform-origin:50% 60%; animation: float 6s ease-in-out infinite}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

      .status-chip{display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem; padding:.30rem .72rem; font-size:.82rem; border-radius:9999px; color:#7a4f1c; background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0; font-weight:800;}

      .hero{position:relative; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(201,124,44,.10)}
      .hero-bg{position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.0)), linear-gradient(135deg,#fbeedc,#f7cea1);}
      .hero-pattern{position:absolute; inset:0; opacity:.10}
      .avatar-ring{position:relative; width:120px; height:120px; border-radius:9999px; padding:3px; background:conic-gradient(from 210deg,#F7C789,#E8A765,#C97C2C,#E8A765,#F7C789)}
      .avatar-ring>img{width:100%; height:100%; object-fit:cover; border-radius:9999px; background:#fff}

      .subseg{display:flex; gap:.4rem; background:rgba(255,255,255,.94); border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.3rem; box-shadow:0 8px 24px rgba(201,124,44,.08); width:fit-content}
      .subseg [role="tab"]{border-radius:10px; padding:.48rem .95rem; color:#6b4b2b; font-weight:700}
      .subseg [role="tab"][data-state="active"]{color:#fff; background:linear-gradient(90deg,var(--brand1),var(--brand2),var(--brand3)); box-shadow:0 8px 18px rgba(201,124,44,.28)}

      .gwrap{position:relative; border-radius:16px; padding:1px; background:linear-gradient(135deg, rgba(247,199,137,.9), rgba(201,124,44,.55)); background-size:200% 200%; animation:borderShift 8s ease-in-out infinite}
      @keyframes borderShift{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
      .glass-card{border-radius:15px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px)}
      .card-zoom{ transition:transform .18s ease, box-shadow .18s ease; will-change: transform; }
      .card-zoom:hover{ transform:translateY(-2px) scale(1.02); box-shadow:0 18px 44px rgba(201,124,44,.18); }

      /* --- NEW: give About and Badges more room --- */
      .section-pad{padding:1.25rem 1.25rem 1.6rem;}
      @media (min-width:640px){.section-pad{padding:1.6rem 1.75rem 2.1rem;}}
      .about-title{margin-bottom:.35rem;}
      .about-body{margin-top:.35rem; line-height:1.85;}
      .badges-wrap{margin-top:1.1rem;}
      .badge-grid{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(92px, 1fr));
        gap:22px 26px;          /* more horizontal + vertical space */
        align-items:start;
      }
      .badge-item{display:flex; flex-direction:column; align-items:center; text-align:center;}
      .badge-item img{width:64px; height:64px; object-fit:contain;}
      .badge-item span{margin-top:.5rem; font-size:.8rem; color:var(--ink);}
      /* --- end NEW --- */

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
                      <svg width="28" height="28" viewBox="0 0 64 48" aria-hidden="true" className="bread">
                        <rect x="4" y="12" rx="12" ry="12" width="56" height="28" fill="#E8B06A" />
                        <path d="M18 24c0-3 3-5 7-5s7 2 7 5m4 0c0-3 3-5 7-5s7 2 7 5"
                          stroke="#9A5E22" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                      </svg>
                    ) : (
                      <HeartHandshake className="h-6 w-6 text-amber-700 charity-float" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 ml-1">
                  <h1 className="title-ink text-2xl sm:text-[26px] truncate">{profile.name}</h1>
                  <span className="status-chip">{(profile.role || "Profile") + " Profile"}</span>
                </div>
              </div>
            </div>
            <div className="pt-1" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <div className="hero">
          <div className="hero-bg" />
          <div className="hero-pattern" />
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
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
                  {profile.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {role === "bakery" ? "Public bakery profile" : "Public charity profile"}
                </p>

                <div className="mt-3">
                  <button className="msg-btn" onClick={handleMessageClick}>
                    <MessageSquareText /> Message
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="subseg">
                  <TabsList className="bg-transparent p-0 border-0">
                    <TabsTrigger value="about">About</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="about" className="pt-6">
                  <div className="gwrap">
                    <Card className="glass-card shadow-none card-zoom">
                      <CardHeader className="pb-0 sm:pb-1 pt-5 sm:pt-6 px-5 sm:px-7">
                        <CardTitle className="about-title" style={{ color: "#7a4f1c" }}>About</CardTitle>
                        <CardDescription className="about-body">
                          {role === "bakery"
                            ? "This bakery tracks products and donations."
                            : role === "charity"
                            ? `This charity receives donations and supports communities. 
                              For inquiries, contact ${profile.contact_person} at ${profile.contact_number}.`
                            : ""}
                        </CardDescription>
                      </CardHeader>

                      {role === "bakery" && (
                        <CardContent className="section-pad">
                          <h3 className="text-[var(--ink)] text-lg font-semibold">Badges</h3>

                          <div className="badges-wrap">
                            {badges && badges.length > 0 ? (
                              <div className="badge-grid">
                                {badges.map((userBadge) => (
                                  <div key={userBadge.id} className="badge-item">
                                    <img
                                      src={
                                        userBadge.badge?.icon_url
                                          ? `${API}/${String(userBadge.badge.icon_url).replace(/^\//, "")}`
                                          : "/placeholder-badge.png"
                                      }
                                      alt={userBadge.badge?.name}
                                      title={userBadge.badge?.name}
                                    />
                                    <span>
                                      {userBadge.badge_name && userBadge.badge_name.trim() !== ""
                                        ? userBadge.badge_name
                                        : userBadge.badge?.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm">No badges unlocked yet.</p>
                            )}
                          </div>
                        </CardContent>
                      )}

                      {role !== "bakery" && (
                        <CardContent className="section-pad">
                      
                        </CardContent>
                      )}
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