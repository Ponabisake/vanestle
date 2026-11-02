import React from "react";
import {
  Box, Grid, Typography, Paper, Container,
  Avatar, Card, CardContent, Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import DescriptionIcon from "@mui/icons-material/Description";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import BarChartIcon from "@mui/icons-material/BarChart";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { labelRoutes } from "../../navigations/labelRoutes";
import PGrid from "../../component/PGrid/PGrid";
import { Labels } from "../../utils/constants/labels";
import PDashboardList from "../../component/PDashboardCard/PDashboardList";

import PTypography from "../../component/PTypography/PTypography";
import { FontWeight } from "../../utils/constants/fonts";
import { useLanguage } from "../../utils/constants/language";
import { useSelector } from "react-redux";
import { CommonColors } from "../../utils/constants/colors";

const vaDashboard = () => {
  const navigate = useNavigate();
  const { getLabel } = useLanguage();
  const { userType } = useSelector((state) => state.userDetails.user);
  const apps = [
    {
      title: "eNQUIRIES",
      icon: <DescriptionIcon />,
      iconBg: "#6366f1",
      route: labelRoutes.dashboard,
      menuId: 1,
      showNavIcon: true // override default
    },
    {
      title: "eAuction",
      icon: <AccessTimeIcon />,
      iconBg: "#8b5cf6",
      route: labelRoutes.dashboard,
      menuId: 2,
      showNavIcon: false
    },
    {
      title: userType?.toLowerCase() === Labels.userType.supplier ? getLabel("lbl203") : "eCATALOGUE",
      icon: <MenuBookIcon />,
      iconBg: "#6366f1",
      route: labelRoutes.dashboard,
      menuId: 3,
      showNavIcon: false
    },
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        {
          title: "RePORT",
          icon: <BarChartIcon />,
          iconBg: "#4f46e5",
          route: labelRoutes.report,
          menuId: 4,
          //showNavIcon: true
        }
      ]
      : [])
  ];

  // Default props to pass to PDashboardCard
  const defaultCardProps = { titleSize: 48 };
  return (
    <>
      <PGrid container className={`${Labels.margin.mb4}`} style={{ "borderBottom": "2px solid #2F9590", "marginTop": "5rem" }}>
        {apps.map((app, index) => (
          <PGrid
            key={index}
            item
            style={{ "borderTop": "2px solid #2F9590" }}
          >
            <PDashboardList key={index} {...defaultCardProps} {...app} />
          </PGrid>
        ))}
      </PGrid>

    </>


  );
};

export default vaDashboard;