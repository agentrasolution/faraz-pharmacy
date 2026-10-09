import { useState, useRef, useEffect, useCallback } from "react";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/hooks/useMultiSale";

interface CartTableProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onRowFocus?: (productId: string) => void;
  onRowBlur?: () => void;
}

export default function CartTable({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onRowFocus,
  onRowBlur,
}: CartTableProps) {
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [stockWarningId, setStockWarningId] = useState<string | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement>>({});

  useEffect(() => {
    const newQuantities: Record<string, number> = {};
    items.forEach((item) => {
      newQuantities[item.productId] = item.quantity;
    });
    setLocalQuantities(newQuantities);
  }, [items]);

  const triggerStockWarning = useCallback((productId: string) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setStockWarningId(productId);
    warningTimerRef.current = setTimeout(() => {
      setStockWarningId(null);
    }, 1800);
  }, []);

  const handleIncrement = useCallback(
    (productId: string, stockQty: number) => {
      const current = localQuantities[productId] || 1;
      if (current >= stockQty) {
        triggerStockWarning(productId);
        return;
      }
      const next = current + 1;
      setLocalQuantities((prev) => ({ ...prev, [productId]: next }));
      onUpdateQuantity(productId, next);
    },
    [localQuantities, onUpdateQuantity, triggerStockWarning]
  );

  const handleDecrement = useCallback(
    (productId: string) => {
      const current = localQuantities[productId] || 1;
      if (current <= 1) return;
      const next = current - 1;
      setLocalQuantities((prev) => ({ ...prev, [productId]: next }));
      onUpdateQuantity(productId, next);
    },
    [localQuantities, onUpdateQuantity]
  );

  const handleQuantityInputChange = useCallback(
    (productId: string, value: string, stockQty: number) => {
      if (value === "") {
        setLocalQuantities((prev) => ({ ...prev, [productId]: 0 }));
        return;
      }
      const parsed = parseInt(value.replace(/\D/g, ""), 10);
      if (isNaN(parsed) || parsed < 1) {
        setLocalQuantities((prev) => ({ ...prev, [productId]: 1 }));
        onUpdateQuantity(productId, 1);
        return;
      }
      if (parsed > stockQty) {
        triggerStockWarning(productId);
        setLocalQuantities((prev) => ({ ...prev, [productId]: stockQty }));
        onUpdateQuantity(productId, stockQty);
        return;
      }
      setLocalQuantities((prev) => ({ ...prev, [productId]: parsed }));
      onUpdateQuantity(productId, parsed);
    },
    [onUpdateQuantity, triggerStockWarning]
  );

  const handleBlur = useCallback(
    (productId: string, stockQty: number) => {
      const currentVal = localQuantities[productId];
      const validVal = Math.min(stockQty, Math.max(1, currentVal || 1));
      setLocalQuantities((prev) => ({ ...prev, [productId]: validVal }));
      onUpdateQuantity(productId, validVal);
      setFocusedRowId(null);
      onRowBlur?.();
    },
    [localQuantities, onUpdateQuantity, onRowBlur]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, productId: string, stockQty: number) => {
      if (e.key === "Delete") {
        e.preventDefault();
        onRemoveItem(productId);
        setFocusedRowId(null);
        onRowBlur?.();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "+" || e.key === "ArrowUp") {
        e.preventDefault();
        handleIncrement(productId, stockQty);
        return;
      }
      if (e.key === "-" || e.key === "ArrowDown") {
        e.preventDefault();
        handleDecrement(productId);
        return;
      }
    },
    [handleIncrement, handleDecrement, onRemoveItem, onRowBlur]
  );

  if (items.length === 0) return null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs" role="grid">
          <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur-xs border-b border-border/70">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-text-secondary uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-2.5 text-right font-semibold text-text-secondary uppercase tracking-wider w-24">
                Price
              </th>
              <th className="px-4 py-2.5 text-center font-semibold text-text-secondary uppercase tracking-wider w-36">
                Qty
              </th>
              <th className="px-4 py-2.5 text-right font-semibold text-text-secondary uppercase tracking-wider w-32">
                Line Total
              </th>
              <th className="w-10 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.map((item) => {
              const isWarning = stockWarningId === item.productId;
              const isFocused = focusedRowId === item.productId;
              const currentQty = localQuantities[item.productId] ?? item.quantity;
              const lineTotal = currentQty * item.unitPrice;

              return (
                <tr
                  key={item.productId}
                  ref={(el) => {
                    if (el) rowRefs.current[item.productId] = el;
                  }}
                  tabIndex={0}
                  onFocus={() => {
                    setFocusedRowId(item.productId);
                    onRowFocus?.(item.productId);
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setFocusedRowId(null);
                      onRowBlur?.();
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, item.productId, item.stockQty)}
                  className={`
                    transition-all duration-150 outline-none
                    ${isWarning ? "bg-danger/10 ring-2 ring-danger/50" : isFocused ? "bg-accent/5 ring-1 ring-accent/30" : "hover:bg-surface-2/40"}
                  `}
                >
                  {/* Item Name */}
                  <td className="px-4 py-3 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-text-primary text-sm tracking-tight truncate">
                        {item.productName}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-secondary">
                        <span className="font-mono text-text-secondary/70">
                          Stock: {item.stockQty}
                        </span>
                        {item.batchNumber && (
                          <>
                            <span className="text-text-secondary/30">•</span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded font-mono text-[10px] font-medium bg-brand/10 text-brand">
                              Batch {item.batchNumber}
                              {item.expiry ? ` (${item.expiry.slice(0, 7)})` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Unit Price */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs font-semibold tabular-nums text-text-secondary">
                      {formatCurrency(item.unitPrice)}
                    </span>
                  </td>

                  {/* Qty with - / + controls */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="inline-flex items-center rounded-xl border border-border bg-surface-2 p-0.5 shadow-2xs">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => handleDecrement(item.productId)}
                          disabled={currentQty <= 1}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Decrease quantity (-)"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={currentQty === 0 ? "" : currentQty}
                          onChange={(e) =>
                            handleQuantityInputChange(item.productId, e.target.value, item.stockQty)
                          }
                          onBlur={() => handleBlur(item.productId, item.stockQty)}
                          onKeyDown={(e) => handleKeyDown(e, item.productId, item.stockQty)}
                          className="w-12 h-7 bg-transparent text-center text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent rounded-md"
                          aria-label={`Quantity for ${item.productName}`}
                          maxLength={4}
                        />

                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => handleIncrement(item.productId, item.stockQty)}
                          disabled={currentQty >= item.stockQty}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Increase quantity (+)"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Stock ceiling warning indicator */}
                      {isWarning && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-danger animate-pulse">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>Max stock ({item.stockQty})</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Line Total */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm font-bold tabular-nums text-text-primary">
                      {formatCurrency(lineTotal)}
                    </span>
                  </td>

                  {/* Delete button */}
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => onRemoveItem(item.productId)}
                      className="p-1 rounded-lg text-text-secondary/50 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      title="Remove item (Delete key)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
