// VA Reports data service – the ONLY place the page gets data from.
//
// USE_MOCK = true  -> deterministic mock data, returned in the exact JSON shape of the real API models.
// USE_MOCK = false -> real endpoints (see REPORT_API below; they still need building on the backend).
// The UI only depends on the shapes returned here, so flipping the flag needs no UI change.
//
// Testing helpers (mock only, via the page URL):
//   ?mockFail=quotes,history   -> that dataset rejects, so widgets show their error state
//   ?mockEmpty=1               -> every dataset returns no rows, so widgets show their empty state

import { PostApi } from "../../../utils/api/networking";
import { Base_Url, Dashboard_API } from "../../../utils/api/apiUrl";
import { isSuccess } from "../../../utils/commonFunction/common";
import { JOB_STATUSES } from "../constants";
import { getMockDatabase } from "./mock/mockData";
import { parseDmy, parseAny, startOfDay } from "../utils/dateUtils";

export const USE_MOCK = true;

// Proposed endpoints (backend work, not built yet). Request = EnquiryFilterRequest unless noted.
export const REPORT_API = {
  Master: Dashboard_API.Master, // existing: VA/MasterDropdowns
  Dataset: `${Base_Url}/VA/ReportDataset`,
  Items: `${Base_Url}/VA/ReportEnquiryItems`,
  Quotes: `${Base_Url}/VA/ReportSupplierQuotes`,
  History: `${Base_Url}/VA/ReportStatusHistory`,
  Suppliers: `${Base_Url}/VA/ReportSuppliers`,
};

const urlFlags = () => {
  const p = new URLSearchParams(window.location.search);
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

/** Same rules as VAController.ViewDashboard (agency branch) so the mock summary matches the real one. */
const summarise = (rows) => {
  const byStatus = new Map();
  rows.forEach((r) => {
    const key = r.status;
    byStatus.set(key, { statusId: key, statusName: r.statusName, enquiryCount: (byStatus.get(key)?.enquiryCount || 0) + 1 });
  });
  return {
    proof: 0, artwork: 0, production: 0, forapproval: 0, newrfq: 0, quoteproposed: 0, invites: 0,
    active: rows.filter((r) => r.status === 1).length,
    approval: rows.filter((r) => r.status === 3).length,
    awarded: rows.filter((r) => r.status >= 6 && r.status !== 24).length,
    completed: rows.filter((r) => r.status === 24).length,
    jobStatus: [...byStatus.values()].sort((a, b) => b.enquiryCount - a.enquiryCount),
  };
};

const unwrap = (res, label) => {
  if (!isSuccess(res)) throw new Error(res?.message || `Could not load ${label}`);
  return res;
};

// ---------------------------------------------------------------- public API

/** -> MasterDropdowns { country, client, user, status } (DropdownItem lists) */
export const getMasterDropdowns = async (req) => {
  if (!USE_MOCK) return PostApi(REPORT_API.Master, req);
  return mockCall("master", () => {
    const db = getMockDatabase();
    return {
      country: db.countries.map((c) => ({ value: c.id, label: c.name, selected: false })),
      client: db.clients.map((c) => ({ value: c.id, label: c.name, selected: false })),
      // NOTE: the real MasterDropdowns returns only the logged-in user; reports need every agency user.
      user: db.users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}`, selected: false })),
      status: JOB_STATUSES.map((s) => ({ value: s.statusId, label: s.statusName, selected: false })),
    };
  });
};

/** -> Result { status, data: { summary: GetJobCount, detailed: ProjectInformation[] } } */
export const getReportDataset = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Dataset, req), "enquiries");
  return mockCall("dataset", (empty) => {
    const db = getMockDatabase();
    const detailed = empty ? [] : db.enquiries.filter((e) => inRange(parseDmy(e.serverTime), req));
    return { status: true, data: { summary: summarise(detailed), detailed: [...detailed].reverse() } };
  });
};

/** -> Result { status, data: EnquiryItem[] } (TblEnquiryDetail subset) */
export const getEnquiryItems = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Items, req), "line items");
  return mockCall("items", (empty) => {
    const db = getMockDatabase();
    const ids = enquiryIdsInRange(db, req);
    return { status: true, data: empty ? [] : db.enquiryItems.filter((i) => ids.has(i.enquiryId)) };
  });
};

/** -> Result { status, data: SupplierQuote[] } (TblSupplierQuote; e-bidding rounds = several rows) */
export const getSupplierQuotes = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Quotes, req), "supplier quotes");
  return mockCall("quotes", (empty) => {
    const db = getMockDatabase();
    const ids = enquiryIdsInRange(db, req);
    return { status: true, data: empty ? [] : db.supplierQuotes.filter((q) => ids.has(q.enquiryId)) };
  });
};

/** -> Result { status, data: JobHistory[] } (TblJobHistory, Field = "Status") */
export const getStatusHistory = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.History, req), "status history");
  return mockCall("history", (empty) => {
    const db = getMockDatabase();
    const ids = enquiryIdsInRange(db, req);
    return { status: true, data: empty ? [] : db.jobHistory.filter((h) => ids.has(h.enqId) && parseAny(h.modifiedDate)) };
  });
};

/** -> Result { status, data: Supplier[] } (TblSuppliersList subset) */
export const getSuppliers = async (req) => {
  if (!USE_MOCK) return unwrap(await PostApi(REPORT_API.Suppliers, req), "suppliers");
  return mockCall("suppliers", () => ({ status: true, data: getMockDatabase().suppliers }));
};
