import { useState } from "react";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Clock,
  Calculator,
  DollarSign,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SalesReport from "./reports/SalesReport";
import StockReport from "./reports/StockReport";
import ExpensesReport from "./reports/ExpensesReport";
import ArrearsReport from "./reports/ArrearsReport";
import ExpiryReport from "./reports/ExpiryReport";
import PurchaseReport from "./reports/PurchaseReport";
import ZakatReport from "./reports/ZakatReport";
import IncomeReport from "./reports/IncomeReport";

type ReportType =
  "sales" | "stock" | "purchases" | "expenses" | "arrears" | "expiry" | "zakat" | "income";

interface ReportTab {
  id: ReportType;
  label: string;
  icon: React.ReactNode;
}

const reportTabs: ReportTab[] = [
  { id: "sales", label: "Sales", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "stock", label: "Stock", icon: <Package className="h-4 w-4" /> },
  { id: "purchases", label: "Purchases", icon: <ShoppingCart className="h-4 w-4" /> },
  { id: "expenses", label: "Expenses", icon: <Wallet className="h-4 w-4" /> },
  { id: "arrears", label: "Arrears", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "expiry", label: "Expiry", icon: <Clock className="h-4 w-4" /> },
  { id: "zakat", label: "Zakat", icon: <Calculator className="h-4 w-4" /> },
  { id: "income", label: "Income", icon: <DollarSign className="h-4 w-4" /> },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales");

  function renderReport() {
    switch (activeReport) {
      case "sales":
        return <SalesReport />;
      case "stock":
        return <StockReport />;
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
    <div>
      {/* Page Header */}

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-surface-2 rounded-xl overflow-x-auto">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeReport === tab.id
                ? "bg-accent text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div>{renderReport()}</div>
    </div>
  );
}
