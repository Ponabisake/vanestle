// Helpers for showing document HTML in the preview. Document HTML always goes into a sandboxed iframe (no scripts,
// opaque origin) with a Content-Security-Policy that blocks every request except inline styles and data: images,
// so a previewed file can neither run code nor call out (e.g. tracking images in an email).

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const csp = (remoteImages) =>
  `default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:${remoteImages ? " https:" : ""}`;

/**
 * The srcdoc of a preview iframe: the document HTML behind the CSP meta tag, plus a light page style.
 * remoteImages: also allow https images (legacy Word HTML links its logo from the PMG web server).
 */
export function buildSrcDoc(html, { remoteImages = false, css = "" } = {}) {
  const head =
    `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp(remoteImages)}">` +
    `<style>html,body{margin:0;background:#fff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;}` +
    `img{max-width:100%;height:auto;}${css}</style>`;
  // a <meta> before <html> is moved into <head> by the parser, ahead of anything the document declares
  return head + String(html ?? "");
}

/** Bytes → base64 (for data: URIs), in chunks so large images do not overflow the call stack. */
export function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export const dataUri = (mime, bytes) => `data:${mime};base64,${toBase64(bytes)}`;

const IMAGE_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Image MIME type by file name, or null for types a browser cannot show (emf, wmf, tif, ...). */
export const imageMimeOf = (name = "") => IMAGE_MIME[name.split(".").pop().toLowerCase()] || null;
