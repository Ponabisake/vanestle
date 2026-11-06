import { Checkbox, Divider, ListItemText, Menu, MenuItem } from "@mui/material";

/**
 * Checkbox menu for showing / hiding table columns.
 *
 * options: [{ id, label, checked, disabled }]
 * onToggle(id) is called when an option is clicked; onReset (optional) adds a "Reset to default" item.
 */
const PColumnChooser = ({ anchorEl, onClose, options = [], onToggle, onReset }) => (
  <Menu
    anchorEl={anchorEl}
    open={!!anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    transformOrigin={{ vertical: "top", horizontal: "right" }}
    slotProps={{ paper: { sx: { maxHeight: 440, minWidth: 220 } } }}
  >
    {options.map((o) => (
      <MenuItem key={o.id} dense disabled={o.disabled} onClick={() => onToggle(o.id)}>
        <Checkbox size="small" checked={o.checked} sx={{ p: 0.5, mr: 1 }} />
        <ListItemText primary={o.label} />
      </MenuItem>
    ))}
    {onReset && <Divider />}
    {onReset && (
      <MenuItem dense onClick={onReset}>
        <ListItemText primary="Reset to default" slotProps={{ primary: { sx: { color: "#2D2F75", fontWeight: 600 } } }} />
      </MenuItem>
    )}
  </Menu>
);

export default PColumnChooser;
