import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { setToast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import "./PToast.css";

/**
 * App-wide messages for toast(status, message):
 * - top centre, rendered on document.body so the fit-to-screen zoom of #root does not shrink them;
 * - icon + title + message at a readable size, coloured by kind;
 * - stays longer the more important it is (error 7 s), a bar shows the time left, hover or focus pauses it;
 * - several messages stack (newest on top, at most 4); the same message again counts up (×2) instead of repeating.
 */
const KINDS = {
  success: { title: "Success", icon: CheckCircleRoundedIcon, duration: 4000 },
  info: { title: "Information", icon: InfoRoundedIcon, duration: 5000 },
  warning: { title: "Warning", icon: WarningAmberRoundedIcon, duration: 6000 },
  error: { title: "Error", icon: ErrorRoundedIcon, duration: 7000 },
};
const MAX_VISIBLE = 4;
const LEAVE_MS = 220;

const kindOf = (status) => {
  if (status === Labels.status.success) return "success";
  if (status === Labels.status.failure) return "error";
  const s = String(status ?? "").toLowerCase();
  if (s === "w" || s.startsWith("warn")) return "warning";
  if (s === "e" || s.startsWith("err") || s.startsWith("fail")) return "error";
  if (s.startsWith("succ")) return "success";
  return "info";
};

// API results sometimes carry a list of validation messages or an object instead of text
const textOf = (message) => {
  if (message == null || message === "") return "";
  if (Array.isArray(message)) return message.map(textOf).filter(Boolean).join("\n");
  if (typeof message === "object") return textOf(message.message ?? message.title ?? message.data ?? JSON.stringify(message));
  return String(message);
};

let nextId = 1;

function ToastItem({ toast, onDismiss }) {
  const { kind, message, count, leaving, restartKey } = toast;
  const { title, icon: Icon, duration } = KINDS[kind];
  return (
    <div
      className={`ptoast ptoast--${kind}${leaving ? " is-leaving" : ""}`}
      role={kind === "error" || kind === "warning" ? "alert" : "status"}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Escape" && onDismiss(toast.id)}
    >
      <span className="ptoast__icon" aria-hidden="true"><Icon /></span>
      <div className="ptoast__body">
        <div className="ptoast__title">
          {title}
          {count > 1 && <span className="ptoast__count" aria-label={`shown ${count} times`}>×{count}</span>}
        </div>
        {message && <div className="ptoast__message">{message}</div>}
      </div>
      <button type="button" className="ptoast__close" aria-label="Dismiss message" onClick={() => onDismiss(toast.id)}>
        <CloseRoundedIcon fontSize="small" />
      </button>
      {/* the bar's CSS animation is the timer: paused on hover/focus, dismisses when it ends */}
      <span
        key={restartKey}
        className="ptoast__bar"
        style={{ animationDuration: `${duration}ms` }}
        onAnimationEnd={() => onDismiss(toast.id)}
      />
    </div>
  );
}

export default function PToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    if (timers.current.has(id)) return;
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      setToasts((list) => list.filter((t) => t.id !== id));
    }, LEAVE_MS));
  }, []);

  useEffect(() => {
    setToast(({ status, message }) => {
      const kind = kindOf(status);
      const text = textOf(message);
      setToasts((list) => {
        const same = list.find((t) => !t.leaving && t.kind === kind && t.message === text);
        if (same) {
          // the same message again: count it and restart its timer
          return [{ ...same, count: same.count + 1, restartKey: same.restartKey + 1 }, ...list.filter((t) => t !== same)];
        }
        const added = [{ id: nextId++, kind, message: text, count: 1, restartKey: 0, leaving: false }, ...list];
        added.slice(MAX_VISIBLE).forEach((t) => !t.leaving && setTimeout(() => dismiss(t.id), 0));
        return added;
      });
    });
    const pending = timers.current;
    return () => {
      setToast(null);
      pending.forEach(clearTimeout);
    };
  }, [dismiss]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="ptoast-stack" aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
    </div>,
    document.body
  );
}
