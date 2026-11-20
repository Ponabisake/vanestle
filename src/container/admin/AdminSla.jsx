import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
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
import { optionsWithCurrent } from "./adminOptions";

const MENU_KEY = "sla";
const MAX_DAYS = 999;
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const PERIODS = [
  { name: "quote", label: "Quote" }, { name: "proof", label: "Proof" }, { name: "production", label: "Production" },
  { name: "fileCopies", label: "File copies" }, { name: "invoicing", label: "Invoicing" },
];
const EMPTY_FORM = { id: 0, description: "", quote: "", proof: "", production: "", fileCopies: "", invoicing: "", country: "", status: "active" };

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

/**
 * Admin → Operations → SLA (legacy Admin/ManageSLA.aspx; MasterAdmin and Admin): the SLA templates — days allowed for
 * quote, proof, production, file copies and invoicing. The enquiry form offers the active templates of the enquiry's
 * country, so a template needs a country to be offered.
 */
export default function AdminSla() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], countries: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.SlaTemplates, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "SLA templates could not be loaded");
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
      (countryFilter === "all" || (countryFilter === "none" ? !r.country : r.country === countryFilter)) &&
      (!term || (r.description || "").toLowerCase().includes(term)));
  }, [data.rows, search, statusFilter, countryFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      id: row.id, description: row.description, quote: String(row.quote), proof: String(row.proof), production: String(row.production),
      fileCopies: String(row.fileCopies), invoicing: String(row.invoicing), country: row.country || "", status: row.status ? "active" : "inactive",
    } : { ...EMPTY_FORM });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.description.trim()) next.description = REQUIRED_TEXT;
    PERIODS.forEach(({ name }) => {
      const v = String(form[name]).trim();
      if (v === "") next[name] = REQUIRED_TEXT;
      else if (!/^\d+$/.test(v) || Number(v) > MAX_DAYS) next[name] = `0 – ${MAX_DAYS} days`;
    });
    if (!form.status) next.status = REQUIRED_TEXT;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveSlaTemplate, {
      username: user?.userName, id: form.id, description: form.description, country: form.country, status: form.status === "active",
      ...Object.fromEntries(PERIODS.map(({ name }) => [name, Number(form[name])])),
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.description} updated` : `${res.data.description} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The SLA template could not be saved");
    }
  };

  const toggleStatus = async (row) => {
    const res = await PostApi(Admin_API.SetSlaTemplateStatus, { username: user?.userName, id: row.id, active: !row.status });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${row.description} ${row.status ? "deactivated" : "activated"}`);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The status could not be changed");
    }
  };

  const columns = [
    {
      field: "description", header: "Description", hideable: false,
      render: (r) => (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          {r.description}{r.isDefault && <Pill color={PmgColors.indigo}>Default</Pill>}
        </Box>
      )
    },
    ...PERIODS.map(({ name, label }) => ({ field: name, header: `${label} (days)`, align: "right" })),
    { key: "country", header: "Country", render: (r) => r.country || <Tooltip title="Not offered in enquiries: no country" arrow><Box component="span" sx={{ color: "#b45309" }}>Not offered</Box></Tooltip> },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Box sx={{ display: "inline-flex", gap: 0.5 }}>
          <Tooltip title={r.status ? "Deactivate" : "Activate"} arrow>
            <IconButton size="small" aria-label={`${r.status ? "Deactivate" : "Activate"} ${r.description}`} onClick={() => toggleStatus(r)} sx={{ color: r.status ? PmgColors.green : "#6b7280" }}>
              {r.status ? <ToggleOnOutlinedIcon fontSize="small" /> : <ToggleOffOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" aria-label={`Edit ${r.description}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
  ];

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="SLA" accent={PmgColors.orange} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            SLA templates: days allowed per stage. Enquiries offer the active templates of their country.
          </Box>
        </Box>
        <PButton label="Add SLA template" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)} startIcon={<AddRoundedIcon />} width={210} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search description" width={260} />
        <Box sx={{ width: 220, mt: "7px" }}>
          <PDropdown name="countryFilter" label="" labelMode="inside" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value || "all")}
            options={[{ label: "All countries", value: "all" }, { label: "No country (not offered)", value: "none" }, ...data.countries.map((c) => ({ label: c, value: c }))]} />
        </Box>
        <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => v && setStatusFilter(v)} aria-label="Status"
          sx={{
            bgcolor: "#fff", height: 40, mt: "7px",
            "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
            "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
          }}>
          {[{ label: "All", value: "all" }, ...STATUS_OPTIONS].map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} templates`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.sla"
        emptyTitle="No SLA templates found" emptyMessage={search || countryFilter !== "all" || statusFilter !== "all" ? "No template matches the search or filters." : "Add the first SLA template."} />

      <PDialog open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit SLA template" : "Add SLA template"} maxWidth="md"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }>
        {form && (
          <PGrid container className="g-3">
            <PGrid item xs={12} md={6}>
              <PTextField name="description" label={`Description ${REQUIRED}`} value={form.description} onChange={handleChange} helperText={errors.description} inputProps={{ maxLength: 200 }} />
            </PGrid>
            <PGrid item xs={12} md={3}>
              <PDropdown name="country" label="Country" value={form.country} onChange={handleChange} options={optionsWithCurrent(data.countries, form.country)} flag={Labels.flag.auto} clearable />
            </PGrid>
            <PGrid item xs={12} md={3}>
              <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status} onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
            </PGrid>
            <PGrid item xs={12}>
              {/* the five stages side by side (two per row on a phone) */}
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" } }}>
                {PERIODS.map(({ name, label }) => (
                  <Box key={name} sx={{ minWidth: 0 }}>
                    <PTextField name={name} label={`${label} (days) ${REQUIRED}`} value={form[name]} onChange={handleChange} helperText={errors[name]} inputProps={{ maxLength: 3, inputMode: "numeric" }} />
                  </Box>
                ))}
              </Box>
            </PGrid>
            {!form.country && (
              <PGrid item xs={12}>
                <Box sx={{ fontSize: 12.5, color: "#b45309" }}>Without a country the template is not offered in any enquiry.</Box>
              </PGrid>
            )}
          </PGrid>
        )}
      </PDialog>
    </Box>
  );
}
