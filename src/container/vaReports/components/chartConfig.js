// Shared chart settings so every widget uses the same marks and axes.
import { BRAND } from "../constants";

export const AXIS = {
  tick: { fill: BRAND.textSecondary, fontSize: 12 },
  axisLine: { stroke: "#d9d9d9" },
  tickLine: false,
};
export const GRID = { stroke: BRAND.grid, strokeDasharray: "0" };
export const BAR = { maxBarSize: 18, stroke: "#ffffff", strokeWidth: 2 };
export const HBAR_RADIUS = [0, 4, 4, 0];
export const VBAR_RADIUS = [4, 4, 0, 0];
export const DIM = 0.28; // opacity of non-selected marks while a cross-filter is active

/** Recharts passes either the datum or a wrapper with .payload depending on the element. */
export const datumOf = (d) => d?.payload?.payload ?? d?.payload ?? d;

export const truncate = (s, n = 22) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);
