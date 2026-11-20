import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
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

const MENU_KEY = "suppliers";
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const YES_NO = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }];
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const LOGON_PATTERN = /^[a-zA-Z'.\s]{1,90}$/;
const EMAIL_PATTERN = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
const toOptions = (list) => (list || []).map((v) => ({ label: v, value: v }));

const EMPTY_SUPPLIER = {
  id: 0, supplierName: "", supplierNameEn: "", supplierCode: "", supplierType: "", nature: "", smeta: "", gmp: "",
  addressLine1: "", addressLine2: "", addressLine3: "", addressLine4: "", city: "", country: "", language: "", currency: "",
  capability: "", status: "active",
};
const EMPTY_USER = { id: 0, firstName: "", lastName: "", jobTitle: "", email: "", phone: "", notification: "", status: "active", logonId: "", newPassword: "" };

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

const SectionTitle = ({ children }) => (
  <Box sx={{ mt: 1, mb: 0.5, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: PmgColors.navy }}>{children}</Box>
);

/**
 * Admin → Users → Suppliers (legacy Admin/ManageSuppliers.aspx + ManageSupplierUsers.aspx): suppliers and their users.
 * A supplier's status also applies to its users. Supplier users follow the admin-type split: superadmin sets logon ids
 * and passwords, the other admin types the profile. Passwords are never shown.
 */
export default function AdminSuppliers() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], countries: [], languages: [], currencies: [], smetaOptions: [], gmpOptions: [], supplierTypes: [], natures: [], capabilities: [], managesCredentials: false });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  // users of one supplier
  const [usersOf, setUsersOf] = useState(null); // supplier row
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState(null);
  const [userErrors, setUserErrors] = useState({});

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.Suppliers, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Suppliers could not be loaded");
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const capabilityLabel = useMemo(() => new Map((data.capabilities || []).map((c) => [c.value, c.label])), [data.capabilities]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data.rows || []).filter((r) =>
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (countryFilter === "all" || r.country === countryFilter) &&
      (!term || [r.supplierName, r.supplierNameEn, r.supplierCode, r.city].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter, countryFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const credentialsAdmin = data.managesCredentials;

  // ---- supplier form --------------------------------------------------------------------------------------------
  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      ...EMPTY_SUPPLIER, ...row, capability: row.capability > 0 ? row.capability : "", status: row.status ? "active" : "inactive",
    } : { ...EMPTY_SUPPLIER });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const validate = () => {
    const next = {};
    ["supplierName", "addressLine1", "city"].forEach((n) => { if (!String(form[n] || "").trim()) next[n] = REQUIRED_TEXT; });
    ["supplierType", "nature", "smeta", "gmp", "country", "language", "currency", "capability", "status"].forEach((n) => { if (!form[n]) next[n] = REQUIRED_TEXT; });
    if ((form.city || "").trim().length > 50) next.city = "50 characters or fewer";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveSupplier, {
      username: user?.userName, ...form, capability: Number(form.capability), status: form.status === "active",
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.supplierName} updated` : `${res.data.supplierName} added`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The supplier could not be saved");
    }
  };

  // ---- supplier users -------------------------------------------------------------------------------------------
  const loadUsers = async (supplier) => {
    setUsersLoading(true);
    const res = await PostApi(Admin_API.SupplierUsers, { username: user?.userName, supplierId: supplier.id });
    setUsers(isSuccess(res) ? res.data || [] : []);
    if (!isSuccess(res)) toast(Labels.status.failure, res?.data || res?.message || "Supplier users could not be loaded");
    setUsersLoading(false);
  };
  const openUsers = (supplier) => {
    setUsersOf(supplier);
    setUsers([]);
    loadUsers(supplier);
  };
  const openUserForm = (row) => {
    setUserErrors({});
    setUserForm(row ? {
      id: row.id, firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle, email: row.email, phone: row.phone,
      notification: row.receiveNotification ? "yes" : "no", status: row.status ? "active" : "inactive", logonId: row.logonId, newPassword: "",
      originalLogon: row.logonId,
    } : { ...EMPTY_USER });
  };
  const userAdding = userForm?.id === 0;
  const userProfileEditable = userAdding || !credentialsAdmin;
  const userCredentialsEditable = userAdding || credentialsAdmin;
  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setUserErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const validateUser = () => {
    const next = {};
    if (userProfileEditable) {
      if (!userForm.firstName.trim()) next.firstName = REQUIRED_TEXT;
      if (!userForm.email.trim()) next.email = REQUIRED_TEXT;
      else if (!EMAIL_PATTERN.test(userForm.email.trim())) next.email = "Enter a valid email address";
      ["notification", "status"].forEach((n) => { if (!userForm[n]) next[n] = REQUIRED_TEXT; });
    }
    if (userCredentialsEditable) {
      const logon = userForm.logonId.trim();
      if (!logon) next.logonId = REQUIRED_TEXT;
      else if (logon !== userForm.originalLogon && !LOGON_PATTERN.test(logon)) next.logonId = "Letters, spaces, dots and apostrophes only";
    }
    if (credentialsAdmin && userForm.newPassword && userForm.newPassword.trim().length < 4) next.newPassword = "At least 4 characters";
    setUserErrors(next);
    return Object.keys(next).length === 0;
  };
  const handleUserSave = async () => {
    if (!validateUser()) return;
    const res = await PostApi(Admin_API.SaveSupplierUser, {
      username: user?.userName, id: userForm.id, supplierId: usersOf.id,
      firstName: userForm.firstName, lastName: userForm.lastName, jobTitle: userForm.jobTitle, email: userForm.email, phone: userForm.phone,
      receiveNotification: userForm.notification ? userForm.notification === "yes" : null,
      status: userForm.status ? userForm.status === "active" : null,
      logonId: userForm.logonId, newPassword: credentialsAdmin ? userForm.newPassword : "",
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, userAdding
        ? `${res.data.firstName} added${credentialsAdmin && userForm.newPassword ? "" : ": first sign-in with the default password"}`
        : `${res.data.firstName} updated`);
      setUserForm(null);
      loadUsers(usersOf);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The supplier user could not be saved");
    }
  };

  const columns = [
    { field: "supplierName", header: "Supplier", hideable: false },
    { field: "supplierCode", header: "Code", render: (r) => r.supplierCode || <Box component="span" sx={{ color: "#9ca3af" }}>—</Box> },
    { field: "country", header: "Country" },
    { field: "city", header: "City", defaultHidden: true },
    { key: "capability", header: "Capability", render: (r) => capabilityLabel.get(r.capability) || "—" },
    { field: "supplierType", header: "Type" },
    { field: "nature", header: "Nature", defaultHidden: true },
    { key: "users", header: "Users", align: "right", render: (r) => r.users },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Box sx={{ display: "inline-flex", gap: 0.5 }}>
          <Tooltip title="Users" arrow>
            <IconButton size="small" aria-label={`Users of ${r.supplierName}`} onClick={() => openUsers(r)} sx={{ color: PmgColors.indigo }}>
              <GroupOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" aria-label={`Edit ${r.supplierName}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
  ];

  const userColumns = [
    { key: "name", header: "Name", hideable: false, render: (r) => `${r.firstName} ${r.lastName}`.trim() },
    { field: "logonId", header: "Logon ID" },
    { field: "email", header: "Email" },
    { key: "notification", header: "Notifications", render: (r) => (r.receiveNotification ? "Yes" : "No") },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.firstName}`} onClick={() => openUserForm(r)} sx={{ color: PmgColors.navy }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
  ];

  const dropdown = (name, label, options, extra = {}) => (
    <PDropdown name={name} label={`${label} ${REQUIRED}`} value={form[name]} onChange={handleChange} helperText={errors[name]} options={options} {...extra} />
  );
  const text = (name, label, required = false, max = 250) => (
    <PTextField name={name} label={required ? `${label} ${REQUIRED}` : label} value={form[name]} onChange={handleChange} helperText={errors[name]} inputProps={{ maxLength: max }} />
  );

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Suppliers" accent={PmgColors.indigo} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>Suppliers and their users. Setting a supplier inactive also deactivates its users.</Box>
        </Box>
        <PButton label="Add supplier" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)} startIcon={<AddRoundedIcon />} width={180} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search name, code, city" width={280} />
        <Box sx={{ width: 220, mt: "7px" }}>
          <PDropdown name="countryFilter" label="" labelMode="inside" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value || "all")}
            options={[{ label: "All countries", value: "all" }, ...toOptions(data.countries)]} />
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
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} suppliers`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.suppliers"
        emptyTitle="No suppliers found" emptyMessage={search || countryFilter !== "all" || statusFilter !== "all" ? "No supplier matches the search or filters." : "Add the first supplier."} />

      {/* supplier add / edit */}
      <PDialog open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit supplier" : "Add supplier"} maxWidth="md"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }>
        {form && (
          <>
            <SectionTitle>Supplier</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}>{text("supplierName", "Supplier name", true)}</PGrid>
              <PGrid item xs={12} md={6}>{text("supplierNameEn", "Supplier name (English)")}</PGrid>
              <PGrid item xs={12} md={4}>{text("supplierCode", "Supplier code", false, 50)}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("supplierType", "Supplier type", toOptions(data.supplierTypes))}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("nature", "Nature of supplier", toOptions(data.natures))}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("smeta", "SMETA accredited", toOptions(data.smetaOptions))}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("gmp", "GMP accredited", toOptions(data.gmpOptions))}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("capability", "Production capability", (data.capabilities || []).map((c) => ({ label: c.label, value: c.value })))}</PGrid>
            </PGrid>
            <SectionTitle>Address</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}>{text("addressLine1", "Address line 1", true)}</PGrid>
              <PGrid item xs={12} md={6}>{text("addressLine2", "Address line 2")}</PGrid>
              <PGrid item xs={12} md={6}>{text("addressLine3", "Address line 3")}</PGrid>
              <PGrid item xs={12} md={6}>{text("addressLine4", "Address line 4")}</PGrid>
              <PGrid item xs={12} md={4}>{text("city", "City", true, 50)}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("country", "Country", optionsWithCurrent(data.countries, form.country), { flag: Labels.flag.auto })}</PGrid>
              <PGrid item xs={12} md={4}>{dropdown("status", "Status", STATUS_OPTIONS)}</PGrid>
              <PGrid item xs={12} md={6}>{dropdown("language", "Language", optionsWithCurrent(data.languages, form.language))}</PGrid>
              <PGrid item xs={12} md={6}>{dropdown("currency", "Currency", optionsWithCurrent(data.currencies, form.currency))}</PGrid>
            </PGrid>
            {form.id > 0 && form.status === "inactive" && (
              <Box sx={{ mt: 1.5, fontSize: 12.5, color: "#b45309" }}>Saving as inactive also deactivates this supplier's users and their sign-in.</Box>
            )}
          </>
        )}
      </PDialog>

      {/* users of one supplier */}
      <PDialog open={!!usersOf} onClose={() => setUsersOf(null)} title={usersOf ? `Users of ${usersOf.supplierName}` : ""} maxWidth="lg">
        {usersOf && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ fontSize: 13, color: "#6b7280" }}>
                {credentialsAdmin ? "As superadmin you manage logon IDs and passwords." : "Logon IDs and passwords are managed by the superadmin account."}
              </Box>
              <PButton label="Add user" variant="contained" color={CommonColors.dark_blue} onClick={() => openUserForm(null)} startIcon={<AddRoundedIcon />} width={150} autoLoading={false} />
            </Box>
            <PTable columns={userColumns} rows={users} loading={usersLoading} showPagination={false} storageKey="admin.supplierUsers"
              emptyTitle="No users yet" emptyMessage="Add the first user of this supplier." />
          </>
        )}
      </PDialog>

      {/* supplier user add / edit */}
      <PDialog open={!!userForm} onClose={() => setUserForm(null)} title={userAdding ? "Add supplier user" : "Edit supplier user"} maxWidth="md"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setUserForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleUserSave} width={150} />
          </Box>
        }>
        {userForm && (
          <>
            <SectionTitle>Profile</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}><PTextField name="firstName" label={`First name ${REQUIRED}`} value={userForm.firstName} onChange={handleUserChange} helperText={userErrors.firstName} disabled={!userProfileEditable} inputProps={{ maxLength: 50 }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="lastName" label="Last name" value={userForm.lastName} onChange={handleUserChange} disabled={!userProfileEditable} inputProps={{ maxLength: 50 }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="jobTitle" label="Job title" value={userForm.jobTitle} onChange={handleUserChange} disabled={!userProfileEditable} inputProps={{ maxLength: 50 }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="email" label={`Email ${REQUIRED}`} value={userForm.email} onChange={handleUserChange} helperText={userErrors.email} disabled={!userProfileEditable} inputProps={{ maxLength: 50 }} /></PGrid>
              <PGrid item xs={12} md={4}><PTextField name="phone" label="Phone number" value={userForm.phone} onChange={handleUserChange} disabled={!userProfileEditable} inputProps={{ maxLength: 50 }} /></PGrid>
              <PGrid item xs={12} md={4}><PDropdown name="notification" label={`Receive notifications ${REQUIRED}`} value={userForm.notification} onChange={handleUserChange} helperText={userErrors.notification} readOnly={!userProfileEditable} options={YES_NO} /></PGrid>
              <PGrid item xs={12} md={4}><PDropdown name="status" label={`Status ${REQUIRED}`} value={userForm.status} onChange={handleUserChange} helperText={userErrors.status} readOnly={!userProfileEditable} options={STATUS_OPTIONS} /></PGrid>
            </PGrid>
            <SectionTitle>Sign-in</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}><PTextField name="logonId" label={`Logon ID ${REQUIRED}`} value={userForm.logonId} onChange={handleUserChange} helperText={userErrors.logonId} disabled={!userCredentialsEditable} inputProps={{ maxLength: 90 }} /></PGrid>
              <PGrid item xs={12} md={6}>
                {credentialsAdmin ? (
                  <PTextField name="newPassword" label={userAdding ? "Password" : "New password"} value={userForm.newPassword} onChange={handleUserChange}
                    helperText={userErrors.newPassword} flag={Labels.flag.password} placeHolder={userAdding ? "Empty: the default password" : "Empty: keep the current password"} />
                ) : (
                  <Box sx={{ fontSize: 13, color: "#6b7280", pt: { md: 4 } }}>
                    {userAdding ? "The user signs in first with the default password and then sets their own." : "Passwords are set by the superadmin account."}
                  </Box>
                )}
              </PGrid>
            </PGrid>
          </>
        )}
      </PDialog>
    </Box>
  );
}
