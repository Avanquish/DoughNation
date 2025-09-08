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
import "jspdf-autotable";

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

  const generateReport = async (type) => {
    setLoading(true);
    setActiveReport(type);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://127.0.0.1:8000/reports/${type}`, {
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
    if (!reportData) return;

    const headers = Object.keys(reportData[0]);
    const rows = reportData.map((row) =>
        headers.map((h) => `"${row[h] ?? ""}"`).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeReport}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    };

    const downloadReportPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`${activeReport.toUpperCase()} REPORT`, 14, 20);

        if (Array.isArray(reportData) && reportData.length > 0) {
            const headers = Object.keys(reportData[0]).map((h) =>
            h.replace("_", " ").toUpperCase()
            );

            const rows = reportData.map((row) =>
            headers.map((h) => {
                const key = h.toLowerCase().replace(" ", "_");
                if (key.includes("image")) {
                return "[IMAGE]"; // can later embed real images
                }
                return row[key];
            })
            );

            doc.autoTable({
            head: [headers],
            body: rows,
            startY: 30,
            });
        } else {
            doc.setFontSize(12);
            doc.text("No data available", 14, 30);
        }

        doc.save(`${activeReport}_report.pdf`);
        };

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write("<pre>" + JSON.stringify(reportData, null, 2) + "</pre>");
    printWindow.document.close();
    printWindow.print();
  };

  // ✅ Renderers
  const renderTable = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return <p className="text-gray-500">No data available</p>;
    }

    const headers = Object.keys(data[0]);
    const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

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
                    {h.toLowerCase().includes("image") ? (
                        <img
                        src={`${API_URL}/${row[h]}`}
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
