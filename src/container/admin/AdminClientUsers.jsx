import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
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

const MENU_KEY = "clientUsers";
const MAX = 50;
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const YES_NO = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }];
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const LOGON_PATTERN = /^[a-zA-Z'.\s]{1,90}$/;
const EMAIL_PATTERN = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

const SectionTitle = ({ children, locked }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, mb: 0.5, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: PmgColors.navy }}>
    {children}
    {locked && <Tooltip title={locked} arrow><LockOutlinedIcon sx={{ fontSize: 15, color: "#9ca3af" }} /></Tooltip>}
  </Box>
);

/**
 * Admin → Users → PMG VANestle Client Users (legacy Admin/ManageClientContact.aspx): the client contacts and their sign-in.
 * Edit only (contacts are created with the client). MasterAdmin / Admin manage the profile; superadmin manages the logon
 * id and password. Passwords are never shown.
 */
export default function AdminClientUsers() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], positions: [], managesCredentials: false });
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
    PostApi(Admin_API.ClientUsers, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Client users could not be loaded");
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const countries = useMemo(() => [...new Set((data.rows || []).map((r) => r.country).filter(Boolean))].sort(), [data.rows]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data.rows || []).filter((r) =>
      (statusFilter === "all" || (statusFilter === "active") === r.status) &&
      (countryFilter === "all" || r.country === countryFilter) &&
      (!term || [r.firstName, r.lastName, `${r.firstName} ${r.lastName}`, r.logonId, r.email, r.client, r.division]
        .some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter, countryFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const credentialsAdmin = data.managesCredentials;

  const openForm = (row) => {
    setErrors({});
    setForm({
      id: row.id, firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle, jobPosition: row.jobPosition,
      email: row.email, phone: row.phone, notification: row.receiveNotification ? "yes" : "no",
      status: row.status ? "active" : "inactive", logonId: row.logonId, newPassword: "", division: row.division, businessUnit: row.businessUnit,
      originalLogon: row.logonId,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (credentialsAdmin) {
      const logon = form.logonId.trim();
      if (!logon) next.logonId = REQUIRED_TEXT;
      else if (logon !== form.originalLogon && !LOGON_PATTERN.test(logon)) next.logonId = "Letters, spaces, dots and apostrophes only";
      if (form.newPassword && form.newPassword.trim().length < 4) next.newPassword = "At least 4 characters";
    } else {
      [["firstName", true], ["lastName", true], ["jobTitle", false], ["email", true], ["phone", false]].forEach(([name, required]) => {
        const v = (form[name] || "").trim();
        if (required && !v) next[name] = REQUIRED_TEXT;
        else if (v.length > MAX) next[name] = `${MAX} characters or fewer`;
      });
      if (!next.email && !EMAIL_PATTERN.test(form.email.trim())) next.email = "Enter a valid email address";
      ["jobPosition", "notification", "status"].forEach((name) => { if (!form[name]) next[name] = REQUIRED_TEXT; });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const res = await PostApi(Admin_API.SaveClientUser, {
      username: user?.userName,
      id: form.id,
      firstName: form.firstName, lastName: form.lastName, jobTitle: form.jobTitle, jobPosition: form.jobPosition,
      email: form.email, phone: form.phone,
      receiveNotification: form.notification ? form.notification === "yes" : null,
      status: form.status ? form.status === "active" : null,
      logonId: form.logonId,
      newPassword: credentialsAdmin ? form.newPassword : "",
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${`${res.data.firstName} ${res.data.lastName}`.trim()} updated`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The client user could not be saved");
    }
  };

  const columns = [
    { key: "name", header: "Name", hideable: false, render: (r) => `${r.firstName} ${r.lastName}`.trim() },
    { field: "logonId", header: "Logon ID" },
    { field: "client", header: "Client", render: (r) => r.client || <Box component="span" sx={{ color: "#9ca3af" }}>—</Box> },
    { field: "country", header: "Country" },
    { field: "businessUnit", header: "Business unit" },
    { field: "jobPosition", header: "Position" },
    { field: "email", header: "Email", defaultHidden: true },
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

  const profileLocked = credentialsAdmin ? "Profile details are managed by Master / Admin accounts" : "";
  const credentialsLocked = credentialsAdmin ? "" : "Logon ID and password are managed by the superadmin account";

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ mb: 2.5 }}>
        <PSectionHeading label="PMG VANestle Client Users" accent={PmgColors.indigo} />
        <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
          Client contacts and their sign-in. Contacts are created with the client; here they are edited or set inactive.
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search name, logon ID, client" width={280} />
        <Box sx={{ width: 220, mt: "7px" }}>
          <PDropdown name="countryFilter" label="" labelMode="inside" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value || "all")}
            options={[{ label: "All countries", value: "all" }, ...countries.map((c) => ({ label: c, value: c }))]} />
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
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} client users`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.clientUsers"
        emptyTitle="No client users found" emptyMessage={search || countryFilter !== "all" || statusFilter !== "all" ? "No client user matches the search or filters." : "Client users appear here once clients have contacts."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title="Edit client user"
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
            <Box sx={{ mb: 1.5, p: 1.5, borderRadius: "10px", bgcolor: "#f9fafb", border: "1px solid #ECEAF3", fontSize: 13, color: "#374151" }}>
              <b>Division:</b> {form.division || "— (no division found)"}
            </Box>

            <SectionTitle locked={profileLocked}>Profile</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}><PTextField name="firstName" label={`First name ${REQUIRED}`} value={form.firstName} onChange={handleChange} helperText={errors.firstName} disabled={credentialsAdmin} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="lastName" label={`Last name ${REQUIRED}`} value={form.lastName} onChange={handleChange} helperText={errors.lastName} disabled={credentialsAdmin} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="jobTitle" label="Job title" value={form.jobTitle} onChange={handleChange} helperText={errors.jobTitle} disabled={credentialsAdmin} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PDropdown name="jobPosition" label={`Job position ${REQUIRED}`} value={form.jobPosition} onChange={handleChange} helperText={errors.jobPosition} readOnly={credentialsAdmin} options={data.positions.map((p) => ({ label: p, value: p }))} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="email" label={`Email ${REQUIRED}`} value={form.email} onChange={handleChange} helperText={errors.email} disabled={credentialsAdmin} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PTextField name="phone" label="Phone number" value={form.phone} onChange={handleChange} helperText={errors.phone} disabled={credentialsAdmin} inputProps={{ maxLength: MAX }} /></PGrid>
              <PGrid item xs={12} md={6}><PDropdown name="notification" label={`Receive notifications ${REQUIRED}`} value={form.notification} onChange={handleChange} helperText={errors.notification} readOnly={credentialsAdmin} options={YES_NO} /></PGrid>
              <PGrid item xs={12} md={6}><PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status} onChange={handleChange} helperText={errors.status} readOnly={credentialsAdmin} options={STATUS_OPTIONS} /></PGrid>
            </PGrid>

            <SectionTitle locked={credentialsLocked}>Sign-in</SectionTitle>
            <PGrid container className="g-3">
              <PGrid item xs={12} md={6}><PTextField name="logonId" label={`Logon ID ${REQUIRED}`} value={form.logonId} onChange={handleChange} helperText={errors.logonId} disabled={!credentialsAdmin} inputProps={{ maxLength: 90 }} /></PGrid>
              <PGrid item xs={12} md={6}>
                {credentialsAdmin ? (
                  <PTextField name="newPassword" label="New password" value={form.newPassword} onChange={handleChange}
                    helperText={errors.newPassword} flag={Labels.flag.password} placeHolder="Empty: keep the current password" />
                ) : (
                  <Box sx={{ fontSize: 13, color: "#6b7280", pt: { md: 4 } }}>Passwords are set by the superadmin account.</Box>
                )}
              </PGrid>
            </PGrid>
          </>
        )}
      </PDialog>
    </Box>
  );
}
