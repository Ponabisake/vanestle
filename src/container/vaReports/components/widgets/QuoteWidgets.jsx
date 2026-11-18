// E-bidding and supplier bidding. Terms are kept apart on purpose:
//   invitation = one line item sent to one supplier · response = that supplier quoted / bid · supplier = unique supplier.
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip, Legend, StatRow } from "../chartKit";
import { AXIS, GRID, VBAR_RADIUS } from "../chartConfig";
import { MultiHBars, MultiVBars, SegToggle } from "../chartParts";
import { barHeight } from "../chartConfig";
import { HBars } from "./DimensionWidgets";
import { SERIES } from "../../constants";
import {
  DIMENSIONS, applyFilters, autoGranularity, ebiddingData, ebiddingSplitData, supplierActivityData, supplierData,
} from "../../utils/aggregations";
import { fmtDays, fmtInt, fmtNum, fmtPct } from "../../utils/format";

const pctExport = (v) => (v == null ? "" : v.toFixed(1));
const SPLIT_DIMS = [
  { value: "category", label: "Category" },
  { value: "country", label: "Country" },
  { value: "client", label: "Client" },
  { value: "month", label: "Month" },
];
const monthGranularity = (from, to) => (autoGranularity(from, to) === "year" ? "year" : autoGranularity(from, to) === "day" ? "week" : "month");

/** E-bidding events: lowest vs average final bid, participation, conversion and savings. */
export function EBiddingWidget({ facts, filters, statusOf, reset }) {
  const state = statusOf(["quotes", "items", "history"]);
  const scoped = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const { rows, stats } = useMemo(() => ebiddingData(scoped), [scoped]);
  const shown = rows.slice(0, 12).reverse();
  const series = [
    { key: "lowest", label: "Lowest bid", color: SERIES[0] },
    { key: "average", label: "Average bid", color: SERIES[1] },
  ];
  return (
    <ReportWidget
      title="E-bidding events"
      subtitle="Latest 12 events with bids: lowest vs. average final bid (sum over line items, supplier currency)"
      span={2}
      state={state}
      isEmpty={!stats.events}
      emptyText="No e-bidding enquiries for the current filters."
      onReset={reset}
      exportName="VA_ebidding"
      chartHeight={300}
      hint="Participation = suppliers who bid ÷ suppliers invited. Conversion = events with bids that reached award. Bid reduction = first bid → final bid per bidder."
      controls={
        <StatRow
          items={[
            { label: "E-bidding enquiries", value: fmtInt(stats.events) },
            { label: "Share of all enquiries", value: fmtPct(stats.share) },
            { label: "Events with bids", value: fmtInt(stats.withBids) },
            { label: "Bids placed", value: fmtInt(stats.bids) },
            { label: "Avg. bidders / event", value: stats.avgSuppliers == null ? "–" : stats.avgSuppliers.toFixed(1) },
            { label: "Participation", value: fmtPct(stats.participation) },
            { label: "Conversion to award", value: fmtPct(stats.conversion) },
            { label: "Avg. bid reduction", value: fmtPct(stats.avgReduction) },
          ]}
        />
      }
      table={{
        columns: [
          { field: "name", header: "Enquiry" },
          { field: "project", header: "Project" },
          { field: "category", header: "Category" },
          { field: "invited", header: "Suppliers invited", align: "right" },
          { field: "suppliers", header: "Suppliers bidding", align: "right" },
          { field: "bids", header: "Bids", align: "right" },
          { field: "lowest", header: "Lowest bid", align: "right", render: (r) => fmtInt(r.lowest), exportValue: (r) => Math.round(r.lowest ?? 0) },
          { field: "average", header: "Average bid", align: "right", render: (r) => fmtInt(r.average), exportValue: (r) => Math.round(r.average ?? 0) },
          { field: "reductionPct", header: "Bid reduction %", align: "right", render: (r) => fmtPct(r.reductionPct), exportValue: (r) => pctExport(r.reductionPct) },
        ],
        rows,
      }}
      renderChart={(h) =>
        !shown.length ? (
          <div className="va-state" style={{ minHeight: h }}><p>No bids placed yet on these e-bidding enquiries.</p></div>
        ) : (
          <>
            <Legend items={series} />
            <ResponsiveContainer width="100%" height={h - 28}>
              <BarChart data={shown} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2} barCategoryGap="24%">
                <CartesianGrid {...GRID} vertical={false} />
                <XAxis dataKey="name" {...AXIS} interval={0} angle={-30} textAnchor="end" height={56} />
                <YAxis {...AXIS} tickFormatter={fmtNum} width={64} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={<ChartTooltip valueFormat={fmtInt} extra={(d) => `${d.bids} bids · ${d.suppliers}/${d.invited} suppliers bid · bid reduction ${fmtPct(d.reductionPct)}`} />}
                />
                {series.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={VBAR_RADIUS} maxBarSize={16} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        )
      }
    />
  );
}

/** E-bidding vs other enquiries by category / country / client / month. */
export function EBiddingSplitWidget({ facts, filters, update, statusOf, reset }) {
  const [dim, setDim] = useState("category");
  const fk = DIMENSIONS[dim]?.filterKey;
  const state = statusOf(["quotes"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["module", "ebid", ...(fk ? [fk] : [])] }), [facts, filters, fk]);
  const g = monthGranularity(filters.from, filters.to);
  const rows = useMemo(() => ebiddingSplitData(scoped, dim, filters.from, filters.to, g), [scoped, dim, filters.from, filters.to, g]);
  const shown = dim === "month" ? rows : rows.slice(0, 10);
  const series = [
    { key: "ebidding", label: "E-bidding", color: SERIES[0] },
    { key: "other", label: "Enquiry & Catalog", color: SERIES[1] },
  ];
  const pick = fk ? (d) => update({ [fk]: String(filters[fk]) === d.key ? "" : d.key, ...(fk === "country" ? { client: "", project: "" } : {}) }) : undefined;
  const extra = (d) => `${fmtPct(d.share)} e-bidding · ${fmtInt(d.withBids)} with bids · ${fmtInt(d.bids)} bids`;
  return (
    <ReportWidget
      title="E-bidding participation"
      subtitle={`E-bidding vs. other enquiries by ${dim === "month" ? g : DIMENSIONS[dim].label.toLowerCase()}`}
      state={state}
      isEmpty={!rows.some((r) => r.total)}
      onReset={reset}
      exportName={`VA_ebidding_by_${dim}`}
      chartHeight={dim === "month" ? 300 : barHeight(shown.length) + 28}
      hint={pick ? "Click a bar to filter the page." : undefined}
      controls={<SegToggle value={dim} onChange={setDim} label="Group by" options={SPLIT_DIMS} />}
      table={{
        columns: [
          { field: "name", header: dim === "month" ? "Period" : DIMENSIONS[dim].label },
          { field: "total", header: "Enquiries", align: "right" },
          { field: "ebidding", header: "E-bidding", align: "right" },
          { field: "share", header: "E-bidding share", align: "right", render: (r) => fmtPct(r.share), exportValue: (r) => pctExport(r.share) },
          { field: "withBids", header: "With bids", align: "right" },
          { field: "bids", header: "Bids", align: "right" },
        ],
        rows,
        onRowClick: pick,
      }}
      renderChart={(h) =>
        dim === "month" ? (
          <MultiVBars data={shown} series={series} height={h} stacked extra={extra} />
        ) : (
          <MultiHBars data={shown} series={series} height={h} yWidth={dim === "category" ? 80 : 180} onPick={pick} selected={fk ? filters[fk] : null} extra={extra} />
        )
      }
    />
  );
}

/** Per supplier: response rate, average response time and pending invitations. */
export function SupplierWidget({ facts, filters, toggle, statusOf, reset, suppliers }) {
  const state = statusOf(["quotes", "suppliers", "history"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["supplier"] }), [facts, filters]);
  const { rows, stats } = useMemo(() => supplierData(scoped, suppliers), [scoped, suppliers]);
  const shown = rows.slice(0, 10);
  return (
    <ReportWidget
      title="Supplier response"
      subtitle="Response rate per supplier (top 10 by invitations)"
      state={state}
      isEmpty={!rows.length}
      onReset={reset}
      exportName="VA_supplier_quotations"
      chartHeight={Math.max(240, shown.length * 30 + 36)}
      hint="Invitation = one line item sent to one supplier. Click a supplier to filter the page."
      controls={
        <StatRow
          items={[
            { label: "Suppliers invited", value: fmtInt(stats.suppliers) },
            { label: "Suppliers responding", value: fmtInt(stats.respondingSuppliers) },
            { label: "Response rate", value: fmtPct(stats.responseRate) },
            { label: "Avg. quotes / enquiry", value: stats.quotesPerEnquiry == null ? "–" : stats.quotesPerEnquiry.toFixed(1) },
            { label: "Avg. first response", value: fmtDays(stats.avgDays) },
            { label: "Pending invitations", value: fmtInt(stats.pending) },
          ]}
        />
      }
      table={{
        columns: [
          { field: "name", header: "Supplier" },
          { field: "enquiries", header: "Enquiries", align: "right" },
          { field: "requested", header: "Invitations", align: "right" },
          { field: "responded", header: "Responses", align: "right" },
          { field: "responseRate", header: "Response rate", align: "right", render: (r) => fmtPct(r.responseRate), exportValue: (r) => pctExport(r.responseRate) },
          { field: "avgDays", header: "Avg. response (days)", align: "right", render: (r) => fmtDays(r.avgDays), exportValue: (r) => r.avgDays?.toFixed(1) ?? "" },
          { field: "pending", header: "Pending", align: "right" },
          { field: "categories", header: "Categories" },
        ],
        rows,
        onRowClick: (r) => toggle("supplier", r.key),
        selectedKey: filters.supplier,
      }}
      renderChart={(h) => (
        <HBars
          data={shown}
          height={h}
          dataKey="responseRate"
          name="Response rate"
          domain={[0, 100]}
          valueFormat={(v) => fmtPct(v, 0)}
          onPick={(d) => toggle("supplier", d.key)}
          selected={filters.supplier}
          yWidth={205}
          extra={(d) => `${d.responded}/${d.requested} invitations answered · avg ${fmtDays(d.avgDays)} · ${d.pending} pending`}
        />
      )}
    />
  );
}

/** Invitations vs responses by category / country / client / month. */
export function SupplierActivityWidget({ facts, filters, update, statusOf, reset }) {
  const [dim, setDim] = useState("category");
  const fk = DIMENSIONS[dim]?.filterKey;
  const state = statusOf(["quotes", "history"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: fk ? [fk] : [] }), [facts, filters, fk]);
  const g = monthGranularity(filters.from, filters.to);
  const rows = useMemo(() => supplierActivityData(scoped, dim, filters.from, filters.to, g), [scoped, dim, filters.from, filters.to, g]);
  const shown = dim === "month" ? rows : rows.slice(0, 10);
  const series = [
    { key: "invitations", label: "Invitations", color: SERIES[0] },
    { key: "responses", label: "Responses", color: SERIES[1] },
  ];
  const pick = fk ? (d) => update({ [fk]: String(filters[fk]) === d.key ? "" : d.key, ...(fk === "country" ? { client: "", project: "" } : {}) }) : undefined;
  const extra = (d) => `${fmtPct(d.responseRate)} answered · ${fmtInt(d.suppliers)} suppliers · ${fmtInt(d.pending)} pending`;
  return (
    <ReportWidget
      title="Supplier bidding activity"
      subtitle={`Invitations vs. responses by ${dim === "month" ? `${g} of the RFQ` : DIMENSIONS[dim].label.toLowerCase()}`}
      span={2}
      state={state}
      isEmpty={!rows.some((r) => r.invitations)}
      onReset={reset}
      exportName={`VA_supplier_activity_${dim}`}
      chartHeight={dim === "month" ? 300 : barHeight(shown.length, 220, 40) + 28}
      hint="Suppliers = unique suppliers invited; responses and invitations count line items, so one supplier can add several."
      controls={<SegToggle value={dim} onChange={setDim} label="Group by" options={SPLIT_DIMS} />}
      table={{
        columns: [
          { field: "name", header: dim === "month" ? "Period" : DIMENSIONS[dim].label },
          { field: "quotedEnquiries", header: "Enquiries sent out", align: "right" },
          { field: "suppliers", header: "Suppliers invited", align: "right" },
          { field: "respondingSuppliers", header: "Suppliers responding", align: "right" },
          { field: "invitations", header: "Invitations", align: "right" },
          { field: "responses", header: "Responses", align: "right" },
          { field: "responseRate", header: "Response rate", align: "right", render: (r) => fmtPct(r.responseRate), exportValue: (r) => pctExport(r.responseRate) },
          { field: "participationRate", header: "Supplier participation", align: "right", render: (r) => fmtPct(r.participationRate), exportValue: (r) => pctExport(r.participationRate) },
          { field: "quotesPerEnquiry", header: "Avg. quotes / enquiry", align: "right", render: (r) => (r.quotesPerEnquiry == null ? "–" : r.quotesPerEnquiry.toFixed(1)), exportValue: (r) => r.quotesPerEnquiry?.toFixed(2) ?? "" },
          { field: "pending", header: "Pending", align: "right" },
        ],
        rows,
        onRowClick: pick,
      }}
      renderChart={(h) =>
        dim === "month" ? (
          <MultiVBars data={shown} series={series} height={h} extra={extra} />
        ) : (
          <MultiHBars data={shown} series={series} height={h} stacked={false} yWidth={dim === "category" ? 80 : 180} onPick={pick} selected={fk ? filters[fk] : null} extra={extra} />
        )
      }
    />
  );
}
