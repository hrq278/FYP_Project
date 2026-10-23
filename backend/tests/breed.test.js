const { reconcile } = require("../services/breed");

const model = (overrides = {}) => ({
  breed: "Sahiwal",
  breed_key: "sahiwal",
  confidence: 0.6,
  uncertain: false,
  top3: [
    { breed: "Sahiwal", confidence: 0.6 },
    { breed: "Red Sindhi", confidence: 0.25 },
    { breed: "Gir", confidence: 0.1 }
  ],
  ...overrides
});

test("without an LLM result the model's answer is kept", () => {
  expect(reconcile(model(), null)).toMatchObject({ label: "Sahiwal", confidence: 0.6, source: "model" });
});

test("agreement raises confidence", () => {
  const r = reconcile(model(), { breed: "sahiwal", confidence: 0.8, inKnownClasses: true });
  expect(r.label).toBe("Sahiwal");
  expect(r.source).toBe("model+ai_vision");
  expect(r.confidence).toBeCloseTo(0.95);
});

test("a confident LLM breed outside the model's classes wins", () => {
  const r = reconcile(model(), { breed: "Cholistani", confidence: 0.85, inKnownClasses: false });
  expect(r).toMatchObject({ label: "Cholistani", source: "ai_vision", possibly: "Sahiwal", uncertain: false });
});

test("a confident LLM breed in the model's top 3 wins", () => {
  expect(reconcile(model(), { breed: "Red Sindhi", confidence: 0.8, inKnownClasses: true }).label).toBe("Red Sindhi");
});

test("disagreement lowers confidence and marks the breed uncertain", () => {
  const r = reconcile(model(), { breed: "Jersey", confidence: 0.5, inKnownClasses: true });
  expect(r).toMatchObject({ label: "Sahiwal", possibly: "Jersey", uncertain: true });
  expect(r.confidence).toBeCloseTo(0.42);
});

test("an LLM 'unknown' is ignored", () => {
  expect(reconcile(model(), { breed: "unknown", confidence: 0 }).source).toBe("model");
});
