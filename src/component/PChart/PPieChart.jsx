import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Label } from "recharts";

// Ring area height. The ring is drawn in its own fixed-height box (radii are relative to it), and the
// legend is a plain HTML list below it, so a long status list can never push the ring over the legend.
const RING_HEIGHT = 250;

const colorMap = [
  "#555AE8", "#22c55e", "#FAB01B", "#DF493F", "#49C9E9", "#944EEF", "#60a5fa", "#f87171", "#22d3ee", "#c084fc", "#fb923c",
  "#4ade80", "#f97316", "#EB982A", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6", "#f472b6", "#fcd34d", "#f43f5e",
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        padding: "6px 10px",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontSize: "12px",
        color: "#111827",
      }}
    >
      {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
    </div>
  );
};

/**
 * activeId – optional id of the currently filtered slice; its legend row is highlighted and the
 *            other slices are dimmed.
 */
const PPieChart = ({ data = [], onSliceClick, activeId }) => {
  const consolidatedData = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      const existing = map.get(item.name);
      if (existing) existing.value += item.value;
      else map.set(item.name, { ...item });
    });
    return Array.from(map.values());
  }, [data]);

  const total = consolidatedData.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercent = consolidatedData.map((item, index) => ({
    ...item,
    color: colorMap[index % colorMap.length],
    percent: total > 0 ? Number(item.value || 0) / total : 0,
  }));

  const hasActive = activeId !== undefined && activeId !== null && activeId !== "";
  const isActive = (item) => hasActive && String(item.id) === String(activeId);

  const select = (item) => {
    if (item && onSliceClick) onSliceClick({ ...item });
  };

  return (
    // grows to fill its parent (min 480px); content is laid out in an absolutely-positioned layer so the
    // ring gets a definite size to measure and the legend scrolls inside the card instead of stretching it
    <div style={{ width: "100%", flex: 1, minHeight: 480, position: "relative", background: "#ffffff", borderRadius: 6 }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "12px 0" }}>
        <div style={{ height: RING_HEIGHT, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercent}
                dataKey="value"
                nameKey="name"
                innerRadius="74%"
                outerRadius="92%"
                paddingAngle={dataWithPercent.length > 1 ? 3 : 0}
                cornerRadius={4}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={450}
                onClick={(slice) => select(slice?.payload)}
                isAnimationActive={false}
              >
                {dataWithPercent.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    fillOpacity={hasActive && !isActive(entry) ? 0.25 : 1}
                    stroke="none"
                    style={{ cursor: onSliceClick ? "pointer" : "default", outline: "none" }}
                  />
                ))}
                <Label
                  position="center"
                  content={({ viewBox }) => {
                    // depending on the recharts version the Label gets the polar centre (cx/cy) or the
                    // plot area (x/y/width/height); the ring sits at the plot area's centre either way
                    const vb = viewBox || {};
                    const cx = vb.cx ?? (vb.x != null ? vb.x + vb.width / 2 : null);
                    const cy = vb.cy ?? (vb.y != null ? vb.y + vb.height / 2 : null);
                    if (cx == null || cy == null) return null;
                    return (
                      <text x={cx} y={cy} textAnchor="middle" pointerEvents="none">
                        <tspan x={cx} dy="0.1em" fontSize={String(total).length > 3 ? 24 : 28} fontWeight="bold" fill="#171717">
                          {total}
                        </tspan>
                        <tspan x={cx} dy="1.5em" fontSize="13" fill="#6B7280">
                          Total
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "12px 12px 0" }} />

        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "8px 6px 0",
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {dataWithPercent.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.name}>
                <button
                  type="button"
                  onClick={() => select(item)}
                  title={`${item.name}: ${item.value} (${(item.percent * 100).toFixed(1)}%)`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 8px",
                    border: 0,
                    borderRadius: 6,
                    background: active ? "rgba(207, 119, 41, 0.12)" : "transparent",
                    opacity: hasActive && !active ? 0.6 : 1,
                    cursor: onSliceClick ? "pointer" : "default",
                    fontSize: 13,
                    color: "#171717",
                    textAlign: "left",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, flexShrink: 0 }}>{item.value}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "#6B7280", width: 44, textAlign: "right", flexShrink: 0 }}>
                    {(item.percent * 100).toFixed(1)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PPieChart;
