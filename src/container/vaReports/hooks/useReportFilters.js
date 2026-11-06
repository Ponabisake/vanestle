import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { addMonths, parseIsoDay, startOfDay, toIsoDay } from "../utils/dateUtils";
import { FILTER_KEYS } from "../utils/aggregations";

// Params that belong to the developer/testing helpers, never cleared by Reset.
const KEEP = ["mockFail", "mockEmpty"];

/**
 * Filter state lives in the URL query string (?from=2026-01-01&country=1&stage=rfq ...),
 * so any view can be bookmarked or shared. Missing from/to = the last 12 months (the API's default window).
 */
export default function useReportFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const today = startOfDay(new Date());
    const f = {
      from: parseIsoDay(params.get("from")) || addMonths(today, -12),
      to: parseIsoDay(params.get("to")) || today,
      isDefaultRange: !params.get("from") && !params.get("to"),
    };
    FILTER_KEYS.forEach((k) => (f[k] = params.get(k) ?? ""));
    return f;
  }, [params]);

  const update = useCallback(
    (changes) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([k, v]) => {
            const val = v instanceof Date ? toIsoDay(v) : v;
            if (val === "" || val == null) next.delete(k);
            else next.set(k, String(val));
          });
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  /** Cross-filter click: set the value, or clear it when the same segment is clicked again. */
  const toggle = useCallback(
    (key, value, extra = {}) => update({ [key]: String(filters[key]) === String(value) ? "" : value, ...extra }),
    [filters, update]
  );

  const reset = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams();
          KEEP.forEach((k) => prev.get(k) && next.set(k, prev.get(k)));
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const activeCount = FILTER_KEYS.filter((k) => filters[k] !== "").length + (filters.isDefaultRange ? 0 : 1);

  return { filters, update, toggle, reset, activeCount };
}
