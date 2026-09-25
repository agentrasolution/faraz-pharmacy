import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Package, PackageOpen, Coins, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import { api } from "@/lib/api";
import type { Product } from "@/types";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => api.companies.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-text-secondary text-sm">Company not found</p>
        <Button variant="brand" onClick={() => navigate("/companies")} className="rounded-xl">
          Back to Companies
        </Button>
      </div>
    );
  }

  const stockValue = company.products.reduce(
    (s: number, p: Product) => s + (p.sale_price || 0) * (p.stock_qty || 0),
    0
  );

  const productColumns = [
    {
      key: "name",
      header: "Product Name",
      cell: (p: Product) => (
        <span className="font-semibold text-text-primary">{p.name}</span>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      cell: (p: Product) => (
        <span className="font-mono text-xs text-text-secondary bg-surface-2 px-2 py-0.5 rounded-lg border border-border">
          {p.barcode || "—"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p: Product) => (
        <span className="text-text-secondary font-medium">{p.category || "—"}</span>
      ),
    },
    {
      key: "sale_price",
      header: "Sale Price",
      cell: (p: Product) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(p.sale_price)}
        </span>
      ),
    },
    {
      key: "stock_qty",
      header: "Stock Qty",
      cell: (p: Product) => (
        <span
          className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
            p.stock_qty <= 5
              ? "bg-danger/10 text-danger"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {p.stock_qty} units
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Navigation & Company Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/companies")}
          className="gap-2 text-text-secondary hover:text-text-primary rounded-xl mb-3 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Companies</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-border/80 bg-surface shadow-xs">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#4A25E1]/10 dark:bg-white/10 flex items-center justify-center text-[#4A25E1] dark:text-[#754BFB] shrink-0 shadow-xs">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
                {company.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                <Calendar className="h-3.5 w-3.5" />
                <span>Registered: {formatDate(company.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Products"
          value={company.product_count}
          icon={<Package className="h-5 w-5" />}
          subtitle="Unique active catalog items"
        />
        <StatCard
          title="Total Inventory Units"
          value={company.total_stock}
          icon={<PackageOpen className="h-5 w-5" />}
          subtitle="Aggregate items on shelves"
        />
        <StatCard
          title="Catalog Stock Value"
          value={formatCurrency(stockValue)}
          icon={<Coins className="h-5 w-5" />}
          subtitle="Estimated retail retail valuation"
        />
      </div>

      {/* Products Table */}
      <div className="space-y-3">
        <h2 className="text-base font-display font-bold text-text-primary tracking-tight">
          Product Catalog ({company.products.length})
        </h2>
        <DataTable
          columns={productColumns}
          data={company.products}
          keyExtractor={(p: Product) => p.id}
          emptyMessage="No products recorded for this pharmaceutical company"
        />
      </div>
    </div>
  );
}