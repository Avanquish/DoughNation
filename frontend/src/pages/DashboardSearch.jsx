import React, { useRef, useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import { createPortal } from "react-dom";
import ShowSearchedProfile from "./ShowSearchedProfile";

const API = "http://localhost:8000";

const SIZES = {
  sm: { h: "h-10", inputPad: "pl-9 pr-3", btnPx: "px-3", icon: "w-4 h-4", width: "w-[240px]" },
  md: { h: "h-11", inputPad: "pl-9 pr-4", btnPx: "px-4", icon: "w-4 h-4", width: "w-[260px]" },
  lg: { h: "h-12", inputPad: "pl-10 pr-4", btnPx: "px-5", icon: "w-5 h-5", width: "w-[300px]" },
};

export default function DashboardSearch({
  searchType = "all",
  className = "",
  size = "sm", 
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [open, setOpen] = useState(false);

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const sz = useMemo(() => SIZES[size] ?? SIZES.sm, [size]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSearch = async (qToSearch) => {
    const q = (qToSearch ?? query).trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    try {
      setLoading(true);
      setOpen(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/search_users`, {
        params: { q, target: searchType },
        headers,
      });
      setResults(res.data || []);
    } catch (err) {
      console.error("Error searching users:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (!v.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    handleSearch(v); // live search
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const runSearchClick = () => handleSearch();

  const shouldShowDropdown =
    open && query.trim().length > 0 && (loading || results.length > 0);

  return (
    <div className={`relative ${className}`} ref={boxRef} onSubmit={(e) => e.preventDefault()}>
      {/* Search control */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`${sz.h} ${sz.width} ${sz.inputPad} flex items-center rounded-full border border-black/70 bg-white`}>
            {/* INPUT — borderless/ringless (prevents “box inside box”) */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={onInputChange}
              onFocus={() => query.trim() && setOpen(true)}
              onKeyDown={onKeyDown}
              aria-label="Search"
              className="w-full bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none"
              style={{ boxShadow: "none" }}
            />
          </div>
          <Search className={`${sz.icon} text-gray-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none`} />
        </div>

        {/* Brown-gradient pill button with hover zoom */}
        <button
          type="button"
          onClick={runSearchClick}
          disabled={loading}
          className={[
            sz.h,
            sz.btnPx,
            "rounded-full text-white font-semibold inline-flex items-center justify-center",
            "border border-white/60",
            "bg-[linear-gradient(90deg,#F6C17C,#E49A52,#BF7327)]",
            "shadow-[0_8px_20px_rgba(191,115,39,.28)]",
            "transform-gpu transition-transform duration-200 will-change-transform",
            "motion-safe:hover:scale-105 hover:brightness-105",
            "active:scale-100 active:translate-y-[1px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C97C2C]/30",
            "disabled:opacity-70 disabled:cursor-not-allowed",
          ].join(" ")}
          aria-label="Run search"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Results dropdown (attached under the input) */}
      {shouldShowDropdown && (
        <div
          className={`absolute z-50 mt-1 ${sz.width} left-0 rounded-xl border border-black/10 bg-white shadow-lg`}
          role="listbox"
          aria-label="Search results"
        >
          <div className="max-h-56 overflow-y-auto py-2">
            {loading ? (
              <p className="px-3 py-1 text-gray-500 text-sm">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-1 text-gray-500 text-sm">No matches.</p>
            ) : (
              <ul>
                {results.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedUser({ id: item.id, type: item.type })}
                  >
                    {item.profile_picture ? (
                      <img
                        src={
                          item.profile_picture
                            ? encodeURI(`${API}/${item.profile_picture}`)
                            : "/default-avatar.png"
                        }
                        alt={item.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300" />
                    )}
                    <span className="font-semibold">{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Full-screen modal for selected profile */}
      {selectedUser &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <ShowSearchedProfile id={selectedUser.id} onBack={() => setSelectedUser(null)} />
          </div>,
          document.body
        )}
    </div>
  );
}