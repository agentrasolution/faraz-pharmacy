import { useEffect, useState, useRef } from "react";
import { Barcode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateBarcode, renderBarcode } from "@/lib/utils";
import { api } from "@/lib/api";

interface PrintBarcodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode?: string;
  productName?: string;
}

export default function PrintBarcodeDialog({ open, onOpenChange, barcode: propBarcode, productName }: PrintBarcodeDialogProps) {
  const [barcode, setBarcode] = useState("");
  const [copies, setCopies] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [isNewBarcode, setIsNewBarcode] = useState(false);
  const [printers, setPrinters] = useState<{ name: string; displayName: string; isDefault: boolean }[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("default");
  const barcodeId = useRef(0);
  const labelSize = "35x20";

  useEffect(() => {
    if (!open) return;
    setBarcode("");
    setCopies(1);
    setIsNewBarcode(false);
    if (propBarcode) {
      setBarcode(propBarcode);
      return;
    }
    let cancelled = false;
    (async () => {
      setGenerating(true);
      try {
        const [products, existingBarcodes] = await Promise.all([
          api.products.list(),
          api.barcodes.list(),
        ]);
        const existing = new Set([
          ...products.map(p => p.barcode),
          ...existingBarcodes.map(b => b.code),
        ]);
        let code = generateBarcode();
        while (existing.has(code)) {
          code = generateBarcode();
        }
        if (!cancelled) {
          setBarcode(code);
          setIsNewBarcode(true);
        }
      } catch {
        if (!cancelled) {
          setBarcode(generateBarcode());
          setIsNewBarcode(true);
        }
      }
      if (!cancelled) setGenerating(false);
    })();
    return () => { cancelled = true; };
  }, [open, propBarcode]);

  useEffect(() => {
    if (open) {
      window.electronAPI?.printers
        ?.list()
        .then(setPrinters)
        .catch(() => setPrinters([]));
    }
  }, [open]);

  useEffect(() => {
    if (!barcode || !open) return;
    barcodeId.current++;
    const id = barcodeId.current;
    const svg = document.getElementById("barcode-svg") as unknown as SVGElement;
    if (!svg) return;
    requestAnimationFrame(() => {
      if (id !== barcodeId.current) return;
      renderBarcode(svg, barcode, { margin: 10 });
    });
  }, [barcode, open]);

  async function handlePrint() {
    try {
      if (isNewBarcode) {
        await api.barcodes.create(barcode);
      }
      const svgEl = document.getElementById("barcode-svg") as unknown as SVGElement | null;
      const svgHtml = svgEl ? svgEl.outerHTML : "";
      const [labelWidth, labelHeight] = labelSize.split("x").map(Number);
      const result = await window.printBarcodeLabel(
        barcode,
        copies,
        svgHtml,
        labelWidth,
        labelHeight,
        selectedPrinter === "default" ? undefined : selectedPrinter,
        productName
      );
      if (!result.success) {
        alert("Barcode print failed: " + (result.error || "Unknown error"));
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      alert("Barcode print failed: " + (e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-4 w-4 text-accent" />
            Print Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5 space-y-4">
          {generating ? (
            <div className="flex items-center justify-center h-24 text-sm text-text-secondary">
              Generating unique barcode...
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2">
                <div className="flex items-center justify-center w-full min-h-[80px]">
                  <svg id="barcode-svg" />
                </div>
                {productName ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-bold text-text-primary text-center truncate w-full max-w-[200px]">{productName}</p>
                    <p className="text-[10px] text-text-secondary font-mono tracking-wider">{barcode}</p>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary font-mono tracking-wider">{barcode}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Printer</Label>
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Default printer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Printer</SelectItem>
                    {printers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName}{" "}
                        {p.isDefault ? (
                          <span className="text-text-secondary">(Default)</span>
                        ) : (
                          ""
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {printers.length === 0 && (
                  <p className="text-[10px] text-text-secondary">
                    No installed printers detected. Make sure the printer driver is installed.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                  <Label>Number of copies</Label>
                  <Input type="number" min={1} max={100} value={copies} onChange={(e) => setCopies(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
                </div>
              <Button className="w-full" onClick={handlePrint}>
                Print {copies} label{copies > 1 ? "s" : ""}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
