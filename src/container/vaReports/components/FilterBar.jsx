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
import { applyFilters } from "../utils/aggregations";

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
export default function FilterBar({ filters, update, reset, master, categories, facts, suppliers, activeCount }) {
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
    const sorted = (m) => [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]))).map(([value, label]) => ({ value, label }));
    // countries: the ones with enquiries, plus the master list's names when available
    const countries = new Map((master?.country || []).filter((c) => facts.some((f) => String(f.countryId) === String(c.value))).map((c) => [String(c.value), c.label]));
    facts.forEach((f) => !countries.has(String(f.countryId)) && countries.set(String(f.countryId), f.countryName));
    // cascade: clients / projects narrow to the chosen country / client
    const inCountry = filters.country ? facts.filter((f) => String(f.countryId) === filters.country) : facts;
    const clients = new Map();
    inCountry.forEach((f) => f.clientId != null && clients.set(String(f.clientId), f.clientName));
    const inClient = filters.client ? inCountry.filter((f) => String(f.clientId) === filters.client) : inCountry;
    const contacts = new Map();
    inClient.forEach((f) => f.clientContactId && contacts.set(String(f.clientContactId), f.clientContactName));
    // organisation: entities of the chosen country, business units of the chosen entity, every global BU
    const entities = new Map();
    inCountry.forEach((f) => entities.set(f.entity, f.entity));
    const inEntity = filters.entity ? inCountry.filter((f) => f.entity === filters.entity) : inCountry;
    const units = new Map();
    inEntity.forEach((f) => units.set(f.buKey, f.buLabel));
    const globalBus = new Map();
    facts.forEach((f) => globalBus.set(f.globalBu, f.globalBu));
    // categories: the distinct Printornonprint values of the enquiries the other filters leave, in chart order
    const present = new Set(applyFilters(facts, filters, { ignore: ["category"] }).map((f) => f.category));
    if (filters.category) present.add(filters.category);
    const categoryOpts = (categories || []).filter((c) => present.has(c.key)).map((c) => ({ value: c.key, label: c.label }));
    const projects = new Map();
    inClient.forEach((f) => f.projectNo && projects.set(f.projectNo, `${f.projectDesc} (${f.projectNo})`));
    const users = new Map();
    facts.forEach((f) => users.set(f.createdBy, f.createdBy));
    return {
      module: [all("All modules"), ...MODULES],
      client: [all("All clients"), ...sorted(clients)],
      country: [all("All countries"), ...sorted(countries)],
      project: [all("All projects"), ...sorted(projects)],
      clientContact: [all("All client contacts"), ...sorted(contacts)],
      category: [all("All categories"), ...categoryOpts],
      entity: [all("All entities"), ...sorted(entities)],
      bu: [all("All business units"), ...sorted(units)],
      gbu: [all("All global BUs"), ...sorted(globalBus)],
      stage: [all("All statuses"), ...STAGES.map((s) => ({ value: s.key, label: s.label }))],
      createdBy: [all("All users"), ...sorted(users)],
      ebid: [all("All"), { value: "yes", label: "Yes – e-bidding only" }, { value: "no", label: "No – exclude e-bidding" }],
    };
  }, [master, categories, facts, filters]);

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
    filters.category && { key: "category", label: `Category: ${filters.category}` },
    filters.clientContact && { key: "clientContact", label: `Client contact: ${labelOf("clientContact", filters.clientContact)}` },
    filters.entity && { key: "entity", label: `Entity: ${filters.entity}`, clear: { entity: "", bu: "" } },
    filters.bu && { key: "bu", label: `Business unit: ${labelOf("bu", filters.bu)}` },
    filters.gbu && { key: "gbu", label: `Global BU: ${filters.gbu}` },
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
        {dropdown("client", "Client", { project: "", clientContact: "" })}
        {dropdown("clientContact", "Client contact")}
        {dropdown("country", "Country", { client: "", project: "", clientContact: "", entity: "", bu: "" })}
        {dropdown("project", "Project")}
        {dropdown("category", "Category")}
        {dropdown("entity", "Entity", { bu: "" })}
        {dropdown("bu", "Business unit")}
        {dropdown("gbu", "Global BU")}
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
