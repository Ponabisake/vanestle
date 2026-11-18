import { useMemo, useState } from "react";
import { Breadcrumbs } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportWidget from "../ReportWidget";
import { ChartTooltip } from "../chartKit";
import { AXIS, BAR, DIM, GRID, HBAR_RADIUS, barHeight, datumOf, truncate } from "../chartConfig";
import { MultiHBars, SegToggle } from "../chartParts";
import { SERIES, STATUS_GROUPS, categorySeries } from "../../constants";
import { DIMENSIONS, addCategoryCounts, applyFilters, breakdownData, drillData, drillLevel, userData } from "../../utils/aggregations";
import { fmtDays, fmtEur, fmtEurFull, fmtInt, fmtPct } from "../../utils/format";

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

const pctCol = (field, header) => ({ field, header, align: "right", render: (r) => fmtPct(r[field]), exportValue: (r) => (r[field] == null ? "" : r[field].toFixed(1)) });
const daysCol = (field, header) => ({ field, header, align: "right", render: (r) => fmtDays(r[field]), exportValue: (r) => (r[field] == null ? "" : r[field].toFixed(1)) });

/** Series for a breakdown split: status groups or categories (fixed colours either way). */
const splitSeries = (split, categories) =>
  split === "category"
    ? categorySeries(categories)
    : STATUS_GROUPS.map((g) => ({ key: g.key, label: g.label, color: g.color }));

const SPLITS = [
  { value: "status", label: "By status" },
  { value: "category", label: "By category" },
];

/** Columns every dimension breakdown table shares. */
const breakdownColumns = (label, categories) => [
  { field: "name", header: label },
  { field: "enquiries", header: "Enquiries", align: "right" },
  { field: "projects", header: "Projects", align: "right" },
  ...STATUS_GROUPS.map((g) => ({ field: g.key, header: g.label, align: "right" })),
  ...categories.map((c) => ({ field: `cat_${c.key}`, header: c.label, align: "right", render: (r) => r[`cat_${c.key}`] || 0, exportValue: (r) => r[`cat_${c.key}`] || 0 })),
  pctCol("completionRate", "Completion rate"),
  pctCol("awardRate", "Award rate"),
  daysCol("avgDuration", "Avg. project duration"),
  { field: "overdue", header: "Overdue", align: "right" },
  { field: "ebidding", header: "E-bidding", align: "right" },
  { field: "suppliers", header: "Suppliers invited", align: "right" },
  { field: "responses", header: "Quotes / bids", align: "right" },
];

/** Country → Client → Project → Enquiry drill-down. Each click sets the matching global filter. */
export function CountryDrillWidget({ facts, filters, update, statusOf, reset, master, categories }) {
  const [split, setSplit] = useState("status");
  const state = statusOf(["items", "history"]);
  const level = drillLevel(filters);
  const ignore = { country: ["country", "client", "project"], client: ["client", "project"], project: ["project"], enquiry: [] }[level];
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore }), [facts, filters, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const data = useMemo(() => {
    const rows = drillData(scoped, level);
    if (level === "enquiry") return rows;
    // category counts per drill row
    const keyOf = { country: (f) => String(f.countryId), client: (f) => String(f.clientId), project: (f) => f.projectNo || "–" }[level];
    const byKey = new Map(rows.map((r) => [r.key, []]));
    scoped.forEach((f) => byKey.get(keyOf(f))?.push(f));
    return rows.map((r) => addCategoryCounts(r, byKey.get(r.key) || []));
  }, [scoped, level]);
  const shown = data.slice(0, 12);

  const countryName = master?.country?.find((c) => String(c.value) === String(filters.country))?.label
    || facts.find((f) => String(f.countryId) === String(filters.country))?.countryName;
  const clientName = facts.find((f) => String(f.clientId) === String(filters.client))?.clientName;
  const crumbs = [
    { label: "All countries", onClick: () => update({ country: "", client: "", project: "" }) },
    filters.country && { label: countryName || "Country", onClick: () => update({ client: "", project: "" }) },
    filters.client && { label: clientName || "Client", onClick: () => update({ project: "" }) },
    filters.project && { label: filters.project },
  ].filter(Boolean);

  const drill = (d) => {
    if (level === "country") update({ country: d.key });
    else if (level === "client") update({ client: d.key });
    else if (level === "project") update({ project: d.key === "–" ? "" : d.key });
  };
  const levelLabel = { country: "Country", client: "Client", project: "Project", enquiry: "Enquiry" }[level];
  const series = split === "awards"
    ? [{ key: "enquiries", label: "Enquiries", color: SERIES[0] }, { key: "awarded", label: "Awarded", color: SERIES[1] }]
    : splitSeries(split, categories);

  return (
    <ReportWidget
      title="Enquiries by country"
      subtitle="Drill down: Country → Client → Project → Enquiry"
      span={2}
      state={state}
      isEmpty={!data.length}
      onReset={reset}
      exportName={`VA_drilldown_${level}`}
      chartHeight={Math.min(barHeight(shown.length * 1.2), 420)}
      hint={level !== "enquiry" ? `Click a ${levelLabel.toLowerCase()} to drill down.` : "Lowest level: enquiries of the selected project – see the records table below."}
      controls={
        <>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="Drill-down path" className="va-crumbs">
            {crumbs.map((c, i) =>
              c.onClick && i < crumbs.length - 1 ? (
                <button key={c.label} type="button" className="va-linkbtn" onClick={c.onClick}>{c.label}</button>
              ) : (
                <span key={c.label} aria-current="page">{c.label}</span>
              )
            )}
          </Breadcrumbs>
          {level !== "enquiry" && (
            <SegToggle value={split} onChange={setSplit} label="Split bars" options={[...SPLITS, { value: "awards", label: "Awards" }]} />
          )}
        </>
      }
      table={{
        columns: level === "enquiry"
          ? [
            { field: "name", header: "Enquiry" },
            { field: "category", header: "Category" },
            { field: "status", header: "Status" },
            { field: "value", header: "Awarded value (EUR)", align: "right", render: (r) => fmtEurFull(r.value), exportValue: (r) => Math.round(r.value) },
          ]
          : [
            ...breakdownColumns(levelLabel, categories),
            { field: "awarded", header: "Awarded", align: "right" },
            { field: "value", header: "Awarded value (EUR)", align: "right", render: (r) => fmtEurFull(r.value), exportValue: (r) => Math.round(r.value) },
          ],
        rows: data,
        onRowClick: level !== "enquiry" ? drill : undefined,
      }}
      renderChart={(h) =>
        level === "enquiry" ? (
          <HBars data={shown} height={h} dataKey="value" name="Awarded value" valueFormat={fmtEur} extra={(d) => `${d.category} · ${d.status}`} />
        ) : (
          <MultiHBars
            data={shown}
            series={series}
            height={h}
            stacked={split !== "awards"}
            yWidth={200}
            onPick={drill}
            extra={(d) => `${fmtInt(d.enquiries)} enquiries · award rate ${fmtPct(d.awardRate)} · ${fmtEurFull(d.value)} awarded`}
          />
        )
      }
    />
  );
}

/**
 * Ranked breakdown of one dimension: top 10 as bars split by status group or category, every value in the table
 * (enquiries, projects, status groups, categories, rates). A click filters the page by that value.
 */
function TopBreakdownWidget({ dim, title, subtitle, exportName, span = 1, limit = 10, cascade = {}, toggles, labelChars, labelWidth, facts, filters, toggle, statusOf, reset, categories }) {
  const [split, setSplit] = useState("status");
  const [level, setLevel] = useState(dim || toggles?.[0]?.value);
  const d = DIMENSIONS[level];
  const state = statusOf(["history", "quotes"]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: [d.filterKey] }), [facts, filters, d.filterKey]);
  const data = useMemo(() => breakdownData(scoped, level), [scoped, level]);
  const shown = data.slice(0, limit);
  const pick = (r) => toggle(d.filterKey, r.key, cascade);
  return (
    <ReportWidget
      title={typeof title === "function" ? title(d) : title}
      subtitle={typeof subtitle === "function" ? subtitle(d) : subtitle}
      span={span}
      state={state}
      isEmpty={!data.length}
      onReset={reset}
      exportName={`${exportName}${toggles ? `_${level}` : ""}`}
      chartHeight={barHeight(shown.length) + 28}
      hint={`Click a bar to filter the page by that ${d.label.toLowerCase()}. The table lists every ${d.label.toLowerCase()}.`}
      controls={
        <>
          {toggles && <SegToggle value={level} onChange={setLevel} label="Level" options={toggles} />}
          <SegToggle value={split} onChange={setSplit} label="Split bars" options={SPLITS} />
        </>
      }
      table={{ columns: breakdownColumns(d.label, categories), rows: data, onRowClick: pick, selectedKey: filters[d.filterKey] }}
      renderChart={(h) => (
        <MultiHBars
          data={shown}
          series={splitSeries(split, categories)}
          height={h}
          yWidth={labelWidth || (span > 1 ? 280 : 230)}
          tick={(v) => {
            const r = shown.find((x) => x.name === v);
            return `${truncate(v, labelChars || (span > 1 ? 26 : 20))} (${fmtPct(r?.completionRate, 0)})`;
          }}
          onPick={pick}
          selected={filters[d.filterKey]}
          extra={(r) => `${fmtInt(r.enquiries)} enquiries · ${fmtInt(r.projects)} projects · completion ${fmtPct(r.completionRate)} · avg duration ${fmtDays(r.avgDuration)}`}
        />
      )}
    />
  );
}

/** Enquiries per client. */
export function ClientWidget(props) {
  return (
    <TopBreakdownWidget
      {...props}
      dim="client"
      title="Top clients"
      subtitle="Top 10 by enquiry volume · completion rate in brackets"
      exportName="VA_clients"
      cascade={{ project: "" }}
    />
  );
}

/** Enquiries per client contact (tblClient: who the enquiry was raised for). */
export function ClientContactWidget(props) {
  return (
    <TopBreakdownWidget
      {...props}
      dim="clientContact"
      title="Top client contacts"
      subtitle="Top 10 client users by enquiry volume · completion rate in brackets"
      exportName="VA_client_contacts"
      labelChars={30}
      labelWidth={285}
      cascade={{ project: "" }}
    />
  );
}

const ORG_LEVELS = [
  { value: "entity", label: "Entity" },
  { value: "businessUnit", label: "Business unit" },
  { value: "globalBu", label: "Global BU" },
];

/** Organisation levels from the enquiry's division: legal entity, local business unit, global BU. */
export function OrgUnitWidget(props) {
  return (
    <TopBreakdownWidget
      {...props}
      toggles={ORG_LEVELS}
      span={2}
      limit={12}
      title={(d) => `Enquiries by ${d.label.toLowerCase()}`}
      subtitle={(d) => `Top 12 by enquiry volume · ${d.label} from the enquiry's division · completion rate in brackets`}
      exportName="VA_org"
    />
  );
}

/** Enquiries created per agency user, split by status group or category. */
export function UserActivityWidget({ facts, filters, toggle, statusOf, reset, categories }) {
  const [split, setSplit] = useState("status");
  const state = statusOf([]);
  const scoped = useMemo(() => applyFilters(facts, filters, { ignore: ["createdBy"] }), [facts, filters]);
  const data = useMemo(() => {
    const byUser = new Map(breakdownData(scoped, "createdBy").map((r) => [r.key, r]));
    return userData(scoped).map((u) => ({ ...u, ...byUser.get(u.key) }));
  }, [scoped]);
  const shown = data.slice(0, 10);
  return (
    <ReportWidget
      title="Created by"
      subtitle="Enquiries created per user (top 10)"
      state={state}
      isEmpty={!data.length}
      onReset={reset}
      exportName="VA_user_activity"
      chartHeight={barHeight(shown.length) + 28}
      hint="Click a user to filter the page. The table lists every user."
      controls={<SegToggle value={split} onChange={setSplit} label="Split bars" options={SPLITS} />}
      table={{ columns: breakdownColumns("User", categories), rows: data, onRowClick: (r) => toggle("createdBy", r.key), selectedKey: filters.createdBy }}
      renderChart={(h) => (
        <MultiHBars
          data={shown}
          series={splitSeries(split, categories)}
          height={h}
          onPick={(d) => toggle("createdBy", d.key)}
          selected={filters.createdBy}
          extra={(d) => `${fmtInt(d.open)} open · ${fmtInt(d.completed)} completed · completion ${fmtPct(d.completionRate)}`}
        />
      )}
    />
  );
}
