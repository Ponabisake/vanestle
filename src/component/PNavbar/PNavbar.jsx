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
                name: getLabel("lbl262") ,
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
    }]
      : []
    ),
    ...([1].includes(menuId) && [Labels.userType.agency].includes(userType?.toLowerCase())
      ? [{
        name: getLabel("lbl263"),
        route: labelRoutes.dashboard,
        menuId: 2,
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

  const selectedStyle = {
    "&.Mui-selected": {
      backgroundColor: "#16133F !important",
      color: "#fff"
    },
    "&.Mui-selected:hover": {
      backgroundColor: "#16133F"
    },
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

          {/* NOTIFICATION */}
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

          {/* LANGUAGE */}
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
          horizontal: "left"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
        PaperProps={{
          onMouseLeave: handleCloseMenu,
          sx: { width: 160, mt: 1.5 }
        }}
      >
        <MenuItem selected={language === Labels.language.en} sx={selectedStyle} onClick={() => { changeLanguage(Labels.language.en) }}>EN</MenuItem>
        <MenuItem selected={language === Labels.language.id} sx={selectedStyle} onClick={() => { changeLanguage(Labels.language.id) }}>ID</MenuItem>
        <MenuItem selected={language === Labels.language.kr} sx={selectedStyle} onClick={() => { changeLanguage(Labels.language.kr) }}>KR</MenuItem>
        <MenuItem selected={language === Labels.language.jp} sx={selectedStyle} onClick={() => { changeLanguage(Labels.language.jp) }}>JP</MenuItem>
        <MenuItem selected={language === Labels.language.cn} sx={selectedStyle} onClick={() => { changeLanguage(Labels.language.ch) }}>CH (Traditional)</MenuItem>
      </Menu>
    </AppBar>
  );
};

export default PNavbar;