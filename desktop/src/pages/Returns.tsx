import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
  Package,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import PrintPreviewDialog from "@/components/shared/PrintPreviewDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import ExportButton from "@/components/shared/ExportButton";
import { useModuleShortcuts } from "@/hooks/useModuleShortcuts";
import { useDebounce } from "@/hooks/useDebounce";
import type { ReturnEntry, Sale, SaleItem, PrinterConfig } from "@/types";

type DateFilter = "all" | "today" | "week" | "month";

export default function Returns() {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [pendingReturnData, setPendingReturnData] = useState<ReturnEntry | null>(null);
  const [pendingSale, setPendingSale] = useState<Sale | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnEntry | null>(null);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceResults, setInvoiceResults] = useState<Sale[]>([]);
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customRefundAmount, setCustomRefundAmount] = useState<string>("");
  const [isEditingRefund, setIsEditingRefund] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const debouncedSearch = useDebounce(search, 300);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["returns", page, limit, debouncedSearch],
    queryFn: () => api.returns.listPaginated({ page, limit, search: debouncedSearch }),
  });

  const returns = paginatedData?.data || [];
  const meta = paginatedData?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  const { data: recentSales = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["sales", "recent"],
    queryFn: () => api.sales.listRecent(10),
  });

  const { data: selectedSale, isLoading: loadingSale } = useQuery({
    queryKey: ["sale", selectedSaleId],
    queryFn: () => api.sales.getById(selectedSaleId),
    enabled: !!selectedSaleId,
  });

  const filtered = returns;

  const hasReturns = (selectedSale?.return_count ?? 0) > 0;
  const fullyReturned =
    (selectedSale?.items?.length ?? 0) > 0 &&
    (selectedSale?.items ?? []).every((i: SaleItem) => i.quantity - (i.returned_qty ?? 0) <= 0);

  function getDateRange(filter: DateFilter): { from?: string; to?: string } {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    if (filter === "today") return { from: to, to };
    if (filter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
      return { from: weekAgo, to };
    }
    if (filter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
      return { from: monthAgo, to };
    }
    return {};
  }

  const searchInvoices = useCallback(async (q: string, filter: DateFilter) => {
    const query = q.trim();
    if (!query && filter === "all") {
      setInvoiceResults([]);
      return;
    }
    setSearchingInvoice(true);
    try {
      const dateRange = getDateRange(filter);
      if (query) {
        const results = await api.sales.search(query);
        let filtered = results;
        if (dateRange.from) {
          filtered = results.filter((s) => {
            const d = s.created_at.split("T")[0];
            return d >= dateRange.from! && d <= dateRange.to!;
          });
        }
        setInvoiceResults(filtered);
      } else {
        const results = await api.sales.listAll({ dateFrom: dateRange.from, dateTo: dateRange.to });
        setInvoiceResults(results.slice(0, 20));
      }
    } catch {
      setInvoiceResults([]);
    } finally {
      setSearchingInvoice(false);
    }
  }, []);

  function handleSearchChange(value: string) {
    setInvoiceSearch(value);
    searchInvoices(value, dateFilter);
  }

  function handleDateFilterChange(filter: DateFilter) {
    setDateFilter(filter);
    searchInvoices(invoiceSearch, filter);
  }

  function selectSale(sale: Sale) {
    setSelectedSaleId(sale.id);
    setReturnQtys({});
    setError("");
    setCustomRefundAmount("");
    setIsEditingRefund(false);
  }

  function handleInvoiceSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (invoiceResults.length === 1) {
      selectSale(invoiceResults[0]);
      setInvoiceResults([]);
      setInvoiceSearch("");
      return;
    }
    const exact = invoiceResults.find(
      (s) => s.id.toLowerCase() === invoiceSearch.trim().toLowerCase()
    );
    if (exact) {
      selectSale(exact);
      setInvoiceResults([]);
      setInvoiceSearch("");
    }
  }

  function calcRefundAmount(): number {
    if (!selectedSale?.items) return 0;
    const discountRatio =
      selectedSale.subtotal > 0 ? selectedSale.discount / selectedSale.subtotal : 0;
    return Object.entries(returnQtys).reduce((sum, [id, qty]) => {
      const item = selectedSale.items?.find((i: SaleItem) => i.product_id === id);
      if (!item) return sum;
      const rawAmount = item.unit_price * qty;
      const discountedAmount = rawAmount * (1 - discountRatio);
      return sum + Math.round(discountedAmount);
    }, 0);
  }

  function calcRawRefundAmount(): number {
    if (!selectedSale?.items) return 0;
    return Object.entries(returnQtys).reduce((sum, [id, qty]) => {
      const item = selectedSale.items?.find((i: SaleItem) => i.product_id === id);
      return sum + (item?.unit_price || 0) * qty;
    }, 0);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSale?.items) throw new Error("Sale items not loaded");
      const saleItems = selectedSale.items;
      const discountRatio =
        selectedSale.subtotal > 0 ? selectedSale.discount / selectedSale.subtotal : 0;
      const items = Object.entries(returnQtys)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, quantity]) => {
          const item = saleItems.find((i: SaleItem) => i.product_id === productId);
          const rawAmount = (item?.unit_price || 0) * quantity;
          const discountedAmount = rawAmount * (1 - discountRatio);
          return {
            productId,
            productName: item?.product_name || "",
            quantity,
            refundAmount: Math.round(discountedAmount),
          };
        });
      const calculatedRefund = items.reduce((s, i) => s + i.refundAmount, 0);
      const finalRefund = customRefundAmount ? Number(customRefundAmount) : calculatedRefund;
      return api.returns.create({
        saleId: selectedSaleId,
        refundAmount: finalRefund,
        reason,
        items,
      });
    },
    onSuccess: (returnData) => {
      toast.success("Return processed");
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      setPendingReturnData(returnData);
      if (selectedSale) setPendingSale(selectedSale);
      setShowPrintPreview(true);

      setOpen(false);
      setSelectedSaleId("");
      setReason("");
      setReturnQtys({});
      setError("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setError(err instanceof Error ? err.message : "Failed to process return");
    },
  });

  const generateReturnHtml = useCallback(
    async (paperSize: string): Promise<string> => {
      if (!pendingReturnData || !pendingSale) return "";
      const printPayload = {
        ...pendingReturnData,
        items: pendingReturnData.items || [],
        reason: pendingReturnData.reason,
      };
      const result = await window.generateReturnReceiptHTML(printPayload, pendingSale, paperSize);
      return result.success ? result.html : "";
    },
    [pendingReturnData, pendingSale]
  );

  async function handlePrintReturn(config: PrinterConfig) {
    if (!pendingReturnData || !pendingSale) return;
    const printPayload = {
      ...pendingReturnData,
      items: pendingReturnData.items || [],
      reason: pendingReturnData.reason,
    };
    const result = await window.printReturnReceipt(printPayload, pendingSale, config);
    if (!result.success) {
      throw new Error(result.error || "Print failed");
    }
  }

  const columns = [
    {
      key: "created_at",
      header: "Date",
      cell: (r: ReturnEntry) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDateTime(r.created_at)}
        </span>
      ),
    },
    {
      key: "sale_id",
      header: "Sale ID",
      cell: (r: ReturnEntry) => (
        <span className="font-mono text-xs text-text-secondary">{r.sale_id}</span>
      ),
    },
    {
      key: "customer_name",
      header: "Customer",
      cell: (r: ReturnEntry) => (
        <span className="text-text-secondary">{r.customer_name || "—"}</span>
      ),
    },
    {
      key: "refund_amount",
      header: "Refund Amount",
      cell: (r: ReturnEntry) => (
        <span className="font-mono font-medium text-danger">{formatCurrency(r.refund_amount)}</span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (r: ReturnEntry) => <span className="text-text-secondary">{r.reason}</span>,
    },
  ];

  function handleExportPDF() {
    downloadPDF(
      `returns_${new Date().toISOString().split("T")[0]}.pdf`,
      "Returns List",
      ["Date", "Sale ID", "Customer", "Refund Amount", "Reason"],
      filtered.map((r: ReturnEntry) => [
        r.created_at,
        r.sale_id,
        r.customer_name || "",
        r.refund_amount,
        r.reason,
      ])
    );
  }
  function handleExportCSV() {
    downloadCSV(
      `returns_${new Date().toISOString().split("T")[0]}.csv`,
      ["Date", "Sale ID", "Customer", "Refund Amount", "Reason"],
      filtered.map((r: ReturnEntry) => [
        r.created_at,
        r.sale_id,
        r.customer_name || "",
        r.refund_amount,
        r.reason,
      ])
    );
  }

  useModuleShortcuts({
    onAdd: () => setOpen(true),
    onSearch: () => searchRef.current?.focus(),
    onExportPDF: handleExportPDF,
    onExportCSV: handleExportCSV,
  });

  function openDialog() {
    setOpen(true);
    setSelectedSaleId("");
    setInvoiceSearch("");
    setInvoiceResults([]);
    setReturnQtys({});
    setReason("");
    setError("");
    setCustomRefundAmount("");
    setIsEditingRefund(false);
  }

  function getStatusBadge(sale: Sale) {
    const rc = sale.return_count ?? 0;
    if (rc === 0)
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">
          <CheckCircle2 className="h-2.5 w-2.5" /> Full
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
        <RotateCcw className="h-2.5 w-2.5" /> Partial
      </span>
    );
  }

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Process and track product returns"
        action={{ label: "New Return", onClick: openDialog, shortcut: "Mod+N" }}
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            autoFocus
            ref={searchRef}
            placeholder="Search returns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ExportButton type="csv" onClick={handleExportCSV} />
        <ExportButton type="pdf" onClick={handleExportPDF} />
      </div>
      <div className="rounded-xl border border-border">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          keyExtractor={(r: ReturnEntry) => r.id}
          onRowClick={(r: ReturnEntry) => setSelectedReturn(r)}
        />
        
        <div className="flex items-center justify-between mt-4 border-t border-border pt-4 px-4 pb-4">
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>
              Showing {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} entries
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="limit-select">Rows per page:</label>
              <select
                id="limit-select"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-bg text-text border border-border rounded px-2 py-1 text-sm outline-none"
              >
                {[10, 20, 30, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={meta.page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {meta.page} of {meta.totalPages || 1}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={meta.page >= (meta.totalPages || 1)}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* New Return Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedSaleId("");
            setReason("");
            setReturnQtys({});
            setInvoiceSearch("");
            setInvoiceResults([]);
            setError("");
            setCustomRefundAmount("");
            setIsEditingRefund(false);
          }
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Process Return
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-4">
            {/* Search Bar */}
            <div>
              <Label className="mb-1.5 block">Find Invoice</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  placeholder="Search by invoice ID, customer name, or product name..."
                  value={invoiceSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleInvoiceSearchKeyDown}
                  className="pl-9"
                  autoFocus
                />
              </div>
              {searchingInvoice && (
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching invoices...
                </p>
              )}
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-text-secondary" />
              {(["all", "today", "week", "month"] as DateFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handleDateFilterChange(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    dateFilter === f
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3"
                  }`}
                >
                  {f === "all"
                    ? "All Time"
                    : f === "today"
                      ? "Today"
                      : f === "week"
                        ? "This Week"
                        : "This Month"}
                </button>
              ))}
            </div>

            {/* No Search: Show Recent Sales */}
            {!invoiceSearch.trim() && dateFilter === "all" && !selectedSaleId && (
              <div>
                <Label className="mb-2 block text-text-secondary">
                  Recent Sales (click to select)
                </Label>
                {loadingRecent ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentSales.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-6">
                    No recent sales found.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {recentSales.map((sale: Sale) => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => selectSale(sale)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-text-secondary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium">{sale.id}</span>
                                {getStatusBadge(sale)}
                              </div>
                              <p className="text-xs text-text-secondary truncate">
                                {sale.customer_name || "Walk-in"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">
                                {formatCurrency(sale.total)}
                              </p>
                              <p className="text-[10px] text-text-secondary">
                                {formatDate(sale.created_at)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-accent transition-colors" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {invoiceSearch.trim() && !selectedSaleId && (
              <div>
                {invoiceResults.length > 0 ? (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {invoiceResults.map((sale: Sale) => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => {
                          selectSale(sale);
                          setInvoiceSearch("");
                          setInvoiceResults([]);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-text-secondary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium">{sale.id}</span>
                                {getStatusBadge(sale)}
                              </div>
                              <p className="text-xs text-text-secondary truncate">
                                {sale.customer_name || "Walk-in"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">
                                {formatCurrency(sale.total)}
                              </p>
                              <p className="text-[10px] text-text-secondary">
                                {formatDate(sale.created_at)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-accent transition-colors" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary text-center py-4 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" /> No invoices found for "{invoiceSearch}"
                  </p>
                )}
              </div>
            )}

            {/* Date Filter Results (no search query) */}
            {!invoiceSearch.trim() && dateFilter !== "all" && !selectedSaleId && (
              <div>
                {invoiceResults.length > 0 ? (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {invoiceResults.map((sale: Sale) => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => {
                          selectSale(sale);
                          setInvoiceSearch("");
                          setInvoiceResults([]);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-text-secondary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium">{sale.id}</span>
                                {getStatusBadge(sale)}
                              </div>
                              <p className="text-xs text-text-secondary truncate">
                                {sale.customer_name || "Walk-in"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">
                                {formatCurrency(sale.total)}
                              </p>
                              <p className="text-[10px] text-text-secondary">
                                {formatDate(sale.created_at)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-accent transition-colors" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary text-center py-4 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" /> No invoices found for this period
                  </p>
                )}
              </div>
            )}

            {/* Selected Sale Detail */}
            {selectedSaleId &&
              (loadingSale ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : selectedSale ? (
                <div className="space-y-4">
                  {/* Invoice Header Card */}
                  <div className="rounded-lg border border-border bg-surface-2/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold">{selectedSale.id}</span>
                          {getStatusBadge(selectedSale)}
                        </div>
                        <p className="text-sm text-text-primary">
                          {selectedSale.customer_name || "Walk-in Customer"}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {formatDateTime(selectedSale.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSaleId("");
                          setReturnQtys({});
                        }}
                        className="text-xs text-text-secondary hover:text-danger transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>

                    {/* Invoice Totals */}
                    <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Subtotal</span>
                        <span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span>
                      </div>
                      {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-danger">
                          <span>Discount</span>
                          <span className="font-mono">
                            -{formatCurrency(selectedSale.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-1 border-t border-border">
                        <span>Total</span>
                        <span className="font-mono">{formatCurrency(selectedSale.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Status */}
                  {hasReturns && (
                    <div
                      className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${fullyReturned ? "border-danger/20 bg-danger/5 text-danger" : "border-accent/20 bg-accent/5 text-accent"}`}
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {fullyReturned
                        ? "This invoice has been fully returned. No items left to return."
                        : "This invoice has partial returns. You can return the remaining items."}
                    </div>
                  )}

                  {/* Items to Return */}
                  {selectedSale.items && selectedSale.items.length > 0 && !fullyReturned && (
                    <div>
                      <Label className="mb-2 block">Select Items to Return</Label>
                      <div className="border border-border rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr_60px_60px_80px_40px] gap-2 px-3 py-2 bg-surface-2 text-[10px] text-text-secondary uppercase tracking-wider font-medium">
                          <span>Product</span>
                          <span className="text-center">Bought</span>
                          <span className="text-center">Return</span>
                          <span className="text-right">Unit Price</span>
                          <span></span>
                        </div>
                        {/* Items */}
                        <div className="divide-y divide-border">
                          {selectedSale.items.map((item: SaleItem) => {
                            const returnedQty = item.returned_qty ?? 0;
                            const remaining = item.quantity - returnedQty;
                            const qty = returnQtys[item.product_id] || 0;
                            return (
                              <div
                                key={item.product_id}
                                className="grid grid-cols-[1fr_60px_60px_80px_40px] gap-2 items-center px-3 py-2.5 hover:bg-surface-2/50"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {item.product_name}
                                  </p>
                                  {returnedQty > 0 && (
                                    <p className="text-[10px] text-success">
                                      {returnedQty} already returned
                                    </p>
                                  )}
                                </div>
                                <div className="text-center">
                                  <span className="font-mono text-sm">{item.quantity}</span>
                                </div>
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    onClick={() =>
                                      setReturnQtys((prev) => ({
                                        ...prev,
                                        [item.product_id]: Math.max(
                                          0,
                                          (prev[item.product_id] || 0) - 1
                                        ),
                                      }))
                                    }
                                    className="h-6 w-6 rounded bg-surface-2 flex items-center justify-center hover:bg-border transition-colors"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-mono font-medium">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setReturnQtys((prev) => ({
                                        ...prev,
                                        [item.product_id]: Math.min(
                                          remaining,
                                          (prev[item.product_id] || 0) + 1
                                        ),
                                      }))
                                    }
                                    disabled={remaining <= 0}
                                    className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${remaining <= 0 ? "opacity-30 cursor-not-allowed bg-surface-2" : "bg-surface-2 hover:bg-border"}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-sm">
                                    {formatCurrency(item.unit_price)}
                                  </span>
                                </div>
                                <div>
                                  {qty > 0 && (
                                    <button
                                      onClick={() => {
                                        const next = { ...returnQtys };
                                        delete next[item.product_id];
                                        setReturnQtys(next);
                                      }}
                                      className="h-6 w-6 rounded bg-danger/10 flex items-center justify-center hover:bg-danger/20 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3 text-danger" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedSale.items && selectedSale.items.length === 0 && (
                    <p className="text-sm text-text-secondary text-center py-4">
                      No items found for this sale.
                    </p>
                  )}

                  {!fullyReturned && (
                    <>
                      <div>
                        <Label>Reason (optional)</Label>
                        <Input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g. Damaged, Expired, Wrong item"
                        />
                      </div>

                      {/* Refund Summary */}
                      {Object.values(returnQtys).some((q) => q > 0) &&
                        (() => {
                          const rawTotal = calcRawRefundAmount();
                          const calculatedRefund = calcRefundAmount();
                          const discountApplied = rawTotal - calculatedRefund;
                          const discountRatio =
                            selectedSale.subtotal > 0
                              ? selectedSale.discount / selectedSale.subtotal
                              : 0;
                          const hasDiscount = selectedSale.discount > 0;
                          const finalRefund = customRefundAmount
                            ? Number(customRefundAmount)
                            : calculatedRefund;
                          return (
                            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-text-secondary">Items Subtotal</span>
                                <span className="font-mono text-sm">
                                  {formatCurrency(rawTotal)}
                                </span>
                              </div>
                              {hasDiscount && discountApplied > 0 && (
                                <>
                                  <div className="flex items-center justify-between text-danger">
                                    <span className="text-sm">
                                      Discount ({(discountRatio * 100).toFixed(1)}%)
                                    </span>
                                    <span className="font-mono text-sm">
                                      -{formatCurrency(discountApplied)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                                    <span>
                                      Discount is distributed proportionally across returned items
                                    </span>
                                  </div>
                                </>
                              )}
                              <div className="pt-2 border-t border-danger/10">
                                {isEditingRefund ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-text-primary">
                                      Refund Amount
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-text-secondary">PKR</span>
                                      <input
                                        type="number"
                                        value={customRefundAmount}
                                        onChange={(e) => setCustomRefundAmount(e.target.value)}
                                        className="w-28 font-mono font-bold text-lg text-danger bg-transparent border-b-2 border-accent outline-none text-right"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => {
                                          setIsEditingRefund(false);
                                          setCustomRefundAmount("");
                                        }}
                                        className="text-[10px] text-accent hover:underline ml-1"
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center justify-between cursor-pointer hover:bg-danger/5 -mx-1 px-1 py-0.5 rounded transition-colors"
                                    onClick={() => {
                                      setCustomRefundAmount(String(calculatedRefund));
                                      setIsEditingRefund(true);
                                    }}
                                    title="Click to edit refund amount"
                                  >
                                    <span className="text-sm font-medium text-text-primary">
                                      Refund Amount
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono font-bold text-lg text-danger">
                                        {formatCurrency(finalRefund)}
                                      </span>
                                      <span className="text-[10px] text-text-secondary">
                                        (click to edit)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                    </>
                  )}

                  <Button
                    className="w-full"
                    disabled={!selectedSaleId || !Object.values(returnQtys).some((q) => q > 0)}
                    onClick={() => createMutation.mutate()}
                  >
                    {createMutation.isPending ? "Processing..." : "Process Return"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-danger text-center py-4 flex items-center justify-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Invoice not found
                </p>
              ))}

            {error && (
              <p className="text-sm text-danger flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Preview */}
      {showPrintPreview && pendingReturnData && pendingSale && (
        <PrintPreviewDialog
          open={showPrintPreview}
          onOpenChange={(v) => {
            setShowPrintPreview(v);
            if (!v) {
              setPendingReturnData(null);
              setPendingSale(null);
            }
          }}
          title="Return Receipt Preview"
          htmlGenerator={generateReturnHtml}
          onPrint={handlePrintReturn}
        />
      )}

      {/* Return Detail Dialog */}
      <Dialog
        open={!!selectedReturn}
        onOpenChange={(v) => {
          if (!v) setSelectedReturn(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-text-secondary">Sale ID:</span>{" "}
                  <span className="font-mono">{selectedReturn.sale_id}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Customer:</span>{" "}
                  <span>{selectedReturn.customer_name || "—"}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Date:</span>{" "}
                  <span>{formatDateTime(selectedReturn.created_at)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Refund:</span>{" "}
                  <span className="font-mono text-danger">
                    {formatCurrency(selectedReturn.refund_amount)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-text-secondary">Reason:</span>{" "}
                  <span>{selectedReturn.reason}</span>
                </div>
              </div>
              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div>
                  <Label className="mb-1 block">Items Returned</Label>
                  <div className="border border-border rounded-lg divide-y divide-border text-sm">
                    {selectedReturn.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span>
                          {item.product_name} × {item.quantity}
                        </span>
                        <span className="font-mono">{formatCurrency(item.refund_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
