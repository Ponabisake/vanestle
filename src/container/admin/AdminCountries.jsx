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

const MENU_KEY = "countries";
const REQUIRED = Labels.symbols?.required || "*";
const REQUIRED_TEXT = Labels.commonLabel?.required || "Required";
const STATUS_OPTIONS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }];
const EMPTY = { id: 0, country: "", code: "", currency: "", language: "", regionalSetting: "", timeOffset: "", taxPercentage: "", status: "active" };

// tblCountry.TimeOffset is in minutes with the JavaScript getTimezoneOffset sign: -480 = UTC+08:00
const utcLabel = (offset) => {
  if (offset === null || offset === undefined || offset === "") return "";
  const utc = -Number(offset);
  const abs = Math.abs(utc);
  return `UTC${utc < 0 ? "−" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};
const OFFSET_OPTIONS = (() => {
  const minutes = new Set();
  for (let utc = -720; utc <= 840; utc += 30) minutes.add(utc);
  [345, 525, 765, 825].forEach((m) => minutes.add(m)); // the :45 zones
  return [...minutes].sort((a, b) => a - b).map((utc) => ({ label: utcLabel(-utc), value: String(-utc) }));
})();

const Pill = ({ children, color }) => (
  <Box component="span" sx={{ display: "inline-block", px: 1.25, py: 0.25, borderRadius: "999px", fontSize: 12, fontWeight: 600, color, bgcolor: `${color}14`, whiteSpace: "nowrap" }}>
    {children}
  </Box>
);

const usedTotal = (r) => r.clients + r.divisions + r.contacts + r.suppliers + r.pmgUsers;
const usageText = (r) => [
  [r.clients, "client"], [r.divisions, "division"], [r.contacts, "contact"], [r.suppliers, "supplier"], [r.pmgUsers, "PMG user"], [r.enquiries, "enquiry"],
].filter(([n]) => n > 0).map(([n, w]) => `${n.toLocaleString()} ${w === "enquiry" ? (n === 1 ? "enquiry" : "enquiries") : n === 1 ? w : `${w}s`}`).join(" · ");

/**
 * Admin → Settings → Countries (new; MasterAdmin): tblCountry — code, currency, language, number culture, time zone and
 * tax per country, and whether it is active. Only active countries are offered in the other admin menus. Countries are
 * never deleted; a country stored as text on clients, divisions, contacts, suppliers or PMG users cannot be renamed.
 * The SAP / SPOT / PAPM switches are set on the VAAPI console and only shown here.
 */
export default function AdminCountries() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState({ rows: [], hasFeatureColumns: true });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.Countries, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "Countries could not be loaded");
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
      (!term || [r.country, r.code, r.currency, r.language].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data.rows, search, statusFilter]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const activeCount = (data.rows || []).filter((r) => r.status).length;
  const nameLocked = !!original && usedTotal(original) > 0;

  const openForm = (row) => {
    setErrors({});
    setOriginal(row || null);
    setForm(row
      ? { ...EMPTY, ...row, timeOffset: row.timeOffset === null || row.timeOffset === undefined ? "" : String(row.timeOffset), status: row.status ? "active" : "inactive" }
      : { ...EMPTY });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const handleSave = async () => {
    const next = {};
    const v = (n) => String(form[n] ?? "").trim();
    ["country", "code", "currency", "language", "regionalSetting", "taxPercentage"].forEach((n) => { if (!v(n)) next[n] = REQUIRED_TEXT; });
    if (!form.status) next.status = REQUIRED_TEXT;
    if (!next.code && v("code").toUpperCase() !== (original?.code || "") && !/^[A-Za-z]{2,3}$/.test(v("code"))) next.code = "2 or 3 letters";
    if (!next.taxPercentage && (!/^\d+(\.\d+)?$/.test(v("taxPercentage")) || Number(v("taxPercentage")) > 100)) next.taxPercentage = "0 – 100";
    setErrors(next);
    if (Object.keys(next).length) return;
    const res = await PostApi(Admin_API.SaveCountry, {
      username: user?.userName, ...form, code: v("code").toUpperCase(),
      timeOffset: form.timeOffset === "" ? null : Number(form.timeOffset), status: form.status === "active",
    });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${res.data.country} ${form.id ? "updated" : "added"}`);
      setForm(null);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The country could not be saved");
    }
  };

  const columns = [
    {
      field: "country", header: "Country", hideable: false,
      render: (r) => (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          {r.country}
          <Box component="span" sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{r.code}</Box>
          {r.nameNeedsTrim && (
            <Tooltip title="The stored name has extra spaces or a line break: saving the country cleans it" arrow>
              <span><Pill color="#b45309">Needs cleaning</Pill></span>
            </Tooltip>
          )}
        </Box>
      )
    },
    { field: "currency", header: "Currency" },
    { field: "language", header: "Language" },
    { field: "regionalSetting", header: "Number format", defaultHidden: true },
    { key: "timeOffset", header: "Time zone", render: (r) => utcLabel(r.timeOffset) || "—" },
    { key: "tax", header: "Tax %", align: "right", render: (r) => r.taxPercentage },
    {
      key: "switches", header: "Switches", defaultHidden: true,
      render: (r) => {
        const on = [["SAP", r.sapNeeded], ["SPOT", r.spotNeeded], ["PAPM", r.papmNeeded]].filter(([, v]) => v).map(([k]) => k);
        return on.length ? <Box sx={{ display: "inline-flex", gap: 0.5 }}>{on.map((k) => <Pill key={k} color={PmgColors.indigo}>{k}</Pill>)}</Box> : "—";
      }
    },
    { key: "used", header: "Used by", render: (r) => <Box component="span" sx={{ display: "block", minWidth: 220, maxWidth: 340, whiteSpace: "normal", lineHeight: 1.45, fontSize: 12.5, color: "#4b5563" }}>{usageText(r) || "—"}</Box> },
    { key: "status", header: "Status", render: (r) => <Pill color={r.status ? PmgColors.green : "#6b7280"}>{r.status ? "Active" : "Inactive"}</Pill> },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Tooltip title="Edit" arrow>
          <IconButton size="small" aria-label={`Edit ${r.country}`} onClick={() => openForm(r)} sx={{ color: PmgColors.navy }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
  ];

  const text = (name, label, max, extra = {}) => (
    <PTextField name={name} label={`${label} ${REQUIRED}`} value={form[name]} onChange={handleChange} helperText={errors[name]} inputProps={{ maxLength: max }} {...extra} />
  );

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Countries" accent={PmgColors.purple} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Currency, language, number format, time zone and tax per country. Only active countries are offered in the other admin menus.
          </Box>
        </Box>
        <PButton label="Add country" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)} startIcon={<AddRoundedIcon />} width={180} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search country, code, currency" width={280} />
        <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, val) => val && setStatusFilter(val)} aria-label="Status"
          sx={{
            bgcolor: "#fff", height: 40, mt: "7px",
            "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, color: "#374151", borderColor: "#d1d5db" },
            "& .Mui-selected, & .Mui-selected:hover": { bgcolor: `${PmgColors.navy} !important`, color: "#fff !important" },
          }}>
          {[{ label: "All", value: "all" }, ...STATUS_OPTIONS].map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.rows.length} countries · ${activeCount} active`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.countries" columnChooser
        emptyTitle="No countries found" emptyMessage={search || statusFilter !== "all" ? "No country matches the search or filter." : "Add the first country."} />

      <PDialog open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit ${original?.country || "country"}` : "Add country"} maxWidth="md"
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
                {text("country", "Country", 50, { disabled: nameLocked })}
                {nameLocked && (
                  <Box sx={{ fontSize: 12, color: "#6b7280", mt: 0.5 }}>
                    Used by {usageText(original)}: those records store the name, so it cannot be renamed.
                  </Box>
                )}
              </PGrid>
              <PGrid item xs={12} md={2}>{text("code", "Code", 3)}</PGrid>
              <PGrid item xs={12} md={4}>
                <PDropdown name="status" label={`Status ${REQUIRED}`} value={form.status} onChange={handleChange} helperText={errors.status} options={STATUS_OPTIONS} />
              </PGrid>
              <PGrid item xs={12} md={4}>{text("currency", "Currency", 50)}</PGrid>
              <PGrid item xs={12} md={4}>{text("language", "Language", 50)}</PGrid>
              <PGrid item xs={12} md={4}>{text("taxPercentage", "Tax %", 10, { inputProps: { maxLength: 10, inputMode: "decimal" } })}</PGrid>
              <PGrid item xs={12} md={6}>
                {text("regionalSetting", "Number format (culture)", 50)}
                <Box sx={{ fontSize: 12, color: "#6b7280", mt: 0.5 }}>e.g. en-SG — used for amounts on quotes and purchase orders.</Box>
              </PGrid>
              <PGrid item xs={12} md={6}>
                <PDropdown name="timeOffset" label="Time zone" value={form.timeOffset} onChange={handleChange} options={OFFSET_OPTIONS} />
              </PGrid>
            </PGrid>
            {original && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: "10px", bgcolor: "#f9fafb", fontSize: 12.5, color: "#4b5563", lineHeight: 1.6 }}>
                SAP {original.sapNeeded ? "on" : "off"}
                {data.hasFeatureColumns ? ` · SPOT ${original.spotNeeded ? "on" : "off"} · PAPM ${original.papmNeeded ? "on" : "off"}` : " · SPOT / PAPM not set up in this database yet"}
                {" "}— these switches are managed on the VAAPI console.
                {original.status && form.status === "inactive" && usedTotal(original) > 0 && (
                  <Box sx={{ mt: 0.5, color: "#b45309" }}>
                    Deactivating stops offering {original.country} for new records; the {usageText(original)} keep it.
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </PDialog>
    </Box>
  );
}
