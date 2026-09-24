import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, CheckCircle, Clock, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { generatePDF } from "@/lib/pdfExport";
import { downloadExcelFile } from "@/lib/excelExport";
import type { Expense } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

export default function ExpensesReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  // Paginated table data
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ["expenses", "report", page, limit, debouncedSearch, dateRange.from, dateRange.to, categoryFilter, paymentFilter],
    queryFn: () => api.expenses.listPaginated({
      page,
      limit,
      search: debouncedSearch || undefined,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    }),
  });

  const expenses = expensesData?.data ?? [];
  const meta = expensesData?.meta;

  // Summary data (load all for KPIs - could be optimized with separate summary endpoint later)
  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses", "summary", dateRange.from, dateRange.to, categoryFilter, paymentFilter],
    queryFn: () => api.expenses.list(),
  });

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e: Expense) => {
      const inDateRange = e.date >= dateRange.from && e.date <= dateRange.to;
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesPayment = paymentFilter === "all" || e.payment_method === paymentFilter;
      return inDateRange && matchesCategory && matchesPayment;
    });
  }, [allExpenses, dateRange, categoryFilter, paymentFilter]);

  const totalExpenses = filteredExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const paidExpenses = filteredExpenses
    .filter((e: Expense) => e.status === "paid")
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const pendingExpenses = filteredExpenses
    .filter((e: Expense) => e.status !== "paid")
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateRange, categoryFilter, paymentFilter, debouncedSearch]);

  function handleReset() {
    setDateRange({
      from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    });
    setCategoryFilter("all");
    setPaymentFilter("all");
    setSearch("");
    setPage(1);
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
        e.category || "\u2014",
        formatCurrency(e.amount),
        e.payment_method || "\u2014",
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
        e.category || "\u2014",
        e.amount,
        e.payment_method || "\u2014",
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
        <span className="text-text-secondary text-sm">{e.category || "\u2014"}</span>
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
        <span className="text-text-secondary text-sm">{e.payment_method || "\u2014"}</span>
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

      <div className="relative z-10 flex items-center gap-3 mb-6 p-4 bg-surface-1 rounded-xl border border-border/50 flex-wrap">
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
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
          data={expenses}
          loading={isLoading}
          keyExtractor={(e: Expense) => e.id}
          emptyMessage="No expenses found"
        />
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-text-secondary">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary px-2">
              Page {page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}