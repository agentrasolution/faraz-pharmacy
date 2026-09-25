import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, Clock, Package, Search, XCircle } from "lucide-react";
import KPICard from "@/components/reports/KPICard";
import ExportButtons from "@/components/reports/ExportButtons";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { generatePDF } from "@/lib/pdfExport";
import { downloadExcelFile } from "@/lib/excelExport";
import type { Product } from "@/types";

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ExpiryFilter = "all" | "expired" | "30days" | "90days" | "180days" | "no_expiry";

const LOW_STOCK_THRESHOLD = 5;

function getStockStatus(product: Product): "in_stock" | "low_stock" | "out_of_stock" {
  if (product.stock_qty <= 0) return "out_of_stock";
  if (product.stock_qty <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

function getDaysUntilExpiry(expiry?: string | null): number | null {
  if (!expiry) return null;

  const [year, month, day] = expiry.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  const expiryDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((expiryDate.getTime() - today.getTime()) / 86400000);
}

function formatExpiryDate(expiry?: string | null): string {
  if (!expiry) return "—";

  const [year, month, day] = expiry.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";

  return new Date(year, month - 1, day).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getExpiryStatus(days: number | null): { label: string; className: string; dot: string } {
  if (days === null) {
    return {
      label: "No expiry",
      className: "bg-surface-2 text-text-secondary",
      dot: "bg-text-secondary/40",
    };
  }
  if (days <= 0)
    return { label: "Expired", className: "bg-danger/10 text-danger", dot: "bg-danger" };
  if (days <= 7)
    return { label: "Critical", className: "bg-danger/10 text-danger", dot: "bg-danger" };
  if (days <= 30)
    return { label: "Warning", className: "bg-warning/10 text-warning", dot: "bg-warning" };
  if (days <= 90)
    return { label: "Caution", className: "bg-accent/10 text-accent", dot: "bg-accent" };
  return { label: "Safe", className: "bg-success/10 text-success", dot: "bg-success" };
}

function matchesExpiryFilter(days: number | null, filter: ExpiryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "no_expiry") return days === null;
  if (filter === "expired") return days !== null && days <= 0;
  if (filter === "30days") return days !== null && days > 0 && days <= 30;
  if (filter === "90days") return days !== null && days > 0 && days <= 90;
  return days !== null && days > 0 && days <= 180;
}

function StockStatusBadge({ status }: { status: "in_stock" | "low_stock" | "out_of_stock" }) {
  const styles = {
    in_stock: { text: "text-success", dot: "bg-success" },
    low_stock: { text: "text-warning", dot: "bg-warning" },
    out_of_stock: { text: "text-danger", dot: "bg-danger" },
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", styles[status].text)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles[status].dot)} />
      {status === "in_stock" ? "In Stock" : status === "low_stock" ? "Low Stock" : "Out of Stock"}
    </span>
  );
}

export default function CompanyReport() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");

  const {
    data: companiesResponse,
    isLoading: companiesLoading,
    isError: companiesError,
  } = useQuery({
    queryKey: ["companies", "report"],
    queryFn: () => api.companies.listPaginated({ page: 1, limit: 100000 }),
  });
  const companies = companiesResponse?.data ?? [];

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const {
    data: company,
    isLoading: companyLoading,
    isError: companyError,
  } = useQuery({
    queryKey: ["company", selectedCompanyId],
    queryFn: () => api.companies.getById(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const selectedCompany = company?.id === selectedCompanyId ? company : undefined;
  const products = selectedCompany?.products ?? [];

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product: Product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const matchesStock = stockFilter === "all" || getStockStatus(product) === stockFilter;
      const matchesExpiry = matchesExpiryFilter(getDaysUntilExpiry(product.expiry), expiryFilter);

      return matchesSearch && matchesStock && matchesExpiry;
    });
  }, [products, search, stockFilter, expiryFilter]);

  const totalStock = products.reduce((sum, product) => sum + product.stock_qty, 0);
  const stockValue = products.reduce(
    (sum, product) => sum + product.stock_qty * product.purchase_price,
    0
  );
  const expiringProducts = products.filter(
    (product) => product.stock_qty > 0 && getDaysUntilExpiry(product.expiry) !== null
  );
  const expiredCount = expiringProducts.filter(
    (product) => getDaysUntilExpiry(product.expiry)! <= 0
  ).length;
  const expiring30Count = expiringProducts.filter((product) => {
    const days = getDaysUntilExpiry(product.expiry)!;
    return days > 0 && days <= 30;
  }).length;
  const expiring90Count = expiringProducts.filter((product) => {
    const days = getDaysUntilExpiry(product.expiry)!;
    return days > 0 && days <= 90;
  }).length;
  const lowOrOutOfStockCount = products.filter(
    (product) => getStockStatus(product) !== "in_stock"
  ).length;

  function resetFilters() {
    setSearch("");
    setStockFilter("all");
    setExpiryFilter("all");
  }

  function handleCompanyChange(value: string) {
    setSelectedCompanyId(value);
    resetFilters();
  }

  function getExportRows() {
    return filteredProducts.map((product: Product) => {
      const days = getDaysUntilExpiry(product.expiry);
      const stockStatus = getStockStatus(product);
      const expiryStatus = getExpiryStatus(days);

      return [
        product.name,
        product.barcode,
        product.category || "—",
        formatCurrency(product.purchase_price),
        formatCurrency(product.sale_price),
        product.stock_qty,
        formatCurrency(product.stock_qty * product.purchase_price),
        formatExpiryDate(product.expiry),
        days === null ? "—" : days <= 0 ? "Expired" : days,
        stockStatus === "in_stock"
          ? "In Stock"
          : stockStatus === "low_stock"
            ? "Low Stock"
            : "Out of Stock",
        expiryStatus.label,
      ];
    });
  }

  function handlePDF() {
    if (!selectedCompany) return;

    generatePDF({
      title: "Company-wise Stock & Expiry Report",
      subtitle: selectedCompany.name,
      summary: [
        { label: "Total Products", value: String(products.length) },
        { label: "Total Stock", value: totalStock.toLocaleString() },
        { label: "Stock Value", value: formatCurrency(stockValue) },
        { label: "Expiring <30 Days", value: String(expiring30Count) },
      ],
      headers: [
        "Product",
        "Barcode",
        "Category",
        "Purchase Price",
        "Sale Price",
        "Stock",
        "Stock Value",
        "Expiry",
        "Days Left",
        "Stock Status",
        "Expiry Status",
      ],
      rows: getExportRows(),
      filename: `company_report_${selectedCompany.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`,
    });
  }

  function handleExcel() {
    if (!selectedCompany) return;

    downloadExcelFile(
      `company_report_${selectedCompany.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.xlsx`,
      [
        "Product",
        "Barcode",
        "Category",
        "Purchase Price",
        "Sale Price",
        "Stock",
        "Stock Value",
        "Expiry",
        "Days Left",
        "Stock Status",
        "Expiry Status",
      ],
      getExportRows()
    );
  }

  const columns = [
    {
      key: "name",
      header: "Product",
      cell: (product: Product) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-text-primary">{product.name}</p>
          <p className="text-[10px] text-text-secondary">{product.location || "No location"}</p>
        </div>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      cell: (product: Product) => (
        <span className="font-mono text-xs text-text-secondary">{product.barcode}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (product: Product) => (
        <span className="text-text-secondary">{product.category || "—"}</span>
      ),
    },
    {
      key: "purchase_price",
      header: "Purchase",
      cell: (product: Product) => (
        <span className="font-mono text-sm">{formatCurrency(product.purchase_price)}</span>
      ),
    },
    {
      key: "sale_price",
      header: "Sale",
      cell: (product: Product) => (
        <span className="font-mono text-sm">{formatCurrency(product.sale_price)}</span>
      ),
    },
    {
      key: "stock_qty",
      header: "Stock",
      cell: (product: Product) => {
        const status = getStockStatus(product);
        return (
          <span
            className={cn(
              "font-mono font-semibold",
              status === "out_of_stock" && "text-danger",
              status === "low_stock" && "text-warning"
            )}
          >
            {product.stock_qty}
          </span>
        );
      },
    },
    {
      key: "stock_value",
      header: "Stock Value",
      cell: (product: Product) => (
        <span className="font-mono text-sm">
          {formatCurrency(product.stock_qty * product.purchase_price)}
        </span>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      cell: (product: Product) => (
        <span className="whitespace-nowrap font-mono text-xs">
          {formatExpiryDate(product.expiry)}
        </span>
      ),
    },
    {
      key: "days",
      header: "Days Left",
      cell: (product: Product) => {
        const days = getDaysUntilExpiry(product.expiry);
        return (
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              days !== null && days <= 7 && "text-danger",
              days !== null && days > 7 && days <= 30 && "text-warning"
            )}
          >
            {days === null ? "—" : days <= 0 ? "Expired" : days}
          </span>
        );
      },
    },
    {
      key: "stock_status",
      header: "Stock Status",
      cell: (product: Product) => <StockStatusBadge status={getStockStatus(product)} />,
    },
    {
      key: "expiry_status",
      header: "Expiry Status",
      cell: (product: Product) => {
        const status = getExpiryStatus(getDaysUntilExpiry(product.expiry));
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
              status.className
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        );
      },
    },
  ];

  if (companiesLoading) {
    return (
      <div className="py-16 text-center text-sm text-text-secondary">Loading companies...</div>
    );
  }

  if (companiesError) {
    return <div className="py-16 text-center text-sm text-danger">Unable to load companies.</div>;
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Company Report</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Review all company products with stock and expiry details
          </p>
        </div>
        {selectedCompany && <ExportButtons onPDF={handlePDF} onExcel={handleExcel} />}
      </div>

      <div className="relative z-10 mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border/50 bg-surface-1 p-4">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Company
          </label>
          <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[210px] flex-1">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Search products
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product, barcode or category"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Stock
          </label>
          <Select
            value={stockFilter}
            onValueChange={(value) => setStockFilter(value as StockFilter)}
          >
            <SelectTrigger className="h-9 w-full sm:w-40">
              <SelectValue placeholder="Stock status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Expiry
          </label>
          <Select
            value={expiryFilter}
            onValueChange={(value) => setExpiryFilter(value as ExpiryFilter)}
          >
            <SelectTrigger className="h-9 w-full sm:w-40">
              <SelectValue placeholder="Expiry status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expiry</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="30days">Within 30 Days</SelectItem>
              <SelectItem value="90days">Within 90 Days</SelectItem>
              <SelectItem value="180days">Within 6 Months</SelectItem>
              <SelectItem value="no_expiry">No Expiry Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-text-secondary"
          onClick={resetFilters}
        >
          Reset
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-border/50 py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-text-secondary/50" />
          <p className="text-sm font-medium text-text-primary">No companies available</p>
          <p className="mt-1 text-xs text-text-secondary">
            Add products with a company to use this report.
          </p>
        </div>
      ) : companyLoading ? (
        <div className="rounded-xl border border-border/50 py-16 text-center text-sm text-text-secondary">
          Loading company products...
        </div>
      ) : companyError || !selectedCompany ? (
        <div className="rounded-xl border border-border/50 py-16 text-center text-sm text-danger">
          Unable to load products for this company.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Products"
              value={products.length}
              icon={<Package className="h-4 w-4" />}
            />
            <KPICard
              title="Total Stock"
              value={totalStock.toLocaleString()}
              icon={<Package className="h-4 w-4" />}
            />
            <KPICard
              title="Stock Value"
              value={formatCurrency(stockValue)}
              icon={<Package className="h-4 w-4" />}
              valueClassName="text-accent"
            />
            <KPICard
              title="Expiring Soon"
              value={expiring90Count}
              icon={<AlertTriangle className="h-4 w-4" />}
              valueClassName={expiring90Count > 0 ? "text-warning" : ""}
            />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{selectedCompany.name}</h3>
              <p className="text-xs text-text-secondary">
                {products.length} products · {lowOrOutOfStockCount} low or out of stock ·{" "}
                {expiredCount} expired
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {expiring30Count} within 30 days
              </span>
              <span className="inline-flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-danger" /> {expiredCount} expired
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredProducts}
              loading={companyLoading}
              keyExtractor={(product: Product) => product.id}
              emptyMessage="No products match the selected filters"
            />
          </div>
        </>
      )}
    </div>
  );
}
