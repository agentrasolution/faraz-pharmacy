import { useRef } from "react";
import { Printer, CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { CustomerPaymentReceipt } from "@/types";

interface ArrearPaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: CustomerPaymentReceipt | null;
}

export default function ArrearPaymentReceiptDialog({
  open,
  onOpenChange,
  receipt,
}: ArrearPaymentReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  function handlePrint() {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${receipt?.receiptId}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              margin: 0;
              padding: 6px;
              line-height: 1.35;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .title { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; }
            .subtitle { font-size: 10px; margin-top: 2px; }
            .badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; font-weight: bold; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">FARAZ PHARMACY</div>
            <div class="subtitle">Complete Healthcare & Medical Store</div>
            <div class="subtitle">Phone: +92 300 0000000</div>
            <div class="divider"></div>
            <div class="bold" style="font-size: 13px;">KHATA PAYMENT VOUCHER</div>
            <div class="subtitle">Receipt #: ${receipt?.receiptId}</div>
            <div class="subtitle">Date: ${formatDateTime(receipt?.createdAt || new Date().toISOString())}</div>
          </div>
          
          <div class="divider"></div>
          <div><strong>Customer:</strong> ${receipt?.customerName}</div>
          ${receipt?.customerPhone ? `<div><strong>Phone:</strong> ${receipt.customerPhone}</div>` : ""}

          <div class="double-divider"></div>
          <div class="flex-between">
            <span>Previous Balance:</span>
            <span class="bold">PKR ${Number(receipt?.previousBalance || 0).toLocaleString()}</span>
          </div>
          <div class="flex-between" style="font-size: 13px; margin: 3px 0;">
            <span class="bold">Amount Paid (Received):</span>
            <span class="bold">PKR ${Number(receipt?.amountPaid || 0).toLocaleString()}</span>
          </div>
          <div class="divider"></div>
          <div class="flex-between" style="font-size: 13px;">
            <span class="bold">Remaining Balance Due:</span>
            <span class="bold">PKR ${Number(receipt?.remainingBalance || 0).toLocaleString()}</span>
          </div>
          <div class="double-divider"></div>

          <div class="center" style="margin-top: 8px;">
            <div class="badge">
              ${(receipt?.remainingBalance ?? 0) <= 0 ? "ACCOUNT FULLY CLEARED" : "PARTIAL PAYMENT RECEIVED"}
            </div>
            <div class="subtitle" style="margin-top: 6px;">Thank you for your payment!</div>
            <div class="subtitle">Computer generated voucher.</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const isCleared = receipt.remainingBalance <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-surface border border-border/80 shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>Payment receipt voucher for customer</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Payment Recorded Successfully</h2>
              <p className="text-[11px] text-text-secondary">Receipt #{receipt.receiptId}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 rounded-full text-text-secondary"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Printable Voucher Card */}
        <div
          ref={receiptRef}
          className="mt-4 p-5 rounded-2xl bg-surface-2/60 border border-border/80 font-mono text-xs space-y-3.5"
        >
          <div className="text-center pb-2 border-b border-dashed border-border">
            <p className="font-display font-bold text-sm tracking-tight text-text-primary">FARAZ PHARMACY</p>
            <p className="text-[10px] text-text-secondary">Khata / Arrears Payment Voucher</p>
            <p className="text-[10px] text-text-secondary mt-0.5">{formatDateTime(receipt.createdAt)}</p>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Customer:</span>
              <span className="font-bold text-text-primary font-sans">{receipt.customerName}</span>
            </div>
            {receipt.customerPhone && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Phone:</span>
                <span className="text-text-primary">{receipt.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary">Receipt No:</span>
              <span className="font-bold text-brand">{receipt.receiptId}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-border space-y-1.5">
            <div className="flex justify-between text-text-secondary">
              <span>Previous Balance:</span>
              <span>{formatCurrency(receipt.previousBalance)}</span>
            </div>
            <div className="flex justify-between text-success font-bold text-sm pt-0.5">
              <span>Amount Received:</span>
              <span>{formatCurrency(receipt.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-text-primary font-bold text-sm pt-1 border-t border-border">
              <span>Remaining Balance:</span>
              <span className={receipt.remainingBalance > 0 ? "text-warning" : "text-success"}>
                {formatCurrency(receipt.remainingBalance)}
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isCleared
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-warning/15 text-warning border border-warning/30"
              }`}
            >
              {isCleared ? "Account Fully Settled" : "Partial Payment Received"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-5">
          <Button
            onClick={handlePrint}
            variant="brand"
            className="flex-1 h-11 rounded-xl font-semibold gap-2 shadow-md cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="h-11 px-5 rounded-xl font-semibold cursor-pointer"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
