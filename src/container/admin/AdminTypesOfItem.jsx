import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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

const MENU_KEY = "typeOfItem";
const MAX_LENGTH = 200; // TypeOfItemAdmin.MaxTextLength on the API
const REQUIRED = Labels.symbols?.required || "*";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const EMPTY_FORM = { id: 0, typeOfItem: "", job: "", status: "active", subItemId: "" };
const JOB_HINT = { Both: "Print and POSM" };

const Pill = ({ children, color }) => (
  <Box component="span" sx={{
    display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600,
    color, bgcolor: `${color}14`, whiteSpace: "nowrap"
  }}>{children}</Box>
);

/**
 * Admin → Catalogue → Type of Item (legacy Admin/TypeOfItem.aspx, MasterAdmin only): tblTypeofItem. Add and edit
 * (no delete in the legacy page: set Inactive instead). The enquiry line item list offers active types of item by job
 * (Both = Print and POSM); a "marked" sub item lists only the types of item linked to it.
 */
export default function AdminTypesOfItem() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], jobs: ["Print", "Promo", "POSM", "Both"], subItems: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [form, setForm] = useState(null); // null = dialog closed
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.TypesOfItem, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Types of item could not be loaded");
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
    return (data.rows || []).filter((r) =>
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (jobFilter === "all" || (jobFilter === "none" ? !r.job : r.job === jobFilter)) &&
      (!term || [r.typeOfItem, r.subItem].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter, jobFilter]);

  // the sub item drop-down: active sub items, plus the row's own link when it points at an inactive one
  const subItemOptions = (data.subItems || []).map((s) => ({ label: s.label, value: s.value }));
  if (form?.subItemId && !subItemOptions.some((o) => o.value === form.subItemId)) {
    const row = data.rows.find((r) => r.id === form.id);
    subItemOptions.unshift({ label: `${row?.subItem || `#${form.subItemId}`} (inactive)`, value: form.subItemId });
  }

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      id: row.id, typeOfItem: row.typeOfItem, job: row.job || "", status: row.status ? "active" : "inactive", subItemId: row.subItemId || "",
    } : { ...EMPTY_FORM });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.typeOfItem.trim()) next.typeOfItem = Labels.commonLabel?.required || "Required";
    else if (form.typeOfItem.trim().length > MAX_LENGTH) next.typeOfItem = `${MAX_LENGTH} characters or fewer`;
    if (!form.status) next.status = Labels.commonLabel?.required || "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveTypeOfItem, {
      username: user?.userName,
      id: form.id,
      typeOfItem: form.typeOfItem,
      job: form.job,
      status: form.status === "active",
      subItemId: form.subItemId ? Number(form.subItemId) : null,
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.typeOfItem} updated` : `${res.data.typeOfItem} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The type of item could not be saved");
    }
  };

  const columns = [
    { field: "typeOfItem", header: "Type of item", hideable: false },
    {
      key: "job", header: "Type of job",
      render: (r) => r.job
        ? <Tooltip title={JOB_HINT[r.job] || ""} arrow disableHoverListener={!JOB_HINT[r.job]}><span><Pill color={PmgColors.indigo}>{r.job}</Pill></span></Tooltip>
        : <Box component="span" sx={{ color: "#9ca3af" }}>—</Box>
    },
    { field: "subItem", header: "Sub item", render: (r) => r.subItem || <Box component="span" sx={{ color: "#9ca3af" }}>—</Box> },
    {
      key: "status", header: "Status",
      render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill>
    },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.typeOfItem}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
  ];

  const filterGroup = (value, onChange, options, label) => (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(_, v) => v && onChange(v)} aria-label={label}
      sx={{
        bgcolor: "#fff", height: 40,
        "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
        "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
      }}>
      {options.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
    </ToggleButtonGroup>
  );

  const filtered = search || statusFilter !== "all" || jobFilter !== "all";

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Type of Item" accent={PmgColors.green} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Offered in the enquiry line items by job (Both = Print and POSM). A marked sub item lists only the types linked to it.
          </Box>
        </Box>
        <PButton label="Add type of item" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
          startIcon={<AddRoundedIcon />} width={210} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search types or sub items" width={280} />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: "7px" }}>
          {filterGroup(jobFilter, setJobFilter, [{ label: "All jobs", value: "all" }, ...data.jobs.map((j) => ({ label: j, value: j })), { label: "No job", value: "none" }], "Type of job")}
          {filterGroup(statusFilter, setStatusFilter, [{ label: "All", value: "all" }, ...STATUS_OPTIONS], "Status")}
        </Box>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} types of item`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.typesOfItem"
        emptyTitle="No types of item found" emptyMessage={filtered ? "No type of item matches the search or filters." : "Add the first type of item."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit type of item" : "Add type of item"}
        maxWidth="md"
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
              <PTextField name="typeOfItem" label={`Type of item ${REQUIRED}`} value={form.typeOfItem}
                onChange={handleChange} helperText={errors.typeOfItem} inputProps={{ maxLength: MAX_LENGTH }} />
            </PGrid>
            <PGrid item xs={12} md={4}>
              <PDropdown name="job" label="Type of job" value={form.job} onChange={handleChange}
                options={data.jobs.map((j) => ({ label: JOB_HINT[j] ? `${j} (${JOB_HINT[j]})` : j, value: j }))} />
            </PGrid>
            <PGrid item xs={12} md={4}>
              <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status}
                onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
            </PGrid>
            <PGrid item xs={12} md={4}>
              <PDropdown name="subItemId" label="Sub item" value={form.subItemId} onChange={handleChange}
                options={subItemOptions} flag={Labels.flag.auto} clearable />
            </PGrid>
          </PGrid>
        )}
      </PDialog>
    </Box>
  );
}
