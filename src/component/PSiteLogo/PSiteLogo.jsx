import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, Tooltip } from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VALogo from "../../utils/assets/images/valogo.svg";
import PDialog from "../PDialog/PDialog";
import PButton from "../PButton/PButton";
import { GetFileApi, PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { PmgColors } from "../PHeadingAccent/PHeadingAccent";
import { ADMIN_MENU_KEYS, canAdmin } from "../../container/admin/adminMenu";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp";
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const HEIGHT = 69;

// One copy of the uploaded logo for the whole app (the navbar remounts when the layout changes)
let cache = { loaded: false, url: null };

const loadLogo = async () => {
  try {
    const blob = await GetFileApi(Admin_API.SiteLogo);
    const url = blob && blob.size > 0 ? URL.createObjectURL(blob) : null; // 204 = no uploaded logo
    if (cache.url) URL.revokeObjectURL(cache.url);
    cache = { loaded: true, url };
  } catch {
    cache = { loaded: true, url: cache.url }; // API unreachable: keep what we have (or the built-in logo)
  }
  return cache;
};

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const validate = (file) => {
  if (!file) return "";
  if (!TYPES.includes(file.type)) return "Choose a PNG, JPG, GIF or WEBP image";
  if (file.size > MAX_BYTES) return `The logo must be 2 MB or smaller (this file is ${formatSize(file.size)})`;
  return "";
};

// The logos an admin manages from this dialog. site = this top-left logo (UI only); email / print = the logo of the
// mail templates and of the downloads (quotation .doc) – those are never shown in the UI itself.
const LOGO_TABS = [
  { key: "site", label: "Site logo", hint: "Shows at the top left of every page, for all users." },
  { key: "email", label: "Email templates", hint: "Used in every email the system sends (embedded in the mail)." },
  { key: "print", label: "Print & downloads", hint: "Used in the downloaded documents, such as the quotation." },
];

// The email / print logo in use: the upload, else the fixed default shipped with the API
const loadTemplateLogo = async (kind) => {
  const [blob, info] = await Promise.all([
    GetFileApi(`${Admin_API.TemplateLogo}?kind=${kind}&v=${Date.now()}`).catch(() => null),
    PostApi(Admin_API.TemplateLogoInfo, { kind }).catch(() => null),
  ]);
  return {
    url: blob && blob.size > 0 ? URL.createObjectURL(blob) : null,
    isCustom: isSuccess(info) ? !!info.data?.isCustom : false,
  };
};

/**
 * The logo at the top left of every page: the one uploaded in the admin console, else the built-in VA logo.
 * Admins allowed to change it (menu siteLogo) get a camera button on the logo that opens the upload dialog, which also
 * manages the email-template and print/download logos.
 * Used in the top bar and on the login page (no user there, so no camera button).
 */
export default function PSiteLogo({ to, height = HEIGHT, editable = true }) {
  const user = useSelector((state) => state.userDetails.user);
  const canChange = editable && canAdmin(user, ADMIN_MENU_KEYS.siteLogo);
  const [logo, setLogo] = useState(cache);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("site");
  const [templateLogo, setTemplateLogo] = useState({ url: null, isCustom: false, loading: false });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!cache.loaded) loadLogo().then((c) => active && setLogo(c));
    return () => { active = false; };
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  useEffect(() => () => templateLogo.url && URL.revokeObjectURL(templateLogo.url), [templateLogo.url]);

  const isTemplate = tab !== "site";
  const refreshTemplate = async (kind = tab) => {
    setTemplateLogo((prev) => ({ ...prev, loading: true }));
    const loaded = await loadTemplateLogo(kind);
    setTemplateLogo({ ...loaded, loading: false });
  };

  const src = logo.url || VALogo;
  const isCustom = !!logo.url;
  // what the dialog shows as "current" for the selected tab
  const current = isTemplate
    ? { img: templateLogo.url, custom: templateLogo.isCustom, title: templateLogo.isCustom ? "Current logo" : "Current logo (default)" }
    : { img: src, custom: isCustom, title: isCustom ? "Current logo" : "Current logo (built-in)" };

  const resetPick = () => {
    setFile(null);
    setPreview(null);
    setError("");
  };

  const selectTab = (key) => {
    if (key === tab) return;
    resetPick();
    setTab(key);
    if (key !== "site") refreshTemplate(key);
  };

  const closeDialog = () => {
    setOpen(false);
    setTab("site");
    resetPick();
  };

  const handlePick = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // choosing the same file again still fires onChange
    if (!picked) return;
    const message = validate(picked);
    setError(message);
    setFile(message ? null : picked);
    setPreview(message ? null : URL.createObjectURL(picked));
  };

  const refresh = async () => setLogo({ ...(await loadLogo()) });

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("username", user?.userName || "");
    if (isTemplate) form.append("kind", tab);
    form.append("file", file);
    const res = await PostApi(isTemplate ? Admin_API.UploadTemplateLogo : Admin_API.UploadSiteLogo, form);
    if (isSuccess(res)) {
      if (isTemplate) {
        await refreshTemplate();
        resetPick();
        toast(Labels.status.success, tab === "email"
          ? "Email logo updated. Every email sent from now on uses it."
          : "Print logo updated. Every document downloaded from now on uses it.");
      } else {
        await refresh();
        toast(Labels.status.success, "Logo updated. Everyone sees the new logo from their next page load.");
        closeDialog();
      }
    } else {
      setError(res?.data || res?.message || "The logo could not be uploaded");
    }
  };

  const handleRemove = async () => {
    const res = isTemplate
      ? await PostApi(Admin_API.RemoveTemplateLogo, { username: user?.userName, kind: tab })
      : await PostApi(Admin_API.RemoveSiteLogo, { username: user?.userName });
    if (isSuccess(res)) {
      if (isTemplate) {
        await refreshTemplate();
        resetPick();
        toast(Labels.status.success, "The default template logo is back.");
      } else {
        await refresh();
        toast(Labels.status.success, "The built-in logo is back.");
        closeDialog();
      }
    } else {
      setError(res?.data || res?.message || "The logo could not be removed");
    }
  };

  const image = (
    <img
      src={src}
      alt="Logo"
      style={isCustom
        ? { height, width: "auto", maxWidth: Math.round(height * 3.2), objectFit: "contain", display: "block" }
        : { height, width: "auto", display: "block" }}
    />
  );

  return (
    <Box sx={{
      position: "relative", display: "inline-block", visibility: logo.loaded ? "visible" : "hidden",
      "&:hover .site-logo-edit, &:focus-within .site-logo-edit": { opacity: 1 }
    }}>
      {to ? <Link to={to}>{image}</Link> : image}

      {canChange && (
        <Tooltip title="Change logo" arrow placement="right">
          <IconButton
            className="site-logo-edit"
            aria-label="Change logo"
            onClick={() => setOpen(true)}
            size="small"
            sx={{
              position: "absolute", right: -10, bottom: -6, width: 28, height: 28,
              opacity: 0.85, transition: "opacity 0.2s",
              bgcolor: PmgColors.navy, color: "#fff", border: "2px solid #fff",
              boxShadow: `0 2px 6px ${PmgColors.navy}40`,
              "&:hover": { bgcolor: PmgColors.indigo },
            }}
          >
            <PhotoCameraOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      )}

      {canChange && (
        <PDialog
          open={open}
          onClose={closeDialog}
          title="Logos"
          maxWidth="sm"
          actions={
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
              {current.custom && (
                <PButton label={isTemplate ? "Use default logo" : "Use built-in logo"} variant="outlined" color={CommonColors.dark_blue} onClick={handleRemove} width={240} />
              )}
              <PButton label={isTemplate ? "Close" : "Cancel"} variant="outlined" color={CommonColors.dark_blue} onClick={closeDialog} width={130} />
              <PButton label="Upload" variant="contained" color={CommonColors.dark_blue} onClick={handleUpload} disabled={!file} width={150} />
            </Box>
          }
        >
          {/* which logo: the site's own, or the one the email / print templates use */}
          <Box role="tablist" aria-label="Logo" sx={{ display: "flex", gap: 0.75, p: 0.5, mb: 2, borderRadius: "10px", bgcolor: "#f3f4f6", flexWrap: "wrap" }}>
            {LOGO_TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Box
                  key={t.key}
                  component="button"
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(t.key)}
                  sx={{
                    flex: "1 1 auto", border: 0, borderRadius: "8px", px: 1.5, py: 0.9, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13.5, fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : PmgColors.navy, bgcolor: active ? PmgColors.navy : "transparent",
                    transition: "background-color .15s",
                    "&:hover": { bgcolor: active ? PmgColors.navy : "#e5e7eb" },
                  }}
                >
                  {t.label}
                </Box>
              );
            })}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {[
              { title: current.title, img: isTemplate && templateLogo.loading ? null : current.img, loading: isTemplate && templateLogo.loading },
              { title: "New logo", img: preview },
            ].map((panel) => (
              <Box key={panel.title}>
                <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b7280", mb: 0.75 }}>
                  {panel.title}
                </Box>
                <Box sx={{
                  height: 120, borderRadius: "10px", border: "1px dashed #d1d5db", bgcolor: "#fafafa",
                  display: "flex", alignItems: "center", justifyContent: "center", p: 1.5
                }}>
                  {panel.img
                    ? <img src={panel.img} alt={panel.title} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                    : <Box sx={{ color: "#9ca3af", fontSize: 13, display: "flex", alignItems: "center", gap: 0.75 }}>
                        <ImageOutlinedIcon fontSize="small" /> {panel.loading ? "Loading…" : "No image chosen"}
                      </Box>}
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <input ref={inputRef} type="file" accept={ACCEPT} onChange={handlePick} hidden />
            <PButton label="Choose image" variant="outlined" color={CommonColors.dark_blue} onClick={() => inputRef.current?.click()} width={200} autoLoading={false} />
            {file && <Box sx={{ fontSize: 13, color: "#374151", minWidth: 0, overflowWrap: "anywhere" }}>{file.name} · {formatSize(file.size)}</Box>}
          </Box>

          {error && <Box role="alert" sx={{ mt: 1.5, fontSize: 13, color: "#d32f2f" }}>{error}</Box>}

          <Box sx={{ mt: 1.5, fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
            PNG, JPG, GIF or WEBP, up to 2 MB. {isTemplate
              ? "Templates draw it about 60–80 px high (aspect ratio kept); a logo on a white or transparent background works best."
              : "A transparent PNG about 70 px high looks best."}{" "}
            {LOGO_TABS.find((t) => t.key === tab)?.hint}
          </Box>
        </PDialog>
      )}
    </Box>
  );
}
