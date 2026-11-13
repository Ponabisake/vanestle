import { useCallback, useEffect, useRef, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { PostApi } from "../../utils/api/networking";
import { ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import "./PSapStatus.css";

const POLL_MS = 5000;
const PENDING = ["Waiting", "InProgress"];

const STEPS = [
    { key: "queued", label: "Sent to SAP" },
    { key: "running", label: "SAP processing" },
    { key: "done", label: "Project number" },
];

const sinceText = (iso) => {
    if (!iso) return "";
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return minutes < 1 ? "just now" : minutes === 1 ? "1 minute ago" : minutes < 60 ? `${minutes} minutes ago` : `${Math.round(minutes / 60)} h ago`;
};

/**
 * SAP project status of an enquiry after "Submit quotation to client" with Send to SAP = Yes (VA/SapStatus).
 * While SAP has not answered it checks every 5 s and shows a progress banner; on failure it keeps SAP's error on
 * screen; on success it shows the SAP project number. onChange(status) tells the page whether it may proceed.
 */
export default function PSapStatus({ enqId, active, onChange }) {
    const [status, setStatus] = useState(null);
    const [checking, setChecking] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const previous = useRef(null);
    const timer = useRef(null);

    const check = useCallback(async () => {
        if (!enqId) return;
        setChecking(true);
        try {
            const response = await PostApi(ProjectEnquiry_API.SapStatus, { enqId });
            if (isSuccess(response) && response.data) {
                const next = response.data;
                setStatus(next);
                onChange?.(next);
                // tell the user once when SAP answers while they wait on the page
                if (PENDING.includes(previous.current) && next.state === "Success")
                    toast(Labels.status.success, next.message);
                if (PENDING.includes(previous.current) && next.state === "Failed")
                    toast(Labels.status.failure, `${next.message}. See the details on the page.`);
                previous.current = next.state;
            }
        } catch {
            // keep the last known state; the next poll tries again
        } finally {
            setChecking(false);
        }
    }, [enqId, onChange]);

    useEffect(() => {
        if (!active) {
            // nothing is rendered while inactive; forget the last state so a later activation starts fresh
            previous.current = null;
            return undefined;
        }
        const first = setTimeout(check, 0);
        return () => clearTimeout(first);
    }, [active, check]);

    // keep checking while SAP has not answered
    useEffect(() => {
        clearTimeout(timer.current);
        if (active && PENDING.includes(status?.state))
            timer.current = setTimeout(check, POLL_MS);
        return () => clearTimeout(timer.current);
    }, [active, status, check]);

    if (!active || !status || status.state === "NotRequired") return null;

    const { state, message, sapProjectNo, error, errorDetails, queuedAt } = status;
    const stepIndex = state === "Waiting" ? 0 : state === "InProgress" ? 1 : 2;
    const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast(Labels.status.success, "Copied"));

    return (
        <div className={`psap psap--${state.toLowerCase()}`} role={state === "Failed" ? "alert" : "status"} aria-live="polite">
            <div className="psap__icon" aria-hidden="true">
                {state === "Success" ? <CheckCircleRoundedIcon /> : state === "Failed" ? <ErrorRoundedIcon /> : <CircularProgress size={26} thickness={5} />}
            </div>

            <div className="psap__body">
                <div className="psap__title">
                    {state === "Success" ? "SAP project created" : state === "Failed" ? "SAP returned an error" : "Waiting for SAP"}
                    {queuedAt && <span className="psap__since">· sent {sinceText(queuedAt)}</span>}
                </div>
                <div className="psap__message">
                    {state === "Success" && sapProjectNo ? (
                        <>
                            SAP project number <strong>{sapProjectNo}</strong>
                            <button type="button" className="psap__copy" onClick={() => copy(sapProjectNo)} aria-label="Copy SAP project number" title="Copy">
                                <ContentCopyRoundedIcon fontSize="inherit" />
                            </button>
                            received. You can continue with the enquiry.
                        </>
                    ) : state === "Failed" ? (
                        "The enquiry cannot move on until SAP accepts it. Please correct the issue below or contact the SAP team."
                    ) : (
                        `${message}. Approval stays locked until SAP sends the project number — you can stay on this page, it updates by itself.`
                    )}
                </div>

                {state === "Failed" && error && (
                    <>
                        <div className="psap__error">
                            <span className="psap__error-label">SAP says</span>
                            <span className="psap__error-text">{error}</span>
                            <button type="button" className="psap__copy" onClick={() => copy(errorDetails || error)} aria-label="Copy SAP response" title="Copy the full SAP response">
                                <ContentCopyRoundedIcon fontSize="inherit" />
                            </button>
                        </div>
                        {errorDetails && (
                            <>
                                <button type="button" className="psap__toggle" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)}>
                                    {showDetails ? "Hide full details" : "Show full details"}
                                </button>
                                {showDetails && <pre className="psap__details">{errorDetails}</pre>}
                            </>
                        )}
                    </>
                )}

                {state !== "Failed" && (
                    <ol className="psap__steps" aria-label="SAP progress">
                        {STEPS.map((step, i) => (
                            <li key={step.key} className={i < stepIndex || state === "Success" ? "is-done" : i === stepIndex ? "is-current" : ""}>
                                <span className="psap__dot" />{step.label}
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            {state !== "Success" && (
                <button type="button" className="psap__refresh" onClick={check} disabled={checking} title="Check SAP now">
                    <SyncRoundedIcon className={checking ? "is-spinning" : ""} fontSize="small" /> Check now
                </button>
            )}
        </div>
    );
}
