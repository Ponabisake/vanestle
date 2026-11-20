import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Skeleton } from "@mui/material";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PButton from "../../component/PButton/PButton";
import PDialog from "../../component/PDialog/PDialog";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { setMaintenanceMode } from "../../utils/api/siteStatus";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MENU_KEY = "siteSettings";

const MODES = [
  {
    value: true, label: "Maintenance mode ON", icon: ConstructionOutlinedIcon, color: PmgColors.orange,
    text: "Only admin console users can sign in and use the site. Everyone else sees the maintenance notice on the login page and is signed out.",
  },
  {
    value: false, label: "Maintenance mode OFF", icon: PublicOutlinedIcon, color: PmgColors.green,
    text: "The site is open to all users as normal.",
  },
];

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Admin → Settings → Site Settings (legacy Admin/ManageSite.aspx, MasterAdmin only): maintenance mode on / off.
 * Saving applies to every request at once (the API enforces it, see MaintenanceModeMiddleware).
 */
export default function AdminSiteSettings() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [saved, setSaved] = useState(null); // { maintenanceMode, updatedBy, updatedOn }
  const [choice, setChoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [confirmOn, setConfirmOn] = useState(false);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.SiteSettings, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) {
        setSaved(res.data);
        setChoice(res.data.maintenanceMode);
      } else {
        setLoadError(res?.data || res?.message || "Site settings could not be loaded");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const changed = saved && choice !== null && choice !== saved.maintenanceMode;

  const save = async () => {
    setConfirmOn(false);
    const res = await PostApi(Admin_API.SaveSiteSettings, { username: user?.userName, maintenanceMode: choice });
    if (isSuccess(res)) {
      setSaved(res.data);
      setChoice(res.data.maintenanceMode);
      setMaintenanceMode(res.data.maintenanceMode);
      toast(Labels.status.success, res.data.maintenanceMode
        ? "Maintenance mode is ON. Only admins can use the site now."
        : "Maintenance mode is OFF. The site is open to all users.");
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "Site settings could not be saved");
    }
  };

  // turning maintenance on signs everyone else out at once: confirm first
  const handleSave = () => (choice ? setConfirmOn(true) : save());

  return (
    <Box sx={{ py: 4, maxWidth: 860 }}>
      <Box sx={{ mb: 3 }}>
        <PSectionHeading label="Site Settings" accent={PmgColors.purple} />
      </Box>

      <Box sx={{ bgcolor: "#fff", borderRadius: "12px", border: "1px solid #ECEAF3", boxShadow: `0 4px 14px ${PmgColors.navy}0F`, overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #ECEAF3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Box sx={{ fontSize: 17, fontWeight: 700, color: PmgColors.navy }}>Site mode</Box>
            <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.25 }}>
              {saved?.updatedBy
                ? `Last changed by ${saved.updatedBy}${saved.updatedOn ? ` on ${formatDate(saved.updatedOn)}` : ""}`
                : "Not changed in the admin console yet (the server's default applies)."}
            </Box>
          </Box>
          {saved && (
            <Box sx={{
              px: 1.5, py: 0.5, borderRadius: "999px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
              color: saved.maintenanceMode ? PmgColors.orange : PmgColors.green,
              bgcolor: `${saved.maintenanceMode ? PmgColors.orange : PmgColors.green}1A`,
            }}>
              {saved.maintenanceMode ? "Currently: maintenance" : "Currently: open"}
            </Box>
          )}
        </Box>

        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <Skeleton variant="rounded" height={128} />
              <Skeleton variant="rounded" height={128} />
            </Box>
          ) : loadError ? (
            <Box role="alert" sx={{ color: "#b91c1c", fontSize: 14 }}>{loadError}</Box>
          ) : (
            <Box role="radiogroup" aria-label="Site mode" sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {MODES.map((mode) => {
                const selected = choice === mode.value;
                const Icon = mode.icon;
                return (
                  <Box
                    key={String(mode.value)}
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setChoice(mode.value)}
                    sx={{
                      textAlign: "left", cursor: "pointer", fontFamily: "inherit", p: 2, borderRadius: "12px",
                      border: `2px solid ${selected ? mode.color : "#E5E7EB"}`,
                      bgcolor: selected ? `${mode.color}0D` : "#fff",
                      boxShadow: selected ? `0 0 0 3px ${mode.color}1F` : "none",
                      transition: "border-color .15s, box-shadow .15s",
                      "&:hover": { borderColor: mode.color },
                      "&:focus-visible": { outline: `2px solid ${PmgColors.navy}`, outlineOffset: 2 },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${mode.color}1A`, color: mode.color }}>
                        <Icon fontSize="small" />
                      </Box>
                      <Box sx={{ fontSize: 15, fontWeight: 700, color: PmgColors.navy }}>{mode.label}</Box>
                    </Box>
                    <Box sx={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>{mode.text}</Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: "1px solid #ECEAF3", display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
          <PButton
            label="Discard"
            variant="outlined"
            color={CommonColors.dark_blue}
            onClick={() => setChoice(saved?.maintenanceMode ?? null)}
            disabled={!changed}
            width={130}
          />
          <PButton label="Save changes" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} disabled={!changed} width={180} />
        </Box>
      </Box>

      <PDialog
        open={confirmOn}
        onClose={() => setConfirmOn(false)}
        title="Turn maintenance mode on?"
        maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setConfirmOn(false)} width={130} />
            <PButton label="Turn on" variant="contained" color={CommonColors.red?.dark || CommonColors.dark_blue} onClick={save} width={150} />
          </Box>
        }
      >
        <Box sx={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          Every user who is not an admin is signed out straight away and cannot sign in or use the site until maintenance mode
          is turned off again. Admin console users keep working as normal.
        </Box>
      </PDialog>
    </Box>
  );
}
