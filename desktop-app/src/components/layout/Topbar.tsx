import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Server, Monitor, Sun, Moon, Bell } from "lucide-react";
import { useServerConnection } from "@/contexts/ServerConnectionContext";
import GlobalSearch from "@/components/shared/GlobalSearch";

const pageLabels: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Business overview" },
  "/pos": { title: "Point of Sale", subtitle: "Create and manage sales" },
  "/products": { title: "Products", subtitle: "Inventory management" },
  "/barcodes": { title: "Barcodes", subtitle: "Custom barcode labels" },
  "/stock": { title: "Stock", subtitle: "Purchase management" },
  "/customers": { title: "Customers", subtitle: "Customer records" },
  "/invoices": { title: "Invoices", subtitle: "Sales invoices" },
  "/arrears": { title: "Arrears", subtitle: "Outstanding payments" },
  "/distributors": { title: "Distributors", subtitle: "Supplier management" },
  "/companies": { title: "Companies", subtitle: "Company records" },
  "/returns": { title: "Returns", subtitle: "Return management" },
  "/expenses": { title: "Expenses", subtitle: "Expense tracking" },
  "/reports": { title: "Reports", subtitle: "Business insights" },
  "/settings": { title: "Settings", subtitle: "System configuration" },
};

export default function Topbar() {
  const location = useLocation();
  const [time, setTime] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("faraz_theme", next ? "dark" : "light"); } catch {}
  }

  const { isOnline, isInitialCheck } = useServerConnection();
  const page = pageLabels[location.pathname] || { title: "Dashboard", subtitle: "Business overview" };
  const isServer = window.appConfig?.mode === "server";

  return (
    <header className="h-14 border-b border-border bg-surface/70 backdrop-blur-lg sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
        >
          <h1 className="text-sm font-display font-semibold text-text-primary tracking-tight">{page.title}</h1>
          <p className="text-[11px] text-text-secondary leading-none mt-0.5">{page.subtitle}</p>
        </motion.div>

        <div className="flex items-center gap-4">
          <GlobalSearch />

          <div className="flex items-center gap-1.5 px-2 h-6 rounded bg-muted text-[11px] text-text-secondary font-medium">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isInitialCheck
                  ? "bg-muted-foreground/40"
                  : isOnline
                    ? "bg-success"
                    : "bg-danger"
              }`}
            />
            {isServer ? (
              <Server className="h-3.5 w-3.5 text-accent" />
            ) : (
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>{isServer ? "Server" : "Client"}</span>
          </div>

          <span className="text-xs text-text-secondary tabular-nums font-mono font-medium">{time}</span>

          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-muted transition-all duration-150">
            <Bell className="h-4 w-4" />
          </button>

          <button
            onClick={toggleDark}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-muted transition-all duration-150"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
