/**
 * Breed knowledge base lookup (data/breeds.json, filled with sourced facts in Module 3).
 * Breeds without an entry return "unknown", which the rule engine scores as neutral.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "breeds.json");

let cache = null;

const load = () => {
  if (cache) return cache;
  cache = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { breeds: {} };
  return cache;
};

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

const entryFor = (breedLabel) => {
  const { breeds } = load();
  const key = Object.keys(breeds).find((k) => norm(k) === norm(breedLabel) || (breeds[k].aliases || []).some((a) => norm(a) === norm(breedLabel)));
  return key ? { key, ...breeds[key] } : null;
};

const purposeFit = (breedLabel, purpose) => entryFor(breedLabel)?.suitability?.[purpose] || "unknown";

module.exports = { entryFor, purposeFit, _reset: () => { cache = null; } };
