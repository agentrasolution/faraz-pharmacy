import { useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, CreditCard, Lock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import { api } from "@/lib/api";
import type { Sale, Arrear, ArrearPayment } from "@/types";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customers.getById(id!),
    enabled: !!id,
  });

  const [expandedArrear, setExpandedArrear] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    targetId: string;
    amount: number | null;
  }>({ open: false, targetId: "", amount: null });
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const recordPayment = useMutation({
    mutationFn: ({
      arrearId,
      amount,
      password,
    }: {
      arrearId: string;
      amount: number;
      password: string;
    }) => api.arrears.recordPayment(arrearId, amount, password),
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setPayingId(null);
      setPaymentAmount("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const settleMutation = useMutation({
    mutationFn: ({ arrearId, password }: { arrearId: string; password: string }) =>
      api.arrears.settle(arrearId, password),
    onSuccess: () => {
      toast.success("Arrear settled");
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleAdminAction() {
    setPasswordError("");
    const { targetId, amount } = passwordDialog;
    if (amount != null) {
      recordPayment.mutate({ arrearId: targetId, amount, password: adminPassword });
    } else {
      settleMutation.mutate({ arrearId: targetId, password: adminPassword });
    }
    setPasswordDialog({ open: false, targetId: "", amount: null });
    setAdminPassword("");
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">Customer not found</p>
        <Button variant="link" onClick={() => navigate("/customers")}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const purchaseColumns = [
    {
      key: "date",
      header: "Date",
      cell: (s: Sale) => (
        <span className="font-mono text-xs text-text-secondary">{formatDate(s.created_at)}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (s: Sale) => <span className="text-text-secondary">{s.items?.length ?? 0} items</span>,
    },
    {
      key: "total",
      header: "Total",
      cell: (s: Sale) => <span className="font-mono font-medium">{formatCurrency(s.total)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      cell: (s: Sale) => <span className="font-mono">{formatCurrency(s.amount_paid)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (s: Sale) => <StatusBadge status={s.status} />,
      className: "text-center",
    },
  ];

  const paymentHistoryColumns = [
    {
      key: "date",
      header: "Payment Date",
      cell: (p: ArrearPayment) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDateTime(p.created_at)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (p: ArrearPayment) => (
        <span className="font-mono font-medium text-success">{formatCurrency(p.amount)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/customers")}
          className="rounded-xl h-9 px-3 gap-1.5 text-xs text-text-secondary hover:text-text-primary shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Button>
      </div>

      {/* Customer Header Profile Card */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#4A25E1] to-[#3612B8] flex items-center justify-center text-white font-bold text-xl shadow-md shadow-brand/20">
              {customer.name?.slice(0, 2).toUpperCase() || "CU"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-display font-bold text-text-primary tracking-tight">
                  {customer.name}
                </h1>
                {(customer.outstanding_arrear ?? 0) > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-danger/10 text-danger border border-danger/20">
                    Debt Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/20">
                    Clean Account
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-text-secondary">
                <span className="flex items-center gap-1.5 font-mono">
                  📞 {customer.phone || "No phone"}
                </span>
                {(customer.father_name || customer.father_phone) && (
                  <span>
                    Father: <span className="font-medium text-text-primary">{customer.father_name || "—"}</span>
                    {customer.father_phone ? ` (${customer.father_phone})` : ""}
                  </span>
                )}
                {customer.address && (
                  <span>
                    📍 {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Purchases"
          value={customer.total_purchases ?? customer.purchases?.length ?? 0}
          icon={<ShoppingBag className="h-5 w-5 text-brand" />}
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(
            customer.purchases?.reduce((s: number, p: Sale) => s + p.total, 0) ?? 0
          )}
          icon={<CreditCard className="h-5 w-5 text-[#4A25E1] dark:text-[#754BFB]" />}
        />
        <StatCard
          title="Outstanding Arrear"
          value={formatCurrency(customer.outstanding_arrear ?? 0)}
          icon={<CreditCard className="h-5 w-5 text-warning" />}
        />
      </div>

      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList className="bg-surface-2/80 p-1 rounded-2xl h-11 border border-border/60">
          <TabsTrigger value="purchases" className="rounded-xl px-5 text-xs font-semibold data-[state=active]:bg-surface data-[state=active]:text-brand data-[state=active]:shadow-xs">
            Purchase History
          </TabsTrigger>
          <TabsTrigger value="arrears" className="rounded-xl px-5 text-xs font-semibold data-[state=active]:bg-surface data-[state=active]:text-brand data-[state=active]:shadow-xs">
            Arrear History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="purchases">
          <div className="rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden">
            <DataTable
              columns={purchaseColumns}
              data={(customer.purchases ?? []) as Sale[]}
              keyExtractor={(s: Sale) => s.id}
            />
          </div>
        </TabsContent>
        <TabsContent value="arrears">
          <div className="rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-2/40">
                    {[
                      "Date",
                      "Total Bill",
                      "Paid",
                      "Balance",
                      "Status",
                      "Payments",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(customer.arrears ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-text-secondary py-12 text-xs">
                        No arrears recorded for this customer
                      </td>
                    </tr>
                  ) : (
                    (customer.arrears ?? []).map((a: Arrear) => (
                      <Fragment key={a.id}>
                        <tr className="hover:bg-brand/[0.02] transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">
                            {formatDate(a.created_at)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                            {formatCurrency(a.total_bill)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                            {formatCurrency(a.amount_paid)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-warning whitespace-nowrap">
                            {formatCurrency(a.balance_due)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={a.status} />
                          </td>
                          <td className="px-4 py-3">
                            {(a.payments?.length ?? 0) > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs rounded-lg"
                                onClick={() =>
                                  setExpandedArrear(expandedArrear === a.id ? null : a.id)
                                }
                              >
                                {expandedArrear === a.id ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                {a.payments?.length} payment
                                {(a.payments?.length ?? 0) > 1 ? "s" : ""}
                              </Button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {a.status === "pending" &&
                              (payingId === a.id ? (
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="h-8 w-24 text-xs font-mono rounded-lg"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    className="h-8 rounded-lg bg-gradient-to-r from-[#4A25E1] to-[#3612B8] text-white"
                                    disabled={!paymentAmount || recordPayment.isPending}
                                    onClick={() => {
                                      setPasswordDialog({
                                        open: true,
                                        targetId: a.id,
                                        amount: Number(paymentAmount),
                                      });
                                      setAdminPassword("");
                                    }}
                                  >
                                    Pay
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 rounded-lg"
                                    onClick={() => setPayingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-xl text-xs"
                                    onClick={() => setPayingId(a.id)}
                                  >
                                    Record Payment
                                  </Button>
                                  <button
                                    onClick={() => {
                                      setPasswordDialog({
                                        open: true,
                                        targetId: a.id,
                                        amount: null,
                                      });
                                      setAdminPassword("");
                                    }}
                                    className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-success hover:bg-success/10 transition-colors"
                                    title="Mark Settled"
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                          </td>
                        </tr>
                        {expandedArrear === a.id && (a.payments?.length ?? 0) > 0 && (
                          <tr className="bg-surface-2/40">
                            <td colSpan={7} className="px-5 py-3">
                              <div className="rounded-xl border border-border/70 overflow-hidden bg-surface">
                                <DataTable
                                  columns={paymentHistoryColumns}
                                  data={a.payments ?? []}
                                  keyExtractor={(p: ArrearPayment) => p.id}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={passwordDialog.open}
        onOpenChange={(o) => setPasswordDialog({ ...passwordDialog, open: o })}
      >
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold font-display">
              <Lock className="h-4 w-4 text-brand" />
              Admin Password Required
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your admin password to authorize this financial transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="h-10 rounded-xl"
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-xs text-danger font-medium bg-danger/10 p-2 rounded-lg">{passwordError}</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setPasswordDialog({ open: false, targetId: "", amount: null })}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-[#4A25E1] to-[#3612B8] text-white hover:from-[#3e1ed1] hover:to-[#2e0ea3]"
                onClick={handleAdminAction}
                disabled={!adminPassword}
              >
                {recordPayment.isPending || settleMutation.isPending ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
