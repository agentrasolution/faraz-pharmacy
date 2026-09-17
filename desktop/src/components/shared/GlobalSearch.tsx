import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Package, User, Boxes, Loader2, ArrowRight, ShoppingCart,
  Plus, Warehouse, CreditCard, FileText, BarChart3, Settings,
  TrendingUp, Undo2, Building2, Wallet, Receipt, Tag
} from "lucide-react";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/utils";
import { modKey } from "@/lib/os";

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  meta?: string;
  shortcut?: string;
  onClick: () => void;
}

const quickActions: SearchItem[] = [
  { id: "new-sale", title: "New Sale", icon: ShoppingCart, shortcut: "F2", onClick: () => {} },
  { id: "add-product", title: "Add Product", icon: Plus, shortcut: `${modKey()}+N`, onClick: () => {} },
  { id: "stock-adjustment", title: "Stock Adjustment", icon: Warehouse, shortcut: `${modKey()}+K`, onClick: () => {} },
  { id: "add-customer", title: "Add Customer", icon: User, shortcut: `${modKey()}+U`, onClick: () => {} },
];

const navigationItems: Omit<SearchItem, "onClick">[] = [
  { id: "nav-products", title: "Products", icon: Package },
  { id: "nav-stock", title: "Stock", icon: Boxes },
  { id: "nav-purchases", title: "Purchases", icon: Receipt },
  { id: "nav-reports", title: "Reports", icon: BarChart3 },
  { id: "nav-customers", title: "Customers", icon: User },
  { id: "nav-invoices", title: "Invoices", icon: FileText },
  { id: "nav-returns", title: "Returns", icon: Undo2 },
  { id: "nav-distributors", title: "Distributors", icon: Building2 },
  { id: "nav-expenses", title: "Expenses", icon: Wallet },
  { id: "nav-arrears", title: "Arrears", icon: CreditCard },
  { id: "nav-settings", title: "Settings", icon: Settings },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 200);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["global-search-products", debouncedQuery],
    queryFn: () => api.products.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["global-search-customers", debouncedQuery],
    queryFn: () => api.customers.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const isLoading = loadingProducts || loadingCustomers;

  const navigationWithClick = useMemo(() => {
    const routeMap: Record<string, string> = {
      "nav-products": "/products",
      "nav-stock": "/stock",
      "nav-purchases": "/stock",
      "nav-reports": "/reports",
      "nav-customers": "/customers",
      "nav-invoices": "/invoices",
      "nav-returns": "/returns",
      "nav-distributors": "/distributors",
      "nav-expenses": "/expenses",
      "nav-arrears": "/arrears",
      "nav-settings": "/settings",
    };
    return navigationItems.map((item) => ({
      ...item,
      onClick: () => {
        navigate(routeMap[item.id] || "/");
        setIsOpen(false);
        setQuery("");
      },
    }));
  }, [navigate]);

  const productResults: SearchItem[] = useMemo(() => {
    return products.slice(0, 5).map((p) => ({
      id: `product-${p.id}`,
      title: p.name,
      subtitle: p.barcode,
      icon: Package,
      meta: `Stock: ${p.stock_qty} | ${formatCurrency(p.sale_price)}`,
      onClick: () => {
        navigate("/products");
        setIsOpen(false);
        setQuery("");
      },
    }));
  }, [products, navigate]);

  const customerResults: SearchItem[] = useMemo(() => {
    return customers.slice(0, 3).map((c) => ({
      id: `customer-${c.id}`,
      title: c.name,
      subtitle: c.phone || "No phone",
      icon: User,
      meta: c.outstanding_arrear ? `Arrear: ${formatCurrency(c.outstanding_arrear)}` : undefined,
      onClick: () => {
        navigate(`/customers/${c.id}`);
        setIsOpen(false);
        setQuery("");
      },
    }));
  }, [customers, navigate]);

  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const allResults: SearchItem[] = [];

    const filteredNav = navigationWithClick.filter((item) =>
      item.title.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
    allResults.push(...filteredNav);

    const filteredQuick = quickActions.map((item) => ({
      ...item,
      onClick: () => {
        if (item.id === "new-sale") {
          try { window.openPosWindow(); } catch { navigate("/pos"); }
        } else if (item.id === "add-product") {
          navigate("/products");
        } else if (item.id === "add-customer") {
          navigate("/customers");
        } else if (item.id === "stock-adjustment") {
          navigate("/stock");
        }
        setIsOpen(false);
        setQuery("");
      },
    })).filter((item) =>
      item.title.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
    allResults.push(...filteredQuick);

    allResults.push(...productResults);
    allResults.push(...customerResults);

    return allResults;
  }, [debouncedQuery, navigationWithClick, productResults, customerResults, navigate]);

  const allItems = useMemo(() => {
    if (debouncedQuery.length < 2) {
      const items: { section: string; items: SearchItem[] }[] = [
        { section: "QUICK ACTIONS", items: quickActions.map((item) => ({
          ...item,
          onClick: () => {
            if (item.id === "new-sale") {
              try { window.openPosWindow(); } catch { navigate("/pos"); }
            } else if (item.id === "add-product") {
              navigate("/products");
            } else if (item.id === "add-customer") {
              navigate("/customers");
            } else if (item.id === "stock-adjustment") {
              navigate("/stock");
            }
            setIsOpen(false);
            setQuery("");
          },
        }))},
        { section: "NAVIGATION", items: navigationWithClick },
      ];
      return items;
    }
    const grouped: Record<string, SearchItem[]> = {};
    searchResults.forEach((item) => {
      if (item.id.startsWith("product-")) {
        if (!grouped["Products"]) grouped["Products"] = [];
        grouped["Products"].push(item);
      } else if (item.id.startsWith("customer-")) {
        if (!grouped["Customers"]) grouped["Customers"] = [];
        grouped["Customers"].push(item);
      } else if (item.id.startsWith("nav-")) {
        if (!grouped["Pages"]) grouped["Pages"] = [];
        grouped["Pages"].push(item);
      } else {
        if (!grouped["Actions"]) grouped["Actions"] = [];
        grouped["Actions"].push(item);
      }
    });
    return Object.entries(grouped).map(([section, items]) => ({ section, items }));
  }, [debouncedQuery, searchResults, navigationWithClick, navigate]);

  const totalItems = allItems.reduce((sum, section) => sum + section.items.length, 0);

  const handleSelect = useCallback((index: number) => {
    let currentIndex = 0;
    for (const section of allItems) {
      for (const item of section.items) {
        if (currentIndex === index) {
          item.onClick();
          return;
        }
        currentIndex++;
      }
    }
  }, [allItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case "Enter":
        e.preventDefault();
        handleSelect(selectedIndex);
        break;
      case "Escape":
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const showDropdown = isOpen;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-text-secondary pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, customers, invoices..."
          className="h-9 w-80 pl-10 pr-14 rounded-xl border-2 border-accent/30 bg-accent/5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
        />
        <kbd className="absolute right-2.5 pointer-events-none h-5 px-1.5 rounded border border-border bg-surface text-[10px] text-text-secondary font-medium">
          ⌘K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[420px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Searching...</span>
            </div>
          )}

          {!isLoading && totalItems === 0 && debouncedQuery.length >= 2 && (
            <div className="py-8 text-center">
              <p className="text-xs text-text-secondary">No results found for "{debouncedQuery}"</p>
            </div>
          )}

          {!isLoading && (
            <div className="py-2">
              {allItems.map((section) => {
                if (section.items.length === 0) return null;
                return (
                  <div key={section.section}>
                    <div className="px-4 py-2">
                      <span className="text-[10px] font-semibold text-text-secondary/50 uppercase tracking-wider">
                        {section.section}
                      </span>
                    </div>
                    {section.items.map((item) => {
                      const globalIndex = allItems
                        .slice(0, allItems.indexOf(section))
                        .reduce((sum, s) => sum + s.items.length, 0) + section.items.indexOf(item);
                      const Icon = item.icon;
                      const isSelected = selectedIndex === globalIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                            isSelected ? "bg-accent/10 text-accent" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-accent/20" : "bg-muted"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-[11px] text-text-secondary truncate">{item.subtitle}</p>
                            )}
                          </div>
                          {item.meta && (
                            <span className="text-[10px] text-text-secondary tabular-nums shrink-0">
                              {item.meta}
                            </span>
                          )}
                          {item.shortcut && (
                            <kbd className="h-5 px-1.5 rounded border border-border bg-muted text-[9px] text-text-secondary font-medium shrink-0">
                              {item.shortcut}
                            </kbd>
                          )}
                          {!item.shortcut && (
                            <ArrowRight className="h-3.5 w-3.5 text-text-secondary/40 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
