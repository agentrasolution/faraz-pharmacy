import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Package, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

  if (!company) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">Company not found</p>
        <Button variant="link" onClick={() => navigate("/companies")}>
          Back to Companies
        </Button>
      </div>
    );
  }

  const productColumns = [
    {
      key: "name",
      header: "Product Name",
      cell: (p: Product) => (
        <span className="font-medium text-text-primary">{p.name}</span>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      cell: (p: Product) => (
        <span className="font-mono text-xs text-text-secondary">{p.barcode}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p: Product) => (
        <span className="text-text-secondary">{p.category || "\u2014"}</span>
      ),
    },
    {
      key: "sale_price",
      header: "Sale Price",
      cell: (p: Product) => (
        <span className="font-mono font-medium">{formatCurrency(p.sale_price)}</span>
      ),
    },
    {
      key: "stock_qty",
      header: "Stock",
      cell: (p: Product) => (
        <span className="font-mono">{p.stock_qty}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/companies")}
        className="gap-1.5 text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Companies
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
            <Building2 className="h-3.5 w-3.5" />
            Added: {formatDate(company.created_at)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Products"
          value={company.product_count}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Total Stock"
          value={company.total_stock}
          icon={<PackageOpen className="h-5 w-5" />}
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(
            company.products.reduce((s: number, p: Product) => s + p.sale_price * p.stock_qty, 0)
          )}
          icon={<PackageOpen className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={productColumns}
            data={company.products}
            keyExtractor={(p: Product) => p.id}
            emptyMessage="No products for this company"
          />
        </CardContent>
      </Card>
    </div>
  );
}