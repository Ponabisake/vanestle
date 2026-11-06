import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip, Legend } from "../chartKit";
import { AXIS, BAR, DIM, GRID, HBAR_RADIUS, datumOf } from "../chartConfig";
import { SERIES, STAGE_BY_KEY } from "../../constants";
import { applyFilters, funnelData, stageData, statusBreakdown } from "../../utils/aggregations";
import { fmtInt, fmtPct } from "../../utils/format";

/** Workflow funnel: furthest stage each enquiry has reached (needs status history). */
export function FunnelWidget({ facts, filters, statusOf, reset }) {
  const state = statusOf(["history"]);
  const data = useMemo(() => funnelData(applyFilters(facts, filters)), [facts, filters]);
  const start = data[0]?.value || 0;
  return (
    <ReportWidget
      title="Workflow funnel"
      subtitle="Enquiries that reached each stage (Enquiry → Completed)"
      state={state}
      isEmpty={!start}
      onReset={reset}
      exportName="VA_workflow_funnel"
      hint="Conversion = share of the previous stage that moved on."
      table={{
        columns: [
          { field: "name", header: "Stage" },
          { field: "value", header: "Enquiries", align: "right" },
          { field: "pctOfStart", header: "% of all", align: "right", render: (r) => fmtPct(r.pctOfStart), exportValue: (r) => r.pctOfStart.toFixed(1) },
          { field: "conversion", header: "Conversion", align: "right", render: (r) => fmtPct(r.conversion), exportValue: (r) => r.conversion.toFixed(1) },
        ],
        rows: data,
      }}
      renderChart={(h) => (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, left: 8, bottom: 4 }}>
            <CartesianGrid {...GRID} horizontal={false} />
            <XAxis type="number" {...AXIS} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={118} {...AXIS} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={<ChartTooltip extra={(d) => `${fmtPct(d.pctOfStart)} of all · ${fmtPct(d.conversion)} from previous stage`} />}
            />
            <Bar dataKey="value" name="Enquiries" fill={SERIES[0]} radius={HBAR_RADIUS} {...BAR} maxBarSize={26} isAnimationActive={false}>
              <LabelList dataKey="pctOfStart" position="right" formatter={(v) => fmtPct(v, 0)} className="va-barlabel" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}

/** Status donut by workflow stage. Clicking a slice cross-filters the page by stage. */
export function StatusDonutWidget({ facts, filters, toggle, statusOf, reset }) {
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["stage"] }), [facts, filters]);
  const data = useMemo(() => stageData(scoped).filter((d) => d.value > 0), [scoped]);
  const breakdown = useMemo(() => statusBreakdown(scoped), [scoped]);
  const total = scoped.length;
  const selected = filters.stage || null;
  const onPick = (key) => toggle("stage", key);

  return (
    <ReportWidget
      title="Status distribution"
      subtitle="Current status, grouped by workflow stage"
      state={state}
      isEmpty={!total}
      onReset={reset}
      exportName="VA_status_distribution"
      hint="Click a slice or legend item to filter the whole page."
      table={{
        columns: [
          { field: "statusName", header: "Status" },
          { field: "stage", header: "Stage", render: (r) => STAGE_BY_KEY[r.stage]?.label, exportValue: (r) => STAGE_BY_KEY[r.stage]?.label },
          { field: "value", header: "Enquiries", align: "right" },
          { field: "pct", header: "%", align: "right", render: (r) => fmtPct((r.value / total) * 100), exportValue: (r) => ((r.value / total) * 100).toFixed(1) },
        ],
        rows: breakdown.map((b) => ({ ...b, key: b.stage })),
        onRowClick: (r) => onPick(r.stage),
        selectedKey: selected,
      }}
      renderChart={(h) => (
        <div className="va-donut">
          <div className="va-donut-chart" style={{ height: h }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="86%"
                  paddingAngle={1}
                  stroke="#ffffff"
                  strokeWidth={2}
                  onClick={(d) => onPick(datumOf(d).key)}
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.color} fillOpacity={selected && selected !== d.key ? DIM : 1} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip total={total} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="va-donut-center" aria-hidden="true">
              <strong>{fmtInt(total)}</strong>
              <span>enquiries</span>
            </div>
          </div>
          <Legend
            items={data.map((d) => ({ key: d.key, label: d.name, color: d.color, value: fmtInt(d.value) }))}
            onClick={onPick}
            selected={selected}
          />
        </div>
      )}
    />
  );
}
