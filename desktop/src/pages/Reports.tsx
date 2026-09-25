import { useState } from "react";
import {
  BarChart3,
  Building2,
  Package,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Clock,
  Calculator,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SalesReport from "./reports/SalesReport";
import StockReport from "./reports/StockReport";
import CompanyReport from "./reports/CompanyReport";
import ExpensesReport from "./reports/ExpensesReport";
import ArrearsReport from "./reports/ArrearsReport";
import ExpiryReport from "./reports/ExpiryReport";
import PurchaseReport from "./reports/PurchaseReport";
import ZakatReport from "./reports/ZakatReport";
import IncomeReport from "./reports/IncomeReport";
import PageHeader from "@/components/shared/PageHeader";

type ReportType =
  | "sales"
  | "stock"
  | "company"
  | "purchases"
  | "expenses"
  | "arrears"
  | "expiry"
  | "zakat"
  | "income";

interface ReportTab {
  id: ReportType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const reportTabs: ReportTab[] = [
  { id: "sales", label: "Sales & Turnover", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "stock", label: "Inventory Stock", icon: <Package className="h-4 w-4" /> },
  { id: "company", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
  { id: "purchases", label: "Purchases", icon: <ShoppingCart className="h-4 w-4" /> },
  { id: "expenses", label: "Expenses", icon: <Wallet className="h-4 w-4" /> },
  { id: "arrears", label: "Arrears", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "expiry", label: "Expiry Batches", icon: <Clock className="h-4 w-4" /> },
  { id: "zakat", label: "Zakat Calc", icon: <Calculator className="h-4 w-4" /> },
  { id: "income", label: "Net Income", icon: <DollarSign className="h-4 w-4" /> },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales");

  function renderReport() {
    switch (activeReport) {
      case "sales":
        return <SalesReport />;
      case "stock":
        return <StockReport />;
      case "company":
        return <CompanyReport />;
      case "purchases":
        return <PurchaseReport />;
      case "expenses":
        return <ExpensesReport />;
      case "arrears":
        return <ArrearsReport />;
      case "expiry":
        return <ExpiryReport />;
      case "zakat":
        return <ZakatReport />;
      case "income":
        return <IncomeReport />;
      default:
        return <SalesReport />;
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Analytics & Financial Reports"
        description="Comprehensive audit trails, gross profit statements, and stock valuations"
      />

      {/* Airnow Horizontal Pill Carousel Strip */}
      <div className="rounded-2xl border border-border/80 bg-surface p-2 shadow-xs overflow-x-auto scrollbar-none flex items-center gap-2 select-none">
        {reportTabs.map((tab) => {
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-[#4A25E1] text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              <span className={isActive ? "text-white" : "text-text-secondary"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Report Panel Container */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs">
        {renderReport()}
      </div>
    </div>
  );
}
