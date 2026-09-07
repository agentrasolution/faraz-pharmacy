import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ShoppingCart, DollarSign, BarChart3 } from "lucide-react";
import DateRangePicker, { type DateRange } from "@/components/reports/DateRangePicker";
import KPICard from "@/components/reports/KPICard";
import ExportButtons from "@/components/reports/ExportButtons";
import DataTable from "@/components/shared/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { generatePDF } from "@/lib/pdfExport";
import { downloadExcelFile } from "@/lib/excelExport";
import type { Sale } from "@/types";

export default function SalesReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("week");

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sales", "all"],
    queryFn: () => api.sales.listAll(),
  });

  const filteredSales = useMemo(() => {
    return allSales.filter((s: Sale) => {
      const inDateRange = s.created_at >= dateRange.from && s.created_at <= dateRange.to + "T23:59:59";
      const matchesPayment = paymentFilter === "all" || s.payment_method === paymentFilter;
      return inDateRange && matchesPayment;
    });
  }, [allSales, dateRange, paymentFilter]);

  const totalRevenue = filteredSales.reduce((sum: number, s: Sale) => sum + s.total, 0);
  const totalPaid = filteredSales.reduce((sum: number, s: Sale) => sum + s.amount_paid, 0);
  const avgSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const profit = filteredSales.reduce((sum: number, s: Sale) => sum + (s.profit || 0), 0);
  const outstanding = totalRevenue - totalPaid;

  const chartData = useMemo(() => {
    const days = chartPeriod === "week" ? 7 : 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      const daySales = allSales.filter((s: Sale) => s.created_at.startsWith(dateStr));
      data.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: daySales.reduce((sum: number, s: Sale) => sum + s.total, 0),
      });
    }
    return data;
  }, [allSales, chartPeriod]);

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  function handleReset() {
    setDateRange({
      from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    });
    setPaymentFilter("all");
  }

  function handlePDF() {
    generatePDF({
      title: "Sales Report",
      dateRange,
      summary: [
        { label: "Revenue", value: formatCurrency(totalRevenue) },
        { label: "Transactions", value: String(filteredSales.length) },
        { label: "Average Sale", value: formatCurrency(avgSale) },
        { label: "Profit", value: formatCurrency(profit) },
      ],
      headers: ["Invoice", "Date", "Customer", "Items", "Subtotal", "Discount", "Total", "Paid", "Status"],
      rows: filteredSales.map((s: Sale) => [
        s.invoice_no || "—",
        formatDate(s.created_at),
        s.customer_name || "Walk-in",
        s.items?.length || 0,
        formatCurrency(s.subtotal),
        formatCurrency(s.discount),
        formatCurrency(s.total),
        formatCurrency(s.amount_paid),
        s.status,
      ]),
      filename: `sales_report_${dateRange.from}_${dateRange.to}.pdf`,
    });
  }

  function handleExcel() {
    downloadExcelFile(`sales_report_${dateRange.from}_${dateRange.to}.xlsx`, ["Invoice", "Date", "Customer", "Items", "Subtotal", "Discount", "Total", "Paid", "Status"], filteredSales.map((s: Sale) => [
      s.invoice_no || "—",
      formatDate(s.created_at),
      s.customer_name || "Walk-in",
      s.items?.length || 0,
      s.subtotal,
      s.discount,
      s.total,
      s.amount_paid,
      s.status,
    ]));
  }

  const columns = [
    { key: "invoice_no", header: "Invoice", cell: (s: Sale) => <span className="font-mono text-xs text-text-secondary">{s.invoice_no || "—"}</span> },
    { key: "created_at", header: "Date", cell: (s: Sale) => <span className="font-mono text-xs">{formatDate(s.created_at)}</span> },
    { key: "customer_name", header: "Customer", cell: (s: Sale) => <span className="font-medium text-text-primary">{s.customer_name || "Walk-in"}</span> },
    { key: "items", header: "Items", cell: (s: Sale) => <span className="font-mono text-text-secondary">{s.items?.length || 0}</span> },
    { key: "total", header: "Total", cell: (s: Sale) => <span className="font-mono font-semibold">{formatCurrency(s.total)}</span> },
    { key: "amount_paid", header: "Paid", cell: (s: Sale) => <span className="font-mono">{formatCurrency(s.amount_paid)}</span> },
    { key: "balance", header: "Balance", cell: (s: Sale) => {
      const balance = s.total - s.amount_paid;
      return <span className={`font-mono font-medium ${balance > 0 ? "text-danger" : "text-success"}`}>{formatCurrency(balance)}</span>;
    }},
    { key: "status", header: "Status", cell: (s: Sale) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
        {s.status}
      </span>
    )},
  ];

  return (
    <div>
      {/* Report Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Sales Report</h2>
          <p className="text-sm text-text-secondary mt-0.5">Sales performance and transaction history</p>
        </div>
        <ExportButtons onPDF={handlePDF} onExcel={handleExcel} />
      </div>

      {/* Filters */}
      <div className="relative z-10 flex items-center gap-3 mb-6 p-4 bg-surface-1 rounded-xl border border-border/50">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Payment Method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-9 text-text-secondary" onClick={handleReset}>Reset</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Revenue" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard title="Transactions" value={filteredSales.length} icon={<ShoppingCart className="h-4 w-4" />} />
        <KPICard title="Profit" value={formatCurrency(profit)} icon={<BarChart3 className="h-4 w-4" />} valueClassName="text-success" />
        <KPICard title="Outstanding" value={formatCurrency(outstanding)} icon={<DollarSign className="h-4 w-4" />} valueClassName={outstanding > 0 ? "text-warning" : ""} />
      </div>

      {/* Chart */}
      <Card className="mb-6 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-text-secondary">Revenue Trend</CardTitle>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setChartPeriod("week")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${chartPeriod === "week" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>7 Days</button>
            <button onClick={() => setChartPeriod("month")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${chartPeriod === "month" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>30 Days</button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="relative w-full">
                  <div
                    className="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t-sm transition-all duration-200 group-hover:from-accent-hover group-hover:to-accent cursor-pointer"
                    style={{ height: `${(d.revenue / maxRevenue) * 140}px`, minHeight: d.revenue > 0 ? "4px" : "0" }}
                  />
                  {d.revenue > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono">
                      {formatCurrency(d.revenue)}
                    </div>
                  )}
                </div>
                {i % (chartPeriod === "week" ? 1 : 5) === 0 && (
                  <span className="text-[10px] text-text-secondary font-medium">{chartPeriod === "week" ? d.day : d.date}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredSales}
          loading={isLoading}
          keyExtractor={(s: Sale) => s.id}
          emptyMessage="No sales found for the selected period"
        />
      </div>
    </div>
  );
}
