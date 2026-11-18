// Category-oriented reports: the distinct tblEnquiryDetails.Printornonprint values (Print, POSM, Promo, ...).
import { useMemo, useState } from "react";
import ReportWidget from "../ReportWidget";
import { HeatmapTable, MultiHBars, SegToggle } from "../chartParts";
import { STATUS_GROUPS } from "../../constants";
import { DEPENDENT_FILTERS, DIMENSIONS, applyFilters, breakdownData, categoriesIn, categoryStatusData } from "../../utils/aggregations";
import { fmtDays, fmtInt, fmtPct } from "../../utils/format";

const pctExport = (v) => (v == null ? "" : v.toFixed(1));
const daysExport = (v) => (v == null ? "" : v.toFixed(1));

/** Enquiries per category, split by status group (Draft / In progress / Pending / Completed / Cancelled). */
export function CategoryStatusWidget({ facts, filters, toggle, statusOf, reset, categories }) {
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["category"] }), [facts, filters]);
  const data = useMemo(() => categoryStatusData(scoped, categories), [scoped, categories]);
  const series = STATUS_GROUPS.map((g) => ({ key: g.key, label: g.label, color: g.color }));
  const total = scoped.length;
  return (
    <ReportWidget
      title="Enquiries by category"
      subtitle="Each Printornonprint category, by status group"
      state={state}
      isEmpty={!total}
      onReset={reset}
      exportName="VA_category_status"
      chartHeight={Math.max(260, data.length * 34 + 64)}
      hint="Click a category to filter the page. An enquiry counts in the category most of its line items have."
      table={{
        columns: [
          { field: "name", header: "Category" },
          { field: "enquiries", header: "Enquiries", align: "right" },
          { field: "share", header: "Share", align: "right", render: (r) => fmtPct(total ? (r.enquiries / total) * 100 : null), exportValue: (r) => pctExport(total ? (r.enquiries / total) * 100 : null) },
          ...STATUS_GROUPS.map((g) => ({ field: g.key, header: g.label, align: "right" })),
          { field: "completionRate", header: "Completion rate", align: "right", render: (r) => fmtPct(r.completionRate), exportValue: (r) => pctExport(r.completionRate) },
          { field: "avgDuration", header: "Avg. project duration", align: "right", render: (r) => fmtDays(r.avgDuration), exportValue: (r) => daysExport(r.avgDuration) },
          { field: "avgOpenAge", header: "Avg. age of open", align: "right", render: (r) => fmtDays(r.avgOpenAge), exportValue: (r) => daysExport(r.avgOpenAge) },
          { field: "ebidding", header: "E-bidding", align: "right" },
        ],
        rows: data,
        onRowClick: (r) => toggle("category", r.key),
        selectedKey: filters.category,
      }}
      renderChart={(h) => (
        <MultiHBars
          data={data}
          series={series}
          height={h}
          yWidth={110}
          onPick={(d) => toggle("category", d.key)}
          selected={filters.category}
          extra={(d) => `${fmtInt(d.enquiries)} enquiries · ${fmtPct(total ? (d.enquiries / total) * 100 : null)} of all · completion ${fmtPct(d.completionRate)}`}
        />
      )}
    />
  );
}

const MATRIX_DIMS = ["country", "client", "clientContact", "entity", "businessUnit", "globalBu", "createdBy", "module"];

/** Country / client / user × category cross-tab. A cell click filters both. */
export function CategoryMatrixWidget({ facts, filters, update, statusOf, reset, categories }) {
  const [dim, setDim] = useState("country");
  const d = DIMENSIONS[dim];
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["category", d.filterKey] }), [facts, filters, d.filterKey]);
  const rows = useMemo(() => breakdownData(scoped, dim), [scoped, dim]);
  const cats = useMemo(() => categoriesIn(scoped, categories), [scoped, categories]);
  const shown = rows.slice(0, 15).map((r) => ({ ...r, total: r.enquiries }));
  const cols = cats.map((c) => ({ key: `cat_${c.key}`, label: c.label, name: c.key }));
  const sel = filters[d.filterKey];
  const isActive = (r, c) => (!sel || String(sel) === r.key) && (!filters.category || filters.category === c.name);
  const cascade = DEPENDENT_FILTERS[d.filterKey] || {};
  const pick = (r, c) =>
    update(String(sel) === r.key && filters.category === c.name
      ? { [d.filterKey]: "", category: "", ...cascade }
      : { [d.filterKey]: r.key, category: c.name, ...cascade });

  return (
    <ReportWidget
      title={`Category distribution by ${d.label.toLowerCase()}`}
      subtitle={`Top 15 ${d.label.toLowerCase()} values × category (enquiry count)`}
      span={2}
      state={state}
      isEmpty={!rows.length}
      onReset={reset}
      exportName={`VA_category_by_${dim}`}
      pngAvailable={false}
      chartHeight={Math.max(260, shown.length * 34 + 70)}
      hint="Click a cell to filter by that row and category."
      controls={
        <SegToggle
          value={dim}
          onChange={setDim}
          label="Rows"
          options={MATRIX_DIMS.map((k) => ({ value: k, label: DIMENSIONS[k].label }))}
        />
      }
      table={{
        columns: [
          { field: "name", header: d.label },
          ...cols.map((c) => ({ field: c.key, header: c.label, align: "right" })),
          { field: "enquiries", header: "Total", align: "right" },
          { field: "draft", header: "Draft", align: "right" },
          { field: "completed", header: "Completed", align: "right" },
          { field: "open", header: "Open", align: "right" },
        ],
        rows,
        onRowClick: (r) => update({ [d.filterKey]: String(sel) === r.key ? "" : r.key, ...cascade }),
        selectedKey: sel,
      }}
      renderChart={() => <HeatmapTable rows={shown} cols={cols} rowLabel={d.label} onPick={pick} isActive={isActive} />}
    />
  );
}
