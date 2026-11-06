import { useMemo, useState } from "react";
import {
  IconButton, Skeleton, Table, TableBody, TableCell, TableHead,
  TablePagination, TableRow, TableSortLabel, Tooltip,
} from "@mui/material";
import PColumnChooser from "../../../component/PColumnChooser/PColumnChooser";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import PSearch from "../../../component/PSearch/PSearch";
import PButton from "../../../component/PButton/PButton";
import { STAGE_BY_KEY } from "../constants";
import { exportExcel } from "../utils/exporters";
import { toDmy } from "../utils/dateUtils";
import { fmtDays, fmtEurFull, fmtPct } from "../utils/format";

const COLUMNS = [
  { field: "enquiryId", header: "Enquiry ID", default: true },
  { field: "module", header: "Module", default: true },
  { field: "projectNo", header: "Project no." },
  { field: "projectDesc", header: "Project name", default: true },
  { field: "clientName", header: "Client", default: true },
  { field: "countryName", header: "Country", default: true },
  { field: "statusName", header: "Status", default: true, wrap: true },
  { field: "stage", header: "Stage", render: (f) => STAGE_BY_KEY[f.stage]?.label, sortValue: (f) => STAGE_BY_KEY[f.stage]?.label },
  { field: "createdBy", header: "Created by", default: true },
  { field: "created", header: "Created", default: true, render: (f) => toDmy(f.created), sortValue: (f) => f.created?.getTime() ?? 0 },
  { field: "daysOpen", header: "Days open", align: "right", default: true },
  { field: "suppliersInvited", header: "Suppliers invited", align: "right", render: (f) => f.suppliers.size, sortValue: (f) => f.suppliers.size },
  { field: "turnaroundDays", header: "Quote turnaround", align: "right", render: (f) => fmtDays(f.turnaroundDays) },
  { field: "awardedValue", header: "Awarded value (EUR)", align: "right", default: true, render: (f) => (f.awardedValue ? fmtEurFull(f.awardedValue) : "–") },
  { field: "savingsPct", header: "Savings %", align: "right", render: (f) => fmtPct(f.savingsPct) },
];

const exportValue = (c, f) => {
  if (c.field === "created") return toDmy(f.created);
  if (c.field === "stage") return STAGE_BY_KEY[f.stage]?.label;
  if (c.field === "suppliersInvited") return f.suppliers.size;
  if (c.field === "awardedValue") return f.awardedValue ? Math.round(f.awardedValue) : "";
  if (c.field === "savingsPct" || c.field === "turnaroundDays") return f[c.field] == null ? "" : Number(f[c.field].toFixed(1));
  return f[c.field] ?? "";
};

/** All VA records for the active filters: search, sort, column chooser, pagination, Excel export. */
export default function DetailGrid({ rows, state, onReset }) {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(() => COLUMNS.filter((c) => c.default).map((c) => c.field));
  const [sort, setSort] = useState({ field: "created", dir: "desc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [anchor, setAnchor] = useState(null);

  const columns = COLUMNS.filter((c) => visible.includes(c.field));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((f) =>
          [f.enquiryId, f.projectNo, f.projectDesc, f.clientName, f.statusName, f.createdBy, f.countryName]
            .some((v) => v?.toLowerCase().includes(q)))
      : rows;
    const col = COLUMNS.find((c) => c.field === sort.field);
    const val = (f) => (col?.sortValue ? col.sortValue(f) : f[sort.field]);
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const cmp = x == null ? -1 : y == null ? 1 : typeof x === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, sort]);

  // back to page 1 whenever the result set changes (the dashboard table doesn't do this)
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setPage(0);
  }

  const onSearch = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };
  const onSort = (field) => {
    setSort((s) => ({ field, dir: s.field === field && s.dir === "desc" ? "asc" : "desc" }));
    setPage(0);
  };
  const toggleCol = (field) =>
    setVisible((v) => (v.includes(field) ? (v.length > 1 ? v.filter((x) => x !== field) : v) : COLUMNS.map((c) => c.field).filter((f) => f === field || v.includes(f))));

  const doExport = () =>
    exportExcel(filtered, columns.map((c) => ({ ...c, exportValue: (f) => exportValue(c, f) })), "VA_records");

  return (
    <section className="va-widget va-grid-card" aria-labelledby="va-grid-title">
      <header className="va-widget-head">
        <div className="va-widget-titles">
          <h3 id="va-grid-title">All VA records</h3>
          <p>{state.status === "ready" ? `${filtered.length.toLocaleString("en-GB")} enquiries match the current filters` : "Loading records…"}</p>
        </div>
        <div className="va-grid-tools">
          <PSearch
            width={320}
            placeholder="Search by Enquiry ID, project, client, status"
            value={search}
            onChange={onSearch}
          />
          <Tooltip title="Choose columns">
            <IconButton aria-label="Choose columns" onClick={(e) => setAnchor(e.currentTarget)} className="va-iconbtn">
              <ViewColumnOutlinedIcon />
            </IconButton>
          </Tooltip>
          <PButton label="Export Excel" variant="contained" onClick={doExport} height={44} disabled={state.status !== "ready" || !filtered.length} />
        </div>
      </header>

      <PColumnChooser
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        options={COLUMNS.map((c) => ({
          id: c.field,
          label: c.header,
          checked: visible.includes(c.field),
          disabled: visible.length <= 1 && visible.includes(c.field),
        }))}
        onToggle={toggleCol}
        onReset={() => setVisible(COLUMNS.filter((c) => c.default).map((c) => c.field))}
      />

      {state.status === "loading" ? (
        <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 2 }} />
      ) : state.status === "error" ? (
        <div className="va-state va-state-error" role="alert" style={{ minHeight: 220 }}>
          <ErrorOutlineIcon />
          <p>Couldn’t load the records.</p>
          <small>{state.error}</small>
          <button type="button" className="va-linkbtn" onClick={state.retry}>Try again</button>
        </div>
      ) : !filtered.length ? (
        <div className="va-state" style={{ minHeight: 220 }}>
          <SearchOffIcon />
          <p>No enquiries match{search ? ` “${search}”` : " the current filters"}.</p>
          <button type="button" className="va-linkbtn" onClick={() => (search ? onSearch({ target: { value: "" } }) : onReset())}>
            {search ? "Clear search" : "Reset filters"}
          </button>
        </div>
      ) : (
        <>
          <div className="va-grid-scroll">
            <Table size="small" className="va-grid">
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c.field} align={c.align || "left"} sortDirection={sort.field === c.field ? sort.dir : false}>
                      <TableSortLabel active={sort.field === c.field} direction={sort.field === c.field ? sort.dir : "desc"} onClick={() => onSort(c.field)}>
                        {c.header}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(page * perPage, page * perPage + perPage).map((f) => (
                  <TableRow key={f.id} hover>
                    {columns.map((c) => (
                      <TableCell key={c.field} align={c.align || "left"} className={c.wrap ? "va-wrap" : undefined}>
                        {c.render ? c.render(f) : f[c.field]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            rowsPerPage={perPage}
            onRowsPerPageChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </section>
  );
}
