import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const normalizePath = (path) => path.replace(/\\/g, "/");

  // Report types
  const reportTypes = [{ key: "manage_users", label: "Manage Users" }];

  const getReportLabel = (key) => {
    const found = reportTypes.find((r) => r.key === key);
    return found ? found.label : key.replace(/_/g, " ");
  };

  // Generate report
  const generateReport = async (type) => {
    if (!startDate || !endDate) {
      Swal.fire(
        "Missing Dates",
        "Please select both start and end date.",
        "warning"
      );
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
        Swal.fire(
          "No Users",
          `No users registered between ${startDate} to ${endDate}`,
          "info"
        );
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

  // CSV
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

  // PDF
  const downloadReportPDF = async () => {
    if (!reportData || reportData.length === 0) {
      Swal.fire("No data", "Nothing to export", "info");
      return;
    }

    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${getReportLabel(activeReport).toUpperCase()} REPORT`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
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

    // Base64 images
    const toBase64 = (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const size = 150;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        img.onerror = () => resolve(null);
        img.src = url + "?t=" + Date.now();
      });

    // Batch
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

      Swal.update({
        title: "Generating Report...",
        html: `Processed ${Math.min(i + batchSize, reportData.length)} of ${
          reportData.length
        } records`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
    }

    Swal.close();

    // Table rows
    const rows = processedData.map((row) =>
      keys.map((k) => (k === "profile_picture" ? "" : row[k] ?? ""))
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: currentY,
      styles: { fontSize: 9, valign: "middle", halign: "center" },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      tableWidth: "auto",
      margin: { left: 40, right: 40 },
      columnStyles: {
        5: { halign: "center", cellWidth: 80 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          data.row.height = 50;
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
          const imgSize = 45;
          const imgX = x + (width - imgSize) / 2;
          const imgY = y + (height - imgSize) / 2;
          doc.addImage(img, "JPEG", imgX, imgY, imgSize, imgSize);
        }
      },
    });

    doc.save(`${getReportLabel(activeReport)} Report.pdf`);
  };

  // ⬇️ Print
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
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: center;
            word-wrap: break-word;
          }
          th { background-color: #f4f4f4; }
          img {
            max-width: 60px;
            max-height: 60px;
            border-radius: 6px;
            display: block;
            margin: 0 auto;
          }

          th:nth-child(1), td:nth-child(1) { width: 8%; }
          th:nth-child(2), td:nth-child(2) { width: 12%; }
          th:nth-child(3), td:nth-child(3) { width: 18%; }
          th:nth-child(4), td:nth-child(4) { width: 15%; }
          th:nth-child(5), td:nth-child(5) { width: 25%; }
          th:nth-child(6), td:nth-child(6) { width: 12%; }
          th:nth-child(7), td:nth-child(7) { width: 10%; }

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
                    ? `<img src="${API_URL}/${normalizePath(
                        row.profile_picture
                      )}"/>`
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

  // Table renderer
  const renderTable = (data) => {
    if (!Array.isArray(data) || data.length === 0)
      return <p className="text-[#6b4b2b]/70">No data available</p>;

    return (
      <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
        <table className="min-w-full text-center">
          <thead className="bg-[#EADBC8] text-[#4A2F17]">
            <tr>
              <th className="px-4 py-2 font-semibold">Role</th>
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Email</th>
              <th className="px-4 py-2 font-semibold">Contact Person</th>
              <th className="px-4 py-2 font-semibold">Address</th>
              <th className="px-4 py-2 font-semibold">Profile Picture</th>
              <th className="px-4 py-2 font-semibold">Registration Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="odd:bg-white even:bg-white/60 border-b border-[#f2d4b5]"
              >
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
                      className="w-14 h-14 object-cover rounded mx-auto"
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
    <div className="p-6 relative">
      <h1 className="text-3xl font-bold text-[#6b4b2b] mb-4">
        Admin Report Generation
      </h1>

      {/* Pills */}
      <Tabs value={activeReport} onValueChange={(val) => setActiveReport(val)}>
        <TabsList className="flex flex-wrap gap-2 bg-white/70 ring-1 ring-black/5 rounded-full px-2 py-1 shadow-sm">
          {reportTypes.map((r) => (
            <TabsTrigger
              key={r.key}
              value={r.key}
              onClick={() => generateReport(r.key)}
              className="data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] rounded-full px-3 py-1 text-sm hover:bg-amber-50"
            >
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {reportTypes.map((r) => (
          <TabsContent key={r.key} value={r.key}>
            <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
                <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                  {r.label} Report
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 sm:p-6">
                {/* Date inputs */}
                <div className="mb-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <Button
                    onClick={() => generateReport(r.key)}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                  >
                    Generate Report
                  </Button>
                </div>

                {loading ? (
                  <p className="text-[#6b4b2b]/70">Generating report...</p>
                ) : reportData ? (
                  <div>
                    {renderTable(reportData)}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 mt-5">
                      <Button
                        onClick={downloadReportCSV}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                      >
                        <Download size={16} /> Download CSV
                      </Button>

                      <Button
                        onClick={downloadReportPDF}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                      >
                        <Download size={16} /> Download PDF
                      </Button>

                      <Button
                        onClick={printReport}
                        className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                      >
                        <Printer size={16} /> Print
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#6b4b2b]/70">
                    Select a date range and click Generate Report to view{" "}
                    {r.label}.
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