import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Package,
  Building2,
  Tag,
  MapPin,
  Barcode,
  Calendar,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Warehouse,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import PrintBarcodeDialog from "@/components/shared/PrintBarcodeDialog";
import type { Product, ProductBatch } from "@/types";

interface ProductDetailDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onNavigateToProducts?: () => void;
}

export default function ProductDetailDrawer({
  product,
  open,
  onClose,
  onNavigateToProducts,
}: ProductDetailDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !printOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, printOpen, onClose]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Fetch real-time active batches for this product
  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ["product-batches", product?.id],
    queryFn: () => (product?.id ? api.batches.listByProduct(product.id) : Promise.resolve([])),
    enabled: !!product?.id && open,
  });

  const handleCopyBarcode = () => {
    if (!product?.barcode) return;
    navigator.clipboard.writeText(product.barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open || !product) return null;

  const stockQty = Number(product.stock_qty ?? 0);
  const isOutOfStock = stockQty <= 0;
  const isLowStock = stockQty > 0 && stockQty < 10;
  const isGoodStock = stockQty >= 10;

  const salePrice = Number(product.sale_price ?? 0);
  const purchasePrice = Number(product.purchase_price ?? 0);
  const marginPercent =
    salePrice > 0 ? Math.round(((salePrice - purchasePrice) / salePrice) * 100) : 0;

  const drawerContent = (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      {/* Slide-over panel */}
      <motion.aside
        initial={{ x: "100%", opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-lg h-full bg-background border-l border-border/80 shadow-2xl flex flex-col overflow-hidden text-text-primary"
      >
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-border/70 bg-surface/80 backdrop-blur-md flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20">
                Product Dossier
              </span>
              {product.category && (
                <span className="text-[11px] font-medium text-text-secondary bg-surface-2 px-2 py-0.5 rounded-md border border-border/60">
                  {product.category}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold font-display tracking-tight text-text-primary line-clamp-2">
              {product.name}
            </h2>
            {product.company && (
              <p className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                <span>{product.company}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors border border-border/60 shrink-0 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Stock & Availability Hero Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isOutOfStock
                ? "bg-danger/5 border-danger/25 text-danger"
                : isLowStock
                ? "bg-warning/5 border-warning/25 text-warning"
                : "bg-success/5 border-success/25 text-success"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <AlertTriangle className="h-5 w-5 text-danger" />
                ) : isLowStock ? (
                  <Clock className="h-5 w-5 text-warning" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                )}
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider block">
                    {isOutOfStock
                      ? "Out of Stock"
                      : isLowStock
                      ? "Low Stock Alert"
                      : "Available in Stock"}
                  </span>
                  <div className="text-2xl font-extrabold tracking-tight font-display mt-0.5">
                    {stockQty}{" "}
                    <span className="text-sm font-medium text-text-secondary">units remaining</span>
                  </div>
                </div>
              </div>

              {/* Shelf / Rack Location Tag */}
              <div className="text-right pl-3 border-l border-border/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                  Shop Location
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-text-primary">
                  <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>{product.location?.trim() || "Unassigned"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode & Identification Section */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-surface flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0">
                <Barcode className="h-4 w-4 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider block">
                  Barcode Number
                </span>
                <span className="font-mono text-xs font-bold text-text-primary tracking-wider truncate block">
                  {product.barcode || "No barcode"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBarcode}
              className="h-7 text-xs gap-1.5 rounded-lg border-border shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-success font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-text-secondary" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Pricing & Commercials Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-display">
              <Coins className="h-3.5 w-3.5 text-brand" />
              Pricing & Margins
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl border border-border bg-surface shadow-2xs">
                <span className="text-[10px] font-medium text-text-secondary block">
                  Retail Price (MRP)
                </span>
                <span className="text-base font-bold text-text-primary font-display mt-0.5 block">
                  {formatCurrency(salePrice)}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-border bg-surface shadow-2xs">
                <span className="text-[10px] font-medium text-text-secondary block">
                  Purchase (Cost)
                </span>
                <span className="text-base font-bold text-text-secondary font-display mt-0.5 block">
                  {formatCurrency(purchasePrice)}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-border bg-surface shadow-2xs">
                <span className="text-[10px] font-medium text-text-secondary block">
                  Profit Margin
                </span>
                <span className="text-base font-bold text-success font-display mt-0.5 block">
                  +{marginPercent}%
                </span>
              </div>
            </div>

            {/* Custom Multi-tier pricing if available */}
            {product.prices && product.prices.length > 0 && (
              <div className="mt-2 p-3 rounded-xl border border-border/70 bg-surface-2/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                  Packaging Price Tiers
                </span>
                <div className="space-y-1">
                  {product.prices.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="font-medium text-text-primary">{p.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-text-secondary font-mono text-[11px]">
                          Cost: {formatCurrency(p.purchasePrice)}
                        </span>
                        <span className="font-bold text-text-primary font-mono">
                          {formatCurrency(p.salePrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Batches & FEFO Expiry Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-display">
                <Layers className="h-3.5 w-3.5 text-brand" />
                Active Batches & FEFO Expiry
              </h3>
              <span className="text-[11px] font-medium text-text-secondary">
                {batches.length} {batches.length === 1 ? "batch" : "batches"} on file
              </span>
            </div>

            {loadingBatches ? (
              <div className="p-4 rounded-xl border border-border bg-surface text-center text-xs text-text-secondary">
                Loading batch data...
              </div>
            ) : batches.length === 0 ? (
              <div className="p-4 rounded-xl border border-border/80 bg-surface text-center space-y-1">
                <p className="text-xs font-medium text-text-secondary">
                  No individual active batches registered.
                </p>
                <p className="text-[11px] text-text-secondary/80">
                  Stock is tracked as a unified inventory pool.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border/60 shadow-2xs">
                {batches.map((b: ProductBatch) => {
                  const expiryStr = b.expiry_date || "—";
                  const isBatchExpiringSoon = (() => {
                    if (!b.expiry_date) return false;
                    const diffDays =
                      (new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    return diffDays < 90 && diffDays > 0;
                  })();
                  const isBatchExpired = (() => {
                    if (!b.expiry_date) return false;
                    return new Date(b.expiry_date).getTime() < Date.now();
                  })();

                  return (
                    <div
                      key={b.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-surface-2/40 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-text-primary">
                            #{b.batch_number}
                          </span>
                          {b.distributor?.name && (
                            <span className="text-[10px] text-text-secondary truncate max-w-[140px]">
                              ({b.distributor.name})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="h-3 w-3 text-text-secondary shrink-0" />
                          <span
                            className={
                              isBatchExpired
                                ? "text-danger font-semibold"
                                : isBatchExpiringSoon
                                ? "text-warning font-semibold"
                                : "text-text-secondary"
                            }
                          >
                            Exp: {expiryStr}
                            {isBatchExpired ? " (Expired)" : isBatchExpiringSoon ? " (Soon)" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-text-primary block">
                          {b.quantity} units
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          of {b.initial_qty} initial
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border/80 bg-surface/90 backdrop-blur-md flex items-center gap-2.5">
          <Button
            onClick={() => setPrintOpen(true)}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#4A25E1] to-[#3612B8] text-white hover:from-[#3e1ed1] hover:to-[#2e0ea3] shadow-md shadow-brand/20 font-medium text-xs gap-1.5 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Barcode</span>
          </Button>

          {onNavigateToProducts && (
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onNavigateToProducts();
              }}
              className="h-10 px-4 rounded-xl text-xs gap-1.5 border-border hover:bg-surface-2 cursor-pointer font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5 text-text-secondary" />
              <span>Full Catalog</span>
            </Button>
          )}
        </div>
      </motion.aside>

      {/* Barcode Print Dialog Pre-wired with this product */}
      <PrintBarcodeDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        barcode={product.barcode}
        productName={product.name}
      />
    </div>
  );

  return createPortal(drawerContent, document.body);
}
