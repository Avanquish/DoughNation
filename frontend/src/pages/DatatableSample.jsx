import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Replace these with your actual UI components or imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { ChevronDown, ArrowUpDown, MoreHorizontal, Plus, Pencil, Trash2, Grid2x2, Search, Eye, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";

// Fix Leaflet default icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Default map center (Manila)
const defaultCenter = { lat: 14.5995, lng: 120.9842 };

// Location Selector Component
const LocationSelector = ({ setLocation, setAddress }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setLocation({ lat, lng });
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();
        const address = data?.display_name || "Unknown location";
        setAddress(address);
      } catch {
        setAddress("Error retrieving address");
      }
    },
  });
  return null;
};

export default function DataTable({ columns, data, onCreate, onUpdate, onDelete, entityType = "Item" }) {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    contact_person: "",
    contact_number: "",
    address: "",
    password: "",
    confirm_password: "",
  });
  const [location, setLocation] = React.useState(null);
  const [profilePicture, setProfilePicture] = React.useState(null);
  const [proofOfValidity, setProofOfValidity] = React.useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    name: "",
    email: "",
    contact_person: "",
    contact_number: "",
    address: "",
  });
  const [editLocation, setEditLocation] = React.useState(null);
  const [editingItemId, setEditingItemId] = React.useState(null);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData({ ...editFormData, [field]: value });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      contact_person: "",
      contact_number: "",
      address: "",
      password: "",
      confirm_password: "",
    });
    setLocation(null);
    setProfilePicture(null);
    setProofOfValidity(null);
  };

  const resetEditForm = () => {
    setEditFormData({
      name: "",
      email: "",
      contact_person: "",
      contact_number: "",
      address: "",
    });
    setEditLocation(null);
    setEditingItemId(null);
  };

  // Handle New/Create with Modal
  const handleNew = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async () => {
    // Validation
    if (!formData.name) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Name is required' });
      return;
    }
    if (!formData.email || !formData.email.includes('@')) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Valid email is required' });
      return;
    }
    if (!formData.contact_person) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Contact Person is required' });
      return;
    }
    if (!formData.contact_number) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Contact Number is required' });
      return;
    }
    if (!formData.address) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Address is required' });
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Password must be at least 8 characters' });
      return;
    }
    if (formData.password !== formData.confirm_password) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Passwords do not match' });
      return;
    }

    if (onCreate) {
      try {
        const submitData = {
          ...formData,
          profile_picture: profilePicture,
          proof_of_validity: proofOfValidity,
          latitude: location?.lat,
          longitude: location?.lng,
        };
        
        await onCreate(submitData);
        setShowCreateModal(false);
        resetForm();
      } catch (error) {
        console.error("Error creating:", error);
      }
    }
  };

  // Handle Edit
  const handleEdit = React.useCallback(async (row) => {
    const item = row.original;
    
    // Populate edit form with existing data
    setEditFormData({
      name: item.name || "",
      email: item.email || "",
      contact_person: item.contact_person || "",
      contact_number: item.contact_number || "",
      address: item.address || "",
    });
    
    // Set location if available
    if (item.latitude && item.longitude) {
      setEditLocation({ lat: item.latitude, lng: item.longitude });
    }
    
    setEditingItemId(item.id);
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = async () => {
    // Validation
    if (!editFormData.name) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Name is required' });
      return;
    }
    if (!editFormData.email || !editFormData.email.includes('@')) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Valid email is required' });
      return;
    }
    if (!editFormData.contact_person) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Contact Person is required' });
      return;
    }
    if (!editFormData.contact_number) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Contact Number is required' });
      return;
    }
    if (!editFormData.address) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Address is required' });
      return;
    }

    if (onUpdate && editingItemId) {
      try {
        const submitData = {
          ...editFormData,
          latitude: editLocation?.lat,
          longitude: editLocation?.lng,
        };
        
        await onUpdate(editingItemId, submitData);
        setShowEditModal(false);
        resetEditForm();
      } catch (error) {
        console.error("Error updating:", error);
      }
    }
  };

  // Handle Delete Selected
  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Selection',
        text: 'Please select at least one item to delete',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedRows.length} item(s). This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed && onDelete) {
      try {
        for (const row of selectedRows) {
          await onDelete(row.original.id);
        }
        setRowSelection({});
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  // Handle View
  const handleView = React.useCallback((row) => {
    const item = row.original;
    const fields = columns.filter(col => col.accessorKey && col.isHide !== "true");

    Swal.fire({
      title: `${entityType} Details`,
      html: `
        <div class="text-left space-y-2">
          ${fields.map(field => `
            <div class="border-b pb-2">
              <strong class="text-sm text-gray-600">${field.header}:</strong>
              <p class="mt-1">${
                field.accessorKey === 'verified' 
                  ? (item[field.accessorKey] ? '✅ Verified' : '⏳ Pending')
                  : item[field.accessorKey] || 'N/A'
              }</p>
            </div>
          `).join('')}
        </div>
      `,
      confirmButtonColor: '#A97142',
    });
  }, [columns, entityType]);

  const columnsData = React.useMemo(() => {
  const baseColumns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    ...columns
      .filter((col) => col.isHide != "true")
      .map((col) => ({
        ...col,
        enableHiding: true,
        header:
          typeof col.header === "string"
            ? ({ column }) => (
                <button
                  onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                  }
                  className="inline-flex items-center gap-1 font-medium"
                >
                  {col.header}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              )
            : col.header,
        cell: col.cell || (({ row }) => {
          const value = row.getValue(col.accessorKey);
          return (
            <div className={col.accessorKey === "email" ? "lowercase" : ""}>
              {String(value ?? "")}
            </div>
          );
        }),
      })),

    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleView(row)}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete && onDelete(row.original.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return baseColumns;
}, [columns, onDelete, handleEdit, handleView]);




  const table = useReactTable({
    data,
    columns: columnsData,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: "auto",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">

        {/* Left side: Action buttons + Column menu */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleNew}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => {
              const selectedRows = table.getFilteredSelectedRowModel().rows;
              if (selectedRows.length === 1) {
                handleEdit(selectedRows[0]);
              } else if (selectedRows.length === 0) {
                Swal.fire({
                  icon: 'warning',
                  title: 'No Selection',
                  text: 'Please select one item to edit',
                });
              } else {
                Swal.fire({
                  icon: 'warning',
                  title: 'Multiple Selection',
                  text: 'Please select only one item to edit',
                });
              }
            }}
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleDeleteSelected}>
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Grid2x2 className="w-4 h-4" />
                <span className="hidden sm:inline">Column</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side: Search bar (always visible, full width on mobile) */}
        <div className="relative w-full sm:w-auto sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9 pr-3 w-full"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table className="font-bold">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create User Modal with Map */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New {entityType}</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new {entityType.toLowerCase()} account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{entityType} Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={`Enter ${entityType.toLowerCase()} name`}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            {/* Contact Person & Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange("contact_person", e.target.value)}
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number *</Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number}
                  onChange={(e) => handleInputChange("contact_number", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address *
              </Label>
              <Input
                id="address"
                value={formData.address}
                readOnly
                disabled
                placeholder="Click on the map below to select location"
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Map */}
            <div className="space-y-2">
              <Label>Location (Click on map to select)</Label>
              <div className="rounded-lg overflow-hidden border">
                <MapContainer
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: "300px", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector
                    setLocation={setLocation}
                    setAddress={(address) => handleInputChange("address", address)}
                  />
                  {location && <Marker position={[location.lat, location.lng]} />}
                </MapContainer>
              </div>
              {location && (
                <p className="text-xs text-gray-500">
                  Selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                  placeholder="Re-enter password"
                />
                {formData.password && formData.confirm_password && (
                  <p className={`text-xs ${formData.password === formData.confirm_password ? 'text-green-600' : 'text-red-600'}`}>
                    {formData.password === formData.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile_picture">Profile Picture</Label>
                <Input
                  id="profile_picture"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof_of_validity">Proof of Validity</Label>
                <Input
                  id="proof_of_validity"
                  type="file"
                  onChange={(e) => setProofOfValidity(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSubmit}
              style={{ backgroundColor: '#A97142', color: 'white' }}
              className="hover:opacity-90"
            >
              Create {entityType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {entityType}</DialogTitle>
            <DialogDescription>
              Update the details below to modify this {entityType.toLowerCase()} account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">{entityType} Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => handleEditInputChange("name", e.target.value)}
                placeholder={`Enter ${entityType.toLowerCase()} name`}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => handleEditInputChange("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            {/* Contact Person & Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contact-person">Contact Person *</Label>
                <Input
                  id="edit-contact-person"
                  value={editFormData.contact_person}
                  onChange={(e) => handleEditInputChange("contact_person", e.target.value)}
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-number">Contact Number *</Label>
                <Input
                  id="edit-contact-number"
                  value={editFormData.contact_number}
                  onChange={(e) => handleEditInputChange("contact_number", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="edit-address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address *
              </Label>
              <Input
                id="edit-address"
                value={editFormData.address}
                readOnly
                disabled
                placeholder="Click on the map below to update location"
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Map */}
            <div className="space-y-2">
              <Label>Location (Click on map to update)</Label>
              <div className="rounded-lg overflow-hidden border">
                <MapContainer
                  center={editLocation ? [editLocation.lat, editLocation.lng] : [defaultCenter.lat, defaultCenter.lng]}
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: "300px", width: "100%" }}
                  key={editingItemId} // Force re-render when editing different items
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector
                    setLocation={setEditLocation}
                    setAddress={(address) => handleEditInputChange("address", address)}
                  />
                  {editLocation && <Marker position={[editLocation.lat, editLocation.lng]} />}
                </MapContainer>
              </div>
              {editLocation && (
                <p className="text-xs text-gray-500">
                  Selected: {editLocation.lat.toFixed(6)}, {editLocation.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              resetEditForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              style={{ backgroundColor: '#A97142', color: 'white' }}
              className="hover:opacity-90"
            >
              Update {entityType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}