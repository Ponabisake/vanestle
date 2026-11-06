import { Box } from "@mui/material";
import ForestOutlinedIcon from "@mui/icons-material/ForestOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import Co2OutlinedIcon from "@mui/icons-material/Co2Outlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";

/** Metric look-up by the line title coming from the API ("Wood use", "Total energy", ...). */
const METRICS = [
  { match: /wood|forest|paper/i, icon: ForestOutlinedIcon, color: "#00916B", tint: "rgba(0, 145, 107, 0.10)" },
  { match: /energy|power|electric/i, icon: BoltOutlinedIcon, color: "#CF7729", tint: "rgba(207, 119, 41, 0.12)" },
  { match: /greenhouse|climate|carbon|co2/i, icon: Co2OutlinedIcon, color: "#512668", tint: "rgba(81, 38, 104, 0.10)" },
  { match: /water/i, icon: WaterDropOutlinedIcon, color: "#2D2F75", tint: "rgba(45, 47, 117, 0.10)" },
];
const DEFAULT_METRIC = { icon: SpaOutlinedIcon, color: "#16133F", tint: "rgba(22, 19, 63, 0.08)" };
const metricFor = (title = "") => METRICS.find((m) => m.match.test(title)) || DEFAULT_METRIC;

const OUTCOME = {
  green: { color: "#1B7F4B", bg: "#E9F7EF", border: "#BFE6CF", icon: CheckCircleOutlineRoundedIcon },
  red: { color: "#C62828", bg: "#FDECEA", border: "#F5C2BD", icon: WarningAmberRoundedIcon },
  neutral: { color: "#16133F", bg: "#F4F3F8", border: "#E3E1EC", icon: InfoOutlinedIcon },
};

const hasValue = (v) => {
  const t = String(v ?? "").trim().toUpperCase();
  return t !== "" && t !== "N/A" && t !== "NA" && t !== "-";
};

const outcomeFor = (color) => {
  const c = String(color ?? "").toLowerCase().trim();
  const n = Number(color);
  if (c === "green" || (c !== "" && !Number.isNaN(n) && n > 0)) return OUTCOME.green;
  if (c === "red" || (c !== "" && !Number.isNaN(n) && n < 0)) return OUTCOME.red;
  return OUTCOME.neutral;
};

function FigureRow({ label, text }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      {label && (
        <Box component="span" sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8A8FA3" }}>
          {label}
        </Box>
      )}
      <Box component="span" sx={{ fontSize: 14, lineHeight: 1.5, color: "#2B2F42" }}>
        {text}
      </Box>
    </Box>
  );
}

function ImpactCard({ line }) {
  const metric = metricFor(line.title);
  const Icon = metric.icon;
  const hasEnv = hasValue(line.environmental);
  const hasCmp = hasValue(line.comparative);
  const hasSaving = hasValue(line.saving);
  const compareMode = hasCmp || hasSaving;
  const outcome = outcomeFor(line.color);
  const OutcomeIcon = outcome.icon;

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        pl: 2.5,
        borderRadius: "12px",
        background: "#fff",
        border: "1px solid #ECEAF3",
        boxShadow: "0 1px 3px rgba(22, 19, 63, 0.05)",
        overflow: "hidden",
        "&::before": { content: '""', position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: metric.color },
      }}
    >
      {/* heading */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: metric.tint, color: metric.color }}>
          <Icon sx={{ fontSize: 22 }} />
        </Box>
        <Box component="h3" sx={{ m: 0, fontSize: 16, fontWeight: 700, color: "#16133F" }}>
          {line.title}
        </Box>
      </Box>

      {/* figures */}
      {!hasEnv && !compareMode ? (
        <Box sx={{ fontSize: 14, color: "#8A8FA3", fontStyle: "italic" }}>Not applicable for this material</Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {hasEnv && <FigureRow label={compareMode ? "Selected material" : ""} text={line.environmental} />}
          {compareMode && (
            <FigureRow
              label="Compared material"
              text={hasCmp ? line.comparative : <Box component="span" sx={{ color: "#8A8FA3", fontStyle: "italic" }}>Not applicable</Box>}
            />
          )}
        </Box>
      )}

      {/* difference / saving */}
      {hasSaving && (
        <Box
          sx={{
            mt: "auto",
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            p: 1.25,
            borderRadius: "8px",
            background: outcome.bg,
            border: `1px solid ${outcome.border}`,
            color: outcome.color,
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          <OutcomeIcon sx={{ fontSize: 20, mt: "1px", flexShrink: 0 }} />
          <span>{line.saving}</span>
        </Box>
      )}
    </Box>
  );
}

/** Body of the Environmental Impact / Impact & Savings popups (SPOT section). */
export default function ImpactSummary({ lines = [] }) {
  if (!lines.length) {
    return (
      <Box sx={{ py: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, color: "#6B7280" }}>
        <InsightsOutlinedIcon sx={{ fontSize: 40, color: "#CF7729" }} />
        <Box sx={{ fontSize: 16, fontWeight: 600, color: "#16133F" }}>No impact details available</Box>
        <Box sx={{ fontSize: 14 }}>Impact figures appear here once materials and weights are saved.</Box>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, pt: 0.5, pb: 1 }}>
      {lines.map((line, index) => (
        <ImpactCard key={index} line={line} />
      ))}
    </Box>
  );
}
