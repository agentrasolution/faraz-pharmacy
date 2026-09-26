import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { modKey } from "@/lib/os";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  CreditCard,
  Factory,
  Undo2,
  Wallet,
  BarChart3,
  Receipt,
  Barcode,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Tags,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logoSrc from "@/asset/image/logo.png";

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: "MANAGE",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "F1" },
      { href: "/pos", label: "POS / Sales", icon: ShoppingCart, shortcut: "F2" },
      { href: "/invoices", label: "Invoices", icon: Receipt, shortcut: "F3" },
      { href: "/returns", label: "Returns", icon: Undo2, shortcut: "F4" },
      { href: "/customers", label: "Customers", icon: Users, shortcut: "F5" },
      { href: "/arrears", label: "Arrears", icon: CreditCard, shortcut: "F6" },
      { href: "/products", label: "Products", icon: Package, shortcut: "F7" },
      { href: "/stock", label: "Stock", icon: Boxes, shortcut: "F8" },
      { href: "/barcodes", label: "Barcodes", icon: Barcode, shortcut: "F9" },
      { href: "/distributors", label: "Distributors", icon: Factory, shortcut: "F10" },
      { href: "/companies", label: "Companies", icon: Building2, shortcut: "" },
      { href: "/categories", label: "Categories", icon: Tags, shortcut: "" },
    ],
  },
  {
    label: "INSIGHTS & SYSTEM",
    items: [
      { href: "/expenses", label: "Expenses", icon: Wallet, shortcut: "F11" },
      { href: "/reports", label: "Reports", icon: BarChart3, shortcut: "F12" },
      { href: "/settings", label: "Settings", icon: Settings, shortcut: "F13" },
    ],
  },
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
      // Electron API not available
    }
  }, []);

  useEffect(() => {
    fetchWindowCount();
    const interval = setInterval(fetchWindowCount, 2500);
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
        "h-full  bg-gradient-to-b from-[#4A25E1] via-[#431DDB] to-[#4A25E1] dark:from-[#0F111E] dark:via-[#111322] dark:to-[#0A0C16] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative select-none z-40 text-white shadow-2xl ",
        isExpanded ? "w-[240px]" : "w-[72px] "
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center h-16 relative",
          isExpanded ? "px-5" : "justify-center"
        )}
      >
        <div className="flex items-center justify-center rounded-2xl h-20 w-20  shrink-0 p-1.5">
          <img src={logoSrc} alt="Faraz Pharmacy" className="h-full w-full object-contain filter drop-shadow" />
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-display font-bold tracking-tight text-white">
                  Faraz
                </span>
                <span className="text-[10px] font-semibold bg-white/20 text-white px-1.5 py-0.5 rounded-full font-mono">
                  Pharmacy
                </span>
              </div>
              <p className="text-[10px] text-white/60 tracking-wider uppercase font-medium">
                By Mustafa Tawab
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-4 space-y-4 pr-0 scrollbar-none" data-sidebar>
        {navGroups.map((group, gIdx) => (
          <div key={group.label} className="space-y-1">
            {isExpanded && (
              <p className="px-5 text-[10px] font-bold tracking-wider text-white/45 uppercase select-none mb-1.5">
                {group.label}
              </p>
            )}
            {!isExpanded && gIdx > 0 && (
              <div className="mx-4 my-2 border-t border-white/10" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;

                return (
                  <div key={item.href} className="relative">
                    <button
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "group relative flex items-center w-full transition-all duration-150 cursor-pointer",
                        !isExpanded
                          ? "justify-center h-10 px-2"
                          : "justify-between h-10 pl-5 pr-3",
                        isActive
                          ? cn(
                              "bg-background text-[#4A25E1] dark:text-white font-bold shadow-md z-20",
                              isExpanded ? "rounded-l-2xl mr-0" : "rounded-2xl mx-2"
                            )
                          : cn(
                              "text-white/70 hover:text-white hover:bg-white/10 transition-colors",
                              isExpanded ? "rounded-xl mx-2" : "rounded-xl mx-2"
                            )
                      )}
                    >
                      {/* Active Cutout Concave SVGs (Connecting to main canvas) */}
                      {isActive && isExpanded && (
                        <>
                          {/* Top Fillet */}
                          <svg
                            className="absolute -top-4 right-0 w-4 h-4 pointer-events-none z-20"
                            viewBox="0 0 16 16"
                            style={{ fill: "var(--color-background)" }}
                          >
                            <path d="M16 0 A 16 16 0 0 0 0 16 L 16 16 Z" />
                          </svg>

                          {/* Bottom Fillet */}
                          <svg
                            className="absolute -bottom-4 right-0 w-4 h-4 pointer-events-none z-20"
                            viewBox="0 0 16 16"
                            style={{ fill: "var(--color-background)" }}
                          >
                            <path d="M0 0 A 16 16 0 0 0 16 16 L 16 0 Z" />
                          </svg>
                        </>
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150",
                            isActive
                              ? "bg-[#4A25E1]/10 dark:bg-white/15 text-[#4A25E1] dark:text-[#754BFB]"
                              : "text-white/80 group-hover:scale-110"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={cn(
                                "text-[13px] tracking-tight truncate",
                                isActive ? "font-bold text-[#1e202b] dark:text-white" : "font-medium"
                              )}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {isExpanded && (
                        <div className="flex items-center gap-1.5 shrink-0 px-2">
                          {item.shortcut && (
                            <span
                              className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                isActive
                                  ? "bg-muted text-text-secondary"
                                  : "bg-white/10 text-white/50"
                              )}
                            >
                              {item.shortcut.startsWith("Mod+")
                                ? `${modKey()}+${item.shortcut.slice(4)}`
                                : item.shortcut}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Floating Bottom Action / Live POS Widget */}
      <div className={cn("pb-3", isExpanded ? "px-3" : "px-2")}>
        {isExpanded ? (
          <div className="rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 p-3.5 space-y-2.5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-white">
                  Quick POS
                </span>
              </div>
              <Sparkles className="h-3.5 w-3.5 text-white/90" />
            </div>
            <p className="text-[10px] text-white/70 leading-relaxed">
              Instant sales billing & scanner terminal
            </p>
            <button
              onClick={handleNewSale}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-white/90 active:scale-95 text-[#4A25E1] font-bold text-xs tracking-tight shadow-md transition-all cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>New Sale (F2)</span>
              {posWindowCount > 0 && (
                <span className="bg-[#4A25E1]/15 text-[#4A25E1] text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {posWindowCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleNewSale}
            title="New Sale (F2)"
            className="w-full h-10 rounded-xl bg-white hover:bg-white/90 text-[#4A25E1] flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer relative"
          >
            <ShoppingCart className="h-4 w-4" />
            {posWindowCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#3612B8] text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow">
                {posWindowCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* User Section & Logout */}
      <div className={cn("border-t border-white/10 pt-3 pb-3 space-y-1", isExpanded ? "px-3" : "px-2")}>
        <div
          className={cn(
            "flex items-center rounded-xl px-2 py-1.5 hover:bg-white/10 transition-colors cursor-pointer",
            !isExpanded && "justify-center px-0"
          )}
        >
          <div className="h-8 w-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
            {user?.username?.slice(0, 2).toUpperCase() || "AD"}
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden flex-1 ml-2.5"
              >
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.username || "Admin"}
                </p>
                <p className="text-[10px] text-white/50 truncate tracking-wider uppercase">
                  Cashier & Admin
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {isExpanded && (
            <button
              onClick={logout}
              title="Sign out"
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-danger/80 transition-colors ml-1"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expand/Collapse Floating Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-14 h-6 w-6 rounded-full border border-border bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200 z-30 shadow-md",
          "hover:scale-110 active:scale-95 cursor-pointer",
          collapsed && "rotate-180"
        )}
      >
        {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>
    </aside>
  );
}
