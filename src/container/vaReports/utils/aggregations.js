// Pure data functions for VA Reports. No React here – easy to unit test, and easy to move server-side later.

import { AGE_BUCKETS, FUNNEL_STEPS, OPEN_STAGES, STAGES, stageOfStatus } from "../constants";
import { addDays, bucketOf, bucketRange, daysBetween, parseAny, parseDmy, startOfDay } from "./dateUtils";

const groupBy = (arr, key) => {
  const m = new Map();
  arr.forEach((x) => {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  });
  return m;
};
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const sum = (xs) => xs.reduce((s, x) => s + (x || 0), 0);

/**
 * Join the raw API datasets into one "fact" per enquiry. Missing datasets (still loading / failed) leave
 * their derived fields null; widgets check `ready` before using them.
 */
export const buildFacts = ({ master, dataset, items, quotes, history, suppliers }) => {
  if (!dataset) return [];
  const today = startOfDay(new Date());
  const clientName = new Map((master?.client || []).map((c) => [c.value, c.label]));
  const supplierName = new Map((suppliers || []).map((s) => [s.id, s.supplierName]));
  const itemsBy = items ? groupBy(items, (i) => i.enquiryId) : null;
  const quotesBy = quotes ? groupBy(quotes, (q) => q.enquiryId) : null;
  const historyBy = history ? groupBy(history, (h) => h.enqId) : null;

  return dataset.data.detailed.map((row) => {
    const created = parseDmy(row.serverTime);
    const status = Number(row.status);
    const stage = stageOfStatus(status);

    // --- history-derived
    let maxReached = null;
    let reachedCompleted = null;
    let rfqDate = null;
    let completedDate = null;
    let lastChange = null;
    if (historyBy) {
      const h = (historyBy.get(row.id) || [])
        .map((x) => ({ s: Number(x.newValue), d: parseAny(x.modifiedDate) }))
        .sort((a, b) => a.d - b.d);
      const progressed = h.filter((x) => x.s < 25).map((x) => x.s);
      maxReached = Math.max(status < 25 ? status : 0, ...progressed, 0);
      reachedCompleted = h.some((x) => x.s === 24) || status === 24;
      rfqDate = h.find((x) => x.s === 1)?.d ?? null;
      completedDate = h.find((x) => x.s === 24)?.d ?? null;
      lastChange = h.length ? h[h.length - 1].d : null;
    }

    // --- item-derived (amounts in EUR: EuroTotalQuoteAmount)
    let awardedValue = null;
    let savingsPct = null;
    let invited = new Set();
    if (itemsBy) {
      const its = itemsBy.get(row.id) || [];
      its.forEach((i) => (i.selectedSuppliers || "").split(",").filter(Boolean).forEach((s) => invited.add(Number(s))));
      const awardedItems = its.filter((i) => i.quotePrice != null);
      awardedValue = awardedItems.length ? sum(awardedItems.map((i) => i.euroTotalQuoteAmount)) : 0;
      const bench = sum(awardedItems.map((i) => i.benchmarkPrice));
      savingsPct = awardedItems.length && bench ? ((bench - sum(awardedItems.map((i) => i.quotePrice))) / bench) * 100 : null;
    }

    // --- quote-derived
    let qs = null;
    let turnaroundDays = null;
    let ebid = null;
    if (quotesBy) {
      qs = quotesBy.get(row.id) || [];
      qs.forEach((q) => invited.add(q.supplierId));
      const firstResponse = qs.map((q) => parseAny(q.responseDate)).filter(Boolean).sort((a, b) => a - b)[0];
      const sent = rfqDate ?? (qs[0] ? parseAny(qs[0].serverTime) : null);
      if (firstResponse && sent) turnaroundDays = Math.max(0, daysBetween(sent, firstResponse));

      if (row.jobType === "E-Bidding") {
        const bids = qs.filter((q) => q.amount != null);
        // final bid per supplier per item = lowest amount that supplier offered on that item
        const finals = [...groupBy(bids, (q) => `${q.enquiryDetailsId}|${q.supplierId}`).values()].map((g) => ({
          item: g[0].enquiryDetailsId,
          amount: Math.min(...g.map((q) => q.amount)),
        }));
        const perItem = [...groupBy(finals, (f) => f.item).values()];
        const lowest = sum(perItem.map((g) => Math.min(...g.map((f) => f.amount))));
        const average = sum(perItem.map((g) => avg(g.map((f) => f.amount))));
        const benchItems = itemsBy ? (itemsBy.get(row.id) || []).filter((i) => perItem.some((g) => g[0].item === i.id)) : [];
        const bench = sum(benchItems.map((i) => i.benchmarkPrice));
        ebid = {
          bids: bids.length,
          suppliers: new Set(bids.map((q) => q.supplierId)).size,
          lowest: perItem.length ? lowest : null,
          average: perItem.length ? average : null,
          savingsPct: perItem.length && bench ? ((bench - lowest) / bench) * 100 : null,
        };
      }
    }

    const isOpen = OPEN_STAGES.includes(stage);
    const closedAt = completedDate || (stage === "cancelled" ? lastChange : null);
    const daysOpen = created ? Math.max(0, Math.floor(daysBetween(created, isOpen ? today : closedAt || today))) : null;
    const ageBucket = isOpen && daysOpen != null ? AGE_BUCKETS.find((b) => daysOpen >= b.min && daysOpen <= b.max)?.key : null;

    return {
      row,
      id: row.id,
      enquiryId: row.enquiryId,
      module: row.jobType || "Enquiry",
      projectNo: row.projectNo,
      projectDesc: row.projectDesc,
      projectLabel: `${row.projectNo} · ${row.projectDesc}`,
      clientId: row.clientId,
      clientName: clientName.get(row.clientId) || `Client ${row.clientId}`,
      countryId: row.pmgEntity,
      countryName: row.country,
      createdBy: row.createdBy,
      created,
      status,
      statusName: row.statusName,
      stage,
      isOpen,
      daysOpen,
      ageBucket,
      maxReached,
      reachedCompleted,
      rfqDate,
      completedDate,
      awardedValue,
      savingsPct,
      suppliers: invited,
      supplierNames: [...invited].map((s) => supplierName.get(s) || `Supplier ${s}`),
      quotes: qs,
      turnaroundDays,
      ebid,
    };
  });
};

// ---------------------------------------------------------------- filtering

export const FILTER_KEYS = ["module", "client", "country", "project", "stage", "createdBy", "ebid", "supplier", "age"];

const matches = {
  module: (f, v) => f.module === v,
  client: (f, v) => String(f.clientId) === String(v),
  country: (f, v) => String(f.countryId) === String(v),
  project: (f, v) => f.projectNo === v,
  stage: (f, v) => f.stage === v,
  createdBy: (f, v) => f.createdBy === v,
  ebid: (f, v) => (v === "yes" ? f.module === "E-Bidding" : f.module !== "E-Bidding"),
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

// ---------------------------------------------------------------- KPIs

export const computeKpis = (facts) => {
  const withHistory = facts.filter((f) => f.maxReached != null);
  const reachedRfq = withHistory.filter((f) => f.maxReached >= 1);
  const t = facts.map((f) => f.turnaroundDays).filter((x) => x != null);
  return {
    total: facts.length,
    activeRfqs: facts.filter((f) => f.stage === "rfq").length,
    pendingApproval: facts.filter((f) => f.stage === "approval").length,
    awarded: facts.filter((f) => f.stage === "awarded" || f.stage === "production").length,
    completed: facts.filter((f) => f.stage === "completed").length,
    avgTurnaround: t.length ? avg(t) : null,
    ebidding: facts.filter((f) => f.module === "E-Bidding").length,
    awardRate: reachedRfq.length ? (reachedRfq.filter((f) => f.maxReached >= 6).length / reachedRfq.length) * 100 : null,
  };
};

// ---------------------------------------------------------------- widgets

export const funnelData = (facts) => {
  const base = facts.length || 1;
  let prev = null;
  return FUNNEL_STEPS.map((step) => {
    const count = facts.filter((f) => step.test(f.maxReached ?? 0, f.reachedCompleted)).length;
    const row = {
      key: step.key,
      name: step.label,
      value: count,
      pctOfStart: (count / base) * 100,
      conversion: prev ? (prev ? (count / prev) * 100 : 0) : 100,
    };
    prev = count || prev;
    return row;
  });
};

export const stageData = (facts) =>
  STAGES.map((s) => ({ key: s.key, name: s.label, value: facts.filter((f) => f.stage === s.key).length, color: s.color }));

export const statusBreakdown = (facts) =>
  [...groupBy(facts, (f) => f.status).entries()]
    .map(([status, g]) => ({ status, statusName: g[0].statusName, stage: g[0].stage, value: g.length }))
    .sort((a, b) => a.status - b.status);

export const topProjects = (facts, by = "count", limit = 10) =>
  [...groupBy(facts, (f) => f.projectNo).values()]
    .map((g) => ({
      key: g[0].projectNo,
      name: g[0].projectNo,
      desc: g[0].projectDesc,
      client: g[0].clientName,
      count: g.length,
      value: sum(g.map((f) => f.awardedValue)),
    }))
    .sort((a, b) => (by === "value" ? b.value - a.value : b.count - a.count))
    .slice(0, limit);

export const projectMatrix = (facts, limit = 12) => {
  const projects = topProjects(facts, "count", limit).map((p) => p.key);
  return projects.map((p) => {
    const g = facts.filter((f) => f.projectNo === p);
    const row = { key: p, name: p, desc: g[0]?.projectDesc, total: g.length };
    STAGES.forEach((s) => (row[s.key] = g.filter((f) => f.stage === s.key).length));
    return row;
  });
};

/** Drill level derives from the active filters: country -> client -> project -> enquiry. */
export const drillLevel = (filters) => (filters.project ? "enquiry" : filters.client ? "project" : filters.country ? "client" : "country");

export const drillData = (facts, level) => {
  if (level === "enquiry") {
    return facts.map((f) => ({
      key: f.enquiryId, name: f.enquiryId, enquiries: 1, awarded: f.maxReached >= 6 ? 1 : 0,
      value: f.awardedValue || 0, status: f.statusName,
    }));
  }
  const keyOf = { country: (f) => f.countryId, client: (f) => f.clientId, project: (f) => f.projectNo }[level];
  const nameOf = { country: (f) => f.countryName, client: (f) => f.clientName, project: (f) => f.projectNo }[level];
  return [...groupBy(facts, keyOf).values()]
    .map((g) => {
      const awarded = g.filter((f) => (f.maxReached ?? 0) >= 6).length;
      return {
        key: String(keyOf(g[0])),
        name: nameOf(g[0]),
        enquiries: g.length,
        awarded,
        awardRate: g.length ? (awarded / g.length) * 100 : 0,
        value: sum(g.map((f) => f.awardedValue)),
      };
    })
    .sort((a, b) => b.enquiries - a.enquiries);
};

export const trendData = (facts, from, to, granularity) => {
  const buckets = bucketRange(from, to, granularity);
  const created = new Map();
  const completed = new Map();
  facts.forEach((f) => {
    if (f.created) {
      const k = bucketOf(f.created, granularity).key;
      created.set(k, (created.get(k) || 0) + 1);
    }
    if (f.completedDate && f.completedDate >= startOfDay(from) && f.completedDate < addDays(startOfDay(to), 1)) {
      const k = bucketOf(f.completedDate, granularity).key;
      completed.set(k, (completed.get(k) || 0) + 1);
    }
  });
  return buckets.map((b) => ({ key: b.key, name: b.label, created: created.get(b.key) || 0, completed: completed.get(b.key) || 0 }));
};

export const ebiddingData = (facts) => {
  const rows = facts
    .filter((f) => f.module === "E-Bidding" && f.ebid && f.ebid.bids > 0)
    .map((f) => ({ key: f.enquiryId, name: f.enquiryId, project: f.projectDesc, ...f.ebid }))
    .sort((a, b) => b.key.localeCompare(a.key));
  const all = facts.filter((f) => f.module === "E-Bidding");
  const savings = rows.map((r) => r.savingsPct).filter((x) => x != null);
  return {
    rows,
    stats: {
      events: all.length,
      bids: sum(rows.map((r) => r.bids)),
      avgBids: avg(rows.map((r) => r.bids)),
      avgSuppliers: avg(rows.map((r) => r.suppliers)),
      avgSavings: avg(savings),
    },
  };
};

export const clientData = (facts) =>
  [...groupBy(facts, (f) => f.clientId).values()]
    .map((g) => {
      const reached = g.filter((f) => (f.maxReached ?? 0) >= 1);
      const awarded = reached.filter((f) => f.maxReached >= 6).length;
      return {
        key: String(g[0].clientId),
        name: g[0].clientName,
        enquiries: g.length,
        awarded,
        awardRate: reached.length ? (awarded / reached.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.enquiries - a.enquiries);

export const supplierData = (facts, suppliers) => {
  const names = new Map((suppliers || []).map((s) => [s.id, s.supplierName]));
  const requests = new Map(); // supplierId -> Map(itemKey -> {responded, days, pending})
  facts.forEach((f) => {
    (f.quotes || []).forEach((q) => {
      if (!requests.has(q.supplierId)) requests.set(q.supplierId, new Map());
      const key = q.enquiryDetailsId;
      const cur = requests.get(q.supplierId).get(key);
      const resp = parseAny(q.responseDate);
      const sent = f.rfqDate || parseAny(q.serverTime);
      const days = resp && sent ? Math.max(0, daysBetween(sent, resp)) : null;
      if (!cur) {
        requests.get(q.supplierId).set(key, { responded: !!q.supplierResponse, days, pending: !q.supplierResponse && f.stage === "rfq" });
      } else if (q.supplierResponse && (cur.days == null || (days != null && days < cur.days))) {
        cur.responded = true;
        cur.days = days;
        cur.pending = false;
      }
    });
  });
  const rows = [...requests.entries()]
    .map(([id, m]) => {
      const reqs = [...m.values()];
      const responded = reqs.filter((r) => r.responded);
      return {
        key: String(id),
        name: names.get(id) || `Supplier ${id}`,
        requested: reqs.length,
        responded: responded.length,
        responseRate: reqs.length ? (responded.length / reqs.length) * 100 : 0,
        avgDays: avg(responded.map((r) => r.days).filter((d) => d != null)),
        pending: reqs.filter((r) => r.pending).length,
      };
    })
    .sort((a, b) => b.requested - a.requested);
  const totalReq = sum(rows.map((r) => r.requested));
  return {
    rows,
    stats: {
      responseRate: totalReq ? (sum(rows.map((r) => r.responded)) / totalReq) * 100 : null,
      avgDays: avg(rows.flatMap((r) => (r.avgDays != null ? [r.avgDays] : []))),
      pending: sum(rows.map((r) => r.pending)),
    },
  };
};

export const ageingData = (facts) =>
  AGE_BUCKETS.map((b) => {
    const g = facts.filter((f) => f.ageBucket === b.key);
    const row = { key: b.key, name: b.label, total: g.length };
    OPEN_STAGES.forEach((s) => (row[s] = g.filter((f) => f.stage === s).length));
    return row;
  });

export const userData = (facts) =>
  [...groupBy(facts, (f) => f.createdBy).values()]
    .map((g) => ({
      key: g[0].createdBy,
      name: g[0].createdBy,
      enquiries: g.length,
      completed: g.filter((f) => f.stage === "completed").length,
      open: g.filter((f) => f.isOpen).length,
    }))
    .sort((a, b) => b.enquiries - a.enquiries);
