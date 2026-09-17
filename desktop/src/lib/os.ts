const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

export function modKey(): string {
  return isMac ? "⌘" : "Ctrl";
}

export function modLabel(shortcut: string): string {
  return shortcut.replace(/Mod/g, isMac ? "⌘" : "Ctrl").replace(/Alt/g, isMac ? "⌥" : "Alt").replace(/Shift/g, isMac ? "⇧" : "Shift");
}

export { isMac };
