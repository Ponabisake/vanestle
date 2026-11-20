import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PTable from "../../component/PTable/PTable";
import PSearch from "../../component/PSearch/PSearch";
import PButton from "../../component/PButton/PButton";
import PDialog from "../../component/PDialog/PDialog";
import PTextField from "../../component/PTextField/PTextField";
import PDropdown from "../../component/PDropdown/PDropdown";
import PGrid from "../../component/PGrid/PGrid";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MENU_KEY = "dropdownLists";
const MAX_LENGTH = 100; // DropdownListAdmin.MaxLabelLength on the API
const MAX_ORDER = 9999; // DropdownListAdmin.MaxSortOrder
const REQUIRED = Labels.symbols?.required || "*";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];

const Pill = ({ children, color, title }) => (
  <Box component="span" title={title} sx={{
    display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12,
    fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap", mr: 0.5
  }}>{children}</Box>
);

const Note = ({ children, tone = "info" }) => (
  <Box sx={{
    fontSize: 13, borderRadius: "10px", px: 2, py: 1.25, mb: 2,
    color: tone === "warn" ? "#92400e" : "#374151",
    bgcolor: tone === "warn" ? "#fffbeb" : "#f3f4f6",
    border: `1px solid ${tone === "warn" ? "#fcd34d" : "#e5e7eb"}`,
  }}>{children}</Box>
);

/** Why the label of this value cannot change, or "" when it can. */
const renameLock = (row) => {
  if (!row?.id) return "";
  if (row.isSystem) return "The application reads this label (e.g. to pick the items or rules of the job), so it cannot be renamed.";
  if (row.inUse > 0) return `Stored on ${row.usedBy}: renaming would leave them on a value that is no longer in the list. Deactivate it and add the new value instead.`;
  return "";
};

/**
 * Admin → Settings → Drop-down Lists (new): the enquiry form lists that were hardcoded in the API — Year, Type of Job,
 * Project Attribute, Savings Type (tblDropdownValue). Add, rename while unused, reorder, activate / deactivate; no
 * delete (enquiries store the label as text). Deactivated values stay on the enquiries that have them.
 */
export default function AdminDropdownLists() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ lists: [], ready: true });
  const [listKey, setListKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(null); // null = dialog closed
  const [original, setOriginal] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.DropdownLists, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) {
        setData(res.data);
        setListKey((key) => key || res.data.lists?.[0]?.key || "");
      } else {
        toast(Labels.status.failure, res?.data || res?.message || "Drop-down lists could not be loaded");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const list = useMemo(() => (data.lists || []).find((l) => l.key === listKey) || null, [data.lists, listKey]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (list?.rows || []).filter((r) =>
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (!term || r.label.toLowerCase().includes(term)));
  }, [list, search, statusFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const canEdit = data.ready;
  const nextOrder = () => Math.min(MAX_ORDER, Math.max(0, ...(list?.rows || []).map((r) => r.sortOrder)) + 1);

  const openForm = (row) => {
    setErrors({});
    setOriginal(row);
    setForm(row
      ? { id: row.id, label: row.label, sortOrder: String(row.sortOrder), status: row.status ? "active" : "inactive" }
      : { id: 0, label: "", sortOrder: String(nextOrder()), status: "active" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    const label = form.label.trim();
    if (!label) next.label = Labels.commonLabel?.required || "Required";
    else if (label.length > MAX_LENGTH) next.label = `${MAX_LENGTH} characters or fewer`;
    else if (label.includes(",")) next.label = "No commas";
    else if ((list?.rows || []).some((r) => r.id !== form.id && r.label.toLowerCase() === label.toLowerCase())) next.label = "Already in this list";
    const order = form.sortOrder.trim();
    if (!/^\d{1,4}$/.test(order)) next.sortOrder = `A number from 0 to ${MAX_ORDER}`;
    if (!form.status) next.status = Labels.commonLabel?.required || "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveDropdownValue, {
      username: user?.userName,
      listKey,
      id: form.id,
      label: form.label,
      sortOrder: Number(form.sortOrder),
      status: form.status === "active",
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.label} updated` : `${res.data.label} added to ${list?.title}`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The value could not be saved");
    }
  };

  const columns = [
    { field: "sortOrder", header: "Order", width: 90 },
    {
      field: "label", header: "Label", hideable: false,
      render: (r) => (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          {r.label}
          {r.isSystem && (
            <Pill color={PmgColors.indigo} title="The application reads this label: it cannot be renamed">
              <LockOutlinedIcon sx={{ fontSize: 13 }} /> System
            </Pill>
          )}
        </Box>
      )
    },
    { field: "value", header: "Value", width: 90, render: (r) => <Box component="span" sx={{ color: "#6b7280" }}>{r.value}</Box> },
    {
      key: "usedBy", header: "Stored on",
      render: (r) => r.inUse > 0 ? r.usedBy : <Box component="span" sx={{ color: "#9ca3af" }}>Not used yet</Box>
    },
    {
      key: "status", header: "Status",
      render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill>
    },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => canEdit && (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.label}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
  ];

  const toggleGroup = (value, onChange, options, label) => (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(_, v) => v && onChange(v)} aria-label={label}
      sx={{
        bgcolor: "#fff", minHeight: 40, flexWrap: "wrap",
        "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
        "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
      }}>
      {options.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
    </ToggleButtonGroup>
  );

  const addDisabledReason = !canEdit ? "Not set up in this database yet" : list && !list.canAdd ? list.addBlocked : "";
  const lock = renameLock(original);
  const deactivating = original?.status && form?.status === "inactive";

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Drop-down Lists" accent={PmgColors.purple} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Values of the enquiry form drop-downs. Active values are offered; an inactive one stays on the enquiries that have it.
          </Box>
        </Box>
        <Tooltip title={addDisabledReason} arrow disableHoverListener={!addDisabledReason}>
          <span>
            <PButton label="Add value" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
              startIcon={<AddRoundedIcon />} width={160} autoLoading={false} disabled={!list || !!addDisabledReason} />
          </span>
        </Tooltip>
      </Box>

      {!loading && !data.ready && (
        <Note tone="warn">
          These lists are not set up in this database yet, so the built-in values are shown and offered (read-only).
          Run <b>NestleDB/Scripts/Create_tblDropdownValue.sql</b> on the database to manage them here.
        </Note>
      )}

      <Box sx={{ mb: 2 }}>
        {toggleGroup(listKey, (v) => { setListKey(v); setSearch(""); setStatusFilter("all"); },
          (data.lists || []).map((l) => ({ value: l.key, label: `${l.title} (${l.rows.filter((r) => r.status).length})` })), "List")}
      </Box>

      {list && <Note>{list.description}{!list.canAdd && <> {list.addBlocked}.</>}</Note>}

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search values" width={280} />
        <Box sx={{ mt: "7px" }}>
          {toggleGroup(statusFilter, setStatusFilter, [{ label: "All", value: "all" }, ...STATUS_OPTIONS], "Status")}
        </Box>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${list?.rows.length || 0} values`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.dropdownLists"
        emptyTitle="No values found" emptyMessage={search || statusFilter !== "all" ? "No value matches the search or filter." : "Add the first value."} />

      {list?.unlisted?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ fontSize: 14, fontWeight: 600, color: "#374151", mb: 0.5 }}>Stored text that matches no value</Box>
          <Box sx={{ fontSize: 12.5, color: "#6b7280", mb: 1 }}>
            Older records hold these spellings; their {list.title} field shows blank when the record is edited.
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {list.unlisted.map((u) => (
              <Pill key={u.label} color="#b45309" title={u.usedBy}>{u.label} · {u.inUse}</Pill>
            ))}
          </Box>
        </Box>
      )}

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Edit ${list?.title} value` : `Add ${list?.title} value`}
        maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }
      >
        {form && (
          <PGrid container className="g-3">
            <PGrid item xs={12}>
              <PTextField name="label" label={`Label ${REQUIRED}`} value={form.label} onChange={handleChange}
                helperText={errors.label} disabled={!!lock} inputProps={{ maxLength: MAX_LENGTH }} />
              {lock && <Box sx={{ fontSize: 12.5, color: "#6b7280", mt: 0.75 }}>{lock}</Box>}
            </PGrid>
            <PGrid item xs={12} md={6}>
              <PTextField name="sortOrder" label={`Order ${REQUIRED}`} value={form.sortOrder} onChange={handleChange}
                helperText={errors.sortOrder} inputProps={{ maxLength: 4, inputMode: "numeric" }} />
            </PGrid>
            <PGrid item xs={12} md={6}>
              <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status}
                onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
            </PGrid>
            <PGrid item xs={12}>
              <Box sx={{ fontSize: 12.5, color: "#6b7280" }}>
                {form.id ? `Value ${original?.value} (the number the drop-down sends; it does not change).` : "The next free number is given on save."}
                {deactivating && (
                  <Box sx={{ mt: 0.5, color: "#b45309" }}>
                    Deactivating stops offering {original.label} on new choices{original.inUse > 0 ? `; the ${original.usedBy} keep it` : ""}.
                  </Box>
                )}
              </Box>
            </PGrid>
          </PGrid>
        )}
      </PDialog>
    </Box>
  );
}
