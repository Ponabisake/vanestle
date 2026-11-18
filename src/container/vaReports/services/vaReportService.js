// VA Reports data service – the ONLY place the page gets data from.
//
// Real endpoints (VANestleApi VAController, region "VA Reports"); the request is EnquiryFilterRequest.
// Add ?mock=1 to the page URL to use the deterministic mock database instead (same JSON shapes), e.g. to work on the
// UI without a backend. Mock-only testing helpers:
//   ?mock=1&mockFail=quotes,history   -> that dataset rejects, so widgets show their error state
//   ?mock=1&mockEmpty=1               -> every dataset returns no rows, so widgets show their empty state

import { PostApi } from "../../../utils/api/networking";
import { Base_Url, Dashboard_API } from "../../../utils/api/apiUrl";
import { isSuccess } from "../../../utils/commonFunction/common";
import { EB_STATUSES, JOB_STATUSES } from "../constants";
import { getMockDatabase } from "./mock/mockData";
import { parseDmy, startOfDay, toDmy } from "../utils/dateUtils";

const urlParams = () => new URLSearchParams(window.location.search);
export const USE_MOCK = urlParams().get("mock") === "1";

export const REPORT_API = {
  Master: Dashboard_API.Master, // existing: VA/MasterDropdowns (country list)
  Meta: `${Base_Url}/VA/ReportMeta`,
  Dataset: `${Base_Url}/VA/ReportDataset`,
  Items: `${Base_Url}/VA/ReportEnquiryItems`,
  Quotes: `${Base_Url}/VA/ReportSupplierQuotes`,
  History: `${Base_Url}/VA/ReportStatusHistory`,
  Suppliers: `${Base_Url}/VA/ReportSuppliers`,
};

const urlFlags = () => {
  const p = urlParams();
  return {
    fail: (p.get("mockFail") || "").split(",").filter(Boolean),
    empty: p.get("mockEmpty") === "1",
  };
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const mockCall = async (name, build) => {
  await delay(350 + Math.random() * 700);
  const { fail, empty } = urlFlags();
  if (fail.includes(name)) throw new Error(`Mock failure for "${name}"`);
  return build(empty);
};

const inRange = (date, req) => {
  const from = parseDmy(req.startDate);
  const to = parseDmy(req.endDate);
  if (!date) return false;
  if (from && date < startOfDay(from)) return false;
  if (to && date >= new Date(startOfDay(to).getTime() + 86400000)) return false;
  return true;
};

const enquiryIdsInRange = (db, req) =>
  new Set(db.enquiries.filter((e) => inRange(parseDmy(e.serverTime), req)).map((e) => e.id));

/** Result { status, data } -> the result, or throw with the API's message (failures carry it in data). */
const unwrap = (res, label) => {
  if (!isSuccess(res)) {
    const msg = typeof res?.data === "string" && res.data ? res.data : res?.message;
    throw new Error(msg || `Could not load ${label}`);
  }
  return res;
};

/** Distinct categories of the mock line items, most used first (what VA/ReportMeta returns). */
const mockCategories = () => {
  const counts = new Map();
  getMockDatabase().enquiryItems.forEach((i) => counts.set(i.category, (counts.get(i.category) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, items]) => ({ name, items }));
};

// ---------------------------------------------------------------- public API

/** -> MasterDropdowns { country, client, ... } (DropdownItem lists) */
export const getMasterDropdowns = async (req) => {
  if (!USE_MOCK) return PostApi(REPORT_API.Master, req);
  return mockCall("master", () => {
    const db = getMockDatabase();
    return {
      country: db.countries.map((c) => ({ value: c.id, label: c.name, selected: false })),
      client: db.clients.map((c) => ({ value: c.id, label: c.name, selected: false })),
      status: JOB_STATUSES.map((s) => ({ value: s.statusId, label: s.statusName, selected: false })),
    };
  });
};

/** -> ReportMeta { categories[{name, items}] (distinct Printornonprint, most used first), enquiryStatuses, eBiddingStatuses, isAdmin, countryId, from, to } */
export const getReportMeta = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Meta, req), "report settings").data;
  return mockCall("meta", () => ({
    categories: mockCategories(),
    enquiryStatuses: JOB_STATUSES,
    eBiddingStatuses: EB_STATUSES,
    isAdmin: true,
    countryId: 0,
    from: req.startDate,
    to: req.endDate || toDmy(new Date()),
  }));
};

/** -> Result { status, data: { detailed: ReportEnquiryRow[] } } */
export const getReportDataset = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Dataset, req), "enquiries");
  return mockCall("dataset", (empty) => {
    const db = getMockDatabase();
    const detailed = empty ? [] : db.enquiries.filter((e) => inRange(parseDmy(e.serverTime), req));
    return { status: true, data: { detailed: [...detailed].reverse() } };
  });
};

/** -> Result { status, data: ReportItemRow[] } (tblEnquiryDetails subset + category name) */
export const getEnquiryItems = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Items, req), "line items");
  return mockCall("items", (empty) => {
    const db = getMockDatabase();
    const ids = enquiryIdsInRange(db, req);
    return { status: true, data: empty ? [] : db.enquiryItems.filter((i) => ids.has(i.enquiryId)) };
  });
};

/** -> Result { status, data: ReportQuoteRow[] } (one invitation = line item × supplier; responded, revisions) */
export const getSupplierQuotes = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Quotes, req), "supplier quotes");
  return mockCall("quotes", (empty) => {
    const db = getMockDatabase();
    const ids = enquiryIdsInRange(db, req);
    return { status: true, data: empty ? [] : db.supplierQuotes.filter((q) => ids.has(q.enquiryId)) };
  });
};

/** -> Result { status, data: ReportHistoryRow[] } (tblJobHistory, Field = "Status") */
export const getStatusHistory = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.History, req), "status history");
  return mockCall("history", (empty) => {
    const db = getMockDatabase();
    const ids = enquiryIdsInRange(db, req);
    return { status: true, data: empty ? [] : db.jobHistory.filter((h) => ids.has(h.enqId)) };
  });
};

/** -> Result { status, data: ReportSupplierRow[] } (suppliers invited to / awarded an enquiry in scope) */
export const getSuppliers = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Suppliers, req), "suppliers");
  return mockCall("suppliers", () => ({ status: true, data: getMockDatabase().suppliers }));
};
