import { Skeleton, Tooltip } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { computeKpis } from "../utils/aggregations";
import { fmtDays, fmtInt, fmtPct } from "../utils/format";
import { BRAND } from "../constants";

// better: "up" = higher is good, "down" = lower is good, "neutral" = no judgement
const KPIS = [
  { key: "total", label: "Total enquiries", format: fmtInt, better: "up", needs: [], hint: "Enquiries created in the selected period (all modules)." },
  { key: "activeRfqs", label: "Active RFQs", format: fmtInt, better: "neutral", needs: [], hint: "RFQ sent, quotes received or revised quote requested (status 1, 2, 4)." },
  { key: "pendingApproval", label: "Pending approval", format: fmtInt, better: "down", needs: [], hint: "Quote sent to customer or customer chased for order (status 3, 5)." },
  { key: "awarded", label: "Awarded", format: fmtInt, better: "up", needs: [], hint: "Authorised and in order / artwork / proof / production / invoicing (status 6–23)." },
  { key: "completed", label: "Completed", format: fmtInt, better: "up", needs: [], hint: "Status 24 – Completed." },
  { key: "avgTurnaround", label: "Avg. quote turnaround", format: fmtDays, better: "down", needs: ["quotes", "history"], delta: "abs", hint: "Days from RFQ sent to the first supplier quote." },
  { key: "ebidding", label: "E-bidding events", format: fmtInt, better: "neutral", needs: [], hint: "Enquiries run through the E-Bidding module." },
  { key: "awardRate", label: "Award rate", format: (v) => fmtPct(v), better: "up", needs: ["history"], delta: "pp", hint: "Enquiries that reached award (status 6+) ÷ enquiries that reached RFQ." },
];

function Delta({ cur, prev, kpi, hasPrevious }) {
  if (!hasPrevious || cur == null || prev == null) return <span className="va-kpi-delta muted">No previous period data</span>;
  let diff;
  let text;
  if (kpi.delta === "pp") {
    diff = cur - prev;
    text = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} pts`;
  } else if (kpi.delta === "abs") {
    diff = cur - prev;
    text = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} d`;
  } else {
    if (prev === 0) return <span className="va-kpi-delta muted">New vs. 0 previous</span>;
    diff = ((cur - prev) / prev) * 100;
    text = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  }
  const flat = Math.abs(diff) < 0.05;
  const good = kpi.better === "neutral" || flat ? null : (diff > 0) === (kpi.better === "up");
  const Icon = flat ? RemoveIcon : diff > 0 ? ArrowUpwardIcon : ArrowDownwardIcon;
  const color = good == null ? BRAND.textSecondary : good ? BRAND.good : "#B3261E";
  return (
    <span className="va-kpi-delta" style={{ color }}>
      <Icon sx={{ fontSize: 15 }} aria-hidden="true" />
      {text}
      <span className="muted"> vs prev. period</span>
    </span>
  );
}

export default function KpiStrip({ current, previous, statusOf, hasPrevious }) {
  const cur = computeKpis(current);
  const prev = computeKpis(previous);
  return (
    <div className="va-kpis" role="list" aria-label="Key figures">
      {KPIS.map((k, i) => {
        const st = statusOf(k.needs);
        return (
          <div key={k.key} className={`va-kpi ${i === 0 ? "va-kpi-hero" : ""}`} role="listitem">
            <div className="va-kpi-label">
              {k.label}
              <Tooltip title={k.hint} arrow>
                <InfoOutlinedIcon sx={{ fontSize: 15 }} aria-label={k.hint} tabIndex={0} />
              </Tooltip>
            </div>
            {st.status === "loading" ? (
              <>
                <Skeleton variant="text" width="60%" height={44} />
                <Skeleton variant="text" width="80%" />
              </>
            ) : st.status === "error" ? (
              <>
                <div className="va-kpi-value">–</div>
                <button type="button" className="va-linkbtn" onClick={st.retry}>Couldn’t load · retry</button>
              </>
            ) : (
              <>
                <div className="va-kpi-value">{k.format(cur[k.key])}</div>
                <Delta cur={cur[k.key]} prev={prev[k.key]} kpi={k} hasPrevious={hasPrevious} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
