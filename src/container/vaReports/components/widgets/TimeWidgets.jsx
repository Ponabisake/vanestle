import { useMemo, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip, Legend } from "../chartKit";
import { AXIS, BAR, DIM, GRID, datumOf } from "../chartConfig";
import { OPEN_STAGES, SERIES, STAGE_BY_KEY } from "../../constants";
import { ageingData, applyFilters, trendData } from "../../utils/aggregations";
import { daysBetween } from "../../utils/dateUtils";

/** Enquiries created vs completed over time. */
export function TrendWidget({ facts, filters, statusOf, reset }) {
  const span = daysBetween(filters.from, filters.to);
  const auto = span > 120 ? "month" : span > 31 ? "week" : "day";
  const [granularity, setGranularity] = useState(null);
  const g = granularity || auto;
  const state = statusOf(["history"]);
  const scoped = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const data = useMemo(() => trendData(scoped, filters.from, filters.to, g), [scoped, filters.from, filters.to, g]);
  const series = [
    { key: "created", label: "Created", color: SERIES[0] },
    { key: "completed", label: "Completed", color: SERIES[1] },
  ];
  return (
    <ReportWidget
      title="Enquiry trend"
      subtitle="Enquiries created vs. completed in each period"
      span={2}
      state={state}
      isEmpty={!scoped.length}
      onReset={reset}
      exportName="VA_enquiry_trend"
      controls={
        <ToggleButtonGroup size="small" exclusive value={g} onChange={(e, v) => v && setGranularity(v)} aria-label="Trend granularity" className="va-seg">
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>
      }
      table={{
        columns: [
          { field: "key", header: "Period start" },
          { field: "created", header: "Created", align: "right" },
          { field: "completed", header: "Completed", align: "right" },
        ],
        rows: data,
      }}
      renderChart={(h) => (
        <>
          <Legend items={series} />
          <ResponsiveContainer width="100%" height={h - 28}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
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

/** Open enquiries by days open, stacked by stage. Clicking a column filters by age bucket. */
export function AgeingWidget({ facts, filters, toggle, statusOf, reset }) {
  const state = statusOf(["history"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["age"] }), [facts, filters]);
  const data = useMemo(() => ageingData(scoped), [scoped]);
  const selected = filters.age || null;
  const stages = OPEN_STAGES.map((k) => STAGE_BY_KEY[k]);
  const totalOpen = data.reduce((s, d) => s + d.total, 0);
  return (
    <ReportWidget
      title="Ageing of open enquiries"
      subtitle="Days since the enquiry was created, by current stage"
      state={state}
      isEmpty={!totalOpen}
      emptyText="No open enquiries for the current filters."
      onReset={reset}
      exportName="VA_ageing"
      hint="Click a column to filter by age."
      table={{
        columns: [
          { field: "name", header: "Days open" },
          ...stages.map((s) => ({ field: s.key, header: s.label, align: "right" })),
          { field: "total", header: "Total", align: "right" },
        ],
        rows: data,
        onRowClick: (r) => toggle("age", r.key),
        selectedKey: selected,
      }}
      renderChart={(h) => (
        <>
          <Legend items={stages.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
          <ResponsiveContainer width="100%" height={h - 52}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} width={44} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip extra={(d) => `${d.total} open`} />} />
              {stages.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="age"
                  fill={s.color}
                  {...BAR}
                  maxBarSize={48}
                  radius={i === stages.length - 1 ? [4, 4, 0, 0] : 0}
                  onClick={(d) => toggle("age", datumOf(d).key)}
                  cursor="pointer"
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fillOpacity={selected && selected !== d.key ? DIM : 1} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    />
  );
}
