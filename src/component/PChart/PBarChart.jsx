import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, } from "recharts";

const PBarChart = ({ data }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
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
          {`${name}: ${value}`}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        width: "100%",
        flex: 1,
        minHeight: 400,
        position: "relative",
        background: "#ffffff",
      }}
    >
      {/* grows with its parent; absolute layer gives ResponsiveContainer a definite size */}
      <div style={{ position: "absolute", inset: "10px 0" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="25%">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#555AE8" stopOpacity={1} />
              <stop offset="100%" stopColor="#49C9E9" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#555AE8" />

          <XAxis dataKey="name" tick={{ fill: "#ddd", fontSize: 9 }} axisLine={false} tickLine={false} />

          <YAxis tick={{ fill: "#ddd", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="value" fill="url(#barGradient)" radius={[8, 8, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PBarChart;