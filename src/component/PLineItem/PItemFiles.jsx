import { useEffect, useRef, useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PreviewDialog from "../PDialog/PPreviewDialog";
import { GetFileApi } from "../../utils/api/networking";
import { LineItems_API } from "../../utils/api/apiUrl";
import { toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";

const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];
// Types the preview dialog can show from a downloaded copy (Office files need a public URL)
const PREVIEW_EXT = [...IMAGE_EXT, "pdf", "msg", "txt", "csv"];

const extOf = (name = "") => name.split(".").pop().toLowerCase();

const formatSize = (bytes) => {
  if (typeof bytes !== "number") return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const FileIcon = ({ name }) => {
  const ext = extOf(name);
  const sx = { fontSize: 20 };
  if (IMAGE_EXT.includes(ext)) return <ImageOutlinedIcon sx={sx} />;
  if (ext === "pdf") return <PictureAsPdfOutlinedIcon sx={sx} />;
  if (ext === "msg") return <MailOutlineRoundedIcon sx={sx} />;
  return <InsertDriveFileOutlinedIcon sx={sx} />;
};

/**
 * The files attached to a line item (step 3), from GetDetails → enqlineItems[].quoteFiles.
 * Clicking a file previews it (images, PDF, .msg, text); the download icon saves it.
 * Files are fetched with the API headers, once per file.
 */
export function PItemFiles({ enqDetailsId, files = [] }) {
  const [busy, setBusy] = useState(null); // file name being fetched
  const [preview, setPreview] = useState(null); // { name, url }
  const cache = useRef({}); // fileName → object URL
  const fileKey = `${enqDetailsId}|${files.map((f) => f.fileName).join("|")}`;

  // A different item / file list: forget the downloaded copies
  useEffect(() => {
    const urls = cache.current;
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      cache.current = {};
    };
  }, [fileKey]);

  const load = async (fileName) => {
    if (cache.current[fileName]) return cache.current[fileName];
    const query = `?enqDetailsId=${encodeURIComponent(enqDetailsId)}&fileName=${encodeURIComponent(fileName)}`;
    const blob = await GetFileApi(LineItems_API.GetLineItemFile + query);
    const url = URL.createObjectURL(blob);
    cache.current[fileName] = url;
    return url;
  };

  const open = async (file, forceDownload = false) => {
    if (!file.exists || busy) return;
    try {
      setBusy(file.fileName);
      const url = await load(file.fileName);
      if (!forceDownload && PREVIEW_EXT.includes(extOf(file.fileName))) {
        setPreview({ name: file.fileName, url });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      toast(Labels.status.failure, error?.message === "File not found" ? `${file.fileName} was not found on the server` : Labels.message.somethingWentWrong);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pli-files">
      <span className="pli-field-label">
        <AttachFileRoundedIcon sx={{ fontSize: 14, verticalAlign: "-2px", mr: 0.5 }} />
        Attachments{files.length ? ` (${files.length})` : ""}
      </span>
      {files.length === 0 ? (
        <span className="pli-field-value is-empty">No files attached</span>
      ) : (
        <div className="pli-file-list">
          {files.map((file) => (
            <div className={`pli-file ${file.exists ? "" : "is-missing"}`} key={file.fileName}>
              <button
                type="button"
                className="pli-file-main"
                onClick={() => open(file)}
                disabled={!file.exists}
                title={file.exists ? `Open ${file.fileName}` : `${file.fileName} is not available on the server`}
              >
                {busy === file.fileName ? <CircularProgress size={18} /> : <FileIcon name={file.fileName} />}
                <span className="pli-file-name">{file.fileName}</span>
                <span className="pli-file-size">{file.exists ? formatSize(file.size) : "not available"}</span>
              </button>
              {file.exists && (
                <Tooltip title="Download" arrow>
                  <IconButton size="small" className="pli-file-download" onClick={() => open(file, true)} aria-label={`Download ${file.fileName}`}>
                    <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}

      <PreviewDialog
        open={!!preview}
        onClose={() => setPreview(null)}
        files={preview ? [preview] : []}
        currentIndex={0}
        setCurrentIndex={() => {}}
      />
    </div>
  );
}
