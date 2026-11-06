import * as XLSX from "xlsx";

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const safe = (name) => name.replace(/[^\w-]+/g, "_");

const download = (href, fileName) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/** rows: array of plain objects; columns: [{ field, header, format? }] */
const toMatrix = (rows, columns) =>
  rows.map((r) => Object.fromEntries(columns.map((c) => [c.header, c.exportValue ? c.exportValue(r) : r[c.field] ?? ""])));

export const exportCsv = (rows, columns, name) => {
  const data = toMatrix(rows, columns);
  const head = columns.map((c) => c.header);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [head.map(esc).join(","), ...data.map((r) => head.map((h) => esc(r[h])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8" }));
  download(url, `${safe(name)}_${stamp()}.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportExcel = (rows, columns, name) => {
  const data = toMatrix(rows, columns);
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Info: "No data for the current filters" }]);
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(c.header.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safe(name).slice(0, 31) || "Report");
  XLSX.writeFile(wb, `${safe(name)}_${stamp()}.xlsx`);
};

/** Rasterise the first chart <svg> inside `container` to a PNG (2x for sharpness). */
export const exportPng = async (container, name) => {
  const svg = container?.querySelector("svg.recharts-surface");
  if (!svg) throw new Error("Switch to the chart view to export a PNG.");
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  // inline the font so text renders the same outside the page
  clone.setAttribute("style", "font-family: Montserrat, Arial, sans-serif;");
  const data = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const scale = 2;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Could not render the chart image."));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  download(canvas.toDataURL("image/png"), `${safe(name)}_${stamp()}.png`);
};
