// Pure data functions for VA Reports. No React here – easy to unit test, and easy to move server-side later.
//
// Definitions used throughout (shown to users in the KPI / widget hints):
//   status        = the enquiry's line-item status, in its module's numbering (E-Bidding has its own table)
//   stage / group = constants.STAGES / STATUS_GROUPS (Draft, In progress, Pending approval, Completed, Cancelled)
//   category      = the enquiry's dominant line-item category: a Printornonprint value (API: category)
//   ageing        = days since the enquiry was created, open enquiries only
//   project start = Date of brief (BRIEFDATE), else the creation date; planned end = Expected delivery date (EstDate);
//                   completed on = first change to status 24 in the status history
//   invitation    = one line item sent to one supplier (tblSupplierQuotes row); response = that supplier quoted / bid

import {
  DUE_SOON_DAYS, FUNNEL_STEPS, MODULE, OPEN_STAGES, SERIES, STAGES, STATUS_GROUPS, ageBucketOf, AGE_BUCKETS,
  NOT_ASSIGNED, NOT_SPECIFIED, categorySeries, groupOfStage, progressOf, stageOfStatus,
} from "../constants";
import { addDays, bucketOf, bucketRange, daysBetween, parseAny, parseDmy, startOfDay } from "./dateUtils";

export const groupBy = (arr, key) => {
  const m = new Map();
  arr.forEach((x) => {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  });
  return m;
};
export const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
export const sum = (xs) => xs.reduce((s, x) => s + (x || 0), 0);
const present = (xs) => xs.filter((x) => x != null);
const dayDiff = (a, b) => Math.round(daysBetween(startOfDay(a), startOfDay(b)));

/** One row per invitation (line item × supplier); a duplicate row keeps the answered one. */
const dedupeQuotes = (qs) => {
  const m = new Map();
  qs.forEach((q) => {
    const k = `${q.enquiryDetailsId}|${q.supplierId}`;
    const cur = m.get(k);
    if (!cur || (q.responded && !cur.responded)) m.set(k, q);
  });
  return [...m.values()];
};

/**
 * Join the raw API datasets into one "fact" per enquiry. Missing datasets (still loading / failed) leave
 * their derived fields null; widgets check `ready` before using them.
 */
export const buildFacts = ({ master, categories, dataset, items, quotes, history }) => {
  if (!dataset) return [];
  const today = startOfDay(new Date());
  const categoryBy = new Map((categories || []).map((c) => [c.key, c]));
  const clientName = new Map((master?.client || []).map((c) => [c.value, c.label]));
  const itemsBy = items ? groupBy(items, (i) => i.enquiryId) : null;
  const quotesBy = quotes ? groupBy(quotes, (q) => q.enquiryId) : null;
  const historyBy = history ? groupBy(history, (h) => h.enqId) : null;

  const facts = (dataset.data?.detailed || []).map((row) => {
    const module = row.jobType || MODULE.enquiry;
    const created = parseDmy(row.serverTime);
    const status = row.status == null || row.status === "" ? null : Number(row.status);
    const stage = stageOfStatus(status, module);
    const progress = progressOf(status, module);
    const categoryName = row.category || NOT_SPECIFIED;
    const category = categoryBy.get(categoryName);

    // --- history-derived
    let maxReached = null;
    let reachedCompleted = null;
    let rfqDate = null;
    let lastChange = null;
    let completedDate = parseAny(row.completedDate);
    if (historyBy) {
      const h = (historyBy.get(row.id) || [])
        .map((x) => ({ s: Number(x.newValue), p: progressOf(x.newValue, module), d: parseAny(x.modifiedDate) }))
        .filter((x) => x.d && !Number.isNaN(x.s))
        .sort((a, b) => a.d - b.d);
      maxReached = Math.max(progress ?? 0, ...present(h.map((x) => x.p)), 0);
      reachedCompleted = stage === "completed" || h.some((x) => x.s === 24);
      rfqDate = h.find((x) => x.p != null && x.p >= 1)?.d ?? null;
      completedDate = completedDate ?? h.find((x) => x.s === 24)?.d ?? null;
      lastChange = h.length ? h[h.length - 1].d : null;
    }
    if (!rfqDate && module === MODULE.ebidding) rfqDate = parseAny(row.biddingStartDate);

    // --- item-derived (amounts in EUR: EuroTotalQuoteAmount)
    let awardedValue = null;
    let savingsPct = null;
    const invited = new Set();
    if (itemsBy) {
      const its = itemsBy.get(row.id) || [];
      its.forEach((i) => String(i.selectedSuppliers || "").split(",").map(Number).filter(Boolean).forEach((s) => invited.add(s)));
      const awardedItems = (progress ?? 0) >= 6 ? its.filter((i) => i.quotePrice != null) : [];
      awardedValue = sum(awardedItems.map((i) => i.euroTotalQuoteAmount));
      const bench = sum(awardedItems.map((i) => i.benchmarkPrice));
      savingsPct = awardedItems.length && bench ? ((bench - sum(awardedItems.map((i) => i.quotePrice))) / bench) * 100 : null;
    }

    // --- quote-derived (invitations, responses, turnaround, e-bidding)
    let qs = null;
    let turnaroundDays = null;
    let ebid = null;
    if (quotesBy) {
      qs = dedupeQuotes(quotesBy.get(row.id) || []);
      qs.forEach((q) => invited.add(q.supplierId));
      const responded = qs.filter((q) => q.responded);
      const firstResponse = present(responded.map((q) => parseAny(q.serverTime))).sort((a, b) => a - b)[0];
      if (firstResponse && rfqDate && firstResponse >= rfqDate) turnaroundDays = daysBetween(rfqDate, firstResponse);

      if (module === MODULE.ebidding) {
        const perItem = [...groupBy(responded, (q) => q.enquiryDetailsId).values()];
        const lowest = sum(perItem.map((g) => Math.min(...g.map((q) => q.amount))));
        const average = sum(perItem.map((g) => avg(g.map((q) => q.amount))));
        // bid reduction = how far bids fell during the auction (each bidder's first bid → final bid). Benchmark prices are
        // too sparse and often placeholders in the data, so they are not used for e-bidding savings.
        const withFirst = responded.filter((q) => q.firstAmount > 0);
        const first = sum(withFirst.map((q) => q.firstAmount));
        ebid = {
          bids: sum(responded.map((q) => Math.max(1, q.revisions || 0))),
          suppliers: new Set(responded.map((q) => q.supplierId)).size,
          invited: new Set(qs.map((q) => q.supplierId)).size,
          lowest: perItem.length ? lowest : null,
          average: perItem.length ? average : null,
          reductionPct: first ? ((first - sum(withFirst.map((q) => q.amount))) / first) * 100 : null,
        };
      }
    }

    // --- ageing
    const isOpen = OPEN_STAGES.includes(stage);
    const closedAt = stage === "completed" ? completedDate || parseDmy(row.actualDeliveryDate) || lastChange
      : stage === "cancelled" ? lastChange : null;
    const daysOpen = created ? Math.max(0, Math.floor(daysBetween(created, isOpen ? today : closedAt || today))) : null;
    const ageBucket = isOpen ? ageBucketOf(daysOpen) : null;

    // --- project timeline (invalid / missing dates stay null; negative spans are treated as missing)
    const briefDate = parseDmy(row.briefDate);
    const projectStart = briefDate || created;
    const plannedEnd = parseDmy(row.expectedDeliveryDate);
    const deliveredOn = parseDmy(row.actualDeliveryDate);
    const projectEnd = stage === "completed" ? (completedDate ? startOfDay(completedDate) : deliveredOn) : null;
    const active = isOpen && stage !== "draft";
    const span = (a, b) => (a && b && b >= startOfDay(a) ? dayDiff(a, b) : null);
    const durationDays = span(projectStart, projectEnd);
    const plannedDays = span(projectStart, plannedEnd);
    const ongoingDays = active ? span(projectStart, today) : null;
    const overdueDays = active && plannedEnd && plannedEnd < today ? dayDiff(plannedEnd, today) : null;
    const dueInDays = active && plannedEnd && plannedEnd >= today ? dayDiff(today, plannedEnd) : null;
    const startsInDays = isOpen && projectStart && projectStart > today ? dayDiff(today, projectStart) : null;
    const lateDays = projectEnd && plannedEnd ? dayDiff(plannedEnd, projectEnd) : null; // > 0 = completed late

    return {
      row,
      id: row.id,
      enquiryId: row.enquiryId || `#${row.id}`,
      module,
      projectNo: row.projectNo || "",
      projectDesc: row.projectDesc || "",
      projectLabel: `${row.projectNo || "–"} · ${row.projectDesc || ""}`,
      clientId: row.clientId,
      clientName: row.clientName || clientName.get(row.clientId) || `Client ${row.clientId ?? "–"}`,
      // client contact = a client user (tblUser UserType Client, FkId = tblClient.Id); id 0 = none. Names repeat
      // ("test test"), the login is unique, so the label is "Name (login)".
      clientContactId: row.clientContactId || 0,
      clientContactName: row.clientContactId
        ? [row.clientContact, row.clientContactUser && `(${row.clientContactUser})`].filter(Boolean).join(" ") || `Contact ${row.clientContactId}`
        : NOT_ASSIGNED,
      clientContactUser: row.clientContactUser || "",
      clientContactEmail: row.clientContactEmail || "",
      // organisation (tblDivision): legal entity, local business unit (same names recur per country), global BU
      entity: row.entity || NOT_ASSIGNED,
      businessUnit: row.businessUnit || NOT_ASSIGNED,
      buKey: row.businessUnit ? `${row.entity}|${row.businessUnit}` : NOT_ASSIGNED,
      buLabel: row.businessUnit ? `${row.businessUnit}${row.divisionCountry ? ` · ${row.divisionCountry}` : ""}` : NOT_ASSIGNED,
      globalBu: row.globalBu || NOT_ASSIGNED,
      countryId: row.pmgEntity,
      countryName: row.country || `Country ${row.pmgEntity}`,
      createdBy: row.createdBy || "Unknown user",
      created,
      status,
      statusName: row.statusName || "",
      stage,
      group: groupOfStage(stage),
      progress,
      isOpen,
      daysOpen,
      ageBucket,
      category: categoryName,
      categoryName,
      categoryOrder: category?.order ?? 999,
      categorySeries: category?.series ?? `cs_${categoryName}`,
      categories: row.categories || [categoryName],
      itemCount: row.itemCount ?? null,
      eauction: !!row.eauction,
      maxReached,
      reachedCompleted,
      rfqDate,
      completedDate,
      closedAt,
      briefDate,
      projectStart,
      plannedEnd,
      deliveredOn,
      projectEnd,
      durationDays,
      plannedDays,
      ongoingDays,
      overdueDays,
      dueInDays,
      startsInDays,
      lateDays,
      awardedValue,
      savingsPct,
      suppliers: invited,
      quotes: qs,
      turnaroundDays,
      ebid,
    };
  });

  // Logins are not always unique (UAT: two contacts named "test" with the login "New.Client"): only when a label
  // still maps to several contacts, add the contact id so bars, rows and dropdown entries stay apart.
  const idsByLabel = new Map();
  facts.forEach((f) => {
    if (!f.clientContactId) return;
    if (!idsByLabel.has(f.clientContactName)) idsByLabel.set(f.clientContactName, new Set());
    idsByLabel.get(f.clientContactName).add(f.clientContactId);
  });
  facts.forEach((f) => {
    if (f.clientContactId && idsByLabel.get(f.clientContactName).size > 1) f.clientContactName += ` #${f.clientContactId}`;
  });
  return facts;
};

// ---------------------------------------------------------------- filtering

/** Filters that depend on another and are cleared when it changes (country → client → project, entity → BU ...). */
export const DEPENDENT_FILTERS = {
  country: { client: "", project: "", clientContact: "", entity: "", bu: "" },
  client: { project: "", clientContact: "" },
  entity: { bu: "" },
};

export const FILTER_KEYS = [
  "module", "client", "clientContact", "country", "project", "category", "entity", "bu", "gbu",
  "stage", "createdBy", "ebid", "supplier", "age",
];

const matches = {
  module: (f, v) => f.module === v,
  client: (f, v) => String(f.clientId) === String(v),
  clientContact: (f, v) => String(f.clientContactId) === String(v),
  entity: (f, v) => f.entity === v,
  bu: (f, v) => f.buKey === v,
  gbu: (f, v) => f.globalBu === v,
  country: (f, v) => String(f.countryId) === String(v),
  project: (f, v) => f.projectNo === v,
  category: (f, v) => f.category === String(v),
  stage: (f, v) => f.stage === v,
  createdBy: (f, v) => f.createdBy === v,
  ebid: (f, v) => (v === "yes" ? f.module === MODULE.ebidding : f.module !== MODULE.ebidding),
  supplier: (f, v) => f.suppliers.has(Number(v)),
  age: (f, v) => f.ageBucket === v,
};

/** Apply every active filter except the ones in `ignore` (a widget ignores its own dimension so it can highlight). */
export const applyFilters = (facts, filters, { ignore = [], range } = {}) => {
  const from = range ? range.from : filters.from;
  const to = range ? range.to : filters.to;
  const end = to ? addDays(startOfDay(to), 1) : null;
  return facts.filter((f) => {
    if (from && (!f.created || f.created < startOfDay(from))) return false;
    if (end && (!f.created || f.created >= end)) return false;
    return FILTER_KEYS.every((k) => ignore.includes(k) || filters[k] == null || filters[k] === "" || matches[k](f, filters[k]));
  });
};

export const previousRange = (from, to) => {
  if (!from || !to) return null;
  const len = Math.round(daysBetween(startOfDay(from), startOfDay(to))) + 1;
  return { from: addDays(startOfDay(from), -len), to: addDays(startOfDay(from), -1) };
};

/** The whole window the page loads: previous period + selected period. */
export const loadedRange = (from, to) => ({ from: previousRange(from, to)?.from ?? from, to });

const inDays = (d, from, to) => d && d >= startOfDay(from) && d < addDays(startOfDay(to), 1);

// ---------------------------------------------------------------- dimensions

/** Dimensions a widget can break down by. filterKey = the page filter a click sets (null = not filterable). */
export const DIMENSIONS = {
  category: { label: "Category", filterKey: "category", key: (f) => f.category, name: (f) => f.category, order: (f) => f.categoryOrder },
  country: { label: "Country", filterKey: "country", key: (f) => String(f.countryId), name: (f) => f.countryName },
  client: { label: "Client", filterKey: "client", key: (f) => String(f.clientId), name: (f) => f.clientName },
  clientContact: { label: "Client contact", filterKey: "clientContact", key: (f) => String(f.clientContactId), name: (f) => f.clientContactName },
  entity: { label: "Entity", filterKey: "entity", key: (f) => f.entity, name: (f) => f.entity },
  businessUnit: { label: "Business unit", filterKey: "bu", key: (f) => f.buKey, name: (f) => f.buLabel },
  globalBu: { label: "Global BU", filterKey: "gbu", key: (f) => f.globalBu, name: (f) => f.globalBu },
  createdBy: { label: "Created by", filterKey: "createdBy", key: (f) => f.createdBy, name: (f) => f.createdBy },
  module: { label: "Module", filterKey: "module", key: (f) => f.module, name: (f) => f.module },
  stage: { label: "Stage", filterKey: "stage", key: (f) => f.stage, name: (f) => STAGES.find((s) => s.key === f.stage)?.label, order: (f) => STAGES.findIndex((s) => s.key === f.stage) },
  status: { label: "Status", filterKey: null, key: (f) => f.statusName || "–", name: (f) => f.statusName || "–" },
};

/** Groups of facts per dimension value: ordered dimensions keep their order, others go by size. */
export const groupByDimension = (facts, dimKey) => {
  const dim = DIMENSIONS[dimKey];
  const groups = [...groupBy(facts, dim.key).values()].map((g) => ({
    key: String(dim.key(g[0])),
    name: dim.name(g[0]) || "–",
    order: dim.order ? dim.order(g[0]) : 0,
    facts: g,
  }));
  return dim.order
    ? groups.sort((a, b) => a.order - b.order)
    : groups.sort((a, b) => b.facts.length - a.facts.length || String(a.name).localeCompare(String(b.name)));
};

/** Invitation / response figures over a set of facts (needs the quotes dataset). */
export const invitationStats = (facts) => {
  let invitations = 0;
  let responses = 0;
  let pending = 0;
  let quotedEnquiries = 0;
  const suppliers = new Set();
  const responders = new Set();
  const pairs = new Set();
  facts.forEach((f) => {
    const qs = f.quotes || [];
    if (qs.length) quotedEnquiries += 1;
    qs.forEach((q) => {
      invitations += 1;
      suppliers.add(q.supplierId);
      if (q.responded) {
        responses += 1;
        responders.add(q.supplierId);
        pairs.add(`${f.id}|${q.supplierId}`);
      } else if (f.stage === "rfq") pending += 1;
    });
  });
  return {
    invitations,
    responses,
    pending,
    responseRate: invitations ? (responses / invitations) * 100 : null,
    suppliers: suppliers.size,
    respondingSuppliers: responders.size,
    participationRate: suppliers.size ? (responders.size / suppliers.size) * 100 : null,
    participations: pairs.size, // enquiry × supplier pairs with at least one quote / bid
    quotedEnquiries,
    quotesPerEnquiry: quotedEnquiries ? responses / quotedEnquiries : null,
  };
};

/** The figures every breakdown table shows for one group of enquiries. */
export const summarise = (g) => {
  const out = { enquiries: g.length };
  STATUS_GROUPS.forEach((s) => (out[s.key] = 0));
  g.forEach((f) => (out[f.group] += 1));
  const durations = present(g.map((f) => f.durationDays));
  const reached = g.filter((f) => (f.maxReached ?? f.progress ?? 0) >= 1);
  const awarded = reached.filter((f) => (f.maxReached ?? f.progress ?? 0) >= 6).length;
  const late = present(g.map((f) => f.lateDays));
  return {
    ...out,
    open: g.filter((f) => f.isOpen).length,
    projects: new Set(g.map((f) => f.projectNo).filter(Boolean)).size,
    overdue: g.filter((f) => f.overdueDays != null).length,
    completedProjects: durations.length,
    avgDuration: avg(durations),
    avgOpenAge: avg(present(g.filter((f) => f.isOpen).map((f) => f.daysOpen))),
    ongoing: g.filter((f) => f.ongoingDays != null).length,
    avgOngoing: avg(present(g.map((f) => f.ongoingDays))),
    onTimePct: late.length ? (late.filter((d) => d <= 0).length / late.length) * 100 : null,
    ebidding: g.filter((f) => f.module === MODULE.ebidding).length,
    awarded,
    awardRate: reached.length ? (awarded / reached.length) * 100 : null,
    completionRate: g.length ? (out.completed / g.length) * 100 : null,
    value: sum(g.map((f) => f.awardedValue)),
  };
};

// ---------------------------------------------------------------- KPIs

/** Executive KPIs over the filtered enquiries; completedInPeriod is passed in (it ignores the creation date). */
export const computeKpis = (facts, { completedInPeriod = null } = {}) => {
  const s = summarise(facts);
  const inv = facts.some((f) => f.quotes) ? invitationStats(facts) : null;
  return {
    total: facts.length,
    projects: new Set(facts.map((f) => f.projectNo).filter(Boolean)).size,
    draft: s.draft,
    completed: s.completed,
    inProgress: s.inProgress,
    pending: s.pending,
    overdue: s.overdue,
    completedInPeriod,
    activeClients: new Set(facts.map((f) => f.clientId).filter((x) => x != null)).size,
    activeSuppliers: inv ? inv.suppliers : null,
    ebidding: s.ebidding,
    participations: inv ? inv.participations : null,
  };
};

/** Enquiries completed inside [from, to], whatever their creation date (within the loaded window). */
export const completedBetween = (facts, filters, from, to) =>
  applyFilters(facts, filters, { range: loadedRange(filters.from, filters.to) }).filter((f) => inDays(f.completedDate, from, to)).length;

// ---------------------------------------------------------------- status & funnel

export const funnelData = (facts) => {
  const base = facts.length || 1;
  let prev = null;
  return FUNNEL_STEPS.map((step) => {
    const count = facts.filter((f) => step.test(f.maxReached ?? 0, f.reachedCompleted)).length;
    const row = { key: step.key, name: step.label, value: count, pctOfStart: (count / base) * 100, conversion: prev ? (count / prev) * 100 : 100 };
    prev = count || prev;
    return row;
  });
};

export const stageData = (facts) =>
  STAGES.map((s) => ({ key: s.key, name: s.label, value: facts.filter((f) => f.stage === s.key).length, color: s.color }));

export const statusBreakdown = (facts) =>
  [...groupBy(facts, (f) => `${f.stage}|${f.statusName}`).values()]
    .map((g) => ({
      key: `${g[0].stage}|${g[0].statusName}`, statusName: g[0].statusName, stage: g[0].stage, value: g.length,
      modules: [...new Set(g.map((f) => f.module))].join(", "), order: STAGES.findIndex((s) => s.key === g[0].stage),
    }))
    .sort((a, b) => a.order - b.order || b.value - a.value);

/** Status groups per category (the categories these enquiries have, in display order). */
export const categoryStatusData = (facts, categories) => {
  const byCat = groupBy(facts, (f) => f.category);
  return categories
    .filter((c) => byCat.has(c.key))
    .map((c) => ({ key: c.key, name: c.label, color: c.color, ...summarise(byCat.get(c.key)) }));
};

/** Categories that occur in these facts, in display order (for matrix columns and table columns). */
export const categoriesIn = (facts, categories) => {
  const present = new Set(facts.map((f) => f.category));
  return categories.filter((c) => present.has(c.key));
};

/** Count of facts per category (cat_<name>) and per category chart series (cs_<name> / cs___other). */
export const addCategoryCounts = (row, facts) => {
  facts.forEach((f) => {
    row[`cat_${f.category}`] = (row[`cat_${f.category}`] || 0) + 1;
    row[f.categorySeries] = (row[f.categorySeries] || 0) + 1;
  });
  return row;
};

// ---------------------------------------------------------------- dimension breakdowns

/** Rows per dimension value, each with the status-group and category counts plus the summary figures. */
export const breakdownData = (facts, dimKey) =>
  groupByDimension(facts, dimKey).map((grp) => {
    const row = addCategoryCounts({ key: grp.key, name: grp.name, ...summarise(grp.facts) }, grp.facts);
    if (grp.facts.some((f) => f.quotes)) {
      const inv = invitationStats(grp.facts);
      Object.assign(row, { invitations: inv.invitations, responses: inv.responses, responseRate: inv.responseRate, suppliers: inv.suppliers });
    }
    return row;
  });

/** Drill level derives from the active filters: country -> client -> project -> enquiry. */
export const drillLevel = (filters) => (filters.project ? "enquiry" : filters.client ? "project" : filters.country ? "client" : "country");

export const drillData = (facts, level) => {
  if (level === "enquiry") {
    return facts.map((f) => ({
      key: f.enquiryId, name: f.enquiryId, enquiries: 1, awarded: (f.maxReached ?? 0) >= 6 ? 1 : 0,
      value: f.awardedValue || 0, status: f.statusName, category: f.categoryName,
      ...Object.fromEntries(STATUS_GROUPS.map((s) => [s.key, f.group === s.key ? 1 : 0])),
    }));
  }
  const keyOf = { country: (f) => f.countryId, client: (f) => f.clientId, project: (f) => f.projectNo || "–" }[level];
  const nameOf = { country: (f) => f.countryName, client: (f) => f.clientName, project: (f) => f.projectNo || "No project no." }[level];
  return [...groupBy(facts, keyOf).values()]
    .map((g) => {
      const s = summarise(g);
      const awarded = g.filter((f) => (f.maxReached ?? 0) >= 6).length;
      return {
        key: String(keyOf(g[0])),
        name: nameOf(g[0]),
        ...s,
        awarded,
        awardRate: g.length ? (awarded / g.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.enquiries - a.enquiries);
};

/** Cross-tab: rows of a dimension × columns of categories (or age buckets). */
export const matrixData = (facts, rowDim, cols, colOf, limit = 15) => {
  const groups = groupByDimension(facts, rowDim).slice(0, limit);
  return groups.map((g) => {
    const row = { key: g.key, name: g.name, total: g.facts.length };
    cols.forEach((c) => (row[c.key] = 0));
    g.facts.forEach((f) => {
      const c = colOf(f);
      if (c != null && row[c] != null) row[c] += 1;
    });
    return row;
  });
};

// ---------------------------------------------------------------- time

const autoGranularity = (from, to) => {
  const span = daysBetween(from, to);
  return span > 730 ? "year" : span > 120 ? "month" : span > 31 ? "week" : "day";
};
export { autoGranularity };

/** mode "flow": created vs completed; mode "category": created per category. */
export const trendData = (facts, wideFacts, from, to, granularity, mode, categories) => {
  const buckets = bucketRange(from, to, granularity);
  const count = (list, dateOf, keyOf = () => "v") => {
    const m = new Map();
    list.forEach((f) => {
      const d = dateOf(f);
      if (!inDays(d, from, to)) return;
      const k = `${bucketOf(d, granularity).key}|${keyOf(f)}`;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  };
  if (mode === "category") {
    const series = categorySeries(categories);
    const m = count(facts, (f) => f.created, (f) => f.categorySeries);
    return {
      series,
      rows: buckets.map((b) => ({ key: b.key, name: b.label, ...Object.fromEntries(series.map((c) => [c.key, m.get(`${b.key}|${c.key}`) || 0])) })),
    };
  }
  const created = count(facts, (f) => f.created);
  const completed = count(wideFacts, (f) => f.completedDate);
  return {
    series: [
      { key: "created", label: "Created", color: SERIES[0] },
      { key: "completed", label: "Completed", color: SERIES[1] },
    ],
    rows: buckets.map((b) => ({ key: b.key, name: b.label, created: created.get(`${b.key}|v`) || 0, completed: completed.get(`${b.key}|v`) || 0 })),
  };
};

// ---------------------------------------------------------------- ageing

/** Open enquiries per age bucket, split by stage or by category. */
export const ageingData = (facts, split, categories) => {
  const series = split === "category"
    ? categorySeries(categories)
    : OPEN_STAGES.map((k) => STAGES.find((s) => s.key === k)).map((s) => ({ key: s.key, label: s.label, color: s.color }));
  const of = split === "category" ? (f) => f.categorySeries : (f) => f.stage;
  return {
    series,
    rows: AGE_BUCKETS.map((b) => {
      const g = facts.filter((f) => f.ageBucket === b.key);
      const row = { key: b.key, name: b.label, total: g.length, avgAge: avg(present(g.map((f) => f.daysOpen))) };
      series.forEach((s) => (row[s.key] = g.filter((f) => of(f) === s.key).length));
      return row;
    }),
  };
};

/**
 * Backlog over time: at the end of each period, the enquiries that were open then, by how old they were.
 * Only enquiries created inside the loaded window are known, so the earliest periods undercount the oldest bucket.
 */
export const ageingTrendData = (facts, from, to, granularity) => {
  const today = startOfDay(new Date());
  const buckets = bucketRange(from, to, granularity);
  return buckets.map((b, i) => {
    const next = buckets[i + 1]?.start;
    const at = next ? addDays(next, -1) : startOfDay(to);
    const asOf = at > today ? today : at;
    const row = { key: b.key, name: b.label, asOf, total: 0 };
    AGE_BUCKETS.forEach((a) => (row[a.key] = 0));
    facts.forEach((f) => {
      if (!f.created || f.created > asOf) return;
      if (f.closedAt && startOfDay(f.closedAt) <= asOf) return;
      if (!f.isOpen && !f.closedAt) return; // closed at an unknown date
      const key = ageBucketOf(Math.floor(daysBetween(f.created, asOf)));
      row[key] += 1;
      row.total += 1;
    });
    return row;
  });
};

// ---------------------------------------------------------------- projects

/** Monthly (or chosen period) project starts, completions and planned deliveries. */
export const projectTimelineData = (facts, from, to, granularity) => {
  const buckets = bucketRange(from, to, granularity);
  const rows = new Map(buckets.map((b) => [b.key, { key: b.key, name: b.label, starts: 0, completions: 0, planned: 0 }]));
  const add = (d, field) => {
    if (!inDays(d, from, to)) return;
    const r = rows.get(bucketOf(d, granularity).key);
    if (r) r[field] += 1;
  };
  facts.forEach((f) => {
    if (f.stage !== "draft") add(f.projectStart, "starts");
    add(f.projectEnd, "completions");
    if (f.stage !== "cancelled") add(f.plannedEnd, "planned");
  });
  return [...rows.values()];
};

export const projectStats = (facts) => {
  const s = summarise(facts);
  return {
    ongoing: s.ongoing,
    avgDuration: s.avgDuration,
    completedProjects: s.completedProjects,
    overdue: s.overdue,
    dueSoon: facts.filter((f) => f.dueInDays != null && f.dueInDays <= DUE_SOON_DAYS).length,
    startingSoon: facts.filter((f) => f.startsInDays != null && f.startsInDays <= DUE_SOON_DAYS).length,
    onTimePct: s.onTimePct,
  };
};

export const WATCHLISTS = [
  { key: "overdue", label: "Overdue", days: (f) => f.overdueDays, test: (f) => f.overdueDays != null, sort: -1, measure: "Days overdue" },
  { key: "due", label: `Due in ${DUE_SOON_DAYS} d`, days: (f) => f.dueInDays, test: (f) => f.dueInDays != null && f.dueInDays <= DUE_SOON_DAYS, sort: 1, measure: "Days to delivery" },
  { key: "starting", label: `Starting in ${DUE_SOON_DAYS} d`, days: (f) => f.startsInDays, test: (f) => f.startsInDays != null && f.startsInDays <= DUE_SOON_DAYS, sort: 1, measure: "Days to start" },
  { key: "running", label: "Longest running", days: (f) => f.ongoingDays, test: (f) => f.ongoingDays != null, sort: -1, measure: "Days running" },
  { key: "longest", label: "Longest completed", days: (f) => f.durationDays, test: (f) => f.durationDays != null, sort: -1, measure: "Duration (days)" },
  { key: "shortest", label: "Shortest completed", days: (f) => f.durationDays, test: (f) => f.durationDays != null, sort: 1, measure: "Duration (days)" },
];

export const watchlistData = (facts, listKey) => {
  const list = WATCHLISTS.find((w) => w.key === listKey) || WATCHLISTS[0];
  return facts
    .filter(list.test)
    .map((f) => ({ ...f, key: f.enquiryId, name: f.enquiryId, days: list.days(f) }))
    .sort((a, b) => (a.days - b.days) * list.sort || a.enquiryId.localeCompare(b.enquiryId));
};

/** Completed duration and ongoing age per dimension value. */
export const durationData = (facts, dimKey) =>
  groupByDimension(facts, dimKey)
    .map((g) => {
      const d = present(g.facts.map((f) => f.durationDays));
      return {
        key: g.key,
        name: g.name,
        ...summarise(g.facts),
        shortest: d.length ? Math.min(...d) : null,
        longest: d.length ? Math.max(...d) : null,
      };
    })
    .filter((r) => r.completedProjects || r.ongoing);

// ---------------------------------------------------------------- e-bidding

export const ebiddingData = (facts) => {
  const all = facts.filter((f) => f.module === MODULE.ebidding);
  const rows = all
    .filter((f) => f.ebid && f.ebid.bids > 0)
    .map((f) => ({ key: f.enquiryId, name: f.enquiryId, project: f.projectDesc, category: f.categoryName, ...f.ebid }))
    .sort((a, b) => String(b.key).localeCompare(String(a.key)));
  const reductions = present(rows.map((r) => r.reductionPct));
  const withBids = rows.length;
  const awarded = all.filter((f) => f.ebid?.bids > 0 && (f.maxReached ?? f.progress ?? 0) >= 6).length;
  const invitedSum = sum(rows.map((r) => r.invited));
  return {
    rows,
    stats: {
      events: all.length,
      share: facts.length ? (all.length / facts.length) * 100 : null,
      withBids,
      bids: sum(rows.map((r) => r.bids)),
      avgBids: avg(rows.map((r) => r.bids)),
      avgSuppliers: avg(rows.map((r) => r.suppliers)),
      participation: invitedSum ? (sum(rows.map((r) => r.suppliers)) / invitedSum) * 100 : null,
      conversion: withBids ? (awarded / withBids) * 100 : null,
      avgReduction: avg(reductions),
    },
  };
};

/** E-bidding vs other enquiries per dimension value (dimKey "month" = per period). */
export const ebiddingSplitData = (facts, dimKey, from, to, granularity) => {
  const shape = (key, name, g) => {
    const eb = g.filter((f) => f.module === MODULE.ebidding);
    return {
      key, name, total: g.length, ebidding: eb.length, other: g.length - eb.length,
      share: g.length ? (eb.length / g.length) * 100 : 0,
      withBids: eb.filter((f) => f.ebid?.bids > 0).length,
      bids: sum(eb.map((f) => f.ebid?.bids || 0)),
    };
  };
  if (dimKey === "month") {
    const byBucket = groupBy(facts.filter((f) => f.created), (f) => bucketOf(f.created, granularity).key);
    return bucketRange(from, to, granularity).map((b) => shape(b.key, b.label, byBucket.get(b.key) || []));
  }
  return groupByDimension(facts, dimKey).map((g) => shape(g.key, g.name, g.facts));
};

// ---------------------------------------------------------------- suppliers

/** Per supplier: invitations, responses, response rate, turnaround and pending invitations. */
export const supplierData = (facts, suppliers) => {
  const names = new Map((suppliers || []).map((s) => [s.id, s.supplierName]));
  const bySupplier = new Map();
  facts.forEach((f) => {
    (f.quotes || []).forEach((q) => {
      if (!bySupplier.has(q.supplierId)) bySupplier.set(q.supplierId, { invites: [], enquiries: new Set(), categories: new Set() });
      const s = bySupplier.get(q.supplierId);
      const resp = q.responded ? parseAny(q.serverTime) : null;
      const days = resp && f.rfqDate && resp >= f.rfqDate ? daysBetween(f.rfqDate, resp) : null;
      s.invites.push({ responded: !!q.responded, days, pending: !q.responded && f.stage === "rfq" });
      s.enquiries.add(f.id);
      s.categories.add(f.categoryName);
    });
  });
  const rows = [...bySupplier.entries()]
    .map(([id, s]) => {
      const responded = s.invites.filter((r) => r.responded);
      return {
        key: String(id),
        name: names.get(id) || `Supplier ${id}`,
        requested: s.invites.length,
        responded: responded.length,
        enquiries: s.enquiries.size,
        responseRate: s.invites.length ? (responded.length / s.invites.length) * 100 : 0,
        avgDays: avg(present(responded.map((r) => r.days))),
        pending: s.invites.filter((r) => r.pending).length,
        categories: [...s.categories].join(", "),
      };
    })
    .sort((a, b) => b.requested - a.requested);
  const inv = invitationStats(facts);
  return {
    rows,
    stats: {
      ...inv,
      avgDays: avg(present(facts.map((f) => f.turnaroundDays))),
    },
  };
};

/** Invitations vs responses per dimension value (dimKey "month" = per period, by RFQ / creation date). */
export const supplierActivityData = (facts, dimKey, from, to, granularity) => {
  const shape = (key, name, g) => ({ key, name, ...invitationStats(g) });
  if (dimKey === "month") {
    const byBucket = groupBy(facts.filter((f) => f.created), (f) => bucketOf(f.rfqDate || f.created, granularity).key);
    return bucketRange(from, to, granularity).map((b) => shape(b.key, b.label, byBucket.get(b.key) || []));
  }
  return groupByDimension(facts, dimKey).map((g) => shape(g.key, g.name, g.facts)).filter((r) => r.invitations > 0);
};

// ---------------------------------------------------------------- users

export const userData = (facts) =>
  groupByDimension(facts, "createdBy").map((g) => ({ key: g.key, name: g.name, ...summarise(g.facts) }));
