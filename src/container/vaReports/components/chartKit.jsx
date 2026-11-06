// Shared chart components (tooltip, legend, stat tiles). Settings live in chartConfig.js.

/**
 * Tooltip with exact values and, when `total` is given, the share of the total.
 * valueFormat formats each value; title() can override the heading.
 */
export function ChartTooltip({ active, payload, label, total, valueFormat = (v) => v, title, extra }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload || {};
  const heading = title ? title(datum, label) : datum.name ?? label;
  return (
    <div className="va-tooltip" role="status">
      <div className="va-tooltip-title">{heading}</div>
      {payload.map((p) => {
        const color = p.color || p.payload?.color || p.payload?.fill || p.fill;
        const value = p.value;
        return (
          <div className="va-tooltip-row" key={`${p.dataKey}-${p.name}`}>
            <span className="va-swatch" style={{ background: color }} />
            <span className="va-tooltip-name">{p.name}</span>
            <span className="va-tooltip-value">
              {valueFormat(value, p)}
              {total ? <span className="va-tooltip-pct"> · {((value / total) * 100).toFixed(1)}%</span> : null}
            </span>
          </div>
        );
      })}
      {extra ? <div className="va-tooltip-extra">{extra(datum)}</div> : null}
    </div>
  );
}

/** Small stat tiles shown above a chart inside a widget. */
export function StatRow({ items }) {
  return (
    <div className="va-statrow">
      {items.map((it) => (
        <div className="va-stat" key={it.label}>
          <div className="va-stat-value">{it.value}</div>
          <div className="va-stat-label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Legend that always accompanies multi-series charts (identity is never colour alone). */
export function Legend({ items, onClick, selected }) {
  return (
    <ul className="va-legend" aria-label="Legend">
      {items.map((it) => {
        const isDim = selected && selected !== it.key;
        const content = (
          <>
            <span className="va-swatch" style={{ background: it.color }} />
            <span>{it.label}</span>
            {it.value != null && <span className="va-legend-value">{it.value}</span>}
          </>
        );
        return (
          <li key={it.key} style={{ opacity: isDim ? 0.45 : 1 }}>
            {onClick ? (
              <button type="button" className="va-legend-btn" onClick={() => onClick(it.key)} aria-pressed={selected === it.key}>
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
