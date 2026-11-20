import React from "react";
import { Dialog, Box, Typography, IconButton, Button, CircularProgress, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import MsgReader from "@npeersab/msgreader";
import { buildSrcDoc } from "./preview/html";
import { bytesToBinary, mhtmlToHtml, parseEmail, textToHtml } from "./preview/mime";
import { isZip, readZip } from "./preview/zip";
import { docxToHtml } from "./preview/docx";
import { pptxToHtml, rtfToText } from "./preview/office";

// What a click opens: every file goes to this preview; Download (header) saves the original.
const KIND_BY_EXT = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "avif", "tif", "tiff"],
  pdf: ["pdf"],
  text: ["txt", "log", "json", "xml", "md"],
  sheet: ["csv", "xls", "xlsx", "xlsm", "xlsb", "ods"],
  word: ["doc", "docx", "docm", "dot", "dotx", "rtf", "mht", "mhtml", "htm", "html", "odt"],
  slides: ["ppt", "pptx", "pptm", "ppsx"],
  msg: ["msg"],
  eml: ["eml"],
  zip: ["zip"],
};
const extOf = (name = "") => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
const kindOf = (ext) => Object.keys(KIND_BY_EXT).find((k) => KIND_BY_EXT[k].includes(ext)) || "none";

// Files are parsed in the browser; beyond this the preview is skipped (the download still works)
const MAX_PARSE_BYTES = 40 * 1024 * 1024;
const SHEET_ROWS = 500;

const formatSize = (bytes) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const unsupported = (message) => ({ type: "unsupported", message });

const startsWith = (bytes, signature) => signature.every((b, i) => bytes[i] === b);
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // Word / PowerPoint 97–2003 binary files

// TextDecoder drops a leading UTF-8 BOM itself
const decodeText = (bytes) => new TextDecoder("utf-8").decode(bytes);

/** Builds what the preview shows for a parsed kind of file. */
async function renderFile(kind, blob, name) {
  if (blob.size > MAX_PARSE_BYTES) return unsupported(`This file is too large to preview (${formatSize(blob.size)}). Download it to open it.`);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const ext = extOf(name);

  switch (kind) {
    case "text":
      return { type: "frame", html: textToHtml(decodeText(bytes)) };

    case "word": {
      if (isZip(bytes)) {
        if (ext === "odt") return unsupported("OpenDocument text files can't be previewed in the browser. Download it to open it.");
        return { type: "frame", html: await docxToHtml(bytes) };
      }
      if (startsWith(bytes, OLE_SIGNATURE)) return unsupported("Word 97–2003 (.doc) files can't be previewed in the browser. Download it to open it in Word.");
      const text = decodeText(bytes);
      if (text.startsWith("{\\rtf")) return { type: "frame", html: textToHtml(rtfToText(text)) };
      // Word "single file web page" (MHTML), e.g. the quotation / purchase order / delivery order documents
      if (/^\s*(MIME-Version:|Content-Type:\s*multipart\/related)/i.test(text.slice(0, 1024))) {
        return { type: "frame", html: mhtmlToHtml(bytesToBinary(bytes)) };
      }
      // Word HTML (legacy .doc documents are HTML served as Word); their logo may be linked from the PMG web server
      return { type: "frame", html: text, remoteImages: true };
    }

    case "slides":
      if (!isZip(bytes)) return unsupported("PowerPoint 97–2003 (.ppt) files can't be previewed in the browser. Download it to open it.");
      return { type: "frame", html: await pptxToHtml(bytes), note: "Slide text and pictures are shown; the layout is in the downloaded file." };

    case "sheet": {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(bytes, { type: "array", sheetRows: SHEET_ROWS + 1, cellHTML: false });
      const sheets = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const full = sheet["!fullref"] && XLSX.utils.decode_range(sheet["!fullref"]);
        return {
          name: sheetName,
          html: XLSX.utils.sheet_to_html(sheet, { header: "", footer: "" }),
          truncated: !!full && full.e.r + 1 > SHEET_ROWS + 1,
        };
      });
      return { type: "sheet", sheets };
    }

    case "eml":
      return { type: "email", mail: parseEmail(bytesToBinary(bytes)) };

    case "msg": {
      const data = new MsgReader(bytes.buffer).getFileData();
      if (data?.error) throw new Error(data.error);
      return {
        type: "email",
        mail: {
          subject: data.subject || "",
          from: [data.senderName, data.senderEmail && `<${data.senderEmail}>`].filter(Boolean).join(" "),
          to: (data.recipients || []).map((r) => r.name || r.email).filter(Boolean).join(", "),
          cc: "",
          date: "",
          html: "",
          text: data.body || "",
          attachments: (data.attachments || []).map((a) => a.fileName || a.name).filter(Boolean),
        },
      };
    }

    case "zip": {
      const entries = [...readZip(bytes).values()].filter((e) => !e.isDirectory);
      return { type: "zip", entries };
    }

    default:
      return unsupported("This file type can't be previewed in the browser. Download it to open it.");
  }
}

const FRAME_SX = { width: "100%", height: "100%", border: 0, bgcolor: "#fff", display: "block" };

// Document HTML: sandboxed (no scripts, opaque origin) and limited by the CSP in buildSrcDoc
const DocFrame = ({ html, remoteImages, title, css }) => (
  <Box component="iframe" title={title} sandbox="" srcDoc={buildSrcDoc(html, { remoteImages, css })} sx={FRAME_SX} />
);

const Panel = ({ children, sx }) => (
  <Box sx={{ width: "min(1100px, 100%)", height: "100%", display: "flex", flexDirection: "column", bgcolor: "#fff", color: "#1f2937", borderRadius: 1, overflow: "hidden", ...sx }}>
    {children}
  </Box>
);

const SHEET_CSS = "body{padding:0}table{border-collapse:collapse;font:13px Arial,sans-serif}td,th{border:1px solid #d1d5db;padding:4px 8px;white-space:nowrap;vertical-align:top}tr:nth-child(odd) td{background:#f9fafb}";

function SheetView({ sheets, name }) {
  const [active, setActive] = React.useState(0);
  const sheet = sheets[active];
  return (
    <Panel>
      {sheets.length > 1 && (
        <Box sx={{ display: "flex", gap: 0.5, px: 1, pt: 1, borderBottom: "1px solid #e5e7eb", overflowX: "auto", flexShrink: 0 }}>
          {sheets.map((s, i) => (
            <Button key={s.name} size="small" onClick={() => setActive(i)}
              sx={{ textTransform: "none", borderRadius: "6px 6px 0 0", color: i === active ? "#2d2f75" : "#6b7280", fontWeight: i === active ? 700 : 500, borderBottom: i === active ? "2px solid #2d2f75" : "2px solid transparent", whiteSpace: "nowrap" }}>
              {s.name}
            </Button>
          ))}
        </Box>
      )}
      {sheet?.truncated && (
        <Typography sx={{ px: 2, py: 1, fontSize: 13, bgcolor: "#fff7ed", color: "#9a3412", flexShrink: 0 }}>
          Showing the first {SHEET_ROWS} rows. Download the file to see all of them.
        </Typography>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {sheet ? <DocFrame html={sheet.html} title={`${name} – ${sheet.name}`} css={SHEET_CSS} /> : <Typography sx={{ p: 2 }}>The workbook has no sheets.</Typography>}
      </Box>
    </Panel>
  );
}

function EmailView({ mail, name }) {
  const rows = [["From", mail.from], ["To", mail.to], ["Cc", mail.cc], ["Date", mail.date]].filter(([, v]) => v);
  return (
    <Panel>
      <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 0.5, overflowWrap: "anywhere" }}>{mail.subject || "(no subject)"}</Typography>
        {rows.map(([label, value]) => (
          <Typography key={label} sx={{ fontSize: 13, color: "#4b5563", overflowWrap: "anywhere" }}>
            <b>{label}:</b> {value}
          </Typography>
        ))}
        {mail.attachments.length > 0 && (
          <Typography sx={{ fontSize: 13, color: "#4b5563", mt: 0.5, overflowWrap: "anywhere" }}>
            <b>Attachments:</b> {mail.attachments.join(", ")}
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DocFrame html={mail.html || textToHtml(mail.text || "No message body.")} title={name} css="body{padding:16px}" />
      </Box>
    </Panel>
  );
}

function ZipView({ entries }) {
  return (
    <Panel>
      <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <FolderZipOutlinedIcon sx={{ color: "#2d2f75" }} />
        <Typography sx={{ fontWeight: 600 }}>{entries.length} file{entries.length === 1 ? "" : "s"} in this archive</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {entries.map((e) => (
          <Box key={e.name} sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 2, py: 1, borderBottom: "1px solid #f3f4f6", fontSize: 14 }}>
            <span style={{ overflowWrap: "anywhere" }}>{e.name}</span>
            <span style={{ color: "#6b7280", whiteSpace: "nowrap" }}>{formatSize(e.size)}</span>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}

function Unsupported({ name, size, message, onDownload }) {
  return (
    <Box sx={{ bgcolor: "#fff", color: "#1f2937", borderRadius: 2, p: { xs: 3, sm: 5 }, maxWidth: 440, width: "100%", textAlign: "center" }}>
      <InsertDriveFileOutlinedIcon sx={{ fontSize: 56, color: "#2d2f75" }} />
      <Typography sx={{ fontWeight: 700, mt: 1, overflowWrap: "anywhere" }}>{name}</Typography>
      {size && <Typography sx={{ fontSize: 13, color: "#6b7280" }}>{size}</Typography>}
      <Typography sx={{ fontSize: 14, color: "#4b5563", mt: 2 }}>{message}</Typography>
      <Button variant="contained" startIcon={<FileDownloadOutlinedIcon />} onClick={onDownload}
        sx={{ mt: 3, textTransform: "none", bgcolor: "#2d2f75", "&:hover": { bgcolor: "#23255c" } }}>
        Download
      </Button>
    </Box>
  );
}

// The file as a Blob plus a URL for <img> / PDF / download (an object URL made here is revoked on close)
function useFileSource(file) {
  const [state, setState] = React.useState({ loading: true });
  React.useEffect(() => {
    let active = true;
    let created = null;
    (async () => {
      try {
        const own = file.file instanceof Blob ? file.file : file instanceof Blob ? file : null;
        const blob = own || (await (await fetch(file.url)).blob());
        if (!active) return;
        const url = file.url || (created = URL.createObjectURL(blob));
        setState({ loading: false, blob, url });
      } catch (error) {
        if (active) setState({ loading: false, error });
      }
    })();
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file]);
  return state;
}

function useRendered(kind, blob, name) {
  const [state, setState] = React.useState({ loading: true });
  React.useEffect(() => {
    if (!blob) return undefined;
    let active = true;
    renderFile(kind, blob, name)
      .then((view) => active && setState({ loading: false, view }))
      .catch(() => active && setState({ loading: false, view: unsupported("This file could not be read for a preview. Download it to open it.") }));
    return () => { active = false; };
  }, [kind, blob, name]);
  return state;
}

const Loading = ({ label = "Loading preview..." }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "#fff" }}>
    <CircularProgress size={22} sx={{ color: "#fff" }} /> <Typography>{label}</Typography>
  </Box>
);

function ParsedPreview({ kind, blob, name, sizeText, onDownload }) {
  const { loading, view } = useRendered(kind, blob, name);
  if (loading) return <Loading />;
  switch (view.type) {
    case "frame":
      return (
        <Panel>
          {view.note && <Typography sx={{ px: 2, py: 1, fontSize: 13, bgcolor: "#eef2ff", color: "#3730a3", flexShrink: 0 }}>{view.note}</Typography>}
          <Box sx={{ flex: 1, minHeight: 0 }}><DocFrame html={view.html} remoteImages={view.remoteImages} title={name} /></Box>
        </Panel>
      );
    case "sheet": return <SheetView sheets={view.sheets} name={name} />;
    case "email": return <EmailView mail={view.mail} name={name} />;
    case "zip": return <ZipView entries={view.entries} />;
    default: return <Unsupported name={name} size={sizeText} message={view.message} onDownload={onDownload} />;
  }
}

function PreviewContent({ file, onClose, files, move }) {
  const name = file.name || file.fileName || "file";
  const ext = extOf(name);
  const kind = kindOf(ext);
  const { loading, error, blob, url } = useFileSource(file);
  const [imageFailed, setImageFailed] = React.useState(false);
  const sizeText = formatSize(blob?.size ?? file.size);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const renderBody = () => {
    if (loading) return <Loading />;
    if (error) return <Unsupported name={name} size={sizeText} message="The file could not be loaded for a preview." onDownload={download} />;
    if (kind === "image") {
      if (imageFailed) {
        const message = ["tif", "tiff"].includes(ext) ? "TIFF images can't be shown by this browser. Download it to open it." : "This image could not be shown. Download it to open it.";
        return <Unsupported name={name} size={sizeText} message={message} onDownload={download} />;
      }
      return <img src={url} alt={name} onError={() => setImageFailed(true)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", background: "#fff" }} />;
    }
    if (kind === "pdf") return <Box component="iframe" src={url} title={name} sx={{ ...FRAME_SX, width: "min(1100px, 100%)" }} />;
    return <ParsedPreview kind={kind} blob={blob} name={name} sizeText={sizeText} onDownload={download} />;
  };

  return (
    <Box sx={{ bgcolor: "#111", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1.5, sm: 2 }, py: 1, color: "white", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap title={name} sx={{ fontWeight: 600 }}>{name}</Typography>
          {sizeText && <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{sizeText}{files.length > 1 ? ` · ${files.indexOf(file) + 1} of ${files.length}` : ""}</Typography>}
        </Box>
        <Tooltip title="Download" arrow>
          <span>
            <Button onClick={download} disabled={!url} startIcon={<FileDownloadOutlinedIcon />}
              sx={{ color: "white", textTransform: "none", border: "1px solid rgba(255,255,255,.4)", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,.08)" }, "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } } }}
              aria-label={`Download ${name}`}>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Download</Box>
            </Button>
          </span>
        </Tooltip>
        <IconButton onClick={onClose} sx={{ color: "white" }} aria-label="Close preview"><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", p: { xs: 1, sm: 2 }, px: { xs: 1, sm: files.length > 1 ? 7 : 2 } }}>
        {files.length > 1 && (
          <IconButton onClick={() => move(-1)} sx={{ position: "absolute", left: 8, color: "white", zIndex: 1, bgcolor: "rgba(0,0,0,.4)" }} aria-label="Previous file">
            <ArrowBackIosNewIcon />
          </IconButton>
        )}
        {renderBody()}
        {files.length > 1 && (
          <IconButton onClick={() => move(1)} sx={{ position: "absolute", right: 8, color: "white", zIndex: 1, bgcolor: "rgba(0,0,0,.4)" }} aria-label="Next file">
            <ArrowForwardIosIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

/**
 * Full-screen preview of any file: images, PDF, Word (.docx, Word HTML / MHTML .doc, RTF), Excel / CSV,
 * PowerPoint (.pptx text and pictures), e-mails (.msg / .eml), text and ZIP listings. Other types show a card with
 * a Download button. files: [{ name, url } | { name, file: Blob } | File]; the header's Download saves the original.
 */
export default function PreviewDialog({ open, onClose, files = [], currentIndex = 0, setCurrentIndex }) {
  const file = files[currentIndex];
  if (!file) return null;

  const move = (step) => setCurrentIndex?.((prev) => (prev + step + files.length) % files.length);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      {open && <PreviewContent key={`${currentIndex}|${file.name || file.fileName}|${file.url || ""}`} file={file} files={files} onClose={onClose} move={move} />}
    </Dialog>
  );
}
