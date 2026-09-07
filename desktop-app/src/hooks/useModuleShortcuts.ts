import { useEffect, useRef } from "react";

interface ModuleShortcuts {
  onAdd?: () => void;
  onSearch?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
}

export function useModuleShortcuts(shortcuts: ModuleShortcuts) {
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;

      if (!mod) return;

      // Cmd/Ctrl + N → Add new
      if (e.key.toLowerCase() === "n" && shortcuts.onAdd) {
        e.preventDefault();
        shortcuts.onAdd();
        return;
      }

      // Cmd/Ctrl + F → Focus search
      if (e.key.toLowerCase() === "f" && shortcuts.onSearch) {
        e.preventDefault();
        shortcuts.onSearch();
        return;
      }

      // Cmd/Ctrl + Shift + P → Export PDF
      if (e.shiftKey && e.key.toLowerCase() === "p" && shortcuts.onExportPDF) {
        e.preventDefault();
        shortcuts.onExportPDF();
        return;
      }

      // Cmd/Ctrl + Shift + E → Export CSV
      if (e.shiftKey && e.key.toLowerCase() === "e" && shortcuts.onExportCSV) {
        e.preventDefault();
        shortcuts.onExportCSV();
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);

  return { searchRef };
}
