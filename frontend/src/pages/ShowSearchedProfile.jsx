import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { ChevronLeft, HeartHandshake } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RecentDonations from "./RecentDonations";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const API = "https://api.doughnationhq.cloud";


// Show a searched profile by ID, with back button
export default function ShowSearchedProfile({ id, onBack }) {
  const [profile, setProfile] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [badges, setBadges] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("about");

  // Styles
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

      /* Background */
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

      /* Header */
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

      /* Back pill + ring */
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
      @media (prefers-reduced-motion: reduce){ .logo-spin{ animation:none; } }

      /* Cards + segmented tabs */
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

        // keep bakery-only fetching exactly as before
        if (res.data.role?.toLowerCase() === "bakery") {
          const invRes = await axios.get(`${API}/inventory?bakery_id=${id}`);
          setInventory(invRes.data || []);
          const badgeRes = await axios.get(`${API}/badges/user/${id}`);
          setBadges(badgeRes.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [id]);

  const statusOf = (item) => {
    if (!item.expiration_date) return "fresh";
    const today = new Date();
    const exp = new Date(item.expiration_date);
    const threshold = Number(item.threshold) || 0;
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "expired";
    if (diff <= threshold) return "soon";
    return "fresh";
  };

  const statusCounts = useMemo(() => {
    const expired = inventory.filter((i) => statusOf(i) === "expired").length;
    const soon = inventory.filter((i) => statusOf(i) === "soon").length;
    const fresh = inventory.filter((i) => statusOf(i) === "fresh").length;
    return { expired, soon, fresh, total: inventory.length };
  }, [inventory]);

  const statusPie = [
    { name: "Fresh", value: statusCounts.fresh },
    { name: "Soon", value: statusCounts.soon },
    { name: "Expired", value: statusCounts.expired },
  ];

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

      {/* Header */}
      <header className="head">
        <div className="head-bg" />
        <div className="head-inner">
          <div className="flex items-start justify-between gap-4">
            {/* Back beside the logo */}
            <div className="flex items-center gap-2">
              <button className="icon-btn" aria-label="Back to results" title="Back to results" onClick={handleBack}>
                <ChevronLeft className="h-[18px] w-[18px] ink" />
              </button>

              <div className="flex items-center gap-3">
                <div className="ring">
                  <div>
                    {role === "bakery" ? (
                      // Bread icon 
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
            <div />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="glass-card p-6 sm:p-8">
          {/* Avatar + details */}
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
                <button
                  onClick={() => {
                    const peer = { id: profile.id, name: profile.name, profile_picture: profile.profile_picture || null };
                    localStorage.setItem("open_chat_with", JSON.stringify(peer));
                    window.dispatchEvent(new Event("open_chat"));
                  }}
                  className="mt-3 px-4 py-2 rounded-md text-white font-medium text-sm"
                  style={{ background: "var(--brand2)" }}
                  onMouseOver={(e)=>e.currentTarget.style.background="var(--brand3)"}
                  onMouseOut={(e)=>e.currentTarget.style.background="var(--brand2)"}
                >
                  Message
                </button>
              </div>
            </div>
          </div>

          {/* Tabs*/}
          <div className="mt-6 tabwrap">
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
              <TabsList className="tabbar bg-transparent p-0">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="history">Donation History</TabsTrigger>
                {role === "bakery" && <TabsTrigger value="analytics">Analytics & Badges</TabsTrigger>}
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
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="card-soft">
                  <CardContent className="pt-6">
                    <RecentDonations userId={id} role={role} />
                  </CardContent>
                </Card>
              </TabsContent>

              {role === "bakery" && (
                <TabsContent value="analytics" className="space-y-6">
                  <Card className="card-soft">
                    <CardHeader><CardTitle className="ink">Badges</CardTitle></CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
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
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="ink">Data Visualization</CardTitle>
                      <CardDescription className="text-muted-foreground">Inventory status at a glance</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="p-4 rounded-lg border border-[var(--border)] bg-white/90">
                        <div className="text-sm text-muted-foreground mb-2">Total</div>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={2}>
                                {statusPie.map((_, i) => (
                                  <Cell key={i} fill={["#58a85a", "#e2b046", "#d25151"][i % 3]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border border-[var(--border)] bg-white/90">
                        <div className="text-sm text-muted-foreground mb-2">Fresh vs Soon</div>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: "Fresh", value: statusCounts.fresh },
                                  { name: "Soon", value: statusCounts.soon },
                                ]}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={74}
                              >
                                <Cell fill="#58a85a" />
                                <Cell fill="#e2b046" />
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border border-[var(--border)] bg-white/90">
                        <div className="text-sm text-muted-foreground mb-2">Expired</div>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: "Expired", value: statusCounts.expired },
                                  { name: "Fresh+Soon", value: statusCounts.fresh + statusCounts.soon },
                                ]}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={74}
                              >
                                <Cell fill="#d25151" />
                                <Cell fill="#bdbdbd" />
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}