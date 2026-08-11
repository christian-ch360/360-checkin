import "server-only";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportTable } from "@/features/reports/services/reports.service";

export function exportToCSV(table: ReportTable): string {
  return Papa.unparse({
    fields: table.columns.map((c) => c.label),
    data: table.rows.map((row) => table.columns.map((c) => row[c.key] ?? "")),
  });
}

export function exportToXLSX(table: ReportTable): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    table.rows.map((row) =>
      Object.fromEntries(table.columns.map((c) => [c.label, row[c.key] ?? ""]))
    )
  );

  // json_to_sheet only writes the display string — a "url" column's cell
  // needs its `l.Target` property set too, or Excel renders the URL as
  // plain text instead of a clickable hyperlink.
  table.columns.forEach((column, colIndex) => {
    if (column.type !== "url") return;
    table.rows.forEach((row, rowIndex) => {
      const value = row[column.key];
      if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return;
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex })];
      if (cell) cell.l = { Target: value };
    });
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, table.title.slice(0, 31));
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function exportToPDF(table: ReportTable): Buffer {
  const doc = new jsPDF({ orientation: table.columns.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(table.title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [table.columns.map((c) => c.label)],
    body: table.rows.map((row) => table.columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [23, 23, 23] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
