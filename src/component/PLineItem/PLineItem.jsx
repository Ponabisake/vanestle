import { Button, Skeleton, Tooltip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import { PItemFiles } from "./PItemFiles";
import "./PLineItem.css";

const isEmptyValue = (v) => v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-";

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
      {fields.map((field, i) => {
        const empty = isEmptyValue(field.value);
        return (
          <div className="pli-field" key={i}>
            <span className="pli-field-label">{field.label}</span>
            <span className={`pli-field-value ${empty ? "is-empty" : ""}`}>{empty ? "—" : field.value}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Pill action button. With `iconOnly` it becomes a round icon button and the label
 * moves into a tooltip (for narrow panels).
 */
export function PPillButton({ label, icon = <EditOutlinedIcon sx={{ fontSize: 18 }} />, onClick, iconOnly = false }) {
  const btn = (
    <Button
      className={`pli-btn ${iconOnly ? "is-icon" : ""}`}
      startIcon={icon}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={label}
      disableRipple
    >
      {iconOnly ? null : label}
    </Button>
  );
  return iconOnly ? <Tooltip title={label} arrow>{btn}</Tooltip> : btn;
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
