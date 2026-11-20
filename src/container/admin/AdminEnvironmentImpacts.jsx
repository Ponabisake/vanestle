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

const MENU_KEY = "environmentImpacts";
const MAX_LENGTH = 50; // EnvironmentAdmin.MaxTextLength on the API
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const FACTORS = [
  { name: "embodiedCarbon", label: "Embodied carbon" },
  { name: "waterUsage", label: "Water usage" },
  { name: "energyConsumption", label: "Energy consumption" },
  { name: "woodUse", label: "Wood use" },
];
const EMPTY = { id: 0, material: "", type: "", embodiedCarbon: "", waterUsage: "", energyConsumption: "", woodUse: "", status: "active" };
const NUMBER = /^\d+(\.\d+)?([eE][-+]?\d+)?$/;

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

/**
 * Admin → Reports → Environment Impacts (legacy Admin/EnvironmentImpacts.aspx, MasterAdmin only): the factors per
 * material and type that the enquiry's environmental impact calculation multiplies by the item weight. Add and edit;
 * inactive rows are not offered. Factors must be numbers (empty = not calculated).
 */
export default function AdminEnvironmentImpacts() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], materials: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [material, setMaterial] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.EnvironmentImpacts, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Environment impacts could not be loaded");
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
      (material === "all" || r.material.toLowerCase() === material.toLowerCase()) &&
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (!term || [r.material, r.type].some((v) => v.toLowerCase().includes(term))));
  }, [data.rows, search, material, statusFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setErrors({});
    setOriginal(row || null);
    setForm(row ? { ...EMPTY, ...row, status: row.status ? "active" : "inactive" } : { ...EMPTY, material: material === "all" ? "" : material });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const handleSave = async () => {
    const next = {};
    ["material", "type"].forEach((n) => { if (!form[n].trim()) next[n] = REQUIRED_TEXT; });
    if (!form.status) next.status = REQUIRED_TEXT;
    // a migrated value kept as it is (e.g. "N.A", skipped by the calculation) stays; a changed one must be a number
    FACTORS.forEach(({ name }) => {
      const v = String(form[name] || "").trim();
      if (v && v !== (original?.[name] ?? "") && !NUMBER.test(v)) next[name] = "A number (use . for decimals)";
    });
    setErrors(next);
    if (Object.keys(next).length) return;
    const res = await PostApi(Admin_API.SaveEnvironmentImpact, { username: user?.userName, ...form, status: form.status === "active" });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${res.data.material} → ${res.data.type} ${form.id ? "updated" : "added"}`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The row could not be saved");
    }
  };

  const factor = (v) => (v === "" ? <Box component="span" sx={{ color: "#9ca3af" }}>—</Box> : v);
  const columns = [
    { field: "material", header: "Material", hideable: false },
    { field: "type", header: "Type", hideable: false },
    ...FACTORS.map(({ name, label }) => ({ key: name, header: label, align: "right", render: (r) => factor(r[name]) })),
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.material} ${r.type}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
  ];

  const materialOptions = [{ label: "All materials", value: "all" }, ...(data.materials || []).map((m) => ({ label: m, value: m }))];

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Environment Impacts" accent={PmgColors.berry} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Factors per material and type, multiplied by the item weight in the enquiry's environmental impact. Only active rows are offered.
          </Box>
        </Box>
        <PButton label="Add row" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)} startIcon={<AddRoundedIcon />} width={160} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search material, type" width={260} />
        <Box sx={{ width: 220, mt: "-18px" }}>
          <PDropdown name="material" label="Material" value={material} onChange={(e) => setMaterial(e.target.value || "all")} options={materialOptions} />
        </Box>
        <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => v && setStatusFilter(v)} aria-label="Status"
          sx={{
            bgcolor: "#fff", height: 40, mt: "7px",
            "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
            "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
          }}>
          {[{ label: "All", value: "all" }, ...STATUS_OPTIONS].map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>{loading ? "Loading…" : `${rows.length} of ${data.rows.length} rows`}</Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.environmentImpacts"
        emptyTitle="No rows found" emptyMessage={search || material !== "all" || statusFilter !== "all" ? "No row matches the search or filters." : "Add the first row."} />

      <PDialog open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit environment impact" : "Add environment impact"} maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }>
        {form && (
          <>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}>
                <PTextField name="material" label={`Material ${REQUIRED}`} value={form.material} onChange={handleChange} helperText={errors.material}
                  inputProps={{ maxLength: MAX_LENGTH, list: "admin-env-materials" }} />
                <datalist id="admin-env-materials">{(data.materials || []).map((m) => <option key={m} value={m} />)}</datalist>
              </PGrid>
              <PGrid item xs={12} md={6}>
                <PTextField name="type" label={`Type ${REQUIRED}`} value={form.type} onChange={handleChange} helperText={errors.type} inputProps={{ maxLength: MAX_LENGTH }} />
              </PGrid>
              {FACTORS.map(({ name, label }) => (
                <PGrid item xs={12} md={6} key={name}>
                  <PTextField name={name} label={label} value={form[name]} onChange={handleChange} helperText={errors[name]}
                    inputProps={{ maxLength: MAX_LENGTH, inputMode: "decimal" }} />
                </PGrid>
              ))}
              <PGrid item xs={12} md={6}>
                <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status} onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
              </PGrid>
            </PGrid>
            <Box sx={{ mt: 1.5, fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
              Factors are multiplied by the item weight; an empty or non-numeric factor is left out of the calculation. One active row per material and type: the calculation uses the first match.
            </Box>
          </>
        )}
      </PDialog>
    </Box>
  );
}
