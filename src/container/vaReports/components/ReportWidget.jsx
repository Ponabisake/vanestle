import { useId, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, IconButton, ListItemIcon, Menu, MenuItem, Skeleton, Table, TableBody,
  TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Tooltip,
} from "@mui/material";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseIcon from "@mui/icons-material/Close";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { exportCsv, exportExcel, exportPng } from "../utils/exporters";
import { toast } from "../../../utils/commonFunction/common";
import { Labels } from "../../../utils/constants/labels";

/** Plain table used for every widget's table view (and its CSV/Excel export). */
export function WidgetTable({ columns, rows, onRowClick, selectedKey, maxHeight }) {
  return (
    <div className="va-wtable" style={{ maxHeight }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.field} align={c.align || "left"}>{c.header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow
              key={r.key ?? i}
              hover={!!onRowClick}
              selected={selectedKey != null && String(selectedKey) === String(r.key)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(r)) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? "va-clickable" : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.field} align={c.align || "left"}>
                  {c.render ? c.render(r) : r[c.field]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Card shell shared by every report widget: title, Chart/Table toggle, export (PNG / Excel / CSV),
 * full screen, and the loading / error / empty states.
 */
export default function ReportWidget({
  title, subtitle, span = 1, state, isEmpty, emptyText = "No data for the current filters.", onReset,
  renderChart, table, exportName, controls, chartHeight = 280, pngAvailable = true, hint,
}) {
  const [view, setView] = useState("chart");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const bodyRef = useRef(null);
  const fullRef = useRef(null);
  const titleId = useId();
  const ready = state.status === "ready";

  const doExport = async (kind) => {
    setMenuAnchor(null);
    const name = exportName || title;
    try {
      if (kind === "png") await exportPng((fullscreen ? fullRef : bodyRef).current, name);
      if (kind === "xlsx") exportExcel(table.rows, table.exportColumns || table.columns, name);
      if (kind === "csv") exportCsv(table.rows, table.exportColumns || table.columns, name);
    } catch (e) {
      toast(Labels.status.failure, e.message);
    }
  };

  const renderBody = (height, isFull) => {
    if (state.status === "loading") {
      return (
        <div className="va-skeleton" aria-busy="true" aria-label={`Loading ${title}`}>
          <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />
        </div>
      );
    }
    if (state.status === "error") {
      return (
        <div className="va-state va-state-error" style={{ minHeight: height }} role="alert">
          <ErrorOutlineIcon />
          <p>Couldn’t load this report.</p>
          <small>{state.error}</small>
          <button type="button" className="va-linkbtn" onClick={state.retry}>Try again</button>
        </div>
      );
    }
    if (isEmpty) {
      return (
        <div className="va-state" style={{ minHeight: height }}>
          <SearchOffIcon />
          <p>{emptyText}</p>
          {onReset && <button type="button" className="va-linkbtn" onClick={onReset}>Reset filters</button>}
        </div>
      );
    }
    return view === "chart" ? (
      <div className="va-chart" style={{ minHeight: height }}>{renderChart(height, { fullscreen: isFull })}</div>
    ) : (
      <WidgetTable {...table} maxHeight={isFull ? "70vh" : height + 40} />
    );
  };

  const toolbar = (
    <div className="va-widget-actions">
      <ToggleButtonGroup
        size="small"
        exclusive
        value={view}
        onChange={(e, v) => v && setView(v)}
        aria-label={`${title} view`}
        className="va-viewtoggle"
      >
        <ToggleButton value="chart" aria-label="Chart view"><Tooltip title="Chart view"><InsertChartOutlinedIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="table" aria-label="Table view"><Tooltip title="Table view"><TableRowsOutlinedIcon fontSize="small" /></Tooltip></ToggleButton>
      </ToggleButtonGroup>
      <Tooltip title="Export">
        <span>
          <IconButton size="small" aria-label={`Export ${title}`} onClick={(e) => setMenuAnchor(e.currentTarget)} disabled={!ready}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {!fullscreen && (
        <Tooltip title="Full screen">
          <IconButton size="small" aria-label={`Open ${title} full screen`} onClick={() => setFullscreen(true)}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );

  return (
    <section className={`va-widget span-${span}`} aria-labelledby={titleId}>
      <header className="va-widget-head">
        <div className="va-widget-titles">
          <h3 id={titleId}>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {toolbar}
      </header>
      {controls && <div className="va-widget-controls">{controls}</div>}
      <div ref={bodyRef} className="va-widget-body">{renderBody(chartHeight, false)}</div>
      {hint && ready && !isEmpty && <p className="va-hint">{hint}</p>}

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => doExport("png")} disabled={!pngAvailable || view !== "chart" || isEmpty}>
          <ListItemIcon><ImageOutlinedIcon fontSize="small" /></ListItemIcon>
          PNG image{(!pngAvailable || view !== "chart") && " (chart view only)"}
        </MenuItem>
        <MenuItem onClick={() => doExport("xlsx")}>
          <ListItemIcon><GridOnOutlinedIcon fontSize="small" /></ListItemIcon>Excel (.xlsx)
        </MenuItem>
        <MenuItem onClick={() => doExport("csv")}>
          <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>CSV
        </MenuItem>
      </Menu>

      <Dialog open={fullscreen} onClose={() => setFullscreen(false)} maxWidth="xl" fullWidth aria-labelledby={`${titleId}-full`}>
        <DialogTitle id={`${titleId}-full`} className="va-full-title">
          <span>{title}</span>
          <span className="va-full-actions">
            {toolbar}
            <IconButton aria-label="Close full screen" onClick={() => setFullscreen(false)}><CloseIcon /></IconButton>
          </span>
        </DialogTitle>
        <DialogContent>
          {controls && <div className="va-widget-controls">{controls}</div>}
          <div ref={fullRef}>{renderBody(Math.max(420, Math.round(window.innerHeight * 0.62)), true)}</div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
