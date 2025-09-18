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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BakeryReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState("donation");

  const reportTypes = [
    { key: "donation", label: "Donation Activity" },
    { key: "expiry", label: "Expiry Loss" },
    { key: "badge", label: "Badge Progress" },
    { key: "top_items", label: "Top Donated Items" },
    { key: "weekly", label: "Weekly Summary" },
    { key: "monthly", label: "Monthly Summary" },
  ];

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const normalizePath = (path) => path.replace(/\\/g, "/");

  const generateReport = async (type) => {
    setLoading(true);
    setActiveReport(type);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/reports/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportData(res.data);
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

  const downloadReportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = Object.keys(reportData[0]);
    const rows = reportData.map((row) =>
      headers.map((h) => `"${row[h] ?? ""}"`).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeReport}_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const downloadReportPDF = async () => {
  if (!reportData || reportData.length === 0) {
    alert("No data to download.");
    return;
  }

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`${activeReport.toUpperCase()} REPORT`, 14, 20);

  const keys = Object.keys(reportData[0]);
  const headers = keys.map(k => k.replace("_", " ").toUpperCase());

  // Build rows (use full URL for images)
  const rows = reportData.map(row =>
    keys.map(k =>
      k.toLowerCase().includes("image") && row[k] ? `${API_URL}/${row[k]}` : row[k] ?? ""
    )
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 10 },
    didDrawCell: function (data) {
      const colIndex = keys.findIndex(k => k.toLowerCase().includes("image"));
      if (colIndex >= 0 && data.column.index === colIndex && data.cell.raw) {
        try {
          doc.addImage(data.cell.raw, "JPEG", data.cell.x + 2, data.cell.y + 2, 20, 20);
          data.cell.text = [];
        } catch (err) {
          console.warn("Add image failed:", err);
        }
      }
    },
  });

  doc.save(`${activeReport}_report.pdf`);
};

  const printReport = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = Object.keys(reportData[0]);
    const tableHTML = `
      <html>
        <head>
          <title>${activeReport.toUpperCase()} Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            img { max-width: 80px; max-height: 80px; }
          </style>
        </head>
        <body>
          <h2>${activeReport.toUpperCase()} Report</h2>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h.replace("_", " ")}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${reportData
                .map(
                  (row) => `
                <tr>
                  ${headers
                    .map((h) =>
                      h.toLowerCase().includes("image")
                        ? `<td><img src="${
                            row[h] ? `${API_URL}/${normalizePath(row[h])}` : ""
                          }" /></td>`
                        : `<td>${row[h] ?? ""}</td>`
                    )
                    .join("")}
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

  const renderTable = (data) => {
    if (!Array.isArray(data) || data.length === 0)
      return <p className="text-gray-500">No data available</p>;

    const headers = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded">
          <thead className="bg-gray-200">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 text-left capitalize">
                  {h.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-t">
                {headers.map((h) => (
                  <td key={h} className="px-4 py-2">
                    {h.toLowerCase().includes("image") && row[h] ? (
                      <img
                        src={`${API_URL}/${normalizePath(row[h])}`}
                        alt="Report"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      row[h]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bakery Report Generation</h1>

      <Tabs defaultValue="donation">
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
                {loading ? (
                  <p className="text-gray-500">Generating report...</p>
                ) : reportData ? (
                  <div>
                    {["weekly", "monthly"].includes(activeReport) ? (
                      <div className="w-full h-80">
                        <ResponsiveContainer>
                          {activeReport === "weekly" ? (
                            <LineChart data={reportData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="donations"
                                stroke="#8884d8"
                              />
                              <Line
                                type="monotone"
                                dataKey="claims"
                                stroke="#82ca9d"
                              />
                            </LineChart>
                          ) : (
                            <BarChart data={reportData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="donations" fill="#8884d8" />
                              <Bar dataKey="claims" fill="#82ca9d" />
                              <Bar dataKey="losses" fill="#ff6b6b" />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      renderTable(reportData)
                    )}

                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={downloadReportCSV}
                        className="flex items-center gap-2 bg-[var(--brand2)] hover:bg-[var(--brand3)]"
                      >
                        <Download size={16} /> Download CSV
                      </Button>

                      <Button
                        onClick={downloadReportPDF}
                        className="flex items-center gap-2 bg-[var(--brand2)] hover:bg-[var(--brand3)]"
                      >
                        <Download size={16} /> Download PDF
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
                    Click tab to generate {r.label}.
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