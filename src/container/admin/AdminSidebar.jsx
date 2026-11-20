import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, InputBase, Tooltip } from "@mui/material";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { labelRoutes } from "../../navigations/labelRoutes";
import { adminItemRoute, adminMenuFor, DEFAULT_ITEM_ICON } from "./adminMenu";
import { openAdminQuickSearch, quickSearchShortcut } from "./adminSearchEvents";

const NAVY = PmgColors.navy;
const TEXT = "rgba(255,255,255,0.78)";
const MUTED = "rgba(255,255,255,0.45)";

/** One row: icon tile + label; the active page is a white pill with its group's accent bar. */
function NavRow({ icon, label, color, active, collapsed, onClick, hint }) {
  const Icon = icon;
  const row = (
    <Box component="button" type="button" onClick={onClick} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined}
      sx={{
        position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 1.25,
        justifyContent: collapsed ? "center" : "flex-start",
        px: collapsed ? 0 : 1.25, py: 0.85, border: 0, borderRadius: "10px", cursor: "pointer",
        fontFamily: "inherit", fontSize: 13.5, textAlign: "left", lineHeight: 1.3,
        color: active ? NAVY : TEXT, fontWeight: active ? 700 : 500,
        bgcolor: active ? "#fff" : "transparent",
        boxShadow: active ? "0 6px 18px rgba(0,0,0,0.18)" : "none",
        transition: "background-color .15s ease, color .15s ease",
        "&:hover": { bgcolor: active ? "#fff" : "rgba(255,255,255,0.08)", color: active ? NAVY : "#fff" },
        "&:focus-visible": { outline: `2px solid ${PmgColors.gold}`, outlineOffset: 1 },
        "&::before": active ? {
          content: '""', position: "absolute", left: -10, top: 8, bottom: 8, width: 4, borderRadius: "0 4px 4px 0", bgcolor: color,
        } : {},
      }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: "9px", display: "grid", placeItems: "center", flexShrink: 0,
        color: active ? "#fff" : color, bgcolor: active ? color : "rgba(255,255,255,0.92)",
      }}>
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      {!collapsed && <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{label}</Box>}
    </Box>
  );
  return collapsed || hint ? (
    <Tooltip title={hint ? <><b>{label}</b><br />{hint}</> : label} placement="right" arrow enterDelay={collapsed ? 0 : 600}>
      <Box>{row}</Box>
    </Tooltip>
  ) : row;
}

/**
 * Admin console sidebar: every page this admin may open, grouped and always in view. A live filter on top, the
 * current page highlighted, Ctrl / ⌘ + K for the quick search, collapsible to icons (desktop). On phones the same
 * content opens in a drawer (AdminLayout).
 */
export default function AdminSidebar({ collapsed = false, onToggleCollapse, onNavigate, inDrawer = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector((state) => state.userDetails.user);
  const [filter, setFilter] = useState("");
  const navRef = useRef(null);

  // keep the current page in view (e.g. Settings → Countries at the bottom)
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, collapsed, user?.adminMenus?.length]);
  const term = filter.trim().toLowerCase();
  const groups = adminMenuFor(user)
    .map((g) => ({ ...g, items: term ? g.items.filter((i) => [i.label, i.description, g.label].some((v) => (v || "").toLowerCase().includes(term))) : g.items }))
    .filter((g) => g.items.length > 0);

  const go = (route) => {
    navigate(route);
    onNavigate?.();
  };

  return (
    <Box component="nav" ref={navRef} aria-label="Admin pages" sx={{
      height: "100%", width: inDrawer ? 290 : collapsed ? 84 : 280, flexShrink: 0, display: "flex", flexDirection: "column",
      background: `linear-gradient(180deg, ${NAVY} 0%, #211d5c 55%, ${PmgColors.indigo} 100%)`,
      color: "#fff", transition: "width .2s ease", overflow: "hidden",
    }}>
      {/* heading */}
      <Box sx={{ px: collapsed ? 1.5 : 2.5, pt: 2.5, pb: 1.5 }}>
        {collapsed ? (
          <Box sx={{ mx: "auto", width: 36, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${PmgColors.gold}, ${PmgColors.orange}, ${PmgColors.red}, ${PmgColors.green})` }} />
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
              {[PmgColors.gold, PmgColors.orange, PmgColors.red, PmgColors.green].map((c) => <Box key={c} sx={{ width: 18, height: 4, borderRadius: 2, bgcolor: c }} />)}
            </Box>
            <Box sx={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.01em" }}>Admin Console</Box>
            <Box sx={{ fontSize: 12, color: MUTED, mt: 0.25 }}>{user?.userName} · {user?.role}</Box>
          </>
        )}
      </Box>

      {/* filter / quick search */}
      <Box sx={{ px: collapsed ? 1.5 : 2, pb: 1.5 }}>
        {collapsed ? (
          <Tooltip title={`Search (${quickSearchShortcut()})`} placement="right" arrow>
            <Box component="button" type="button" onClick={openAdminQuickSearch} aria-label="Search admin pages"
              sx={{ width: "100%", height: 38, border: 0, borderRadius: "10px", cursor: "pointer", color: "#fff", bgcolor: "rgba(255,255,255,0.1)", display: "grid", placeItems: "center", "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}>
              <SearchRoundedIcon sx={{ fontSize: 20 }} />
            </Box>
          </Tooltip>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 38, px: 1.25, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", "&:focus-within": { borderColor: PmgColors.gold } }}>
            <SearchRoundedIcon sx={{ fontSize: 18, color: MUTED }} />
            <InputBase value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter pages"
              inputProps={{ "aria-label": "Filter admin pages" }}
              sx={{ flex: 1, color: "#fff", fontSize: 13.5, fontFamily: "inherit", "& input::placeholder": { color: MUTED, opacity: 1 } }} />
            {filter ? (
              <Box component="button" type="button" aria-label="Clear filter" onClick={() => setFilter("")}
                sx={{ border: 0, bgcolor: "transparent", color: MUTED, cursor: "pointer", display: "grid", placeItems: "center", p: 0 }}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : (
              <Box component="button" type="button" onClick={openAdminQuickSearch} title="Quick search"
                sx={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", bgcolor: "transparent", color: MUTED, fontSize: 10.5, px: 0.6, py: 0.1, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {quickSearchShortcut()}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* pages */}
      <Box sx={{
        flex: 1, overflowY: "auto", overflowX: "hidden", px: collapsed ? 1.25 : 2, pb: 2,
        "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.18)", borderRadius: 3 },
      }}>
        {!term && (
          <NavRow icon={SpaceDashboardOutlinedIcon} label="Dashboard" color={PmgColors.gold} collapsed={collapsed}
            active={pathname === labelRoutes.adminDashboard} onClick={() => go(labelRoutes.adminDashboard)} />
        )}
        {groups.map((group) => (
          <Box key={group.key} sx={{ mt: collapsed ? 1 : 1.75 }}>
            {collapsed ? (
              <Box sx={{ height: 1, bgcolor: "rgba(255,255,255,0.1)", mx: 1, mb: 1 }} />
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, mb: 0.5, fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: MUTED }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: group.color, boxShadow: `0 0 0 3px ${group.color}33` }} />
                {group.label}
              </Box>
            )}
            <Box sx={{ display: "grid", gap: 0.4 }}>
              {group.items.map((item) => (
                <NavRow key={item.key} icon={item.icon || DEFAULT_ITEM_ICON} label={item.label} color={group.color} collapsed={collapsed}
                  hint={collapsed ? item.description : undefined}
                  active={pathname === adminItemRoute(item)} onClick={() => go(adminItemRoute(item))} />
              ))}
            </Box>
          </Box>
        ))}
        {term && groups.length === 0 && <Box sx={{ px: 1.25, py: 2, fontSize: 13, color: MUTED }}>No page matches “{filter.trim()}”.</Box>}
      </Box>

      {/* collapse */}
      {!inDrawer && onToggleCollapse && (
        <Box sx={{ p: collapsed ? 1.25 : 2, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Box component="button" type="button" onClick={onToggleCollapse} aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            sx={{
              width: "100%", height: 36, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 1, px: collapsed ? 0 : 1.25,
              border: 0, borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: MUTED, bgcolor: "transparent",
              "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" },
            }}>
            {collapsed ? <KeyboardDoubleArrowRightRoundedIcon sx={{ fontSize: 20 }} /> : <><KeyboardDoubleArrowLeftRoundedIcon sx={{ fontSize: 20 }} /> Collapse menu</>}
          </Box>
        </Box>
      )}
    </Box>
  );
}
