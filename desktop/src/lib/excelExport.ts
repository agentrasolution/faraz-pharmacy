interface ExcelExportOptions {
  title: string;
  filename: string;
  sheets: {
    name: string;
    headers: string[];
    rows: (string | number)[][];
    totals?: { label: string; value: string }[];
  }[];
}

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadExcel(options: ExcelExportOptions): void {
  const { title, filename, sheets } = options;

  const wb = sheets
    .map((sheet) => {
      const totalRows = sheet.totals
        ? [[], sheet.totals.map((t) => t.label + ": " + t.value).join(", ")]
        : [];

      const allRows = [
        sheet.headers.join(","),
        ...sheet.rows.map((row) => row.map(csvEscape).join(",")),
        ...totalRows,
      ];

      return `[Sheet: ${sheet.name}]\n${allRows.join("\n")}`;
    })
    .join("\n\n");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: 'Outfit', 'Inter', system-ui, sans-serif; margin: 24px; background: #F8F9FD; }
  table { border-collapse: separate; border-spacing: 0; width: 100%; margin-bottom: 32px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  th { background: #4A25E1; color: white; padding: 12px 14px; text-align: left; font-weight: 600; font-size: 12px; }
  td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 12px; background: white; }
  tr:nth-child(even) td { background: #fdfdfe; }
  tr:hover td { background: #f4f2ff; }
  .sheet-title { font-size: 16px; font-weight: 700; color: #4A25E1; margin: 24px 0 12px; }
  .totals { margin-top: 12px; padding: 10px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .no-data { text-align: center; padding: 20px; color: #6b7280; font-style: italic; }
</style>
</head>
<body>
  <h1 style="color: #4A25E1; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.5px;">FARAZ PHARMACY</h1>
  <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">${title}</p>
  ${sheets
    .map(
      (sheet) => `
    <div class="sheet-title">${sheet.name}</div>
    ${
      sheet.rows.length === 0
        ? '<div class="no-data">No data available</div>'
        : `<table>
      <thead><tr>${sheet.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${sheet.rows
        .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}</tbody>
    </table>
    ${
      sheet.totals?.length
        ? `<div class="totals">${sheet.totals.map((t) => `<strong>${t.label}:</strong> ${t.value}`).join(" &nbsp;|&nbsp; ")}</div>`
        : ""
    }`
    }`
    )
    .join("\n")}
  <script>
    // Copy to clipboard for pasting into Excel
    document.addEventListener('DOMContentLoaded', function() {
      const tables = document.querySelectorAll('table');
      let tsv = '';
      tables.forEach(function(table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach(function(row) {
          const cells = row.querySelectorAll('th, td');
          const rowData = [];
          cells.forEach(function(cell) { rowData.push(cell.textContent || ''); });
          tsv += rowData.join('\\t') + '\\n';
        });
        tsv += '\\n';
      });

      const btn = document.createElement('button');
      btn.textContent = 'Copy to Clipboard (paste into Excel)';
      btn.style.cssText = 'position:fixed;top:20px;right:20px;padding:10px 20px;background:#4A25E1;color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(74,37,225,0.25);';
      btn.onclick = function() {
        navigator.clipboard.writeText(tsv).then(function() {
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = 'Copy to Clipboard (paste into Excel)'; }, 2000);
        });
      };
      document.body.appendChild(btn);
    });
  <\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function downloadCSVFile(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadExcelFile(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.xlsx?$/, ".csv");
  a.click();
  URL.revokeObjectURL(url);
}
