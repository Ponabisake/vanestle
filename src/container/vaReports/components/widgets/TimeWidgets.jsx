import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip, Legend } from "../chartKit";
import { AXIS, GRID } from "../chartConfig";
import { HeatmapTable, MultiVBars, SegToggle } from "../chartParts";
import { AGE_BUCKETS } from "../../constants";
import {
  DEPENDENT_FILTERS, DIMENSIONS, ageingData, ageingTrendData, applyFilters, autoGranularity, loadedRange, matrixData, trendData,
} from "../../utils/aggregations";
import { toDmy } from "../../utils/dateUtils";
import { fmtDays, fmtInt } from "../../utils/format";

const GRANULARITIES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

// Sequential ramp (one hue, light → dark) for the age buckets: older = darker.
const AGE_RAMP = ["#C9CAEC", "#A6A8DC", "#8285CA", "#5F63B6", "#43479A", "#2D2F75"];
const AGE_SERIES = AGE_BUCKETS.map((b, i) => ({ key: b.key, label: b.label, color: AGE_RAMP[i] }));

/** Enquiries created vs completed (or created per category) over time. */
export function TrendWidget({ facts, filters, statusOf, reset, categories }) {
  const auto = autoGranularity(filters.from, filters.to);
  const [granularity, setGranularity] = useState(null);
  const [mode, setMode] = useState("flow");
  const g = granularity || auto;
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const wide = useMemo(() => applyFilters(facts, filters, { range: loadedRange(filters.from, filters.to) }), [facts, filters]);
  const { series, rows } = useMemo(
    () => trendData(scoped, wide, filters.from, filters.to, g, mode, categories),
    [scoped, wide, filters.from, filters.to, g, mode, categories]
  );
  return (
    <ReportWidget
      title="Enquiry trend"
      subtitle={mode === "flow" ? "Enquiries created vs. completed in each period" : "Enquiries created per category in each period"}
      span={2}
      state={state}
      isEmpty={!scoped.length}
      onReset={reset}
      exportName={`VA_enquiry_trend_${mode}_${g}`}
      controls={
        <>
          <SegToggle value={mode} onChange={setMode} label="Trend series" options={[{ value: "flow", label: "Created vs completed" }, { value: "category", label: "By category" }]} />
          <SegToggle value={g} onChange={setGranularity} label="Trend granularity" options={GRANULARITIES} />
        </>
      }
      hint="Completed counts the date the enquiry reached Completed, also for enquiries created before the period."
      table={{
        columns: [{ field: "key", header: "Period start" }, ...series.map((s) => ({ field: s.key, header: s.label, align: "right" }))],
        rows,
      }}
      renderChart={(h) => (
        <>
          <Legend items={series} />
          <ResponsiveContainer width="100%" height={h - 28}>
            <LineChart data={rows} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} interval="preserveStartEnd" minTickGap={18} />
              <YAxis {...AXIS} allowDecimals={false} width={44} />
              <Tooltip cursor={{ stroke: "#9a9a9a", strokeWidth: 1 }} content={<ChartTooltip />} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    />
  );
}

/** Open enquiries by days open, stacked by stage or category. Clicking a column filters by age bucket. */
export function AgeingWidget({ facts, filters, toggle, statusOf, reset, categories }) {
  const [split, setSplit] = useState("stage");
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["age"] }), [facts, filters]);
  const { series, rows } = useMemo(() => ageingData(scoped, split, categories), [scoped, split, categories]);
  const selected = filters.age || null;
  const totalOpen = rows.reduce((s, d) => s + d.total, 0);
  return (
    <ReportWidget
      title="Ageing of open enquiries"
      subtitle={`${fmtInt(totalOpen)} open · days since the enquiry was created`}
      state={state}
      isEmpty={!totalOpen}
      emptyText="No open enquiries for the current filters."
      onReset={reset}
      exportName={`VA_ageing_by_${split}`}
      chartHeight={300}
      hint="Click a column to list those enquiries in the records table. Completed and cancelled enquiries are excluded."
      controls={<SegToggle value={split} onChange={setSplit} label="Split columns" options={[{ value: "stage", label: "By stage" }, { value: "category", label: "By category" }]} />}
      table={{
        columns: [
          { field: "name", header: "Days open" },
          ...series.map((s) => ({ field: s.key, header: s.label, align: "right" })),
          { field: "total", header: "Total", align: "right" },
          { field: "avgAge", header: "Avg. days open", align: "right", render: (r) => fmtDays(r.avgAge), exportValue: (r) => r.avgAge?.toFixed(1) ?? "" },
        ],
        rows,
        onRowClick: (r) => toggle("age", r.key),
        selectedKey: selected,
      }}
      renderChart={(h) => (
        <MultiVBars
          data={rows}
          series={series}
          height={h}
          stacked
          interval={0}
          tick={(v) => v.replace("Above 90 days", "90+ days").replace(" days", " d")}
          onPick={(d) => toggle("age", d.key)}
          selected={selected}
          extra={(d) => `${fmtInt(d.total)} open · avg ${fmtDays(d.avgAge)}`}
        />
      )}
    />
  );
}

const AGEING_DIMS = ["country", "client", "clientContact", "entity", "globalBu", "category", "status", "createdBy"];

/** Ageing cross-tab: country / client / category / status / user × age bucket. */
export function AgeingMatrixWidget({ facts, filters, update, toggle, statusOf, reset }) {
  const [dim, setDim] = useState("country");
  const d = DIMENSIONS[dim];
  const state = statusOf([]);
  const ignore = ["age", ...(d.filterKey ? [d.filterKey] : [])];
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore }).filter((f) => f.ageBucket), [facts, filters, dim]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols = AGE_BUCKETS.map((b) => ({ key: b.key, label: b.label }));
  const rows = useMemo(() => matrixData(scoped, dim, cols, (f) => f.ageBucket, 15), [scoped, dim]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = d.filterKey ? filters[d.filterKey] : null;
  const isActive = (r, c) => (!sel || String(sel) === r.key) && (!filters.age || filters.age === c.key);
  const cascade = DEPENDENT_FILTERS[d.filterKey] || {};
  const pick = (r, c) => {
    if (!d.filterKey) return toggle("age", c.key);
    const same = String(sel) === r.key && filters.age === c.key;
    return update(same ? { [d.filterKey]: "", age: "", ...cascade } : { [d.filterKey]: r.key, age: c.key, ...cascade });
  };
  return (
    <ReportWidget
      title={`Ageing by ${d.label.toLowerCase()}`}
      subtitle={`Open enquiries per ${d.label.toLowerCase()} and days open (top 15)`}
      span={2}
      state={state}
      isEmpty={!rows.length}
      emptyText="No open enquiries for the current filters."
      onReset={reset}
      exportName={`VA_ageing_matrix_${dim}`}
      pngAvailable={false}
      chartHeight={Math.max(240, rows.length * 34 + 70)}
      hint={d.filterKey ? "Click a cell to filter by that row and age." : "Click a cell to filter by that age."}
      controls={<SegToggle value={dim} onChange={setDim} label="Rows" options={AGEING_DIMS.map((k) => ({ value: k, label: DIMENSIONS[k].label }))} />}
      table={{ columns: [{ field: "name", header: d.label }, ...cols.map((c) => ({ field: c.key, header: c.label, align: "right" })), { field: "total", header: "Total open", align: "right" }], rows }}
      renderChart={() => <HeatmapTable rows={rows} cols={cols} rowLabel={d.label} onPick={pick} isActive={isActive} />}
    />
  );
}

/** Open backlog at the end of each period, by age bucket (stacked area, sequential colours). */
export function AgeingTrendWidget({ facts, filters, statusOf, reset }) {
  const auto = autoGranularity(filters.from, filters.to);
  const g = auto === "day" ? "week" : auto === "year" ? "month" : auto; // snapshots: never daily, never yearly
  const state = statusOf(["history"]);
  const loaded = loadedRange(filters.from, filters.to);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["age"], range: loaded }), [facts, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => ageingTrendData(scoped, filters.from, filters.to, g), [scoped, filters.from, filters.to, g]);
  return (
    <ReportWidget
      title="Ageing trend"
      subtitle={`Open enquiries at the end of each ${g}, by days open`}
      state={state}
      isEmpty={!rows.some((r) => r.total)}
      onReset={reset}
      exportName="VA_ageing_trend"
      chartHeight={300}
      hint={`Counts enquiries created since ${toDmy(loaded.from)}; older backlog is not loaded.`}
      table={{
        columns: [
          { field: "key", header: "Period start" },
          ...AGE_SERIES.map((s) => ({ field: s.key, header: s.label, align: "right" })),
          { field: "total", header: "Open", align: "right" },
        ],
        rows,
      }}
      renderChart={(h) => (
        <>
          <Legend items={AGE_SERIES} />
          <ResponsiveContainer width="100%" height={h - 52}>
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} interval="preserveStartEnd" minTickGap={14} />
              <YAxis {...AXIS} allowDecimals={false} width={44} />
              <Tooltip cursor={{ stroke: "#9a9a9a", strokeWidth: 1 }} content={<ChartTooltip extra={(d) => `${fmtInt(d.total)} open on ${toDmy(d.asOf)}`} />} />
              {AGE_SERIES.map((s) => (
                <Area key={s.key} dataKey={s.key} name={s.label} stackId="age" stroke="#ffffff" strokeWidth={1} fill={s.color} fillOpacity={1} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    />
  );
}
