import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Label } from "recharts";

// ring centre as a fraction of the plot area – shared by <Pie> and the centre "Total" label
const PIE_CX = 0.5;
const PIE_CY = 0.6;

const PPieChart = ({ data = [], onSliceClick }) => {
  const consolidatedData = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      const existing = map.get(item.name);
      if (existing) {
        existing.value += item.value;
      } else {
        map.set(item.name, { ...item });
      }
    });

    return Array.from(map.values());
  }, [data]);

  const handleSliceClick = (data) => {
    if (!data || !data.payload) return;

    if (onSliceClick) {
      onSliceClick({ ...data.payload });
    }
  };

  const colorMap = [
    "#555AE8", "#22c55e", "#FAB01B", "#DF493F", "#49C9E9", "#944EEF", "#60a5fa", "#f87171", "#22d3ee", "#c084fc", "#fb923c",
    "#4ade80", "#f97316", "#EB982A", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6", "#f472b6", "#fcd34d", "#f43f5e",
  ];

  const total = consolidatedData.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercent = consolidatedData.map((item) => ({
    ...item,
    percent: total > 0 ? Number(item.value || 0) / total : 0,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
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
    }

    return null;
  };
  return (
    <div
      style={{
        width: "100%",
        height: 600,
        background: "#ffffff",
        padding: "5px",
      }}
    >
      <ResponsiveContainer width="100%" height="100%" >
        <PieChart>
          <Pie
            data={dataWithPercent}
            dataKey="value"
            nameKey="name"
            innerRadius={100}
            outerRadius={120}
            paddingAngle={5}
            cornerRadius={4}
            cx={`${PIE_CX * 100}%`}
            cy={`${PIE_CY * 100}%`}
            startAngle={80}
            endAngle={450}
            labelLine={true}
            onClick={handleSliceClick}
          >
            {dataWithPercent.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={colorMap[index % colorMap.length]}
              />
            ))}
            {/* total sits at the ring's own centre (cx/cy), wherever the legend pushes the ring */}
            <Label
              position="center"
              content={({ viewBox }) => {
                // Pie gives its Label the plot area (x/y/width/height); the ring centre is at
                // the same PIE_CX / PIE_CY fractions of it that the <Pie> itself uses.
                const vb = viewBox || {};
                const cx = vb.cx ?? (vb.x != null ? vb.x + vb.width * PIE_CX : null);
                const cy = vb.cy ?? (vb.y != null ? vb.y + vb.height * PIE_CY : null);
                if (cx == null || cy == null) return null;
                return (
                  <text x={cx} y={cy} textAnchor="middle" pointerEvents="none">
                    <tspan x={cx} dy="0.1em" fontSize={String(total).length > 3 ? 22 : 28} fontWeight="bold" fill="#171717">
                      {total}
                    </tspan>
                    <tspan x={cx} dy="1.4em" fontSize="14" fill="#171717">
                      Total
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>

          <Tooltip content={<CustomTooltip />} />

          <Legend verticalAlign="bottom" align="left" iconType="circle" iconSize={8}
            wrapperStyle={{
              paddingTop: "5px",
              fontSize: "14px",
              paddingLeft: "10px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
export default PPieChart;