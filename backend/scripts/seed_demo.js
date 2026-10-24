/**
 * Creates the demo account and fills it with a few finished checks, so History, Compare and the report screens
 * have something to show in a presentation. Runs real evaluations through the backend (backend and ML service
 * must be running). Does nothing if the demo account already has reports.
 *
 * Usage: cd backend && node scripts/seed_demo.js [--force]   (--force deletes the demo reports and makes new ones)
 * Login: demo@maweshiai.app / maweshi123
 */
const fs = require("fs");
const path = require("path");

const API = process.env.DEMO_API || `http://localhost:${process.env.PORT || 3000}`;
const DEMO = { name: "Demo Buyer", email: "demo@maweshiai.app", password: "maweshi123" };
// Photos stay outside the repo (dataset licences); this is where they live on the project PC. Body photos come
// from the breed project's held-out test split (never used for training), teeth photos from the age dataset.
const BODY = process.env.DEMO_BODY_DIR || "F:/FYP/Models/Breed/cattle-breed-classification-dataset/Master-Dataset/master_dataset/master_dataset/test";
const TEETH = process.env.DEMO_TEETH_DIR || "F:/FYP/Models/Age Detection/Dataset/Dataset/Cattle Dentition Dataset";

// A spread of situations: good milk animals, a buffalo, a Qurbani animal that is too young, a very old and overpriced
// cow, and two in Urdu
const CHECKS = [
  { body: "sahiwal/DS02__Sahiwal_131.png", teeth: "up to 4 year", purpose: "milk", budget: 250000, sellerPrice: 240000, language: "en" },
  { body: "holstein-friesian/DS03__Holstein_Friesian_245.jpg", teeth: "up to 10 year", purpose: "milk", budget: 300000, sellerPrice: 320000, language: "en" },
  { body: "nili-ravi/DS03__Nili_Ravi_74__aug1_nili-ravi_214.jpg", teeth: "up to 5 year", purpose: "milk", budget: 350000, sellerPrice: 330000, language: "en" },
  { body: "gir/DS02__Gir_376.jpg", teeth: "up to 2 year", purpose: "qurbani", budget: 200000, sellerPrice: 260000, language: "en" },
  { body: "holstein-friesian/DS03__Holstein_Friesian_186.jpg", teeth: "up to 14 year", purpose: "milk", budget: 250000, sellerPrice: 330000, language: "en" },
  { body: "tharparkar/DS03__Tharparkar_18.jpg", teeth: "up to 4 year", purpose: "milk", budget: 220000, sellerPrice: 230000, language: "ur" },
  { body: "gir/DS02__Gir_124.jpg", teeth: "up to 3 year", purpose: "breeding", budget: 280000, sellerPrice: 270000, language: "ur" }
];

const call = async (route, options = {}) => {
  const res = await fetch(API + route, options);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

const firstImage = (dir) => {
  const name = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()[0];
  if (!name) throw new Error(`No photos in ${dir}`);
  return path.join(dir, name);
};

const blob = (file) => new Blob([fs.readFileSync(file)], { type: /\.png$/i.test(file) ? "image/png" : "image/jpeg" });

const token = async () => {
  const login = await call("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO.email, password: DEMO.password })
  });
  if (login.status === 200) return login.body.token;
  const reg = await call("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DEMO)
  });
  if (reg.status !== 201) throw new Error(`Could not create the demo account (${reg.status} ${reg.body.message || ""})`);
  return reg.body.token;
};

(async () => {
  for (const dir of [BODY, TEETH]) {
    if (!fs.existsSync(dir)) {
      console.log(`Demo data skipped: photos not found at ${dir}`);
      return;
    }
  }
  const auth = { Authorization: `Bearer ${await token()}` };
  const existing = await call("/api/evaluations", { headers: auth });
  if (existing.body.total > 0 && !process.argv.includes("--force")) {
    console.log(`Demo account ready (${existing.body.total} reports). Login: ${DEMO.email} / ${DEMO.password}`);
    return;
  }
  for (const item of existing.body.items || []) {
    await call(`/api/evaluations/${item.id}`, { method: "DELETE", headers: auth });
  }
  for (const c of CHECKS) {
    const form = new FormData();
    const side = path.join(BODY, c.body);
    for (const view of ["front", "back", "left", "right"]) form.append(view, blob(side), `${view}.jpg`);
    const teeth = firstImage(path.join(TEETH, c.teeth));
    form.append("teeth", blob(teeth), path.basename(teeth));
    for (const key of ["purpose", "budget", "sellerPrice", "language"]) form.append(key, String(c[key]));
    form.append("experience", "first_time");
    const res = await call("/api/evaluations", { method: "POST", headers: auth, body: form });
    if (res.status !== 202) {
      console.log(`  ${c.body}: not started (${res.status} ${res.body.message || ""})`);
      continue;
    }
    let e;
    for (let i = 0; i < 120; i += 1) {
      e = (await call(`/api/evaluations/${res.body.id}`, { headers: auth })).body.evaluation;
      if (e && e.status !== "processing") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`  ${path.basename(c.body)} (${c.purpose}, ${c.language}): ${e.status} ${e.verdict || ""} ${e.score ?? ""}`);
  }
  console.log(`Demo account ready. Login: ${DEMO.email} / ${DEMO.password}`);
})().catch((error) => {
  console.error("Demo data failed:", error.message);
  process.exitCode = 1;
});
