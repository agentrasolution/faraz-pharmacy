interface PDFExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: { from: string; to: string };
  summary?: { label: string; value: string }[];
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

export function generatePDF(options: PDFExportOptions): void {
  const { title, subtitle, dateRange, summary, headers, rows, filename } = options;

  const now = new Date();
  const generatedAt = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalPages = Math.ceil(rows.length / 30) || 1;

  const summaryHtml = summary?.length
    ? `<div class="summary">
        ${summary.map((s) => `<div class="summary-item"><span class="summary-label">${s.label}</span><span class="summary-value">${s.value}</span></div>`).join("")}
       </div>`
    : "";

  const dateRangeHtml = dateRange
    ? `<div class="period">
        <span>Period:</span> ${dateRange.from} — ${dateRange.to}
       </div>`
    : "";

  const tableRows = rows
    .map(
      (row, i) =>
        `<tr${i % 2 === 0 ? ' class="even"' : ""}>${row.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
  .header h1 { font-size: 24px; font-weight: 700; color: #0d9488; margin-bottom: 4px; letter-spacing: -0.5px; }
  .header p { font-size: 13px; color: #6b7280; }
  .period { font-size: 12px; color: #6b7280; margin-top: 8px; }
  .period span { font-weight: 600; color: #374151; }
  .generated { font-size: 11px; color: #9ca3af; margin-top: 4px; }
  .summary { display: flex; gap: 24px; margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .summary-item { flex: 1; text-align: center; }
  .summary-label { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .summary-value { display: block; font-size: 20px; font-weight: 700; color: #0d9488; font-family: 'SF Mono', 'Cascadia Code', monospace; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
  th { background: #0d9488; color: white; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr.even { background: #f9fafb; }
  tr:hover { background: #f0fdfa; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
  .footer .page { font-weight: 600; }
  .no-data { text-align: center; padding: 40px; color: #6b7280; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <h1>FARAZ PHARMACY</h1>
    <p>${title}</p>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
    ${dateRangeHtml}
    <div class="generated">Generated: ${generatedAt}</div>
  </div>

  ${summaryHtml}

  ${
    rows.length === 0
      ? '<div class="no-data">No data available for the selected period.</div>'
      : `
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>`
  }

  <div class="footer">
    <span>Faraz Pharmacy — Confidential Business Report</span>
    <span class="page">Page 1 of ${totalPages}</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
