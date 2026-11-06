// VA Reports – shared constants (statuses, workflow stages, palette, buckets).
// Status ids / names mirror tblJobStatus exactly.

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

export const STATUS_NAME = Object.fromEntries(JOB_STATUSES.map((s) => [s.statusId, s.statusName]));

export const STATUS = {
  draft: 0,
  rfqSent: 1,
  quotesReceived: 2,
  quoteSentToCustomer: 3,
  revisedQuote: 4,
  authorised: 6,
  completed: 24,
  cancelled: 25,
  closed: 26,
};

// Categorical palette derived from the brand colours and checked with the
// dataviz palette validator (light surface). Order matters – do not reorder.
export const SERIES = ["#4B4FA6", "#CF7729", "#00916B", "#E8A317", "#B23A6F", "#2196F3", "#7c3aed"];
export const NEUTRAL_MARK = "#C6C7C8";

// Workflow stages – current-status groups used by the donut, matrix, ageing and filters.
export const STAGES = [
  { key: "draft", label: "Draft", statuses: [0], color: SERIES[0] },
  { key: "rfq", label: "RFQ & Quotes", statuses: [1, 2, 4], color: SERIES[1] },
  { key: "approval", label: "Pending Approval", statuses: [3, 5], color: SERIES[2] },
  { key: "awarded", label: "Awarded & Ordered", statuses: [6, 7, 8], color: SERIES[3] },
  { key: "production", label: "In Production", statuses: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], color: SERIES[4] },
  { key: "completed", label: "Completed", statuses: [24], color: SERIES[5] },
  { key: "cancelled", label: "Cancelled / Closed", statuses: [25, 26], color: SERIES[6] },
];
export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));
export const stageOfStatus = (statusId) => STAGES.find((s) => s.statuses.includes(Number(statusId)))?.key ?? "draft";
export const OPEN_STAGES = ["draft", "rfq", "approval", "awarded", "production"];

// Funnel = furthest point each enquiry has reached (from status history).
export const FUNNEL_STEPS = [
  { key: "enquiry", label: "Enquiry", test: () => true },
  { key: "rfq", label: "RFQ Sent", test: (max) => max >= 1 },
  { key: "quotes", label: "Quotes Received", test: (max) => max >= 2 },
  { key: "approval", label: "For Approval", test: (max) => max >= 3 },
  { key: "awarded", label: "Awarded", test: (max) => max >= 6 },
  { key: "completed", label: "Completed", test: (max, reachedCompleted) => reachedCompleted },
];

export const AGE_BUCKETS = [
  { key: "0-7", label: "0–7 days", min: 0, max: 7 },
  { key: "8-15", label: "8–15 days", min: 8, max: 15 },
  { key: "16-30", label: "16–30 days", min: 16, max: 30 },
  { key: "30+", label: "30+ days", min: 31, max: Infinity },
];

// Module = tblEnquiryMaster.JobType (menuId 1/2/3 in the app)
export const MODULES = [
  { value: "Enquiry", label: "Enquiry" },
  { value: "E-Bidding", label: "E-Bidding" },
  { value: "Catalog", label: "Catalog" },
];

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
