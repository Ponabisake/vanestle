// VA Reports – shared constants (modules, statuses, stages, categories, palette, buckets).
// Status names come with each enquiry from the API (tblJobStatus / EBtblJobStatus); the lists below are the grouping
// rules and the mock data's names.

export const MODULE = { enquiry: "Enquiry", ebidding: "E-Bidding", catalog: "Catalog" };

// Module = tblEnquiryMaster.JobType (menuId 1/2/3 in the app)
export const MODULES = [
  { value: MODULE.enquiry, label: "Enquiry" },
  { value: MODULE.ebidding, label: "E-Bidding" },
  { value: MODULE.catalog, label: "Catalog" },
];

// Enquiry and Catalog use tblJobStatus. E-Bidding uses EBtblJobStatus, which numbers the bidding phase differently:
// -2 Draft, -1 Scheduled, 0 Live, 1 Paused, -3 Expired; from 2 on it matches tblJobStatus.
export const JOB_STATUSES = [
  { statusId: 0, statusName: "Draft" },
  { statusId: 1, statusName: "RFQ Sent To Supplier" },
  { statusId: 2, statusName: "Quotes Received From Suppliers" },
  { statusId: 3, statusName: "Quote Sent To Customer" },
  { statusId: 4, statusName: "Revised Quote Requested" },
  { statusId: 5, statusName: "Chased Customer For Order" },
  { statusId: 6, statusName: "Customer Authorisation to Proceed" },
  { statusId: 7, statusName: "Order Raised" },
  { statusId: 8, statusName: "Order Confirmed" },
  { statusId: 9, statusName: "Awaiting Artwork/Sample" },
  { statusId: 10, statusName: "Artwork/File Received" },
  { statusId: 11, statusName: "Artwork Sent To Supplier" },
  { statusId: 12, statusName: "Chased Supplier For Proof" },
  { statusId: 13, statusName: "Proof To Customer" },
  { statusId: 14, statusName: "Amendment Required" },
  { statusId: 15, statusName: "Proof Approved" },
  { statusId: 16, statusName: "Printing in Progress" },
  { statusId: 17, statusName: "Delivery Date Confirmed" },
  { statusId: 18, statusName: "Delivery Complete" },
  { statusId: 19, statusName: "File Copies Sent" },
  { statusId: 20, statusName: "File Copies Received" },
  { statusId: 21, statusName: "Supplier Invoice Received" },
  { statusId: 22, statusName: "Ready to Invoice Customer" },
  { statusId: 23, statusName: "Invoice Sent To Customer" },
  { statusId: 24, statusName: "Completed" },
  { statusId: 25, statusName: "Job Cancelled" },
  { statusId: 26, statusName: "Closed" },
];
export const EB_STATUSES = [
  { statusId: -3, statusName: "Expired" },
  { statusId: -2, statusName: "Draft" },
  { statusId: -1, statusName: "Scheduled" },
  { statusId: 0, statusName: "Live" },
  { statusId: 1, statusName: "Paused" },
  ...JOB_STATUSES.filter((s) => s.statusId >= 2),
];

export const STATUS = { completed: 24, cancelled: 25, closed: 26, ebDraft: -2, ebExpired: -3 };

// Categorical palette derived from the brand colours and checked with the
// dataviz palette validator (light surface). Order matters – do not reorder.
export const SERIES = ["#4B4FA6", "#CF7729", "#00916B", "#E8A317", "#B23A6F", "#2196F3", "#7c3aed"];
export const NEUTRAL_MARK = "#C6C7C8";

// Workflow stages – current-status groups used by the donut, ageing and filters.
const PRODUCTION = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
export const STAGES = [
  { key: "draft", label: "Draft", color: SERIES[0], statuses: { default: [0], [MODULE.ebidding]: [-2] } },
  { key: "rfq", label: "RFQ / Bidding", color: SERIES[1], statuses: { default: [1, 2, 4], [MODULE.ebidding]: [-1, 0, 1, 2, 4] } },
  { key: "approval", label: "Pending approval", color: SERIES[2], statuses: { default: [3, 5] } },
  { key: "awarded", label: "Awarded & ordered", color: SERIES[3], statuses: { default: [6, 7, 8] } },
  { key: "production", label: "In production", color: SERIES[4], statuses: { default: PRODUCTION } },
  { key: "completed", label: "Completed", color: SERIES[5], statuses: { default: [24] } },
  { key: "cancelled", label: "Cancelled / closed", color: SERIES[6], statuses: { default: [25, 26], [MODULE.ebidding]: [25, 26, -3] } },
];
export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const statusesOf = (stage, module) => stage.statuses[module] ?? stage.statuses.default;
/** Stage of a status in its module (an enquiry without line items, status null, counts as a draft). */
export const stageOfStatus = (statusId, module) => {
  if (statusId == null || statusId === "") return "draft";
  const s = Number(statusId);
  return STAGES.find((st) => statusesOf(st, module).includes(s))?.key ?? "draft";
};
export const OPEN_STAGES = ["draft", "rfq", "approval", "awarded", "production"];

/**
 * Progress of a status on the Enquiry scale (0 draft, 1 RFQ out, 2 quotes in, 3 quote to customer, 6 awarded ...),
 * so E-Bidding and Enquiry history read the same. Terminal statuses (cancelled, closed, expired) return null.
 */
export const progressOf = (statusId, module) => {
  if (statusId == null || statusId === "") return 0;
  const s = Number(statusId);
  if (s === STATUS.cancelled || s === STATUS.closed || s === STATUS.ebExpired) return null;
  if (module === MODULE.ebidding) {
    if (s === STATUS.ebDraft) return 0;
    if (s === -1 || s === 0 || s === 1) return 1; // scheduled, live, paused: the event is out to suppliers
  }
  return s;
};

/**
 * Status groups – one partition of every enquiry, used by the KPI tiles and the "by status" splits:
 * Draft + In progress + Pending approval + Completed + Cancelled = total.
 */
export const STATUS_GROUPS = [
  { key: "draft", label: "Draft", stages: ["draft"], color: SERIES[0] },
  { key: "inProgress", label: "In progress", stages: ["rfq", "awarded", "production"], color: SERIES[1] },
  { key: "pending", label: "Pending approval", stages: ["approval"], color: SERIES[2] },
  { key: "completed", label: "Completed", stages: ["completed"], color: SERIES[5] },
  { key: "cancelled", label: "Cancelled / closed", stages: ["cancelled"], color: SERIES[6] },
];
export const groupOfStage = (stage) => STATUS_GROUPS.find((g) => g.stages.includes(stage))?.key ?? "draft";

// Funnel = furthest point each enquiry has reached (from status history, on the progressOf scale).
export const FUNNEL_STEPS = [
  { key: "enquiry", label: "Enquiry", test: () => true },
  { key: "rfq", label: "RFQ / bid sent", test: (max) => max >= 1 },
  { key: "quotes", label: "Quotes received", test: (max) => max >= 2 },
  { key: "approval", label: "For approval", test: (max) => max >= 3 },
  { key: "awarded", label: "Awarded", test: (max) => max >= 6 },
  { key: "completed", label: "Completed", test: (max, reachedCompleted) => reachedCompleted },
];

// Ageing of open enquiries: days since the enquiry was created.
export const AGE_BUCKETS = [
  { key: "0-7", label: "0–7 days", min: 0, max: 7 },
  { key: "8-15", label: "8–15 days", min: 8, max: 15 },
  { key: "16-30", label: "16–30 days", min: 16, max: 30 },
  { key: "31-60", label: "31–60 days", min: 31, max: 60 },
  { key: "61-90", label: "61–90 days", min: 61, max: 90 },
  { key: "90+", label: "Above 90 days", min: 91, max: Infinity },
];
export const ageBucketOf = (days) => (days == null ? null : AGE_BUCKETS.find((b) => days >= b.min && days <= b.max)?.key ?? null);

// Categories = the distinct tblEnquiryDetails.Printornonprint values, most used first (VA/ReportMeta; the API merges
// spellings that differ only in case and calls empty values "Not specified"). Tables, filters and matrices list every
// category. Charts that colour by category give the first MAX_CATEGORY_SERIES their own colour and fold the rest into one
// grey "Other categories" series – the categorical palette never grows past its fixed hues.
export const NOT_SPECIFIED = "Not specified";
/** Shown for an enquiry without a client contact or division (entity / business unit / global BU). */
export const NOT_ASSIGNED = "Not assigned";
export const MAX_CATEGORY_SERIES = 6;
export const OTHER_CATEGORIES = { key: "cs___other", label: "Other categories", color: NEUTRAL_MARK };

/**
 * Categories in display order: from the meta call (whole database, so the order and colours don't move with the range
 * or filters), plus any value the loaded enquiries have that meta didn't list. Without meta: the loaded enquiries,
 * most used first.
 */
export const categoryList = (meta, rows = []) => {
  const counts = new Map();
  (meta?.categories || []).forEach((c) => counts.set(c.name, c.items ?? 0));
  const fromRows = new Map();
  rows.forEach((r) => {
    const n = r.category || NOT_SPECIFIED;
    fromRows.set(n, (fromRows.get(n) || 0) + 1);
  });
  [...fromRows.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => !counts.has(n) && counts.set(n, meta?.categories?.length ? 0 : c));
  return [...counts.keys()].map((name, i) => {
    const own = i < MAX_CATEGORY_SERIES;
    return {
      key: name,
      label: name,
      order: i,
      color: own ? SERIES[i] : OTHER_CATEGORIES.color,
      series: own ? `cs_${name}` : OTHER_CATEGORIES.key, // the chart series this category is drawn in
    };
  });
};

/** Chart series for "by category" splits: the top categories, then one "Other categories" series when there are more. */
export const categorySeries = (categories) => [
  ...categories.filter((c) => c.order < MAX_CATEGORY_SERIES).map((c) => ({ key: c.series, label: c.label, color: c.color })),
  ...(categories.length > MAX_CATEGORY_SERIES ? [OTHER_CATEGORIES] : []),
];

// Project timeline
export const DUE_SOON_DAYS = 30;

export const BRAND = {
  navy: "#16133F",
  indigo: "#2D2F75",
  orange: "#CF7729",
  amber: "#FAB01B",
  cream: "#fab01b1a",
  zebra: "#F4F6FA",
  good: "#00916B",
  bad: "#ED3B25",
  textPrimary: "#171717",
  textSecondary: "#52514e",
  grid: "#ececec",
};
