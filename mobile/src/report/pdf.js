import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import * as Print from "expo-print";
import { Platform } from "react-native";
import qrcode from "qrcode-generator";
import { getServerUrl } from "../../services/api";

const VERDICT = {
  recommended: { fill: "#1E7A3E", bg: "#F2F8F3", border: "#1E7A3E", icon: "✓" },
  caution: { fill: "#D18A00", bg: "#FFF8E8", border: "#D18A00", icon: "!" },
  not_recommended: { fill: "#C0262D", bg: "#FDF1EF", border: "#C0262D", icon: "×" }
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Online read-only copy of the report (backend /r/:reportId), opened by the QR code
export const reportLink = (e) =>
  e?.reportId && e?.shareKey ? `${getServerUrl()}/r/${e.reportId}?k=${e.shareKey}` : null;

export const qrSvg = (text, size = 84) => {
  if (!text) return "";
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const cells = qr.getModuleCount();
  const cell = size / cells;
  let rects = "";
  for (let r = 0; r < cells; r += 1) {
    for (let c = 0; c < cells; c += 1) {
      if (qr.isDark(r, c)) rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#1B1F1A">${rects}</g></svg>`;
};

const LOGO = `<svg width="40" height="40" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19 C15 17 12.5 12 14 7"/><path d="M43 19 C49 17 51.5 12 50 7"/><path d="M21 23 L10 25 L19 30"/><path d="M43 23 L54 25 L45 30"/><rect x="20" y="17" width="24" height="21" rx="7"/><rect x="21.5" y="35" width="21" height="15" rx="7.5"/><circle cx="27" cy="27" r="2" fill="#fff"/><circle cx="37" cy="27" r="2" fill="#fff"/></svg>`;

let urduFontCss = null;

// Noto Nastaliq Urdu as an embedded @font-face (the PDF renderer can't see app fonts)
async function loadUrduFontCss() {
  if (urduFontCss !== null) return urduFontCss;
  try {
    const asset = Asset.fromModule(require("@expo-google-fonts/noto-nastaliq-urdu/400Regular/NotoNastaliqUrdu_400Regular.ttf"));
    await asset.downloadAsync();
    let base64;
    if (Platform.OS === "web") {
      const buf = await (await fetch(asset.uri)).arrayBuffer();
      let bin = "";
      new Uint8Array(buf).forEach((b) => {
        bin += String.fromCharCode(b);
      });
      base64 = btoa(bin);
    } else {
      base64 = await new File(asset.localUri || asset.uri).base64();
    }
    urduFontCss = `@font-face{font-family:'Nastaliq';src:url(data:font/ttf;base64,${base64}) format('truetype');}`;
  } catch {
    urduFontCss = ""; // falls back to the system Urdu font
  }
  return urduFontCss;
}

/**
 * A4 report HTML (spec §6). Pure: everything it shows comes from the arguments.
 * @param {object} p { e (evaluation), t (i18n t), lang, preparedFor, qr (svg string), fontCss }
 */
export function buildReportHtml({ e, t, lang, preparedFor, qr, fontCss = "" }) {
  const ur = lang === "ur";
  const v = VERDICT[e.verdict] || VERDICT.caution;
  const date = new Date(e.createdAt).toLocaleDateString(ur ? "ur-PK" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const purpose = t(`purpose.${e.purpose}`);
  const species = e.results?.species;
  const breed = e.results?.breed?.final;
  const age = e.results?.age;
  const health = e.results?.health?.condition || "uncertain";
  const pct = (c) => (typeof c === "number" ? `${Math.round(c * 100)}%` : "—");
  const list = (items) => (items || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const ageText =
    age?.age_years != null
      ? `${esc(t("report.years", { count: age.age_years }))}${age.permanent_incisors_estimate != null ? ` (${esc(t("report.teeth", { count: age.permanent_incisors_estimate }))})` : ""}${age.uncertain ? ` · ${esc(t("report.uncertain"))}` : ""}`
      : "—";
  const breedText = breed?.label
    ? `${esc(breed.label)}${breed.possibly ? ` · ${esc(t("report.possibly", { breed: breed.possibly }))}` : ""}`
    : "—";
  const fit = e.report?.purposeFitLevel || "unknown";
  const photo = e.images?.front?.url;

  return `<!doctype html><html lang="${lang}" dir="${ur ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<style>
${fontCss}
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:${ur ? "'Nastaliq','Noto Nastaliq Urdu'," : ""}'Helvetica Neue',Arial,sans-serif;color:#1B1F1A;font-size:13px;line-height:${ur ? 2 : 1.45}}
.page{width:210mm;min-height:296mm;padding:13mm 14mm;display:flex;flex-direction:column}
.head{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:4px solid #1F5F3A}
.logo{width:60px;height:60px;border-radius:16px;background:#1F5F3A;display:flex;align-items:center;justify-content:center}
.brand{flex:1}.brand b{font-size:26px;font-family:'Helvetica Neue',Arial,sans-serif}.brand b span{color:#B45309}
.sub{color:#4A5248;font-weight:700}
.meta{border-collapse:collapse}.meta td{padding:1px 8px;font-size:12px}.meta td:first-child{color:#4A5248}.meta td:last-child{font-weight:700}
.qr{text-align:center;font-size:10px;color:#4A5248}
.top{display:flex;gap:20px;margin-top:22px}
.photo{width:300px}.photo .img{width:300px;height:220px;border-radius:14px;background:#9DB08F;object-fit:cover;display:block}
.photo .cap{font-size:11px;color:#4A5248;margin-top:4px}
.verdict{flex:1;border:3px solid ${v.border};background:${v.bg};border-radius:16px;padding:16px}
.over{font-size:11px;font-weight:800;letter-spacing:.08em;color:#4A5248;text-transform:uppercase}
.badge{display:inline-flex;align-items:center;gap:8px;background:${v.fill};color:#fff;border-radius:999px;padding:6px 16px;font-size:18px;font-weight:800}
.badge i{font-style:normal;background:#fff;color:${v.fill};border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center}
.score{font-size:40px;font-weight:800;font-family:'Helvetica Neue',Arial,sans-serif}.score small{font-size:14px;color:#4A5248}
.summary{font-size:16px;font-weight:700;margin-top:8px}
h2{font-size:17px;margin:26px 0 8px}
table.sum{width:100%;border-collapse:collapse;border:1px solid #DCD6C8}
table.sum th{background:#E3EFE5;text-align:start;padding:8px 10px;font-size:12px}
table.sum td{border-top:1px solid #DCD6C8;padding:8px 10px}
table.sum td.c{text-align:end;font-weight:800;width:110px}
.boxes{display:flex;gap:16px;margin-top:22px}
.box{flex:1;border-radius:14px;padding:12px 16px}
.box.ok{background:#F2F8F3;border:2px solid #C9DCCD}.box.risk{background:#FFF8E8;border:2px solid #F2D9A0}
.box b{font-size:14px}.box ul{margin:6px 0 0;padding-inline-start:18px}
.spacer{flex:1}
.disc{border-top:2px solid #E6E0D3;margin-top:24px;padding-top:12px;font-size:11px;color:#3F473D}
.foot{display:flex;justify-content:space-between;font-size:10px;color:#4A5248;margin-top:8px}
</style></head><body><div class="page">
<div class="head">
  <div class="logo">${LOGO}</div>
  <div class="brand"><b>Maweshi<span>AI</span></b><div class="sub">${esc(t("report.pdf.title"))}</div></div>
  <table class="meta">
    <tr><td>${esc(t("report.pdf.reportId"))}</td><td dir="ltr">${esc(e.reportId)}</td></tr>
    <tr><td>${esc(t("report.pdf.date"))}</td><td>${esc(date)}</td></tr>
    <tr><td>${esc(t("report.pdf.purpose"))}</td><td>${esc(purpose)}</td></tr>
    ${preparedFor ? `<tr><td>${esc(t("report.pdf.preparedFor"))}</td><td>${esc(preparedFor)}</td></tr>` : ""}
  </table>
  ${qr ? `<div class="qr">${qr}<div>${esc(t("report.pdf.scan"))}</div></div>` : ""}
</div>
<div class="top">
  <div class="photo">${photo ? `<img class="img" src="${esc(photo)}">` : `<div class="img"></div>`}<div class="cap">${esc(t("report.pdf.photoCaption", { date }))}</div></div>
  <div class="verdict">
    <div class="over">${esc(t("report.verdictLabel"))}</div>
    <div style="display:flex;align-items:center;gap:14px;margin-top:6px"><span class="badge"><i>${v.icon}</i>${esc(t(`verdict.${e.verdict}`))}</span><span class="score" dir="ltr">${esc(e.score)}<small>/100</small></span></div>
    <div class="summary">${esc(e.report?.summary)}</div>
  </div>
</div>
<h2>${esc(t("report.pdf.summary"))}</h2>
<table class="sum">
  <tr><th>${esc(t("report.pdf.check"))}</th><th>${esc(t("report.pdf.result"))}</th><th style="text-align:end">${esc(t("report.pdf.confidence"))}</th></tr>
  <tr><td>${esc(t("report.species"))}</td><td>${esc(species?.species ? t(`species.${species.species}`) : "—")}</td><td class="c" dir="ltr">${pct(species?.confidence)}</td></tr>
  <tr><td>${esc(t("report.breed"))}</td><td>${breedText}</td><td class="c" dir="ltr">${pct(breed?.confidence)}</td></tr>
  <tr><td>${esc(t("report.age"))}</td><td>${ageText}</td><td class="c">—</td></tr>
  <tr><td>${esc(t("report.health"))}</td><td>${esc(t(`report.healthValue.${health}`))} · ${esc(t(`report.healthNote.${health}`))}</td><td class="c" dir="ltr">${pct(e.results?.health?.confidence)}</td></tr>
  <tr><td>${esc(t("report.pdf.purposeFit"))}</td><td>${esc(purpose)}: <b>${esc(t(`report.fitLevel.${fit}`))}</b></td><td class="c">—</td></tr>
</table>
<div class="boxes">
  <div class="box ok"><b>✓ ${esc(t("report.pdf.reasons"))}</b><ul>${list(e.report?.reasons)}</ul></div>
  <div class="box risk"><b>⚠ ${esc(t("report.risks"))}</b><ul>${list(e.report?.risks)}</ul></div>
</div>
<div class="spacer"></div>
<div class="disc"><b>${esc(t("report.pdf.disclaimer"))}</b> ${esc(t("report.pdf.disclaimerText"))}</div>
<div class="foot"><span>${esc(t("report.pdf.generated", { id: e.reportId }))}</span><span>${esc(t("report.pdf.page"))}</span></div>
</div></body></html>`;
}

/**
 * Creates the PDF file. On web (layout checks) it opens the print dialog instead and returns null.
 */
export async function createReportPdf({ e, t, lang, preparedFor }) {
  const fontCss = lang === "ur" ? await loadUrduFontCss() : "";
  const html = buildReportHtml({ e, t, lang, preparedFor, qr: qrSvg(reportLink(e)), fontCss });
  if (Platform.OS === "web") {
    // expo-print on web prints the current page and ignores `html`: open the report in its own window instead
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => w.print();
    }
    return null;
  }
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  return uri;
}
