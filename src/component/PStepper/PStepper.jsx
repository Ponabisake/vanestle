import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PTypography from "../PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { useLanguage } from "../../utils/constants/language";
import { useSelector } from "react-redux";

export default function PStepper({ steps = [], activeStep = 0, allowRedirect = false }) {
  const navigate = useNavigate();
  const { getLabel } = useLanguage();
  const { menuId, enquiryId } = useSelector((state) => state.userDetails.user);
  // Steps 2–5 (activeStep >= 1): show which enquiry is being worked on, e.g. ENQ000031
  const showEnquiryId = activeStep >= 1 && !!enquiryId;
  
  const handleRedirect = (step) => {
    if (step.url) {
      navigate(step.url);
    }
  };

  const header = {
    1: getLabel("lbl19"),
    2: getLabel("lbl286"),
    3: getLabel("lbl287"),
  }[menuId];

  return (
    <>
      {/* Title, with the enquiry ID beside it in small type: "Create Enquiry – ENQ000031" */}
      {/* plain flex line (not PGrid/.row – Bootstrap makes every .row child 100% wide, which wrapped the ID) */}
      <div className="p-stepper-title">
        <PTypography
          labelText={header}
          flag={Labels.fontFlags.mainHeader}
          color={CommonColors.primary}
          weight={FontWeight.regular}
        />
        {showEnquiryId && (
          <span className="p-enquiry-id" title={getLabel("lbl162") || "Enquiry ID"}>
            <span className="p-enquiry-id-sep">–</span>
            {enquiryId}
          </span>
        )}
      </div>

      <div className="p-stepper">
        <div className={`p-circle completed`}>
          <span className="p-dot" />
        </div>

        {steps.map((step, index) => {
          const isCompleted = index < activeStep || (index === 4 && activeStep === 4);
          return (
            <React.Fragment key={index}>
              <div
                className={`p-line ${isCompleted ? "completed" : ""}`}
              >
                <div
                  className="p-label"
                  onClick={isCompleted ? () => handleRedirect(step) : undefined}
                  style={{ cursor: isCompleted ? "pointer" : "default" }}
                >
                  {step.text}
                </div>
              </div>

              <div className={`p-circle ${isCompleted ? "completed" : index + 1 === activeStep ? "active" : ""
                }`}>
                <span className="p-dot" />
              </div>
            </React.Fragment>
          );
        })}
      </div >
      <style>
        {`
        .p-stepper-title {
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: baseline;
          column-gap: 12px;
          text-align: center;
        }
        .p-stepper-title > p {
          margin: 0;
        }
        .p-enquiry-id {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #CF7729;
          white-space: nowrap;
        }
        .p-enquiry-id-sep {
          color: #9CA3AF;
          font-weight: 400;
          margin-right: 10px;
        }
        .p-stepper {
          display: flex;
          align-items: center;
          width: 100%;
          max-width:695px;
          margin: auto;
          padding:52px 0 47px;
        }

        .p-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 20px;
          z-index: 2;
        }

        .p-label {
          font-size: 18px;
          color: #000000;
          white-space: nowrap;
          position: absolute;
          bottom: 6px;
          left: 0;
          right: 0;
          text-align: center;
        }

        .p-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid #C6C7C8;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .p-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #FAB01B;
        }

        .p-circle.completed {
          background: #C46A1B;
          border-color: #C46A1B;
        }
          .p-circle.completed.cursor-pointer{ cursor:pointer;}

        .p-circle.completed .p-dot {
          background: #FAB01B;
        }

        .p-circle.active {
          border-color: #C6C7C8;
        }

        .p-line {
          flex: 1;
          height: 4px;
          background: #C6C7C8;
          position:relative;
        }

        .p-line.completed {
          cursor: pointer;
          // background: #CF7729;
          animation:changeBg 3s linear forwards;
          transform-origin: left;
        }
        
          @media only screen and (min-width:1500px){
            .p-stepper {max-width: 1100px;}
          }
          @media only screen and (min-width:1700px){
            .p-stepper {max-width: 1300px;}
          }
        @keyframes changeBg{
          0% { background: #C6C7C8;}
          25%,50%,100% { background: #CF7729;}
        }
        @media only screen and (min-width:1200px){
          .p-stepper {max-width:900px;}
        }
        
    `}
      </style>
    </>
  );
}

