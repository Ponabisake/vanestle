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
import { optionsWithCurrent } from "./adminOptions";

const CATALOG = "Catalog";
const MAX_LENGTH = 50;
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const TRANSLATIONS = [
  { name: "indonesia", label: "Indonesian" },
  { name: "chineseSimplified", label: "Chinese (Simplified)" },
  { name: "chineseTraditional", label: "Chinese (Traditional)" },
  { name: "japanese", label: "Japanese" },
  { name: "korean", label: "Korean" },
];
const EMPTY_FORM = {
  id: 0, category: "", categoryType: "Enquiry", categoryJob: "", status: "active",
  indonesia: "", chineseSimplified: "", chineseTraditional: "", japanese: "", korean: "",
};

const Pill = ({ children, color }) => (
  <Box component="span" sx={{
    display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600,
    color, bgcolor: `${color}14`, whiteSpace: "nowrap"
  }}>{children}</Box>
);

/** Admin → Catalogue → Products (legacy Admin/Products.aspx): the product categories, with their translations. */
export default function AdminProducts() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, "products");
  const [data, setData] = useState({ rows: [], categoryTypes: ["Enquiry", CATALOG], categoryJobs: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(null); // null = dialog closed
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.Products, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Products could not be loaded");
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
      (typeFilter === "all" || r.categoryType === typeFilter) &&
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (!term || [r.category, r.indonesia, r.chineseSimplified, r.chineseTraditional, r.japanese, r.korean, r.categoryJob]
        .some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, typeFilter, statusFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      id: row.id, category: row.category, categoryType: row.categoryType, categoryJob: row.categoryJob || "",
      status: row.status ? "active" : "inactive",
      // a translation equal to the name was filled in from it: show it empty so a rename updates it too
      ...Object.fromEntries(TRANSLATIONS.map((t) => [t.name, row[t.name] === row.category ? "" : row[t.name] || ""])),
    } : { ...EMPTY_FORM });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.category.trim()) next.category = Labels.commonLabel?.required || "Required";
    [{ name: "category" }, ...TRANSLATIONS].forEach(({ name }) => {
      if (!next[name] && (form[name] || "").trim().length > MAX_LENGTH) next[name] = `${MAX_LENGTH} characters or fewer`;
    });
    if (!form.categoryType) next.categoryType = Labels.commonLabel?.required || "Required";
    if (!form.status) next.status = Labels.commonLabel?.required || "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const isCatalog = form.categoryType === CATALOG;
    const res = await PostApi(Admin_API.SaveProduct, {
      username: user?.userName,
      id: form.id,
      category: form.category,
      categoryType: form.categoryType,
      categoryJob: isCatalog ? form.categoryJob : "",
      status: form.status === "active",
      ...Object.fromEntries(TRANSLATIONS.map((t) => [t.name, form[t.name]])),
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.category} updated` : `${res.data.category} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The product could not be saved");
    }
  };

  const columns = [
    { field: "category", header: "Category", hideable: false },
    {
      key: "type", header: "Type",
      render: (r) => <Pill color={r.categoryType === CATALOG ? PmgColors.purple : PmgColors.indigo}>{r.categoryType}</Pill>
    },
    { field: "categoryJob", header: "Job" },
    {
      key: "status", header: "Status",
      render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill>
    },
    // the last three start hidden so Edit stays on screen; the column chooser shows them
    ...TRANSLATIONS.map((t, i) => ({ field: t.name, header: t.label, defaultHidden: i >= 2 })),
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.category}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
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

  const isCatalogForm = form?.categoryType === CATALOG;

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Products" accent={PmgColors.green} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Product categories. Active enquiry categories appear in the enquiry line item list, in the user's language.
          </Box>
        </Box>
        <PButton label="Add product" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
          startIcon={<AddRoundedIcon />} width={180} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search products" width={280} />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: "7px" }}>
          {filterGroup(typeFilter, setTypeFilter, [{ label: "All types", value: "all" }, ...data.categoryTypes.map((t) => ({ label: t, value: t }))], "Category type")}
          {filterGroup(statusFilter, setStatusFilter, [{ label: "All", value: "all" }, ...STATUS_OPTIONS], "Status")}
        </Box>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} products`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.products"
        emptyTitle="No products found" emptyMessage={search || typeFilter !== "all" || statusFilter !== "all" ? "No product matches the search or filters." : "Add the first product category."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit product" : "Add product"}
        maxWidth="md"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }
      >
        {form && (
          <>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}>
                <PTextField name="category" label={`Category ${Labels.symbols?.required || "*"}`} value={form.category}
                  onChange={handleChange} helperText={errors.category} inputProps={{ maxLength: MAX_LENGTH }} />
              </PGrid>
              <PGrid item xs={12} md={3}>
                <PDropdown name="categoryType" label={`Category type ${Labels.symbols?.required || "*"}`} value={form.categoryType}
                  onChange={handleChange} helperText={errors.categoryType}
                  options={data.categoryTypes.map((t) => ({ label: t, value: t }))} />
              </PGrid>
              <PGrid item xs={12} md={3}>
                <PDropdown name="status" label={`Status ${Labels.symbols?.required || "*"}`} value={form.status}
                  onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
              </PGrid>
              {isCatalogForm && (
                <PGrid item xs={12} md={6}>
                  <PDropdown name="categoryJob" label="Category job" value={form.categoryJob}
                    onChange={handleChange} options={optionsWithCurrent(data.categoryJobs, form.categoryJob)} />
                </PGrid>
              )}
            </PGrid>

            <Box sx={{ mt: 3, mb: 1, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: PmgColors.navy }}>
              Translations
            </Box>
            <Box sx={{ fontSize: 12.5, color: "#6b7280", mb: 1.5 }}>
              Left empty, a language shows the category name above.
            </Box>
            <PGrid container className="g-3">
              {TRANSLATIONS.map((t) => (
                <PGrid item xs={12} md={6} key={t.name}>
                  <PTextField name={t.name} label={t.label} value={form[t.name]} onChange={handleChange}
                    helperText={errors[t.name]} placeHolder={form.category || "Same as category"} inputProps={{ maxLength: MAX_LENGTH }} />
                </PGrid>
              ))}
            </PGrid>
          </>
        )}
      </PDialog>
    </Box>
  );
}
