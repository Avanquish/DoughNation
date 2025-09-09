import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Printer,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import Swal from "sweetalert2";

// Charts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

// Helpers
const parseDate = (s) => (s ? new Date(s) : null);
const daysUntil = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};
const statusOf = (item) => {
  const d = daysUntil(item.expiration_date);
  if (d === null) return "fresh";
  if (d < 0) return "expired";
  if (d <= (Number(item.threshold) || 0)) return "soon";
  return "fresh";
};
const formatDate = (s) => {
  const d = parseDate(s);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
const toCSV = (rows, headers) => {
  const head = headers.map((h) => '"' + (h.label ?? h.key) + '"').join(",");
  const body = rows
    .map((r) =>
      headers
        .map((h) => {
          const v = r[h.key];
          return '"' + (v ?? "").toString().replaceAll('"', '""') + '"';
        })
        .join(",")
    )
    .join("\n");
  return head + "\n" + body;
};
const printHTML = (html) => {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Report</title>
  <style>
    *{font-family: Inter, ui-sans-serif, system-ui, -apple-system;}
    h1{font-size:20px;margin:0 0 .25rem 0}
    .muted{color:#6b7280}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
    th{background:#fff7ec}
  </style>
  </head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
};

const CHART_COLORS = {
  fresh: "#2f6a31", // green
  soon: "#ffbf00", // yellow
  expired: "#c92a2a", // red
};
// Map status names to colors
const CHART_COLORS_BY_NAME = {
  Fresh: CHART_COLORS.fresh,
  Soon: CHART_COLORS.soon,
  Expired: CHART_COLORS.expired,
};

const BakeryReports = ({
  inventory = [],
  employeeCount = 0,
  bakeryName = "Bakery",
}) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("summary"); // summary | expiring | expired | full

  // UI inputs
  const [uiFrom, setUiFrom] = useState(from);
  const [uiTo, setUiTo] = useState(to);
  const [uiType, setUiType] = useState(type);

  // Trigger the popup only after filters are applied
  const [pendingNotify, setPendingNotify] = useState(false);

  useEffect(() => {
    setUiFrom(from);
    setUiTo(to);
    setUiType(type);
  }, [from, to, type]);

  const inRange = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return true;
    if (from && d < new Date(from)) return false;
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      if (d > t) return false;
    }
    return true;
  };

  // tables
  const baseRows = useMemo(() => {
    return (inventory || []).map((i) => {
      const st = statusOf(i);
      return {
        id: i.id,
        name: i.name,
        quantity: Number(i.quantity) || 0,
        expiration_date: i.expiration_date || "",
        days_until: daysUntil(i.expiration_date),
        status: st,
      };
    });
  }, [inventory]);

  const filteredRows = useMemo(() => {
    let rows = baseRows.filter((r) => inRange(r.expiration_date));
    if (type === "expiring") rows = rows.filter((r) => r.status === "soon");
    if (type === "expired") rows = rows.filter((r) => r.status === "expired");
    return rows.sort((a, b) => {
      const da = parseDate(a.expiration_date)?.getTime() ?? Infinity;
      const db = parseDate(b.expiration_date)?.getTime() ?? Infinity;
      if (da !== db) return da - db;
      const w = { expired: 0, soon: 1, fresh: 2 };
      return (w[a.status] ?? 99) - (w[b.status] ?? 99);
    });
  }, [baseRows, from, to, type]);

  // summary metrics
  const totals = useMemo(() => {
    const all = filteredRows;
    const sumQty = all.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const counts = all.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { fresh: 0, soon: 0, expired: 0 }
    );
    return {
      items: all.length,
      quantity: sumQty,
      fresh: counts.fresh,
      soon: counts.soon,
      expired: counts.expired,
    };
  }, [filteredRows]);

  // charts
  const statusPie = useMemo(
    () => [
      { name: "Fresh", value: totals.fresh },
      { name: "Soon", value: totals.soon },
      { name: "Expired", value: totals.expired },
    ],
    [totals]
  );

  // bar chart
  const byDate = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const key = formatDate(r.expiration_date) || "—";
      const prev = map.get(key) || { count: 0, status: "fresh" };
      const next = { ...prev, count: prev.count + 1 };
      if (r.status === "expired") next.status = "expired";
      else if (r.status === "soon" && prev.status !== "expired")
        next.status = "soon";
      map.set(key, next);
    });
    return Array.from(map.entries())
      .map(([date, { count, status }]) => ({ date, count, status }))
      .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  }, [filteredRows]);

  const CSV_HEADERS = [
    { key: "id", label: "Product ID" },
    { key: "name", label: "Product Name" },
    { key: "quantity", label: "Quantity" },
    { key: "expiration_date", label: "Expiration Date" },
    { key: "days_until", label: "Days Until" },
    { key: "status", label: "Status" },
  ];

  const handleExportCSV = () => {
    const csv = toCSV(filteredRows, CSV_HEADERS);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const range = [from || "", to || ""].filter(Boolean).join("_to_");
    const name = `${bakeryName.replaceAll(" ", "-")}_report_${type}${
      range ? `_${range}` : ""
    }.csv`;
    downloadBlob(blob, name);
  };

  const handlePrint = () => {
    const today = new Date();
    const html = `
      <div style="margin-bottom:10px">
        <h1>${bakeryName} — ${type.toUpperCase()} Report</h1>
        <div class="muted">Generated ${today.toLocaleString()}</div>
        <div class="muted">Range: ${from || "(any)"} to ${to || "(any)"}</div>
      </div>
      <table><thead><tr>
        ${CSV_HEADERS.map((h) => `<th>${h.label}</th>`).join("")}
      </tr></thead><tbody>
        ${filteredRows
          .map(
            (r) => `<tr>
            ${CSV_HEADERS.map((h) => `<td>${r[h.key] ?? ""}</td>`).join("")}
          </tr>`
          )
          .join("")}
      </tbody></table>`;
    printHTML(html);
  };

  // popup notifier after Generate is applied
 const notifyReady = () => {
  const detailsHTML = `
    <div style="font-size:13px;color:#6b7280;margin-top:6px">
      Type: <b>${type.toUpperCase()}</b>
    </div>
    <div style="font-size:13px;color:#6b7280">
      Range: <b>${from || "(any)"} → ${to || "(any)"}</b>
    </div>
    <div style="font-size:13px;color:#6b7280">
      Items: <b>${totals.items}</b> · Quantity: <b>${totals.quantity}</b>
    </div>
    <div style="font-size:13px;color:#6b7280">
      Fresh: <b>${totals.fresh}</b> · Soon: <b>${totals.soon}</b> · Expired: <b>${totals.expired}</b>
    </div>
  `;

  Swal.fire({
    toast: false,              
    position: "center",         
    icon: filteredRows.length ? "success" : "info",
    title: filteredRows.length ? "Report generated" : "No rows for this filter",
    html: detailsHTML,
    showConfirmButton: false,  
    showDenyButton: false,
    showCancelButton: false,
    timer: 2200,
    timerProgressBar: true,
    backdrop: true,
    allowOutsideClick: true,
    didOpen: (popup) => {
      popup.addEventListener("mouseenter", Swal.stopTimer);
      popup.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
};
  // Popup effect when filters change 
  useEffect(() => {
    if (pendingNotify) {
      notifyReady();
      setPendingNotify(false);
    }
  }, [from, to, type, pendingNotify]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="gwrap hover-lift">
        <Card className="glass-card shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>

                <CardTitle className="text-2xl font-bold text-[#6b4b2b]">
                  <FileText className="h-5 w-5" /> Reports
                </CardTitle>
                <CardDescription>
                  Generate downloadable inventory reports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> From
                </label>
                <input
                  type="date"
                  value={uiFrom}
                  onChange={(e) => setUiFrom(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-white/90"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> To
                </label>
                <input
                  type="date"
                  value={uiTo}
                  onChange={(e) => setUiTo(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-white/90"
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" /> Report Type
                </label>
                <select
                  value={uiType}
                  onChange={(e) => setUiType(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-white/90"
                >
                  <option value="summary">Inventory Summary</option>
                  <option value="expiring">Soon to Expire</option>
                  <option value="expired">Expired</option>
                  <option value="full">Full Inventory</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  className="btn-logout ..."
                  onClick={() => {
                    // apply filters
                    setFrom(uiFrom);
                    setTo(uiTo);
                    setType(uiType);
                    // queue the popup after state is applied
                    setPendingNotify(true);
                  }}
                >
                  <PieChartIcon className="h-4 w-4 mr-1" /> Generate
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="gwrap hover-lift">
          <Card className="glass-card shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Items in Report
                  </p>
                    <p className="text-3xl font-extrabold">{totals.items}</p>
                </div>
                <div className="chip">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="gwrap hover-lift">
          <Card className="glass-card shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Quantity
                  </p>
                  <p className="text-3xl font-extrabold">{totals.quantity}</p>
                </div>
                <div className="chip">
                  <Package className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="gwrap hover-lift">
          <Card className="glass-card shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Expired
                  </p>
                  <p className="text-3xl font-extrabold">{totals.expired}</p>
                </div>
                <div className="chip">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="gwrap hover-lift">
          <Card className="glass-card shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Soon to Expire
                  </p>
                  <p className="text-3xl font-extrabold">{totals.soon}</p>
                </div>
                <div className="chip">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="gwrap hover-lift">
          <Card className="glass-card shadow-none">
            <CardHeader className="pb-2">
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Fresh vs Soon vs Expired</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {statusPie.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CHART_COLORS_BY_NAME[entry.name] || "#999"}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bar */}
        <div className="gwrap hover-lift">
          <Card className="glass-card shadow-none">
            <CardHeader className="pb-2">
              <CardTitle>Items by Expiration Date</CardTitle>
              <CardDescription>Counts grouped per day</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {byDate.map((d, idx) => (
                      <Cell
                        key={`bar-${idx}`}
                        fill={CHART_COLORS[d.status] || "#999"}
                        stroke="none"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table */}
      <div className="gwrap hover-lift">
        <Card className="glass-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle>Rows ({filteredRows.length})</CardTitle>
            <CardDescription>Filtered by date & type above</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Quantity</th>
                    <th className="py-2 pr-3">Expiration</th>
                    <th className="py-2 pr-3">Days</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, idx) => (
                    <tr key={r.id || idx} className="border-b last:border-0">
                      <td className="py-2 pr-3">{idx + 1}</td>
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3">{r.quantity}</td>
                      <td className="py-2 pr-3">{r.expiration_date || "—"}</td>
                      <td className="py-2 pr-3">{r.days_until ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <span
                          className="inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full border"
                          style={{
                            background:
                              r.status === "expired"
                                ? "#fff1f0"
                                : r.status === "soon"
                                ? "#fff8e6"
                                : "#eef8ee",
                            borderColor:
                              r.status === "expired"
                                ? "#ffd6d6"
                                : r.status === "soon"
                                ? "#ffe7bf"
                                : "#cce6cc",
                            color:
                              r.status === "expired"
                                ? "#c92a2a"
                                : r.status === "soon"
                                ? "#8a5a25"
                                : "#2f6a31",
                          }}
                        >
                          {r.status === "expired"
                            ? "Expired"
                            : r.status === "soon"
                            ? "Soon"
                            : "Fresh"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No rows for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BakeryReports;
