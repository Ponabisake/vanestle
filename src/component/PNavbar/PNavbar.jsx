import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Badge,
  Typography,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { Language } from "@mui/icons-material";
import { Labels } from "../../utils/constants/labels";
import { useNavigate, useLocation, Link } from "react-router-dom";
import VALogo from "../../utils/assets/images/valogo.svg";
import { labelRoutes } from "../../navigations/labelRoutes";
import { useLanguage } from "../../utils/constants/language";
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import { userDetails } from "../../redux/actionType/actionType";
import { useDispatch, useSelector } from "react-redux";
import { Account_API } from "../../utils/api/apiUrl";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { PmgColors } from "../PHeadingAccent/PHeadingAccent";

// Language switcher entries: code badge, name in its own script, English name
const LANGUAGES = [
  { key: Labels.language.en, code: "EN", native: "English", english: "English" },
  { key: Labels.language.id, code: "ID", native: "Bahasa Indonesia", english: "Indonesian" },
  { key: Labels.language.kr, code: "KR", native: "한국어", english: "Korean" },
  { key: Labels.language.jp, code: "JP", native: "日本語", english: "Japanese" },
  { key: Labels.language.ch, code: "繁", native: "繁體中文", english: "Chinese (Traditional)" },
];

const PNavbar = ({ name = "User", email = "", avatar = "", notificationCount = 0, toggleSidebar, }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { getLabel, changeLanguage, language } = useLanguage();
  const { userType, menuId } = useSelector((state) => state.userDetails.user);
  const [openMenu, setOpenMenu] = useState(null);

  const [menuState, setMenuState] = useState({
    anchorEl: null,
    type: null
  });
  const menuItems = [
    ...([1, 2, 3].includes(menuId)
      ? [{
        name: menuId === 1 ? getLabel("lbl259") : menuId === 2 ? getLabel("lbl260") : getLabel("lbl261"),
        route: labelRoutes.dashboard,
        menuId: menuId,
        ...([Labels.userType.agency].includes(userType?.toLowerCase())
          ? {
            submenu: [
              {
                name: getLabel("lbl262"),
                route: labelRoutes.dashboard,
                menuId: menuId,
              },
              ...(menuId !== 3
                ? [{
                  name: menuId === 1 ? getLabel("lbl19") : getLabel("lbl223"),
                  route: labelRoutes.clientInfo,
                  menuId: menuId,
                }]
                : []),
            ]
          } : {}),
      }]
      : []
    ),
    ...([Labels.userType.agency].includes(userType?.toLowerCase()) ? [{
      name: getLabel("lbl150"),
      route: labelRoutes.report,
      menuId: menuId,
    }, {
      name: "VA Reports",
      route: labelRoutes.vaReports,
      menuId: menuId,
    }]
      : []
    ),
    ...([1].includes(menuId) && [Labels.userType.agency].includes(userType?.toLowerCase())
      ? [{
        name: getLabel("lbl263"),
        route: labelRoutes.dashboard,
        menuId: 3,
      }]
      : []
    ),
    ...([3].includes(menuId) && [Labels.userType.agency].includes(userType?.toLowerCase())
      ? [{
        name: getLabel("lbl224"),
        route: Account_API.Echo,
        menuId: 3,
      }]
      : []
    ),
  ];

  const isDashboard = location.pathname === labelRoutes.vaDashboard;
  const open = Boolean(menuState.anchorEl);

  const handleOpenMenu = (event, type) => {
    setMenuState({
      anchorEl: event.currentTarget,
      type
    });
  };

  const handleCloseMenu = () => {
    setMenuState({
      anchorEl: null,
      type: null
    });
  };

  const handleLogout = () => {
    handleCloseMenu();
    localStorage.clear();
    navigate(labelRoutes.home, { replace: true });
  };

  const handleMenuClick = (name) => {
    setOpenMenu(prev => (prev === name ? null : name));
  }

  const handleMenuClose = (name) => {
    setTimeout(() => {
      setOpenMenu(null);
    }, 200);
  }

  const handleNavigation = (item) => {
    setOpenMenu(null);
    if (item.menuId === 3 && item.name === getLabel("lbl224")) {
      window.open(Account_API.Echo, "_blank");
      return;
    }
    dispatch({
      type: userDetails,
      payload: {
        menuId: item.menuId,
      },
    });
    navigate(item.route);
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ backgroundColor: "white", padding: "1rem 0" }} >
      <Toolbar sx={{
        justifyContent: "space-between", position: "relative", minHeight: 50, border: "0px solid #ccc",
        px: 0, "@media (min-width:600px)": { px: 0, },
      }}
      >
        <Box>
          <Link to={labelRoutes.vaDashboard}><img src={VALogo} alt="Logo" style={{ height: 69, width: 65 }} /></Link>
        </Box>

        {!isDashboard && (<Box className="navbar-menu">
          {menuItems.map((item, index) => (
            <Box key={`${item.menuId}-${item.route}-${index}`}
              className="menu-item"
              sx={{ position: "relative", }}
              onMouseLeave={() => handleMenuClose()}
            >
              <Box
                className="menu-title"
                onMouseEnter={() => item.submenu && handleMenuClick(item.name)}
                onClick={() => {
                  if (!item.submenu) {
                    handleNavigation(item);
                  }
                }}
                sx={{
                  borderBottom: "1px solid transparent",
                  "&:hover": {
                    borderBottom: "1px solid #16133F",
                  }
                }}
              >
                {item.name}
                {item.submenu && (
                  <span className="arrow">
                    <KeyboardArrowDownOutlinedIcon
                      sx={{
                        fontSize: 18,
                        transition: "transform 0.3s ease",
                        transform: openMenu === item.name ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </span>
                )}
              </Box>

              {item.submenu && openMenu === item.name && (
                <Box className="submenu"
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: "-4rem",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "row",
                    padding: "8px 10px",
                  }}
                >
                  {item.submenu.map((sub, index) => (
                    <Box
                      key={`${sub.menuId}-${sub.route}-${index}`}
                      className="submenu-item"
                      sx={{
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        borderRight: "1px solid #16133F",
                        "&:last-child": {
                          borderRight: "0"
                        }
                      }}
                      onClick={() => handleNavigation(sub)}
                    >
                      <span style={{
                        margin: "0 10px",
                      }}
                      >{sub.name}</span>
                    </Box>
                  ))}
                </Box>
              )}

            </Box>
          ))}
        </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, marginRight: "1.25rem" }}>

          {!isDashboard && (
            <IconButton
              onClick={() => navigate(labelRoutes.vaDashboard)}
              sx={{
                color: "#16133F",
                border: "1px solid #16133F",
                "&:hover": {
                  bgcolor: "#16133F",
                  color: "#fff",
                  border: "1px solid #16133F",
                },
              }}
            >
              <HomeOutlinedIcon fontSize="small" />
            </IconButton>
          )}

          <IconButton
            sx={{
              color: "#16133F",
              border: "1px solid #16133F",
              "&:hover": { bgcolor: "#16133F", color: "#fff", border: "1px solid #16133F", }
            }}
          >
            <Badge
              badgeContent={notificationCount}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "#e30613",
                  color: "#fff"
                }
              }}
            >
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>

          <IconButton
            onMouseEnter={(e) => handleOpenMenu(e, "language")}
            sx={{
              border: "1px solid #16133F",
              color: menuState.type === "language" ? "#fff" : "#16133F",
              bgcolor: menuState.type === "language" ? "#16133F" : "transparent",
              "&:hover": { bgcolor: "#16133F !important", color: "#fff", border: "1px solid #16133F" },

            }}
          >
            <Language fontSize="small" />
          </IconButton>

          {/* PROFILE */}
          <Paper
            // onClick={(e) => handleOpenMenu(e, "profile")}
            // onMouseEnter={(e) => handleOpenMenu(e, "profile")}
            onClick={handleLogout}
            elevation={0}
            sx={{
              whiteSpace: "no-wrap",
              display: "flex",
              alignItems: "center",
              height: "38px",
              pl: 2,
              pr: 2,
              py: 1,
              borderRadius: "24px",
              border: "1px solid #16133F",
              bgcolor: "transparent",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background: "#16133F",
                transition: "left 0.35s ease",
                zIndex: " -1",
              },
              "&:hover::before": {
                left: 0,
              },
              "&:hover": { color: "#fff" }

              // "&:hover": { bgcolor: "#16133F",color:"#fff",border: "1px solid #16133F", }
            }}
          >
            {/* <Avatar
              alt={name}
              src={avatar || ""}
              sx={{ width: 32, height: 32 }}
            >
              {!avatar && name ? name.charAt(0).toUpperCase() : ""}
            </Avatar> */}

            <Box sx={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {name}
              </Typography>

              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                {email}
              </Typography>
              <LogoutIcon />
            </Box>
          </Paper>
        </Box>
      </Toolbar>

      <Menu
        anchorEl={menuState.anchorEl}
        open={open && menuState.type === "profile"}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ onMouseLeave: handleCloseMenu, sx: { mt: 1.5 } }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={menuState.anchorEl}
        open={open && menuState.type === "language"}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
        MenuListProps={{ sx: { py: 0 }, "aria-label": "Choose language" }}
        PaperProps={{
          onMouseLeave: handleCloseMenu,
          sx: {
            width: 190, mt: 1, borderRadius: "10px", overflow: "hidden",
            border: `1px solid ${PmgColors.navy}14`,
            boxShadow: `0 10px 24px ${PmgColors.navy}1F`
          }
        }}
      >
        {/* header */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75,
          background: `linear-gradient(135deg, ${PmgColors.navy} 0%, ${PmgColors.indigo} 100%)`,
          borderBottom: `2px solid ${PmgColors.gold}`,
          color: PmgColors.gold, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase"
        }}>
          <Language sx={{ fontSize: 13 }} /> Language
        </Box>

        {/* options */}
        <Box sx={{ py: 0.5 }}>
          {LANGUAGES.map(lang => {
            const active = language === lang.key;
            return (
              <MenuItem
                key={lang.key}
                selected={active}
                onClick={() => { changeLanguage(lang.key); handleCloseMenu(); }}
                sx={{
                  mx: 0.5, my: 0.25, px: 1, py: 0.5, minHeight: 0, gap: 1, borderRadius: "8px",
                  borderLeft: `3px solid ${active ? PmgColors.orange : "transparent"}`,
                  transition: "background-color 0.2s, border-color 0.2s",
                  "&:hover": { bgcolor: `${PmgColors.indigo}0D` },
                  "&:hover .lang-badge": { bgcolor: PmgColors.navy, color: "white" },
                  "&.Mui-selected, &.Mui-selected:hover": { bgcolor: `${PmgColors.orange}14` },
                  "&.Mui-focusVisible": { bgcolor: `${PmgColors.indigo}14` }
                }}
              >
                <Box className="lang-badge" sx={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, transition: "0.2s",
                  bgcolor: active ? PmgColors.orange : `${PmgColors.navy}0D`,
                  color: active ? "white" : PmgColors.navy
                }}>
                  {lang.code}
                </Box>
                <Box title={lang.english} sx={{
                  flex: 1, minWidth: 0, fontSize: 13, fontWeight: active ? 700 : 500, color: PmgColors.navy,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {lang.native}
                </Box>
                {active && <CheckRoundedIcon sx={{ fontSize: 16, color: PmgColors.orange }} />}
              </MenuItem>
            );
          })}
        </Box>
      </Menu>
    </AppBar>
  );
};

export default PNavbar;