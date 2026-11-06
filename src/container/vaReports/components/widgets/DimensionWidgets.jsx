import { useMemo, useState } from "react";
import { Breadcrumbs, ToggleButton, ToggleButtonGroup } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip, Legend } from "../chartKit";
import { AXIS, BAR, DIM, GRID, HBAR_RADIUS, datumOf, truncate } from "../chartConfig";
import { SERIES, STAGES } from "../../constants";
import { applyFilters, clientData, drillData, drillLevel, projectMatrix, topProjects, userData } from "../../utils/aggregations";
import { fmtEur, fmtEurFull, fmtInt, fmtPct } from "../../utils/format";

/** Ranked horizontal bars (one series, one colour) with click-to-filter + selection highlight. */
export function HBars({ data, height, dataKey = "value", name, color = SERIES[0], onPick, selected, valueFormat = fmtInt, tick, yWidth = 190, domain, extra }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} tickFormatter={valueFormat} domain={domain} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={yWidth} {...AXIS} tickFormatter={tick || ((v) => truncate(v, 22))} interval={0} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip valueFormat={valueFormat} extra={extra} />} />
        <Bar
          dataKey={dataKey}
          name={name}
          fill={color}
          radius={HBAR_RADIUS}
          {...BAR}
          onClick={onPick ? (d) => onPick(datumOf(d)) : undefined}
          cursor={onPick ? "pointer" : undefined}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.key} fillOpacity={selected && String(selected) !== String(d.key) ? DIM : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const barHeight = (n, min = 220) => Math.max(min, n * 30 + 36);

/** Country → Client → Project → Enquiry drill-down. Each click sets the matching global filter. */
export function CountryDrillWidget({ facts, filters, update, statusOf, reset, master }) {
  const state = statusOf(["items", "history"]);
  const level = drillLevel(filters);
  const ignore = { country: ["country", "client", "project"], client: ["client", "project"], project: ["project"], enquiry: [] }[level];
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore }), [facts, filters, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const data = useMemo(() => drillData(scoped, level), [scoped, level]);
  const shown = data.slice(0, 12);

  const countryName = master?.country?.find((c) => String(c.value) === String(filters.country))?.label;
  const clientName = master?.client?.find((c) => String(c.value) === String(filters.client))?.label;
  const crumbs = [
    { label: "All countries", onClick: () => update({ country: "", client: "", project: "" }) },
    filters.country && { label: countryName || "Country", onClick: () => update({ client: "", project: "" }) },
    filters.client && { label: clientName || "Client", onClick: () => update({ project: "" }) },
    filters.project && { label: filters.project },
  ].filter(Boolean);

  const drill = (d) => {
    if (level === "country") update({ country: d.key });
    else if (level === "client") update({ client: d.key });
    else if (level === "project") update({ project: d.key });
  };
  const levelLabel = { country: "Country", client: "Client", project: "Project", enquiry: "Enquiry" }[level];
  const series = [
    { key: "enquiries", label: "Enquiries", color: SERIES[0] },
    { key: "awarded", label: "Awarded", color: SERIES[1] },
  ];

  return (
    <ReportWidget
      title="Enquiries & awards by country"
      subtitle="Drill down: Country → Client → Project → Enquiry"
      span={2}
      state={state}
      isEmpty={!data.length}
      onReset={reset}
      exportName={`VA_drilldown_${level}`}
      chartHeight={Math.min(barHeight(shown.length * 1.5), 420)}
      hint={level !== "enquiry" ? `Click a ${levelLabel.toLowerCase()} to drill down.` : "Lowest level: enquiries of the selected project."}
      controls={
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="Drill-down path" className="va-crumbs">
          {crumbs.map((c, i) =>
            c.onClick && i < crumbs.length - 1 ? (
              <button key={c.label} type="button" className="va-linkbtn" onClick={c.onClick}>{c.label}</button>
            ) : (
              <span key={c.label} aria-current="page">{c.label}</span>
            )
          )}
        </Breadcrumbs>
      }
      table={{
        columns: [
          { field: "name", header: levelLabel },
          ...(level === "enquiry" ? [{ field: "status", header: "Status" }] : [{ field: "enquiries", header: "Enquiries", align: "right" }]),
          { field: "awarded", header: "Awarded", align: "right" },
          ...(level !== "enquiry" ? [{ field: "awardRate", header: "Award rate", align: "right", render: (r) => fmtPct(r.awardRate), exportValue: (r) => r.awardRate.toFixed(1) }] : []),
          { field: "value", header: "Awarded value (EUR)", align: "right", render: (r) => fmtEurFull(r.value), exportValue: (r) => Math.round(r.value) },
        ],
        rows: data,
        onRowClick: level !== "enquiry" ? drill : undefined,
      }}
      renderChart={(h) =>
        level === "enquiry" ? (
          <HBars data={shown} height={h} dataKey="value" name="Awarded value" valueFormat={fmtEur} extra={(d) => d.status} />
        ) : (
          <>
            <Legend items={series} />
            <ResponsiveContainer width="100%" height={h - 28}>
              <BarChart data={shown} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }} barGap={2}>
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis type="number" {...AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={200} {...AXIS} tickFormatter={(v) => truncate(v, 24)} interval={0} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={<ChartTooltip extra={(d) => `Award rate ${fmtPct(d.awardRate)} · ${fmtEurFull(d.value)} awarded`} />}
                />
                {series.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={HBAR_RADIUS}
                    maxBarSize={14}
                    onClick={(d) => drill(datumOf(d))}
                    cursor="pointer"
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        )
      }
    />
  );
}

/** Enquiries and award rate per client. */
export function ClientWidget({ facts, filters, toggle, statusOf, reset }) {
  const state = statusOf(["history"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["client"] }), [facts, filters]);
  const data = useMemo(() => clientData(scoped), [scoped]);
  const shown = data.slice(0, 10);
  const rateOf = new Map(data.map((d) => [d.name, d.awardRate]));
  return (
    <ReportWidget
      title="Clients"
      subtitle="Enquiries per client · award rate in brackets"
      state={state}
      isEmpty={!data.length}
      onReset={reset}
      exportName="VA_clients"
      chartHeight={barHeight(shown.length)}
      hint="Click a client to filter the page."
      table={{
        columns: [
          { field: "name", header: "Client" },
          { field: "enquiries", header: "Enquiries", align: "right" },
          { field: "awarded", header: "Awarded", align: "right" },
          { field: "awardRate", header: "Award rate", align: "right", render: (r) => fmtPct(r.awardRate), exportValue: (r) => r.awardRate.toFixed(1) },
        ],
        rows: data,
        onRowClick: (r) => toggle("client", r.key),
        selectedKey: filters.client,
      }}
      renderChart={(h) => (
        <HBars
          data={shown}
          height={h}
          dataKey="enquiries"
          name="Enquiries"
          yWidth={235}
          tick={(v) => `${truncate(v, 20)} (${fmtPct(rateOf.get(v), 0)})`}
          onPick={(d) => toggle("client", d.key)}
          selected={filters.client}
          extra={(d) => `${d.awarded} awarded · award rate ${fmtPct(d.awardRate)}`}
        />
      )}
    />
  );
}

/** Top projects by enquiry count or awarded value. */
export function TopProjectsWidget({ facts, filters, toggle, statusOf, reset }) {
  const [by, setBy] = useState("count");
  const state = statusOf(by === "value" ? ["items"] : []);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["project"] }), [facts, filters]);
  const data = useMemo(() => topProjects(scoped, by, 10).map((p) => ({ ...p, label: p.desc })), [scoped, by]);
  return (
    <ReportWidget
      title="Top projects"
      subtitle={by === "count" ? "By number of enquiries" : "By awarded value (EUR)"}
      state={state}
      isEmpty={!data.length || (by === "value" && !data.some((d) => d.value > 0))}
      onReset={reset}
      exportName={`VA_top_projects_by_${by}`}
      chartHeight={barHeight(data.length)}
      hint="Click a project to filter the page."
      controls={
        <ToggleButtonGroup size="small" exclusive value={by} onChange={(e, v) => v && setBy(v)} aria-label="Rank projects by" className="va-seg">
          <ToggleButton value="count">Enquiries</ToggleButton>
          <ToggleButton value="value">Value</ToggleButton>
        </ToggleButtonGroup>
      }
      table={{
        columns: [
          { field: "name", header: "Project no." },
          { field: "desc", header: "Project" },
          { field: "client", header: "Client" },
          { field: "count", header: "Enquiries", align: "right" },
          { field: "value", header: "Awarded value (EUR)", align: "right", render: (r) => fmtEurFull(r.value), exportValue: (r) => Math.round(r.value) },
        ],
        rows: data,
        onRowClick: (r) => toggle("project", r.key),
        selectedKey: filters.project,
      }}
      renderChart={(h) => (
        <HBars
          data={data.map((d) => ({ ...d, name: d.desc, projectNo: d.key }))}
          height={h}
          dataKey={by === "count" ? "count" : "value"}
          name={by === "count" ? "Enquiries" : "Awarded value"}
          valueFormat={by === "count" ? fmtInt : fmtEur}
          onPick={(d) => toggle("project", d.key)}
          selected={filters.project}
          yWidth={205}
          extra={(d) => `${d.projectNo} · ${d.client}`}
        />
      )}
    />
  );
}

/** Project × stage matrix rendered as a heatmap (one hue, light → dark). */
export function ProjectMatrixWidget({ facts, filters, update, statusOf, reset }) {
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["project", "stage"] }), [facts, filters]);
  const rows = useMemo(() => projectMatrix(scoped, 12), [scoped]);
  const max = Math.max(1, ...rows.flatMap((r) => STAGES.map((s) => r[s.key])));
  const shade = (v) => (v ? `rgba(75, 79, 166, ${0.12 + 0.88 * (v / max)})` : "transparent");
  const isActive = (r, s) => (!filters.project || filters.project === r.key) && (!filters.stage || filters.stage === s.key);
  const pick = (r, s) =>
    update(filters.project === r.key && filters.stage === s.key ? { project: "", stage: "" } : { project: r.key, stage: s.key });

  const columns = [
    { field: "name", header: "Project no." },
    { field: "desc", header: "Project" },
    ...STAGES.map((s) => ({ field: s.key, header: s.label, align: "right" })),
    { field: "total", header: "Total", align: "right" },
  ];
  return (
    <ReportWidget
      title="Project status matrix"
      subtitle="Top 12 projects × workflow stage (enquiry count)"
      span={2}
      state={state}
      isEmpty={!rows.length}
      onReset={reset}
      exportName="VA_project_status_matrix"
      pngAvailable={false}
      chartHeight={360}
      hint="Click a cell to filter by that project and stage."
      table={{ columns, rows }}
      renderChart={() => (
        <div className="va-heatmap-wrap">
          <table className="va-heatmap">
            <thead>
              <tr>
                <th scope="col">Project</th>
                {STAGES.map((s) => <th scope="col" key={s.key}>{s.label}</th>)}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" title={r.key}>{truncate(r.desc, 26)}</th>
                  {STAGES.map((s) => {
                    const v = r[s.key];
                    return (
                      <td key={s.key} style={{ opacity: isActive(r, s) ? 1 : 0.35 }}>
                        {v ? (
                          <button
                            type="button"
                            className="va-cell"
                            style={{ background: shade(v), color: v / max > 0.5 ? "#fff" : "#171717" }}
                            onClick={() => pick(r, s)}
                            aria-label={`${r.desc}, ${s.label}: ${v} enquiries`}
                            title={`${r.key} · ${s.label}: ${v}`}
                          >
                            {v}
                          </button>
                        ) : (
                          <span className="va-cell va-cell-zero">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="va-cell-total">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="va-scale" aria-hidden="true">
            <span>Fewer</span>
            <span className="va-scale-bar" />
            <span>More</span>
          </div>
        </div>
      )}
    />
  );
}

/** Enquiries created per agency user. */
export function UserActivityWidget({ facts, filters, toggle, statusOf, reset }) {
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["createdBy"] }), [facts, filters]);
  const data = useMemo(() => userData(scoped), [scoped]);
  const shown = data.slice(0, 10);
  return (
    <ReportWidget
      title="Created by"
      subtitle="Enquiries created per user"
      state={state}
      isEmpty={!data.length}
      onReset={reset}
      exportName="VA_user_activity"
      chartHeight={barHeight(shown.length)}
      hint="Click a user to filter the page."
      table={{
        columns: [
          { field: "name", header: "User" },
          { field: "enquiries", header: "Enquiries", align: "right" },
          { field: "open", header: "Open", align: "right" },
          { field: "completed", header: "Completed", align: "right" },
        ],
        rows: data,
        onRowClick: (r) => toggle("createdBy", r.key),
        selectedKey: filters.createdBy,
      }}
      renderChart={(h) => (
        <HBars
          data={shown}
          height={h}
          dataKey="enquiries"
          name="Enquiries"
          onPick={(d) => toggle("createdBy", d.key)}
          selected={filters.createdBy}
          extra={(d) => `${d.open} open · ${d.completed} completed`}
        />
      )}
    />
  );
}
