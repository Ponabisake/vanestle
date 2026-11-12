import { useLayoutEffect, useRef, useState } from "react";
import { Button, Skeleton, Tooltip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import { PItemFiles } from "./PItemFiles";
import "./PLineItem.css";

const isEmptyValue = (v) => v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-";

/**
 * One label / value tile. Long text (e.g. Specifications, Notes) is clamped to a few lines
 * with "Show more"; expanding widens the tile to the full row so the text reads as a paragraph.
 */
function FieldTile({ label, value }) {
  const empty = isEmptyValue(value);
  const isText = !empty && typeof value === "string";
  const textRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // measure the rendered text (not a character count) so only values that really overflow get the toggle
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!isText || !el || expanded) return undefined;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isText, value, expanded]);

  const canToggle = isText && (overflows || expanded);
  return (
    <div className={`pli-field ${expanded ? "is-expanded" : ""}`}>
      <span className="pli-field-label">{label}</span>
      <span
        ref={textRef}
        className={`pli-field-value ${empty ? "is-empty" : ""} ${isText ? "is-text" : ""} ${isText && !expanded ? "is-clamped" : ""} ${overflows && !expanded ? "has-more" : ""}`}
      >
        {empty ? "—" : value}
      </span>
      {canToggle && (
        <button type="button" className="pli-more" aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Show less" : "Show more"}
          <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} className="pli-more-icon" />
        </button>
      )}
    </div>
  );
}

/** Label / value tiles. `loading` shows placeholder tiles. */
export function PFieldGrid({ fields = [], loading = false, placeholders = 8 }) {
  if (loading) {
    return (
      <div className="pli-fields">
        {Array.from({ length: placeholders }, (_, i) => (
          <div className="pli-field" key={i}>
            <Skeleton variant="text" width="45%" height={16} />
            <Skeleton variant="text" width="75%" height={22} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="pli-fields">
      {fields.map((field, i) => (
        <FieldTile key={i} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

/**
 * Pill action button. With `iconOnly` it becomes a round icon button and the label
 * moves into a tooltip (for narrow panels).
 */
export function PPillButton({ label, icon = <EditOutlinedIcon sx={{ fontSize: 18 }} />, onClick, iconOnly = false, disabled = false }) {
  const btn = (
    <Button
      className={`pli-btn ${iconOnly ? "is-icon" : ""}`}
      startIcon={icon}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={label}
      disabled={disabled}
      disableRipple
    >
      {iconOnly ? null : label}
    </Button>
  );
  // a disabled button fires no events, so the tooltip needs a wrapper to listen on
  return iconOnly ? <Tooltip title={label} arrow><span>{btn}</span></Tooltip> : btn;
}

/**
 * Collapsible line-item row: "Item 1 : Item Name" badge, action buttons and a chevron;
 * the body shows the item's fields as tiles and, when `files` is given (GetDetails quoteFiles),
 * the item's attachments. `enqDetailsId` is the item id the files are downloaded with.
 */
export function PLineItem({ title, name, fields = [], isOpen, onToggle, actions = null, files = null, enqDetailsId = null }) {
  const badge = name ? `${title} : ${name}` : title;
  const toggle = () => onToggle?.();
  return (
    <div className={`pli-item ${isOpen ? "is-open" : ""}`}>
      <div
        className="pli-head"
        role="button"
        tabIndex={0}
        aria-expanded={!!isOpen}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span className="pli-badge" title={badge}>{badge}</span>
        <span className="pli-spacer" />
        {files?.length > 0 && (
          <Tooltip title={`${files.length} attachment${files.length > 1 ? "s" : ""}`} arrow>
            <span className="pli-file-count" aria-label={`${files.length} attachments`}>
              <AttachFileRoundedIcon sx={{ fontSize: 16 }} />{files.length}
            </span>
          </Tooltip>
        )}
        {actions && <span className="pli-actions">{actions}</span>}
        <ExpandMoreRoundedIcon className="pli-chevron" />
      </div>
      {isOpen && (
        <div className="pli-body">
          <PFieldGrid fields={fields} />
          {files && <PItemFiles enqDetailsId={enqDetailsId} files={files} />}
        </div>
      )}
    </div>
  );
}
