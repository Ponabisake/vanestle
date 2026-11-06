import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  getEnquiryItems,
  getMasterDropdowns,
  getReportDataset,
  getStatusHistory,
  getSupplierQuotes,
  getSuppliers,
} from "../services/vaReportService";
import { buildFacts, previousRange } from "../utils/aggregations";
import { toDmy } from "../utils/dateUtils";

const LOADERS = {
  master: { fn: getMasterDropdowns, pick: (r) => r, ranged: false },
  suppliers: { fn: getSuppliers, pick: (r) => r.data, ranged: false },
  dataset: { fn: getReportDataset, pick: (r) => r, ranged: true },
  items: { fn: getEnquiryItems, pick: (r) => r.data, ranged: true },
  quotes: { fn: getSupplierQuotes, pick: (r) => r.data, ranged: true },
  history: { fn: getStatusHistory, pick: (r) => r.data, ranged: true },
};
const NAMES = Object.keys(LOADERS);
const STATIC_KEY = "static";

/**
 * Loads every dataset independently (so one failing endpoint only breaks the widgets that need it),
 * for the selected range PLUS the previous period of the same length (for the KPI deltas).
 *
 * Each stored result remembers the request key it answered; a dataset whose key doesn't match the
 * current request is "loading". That keeps loading state derived instead of set inside effects.
 */
export default function useReportData(from, to) {
  const user = useSelector((s) => s.userDetails.user) || {};
  const [results, setResults] = useState({}); // name -> requestKey -> { key, status: "ready" | "error", data, error }
  const [retrying, setRetrying] = useState({}); // name -> key being retried

  const fromTime = from ? from.getTime() : 0;
  const toTime = to ? to.getTime() : 0;

  const request = useMemo(() => {
    const f = new Date(fromTime);
    const t = new Date(toTime);
    const prev = previousRange(f, t);
    return {
      // EnquiryFilterRequest
      userCountryId: user.countryID,
      role: user.role,
      userId: user.userID,
      username: user.userName,
      menuId: 0, // 0 = every module (Enquiry, E-Bidding, Catalog)
      startDate: toDmy(prev ? prev.from : f),
      endDate: toDmy(t),
    };
  }, [fromTime, toTime, user.countryID, user.role, user.userID, user.userName]);

  const rangedKey = JSON.stringify(request);
  const keyOf = useCallback((name) => (LOADERS[name].ranged ? rangedKey : STATIC_KEY), [rangedKey]);

  const fetchOne = useCallback(
    (name) => {
      const key = keyOf(name);
      const loader = LOADERS[name];
      loader
        .fn(request)
        .then((res) => ({ key, status: "ready", data: loader.pick(res), error: null }))
        .catch((err) => ({ key, status: "error", data: null, error: err?.message || "Failed to load" }))
        .then((result) => {
          // results are stored per request key, so a late answer to an old range never overwrites a newer one
          setResults((r) => ({ ...r, [name]: { ...(r[name] || {}), [key]: result } }));
          setRetrying((r) => ({ ...r, [name]: null }));
        });
    },
    [request, keyOf]
  );

  // static lists once; ranged datasets whenever the date range (request) changes
  useEffect(() => {
    NAMES.filter((n) => !LOADERS[n].ranged).forEach(fetchOne);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    NAMES.filter((n) => LOADERS[n].ranged).forEach(fetchOne);
  }, [rangedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = useMemo(() => {
    const out = {};
    NAMES.forEach((n) => {
      const r = results[n]?.[keyOf(n)];
      out[n] = r && retrying[n] !== keyOf(n) ? r : { status: "loading", data: null, error: null };
    });
    return out;
  }, [results, retrying, keyOf]);

  const retry = useCallback(
    (name) => {
      setRetrying((r) => ({ ...r, [name]: keyOf(name) }));
      fetchOne(name);
    },
    [fetchOne, keyOf]
  );

  // Only build facts from data that belongs to the current request.
  const currentData = (n) => (state[n].status === "ready" ? state[n].data : null);
  const master = currentData("master");
  const dataset = currentData("dataset");
  const items = currentData("items");
  const quotes = currentData("quotes");
  const history = currentData("history");
  const suppliers = currentData("suppliers");
  const facts = useMemo(
    () => buildFacts({ master, dataset, items, quotes, history, suppliers }),
    [master, dataset, items, quotes, history, suppliers]
  );

  /** Status of a widget that needs several datasets: error wins, then loading, else ready. */
  const statusOf = useCallback(
    (needs) => {
      const all = ["master", "dataset", ...needs];
      const failed = all.find((n) => state[n].status === "error");
      if (failed) return { status: "error", error: state[failed].error, retry: () => retry(failed) };
      if (all.some((n) => state[n].status === "loading")) return { status: "loading" };
      return { status: "ready" };
    },
    [state, retry]
  );

  return { state, facts, statusOf, master, suppliers };
}
