import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
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

const MENU_KEY = "clients";
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const NAME_PATTERN = /^[a-zA-Z'@&#.\s]{1,50}$/;
const PHONE_PATTERN = /^[1-9]\d*$/;
const PERCENT_PATTERN = /^([0-9]{1,2}(\.[0-9]+)?|100(\.0+)?)$/;
const PERCENTAGES = [
  { name: "defaultSalesPercentage", label: "Default sales %" }, { name: "printPercentage", label: "Default print %" },
  { name: "posmPercentage", label: "Default POSM %" }, { name: "promoPercentage", label: "Default promo %" },
  { name: "pmgGainShare", label: "PMG gain share %" }, { name: "vanestleGainShare", label: "VANestle gain share %" },
];
const EMPTY_CLIENT = {
  id: 0, clientName: "", phoneNumber: "", addressLine1: "", addressLine2: "", addressLine3: "", addressLine4: "", city: "",
  country: "", language: "", currency: "", paymentTerm: "", salesType: "", defaultSalesPercentage: "", printPercentage: "",
  posmPercentage: "", promoPercentage: "", pmgGainShare: "", vanestleGainShare: "", rate: "", status: "active",
};
const EMPTY_DIVISION = { id: 0, country: "", entityName: "", businessUnit: "", globalBuMapping: "" };
const toOptions = (list) => (list || []).map((v) => ({ label: v, value: v }));

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);
const SectionTitle = ({ children }) => (
  <Box sx={{ mt: 1, mb: 0.5, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: PmgColors.navy }}>{children}</Box>
);

/**
 * Admin → Catalogue → Clients (legacy Admin/ManageClients.aspx + ClientHierarchy.aspx; MasterAdmin): clients with their
 * pricing defaults, and each client's hierarchy (divisions: country → entity → business unit). A division used by client
 * contacts or enquiries cannot be deleted, only deactivated.
 */
export default function AdminClients() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], countries: [], languages: [], currencies: [], salesTypes: ["MARKUP", "MARGIN"] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  // hierarchy of one client
  const [divisionsOf, setDivisionsOf] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [divisionsLoading, setDivisionsLoading] = useState(false);
  const [divisionForm, setDivisionForm] = useState(null);
  const [divisionErrors, setDivisionErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [divisionSearch, setDivisionSearch] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.Clients, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Clients could not be loaded");
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
      (!term || [r.clientName, r.country, r.city].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter]);

  const divisionTerm = divisionSearch.trim().toLowerCase();
  const shownDivisions = divisionTerm
    ? divisions.filter((d) => [d.country, d.entityName, d.businessUnit, d.globalBuMapping].some((v) => (v || "").toLowerCase().includes(divisionTerm)))
    : divisions;

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  // ---- client form ------------------------------------------------------------------------------------------------
  const openForm = (row) => {
    setErrors({});
    const next = row ? { ...EMPTY_CLIENT, ...row, status: row.status ? "active" : "inactive" } : { ...EMPTY_CLIENT };
    setForm(next);
    setOriginal(row || null);
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const validate = () => {
    const next = {};
    const v = (n) => String(form[n] || "").trim();
    ["clientName", "phoneNumber", "addressLine1", "city", "rate"].forEach((n) => { if (!v(n)) next[n] = REQUIRED_TEXT; });
    ["country", "language", "currency", "salesType", "status"].forEach((n) => { if (!form[n]) next[n] = REQUIRED_TEXT; });
    // the legacy patterns, checked when the value changes (migrated values such as "Nestlé" stay editable)
    if (!next.clientName && v("clientName") !== original?.clientName && !NAME_PATTERN.test(v("clientName"))) next.clientName = "Letters, spaces and ' @ & # . only";
    if (!next.city && v("city") !== original?.city && !NAME_PATTERN.test(v("city"))) next.city = "Letters, spaces and ' @ & # . only";
    if (!next.phoneNumber && v("phoneNumber") !== original?.phoneNumber && (!PHONE_PATTERN.test(v("phoneNumber")) || v("phoneNumber").length > 15)) next.phoneNumber = "Digits only, up to 15";
    PERCENTAGES.forEach(({ name }) => {
      if (!v(name)) next[name] = REQUIRED_TEXT;
      else if (!PERCENT_PATTERN.test(v(name))) next[name] = "0 – 100";
    });
    if (!next.rate && (Number.isNaN(Number(v("rate"))) || Number(v("rate")) < 0 || v("rate").length > 14)) next.rate = "A number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveClient, { username: user?.userName, ...form, status: form.status === "active" });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.clientName} updated` : `${res.data.clientName} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The client could not be saved");
    }
  };

  // ---- hierarchy ----------------------------------------------------------------------------------------------------
  const loadDivisions = async (client) => {
    setDivisionsLoading(true);
    const res = await PostApi(Admin_API.ClientDivisions, { username: user?.userName, clientId: client.id });
    setDivisions(isSuccess(res) ? res.data || [] : []);
    if (!isSuccess(res)) toast(Labels.status.failure, res?.data || res?.message || "The hierarchy could not be loaded");
    setDivisionsLoading(false);
  };
  const openDivisions = (client) => {
    setDivisionsOf(client);
    setDivisions([]);
    setDivisionSearch("");
    loadDivisions(client);
  };
  const openDivisionForm = (row) => {
    setDivisionErrors({});
    setDivisionForm(row ? { id: row.id, country: row.country, entityName: row.entityName, businessUnit: row.businessUnit, globalBuMapping: row.globalBuMapping }
      : { ...EMPTY_DIVISION, country: divisionsOf?.country || "" });
  };
  const handleDivisionChange = (e) => {
    const { name, value } = e.target;
    setDivisionForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setDivisionErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const afterDivisionChange = () => {
    loadDivisions(divisionsOf);
    reload();
  };
  const handleDivisionSave = async () => {
    const next = {};
    ["country", "entityName", "businessUnit"].forEach((n) => { if (!String(divisionForm[n] || "").trim()) next[n] = REQUIRED_TEXT; });
    setDivisionErrors(next);
    if (Object.keys(next).length) return;
    const res = await PostApi(Admin_API.SaveDivision, { username: user?.userName, clientId: divisionsOf.id, ...divisionForm });
    if (isSuccess(res)) {
      toast(Labels.status.success, divisionForm.id ? "Division updated" : "Division added");
      setDivisionForm(null);
      afterDivisionChange();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The division could not be saved");
    }
  };
  const toggleDivision = async (row) => {
    const res = await PostApi(Admin_API.SetDivisionStatus, { username: user?.userName, clientId: divisionsOf.id, id: row.id, active: !row.status });
    if (isSuccess(res)) afterDivisionChange();
    else toast(Labels.status.failure, res?.data || res?.message || "The status could not be changed");
  };
  const handleDivisionDelete = async () => {
    const row = toDelete;
    setToDelete(null);
    const res = await PostApi(Admin_API.DeleteDivision, { username: user?.userName, clientId: divisionsOf.id, id: row.id });
    if (isSuccess(res)) {
      toast(Labels.status.success, "Division deleted");
      afterDivisionChange();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The division could not be deleted");
    }
  };

  const columns = [
    { field: "clientName", header: "Client", hideable: false },
    { field: "country", header: "Country" },
    { field: "city", header: "City", defaultHidden: true },
    { field: "currency", header: "Currency" },
    { key: "sales", header: "Sales %", render: (r) => `${r.defaultSalesPercentage}% ${(r.salesType || "").toLowerCase()}` },
    { key: "divisions", header: "Divisions", align: "right", render: (r) => r.divisions },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Box sx={{ display: "inline-flex", gap: 0.5 }}>
          <Tooltip title="Hierarchy" arrow>
            <IconButton size="small" aria-label={`Hierarchy of ${r.clientName}`} onClick={() => openDivisions(r)} sx={{ color: PmgColors.indigo }}>
              <AccountTreeOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" aria-label={`Edit ${r.clientName}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
  ];

  const divisionColumns = [
    { field: "country", header: "Country", defaultHidden: true },
    { field: "entityName", header: "Entity", hideable: false },
    { field: "businessUnit", header: "Business unit" },
    { field: "globalBuMapping", header: "Global BU mapping" },
    { key: "contacts", header: "Contacts", align: "right", render: (r) => r.contacts || "—" },
    { key: "enquiries", header: "Enquiries", align: "right", render: (r) => r.enquiries || "—" },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => {
        const used = r.contacts > 0 || r.enquiries > 0;
        return (
          <Box sx={{ display: "inline-flex", gap: 0.5 }}>
            <Tooltip title={r.status ? "Deactivate" : "Activate"} arrow>
              <IconButton size="small" aria-label={`${r.status ? "Deactivate" : "Activate"} ${r.businessUnit}`} onClick={() => toggleDivision(r)} sx={{ color: r.status ? PmgColors.green : "#6b7280" }}>
                {r.status ? <ToggleOnOutlinedIcon fontSize="small" /> : <ToggleOffOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit" arrow>
              <IconButton size="small" aria-label={`Edit ${r.businessUnit}`} onClick={() => openDivisionForm(r)} sx={{ color: PmgColors.navy }}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={used ? "In use: deactivate it instead" : "Delete"} arrow>
              <span>
                <IconButton size="small" aria-label={`Delete ${r.businessUnit}`} onClick={() => setToDelete(r)} disabled={used} sx={{ color: "#b91c1c" }}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      }
    },
  ];

  const text = (name, label, required = false, max = 250) => (
    <PTextField name={name} label={required ? `${label} ${REQUIRED}` : label} value={form[name]} onChange={handleChange} helperText={errors[name]} inputProps={{ maxLength: max }} />
  );
  const dropdown = (name, label, options, extra = {}) => (
    <PDropdown name={name} label={`${label} ${REQUIRED}`} value={form[name]} onChange={handleChange} helperText={errors[name]} options={options} {...extra} />
  );

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Clients" accent={PmgColors.green} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>Clients, their pricing defaults and their hierarchy (divisions).</Box>
        </Box>
        <PButton label="Add client" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)} startIcon={<AddRoundedIcon />} width={170} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search client, country, city" width={280} />
        <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => v && setStatusFilter(v)} aria-label="Status"
          sx={{
            bgcolor: "#fff", height: 40, mt: "7px",
            "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
            "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
          }}>
          {[{ label: "All", value: "all" }, ...STATUS_OPTIONS].map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>{loading ? "Loading…" : `${rows.length} of ${data.rows.length} clients`}</Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.clients" columnChooser
        emptyTitle="No clients found" emptyMessage={search || statusFilter !== "all" ? "No client matches the search or filter." : "Add the first client."} />

      {/* client add / edit */}
      <PDialog open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit client" : "Add client"} maxWidth="md"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }>
        {form && (
          <>
            <SectionTitle>Client</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}>{text("clientName", "Client name", true, 50)}</PGrid>
              <PGrid item xs={12} md={3}>{text("phoneNumber", "Phone number", true, 15)}</PGrid>
              <PGrid item xs={12} md={3}>{dropdown("status", "Status", STATUS_OPTIONS)}</PGrid>
            </PGrid>
            <SectionTitle>Address</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}>{text("addressLine1", "Address line 1", true)}</PGrid>
              <PGrid item xs={12} md={6}>{text("addressLine2", "Address line 2")}</PGrid>
              <PGrid item xs={12} md={6}>{text("addressLine3", "Address line 3")}</PGrid>
              <PGrid item xs={12} md={6}>{text("addressLine4", "Address line 4")}</PGrid>
              <PGrid item xs={12} md={3}>{text("city", "City", true, 50)}</PGrid>
              <PGrid item xs={12} md={3}>{dropdown("country", "Country", optionsWithCurrent(data.countries, form.country), { flag: Labels.flag.auto })}</PGrid>
              <PGrid item xs={12} md={3}>{dropdown("language", "Language", optionsWithCurrent(data.languages, form.language))}</PGrid>
              <PGrid item xs={12} md={3}>{dropdown("currency", "Currency", optionsWithCurrent(data.currencies, form.currency))}</PGrid>
            </PGrid>
            <SectionTitle>Pricing</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={4}>{text("paymentTerm", "Payment term", false, 50)}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("salesType", "Sales percentage type", toOptions(data.salesTypes))}</PGrid>
              <PGrid item xs={12} md={4}>{text("rate", "Swiss franc rate", true, 14)}</PGrid>
              <PGrid item xs={12}>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" } }}>
                  {PERCENTAGES.map(({ name, label }) => <Box key={name} sx={{ minWidth: 0 }}>{text(name, label, true, 14)}</Box>)}
                </Box>
              </PGrid>
            </PGrid>
            <Box sx={{ mt: 1.5, fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
              Print, POSM, promo and gain-share percentages are copied to each new enquiry; the default sales percentage and the rate are used in the calculations from now on.
            </Box>
          </>
        )}
      </PDialog>

      {/* hierarchy */}
      <PDialog open={!!divisionsOf} onClose={() => setDivisionsOf(null)} title={divisionsOf ? `Hierarchy of ${divisionsOf.clientName}` : ""} maxWidth="xl">
        {divisionsOf && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <PSearch value={divisionSearch} onChange={(e) => setDivisionSearch(e.target.value)} onClear={() => setDivisionSearch("")} placeholder="Search entity, business unit" width={280} />
              <Box sx={{ fontSize: 13, color: "#6b7280", flex: "1 1 220px" }}>A division used by contacts or enquiries can be deactivated, not deleted.</Box>
              <PButton label="Add division" variant="contained" color={CommonColors.dark_blue} onClick={() => openDivisionForm(null)} startIcon={<AddRoundedIcon />} width={180} autoLoading={false} />
            </Box>
            <PTable columns={divisionColumns} rows={shownDivisions} loading={divisionsLoading} storageKey="admin.divisions" columnChooser
              emptyTitle={divisionTerm ? "No divisions found" : "No divisions yet"} emptyMessage={divisionTerm ? "No division matches the search." : "Add the first division of this client."} />
          </>
        )}
      </PDialog>

      <PDialog open={!!divisionForm} onClose={() => setDivisionForm(null)} title={divisionForm?.id ? "Edit division" : "Add division"} maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setDivisionForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleDivisionSave} width={150} />
          </Box>
        }>
        {divisionForm && (
          <PGrid container className="g-3">
            <PGrid item xs={12}><PDropdown name="country" label={`Country ${REQUIRED}`} value={divisionForm.country} onChange={handleDivisionChange} helperText={divisionErrors.country} options={optionsWithCurrent(data.countries, divisionForm.country)} flag={Labels.flag.auto} /></PGrid>
            <PGrid item xs={12}><PTextField name="entityName" label={`Entity name ${REQUIRED}`} value={divisionForm.entityName} onChange={handleDivisionChange} helperText={divisionErrors.entityName} inputProps={{ maxLength: 250 }} /></PGrid>
            <PGrid item xs={12}><PTextField name="businessUnit" label={`Business unit ${REQUIRED}`} value={divisionForm.businessUnit} onChange={handleDivisionChange} helperText={divisionErrors.businessUnit} inputProps={{ maxLength: 250 }} /></PGrid>
            <PGrid item xs={12}><PTextField name="globalBuMapping" label="Global BU mapping" value={divisionForm.globalBuMapping} onChange={handleDivisionChange} inputProps={{ maxLength: 250 }} /></PGrid>
          </PGrid>
        )}
      </PDialog>

      <PDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete division?" maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setToDelete(null)} width={130} />
            <PButton label="Delete" variant="contained" color={CommonColors.red?.dark || CommonColors.dark_blue} onClick={handleDivisionDelete} width={150} />
          </Box>
        }>
        {toDelete && <Box sx={{ fontSize: 14, color: "#374151" }}><b>{toDelete.entityName} → {toDelete.businessUnit}</b> ({toDelete.country}) will be removed. No contact or enquiry uses it.</Box>}
      </PDialog>
    </Box>
  );
}
