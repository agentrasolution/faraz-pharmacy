import { useState, useRef, useEffect } from "react";
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
          onClick={() => setOpen(!open)}
          className="h-9 gap-2 bg-surface-1 border-border/60 hover:border-border"
        >
          <Calendar className="h-4 w-4 text-text-secondary" />
          <span className="text-sm font-medium">{activeRange || "Date Range"}</span>
          <ChevronDown
            className={cn("h-3 w-3 text-text-secondary transition-transform", open && "rotate-180")}
          />
        </Button>

        {open && (
          <div className="absolute top-full left-0 mt-2 w-52 bg-surface-1 border border-border rounded-xl shadow-xl z-[100] py-2 animate-in fade-in slide-in-from-top-2">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => applyQuickRange(range.label)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                  activeRange === range.label
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                )}
              >
                <span>{range.label}</span>
                {activeRange === range.label && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value.from}
          onChange={(e) => {
            onChange({ ...value, from: e.target.value });
            setActiveRange(null);
          }}
          className="h-9 w-36 text-sm"
        />
        <span className="text-xs text-text-secondary font-medium">to</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => {
            onChange({ ...value, to: e.target.value });
            setActiveRange(null);
          }}
          className="h-9 w-36 text-sm"
        />
      </div>
    </div>
  );
}
