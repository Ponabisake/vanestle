import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip, Legend, StatRow } from "../chartKit";
import { AXIS, GRID, VBAR_RADIUS } from "../chartConfig";
import { HBars } from "./DimensionWidgets";
import { SERIES } from "../../constants";
import { applyFilters, ebiddingData, supplierData } from "../../utils/aggregations";
import { fmtDays, fmtEur, fmtEurFull, fmtInt, fmtPct } from "../../utils/format";

/** E-bidding: bids per event, participating suppliers, lowest vs average bid, savings. */
export function EBiddingWidget({ facts, filters, statusOf, reset }) {
  const state = statusOf(["quotes", "items"]);
  const scoped = useMemo(() => applyFilters(facts, filters), [facts, filters]);
  const { rows, stats } = useMemo(() => ebiddingData(scoped), [scoped]);
  const shown = rows.slice(0, 12).reverse();
  const series = [
    { key: "lowest", label: "Lowest bid", color: SERIES[0] },
    { key: "average", label: "Average bid", color: SERIES[1] },
  ];
  return (
    <ReportWidget
      title="E-bidding"
      subtitle="Latest 12 events: lowest vs. average final bid (EUR)"
      span={2}
      state={state}
      isEmpty={!rows.length}
      emptyText="No e-bidding events with bids for the current filters."
      onReset={reset}
      exportName="VA_ebidding"
      chartHeight={300}
      controls={
        <StatRow
          items={[
            { label: "E-bidding events", value: fmtInt(stats.events) },
            { label: "Total bids", value: fmtInt(stats.bids) },
            { label: "Avg. bids / event", value: stats.avgBids == null ? "–" : stats.avgBids.toFixed(1) },
            { label: "Avg. suppliers / event", value: stats.avgSuppliers == null ? "–" : stats.avgSuppliers.toFixed(1) },
            { label: "Avg. savings vs benchmark", value: fmtPct(stats.avgSavings) },
          ]}
        />
      }
      table={{
        columns: [
          { field: "name", header: "Enquiry" },
          { field: "project", header: "Project" },
          { field: "bids", header: "Bids", align: "right" },
          { field: "suppliers", header: "Suppliers", align: "right" },
          { field: "lowest", header: "Lowest (EUR)", align: "right", render: (r) => fmtEurFull(r.lowest), exportValue: (r) => Math.round(r.lowest ?? 0) },
          { field: "average", header: "Average (EUR)", align: "right", render: (r) => fmtEurFull(r.average), exportValue: (r) => Math.round(r.average ?? 0) },
          { field: "savingsPct", header: "Savings %", align: "right", render: (r) => fmtPct(r.savingsPct), exportValue: (r) => r.savingsPct?.toFixed(1) ?? "" },
        ],
        rows,
      }}
      renderChart={(h) => (
        <>
          <Legend items={series} />
          <ResponsiveContainer width="100%" height={h - 28}>
            <BarChart data={shown} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2} barCategoryGap="24%">
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} interval={0} angle={-30} textAnchor="end" height={56} />
              <YAxis {...AXIS} tickFormatter={fmtEur} width={64} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={
                  <ChartTooltip
                    valueFormat={fmtEurFull}
                    extra={(d) => `${d.bids} bids · ${d.suppliers} suppliers · savings ${fmtPct(d.savingsPct)}`}
                  />
                }
              />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={VBAR_RADIUS} maxBarSize={16} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    />
  );
}

/** Supplier quotation: response rate, average response time and pending quotations. */
export function SupplierWidget({ facts, filters, toggle, statusOf, reset, suppliers }) {
  const state = statusOf(["quotes", "suppliers", "history"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["supplier"] }), [facts, filters]);
  const { rows, stats } = useMemo(() => supplierData(scoped, suppliers), [scoped, suppliers]);
  const shown = rows.slice(0, 10);
  return (
    <ReportWidget
      title="Supplier quotations"
      subtitle="Response rate per supplier (top 10 by requests)"
      state={state}
      isEmpty={!rows.length}
      onReset={reset}
      exportName="VA_supplier_quotations"
      chartHeight={Math.max(240, shown.length * 30 + 36)}
      hint="Click a supplier to filter the page."
      controls={
        <StatRow
          items={[
            { label: "Response rate", value: fmtPct(stats.responseRate) },
            { label: "Avg. response time", value: fmtDays(stats.avgDays) },
            { label: "Pending quotations", value: fmtInt(stats.pending) },
          ]}
        />
      }
      table={{
        columns: [
          { field: "name", header: "Supplier" },
          { field: "requested", header: "Requested", align: "right" },
          { field: "responded", header: "Responded", align: "right" },
          { field: "responseRate", header: "Response rate", align: "right", render: (r) => fmtPct(r.responseRate), exportValue: (r) => r.responseRate.toFixed(1) },
          { field: "avgDays", header: "Avg. response (days)", align: "right", render: (r) => fmtDays(r.avgDays), exportValue: (r) => r.avgDays?.toFixed(1) ?? "" },
          { field: "pending", header: "Pending", align: "right" },
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
          extra={(d) => `${d.responded}/${d.requested} responded · avg ${fmtDays(d.avgDays)} · ${d.pending} pending`}
        />
      )}
    />
  );
}
