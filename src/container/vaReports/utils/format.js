export const fmtInt = (n) => (n == null ? "–" : Math.round(n).toLocaleString("en-GB"));
export const fmtPct = (n, digits = 1) => (n == null || Number.isNaN(n) ? "–" : `${n.toFixed(digits)}%`);
export const fmtDays = (n) => (n == null ? "–" : `${n.toFixed(1)} d`);
export const fmtEur = (n) =>
  n == null ? "–" : n >= 1e6 ? `€${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `€${(n / 1e3).toFixed(1)}k` : `€${Math.round(n).toLocaleString("en-GB")}`;
export const fmtEurFull = (n) => (n == null ? "–" : `€${Math.round(n).toLocaleString("en-GB")}`);
