// PowerPoint .pptx and RTF for the preview (no dependency).
import { readZip, readZipText } from "./zip";
import { dataUri, escapeHtml, imageMimeOf } from "./html";

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const parseXml = (text) => (text ? new DOMParser().parseFromString(text, "application/xml") : null);

const resolvePath = (base, target) => {
  const parts = base.split("/").slice(0, -1);
  target.split("/").forEach((p) => {
    if (p === "..") parts.pop();
    else if (p && p !== ".") parts.push(p);
  });
  return parts.join("/");
};

/**
 * .pptx → HTML: one card per slide, in order, with the slide's text (paragraph by paragraph) and its pictures.
 * Layout, shapes and animations are not drawn; the download keeps the original.
 */
export async function pptxToHtml(buffer) {
  const zip = readZip(buffer);
  const slideNames = [...zip.keys()]
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  if (!slideNames.length) throw new Error("Not a PowerPoint presentation");

  const slides = [];
  for (const [index, name] of slideNames.entries()) {
    const doc = parseXml(await readZipText(zip, name));
    const relsDoc = parseXml(await readZipText(zip, name.replace("slides/", "slides/_rels/") + ".rels"));
    const rels = {};
    if (relsDoc) {
      Array.from(relsDoc.documentElement.children).forEach((rel) => {
        if (rel.getAttribute("TargetMode") !== "External") rels[rel.getAttribute("Id")] = resolvePath(name, rel.getAttribute("Target") || "");
      });
    }

    const paragraphs = Array.from(doc.getElementsByTagNameNS(A, "p"))
      .map((p) => Array.from(p.getElementsByTagNameNS(A, "t")).map((t) => t.textContent).join(""))
      .filter((t) => t.trim());

    const pictures = [];
    for (const blip of Array.from(doc.getElementsByTagNameNS(A, "blip"))) {
      const path = rels[blip.getAttributeNS(R, "embed") || blip.getAttribute("r:embed")];
      const mime = path && imageMimeOf(path);
      const entry = path && zip.get(path);
      if (mime && entry) {
        try { pictures.push(dataUri(mime, await entry.read())); } catch { /* left out */ }
      }
    }

    const [title, ...rest] = paragraphs;
    slides.push(
      `<section class="slide"><div class="no">Slide ${index + 1}</div>` +
      (title ? `<h2>${escapeHtml(title)}</h2>` : "") +
      rest.map((t) => `<p>${escapeHtml(t)}</p>`).join("") +
      (pictures.length ? `<div class="pics">${pictures.map((src) => `<img src="${src}" alt="">`).join("")}</div>` : "") +
      (!paragraphs.length && !pictures.length ? '<p class="empty">No text on this slide</p>' : "") +
      "</section>"
    );
  }

  return `<style>
    body{background:#eef0f4;padding:24px 12px;}
    .slide{background:#fff;max-width:880px;margin:0 auto 16px;padding:28px 36px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.15);
      font:15px/1.5 Arial,sans-serif;color:#111;overflow-wrap:anywhere;}
    .slide .no{font-size:12px;color:#6b7280;margin-bottom:8px;} .slide h2{margin:0 0 12px;font-size:22px;}
    .slide p{margin:0 0 6px;} .slide .empty{color:#9ca3af;font-style:italic;}
    .pics{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;} .pics img{max-height:320px;max-width:100%;border:1px solid #e5e7eb;}
  </style>${slides.join("")}`;
}

/** RTF → plain text (formatting dropped): good enough to read the document before downloading it. */
export function rtfToText(rtf) {
  const out = [];
  const stack = [];
  let skip = false; // inside a destination that holds no body text (font table, styles, pictures, ...)
  let unicodeSkip = 1;
  let i = 0;
  const SKIP_DESTINATIONS = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr", "footerl", "footerr", "object", "themedata", "datastore", "latentstyles", "listtable", "listoverridetable", "rsidtbl", "generator", "xmlnstbl", "mmathPr"]);

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === "{") { stack.push(skip); i++; continue; }
    if (ch === "}") { skip = stack.pop() ?? false; i++; continue; }
    if (ch === "\\") {
      const next = rtf[i + 1];
      if (next === "\\" || next === "{" || next === "}") { if (!skip) out.push(next); i += 2; continue; }
      if (next === "'") {
        if (!skip) out.push(String.fromCharCode(parseInt(rtf.substr(i + 2, 2), 16)));
        i += 4;
        continue;
      }
      if (next === "*") { skip = true; i += 2; continue; }
      const match = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 40));
      if (!match) { i += 2; continue; }
      const [all, word, param] = match;
      i += all.length;
      if (SKIP_DESTINATIONS.has(word)) skip = true;
      else if (!skip) {
        if (word === "par" || word === "line" || word === "row") out.push("\n");
        else if (word === "tab" || word === "cell") out.push("\t");
        else if (word === "uc") unicodeSkip = Number(param || 1);
        else if (word === "u") {
          let code = Number(param);
          if (code < 0) code += 65536;
          out.push(String.fromCharCode(code));
          i += unicodeSkip; // the fallback characters after \uN
        }
      }
      continue;
    }
    if (ch === "\r" || ch === "\n") { i++; continue; }
    if (!skip) out.push(ch);
    i++;
  }
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}
