import { useMemo, useState } from "react";
import { Chip, Collapse, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import TuneIcon from "@mui/icons-material/Tune";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PDropdown from "../../../component/PDropdown/PDropdown";
import PDatepicker from "../../../component/PDatepicker/PDatepicker";
import PButton from "../../../component/PButton/PButton";
import { Labels } from "../../../utils/constants/labels";
import { toast } from "../../../utils/commonFunction/common";
import { AGE_BUCKETS, MODULES, STAGES, STAGE_BY_KEY } from "../constants";
import { parseDmy, toDmy } from "../utils/dateUtils";

const all = (label) => ({ value: "", label });

// Remember whether the viewer left the filter panel open (a per-browser convenience only).
const OPEN_KEY = "vaReports.filtersOpen";
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) !== "0";
  } catch {
    return true;
  }
};

/** Sticky global filter bar + removable chips for every active filter (including chart cross-filters). */
export default function FilterBar({ filters, update, reset, master, facts, suppliers, activeCount }) {
  const [open, setOpen] = useState(readOpen);
  const toggleOpen = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? "0" : "1");
      } catch {
        /* storage unavailable – state still works for this visit */
      }
      return !o;
    });

  const options = useMemo(() => {
    const countryOpts = (master?.country || []).map((c) => ({ value: String(c.value), label: c.label }));
    // cascade: clients / projects narrow to the chosen country / client
    const inCountry = filters.country ? facts.filter((f) => String(f.countryId) === filters.country) : facts;
    const clientIds = new Set(inCountry.map((f) => String(f.clientId)));
    const clientOpts = (master?.client || [])
      .filter((c) => !filters.country || clientIds.has(String(c.value)))
      .map((c) => ({ value: String(c.value), label: c.label }));
    const inClient = filters.client ? inCountry.filter((f) => String(f.clientId) === filters.client) : inCountry;
    const projects = new Map();
    inClient.forEach((f) => projects.set(f.projectNo, `${f.projectDesc} (${f.projectNo})`));
    const projectOpts = [...projects.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
    const userOpts = (master?.user || []).map((u) => ({ value: u.label, label: u.label }));
    return {
      module: [all("All modules"), ...MODULES],
      client: [all("All clients"), ...clientOpts],
      country: [all("All countries"), ...countryOpts],
      project: [all("All projects"), ...projectOpts],
      stage: [all("All statuses"), ...STAGES.map((s) => ({ value: s.key, label: s.label }))],
      createdBy: [all("All users"), ...userOpts],
      ebid: [all("All"), { value: "yes", label: "Yes – e-bidding only" }, { value: "no", label: "No – exclude e-bidding" }],
    };
  }, [master, facts, filters.country, filters.client]);

  const labelOf = (key, value) => options[key]?.find((o) => String(o.value) === String(value))?.label ?? value;

  const chips = [
    !filters.isDefaultRange && {
      key: "range",
      label: `Created: ${toDmy(filters.from)} – ${toDmy(filters.to)}`,
      clear: { from: "", to: "" },
    },
    filters.module && { key: "module", label: `Module: ${filters.module}` },
    filters.country && { key: "country", label: `Country: ${labelOf("country", filters.country)}`, clear: { country: "", client: "", project: "" } },
    filters.client && { key: "client", label: `Client: ${labelOf("client", filters.client)}`, clear: { client: "", project: "" } },
    filters.project && { key: "project", label: `Project: ${labelOf("project", filters.project)}` },
    filters.stage && { key: "stage", label: `Status: ${STAGE_BY_KEY[filters.stage]?.label ?? filters.stage}` },
    filters.createdBy && { key: "createdBy", label: `Created by: ${filters.createdBy}` },
    filters.ebid && { key: "ebid", label: `E-bidding: ${filters.ebid === "yes" ? "Yes" : "No"}` },
    filters.supplier && {
      key: "supplier",
      label: `Supplier: ${(suppliers || []).find((s) => String(s.id) === filters.supplier)?.supplierName ?? filters.supplier}`,
    },
    filters.age && { key: "age", label: `Days open: ${AGE_BUCKETS.find((b) => b.key === filters.age)?.label ?? filters.age}` },
  ].filter(Boolean);

  const onDate = (key) => (e) => {
    const d = parseDmy(e.target.value);
    if (d && e.target.value.length === 10) update({ [key]: d });
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast(Labels.status.success, "Link to this view copied");
    } catch {
      toast(Labels.status.failure, "Could not copy the link – copy it from the address bar");
    }
  };

  const dropdown = (key, label, extra = {}) => (
    <div className="va-filter">
      <PDropdown
        name={key}
        label={label}
        value={filters[key]}
        options={options[key]}
        flag={Labels.flag.auto}
        onChange={(e) => update({ [key]: e.target.value ?? "", ...extra })}
      />
    </div>
  );

  return (
    <div className={`va-filterbar ${open ? "is-open" : "is-closed"}`} role="search" aria-label="Report filters">
      <div className="va-filterhead">
        <button
          type="button"
          className="va-filtertoggle"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-controls="va-filter-panel"
        >
          <TuneIcon fontSize="small" />
          <span>Filters</span>
          {chips.length > 0 && <span className="va-filtercount">{chips.length}</span>}
          <ExpandMoreIcon fontSize="small" className="va-filterchevron" />
        </button>
        <span className="va-filterhint">{open ? "Hide filters" : "Show filters"}</span>
      </div>

      <Collapse in={open} timeout={220} id="va-filter-panel">
      <div className="va-filters">
        <div className="va-filter va-filter-date">
          <PDatepicker name="from" label="Created from" value={toDmy(filters.from)} onChange={onDate("from")} maxDate={toDmy(filters.to)} />
        </div>
        <div className="va-filter va-filter-date">
          <PDatepicker name="to" label="Created to" value={toDmy(filters.to)} onChange={onDate("to")} minDate={toDmy(filters.from)} />
        </div>
        {dropdown("module", "Module")}
        {dropdown("client", "Client", { project: "" })}
        {dropdown("country", "Country", { client: "", project: "" })}
        {dropdown("project", "Project")}
        {dropdown("stage", "Status")}
        {dropdown("createdBy", "Created by")}
        {dropdown("ebid", "E-bidding")}
        <div className="va-filter va-filter-reset">
          <PButton label="Reset" variant="outlined" onClick={reset} width="100%" height={50} disabled={!activeCount} />
        </div>
      </div>
      </Collapse>

      <div className="va-chips" aria-live="polite">
        {chips.length ? (
          chips.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              size="small"
              onDelete={() => update(c.clear || { [c.key]: "" })}
              className="va-chip"
            />
          ))
        ) : (
          <span className="va-chips-empty">Showing all enquiries created in the last 12 months. Click any chart to filter.</span>
        )}
        <Tooltip title="Copy a link to this exact view">
          <button type="button" className="va-linkbtn va-share" onClick={share}>
            <LinkIcon fontSize="small" /> Share view
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
