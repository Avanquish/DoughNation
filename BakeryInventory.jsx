import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = "http://localhost:8000";

export default function BakeryInventory() {
  const [inventory, setInventory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [verified, setVerified] = useState(false);   // For Access control if user exist.
  const [employeeName, setEmployeeName] = useState("");  // input name to verify.

  const [form, setForm] = useState({
    item_name: "",
    quantity: 1,
    creation_date: "",
    expiration_date: "",
    description: "",
    image_file: null,
    threshold: 1,
    uploaded: ""
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // new state for edit mode

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchInventory = async () => {
    if (!verified) return;  // fecth if empolyee verified.
    const res = await axios.get(`${API}/inventory`, { headers });
    setInventory(res.data);
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`, { headers });
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

// Fetch inventory if verified.
  useEffect(() => {
    if (verified) fetchInventory();
  }, [verified]);

// Employee verification.
  const handleVerify = () => {
    const found = employees.find(
      (emp) => emp.name.toLowerCase() === employeeName.trim().toLowerCase()
    );
    if (found) {
      Swal.fire({
        title: "Access Granted",
        text: `Welcome, ${found.name}!`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      setVerified(true);
    } else {
      Swal.fire({
        title: "Employee Not Found",
        text: "Please enter a valid employee name.",
        icon: "error",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", form.item_name);
    formData.append("quantity", form.quantity);
    formData.append("creation_date", form.creation_date);
    formData.append("expiration_date", form.expiration_date);
    formData.append("threshold", form.threshold);
    formData.append("uploaded", form.uploaded);
    formData.append("description", form.description);
    if (form.image_file) {
      formData.append("image", form.image_file);
    }

    await axios.post(`${API}/inventory`, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
    });

    setForm({
      item_name: "",
      quantity: 1,
      creation_date: "",
      expiration_date: "",
      description: "",
      image_file: null,
      threshold: 1,
      uploaded: ""
    });

    setShowForm(false);
    fetchInventory();
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      await axios.delete(`${API}/inventory/${id}`, { headers });
      setSelectedItem(null);
      fetchInventory();

      Swal.fire({
        title: "Deleted!",
        text: "The product has been deleted.",
        icon: "success"
      });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

      const result = await Swal.fire({
      title: "Save changes?",
      text: "Are you sure you want to update this product's details?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save it!",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append("name", selectedItem.name);
    formData.append("quantity", selectedItem.quantity);
    formData.append("creation_date", selectedItem.creation_date);
    formData.append("expiration_date", selectedItem.expiration_date);
    formData.append("threshold", selectedItem.threshold);
    formData.append("uploaded", selectedItem.uploaded || "");
    formData.append("description", selectedItem.description || "");

    if (selectedItem.image_file) {
      formData.append("image", selectedItem.image_file);
    }

    await axios.put(`${API}/inventory/${selectedItem.id}`, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
    });

    Swal.fire({
      title: "Updated!",
      text: "The product details have been updated.",
      icon: "success",
    });

    setIsEditing(false);
    setSelectedItem(null);
    fetchInventory();
  };


  return (
    <div className="p-6 relative">
      <h1 className="text-2xl font-bold mb-4">Bakery Inventory</h1>

      <button
        onClick={() => setShowForm(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        + Add Product
      </button>

      <div className="overflow-x-auto rounded shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
              <th className="p-3">Product ID</th>
              <th className="p-3">Product Name</th>
              <th className="p-3">Image</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Creation Date</th>
              <th className="p-3">Expiration Date</th>
              <th className="p-3">Threshold</th>
              <th className="p-3">Uploaded By</th>
              <th className="p-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length > 0 ? (
              inventory.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50 text-sm"
                  onClick={() => {
                    setSelectedItem(item);
                    setIsEditing(false);
                  }}
                >
                  <td className="p-3">{item.id}</td>
                  <td className="p-3">{item.name}</td>
                  <td className="p-3">
                    {item.image ? (
                      <img
                        src={`${API}/${item.image}`}
                        alt={item.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      "No image"
                    )}
                  </td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.creation_date?.slice(0, 10)}</td>
                  <td className="p-3">{item.expiration_date}</td>
                  <td className="p-3">{item.threshold}</td>
                  <td className="p-3">{item.uploaded || "System"}</td>
                  <td className="p-3">{item.description}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-10 text-gray-500 text-center" colSpan={9}>
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      {!verified && (
        <div className="fixed inset-50 flex items-center justify-center bg-transparent z-10">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Verify Access
            </h2>
            <input
              type="text"
              placeholder="Enter employee name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="w-full p-2 border rounded mb-3"
            />
            <button
              onClick={handleVerify}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Enter Inventory
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/30">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Product</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  className="w-full p-2 border rounded"
                  placeholder="e.g., Garlic Bread"
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full p-2 border rounded"
                  onChange={(e) => setForm({ ...form, image_file: e.target.files[0] })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (Days)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uploaded By</label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.uploaded}
                  onChange={(e) => setForm({ ...form, uploaded: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creation Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={form.creation_date}
                  onChange={(e) => setForm({ ...form, creation_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={form.expiration_date}
                  onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full p-2 border rounded"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                ></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-gray-600 px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/30">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            {!isEditing ? (
              <>
                <h2 className="text-xl font-semibold mb-2">Product Details</h2>
                <div className="space-y-2 text-sm">
                  <p><strong>Product Name:</strong> {selectedItem.name}</p>
                  <p><strong>Quantity:</strong> {selectedItem.quantity}</p>
                  <p><strong>Threshold:</strong> {selectedItem.threshold}</p>
                  <p><strong>Creation Date:</strong> {selectedItem.creation_date}</p>
                  <p><strong>Expiration Date:</strong> {selectedItem.expiration_date}</p>
                  <p><strong>Uploaded By:</strong> {selectedItem.uploaded || "System"}</p>
                  <p><strong>Description:</strong> {selectedItem.description}</p>
                  {selectedItem.image && (
                    <img
                      src={`${API}/${selectedItem.image}`}
                      alt="Product"
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-600 px-4 py-2 rounded border"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4">Edit Product</h2>
                <form onSubmit={handleUpdate} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={selectedItem.name}
                    onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                    required
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setSelectedItem({ ...selectedItem, image_file: e.target.files[0] })}
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={selectedItem.quantity}
                    onChange={(e) => setSelectedItem({ ...selectedItem, quantity: parseInt(e.target.value) })}
                    required
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={selectedItem.threshold}
                    onChange={(e) => setSelectedItem({ ...selectedItem, threshold: parseInt(e.target.value) })}
                    required
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uploaded By</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedItem.uploaded}
                    onChange={(e) => setSelectedItem({ ...selectedItem, uploaded: e.target.value })}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creation Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded"
                    value={selectedItem.creation_date}
                    onChange={(e) => setSelectedItem({ ...selectedItem, creation_date: e.target.value })}
                    required
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded"
                    value={selectedItem.expiration_date}
                    onChange={(e) => setSelectedItem({ ...selectedItem, expiration_date: e.target.value })}
                    required
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    value={selectedItem.description || ""}
                    onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-gray-600 px-4 py-2 rounded border"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}