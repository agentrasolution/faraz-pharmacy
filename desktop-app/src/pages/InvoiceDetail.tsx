import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, Receipt, User, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";
import StatusBadge from "@/components/shared/StatusBadge";
import PrintPreviewDialog from "@/components/shared/PrintPreviewDialog";
import type { Sale, PrinterConfig } from "@/types";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => api.sales.getById(id!),
    enabled: !!id,
  });

  const generateReceiptHtml = useCallback(async (paperSize: string): Promise<string> => {
    if (!sale) return "";
    const printData = {
      ...sale,
      customer_total_arrears: 0,
      items: sale.items?.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })) || [],
    };
    const result = await window.generateReceiptHTML(printData, paperSize);
    return result.success ? result.html : "";
  }, [sale]);

  async function handlePrint(config: PrinterConfig) {
    if (!sale) return;
    const printData = {
      ...sale,
      customer_total_arrears: 0,
      items: sale.items?.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })) || [],
    };
    const result = await window.printReceipt(printData, config);
    if (!result.success) {
      throw new Error(result.error || "Print failed");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Receipt className="h-12 w-12 text-text-secondary/40" />
        <p className="text-sm text-text-secondary">Invoice not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Invoices
        </Button>
      </div>
    );
  }

  const itemCount = sale.items?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold text-text-primary tracking-tight">Invoice Detail</h1>
            <p className="text-xs text-text-secondary font-mono">{sale.id}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowPreview(true)} className="gap-1.5">
          <Printer className="h-3.5 w-3.5" />
          Print Receipt
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="text-sm font-medium text-text-primary">{formatDateTime(sale.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">Invoice ID</p>
                  <p className="text-sm font-mono text-text-primary">{sale.id}</p>
                </div>
                {sale.invoice_no && (
                  <div>
                    <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">Invoice No</p>
                    <p className="text-sm font-mono text-text-primary">{sale.invoice_no}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">Customer</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">{sale.customer_name || "Walk-in Customer"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">Status</p>
                  <StatusBadge status={sale.status} />
                </div>
                {sale.payment_method && (
                  <div>
                    <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">Payment Method</p>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-text-secondary" />
                      <p className="text-sm font-medium text-text-primary capitalize">{sale.payment_method}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">Items ({itemCount})</h3>
            </div>
            <div className="space-y-px">
              {(sale.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.product_name}</p>
                    <p className="text-[11px] text-text-secondary">
                      {item.quantity} &times; {formatCurrency(item.unit_price)}
                      {item.barcode && <span className="ml-2 font-mono">({item.barcode})</span>}
                    </p>
                  </div>
                  <span className="text-sm font-mono font-medium text-text-primary tabular-nums ml-3">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
              {(!sale.items || sale.items.length === 0) && (
                <p className="text-sm text-text-secondary text-center py-4">No items</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-mono text-text-primary tabular-nums">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Discount</span>
                  <span className="font-mono text-danger tabular-nums">&minus;{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                <span className="text-text-primary">Total</span>
                <span className="font-mono tabular-nums">{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Paid</span>
                <span className="font-mono text-success tabular-nums">{formatCurrency(sale.amount_paid)}</span>
              </div>
              {sale.change > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Change</span>
                  <span className="font-mono text-text-primary tabular-nums">{formatCurrency(sale.change)}</span>
                </div>
              )}
              {sale.status === "partial" && (
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-warning font-medium">Balance Due</span>
                  <span className="font-mono text-warning font-medium tabular-nums">
                    {formatCurrency(sale.total - sale.amount_paid)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showPreview && (
        <PrintPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          title="Invoice Receipt"
          htmlGenerator={generateReceiptHtml}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
