import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { ChevronLeft, HeartHandshake } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const API = "https://api.doughnationhq.cloud";

export default function ShowSearchedProfile({ id, onBack }) {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("about");

  const Styles = () => (
    <style>{`
      :root{
        --ink:#7a4f1c;
        --grad1:#FFF7EC; --grad2:#FFE7C8; --grad3:#FFD6A1; --grad4:#F3C27E;
        --brand1:#F6C17C; --brand2:#E49A52; --brand3:#BF7327;
        --paper:rgba(255,255,255,.96);
        --border:rgba(0,0,0,.06);
        --shadow:0 10px 24px rgba(201,124,44,.16);
      }

      .page-bg{position:fixed; inset:0; z-index:-10; overflow:hidden; pointer-events:none;}
      .page-bg::before, .page-bg::after{content:""; position:absolute; inset:0}
      .page-bg::before{
        background:
          radial-gradient(1200px 520px at 12% -10%, var(--grad1) 0%, var(--grad2) 42%, transparent 70%),
          radial-gradient(900px 420px at 110% 18%, rgba(255,208,153,.40), transparent 70%),
          linear-gradient(135deg, #FFF9EF 0%, #FFF2E3 60%, #FFE7D1 100%);
      }
      .page-bg::after{
        background: repeating-linear-gradient(-35deg, rgba(201,124,44,.06) 0 8px, rgba(201,124,44,0) 8px 18px);
        mix-blend-mode:multiply; opacity:.12;
      }
      .blob{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.22}
      .blob.a{left:-120px; top:30%; background:radial-gradient(circle at 35% 35%, #ffd9aa, transparent 60%);}
      .blob.b{right:-140px; top:6%;  background:radial-gradient(circle at 60% 40%, #ffc985, transparent 58%);}

      .head{position:sticky; top:0; z-index:40; border-bottom:1px solid var(--border); backdrop-filter: blur(10px);}
      .head-bg{position:absolute; inset:0; z-index:-1; opacity:.92;
        background: linear-gradient(110deg, #ffffff 0%, #fff8ec 28%, #ffeccd 55%, #ffd7a6 100%);
        background-size: 220% 100%;
        animation: headerSlide 18s linear infinite;
      }
      @keyframes headerSlide{0%{background-position:0% 50%}100%{background-position:100% 50%}}
      .head-inner{max-width:80rem; margin:0 auto; padding:.9rem 1rem;}

      .title-ink{
        font-weight:800; letter-spacing:.2px;
        background:linear-gradient(90deg, var(--brand1), var(--brand2), var(--brand3));
        -webkit-background-clip:text; background-clip:text; color:transparent;
      }
      .status-chip{
        display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem;
        padding:.30rem .72rem; font-size:.82rem; border-radius:9999px;
        color:var(--ink); background:linear-gradient(180deg,#FFE7C5,#F7C489); border:1px solid #fff3e0; font-weight:800;
      }

      .icon-btn{
        display:inline-flex; align-items:center; justify-content:center;
        width:40px; height:40px; border-radius:9999px; background:rgba(255,255,255,.94);
        border:1px solid var(--border); box-shadow:var(--shadow);
      }
      .ring{width:48px; height:48px; border-radius:9999px; padding:2px;
        background:conic-gradient(from 210deg, #F7C789, #E8A765, #C97C2C, #E8A765, #F7C789);
        box-shadow:var(--shadow)}
      .ring>div{width:100%; height:100%; border-radius:9999px; background:#fff; display:flex; align-items:center; justify-content:center}
      @keyframes spin360 { to { transform: rotate(360deg); } }
      .logo-spin{ animation: spin360 8s linear infinite; transform-origin:center; }
      .logo-spin:hover{ animation-play-state: paused; }

      .glass-card{ border-radius:16px; background:var(--paper); border:1px solid var(--border); box-shadow:var(--shadow) }
      .card-soft{ background:rgba(255,255,255,.94); border:1px solid var(--border); }

      .tabwrap{ max-width:80rem; margin:.75rem auto 0; }
      .tabbar{
        display:flex; gap:.5rem; background:rgba(255,255,255,.95);
        border:1px solid var(--border); border-radius:16px; padding:.4rem;
        box-shadow:0 10px 26px rgba(201,124,44,.15); width:fit-content;
      }
      .tabbar [role="tab"]{
        border-radius:12px; padding:.6rem 1rem; color:#6b4b2b; font-weight:800; letter-spacing:.2px;
      }
      .tabbar [role="tab"][data-state="active"]{
        color:#fff; background:linear-gradient(90deg, var(--brand1), var(--brand2), var(--brand3));
        box-shadow:0 8px 18px rgba(201,124,44,.28);
      }

      .ink{ color:var(--ink); }
    `}</style>
  );

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/user/${id}`);
        setProfile(res.data);

        if (res.data.role?.toLowerCase() === "bakery") {
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

  const handleBack = () => {
    if (typeof onBack === "function") onBack();
    else window.history.back();
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
            <div className="flex items-center gap-2">
              <button className="icon-btn" onClick={handleBack}>
                <ChevronLeft className="h-[18px] w-[18px] ink" />
              </button>

              <div className="flex items-center gap-3">
                <div className="ring">
                  <div>
                    {role === "bakery" ? (
                      <svg width="26" height="26" viewBox="0 0 64 48" aria-hidden="true" className="logo-spin">
                        <rect x="4" y="12" rx="12" ry="12" width="56" height="28" fill="#E8B06A" />
                        <path d="M18 24c0-3 3-5 7-5s7 2 7 5m4 0c0-3 3-5 7-5s7 2 7 5"
                              stroke="#7a4f1c" strokeWidth="2.1" strokeLinecap="round" fill="none" />
                      </svg>
                    ) : (
                      <HeartHandshake className="h-[22px] w-[22px] ink logo-spin" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h1 className="title-ink text-[22px] sm:text-[24px] truncate">{profile.name}</h1>
                  <span className="status-chip">{profile.role?.toUpperCase()} Profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 rounded-full border border-[var(--border)] overflow-hidden bg-white">
                <img
                  src={profile.profile_picture ? `${API}/${profile.profile_picture}` : "/default-avatar.png"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="ink text-2xl font-semibold">{profile.name}</h1>
                <p className="text-muted-foreground">Welcome Visitors! Hope You Enjoy!</p>
              </div>
            </div>
          </div>

          {/* Only About Tab with Badges */}
          <div className="mt-6 tabwrap">
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
              <TabsList className="tabbar bg-transparent p-0">
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="about">
                <Card className="card-soft">
                  <CardHeader>
                    <CardTitle className="ink">About</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {role === "bakery"
                        ? "This bakery tracks products and donations."
                        : "This charity receives donations and supports communities."}
                    </CardDescription>
                  </CardHeader>
                  {role === "bakery" && (
                    <CardContent>
                      <h3 className="ink text-lg font-semibold mb-2">Badges</h3>
                      <div className="flex flex-wrap gap-4">
                        {badges && badges.length > 0 ? (
                          badges.map((userBadge) => (
                            <div key={userBadge.id} className="flex flex-col items-center">
                              <img
                                src={userBadge.badge?.icon_url ? `${API}/${userBadge.badge.icon_url}` : "/placeholder-badge.png"}
                                alt={userBadge.badge?.name}
                                title={userBadge.badge?.name}
                                className="w-12 h-12 hover:scale-110 transition-transform"
                              />
                              <span className="text-xs mt-1 ink">
                                {userBadge.badge_name && userBadge.badge_name.trim() !== ""
                                  ? userBadge.badge_name
                                  : userBadge.badge?.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No badges unlocked yet.</p>
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
  );
}