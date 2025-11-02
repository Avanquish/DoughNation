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

// shadcn/ui
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";

import {
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Grid2x2,
  Search,
  Eye,
  MapPin,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

// Leaflet icon fix
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const gmapsUrl = (addr = "") =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

const tones = {
  textDark: "#4A2F17",
  textMed: "#6b4b2b",
  ring: "ring-1 ring-black/10",
  headerGrad: "bg-[#EADBC8] text-[#4A2F17]",
  sectionGrad: "bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]",
  pillSolid:
    "rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-4 py-2 shadow-md ring-1 ring-white/60 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95",
  pillOutline:
    "rounded-full border border-[#f2d4b5] text-[#6b4b2b] bg-white px-4 py-2 shadow-sm hover:bg-white/90 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95",
  pillPrimary:
    "rounded-full px-5 py-2 text-white bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] shadow-md shadow-[#BF7327]/30 ring-1 ring-white/60 transition-all hover:-translate-y-0.5 active:scale-95",
};

const defaultCenter = { lat: 14.5995, lng: 120.9842 };

// Map click selector
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

export default function DataTable({
  columns,
  data,
  onCreate,
  onUpdate,
  onDelete,
  entityType = "Item",
}) {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Create
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

  // Edit
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

  const handleInputChange = (field, value) =>
    setFormData((p) => ({ ...p, [field]: value }));
  const handleEditInputChange = (f, v) =>
    setEditFormData((p) => ({ ...p, [f]: v }));

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

  const handleNew = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.name) {
      Swal.fire({ icon: "error", title: "Error", text: "Name is required" });
      return;
    }
    if (!formData.email || !formData.email.includes("@")) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Valid email is required",
      });
      return;
    }
    if (!formData.contact_person) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Contact Person is required",
      });
      return;
    }
    if (!formData.contact_number) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Contact Number is required",
      });
      return;
    }
    if (!formData.address) {
      Swal.fire({ icon: "error", title: "Error", text: "Address is required" });
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Password must be at least 8 characters",
      });
      return;
    }
    if (formData.password !== formData.confirm_password) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Passwords do not match",
      });
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

  const handleEdit = React.useCallback(async (row) => {
    const item = row.original;
    setEditFormData({
      name: item.name || "",
      email: item.email || "",
      contact_person: item.contact_person || "",
      contact_number: item.contact_number || "",
      address: item.address || "",
    });
    if (item.latitude && item.longitude) {
      setEditLocation({ lat: item.latitude, lng: item.longitude });
    }
    setEditingItemId(item.id);
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = async () => {
    if (!editFormData.name) {
      Swal.fire({ icon: "error", title: "Error", text: "Name is required" });
      return;
    }
    if (!editFormData.email || !editFormData.email.includes("@")) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Valid email is required",
      });
      return;
    }
    if (!editFormData.contact_person) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Contact Person is required",
      });
      return;
    }
    if (!editFormData.contact_number) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Contact Number is required",
      });
      return;
    }
    if (!editFormData.address) {
      Swal.fire({ icon: "error", title: "Error", text: "Address is required" });
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

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Selection",
        text: "Please select at least one item to delete",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedRows.length} item(s). This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete them!",
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

  // View details (SweetAlert)
  const handleView = React.useCallback((row) => {
    const item = row.original;

    const statusPill =
      item.verified || item.verified === true
        ? `<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
             <span class="h-2.5 w-2.5 rounded-full bg-green-600"></span> Verified
           </span>`
        : `<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
             <span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Pending
           </span>`;

    const email = item.email || "N/A";
    const phone = item.contact_number || "N/A";
    const address = item.address || "N/A";

    Swal.fire({
      width: 980,
      showConfirmButton: true,
      confirmButtonText: "OK",
      confirmButtonColor: "#E49A52",
      buttonsStyling: false,
      customClass: {
        popup: "rounded-[28px] p-0 overflow-hidden",
        confirmButton:
          "rounded-full px-6 py-2 bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white shadow ring-1 ring-white/60 hover:scale-[1.03] active:scale-95 transition",
        actions: "py-6",
      },
      html: `
        <div class="overflow-hidden rounded-[28px] ring-1 ring-black/10">
          <div class="p-6 sm:p-7 ${tones.sectionGrad}">
            <div class="flex items-center gap-4 sm:gap-5">
              <h3 class="text-2xl font-semibold text-[#6b4b2b]">${
                item.name || "Bakery"
              }</h3>
              ${statusPill}
            </div>
            <div class="text-[#6b4b2b] font-bold mt-1">Bakery Details</div>
          </div>

          <div class="bg-white p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="rounded-2xl border border-[#f2d4b5] p-4 hover:bg-[#FFF6EC] transition">
                <div class="text-[#6b4b2b] text-[11px] font-medium tracking-wider uppercase">Name</div>
                <div class="mt-1 font-semibold text-[#4A2F17]">${
                  item.name || "N/A"
                }</div>
              </div>

              <div class="rounded-2xl border border-[#f2d4b5] p-4 hover:bg-[#FFF6EC] transition">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-[#6b4b2b] text-[11px] font-medium tracking-wider uppercase">Email</div>
                    <div class="mt-1 break-all">${email}</div>
                  </div>
                  <button type="button" id="copyEmailBtn"
                    class="rounded-full bg-[#FFEFD9] text-[#6b4b2b] text-xs px-3 py-1 border border-[#f2d4b5] hover:brightness-95"
                    ${
                      email === "N/A"
                        ? "disabled style='opacity:.5;cursor:not-allowed;'"
                        : ""
                    }>Copy</button>
                </div>
              </div>

              <div class="rounded-2xl border border-[#f2d4b5] p-4 hover:bg-[#FFF6EC] transition">
                <div class="text-[#6b4b2b] text-[11px] font-medium tracking-wider uppercase">Contact Person</div>
                <div class="mt-1 font-semibold text-[#4A2F17]">${
                  item.contact_person || "N/A"
                }</div>
              </div>

              <div class="rounded-2xl border border-[#f2d4b5] p-4 hover:bg-[#FFF6EC] transition">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-[#6b4b2b] text-[11px] font-medium tracking-wider uppercase">Contact Number</div>
                    <div class="mt-1">${phone}</div>
                  </div>
                  <button type="button" id="copyPhoneBtn"
                    class="rounded-full bg-[#FFEFD9] text-[#6b4b2b] text-xs px-3 py-1 border border-[#f2d4b5] hover:brightness-95"
                    ${
                      phone === "N/A"
                        ? "disabled style='opacity:.5;cursor:not-allowed;'"
                        : ""
                    }>Copy</button>
                </div>
              </div>

              <div class="sm:col-span-2 rounded-2xl border border-[#f2d4b5] p-4 hover:bg-[#FFF6EC] transition">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-[#6b4b2b] text-[11px] font-medium tracking-wider uppercase">Address</div>
                    <div class="mt-1 leading-relaxed">${address}</div>
                  </div>
                  <a href="${gmapsUrl(address)}" target="_blank" rel="noopener"
                    class="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white text-xs px-3 py-1 shadow ring-1 ring-white/60">
                    Open in Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      didOpen: (popup) => {
        const copy = async (text, el) => {
          try {
            await navigator.clipboard.writeText(text);
            el.textContent = "Copied!";
            setTimeout(() => (el.textContent = "Copy"), 1200);
          } catch {}
        };
        const ce = popup.querySelector("#copyEmailBtn");
        const cp = popup.querySelector("#copyPhoneBtn");
        if (ce && email !== "N/A")
          ce.addEventListener("click", () => copy(email, ce));
        if (cp && phone !== "N/A")
          cp.addEventListener("click", () => copy(phone, cp));
      },
    });
  }, []);

  // columns
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
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
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
                    className="inline-flex items-center gap-1 font-semibold"
                  >
                    {col.header}
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                )
              : col.header,
          cell:
            col.cell ||
            (({ row }) => {
              const value = row.getValue(col.accessorKey);
              const bold =
                col.accessorKey === "name" ||
                col.accessorKey === "contact_person";
              return (
                <div
                  className={`${
                    col.accessorKey === "email" ? "lowercase" : ""
                  } ${bold ? "font-semibold text-[#4A2F17]" : ""}`}
                >
                  {String(value ?? "")}
                </div>
              );
            }),
        })),

      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            {/* Actions menu with hover highlight */}
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="bg-white p-2 rounded-xl border border-black/10 shadow-lg"
            >
              <DropdownMenuLabel className="px-2 pb-2 text-[#4A2F17]">
                Actions
              </DropdownMenuLabel>

              <DropdownMenuItem
                onClick={() => handleView(row)}
                className="group rounded-lg px-3 py-2 hover:bg-[#FFF6EC] focus:bg-[#FFF1E2] cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleEdit(row)}
                className="group rounded-lg px-3 py-2 hover:bg-[#FFF6EC] focus:bg-[#FFF1E2] cursor-pointer"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onDelete && onDelete(row.original.id)}
                className="group rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
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
    <div className="w-full space-y-3">
      {/* toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button className={tones.pillPrimary} onClick={handleNew}>
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </span>
          </button>

          <button
            className={tones.pillPrimary}
            onClick={() => {
              const selectedRows = table.getFilteredSelectedRowModel().rows;
              if (selectedRows.length === 1) {
                handleEdit(selectedRows[0]);
              } else if (selectedRows.length === 0) {
                Swal.fire({
                  icon: "warning",
                  title: "No Selection",
                  text: "Please select one item to edit",
                });
              } else {
                Swal.fire({
                  icon: "warning",
                  title: "Multiple Selection",
                  text: "Please select only one item to edit",
                });
              }
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </span>
          </button>

          <button className={tones.pillOutline} onClick={handleDeleteSelected}>
            <span className="inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </span>
          </button>

          {/* Column menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={tones.pillOutline}>
                <span className="inline-flex items-center gap-2">
                  <Grid2x2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Column</span>
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="bg-white p-2 rounded-xl border border-black/10 shadow-lg"
            >
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                    className="pl-8 pr-3 py-2 rounded-lg hover:bg-[#FFF6EC] focus:bg-[#FFF1E2] capitalize cursor-pointer"
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative w-full sm:w-auto sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9 pr-3 w-full rounded-full bg-white ring-1 ring-black/10 shadow-sm focus:ring-2 focus:ring-[#E49A52]"
          />
        </div>
      </div>

      {/* table */}
      <div
        className={`overflow-hidden rounded-xl shadow ${tones.ring} bg-white`}
      >
        <Table className="text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={`${tones.headerGrad}`}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
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
                  className="group transition will-change-transform hover:bg-[#FFF6EC] hover:shadow-md transform-gpu hover:scale-[1.01]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* footer + pager */}
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`${tones.pillOutline} disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className={`${tones.pillSolid} disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>

      {/* Create modal*/}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 [&>button[aria-label='Close']]:hidden`}
        >
          <DialogHeader className={`px-6 py-5 ${tones.sectionGrad}`}>
            <DialogTitle className="text-[#6b4b2b]">
              Create New {entityType}
            </DialogTitle>
            <DialogDescription className="text-[#7b5836] font-bold">
              Bakery Details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6 px-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#6b4b2b]">
                {entityType} Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={`Enter ${entityType.toLowerCase()} name`}
                className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#6b4b2b]">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="email@example.com"
                className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person" className="text-[#6b4b2b]">
                  Contact Person *
                </Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    handleInputChange("contact_person", e.target.value)
                  }
                  placeholder="Contact person name"
                  className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number" className="text-[#6b4b2b]">
                  Contact Number *
                </Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number}
                  onChange={(e) =>
                    handleInputChange("contact_number", e.target.value)
                  }
                  placeholder="Phone number"
                  className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="address"
                className="flex items-center gap-2 text-[#6b4b2b]"
              >
                <MapPin className="h-4 w-4" />
                Address *
              </Label>
              <Input
                id="address"
                value={formData.address}
                readOnly
                disabled
                placeholder="Click on the map below to select location"
                className="rounded-2xl bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#6b4b2b]">
                Location (Click on map to select)
              </Label>
              <div className="rounded-xl overflow-hidden border border-[#f2d4b5]">
                <MapContainer
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: "300px", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector
                    setLocation={setLocation}
                    setAddress={(address) =>
                      handleInputChange("address", address)
                    }
                  />
                  {location && (
                    <Marker position={[location.lat, location.lng]} />
                  )}
                </MapContainer>
              </div>
              {location && (
                <p className="text-xs text-gray-500">
                  Selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#6b4b2b]">
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="At least 8 characters"
                  className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-[#6b4b2b]">
                  Confirm Password *
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) =>
                    handleInputChange("confirm_password", e.target.value)
                  }
                  placeholder="Re-enter password"
                  className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
                />
                {formData.password && formData.confirm_password && (
                  <p
                    className={`text-xs ${
                      formData.password === formData.confirm_password
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formData.password === formData.confirm_password
                      ? "✓ Passwords match"
                      : "✗ Passwords do not match"}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile_picture" className="text-[#6b4b2b]">
                  Profile Picture
                </Label>
                <Input
                  id="profile_picture"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setProfilePicture(e.target.files?.[0] || null)
                  }
                  className="rounded-2xl file:mr-2 file:rounded-full file:border-0 file:bg-[#FFEFD9] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#6b4b2b]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof_of_validity" className="text-[#6b4b2b]">
                  Proof of Validity
                </Label>
                <Input
                  id="proof_of_validity"
                  type="file"
                  onChange={(e) =>
                    setProofOfValidity(e.target.files?.[0] || null)
                  }
                  className="rounded-2xl file:mr-2 file:rounded-full file:border-0 file:bg-[#FFEFD9] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#6b4b2b]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <button
              className={tones.pillOutline}
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button onClick={handleCreateSubmit} className={tones.pillSolid}>
              Create {entityType}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent
          className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 [&>button[aria-label='Close']]:hidden`}
        >
          <DialogHeader className={`px-6 py-5 ${tones.sectionGrad}`}>
            <DialogTitle className="text-[#6b4b2b]">
              Edit {entityType}
            </DialogTitle>
            <DialogDescription className="text-[#7b5836] font-bold">
              Bakery Details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6 px-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[#6b4b2b]">
                {entityType} Name *
              </Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => handleEditInputChange("name", e.target.value)}
                placeholder={`Enter ${entityType.toLowerCase()} name`}
                className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-[#6b4b2b]">
                Email *
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => handleEditInputChange("email", e.target.value)}
                placeholder="email@example.com"
                className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contact-person" className="text-[#6b4b2b]">
                  Contact Person *
                </Label>
                <Input
                  id="edit-contact-person"
                  value={editFormData.contact_person}
                  onChange={(e) =>
                    handleEditInputChange("contact_person", e.target.value)
                  }
                  placeholder="Contact person name"
                  className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-number" className="text-[#6b4b2b]">
                  Contact Number *
                </Label>
                <Input
                  id="edit-contact-number"
                  value={editFormData.contact_number}
                  onChange={(e) =>
                    handleEditInputChange("contact_number", e.target.value)
                  }
                  placeholder="Phone number"
                  className="rounded-2xl border-[#f2d4b5] focus:ring-[#E49A52]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-address"
                className="flex items-center gap-2 text-[#6b4b2b]"
              >
                <MapPin className="h-4 w-4" />
                Address *
              </Label>
              <Input
                id="edit-address"
                value={editFormData.address}
                readOnly
                disabled
                placeholder="Click on the map below to update location"
                className="rounded-2xl bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#6b4b2b]">
                Location (Click on map to update)
              </Label>
              <div className="rounded-xl overflow-hidden border border-[#f2d4b5]">
                <MapContainer
                  center={
                    editLocation
                      ? [editLocation.lat, editLocation.lng]
                      : [defaultCenter.lat, defaultCenter.lng]
                  }
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: "300px", width: "100%" }}
                  key={editingItemId}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector
                    setLocation={setEditLocation}
                    setAddress={(address) =>
                      handleEditInputChange("address", address)
                    }
                  />
                  {editLocation && (
                    <Marker position={[editLocation.lat, editLocation.lng]} />
                  )}
                </MapContainer>
              </div>
              {editLocation && (
                <p className="text-xs text-gray-500">
                  Selected: {editLocation.lat.toFixed(6)},{" "}
                  {editLocation.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <button
              className={tones.pillOutline}
              onClick={() => {
                setShowEditModal(false);
                resetEditForm();
              }}
            >
              Cancel
            </button>
            <button onClick={handleEditSubmit} className={tones.pillSolid}>
              Update {entityType}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
