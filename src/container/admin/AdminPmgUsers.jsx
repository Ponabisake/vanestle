import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Checkbox, FormControlLabel, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
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
import { optionsWithCurrent } from "./adminOptions";

const MENU_KEY = "pmgUsers";
const MAX = 50;
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const YES_NO = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }];
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const LOGON_PATTERN = /^[a-zA-Z'.\s]{1,90}$/;
const EMAIL_PATTERN = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
const EMPTY_FORM = {
  id: 0, firstName: "", lastName: "", jobTitle: "", jobRole: "", jobPosition: "", country: "", email: "", phone: "",
  quote: "", order: "", status: "active", reportEnabled: false, logonId: "", newPassword: "", clientIds: [],
};

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

const SectionTitle = ({ children, locked }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, mb: 0.5, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: PmgColors.navy }}>
    {children}
    {locked && (
      <Tooltip title={locked} arrow><LockOutlinedIcon sx={{ fontSize: 15, color: "#9ca3af" }} /></Tooltip>
    )}
  </Box>
);

/**
 * Admin → Users → PMG VANestle Users (legacy Admin/ManagePmgUsers.aspx): agency users and their logins. MasterAdmin /
 * Admin manage the profile; superadmin manages the credentials (logon id, password, report access). Passwords are
 * never shown: new users get the default password (they change it at the first sign-on) unless a superadmin sets one.
 */
export default function AdminPmgUsers() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], countries: [], clients: [], roles: [], positions: [], managesCredentials: false });
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
    PostApi(Admin_API.PmgUsers, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "PMG users could not be loaded");
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const clientName = useMemo(() => new Map((data.clients || []).map((c) => [c.id, c.name])), [data.clients]);
  const roleLabel = (value) => (data.roles || []).find((r) => r.value === value)?.label || value;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data.rows || []).filter((r) =>
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (countryFilter === "all" || r.country === countryFilter) &&
      (!term || [r.firstName, r.lastName, `${r.firstName} ${r.lastName}`, r.logonId, r.email, r.jobTitle]
        .some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter, countryFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const credentialsAdmin = data.managesCredentials;
  const adding = form?.id === 0;
  // the legacy split: superadmin edits credentials, the other admin types the profile (both when adding)
  const profileEditable = adding || !credentialsAdmin;
  const credentialsEditable = adding || credentialsAdmin;

  const openForm = (row) => {
    setErrors({});
    setForm(row ? {
      id: row.id, firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle, jobRole: row.jobRole,
      jobPosition: row.jobPosition, country: row.country, email: row.email, phone: row.phone,
      quote: row.receiveQuoteNotification ? "yes" : "no", order: row.receiveOrderNotification ? "yes" : "no",
      status: row.status ? "active" : "inactive", reportEnabled: row.reportEnabled, logonId: row.logonId,
      newPassword: "", clientIds: [...row.clientIds],
    } : { ...EMPTY_FORM });
  };

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const handleChange = (e) => set(e.target.name, e.target.value ?? "");

  const toggleClient = (id) =>
    set("clientIds", form.clientIds.includes(id) ? form.clientIds.filter((c) => c !== id) : [...form.clientIds, id]);

  const validate = () => {
    const next = {};
    if (profileEditable) {
      [["firstName", true], ["lastName", true], ["jobTitle", false], ["email", true], ["phone", false]].forEach(([name, required]) => {
        const v = (form[name] || "").trim();
        if (required && !v) next[name] = REQUIRED_TEXT;
        else if (v.length > MAX) next[name] = `${MAX} characters or fewer`;
      });
      if (!next.email && !EMAIL_PATTERN.test(form.email.trim())) next.email = "Enter a valid email address";
      ["country", "jobRole", "jobPosition", "quote", "order", "status"].forEach((name) => { if (!form[name]) next[name] = REQUIRED_TEXT; });
    }
    if (credentialsEditable) {
      const logon = form.logonId.trim();
      const original = data.rows.find((r) => r.id === form.id)?.logonId;
      if (!logon) next.logonId = REQUIRED_TEXT;
      else if (logon !== original && !LOGON_PATTERN.test(logon)) next.logonId = "Letters, spaces, dots and apostrophes only";
    }
    if (credentialsAdmin && form.newPassword && form.newPassword.trim().length < 4) next.newPassword = "At least 4 characters";
    if (form.clientIds.length === 0) next.clientIds = "Choose at least one client";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SavePmgUser, {
      username: user?.userName,
      id: form.id,
      firstName: form.firstName, lastName: form.lastName, jobTitle: form.jobTitle, jobRole: form.jobRole,
      jobPosition: form.jobPosition, country: form.country, email: form.email, phone: form.phone,
      receiveQuoteNotification: form.quote ? form.quote === "yes" : null,
      receiveOrderNotification: form.order ? form.order === "yes" : null,
      status: form.status ? form.status === "active" : null,
      reportEnabled: form.reportEnabled,
      logonId: form.logonId,
      newPassword: credentialsAdmin ? form.newPassword : "",
      clientIds: form.clientIds,
    });
    if (isSuccess(res)) {
      const name = `${res.data.firstName} ${res.data.lastName}`.trim();
      toast(Labels.status.success, adding
        ? `${name} added${credentialsAdmin && form.newPassword ? "" : `: first sign-in with the default password`}`
        : `${name} updated`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The user could not be saved");
    }
  };

  // clients of the chosen country, plus any client already linked from elsewhere
  const formClients = form
    ? (data.clients || []).filter((c) => c.country === form.country || form.clientIds.includes(c.id))
    : [];
  const orphanIds = form ? form.clientIds.filter((id) => !clientName.has(id)) : [];

  const columns = [
    { key: "name", header: "Name", hideable: false, render: (r) => `${r.firstName} ${r.lastName}`.trim() },
    { field: "logonId", header: "Logon ID" },
    { key: "role", header: "Job role", render: (r) => roleLabel(r.jobRole) },
    { key: "position", header: "Position", render: (r) => (r.jobPosition === "Teamlead" ? <Pill color={PmgColors.purple}>Team lead</Pill> : "—") },
    { field: "country", header: "Country" },
    { field: "email", header: "Email" },
    { key: "clients", header: "Clients", render: (r) => r.clientIds.map((id) => clientName.get(id) || `#${id}`).join(", ") || "—", defaultHidden: true },
    { field: "lastLogon", header: "Last sign-in", defaultHidden: true },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.firstName} ${r.lastName}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
  ];

  const lockedProfile = profileEditable ? "" : "Profile details are managed by Master / Admin accounts";
  const lockedCredentials = credentialsEditable ? "" : "Logon ID and password are managed by the superadmin account";

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="PMG VANestle Users" accent={PmgColors.indigo} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Agency users and their sign-in. {credentialsAdmin ? "As superadmin you manage logon IDs, passwords and report access." : "Logon IDs and passwords are managed by the superadmin account."}
          </Box>
        </Box>
        <PButton label="Add PMG user" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
          startIcon={<AddRoundedIcon />} width={190} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search name, logon ID, email" width={280} />
        <Box sx={{ width: 220, mt: "7px" }}>
          <PDropdown name="countryFilter" label="" labelMode="inside" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value || "all")}
            options={[{ label: "All countries", value: "all" }, ...data.countries.map((c) => ({ label: c, value: c }))]} />
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
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} users`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.pmgUsers"
        emptyTitle="No users found" emptyMessage={search || countryFilter !== "all" || statusFilter !== "all" ? "No user matches the search or filters." : "Add the first PMG user."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={adding ? "Add PMG user" : "Edit PMG user"}
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
            <SectionTitle locked={lockedProfile}>Profile</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}><PTextField name="firstName" label={`First name ${REQUIRED}`} value={form.firstName} onChange={handleChange} helperText={errors.firstName} disabled={!profileEditable} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="lastName" label={`Last name ${REQUIRED}`} value={form.lastName} onChange={handleChange} helperText={errors.lastName} disabled={!profileEditable} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="jobTitle" label="Job title" value={form.jobTitle} onChange={handleChange} helperText={errors.jobTitle} disabled={!profileEditable} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={3}><PDropdown name="jobRole" label={`Job role ${REQUIRED}`} value={form.jobRole} onChange={handleChange} helperText={errors.jobRole} readOnly={!profileEditable} options={data.roles.map((r) => ({ label: r.label, value: r.value }))} /></PGrid>
              <PGrid item xs={12} md={3}><PDropdown name="jobPosition" label={`Job position ${REQUIRED}`} value={form.jobPosition} onChange={handleChange} helperText={errors.jobPosition} readOnly={!profileEditable} options={data.positions.map((p) => ({ label: p === "Teamlead" ? "Team lead" : p, value: p }))} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="email" label={`Email ${REQUIRED}`} value={form.email} onChange={handleChange} helperText={errors.email} disabled={!profileEditable} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="phone" label="Phone number" value={form.phone} onChange={handleChange} helperText={errors.phone} disabled={!profileEditable} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={4}><PDropdown name="country" label={`Country ${REQUIRED}`} value={form.country} onChange={handleChange} helperText={errors.country} readOnly={!profileEditable} options={optionsWithCurrent(data.countries, form.country)} flag={Labels.flag.auto} /></PGrid>
              <PGrid item xs={12} md={4}><PDropdown name="quote" label={`Quote notifications ${REQUIRED}`} value={form.quote} onChange={handleChange} helperText={errors.quote} readOnly={!profileEditable} options={YES_NO} /></PGrid>
              <PGrid item xs={12} md={4}><PDropdown name="order" label={`Order notifications ${REQUIRED}`} value={form.order} onChange={handleChange} helperText={errors.order} readOnly={!profileEditable} options={YES_NO} /></PGrid>
              <PGrid item xs={12} md={4}><PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status} onChange={handleChange} helperText={errors.status} readOnly={!profileEditable} options={STATUS_OPTIONS} /></PGrid>
            </PGrid>

            <SectionTitle locked={lockedCredentials}>Sign-in</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}><PTextField name="logonId" label={`Logon ID ${REQUIRED}`} value={form.logonId} onChange={handleChange} helperText={errors.logonId} disabled={!credentialsEditable} inputProps={{ maxLength: 90 }} /></PGrid>
              <PGrid item xs={12} md={6}>
                {credentialsAdmin ? (
                  <PTextField name="newPassword" label={adding ? "Password" : "New password"} value={form.newPassword} onChange={handleChange}
                    helperText={errors.newPassword} flag={Labels.flag.password} placeHolder={adding ? "Empty: the default password" : "Empty: keep the current password"} />
                ) : (
                  <Box sx={{ fontSize: 13, color: "#6b7280", pt: { md: 4 } }}>
                    {adding ? "The user signs in first with the default password and then sets their own." : "Passwords are set by the superadmin account."}
                  </Box>
                )}
              </PGrid>
              <PGrid item xs={12}>
                <FormControlLabel
                  control={<Checkbox checked={!!form.reportEnabled} onChange={(e) => set("reportEnabled", e.target.checked)} disabled={!credentialsEditable} />}
                  label={<Box sx={{ fontSize: 14 }}>Report access (VA Reports)</Box>}
                />
              </PGrid>
            </PGrid>

            <SectionTitle>Client members {REQUIRED}</SectionTitle>
            <Box sx={{ fontSize: 12.5, color: "#6b7280", mb: 1 }}>
              {form.country ? `Active clients in ${form.country}. The user sees enquiries of the clients ticked here.` : "Choose the country first."}
            </Box>
            <Box role="group" aria-label="Client members" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {formClients.map((c) => {
                const on = form.clientIds.includes(c.id);
                return (
                  <Box key={c.id} component="button" type="button" aria-pressed={on} onClick={() => toggleClient(c.id)}
                    sx={{
                      px: 1.75, py: 0.6, borderRadius: "999px", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                      border: `1.5px solid ${on ? PmgColors.navy : "#d1d5db"}`, bgcolor: on ? PmgColors.navy : "#fff", color: on ? "#fff" : "#374151",
                    }}>
                    {c.name}{c.country !== form.country ? ` (${c.country})` : ""}
                  </Box>
                );
              })}
              {orphanIds.map((id) => (
                <Box key={id} component="button" type="button" aria-pressed onClick={() => toggleClient(id)}
                  sx={{ px: 1.75, py: 0.6, borderRadius: "999px", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, border: "1.5px solid #9ca3af", bgcolor: "#f3f4f6", color: "#374151" }}>
                  Inactive client #{id} ×
                </Box>
              ))}
              {form.country && formClients.length === 0 && orphanIds.length === 0 && (
                <Box sx={{ fontSize: 13, color: "#9ca3af" }}>No active client in {form.country}.</Box>
              )}
            </Box>
            {errors.clientIds && <Box role="alert" sx={{ mt: 1, fontSize: 12.5, color: "#d32f2f" }}>{errors.clientIds}</Box>}
          </>
        )}
      </PDialog>
    </Box>
  );
}
