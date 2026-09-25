import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const lowStock = product.stock_qty <= 5;
  const outOfStock = product.stock_qty === 0;

  return (
    <motion.button
      whileHover={outOfStock ? undefined : { y: -2, scale: 1.01 }}
      whileTap={outOfStock ? undefined : { scale: 0.98 }}
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={`w-full text-left rounded-2xl border bg-surface p-4 relative transition-all duration-200 shadow-xs group ${
        outOfStock
          ? "border-danger/20 opacity-50 cursor-not-allowed"
          : "border-border/80 hover:border-[#4A25E1]/40 hover:shadow-md cursor-pointer"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              outOfStock ? "bg-danger" : lowStock ? "bg-warning" : "bg-success"
            }`}
          />
          <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">
            {outOfStock ? "OUT OF STOCK" : lowStock ? `Only ${product.stock_qty} left` : `${product.stock_qty} in stock`}
          </span>
        </div>
        <div className="h-6 w-6 rounded-lg bg-surface-2 group-hover:bg-[#4A25E1] group-hover:text-white flex items-center justify-center text-text-secondary transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </div>
      </div>

      <h3 className="font-display font-bold text-sm text-text-primary leading-tight group-hover:text-[#4A25E1] dark:group-hover:text-[#754BFB] transition-colors truncate">
        {product.name}
      </h3>
      <p className="text-[11px] text-text-secondary mt-0.5 truncate">{product.company || "General"}</p>

      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
        <span className="font-mono font-bold text-sm text-text-primary tabular-nums">
          {formatCurrency(product.sale_price)}
        </span>
        {product.barcode && (
          <span className="text-[10px] font-mono text-text-secondary/60 truncate max-w-[100px]">
            {product.barcode}
          </span>
        )}
      </div>
    </motion.button>
  );
}
