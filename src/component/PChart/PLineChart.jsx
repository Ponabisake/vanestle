import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, } from "recharts";

const PLineChart = ({ data }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div
          style={{
            background: "#fff",
            padding: "8px 12px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: "12px",
            color: "#111827",
          }}
        >
          {`${name} : ${value}`} {/* Single line */}
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
      <div style={{ position: "absolute", inset: "20px 0" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e91e63" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#e91e63" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />

          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />

          {/* 2️⃣ Use Custom Tooltip */}
          <Tooltip content={<CustomTooltip />} />

          {/* Area Background */}
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#lineGradient)" />

          {/* Line */}
          <Line type="monotone" dataKey="value" stroke="#ED3B25" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={800} />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PLineChart;