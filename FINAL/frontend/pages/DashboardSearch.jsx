import React, { useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { createPortal } from "react-dom";
import ShowSearchedProfile from "./ShowSearchedProfile";

const API = "http://localhost:8000";

const SearchBar = ({ searchType = "all" }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSearch = async (q) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${API}/search_users`, {
        params: { q, target: searchType }, 
        headers,
      });

      setResults(res.data || []);
      console.log("why ",res.data);
    } catch (err) {
      console.error("❌ Error searching users:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Search Card */}
      <div className="absolute z-50 bg-white border rounded-lg shadow-xl w-65 mt-1 right-0">
        {/* Search Input */}
        <div className="flex items-center gap-2 border-b px-3 py-2 h-10">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder={`Search...`}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="border-0 shadow-none focus:ring-0 focus:outline-none focus:border-0 text-sm h-7"
          />
        </div>
        
        {/* Result */}
        {query && (
            <div className="max-h-56 overflow-y-auto px-3 py-2">
                {loading ? (
                <p className="text-gray-500 text-sm">Searching...</p>
                ) : results.length === 0 ? (
                <p className="text-gray-500 text-sm">Not Found!</p>
                ) : (
                <ul>
                    {results.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center gap-2 py-1 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedUser({ id: item.id, type: item.type })} // <-- open profile
                    >
                        {item.profile_picture ? (
                        <img
                            src={item.profile_picture ? encodeURI(`${API}/${item.profile_picture}`) : "/default-avatar.png"}
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
        )}
      </div>
         {/* Modal for selected profile */}
        {selectedUser &&
            createPortal(
                <div className="fixed inset-0 z-50 bg-white overflow-auto">
                    <ShowSearchedProfile 
                    id={selectedUser.id} 
                    onBack={() => setSelectedUser(null)} 
                    />
                </div>,
                document.body
            )}
    </div>
  );
};

export default SearchBar;
