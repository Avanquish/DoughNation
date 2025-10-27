import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, LogOut, UserCircle } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import UserMenu from "./UserMenu";
import NotificationAction from "./Notification";

const NavBar = () => {
    const handleProfile = () => alert("Go to profile page");
    const handleLogout = () => alert("Logging out...");
    const [showTop, setShowTop] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY || document.documentElement.scrollTop;
            setShowTop(y > 320);
            setScrolled(y > 8);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    return (
        <header className="head fixed top-0 left-0 right-0 z-[80]">
            <div className="head-bg" />
            <div
                className={`glass-soft header-gradient-line header-skin sticky-boost ${scrolled ? "is-scrolled" : ""
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 hdr-pad flex items-center justify-between relative">
                    <Link to="/" className="flex items-center gap-3">
                        <img
                            src="/images/DoughNationLogo.png"
                            alt="DoughNation logo"
                            className="shrink-0"
                            style={{ width: "28px", height: "28px", objectFit: "contain" }}
                        />
                        <span
                            className="font-extrabold brand-pop"
                            style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}
                        >
                            DoughNation
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav
                        className="hidden md:flex items-center gap-5"
                        style={{ fontSize: 15 }}>
                        <Link
                            to="/login"
                            className="nav-link transition-colors"
                            style={{ color: "#5b4631" }}>
                            Dashboards
                        </Link>
                        <Link
                            to="/login"
                            className="nav-link transition-colors"
                            style={{ color: "#5b4631" }}>
                            Donations
                        </Link>
                        <Link
                            to="/login"
                            className="nav-link transition-colors"
                            style={{ color: "#5b4631" }}>
                            Users
                        </Link>
                        <Link
                            to="/login"
                            className="nav-link transition-colors"
                            style={{ color: "#5b4631" }}>
                            Complaints
                        </Link>
                        <Link
                            to="/login"
                            className="nav-link transition-colors"
                            style={{ color: "#5b4631" }}>
                            Reports
                        </Link>
                        <NotificationAction />
                        <UserMenu />
                    </nav>

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:scale-[.98] transition"
                        aria-label="Toggle menu"
                        aria-expanded={mobileOpen ? "true" : "false"}
                        aria-controls="mobile-menu"
                        onClick={() => setMobileOpen((v) => !v)}
                        style={{ color: "#5b4631" }}
                    >
                        {/* bars icon */}
                        <svg
                            className={`h-6 w-6 ${mobileOpen ? "hidden" : "block"}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                        {/* close icon */}
                        <svg
                            className={`h-6 w-6 ${mobileOpen ? "block" : "hidden"}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Mobile dropdown panel */}
                <div
                    id="mobile-menu"
                    className={`md:hidden transition-all duration-200 ease-out ${mobileOpen
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0 pointer-events-none"
                        } overflow-hidden`}
                >
                    <div className="px-4 pb-3 pt-1 flex flex-col">
                        <a
                            href="/"
                            className="block py-2 nav-link"
                            style={{ color: "#5b4631" }}
                            onClick={() => setMobileOpen(false)}
                        >
                            Dashboard
                        </a>
                        <Link
                            to="/login"
                            className="block py-2 nav-link"
                            style={{ color: "#5b4631" }}
                            onClick={() => setMobileOpen(false)}
                        >
                            Donations
                        </Link>
                        <Link
                            to="/login"
                            className="block py-2 nav-link"
                            style={{ color: "#5b4631" }}
                            onClick={() => setMobileOpen(false)}
                        >
                            Users
                        </Link>
                        <Link
                            to="/login"
                            className="block py-2 nav-link"
                            style={{ color: "#5b4631" }}
                            onClick={() => setMobileOpen(false)}
                        >
                            Complaints
                        </Link>
                        <Link
                            to="/login"
                            className="block py-2 nav-link"
                            style={{ color: "#5b4631" }}
                            onClick={() => setMobileOpen(false)}
                        >
                            Reports
                        </Link>
                        <Link
                            // to="/register"
                            className="inline-block self-end mt-2 rounded-full font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
                            style={{
                                padding:
                                    "clamp(.55rem, .4rem + .5vw, .85rem) clamp(.9rem, .7rem + 1vw, 1.3rem)",
                                borderRadius: 9999,
                            }}
                            onClick={() => setMobileOpen(false)}
                        >
                            Logout
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default NavBar;
