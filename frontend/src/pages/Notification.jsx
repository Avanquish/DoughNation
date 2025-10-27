import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, LogOut, UserCircle, Bell } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
const NotificationAction = () => {

    function UnreadCircle({ read }) {
        return (
            <span
                aria-hidden
                className={`inline-block mr-2 rounded-full align-middle shrink-0 ${read
                        ? "w-2.5 h-2.5 border border-[#BF7327] bg-transparent"
                        : "w-2.5 h-2.5 border border-[#BF7327] bg-[#BF7327]"
                    }`}
                title={read ? "Read" : "Unread"}
            />
        );
    }

    // Keep tab on reload
    // useEffect(() => {
    //     try {
    //         if (!activeTab) return;
    //         localStorage.setItem(ADMIN_TAB_KEY, activeTab);

    //         const params = new URLSearchParams(window.location.search);
    //         if (params.get("tab") !== activeTab) {
    //             params.set("tab", activeTab);
    //             const next = `${window.location.pathname}?${params.toString()}${window.location.hash
    //                 }`;
    //             window.history.replaceState({}, "", next);
    //         }
    //     } catch { }
    // }, [activeTab]);

    // Data
    const [stats, setStats] = useState({
        totalBakeries: 0,
        totalCharities: 0,
        totalUsers: 0,
        pendingUsersCount: 0,
    });
    const [pendingUsers, setPendingUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [complaints, setComplaints] = useState([]);

    // Notifications
    const [notifOpen, setNotifOpen] = useState(false);
    const [readNotifs, setReadNotifs] = useState(new Set());
    const [notifTab, setNotifTab] = useState("verifications"); // "verifications" | "complaints" | "reports"
    const dropdownRef = useRef(null);
    const bellRef = useRef(null);

    const navigate = useNavigate();

    // Close dropdown on outside click
    useEffect(() => {
        if (!notifOpen) return;
        const onDown = (e) => {
            const inDrop =
                dropdownRef.current && dropdownRef.current.contains(e.target);
            const inBell = bellRef.current && bellRef.current.contains(e.target);
            if (!inDrop && !inBell) setNotifOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [notifOpen]);

    // Notifications list
    const notifications = useMemo(() => {
        const reg = pendingUsers.map((u) => ({
            kind: "registration",
            id: `reg-${u.id}`,
            at: u.created_at || null,
            title: `New ${u.role} registration`,
            subtitle: `${u.name} \u00B7 ${u.email}`,
        }));
        const fbs = feedbacks.map((f) => ({
            kind: "feedback",
            id: `fb-${f.id}`,
            at: f.created_at || f.date || null,
            title: f.type
                ? `${f.type} from ${f.charity_name}`
                : `New report from ${f.charity_name || "Charity"}`,
            subtitle: (f.summary || f.message || f.subject || "")
                .toString()
                .slice(0, 120),
        }));
        const complaintsNotifs = complaints.map((c) => ({
            kind: "complaint",
            id: `comp-${c.id}`,
            at: c.created_at || null,
            title: `Complaint from ${c.user_name || "User"}`,
            subtitle: (c.subject || c.description || "").toString().slice(0, 120),
        }));
        return [...reg, ...fbs, ...complaintsNotifs]
            .sort((a, b) => (a.at && b.at ? new Date(b.at) - new Date(a.at) : 0))
            .map((n) => ({
                ...n,
                isRead: readNotifs.has(n.id),
            }));
    }, [pendingUsers, feedbacks, complaints, readNotifs]);

    // Action: mark as read
    const markAsRead = async (notifId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `/notifications/mark-read/${notifId}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setReadNotifs((prev) => new Set(prev).add(notifId));
        } catch (e) {
            console.error("Failed to mark notification as read:", e);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/notifications/read", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setReadNotifs(new Set(res.data || []));
            } catch (e) {
                console.error("Failed to load read notifications:", e);
            }
        })();
    }, []);

    const notifCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    );


    // Categorized lists & unread counts
    const verificationList = notifications.filter(
        (n) => n.kind === "registration"
    );
    const complaintsList = notifications.filter((n) => n.kind === "complaint");
    const reportsList = notifications.filter((n) => n.kind === "feedback");

    const unreadVerifications = verificationList.filter((n) => !n.isRead).length;
    const unreadComplaints = complaintsList.filter((n) => !n.isRead).length;
    const unreadReports = reportsList.filter((n) => !n.isRead).length;

    return (
        <div className="pt-1 flex items-center gap-3 relative">
            <button
                className="icon-btn relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-full
 bg-white border border-black/10 shadow-md
 hover:shadow-lg transition
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                aria-label="Notifications"
                onClick={() => setNotifOpen((v) => !v)}
                title="Notifications"
            >
                {/* Add bell-icon so overrides apply */}
                <Bell className="w-[18px] h-[18px] text-black bell-icon" />
                {notifCount > 0 && (
                    <span
                        className="absolute -top-1.5 -right-1.5 text-[10px] font-extrabold leading-none px-[6px] py-[3px] rounded-full text-white"
                        style={{
                            background:
                                "linear-gradient(90deg, var(--brand2, #E49A52), var(--brand3, #BF7327))",
                            boxShadow: "0 6px 16px rgba(201,124,44,.35)",
                            border: "1px solid rgba(255,255,255,.65)",
                        }}
                    >
                        {notifCount > 99 ? "99+" : notifCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 top-12 z-[60] w-[460px] max-w-[90vw]"
                >
                    <div className="gwrap rounded-2xl shadow-xl">
                        <div className="glass-card rounded-[14px] overflow-hidden">
                            {/* Tabs header */}
                            <div className="flex items-center">
                                {[
                                    {
                                        key: "verifications",
                                        label: "Verifications",
                                        count: unreadVerifications,
                                    },
                                    {
                                        key: "complaints",
                                        label: "Complaints",
                                        count: unreadComplaints,
                                    },
                                    {
                                        key: "reports",
                                        label: "Reports",
                                        count: unreadReports,
                                    },
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setNotifTab(t.key)}
                                        className={`flex-1 py-2.5 text-sm font-bold transition-colors ${notifTab === t.key
                                            ? "text-white"
                                            : "text-[#6b4b2b] hover:text-[#4f371f]"
                                            }`}
                                        style={
                                            notifTab === t.key
                                                ? {
                                                    background:
                                                        "linear-gradient(90deg, var(--brand1,#F6C17C), var(--brand2,#E49A52), var(--brand3,#BF7327))",
                                                }
                                                : { background: "transparent" }
                                        }
                                    >
                                        {t.label}
                                        {t.count > 0 && (
                                            <span
                                                className="ml-1 text-[11px] font-extrabold"
                                                style={{
                                                    color:
                                                        notifTab === t.key ? "#fff" : "#BF7327",
                                                }}
                                            >
                                                ({t.count})
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Lists */}
                            <div className="max-h-80 overflow-y-auto divide-y">
                                {/* VERIFICATIONS */}
                                {notifTab === "verifications" && (
                                    <div>
                                        {verificationList.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500">
                                                No verification alerts
                                            </div>
                                        ) : (
                                            verificationList.map((n) => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setNotifOpen(false);
                                                        setActiveTab("users");
                                                    }}
                                                    className={`w-full p-3 focus:outline-none transition-colors flex items-center ${n.isRead
                                                        ? "bg-white hover:bg-[#fff6ec]"
                                                        : "bg-[rgba(255,246,236,1)]"
                                                        }`}
                                                >
                                                    <UnreadCircle read={n.isRead} />
                                                    <div className="text-left flex-1">
                                                        <p
                                                            className={`text-[13px] ${n.isRead
                                                                ? "text-[#6b4b2b]"
                                                                : "text-[#4f371f] font-semibold"
                                                                }`}
                                                        >
                                                            {n.title}
                                                        </p>
                                                        {n.subtitle && (
                                                            <p className="text-[12px] text-[#6b4b2b]">
                                                                {n.subtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {n.at
                                                            ? new Date(n.at).toLocaleDateString()
                                                            : ""}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* COMPLAINTS */}
                                {notifTab === "complaints" && (
                                    <div>
                                        {complaintsList.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500">
                                                No complaints
                                            </div>
                                        ) : (
                                            complaintsList.map((n) => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setNotifOpen(false);
                                                        setActiveTab("complaints");
                                                    }}
                                                    className={`w-full p-3 focus:outline-none transition-colors flex items-center ${n.isRead
                                                        ? "bg-white hover:bg-[#fff6ec]"
                                                        : "bg-[rgba(255,246,236,1)]"
                                                        }`}
                                                >
                                                    <UnreadCircle read={n.isRead} />
                                                    <div className="text-left flex-1">
                                                        <p
                                                            className={`text-[13px] ${n.isRead
                                                                ? "text-[#6b4b2b]"
                                                                : "text-[#4f371f] font-semibold"
                                                                }`}
                                                        >
                                                            {n.title}
                                                        </p>
                                                        {n.subtitle && (
                                                            <p className="text-[12px] text-[#6b4b2b]">
                                                                {n.subtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {n.at
                                                            ? new Date(n.at).toLocaleDateString()
                                                            : ""}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* REPORTS */}
                                {notifTab === "reports" && (
                                    <div>
                                        {reportsList.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500">
                                                No reports
                                            </div>
                                        ) : (
                                            reportsList.map((n) => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setNotifOpen(false);
                                                        setActiveTab("reports");
                                                    }}
                                                    className={`w-full p-3 focus:outline-none transition-colors flex items-center ${n.isRead
                                                        ? "bg-white hover:bg-[#fff6ec]"
                                                        : "bg-[rgba(255,246,236,1)]"
                                                        }`}
                                                >
                                                    <UnreadCircle read={n.isRead} />
                                                    <div className="text-left flex-1">
                                                        <p
                                                            className={`text-[13px] ${n.isRead
                                                                ? "text-[#6b4b2b]"
                                                                : "text-[#4f371f] font-semibold"
                                                                }`}
                                                        >
                                                            {n.title}
                                                        </p>
                                                        {n.subtitle && (
                                                            <p className="text-[12px] text-[#6b4b2b]">
                                                                {n.subtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {n.at
                                                            ? new Date(n.at).toLocaleDateString()
                                                            : ""}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 text-[11px] text-[#8a5a25] bg-white/70">
                                Tip: Click a notification to jump to its section.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationAction;
