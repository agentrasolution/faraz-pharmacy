import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, CheckCircle, Clock } from "lucide-react";
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
import type { Expense } from "@/types";

export default function ExpensesReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.expenses.list,
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e: Expense) => {
      const inDateRange = e.date >= dateRange.from && e.date <= dateRange.to;
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesPayment = paymentFilter === "all" || e.payment_method === paymentFilter;
      return inDateRange && matchesCategory && matchesPayment;
    });
  }, [expenses, dateRange, categoryFilter, paymentFilter]);

  const totalExpenses = filteredExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const paidExpenses = filteredExpenses
    .filter((e: Expense) => e.status === "paid")
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const pendingExpenses = filteredExpenses
    .filter((e: Expense) => e.status !== "paid")
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);

  function handleReset() {
    setDateRange({
      from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    });
    setCategoryFilter("all");
    setPaymentFilter("all");
  }

  function handlePDF() {
    generatePDF({
      title: "Expense Report",
      dateRange,
      summary: [
        { label: "Total Expenses", value: formatCurrency(totalExpenses) },
        { label: "Paid", value: formatCurrency(paidExpenses) },
        { label: "Pending", value: formatCurrency(pendingExpenses) },
      ],
      headers: ["Date", "Expense", "Category", "Amount", "Payment", "Status"],
      rows: filteredExpenses.map((e: Expense) => [
        formatDate(e.date),
        e.title,
        e.category || "—",
        formatCurrency(e.amount),
        e.payment_method || "—",
        e.status || "paid",
      ]),
      filename: `expense_report_${dateRange.from}_${dateRange.to}.pdf`,
    });
  }

  function handleExcel() {
    downloadExcelFile(
      `expense_report_${dateRange.from}_${dateRange.to}.xlsx`,
      ["Date", "Expense", "Category", "Amount", "Payment", "Status"],
      filteredExpenses.map((e: Expense) => [
        formatDate(e.date),
        e.title,
        e.category || "—",
        e.amount,
        e.payment_method || "—",
        e.status || "paid",
      ])
    );
  }

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (e: Expense) => <span className="font-mono text-xs">{formatDate(e.date)}</span>,
    },
    {
      key: "title",
      header: "Expense",
      cell: (e: Expense) => <span className="font-medium text-text-primary">{e.title}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (e: Expense) => (
        <span className="text-text-secondary text-sm">{e.category || "—"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (e: Expense) => (
        <span className="font-mono font-semibold text-danger">{formatCurrency(e.amount)}</span>
      ),
    },
    {
      key: "payment_method",
      header: "Payment",
      cell: (e: Expense) => (
        <span className="text-text-secondary text-sm">{e.payment_method || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (e: Expense) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${e.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${e.status === "paid" ? "bg-success" : "bg-warning"}`}
          />
          {e.status || "paid"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Expense Report</h2>
          <p className="text-sm text-text-secondary mt-0.5">Track and analyze business expenses</p>
        </div>
        <ExportButtons onPDF={handlePDF} onExcel={handleExcel} />
      </div>

      <div className="relative z-10 flex items-center gap-3 mb-6 p-4 bg-surface-1 rounded-xl border border-border/50">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
            <SelectItem value="salaries">Salaries</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-9 text-text-secondary" onClick={handleReset}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={<Wallet className="h-4 w-4" />}
          valueClassName="text-danger"
        />
        <KPICard
          title="Paid"
          value={formatCurrency(paidExpenses)}
          icon={<CheckCircle className="h-4 w-4" />}
          valueClassName="text-success"
        />
        <KPICard
          title="Pending"
          value={formatCurrency(pendingExpenses)}
          icon={<Clock className="h-4 w-4" />}
          valueClassName="text-warning"
        />
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredExpenses}
          loading={isLoading}
          keyExtractor={(e: Expense) => e.id}
          emptyMessage="No expenses found"
        />
      </div>
    </div>
  );
}
