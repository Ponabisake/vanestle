import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PTable from "../../component/PTable/PTable";
import PSearch from "../../component/PSearch/PSearch";
import PButton from "../../component/PButton/PButton";
import PDialog from "../../component/PDialog/PDialog";
import PTextField from "../../component/PTextField/PTextField";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MENU_KEY = "catalogueUsage";
const MAX_LENGTH = 200; // CatalogueUsageAdmin.MaxTextLength on the API
const REQUIRED = Labels.symbols?.required || "*";
const FILTERS = [{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

/**
 * Admin → Reports → Catalogue Usage (legacy Admin/CatalogueUsage.aspx, MasterAdmin only): the local-catalogue values
 * offered in the enquiry form (active ones; "N/A" chosen by default). Add, activate / deactivate and delete; enquiry
 * line items keep the text they stored, and "N/A" cannot be deactivated or deleted.
 */
export default function AdminCatalogueUsage() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [form, setForm] = useState(null); // { name } | null
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.CatalogueUsages, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data || []);
      else toast(Labels.status.failure, res?.data || res?.message || "Catalogue usage could not be loaded");
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((r) => (statusFilter === "all" || (statusFilter === "active") === r.status) && (!term || r.name.toLowerCase().includes(term)));
  }, [data, search, statusFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return setError(Labels.commonLabel?.required || "Required");
    if (name.length > MAX_LENGTH) return setError(`${MAX_LENGTH} characters or fewer`);
    const res = await PostApi(Admin_API.AddCatalogueUsage, { username: user?.userName, name });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${res.data.name} added`);
      setForm(null);
      reload();
    } else {
      setError(res?.data || res?.message || "The value could not be added");
    }
  };

  const toggle = async (row) => {
    const res = await PostApi(Admin_API.SetCatalogueUsageStatus, { username: user?.userName, id: row.id, active: !row.status });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${row.name} ${row.status ? "deactivated" : "activated"}`);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The status could not be changed");
    }
  };

  const handleDelete = async () => {
    const row = toDelete;
    setToDelete(null);
    const res = await PostApi(Admin_API.DeleteCatalogueUsage, { username: user?.userName, id: row.id });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${row.name} deleted`);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The value could not be deleted");
    }
  };

  const columns = [
    {
      field: "name", header: "Catalogue usage", hideable: false,
      render: (r) => (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          {r.name}
          {r.isDefault && <Pill color={PmgColors.indigo}>Default</Pill>}
        </Box>
      )
    },
    { key: "usedBy", header: "Used by line items", align: "right", render: (r) => r.usedBy.toLocaleString() },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Box sx={{ display: "inline-flex", gap: 0.5 }}>
          <Tooltip title={r.isDefault ? "The default choice stays active" : r.status ? "Deactivate" : "Activate"} arrow>
            <span>
              <IconButton size="small" aria-label={`${r.status ? "Deactivate" : "Activate"} ${r.name}`} onClick={() => toggle(r)} disabled={r.isDefault}
                sx={{ color: r.status ? PmgColors.green : "#6b7280" }}>
                {r.status ? <ToggleOnOutlinedIcon fontSize="small" /> : <ToggleOffOutlinedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={r.isDefault ? "The default choice cannot be deleted" : "Delete"} arrow>
            <span>
              <IconButton size="small" aria-label={`Delete ${r.name}`} onClick={() => setToDelete(r)} disabled={r.isDefault} sx={{ color: "#b91c1c" }}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
  ];

  return (
    <Box sx={{ py: 4, maxWidth: 1100 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Catalogue Usage" accent={PmgColors.berry} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            The local-catalogue choices of the enquiry form (active ones; "N/A" is chosen by default). Line items keep the text they saved.
          </Box>
        </Box>
        <PButton label="Add value" variant="contained" color={CommonColors.dark_blue} onClick={() => { setError(""); setForm({ name: "" }); }}
          startIcon={<AddRoundedIcon />} width={170} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search catalogue usage" width={300} />
        <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => v && setStatusFilter(v)} aria-label="Status"
          sx={{
            bgcolor: "#fff", height: 40, mt: "7px",
            "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
            "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
          }}>
          {FILTERS.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.length} values`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.catalogueUsage"
        emptyTitle="No values found" emptyMessage={search || statusFilter !== "all" ? "No value matches the search or filter." : "Add the first value."} />

      <PDialog open={!!form} onClose={() => setForm(null)} title="Add catalogue usage" maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }>
        {form && (
          <>
            <PTextField name="name" label={`Catalogue usage ${REQUIRED}`} value={form.name}
              onChange={(e) => { setForm({ name: e.target.value }); setError(""); }}
              helperText={error} inputProps={{ maxLength: MAX_LENGTH }} />
            <Box sx={{ fontSize: 12.5, color: "#6b7280", mt: 1 }}>New values are active: they are offered in the enquiry form straight away.</Box>
          </>
        )}
      </PDialog>

      <PDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete catalogue usage?" maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setToDelete(null)} width={130} />
            <PButton label="Delete" variant="contained" color={CommonColors.red?.dark || CommonColors.dark_blue} onClick={handleDelete} width={150} />
          </Box>
        }>
        {toDelete && (
          <Box sx={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
            <b>{toDelete.name}</b> will be removed.
            {toDelete.usedBy > 0
              ? ` The ${toDelete.usedBy.toLocaleString()} line item${toDelete.usedBy === 1 ? "" : "s"} that chose it keep${toDelete.usedBy === 1 ? "s" : ""} the text. To stop offering it but keep it listed, deactivate it instead.`
              : " No line item uses it."}
          </Box>
        )}
      </PDialog>
    </Box>
  );
}
