import { useState, useRef } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Wallet, Pencil, Trash2, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatCard from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadPDF, downloadCSV } from "@/lib/export";
import { useModuleShortcuts } from "@/hooks/useModuleShortcuts";
import ExportButton from "@/components/shared/ExportButton";
import PasswordConfirmDialog from "@/components/shared/PasswordConfirmDialog";
import type { Expense } from "@/types";

const categories = ["All", "Utilities", "Salaries", "Supplies", "Rent"];

export default function Expenses() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Utilities",
    amount: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });
  const searchRef = useRef<HTMLInputElement>(null);

  function handleExportPDF() {
    const headers = ["Date", "Title", "Category", "Amount", "Status"];
    const rows = filtered.map((e: Expense) => [
      formatDate(e.date),
      e.title,
      e.category,
      formatCurrency(e.amount),
      e.status ?? "—",
    ]);
    downloadPDF("expenses-report.pdf", "Expenses Report", headers, rows);
  }

  function handleExportCSV() {
    const headers = ["Date", "Title", "Category", "Amount", "Status"];
    const rows = filtered.map((e: Expense) => [
      formatDate(e.date),
      e.title,
      e.category,
      formatCurrency(e.amount),
      e.status ?? "—",
    ]);
    downloadCSV("expenses-report.csv", headers, rows);
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      title: "",
      category: "Utilities",
      amount: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
    setOpen(true);
  }

  useModuleShortcuts({
    onAdd: openAdd,
    onSearch: () => searchRef.current?.focus(),
    onExportPDF: handleExportPDF,
    onExportCSV: handleExportCSV,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const debouncedSearch = useDebounce(search, 300);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["expenses", page, limit, debouncedSearch, category],
    queryFn: () => api.expenses.listPaginated({ page, limit, search: debouncedSearch }),
  });

  const rawExpenses = paginatedData?.data || [];
  const expenses = rawExpenses.filter((e: Expense) => category === "All" || e.category === category);
  const meta = paginatedData?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  const filtered = expenses;

  const totalThisMonth = expenses
    .filter((e: Expense) => e.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s: number, e: Expense) => s + e.amount, 0);

  const createMutation = useMutation({
    mutationFn: () =>
      api.expenses.create({
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        notes: form.notes,
        date: form.date,
      }),
    onSuccess: () => {
      toast.success("Expense created");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      setEditingId(null);
      setForm({
        title: "",
        category: "Utilities",
        amount: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.expenses.update(editingId!, {
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        notes: form.notes,
        date: form.date,
      }),
    onSuccess: () => {
      toast.success("Expense updated");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      setEditingId(null);
      setForm({
        title: "",
        category: "Utilities",
        amount: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.expenses.delete(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteId(null);
    },
  });

  function openEdit(e: Expense) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      category: e.category,
      amount: String(e.amount),
      notes: e.notes,
      date: e.date,
    });
    setOpen(true);
  }

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (e: Expense) => (
        <span className="font-mono text-xs text-text-secondary">{formatDate(e.date)}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (e: Expense) => <span className="font-medium text-text-primary">{e.title}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (e: Expense) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary font-medium">
          {e.category}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (e: Expense) => (
        <span className="font-mono font-medium">{formatCurrency(e.amount)}</span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (e: Expense) => <span className="text-text-secondary text-xs">{e.notes || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (e: Expense) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => openEdit(e)}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-brand hover:bg-brand/10 transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteId(e.id)}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Shop Operational Expenses"
        description="Daily utilities, wages, supplies, and maintenance ledgers"
        action={{ label: "Add Expense", onClick: openAdd, shortcut: "Mod+N" }}
      />

      <div className="mb-4">
        <StatCard
          title="Total Expenses This Month"
          value={formatCurrency(totalThisMonth)}
          icon={<Wallet className="h-5 w-5" />}
          subtitle="Utility, salary & overhead expenditure"
        />
      </div>

      {/* Toolbar & Category Pill Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/80 shadow-xs overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                category === cat
                  ? "bg-[#4A25E1] text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder="Search expenses by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-full border border-border/80 bg-surface shadow-xs text-xs focus-visible:ring-2 focus-visible:ring-[#4A25E1]/25"
            />
          </div>
          <ExportButton type="pdf" onClick={handleExportPDF} />
          <ExportButton type="csv" onClick={handleExportCSV} />
        </div>
      </div>

      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          keyExtractor={(e: Expense) => e.id}
        />
        
        {/* Pagination Bar */}
        <div className="rounded-2xl border border-border/80 bg-surface p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>
              Showing {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1} to{" "}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} entries
            </span>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-surface-2 text-text-primary border border-border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              >
                {[10, 20, 30, 50, 100].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl shadow-xs"
            >
              Previous
            </Button>
            <div className="text-xs font-semibold text-text-primary px-2">
              Page {meta.page} of {meta.totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= (meta.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl shadow-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setEditingId(null);
          }
          setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Expense title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c !== "All")
                    .map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Additional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={
                !form.title || !form.amount || createMutation.isPending || updateMutation.isPending
              }
              onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingId
                  ? "Update Expense"
                  : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        title="Delete Expense"
        description="Are you sure you want to delete this expense?"
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
