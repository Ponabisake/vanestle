import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
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

const MENU_KEY = "materialUsed";
const MAX_LENGTH = 200; // MaterialUsedAdmin.MaxTextLength on the API
const MAX_OPTION = 100;
const REQUIRED = Labels.symbols?.required || "*";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const EMPTY_FORM = { id: 0, materialUsed: "", job: "", status: "active", environmentImpacts: [], comparisonImpacts: [] };

const Pill = ({ children, color }) => (
  <Box component="span" sx={{
    display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600,
    color, bgcolor: `${color}14`, whiteSpace: "nowrap"
  }}>{children}</Box>
);

/** Option list editor: chips with ×, a field + Enter / Add for a new option (no commas: the list is stored comma-separated). */
function OptionList({ label, hint, values, onChange }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (value.includes(",")) return setError("An option may not contain a comma");
    if (value.length > MAX_OPTION) return setError(`${MAX_OPTION} characters or fewer`);
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) return setError(`${value} is already in the list`);
    onChange([...values, value]);
    setDraft("");
    setError("");
  };
  return (
    <Box>
      <Box sx={{ fontSize: 14, color: "#374151", mb: 0.5 }}>{label}</Box>
      <Box sx={{ fontSize: 12.5, color: "#6b7280", mb: 1 }}>{hint}</Box>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1, minHeight: 30 }}>
        {values.length === 0 && <Box sx={{ fontSize: 13, color: "#9ca3af", py: 0.5 }}>No options</Box>}
        {values.map((v) => (
          <Box key={v} sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, pl: 1.25, pr: 0.25, py: 0.25, borderRadius: "999px", bgcolor: `${PmgColors.navy}0F`, color: PmgColors.navy, fontSize: 13 }}>
            {v}
            <IconButton size="small" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} sx={{ p: 0.25 }}>
              <CloseRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1 }}>
          <PTextField name={`${label}-draft`} label="" placeHolder="Add an option and press Enter" value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }} helperText={error}
            // PTextField passes inputProps to the <input> (it has no onKeyDown prop of its own)
            inputProps={{ maxLength: MAX_OPTION + 1, onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } } }} />
        </Box>
        <PButton label="Add" variant="outlined" color={CommonColors.dark_blue} onClick={add} width={90} autoLoading={false} />
      </Box>
    </Box>
  );
}

/**
 * Admin → Catalogue → Material Used (legacy Admin/Materialused.aspx, MasterAdmin only): tblMaterialused. Add and edit
 * (no delete in the legacy page: set Inactive instead). The enquiry line items offer active materials by job; the
 * environmental impact options are what the enquiry's environmental section lists for the material.
 */
export default function AdminMaterialsUsed() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], jobs: ["Print & POSM", "Promo"] });
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
    PostApi(Admin_API.MaterialsUsed, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Materials could not be loaded");
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
      (!term || [r.materialUsed, ...r.environmentImpacts].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter, jobFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      id: row.id, materialUsed: row.materialUsed, job: row.job || "", status: row.status ? "active" : "inactive",
      environmentImpacts: [...row.environmentImpacts], comparisonImpacts: [...row.comparisonImpacts],
    } : { ...EMPTY_FORM });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.materialUsed.trim()) next.materialUsed = Labels.commonLabel?.required || "Required";
    else if (form.materialUsed.trim().length > MAX_LENGTH) next.materialUsed = `${MAX_LENGTH} characters or fewer`;
    if (!form.status) next.status = Labels.commonLabel?.required || "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveMaterialUsed, {
      username: user?.userName,
      id: form.id,
      materialUsed: form.materialUsed,
      job: form.job,
      status: form.status === "active",
      environmentImpacts: form.environmentImpacts,
      comparisonImpacts: form.comparisonImpacts,
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.materialUsed} updated` : `${res.data.materialUsed} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The material could not be saved");
    }
  };

  const columns = [
    { field: "materialUsed", header: "Material used", hideable: false },
    { key: "job", header: "Type of job", render: (r) => (r.job ? <Pill color={PmgColors.indigo}>{r.job}</Pill> : <Box component="span" sx={{ color: "#9ca3af" }}>—</Box>) },
    {
      key: "impacts", header: "Environment impacts",
      render: (r) => r.environmentImpacts.length
        ? <Tooltip title={r.environmentImpacts.join(", ")} arrow><span>{r.environmentImpacts.length} option{r.environmentImpacts.length === 1 ? "" : "s"}</span></Tooltip>
        : <Box component="span" sx={{ color: "#9ca3af" }}>—</Box>
    },
    {
      key: "comparison", header: "Comparison impacts",
      render: (r) => r.comparisonImpacts.length
        ? <Tooltip title={r.comparisonImpacts.join(", ")} arrow><span>{r.comparisonImpacts.length} option{r.comparisonImpacts.length === 1 ? "" : "s"}</span></Tooltip>
        : <Box component="span" sx={{ color: "#9ca3af" }}>—</Box>
    },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.materialUsed}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
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
          <PSectionHeading label="Material Used" accent={PmgColors.green} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Offered in the enquiry line items by job; the impact options feed the enquiry's environmental section.
          </Box>
        </Box>
        <PButton label="Add material" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
          startIcon={<AddRoundedIcon />} width={180} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search materials or impacts" width={280} />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: "7px" }}>
          {filterGroup(jobFilter, setJobFilter, [{ label: "All jobs", value: "all" }, ...data.jobs.map((j) => ({ label: j, value: j })), { label: "No job", value: "none" }], "Type of job")}
          {filterGroup(statusFilter, setStatusFilter, [{ label: "All", value: "all" }, ...STATUS_OPTIONS], "Status")}
        </Box>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} materials`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.materialsUsed"
        emptyTitle="No materials found" emptyMessage={filtered ? "No material matches the search or filters." : "Add the first material."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit material" : "Add material"}
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
            <PGrid item xs={12} md={6}>
              <PTextField name="materialUsed" label={`Material used ${REQUIRED}`} value={form.materialUsed}
                onChange={handleChange} helperText={errors.materialUsed} inputProps={{ maxLength: MAX_LENGTH }} />
            </PGrid>
            <PGrid item xs={12} md={3}>
              <PDropdown name="job" label="Type of job" value={form.job} onChange={handleChange}
                options={data.jobs.map((j) => ({ label: j, value: j }))} />
            </PGrid>
            <PGrid item xs={12} md={3}>
              <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status}
                onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
            </PGrid>
            <PGrid item xs={12} md={6}>
              <OptionList label="Environment impacts" hint="Listed for this material in the enquiry's environmental section."
                values={form.environmentImpacts} onChange={(list) => setForm((prev) => ({ ...prev, environmentImpacts: list }))} />
            </PGrid>
            <PGrid item xs={12} md={6}>
              <OptionList label="Comparison impacts" hint="Listed for the comparison (the alternative materials)."
                values={form.comparisonImpacts} onChange={(list) => setForm((prev) => ({ ...prev, comparisonImpacts: list }))} />
            </PGrid>
          </PGrid>
        )}
      </PDialog>
    </Box>
  );
}
