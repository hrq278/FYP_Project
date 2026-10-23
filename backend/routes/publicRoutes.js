const express = require("express");
const Evaluation = require("../models/Evaluation");
const wrap = require("../middleware/asyncHandler");

const router = express.Router();

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const TEXT = {
  en: {
    title: "Animal Buying Advisory Report",
    verdict: { recommended: "Recommended", caution: "Caution", not_recommended: "Not Recommended" },
    purpose: { milk: "Milk (Dairy)", breeding: "Breeding", qurbani: "Qurbani", meat: "Meat / Fattening", farm_work: "Farm Work", other: "Other" },
    species: { cow: "Cow", buffalo: "Buffalo" },
    health: { healthy: "No disease signs", "foot-and-mouth": "Signs of Foot-and-Mouth Disease", lumpy: "Signs of Lumpy Skin Disease", uncertain: "Not conclusive" },
    labels: { species: "Species", breed: "Breed", age: "Age", health: "Health", reasons: "Reasons for this verdict", risks: "Risks to consider", years: "years", date: "Date", purposeL: "Purpose" },
    notFound: "This report link is not valid or has been deleted.",
    disclaimer: "This is AI-based advice, not a replacement for a vet. Results depend on photo quality. Please have the animal checked by a qualified veterinarian before purchase."
  },
  ur: {
    title: "جانور کی خریداری کی مشاورتی رپورٹ",
    verdict: { recommended: "تجویز کردہ", caution: "احتیاط", not_recommended: "تجویز نہیں" },
    purpose: { milk: "دودھ", breeding: "نسل کشی", qurbani: "قربانی", meat: "گوشت / فربہ", farm_work: "کھیتی کا کام", other: "دیگر" },
    species: { cow: "گائے", buffalo: "بھینس" },
    health: { healthy: "بیماری کی کوئی علامت نہیں", "foot-and-mouth": "منہ کھر کی بیماری کی علامات", lumpy: "لمپی اسکن بیماری کی علامات", uncertain: "واضح نہیں" },
    labels: { species: "قسم", breed: "نسل", age: "عمر", health: "صحت", reasons: "فیصلے کی وجوہات", risks: "دھیان دینے والی باتیں", years: "سال", date: "تاریخ", purposeL: "مقصد" },
    notFound: "یہ رپورٹ لنک درست نہیں یا رپورٹ حذف ہو چکی ہے۔",
    disclaimer: "یہ AI پر مبنی مشورہ ہے، ڈاکٹر (ویٹرنری) کا متبادل نہیں۔ نتائج تصویروں کے معیار پر منحصر ہیں۔ خریدنے سے پہلے جانور کو مستند ڈاکٹر سے چیک کروائیں۔"
  }
};

const COLORS = {
  recommended: ["#DDF0E2", "#14532D", "#1E7A3E"],
  caution: ["#FCEFCF", "#6E4300", "#D18A00"],
  not_recommended: ["#FBE1DE", "#8F1A1A", "#C0262D"]
};

const page = (lang, body) => `<!doctype html>
<html lang="${lang}" dir="${lang === "ur" ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>MaweshiAI</title>
<style>
body{margin:0;background:#FAF7F0;color:#1B1F1A;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:640px;margin:0 auto;padding:20px}
h1{font-size:22px;margin:0 0 4px}.muted{color:#4A5248}.card{background:#fff;border:2px solid #E6E0D3;border-radius:20px;padding:16px;margin:14px 0}
.badge{display:inline-block;border-radius:999px;padding:6px 14px;font-weight:800}.score{font-size:40px;font-weight:800}
img{width:100%;border-radius:16px;display:block}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #EFEBE1}
td:first-child{color:#4A5248;width:35%}ul{padding-inline-start:20px;margin:6px 0}
</style></head><body><main>${body}</main></body></html>`;

// GET /r/:reportId?k=<shareKey> — read-only report for the QR code on the PDF (no budget, price or owner)
router.get(
  "/:reportId",
  wrap(async (req, res) => {
    const e = req.query.k
      ? await Evaluation.findOne({ reportId: req.params.reportId, shareKey: String(req.query.k), status: "done" }).lean()
      : null;
    if (!e) {
      return res.status(404).type("html").send(page("en", `<h1>MaweshiAI</h1><p>${TEXT.en.notFound}</p><p dir="rtl">${TEXT.ur.notFound}</p>`));
    }
    const lang = e.language === "ur" ? "ur" : "en";
    const T = TEXT[lang];
    const [bg, fg, fill] = COLORS[e.verdict] || COLORS.caution;
    const breed = e.results?.breed?.final;
    const age = e.results?.age;
    const list = (items) => `<ul>${(items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const body = `
<h1>Maweshi<span style="color:#B45309">AI</span></h1>
<div class="muted">${esc(T.title)} · ${esc(e.reportId)}</div>
<div class="muted">${T.labels.date}: ${esc(new Date(e.createdAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", year: "numeric" }))} · ${T.labels.purposeL}: ${esc(T.purpose[e.purpose] || e.purpose)}</div>
${e.images?.front?.url ? `<div class="card" style="padding:8px"><img src="${esc(e.images.front.url)}" alt=""></div>` : ""}
<div class="card" style="border-color:${fill}">
  <span class="badge" style="background:${fill};color:#fff">${esc(T.verdict[e.verdict])}</span>
  <span class="score" style="margin-inline-start:12px">${esc(e.score)}</span><span class="muted">/100</span>
  <p style="font-weight:700">${esc(e.report?.summary)}</p>
</div>
<div class="card"><table>
  <tr><td>${T.labels.species}</td><td>${esc(T.species[e.results?.species?.species] || "-")}</td></tr>
  <tr><td>${T.labels.breed}</td><td>${esc(breed?.label || "-")}</td></tr>
  <tr><td>${T.labels.age}</td><td>${age?.age_years != null ? `~${esc(age.age_years)} ${T.labels.years}` : "-"}</td></tr>
  <tr><td>${T.labels.health}</td><td>${esc(T.health[e.results?.health?.condition] || "-")}</td></tr>
</table></div>
<div class="card" style="background:${bg};border-color:${bg}"><strong style="color:${fg}">${T.labels.reasons}</strong>${list(e.report?.reasons)}</div>
<div class="card" style="background:#FCEFCF;border-color:#FCEFCF"><strong style="color:#6E4300">${T.labels.risks}</strong>${list(e.report?.risks)}</div>
<p class="muted" style="font-size:14px">${esc(T.disclaimer)}</p>`;
    return res.type("html").send(page(lang, body));
  })
);

module.exports = router;
