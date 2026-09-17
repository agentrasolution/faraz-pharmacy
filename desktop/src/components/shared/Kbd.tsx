import { modKey } from "@/lib/os";
import { cn } from "@/lib/utils";

interface KbdProps {
  children?: string;
  className?: string;
}

export default function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-background border border-border text-text-secondary min-w-[20px]",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function ShortcutHint({ shortcut, className }: { shortcut: string; className?: string }) {
  const mod = modKey();
  const parts = shortcut.split("+").map((p) => {
    if (p === "Mod") return mod;
    if (p === "Shift") return "⇧";
    if (p === "Alt") return "⌥";
    return p;
  });

  return (
    <span className={cn("inline-flex items-center gap-0.5 ml-2", className)}>
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center">
          <Kbd>{part}</Kbd>
          {i < parts.length - 1 && <span className="text-[9px] text-text-secondary/50 mx-0.5">+</span>}
        </span>
      ))}
    </span>
  );
}
