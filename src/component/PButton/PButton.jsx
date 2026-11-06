import React, { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import { FontFamily, FontSize } from "../../utils/constants/fonts";
import { CommonColors } from "../../utils/constants/colors";
import CircularProgress from "@mui/material/CircularProgress";

/**
 * Loading behaviour:
 *  - `loading` (prop) shows the spinner while the parent says so.
 *  - Automatic: when onClick returns a Promise (an async handler, e.g. a save), the button shows the
 *    spinner until that Promise settles – success or failure. Turn off with autoLoading={false}.
 * While loading, the button is disabled (no double submits) and the spinner replaces the start icon.
 */
export default function PButton({ label, onClick, width, height, children, color = "primary", font = FontFamily.medium,
  size = "medium", variant = "contained", disabled = false, startIcon = null, endIcon = null, disableRipple = true,
  fullWidth = false, gradient = false, type = "button", rounded = "sm", shadow = true, sx = {}, loading = false, autoLoading = true }) {

  const theme = useTheme();
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const busy = !!loading || pending;

  const handleClick = (e) => {
    if (busy) return;
    const result = onClick?.(e);
    if (autoLoading && result && typeof result.then === "function") {
      setPending(true);
      Promise.resolve(result)
        .catch(() => { /* the handler reports its own errors */ })
        .finally(() => { if (mounted.current) setPending(false); });
    }
    return result;
  };
  const gradientBackground = CommonColors.gradientBackgrounds?.[color] || "linear-gradient(to right, #4e54c8, #8f94fb)";
  const solidColor = color === "primary" ? CommonColors.dark_blue : color;

  const radiusMap = {
    sm: "6px",
    md: "12px",
    lg: "20px",
    xl: "30px",
  };

  return (
    <>
      <Button
        className={`${variant === "outlined" ? "outlined-btn" : "select-btn"} ${startIcon && !busy ? "has-icon" : ""} ${busy ? "is-busy" : ""}`}
        type={type}
        onClick={handleClick}
        disableRipple={disableRipple}
        variant={variant}
        size={size}
        startIcon={busy ? null : startIcon}
        endIcon={endIcon}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        fullWidth={fullWidth}
        sx={{
          width: width,
          height: height,
          cursor: "pointer",
          textTransform: "none",
          fontFamily: font,
          fontWeight: 600,
          padding: "10px 24px",
          fontSize: size === "small" ? "1rem" : size === "large" ? "1rem" : "1rem",
          borderRadius: radiusMap[rounded],
          color: variant === "contained" || gradient ? theme.palette.common.white : solidColor,
          background: gradient ? gradientBackground : variant === "contained" ? solidColor : "white",

          border: variant === "outlined" ? `1px solid ${solidColor}` : "none",
          boxShadow: "none",
          transition: "all 0.3s ease",
          "&:hover": {
            background: gradient ? gradientBackground : variant === "contained" ? solidColor : "#fff",
            border: variant === "outlined" ? `1px solid ${solidColor}` : "none",
            boxShadow: "none",
          },

          "&:disabled": {
            background: variant === "text" ? "transparent" :theme.palette.action.disabledBackground,
            color: `${theme.palette.text.disabled} !important`,
            boxShadow: "none",
            cursor: "not-allowed",
          },

          // while loading keep the button's own colours (not the grey disabled look)
          "&.is-busy:disabled": {
            background: gradient ? gradientBackground : variant === "contained" ? solidColor : variant === "text" ? "transparent" : "white",
            color: `${variant === "contained" || gradient ? theme.palette.common.white : solidColor} !important`,
            opacity: 0.85,
            cursor: "progress",
          },

          ...sx,
        }}
      >
        {/* spinner is rendered inline (the start-icon slot is animated/clipped by App.css) */}
        {busy && (
          <CircularProgress
            size={16}
            thickness={5}
            disableShrink
            color="inherit"
            sx={{ mr: (label || children) ? 1 : 0, flexShrink: 0 }}
          />
        )}
        {label || children}
      </Button>

    </>
  );
}