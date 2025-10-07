import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Printer } from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState("manage_users");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";
  const normalizePath = (path) => path.replace(/\\/g, "/");

  const reportTypes = [{ key: "manage_users", label: "Manage Users" }];

  const getReportLabel = (key) => {
    const found = reportTypes.find((r) => r.key === key);
    return found ? found.label : key.replace(/_/g, " ");
  };

  // Fetch report with date range
  const generateReport = async (type) => {
    if (!startDate || !endDate) {
      Swal.fire("Missing Dates", "Please select both start and end date.", "warning");
      return;
    }

    setLoading(true);
    setActiveReport(type);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/reports/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { start_date: startDate, end_date: endDate },
      });

      setReportData(res.data.users || []);
      if (res.data.users.length === 0) {
        Swal.fire("No Users", `No users registered between ${startDate} to ${endDate}`, "info");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.detail || "Failed to fetch report.",
      });
    } finally {
      setLoading(false);
    }
  };

  // CSV Download
  const downloadReportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const headerMap = {
      role: "Role",
      name: "Name",
      email: "Email Address",
      contact_person: "Contact Person",
      address: "Address",
      profile_picture: "Profile Picture",
      created_at: "Registration Date",
    };

    const keys = Object.keys(headerMap);
    const headers = Object.values(headerMap);

    const rows = reportData.map((row) =>
      keys.map((key) => `"${row[key] ?? ""}"`).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${getReportLabel(activeReport)} Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const downloadReportPDF = async () => {
  if (!reportData || reportData.length === 0) {
    Swal.fire("No data", "Nothing to export", "info");
    return;
  }

  const doc = new jsPDF("landscape", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // HEADER
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${getReportLabel(activeReport).toUpperCase()} REPORT`, pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 25;

  const headers = [
    "Role",
    "Name",
    "Email",
    "Contact Person",
    "Address",
    "Profile Picture",
    "Registration Date",
  ];

  const keys = [
    "role",
    "name",
    "email",
    "contact_person",
    "address",
    "profile_picture",
    "created_at",
  ];

  // Convert images to base64 with higher resolution & quality
  const toBase64 = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Bigger canvas for sharper images
        const size = 150;
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(img, 0, 0, size, size);

        // Export at high quality
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.onerror = () => resolve(null);
      img.src = url + "?t=" + Date.now();
    });

  // --- BATCH IMAGE PROCESSING ---
  const batchSize = 50;
  let processedData = [];
  for (let i = 0; i < reportData.length; i += batchSize) {
    const batch = reportData.slice(i, i + batchSize);
    const batchProcessed = await Promise.all(
      batch.map(async (row) => {
        const newRow = { ...row };
        if (row.profile_picture) {
          const url = `${API_URL}/${normalizePath(row.profile_picture)}`;
          newRow.profile_picture = await toBase64(url);
        }
        return newRow;
      })
    );
    processedData = processedData.concat(batchProcessed);

    // Optional: show progress to user
    Swal.update({
      title: "Generating Report...",
      html: `Processed ${Math.min(i + batchSize, reportData.length)} of ${reportData.length} records`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  // Close progress after processing
  Swal.close();

  // Table rows
  const rows = processedData.map((row) =>
    keys.map((k) => (k === "profile_picture" ? "" : row[k] ?? ""))
  );

  // TABLE
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: currentY,
    styles: { fontSize: 9, valign: "middle", halign: "center" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    tableWidth: "auto", // auto-fit columns
    margin: { left: 40, right: 40 }, // equal margins
    columnStyles: {
      5: { halign: "center", cellWidth: 80 }, // keep profile picture column fixed
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        data.row.height = 50; // make image cell taller
      }
    },
    didDrawCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 5 &&
        processedData[data.row.index].profile_picture
      ) {
        const img = processedData[data.row.index].profile_picture;
        const { x, y, width, height } = data.cell;
        const imgSize = 45; // final displayed size
        const imgX = x + (width - imgSize) / 2;
        const imgY = y + (height - imgSize) / 2;
        doc.addImage(img, "JPEG", imgX, imgY, imgSize, imgSize);
      }
    },
  });

  // Save file
  doc.save(`${getReportLabel(activeReport)} Report.pdf`);
};

 // Print Report
const printReport = () => {
  if (!reportData || reportData.length === 0) return;

  const tableHTML = `
    <html>
      <head>
       <title>${getReportLabel(activeReport).toUpperCase()} REPORT</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: auto; 
            table-layout: fixed; /* lock column widths */
          }
          th, td { 
            border: 1px solid #ccc; 
            padding: 8px; 
            text-align: center; 
            word-wrap: break-word; /* wrap text inside cells */
          }
          th { background-color: #f4f4f4; }
          img { 
            max-width: 60px; 
            max-height: 60px; 
            border-radius: 6px; 
            display: block; 
            margin: 0 auto; 
          }

          /* column widths */
          th:nth-child(1), td:nth-child(1) { width: 8%; }   /* Role */
          th:nth-child(2), td:nth-child(2) { width: 12%; }  /* Name */
          th:nth-child(3), td:nth-child(3) { width: 18%; }  /* Email */
          th:nth-child(4), td:nth-child(4) { width: 15%; }  /* Contact Person */
          th:nth-child(5), td:nth-child(5) { width: 25%; }  /* Address (kept wide) */
          th:nth-child(6), td:nth-child(6) { width: 12%; }  /* Profile Picture */
          th:nth-child(7), td:nth-child(7) { width: 10%; }  /* Registration Date */

          @media print {
            table { page-break-inside: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h2>${getReportLabel(activeReport)} Report</h2>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>Email</th>
              <th>Contact Person</th>
              <th>Address</th>
              <th>Profile Picture</th>
              <th>Registration Date</th>
            </tr>
          </thead>
          <tbody>
            ${reportData
              .map(
                (row) => `
              <tr>
                <td>${row.role}</td>
                <td>${row.name}</td>
                <td>${row.email}</td>
                <td>${row.contact_person}</td>
                <td>${row.address}</td>
                <td>${
                  row.profile_picture
                    ? `<img src="${API_URL}/${normalizePath(row.profile_picture)}"/>`
                    : ""
                }</td>
                <td>${row.created_at}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups for printing.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(tableHTML);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

  // Render Table
  const renderTable = (data) => {
    if (!Array.isArray(data) || data.length === 0)
      return <p className="text-gray-500">No data available</p>;

    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full border border-gray-300 rounded text-center">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Contact Person</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Profile Picture</th>
              <th className="px-4 py-2">Registration Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2">{row.role}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.email}</td>
                <td className="px-4 py-2">{row.contact_person}</td>
                <td className="px-4 py-2">{row.address}</td>
                <td className="px-4 py-2">
                  {row.profile_picture ? (
                    <img
                      src={`${API_URL}/${normalizePath(row.profile_picture)}`}
                      alt="Profile"
                      className="w-14 h-14 object-cover rounded"
                    />
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-2">{row.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Report Generation</h1>

      <Tabs defaultValue="manage_users">
        <TabsList className="flex flex-wrap gap-2">
          {reportTypes.map((r) => (
            <TabsTrigger
              key={r.key}
              value={r.key}
              onClick={() => generateReport(r.key)}
            >
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {reportTypes.map((r) => (
          <TabsContent key={r.key} value={r.key}>
            <Card className="mt-6 shadow-lg">
              <CardHeader>
                <CardTitle>{r.label} Report</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Date Inputs inside the box */}
                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => generateReport(r.key)}
                      className="border rounded px-2 py-1 bg-orange-200 H"
                    >
                      Generate Report
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <p className="text-gray-500">Generating report...</p>
                ) : reportData ? (
                  <div>
                    {renderTable(reportData)}
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={downloadReportCSV}
                        className="flex items-center gap-2 bg-orange-300"
                      >
                        <Download size={16} /> CSV
                      </Button>

                      <Button
                        onClick={downloadReportPDF}
                        className="flex items-center gap-2 bg-orange-300"
                      >
                        <Download size={16} /> PDF
                      </Button>

                      <Button
                        onClick={printReport}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
                      >
                        <Printer size={16} /> Print
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Select a date range and click Generate Report to view {r.label}.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}