import React from "react";
import { useNavigate } from "react-router-dom";
import PTypography from "../PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { useLanguage } from "../../utils/constants/language";
import { useSelector } from "react-redux";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Enquiry wizard progress: numbered nodes on a track that fills up to the current step.
 * Steps before `activeStep` are done (click to go back); `activeStep` is the current step.
 */
export default function PStepper({ steps = [], activeStep = 0 }) {
  const navigate = useNavigate();
  const { getLabel } = useLanguage();
  const { menuId, enquiryId } = useSelector((state) => state.userDetails.user);
  // Steps 2–5 (activeStep >= 1): show which enquiry is being worked on, e.g. ENQ000031
  const showEnquiryId = activeStep >= 1 && !!enquiryId;

  const header = {
    1: getLabel("lbl19"),
    2: getLabel("lbl286"),
    3: getLabel("lbl287"),
  }[menuId];

  const count = Math.max(steps.length, 1);
  const progress = count > 1 ? Math.min(activeStep, count - 1) / (count - 1) : 0;

  return (
    <>
      {/* plain flex line (not PGrid/.row – Bootstrap makes every .row child 100% wide, which wrapped the ID) */}
      <div className="p-stepper-title">
        <PTypography
          labelText={header}
          flag={Labels.fontFlags.mainHeader}
          color={CommonColors.primary}
          weight={FontWeight.regular}
        />
        {showEnquiryId && (
          <span className="p-enquiry-chip" title={getLabel("lbl162")}>
            <span className="p-enquiry-chip-dot" />
            {enquiryId}
          </span>
        )}
      </div>

      <div className="p-stepper-card">
        <div className="p-stepper" style={{ "--p-count": count, "--p-progress": progress }}>
          <div className="p-track" aria-hidden="true">
            <div className="p-track-fill" />
          </div>
          <ol className="p-steps">
          {steps.map((step, index) => {
            const state = index < activeStep ? "done" : index === activeStep ? "current" : "todo";
            const canGo = state === "done" && !!step.url;
            return (
              <li key={index} className={`p-step is-${state}`} style={{ "--p-i": index }}>
                <button
                  type="button"
                  className="p-node"
                  onClick={canGo ? () => navigate(step.url) : undefined}
                  disabled={!canGo}
                  aria-current={state === "current" ? "step" : undefined}
                  aria-label={step.text}
                >
                  {state === "done" ? <CheckIcon /> : <span className="p-num">{index + 1}</span>}
                </button>
                <span
                  className="p-step-label"
                  onClick={canGo ? () => navigate(step.url) : undefined}
                >
                  {step.text}
                </span>
              </li>
            );
          })}
          </ol>
        </div>
      </div>

      <style>
        {`
        .p-stepper-title {
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: center;
          column-gap: 14px;
          text-align: center;
        }
        .p-stepper-title > p { margin: 0; }

        .p-enquiry-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px 5px 10px;
          border-radius: 999px;
          background: rgba(250, 176, 27, 0.14);
          border: 1px solid rgba(207, 119, 41, 0.28);
          color: #B4601A;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.6px;
          white-space: nowrap;
        }
        .p-enquiry-chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #CF7729;
          box-shadow: 0 0 0 3px rgba(207, 119, 41, 0.18);
        }

        .p-stepper-card {
          width: 100%;
          max-width: 760px;
          margin: 24px auto 36px;
          padding: 22px 12px 18px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72));
          border: 1px solid #ECE8F3;
          box-shadow: 0 10px 30px rgba(22, 19, 63, 0.07);
        }

        .p-stepper { position: relative; }
        .p-steps {
          position: relative;
          display: grid;
          grid-template-columns: repeat(var(--p-count), minmax(0, 1fr));
          list-style: none;
          margin: 0;
          padding: 0;
        }

        /* track runs from the centre of the first node to the centre of the last */
        .p-track {
          position: absolute;
          top: 21px;
          left: calc(50% / var(--p-count));
          right: calc(50% / var(--p-count));
          height: 4px;
          border-radius: 4px;
          background: #E4E1EA;
          overflow: hidden;
        }
        .p-track-fill {
          height: 100%;
          width: calc(var(--p-progress) * 100%);
          border-radius: 4px;
          background: linear-gradient(90deg, #CF7729, #FAB01B);
          transform-origin: left;
          animation: p-fill 0.9s cubic-bezier(.22,.8,.3,1) both;
        }

        .p-step {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          min-width: 0;
          animation: p-rise 0.45s ease both;
          animation-delay: calc(var(--p-i) * 70ms);
        }

        .p-node {
          position: relative;
          z-index: 1;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 2px solid #D9D6E0;
          background: #fff;
          color: #9C98AA;
          font-size: 16px;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .p-node:disabled { cursor: default; }

        .p-step-label {
          font-size: 15px;
          line-height: 1.25;
          color: #8A8699;
          text-align: center;
          padding: 0 4px;
          overflow-wrap: anywhere;
          transition: color 0.2s ease;
        }

        /* done */
        .p-step.is-done .p-node {
          border-color: transparent;
          background: linear-gradient(135deg, #CF7729, #FAB01B);
          color: #fff;
          box-shadow: 0 6px 14px rgba(207, 119, 41, 0.32);
          cursor: pointer;
        }
        .p-step.is-done .p-step-label { color: #16133F; cursor: pointer; }
        .p-step.is-done .p-node:hover,
        .p-step.is-done .p-node:focus-visible {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 20px rgba(207, 119, 41, 0.4);
          outline: none;
        }
        .p-step.is-done:hover .p-step-label { color: #CF7729; }

        /* current */
        .p-step.is-current .p-node {
          border: 3px solid #FAB01B;
          color: #16133F;
          font-size: 17px;
          animation: p-pulse 2.2s ease-out infinite;
        }
        .p-step.is-current .p-step-label {
          color: #16133F;
          font-weight: 700;
        }

        @keyframes p-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes p-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes p-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(250, 176, 27, 0.45), 0 6px 14px rgba(22, 19, 63, 0.1); }
          70%  { box-shadow: 0 0 0 12px rgba(250, 176, 27, 0), 0 6px 14px rgba(22, 19, 63, 0.1); }
          100% { box-shadow: 0 0 0 0 rgba(250, 176, 27, 0), 0 6px 14px rgba(22, 19, 63, 0.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .p-track-fill, .p-step, .p-step.is-current .p-node { animation: none; }
        }
        @media only screen and (min-width: 1200px) { .p-stepper-card { max-width: 920px; } }
        @media only screen and (min-width: 1500px) { .p-stepper-card { max-width: 1100px; } }
        @media only screen and (max-width: 600px) {
          .p-stepper-card { padding: 16px 4px 12px; }
          .p-node { width: 36px; height: 36px; font-size: 14px; }
          .p-track { top: 16px; }
          .p-step-label { font-size: 12px; }
        }
        `}
      </style>
    </>
  );
}
