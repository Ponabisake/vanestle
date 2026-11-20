// Small MIME parser for the preview: Word "single file web page" documents (.doc / .mht saved as MHTML, e.g. the
// quotation / purchase order / delivery order the API generates) and e-mails (.eml).
import { dataUri, escapeHtml } from "./html";

// One char per byte, so every part can be decoded with its own charset later
export const bytesToBinary = (bytes) => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return text;
};
const binaryToBytes = (text) => {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
};

const decodeCharset = (bytes, charset) => {
  try {
    return new TextDecoder((charset || "utf-8").trim().toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
};

const decodeQuotedPrintable = (text) =>
  binaryToBytes(text.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));

const decodeBase64 = (text) => {
  try {
    return binaryToBytes(atob(text.replace(/[^A-Za-z0-9+/=]/g, "")));
  } catch {
    return new Uint8Array();
  }
};

/** RFC 2047 encoded words in headers (=?utf-8?B?...?= / =?utf-8?Q?...?=). */
export const decodeHeader = (value = "") =>
  value
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
      const bytes = encoding.toUpperCase() === "B"
        ? decodeBase64(text)
        : binaryToBytes(text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, hex) => String.fromCharCode(parseInt(hex, 16))));
      return decodeCharset(bytes, charset);
    });

const parseHeaders = (block) => {
  const headers = {};
  block
    .replace(/\r?\n[ \t]+/g, " ") // unfold
    .split(/\r?\n/)
    .forEach((line) => {
      const i = line.indexOf(":");
      if (i > 0) {
        const name = line.slice(0, i).trim().toLowerCase();
        if (!(name in headers)) headers[name] = line.slice(i + 1).trim();
      }
    });
  return headers;
};

const headerParam = (value = "", param) => {
  const match = new RegExp(`${param}\\s*=\\s*(?:"([^"]*)"|([^;\\s]*))`, "i").exec(value);
  return match ? match[1] ?? match[2] : "";
};

/**
 * Parses a MIME entity given as a binary string (one char per byte).
 * Returns { headers, contentType, parts } for multiparts, else { headers, contentType, bytes } (body decoded).
 */
export function parseMime(binary) {
  const split = /\r?\n\r?\n/.exec(binary);
  const headerBlock = split ? binary.slice(0, split.index) : binary;
  const body = split ? binary.slice(split.index + split[0].length) : "";
  const headers = parseHeaders(headerBlock);
  const contentType = (headers["content-type"] || "text/plain").split(";")[0].trim().toLowerCase();

  if (contentType.startsWith("multipart/")) {
    const boundary = headerParam(headers["content-type"], "boundary");
    if (boundary) {
      const parts = body
        .split(`--${boundary}`)
        .slice(1) // the preamble
        .filter((chunk) => !chunk.startsWith("--"))
        .map((chunk) => parseMime(chunk.replace(/^\r?\n/, "")));
      return { headers, contentType, parts };
    }
  }

  const encoding = (headers["content-transfer-encoding"] || "").toLowerCase();
  const bytes = encoding === "base64" ? decodeBase64(body) : encoding === "quoted-printable" ? decodeQuotedPrintable(body) : binaryToBytes(body);
  return { headers, contentType, bytes };
}

/** Every leaf part, depth first. */
export const leafParts = (entity) => (entity.parts ? entity.parts.flatMap(leafParts) : [entity]);

export const partText = (part) => decodeCharset(part.bytes, headerParam(part.headers["content-type"], "charset"));

const partFileName = (part) =>
  decodeHeader(headerParam(part.headers["content-disposition"], "filename") || headerParam(part.headers["content-type"], "name"));

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Points the HTML's references to other parts (Content-Location, relative to the HTML's location, or cid:) at data URIs
const inlineParts = (html, htmlPart, parts) => {
  const htmlLocation = htmlPart.headers["content-location"] || "";
  const baseDir = htmlLocation.includes("/") ? htmlLocation.slice(0, htmlLocation.lastIndexOf("/") + 1) : "";
  let result = html;
  parts.forEach((part) => {
    if (part === htmlPart || !part.contentType.startsWith("image/")) return;
    const uri = dataUri(part.contentType, part.bytes);
    const refs = [];
    const location = part.headers["content-location"];
    if (location) {
      refs.push(location);
      if (baseDir && location.startsWith(baseDir)) refs.push(location.slice(baseDir.length));
    }
    const cid = (part.headers["content-id"] || "").replace(/[<>]/g, "");
    if (cid) refs.push(`cid:${cid}`);
    refs.forEach((ref) => {
      result = result.replace(new RegExp(`(["'(])${escapeRegExp(ref)}(["')])`, "g"), `$1${uri}$2`);
    });
  });
  return result;
};

/** MHTML (Word single file web page) → self-contained HTML. */
export function mhtmlToHtml(binary) {
  const entity = parseMime(binary);
  const parts = leafParts(entity);
  const htmlPart = parts.find((p) => p.contentType === "text/html");
  if (!htmlPart) throw new Error("The document has no HTML part");
  return inlineParts(partText(htmlPart), htmlPart, parts);
}

/**
 * E-mail (.eml) → { subject, from, to, cc, date, html, text, attachments: [names] }.
 * html is self-contained (inline images as data URIs); text is used when there is no HTML body.
 */
export function parseEmail(binary) {
  const entity = parseMime(binary);
  const parts = leafParts(entity);
  const isAttachment = (p) => /attachment/i.test(p.headers["content-disposition"] || "");
  const htmlPart = parts.find((p) => p.contentType === "text/html" && !isAttachment(p));
  const textPart = parts.find((p) => p.contentType === "text/plain" && !isAttachment(p));
  const h = entity.headers;
  return {
    subject: decodeHeader(h.subject || ""),
    from: decodeHeader(h.from || ""),
    to: decodeHeader(h.to || ""),
    cc: decodeHeader(h.cc || ""),
    date: h.date || "",
    html: htmlPart ? inlineParts(partText(htmlPart), htmlPart, parts) : "",
    text: textPart ? partText(textPart) : "",
    attachments: parts.filter((p) => isAttachment(p) || (partFileName(p) && p !== htmlPart && p !== textPart))
      .map((p) => partFileName(p) || "attachment")
      .filter((name, i, all) => all.indexOf(name) === i),
  };
}

/** Plain text → HTML that keeps line breaks. */
export const textToHtml = (text) =>
  `<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 Arial,sans-serif;margin:0">${escapeHtml(text)}</pre>`;
