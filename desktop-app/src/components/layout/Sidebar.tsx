import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Tags, Users, CreditCard,
  Factory, Building2, Undo2, Wallet, BarChart3, Receipt, Barcode, Settings,
  LogOut, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logoSrc from "@/asset/image/logo.png";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "F12" },
  { href: "/pos", label: "POS / Sales", icon: ShoppingCart, shortcut: "⌘S" },
  { href: "/invoices", label: "Invoices", icon: Receipt, shortcut: "⌘I" },
  { href: "/returns", label: "Returns", icon: Undo2, shortcut: "⌘R" },
  { href: "/customers", label: "Customers", icon: Users, shortcut: "⌘C" },
  { href: "/arrears", label: "Arrears", icon: CreditCard, shortcut: "⌘A" },
  { href: "/products", label: "Products", icon: Package, shortcut: "⌘P" },
  { href: "/stock", label: "Stock", icon: Boxes, shortcut: "⌘K" },
  { href: "/barcodes", label: "Barcodes", icon: Barcode, shortcut: "⌘B" },
  { href: "/distributors", label: "Distributors", icon: Factory, shortcut: "⌘D" },
  { href: "/companies", label: "Companies", icon: Building2, shortcut: "⌘M" },
  { href: "/expenses", label: "Expenses", icon: Wallet, shortcut: "⌘E" },
  { href: "/reports", label: "Reports", icon: BarChart3, shortcut: "⌘H" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "F10" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [posWindowCount, setPosWindowCount] = useState(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWindowCount = useCallback(async () => {
    try {
      const count = await window.getPosWindowCount();
      setPosWindowCount(count);
    } catch {
      // Not in Electron or not available
    }
  }, []);

  useEffect(() => {
    fetchWindowCount();
    const interval = setInterval(fetchWindowCount, 2000);
    return () => clearInterval(interval);
  }, [fetchWindowCount]);

  const handleNewSale = async () => {
    try {
      const result = await window.openPosWindow();
      if (!result.success) {
        toast.error(result.error || "Could not open new sale window");
      }
    } catch {
      navigate("/pos");
    }
  };

  const handleMouseEnter = () => {
    if (!collapsed) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const isExpanded = !collapsed || isHovered;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "h-full bg-sidebar-background flex flex-col shrink-0 transition-all duration-300 ease-out relative select-none z-40",
        isExpanded ? "w-[240px]" : "w-[68px]"
      )}
    >
      <div className={cn(
        "flex items-center h-14 relative",
        isExpanded ? "px-4 gap-3" : "justify-center"
      )}>
        <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-sidebar-primary/10 shrink-0 overflow-hidden">
          <img src={logoSrc} alt="Faraz Pharmacy" className="h-6 w-6 object-contain" />
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="min-w-0 overflow-hidden"
            >
              <p className="text-sm font-display font-semibold text-sidebar-foreground truncate tracking-tight">Faraz Pharmacy</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate tracking-widest uppercase">Management</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn("px-3 pb-3", !isExpanded && "px-2")}>
        <button
          onClick={handleNewSale}
          className={cn(
            "flex items-center w-full rounded-lg transition-all duration-150 text-sm font-medium relative",
            "bg-accent text-accent-foreground hover:bg-accent-hover shadow-xs",
            !isExpanded ? "justify-center h-9" : "gap-2.5 px-3 h-9"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                New Sale
              </motion.span>
            )}
          </AnimatePresence>
          {posWindowCount > 0 && (
            <span
              className={cn(
                "absolute flex items-center justify-center rounded-full bg-background text-[10px] font-bold text-text-primary border border-border",
                !isExpanded
                  ? "-top-1 -right-1 h-5 min-w-5 px-1"
                  : "right-3 h-5 min-w-5 px-1"
              )}
            >
              {posWindowCount}
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 px-3" data-sidebar>
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.015, duration: 0.2 }}
            >
              <button
                onClick={() => navigate(item.href)}
                className={cn(
                  "group relative flex items-center w-full rounded-lg transition-all duration-150",
                  !isExpanded ? "justify-center h-9" : "gap-3 px-3 pl-4 h-9",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {isActive && isExpanded && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-sidebar-primary" />
                )}
                <Icon className={cn(
                  "shrink-0 relative",
                  "h-4 w-4",
                  isActive ? "text-sidebar-primary" : ""
                )} />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[13px] font-medium relative truncate flex-1"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isExpanded && (
                  <span className="text-[10px] text-sidebar-foreground/30 font-mono ml-auto shrink-0">
                    {item.shortcut}
                  </span>
                )}
              </button>
            </motion.div>
          );
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border pt-3 pb-4 space-y-1.5", isExpanded ? "px-3" : "px-2")}>
        <div className={cn(
          "flex items-center rounded-lg px-3 py-2 hover:bg-sidebar-accent/50 transition-colors cursor-pointer",
          !isExpanded && "justify-center px-0"
        )}>
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-sidebar-primary">
              {user?.username?.slice(0, 2).toUpperCase() || "AD"}
            </span>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden flex-1 ml-2.5"
              >
                <p className="text-xs font-medium text-sidebar-foreground/80 truncate leading-tight">{user?.username || "Admin"}</p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate tracking-wider uppercase leading-tight">Admin</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={logout}
          className={cn(
            "flex items-center rounded-lg transition-all duration-150 text-sidebar-foreground/40 hover:text-danger",
            !isExpanded ? "justify-center h-9" : "gap-3 px-3 h-9 w-full text-xs"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-14 h-6 w-6 rounded-full border border-border bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200 z-20 shadow-xs",
          "hover:scale-105 active:scale-95",
          collapsed && "rotate-180"
        )}
      >
        {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>
    </aside>
  );
}
