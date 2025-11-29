import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  History,
  AlertTriangle,
  Trophy,
  HeartHandshake,
  ChartPie as ReportsIcon,
} from "lucide-react";

export default function BakeryReports({ isViewOnly = false }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Top-level tab
  const [activeReport, setActiveReport] = useState("");

  // Inner summary tab
  const [activeSummary, setActiveSummary] = useState("weekly");

  const [bakeryInfo, setBakeryInfo] = useState(null);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [savedWeekStart, setSavedWeekStart] = useState(null);
  const [savedWeekEnd, setSavedWeekEnd] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [savedMonth, setSavedMonth] = useState(null);
  
  // Custom period state
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [savedCustomStart, setSavedCustomStart] = useState(null);
  const [savedCustomEnd, setSavedCustomEnd] = useState(null);

  // Date filters for other reports
  const [donationHistoryStart, setDonationHistoryStart] = useState("");
  const [donationHistoryEnd, setDonationHistoryEnd] = useState("");
  const [expiryLossStart, setExpiryLossStart] = useState("");
  const [expiryLossEnd, setExpiryLossEnd] = useState("");
  const [topItemsStart, setTopItemsStart] = useState("");
  const [topItemsEnd, setTopItemsEnd] = useState("");
  const [charityListStart, setCharityListStart] = useState("");
  const [charityListEnd, setCharityListEnd] = useState("");

  const [employees, setEmployees] = useState([]);
  const [employeeName, setEmployeeName] = useState("");
  const COLORS_STATUS = ["#28a745", "#007bff", "#dc3545"]; // Green, Blue, Red
  const COLORS_TYPE = ["#17a2b8", "#ffc107"]; // Direct vs Request

  // Top-level reports (summary replaces weekly/monthly here)
  const reportTypes = [
    { key: "donation_history", label: "Donation History", icon: History },
    { key: "expiry_loss", label: "Expiry Loss", icon: AlertTriangle },
    { key: "top_items", label: "Top Donated Items", icon: Trophy },
    { key: "charity_list", label: "Charity List", icon: HeartHandshake },
    { key: "summary", label: "Period Summary", icon: ReportsIcon },
  ];

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const normalizePath = (path) => path.replace(/\\/g, "/");

  const formatHeader = (h) =>
    h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Get current date in Philippine timezone (YYYY-MM-DD format)
  const getPhilippineDate = () => {
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const year = phTime.getFullYear();
    const month = String(phTime.getMonth() + 1).padStart(2, '0');
    const day = String(phTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: which type should be used for fetching/exports?
  const getEffectiveReportType = () =>
    activeReport === "summary" ? activeSummary : activeReport;

  const handleMonthlyFilter = () => {
    const effType = "monthly";
    if (!selectedMonth) {
      Swal.fire("Error", "Please select a month.", "error");
      return;
    }

    // Validate future month
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // Format: YYYY-MM

    if (selectedMonth > currentMonth) {
      Swal.fire(
        "Invalid Date",
        "Selected month cannot be in the future.",
        "error"
      );
      return;
    }

    generateReport(effType, { month: selectedMonth }).then(() => {
      localStorage.setItem("lastReportType", effType);
      localStorage.setItem("lastMonth", selectedMonth);
      setSavedMonth(selectedMonth);
      setActiveReport("summary");
      setActiveSummary(effType);
    });
  };

  const handleWeeklyFilter = () => {
    const effType = "weekly";
    if (!weekStart || !weekEnd) {
      Swal.fire("Error", "Please select both start and end dates.", "error");
      return;
    }

    // Validate future dates
    const today = new Date().toISOString().split("T")[0];

    if (weekStart > today) {
      Swal.fire("Invalid Date", "Start date cannot be in the future.", "error");
      return;
    }

    if (weekEnd > today) {
      Swal.fire("Invalid Date", "End date cannot be in the future.", "error");
      return;
    }

    const start = new Date(weekStart);
    const end = new Date(weekEnd);

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 7) {
      Swal.fire(
        "Invalid Date",
        "Please select a date range within 1 week.",
        "error"
      );
      return;
    }

    generateReport(effType, { start: weekStart, end: weekEnd }).then(() => {
      localStorage.setItem("lastWeekStart", weekStart);
      localStorage.setItem("lastWeekEnd", weekEnd);

      setSavedWeekStart(weekStart);
      setSavedWeekEnd(weekEnd);
      setActiveReport("summary");
      setActiveSummary(effType);
    });
  };

  const handleCustomFilter = () => {
    const effType = "custom";
    if (!customStart || !customEnd) {
      Swal.fire("Error", "Please select both start and end dates.", "error");
      return;
    }

    // Validate future dates
    const today = new Date().toISOString().split("T")[0];
    
    if (customStart > today) {
      Swal.fire("Invalid Date", "Start date cannot be in the future.", "error");
      return;
    }
    
    if (customEnd > today) {
      Swal.fire("Invalid Date", "End date cannot be in the future.", "error");
      return;
    }
    
    if (customStart > customEnd) {
      Swal.fire("Invalid Date Range", "End date must be after or equal to start date.", "error");
      return;
    }

    generateReport(effType, { start: customStart, end: customEnd }).then(() => {
      localStorage.setItem("lastCustomStart", customStart);
      localStorage.setItem("lastCustomEnd", customEnd);

      setSavedCustomStart(customStart);
      setSavedCustomEnd(customEnd);
      setActiveReport("summary");
      setActiveSummary(effType);
    });
  };

  // Handlers for other report filters
  const handleDonationHistoryFilter = () => {
    // Validate future dates
    const today = new Date().toISOString().split("T")[0];

    if (donationHistoryStart && donationHistoryStart > today) {
      Swal.fire("Invalid Date", "Start date cannot be in the future.", "error");
      return;
    }

    if (donationHistoryEnd && donationHistoryEnd > today) {
      Swal.fire("Invalid Date", "End date cannot be in the future.", "error");
      return;
    }

    generateReport("donation_history", {
      start_date: donationHistoryStart,
      end_date: donationHistoryEnd,
    });
  };

  const handleExpiryLossFilter = () => {
    // Validate future dates
    const today = new Date().toISOString().split("T")[0];

    if (expiryLossStart && expiryLossStart > today) {
      Swal.fire("Invalid Date", "Start date cannot be in the future.", "error");
      return;
    }

    if (expiryLossEnd && expiryLossEnd > today) {
      Swal.fire("Invalid Date", "End date cannot be in the future.", "error");
      return;
    }

    generateReport("expiry_loss", {
      start_date: expiryLossStart,
      end_date: expiryLossEnd,
    });
  };

  const handleTopItemsFilter = () => {
    // Validate future dates
    const today = new Date().toISOString().split("T")[0];

    if (topItemsStart && topItemsStart > today) {
      Swal.fire("Invalid Date", "Start date cannot be in the future.", "error");
      return;
    }

    if (topItemsEnd && topItemsEnd > today) {
      Swal.fire("Invalid Date", "End date cannot be in the future.", "error");
      return;
    }

    generateReport("top_items", {
      start_date: topItemsStart,
      end_date: topItemsEnd,
    });
  };

  const handleCharityListFilter = () => {
    // Validate future dates
    const today = new Date().toISOString().split("T")[0];

    if (charityListStart && charityListStart > today) {
      Swal.fire("Invalid Date", "Start date cannot be in the future.", "error");
      return;
    }

    if (charityListEnd && charityListEnd > today) {
      Swal.fire("Invalid Date", "End date cannot be in the future.", "error");
      return;
    }

    generateReport("charity_list", {
      start_date: charityListStart,
      end_date: charityListEnd,
    });
  };

  const getBakeryHeaderHTML = (bakery, reportType) => {
    const dateStr = new Date().toLocaleString();
    const profileURL = bakery.profile
      ? `${API_URL}/${bakery.profile.replace(/\\/g, "/")}`
      : "";

    return `
    <div style="text-align:center; font-family: Arial, sans-serif; margin-bottom:30px;">
      ${
        profileURL
          ? `
        <img src="${profileURL}" alt="Bakery Logo" style="
          width:120px;
          height:120px;
          object-fit:cover;
          border-radius:50%;
          margin-bottom:15px;
        "/>`
          : ""
      }
      <h1 style="margin:0; font-size:28px; font-weight:bold; color:#222;">${
        bakery.name || ""
      }</h1>
      <p style="margin:5px 0; font-size:14px; color:#555;">
        ${bakery.address || ""}
      </p>
      <p style="margin:2px 0; font-size:14px; color:#555;">
        Contact: ${bakery.contact_number || "N/A"} | Email: ${
      bakery.email || "N/A"
    }
      </p>
      <p style="margin:20px 0 5px 0; font-size:20px; font-weight:bold; color:#000;">
        ${reportType.replace(/_/g, " ").toUpperCase()} REPORT 
      </p>
      <p style="margin:0; font-size:12px; color:#888;">
        Generated By: ${employeeName}
      </p>
      <p style="margin:0; font-size:12px; color:#888;">
        Generated At: ${dateStr}
      </p>
    </div>
  `;
  };

  const generateReport = async (type, param = null) => {
    setLoading(true);

    // Only switch the main tab if we're generating a non-summary report
    if (type !== "weekly" && type !== "monthly" && type !== "custom") {
      setActiveReport(type);
    }

    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");

      let url = `${API_URL}/reports/${type}`;

      // Use unified summary endpoint for weekly/monthly/custom
      if (type === "weekly" || type === "monthly" || type === "custom") {
        url = `${API_URL}/reports/summary?period=${type}`;

        if (type === "weekly" && param?.start && param?.end) {
          url += `&start_date=${param.start}&end_date=${param.end}`;
        }
        if (type === "monthly" && param?.month) {
          url += `&month=${param.month}`;
        }
        if (type === "custom" && param?.start && param?.end) {
          url += `&start_date=${param.start}&end_date=${param.end}`;
        }
      }

      // Add date filters for other report types
      if (param?.start_date || param?.end_date) {
        const params = new URLSearchParams();
        if (param.start_date) params.append("start_date", param.start_date);
        if (param.end_date) params.append("end_date", param.end_date);
        url += `?${params.toString()}`;
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

  const fetchEmployees = async () => {
    try {
      const token =
        localStorage.getItem("employeeToken") || localStorage.getItem("token");
      const opts = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const res = await axios.get(`${API_URL}/employees`, opts);
      setEmployees(res.data || []);
    } catch (e) {
      console.error("Failed to fetch employees:", e);
    }
  };

  // Get logged-in user's name from token
  useEffect(() => {
    const employeeToken = localStorage.getItem("employeeToken");
    const bakeryToken = localStorage.getItem("token");

    let name = "System";

    if (employeeToken) {
      try {
        const payload = JSON.parse(atob(employeeToken.split(".")[1]));
        name = payload.employee_name || "Employee";
      } catch (e) {
        console.error("Failed to decode employee token", e);
      }
    } else if (bakeryToken) {
      try {
        const payload = JSON.parse(atob(bakeryToken.split(".")[1]));
        name = payload.contact_person || payload.name || "Bakery Owner";
      } catch (e) {
        console.error("Failed to decode bakery token", e);
      }
    }

    setEmployeeName(name);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Rehydrate last state
  useEffect(() => {
    const savedType = localStorage.getItem("lastReportType");
    const savedStart = localStorage.getItem("lastWeekStart");
    const savedEnd = localStorage.getItem("lastWeekEnd");
    const savedMonthLocal = localStorage.getItem("lastMonth");

    if (savedType === "weekly" || savedType === "monthly") {
      // open Summary and the correct inner tab, but don't load data
      setActiveReport("summary");
      setActiveSummary(savedType);
      if (savedType === "weekly" && savedStart && savedEnd) {
        setSavedWeekStart(savedStart);
        setSavedWeekEnd(savedEnd);
        setWeekStart(savedStart);
        setWeekEnd(savedEnd);
      }
      if (savedType === "monthly" && savedMonthLocal) {
        setSavedMonth(savedMonthLocal);
        setSelectedMonth(savedMonthLocal);
      }
      return;
    }

    // Otherwise, validate and open the saved top tab if any
    const validReport = reportTypes.find((r) => r.key === savedType);
    if (!validReport) return;

    setActiveReport(savedType || "");
  }, []);

  const downloadReportCSV = () => {
    const effectiveType = getEffectiveReportType();
    if (!reportData) return;

    Swal.fire({
      title: "Preparing CSV...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    setTimeout(() => {
      const dataToExport = Array.isArray(reportData)
        ? reportData
        : [reportData];

      // Charity List export
      if (effectiveType === "charity_list" && reportData?.charities) {
        const charities = reportData.charities;
        if (charities.length === 0) {
          Swal.close();
          Swal.fire("No data", "No charity data available to export.", "info");
          return;
        }

        const headers = [
          "ID",
          "Profile Image",
          "Cahrity Name",
          "Direct Donations",
          "Request Donations",
          "Direct Donation Quantity",
          "Request Donation Quantity",
          "Total Donated Quantity",
          "Total Transactions",
        ];

        const csvRows = [headers.join(",")];

        for (const c of charities) {
          csvRows.push(
            [
              `"${c.id || ""}"`,
              `"${c.charity_profile || ""}"`,
              `"${c.charity_name || ""}"`,
              `"${c.direct_count || 0}"`,
              `"${c.request_count || 0}"`,
              `"${c.direct_qty || 0}"`,
              `"${c.request_qty || 0}"`,
              `"${c.total_received_qty || 0}"`,
              `"${c.total_transactions || 0}"`,
            ].join(",")
          );
        }

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${effectiveType}_report.csv`;
        link.click();
        URL.revokeObjectURL(url);

        Swal.close();
        return;
      }

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
      link.download = `${effectiveType}_report.csv`;
      link.click();
      URL.revokeObjectURL(url);

      Swal.close();
    }, 50);
  };

  const downloadReportPDF = async (includeImages = true) => {
    const effectiveType = getEffectiveReportType();

    if (!reportData || reportData.length === 0) {
      if (effectiveType !== "weekly" && effectiveType !== "monthly") {
        alert("No data to download.");
        return;
      }
    }

    Swal.fire({
      title: "Generating PDF...",
      html: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    // Weekly snapshot
    if (effectiveType === "weekly") {
      const doc = new jsPDF("landscape", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 40;

      const logoSize = 40;
      if (bakeryInfo?.profile) {
        const logo = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = `${API_URL}/${normalizePath(
            bakeryInfo.profile
          )}?t=${Date.now()}`;
        });

        if (logo) {
          const canvas = document.createElement("canvas");
          canvas.width = logoSize;
          canvas.height = logoSize;
          const ctx = canvas.getContext("2d");
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
          doc.addImage(
            imgData,
            "PNG",
            pageWidth / 2 - logoSize / 2,
            currentY,
            logoSize,
            logoSize
          );
          currentY += logoSize + 5;
        }
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 14;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 10;
      doc.text(
        `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${
          bakeryInfo?.email || "N/A"
        }`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 18;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`WEEKLY REPORT`, pageWidth / 2, currentY, { align: "center" });
      currentY += 14;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated By: ${employeeName}`, pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 10;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated At: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 20;

      const summaryHeaders = [
        "Week Start",
        "Week End",
        "Total Direct Donations",
        "Total Request Donations",
        "Total Donations",
        "Expired Products",
      ];
      const summaryRow = [
        reportData.week_start || "",
        reportData.week_end || "",
        reportData.total_direct_donations || 0,
        reportData.total_request_donations || 0,
        reportData.total_donations || 0,
        reportData.expired_products || 0,
      ];

      autoTable(doc, {
        head: [summaryHeaders],
        body: [summaryRow],
        startY: currentY,
        styles: { fontSize: 8, halign: "center", valign: "middle" },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      currentY = doc.lastAutoTable.finalY + 25;

      currentY = doc.lastAutoTable.finalY + 20;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Top Donated Items", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      const topItemsHeaders = ["Product Name", "Quantity"];
      const topItemsRows = (reportData.top_items && reportData.top_items.length > 0)
        ? reportData.top_items.map(item => [item.product_name, item.quantity])
        : [["No top items for this week", ""]];

      autoTable(doc, {
        head: [topItemsHeaders],
        body: topItemsRows,
        startY: currentY,
        styles: { fontSize: 8, halign: "center", valign: "middle" },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      currentY = doc.lastAutoTable.finalY + 25;

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

          if (total > 0) {
            const midAngle = startAngle + slice / 2;
            const textX = center + Math.cos(midAngle) * radius * 0.6;
            const textY = center + Math.sin(midAngle) * radius * 0.6;
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.floor(size / 10)}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              `${Math.round((d.value / total) * 100)}%`,
              textX,
              textY
            );
          }

          startAngle += slice;
        });

        return canvas.toDataURL("image/png");
      };

      const pieStatusImg = drawSimplePie(
        [
          { name: "Available", value: reportData.available_products || 0 },
          { name: "Donated", value: reportData.total_donations || 0 },
          { name: "Expired", value: reportData.expired_products || 0 },
        ],
        ["#28a745", "#007bff", "#dc3545"],
        120
      );

      const pieTypeImg = drawSimplePie(
        [
          { name: "Direct", value: reportData.total_direct_donations || 0 },
          { name: "Request", value: reportData.total_request_donations || 0 },
        ],
        ["#4CAF50", "#2196F3"],
        120
      );

      const boxX = 40;
      const boxY = currentY;
      const boxWidth = 763;
      const boxHeight = 220;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(boxX, boxY, boxWidth, boxHeight);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Inventory Status", boxX + 180, boxY + 15, { align: "center" });
      doc.text("Donation Type", boxX + 540, boxY + 15, { align: "center" });

      doc.addImage(pieStatusImg, "PNG", boxX + 120, boxY + 25, 120, 120);
      doc.addImage(pieTypeImg, "PNG", boxX + 480, boxY + 25, 120, 120);

      const drawLegend = (startX, startY, labels) => {
        const boxSize = 8;
        const fontSize = 8;
        const gap = 5;

        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "normal");

        let totalWidth = 0;
        const itemWidths = labels.map((lbl) => {
          const w = boxSize + gap + doc.getTextWidth(lbl.text);
          totalWidth += w + 20;
          return w;
        });
        totalWidth -= 20;

        let x = startX - totalWidth / 2;

        labels.forEach((lbl, i) => {
          doc.setFillColor(lbl.color);
          doc.rect(x, startY, boxSize, boxSize, "F");

          doc.setTextColor(lbl.color);
          doc.text(lbl.text, x + boxSize + gap, startY + boxSize / 2 + 1, {
            baseline: "middle",
          });

          x += itemWidths[i] + 20;
        });

        doc.setTextColor(0);
      };

      const pie1CenterX = boxX + 180;
      const pie2CenterX = boxX + 550;

      drawLegend(pie1CenterX, boxY + 160, [
        { text: "Available", color: "#28a745" },
        { text: "Donated", color: "#007bff" },
        { text: "Expired", color: "#dc3545" },
      ]);

      drawLegend(pie2CenterX, boxY + 160, [
        { text: "Direct", color: "#4CAF50" },
        { text: "Request", color: "#2196F3" },
      ]);

      doc.save("Weekly_Report.pdf");
      Swal.close();
      return;
    }

    // Charity list pdf
    if (effectiveType === "charity_list") {
      const doc = new jsPDF("landscape", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 40;

      const logoSize = 40;
      if (bakeryInfo?.profile) {
        const logo = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = `${API_URL}/${normalizePath(
            bakeryInfo.profile
          )}?t=${Date.now()}`;
        });

        if (logo) {
          const canvas = document.createElement("canvas");
          canvas.width = logoSize;
          canvas.height = logoSize;
          const ctx = canvas.getContext("2d");

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
          doc.addImage(
            imgData,
            "PNG",
            pageWidth / 2 - logoSize / 2,
            currentY,
            logoSize,
            logoSize
          );
          currentY += logoSize + 5;
        }
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 14;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 10;
      doc.text(
        `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${
          bakeryInfo?.email || "N/A"
        }`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 18;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`CHARITY LIST REPORT`, pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 14;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated By: ${employeeName}`, pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 10;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated At: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        currentY,
        {
          align: "center",
        }
      );
      currentY += 20;

      const charities = reportData.charities || [];
      if (!charities.length) {
        Swal.close();
        alert("No charity data available.");
        return;
      }

      const tableHeaders = [
        "Profile",
        "Charity Name",
        "Direct Donations",
        "Requests",
        "Direct Qty",
        "Request Qty",
        "Received Qty",
        "Total Transactions",
      ];

      const IMG_SIZE = 36;
      const ROW_HEIGHT = 40;

      const toBase64 = (url) =>
        new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const SCALE = 3;
            const canvas = document.createElement("canvas");
            canvas.width = IMG_SIZE * SCALE;
            canvas.height = IMG_SIZE * SCALE;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("PNG"));
          };
          img.onerror = () => resolve(null);
          img.src = url + "?t=" + Date.now();
        });

      const charityProfiles = await Promise.all(
        charities.map((c) =>
          c.charity_profile
            ? toBase64(`${API_URL}/${normalizePath(c.charity_profile)}`)
            : null
        )
      );

      const tableBody = charities.map((c) => [
        c.charity_name,
        c.charity_name,
        c.direct_count,
        c.request_count,
        c.direct_qty,
        c.request_qty,
        c.total_received_qty,
        c.total_transactions,
      ]);

      autoTable(doc, {
        head: [tableHeaders],
        body: tableBody,
        startY: currentY,
        styles: {
          fontSize: 8,
          halign: "center",
          valign: "middle",
          cellPadding: 4,
        },
        columnStyles: {
          0: {
            cellWidth: IMG_SIZE + 4,
            halign: "center",
            valign: "middle",
            minCellHeight: ROW_HEIGHT,
          },
        },
        rowPageBreak: "auto",
        didDrawCell: (data) => {
          if (data.column.index === 0 && data.cell.section === "body") {
            const imgData = charityProfiles[data.row.index];
            if (imgData) {
              const x = data.cell.x + (data.cell.width - IMG_SIZE) / 2;
              const y = data.cell.y + (data.cell.height - IMG_SIZE) / 2;
              doc.addImage(imgData, "PNG", x, y, IMG_SIZE, IMG_SIZE);
            } else {
              const cx = data.cell.x + data.cell.width / 2;
              const cy = data.cell.y + data.cell.height / 2;
              const initials = (data.cell.raw || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase();
              doc.setFillColor(52, 152, 219);
              doc.circle(cx, cy, IMG_SIZE / 2, "F");
              doc.setTextColor(255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(16);
              doc.text(initials, cx, cy + 6, {
                align: "center",
                baseline: "middle",
              });
            }
          }
        },
      });

      currentY = doc.lastAutoTable.finalY + 10;

      const totals = reportData.grand_totals || {};
      autoTable(doc, {
        head: [["Total Type", "Value"]],
        body: [
          ["Total Direct Donations", totals.total_direct_count || 0],
          ["Total Requests", totals.total_request_count || 0],
          ["Total Direct Qty", totals.total_direct_qty || 0],
          ["Total Request Qty", totals.total_request_qty || 0],
          ["Total Received Qty", totals.total_received_qty || 0],
          ["Total Transactions", totals.total_transactions || 0],
        ],
        startY: currentY,
        styles: { fontSize: 8, halign: "center", valign: "middle" },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      doc.save("Charity_List_Report.pdf");
      Swal.close();
      return;
    }

    // Monthly snapshot
    if (effectiveType === "monthly") {
      const doc = new jsPDF("landscape", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 40;

      const logoSize = 40;
      if (bakeryInfo?.profile) {
        const logo = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = `${API_URL}/${normalizePath(
            bakeryInfo.profile
          )}?t=${Date.now()}`;
        });

        if (logo) {
          const canvas = document.createElement("canvas");
          canvas.width = logoSize;
          canvas.height = logoSize;
          const ctx = canvas.getContext("2d");
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
          doc.addImage(
            imgData,
            "PNG",
            pageWidth / 2 - logoSize / 2,
            currentY,
            logoSize,
            logoSize
          );
          currentY += logoSize + 5;
        }
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 14;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 10;
      doc.text(
        `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${
          bakeryInfo?.email || "N/A"
        }`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 18;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`MONTHLY REPORT`, pageWidth / 2, currentY, { align: "center" });
      currentY += 14;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated By: ${employeeName}`, pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 10;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated At: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        currentY,
        {
          align: "center",
        }
      );
      currentY += 20;

      const summaryHeaders = [
        "Month",
        "Total Direct Donations",
        "Total Request Donations",
        "Total Donations",
        "Expired Products",
      ];
      const summaryRow = [
        reportData.month || "",
        reportData.total_direct_donations || 0,
        reportData.total_request_donations || 0,
        reportData.total_donations || 0,
        reportData.expired_products || 0,
      ];

      autoTable(doc, {
        head: [summaryHeaders],
        body: [summaryRow],
        startY: currentY,
        styles: { fontSize: 8, halign: "center", valign: "middle" },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      currentY = doc.lastAutoTable.finalY + 25;

      currentY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Top Donated Items", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      const topItemsHeaders = ["Product Name", "Quantity"];
      const topItemsRows = (reportData.top_items && reportData.top_items.length > 0)
        ? reportData.top_items.map(item => [item.product_name, item.quantity])
        : [["No top items for this month", ""]];

      autoTable(doc, {
        head: [topItemsHeaders],
        body: topItemsRows,
        startY: currentY,
        styles: { fontSize: 8, halign: "center", valign: "middle" },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      currentY = doc.lastAutoTable.finalY + 25;

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

          if (total > 0) {
            const midAngle = startAngle + slice / 2;
            const textX = center + Math.cos(midAngle) * radius * 0.6;
            const textY = center + Math.sin(midAngle) * radius * 0.6;
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.floor(size / 10)}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              `${Math.round((d.value / total) * 100)}%`,
              textX,
              textY
            );
          }

          startAngle += slice;
        });

        return canvas.toDataURL("image/png");
      };

      const pieStatusImg = drawSimplePie(
        [
          { name: "Available", value: reportData.available_products || 0 },
          { name: "Donated", value: reportData.total_donations || 0 },
          { name: "Expired", value: reportData.expired_products || 0 },
        ],
        ["#28a745", "#007bff", "#dc3545"],
        120
      );

      const pieTypeImg = drawSimplePie(
        [
          { name: "Direct", value: reportData.total_direct_donations || 0 },
          { name: "Request", value: reportData.total_request_donations || 0 },
        ],
        ["#4CAF50", "#2196F3"],
        120
      );

      const boxX = 40;
      const boxY = currentY;
      const boxWidth = 763;
      const boxHeight = 220;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(boxX, boxY, boxWidth, boxHeight);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Inventory Status", boxX + 180, boxY + 15, { align: "center" });
      doc.text("Donation Type", boxX + 540, boxY + 15, { align: "center" });

      doc.addImage(pieStatusImg, "PNG", boxX + 120, boxY + 25, 120, 120);
      doc.addImage(pieTypeImg, "PNG", boxX + 480, boxY + 25, 120, 120);

      const drawLegend = (startX, startY, labels) => {
        const boxSize = 8;
        const fontSize = 8;
        const gap = 5;

        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "normal");

        let totalWidth = 0;
        const itemWidths = labels.map((lbl) => {
          const w = boxSize + gap + doc.getTextWidth(lbl.text);
          totalWidth += w + 20;
          return w;
        });
        totalWidth -= 20;

        let x = startX - totalWidth / 2;

        labels.forEach((lbl, i) => {
          doc.setFillColor(lbl.color);
          doc.rect(x, startY, boxSize, boxSize, "F");

          doc.setTextColor(lbl.color);
          doc.text(lbl.text, x + boxSize + gap, startY + boxSize / 2 + 1, {
            baseline: "middle",
          });

          x += itemWidths[i] + 20;
        });

        doc.setTextColor(0);
      };

      const pie1CenterX = boxX + 180;
      const pie2CenterX = boxX + 550;

      drawLegend(pie1CenterX, boxY + 160, [
        { text: "Available", color: "#28a745" },
        { text: "Donated", color: "#007bff" },
        { text: "Expired", color: "#dc3545" },
      ]);

      drawLegend(pie2CenterX, boxY + 160, [
        { text: "Direct", color: "#4CAF50" },
        { text: "Request", color: "#2196F3" },
      ]);

      doc.save("Monthly_Report.pdf");
      Swal.close();
      return;
    }

    // Generic table PDF for other reports
    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    const logoSize = 40;
    if (bakeryInfo?.profile) {
      const logo = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = `${API_URL}/${normalizePath(
          bakeryInfo.profile
        )}?t=${Date.now()}`;
      });

      if (logo) {
        const canvas = document.createElement("canvas");
        canvas.width = logoSize;
        canvas.height = logoSize;
        const ctx = canvas.getContext("2d");

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
        doc.addImage(
          imgData,
          "PNG",
          pageWidth / 2 - logoSize / 2,
          currentY,
          logoSize,
          logoSize
        );
        currentY += logoSize + 5;
      }
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(bakeryInfo?.name || "Bakery Name", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 14;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(bakeryInfo?.address || "", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 10;
    doc.text(
      `Contact: ${bakeryInfo?.contact_number || "N/A"} | Email: ${
        bakeryInfo?.email || "N/A"
      }`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 18;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${getEffectiveReportType().replace(/_/g, " ").toUpperCase()} REPORT`,
      pageWidth / 2,
      currentY,
      {
        align: "center",
      }
    );
    currentY += 14;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated By: ${employeeName}`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 10;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated At: ${new Date().toLocaleString()}`,
      pageWidth / 2,
      currentY,
      {
        align: "center",
      }
    );
    currentY += 20;

    const keys = Object.keys(reportData[0]);
    const imageColIndex = keys.findIndex((k) =>
      k.toLowerCase().includes("image")
    );
    const headers = keys.map((k, i) =>
      i === imageColIndex ? "IMAGE" : k.replace(/_/g, " ").toUpperCase()
    );

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
              const url = `${API_URL}/${normalizePath(
                row[keys[imageColIndex]]
              )}`;
              newRow[keys[imageColIndex]] = await toBase64(url);
            }
            return newRow;
          })
        );
        processedData = processedData.concat(batchData);
        Swal.getHtmlContainer().innerHTML = `Processing ${Math.min(
          i + BATCH_SIZE,
          reportData.length
        )} of ${reportData.length} rows...`;
        await new Promise((r) => setTimeout(r, 10));
      }
    } else {
      processedData = reportData;
    }

    const rows = processedData.map((row) =>
      keys.map((k) =>
        imageColIndex >= 0 && k === keys[imageColIndex] ? "" : row[k] ?? ""
      )
    );

    const IMG_SIZE = 45;

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: currentY,
      styles: { fontSize: 8, halign: "center", valign: "middle" },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
      },
      columnStyles:
        imageColIndex >= 0
          ? { [imageColIndex]: { cellWidth: 120, halign: "center" } }
          : {},
      didParseCell: (data) => {
        if (data.section === "body") {
          const hasImage =
            includeImages &&
            imageColIndex >= 0 &&
            processedData[data.row.index][keys[imageColIndex]];
          data.row.height = hasImage ? 50 : 20;
        }
      },
      didDrawCell: (data) => {
        if (
          includeImages &&
          imageColIndex >= 0 &&
          data.section === "body" &&
          data.column.index === imageColIndex
        ) {
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

    doc.save(`${getEffectiveReportType()}_report.pdf`);
    Swal.close();
  };

  const printReport = async (bakery) => {
    const effectiveType = getEffectiveReportType();
    if (!reportData) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const headerHTML = getBakeryHeaderHTML(bakery, effectiveType);
    const formatHeader = (h) => h.replace(/_/g, " ").toUpperCase();
    const normalizePath = (p) => p.replace(/\\/g, "/");

    let reportBodyHTML = "";

    if (effectiveType === "weekly") {
      const savedWeekStartLocal = reportData.week_start || "";
      const savedWeekEndLocal = reportData.week_end || "";

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
            <td>${savedWeekStartLocal}</td>
            <td>${savedWeekEndLocal}</td>
            <td>${reportData.total_direct_donations || 0}</td>
            <td>${reportData.total_request_donations || 0}</td>
            <td>${reportData.total_donations || 0}</td>
            <td>${reportData.expired_products || 0}</td>
          </tr>
        </tbody>
      </table>
    `;

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
              ? reportData.top_items
                  .map(
                    (item) =>
                      `<tr><td>${item.product_name}</td><td>${item.quantity}</td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="2">No top items for this week.</td></tr>`
          }
        </tbody>
      </table>
    `;

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
            const sliceAngle =
              total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(
              centerX,
              centerY,
              radius,
              startAngle,
              startAngle + sliceAngle
            );
            ctx.closePath();
            ctx.fill();

            const midAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(midAngle) * (radius * 0.6);
            const labelY = centerY + Math.sin(midAngle) * (radius * 0.6);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 25px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (d.value > 0)
              ctx.fillText(
                `${((d.value / total) * 100).toFixed(0)}%`,
                labelX,
                labelY
              );

            startAngle += sliceAngle;
          });

          resolve(canvas.toDataURL("image/png"));
        });

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
    } else if (effectiveType === "monthly") {
      const savedMonthLocal = reportData.month || "";

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
            <td>${savedMonthLocal}</td>
            <td>${reportData.total_direct_donations || 0}</td>
            <td>${reportData.total_request_donations || 0}</td>
            <td>${reportData.total_donations || 0}</td>
            <td>${reportData.expired_products || 0}</td>
          </tr>
        </tbody>
      </table>
    `;

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
            reportData.top_items && reportData.top_items.length
              ? reportData.top_items
                  .map(
                    (item) =>
                      `<tr><td>${item.product_name}</td><td>${item.quantity}</td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="2">No top items for this week.</td></tr>`
          }
        </tbody>
      </table>
    `;

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
            const sliceAngle =
              total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(
              centerX,
              centerY,
              radius,
              startAngle,
              startAngle + sliceAngle
            );
            ctx.closePath();
            ctx.fill();

            const midAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(midAngle) * (radius * 0.6);
            const labelY = centerY + Math.sin(midAngle) * (radius * 0.6);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 25px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (d.value > 0)
              ctx.fillText(
                `${((d.value / total) * 100).toFixed(0)}%`,
                labelX,
                labelY
              );

            startAngle += sliceAngle;
          });

          resolve(canvas.toDataURL("image/png"));
        });

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
    } else if (effectiveType === "charity_list") {
      const charities = reportData.charities || [];
    const totals = reportData.grand_totals || {};

    if (charities.length === 0) {
      reportBodyHTML = `<p>No charity data available.</p>`;
    } else {
      reportBodyHTML = `
        <h3>Charity List</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Charity Name</th>
              <th>Direct Donations</th>
              <th>Request Donations</th>
              <th>Direct Donation Qty</th>
              <th>Request Donation Qty</th>
              <th>Total Donated Qty</th>
              <th>Total Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${charities.map((c) => `
              <tr>
                <td>
                  ${c.charity_profile 
                    ? `<img src="${API_URL}/${normalizePath(c.charity_profile)}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />` 
                    : `<div style="width: 50px; height: 50px; border-radius: 50%; background-color: #3498db; color: white; display: flex; align-items: center; justify-content: center; margin: auto; font-weight: bold;">${c.charity_name.substring(0, 2).toUpperCase()}</div>`
                  }
                </td>
                <td>${c.charity_name}</td>
                <td>${c.direct_count || 0}</td>
                <td>${c.request_count || 0}</td>
                <td>${c.direct_qty || 0}</td>
                <td>${c.request_qty || 0}</td>
                <td>${c.total_received_qty || 0}</td>
                <td>${c.total_transactions || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h3 style="margin-top: 30px;">Grand Totals</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
          <thead>
            <tr>
              <th>Total Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Direct Donations</td>
              <td>${totals.total_direct_count || 0}</td>
            </tr>
            <tr>
              <td>Total Request Donations</td>
              <td>${totals.total_request_count || 0}</td>
            </tr>
            <tr>
              <td>Total Direct Qty</td>
              <td>${totals.total_direct_qty || 0}</td>
            </tr>
            <tr>
              <td>Total Request Qty</td>
              <td>${totals.total_request_qty || 0}</td>
            </tr>
            <tr>
              <td>Total Received Qty</td>
              <td>${totals.total_received_qty || 0}</td>
            </tr>
            <tr>
              <td><strong>Total Transactions</strong></td>
              <td><strong>${totals.total_transactions || 0}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    }
    } else {
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
    `;
    }

    const tableHTML = `
    <html>
      <head>
        <title>${getEffectiveReportType().toUpperCase()} Report</title>
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

  // Custom label renderer -> puts percentage inside slice
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
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
    if (!data) return <p className="text-gray-500">No data available</p>;

    // Charity list report
    if (data.charities && Array.isArray(data.charities)) {
      const charities = data.charities;
      const totals = data.grand_totals || {};

      if (charities.length === 0)
        return <p className="text-gray-500">No charities found</p>;

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-center">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2">Profile</th>
                <th className="px-4 py-2">Charity Name</th>
                <th className="px-4 py-2">Direct Donations</th>
                <th className="px-4 py-2">Requests Donations</th>
                <th className="px-4 py-2">Direct Donation Qty</th>
                <th className="px-4 py-2">Request Donation Qty</th>
                <th className="px-4 py-2">Total Donated Qty</th>
                <th className="px-4 py-2">Total Transactions</th>
              </tr>
            </thead>
            <tbody>
              {charities.map((c, i) => (
                <tr key={i} className="border-b border-gray-300">
                  <td className="px-4 py-2">
                    <img
                      src={
                        c.charity_profile
                          ? `${API_URL}/${c.charity_profile}`
                          : "/default_profile.png"
                      }
                      alt={c.charity_name}
                      className="w-14 h-14 rounded-full object-cover mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2 font-semibold">{c.charity_name}</td>
                  <td className="px-4 py-2">{c.direct_count}</td>
                  <td className="px-4 py-2">{c.request_count}</td>
                  <td className="px-4 py-2">{c.direct_qty}</td>
                  <td className="px-4 py-2">{c.request_qty}</td>
                  <td className="px-4 py-2 font-medium">
                    {c.total_received_qty}
                  </td>
                  <td className="px-4 py-2 font-bold text-gray-800">
                    {c.total_transactions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/*Grand Totals */}
          <div className="mt-4 border-t pt-3 text-right text-gray-800">
            <p>
              Total Transaction of Direct Donations: {totals.total_direct_count}
            </p>
            <p>
              Total Transaction of Requests Donations:{" "}
              {totals.total_request_count}
            </p>
            <p>
              Total Donated Qty (Direct Donations): {totals.total_direct_qty}
            </p>
            <p>
              Total donated qty (Request Donations): {totals.total_request_qty}
            </p>
            <p>Total Received Qty: {totals.total_received_qty}</p>
            <p className="font-bold text-lg">
              Total Transactions: {totals.total_transactions}
            </p>
          </div>
        </div>
      );
    }

    // Default fallback for other reports
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
    <div className="space-y-2 relative">
      <h1
        className="text-3xl sm:text-3xl font-extrabold"
        style={{ color: "#6B4B2B" }}
      >
        Report Generation
      </h1>

      {isViewOnly && (
        <div
          className="mb-4 p-3 rounded-lg border-2 flex items-start gap-2 text-sm"
          style={{
            background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)",
            borderColor: "#FFB74D",
            color: "#7a4f1c",
          }}
        >
          <span className="font-semibold">View-Only Mode:</span> Report
          generation and downloads are disabled for bakery account.
        </div>
      )}

      {/* Controlled Tabs */}
      <Tabs
        value={activeReport}
        onValueChange={(val) => {
          if (isViewOnly) return;
          setActiveReport(val);
          // IMPORTANT: Clear report data when switching tabs
          setReportData(null);
          // Also clear localStorage to prevent stale data
          localStorage.removeItem("lastReportData");
          
          // Reset all input values when switching tabs
          setWeekStart("");
          setWeekEnd("");
          setSelectedMonth("");
          setCustomStart("");
          setCustomEnd("");
          setDonationHistoryStart("");
          setDonationHistoryEnd("");
          setExpiryLossStart("");
          setExpiryLossEnd("");
          setTopItemsStart("");
          setTopItemsEnd("");
          setCharityListStart("");
          setCharityListEnd("");
          
          // For all tabs, wait for user to generate report
        }}
      >
        {/* Pills */}
        <TabsList className="flex flex-wrap gap-2 bg-white/70 ring-1 ring-black/5 rounded-full px-2 py-1 shadow-sm overflow-x-auto scrollbar-hide">
          {reportTypes.map((r) => {
            const Icon = r.icon;
            return (
              <TabsTrigger
                key={r.key}
                value={r.key}
                title={r.label}
                aria-label={r.label}
                className="data-[state=active]:text-white data-[state=active]:shadow
                   data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C]
                   data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327]
                   text-[#6b4b2b] rounded-full px-2 lg:px-3 py-1
                   hover:bg-amber-50 inline-flex items-center gap-1.5"
              >
                {Icon && <Icon className="w-4 h-4 lg:w-5 lg:h-5" />}
                <span className="hidden lg:inline">{r.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Donation History Tab */}
        <TabsContent value="donation_history">
          <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                Donation History Report
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={donationHistoryStart}
                      onChange={(e) => setDonationHistoryStart(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={donationHistoryEnd}
                      onChange={(e) => setDonationHistoryEnd(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <Button
                    onClick={handleDonationHistoryFilter}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                  >
                    Generate Report
                  </Button>
                </div>

              {loading ? (
                <p className="text-[#6b4b2b]/70">Generating report...</p>
              ) : reportData ? (
                <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
                  {renderTable(reportData)}
                </div>
              ) : (
                <p className="text-[#6b4b2b]/70">
                  Select date range and click Generate Report.
                </p>
              )}

              {!isViewOnly && reportData && (
                <div className="flex flex-wrap gap-3 mt-5">
                  <Button
                    onClick={downloadReportCSV}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download CSV
                  </Button>
                  <Button
                    onClick={() => downloadReportPDF(bakeryInfo)}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download PDF
                  </Button>
                  <Button
                    onClick={() => printReport(bakeryInfo)}
                    className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                  >
                    <Printer size={16} /> Print
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiry Loss Tab */}
        <TabsContent value="expiry_loss">
          <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                Expiry Loss Report
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={expiryLossStart}
                      onChange={(e) => setExpiryLossStart(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={expiryLossEnd}
                      onChange={(e) => setExpiryLossEnd(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <Button
                    onClick={handleExpiryLossFilter}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                  >
                    Generate Report
                  </Button>
                </div>
              
              {loading ? (
                <p className="text-[#6b4b2b]/70">Generating report...</p>
              ) : reportData ? (
                <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
                  {renderTable(reportData)}
                </div>
              ) : (
                <p className="text-[#6b4b2b]/70">
                  Select date range and click Generate Report.
                </p>
              )}

              {!isViewOnly && reportData && (
                <div className="flex flex-wrap gap-3 mt-5">
                  <Button
                    onClick={downloadReportCSV}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download CSV
                  </Button>
                  <Button
                    onClick={() => downloadReportPDF(bakeryInfo)}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download PDF
                  </Button>
                  <Button
                    onClick={() => printReport(bakeryInfo)}
                    className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                  >
                    <Printer size={16} /> Print
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Donated Items Tab */}
        <TabsContent value="top_items">
          <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                Top Donated Items Report
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={topItemsStart}
                      onChange={(e) => setTopItemsStart(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={topItemsEnd}
                      onChange={(e) => setTopItemsEnd(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <Button
                    onClick={handleTopItemsFilter}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                  >
                    Generate Report
                  </Button>
                </div>

              {loading ? (
                <p className="text-[#6b4b2b]/70">Generating report...</p>
              ) : reportData ? (
                <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
                  {renderTable(reportData)}
                </div>
              ) : (
                <p className="text-[#6b4b2b]/70">
                  Select date range and click Generate Report.
                </p>
              )}

              {!isViewOnly && reportData && (
                <div className="flex flex-wrap gap-3 mt-5">
                  <Button
                    onClick={downloadReportCSV}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download CSV
                  </Button>
                  <Button
                    onClick={() => downloadReportPDF(bakeryInfo)}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download PDF
                  </Button>
                  <Button
                    onClick={() => printReport(bakeryInfo)}
                    className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                  >
                    <Printer size={16} /> Print
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charity List Tab */}
        <TabsContent value="charity_list">
          <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                Charity List Report
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={charityListStart}
                      onChange={(e) => setCharityListStart(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={charityListEnd}
                      onChange={(e) => setCharityListEnd(e.target.value)}
                      max={getPhilippineDate()}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    />
                  </div>
                  <Button
                    onClick={handleCharityListFilter}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                  >
                    Generate Report
                  </Button>
                </div>
              
              {loading ? (
                <p className="text-[#6b4b2b]/70">Generating report...</p>
              ) : reportData ? (
                <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
                  {renderTable(reportData)}
                </div>
              ) : (
                <p className="text-[#6b4b2b]/70">
                  Select date range and click Generate Report.
                </p>
              )}

              {!isViewOnly && reportData && (
                <div className="flex flex-wrap gap-3 mt-5">
                  <Button
                    onClick={downloadReportCSV}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download CSV
                  </Button>
                  <Button
                    onClick={() => downloadReportPDF(bakeryInfo)}
                    className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                  >
                    <Download size={16} /> Download PDF
                  </Button>
                  <Button
                    onClick={() => printReport(bakeryInfo)}
                    className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                  >
                    <Printer size={16} /> Print
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary tab (unified period view) */}
        <TabsContent value="summary">
          <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
              <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                Period Summary Report
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {/* Unified Filters - Always show unless view-only */}
              
                <div className="mb-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#6b4b2b]">
                      Period Type
                    </label>
                    <select
                      value={activeSummary}
                      onChange={(e) => {
                        setActiveSummary(e.target.value);
                        // Clear filters when switching period type
                        setWeekStart("");
                        setWeekEnd("");
                        setSelectedMonth("");
                        setCustomStart("");
                        setCustomEnd("");
                        // Clear report data to prevent showing old data
                        setReportData(null);
                      }}
                      className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {activeSummary === "weekly" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#6b4b2b]">
                          Week Start
                        </label>
                        <input
                          type="date"
                          value={weekStart}
                          onChange={(e) => setWeekStart(e.target.value)}
                          max={getPhilippineDate()}
                          className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6b4b2b]">
                          Week End
                        </label>
                        <input
                          type="date"
                          value={weekEnd}
                          onChange={(e) => setWeekEnd(e.target.value)}
                          max={getPhilippineDate()}
                          className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                        />
                      </div>
                      <Button
                        onClick={handleWeeklyFilter}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                      >
                        Generate Report
                      </Button>
                    </>
                  ) : activeSummary === "monthly" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#6b4b2b]">
                          Select Month
                        </label>
                        <input
                          type="month"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          max={getPhilippineDate().slice(0, 7)}
                          className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                        />
                      </div>
                      <Button
                        onClick={handleMonthlyFilter}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                      >
                        Generate Report
                      </Button>
                    </>
                  ) : activeSummary === "custom" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#6b4b2b]">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          max={getPhilippineDate()}
                          className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6b4b2b]">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          max={getPhilippineDate()}
                          className="w-[220px] rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                        />
                      </div>
                      <Button
                        onClick={handleCustomFilter}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                      >
                        Generate Report
                      </Button>
                    </>
                  ) : null}
                </div>
              {loading ? (
                <p className="text-[#6b4b2b]/70">Generating report...</p>
              ) : reportData ? (
                <div>
                  
                  {/* Weekly Summary */}
                  {activeSummary === "weekly" && (
                    <>
                      <div className="max-h-96 overflow-y-auto rounded-xl ring-1 ring-black/10 bg-white/70 mb-6">
                        <table className="min-w-full text-center">
                          <thead className="bg-[#EADBC8] text-[#4A2F17]">
                            <tr>
                              {[
                                "Week Start",
                                "Week End",
                                "Total Direct Donations",
                                "Total Request Donations",
                                "Total Donations",
                                "Expired Products",
                              ].map((h) => (
                                <th key={h} className="px-4 py-2 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="odd:bg-white even:bg-white/60">
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.week_start || savedWeekStart}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.week_end || savedWeekEnd}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_direct_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_request_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.expired_products}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl ring-1 ring-black/10 bg-white/70 mb-6">
                        <h3 className="font-semibold text-[#6b4b2b] p-3">
                          Top Donated Items
                        </h3>
                        <table className="min-w-full text-center">
                          <thead className="bg-[#EADBC8] text-[#4A2F17]">
                            <tr>
                              <th className="px-4 py-2 font-semibold">
                                Product Name
                              </th>
                              <th className="px-4 py-2 font-semibold">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.top_items &&
                            reportData.top_items.length ? (
                              reportData.top_items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="odd:bg-white even:bg-white/60"
                                >
                                  <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                    {item.product_name}
                                  </td>
                                  <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="px-4 py-4 text-[#6b4b2b]/70 border-t border-[#f2d4b5]"
                                >
                                  No top items for this week.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-xl ring-1 ring-black/10 bg-white/80 shadow-md">
                          <CardHeader className="p-4 bg-[#FFF3E6]">
                            <CardTitle className="text-[#6b4b2b]">
                              Inventory Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Available",
                                      value: reportData.available_products || 0,
                                    },
                                    {
                                      name: "Donated",
                                      value: reportData.total_donations || 0,
                                    },
                                    {
                                      name: "Expired",
                                      value: reportData.expired_products || 0,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                  {["#28a745", "#007bff", "#dc3545"].map(
                                    (c, i) => (
                                      <Cell key={i} fill={c} />
                                    )
                                  )}
                                </Pie>
                                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className="rounded-xl ring-1 ring-black/10 bg-white/80 shadow-md">
                          <CardHeader className="p-4 bg-[#FFF3E6]">
                            <CardTitle className="text-[#6b4b2b]">
                              Donation Type
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Direct",
                                      value:
                                        reportData.total_direct_donations || 0,
                                    },
                                    {
                                      name: "Request",
                                      value:
                                        reportData.total_request_donations || 0,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                  {["#4CAF50", "#2196F3"].map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Monthly Summary */}
                  {activeSummary === "monthly" && (
                    <>
                      <div className="max-h-96 overflow-y-auto rounded-xl ring-1 ring-black/10 bg-white/70 mb-6">
                        <table className="min-w-full text-center">
                          <thead className="bg-[#EADBC8] text-[#4A2F17]">
                            <tr>
                              {[
                                "Month",
                                "Total Direct Donations",
                                "Total Request Donations",
                                "Total Donations",
                                "Expired Products",
                              ].map((h) => (
                                <th key={h} className="px-4 py-2 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="odd:bg-white even:bg-white/60">
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.month || savedMonth}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_direct_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_request_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.expired_products}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl ring-1 ring-black/10 bg-white/70 mb-6">
                        <h3 className="font-semibold text-[#6b4b2b] p-3">
                          Top Donated Items
                        </h3>
                        <table className="min-w-full text-center">
                          <thead className="bg-[#EADBC8] text-[#4A2F17]">
                            <tr>
                              <th className="px-4 py-2 font-semibold">
                                Product Name
                              </th>
                              <th className="px-4 py-2 font-semibold">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.top_items &&
                            reportData.top_items.length ? (
                              reportData.top_items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="odd:bg-white even:bg-white/60"
                                >
                                  <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                    {item.product_name}
                                  </td>
                                  <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="px-4 py-4 text-[#6b4b2b]/70 border-t border-[#f2d4b5]"
                                >
                                  No top items for this week.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-xl ring-1 ring-black/10 bg-white/80 shadow-md">
                          <CardHeader className="p-4 bg-[#FFF3E6]">
                            <CardTitle className="text-[#6b4b2b]">
                              Inventory Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Available",
                                      value: reportData.available_products || 0,
                                    },
                                    {
                                      name: "Donated",
                                      value: reportData.total_donations || 0,
                                    },
                                    {
                                      name: "Expired",
                                      value: reportData.expired_products || 0,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                  {["#28a745", "#007bff", "#dc3545"].map(
                                    (c, i) => (
                                      <Cell key={i} fill={c} />
                                    )
                                  )}
                                </Pie>
                                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className="rounded-xl ring-1 ring-black/10 bg-white/80 shadow-md">
                          <CardHeader className="p-4 bg-[#FFF3E6]">
                            <CardTitle className="text-[#6b4b2b]">
                              Donation Type
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Direct",
                                      value:
                                        reportData.total_direct_donations || 0,
                                    },
                                    {
                                      name: "Request",
                                      value:
                                        reportData.total_request_donations || 0,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                  {["#4CAF50", "#2196F3"].map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Custom Period Summary */}
                  {activeSummary === "custom" && (
                    <>
                      <div className="max-h-96 overflow-y-auto rounded-xl ring-1 ring-black/10 bg-white/70 mb-6">
                        <table className="min-w-full text-center">
                          <thead className="bg-[#EADBC8] text-[#4A2F17]">
                            <tr>
                              {[
                                "Start Date",
                                "End Date",
                                "Total Direct Donations",
                                "Total Request Donations",
                                "Total Donations",
                                "Expired Products",
                              ].map((h) => (
                                <th key={h} className="px-4 py-2 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="odd:bg-white even:bg-white/60">
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.start_date || savedCustomStart}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.end_date || savedCustomEnd}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_direct_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_request_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.total_donations}
                              </td>
                              <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                {reportData.expired_products}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl ring-1 ring-black/10 bg-white/70 mb-6">
                        <h3 className="font-semibold text-[#6b4b2b] p-3">
                          Top Donated Items
                        </h3>
                        <table className="min-w-full text-center">
                          <thead className="bg-[#EADBC8] text-[#4A2F17]">
                            <tr>
                              <th className="px-4 py-2 font-semibold">
                                Product Name
                              </th>
                              <th className="px-4 py-2 font-semibold">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.top_items &&
                            reportData.top_items.length ? (
                              reportData.top_items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="odd:bg-white even:bg-white/60"
                                >
                                  <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                    {item.product_name}
                                  </td>
                                  <td className="px-4 py-2 border-t border-[#f2d4b5]">
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="px-4 py-4 text-[#6b4b2b]/70 border-t border-[#f2d4b5]"
                                >
                                  No top items for this period.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-xl ring-1 ring-black/10 bg-white/80 shadow-md">
                          <CardHeader className="p-4 bg-[#FFF3E6]">
                            <CardTitle className="text-[#6b4b2b]">
                              Inventory Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Available",
                                      value: reportData.available_products || 0,
                                    },
                                    {
                                      name: "Donated",
                                      value: reportData.total_donations || 0,
                                    },
                                    {
                                      name: "Expired",
                                      value: reportData.expired_products || 0,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                  {["#28a745", "#007bff", "#dc3545"].map(
                                    (c, i) => (
                                      <Cell key={i} fill={c} />
                                    )
                                  )}
                                </Pie>
                                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className="rounded-xl ring-1 ring-black/10 bg-white/80 shadow-md">
                          <CardHeader className="p-4 bg-[#FFF3E6]">
                            <CardTitle className="text-[#6b4b2b]">
                              Donation Type
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Direct",
                                      value:
                                        reportData.total_direct_donations || 0,
                                    },
                                    {
                                      name: "Request",
                                      value:
                                        reportData.total_request_donations || 0,
                                    },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                  {["#4CAF50", "#2196F3"].map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                    <div className="flex flex-wrap gap-3 mt-5">
                      <Button
                        onClick={downloadReportCSV}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                      >
                        <Download size={16} /> Download CSV
                      </Button>
                      <Button
                        onClick={() => downloadReportPDF(bakeryInfo)}
                        className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                      >
                        <Download size={16} /> Download PDF
                      </Button>
                      <Button
                        onClick={() => printReport(bakeryInfo)}
                        className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                      >
                        <Printer size={16} /> Print
                      </Button>
                    </div>
                </div>
              ) : (
                <p className="text-[#6b4b2b]/70">
                  Select a period type and date range, then click "Generate
                  Report" to view the summary.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
