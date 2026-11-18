// Project lifecycle: start = Date of brief (else creation), planned end = Expected delivery date,
// completed = first change to status 24. Missing or invalid dates are left out of each figure, never guessed.
import { useMemo, useState } from "react";
import ReportWidget from "../ReportWidget";
import { StatRow } from "../chartKit";
import { MultiHBars, MultiVBars, SegToggle } from "../chartParts";
import { barHeight } from "../chartConfig";
import { HBars } from "./DimensionWidgets";
import { DUE_SOON_DAYS, SERIES, STAGE_BY_KEY } from "../../constants";
import {
  DIMENSIONS, WATCHLISTS, applyFilters, autoGranularity, durationData, loadedRange, projectStats, projectTimelineData, watchlistData,
} from "../../utils/aggregations";
import { addDays, startOfDay, toDmy } from "../../utils/dateUtils";
import { fmtDays, fmtInt, fmtPct } from "../../utils/format";

const daysExport = (v) => (v == null ? "" : Number(v).toFixed(1));

/** Starts, completions and planned deliveries per period, with the lifecycle stat tiles. */
export function ProjectTimelineWidget({ facts, filters, statusOf, reset }) {
  const state = statusOf([]);
  const wide = useMemo(() => applyFilters(facts, filters, { range: loadedRange(filters.from, filters.to) }), [facts, filters]);
  const current = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  // show upcoming planned deliveries too: extend the axis to 60 days after today when the range ends today
  const to = useMemo(() => {
    const ahead = addDays(startOfDay(new Date()), 60);
    return filters.to < ahead && filters.to >= addDays(startOfDay(new Date()), -1) ? ahead : filters.to;
  }, [filters.to]);
  const g = autoGranularity(filters.from, to) === "day" ? "week" : autoGranularity(filters.from, to);
  const rows = useMemo(() => projectTimelineData(wide, filters.from, to, g), [wide, filters.from, to, g]);
  const stats = useMemo(() => projectStats(current), [current]);
  const series = [
    { key: "starts", label: "Started (brief date)", color: SERIES[0] },
    { key: "completions", label: "Completed", color: SERIES[1] },
    { key: "planned", label: "Planned delivery", color: SERIES[2] },
  ];
  return (
    <ReportWidget
      title="Project timeline"
      subtitle={`Project starts, completions and planned deliveries per ${g}`}
      span={2}
      state={state}
      isEmpty={!rows.some((r) => r.starts || r.completions || r.planned)}
      onReset={reset}
      exportName="VA_project_timeline"
      chartHeight={300}
      hint={`Tiles cover enquiries created in the period. Overdue = sent out, not completed, expected delivery date passed. Upcoming = next ${DUE_SOON_DAYS} days.`}
      controls={
        <StatRow
          items={[
            { label: "Ongoing projects", value: fmtInt(stats.ongoing) },
            { label: "Avg. duration (completed)", value: fmtDays(stats.avgDuration) },
            { label: "Overdue", value: fmtInt(stats.overdue) },
            { label: `Due in ${DUE_SOON_DAYS} days`, value: fmtInt(stats.dueSoon) },
            { label: `Starting in ${DUE_SOON_DAYS} days`, value: fmtInt(stats.startingSoon) },
            { label: "Delivered on time", value: fmtPct(stats.onTimePct) },
          ]}
        />
      }
      table={{
        columns: [{ field: "key", header: "Period start" }, ...series.map((s) => ({ field: s.key, header: s.label, align: "right" }))],
        rows,
      }}
      renderChart={(h) => <MultiVBars data={rows} series={series} height={h} />}
    />
  );
}

const DURATION_DIMS = ["category", "country", "client", "clientContact", "entity", "globalBu", "createdBy"];

/** Average completed duration vs. average age of ongoing projects, per category / country / client / user. */
export function ProjectDurationWidget({ facts, filters, toggle, statusOf, reset }) {
  const [dim, setDim] = useState("category");
  const d = DIMENSIONS[dim];
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: [d.filterKey] }), [facts, filters, d.filterKey]);
  const rows = useMemo(() => durationData(scoped, dim), [scoped, dim]);
  const shown = rows.slice(0, 10);
  const series = [
    { key: "avgDuration", label: "Completed: avg. duration", color: SERIES[0] },
    { key: "avgOngoing", label: "Ongoing: avg. days running", color: SERIES[1] },
  ];
  return (
    <ReportWidget
      title={`Project duration by ${d.label.toLowerCase()}`}
      subtitle="Days from brief (or creation) to completion · ongoing: to today"
      state={state}
      isEmpty={!rows.length}
      emptyText="No projects with usable dates for the current filters."
      onReset={reset}
      exportName={`VA_project_duration_${dim}`}
      chartHeight={barHeight(shown.length, 220, 40) + 28}
      hint={`Click a bar to filter by that ${d.label.toLowerCase()}.`}
      controls={<SegToggle value={dim} onChange={setDim} label="Group by" options={DURATION_DIMS.map((k) => ({ value: k, label: DIMENSIONS[k].label }))} />}
      table={{
        columns: [
          { field: "name", header: d.label },
          { field: "completedProjects", header: "Completed", align: "right" },
          { field: "avgDuration", header: "Avg. duration", align: "right", render: (r) => fmtDays(r.avgDuration), exportValue: (r) => daysExport(r.avgDuration) },
          { field: "shortest", header: "Shortest", align: "right", render: (r) => fmtDays(r.shortest), exportValue: (r) => daysExport(r.shortest) },
          { field: "longest", header: "Longest", align: "right", render: (r) => fmtDays(r.longest), exportValue: (r) => daysExport(r.longest) },
          { field: "onTimePct", header: "On time", align: "right", render: (r) => fmtPct(r.onTimePct), exportValue: (r) => daysExport(r.onTimePct) },
          { field: "ongoing", header: "Ongoing", align: "right" },
          { field: "avgOngoing", header: "Avg. days running", align: "right", render: (r) => fmtDays(r.avgOngoing), exportValue: (r) => daysExport(r.avgOngoing) },
          { field: "overdue", header: "Overdue", align: "right" },
        ],
        rows,
        onRowClick: (r) => toggle(d.filterKey, r.key),
        selectedKey: filters[d.filterKey],
      }}
      renderChart={(h) => (
        <MultiHBars
          data={shown}
          series={series}
          height={h}
          stacked={false}
          yWidth={dim === "category" ? 80 : 180}
          valueFormat={(v) => fmtInt(v)}
          onPick={(r) => toggle(d.filterKey, r.key)}
          selected={filters[d.filterKey]}
          extra={(r) => `${fmtInt(r.completedProjects)} completed · ${fmtInt(r.ongoing)} ongoing · ${fmtInt(r.overdue)} overdue`}
        />
      )}
    />
  );
}

/** Project lists: overdue, due soon, starting soon, longest running, longest / shortest completed. */
export function ProjectWatchlistWidget({ facts, filters, statusOf, reset }) {
  const [list, setList] = useState("overdue");
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const rows = useMemo(() => watchlistData(scoped, list), [scoped, list]);
  const meta = WATCHLISTS.find((w) => w.key === list);
  const shown = rows.slice(0, 12);
  return (
    <ReportWidget
      title="Project watchlist"
      subtitle={`${fmtInt(rows.length)} ${meta.label.toLowerCase()} · top 12 in the chart, all in the table`}
      span={3}
      state={state}
      isEmpty={!rows.length}
      emptyText="No projects in this list for the current filters."
      onReset={reset}
      exportName={`VA_projects_${list}`}
      chartHeight={barHeight(shown.length)}
      controls={<SegToggle value={list} onChange={setList} label="List" options={WATCHLISTS.map((w) => ({ value: w.key, label: w.label }))} />}
      table={{
        columns: [
          { field: "enquiryId", header: "Enquiry" },
          { field: "projectNo", header: "Project no." },
          { field: "projectDesc", header: "Project" },
          { field: "clientName", header: "Client" },
          { field: "countryName", header: "Country" },
          { field: "categoryName", header: "Category" },
          { field: "statusName", header: "Status" },
          { field: "stage", header: "Stage", render: (r) => STAGE_BY_KEY[r.stage]?.label, exportValue: (r) => STAGE_BY_KEY[r.stage]?.label },
          { field: "projectStart", header: "Start", render: (r) => toDmy(r.projectStart), exportValue: (r) => toDmy(r.projectStart) },
          { field: "plannedEnd", header: "Expected delivery", render: (r) => toDmy(r.plannedEnd) || "–", exportValue: (r) => toDmy(r.plannedEnd) },
          { field: "projectEnd", header: "Completed", render: (r) => toDmy(r.projectEnd) || "–", exportValue: (r) => toDmy(r.projectEnd) },
          { field: "days", header: meta.measure, align: "right" },
        ],
        rows,
      }}
      renderChart={(h) => (
        <HBars
          data={shown}
          height={h}
          dataKey="days"
          name={meta.measure}
          yWidth={130}
          extra={(r) => `${r.projectDesc} · ${r.clientName} · ${r.categoryName} · ${r.statusName}`}
        />
      )}
    />
  );
}
