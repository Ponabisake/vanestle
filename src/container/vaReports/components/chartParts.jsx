// Reusable chart building blocks for the VA Reports widgets (same marks and axes as chartConfig.js).
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, Legend } from "./chartKit";
import { AXIS, BAR, DIM, GRID, HBAR_RADIUS, VBAR_RADIUS, datumOf, truncate } from "./chartConfig";
import { fmtInt } from "../utils/format";

/** Segmented control used for every "view / split / dimension" switch. */
export function SegToggle({ value, onChange, options, label }) {
  return (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(e, v) => v && onChange(v)} aria-label={label} className="va-seg">
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}


/**
 * Horizontal bars with several series – stacked (parts of a whole) or grouped (side by side).
 * The last stacked segment gets the rounded data-end; a click on any segment calls onPick(datum).
 */
export function MultiHBars({ data, series, height, stacked = true, onPick, selected, valueFormat = fmtInt, yWidth = 190, tick, extra, legend = true }) {
  return (
    <>
      {legend && <Legend items={series} />}
      <ResponsiveContainer width="100%" height={height - (legend ? 28 : 0)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }} barGap={2}>
          <CartesianGrid {...GRID} horizontal={false} />
          <XAxis type="number" {...AXIS} tickFormatter={valueFormat} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={yWidth} {...AXIS} tickFormatter={tick || ((v) => truncate(v, 24))} interval={0} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip valueFormat={valueFormat} extra={extra} />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "s" : undefined}
              radius={!stacked || i === series.length - 1 ? HBAR_RADIUS : 0}
              {...BAR}
              maxBarSize={stacked ? 18 : 12}
              onClick={onPick ? (d) => onPick(datumOf(d)) : undefined}
              cursor={onPick ? "pointer" : undefined}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fillOpacity={selected && String(selected) !== String(d.key) ? DIM : 1} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

/** Vertical bars over periods or buckets – stacked or grouped, one shared y-axis. */
export function MultiVBars({ data, series, height, stacked = false, onPick, selected, valueFormat = fmtInt, extra, angle = 0, interval = "preserveStartEnd", tick }) {
  return (
    <>
      <Legend items={series} />
      <ResponsiveContainer width="100%" height={height - 28}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={interval} tickFormatter={tick} minTickGap={10} angle={angle} textAnchor={angle ? "end" : "middle"} height={angle ? 56 : 30} />
          <YAxis {...AXIS} allowDecimals={false} width={48} tickFormatter={valueFormat} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip valueFormat={valueFormat} extra={extra} />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "s" : undefined}
              radius={!stacked || i === series.length - 1 ? VBAR_RADIUS : 0}
              {...BAR}
              maxBarSize={stacked ? 40 : 16}
              onClick={onPick ? (d) => onPick(datumOf(d)) : undefined}
              cursor={onPick ? "pointer" : undefined}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fillOpacity={selected && String(selected) !== String(d.key) ? DIM : 1} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

/**
 * Cross-tab heatmap (one hue, light → dark = fewer → more). Every cell is a button that calls onPick(row, col);
 * isActive(row, col) dims the cells outside the current selection.
 */
export function HeatmapTable({ rows, cols, rowLabel, onPick, isActive = () => true, rowTitle, cellLabel }) {
  const max = Math.max(1, ...rows.flatMap((r) => cols.map((c) => r[c.key] || 0)));
  const shade = (v) => (v ? `rgba(75, 79, 166, ${0.12 + 0.88 * (v / max)})` : "transparent");
  return (
    <div className="va-heatmap-wrap">
      <table className="va-heatmap">
        <thead>
          <tr>
            <th scope="col">{rowLabel}</th>
            {cols.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" title={rowTitle ? rowTitle(r) : r.name}>{truncate(r.name, 26)}</th>
              {cols.map((c) => {
                const v = r[c.key] || 0;
                return (
                  <td key={c.key} style={{ opacity: isActive(r, c) ? 1 : 0.35 }}>
                    {v ? (
                      <button
                        type="button"
                        className="va-cell"
                        style={{ background: shade(v), color: v / max > 0.5 ? "#fff" : "#171717" }}
                        onClick={onPick ? () => onPick(r, c) : undefined}
                        aria-label={cellLabel ? cellLabel(r, c, v) : `${r.name}, ${c.label}: ${v}`}
                        title={cellLabel ? cellLabel(r, c, v) : `${r.name} · ${c.label}: ${v}`}
                      >
                        {fmtInt(v)}
                      </button>
                    ) : (
                      <span className="va-cell va-cell-zero">·</span>
                    )}
                  </td>
                );
              })}
              <td className="va-cell-total">{fmtInt(r.total)}</td>
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
  );
}
