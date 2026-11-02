import {
  FaHome,
  FaBuilding,FaFileInvoice 
} from "react-icons/fa";
import React, { useState,useEffect } from "react";
import { Container} from "@mui/material";
import { useNavigate, Outlet } from "react-router-dom";
import "../../App.css";
import Logo from '../../utils/assets/Navbar/Logo.svg'
import PTypography from "../../component/PTypography/PTypography";
import FooterLogo from "../../utils/assets/images/FooterLogo.png";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import PNavbar from "../../component/PNavbar/PNavbar";
//import PSidebar from "../../component/PSidebar/PSidebar";
import { labelRoutes } from "../../navigations/labelRoutes";
import { FontWeight } from "../../utils/constants/fonts";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../utils/constants/language";
import { useSelector } from "react-redux";
function PageLayout() {
  const { getLabel } = useLanguage();
  const location = useLocation();
  const { userName } = useSelector((state) => state.userDetails.user);
  let bg = "";
  let border = {};
  if(location.pathname == labelRoutes.vaDashboard){
    bg="bg"
  }else{
    border = {
      borderBottom: "1px solid #e1e1e1",
    }
  }
  const user = {
    name: userName,
    avatar: "",
    email: "", 
  };

  return (
    <div className={`app-container ${bg}`}>
      <div style={border}>
        <Container maxWidth={false} sx={{px: { xs: 4, md: 12, lg: 10 },}}>
          <PNavbar
            name={user.name}
            email={user.email}
            avatar={user.avatar}
          />
        </Container>
      </div>

      <div className="body-layout">

        <div className="main-content">
          <div className="page-content">
            <Container maxWidth={false} sx={{px: { xs: 2, md: 6, lg: 10 },}} className="dashboard_wrapper">
              <Outlet />
            </Container>
          </div>

          <div className="footer d-flex flex-row gap-3 align-items-end py-3">
            <PTypography
                labelText={`© ${new Date().getFullYear()} ${getLabel("lbl07")}`}
                flag={Labels.fontFlags.errorLbl}
                color={CommonColors.primary}
                font={FontWeight.regular}
              />
              <img
                src={FooterLogo}
                alt={Labels.footerLogo}
                className="footer-logo"
              />
          </div>
        </div>

      </div>

    </div>
  );
}

export default PageLayout;