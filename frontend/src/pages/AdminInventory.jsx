import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Plus } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If path already starts with http, return as is
  if (imagePath.startsWith('http')) return imagePath;
  // If path starts with /, it's absolute from server root
  if (imagePath.startsWith('/')) return `${API}${imagePath}`;
  // Otherwise, add leading slash
  return `${API}/${imagePath}`;
};

const AdminInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("Food");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: "",
    donation_type: "Food",
    category: "",
    expiration_date: "",
    image: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/inventory/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load inventory",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'image' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      if (selectedFile) {
        submitData.append('image', selectedFile);
      }
      
      await axios.post(`${API}/admin/inventory/`, submitData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      Swal.fire({
        title: "Success!",
        text: "Item added to inventory",
        icon: "success",
        confirmButtonColor: "#BF7326",
      });

      setShowAddModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.detail || "Failed to add item",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
    }
  };

  const handleEditItem = async () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'image' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      if (selectedFile) {
        submitData.append('image', selectedFile);
      }
      
      await axios.put(`${API}/admin/inventory/${editingItem.id}`, submitData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      Swal.fire({
        title: "Success!",
        text: "Item updated successfully",
        icon: "success",
        confirmButtonColor: "#BF7326",
      });

      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.detail || "Failed to update item",
        icon: "error",
        confirmButtonColor: "#BF7326",
      });
    }
  };

  const handleDeleteItem = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This item will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#BF7326",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("access_token") || localStorage.getItem("token");
        await axios.delete(`${API}/admin/inventory/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        Swal.fire({
          title: "Deleted!",
          text: "Item has been removed from inventory",
          icon: "success",
          confirmButtonColor: "#BF7326",
        });

        fetchInventory();
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "Failed to delete item",
          icon: "error",
          confirmButtonColor: "#BF7326",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      quantity: "",
      donation_type: "Food",
      category: "",
      expiration_date: "",
      image: "",
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      donation_type: item.donation_type,
      category: item.category || "",
      expiration_date: item.expiration_date || "",
      image: item.image || "",
    });
    setPreviewUrl(item.image ? getImageUrl(item.image) : null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const donationType = item.donation_type || "Food";
    const matchesTab = activeTab === "Food" 
      ? donationType === "Food" 
      : donationType !== "Food";
    const matchesQuery = item.name?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "available" && item.quantity > 0) ||
      (statusFilter === "low" && item.quantity > 0 && item.quantity <= 5) ||
      (statusFilter === "out" && item.quantity === 0);
    return matchesTab && matchesQuery && matchesStatus;
  });

  // Status counts (tab-specific)
  const tabFilteredInventory = inventory.filter(item => {
    const donationType = item.donation_type || "Food";
    return activeTab === "Food" ? donationType === "Food" : donationType !== "Food";
  });
  
  const statusCounts = {
    all: tabFilteredInventory.length,
    available: tabFilteredInventory.filter((item) => item.quantity > 0).length,
    low: tabFilteredInventory.filter((item) => item.quantity > 0 && item.quantity <= 5).length,
    out: tabFilteredInventory.filter((item) => item.quantity === 0).length,
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const visibleInventory = filteredInventory.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <h2 className="text-3xl font-extrabold text-[#6b4b2b]">Inventory</h2>
          <p className="text-sm text-[#7b5836] mt-1">
            Manage items received from donors
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(201,124,44,.25)] hover:-translate-y-0.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Add Item Manually
        </button>
      </div>

      {/* Tab buttons */}
      <div className="flex items-center gap-2 mb-4 border-b border-[#f2d4b5]">
        <button
          onClick={() => { setActiveTab("Food"); setPage(1); }}
          className={`px-6 py-3 font-semibold text-sm transition-all ${
            activeTab === "Food"
              ? "text-[#6b4b2b] border-b-2 border-[#E49A52] bg-[#FFF9F1]"
              : "text-gray-500 hover:text-[#6b4b2b] hover:bg-[#FFF9F1]/50"
          }`}
        >
          🍞 Food ({inventory.filter(d => (d.donation_type || "Food") === "Food").length})
        </button>
        <button
          onClick={() => { setActiveTab("Non-Food"); setPage(1); }}
          className={`px-6 py-3 font-semibold text-sm transition-all ${
            activeTab === "Non-Food"
              ? "text-[#6b4b2b] border-b-2 border-[#E49A52] bg-[#FFF9F1]"
              : "text-gray-500 hover:text-[#6b4b2b] hover:bg-[#FFF9F1]/50"
          }`}
        >
          📦 Non-Food ({inventory.filter(d => (d.donation_type || "Food") !== "Food").length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          <div className="flex items-center gap-2 bg-white/80 rounded-2xl px-2 py-2 ring-1 ring-black/5 shadow-sm">
            {[
              { key: "all", label: `All (${statusCounts.all})`, tone: "bg-gray-100" },
              {
                key: "available",
                label: `Available (${statusCounts.available})`,
                tone: "bg-green-100",
              },
              {
                key: "low",
                label: `Low Stock (${statusCounts.low})`,
                tone: "bg-amber-100",
              },
              {
                key: "out",
                label: `Out of Stock (${statusCounts.out})`,
                tone: "bg-red-100",
              },
            ].map(({ key, label, tone }) => {
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={
                    "text-xs sm:text-sm rounded-full px-3 py-1 transition " +
                    (active
                      ? "text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow"
                      : `text-[#6b4b2b] ${tone} hover:brightness-95`)
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Name filter */}
          <div className="relative w-full sm:w-[260px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by product name…"
              className="w-full rounded-full bg-white/90 ring-1 ring-black/10 px-4 py-2 pr-9 shadow-sm outline-none focus:ring-2 focus:ring-[#E49A52]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl shadow ring-1 ring-black/5 bg-white/80 backdrop-blur-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#EADBC8] text-left font-semibold text-[#4A2F17]">
              <th className="p-3">Image</th>
              <th className="p-3">Product ID</th>
              <th className="p-3">Product</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Type</th>
              <th className="p-3">Source</th>
              <th className="p-3">Received Date</th>
              <th className="p-3">Expiration</th>
              <th className="p-3">Description</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : visibleInventory.length > 0 ? (
              visibleInventory.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[#f2e3cf] hover:bg-[#FFF9F1]/50 transition"
                >
                  <td className="p-3">
                    {item.image ? (
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-[#f2e3cf]"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{item.product_id || "—"}</td>
                  <td className="p-3 font-semibold text-[#4A2F17]">{item.name}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        item.quantity === 0
                          ? "bg-red-100 text-red-700"
                          : item.quantity <= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </td>
                  <td className="p-3">{item.donation_type || "—"}</td>
                  <td className="p-3 capitalize">{item.source || "donor"}</td>
                  <td className="p-3">
                    {item.received_date
                      ? new Date(item.received_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    {item.expiration_date ? (
                      <span className="text-red-600 font-medium">
                        {new Date(item.expiration_date).toLocaleDateString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 max-w-xs truncate">
                    {item.description || "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-3 py-1.5 bg-[#BF7326] text-white rounded-lg hover:bg-[#8B4513] text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <div className="h-40 grid place-items-center">
                    <div className="inline-flex items-center rounded-2xl border border-[#eadfce] bg-[#FFF9F1] px-5 py-3 shadow-sm text-sm text-[#7b5836]">
                      {query || statusFilter !== "all"
                        ? "No products match your filters."
                        : "No items found."}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredInventory.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 text-xs text-[#6b4b2b] sm:flex-row sm:items-center sm:justify-between">
          <span>
            <strong>
              Showing {startIndex + 1}–
              {Math.min(startIndex + pageSize, filteredInventory.length)} of{" "}
              {filteredInventory.length}
              {" | "}
              Total Quantity:{" "}
              {filteredInventory.reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
              )}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-[#f2d4b5] bg-white px-3 py-1.5 text-xs shadow-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-medium">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full border border-[#f2d4b5] bg-white px-3 py-1.5 text-xs shadow-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddModal(false);
            setEditingItem(null);
            resetForm();
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-[#8B4513] mb-6">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter item name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Item description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Product Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                />
                {previewUrl && (
                  <div className="mt-3">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-[#f2e3cf]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.donation_type}
                    onChange={(e) => setFormData({ ...formData, donation_type: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                  >
                    <option value="Food">Food</option>
                    <option value="Clothes">Clothes</option>
                    <option value="School Supplies">School Supplies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Category (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Bakery, Clothing"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2F17] mb-2">
                  Expiration Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-[#f2e3cf] rounded-lg focus:outline-none focus:border-[#BF7326]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingItem ? handleEditItem : handleAddItem}
                  className="flex-1 px-4 py-3 bg-[#BF7326] text-white rounded-lg hover:bg-[#8B4513] font-semibold"
                >
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 border-2 border-[#BF7326] text-[#8B4513] rounded-lg hover:bg-[#FFF6E6] font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
