const { evaluate } = require("../services/rules");
const { templateReport } = require("../services/report");

const ctx = (language, ageYears) => {
  const input = {
    purpose: "milk",
    species: { species: "cow", confidence: 0.95 },
    breed: { label: "Holstein Friesian", confidence: 0.9, uncertain: false },
    age: { age_years: ageYears, interval_90: [ageYears - 1, ageYears + 1], uncertain: false, quality: { ok: true } },
    health: { condition: "healthy", confidence: 0.92 },
    purposeFitLevel: "strong"
  };
  return { ...input, language, rules: evaluate(input) };
};

test("the template report explains an animal too old for the purpose, in English and Urdu", () => {
  expect(templateReport(ctx("en", 14)).risks.join(" ")).toMatch(/At about 14 years it is old for milk/);
  expect(templateReport(ctx("ur", 14)).risks.join(" ")).toContain("تقریباً 14 سال کی عمر دودھ کے لیے زیادہ ہے");
  expect(templateReport(ctx("ur", 4)).risks.join(" ")).not.toContain("کے لیے زیادہ ہے");
});
