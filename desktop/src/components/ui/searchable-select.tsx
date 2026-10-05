import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const PANEL_GAP = 4;
const PANEL_MAX_HEIGHT = 288;
const FLIP_THRESHOLD = 260;

interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties | null>(null);
  const [maxListHeight, setMaxListHeight] = React.useState(PANEL_MAX_HEIGHT - 54);
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find((o) => o.value === value);

  // The panel is portaled to <body>, so it must be positioned against the
  // trigger's viewport rect instead of flowing inside the scrollable dialog.
  const reposition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - 8;
    const spaceAbove = rect.top - PANEL_GAP - 8;
    const flip = spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(PANEL_MAX_HEIGHT, flip ? spaceAbove : spaceBelow));

    setPanelStyle(
      flip
        ? { bottom: window.innerHeight - rect.top + PANEL_GAP, left: rect.left, width: rect.width }
        : { top: rect.bottom + PANEL_GAP, left: rect.left, width: rect.width }
    );
    setMaxListHeight(maxHeight - 54);
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  React.useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }

    reposition();

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        close();
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function handleViewportChange() {
      if (triggerRef.current?.getBoundingClientRect().width) reposition();
      else close();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, reposition, close]);

  const panel = (
    <div
      ref={panelRef}
      style={panelStyle ?? undefined}
      className="fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xl animate-in fade-in zoom-in-95"
    >
      <div className="border-b border-border/60 p-1.5">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-xl border border-border/60 bg-surface-2/60 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-brand/60"
        />
      </div>
      <div className="overflow-y-auto p-1" style={{ maxHeight: maxListHeight }}>
        {filtered.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-text-secondary">No results</p>
        ) : (
          filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                close();
              }}
              className={cn(
                "w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors",
                opt.value === value ? "bg-brand/10 text-brand" : "text-text-primary hover:bg-surface-2"
              )}
            >
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-surface px-3 py-1.5 text-xs text-text-primary ring-offset-background shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        <span className={selected ? "" : "text-text-secondary/60"}>
          {selected?.label || placeholder || "Select..."}
        </span>
        <svg
          className="h-4 w-4 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && panelStyle && createPortal(panel, document.body)}
    </div>
  );
}