import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Download,
  Printer,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Filter,
  RefreshCw,
  Users,
  Gift,
  Package,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminReports() {
  const [reportData, setReportData] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState("manage_users");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // System Events specific state
  const [eventData, setEventData] = useState([]);
  const [eventSummary, setEventSummary] = useState(null);
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState("");
  const [donationData, setDonationData] = useState([]);
  const [donationSummary, setDonationSummary] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const normalizePath = (path) => path.replace(/\\/g, "/");

  // Report types
    const reportTypes = [
    { key: "manage_users", label: "Manage Users" },
    { key: "donation_list", label: "Donation List" }
  ];

  // Event type labels for display
  const eventTypeLabels = {
    failed_login: "Failed Login",
    unauthorized_access: "Unauthorized Access",
    sos_alert: "SOS Alert",
    geofence_breach: "Geofence Breach",
    uptime: "System Uptime",
    downtime: "System Downtime",
  };

  // Predefined event types
  const availableEventTypes = [
    "failed_login",
    "unauthorized_access",
    "sos_alert",
    "geofence_breach",
    "uptime",
    "downtime",
  ];

  // Severity colors
  const severityColors = {
    info: "bg-blue-100 text-blue-800 border-blue-300",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
    critical: "bg-red-100 text-red-800 border-red-300",
  };

  const getReportLabel = (key) => {
    const found = reportTypes.find((r) => r.key === key);
    return found ? found.label : key.replace(/_/g, " ");
  };

  // Generate report
  const generateReport = async (type) => {
    setLoading(true);
    setActiveReport(type);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/reports/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { start_date: startDate, end_date: endDate },
      });

      if (type === "donation_list") {
        setDonationData(res.data.donations || []);
        setDonationSummary(res.data.summary || null);
        setAdminProfile(res.data.admin_profile || null);
        if (res.data.donations.length === 0) {
          Swal.fire(
            "No Donations",
            `No donations found between ${startDate} to ${endDate}`,
            "info"
          );
        }
      } else {
        setReportData(res.data.users || []);
        setAdminProfile(res.data.admin_profile || null);
        if (res.data.users.length === 0) {
          Swal.fire(
            "No Users",
            `No users registered between ${startDate} to ${endDate}`,
            "info"
          );
        }
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

  // Admin header with profile picture
  const renderAdminHeader = () => {
  if (!adminProfile || !adminProfile.profile_picture) return null;

  return (
    <div style={{ textAlign: 'center', fontFamily: 'Arial, sans-serif', marginBottom: '30px' }}>
      <img
        src={`${API_URL}/${normalizePath(adminProfile.profile_picture)}`}
        alt="Admin Logo"
        style={{
          width: '120px',
          height: '120px',
          objectFit: 'cover',
          borderRadius: '50%',
          marginBottom: '15px',
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
      />
      <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#222' }}>
        DoughNation Admin
      </h1>
      <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>
        Malolos, Bulacan, Philippines
      </p>
      <p style={{ margin: '2px 0', fontSize: '14px', color: '#555' }}>
        Contact: +63 123 456 7890 | Email: admin@doughnation.com
      </p>
      <p style={{ margin: '20px 0 5px 0', fontSize: '20px', fontWeight: 'bold', color: '#000' }}>
        SYSTEM REPORTS
      </p>
      <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
        Generated: {new Date().toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}
      </p>
    </div>
  );
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

    // Base64 conversion function - MOVED TO TOP
    const toBase64 = (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          // Use original image dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        img.onerror = () => resolve(null);
        img.src = url + "?t=" + Date.now();
      });

    // Header - Admin Profile Picture
    if (adminProfile && adminProfile.profile_picture) {
      try {
        const adminImgUrl = `${API_URL}/${normalizePath(adminProfile.profile_picture)}`;
        const adminImgBase64 = await toBase64(adminImgUrl);
        
        if (adminImgBase64) {
          const logoSize = 120;
          const imgX = (pageWidth - logoSize) / 2;
          doc.addImage(adminImgBase64, "JPEG", imgX, currentY, logoSize, logoSize);
          currentY += logoSize + 15;
        }
      } catch (err) {
        console.error("Failed to load admin profile picture:", err);
      }
    }

    // Admin Name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 34, 34);
    doc.text("Scholars of Sustenance (SOS) | A Global Food Rescue Foundation", pageWidth / 2, currentY, { align: "center" });
    currentY += 18;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    doc.text("SOS Philippines", pageWidth / 2, currentY, { align: "center" });
    currentY += 12;


    // Address
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    doc.text("SOS Philippines 72 Maayusin Street, Up Village, Diliman, Quezon City Philippines 1101", pageWidth / 2, currentY, { align: "center" });
    currentY += 12;

    // Contact Info
    doc.text("Contact: +63 917 866 7728 | Email: sosph@scholarsofsustenance.org", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    // Report Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(
      `${getReportLabel(activeReport).toUpperCase()} REPORT`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 18;

    // Generated Date
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(136, 136, 136);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}`,
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

    // Batch processing
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

    const adminImageHTML = adminProfile && adminProfile.profile_picture 
      ? `<div style="text-align: center; font-family: Arial, sans-serif; margin-bottom: 30px;">
          <img src="${API_URL}/${normalizePath(adminProfile.profile_picture)}" 
                style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; margin-bottom: 15px; display: block; margin: 0 auto;" />
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #222;">Scholars of Sustenance (SOS) | A Global Food Rescue Foundation</h1>
          <p style="margin: 5px 0; font-size: 14px; color: #555;">SOS Philippines <br> 72 Maayusin Street, Up Village, Diliman, Quezon City Philippines 1101</p>
          <p style="margin: 2px 0; font-size: 14px; color: #555;">Contact: +63 917 866 7728 | Email: sosph@scholarsofsustenance.org</p>
          <p style="margin: 20px 0 5px 0; font-size: 20px; font-weight: bold; color: #000;">
            ${getReportLabel(activeReport).toUpperCase()} REPORT
          </p>
          <p style="margin: 0; font-size: 12px; color: #888;">
            Generated: ${new Date().toLocaleString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>`
      : '';

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
      ${adminImageHTML}
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


  // Download Donation CSV
  const downloadDonationCSV = () => {
      if (!donationData || donationData.length === 0) return;

      // Group donations by donor-receiver pair
      const groupedData = donationData.reduce((acc, donation) => {
        const key = `${donation.donor_name}|${donation.receiver_name}`;
        
        if (!acc[key]) {
          acc[key] = {
            donor_name: donation.donor_name,
            receiver_name: donation.receiver_name,
            total_quantity: 0,
            request_count: 0,
            direct_count: 0,
            request_quantity: 0,
            direct_quantity: 0,
            latest_date: donation.timestamp
          };
        }
        
        acc[key].total_quantity += donation.quantity;
        
        if (donation.type === "Request") {
          acc[key].request_count += 1;
          acc[key].request_quantity += donation.quantity;
        } else {
          acc[key].direct_count += 1;
          acc[key].direct_quantity += donation.quantity;
        }
        
        if (new Date(donation.timestamp) > new Date(acc[key].latest_date)) {
          acc[key].latest_date = donation.timestamp;
        }
        
        return acc;
      }, {});

      const groupedArray = Object.values(groupedData);

      const headers = [
        "Donor Name",
        "Receiver Name",
        "Total Quantity",
        "Request Count",
        "Request Quantity",
        "Direct Count",
        "Direct Quantity",
        "Latest Date"
      ];

      const rows = groupedArray.map((group) => [
        `"${group.donor_name}"`,
        `"${group.receiver_name}"`,
        `"${group.total_quantity}"`,
        `"${group.request_count}"`,
        `"${group.request_quantity}"`,
        `"${group.direct_count}"`,
        `"${group.direct_quantity}"`,
        `"${group.latest_date ? new Date(group.latest_date).toLocaleDateString() : 'N/A'}"`
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Donation_List_Report_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

  // Download Donation PDF
  const downloadDonationPDF = async () => {
    if (!donationData || donationData.length === 0) {
      Swal.fire("No data", "Nothing to export", "info");
      return;
    }

    // Group donations by donor-receiver pair
    const groupedData = donationData.reduce((acc, donation) => {
      const key = `${donation.donor_name}|${donation.receiver_name}`;
      
      if (!acc[key]) {
        acc[key] = {
          donor_name: donation.donor_name,
          receiver_name: donation.receiver_name,
          total_quantity: 0,
          request_count: 0,
          direct_count: 0,
          request_quantity: 0,
          direct_quantity: 0,
          latest_date: donation.timestamp
        };
      }
      
      acc[key].total_quantity += donation.quantity;
      
      if (donation.type === "Request") {
        acc[key].request_count += 1;
        acc[key].request_quantity += donation.quantity;
      } else {
        acc[key].direct_count += 1;
        acc[key].direct_quantity += donation.quantity;
      }
      
      if (new Date(donation.timestamp) > new Date(acc[key].latest_date)) {
        acc[key].latest_date = donation.timestamp;
      }
      
      return acc;
    }, {});

    const groupedArray = Object.values(groupedData);

    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    // Base64 conversion function
    const toBase64 = (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        img.onerror = () => resolve(null);
        img.src = url + "?t=" + Date.now();
      });

    // Header - Admin Profile Picture
    if (adminProfile && adminProfile.profile_picture) {
      try {
        const adminImgUrl = `${API_URL}/${normalizePath(adminProfile.profile_picture)}`;
        const adminImgBase64 = await toBase64(adminImgUrl);
        
        if (adminImgBase64) {
          const logoSize = 120;
          const imgX = (pageWidth - logoSize) / 2;
          doc.addImage(adminImgBase64, "JPEG", imgX, currentY, logoSize, logoSize);
          currentY += logoSize + 15;
        }
      } catch (err) {
        console.error("Failed to load admin profile picture:", err);
      }
    }

    // Admin Name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 34, 34);
    doc.text("Scholars of Sustenance (SOS) | A Global Food Rescue Foundation", pageWidth / 2, currentY, { align: "center" });
    currentY += 18;

   
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    doc.text("SOS Philippines", pageWidth / 2, currentY, { align: "center" });
    currentY += 12;

    // Address
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    doc.text("72 Maayusin Street, Up Village, Diliman, Quezon City Philippines 1101", pageWidth / 2, currentY, { align: "center" });
    currentY += 12;

    // Contact Info
    doc.text("Contact: +63 917 866 7728 | Email: sosph@scholarsofsustenance.org", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    // Report Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(
      `${getReportLabel(activeReport).toUpperCase()} REPORT`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 18;

    // Generated Date
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(136, 136, 136);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 25;

    // Summary stats
    if (donationSummary) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Statistics:", 40, currentY);
      currentY += 15;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Donations: ${donationSummary.total_donations}`, 40, currentY);
    currentY += 12;
    doc.text(`Total Quantity: ${donationSummary.total_quantity}`, 40, currentY);
    currentY += 12;
    doc.text(`Request Donations: ${donationSummary.request_count} (${donationSummary.request_quantity} items)`, 40, currentY);
    currentY += 12;
    doc.text(`Direct Donations: ${donationSummary.direct_count} (${donationSummary.direct_quantity} items)`, 40, currentY);
    currentY += 20;
    }

    // Table
    const headers = ["Donor", "Receiver", "Total Qty", "Request Count", "Request Qty", "Direct Count", "Direct Qty", "Latest Date"];
    const rows = groupedArray.map((group) => [
      group.donor_name,
      group.receiver_name,
      group.total_quantity,
      group.request_count,
      group.request_quantity,
      group.direct_count,
      group.direct_quantity,
      group.latest_date ? new Date(group.latest_date).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: currentY,
      styles: { fontSize: 8, valign: "middle" },
      headStyles: {
        fillColor: [185, 115, 39],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`Donation_List_Report_${startDate}_to_${endDate}.pdf`);
  };

  // Print Donation Report
  const printDonationReport = () => {
    if (!donationData || donationData.length === 0) return;

    const adminImageHTML = adminProfile && adminProfile.profile_picture 
      ? `<div style="text-align: center; font-family: Arial, sans-serif; margin-bottom: 30px;">
          <img src="${API_URL}/${normalizePath(adminProfile.profile_picture)}" 
                style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; margin-bottom: 15px; display: block; margin: 0 auto;" />
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #222;">Scholars of Sustenance (SOS) | A Global Food Rescue Foundation</h1>
          <p style="margin: 5px 0; font-size: 14px; color: #555;">SOS Philippines <br> 72 Maayusin Street, Up Village, Diliman, Quezon City Philippines 1101</p>
          <p style="margin: 2px 0; font-size: 14px; color: #555;">Contact: +63 917 866 7728 | Email: sosph@scholarsofsustenance.org</p>
          <p style="margin: 20px 0 5px 0; font-size: 20px; font-weight: bold; color: #000;">
            ${getReportLabel(activeReport).toUpperCase()} REPORT
          </p>
          <p style="margin: 0; font-size: 12px; color: #888;">
            Generated: ${new Date().toLocaleString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>`
      : '';

    const summaryHTML = donationSummary ? `
      <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
        <h3>Summary Statistics</h3>
        <p><strong>Total Donations:</strong> ${donationSummary.total_donations}</p>
        <p><strong>Total Quantity:</strong> ${donationSummary.total_quantity}</p>
        <p><strong>Request Donations:</strong> ${donationSummary.request_count} (${donationSummary.request_quantity} items)</p>
        <p><strong>Direct Donations:</strong> ${donationSummary.direct_count} (${donationSummary.direct_quantity} items)</p>
      </div>
    ` : '';

    const tableHTML = `
      <html>
        <head>
          <title>DONATION LIST REPORT</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; color: #6b4b2b; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #B97327; color: white; }
            .request { background-color: #dbeafe; }
            .direct { background-color: #dcfce7; }
          </style>
        </head>
        <body>
          ${adminImageHTML}
          ${summaryHTML}
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Receiver</th>
                <th>Total Quantity</th>
                <th>Request Count</th>
                <th>Request Qty</th>
                <th>Direct Count</th>
                <th>Direct Qty</th>
                <th>Completion Date</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                // Group donations
                const groupedData = donationData.reduce((acc, donation) => {
                  const key = `${donation.donor_name}|${donation.receiver_name}`;
                  
                  if (!acc[key]) {
                    acc[key] = {
                      donor_name: donation.donor_name,
                      receiver_name: donation.receiver_name,
                      total_quantity: 0,
                      request_count: 0,
                      direct_count: 0,
                      request_quantity: 0,
                      direct_quantity: 0,
                      latest_date: donation.timestamp
                    };
                  }
                  
                  acc[key].total_quantity += donation.quantity;
                  
                  if (donation.type === "Request") {
                    acc[key].request_count += 1;
                    acc[key].request_quantity += donation.quantity;
                  } else {
                    acc[key].direct_count += 1;
                    acc[key].direct_quantity += donation.quantity;
                  }
                  
                  if (new Date(donation.timestamp) > new Date(acc[key].latest_date)) {
                    acc[key].latest_date = donation.timestamp;
                  }
                  
                  return acc;
                }, {});
                
                return Object.values(groupedData).map((group) => `
                  <tr>
                    <td>${group.donor_name}</td>
                    <td>${group.receiver_name}</td>
                    <td style="font-weight: bold;">${group.total_quantity}</td>
                    <td>${group.request_count}</td>
                    <td>${group.request_quantity}</td>
                    <td>${group.direct_count}</td>
                    <td>${group.direct_quantity}</td>
                    <td>${group.latest_date ? new Date(group.latest_date).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                `).join("");
              })()}
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

  // ========== SYSTEM EVENTS FUNCTIONS ==========

  // Fetch system events
  const fetchSystemEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {
        start_date: startDate,
        end_date: endDate,
        limit: 1000,
      };

      if (eventType) params.event_type = eventType;
      if (severity) params.severity = severity;

      const res = await axios.get(`${API_URL}/superadmin/events`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setEventData(res.data.events || []);

      if (res.data.events.length === 0) {
        Swal.fire(
          "No Events",
          `No system events found between ${startDate} to ${endDate}`,
          "info"
        );
      }

      // Also fetch summary
      await fetchEventSummary();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.detail || "Failed to fetch events.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch event summary
  const fetchEventSummary = async () => {
    if (!startDate || !endDate) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/superadmin/events/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { start_date: startDate, endDate: endDate },
      });

      setEventSummary(res.data);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  // Download System Events CSV
  const downloadEventsCSV = () => {
    if (!eventData || eventData.length === 0) return;

    const headers = [
      "Event ID",
      "Event Type",
      "Description",
      "Severity",
      "Timestamp",
      "User ID",
      "User Name",
      "User Email",
      "User Role",
    ];

    const rows = eventData.map((event) => {
      const date = new Date(event.timestamp);
      date.setHours(date.getHours() + 8);
      const formattedDate = date.toLocaleString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      return [
        `"${event.id}"`,
        `"${event.event_type}"`,
        `"${event.description}"`,
        `"${event.severity}"`,
        `"${formattedDate}"`,
        `"${event.user?.id || "N/A"}"`,
        `"${event.user?.name || "N/A"}"`,
        `"${event.user?.email || "N/A"}"`,
        `"${event.user?.role || "N/A"}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `System_Events_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download System Events PDF
  const downloadEventsPDF = () => {
    if (!eventData || eventData.length === 0) {
      Swal.fire("No data", "Nothing to export", "info");
      return;
    }

    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("SYSTEM EVENTS & ALERTS REPORT", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 20;

    // Date range
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${startDate} to ${endDate}`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 25;

    // Summary stats if available
    if (eventSummary) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Statistics:", 40, currentY);
      currentY += 15;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Events: ${eventSummary.total_events}`, 40, currentY);
      currentY += 12;

      const sevCounts = eventSummary.severities || {};
      doc.text(
        `Critical: ${sevCounts.critical || 0} | Warning: ${
          sevCounts.warning || 0
        } | Info: ${sevCounts.info || 0}`,
        40,
        currentY
      );
      currentY += 20;
    }

    // Table
    const headers = [
      "ID",
      "Event Type",
      "Description",
      "Severity",
      "Timestamp",
      "User",
      "Role",
    ];

    const rows = eventData.map((event) => {
      const date = new Date(event.timestamp);
      date.setHours(date.getHours() + 8);
      const formattedDate = date.toLocaleString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      return [
        event.id,
        event.event_type,
        event.description.substring(0, 50) +
          (event.description.length > 50 ? "..." : ""),
        event.severity,
        formattedDate,
        event.user?.name || "System",
        event.user?.role || "N/A",
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: currentY,
      styles: { fontSize: 8, valign: "middle" },
      headStyles: {
        fillColor: [185, 115, 39],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`System_Events_Report_${startDate}_to_${endDate}.pdf`);
  };

  // Print System Events
  const printEvents = () => {
    if (!eventData || eventData.length === 0) return;

    const tableHTML = `
      <html>
        <head>
          <title>SYSTEM EVENTS & ALERTS REPORT</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; color: #6b4b2b; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
            }
            th { background-color: #B97327; color: white; }
            .critical { background-color: #fee; }
            .warning { background-color: #ffc; }
            .info { background-color: #eff; }
          </style>
        </head>
        <body>
          <h2>System Events & Alerts Report</h2>
          <p style="text-align: center;">Period: ${startDate} to ${endDate}</p>
          
          ${
            eventSummary
              ? `
            <div class="summary">
              <h3>Summary Statistics</h3>
              <p><strong>Total Events:</strong> ${eventSummary.total_events}</p>
              <p>
                <strong>By Severity:</strong> 
                Critical: ${eventSummary.severities?.critical || 0} | 
                Warning: ${eventSummary.severities?.warning || 0} | 
                Info: ${eventSummary.severities?.info || 0}
              </p>
            </div>
          `
              : ""
          }
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Event Type</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              ${eventData
                .map(
                  (event) => `
                <tr class="${event.severity}">
                  <td>${event.id}</td>
                  <td>${
                    eventTypeLabels[event.event_type] || event.event_type
                  }</td>
                  <td>${event.description}</td>
                  <td>${event.severity.toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap"> 
                  ${(() => {
                    const date = new Date(event.timestamp);
                    date.setHours(date.getHours() + 8);
                    return date.toLocaleString("en-PH", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    });
                  })()}
                </td>
                  <td>${event.user?.name || "System"}</td>
                  <td>${event.user?.role || "N/A"}</td>
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

  // Render system events table
  const renderEventsTable = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <p className="text-[#6b4b2b]/70 text-center py-8">
          No events available
        </p>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-[#B97327] to-[#E49A52] text-white">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">ID</th>
              <th className="px-4 py-3 text-left font-semibold">Event Type</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
              <th className="px-4 py-3 text-center font-semibold">Severity</th>
              <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
              <th className="px-4 py-3 text-left font-semibold">User</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr
                key={event.id}
                className="odd:bg-white even:bg-white/60 border-b border-[#f2d4b5] hover:bg-amber-50/50 transition-colors"
              >
                <td className="px-4 py-3">{event.id}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-[#6b4b2b]">
                    {eventTypeLabels[event.event_type] || event.event_type}
                  </span>
                </td>
                <td
                  className="px-4 py-3 max-w-md truncate"
                  title={event.description}
                >
                  {event.description}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                      severityColors[event.severity]
                    }`}
                  >
                    {event.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {(() => {
                    const date = new Date(event.timestamp);
                    date.setHours(date.getHours() + 8);
                    return date.toLocaleString("en-PH", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    });
                  })()}
                </td>
                <td className="px-4 py-3">{event.user?.name || "System"}</td>
                <td className="px-4 py-3">{event.user?.role || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render summary cards
  const renderSummaryCards = () => {
    if (!eventSummary) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Events */}
        <Card className="rounded-xl shadow-md ring-1 ring-black/5 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">
                  Total Events
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {eventSummary.total_events}
                </p>
              </div>
              <Activity className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Critical Events */}
        <Card className="rounded-xl shadow-md ring-1 ring-black/5 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">
                  Critical Events
                </p>
                <p className="text-3xl font-bold text-red-900">
                  {eventSummary.severities?.critical || 0}
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Warning Events */}
        <Card className="rounded-xl shadow-md ring-1 ring-black/5 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">
                  Warning Events
                </p>
                <p className="text-3xl font-bold text-yellow-900">
                  {eventSummary.severities?.warning || 0}
                </p>
              </div>
              <ShieldAlert className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render donations table 
  const renderDonationsTable = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <p className="text-[#6b4b2b]/70 text-center py-8">
          No donations available
        </p>
      );
    }

    // Group donations by donor-receiver pair
    const groupedData = data.reduce((acc, donation) => {
      const key = `${donation.donor_name}|${donation.receiver_name}`;
      
      if (!acc[key]) {
        acc[key] = {
          donor_name: donation.donor_name,
          receiver_name: donation.receiver_name,
          total_quantity: 0,
          request_count: 0,
          direct_count: 0,
          request_quantity: 0,
          direct_quantity: 0,
          latest_date: donation.timestamp
        };
      }
      
      acc[key].total_quantity += donation.quantity;
      
      if (donation.type === "Request") {
        acc[key].request_count += 1;
        acc[key].request_quantity += donation.quantity;
      } else {
        acc[key].direct_count += 1;
        acc[key].direct_quantity += donation.quantity;
      }
      
      // Keep the latest date
      if (new Date(donation.timestamp) > new Date(acc[key].latest_date)) {
        acc[key].latest_date = donation.timestamp;
      }
      
      return acc;
    }, {});

    const groupedArray = Object.values(groupedData);

    return (
      <div className="overflow-x-auto rounded-xl ring-1 ring-black/10 bg-white/70">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-[#B97327] to-[#E49A52] text-white">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Donor</th>
              <th className="px-4 py-3 text-left font-semibold">Receiver</th>
              <th className="px-4 py-3 text-center font-semibold">Total Quantity</th>
              <th className="px-4 py-3 text-center font-semibold">Request Count</th>
              <th className="px-4 py-3 text-center font-semibold">Direct Count</th>
              <th className="px-4 py-3 text-left font-semibold">Completion Date</th>
            </tr>
          </thead>
          <tbody>
            {groupedArray.map((group, idx) => (
              <tr
                key={idx}
                className="odd:bg-white even:bg-white/60 border-b border-[#f2d4b5] hover:bg-amber-50/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{group.donor_name}</td>
                <td className="px-4 py-3 font-medium">{group.receiver_name}</td>
                <td className="px-4 py-3 text-center font-bold text-[#6b4b2b]">
                  {group.total_quantity}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {group.request_count} transactions
                    </span>
                    <span className="text-xs text-[#6b4b2b]/70">
                      ({group.request_quantity} items)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      {group.direct_count} transactions
                    </span>
                    <span className="text-xs text-[#6b4b2b]/70">
                      ({group.direct_quantity} items)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {group.latest_date 
                    ? new Date(group.latest_date).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) 
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Table renderer (for Manage Users)
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

              {/* Address column - UI tweak */}
              <th className="px-4 py-2 font-semibold text-left min-w-[220px]">
                Address
              </th>

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

                {/* Address cell - UI tweak (buong address visible pa rin) */}
                <td
                  className="px-4 py-2 text-left align-top text-[13px] leading-snug min-w-[220px] max-w-[320px]"
                  title={row.address}
                >
                  {row.address}
                </td>

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
    <div className="space-y-6">
      <div className="p-2 pt-4 sm:p-4 md:p-6">
        <div>
          <h2 className="text-3xl font-extrabold text-[#6b4b2b]">
            Report Generation
          </h2>
          <p className="mt-1 text-sm text-[#7b5836]">
            Generate reports from user records
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br overflow-hidden">
          <Tabs
            value={activeReport}
            onValueChange={(val) => setActiveReport(val)}
          >
            <TabsList className="flex flex-wrap gap-2 bg-white/70 ring-1 ring-black/5 rounded-full px-2 py-1 shadow-sm">
               {reportTypes.map((r) => (
                <TabsTrigger
                  key={r.key}
                  value={r.key}
                  className="data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F6C17C] data-[state=active]:via-[#E49A52] data-[state=active]:to-[#BF7327] text-[#6b4b2b] rounded-full px-3 py-1 text-sm hover:bg-amber-50"
                >
                  {r.key === "manage_users" ? (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">{r.label}</span>
                    </span>
                  ) : r.key === "donation_list" ? (
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      <span className="hidden sm:inline">{r.label}</span>
                    </span>
                  ) : (
                    r.label
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {reportTypes.map((r) => (
              <TabsContent key={r.key} value={r.key}>
                {r.key === "donation_list" ? (
                  /* Donation List Tab */
                  <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
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
                          onClick={() => generateReport("donation_list")}
                          disabled={loading}
                          className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95"
                        >
                          Generate Report
                        </Button>
                      </div>

                      {loading ? (
                        <p className="text-[#6b4b2b]/70">Generating report...</p>
                      ) : donationData && donationData.length > 0 ? (
                        <div>
                          {renderDonationsTable(donationData)}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-3 mt-5">
                            <Button
                              onClick={downloadDonationCSV}
                              className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                            >
                              <Download size={16} /> Download CSV
                            </Button>

                            <Button
                              onClick={downloadDonationPDF}
                              className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                            >
                              <Download size={16} /> Download PDF
                            </Button>

                            <Button
                              onClick={printDonationReport}
                              className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                            >
                              <Printer size={16} /> Print
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[#6b4b2b]/70">
                          Select a date range and click Generate Report to view Donation List.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  
                  ) : r.key === "system_events" ? (
                  /* System Events Tab */
                  <>
                    {/* Filter Section */}
                    <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden mb-6">
                      <CardContent className="p-5 sm:p-6">
                         {/* Admin Header */}
                         {renderAdminHeader()}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          {/* Start Date */}
                          <div>
                            <label className="block text-sm font-medium text-[#6b4b2b] mb-1">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              max={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                            />
                          </div>

                          {/* End Date */}
                          <div>
                            <label className="block text-sm font-medium text-[#6b4b2b] mb-1">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={endDate}
                              max={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                            />
                          </div>

                          {/* Event Type */}
                          <div>
                            <label className="block text-sm font-medium text-[#6b4b2b] mb-1">
                              Event Type
                            </label>
                            <select
                              value={eventType}
                              onChange={(e) => setEventType(e.target.value)}
                              className="w-full rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                            >
                              <option value="">All Types</option>
                              {availableEventTypes.map((type) => (
                                <option key={type} value={type}>
                                  {eventTypeLabels[type] || type}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Severity */}
                          <div>
                            <label className="block text-sm font-medium text-[#6b4b2b] mb-1">
                              Severity
                            </label>
                            <select
                              value={severity}
                              onChange={(e) => setSeverity(e.target.value)}
                              className="w-full rounded-md border border-[#f2d4b5] bg-white/95 px-3 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-[#E49A52] focus:border-[#E49A52]"
                            >
                              <option value="">All Severities</option>
                              <option value="info">Info</option>
                              <option value="warning">Warning</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                        </div>

                        <Button
                          onClick={fetchSystemEvents}
                          disabled={loading}
                          className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-6 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 disabled:opacity-50 flex items-center gap-2"
                        >
                          {loading ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={16} />
                              Generate Report
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Summary Statistics */}
                    {renderSummaryCards()}

                    {/* Events Table */}
                    {loading ? (
                      <Card className="rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80">
                        <CardContent className="p-8 text-center">
                          <RefreshCw className="animate-spin h-8 w-8 mx-auto text-[#E49A52] mb-2" />
                          <p className="text-[#6b4b2b]/70">Loading events...</p>
                        </CardContent>
                      </Card>
                    ) : eventData.length > 0 ? (
                      <Card className="rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
                          <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                            System Events ({eventData.length} records)
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="p-5 sm:p-6">
                          {renderEventsTable(eventData)}

                          {/* Export Actions */}
                          <div className="flex flex-wrap gap-3 mt-6">
                            <Button
                              onClick={downloadEventsCSV}
                              className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                            >
                              <Download size={16} /> Download CSV
                            </Button>

                            <Button
                              onClick={downloadEventsPDF}
                              className="rounded-full bg-gradient-to-r from-[#F6C17C] via-[#E49A52] to-[#BF7327] text-white px-5 py-2 shadow-md ring-1 ring-white/60 hover:brightness-95 flex items-center gap-2"
                            >
                              <Download size={16} /> Download PDF
                            </Button>

                            <Button
                              onClick={printEvents}
                              className="rounded-full bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 shadow-md flex items-center gap-2"
                            >
                              <Printer size={16} /> Print
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80">
                        <CardContent className="p-8 text-center">
                          <ShieldAlert className="h-12 w-12 mx-auto text-[#6b4b2b]/30 mb-3" />
                          <p className="text-[#6b4b2b]/70">
                            Select filters and click Generate Report to view
                            system events.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  /* Manage Users Tab */
                  <Card className="mt-5 rounded-2xl shadow-lg ring-1 ring-black/10 bg-white/80 backdrop-blur-sm overflow-hidden">
                    {/* <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF3E6] via-[#FFE1BD] to-[#FFD199]">
                    <CardTitle className="text-lg font-semibold text-[#6b4b2b]">
                      {r.label} Report
                    </CardTitle>
                  </CardHeader> */}

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
                        <p className="text-[#6b4b2b]/70">
                          Generating report...
                        </p>
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
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
} 