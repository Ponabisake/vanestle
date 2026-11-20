import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Box, CircularProgress, Container, Drawer, Fab } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import "../../App.css";
import PNavbar from "../../component/PNavbar/PNavbar";
import PTypography from "../../component/PTypography/PTypography";
import FooterLogo from "../../utils/assets/images/FooterLogo.png";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { useLanguage } from "../../utils/constants/language";
import { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess } from "../../utils/commonFunction/common";
import { saveUserDetails } from "../../redux/action/UserDetail/userDetailAction";
import AdminSidebar from "../admin/AdminSidebar";
import AdminQuickSearch from "../admin/AdminQuickSearch";
import { findAdminItemByPath } from "../admin/adminMenu";
import { rememberAdminPage } from "../admin/adminSearchEvents";

const COLLAPSE_KEY = "pmg.admin.sidebarCollapsed";
const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
};

/**
 * Layout of the backend admin console: the site navbar on top, the admin sidebar (every page, always in view) and the
 * page on the right; on phones the sidebar opens in a drawer from the floating menu button. Ctrl / ⌘ + K opens the quick
 * search from any admin page. On load it refreshes the admin's menus from the API, so menus added after sign-on
 * (e.g. Countries) appear without signing on again.
 */
export default function AdminLayout() {
  const { getLabel } = useLanguage();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const user = useSelector((state) => state.userDetails.user);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // the page waits for the refresh, so a page added after sign-on does not bounce to the dashboard first
  const [menusChecked, setMenusChecked] = useState(false);

  // menus may have been added since the admin signed on
  useEffect(() => {
    if (!user?.userName) return undefined;
    let active = true;
    PostApi(Admin_API.Menus, { username: user.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res) && Array.isArray(res.data)) {
        const current = user.adminMenus || [];
        if (res.data.length !== current.length || res.data.some((k) => !current.includes(k)))
          dispatch(saveUserDetails({ adminMenus: res.data }));
      }
      setMenusChecked(true); // on failure the signed-on menus stay
    });
    return () => { active = false; };
    // once per admin (not on every menu change it causes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userName, dispatch]);

  useEffect(() => {
    rememberAdminPage(findAdminItemByPath(pathname)?.item.key);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try { localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1"); } catch { /* convenience only */ }
      return !prev;
    });
  };

  return (
    <div className="app-container">
      <div style={{ borderBottom: "1px solid #e1e1e1" }}>
        <Container maxWidth={false} sx={{ px: { xs: 4, md: 12, lg: 10 } }}>
          <PNavbar name={user?.userName} />
        </Container>
      </div>

      <div className="body-layout">
        <Box sx={{ display: { xs: "none", md: "flex" }, height: "100%" }}>
          <AdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </Box>

        <div className="main-content" style={{ background: "#F7F7FB" }}>
          <div className="page-content">
            <Container maxWidth={false} sx={{ px: { xs: 2, md: 4, lg: 5 } }} className="dashboard_wrapper">
              {menusChecked || !user?.userName ? <Outlet /> : (
                <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
                  <CircularProgress size={28} sx={{ color: PmgColors.indigo }} />
                </Box>
              )}
            </Container>
          </div>
          <div className="footer d-flex flex-column align-items-center justify-content-center gap-2 py-3">
            <img src={FooterLogo} alt={Labels.footerLogo} className="footer-logo" />
            <PTypography labelText={`© ${new Date().getFullYear()} ${getLabel("lbl07")}`} flag={Labels.fontFlags.errorLbl} color={CommonColors.primary} font={FontWeight.regular} />
          </div>
        </div>
      </div>

      {/* phones / small tablets: the sidebar in a drawer */}
      <Fab variant="extended" onClick={() => setDrawerOpen(true)} aria-label="Admin menu"
        sx={{
          display: { xs: "inline-flex", md: "none" }, position: "fixed", left: 16, bottom: 16, zIndex: 1200,
          textTransform: "none", fontWeight: 700, color: "#fff", bgcolor: PmgColors.navy, "&:hover": { bgcolor: PmgColors.indigo },
        }}>
        <MenuRoundedIcon sx={{ mr: 1 }} /> Menu
      </Fab>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { sx: { bgcolor: PmgColors.navy } } }}>
        <AdminSidebar inDrawer onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <AdminQuickSearch />
    </div>
  );
}
