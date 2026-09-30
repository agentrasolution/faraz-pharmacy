import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function today(): string {
  return toDateStr(new Date());
}

function offsetDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function startOfLastWeek(): Date {
  const d = startOfWeek();
  d.setDate(d.getDate() - 7);
  return d;
}

function endOfLastWeek(): Date {
  const d = startOfWeek();
  d.setDate(d.getDate() - 1);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  return d;
}

function startOfLastMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1, 1);
  return d;
}

function endOfLastMonth(): Date {
  const d = new Date();
  d.setDate(0);
  return d;
}

function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

const QUICK_RANGES = [
  { label: "Today", getRange: () => ({ from: today(), to: today() }) },
  {
    label: "Yesterday",
    getRange: () => ({ from: toDateStr(offsetDate(-1)), to: toDateStr(offsetDate(-1)) }),
  },
  { label: "This Week", getRange: () => ({ from: toDateStr(startOfWeek()), to: today() }) },
  {
    label: "Last Week",
    getRange: () => ({ from: toDateStr(startOfLastWeek()), to: toDateStr(endOfLastWeek()) }),
  },
  { label: "This Month", getRange: () => ({ from: toDateStr(startOfMonth()), to: today() }) },
  {
    label: "Last Month",
    getRange: () => ({ from: toDateStr(startOfLastMonth()), to: toDateStr(endOfLastMonth()) }),
  },
  { label: "Last 30 Days", getRange: () => ({ from: toDateStr(offsetDate(-30)), to: today() }) },
  { label: "This Year", getRange: () => ({ from: toDateStr(startOfYear()), to: today() }) },
] as const;

export default function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeRange, setActiveRange] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Automatically determine if current value matches one of the predefined quick ranges
  const matchedRange = useMemo(() => {
    if (activeRange) return activeRange;
    const match = QUICK_RANGES.find((r) => {
      const q = r.getRange();
      return q.from === value.from && q.to === value.to;
    });
    return match ? match.label : null;
  }, [activeRange, value.from, value.to]);

  function applyQuickRange(label: string) {
    const range = QUICK_RANGES.find((r) => r.label === label);
    if (!range) return;
    setActiveRange(label);
    onChange(range.getRange());
    setOpen(false);
  }

  return (
    <div className={cn("flex items-center gap-2", className)} ref={ref}>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "h-9 gap-2 bg-surface hover:bg-surface-2 border-border/80 text-text-primary rounded-xl shadow-xs transition-all font-medium text-xs cursor-pointer",
            open && "border-brand ring-2 ring-brand/15"
          )}
        >
          <Calendar className="h-4 w-4 text-brand" />
          <span>{matchedRange || "Custom Range"}</span>
          <ChevronDown
            className={cn("h-3 w-3 text-text-secondary transition-transform duration-200", open && "rotate-180")}
          />
        </Button>

        {open && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border/80 rounded-2xl shadow-2xl z-[100] p-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            <div className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider border-b border-border/40 mb-1">
              Date Presets
            </div>
            {QUICK_RANGES.map((range) => {
              const isSelected = matchedRange === range.label;
              return (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => applyQuickRange(range.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer text-left",
                    isSelected
                      ? "bg-brand/10 text-brand font-bold"
                      : "text-text-primary hover:bg-surface-2"
                  )}
                >
                  <span>{range.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-brand" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={value.from}
          onChange={(e) => {
            onChange({ ...value, from: e.target.value });
            setActiveRange(null);
          }}
          className="h-9 w-36 text-xs rounded-xl bg-surface border-border/80 shadow-xs"
        />
        <span className="text-xs text-text-secondary font-medium px-0.5">to</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => {
            onChange({ ...value, to: e.target.value });
            setActiveRange(null);
          }}
          className="h-9 w-36 text-xs rounded-xl bg-surface border-border/80 shadow-xs"
        />
      </div>
    </div>
  );
}
