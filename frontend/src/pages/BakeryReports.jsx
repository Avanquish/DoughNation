import React, { useState, useEffect } from "react";
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
  PieChart,
  Pie,
  Cell
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export default function BakeryReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState("donation");
  const [bakeryInfo, setBakeryInfo] = useState(null);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [savedWeekStart, setSavedWeekStart] = useState(null);
  const [savedWeekEnd, setSavedWeekEnd] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [savedMonth, setSavedMonth] = useState(null)
  const COLORS_STATUS = ["#28a745", "#007bff", "#dc3545"]; // Green, Blue, Red
  const COLORS_TYPE = ["#17a2b8", "#ffc107"]; // Direct vs Request

  const reportTypes = [
    { key: "donation", label: "Donation Activity" },
    { key: "expiry", label: "Expiry Loss" },
    { key: "badge", label: "Badge Progress" },
    { key: "top_items", label: "Top Donated Items" },
    { key: "weekly", label: "Weekly Summary" },
    { key: "monthly", label: "Monthly Summary" },
  ];

  const API_URL = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";

const normalizePath = (path) => path.replace(/\\/g, "/");

const formatHeader = (h) =>
  h.replace(/_/g, " ")                  
   .replace(/\b\w/g, (c) => c.toUpperCase());

const handleMonthlyFilter = () => {
  if (!selectedMonth) {
    Swal.fire("Error", "Please select a month.", "error");
    return;
  }

  generateReport("monthly", { month: selectedMonth }).then(() => {
    localStorage.setItem("lastReportType", "monthly");
    localStorage.setItem("lastMonth", selectedMonth);

    setSavedMonth(selectedMonth); // persist applied filter
    setSelectedMonth("");         // clear input
  });
};

const handleWeeklyFilter = () => {
  if (!weekStart || !weekEnd) {
    Swal.fire("Error", "Please select both start and end dates.", "error");
    return;
  }

  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays > 7) {
    Swal.fire("Invalid Date", "Please select a date range within 1 week.", "error");
    return;
  }

  generateReport("weekly", { start: weekStart, end: weekEnd }).then(() => {
    localStorage.setItem("lastWeekStart", weekStart);
    localStorage.setItem("lastWeekEnd", weekEnd);

    setSavedWeekStart(weekStart); // persist applied filter
    setSavedWeekEnd(weekEnd);

    setWeekStart(""); // clear input only
    setWeekEnd("");
  });
};


const getBakeryHeaderHTML = (bakery, reportType) => {
  const dateStr = new Date().toLocaleString();
  const profileURL = bakery.profile
    ? `${API_URL}/${bakery.profile.replace(/\\/g, "/")}`
    : "";

  return `
    <div style="text-align:center; font-family: Arial, sans-serif; margin-bottom:30px;">
      ${profileURL ? `
        <img src="${profileURL}" alt="Bakery Logo" style="
          width:120px;
          height:120px;
          object-fit:cover;
          border-radius:50%;
          margin-bottom:15px;
        "/>` : ""}
      <h1 style="margin:0; font-size:28px; font-weight:bold; color:#222;">${bakery.name || ""}</h1>
      <p style="margin:5px 0; font-size:14px; color:#555;">
        ${bakery.address || ""}
      </p>
      <p style="margin:2px 0; font-size:14px; color:#555;">
        Contact: ${bakery.contact_number || "N/A"} | Email: ${bakery.email || "N/A"}
      </p>
      <p style="margin:20px 0 5px 0; font-size:20px; font-weight:bold; color:#000;">
        ${reportType.replace(/_/g, " ").toUpperCase()} REPORT 
      </p>
      <p style="margin:0; font-size:12px; color:#888;">
        Generated: ${dateStr}
      </p>
    </div>
  `;
};

const generateReport = async (type, param = null) => {
  setLoading(true);
  setActiveReport(type);
  try {
    const token = localStorage.getItem("token");
    let url = `${API_URL}/reports/${type}`;

    if (type === "weekly" && param?.start && param?.end) {
      url += `?start_date=${param.start}&end_date=${param.end}`;
    }
    if (type === "monthly" && param?.month) {
      url += `?month=${param.month}`;
    }

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setReportData(res.data);

    localStorage.setItem("lastReportType", type);
    localStorage.setItem("lastReportData", JSON.stringify(res.data));

    const bakeryRes = await axios.get(`${API_URL}/reports/bakery-info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setBakeryInfo(bakeryRes.data);
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

 useEffect(() => {
  const savedType = localStorage.getItem("lastReportType");
  const savedData = localStorage.getItem("lastReportData");
  const savedStart = localStorage.getItem("lastWeekStart");
  const savedEnd = localStorage.getItem("lastWeekEnd");
  const savedMonth = localStorage.getItem("lastMonth");

  if (savedType) setActiveReport(savedType);
  if (savedType && savedData) {
    setReportData(JSON.parse(savedData));

    if (savedType === "weekly" && savedStart && savedEnd) {
      setSavedWeekStart(savedStart);
      setSavedWeekEnd(savedEnd);
      // only load once, don’t overwrite new filters
      if (!weekStart && !weekEnd) {
        generateReport("weekly", { start: savedStart, end: savedEnd });
      }
    }

    if (savedType === "monthly" && savedMonth) {
      setSavedMonth(savedMonth);
      if (!selectedMonth) {
        generateReport("monthly", { month: savedMonth });
      }
    }
  }
}, []);


const downloadReportCSV = () => {
  if (!reportData) return;

  Swal.fire({
    title: "Preparing CSV...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  setTimeout(() => {
    // Wrap reportData in array if it is an object (weekly/monthly)
    const dataToExport = Array.isArray(reportData) ? reportData : [reportData];

    // Flatten top_items if exists
    let flatData = dataToExport.map((row) => {
      const newRow = { ...row };
      if (row.top_items && Array.isArray(row.top_items)) {
        row.top_items.forEach((item, i) => {
          newRow[`Top Item ${i + 1} Name`] = item.product_name;
          newRow[`Top Item ${i + 1} Quantity`] = item.quantity;
        });
        delete newRow.top_items;
      }
      return newRow;
    });

    const headers = Object.keys(flatData[0]);
    const csvRows = [headers.join(",")];

    for (let row of flatData) {
      const values = headers.map((h) => `"${row[h] ?? ""}"`);
      csvRows.push(values.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeReport}_report.csv`;
    link.click();
    URL.revokeObjectURL(url);

    Swal.close();
  }, 50);
};


const downloadReportPDF = async (includeImages = true) => {
  if (!reportData || reportData.length === 0) {
    alert("No data to download.");
    return;
  }

  Swal.fire({
    title: "Generating PDF...",
    html: "Please wait...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

 // Weekly UI snapshot
if (activeReport === "weekly") {
  const doc = new jsPDF("landscape", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

 //  HEADER 
  const logoSize = 40;
  if (bakeryInfo?.profile) {
    const logo = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${API_URL}/${normalizePath(bakeryInfo.profile)}?t=${Date.now()}`;
    });

    if (logo) {
      const canvas = document.createElement("canvas");
      canvas.width = logoSize;
      canvas.height = logoSize;
      const ctx = canvas.getContext("2d");

      // Draw rounded logo
      const radius = logoSize / 2;
      ctx.clearRect(0, 0, logoSize, logoSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logo, 0, 0, logoSize, logoSize);
      ctx.restore();

      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
      currentY += logoSize + 5;
    }
  }

  // Bakery Name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, { align: "center" });
  currentY += 14;

  // Address & Contact
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;
  doc.text(
    `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${bakeryInfo?.email || "N/A"}`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  currentY += 18;

  // Report Title & Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${activeReport.replace(/_/g, " ").toUpperCase()} REPORT`, pageWidth / 2, currentY, { align: "center" });
  currentY += 14;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 20;

  // WEEKLY SUMMARY TABLE 
  const summaryHeaders = ["Week Start","Week End","Total Direct Donations","Total Request Donations","Total Donations","Expired Products"];
  const summaryRow = [
    reportData.week_start || "",
    reportData.week_end || "",
    reportData.total_direct_donations || 0,
    reportData.total_request_donations || 0,
    reportData.total_donations || 0,
    reportData.expired_products || 0
  ];

  autoTable(doc, {
    head: [summaryHeaders],
    body: [summaryRow],
    startY: currentY,
    styles: { fontSize: 8, halign: "center", valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  currentY += 15; 

  // TOP ITEMS TABLE HEADER
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("TOP PRODUCTS", doc.internal.pageSize.getWidth() / 2, currentY, { align: "center" });
currentY += 10; // add some space below the header

  // TOP ITEMS TABLE
  const topItems = reportData.top_items || [];
  const topHeaders = ["Product Name","Quantity"];
  const topRows = topItems.length > 0 ? topItems.map(i => [i.product_name, i.quantity]) : [["No top items for this week.", ""]];
  
  autoTable(doc, {
    head: [topHeaders],
    body: topRows,
    startY: currentY,
    styles: { fontSize: 8, halign: "center", valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // PIE CHARTS 
const drawSimplePie = (data, colors, size = 120) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = -0.5 * Math.PI;
  const center = size / 2;
  const radius = size / 2;

  data.forEach((d, i) => {
    const slice = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fill();

    // Draw percentage inside slice
    if (total > 0) {
      const midAngle = startAngle + slice / 2;
      const textX = center + Math.cos(midAngle) * radius * 0.6;
      const textY = center + Math.sin(midAngle) * radius * 0.6;
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.floor(size / 10)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round((d.value / total) * 100)}%`, textX, textY);
    }

    startAngle += slice;
  });

  return canvas.toDataURL("image/png");
};

// Pie images
const pieStatusImg = drawSimplePie(
  [
    { name: "Available", value: reportData.available_products || 0 },
    { name: "Donated", value: reportData.total_donations || 0 },
    { name: "Expired", value: reportData.expired_products || 0 }
  ],
  ["#28a745", "#007bff", "#dc3545"],
  120
);

const pieTypeImg = drawSimplePie(
  [
    { name: "Direct", value: reportData.total_direct_donations || 0 },
    { name: "Request", value: reportData.total_request_donations || 0 }
  ],
  ["#4CAF50", "#2196F3"],
  120
);

// Draw box
const boxX = 40;
const boxY = currentY;
const boxWidth = 763;
const boxHeight = 220;
doc.setDrawColor(0);
doc.setLineWidth(0.5);
doc.rect(boxX, boxY, boxWidth, boxHeight);

// Titles above pies
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Inventory Status", boxX + 180, boxY + 15, { align: "center" });
doc.text("Donation Type", boxX + 540, boxY + 15, { align: "center" });

// Add pies
doc.addImage(pieStatusImg, "PNG", boxX + 120, boxY + 25, 120, 120);
doc.addImage(pieTypeImg, "PNG", boxX + 480, boxY + 25, 120, 120);

// ===== Legends with colored boxes below each pie =====
const drawLegend = (startX, startY, labels) => {
  const boxSize = 8;   // small square
  const fontSize = 8;  // small text
  const gap = 5;       // space between box and text

  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");

  // Calculate total width of all legends to center them
  let totalWidth = 0;
  const itemWidths = labels.map(lbl => {
    const w = boxSize + gap + doc.getTextWidth(lbl.text);
    totalWidth += w + 20; // 20px spacing between items
    return w;
  });
  totalWidth -= 20; // remove extra spacing after last item

  // Starting X to center legend
  let x = startX - totalWidth / 2;

  labels.forEach((lbl, i) => {
    // Draw colored box
    doc.setFillColor(lbl.color);
    doc.rect(x, startY, boxSize, boxSize, "F");

    // Draw text in same color as box, vertically centered
    doc.setTextColor(lbl.color);
    doc.text(lbl.text, x + boxSize + gap, startY + boxSize / 2 + 1, { baseline: "middle" });

    x += itemWidths[i] + 20; // move X for next legend
  });

  // Reset text color to black for further text
  doc.setTextColor(0);
};

const pie1CenterX = boxX + 180; // Inventory pie
const pie2CenterX = boxX + 550; // Donation pie

drawLegend(pie1CenterX, boxY + 160, [
  { text: "Available", color: "#28a745" },
  { text: "Donated", color: "#007bff" },
  { text: "Expired", color: "#dc3545" }
]);

drawLegend(pie2CenterX, boxY + 160, [
  { text: "Direct", color: "#4CAF50" },
  { text: "Request", color: "#2196F3" }
]);

// Reset text color
doc.setTextColor(0);

currentY += boxHeight + 10;

  doc.save("Weekly_Report.pdf");
  Swal.close();
  return;
}


// Monthly UI snapshot
if (activeReport === "monthly") {
  const doc = new jsPDF("landscape", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

 //  HEADER 
  const logoSize = 40;
  if (bakeryInfo?.profile) {
    const logo = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${API_URL}/${normalizePath(bakeryInfo.profile)}?t=${Date.now()}`;
    });

    if (logo) {
      const canvas = document.createElement("canvas");
      canvas.width = logoSize;
      canvas.height = logoSize;
      const ctx = canvas.getContext("2d");

      // Draw rounded logo
      const radius = logoSize / 2;
      ctx.clearRect(0, 0, logoSize, logoSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logo, 0, 0, logoSize, logoSize);
      ctx.restore();

      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
      currentY += logoSize + 5;
    }
  }

  // Bakery Name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, { align: "center" });
  currentY += 14;

  // Address & Contact
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;
  doc.text(
    `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${bakeryInfo?.email || "N/A"}`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  currentY += 18;

  // Report Title & Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${activeReport.replace(/_/g, " ").toUpperCase()} REPORT`, pageWidth / 2, currentY, { align: "center" });
  currentY += 14;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 20;

  // Month SUMMARY TABLE 
  const summaryHeaders = ["Month","Total Direct Donations","Total Request Donations","Total Donations","Expired Products"];
  const summaryRow = [
    reportData.month || "",
    reportData.total_direct_donations || 0,
    reportData.total_request_donations || 0,
    reportData.total_donations || 0,
    reportData.expired_products || 0
  ];

  autoTable(doc, {
    head: [summaryHeaders],
    body: [summaryRow],
    startY: currentY,
    styles: { fontSize: 8, halign: "center", valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  currentY += 15; 

  // TOP ITEMS TABLE HEADER
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("TOP PRODUCTS", doc.internal.pageSize.getWidth() / 2, currentY, { align: "center" });
currentY += 10; // add some space below the header

  // TOP ITEMS TABLE
  const topItems = reportData.top_items || [];
  const topHeaders = ["Product Name","Quantity"];
  const topRows = topItems.length > 0 ? topItems.map(i => [i.product_name, i.quantity]) : [["No top items for this week.", ""]];
  
  autoTable(doc, {
    head: [topHeaders],
    body: topRows,
    startY: currentY,
    styles: { fontSize: 8, halign: "center", valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // PIE CHARTS 
const drawSimplePie = (data, colors, size = 120) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = -0.5 * Math.PI;
  const center = size / 2;
  const radius = size / 2;

  data.forEach((d, i) => {
    const slice = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fill();

    // Draw percentage inside slice
    if (total > 0) {
      const midAngle = startAngle + slice / 2;
      const textX = center + Math.cos(midAngle) * radius * 0.6;
      const textY = center + Math.sin(midAngle) * radius * 0.6;
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.floor(size / 10)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round((d.value / total) * 100)}%`, textX, textY);
    }

    startAngle += slice;
  });

  return canvas.toDataURL("image/png");
};

// Pie images
const pieStatusImg = drawSimplePie(
  [
    { name: "Available", value: reportData.available_products || 0 },
    { name: "Donated", value: reportData.total_donations || 0 },
    { name: "Expired", value: reportData.expired_products || 0 }
  ],
  ["#28a745", "#007bff", "#dc3545"],
  120
);

const pieTypeImg = drawSimplePie(
  [
    { name: "Direct", value: reportData.total_direct_donations || 0 },
    { name: "Request", value: reportData.total_request_donations || 0 }
  ],
  ["#4CAF50", "#2196F3"],
  120
);

// Draw box
const boxX = 40;
const boxY = currentY;
const boxWidth = 763;
const boxHeight = 220;
doc.setDrawColor(0);
doc.setLineWidth(0.5);
doc.rect(boxX, boxY, boxWidth, boxHeight);

// Titles above pies
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Inventory Status", boxX + 180, boxY + 15, { align: "center" });
doc.text("Donation Type", boxX + 540, boxY + 15, { align: "center" });

// Add pies
doc.addImage(pieStatusImg, "PNG", boxX + 120, boxY + 25, 120, 120);
doc.addImage(pieTypeImg, "PNG", boxX + 480, boxY + 25, 120, 120);

// ===== Legends with colored boxes below each pie =====
const drawLegend = (startX, startY, labels) => {
  const boxSize = 8;   // small square
  const fontSize = 8;  // small text
  const gap = 5;       // space between box and text

  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");

  // Calculate total width of all legends to center them
  let totalWidth = 0;
  const itemWidths = labels.map(lbl => {
    const w = boxSize + gap + doc.getTextWidth(lbl.text);
    totalWidth += w + 20; // 20px spacing between items
    return w;
  });
  totalWidth -= 20; // remove extra spacing after last item

  // Starting X to center legend
  let x = startX - totalWidth / 2;

  labels.forEach((lbl, i) => {
    // Draw colored box
    doc.setFillColor(lbl.color);
    doc.rect(x, startY, boxSize, boxSize, "F");

    // Draw text in same color as box, vertically centered
    doc.setTextColor(lbl.color);
    doc.text(lbl.text, x + boxSize + gap, startY + boxSize / 2 + 1, { baseline: "middle" });

    x += itemWidths[i] + 20; // move X for next legend
  });

  // Reset text color to black for further text
  doc.setTextColor(0);
};

const pie1CenterX = boxX + 180; // Inventory pie
const pie2CenterX = boxX + 550; // Donation pie

drawLegend(pie1CenterX, boxY + 160, [
  { text: "Available", color: "#28a745" },
  { text: "Donated", color: "#007bff" },
  { text: "Expired", color: "#dc3545" }
]);

drawLegend(pie2CenterX, boxY + 160, [
  { text: "Direct", color: "#4CAF50" },
  { text: "Request", color: "#2196F3" }
]);

// Reset text color
doc.setTextColor(0);

currentY += boxHeight + 10;

  doc.save("Monthly_Report.pdf");
  Swal.close();
  return;
}
  // --- Normal Table PDF with Images ---
  const doc = new jsPDF("landscape", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

// HEADER 
  const logoSize = 40;
  if (bakeryInfo?.profile) {
    const logo = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${API_URL}/${normalizePath(bakeryInfo.profile)}?t=${Date.now()}`;
    });

    if (logo) {
      const canvas = document.createElement("canvas");
      canvas.width = logoSize;
      canvas.height = logoSize;
      const ctx = canvas.getContext("2d");

      // Draw rounded logo
      const radius = logoSize / 2;
      ctx.clearRect(0, 0, logoSize, logoSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logo, 0, 0, logoSize, logoSize);
      ctx.restore();

      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
      currentY += logoSize + 5;
    }
  }

  // Bakery Name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, { align: "center" });
  currentY += 14;

  // Address & Contact
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;
  doc.text(
    `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${bakeryInfo?.email || "N/A"}`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  currentY += 18;

  // Report Title & Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${activeReport.replace(/_/g, " ").toUpperCase()} REPORT`, pageWidth / 2, currentY, { align: "center" });
  currentY += 14;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 20;

  // Table with optional images
  const keys = Object.keys(reportData[0]);
  const imageColIndex = keys.findIndex((k) => k.toLowerCase().includes("image"));
  const headers = keys.map((k, i) => (i === imageColIndex ? "IMAGE" : k.replace(/_/g, " ").toUpperCase()));

  const toBase64 = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const MAX_DIM = 180;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = (height / width) * MAX_DIM;
          width = MAX_DIM;
        } else if (height > width && height > MAX_DIM) {
          width = (width / height) * MAX_DIM;
          height = MAX_DIM;
        } else if (width > MAX_DIM) {
          width = height = MAX_DIM;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ data: canvas.toDataURL("image/jpeg"), width, height });
      };
      img.onerror = () => resolve(null);
      img.src = url + "?t=" + Date.now();
    });

  let processedData = [];

  if (includeImages && imageColIndex >= 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < reportData.length; i += BATCH_SIZE) {
      const batch = reportData.slice(i, i + BATCH_SIZE);
      const batchData = await Promise.all(
        batch.map(async (row) => {
          const newRow = { ...row };
          if (row[keys[imageColIndex]]) {
            const url = `${API_URL}/${normalizePath(row[keys[imageColIndex]])}`;
            newRow[keys[imageColIndex]] = await toBase64(url);
          }
          return newRow;
        })
      );
      processedData = processedData.concat(batchData);
      Swal.getHtmlContainer().innerHTML = `Processing ${Math.min(i + BATCH_SIZE, reportData.length)} of ${reportData.length} rows...`;
      await new Promise((r) => setTimeout(r, 10));
    }
  } else {
    processedData = reportData;
  }

  const rows = processedData.map((row) =>
    keys.map((k) => (imageColIndex >= 0 && k === keys[imageColIndex] ? "" : row[k] ?? ""))
  );

  const IMG_SIZE = 45;

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: currentY,
    styles: { fontSize: 8, halign: "center", valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center", fontStyle: "bold" },
    columnStyles: imageColIndex >= 0 ? { [imageColIndex]: { cellWidth: 120, halign: "center" } } : {},
    didParseCell: (data) => {
      if (data.section === "body") {
        const hasImage =
          includeImages && imageColIndex >= 0 && processedData[data.row.index][keys[imageColIndex]];
        data.row.height = hasImage ? 50 : 20;
      }
    },
    didDrawCell: (data) => {
      if (includeImages && imageColIndex >= 0 && data.section === "body" && data.column.index === imageColIndex) {
        const imgObj = processedData[data.row.index][keys[imageColIndex]];
        if (imgObj) {
          const { x, y, width, height } = data.cell;
          const imgX = x + (width - IMG_SIZE) / 2;
          const imgY = y + (height - IMG_SIZE) / 2;
          doc.addImage(imgObj.data, "JPEG", imgX, imgY, IMG_SIZE, IMG_SIZE);
        }
      }
    },
  });

  doc.save(`${activeReport}_report.pdf`);
  Swal.close();
};

const printReport = async (bakery) => {
  if (!reportData) return;

  const API_URL = import.meta.env.VITE_API_URL || "https://api.doughnationhq.cloud";
  const headerHTML = getBakeryHeaderHTML(bakery, activeReport);
  const formatHeader = (h) => h.replace(/_/g, " ").toUpperCase();
  const normalizePath = (p) => p.replace(/\\/g, "/");

  let reportBodyHTML = "";

  if (activeReport === "weekly") {
    // Ensure reportData has needed properties
    const savedWeekStart = reportData.week_start || "";
    const savedWeekEnd = reportData.week_end || "";

    // Weekly summary table
    const weekTable = `
      <h3>Weekly Summary</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
        <thead>
          <tr>
            <th>Week Start</th>
            <th>Week End</th>
            <th>Total Direct Donations</th>
            <th>Total Request Donations</th>
            <th>Total Donations</th>
            <th>Expired Products</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${savedWeekStart}</td>
            <td>${savedWeekEnd}</td>
            <td>${reportData.total_direct_donations || 0}</td>
            <td>${reportData.total_request_donations || 0}</td>
            <td>${reportData.total_donations || 0}</td>
            <td>${reportData.expired_products || 0}</td>
          </tr>
        </tbody>
      </table>
    `;

    // Top items table
    const topItemsHTML = `
      <h3>Top Donated Items</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${
            reportData.top_items && reportData.top_items.length > 0
              ? reportData.top_items.map(
                  (item) => `<tr><td>${item.product_name}</td><td>${item.quantity}</td></tr>`
                ).join("")
              : `<tr><td colspan="2">No top items for this week.</td></tr>`
          }
        </tbody>
      </table>
    `;

    // Function to draw pie chart
    const drawPieChartWithPercent = (data, colors, size = 450) =>
      new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let startAngle = -0.5 * Math.PI;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        data.forEach((d, i) => {
          const sliceAngle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
          ctx.closePath();
          ctx.fill();

          // Draw percentage
          const midAngle = startAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(midAngle) * (radius * 0.6);
          const labelY = centerY + Math.sin(midAngle) * (radius * 0.6);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 25px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (d.value > 0) ctx.fillText(`${((d.value / total) * 100).toFixed(0)}%`, labelX, labelY);

          startAngle += sliceAngle;
        });

        resolve(canvas.toDataURL("image/png"));
      });

    // Draw pie charts
    const pieStatusImg = await drawPieChartWithPercent(
      [
        { name: "Available", value: reportData.available_products || 0 },
        { name: "Donated", value: reportData.total_donations || 0 },
        { name: "Expired", value: reportData.expired_products || 0 },
      ],
      ["#28a745", "#007bff", "#dc3545"]
    );

    const pieTypeImg = await drawPieChartWithPercent(
      [
        { name: "Direct", value: reportData.total_direct_donations || 0 },
        { name: "Request", value: reportData.total_request_donations || 0 },
      ],
      ["#4CAF50", "#2196F3"]
    );

    // Weekly Breakdown inside a single box
    const pieChartsHTML = `
      <div style="
        border: 2px solid #ccc;
        padding: 20px;
        margin-top: 20px;
        page-break-inside: avoid;
        min-height: 400px; 
      ">
        <div style="display: flex; justify-content: center; gap: 40px; margin-top: 20px;">
          <div style="flex: 0 0 auto; text-align: center; width: 450px; font-size: 15px; font-weight: bold">
            <p>Inventory Status</p>
             <img src="${pieStatusImg}" style="width: 100%; height: auto; max-width: 250px; max-height: 250px;"/>
            <div style="margin-top:10px;">
              <span style="color:#28a745; font-weight:bold; font-size:14px;">Available</span>
              <span style="color:#007bff; font-weight:bold; font-size:14px; margin-left:10px;">Donated</span>
              <span style="color:#dc3545; font-weight:bold; font-size:14px; margin-left:10px;">Expired</span>
            </div>
          </div>
          <div style="flex: 0 0 auto; text-align: center; width: 450px; font-size: 15px; font-weight: bold">
            <p>Donation Type</p>
            <img src="${pieTypeImg}" style="width: 100%; height: auto; max-width: 250px; max-height: 250px;"/>
            <div style="margin-top:10px;">
              <span style="color:#4CAF50; font-weight:bold; font-size:14px;">Direct</span>
              <span style="color:#2196F3; font-weight:bold; font-size:14px; margin-left:10px;">Request</span>
            </div>
          </div>
        </div>
      </div>
    `;

    reportBodyHTML = `${weekTable}${topItemsHTML}${pieChartsHTML}`;
  } else if (activeReport === "monthly") {
    // Ensure reportData has needed properties
    const savedMonth = reportData.month || "";

    // Weekly summary table
    const weekTable = `
      <h3>Weekly Summary</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
        <thead>
          <tr>
            <th>Month</th>
            <th>Total Direct Donations</th>
            <th>Total Request Donations</th>
            <th>Total Donations</th>
            <th>Expired Products</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${savedMonth}</td>
            <td>${reportData.total_direct_donations || 0}</td>
            <td>${reportData.total_request_donations || 0}</td>
            <td>${reportData.total_donations || 0}</td>
            <td>${reportData.expired_products || 0}</td>
          </tr>
        </tbody>
      </table>
    `;

    // Top items table
    const topItemsHTML = `
      <h3>Top Donated Items</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${
            reportData.top_items && reportData.top_items.length > 0
              ? reportData.top_items.map(
                  (item) => `<tr><td>${item.product_name}</td><td>${item.quantity}</td></tr>`
                ).join("")
              : `<tr><td colspan="2">No top items for this week.</td></tr>`
          }
        </tbody>
      </table>
    `;

    // Function to draw pie chart
    const drawPieChartWithPercent = (data, colors, size = 450) =>
      new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let startAngle = -0.5 * Math.PI;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        data.forEach((d, i) => {
          const sliceAngle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
          ctx.closePath();
          ctx.fill();

          // Draw percentage
          const midAngle = startAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(midAngle) * (radius * 0.6);
          const labelY = centerY + Math.sin(midAngle) * (radius * 0.6);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 25px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (d.value > 0) ctx.fillText(`${((d.value / total) * 100).toFixed(0)}%`, labelX, labelY);

          startAngle += sliceAngle;
        });

        resolve(canvas.toDataURL("image/png"));
      });

    // Draw pie charts
    const pieStatusImg = await drawPieChartWithPercent(
      [
        { name: "Available", value: reportData.available_products || 0 },
        { name: "Donated", value: reportData.total_donations || 0 },
        { name: "Expired", value: reportData.expired_products || 0 },
      ],
      ["#28a745", "#007bff", "#dc3545"]
    );

    const pieTypeImg = await drawPieChartWithPercent(
      [
        { name: "Direct", value: reportData.total_direct_donations || 0 },
        { name: "Request", value: reportData.total_request_donations || 0 },
      ],
      ["#4CAF50", "#2196F3"]
    );

    // Weekly Breakdown inside a single box
    const pieChartsHTML = `
      <div style="
        border: 2px solid #ccc;
        padding: 20px;
        margin-top: 20px;
        page-break-inside: avoid;
        min-height: 400px; 
      ">
        <div style="display: flex; justify-content: center; gap: 40px; margin-top: 20px;">
          <div style="flex: 0 0 auto; text-align: center; width: 450px; font-size: 15px; font-weight: bold">
            <p>Inventory Status</p>
             <img src="${pieStatusImg}" style="width: 100%; height: auto; max-width: 250px; max-height: 250px;"/>
            <div style="margin-top:10px;">
              <span style="color:#28a745; font-weight:bold; font-size:14px;">Available</span>
              <span style="color:#007bff; font-weight:bold; font-size:14px; margin-left:10px;">Donated</span>
              <span style="color:#dc3545; font-weight:bold; font-size:14px; margin-left:10px;">Expired</span>
            </div>
          </div>
          <div style="flex: 0 0 auto; text-align: center; width: 450px; font-size: 15px; font-weight: bold">
            <p>Donation Type</p>
            <img src="${pieTypeImg}" style="width: 100%; height: auto; max-width: 250px; max-height: 250px;"/>
            <div style="margin-top:10px;">
              <span style="color:#4CAF50; font-weight:bold; font-size:14px;">Direct</span>
              <span style="color:#2196F3; font-weight:bold; font-size:14px; margin-left:10px;">Request</span>
            </div>
          </div>
        </div>
      </div>
    `;

    reportBodyHTML = `${weekTable}${topItemsHTML}${pieChartsHTML}`;
  } else {
    // Other tabs (daily, monthly, etc.)
    if (!Array.isArray(reportData) || reportData.length === 0) return;

    const headers = Object.keys(reportData[0]);
    reportBodyHTML = `
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${formatHeader(h)}</th>`).join("")}
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
                        ? `<td><img src="${row[h] ? `${API_URL}/${normalizePath(row[h])}` : ""}" /></td>`
                        : `<td>${row[h] ?? ""}</td>`
                    )
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  const tableHTML = `
    <html>
      <head>
        <title>${activeReport.toUpperCase()} Report</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; }
          th, td { border: 1px solid #ccc; padding: 6px; vertical-align: middle; }
          th { background-color: #f4f4f4; }
          img { max-width: 60px; max-height: 60px; display: block; margin: auto; }
          h3 { margin-top: 20px; }
          thead { display: table-header-group; } 
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        ${headerHTML}
        ${reportBodyHTML}
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) { alert("Please allow popups for printing."); return; }
  printWindow.document.open();
  printWindow.document.write(tableHTML);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

// Custom label renderer -> puts percentage inside slice
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

  const renderTable = (data) => {
    if (!Array.isArray(data) || data.length === 0)
      return <p className="text-gray-500">No data available</p>;

    const headers = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-center">
          <thead className="bg-gray-200">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-2">
                  {formatHeader(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                {headers.map((h) => (
                  <td key={h} className="px-4 py-2">
                    {h.toLowerCase().includes("image") && row[h] ? (
                      <img
                        src={`${API_URL}/${normalizePath(row[h])}`}
                        alt="Report"
                        className="w-20 h-20 object-cover rounded mx-auto"
                      />
                    ) : (
                      <span className="mx-auto">{row[h]}</span>
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

      {/* Controlled Tabs */}
        <Tabs
            value={activeReport}
            onValueChange={(val) => {
              setActiveReport(val);

              if (val === "weekly") {
                const savedStart = localStorage.getItem("lastWeekStart");
                const savedEnd = localStorage.getItem("lastWeekEnd");

                if (savedStart && savedEnd) {
                  generateReport("weekly", savedStart, savedEnd);
                  return;
                }
              }

              generateReport(val);
            }}
          >
              <TabsList className="flex flex-wrap gap-2">
          {reportTypes.map((r) => (
            <TabsTrigger key={r.key} value={r.key}>
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
                    <div className="w-full">
                      {/* Weekly Date Filters */}
                      {activeReport === "weekly" && (
                        <div className="mb-4 flex flex-wrap gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium">Week Start</label>
                            <input
                              type="date"
                              value={weekStart}
                              onChange={(e) => setWeekStart(e.target.value)}
                              className="border px-2 py-1 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium">Week End</label>
                            <input
                              type="date"
                              value={weekEnd}
                              onChange={(e) => setWeekEnd(e.target.value)}
                              className="border px-2 py-1 rounded"
                            />
                          </div>
                          <Button
                            onClick={handleWeeklyFilter}
                            className="bg-[var(--brand2)] hover:bg-[var(--brand3)]"
                          >
                            Filter
                          </Button>
                        </div>
                      )}

                       {activeReport === "monthly" && (
                        <div className="mb-4 flex flex-wrap gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium">Select Month</label>
                            <input
                              type="month"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(e.target.value)}
                              max={new Date().toISOString().slice(0, 7)} // disables future months
                              className="border px-2 py-1 rounded"
                            />
                          </div>

                          <Button
                            onClick={handleMonthlyFilter}
                            className="bg-[var(--brand2)] hover:bg-[var(--brand3)]"
                          >
                            Filter
                          </Button>
                        </div>
                      )}

                      {/* Weekly Summary Table */}
                      {activeReport === "weekly" && (
                        <div className="max-h-96 overflow-y-auto border rounded mb-6">
                          <table className="min-w-full border border-gray-300 text-center">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 border">Week Start</th>
                                <th className="px-4 py-2 border">Week End</th>
                                <th className="px-4 py-2 border">Total Direct Donations</th>
                                <th className="px-4 py-2 border">Total Request Donations</th>
                                <th className="px-4 py-2 border">Total Donations</th>
                                <th className="px-4 py-2 border">Expired Products</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-2 border">{reportData.week_start || savedWeekStart}</td>
                                <td className="px-4 py-2 border">{reportData.week_end || savedWeekEnd}</td>
                                <td className="px-4 py-2 border">{reportData.total_direct_donations}</td>
                                <td className="px-4 py-2 border">{reportData.total_request_donations}</td>
                                <td className="px-4 py-2 border">{reportData.total_donations}</td>
                                <td className="px-4 py-2 border">{reportData.expired_products}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Top Items Table */}
                      {activeReport === "weekly" && (
                        <div className="max-h-60 overflow-y-auto border rounded mb-6">
                          <h3 className="font-semibold p-2">Top Donated Items</h3>
                          <table className="min-w-full border border-gray-300 text-center">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 border">Product Name</th>
                                <th className="px-4 py-2 border">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.top_items && reportData.top_items.length > 0 ? (
                                reportData.top_items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 border">{item.product_name}</td>
                                    <td className="px-4 py-2 border">{item.quantity}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={2} className="px-4 py-2 border text-center">
                                    No top items for this week.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                    {/* Pie Charts */}
                        {activeReport === "weekly" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Inventory Status Pie */}
                            <Card className="shadow-md">
                              <CardHeader>
                                <CardTitle>Inventory Status</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: "Available", value: reportData.available_products || 0 },
                                        { name: "Donated", value: reportData.total_donations || 0 },
                                        { name: "Expired", value: reportData.expired_products || 0 },
                                      ]}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={80}
                                      labelLine={false}
                                      label={renderCustomizedLabel} 
                                    >
                                      {["#28a745", "#007bff", "#dc3545"].map((color, idx) => (
                                        <Cell key={idx} fill={color} />
                                      ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value}`, name]} />
                                    <Legend verticalAlign="bottom" height={36} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>

                            {/* Donation Type Pie */}
                            <Card className="shadow-md">
                              <CardHeader>
                                <CardTitle>Donation Type</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: "Direct", value: reportData.total_direct_donations || 0 },
                                        { name: "Request", value: reportData.total_request_donations || 0 },
                                      ]}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={80}
                                      labelLine={false}
                                      label={renderCustomizedLabel} 
                                    >
                                      {["#4CAF50", "#2196F3"].map((color, idx) => (
                                        <Cell key={idx} fill={color} />
                                      ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value}`, name]} />
                                    <Legend verticalAlign="bottom" height={36} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {activeReport === "monthly" && (
                        <div className="max-h-96 overflow-y-auto border rounded mb-6">
                          <table className="min-w-full border border-gray-300 text-center">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 border">Month</th>
                                <th className="px-4 py-2 border">Total Direct Donations</th>
                                <th className="px-4 py-2 border">Total Request Donations</th>
                                <th className="px-4 py-2 border">Total Donations</th>
                                <th className="px-4 py-2 border">Expired Products</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-2 border">{reportData.month || savedMonth}</td>
                                <td className="px-4 py-2 border">{reportData.total_direct_donations}</td>
                                <td className="px-4 py-2 border">{reportData.total_request_donations}</td>
                                <td className="px-4 py-2 border">{reportData.total_donations}</td>
                                <td className="px-4 py-2 border">{reportData.expired_products}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Top Items Table */}
                      {activeReport === "monthly" && (
                        <div className="max-h-60 overflow-y-auto border rounded mb-6">
                          <h3 className="font-semibold p-2">Top Donated Items</h3>
                          <table className="min-w-full border border-gray-300 text-center">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 border">Product Name</th>
                                <th className="px-4 py-2 border">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.top_items && reportData.top_items.length > 0 ? (
                                reportData.top_items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 border">{item.product_name}</td>
                                    <td className="px-4 py-2 border">{item.quantity}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={2} className="px-4 py-2 border text-center">
                                    No top items for this week.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pie Charts */}
                      {activeReport === "monthly" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Inventory Status Pie */}
                          <Card className="shadow-md">
                            <CardHeader>
                              <CardTitle>Inventory Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: "Available", value: reportData.available_products || 0 },
                                      { name: "Donated", value: reportData.total_donations || 0 },
                                      { name: "Expired", value: reportData.expired_products || 0 },
                                    ]}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    labelLine={false}
                                    label={renderCustomizedLabel} 
                                  >
                                    {["#28a745", "#007bff", "#dc3545"].map((color, idx) => (
                                      <Cell key={idx} fill={color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, name) => [`${value}`, name]} />
                                  <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>

                          {/* Donation Type Pie */}
                          <Card className="shadow-md">
                            <CardHeader>
                              <CardTitle>Donation Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: "Direct", value: reportData.total_direct_donations || 0 },
                                      { name: "Request", value: reportData.total_request_donations || 0 },
                                    ]}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    labelLine={false}
                                    label={renderCustomizedLabel} 
                                  >
                                    {["#4CAF50", "#2196F3"].map((color, idx) => (
                                      <Cell key={idx} fill={color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, name) => [`${value}`, name]} />
                                  <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </div>
                      )}
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
                        onClick={() => downloadReportPDF(bakeryInfo)}
                        className="flex items-center gap-2 bg-[var(--brand2)] hover:bg-[var(--brand3)]"
                      >
                        <Download size={16} /> Download PDF
                      </Button>

                      <Button
                        onClick={() => printReport(bakeryInfo)}
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
 