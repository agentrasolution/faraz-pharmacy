import { FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExportButtonsProps {
  onPDF: () => void;
  onExcel: () => void;
  className?: string;
}

export default function ExportButtons({ onPDF, onExcel, className }: ExportButtonsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={onPDF}
        className="h-9 gap-2 border-danger/20 text-danger hover:bg-danger hover:text-white hover:border-danger transition-all"
      >
        <FileText className="h-4 w-4" />
        <span>PDF</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExcel}
        className="h-9 gap-2 border-success/20 text-success hover:bg-success hover:text-white hover:border-success transition-all"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span>Excel</span>
      </Button>
    </div>
  );
}
