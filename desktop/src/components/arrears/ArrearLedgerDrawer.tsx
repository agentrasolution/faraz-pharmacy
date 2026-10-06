import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Phone,
  FileText,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Receipt,
  Printer,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CustomerPaymentReceipt, CustomerLedgerArrear, ArrearSaleItem } from "@/types";

interface ArrearLedgerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  onPaymentSuccess?: (receipt: CustomerPaymentReceipt) => void;
}

export default function ArrearLedgerDrawer({
  open,
  onOpenChange,
  customerId,
  onPaymentSuccess,
}: ArrearLedgerDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"invoices" | "payments">("invoices");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [paymentModeOpen, setPaymentModeOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["customer-ledger", customerId],
    queryFn: () => api.arrears.getCustomerLedger(customerId!),
    enabled: !!customerId && open,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ amount, password }: { amount: number; password: string }) =>
      api.arrears.recordCustomerPayment(customerId!, { amount, password }),
    onSuccess: (receipt) => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", customerId] });
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPaymentModeOpen(false);
      setPayAmount("");
      setAdminPassword("");
      setPasswordError("");
      onPaymentSuccess?.(receipt);
    },
    onError: (err: any) => {
      setPasswordError(err.message || "Failed to record payment");
      toast.error(err.message || "Failed to record payment");
    },
  });

  if (!open) return null;

  const customer = ledger?.customer;
  const stats = ledger?.stats || {
    total_bill: 0,
    amount_paid: 0,
    balance_due: 0,
    pending_invoices: 0,
    total_invoices: 0,
  };
  const arrears = ledger?.arrears || [];
  const payments = ledger?.payments || [];

  function handleQuickPayFull() {
    setPayAmount(String(stats.balance_due));
    setPaymentModeOpen(true);
  }

  function handleOpenCustomPay() {
    setPayAmount("");
    setPaymentModeOpen(true);
  }

  function handleSubmitPayment() {
    setPasswordError("");
    const num = Number(payAmount);
    if (!num || num <= 0) {
      setPasswordError("Please enter a valid amount");
      return;
    }
    if (num > stats.balance_due) {
      setPasswordError(`Amount cannot exceed pending balance of ${formatCurrency(stats.balance_due)}`);
      return;
    }
    if (!adminPassword.trim()) {
      setPasswordError("Please enter your admin password");
      return;
    }
    recordPaymentMutation.mutate({ amount: num, password: adminPassword });
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="relative w-full sm:w-[580px] md:w-[640px] max-w-full h-full bg-surface border-l border-border/80 shadow-2xl flex flex-col z-10"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-border/80 bg-surface shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bold text-base">
                {customer?.name ? customer.name.slice(0, 2).toUpperCase() : <User className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary tracking-tight">
                  {customer?.name || "Customer Ledger"}
                </h2>
                <p className="text-xs text-text-secondary flex items-center gap-1.5">
                  <span className="font-mono">{customer?.phone || "No phone"}</span>
                  {customer?.father_name && <span>• S/O {customer.father_name}</span>}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {/* Outstanding Balance Banner Card */}
                <div className="p-5 rounded-3xl bg-surface-2/70 border border-border/80 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                        Current Outstanding Balance
                      </p>
                      <p className="text-3xl font-display font-bold text-warning tracking-tight mt-1">
                        {formatCurrency(stats.balance_due)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        stats.balance_due <= 0
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-warning/10 text-warning border-warning/30"
                      }`}
                    >
                      {stats.balance_due <= 0 ? "Account Settled" : `${stats.pending_invoices} Pending Bills`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-text-secondary text-[11px] block">Total Incurred Credit</span>
                      <span className="font-mono font-semibold text-text-primary">
                        {formatCurrency(stats.total_bill)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary text-[11px] block">Total Amount Paid</span>
                      <span className="font-mono font-semibold text-success">
                        {formatCurrency(stats.amount_paid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary text-[11px] block">Total Invoices</span>
                      <span className="font-mono font-semibold text-text-primary">
                        {stats.total_invoices} Bills
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inline Payment Form (When Recording Payment) */}
                <AnimatePresence>
                  {paymentModeOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-5 rounded-3xl bg-brand/5 border border-brand/20 space-y-4 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-brand" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                            Record Payment / Receive Cash
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPaymentModeOpen(false)}
                          className="h-6 w-6 p-0 rounded-full text-text-secondary"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPayAmount(String(stats.balance_due))}
                            className="text-xs h-8 rounded-xl font-medium"
                          >
                            Full Balance ({formatCurrency(stats.balance_due)})
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPayAmount(String(Math.round(stats.balance_due / 2)))}
                            className="text-xs h-8 rounded-xl font-medium"
                          >
                            50% Partial ({formatCurrency(Math.round(stats.balance_due / 2))})
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Payment Amount (PKR) *</Label>
                            <Input
                              type="number"
                              min="1"
                              max={stats.balance_due}
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              placeholder={`Up to ${stats.balance_due}`}
                              className="font-mono font-bold text-sm h-10 rounded-xl"
                              autoFocus
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Admin Password *</Label>
                            <Input
                              type="password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="Enter password to verify"
                              className="text-sm h-10 rounded-xl"
                            />
                          </div>
                        </div>

                        {passwordError && (
                          <p className="text-xs font-medium text-danger flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" /> {passwordError}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="brand"
                            size="sm"
                            onClick={handleSubmitPayment}
                            disabled={recordPaymentMutation.isPending || !payAmount || !adminPassword}
                            className="flex-1 h-10 rounded-xl font-semibold cursor-pointer"
                          >
                            {recordPaymentMutation.isPending ? "Recording..." : `Confirm Payment: ${formatCurrency(Number(payAmount) || 0)}`}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentModeOpen(false)}
                            className="h-10 px-4 rounded-xl font-semibold"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tab Navigation: Invoices vs Payments */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-2/80 border border-border/80 w-fit">
                  <button
                    onClick={() => setActiveTab("invoices")}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "invoices"
                        ? "bg-surface text-text-primary shadow-xs font-bold"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Credit Bills ({arrears.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("payments")}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "payments"
                        ? "bg-surface text-text-primary shadow-xs font-bold"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Payment History ({payments.length})</span>
                  </button>
                </div>

                {/* Content: Credit Bills Tab */}
                {activeTab === "invoices" && (
                  <div className="space-y-3">
                    {arrears.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-2xl">
                        No credit bills recorded for this customer.
                      </div>
                    ) : (
                      arrears.map((arrear: CustomerLedgerArrear) => {
                        const isExpanded = expandedInvoiceId === arrear.id;
                        const items = arrear.sale?.items || [];
                        const isSettled = arrear.status === "settled" || arrear.balance_due <= 0;

                        return (
                          <div
                            key={arrear.id}
                            className="rounded-2xl border border-border/80 bg-surface hover:border-border transition-colors p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-brand">
                                    {arrear.sale_id || arrear.id.slice(0, 8)}
                                  </span>
                                  <StatusBadge status={arrear.status} />
                                </div>
                                <p className="text-[11px] text-text-secondary font-mono">
                                  {formatDateTime(arrear.created_at)}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] text-text-secondary block">Balance Due</span>
                                <span
                                  className={`font-mono font-bold text-sm ${
                                    isSettled ? "text-success" : "text-warning"
                                  }`}
                                >
                                  {formatCurrency(arrear.balance_due)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-surface-2/60 rounded-xl">
                              <div>
                                <span className="text-text-secondary text-[11px] block">Bill Amount:</span>
                                <span className="font-mono font-medium text-text-primary">
                                  {formatCurrency(arrear.total_bill)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-text-secondary text-[11px] block">Paid Towards Bill:</span>
                                <span className="font-mono font-medium text-success">
                                  {formatCurrency(arrear.amount_paid)}
                                </span>
                              </div>
                            </div>

                            {/* Collapsible Items Pill */}
                            {items.length > 0 && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setExpandedInvoiceId(isExpanded ? null : arrear.id)}
                                  className="w-full flex items-center justify-between p-2 px-2.5 rounded-xl text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <Package className="h-3.5 w-3.5 text-brand" />
                                    <span>Purchased Medicines ({items.length})</span>
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden mt-2 pt-2 border-t border-border/60"
                                    >
                                      <div className="space-y-1.5 text-xs">
                                        {items.map((item: ArrearSaleItem) => (
                                          <div
                                            key={item.id}
                                            className="flex items-center justify-between py-1 px-2 rounded-lg bg-surface-2/40 text-[11px]"
                                          >
                                            <div className="truncate pr-2">
                                              <span className="font-medium text-text-primary">
                                                {item.product_name}
                                              </span>
                                              <span className="text-text-secondary ml-1.5 font-mono">
                                                × {item.quantity}
                                              </span>
                                            </div>
                                            <span className="font-mono font-semibold text-text-primary shrink-0">
                                              {formatCurrency(item.subtotal)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Content: Payment History Tab */}
                {activeTab === "payments" && (
                  <div className="space-y-3">
                    {payments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-2xl">
                        No payments recorded yet.
                      </div>
                    ) : (
                      payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3.5 px-4 rounded-2xl border border-border/80 bg-surface text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              <span className="font-mono font-bold text-success">
                                +{formatCurrency(p.amount)}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary font-mono">
                              {formatDateTime(p.created_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {p.payment_sale_id && (
                              <span className="text-[10px] font-mono text-text-secondary px-2 py-0.5 rounded-md bg-surface-2">
                                Ref #{p.payment_sale_id}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onPaymentSuccess?.({
                                  receiptId: p.payment_sale_id || p.id,
                                  customerId: customer?.id || "",
                                  customerName: customer?.name || "",
                                  customerPhone: customer?.phone || "",
                                  previousBalance: stats.balance_due + p.amount,
                                  amountPaid: p.amount,
                                  remainingBalance: stats.balance_due,
                                  createdAt: p.created_at,
                                });
                              }}
                              className="h-8 px-2.5 rounded-xl text-xs text-text-secondary hover:text-brand"
                              title="Re-print voucher"
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" />
                              Print
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="p-4 px-6 border-t border-border/80 bg-surface/95 backdrop-blur-md shrink-0 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-text-secondary block">Pending Balance:</span>
              <span className="text-base font-display font-bold text-warning">
                {formatCurrency(stats.balance_due)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {stats.balance_due > 0 && !paymentModeOpen && (
                <Button
                  onClick={handleQuickPayFull}
                  variant="brand"
                  size="sm"
                  className="h-10 px-5 rounded-xl font-bold shadow-md cursor-pointer gap-1.5"
                >
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </Button>
              )}
              {stats.balance_due <= 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-success px-3 py-1.5 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-4 w-4" /> All Settled
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
