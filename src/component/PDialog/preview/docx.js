// Word .docx → HTML for the preview (no dependency). Covers what business documents mostly use: paragraphs and
// headings, bold / italic / underline / strike / size / colour / highlight, alignment and indents, numbered and
// bulleted lists, tables (with merged columns), line / page breaks, tabs and embedded pictures. Headers, footers,
// text boxes, charts and tracked changes are left out; the download keeps the original.
import { readZip, readZipText } from "./zip";
import { dataUri, escapeHtml, imageMimeOf } from "./html";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const parseXml = (text) => (text ? new DOMParser().parseFromString(text, "application/xml") : null);
const kids = (el, name) => (el ? Array.from(el.children).filter((c) => !name || c.localName === name) : []);
const kid = (el, name) => kids(el, name)[0] || null;
const wAttr = (el, name) => (el ? el.getAttributeNS(W, name) ?? el.getAttribute(`w:${name}`) : null);
// <w:b/> is on, <w:b w:val="0"/> / "false" is off
const onOff = (el) => !!el && !["0", "false", "off"].includes(String(wAttr(el, "val") ?? "").toLowerCase());

const HIGHLIGHT = {
  yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000",
  darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000",
  darkYellow: "#808000", darkGray: "#808080", lightGray: "#c0c0c0", black: "#000000",
};

// Values from the file only reach a style attribute in a known-safe shape
const hex = (value) => (/^[0-9A-Fa-f]{6}$/.test(value || "") ? `#${value}` : null);
const ALIGN = { left: "left", center: "center", right: "right", both: "justify", distribute: "justify", start: "left", end: "right" };

// ---- run / paragraph properties ----
const readRunProps = (rPr) => {
  if (!rPr) return {};
  const props = {};
  const set = (name, key) => { const el = kid(rPr, name); if (el) props[key] = onOff(el); };
  set("b", "bold");
  set("i", "italic");
  set("strike", "strike");
  set("caps", "caps");
  const u = kid(rPr, "u");
  if (u) props.underline = (wAttr(u, "val") || "single") !== "none";
  const sz = wAttr(kid(rPr, "sz"), "val");
  if (sz) props.size = Number(sz) / 2;
  const color = hex(wAttr(kid(rPr, "color"), "val"));
  if (color) props.color = color;
  const highlight = wAttr(kid(rPr, "highlight"), "val");
  if (highlight && HIGHLIGHT[highlight]) props.highlight = HIGHLIGHT[highlight];
  const shade = hex(wAttr(kid(rPr, "shd"), "fill"));
  if (!props.highlight && shade) props.highlight = shade;
  const vert = wAttr(kid(rPr, "vertAlign"), "val");
  if (vert === "superscript" || vert === "subscript") props.vert = vert;
  const fonts = kid(rPr, "rFonts");
  const font = fonts && (wAttr(fonts, "ascii") || wAttr(fonts, "hAnsi"));
  if (font) props.font = font;
  return props;
};

const readParaProps = (pPr) => {
  if (!pPr) return {};
  const props = {};
  const align = ALIGN[wAttr(kid(pPr, "jc"), "val")];
  if (align) props.align = align;
  const ind = kid(pPr, "ind");
  if (ind) {
    const left = wAttr(ind, "left") ?? wAttr(ind, "start");
    if (left) props.indent = Number(left) / 20; // twips → pt
    const hanging = wAttr(ind, "hanging");
    const firstLine = wAttr(ind, "firstLine");
    if (hanging) props.firstLine = -Number(hanging) / 20;
    else if (firstLine) props.firstLine = Number(firstLine) / 20;
  }
  const spacing = kid(pPr, "spacing");
  if (spacing) {
    const before = wAttr(spacing, "before");
    const after = wAttr(spacing, "after");
    if (before) props.before = Number(before) / 20;
    if (after) props.after = Number(after) / 20;
  }
  const shade = hex(wAttr(kid(pPr, "shd"), "fill"));
  if (shade) props.shade = shade;
  return props;
};

// ---- styles (styles.xml): paragraph / character styles with basedOn chains ----
const readStyles = (doc) => {
  const styles = {};
  let defaults = { run: {}, para: {} };
  if (!doc) return { styles, defaults };
  const root = doc.documentElement;
  const docDefaults = kid(root, "docDefaults");
  if (docDefaults) {
    defaults = {
      run: readRunProps(kid(kid(docDefaults, "rPrDefault"), "rPr")),
      para: readParaProps(kid(kid(docDefaults, "pPrDefault"), "pPr")),
    };
  }
  kids(root, "style").forEach((s) => {
    const id = wAttr(s, "styleId");
    if (!id) return;
    styles[id] = {
      name: (wAttr(kid(s, "name"), "val") || "").toLowerCase(),
      basedOn: wAttr(kid(s, "basedOn"), "val"),
      run: readRunProps(kid(s, "rPr")),
      para: readParaProps(kid(s, "pPr")),
      numPr: kid(kid(s, "pPr"), "numPr"),
    };
  });
  return { styles, defaults };
};

const resolveStyle = (styles, id, seen = new Set()) => {
  const style = id && styles[id];
  if (!style || seen.has(id)) return { run: {}, para: {}, name: "", numPr: null };
  seen.add(id);
  const base = resolveStyle(styles, style.basedOn, seen);
  return {
    name: style.name,
    run: { ...base.run, ...style.run },
    para: { ...base.para, ...style.para },
    numPr: style.numPr || base.numPr,
  };
};

// ---- numbering.xml: numId → abstract levels { format, text, start } ----
const readNumbering = (doc) => {
  const levels = {};
  if (!doc) return levels;
  const root = doc.documentElement;
  const abstracts = {};
  kids(root, "abstractNum").forEach((a) => {
    const lvls = {};
    kids(a, "lvl").forEach((l) => {
      lvls[wAttr(l, "ilvl")] = {
        format: wAttr(kid(l, "numFmt"), "val") || "decimal",
        text: wAttr(kid(l, "lvlText"), "val") ?? "%1.",
        start: Number(wAttr(kid(l, "start"), "val") || 1),
      };
    });
    abstracts[wAttr(a, "abstractNumId")] = lvls;
  });
  kids(root, "num").forEach((n) => {
    levels[wAttr(n, "numId")] = abstracts[wAttr(kid(n, "abstractNumId"), "val")] || {};
  });
  return levels;
};

const toRoman = (n) => {
  const map = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
};
const toLetters = (n) => {
  let out = "";
  while (n > 0) { n--; out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); }
  return out;
};
const formatNumber = (n, format) => {
  switch (format) {
    case "lowerLetter": return toLetters(n);
    case "upperLetter": return toLetters(n).toUpperCase();
    case "lowerRoman": return toRoman(n);
    case "upperRoman": return toRoman(n).toUpperCase();
    case "decimalZero": return String(n).padStart(2, "0");
    default: return String(n);
  }
};

const runCss = (p) => {
  const css = [];
  if (p.bold) css.push("font-weight:bold");
  if (p.italic) css.push("font-style:italic");
  const lines = [p.underline && "underline", p.strike && "line-through"].filter(Boolean);
  if (lines.length) css.push(`text-decoration:${lines.join(" ")}`);
  if (p.size) css.push(`font-size:${p.size}pt`);
  if (p.color) css.push(`color:${p.color}`);
  if (p.highlight) css.push(`background:${p.highlight}`);
  if (p.caps) css.push("text-transform:uppercase");
  if (p.font) css.push(`font-family:'${p.font.replace(/[^\p{L}\p{N} ._-]/gu, "")}',Arial,sans-serif`);
  if (p.vert) css.push(`vertical-align:${p.vert === "superscript" ? "super" : "sub"};font-size:smaller`);
  return css.join(";");
};

const paraCss = (p) => {
  const css = [];
  if (p.align) css.push(`text-align:${p.align}`);
  if (p.indent) css.push(`margin-left:${p.indent}pt`);
  if (p.firstLine) css.push(`text-indent:${p.firstLine}pt`);
  if (p.before != null) css.push(`margin-top:${p.before}pt`);
  if (p.after != null) css.push(`margin-bottom:${p.after}pt`);
  if (p.shade) css.push(`background:${p.shade}`);
  return css.join(";");
};

const EMU_PER_PX = 9525;

/** Renders a .docx (ArrayBuffer) as HTML; pictures are embedded as data: URIs. */
export async function docxToHtml(buffer) {
  const zip = readZip(buffer);
  const documentXml = await readZipText(zip, "word/document.xml");
  if (!documentXml) throw new Error("Not a Word document");
  const doc = parseXml(documentXml);
  const { styles, defaults } = readStyles(parseXml(await readZipText(zip, "word/styles.xml")));
  const numbering = readNumbering(parseXml(await readZipText(zip, "word/numbering.xml")));

  // relationships → embedded pictures
  const rels = {};
  const relsDoc = parseXml(await readZipText(zip, "word/_rels/document.xml.rels"));
  if (relsDoc) {
    Array.from(relsDoc.documentElement.children).forEach((rel) => {
      if (rel.getAttribute("TargetMode") === "External") return;
      const target = rel.getAttribute("Target") || "";
      rels[rel.getAttribute("Id")] = target.startsWith("/") ? target.slice(1) : `word/${target}`.replace(/\/\.\//g, "/");
    });
  }
  const images = {};
  for (const [id, path] of Object.entries(rels)) {
    const mime = imageMimeOf(path);
    const entry = zip.get(path);
    if (mime && entry) {
      try { images[id] = dataUri(mime, await entry.read()); } catch { /* unreadable picture: left out */ }
    }
  }

  const counters = {}; // numId → [count per level]

  const renderDrawing = (drawing) => {
    const blip = drawing.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", "blip")[0];
    const id = blip && (blip.getAttributeNS(R, "embed") || blip.getAttribute("r:embed"));
    if (!id || !images[id]) return "";
    const extent = drawing.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "extent")[0];
    const width = extent ? Math.round(Number(extent.getAttribute("cx")) / EMU_PER_PX) : 0;
    return `<img src="${images[id]}" alt=""${width ? ` style="width:${width}px;max-width:100%"` : ""}>`;
  };

  const renderRun = (r, baseRun) => {
    const props = { ...baseRun };
    const rPr = kid(r, "rPr");
    const charStyle = wAttr(kid(rPr, "rStyle"), "val");
    if (charStyle) Object.assign(props, resolveStyle(styles, charStyle).run);
    Object.assign(props, readRunProps(rPr));
    let html = "";
    kids(r).forEach((c) => {
      switch (c.localName) {
        case "t": html += escapeHtml(c.textContent); break;
        case "tab": html += '<span style="display:inline-block;width:3em"></span>'; break;
        case "br": html += wAttr(c, "type") === "page" ? '<hr class="page-break">' : "<br>"; break;
        case "cr": html += "<br>"; break;
        case "noBreakHyphen": html += "&#8209;"; break;
        case "sym": html += escapeHtml(String.fromCharCode(parseInt(wAttr(c, "char") || "20", 16))); break;
        case "drawing": html += renderDrawing(c); break;
        case "pict": {
          const imagedata = c.getElementsByTagName("v:imagedata")[0];
          const id = imagedata && (imagedata.getAttributeNS(R, "id") || imagedata.getAttribute("r:id"));
          if (id && images[id]) html += `<img src="${images[id]}" alt="">`;
          break;
        }
        default: break;
      }
    });
    if (!html) return "";
    const css = runCss(props);
    return css ? `<span style="${css}">${html}</span>` : html;
  };

  const renderInline = (el, baseRun) =>
    kids(el).map((c) => {
      switch (c.localName) {
        case "r": return renderRun(c, baseRun);
        case "hyperlink":
          return `<span style="color:#1d4ed8;text-decoration:underline">${renderInline(c, baseRun)}</span>`;
        case "smartTag":
        case "customXml":
        case "ins":
        case "fldSimple":
          return renderInline(c, baseRun);
        case "sdt": return renderInline(kid(c, "sdtContent"), baseRun);
        default: return "";
      }
    }).join("");

  const renderParagraph = (p) => {
    const pPr = kid(p, "pPr");
    const styleId = wAttr(kid(pPr, "pStyle"), "val");
    const style = resolveStyle(styles, styleId);
    const para = { ...defaults.para, ...style.para, ...readParaProps(pPr) };
    const baseRun = { ...defaults.run, ...style.run };

    const heading = /^heading (\d)$/.exec(style.name) || (/^Heading(\d)$/i.exec(styleId || ""));
    const tag = style.name === "title" ? "h1" : heading ? `h${Math.min(6, Number(heading[1]))}` : "p";

    // list marker
    let marker = "";
    const numPr = kid(pPr, "numPr") || style.numPr;
    const numId = wAttr(kid(numPr, "numId"), "val");
    if (numId && numId !== "0" && numbering[numId]) {
      const level = Number(wAttr(kid(numPr, "ilvl"), "val") || 0);
      const defs = numbering[numId];
      const def = defs[level] || { format: "bullet", text: "•", start: 1 };
      const counts = (counters[numId] ||= []);
      counts[level] = (counts[level] ?? (def.start - 1)) + 1;
      counts.length = level + 1; // a new item resets the deeper levels
      if (def.format === "bullet") {
        marker = /^[\x20-\x7e•◦▪–-]$/.test(def.text) ? def.text : "•";
      } else if (def.format !== "none") {
        marker = def.text.replace(/%(\d)/g, (_, n) => {
          const l = Number(n) - 1;
          const d = defs[l] || def;
          return formatNumber(counts[l] ?? d.start, d.format);
        });
      }
      if (!para.indent) para.indent = 18 * (level + 1);
    }

    let content = renderInline(p, baseRun);
    if (marker) content = `<span style="display:inline-block;min-width:1.6em">${escapeHtml(marker)}</span>${content}`;
    const css = paraCss(para);
    return `<${tag}${css ? ` style="${css}"` : ""}>${content || "&nbsp;"}</${tag}>`;
  };

  const renderTable = (tbl) => {
    const rows = kids(tbl, "tr").map((tr) => {
      const cells = kids(tr, "tc").map((tc) => {
        const tcPr = kid(tc, "tcPr");
        const span = Number(wAttr(kid(tcPr, "gridSpan"), "val") || 1);
        const vMerge = kid(tcPr, "vMerge");
        const continued = vMerge && (wAttr(vMerge, "val") || "continue") === "continue";
        const shade = hex(wAttr(kid(tcPr, "shd"), "fill"));
        const css = [continued ? "border-top-color:transparent" : "", shade ? `background:${shade}` : ""].filter(Boolean).join(";");
        return `<td${span > 1 ? ` colspan="${span}"` : ""}${css ? ` style="${css}"` : ""}>${continued ? "" : renderBlocks(tc)}</td>`;
      });
      return `<tr>${cells.join("")}</tr>`;
    });
    return `<table>${rows.join("")}</table>`;
  };

  const renderBlocks = (el) =>
    kids(el).map((c) => {
      switch (c.localName) {
        case "p": return renderParagraph(c);
        case "tbl": return renderTable(c);
        case "sdt": return renderBlocks(kid(c, "sdtContent"));
        case "customXml": return renderBlocks(c);
        default: return "";
      }
    }).join("");

  const body = kid(doc.documentElement, "body");
  return `<style>
    body{background:#eef0f4;padding:24px 12px;}
    .page{background:#fff;max-width:816px;margin:0 auto;padding:56px 64px;box-shadow:0 1px 4px rgba(0,0,0,.15);
      font:11pt/1.4 Calibri,Arial,sans-serif;color:#111;box-sizing:border-box;overflow-wrap:anywhere;}
    .page p{margin:0 0 6pt;} .page h1,.page h2,.page h3,.page h4,.page h5,.page h6{margin:12pt 0 6pt;}
    .page table{border-collapse:collapse;width:100%;margin:6pt 0;} .page td{border:1px solid #9ca3af;padding:4px 6px;vertical-align:top;}
    .page td p{margin:0;} .page hr.page-break{border:0;border-top:1px dashed #cbd5e1;margin:24px -64px;}
    @media (max-width:640px){.page{padding:24px 18px;} .page hr.page-break{margin:24px -18px;}}
  </style><div class="page">${renderBlocks(body)}</div>`;
}
