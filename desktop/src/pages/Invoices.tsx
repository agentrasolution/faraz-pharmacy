import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, Calendar, Printer, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import ExportButton from "@/components/shared/ExportButton";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { useModuleShortcuts } from "@/hooks/useModuleShortcuts";
import StatusBadge from "@/components/shared/StatusBadge";
import PrintPreviewDialog from "@/components/shared/PrintPreviewDialog";
import type { Sale, PrinterConfig } from "@/types";

export default function Invoices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [showProfitId, setShowProfitId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const debouncedSearch = useDebounce(search, 300);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["invoices", page, limit, debouncedSearch, dateFrom, dateTo],
    queryFn: () =>
      api.sales.listPaginated({
        search: debouncedSearch || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit,
      }),
  });

  const sales = paginatedData?.data || [];
  const meta = paginatedData?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  const exportData = useCallback(() => {
    const headers = [
      "Sale ID",
      "Date",
      "Customer",
      "Items",
      "Subtotal",
      "Discount",
      "Total",
      "Paid",
      "Change",
      "Status",
    ];
    return sales.map((s: Sale) => [
      s.id,
      s.created_at,
      s.customer_name || "Walk-in",
      s.items?.length ?? 0,
      s.subtotal,
      s.discount,
      s.total,
      s.amount_paid,
      s.change,
      s.status,
    ]);
  }, [sales]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "Sale ID",
      "Date",
      "Customer",
      "Items",
      "Subtotal",
      "Discount",
      "Total",
      "Paid",
      "Change",
      "Status",
    ];
    downloadCSV(`invoices_${dateFrom || "all"}_${dateTo || "all"}.csv`, headers, exportData());
  }, [exportData, dateFrom, dateTo]);

  const handleExportPDF = useCallback(() => {
    const headers = [
      "Sale ID",
      "Date",
      "Customer",
      "Items",
      "Subtotal",
      "Discount",
      "Total",
      "Paid",
      "Change",
      "Status",
    ];
    downloadPDF(
      `invoices_${dateFrom || "all"}_${dateTo || "all"}.pdf`,
      "Invoices & Billing",
      headers,
      exportData()
    );
  }, [exportData, dateFrom, dateTo]);

  const { searchRef } = useModuleShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onExportPDF: handleExportPDF,
    onExportCSV: handleExportCSV,
  });

  function handleQuickPrint(sale: Sale, e: React.MouseEvent) {
    e.stopPropagation();
    setPrintSale(sale);
  }

  const generateReceiptHtml = useCallback(
    async (paperSize: string): Promise<string> => {
      if (!printSale) return "";
      const printData = {
        ...printSale,
        customer_total_arrears: 0,
        items:
          printSale.items?.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            subtotal: i.subtotal,
          })) || [],
      };
      const result = await window.generateReceiptHTML(printData, paperSize);
      return result.success ? result.html : "";
    },
    [printSale]
  );

  async function handlePrint(config: PrinterConfig) {
    if (!printSale) return;
    const printData = {
      ...printSale,
      customer_total_arrears: 0,
      items:
        printSale.items?.map((i) => ({
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

  const columns = [
    {
      key: "created_at",
      header: "Date",
      cell: (s: Sale) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDateTime(s.created_at)}
        </span>
      ),
    },
    {
      key: "id",
      header: "Invoice ID",
      cell: (s: Sale) => (
        <span className="font-mono text-xs text-text-secondary">{s.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: "customer_name",
      header: "Customer",
      cell: (s: Sale) => <span>{s.customer_name || "Walk-in"}</span>,
    },
    {
      key: "items",
      header: "Items",
      cell: (s: Sale) => (
        <span className="font-mono text-sm">{(s as any).item_count ?? s.items?.length ?? 0}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (s: Sale) => <span className="font-mono font-medium">{formatCurrency(s.total)}</span>,
    },
    {
      key: "amount_paid",
      header: "Paid",
      cell: (s: Sale) => <span className="font-mono">{formatCurrency(s.amount_paid)}</span>,
    },
    {
      key: "profit",
      header: "Profit",
      cell: (s: Sale) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowProfitId(showProfitId === s.id ? null : s.id);
          }}
          className={`font-mono font-medium cursor-pointer hover:underline ${(s.profit ?? 0) >= 0 ? "text-success" : "text-danger"}`}
        >
          {showProfitId === s.id ? formatCurrency(s.profit ?? 0) : "••••"}
        </button>
      ),
    },
    { key: "status", header: "Status", cell: (s: Sale) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: "",
      cell: (s: Sale) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/invoices/${s.id}`);
            }}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors"
            title="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => handleQuickPrint(s, e)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors"
            title="Print Receipt"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Invoices & Billing" description="View and export all sales invoices" />
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              ref={searchRef}
              autoFocus
              placeholder="Search by invoice ID or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
          />
          <span className="text-text-secondary text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
          />
        </div>
        <ExportButton type="csv" onClick={handleExportCSV} disabled={sales.length === 0} />
        <ExportButton type="pdf" onClick={handleExportPDF} disabled={sales.length === 0} />
      </div>
      <div className="rounded-xl border border-border">
        <DataTable
          columns={columns}
          data={sales}
          loading={isLoading}
          keyExtractor={(s: Sale) => s.id}
          onRowClick={(s: Sale) => navigate(`/invoices/${s.id}`)}
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

      {printSale && (
        <PrintPreviewDialog
          open={!!printSale}
          onOpenChange={(v) => {
            if (!v) setPrintSale(null);
          }}
          title="Invoice Receipt"
          htmlGenerator={generateReceiptHtml}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
