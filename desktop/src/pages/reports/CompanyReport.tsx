import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Search,
  XCircle,
} from "lucide-react";
import KPICard from "@/components/reports/KPICard";
import ExportButtons from "@/components/reports/ExportButtons";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { generatePDF } from "@/lib/pdfExport";
import { downloadExcelFile } from "@/lib/excelExport";
import { useDebounce } from "@/hooks/useDebounce";
import type { Company, CompanyReportRow, CompanyReportTotals, Product } from "@/types";

const ALL_COMPANIES = "__all__";
const PAGE_SIZE = 25;

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type CompanyStockFilter = "all" | "has_out_of_stock" | "has_low_stock";
type ExpiryFilter = "all" | "expired" | "30days" | "90days" | "180days" | "no_expiry";
type CompanyExpiryFilter = "all" | "has_expired" | "expiring_30" | "expiring_90";

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
  if (days <= 90) return { label: "Caution", className: "bg-info/10 text-info", dot: "bg-info" };
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

function matchesCompanyStockFilter(row: CompanyReportRow, filter: CompanyStockFilter): boolean {
  if (filter === "all") return true;
  if (filter === "has_out_of_stock") return row.out_of_stock_count > 0;
  return row.low_stock_count > 0;
}

function matchesCompanyExpiryFilter(row: CompanyReportRow, filter: CompanyExpiryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "has_expired") return row.expired_count > 0;
  if (filter === "expiring_30") return row.expiring_30_count > 0;
  return row.expiring_90_count > 0;
}

function getStockStatus(
  product: Product,
  lowStockThreshold: number
): "in_stock" | "low_stock" | "out_of_stock" {
  if (product.stock_qty <= 0) return "out_of_stock";
  if (product.stock_qty <= lowStockThreshold) return "low_stock";
  return "in_stock";
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

function CountCell({ value, tone }: { value: number; tone: "danger" | "warning" | "muted" }) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text-secondary";

  return (
    <span
      className={cn(
        "font-mono text-sm font-semibold",
        value === 0 ? "text-text-secondary/50" : toneClass
      )}
    >
      {value}
    </span>
  );
}

export default function CompanyReport() {
  const [scope, setScope] = useState<string>(ALL_COMPANIES);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter | CompanyStockFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter | CompanyExpiryFilter>("all");
  const [page, setPage] = useState(1);

  const isAllCompanies = scope === ALL_COMPANIES;
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [scope, debouncedSearch, stockFilter, expiryFilter]);

  const {
    data: companies,
    isLoading: companiesLoading,
    isError: companiesError,
  } = useQuery({
    queryKey: ["companies", "report"],
    queryFn: () => api.companies.list(),
  });
  const companyList: Company[] = companies ?? [];

  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery({
    queryKey: ["companies", "report", "aggregate", debouncedSearch],
    queryFn: () => api.companies.report({ search: debouncedSearch }),
    enabled: isAllCompanies,
  });

  const {
    data: company,
    isLoading: companyLoading,
    isError: companyError,
  } = useQuery({
    queryKey: ["company", scope],
    queryFn: () => api.companies.getById(scope),
    enabled: !isAllCompanies && !!scope,
  });

  const selectedCompany = company?.id === scope ? company : undefined;
  const lowStockThreshold = report?.low_stock_threshold ?? 5;
  const products = selectedCompany?.products ?? [];

  const filteredCompanies = useMemo(() => {
    const rows = report?.data ?? [];
    return rows.filter(
      (row) =>
        matchesCompanyStockFilter(row, stockFilter as CompanyStockFilter) &&
        matchesCompanyExpiryFilter(row, expiryFilter as CompanyExpiryFilter)
    );
  }, [report, stockFilter, expiryFilter]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product: Product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const matchesStock =
        stockFilter === "all" || getStockStatus(product, lowStockThreshold) === stockFilter;
      const matchesExpiry = matchesExpiryFilter(
        getDaysUntilExpiry(product.expiry),
        expiryFilter as ExpiryFilter
      );

      return matchesSearch && matchesStock && matchesExpiry;
    });
  }, [products, search, stockFilter, expiryFilter, lowStockThreshold]);

  const totalRows = isAllCompanies ? filteredCompanies.length : filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedCompanies = isAllCompanies
    ? filteredCompanies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : [];
  const pagedProducts = isAllCompanies
    ? []
    : filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const productStats = useMemo(() => {
    const withStock = products.filter((p) => p.stock_qty > 0);
    const withExpiry = withStock.filter((p) => getDaysUntilExpiry(p.expiry) !== null);
    const days = (p: Product) => getDaysUntilExpiry(p.expiry)!;

    return {
      total_stock: products.reduce((sum, p) => sum + p.stock_qty, 0),
      stock_value: products.reduce((sum, p) => sum + p.stock_qty * p.purchase_price, 0),
      retail_value: products.reduce((sum, p) => sum + p.stock_qty * p.sale_price, 0),
      expired: withExpiry.filter((p) => days(p) <= 0).length,
      expiring_30: withExpiry.filter((p) => days(p) > 0 && days(p) <= 30).length,
      expiring_90: withExpiry.filter((p) => days(p) > 0 && days(p) <= 90).length,
      needs_restock: products.filter((p) => getStockStatus(p, lowStockThreshold) !== "in_stock")
        .length,
    };
  }, [products, lowStockThreshold]);

  const companyTotals: CompanyReportTotals = report?.totals ?? {
    product_count: 0,
    total_stock: 0,
    stock_value_purchase: 0,
    stock_value_retail: 0,
    in_stock_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    expired_count: 0,
    expiring_30_count: 0,
    expiring_90_count: 0,
    no_expiry_count: 0,
  };

  const stats = isAllCompanies
    ? {
        product_count: companyTotals.product_count,
        total_stock: companyTotals.total_stock,
        stock_value: companyTotals.stock_value_purchase,
        expiring_90: companyTotals.expiring_90_count,
        expired: companyTotals.expired_count,
        expiring_30: companyTotals.expiring_30_count,
        needs_restock: companyTotals.out_of_stock_count + companyTotals.low_stock_count,
      }
    : {
        product_count: products.length,
        total_stock: productStats.total_stock,
        stock_value: productStats.stock_value,
        expiring_90: productStats.expiring_90,
        expired: productStats.expired,
        expiring_30: productStats.expiring_30,
        needs_restock: productStats.needs_restock,
      };

  const scopeName = isAllCompanies ? "All Companies" : (selectedCompany?.name ?? "");
  const scopeSlug = scopeName.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "all";

  function resetFilters() {
    setSearch("");
    setStockFilter("all");
    setExpiryFilter("all");
  }

  function handleScopeChange(value: string) {
    setScope(value);
    resetFilters();
  }

  function companyExportRows() {
    return filteredCompanies.map((row) => [
      row.name,
      row.product_count,
      row.total_stock.toLocaleString(),
      formatCurrency(row.stock_value_purchase),
      formatCurrency(row.stock_value_retail),
      row.out_of_stock_count,
      row.low_stock_count,
      row.expired_count,
      row.expiring_90_count,
    ]);
  }

  function productExportRows() {
    return filteredProducts.map((product) => {
      const days = getDaysUntilExpiry(product.expiry);
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
        expiryStatus.label,
      ];
    });
  }

  const companyHeaders = [
    "Company",
    "Products",
    "Total Stock",
    "Stock Value",
    "Retail Value",
    "Out of Stock",
    "Low Stock",
    "Expired",
    "Expiring <90 Days",
  ];

  const productHeaders = [
    "Product",
    "Barcode",
    "Category",
    "Purchase Price",
    "Sale Price",
    "Stock",
    "Stock Value",
    "Expiry",
    "Days Left",
    "Expiry Status",
  ];

  function handlePDF() {
    if (isAllCompanies) {
      generatePDF({
        title: "Company-wise Stock & Expiry Report",
        subtitle: `${companyTotals.product_count} products across ${filteredCompanies.length} companies`,
        summary: [
          { label: "Companies", value: String(filteredCompanies.length) },
          { label: "Total Stock", value: companyTotals.total_stock.toLocaleString() },
          { label: "Stock Value", value: formatCurrency(companyTotals.stock_value_purchase) },
          { label: "Expiring <30 Days", value: String(companyTotals.expiring_30_count) },
        ],
        headers: companyHeaders,
        rows: companyExportRows(),
        filename: `company_report_all_${new Date().toISOString().split("T")[0]}.pdf`,
      });
      return;
    }

    generatePDF({
      title: "Company-wise Stock & Expiry Report",
      subtitle: scopeName,
      summary: [
        { label: "Total Products", value: String(products.length) },
        { label: "Total Stock", value: productStats.total_stock.toLocaleString() },
        { label: "Stock Value", value: formatCurrency(productStats.stock_value) },
        { label: "Expiring <30 Days", value: String(productStats.expiring_30) },
      ],
      headers: productHeaders,
      rows: productExportRows(),
      filename: `company_report_${scopeSlug}_${new Date().toISOString().split("T")[0]}.pdf`,
    });
  }

  function handleExcel() {
    downloadExcelFile(
      `company_report_${scopeSlug}_${new Date().toISOString().split("T")[0]}.xlsx`,
      isAllCompanies ? companyHeaders : productHeaders,
      isAllCompanies ? companyExportRows() : productExportRows()
    );
  }

  const companyColumns = [
    {
      key: "name",
      header: "Company",
      cell: (row: CompanyReportRow) => (
        <div className="flex items-center gap-2.5 min-w-[160px]">
          <div className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <p className="font-medium text-text-primary truncate">{row.name}</p>
        </div>
      ),
    },
    {
      key: "product_count",
      header: "Products",
      cell: (row: CompanyReportRow) => (
        <span className="font-mono text-sm">{row.product_count}</span>
      ),
    },
    {
      key: "total_stock",
      header: "Total Stock",
      cell: (row: CompanyReportRow) => (
        <span className="font-mono text-sm font-semibold">{row.total_stock.toLocaleString()}</span>
      ),
    },
    {
      key: "stock_value_purchase",
      header: "Stock Value",
      cell: (row: CompanyReportRow) => (
        <span className="font-mono text-sm text-accent">
          {formatCurrency(row.stock_value_purchase)}
        </span>
      ),
    },
    {
      key: "stock_value_retail",
      header: "Retail Value",
      cell: (row: CompanyReportRow) => (
        <span className="font-mono text-sm text-text-secondary">
          {formatCurrency(row.stock_value_retail)}
        </span>
      ),
    },
    {
      key: "out_of_stock_count",
      header: "Out of Stock",
      cell: (row: CompanyReportRow) => <CountCell value={row.out_of_stock_count} tone="danger" />,
    },
    {
      key: "low_stock_count",
      header: "Low Stock",
      cell: (row: CompanyReportRow) => <CountCell value={row.low_stock_count} tone="warning" />,
    },
    {
      key: "expired_count",
      header: "Expired",
      cell: (row: CompanyReportRow) => <CountCell value={row.expired_count} tone="danger" />,
    },
    {
      key: "expiring_90_count",
      header: "Expiring <90d",
      cell: (row: CompanyReportRow) => <CountCell value={row.expiring_90_count} tone="warning" />,
    },
  ];

  const productColumns = [
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
        const status = getStockStatus(product, lowStockThreshold);
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
      cell: (product: Product) => (
        <StockStatusBadge status={getStockStatus(product, lowStockThreshold)} />
      ),
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

  const isLoading = isAllCompanies ? reportLoading : companyLoading;
  const hasData = isAllCompanies ? !!report : !!selectedCompany;
  const hasError = isAllCompanies
    ? reportError
    : companyError || (!companyLoading && !selectedCompany);
  const showPlaceholder = isLoading && !hasData;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Company Report</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Stock and expiry position for every company, or drill into one
          </p>
        </div>
        <ExportButtons onPDF={handlePDF} onExcel={handleExcel} />
      </div>

      <div className="relative z-20 mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border/80 bg-surface shadow-xs p-4">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Company
          </label>
<Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger className="h-9 rounded-xl bg-surface border-border/80 text-xs shadow-xs">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COMPANIES}>All Companies</SelectItem>
              {companyList.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[210px] flex-1">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            {isAllCompanies ? "Search companies" : "Search products"}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isAllCompanies ? "Company name" : "Product, barcode or category"}
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
            onValueChange={(value) => setStockFilter(value as StockFilter & CompanyStockFilter)}
          >
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue placeholder="Stock status" />
            </SelectTrigger>
            <SelectContent>
              {isAllCompanies ? (
                <>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="has_out_of_stock">Has Out of Stock</SelectItem>
                  <SelectItem value="has_low_stock">Has Low Stock</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Expiry
          </label>
          <Select
            value={expiryFilter}
            onValueChange={(value) => setExpiryFilter(value as ExpiryFilter & CompanyExpiryFilter)}
          >
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue placeholder="Expiry status" />
            </SelectTrigger>
            <SelectContent>
              {isAllCompanies ? (
                <>
                  <SelectItem value="all">All Expiry</SelectItem>
                  <SelectItem value="has_expired">Has Expired</SelectItem>
                  <SelectItem value="expiring_30">Expiring Within 30 Days</SelectItem>
                  <SelectItem value="expiring_90">Expiring Within 90 Days</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="all">All Expiry</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="30days">Within 30 Days</SelectItem>
                  <SelectItem value="90days">Within 90 Days</SelectItem>
                  <SelectItem value="180days">Within 6 Months</SelectItem>
                  <SelectItem value="no_expiry">No Expiry Date</SelectItem>
                </>
              )}
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

      {companyList.length === 0 ? (
        <div className="rounded-xl border border-border/50 py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-text-secondary/50" />
          <p className="text-sm font-medium text-text-primary">No companies available</p>
          <p className="mt-1 text-xs text-text-secondary">
            Add a company from the Companies page to use this report.
          </p>
        </div>
      ) : showPlaceholder ? (
        <div className="rounded-xl border border-border/50 py-16 text-center text-sm text-text-secondary">
          {isAllCompanies ? "Loading company overview..." : "Loading company products..."}
        </div>
      ) : hasError ? (
        <div className="rounded-xl border border-border/50 py-16 text-center text-sm text-danger">
          Unable to load the company report.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Products"
              value={stats.product_count}
              icon={<Package className="h-4 w-4" />}
            />
            <KPICard
              title="Total Stock"
              value={stats.total_stock.toLocaleString()}
              icon={<Package className="h-4 w-4" />}
            />
            <KPICard
              title="Stock Value"
              value={formatCurrency(stats.stock_value)}
              icon={<Package className="h-4 w-4" />}
              valueClassName="text-accent"
            />
            <KPICard
              title="Expiring Soon"
              value={stats.expiring_90}
              icon={<AlertTriangle className="h-4 w-4" />}
              valueClassName={stats.expiring_90 > 0 ? "text-warning" : ""}
            />
          </div>

          <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {isAllCompanies ? `${filteredCompanies.length} companies` : scopeName}
              </h3>
              <p className="text-xs text-text-secondary">
                {isAllCompanies
                  ? "Select a row to drill into that company's products"
                  : `${products.length} products · ${productStats.retail_value.toLocaleString()} retail value`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {stats.expiring_30} within 30 days
              </span>
              <span className="inline-flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-danger" /> {stats.expired} expired
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" /> {stats.needs_restock} need
                restock
              </span>
            </div>
          </div>

          {isAllCompanies ? (
            <DataTable
              columns={companyColumns}
              data={pagedCompanies}
              loading={reportLoading}
              keyExtractor={(row: CompanyReportRow) => row.id}
              onRowClick={(row: CompanyReportRow) => handleScopeChange(row.id)}
              emptyMessage="No companies match the selected filters"
            />
          ) : (
            <DataTable
              columns={productColumns}
              data={pagedProducts}
              loading={companyLoading}
              keyExtractor={(product: Product) => product.id}
              emptyMessage="No products match the selected filters"
            />
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-1">
              <p className="text-xs text-text-secondary">
                Showing {(safePage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(safePage * PAGE_SIZE, totalRows)} of {totalRows}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-text-secondary px-2">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
