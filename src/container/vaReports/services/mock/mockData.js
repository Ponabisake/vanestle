// Deterministic mock database for VA Reports.
// Every record uses the SAME field names/types the real API serialises (camelCase JSON of the C# models):
//   enquiries      -> ProjectInformation   (VA/ViewDashboard "detailed")       + jobType (proposed)
//   enquiryItems   -> TblEnquiryDetail     (subset)
//   supplierQuotes -> TblSupplierQuote
//   jobHistory     -> TblJobHistory        (Field = "Status" rows)
//   suppliers      -> TblSuppliersList     (subset)
//   countries/clients/users/statuses -> DropdownItem lists of VA/MasterDropdowns
// Same seed => same data on every load, so screenshots and reviews stay comparable.

import { EB_STATUSES, JOB_STATUSES, NOT_SPECIFIED } from "../../constants";

// Shapes match the real endpoints (VaReportService rows): ReportEnquiryRow, ReportItemRow, ReportQuoteRow (one row per
// line item × supplier), ReportHistoryRow, ReportSupplierRow.
const STATUS_NAME = Object.fromEntries(JOB_STATUSES.map((s) => [s.statusId, s.statusName]));
const EB_STATUS_NAME = Object.fromEntries(EB_STATUSES.map((s) => [s.statusId, s.statusName]));
// E-Bidding numbers its bidding phase differently: before quotes are in it is Draft (-2) / Scheduled (-1) / Live (0)
const toEbStatus = (status, live) => (status === 0 ? -2 : status === 1 ? (live ? 0 : -1) : status);
// Printornonprint values as stored ("" = not filled in), with how often the mock uses them
const MOCK_CATEGORIES = [["Print", 0.44], ["POSM", 0.24], ["Promo", 0.22], ["", 0.07], ["Sustainability", 0.03]];
const categoryName = (value) => value || NOT_SPECIFIED;

// Organisation (tblDivision) and client contacts (tblClient), per country / client
const BUSINESS_UNITS = [
  ["COFFEE", "POWDER & LIQUID BEVERAGE"], ["MILO & MILKS", "POWDER & LIQUID BEVERAGE"], ["CONFECTIONERY", "CONFECTIONERY"],
  ["CULINARY", "FOOD"], ["PETCARE", "PETCARE"], ["CORPORATE EVENTS", "COMMON BU"],
];
const CONTACT_NAMES = ["Alicia Tan", "Rahul Menon", "Siti Aminah", "Kenji Mori", "Grace Lim", "Arjun Das"];
import { addDays, startOfDay, toDmy } from "../../utils/dateUtils";

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const COUNTRIES = [
  { id: 1, name: "Singapore", timeOffset: 8 },
  { id: 2, name: "Malaysia", timeOffset: 8 },
  { id: 3, name: "Indonesia", timeOffset: 7 },
  { id: 4, name: "Thailand", timeOffset: 7 },
  { id: 5, name: "Korea", timeOffset: 9 },
  { id: 6, name: "Japan", timeOffset: 9 },
  { id: 7, name: "Taiwan", timeOffset: 8 },
];

const CLIENTS = [
  { id: 11, name: "Nestlé Singapore", countryId: 1, weight: 5 },
  { id: 12, name: "Nestlé Professional SG", countryId: 1, weight: 2 },
  { id: 20, name: "Nespresso Asia", countryId: 1, weight: 2 },
  { id: 13, name: "Nestlé Malaysia", countryId: 2, weight: 4 },
  { id: 19, name: "Purina Petcare MY", countryId: 2, weight: 2 },
  { id: 14, name: "Nestlé Indonesia", countryId: 3, weight: 3 },
  { id: 15, name: "Nestlé Thailand", countryId: 4, weight: 3 },
  { id: 16, name: "Nestlé Korea", countryId: 5, weight: 2 },
  { id: 17, name: "Nestlé Japan", countryId: 6, weight: 2 },
  { id: 18, name: "Nestlé Taiwan", countryId: 7, weight: 1 },
];

const USERS = [
  { id: 101, firstName: "Aisha", lastName: "Rahman", countryId: 1 },
  { id: 102, firstName: "Daniel", lastName: "Tan", countryId: 1 },
  { id: 103, firstName: "Mei Ling", lastName: "Wong", countryId: 1 },
  { id: 104, firstName: "Hafiz", lastName: "Ismail", countryId: 2 },
  { id: 105, firstName: "Priya", lastName: "Nair", countryId: 2 },
  { id: 106, firstName: "Budi", lastName: "Santoso", countryId: 3 },
  { id: 107, firstName: "Kanya", lastName: "Srisuk", countryId: 4 },
  { id: 108, firstName: "Ji-woo", lastName: "Park", countryId: 5 },
  { id: 109, firstName: "Haruto", lastName: "Sato", countryId: 6 },
  { id: 110, firstName: "Yu-ting", lastName: "Chen", countryId: 7 },
];

const SUPPLIERS = [
  { id: 201, supplierName: "Apex Print Solutions", country: "Singapore", supplierType: "Print" },
  { id: 202, supplierName: "Lionsgate Packaging", country: "Singapore", supplierType: "Packaging" },
  { id: 203, supplierName: "Merlion Display Works", country: "Singapore", supplierType: "POSM" },
  { id: 204, supplierName: "KL Press Sdn Bhd", country: "Malaysia", supplierType: "Print" },
  { id: 205, supplierName: "Selangor POSM Studio", country: "Malaysia", supplierType: "POSM" },
  { id: 206, supplierName: "Jaya Cetak Nusantara", country: "Indonesia", supplierType: "Print" },
  { id: 207, supplierName: "Bandung Kemasan", country: "Indonesia", supplierType: "Packaging" },
  { id: 208, supplierName: "Siam Print House", country: "Thailand", supplierType: "Print" },
  { id: 209, supplierName: "Chao Phraya Displays", country: "Thailand", supplierType: "POSM" },
  { id: 210, supplierName: "Hanbit Printing", country: "Korea", supplierType: "Print" },
  { id: 211, supplierName: "Seoul Promo Lab", country: "Korea", supplierType: "Promo" },
  { id: 212, supplierName: "Tokyo Offset Co.", country: "Japan", supplierType: "Print" },
  { id: 213, supplierName: "Osaka Display Kobo", country: "Japan", supplierType: "POSM" },
  { id: 214, supplierName: "Formosa Print Group", country: "Taiwan", supplierType: "Print" },
  { id: 215, supplierName: "Pacific Promo Asia", country: "Singapore", supplierType: "Promo" },
  { id: 216, supplierName: "Regional Pack Partners", country: "Malaysia", supplierType: "Packaging" },
];

const BRANDS = ["Milo", "Nescafé", "KitKat", "Maggi", "Purina", "Nespresso", "Coffee-mate", "Nestum"];
const PIECES = ["Shelf wobblers", "Festive gift box", "Sampling booth", "Recipe leaflet", "Display stand", "Promo banner",
  "Gondola end kit", "Tasting cups", "Pack sleeve", "Counter display", "Trade show kit", "Loyalty mailer"];

// Main workflow path; optional loops are inserted per enquiry.
const PATH_GAP_DAYS = { 1: [0, 2], 2: [1, 6], 3: [1, 3], 4: [1, 2], 5: [2, 6], 6: [1, 8] };

let cache = null;

export const getMockDatabase = () => {
  if (cache) return cache;
  const rand = mulberry32(20261104);
  const between = (a, b) => a + rand() * (b - a);
  const int = (a, b) => Math.floor(between(a, b + 1));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const weighted = (arr) => {
    const total = arr.reduce((s, x) => s + x.weight, 0);
    let r = rand() * total;
    return arr.find((x) => (r -= x.weight) <= 0) ?? arr[arr.length - 1];
  };

  const today = startOfDay(new Date());

  // Projects (ProjectNo / ProjectDesc are per enquiry in the DB; several enquiries share a project number)
  const projects = Array.from({ length: 46 }, (_, i) => {
    const client = weighted(CLIENTS);
    return {
      projectNo: `10202026${String(35000 + i * 37).padStart(7, "0")}`,
      projectDesc: `${pick(BRANDS)} ${pick(PIECES).toLowerCase()}`,
      clientId: client.id,
      weight: 1 + Math.pow(rand(), 3) * 9,
    };
  });

  const drafts = [];
  for (let i = 0; i < 620; i += 1) {
    const daysAgo = Math.floor(800 * Math.pow(rand(), 1.12));
    const created = addDays(today, -daysAgo);
    created.setHours(int(8, 18), int(0, 59));
    const r = rand();
    const jobType = r < 0.64 ? "Enquiry" : r < 0.84 ? "E-Bidding" : "Catalog";
    const project = weighted(projects);
    const client = CLIENTS.find((c) => c.id === project.clientId);
    const localUsers = USERS.filter((u) => u.countryId === client.countryId);
    const user = rand() < 0.85 && localUsers.length ? pick(localUsers) : pick(USERS);
    drafts.push({ created, jobType, project, client, user });
  }
  drafts.sort((a, b) => a.created - b.created);

  const enquiries = [];
  const enquiryItems = [];
  const supplierQuotes = [];
  const jobHistory = [];
  let itemId = 1;
  let quoteId = 1;
  let historyId = 1;
  const seq = { Enquiry: 3000, "E-Bidding": 800, Catalog: 400 };
  const prefix = { Enquiry: "ENQ", "E-Bidding": "EB", Catalog: "CAT" };

  drafts.forEach((d, idx) => {
    const id = 5000 + idx;
    seq[d.jobType] += 1;
    const enquiryId = `${prefix[d.jobType]}00${seq[d.jobType]}`;
    const country = COUNTRIES.find((c) => c.id === d.client.countryId);

    // ---- status path
    const path = [1, 2];
    if (rand() < 0.25) path.push(4, 2);
    path.push(3);
    if (rand() < 0.35) path.push(5);
    path.push(6, 7, 8, 9, 10, 11);
    if (rand() < 0.4) path.push(12);
    path.push(13);
    if (rand() < 0.25) path.push(14, 13);
    path.push(15, 16, 17, 18, 19, 20, 21, 22, 23, 24);

    const neverStarted = rand() < 0.04;
    const stallAt = rand() < 0.16 ? int(1, 10) : Infinity; // stuck jobs create ageing
    const cancelAt = rand() < 0.07 ? int(1, 14) : Infinity;

    const ebMap = (s) => (d.jobType === "E-Bidding" ? toEbStatus(s, false) : s);
    let status = 0;
    let date = new Date(d.created);
    const reached = [{ status: 0, date: new Date(d.created) }];
    let cancelled = false;
    if (!neverStarted) {
      for (let p = 0; p < path.length; p += 1) {
        if (p >= stallAt) break;
        if (p === cancelAt) {
          const cDate = addDays(date, between(1, 6));
          if (cDate <= today) {
            reached.push({ status: 25, date: cDate });
            status = 25;
            cancelled = true;
          }
          break;
        }
        const next = path[p];
        const [lo, hi] = PATH_GAP_DAYS[next] ?? [0.5, 4];
        const nextDate = addDays(date, between(lo, hi));
        if (nextDate > today) break;
        reached.push({ status: next, date: nextDate });
        jobHistory.push({
          id: historyId++, enqId: id, oldValue: String(ebMap(status)), newValue: String(ebMap(next)),
          modifiedDate: nextDate.toISOString(), userId: d.user.id,
        });
        status = next;
        date = nextDate;
      }
      if (cancelled) {
        const last = reached[reached.length - 1];
        jobHistory.push({
          id: historyId++, enqId: id, oldValue: String(ebMap(reached[reached.length - 2].status)), newValue: "25",
          modifiedDate: last.date.toISOString(), userId: d.user.id,
        });
      } else if (status === 24 && rand() < 0.05) {
        const closed = addDays(date, between(5, 30));
        if (closed <= today) {
          jobHistory.push({ id: historyId++, enqId: id, oldValue: "24", newValue: "26", modifiedDate: closed.toISOString(), userId: d.user.id });
          status = 26;
        }
      }
    }
    const maxReached = Math.max(...reached.filter((x) => x.status < 25).map((x) => x.status));
    const rfqDate = reached.find((x) => x.status === 1)?.date ?? null;

    // ---- items, quotes, award
    const itemCount = d.jobType === "Catalog" ? int(1, 2) : int(1, 4);
    const local = SUPPLIERS.filter((s) => s.country === country.name);
    const pool = [...local, ...SUPPLIERS.filter((s) => s.country !== country.name)];
    const supplierCount = d.jobType === "E-Bidding" ? int(3, 6) : int(2, 4);
    const invited = [];
    pool.forEach((s, i) => {
      if (invited.length < supplierCount && (i < local.length ? rand() < 0.85 : rand() < 0.25)) invited.push(s);
    });
    while (invited.length < 2) invited.push(pick(SUPPLIERS.filter((s) => !invited.includes(s))));

    const isEb = d.jobType === "E-Bidding";
    const biddingStart = isEb && rfqDate ? new Date(rfqDate.getTime() + 3600000 * int(2, 30)) : null;
    const duration = isEb ? pick([60, 90, 120, 180]) : null;

    const pickCategory = () => {
      let r = rand();
      const i = MOCK_CATEGORIES.findIndex(([, w]) => (r -= w) <= 0);
      return MOCK_CATEGORIES[i < 0 ? 0 : i][0];
    };
    const mainCategory = pickCategory();
    const itemCategories = [];
    const itemStatus = isEb ? toEbStatus(status, false) : status;

    for (let n = 1; n <= itemCount; n += 1) {
      const benchmark = Math.round(between(900, 26000));
      const cat = n === 1 || rand() < 0.85 ? mainCategory : pickCategory();
      itemCategories.push(categoryName(cat));
      const item = {
        id: itemId++, enquiryId: id, itemNumber: n, itemName: pick(PIECES), status: itemStatus,
        category: categoryName(cat), printOrNonPrint: cat,
        selectedSuppliers: invited.map((s) => s.id).join(","), supplierId: null,
        benchmarkPrice: benchmark, quotePrice: null, totalQuoteAmount: null, euroTotalQuoteAmount: null, negQuoteAmount: null,
        quoteStartDate: rfqDate ? toDmy(rfqDate) : "", quoteEndDate: rfqDate ? toDmy(addDays(rfqDate, 7)) : "",
        eauction: isEb || rand() < 0.05,
      };
      let best = null;
      if (rfqDate) {
        invited.forEach((s, si) => {
          const willRespond = maxReached >= 2 ? (si === 0 || rand() < 0.82) : rand() < 0.35;
          const responseDate = addDays(rfqDate, between(0.2, 6.5));
          const responded = willRespond && responseDate <= today;
          const first = Math.round(benchmark * between(0.82, 1.14));
          const rounds = isEb && responded ? int(2, 6) : 1;
          let amount = first;
          for (let rd = 2; rd <= rounds; rd += 1) amount = Math.round(amount * between(0.955, 0.99));
          const at = isEb && biddingStart ? new Date(biddingStart.getTime() + (duration * 60000 * rounds) / (rounds + 1)) : responseDate;
          // one row per invitation; e-bidding rounds are counted in `revisions` (tblSupplierQuoteHistory)
          supplierQuotes.push({
            id: quoteId++, enquiryId: id, enquiryDetailsId: item.id, supplierId: s.id, itemNumber: n,
            amount: responded ? amount : null, initAmount: responded ? first : null, saveAmount: responded ? first - amount : null,
            quoteStatus: responded ? (isEb ? 0 : 2) : isEb ? -1 : 1,
            serverTime: (responded ? at : rfqDate).toISOString(),
            responded, revisions: responded ? rounds : 0, firstAmount: responded ? first : null,
          });
          if (responded && (!best || amount < best.amount)) best = { supplierId: s.id, amount };
        });
      }
      if (maxReached >= 6 && best) {
        item.supplierId = best.supplierId;
        item.quotePrice = best.amount;
        item.totalQuoteAmount = Math.round(best.amount * 1.05);
        item.euroTotalQuoteAmount = item.totalQuoteAmount;
        item.negQuoteAmount = Math.round(best.amount * 0.985);
      }
      enquiryItems.push(item);
    }

    const completedDate = reached.find((x) => x.status === 24)?.date;
    const counts = itemCategories.reduce((m, c) => m.set(c, (m.get(c) || 0) + 1), new Map());
    const category = [...counts.entries()].sort((a, b) => b[1] - a[1] || itemCategories.indexOf(a[0]) - itemCategories.indexOf(b[0]))[0][0];
    // brief a few days before creation (sometimes missing), delivery expected 3–10 weeks after the brief
    const brief = rand() < 0.88 ? addDays(d.created, -int(0, 10)) : null;
    const expected = rand() < 0.94 ? addDays(brief || d.created, int(21, 70)) : null;
    const ebLive = isEb && status === 1 && rand() < 0.3;
    const rowStatus = isEb ? toEbStatus(status, ebLive) : status;
    enquiries.push({
      id,
      enquiryId,
      jobType: d.jobType,
      projectNo: d.project.projectNo,
      projectDesc: d.project.projectDesc,
      serverTime: toDmy(d.created),
      status: rowStatus,
      statusName: (isEb ? EB_STATUS_NAME : STATUS_NAME)[rowStatus],
      clientId: d.client.id,
      clientName: d.client.name,
      clientContactId: d.client.id * 100 + (idx % 3) + 1,
      clientContact: CONTACT_NAMES[(d.client.id + idx) % 3 + (d.client.id % 2) * 3],
      clientContactUser: `client${d.client.id}.${(idx % 3) + 1}`,
      clientContactEmail: `contact${(idx % 3) + 1}@${d.client.name.toLowerCase().replace(/[^a-z]+/g, "")}.test`,
      divisionId: country.id * 10 + (idx % 4),
      entity: `Nestlé ${country.name} Ltd`,
      businessUnit: BUSINESS_UNITS[(country.id + idx) % 4 + (country.id % 3)][0],
      globalBu: BUSINESS_UNITS[(country.id + idx) % 4 + (country.id % 3)][1],
      divisionCountry: country.name,
      pmgEntity: country.id,
      country: country.name,
      createdById: d.user.id,
      createdBy: `${d.user.firstName} ${d.user.lastName}`,
      biddingStartDate: biddingStart ? biddingStart.toISOString() : null,
      biddingEndDate: biddingStart ? new Date(biddingStart.getTime() + duration * 60000).toISOString() : null,
      duration,
      briefDate: brief ? toDmy(brief) : null,
      expectedDeliveryDate: expected ? toDmy(expected) : null,
      actualDeliveryDate: completedDate ? toDmy(addDays(completedDate, -int(0, 3))) : null,
      completedDate: completedDate ? completedDate.toISOString() : null,
      category,
      categories: [...counts.keys()],
      itemCount,
      eauction: isEb,
    });
  });

  cache = {
    countries: COUNTRIES,
    clients: CLIENTS,
    users: USERS,
    suppliers: SUPPLIERS.map((s) => ({ ...s, status: true })),
    enquiries,
    enquiryItems,
    supplierQuotes,
    jobHistory,
  };
  return cache;
};
