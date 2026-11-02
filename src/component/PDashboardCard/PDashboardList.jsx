import React from "react";
import { useNavigate } from "react-router-dom";
import arrow from "../../utils/assets/images/arrow_white.svg";
import PButton from "../../component/PButton/PButton";
import { CommonColors } from "../../utils/constants/colors";
// import { FaArrowRight } from "react-icons/fa";
import { Container } from "@mui/material";
import { useDispatch } from "react-redux";
import { userDetails } from "../../redux/actionType/actionType";
const PDashboardList = ({ title, value, icon, subtitle, route, menuId, onClick, showNavIcon = false, iconBoxSize = 45, iconSize = 22
  , titleSize = 14, valueSize = 22, iconBg = "linear-gradient(135deg, #6a5af9, #9f7aea)", iconColor = "#ffffff", bgColor = "", }) => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleOnClick = () => {
    if (onClick && !fileName) {
      onClick();
    }
    if (route) {
      dispatch({
        type: userDetails,
        payload: {
          menuId: menuId,
        },
      });
      navigate(route);
    }
  };

  return (
    <>
      <style>{`
        .page-content{ overflow-x:hidden;}
        .dashboard-card {
          position: relative;
          overflow:hidden;
          display: flex;
          align-items: center;
          gap: 15px;
          justify-content:space-between;
          font-family:'Montserrat';
        }
        .dashboard-card:hover .card-title {
          transform: translateY(0px);
        }
        .icon-box {
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .card-title {
          color: #000000;
          margin: 0;
          font-weight:300;
          transition: 0.3s ease;
          transform: translateY(22px);
        }

        .card-value {
          font-weight: 700;
          color: #2d3748;
          margin: 5px 0 0 0;
        }

        .card-subtext {
          font-size: 13px;
          margin-top: 12px;
          color: #48bb78;
        }

        .nav-icon {
          position: absolute;
          right: 15px;
          top: 15px;
          color: #94a3b8;
        }
      `}</style>


      {/* {showNavIcon && route && (
          <div className="nav-icon">
            <FaArrowRight />
          </div>
        )} */}
      <Container maxWidth={"lg"}>
        <div className="dashboard-card">
          <p className="card-title" style={{ fontSize: titleSize }}>
            {title}
          </p>
          <PButton
            label="Select"
            variant="contained"
            color={CommonColors.dark_blue}
            width={180}
            onClick={handleOnClick} disabled={route && showNavIcon ? "" : "disabled"} style={{ cursor: route && showNavIcon ? "pointer" : "default" }}
            startIcon={<img src={arrow} alt="arrow" className="icon" />}
          />
        </div>
      </Container>

      {subtitle && <p className="card-subtext">{subtitle}</p>}

    </>
  );
};

export default PDashboardList;