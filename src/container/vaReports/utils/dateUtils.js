// Date helpers. The API returns ServerTime as "dd/MM/yyyy" and DateTime fields as ISO strings.

const pad = (n) => String(n).padStart(2, "0");
export const DAY_MS = 86400000;

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY_MS);
export const addMonths = (d, n) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

/** "dd/MM/yyyy" -> Date (local midnight). Returns null when invalid. */
export const parseDmy = (s) => {
  if (!s || typeof s !== "string") return null;
  const [d, m, y] = s.split(/[/-]/).map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Date -> "dd/MM/yyyy" */
export const toDmy = (d) => (d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "");

/** "yyyy-MM-dd" (URL format) <-> Date */
export const parseIsoDay = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
export const toIsoDay = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "");

export const parseAny = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) return parseDmy(v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const daysBetween = (a, b) => (b.getTime() - a.getTime()) / DAY_MS;

/** Bucket key + label for trend granularity */
export const bucketOf = (date, granularity) => {
  const d = startOfDay(date);
  if (granularity === "day") return { key: toIsoDay(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, start: d };
  if (granularity === "week") {
    const monday = addDays(d, -((d.getDay() + 6) % 7));
    return { key: toIsoDay(monday), label: `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}`, start: monday };
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return {
    key: toIsoDay(first),
    label: first.toLocaleString("en-GB", { month: "short", year: "2-digit" }),
    start: first,
  };
};

/** Every bucket between from and to (inclusive) so gaps show as zero. */
export const bucketRange = (from, to, granularity) => {
  const out = [];
  let cursor = bucketOf(from, granularity).start;
  const end = startOfDay(to);
  let guard = 0;
  while (cursor <= end && guard < 800) {
    out.push(bucketOf(cursor, granularity));
    cursor = granularity === "day" ? addDays(cursor, 1) : granularity === "week" ? addDays(cursor, 7) : addMonths(cursor, 1);
    guard += 1;
  }
  return out;
};
