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

const MENU_KEY = "subItem";
const MAX_LENGTH = 100; // SubItemAdmin.MaxTextLength on the API
const REQUIRED = Labels.symbols?.required || "*";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const YES_NO = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }];
const EMPTY_FORM = { id: 0, subCategory: "", japanese: "", zsim: "", status: "active", marked: "", jobs: [] };

const Pill = ({ children, color }) => (
  <Box component="span" sx={{
    display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600,
    color, bgcolor: `${color}14`, whiteSpace: "nowrap", mr: 0.5
  }}>{children}</Box>
);

// multi-line values in the data (some Japanese / ZSIM entries have line breaks) shown on one line
const oneLine = (value) => (value || "").trim().replace(/\s*[\r\n]+\s*/g, " / ");

/**
 * Admin → Catalogue → Sub Item (legacy Admin/SubItem.aspx, MasterAdmin only): the sub categories of tblSubCategory.
 * Add and edit (no delete in the legacy page: set Inactive instead). Type of job decides in which enquiry jobs the
 * sub item is offered.
 */
export default function AdminSubItems() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], jobs: ["Print", "POSM", "Promo"] }); // jobs: the active Type of Job values (Settings → Drop-down Lists)
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
    PostApi(Admin_API.SubItems, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Sub items could not be loaded");
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
      (jobFilter === "all" || (jobFilter === "none" ? r.jobs.length === 0 : r.jobs.includes(jobFilter))) &&
      (!term || [r.subCategory, r.japanese, r.zsim].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter, jobFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      id: row.id, subCategory: row.subCategory, japanese: row.japanese, zsim: row.zsim,
      status: row.status ? "active" : "inactive", marked: row.markedTypeOfItem ? "yes" : "no", jobs: [...row.jobs],
    } : { ...EMPTY_FORM });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleJob = (job) => setForm((prev) => ({
    ...prev,
    jobs: prev.jobs.includes(job) ? prev.jobs.filter((j) => j !== job) : [...prev.jobs, job],
  }));

  const validate = () => {
    const next = {};
    if (!form.subCategory.trim()) next.subCategory = Labels.commonLabel?.required || "Required";
    ["subCategory", "japanese", "zsim"].forEach((name) => {
      if (!next[name] && (form[name] || "").trim().length > MAX_LENGTH) next[name] = `${MAX_LENGTH} characters or fewer`;
    });
    if (!form.status) next.status = Labels.commonLabel?.required || "Required";
    if (!form.marked) next.marked = Labels.commonLabel?.required || "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveSubItem, {
      username: user?.userName,
      id: form.id,
      subCategory: form.subCategory,
      japanese: form.japanese,
      zsim: form.zsim,
      status: form.status === "active",
      markedTypeOfItem: form.marked === "yes",
      jobs: form.jobs,
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.subCategory} updated` : `${res.data.subCategory} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The sub item could not be saved");
    }
  };

  const columns = [
    { field: "subCategory", header: "Sub category", hideable: false, render: (r) => oneLine(r.subCategory) },
    { field: "japanese", header: "Japanese", render: (r) => oneLine(r.japanese) },
    { field: "zsim", header: "ZSIM", render: (r) => oneLine(r.zsim) },
    {
      key: "jobs", header: "Type of job",
      render: (r) => r.jobs.length ? r.jobs.map((j) => <Pill key={j} color={PmgColors.indigo}>{j}</Pill>) : <Box component="span" sx={{ color: "#9ca3af" }}>—</Box>
    },
    { key: "marked", header: "Marked type of item", render: (r) => (r.markedTypeOfItem ? "Yes" : "No") },
    {
      key: "status", header: "Status",
      render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill>
    },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.subCategory}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
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
          <PSectionHeading label="Sub Item" accent={PmgColors.green} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Sub categories of the enquiry line items. Active ones are offered for the jobs ticked in Type of job.
          </Box>
        </Box>
        <PButton label="Add sub item" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
          startIcon={<AddRoundedIcon />} width={190} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search sub items" width={280} />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: "7px" }}>
          {filterGroup(jobFilter, setJobFilter, [{ label: "All jobs", value: "all" }, ...data.jobs.map((j) => ({ label: j, value: j })), { label: "No job", value: "none" }], "Type of job")}
          {filterGroup(statusFilter, setStatusFilter, [{ label: "All", value: "all" }, ...STATUS_OPTIONS], "Status")}
        </Box>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} sub items`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.subItems"
        emptyTitle="No sub items found" emptyMessage={filtered ? "No sub item matches the search or filters." : "Add the first sub item."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit sub item" : "Add sub item"}
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
              <PTextField name="subCategory" label={`Sub category ${REQUIRED}`} value={form.subCategory}
                onChange={handleChange} helperText={errors.subCategory} inputProps={{ maxLength: MAX_LENGTH }} />
            </PGrid>
            <PGrid item xs={12} md={6}>
              <PTextField name="japanese" label="Japanese" value={form.japanese}
                onChange={handleChange} helperText={errors.japanese} inputProps={{ maxLength: MAX_LENGTH }} />
            </PGrid>
            <PGrid item xs={12} md={6}>
              <PTextField name="zsim" label="ZSIM" value={form.zsim}
                onChange={handleChange} helperText={errors.zsim} inputProps={{ maxLength: MAX_LENGTH }} />
            </PGrid>
            <PGrid item xs={12} md={3}>
              <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status}
                onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
            </PGrid>
            <PGrid item xs={12} md={3}>
              <PDropdown name="marked" label={`Marked type of item ${REQUIRED}`} value={form.marked}
                onChange={handleChange} helperText={errors.marked} options={YES_NO} />
            </PGrid>
            <PGrid item xs={12}>
              <Box sx={{ fontSize: 14, color: "#374151", mb: 1 }}>Type of job</Box>
              <Box role="group" aria-label="Type of job" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[...data.jobs, ...form.jobs.filter((j) => !data.jobs.includes(j))].map((job) => { // + a deactivated job the sub item still has
                  const on = form.jobs.includes(job);
                  return (
                    <Box key={job} component="button" type="button" aria-pressed={on} onClick={() => toggleJob(job)}
                      sx={{
                        px: 2, py: 0.75, borderRadius: "999px", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                        border: `1.5px solid ${on ? PmgColors.navy : "#d1d5db"}`, bgcolor: on ? PmgColors.navy : "#fff", color: on ? "#fff" : "#374151",
                      }}>
                      {job}
                    </Box>
                  );
                })}
              </Box>
              <Box sx={{ fontSize: 12.5, color: "#6b7280", mt: 1 }}>
                The enquiry line item list offers the sub item only for the jobs ticked here. None ticked: not offered.
              </Box>
            </PGrid>
          </PGrid>
        )}
      </PDialog>
    </Box>
  );
}
