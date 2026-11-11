import { useCallback, useEffect, useRef, useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PGrid from "../PGrid/PGrid";
import PTable from "../PTable/PTable";
import PDialog from "../PDialog/PDialog";
import PreviewDialog from "../PDialog/PPreviewDialog";
import PButton from "../PButton/PButton";
import PTextField from "../PTextField/PTextField";
import PDropdown from "../PDropdown/PDropdown";
import PTypography from "../PTypography/PTypography";
import PFileUpload from "../PFileUpload/PFileUpload";
import { Attachment_API } from "../../utils/api/apiUrl";
import { GetFileApi, PostApi } from "../../utils/api/networking";
import { formatDate, isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import "./PEnquiryAttachments.css";

// Same list as the API (EnquiryAttachmentStore.Extensions)
const EXTENSIONS = [
  "pdf", "png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff", "webp",
  "psd", "ai", "eps", "indd",
  "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "rtf",
  "msg", "eml", "zip", "rar", "7z",
];
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // legacy limit per enquiry; the API sends the one it applies
const MAX_FILES_PER_PICK = 10;
const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];
const PREVIEW_EXT = [...IMAGE_EXT, "pdf", "msg", "txt", "csv"];
// Letters (any language), digits, spaces and - _ . ( ) only, as the API checks
const SPECIAL_CHARS = /[^\p{L}\p{N} ._()-]/u;

const extOf = (name = "") => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
const baseName = (name = "") => (name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name);
const extension = (name = "") => (name.includes(".") ? name.slice(name.lastIndexOf(".")) : "");

const formatSize = (bytes) => {
  if (typeof bytes !== "number") return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const failureText = (response) => {
  if (typeof response?.data === "string" && response.data) return response.data;
  if (Array.isArray(response?.data) && response.data.length) return response.data.join(", ");
  if (String(response?.message || "").includes("413")) return "The files are too large to upload";
  return response?.message && response.message !== "Unexpected response format" ? response.message : Labels.message.somethingWentWrong;
};

const FileIcon = ({ name }) => {
  const ext = extOf(name);
  const sx = { fontSize: 20 };
  if (IMAGE_EXT.includes(ext)) return <ImageOutlinedIcon sx={sx} />;
  if (ext === "pdf") return <PictureAsPdfOutlinedIcon sx={sx} />;
  if (ext === "msg" || ext === "eml") return <MailOutlineRoundedIcon sx={sx} />;
  return <InsertDriveFileOutlinedIcon sx={sx} />;
};

/**
 * Project Enquiry → Attachment, as the legacy page: picking files uploads them straight away (no name already in the
 * enquiry, all files together within 100 MB); the list shows what the user may see, with Edit (name / type / note)
 * and Remove. userId is tblUsers.Id of the signed-in user.
 */
export default function PEnquiryAttachments({ enqId, userId }) {
  const [list, setList] = useState({ files: [], totalBytes: 0, maxTotalBytes: MAX_TOTAL_BYTES, canUpload: false });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null); // file being fetched for preview / download
  const [preview, setPreview] = useState(null); // { name, url }
  const [edit, setEdit] = useState(null); // { file, name, type, note, error, saving }
  const [remove, setRemove] = useState(null); // { file, saving }
  const cache = useRef({}); // attachment id → object URL

  const forgetDownloads = () => {
    Object.values(cache.current).forEach((u) => URL.revokeObjectURL(u));
    cache.current = {};
  };
  useEffect(() => forgetDownloads, []);

  // The first load shows placeholder rows (loading starts true); a refresh after a change keeps the list on screen
  const load = useCallback(async () => {
    if (!enqId || !userId) return;
    try {
      const response = await PostApi(Attachment_API.GetAttachments, { enqId, userId });
      if (isSuccess(response)) {
        forgetDownloads(); // a renamed / replaced file must be fetched again
        setList({
          files: response.data?.files || [],
          totalBytes: response.data?.totalBytes || 0,
          maxTotalBytes: response.data?.maxTotalBytes || MAX_TOTAL_BYTES,
          canUpload: !!response.data?.canUpload,
        });
      } else {
        toast(Labels.status.failure, failureText(response));
      }
    } catch {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }, [enqId, userId]);

  useEffect(() => {
    // after the first paint: the list state is set only once the request answers
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // ---- upload (on pick) ----
  const handlePick = async (e) => {
    const picked = e.target.value || [];
    if (!picked.length || uploading) return;

    const taken = new Set(list.files.map((f) => f.fileName.toLowerCase()));
    for (const f of picked) {
      if (SPECIAL_CHARS.test(f.name)) {
        toast(Labels.status.failure, `${f.name}: file names should not contain special characters`);
        return;
      }
      if (taken.has(f.name.toLowerCase())) {
        toast(Labels.status.failure, `${f.name} already exists. Please choose another file`);
        return;
      }
    }
    const newBytes = picked.reduce((sum, f) => sum + (f.size || 0), 0);
    if (list.totalBytes + newBytes > list.maxTotalBytes) {
      toast(Labels.status.failure, `Total upload size must be 100 MB or less (${formatSize(list.totalBytes) || "0 KB"} already uploaded)`);
      return;
    }

    const body = new FormData();
    body.append("enqId", enqId);
    body.append("userId", userId);
    picked.forEach((f) => body.append("files", f.file, f.name));
    try {
      setUploading(true);
      const response = await PostApi(Attachment_API.UploadAttachments, body);
      if (isSuccess(response)) {
        toast(Labels.status.success, response.data?.message || "Files uploaded");
        await load();
      } else {
        toast(Labels.status.failure, failureText(response));
      }
    } catch {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
    } finally {
      setUploading(false);
    }
  };

  // ---- open / download ----
  const fetchFile = async (file) => {
    if (cache.current[file.id]) return cache.current[file.id];
    const query = `?id=${encodeURIComponent(file.id)}&enqId=${encodeURIComponent(enqId)}&userId=${encodeURIComponent(userId)}`;
    const blob = await GetFileApi(Attachment_API.GetAttachmentFile + query);
    const url = URL.createObjectURL(blob);
    cache.current[file.id] = url;
    return url;
  };

  const open = async (file, forceDownload = false) => {
    if (!file.exists || busyId) return;
    try {
      setBusyId(file.id);
      const url = await fetchFile(file);
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
      setBusyId(null);
    }
  };

  // ---- edit ----
  const startEdit = (file) =>
    setEdit({ file, name: baseName(file.fileName), type: file.type, note: file.note || "", error: "", saving: false });

  const saveEdit = async () => {
    if (!edit || edit.saving) return;
    const name = edit.name.trim();
    if (edit.file.canRename) {
      if (!name) return setEdit((p) => ({ ...p, error: "Enter a file name" }));
      if (SPECIAL_CHARS.test(name)) return setEdit((p) => ({ ...p, error: "File names should not contain special characters" }));
      const newName = (name + extension(edit.file.fileName)).toLowerCase();
      if (list.files.some((f) => f.id !== edit.file.id && f.fileName.toLowerCase() === newName))
        return setEdit((p) => ({ ...p, error: "A file with this name already exists" }));
    }
    try {
      setEdit((p) => ({ ...p, saving: true, error: "" }));
      const response = await PostApi(Attachment_API.UpdateAttachment, {
        id: edit.file.id,
        enqId,
        userId,
        name: edit.file.canRename ? name : baseName(edit.file.fileName),
        type: edit.type,
        note: edit.note,
      });
      if (isSuccess(response)) {
        toast(Labels.status.success, response.data?.message || "Attachment updated");
        setEdit(null);
        await load();
      } else {
        setEdit((p) => ({ ...p, saving: false, error: failureText(response) }));
      }
    } catch {
      setEdit((p) => ({ ...p, saving: false, error: Labels.message.somethingWentWrong }));
    }
  };

  // ---- remove ----
  const confirmRemove = async () => {
    if (!remove || remove.saving) return;
    try {
      setRemove((p) => ({ ...p, saving: true }));
      const response = await PostApi(Attachment_API.RemoveAttachment, { id: remove.file.id, enqId, userId });
      if (isSuccess(response)) {
        toast(Labels.status.success, response.data?.message || "Attachment removed");
        setRemove(null);
        await load();
      } else {
        toast(Labels.status.failure, failureText(response));
        setRemove((p) => ({ ...p, saving: false }));
      }
    } catch {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
      setRemove((p) => ({ ...p, saving: false }));
    }
  };

  const columns = [
    {
      field: "fileName",
      header: "File Name",
      render: (file) => (
        <button
          type="button"
          className={`pea-file ${file.exists ? "" : "is-missing"}`}
          onClick={() => open(file)}
          disabled={!file.exists}
          title={file.exists ? `Open ${file.fileName}` : `${file.fileName} is not available on the server`}
        >
          {busyId === file.id ? <CircularProgress size={18} /> : <FileIcon name={file.fileName} />}
          <span className="pea-file-name">{file.fileName}</span>
          {file.isLineItemFile && <span className="pea-tag">Line item</span>}
        </button>
      ),
    },
    { field: "type", header: "Type" },
    { field: "userName", header: "User ID" },
    { field: "size", header: "Size", render: (file) => file.size || formatSize(file.fileSize) },
    { field: "uploadDate", header: "Uploaded", render: (file) => (file.uploadDate ? formatDate(file.uploadDate) : "") },
    { field: "note", header: "Notes", render: (file) => <span className="pea-note">{file.note}</span> },
    { field: "status", header: "Status", render: (file) => (file.exists ? file.status : <span className="pea-missing">Not on server</span>) },
    {
      field: "actions",
      header: "",
      align: "right",
      hideable: false,
      render: (file) => (
        <span className="pea-actions">
          {file.exists && (
            <Tooltip title="Download" arrow>
              <IconButton size="small" onClick={() => open(file, true)} aria-label={`Download ${file.fileName}`}>
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {file.canEdit && (
            <Tooltip title="Edit" arrow>
              <IconButton size="small" onClick={() => startEdit(file)} disabled={uploading} aria-label={`Edit ${file.fileName}`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {file.canRemove && (
            <Tooltip title="Remove" arrow>
              <IconButton size="small" className="pea-remove" onClick={() => setRemove({ file, saving: false })} disabled={uploading} aria-label={`Remove ${file.fileName}`}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </span>
      ),
    },
  ];

  const usedPercent = Math.min(100, Math.round((list.totalBytes / list.maxTotalBytes) * 100));

  return (
    <>
      {list.canUpload && (
        <PGrid container className={Labels.margin.mb4}>
          <PGrid item xs={12} sm={6} md={4}>
            <div className="mb-2 pea-picker">
              <PFileUpload
                value={[]}
                onChange={handlePick}
                name="enquiryAttachments"
                placeholder={uploading ? "Uploading..." : "Choose files"}
                multiple
                maxLength={MAX_FILES_PER_PICK}
                allowedExtensions={EXTENSIONS}
                maxFileSize={list.maxTotalBytes}
                disabled={uploading || loading}
              />
              {uploading && <CircularProgress size={20} className="pea-picker-spinner" />}
            </div>
            <PTypography labelText={"File names should not contain special characters."} flag={Labels.fontFlags.smallText} weight={FontWeight.regular} />
            <PTypography labelText={"Total upload size must be 100 MB or less."} flag={Labels.fontFlags.smallText} weight={FontWeight.regular} />
            {!loading && (
              <div className="pea-usage" title={`${formatSize(list.totalBytes) || "0 KB"} of 100 MB used`}>
                <div className="pea-usage-bar"><span style={{ width: `${usedPercent}%` }} /></div>
                <span className="pea-usage-text">{formatSize(list.totalBytes) || "0 KB"} of 100 MB used</span>
              </div>
            )}
          </PGrid>
        </PGrid>
      )}

      <PGrid container className={Labels.margin.mb4}>
        <PGrid item xs={12} sm={12} md={12}>
          <PTable
            columns={columns}
            rows={list.files}
            loading={loading}
            columnChooser={false}
            emptyTitle="No attachments yet"
            emptyMessage="Files uploaded for this enquiry will be listed here."
          />
        </PGrid>
      </PGrid>

      <PreviewDialog open={!!preview} onClose={() => setPreview(null)} files={preview ? [preview] : []} currentIndex={0} setCurrentIndex={() => {}} />

      <PDialog
        open={!!edit}
        onClose={() => !edit?.saving && setEdit(null)}
        title="Edit attachment"
        maxWidth="sm"
        actions={
          <PGrid className="d-flex align-items-center justify-content-end gap-2">
            <PButton fullWidth label="Cancel" variant="outlined" onClick={() => setEdit(null)} disabled={edit?.saving} color={CommonColors.grey.main} width={120} />
            <PButton fullWidth label="Save" variant={Labels.contained} onClick={saveEdit} loading={edit?.saving} disabled={edit?.saving} color={CommonColors.dark_blue} width={120} />
          </PGrid>
        }
      >
        {edit && (
          <div className="pea-form">
            <div className="pea-form-row">
              <PTextField
                label="File name"
                value={edit.name}
                onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value, error: "" }))}
                disabled={!edit.file.canRename || edit.saving}
                inputProps={{ maxLength: 200 }}
              />
              <span className="pea-ext">{extension(edit.file.fileName)}</span>
            </div>
            {!edit.file.canRename && (
              <span className="pea-hint">
                {edit.file.isLineItemFile ? "A line item file keeps its name." : "This file cannot be renamed."}
              </span>
            )}
            <div className="pea-form-pair">
              <PTextField label="Size" value={edit.file.size || formatSize(edit.file.fileSize)} disabled />
              <PTextField label="Uploaded" value={edit.file.uploadDate ? formatDate(edit.file.uploadDate) : ""} disabled />
            </div>
            <PDropdown
              label="Type"
              name="type"
              value={edit.type}
              options={(edit.file.typeOptions || []).map((t) => ({ label: t, value: t }))}
              onChange={(e) => setEdit((p) => ({ ...p, type: e.target.value || p.type }))}
              disabled={edit.saving || (edit.file.typeOptions || []).length < 2}
            />
            <PTextField
              label="Notes"
              value={edit.note}
              onChange={(e) => setEdit((p) => ({ ...p, note: e.target.value }))}
              multiline
              rows={4}
              disabled={edit.saving}
              inputProps={{ maxLength: 1000 }}
            />
            {edit.error && <span className="pea-error">{edit.error}</span>}
          </div>
        )}
      </PDialog>

      <PDialog
        open={!!remove}
        onClose={() => !remove?.saving && setRemove(null)}
        title="Remove attachment"
        maxWidth="xs"
        actions={
          <PGrid className="d-flex align-items-center justify-content-end gap-2">
            <PButton fullWidth label="Cancel" variant="outlined" onClick={() => setRemove(null)} disabled={remove?.saving} color={CommonColors.grey.main} width={120} />
            <PButton fullWidth label="Remove" variant={Labels.contained} onClick={confirmRemove} loading={remove?.saving} disabled={remove?.saving} color={CommonColors.dark_blue} width={120} />
          </PGrid>
        }
      >
        {remove && (
          <p className="pea-confirm">
            Remove <strong>{remove.file.fileName}</strong> from this enquiry?
            {remove.file.isLineItemFile ? " The file stays on its line item." : " The file is deleted and cannot be restored."}
          </p>
        )}
      </PDialog>
    </>
  );
}
