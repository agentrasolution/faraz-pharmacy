import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Truck, DollarSign } from "lucide-react";
import DateRangePicker, { type DateRange } from "@/components/reports/DateRangePicker";
import KPICard from "@/components/reports/KPICard";
import ExportButtons from "@/components/reports/ExportButtons";
import DataTable from "@/components/shared/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { generatePDF } from "@/lib/pdfExport";
import { downloadExcelFile } from "@/lib/excelExport";
import type { StockPurchase } from "@/types";

export default function PurchaseReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [paymentFilter, setPaymentFilter] = useState("all");

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["stock"],
    queryFn: api.stock.list,
  });

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p: StockPurchase) => {
      const inDateRange = p.date >= dateRange.from && p.date <= dateRange.to;
      const matchesPayment = paymentFilter === "all" || p.payment_status === paymentFilter;
      return inDateRange && matchesPayment;
    });
  }, [purchases, dateRange, paymentFilter]);

  const totalPurchases = filteredPurchases.reduce(
    (sum: number, p: StockPurchase) => sum + p.total_amount,
    0
  );
  const totalPending = filteredPurchases.reduce(
    (sum: number, p: StockPurchase) => sum + (p.total_amount - p.amount_paid),
    0
  );
  const uniqueSuppliers = new Set(
    filteredPurchases.map((p: StockPurchase) => p.distributor_name).filter(Boolean)
  ).size;

  function handleReset() {
    setDateRange({
      from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    });
    setPaymentFilter("all");
  }

  function handlePDF() {
    generatePDF({
      title: "Purchase Report",
      dateRange,
      summary: [
        { label: "Total Purchases", value: formatCurrency(totalPurchases) },
        { label: "Orders", value: String(filteredPurchases.length) },
        { label: "Suppliers", value: String(uniqueSuppliers) },
        { label: "Pending", value: formatCurrency(totalPending) },
      ],
      headers: ["Invoice", "Date", "Supplier", "Total", "Paid", "Balance", "Status"],
      rows: filteredPurchases.map((p: StockPurchase) => [
        p.invoice_no || "—",
        formatDate(p.date),
        p.distributor_name || "—",
        formatCurrency(p.total_amount),
        formatCurrency(p.amount_paid),
        formatCurrency(p.total_amount - p.amount_paid),
        p.payment_status || "pending",
      ]),
      filename: `purchase_report_${dateRange.from}_${dateRange.to}.pdf`,
    });
  }

  function handleExcel() {
    downloadExcelFile(
      `purchase_report_${dateRange.from}_${dateRange.to}.xlsx`,
      ["Invoice", "Date", "Supplier", "Total", "Paid", "Balance", "Status"],
      filteredPurchases.map((p: StockPurchase) => [
        p.invoice_no || "—",
        formatDate(p.date),
        p.distributor_name || "—",
        p.total_amount,
        p.amount_paid,
        p.total_amount - p.amount_paid,
        p.payment_status || "pending",
      ])
    );
  }

  const columns = [
    {
      key: "invoice_no",
      header: "Invoice",
      cell: (p: StockPurchase) => (
        <span className="font-mono text-xs text-text-secondary">{p.invoice_no || "—"}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (p: StockPurchase) => <span className="font-mono text-xs">{formatDate(p.date)}</span>,
    },
    {
      key: "distributor_name",
      header: "Supplier",
      cell: (p: StockPurchase) => (
        <span className="font-medium text-text-primary">{p.distributor_name || "—"}</span>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      cell: (p: StockPurchase) => (
        <span className="font-mono font-semibold">{formatCurrency(p.total_amount)}</span>
      ),
    },
    {
      key: "amount_paid",
      header: "Paid",
      cell: (p: StockPurchase) => (
        <span className="font-mono">{formatCurrency(p.amount_paid)}</span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      cell: (p: StockPurchase) => (
        <span
          className={`font-mono font-medium ${p.total_amount - p.amount_paid > 0 ? "text-danger" : ""}`}
        >
          {formatCurrency(p.total_amount - p.amount_paid)}
        </span>
      ),
    },
    {
      key: "payment_status",
      header: "Status",
      cell: (p: StockPurchase) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${p.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${p.payment_status === "paid" ? "bg-success" : "bg-warning"}`}
          />
          {p.payment_status || "pending"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Purchase Report</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Track stock purchases and supplier payments
          </p>
        </div>
        <ExportButtons onPDF={handlePDF} onExcel={handleExcel} />
      </div>

      <div className="relative z-10 flex items-center gap-3 mb-6 p-4 bg-surface-1 rounded-xl border border-border/50">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-9 text-text-secondary" onClick={handleReset}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Purchases"
          value={formatCurrency(totalPurchases)}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <KPICard
          title="Orders"
          value={filteredPurchases.length}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <KPICard title="Suppliers" value={uniqueSuppliers} icon={<Truck className="h-4 w-4" />} />
        <KPICard
          title="Pending Payments"
          value={formatCurrency(totalPending)}
          icon={<DollarSign className="h-4 w-4" />}
          valueClassName="text-warning"
        />
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredPurchases}
          loading={isLoading}
          keyExtractor={(p: StockPurchase) => p.id}
          emptyMessage="No purchases found"
        />
      </div>
    </div>
  );
}
