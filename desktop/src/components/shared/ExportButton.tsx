import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutHint } from "@/components/shared/Kbd";

interface ExportButtonProps {
  type: "pdf" | "csv";
  onClick: () => void;
  disabled?: boolean;
  showShortcut?: boolean;
  className?: string;
}

export default function ExportButton({
  type,
  onClick,
  disabled,
  showShortcut,
  className,
}: ExportButtonProps) {
  if (type === "pdf") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "h-9 gap-2 border-danger/20 text-danger hover:bg-danger hover:text-white hover:border-danger transition-colors",
          className
        )}
      >
        <FileText className="h-4 w-4" />
        <span>PDF</span>
        {showShortcut && <ShortcutHint shortcut="Mod+Shift+P" />}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 gap-2 border-success/20 text-success hover:bg-success hover:text-white hover:border-success transition-colors",
        className
      )}
    >
      <Download className="h-4 w-4" />
      <span>CSV</span>
      {showShortcut && <ShortcutHint shortcut="Mod+Shift+E" />}
    </Button>
  );
}
