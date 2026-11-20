import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { adminItemRoute, adminMenuFor, ADMIN_MENU_KEYS, canAdmin, DEFAULT_ITEM_ICON } from "./adminMenu";
import { openAdminQuickSearch, quickSearchShortcut, readRecentAdminPages } from "./adminSearchEvents";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** Admin console home: a welcome banner with the quick search, the recently opened pages and every area as tiles. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.userDetails.user);
  const groups = adminMenuFor(user);
  const entries = groups.flatMap((group) => group.items.map((item) => ({ group, item })));
  const recent = readRecentAdminPages().map((k) => entries.find((e) => e.item.key === k)).filter(Boolean).slice(0, 4);

  return (
    <Box sx={{ py: 4 }}>
      {/* welcome */}
      <Box sx={{
        position: "relative", overflow: "hidden", borderRadius: "20px", color: "#fff", p: { xs: 3, md: 4 },
        background: `radial-gradient(circle at 85% 20%, ${PmgColors.purple} 0%, transparent 45%), linear-gradient(120deg, ${PmgColors.navy} 0%, ${PmgColors.indigo} 100%)`,
        boxShadow: `0 18px 40px ${PmgColors.navy}33`,
      }}>
        <Box sx={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, display: "flex" }}>
          {[PmgColors.gold, PmgColors.orange, PmgColors.red, PmgColors.berry, PmgColors.green].map((c) => <Box key={c} sx={{ flex: 1, bgcolor: c }} />)}
        </Box>
        <Box sx={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Admin Console</Box>
        <Box sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 700, mt: 0.5 }}>{greeting()}, {user?.userName}</Box>
        <Box sx={{ fontSize: 14, color: "rgba(255,255,255,0.72)", mt: 0.5 }}>
          {user?.role} · {entries.length} pages in {groups.length} areas
        </Box>
        <Box component="button" type="button" onClick={openAdminQuickSearch}
          sx={{
            mt: 3, width: "100%", maxWidth: 520, height: 50, display: "flex", alignItems: "center", gap: 1.5, px: 2.25,
            border: 0, borderRadius: "14px", cursor: "pointer", fontFamily: "inherit", fontSize: 15, color: "#6b7280", bgcolor: "#fff", textAlign: "left",
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)", transition: "transform .15s ease",
            "&:hover, &:focus-visible": { transform: "translateY(-1px)", outline: "none" },
          }}>
          <SearchRoundedIcon sx={{ color: PmgColors.indigo }} />
          <Box component="span" sx={{ flex: 1 }}>Where do you want to go?</Box>
          <Box component="kbd" sx={{ fontSize: 11.5, fontFamily: "inherit", border: "1px solid #e5e7eb", borderRadius: "6px", px: 0.75, py: 0.25 }}>{quickSearchShortcut()}</Box>
        </Box>
        {recent.length > 0 && (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <HistoryRoundedIcon sx={{ fontSize: 17, color: "rgba(255,255,255,0.6)" }} />
            {recent.map(({ group, item }) => (
              <Box key={item.key} component="button" type="button" onClick={() => navigate(adminItemRoute(item))}
                sx={{
                  display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.6, borderRadius: "999px", cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.22)", bgcolor: "rgba(255,255,255,0.08)", color: "#fff", fontFamily: "inherit", fontSize: 12.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
                }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: group.color }} />{item.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {canAdmin(user, ADMIN_MENU_KEYS.siteLogo) && (
        <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.25, borderRadius: "12px", fontSize: 13, color: PmgColors.navy, bgcolor: `${PmgColors.gold}1A`, border: `1px solid ${PmgColors.gold}55` }}>
          <PhotoCameraOutlinedIcon sx={{ fontSize: 20, color: PmgColors.orange }} />
          To change the logos (site, email templates, print / downloads), point at the logo at the top left and use the camera button.
        </Box>
      )}

      {groups.length === 0 ? (
        <Box sx={{ mt: 3, p: 4, textAlign: "center", color: "#6b7280", border: "1px dashed #d1d5db", borderRadius: "12px", bgcolor: "#fff" }}>
          Your admin account has no admin pages yet. Ask a master admin for access.
        </Box>
      ) : (
        groups.map((group) => {
          const GroupIcon = group.icon || DEFAULT_ITEM_ICON;
          return (
            <Box key={group.key} component="section" aria-label={group.label} sx={{ mt: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", color: "#fff", bgcolor: group.color, boxShadow: `0 6px 14px ${group.color}55` }}>
                  <GroupIcon sx={{ fontSize: 19 }} />
                </Box>
                <Box sx={{ fontSize: 18, fontWeight: 700, color: PmgColors.navy }}>{group.label}</Box>
                <Box sx={{ fontSize: 12.5, color: "#9ca3af" }}>{group.items.length} {group.items.length === 1 ? "page" : "pages"}</Box>
              </Box>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
                {group.items.map((item) => {
                  const Icon = item.icon || DEFAULT_ITEM_ICON;
                  return (
                    <Box key={item.key} component="button" type="button" onClick={() => navigate(adminItemRoute(item))}
                      sx={{
                        position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.25, p: 2.25, minHeight: 138,
                        border: "1px solid #ECEAF3", borderRadius: "16px", bgcolor: "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        boxShadow: `0 2px 8px ${PmgColors.navy}0A`, transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
                        "& .arrow": { opacity: 0, transform: "translateX(-4px)", transition: "all .18s ease" },
                        "&:hover, &:focus-visible": {
                          transform: "translateY(-3px)", borderColor: `${group.color}66`, boxShadow: `0 14px 28px ${group.color}26`, outline: "none",
                          "& .arrow": { opacity: 1, transform: "translateX(0)" },
                        },
                      }}>
                      <Box sx={{ width: 42, height: 42, borderRadius: "12px", display: "grid", placeItems: "center", color: group.color, bgcolor: `${group.color}14` }}>
                        <Icon sx={{ fontSize: 22 }} />
                      </Box>
                      <Box sx={{ fontSize: 15, fontWeight: 700, color: PmgColors.navy, pr: 3 }}>{item.label}</Box>
                      <Box sx={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.45 }}>{item.description}</Box>
                      <ArrowForwardRoundedIcon className="arrow" sx={{ position: "absolute", right: 16, top: 22, fontSize: 20, color: group.color }} />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
