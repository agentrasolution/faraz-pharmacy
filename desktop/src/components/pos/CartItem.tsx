import { Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface CartItemProps {
  item: { productId: string; productName: string; unitPrice: number; quantity: number; subtotal: number; packSize?: number };
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onIncrementBy: (productId: string, amount: number) => void;
  onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onIncrementBy, onRemove }: CartItemProps) {
  const packSize = item.packSize ?? 1;
  const quickBtns = [5, 10, 20];
  const packLabel = packSize > 1 ? `${packSize}/pack` : null;
  const [localQuantity, setLocalQuantity] = useState(item.quantity);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalQuantity(item.quantity);
  }, [item.quantity]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const quantity = value ? Math.max(1, parseInt(value, 10)) : 1;
    setLocalQuantity(quantity);
    onUpdateQuantity(item.productId, quantity);
  };

  const handleBlur = () => {
    const quantity = Math.max(1, localQuantity);
    setLocalQuantity(quantity);
    onUpdateQuantity(item.productId, quantity);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="group flex items-center gap-2.5 py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{item.productName}</p>
        <p className="text-[10px] text-text-secondary">{formatCurrency(item.unitPrice)} each{packLabel ? ` \u00b7 ${packLabel}` : ""}</p>
        <div className="flex items-center gap-1 mt-1.5">
          {quickBtns.map((n) => (
            <button
              key={n}
              onClick={() => onIncrementBy(item.productId, n)}
              className="h-5 px-1.5 rounded text-[9px] font-medium text-text-secondary bg-surface-2 hover:bg-border hover:text-text-primary transition-colors"
            >
              +{n}
            </button>
          ))}
          {packSize > 1 && (
            <button
              onClick={() => onIncrementBy(item.productId, packSize)}
              className="h-5 px-1.5 rounded text-[9px] font-medium text-accent bg-accent/10 hover:bg-accent/20 transition-colors flex items-center gap-0.5"
            >
              <Package className="h-2.5 w-2.5" />+Pack
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localQuantity}
          onChange={handleQuantityChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-12 h-6 rounded border border-border bg-surface text-center text-xs font-semibold font-mono tabular-nums text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Quantity"
        />
      </div>
      <div className="text-right min-w-[60px]">
        <p className="text-xs font-semibold font-mono tabular-nums">{formatCurrency(item.subtotal)}</p>
      </div>
      <button
        onClick={() => onRemove(item.productId)}
        className="h-6 w-6 rounded flex items-center justify-center text-text-secondary/40 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}