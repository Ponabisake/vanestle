import { Box } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { MIGRATION_MODULES, migrationSummary } from "../../container/admin/migrationTracker";

const NAVY = "#16133F";
const ORANGE = "#CF7729";
const GREEN = "#15803D";
const MUTED = "#4B5563";

const STATUS_COLOR = { completed: GREEN, inProgress: ORANGE, pending: "#D1D5DB" };

/**
 * Login page panel while the site is in maintenance: the upgrade progress, driven by the migration tracker that ships
 * with the code (counts, percentage and module names only; nothing internal).
 */
export default function PMaintenanceProgress() {
  const s = migrationSummary();
  const stats = [
    { label: "Completed", value: s.completed, color: GREEN, icon: CheckCircleRoundedIcon },
    { label: "In progress", value: s.inProgress, color: ORANGE, icon: AutorenewRoundedIcon },
    { label: "Pending", value: s.pending, color: "#6B7280", icon: ScheduleRoundedIcon },
  ];

  return (
    <Box
      component="section"
      aria-labelledby="maintenance-title"
      sx={{
        width: "100%", maxWidth: 520, boxSizing: "border-box", p: { xs: 2.5, sm: 3.5 },
        borderRadius: "16px", bgcolor: "rgba(255,255,255,0.86)", backdropFilter: "blur(6px)",
        border: "1px solid rgba(22,19,63,0.08)", boxShadow: "0 12px 32px rgba(22,19,63,0.12)", color: NAVY,
      }}
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.4, mb: 1.5, borderRadius: "999px", bgcolor: `${ORANGE}1A`, color: ORANGE, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
        <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} /> Upgrade in progress
      </Box>
      <Box component="h2" id="maintenance-title" sx={{ m: 0, fontSize: { xs: 22, sm: 26 }, lineHeight: 1.25, fontWeight: 700 }}>
        We Are Improving Your Experience!
      </Box>
      <Box component="p" sx={{ m: 0, mt: 1, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
        Our platform is currently undergoing a major upgrade. We are migrating and improving individual modules to deliver a
        faster, more reliable, and better experience. Sign-in is open to administrators only until it is complete.
      </Box>

      {/* overall progress */}
      <Box sx={{ mt: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 0.75 }}>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: MUTED }}>Overall progress</Box>
          <Box sx={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{s.percent}%</Box>
        </Box>
        <Box
          role="progressbar"
          aria-valuenow={s.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall upgrade progress"
          sx={{ height: 10, borderRadius: "999px", bgcolor: "#E5E7EB", overflow: "hidden" }}
        >
          <Box sx={{ width: `${s.percent}%`, height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, ${NAVY}, ${ORANGE})`, transition: "width .6s ease" }} />
        </Box>
        {/* one segment per module: the milestones */}
        <Box aria-hidden sx={{ display: "flex", gap: "3px", mt: 1 }}>
          {MIGRATION_MODULES.map((m) => (
            <Box key={m.key} title={m.label} sx={{ flex: 1, height: 5, borderRadius: "3px", bgcolor: STATUS_COLOR[m.status] || STATUS_COLOR.pending }} />
          ))}
        </Box>
      </Box>

      {/* counts */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25, mt: 2.25 }}>
        {stats.map((stat) => {
          const { label, value, color } = stat;
          const Icon = stat.icon;
          return (
          <Box key={label} sx={{ p: 1.25, borderRadius: "10px", bgcolor: "#fff", border: "1px solid #ECEAF3", textAlign: "center" }}>
            <Icon sx={{ fontSize: 18, color }} />
            <Box sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</Box>
            <Box sx={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>{label}</Box>
          </Box>
          );
        })}
      </Box>

      {/* now / recently */}
      <Box sx={{ display: "grid", gap: 1.5, mt: 2.25, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <Box>
          <Box sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: ORANGE, mb: 0.5 }}>Now improving</Box>
          {s.current.length ? s.current.map((name) => (
            <Box key={name} sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: 13.5, fontWeight: 600, py: 0.25 }}>
              <AutorenewRoundedIcon sx={{ fontSize: 16, color: ORANGE }} /> {name}
            </Box>
          )) : <Box sx={{ fontSize: 13, color: MUTED }}>Preparing the next module</Box>}
        </Box>
        <Box>
          <Box sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: GREEN, mb: 0.5 }}>Recently completed</Box>
          {s.recent.length ? s.recent.map((name) => (
            <Box key={name} sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: 13.5, py: 0.25 }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 16, color: GREEN }} /> {name}
            </Box>
          )) : <Box sx={{ fontSize: 13, color: MUTED }}>Coming soon</Box>}
        </Box>
      </Box>

      <Box sx={{ mt: 2, fontSize: 12, color: "#6B7280" }}>
        {s.completed} of {s.total} modules upgraded. Thank you for your patience.
      </Box>
    </Box>
  );
}
