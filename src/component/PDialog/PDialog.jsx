import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function PDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "xs",
  fullWidth = true,
  showCloseIcon = true,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      {title && (
        <DialogTitle
          sx={{
            textAlign: "left",
            fontWeight: 600,
            position: "relative",
            pr: showCloseIcon ? 7 : 3,
            borderBottom: "1px solid #ECEAF3",
          }}
        >
          {title}

          {showCloseIcon && (
            <IconButton
              onClick={onClose}
              sx={{ position: "absolute", right: 8, top: 10, color: "#C6C7C8", "&:hover":{color:"white",background:"#2D2F75",} }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent sx={{ pt: title ? "20px !important" : undefined }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, pb: 2, margin:"0 auto" }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}