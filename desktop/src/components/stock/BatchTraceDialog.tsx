import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  Building2,
  Receipt,
  User,
  ArrowRight,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";

interface BatchTraceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBatchNumber?: string;
}

export default function BatchTraceDialog({
  open,
  onOpenChange,
  initialBatchNumber = "",
}: BatchTraceDialogProps) {
  const [activeTab, setActiveTab] = useState<"trace" | "expiring">("trace");
  const [searchQuery, setSearchQuery] = useState(initialBatchNumber);
  const [expiringDays, setExpiringDays] = useState<number>(60);

  // Trace query
  const {
    data: traceResults,
    isLoading: isTracing,
    refetch: executeTrace,
  } = useQuery({
    queryKey: ["batch-trace", searchQuery],
    queryFn: () => api.batches.trace(searchQuery.trim()),
    enabled: open && activeTab === "trace" && !!searchQuery.trim(),
  });

  // Expiring query
  const { data: expiringBatches, isLoading: isExpiringLoading } = useQuery({
    queryKey: ["batches-expiring", expiringDays],
    queryFn: () => api.batches.listExpiring(expiringDays),
    enabled: open && activeTab === "expiring",
  });

  const batches = Array.isArray(traceResults) ? traceResults : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-bold text-text-primary">
                  Batch Audit & Expiry Intelligence
                </DialogTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Trace drug lots, view dispensing history for recalls, and track expiring consignments
                </p>
              </div>
            </div>
          </div>

          {/* Tab switch */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("trace")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "trace"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary"
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Trace & Recall Audit
            </button>
            <button
              onClick={() => setActiveTab("expiring")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "expiring"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Near-Expiry Batches
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "trace" ? (
            <div className="space-y-6">
              {/* Search input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    placeholder="Enter Batch Number (e.g. LOT-34234, B-991)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") executeTrace();
                    }}
                    className="pl-10 h-10 rounded-xl font-mono text-xs"
                  />
                </div>
                <Button
                  onClick={() => executeTrace()}
                  disabled={!searchQuery.trim() || isTracing}
                  className="rounded-xl h-10 px-4 text-xs font-semibold"
                >
                  Trace Batch
                </Button>
              </div>

              {isTracing && (
                <div className="py-12 text-center text-xs text-text-secondary">
                  Searching lot records across all inward consignments and patient sales...
                </div>
              )}

              {!isTracing && searchQuery.trim() && batches.length === 0 && (
                <div className="py-12 text-center">
                  <Package className="h-10 w-10 text-text-secondary/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-text-primary">No Batch Found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    No inward consignments or sales match batch number &ldquo;{searchQuery}&rdquo;.
                  </p>
                </div>
              )}

              {/* Batches details */}
              {batches.map((batch: any) => {
                const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                const totalSold = (batch.saleItems || []).reduce(
                  (sum: number, i: any) => sum + (i.quantity || 0),
                  0
                );

                return (
                  <div
                    key={batch.id}
                    className="rounded-2xl border border-border/80 bg-surface overflow-hidden shadow-xs space-y-5 p-5"
                  >
                    {/* Header summary */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white bg-brand px-2 py-0.5 rounded-lg">
                            {batch.batchNumber}
                          </span>
                          {isExpired ? (
                            <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> EXPIRED LOT
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-lg">
                              Active Stock
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-display font-bold text-text-primary mt-2">
                          {batch.product?.name || "Product"}
                        </h3>
                        {batch.product?.barcode && (
                          <p className="font-mono text-[11px] text-text-secondary">
                            Barcode: {batch.product.barcode}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-right">
                        <div>
                          <p className="text-[10px] font-semibold text-text-secondary uppercase">
                            Remaining Qty
                          </p>
                          <p className="text-sm font-mono font-bold text-text-primary mt-0.5">
                            {batch.quantity}{" "}
                            <span className="text-[10px] text-text-secondary font-normal">
                              / {batch.initialQty} init
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-text-secondary uppercase">
                            Expiry Date
                          </p>
                          <p
                            className={cn(
                              "text-sm font-mono font-bold mt-0.5",
                              isExpired ? "text-danger" : "text-text-primary"
                            )}
                          >
                            {batch.expiryDate ? formatDate(batch.expiryDate) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-text-secondary uppercase">
                            Distributor
                          </p>
                          <p className="text-xs font-semibold text-text-primary mt-0.5 truncate max-w-[120px]">
                            {batch.distributor?.name || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inward Consignments */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                        <Building2 className="h-3.5 w-3.5 text-brand" />
                        <span>Inward Deliveries & Purchase History ({batch.stockPurchases?.length || 0})</span>
                      </div>
                      {batch.stockPurchases && batch.stockPurchases.length > 0 ? (
                        <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40 text-xs">
                          {batch.stockPurchases.map((sp: any) => (
                            <div
                              key={sp.id}
                              className="p-2.5 flex items-center justify-between hover:bg-surface-2 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Receipt className="h-3.5 w-3.5 text-text-secondary" />
                                <div>
                                  <span className="font-semibold text-text-primary">
                                    Invoice: {sp.invoiceNumber || "N/A"}
                                  </span>
                                  <span className="text-text-secondary ml-2">
                                    ({sp.distributor?.name || "Direct Supplier"})
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 font-mono text-[11px]">
                                <span className="font-semibold text-text-primary">
                                  +{sp.quantity} units
                                </span>
                                <span className="text-text-secondary">
                                  {formatDate(sp.createdAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary italic">No purchase records found.</p>
                      )}
                    </div>

                    {/* Dispensed Sales / Patient Recall Trail */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-brand" />
                          <span>Dispensed to Patients & Invoices ({totalSold} units dispensed)</span>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-danger font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> DRAP Recall Audit
                          </span>
                        )}
                      </div>
                      {batch.saleItems && batch.saleItems.length > 0 ? (
                        <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40 text-xs max-h-56 overflow-y-auto">
                          {batch.saleItems.map((si: any) => (
                            <div
                              key={si.id}
                              className="p-2.5 flex items-center justify-between hover:bg-surface-2 transition-colors"
                            >
                              <div>
                                <p className="font-semibold text-text-primary flex items-center gap-1.5">
                                  <span>{si.sale?.customer?.name || "Walk-in Customer"}</span>
                                  {si.sale?.customer?.phone && (
                                    <span className="text-text-secondary font-mono text-[11px]">
                                      ({si.sale.customer.phone})
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-text-secondary font-mono">
                                  Invoice #{si.sale?.id?.slice(0, 8)} &bull;{" "}
                                  {formatDateTime(si.sale?.createdAt)}
                                </p>
                              </div>
                              <div className="text-right font-mono text-[11px]">
                                <p className="font-bold text-text-primary">
                                  {si.quantity} units &times; {formatCurrency(si.unitPrice)}
                                </p>
                                <p className="text-text-secondary">{formatCurrency(si.subtotal)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary italic">
                          No units have been dispensed from this batch yet.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Expiring Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  Showing active batches with stock remaining that expire soonest
                </p>
                <div className="flex items-center gap-1.5">
                  {[30, 60, 90, 180].map((d) => (
                    <button
                      key={d}
                      onClick={() => setExpiringDays(d)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                        expiringDays === d
                          ? "bg-brand text-white font-bold"
                          : "bg-surface-2 text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              {isExpiringLoading && (
                <div className="py-12 text-center text-xs text-text-secondary">
                  Scanning active inventory lots...
                </div>
              )}

              {!isExpiringLoading && (!expiringBatches || expiringBatches.length === 0) && (
                <div className="py-12 text-center">
                  <Clock className="h-10 w-10 text-success/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-text-primary">No Near-Expiry Lots</p>
                  <p className="text-xs text-text-secondary mt-1">
                    All current active inventory expires beyond {expiringDays} days.
                  </p>
                </div>
              )}

              {expiringBatches && expiringBatches.length > 0 && (
                <div className="border border-border/80 rounded-2xl overflow-hidden divide-y divide-border/40 text-xs">
                  {expiringBatches.map((b: any) => {
                    const daysLeft = Math.ceil(
                      (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysLeft <= 30;

                    return (
                      <div
                        key={b.id}
                        className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-surface-2 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary text-sm">
                              {b.product?.name}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-brand bg-brand/10 px-1.5 py-0.2 rounded">
                              {b.batchNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary flex items-center gap-3">
                            {b.product?.barcode && <span>Barcode: {b.product.barcode}</span>}
                            {b.distributor?.name && <span>Distributor: {b.distributor.name}</span>}
                            {b.product?.location && <span>Shelf: {b.product.location}</span>}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-mono font-bold text-text-primary">
                              {b.quantity} in stock
                            </p>
                            <p className="text-[10px] text-text-secondary font-mono">
                              Exp: {formatDate(b.expiryDate)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-xl font-bold font-mono text-[11px]",
                              isUrgent
                                ? "bg-danger/10 text-danger border border-danger/20"
                                : "bg-warning/10 text-warning border border-warning/20"
                            )}
                          >
                            {daysLeft <= 0 ? "EXPIRED" : `${daysLeft}d left`}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSearchQuery(b.batchNumber);
                              setActiveTab("trace");
                            }}
                            className="h-8 px-2 text-xs text-brand hover:text-brand"
                            title="Trace this batch"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
