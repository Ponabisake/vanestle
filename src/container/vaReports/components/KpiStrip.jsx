import { Skeleton, Tooltip } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { computeKpis } from "../utils/aggregations";
import { fmtInt } from "../utils/format";
import { BRAND } from "../constants";

// better: "up" = higher is good, "down" = lower is good, "neutral" = no judgement
const KPIS = [
  { key: "total", label: "Total enquiries", better: "up", needs: [], hint: "Enquiries created in the selected period (all modules, drafts included)." },
  { key: "projects", label: "Total projects", better: "up", needs: [], hint: "Distinct project numbers among those enquiries (enquiries without a project number are not counted)." },
  { key: "draft", label: "Draft", better: "neutral", needs: [], hint: "Not sent out yet: Enquiry / Catalog status 0, E-Bidding status -2." },
  { key: "inProgress", label: "In progress", better: "neutral", needs: [], hint: "RFQ / bidding, awarded & ordered, or in production (artwork, proof, printing, delivery, invoicing)." },
  { key: "pending", label: "Pending approval", better: "down", needs: [], hint: "Waiting for the customer: quote sent to customer or customer chased for order (status 3, 5)." },
  { key: "completed", label: "Completed", better: "up", needs: [], hint: "Status 24 – Completed. Draft + In progress + Pending + Completed + Cancelled = Total." },
  { key: "overdue", label: "Overdue projects", better: "down", needs: [], hint: "Open, sent-out enquiries whose expected delivery date has passed." },
  { key: "completedInPeriod", label: "Completed in period", better: "up", needs: [], hint: "Enquiries that reached Completed inside the selected period, whatever their creation date (within the loaded window)." },
  { key: "activeClients", label: "Active clients", better: "up", needs: [], hint: "Clients with at least one enquiry in the period." },
  { key: "activeSuppliers", label: "Active suppliers", better: "up", needs: ["quotes"], hint: "Distinct suppliers invited to quote or bid on those enquiries." },
  { key: "ebidding", label: "E-bidding enquiries", better: "neutral", needs: [], hint: "Enquiries run through the E-Bidding module." },
  { key: "participations", label: "Supplier participation", better: "up", needs: ["quotes"], hint: "Enquiry × supplier pairs where the supplier submitted at least one quote or bid." },
];

function Delta({ cur, prev, kpi, hasPrevious }) {
  if (!hasPrevious || cur == null || prev == null) return <span className="va-kpi-delta muted">No previous period data</span>;
  if (prev === 0) return <span className="va-kpi-delta muted">{cur === 0 ? "No change vs 0" : "New vs. 0 previous"}</span>;
  const diff = ((cur - prev) / prev) * 100;
  const text = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  const flat = Math.abs(diff) < 0.05;
  const good = kpi.better === "neutral" || flat ? null : (diff > 0) === (kpi.better === "up");
  const Icon = flat ? RemoveIcon : diff > 0 ? ArrowUpwardIcon : ArrowDownwardIcon;
  const color = good == null ? BRAND.textSecondary : good ? BRAND.good : "#B3261E";
  return (
    <span className="va-kpi-delta" style={{ color }}>
      <Icon sx={{ fontSize: 15 }} aria-hidden="true" />
      {text}
      <span className="muted"> vs prev. ({fmtInt(prev)})</span>
    </span>
  );
}

export default function KpiStrip({ current, previous, completedNow, completedBefore, statusOf, hasPrevious }) {
  const cur = computeKpis(current, { completedInPeriod: completedNow });
  const prev = computeKpis(previous, { completedInPeriod: completedBefore });
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
                <div className="va-kpi-value">{fmtInt(cur[k.key])}</div>
                <Delta cur={cur[k.key]} prev={prev[k.key]} kpi={k} hasPrevious={hasPrevious} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
