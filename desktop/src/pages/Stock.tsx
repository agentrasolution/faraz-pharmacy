import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Barcode,
  Search,
  Download,
  Archive,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF, downloadExcel } from "@/lib/export";
import { useModuleShortcuts } from "@/hooks/useModuleShortcuts";
import PasswordConfirmDialog from "@/components/shared/PasswordConfirmDialog";
import ExportButton from "@/components/shared/ExportButton";
import { ShortcutHint } from "@/components/shared/Kbd";
import BatchTraceDialog from "@/components/stock/BatchTraceDialog";
import type { StockPurchase, Product, Distributor } from "@/types";

export default function Stock() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [traceBatchOpen, setTraceBatchOpen] = useState(false);
  const [traceBatchNumber, setTraceBatchNumber] = useState("");
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    productId: "",
    distributorId: "",
    invoiceNumber: "",
    batchNumber: "",
    quantity: "",
    expiry: "",
  });

  const stockHeaders = [
    "Invoice",
    "Batch #",
    "Date",
    "Supplier",
    "Product",
    "Qty",
    "Purchase Price",
    "Total",
    "Status",
  ];
  const stockExportRows = (data: StockPurchase[]) =>
    data.map((s) => [
      s.invoice_number || "—",
      s.batch_number || "—",
      formatDate(s.created_at),
      s.distributor_name || "—",
      s.product_name,
      s.quantity,
      formatCurrency(s.purchase_price),
      formatCurrency(s.total_value),
      s.active !== 0 ? "Active" : "Archived",
    ]);

  function handleExportPDF() {
    downloadPDF(
      `stock_${new Date().toISOString().split("T")[0]}.pdf`,
      "Stock / Purchases",
      stockHeaders,
      stockExportRows(stockEntries)
    );
  }

  function handleExportCSV() {
    downloadCSV(
      `stock_${new Date().toISOString().split("T")[0]}.csv`,
      stockHeaders,
      stockExportRows(stockEntries)
    );
  }

  const { searchRef } = useModuleShortcuts({
    onAdd: openAdd,
    onSearch: () => searchRef.current?.focus(),
    onExportPDF: handleExportPDF,
    onExportCSV: handleExportCSV,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, showArchived, limit]);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["stock", page, limit, debouncedSearch, showArchived],
    queryFn: () =>
      api.stock.listPaginated({
        page,
        limit,
        search: debouncedSearch,
        archived: showArchived,
      }),
  });

  const rawStock = paginatedData?.data || [];
  const stockEntries = rawStock.filter((s: StockPurchase) =>
    showArchived ? s.active === 0 : s.active !== 0
  );
  const meta = paginatedData?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const { data: distributorsResponse } = useQuery({
    queryKey: ["distributors"],
    queryFn: () => api.distributors.listPaginated({ limit: 1000 }),
  });
  const distributors = distributorsResponse?.data ?? [];

  const totalValue = stockEntries.reduce((s: number, i: StockPurchase) => s + i.total_value, 0);

  const createMutation = useMutation({
    mutationFn: () =>
      api.stock.create({
        productId: form.productId,
        distributorId: form.distributorId || undefined,
        invoiceNumber: form.invoiceNumber,
        batchNumber: form.batchNumber || undefined,
        quantity: Number(form.quantity),
        expiry: form.expiry || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setForm({ productId: "", distributorId: "", invoiceNumber: "", batchNumber: "", quantity: "", expiry: "" });
      toast.success("Stock purchase recorded");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.stock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock entry deleted");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteId(null);
    },
  });

  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [restorePasswordOpen, setRestorePasswordOpen] = useState(false);
  const [hardDeleteTargetId, setHardDeleteTargetId] = useState<string | null>(null);
  const [hardDeletePasswordOpen, setHardDeletePasswordOpen] = useState(false);

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.stock.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock entry restored");
      setRestoreTargetId(null);
      setRestorePasswordOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore stock entry");
      setRestoreTargetId(null);
      setRestorePasswordOpen(false);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.stock.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock entry permanently deleted");
      setHardDeleteTargetId(null);
      setHardDeletePasswordOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to permanently delete stock entry");
      setHardDeleteTargetId(null);
      setHardDeletePasswordOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.stock.update(editingId!, {
        productId: form.productId,
        distributorId: form.distributorId || undefined,
        invoiceNumber: form.invoiceNumber,
        batchNumber: form.batchNumber || undefined,
        quantity: Number(form.quantity),
        expiry: form.expiry || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditingId(null);
      setForm({
        productId: "",
        distributorId: "",
        invoiceNumber: "",
        batchNumber: "",
        quantity: "",
        expiry: "",
      });
      toast.success("Stock purchase updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (open && scanRef.current) {
      setTimeout(() => scanRef.current?.focus(), 100);
    }
  }, [open]);

  async function handleScan(value: string) {
    const product = await api.products.getByBarcode(value.trim());
    if (product) {
      setForm((prev) => ({ ...prev, productId: product.id }));
      toast.success(`Found: ${product.name}`);
    } else {
      toast.error("No product found with this barcode");
    }
    setScanValue("");
    scanRef.current?.focus();
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      productId: "",
      distributorId: "",
      invoiceNumber: "",
      batchNumber: "",
      quantity: "",
      expiry: "",
    });
    setScanValue("");
    setOpen(true);
  }

  function openEdit(entry: StockPurchase) {
    setEditingId(entry.id);
    setForm({
      productId: entry.product_id,
      distributorId: entry.distributor_id || "",
      invoiceNumber: entry.invoice_number || "",
      batchNumber: entry.batch_number || "",
      quantity: String(entry.quantity),
      expiry: entry.expiry || "",
    });
    setOpen(true);
  }

  const columns = [
    {
      key: "created_at",
      header: "Date",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-[11px] text-text-secondary">
          {formatDate(s.created_at)}
        </span>
      ),
    },
    {
      key: "product_name",
      header: "Product",
      cell: (s: StockPurchase) => (
        <span className="text-xs font-medium text-text-primary">{s.product_name}</span>
      ),
    },
    {
      key: "distributor_name",
      header: "Distributor",
      cell: (s: StockPurchase) => (
        <span className="text-[11px] text-text-secondary">{s.distributor_name || "\u2014"}</span>
      ),
    },
    {
      key: "invoice_number",
      header: "Invoice",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-[11px] text-text-secondary">
          {s.invoice_number || "\u2014"}
        </span>
      ),
    },
    {
      key: "batch_number",
      header: "Batch #",
      cell: (s: StockPurchase) => (
        <button
          onClick={() => {
            if (s.batch_number) {
              setTraceBatchNumber(s.batch_number);
              setTraceBatchOpen(true);
            }
          }}
          disabled={!s.batch_number}
          className={cn(
            "font-mono text-[11px] font-semibold text-left transition-colors",
            s.batch_number
              ? "text-brand hover:underline cursor-pointer"
              : "text-text-secondary cursor-default"
          )}
          title={s.batch_number ? "Click to trace batch & recall audit" : ""}
        >
          {s.batch_number || "\u2014"}
        </button>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-xs font-semibold">{s.quantity}</span>
      ),
    },
    {
      key: "purchase_price",
      header: "Cost",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-xs">{formatCurrency(s.purchase_price)}</span>
      ),
    },
    {
      key: "sale_price",
      header: "Sale Price",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-xs text-accent font-semibold">
          {formatCurrency(s.sale_price)}
        </span>
      ),
    },
    {
      key: "total_value",
      header: "Total",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-xs font-bold text-text-primary">
          {formatCurrency(s.total_value)}
        </span>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      cell: (s: StockPurchase) => (
        <span className="font-mono text-[11px] text-text-secondary">
          {s.expiry ? formatDate(s.expiry) : "\u2014"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (s: StockPurchase) => (
        <div className="flex items-center gap-0.5 justify-end">
          {s.active !== 0 ? (
            <>
              <button
                onClick={() => openEdit(s)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-brand hover:bg-brand/10 transition-colors"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteId(s.id)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-warning hover:bg-warning/10 transition-colors"
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setRestoreTargetId(s.id);
                  setRestorePasswordOpen(true);
                }}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-success hover:bg-success/10 transition-colors"
                title="Restore"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setHardDeleteTargetId(s.id);
                  setHardDeletePasswordOpen(true);
                }}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                title="Delete Permanently"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Stock Purchases & Inward"
        description="Receive stock consignments, distributor delivery invoices, and batch lots"
        action={{
          label: (
            <>
              <span>New Purchase</span>
              <ShortcutHint shortcut="Mod+N" />
            </>
          ),
          onClick: openAdd,
        }}
      />

      {/* Stock Overview Banner */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Total Inward Stock Valuation
          </p>
          <div className="flex items-center gap-3">
            <p className="text-2xl sm:text-3xl font-display font-bold text-text-primary tabular-nums tracking-tight">
              {showValue ? formatCurrency(totalValue) : "••••••••"}
            </p>
            <button
              onClick={() => setShowValue(!showValue)}
              className="h-8 w-8 rounded-xl bg-[#4A25E1]/10 dark:bg-white/10 flex items-center justify-center text-[#4A25E1] dark:text-[#754BFB] hover:scale-105 transition-all cursor-pointer"
              title={showValue ? "Hide value" : "Show value"}
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            Cumulative value of active received shipments
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            ref={searchRef}
            autoFocus
            placeholder="Search by product, company, distributor, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-full border border-border/80 bg-surface shadow-xs text-xs focus-visible:ring-2 focus-visible:ring-[#4A25E1]/25"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl shadow-xs border-brand/30 text-brand hover:bg-brand/10 gap-1.5"
            onClick={() => {
              setTraceBatchNumber("");
              setTraceBatchOpen(true);
            }}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Batch Audit
          </Button>
          <ExportButton type="pdf" onClick={handleExportPDF} />
          <ExportButton type="csv" onClick={handleExportCSV} />
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-xl shadow-xs",
              showArchived
                ? "border-[#4A25E1] text-[#4A25E1] dark:border-[#754BFB] dark:text-[#754BFB] bg-[#4A25E1]/10"
                : ""
            )}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-3.5 w-3.5 mr-1" />
            {showArchived ? "Archived Stock" : "Archived"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={stockEntries}
          loading={isLoading}
          keyExtractor={(s: StockPurchase) => s.id}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Stock Purchase" : "Record Stock Purchase"}</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
              <Input
                ref={scanRef}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scanValue.trim()) {
                    handleScan(scanValue.trim());
                  }
                }}
                placeholder="Scan barcode or QR code to select product..."
                className="pl-9 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label>Product</Label>
              <SearchableSelect
                options={products.map((p: Product) => ({
                  value: p.id,
                  label: `${p.name} — ${p.category || "No Category"}`,
                }))}
                value={form.productId}
                onChange={(v) => setForm({ ...form, productId: v })}
                placeholder="Select product"
              />
            </div>
            <div className="space-y-1">
              <Label>Distributor</Label>
              <SearchableSelect
                options={distributors.map((d: Distributor) => ({
                  value: d.id,
                  label: d.name || "Unnamed",
                }))}
                value={form.distributorId}
                onChange={(v) => setForm({ ...form, distributorId: v })}
                placeholder="Select distributor"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Invoice Number</Label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-001"
                />
              </div>
              <div className="space-y-1">
                <Label>Batch Number</Label>
                <Input
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="e.g. B-2048 / LOT-99"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Expiry (optional)</Label>
              <Input
                type="date"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <Button
              className="w-full"
              disabled={
                !form.productId ||
                !form.quantity ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingId
                  ? "Update Purchase"
                  : "Record Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        title="Archive Stock Entry"
        description="This will remove the stock quantity from the product. The entry will be archived and can be restored later."
        confirmLabel="Archive"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        loading={deleteMutation.isPending}
      />

      <PasswordConfirmDialog
        open={restorePasswordOpen}
        onOpenChange={(v) => {
          if (!v) {
            setRestorePasswordOpen(false);
            setRestoreTargetId(null);
          }
        }}
        title="Restore Stock Entry"
        description="Enter admin password to restore this archived stock entry and restore its quantity to inventory."
        confirmLabel="Restore"
        onConfirm={() => {
          if (restoreTargetId) restoreMutation.mutate(restoreTargetId);
        }}
        loading={restoreMutation.isPending}
      />

      <PasswordConfirmDialog
        open={hardDeletePasswordOpen}
        onOpenChange={(v) => {
          if (!v) {
            setHardDeletePasswordOpen(false);
            setHardDeleteTargetId(null);
          }
        }}
        title="Delete Stock Entry Permanently"
        description="This action cannot be undone. Enter admin password to permanently delete this stock entry record."
        confirmLabel="Delete Permanently"
        onConfirm={() => {
          if (hardDeleteTargetId) hardDeleteMutation.mutate(hardDeleteTargetId);
        }}
        loading={hardDeleteMutation.isPending}
      />

      <BatchTraceDialog
        open={traceBatchOpen}
        onOpenChange={setTraceBatchOpen}
        initialBatchNumber={traceBatchNumber}
      />
    </div>
  );
}
