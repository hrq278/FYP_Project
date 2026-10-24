const { evaluate } = require("../services/rules");

const healthyCow = (overrides = {}) => ({
  purpose: "milk",
  species: { species: "cow", confidence: 0.95 },
  breed: { label: "Sahiwal", confidence: 0.85, uncertain: false },
  age: { age_years: 3, interval_90: [2, 4], uncertain: false, permanent_incisors_estimate: 4, quality: { ok: true } },
  health: { condition: "healthy", confidence: 0.92 },
  purposeFitLevel: "strong",
  ...overrides
});

describe("score", () => {
  test("is the documented sum of its parts", () => {
    const r = evaluate(healthyCow());
    expect(r.scoreBreakdown).toEqual({ purposeFit: 40, age: 25, health: 25, confidence: 9 });
    expect(r.score).toBe(99);
    expect(r.verdict).toBe("recommended");
  });

  test("unknown breed suitability is neutral", () => {
    const r = evaluate(healthyCow({ purposeFitLevel: undefined }));
    expect(r.scoreBreakdown.purposeFit).toBe(20);
    expect(r.purposeFitLevel).toBe("unknown");
  });

  test("an uncertain age estimate earns at most 15 age points", () => {
    expect(evaluate(healthyCow({ age: { age_years: 3, uncertain: true, interval_90: [1, 8] } })).scoreBreakdown.age).toBe(15);
  });
});

describe("health rules", () => {
  test("FMD is never recommended and is capped at 25", () => {
    const r = evaluate(healthyCow({ health: { condition: "foot-and-mouth", confidence: 0.9 } }));
    expect(r.verdict).toBe("not_recommended");
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.flags).toContain("fmd");
  });

  test("Lumpy Skin Disease is never recommended and is capped at 25", () => {
    const r = evaluate(healthyCow({ health: { condition: "lumpy", confidence: 0.8 } }));
    expect(r.verdict).toBe("not_recommended");
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.flags).toContain("lumpy_skin");
  });

  test("an inconclusive health check is at best caution", () => {
    const r = evaluate(healthyCow({ health: { condition: "uncertain", confidence: 0.5 } }));
    expect(r.verdict).toBe("caution");
    expect(r.flags).toContain("health_uncertain");
  });
});

describe("Qurbani age rule", () => {
  test("under 2 years is not eligible", () => {
    const r = evaluate(healthyCow({ purpose: "qurbani", age: { age_years: 1, interval_90: [1, 2], uncertain: false } }));
    expect(r.verdict).toBe("not_recommended");
    expect(r.flags).toContain("qurbani_underage");
    expect(r.reasons.join(" ")).toMatch(/Not eligible for Qurbani by age/);
  });

  test("an uncertain age that could be under 2 is caution with a teeth check", () => {
    const r = evaluate(healthyCow({ purpose: "qurbani", age: { age_years: 3, interval_90: [1, 5], uncertain: true } }));
    expect(r.verdict).toBe("caution");
    expect(r.flags).toContain("qurbani_age_unclear");
    expect(r.risks.join(" ")).toMatch(/do daant/);
  });

  test("a clear adult is fine for Qurbani", () => {
    const r = evaluate(healthyCow({ purpose: "qurbani", purposeFitLevel: "strong" }));
    expect(r.verdict).toBe("recommended");
  });
});

describe("age outside the purpose's useful range", () => {
  test("a 14-year-old cow for milk is at best caution with an age risk", () => {
    const r = evaluate(healthyCow({ age: { age_years: 14, interval_90: [13, 15], uncertain: false, quality: { ok: true } } }));
    expect(r.verdict).toBe("caution");
    expect(r.score).toBeLessThan(70);
    expect(r.flags).toContain("too_old_for_purpose");
    expect(r.risks.join(" ")).toMatch(/old for milk/);
  });

  test("a 1-year-old heifer for milk is at best caution as too young", () => {
    const r = evaluate(healthyCow({ age: { age_years: 1, interval_90: [1, 2], uncertain: false, quality: { ok: true } } }));
    expect(r.verdict).toBe("caution");
    expect(r.flags).toContain("too_young_for_purpose");
  });

  test("an age inside the range or an uncertain age adds no age cap", () => {
    expect(evaluate(healthyCow()).flags).not.toContain("too_old_for_purpose");
    const unsure = evaluate(healthyCow({ age: { age_years: 14, interval_90: [6, 15], uncertain: true } }));
    expect(unsure.flags).not.toContain("too_old_for_purpose");
  });

  test("Qurbani keeps its own age rule", () => {
    const r = evaluate(healthyCow({ purpose: "qurbani", age: { age_years: 14, interval_90: [13, 15], uncertain: false } }));
    expect(r.flags).not.toContain("too_old_for_purpose");
  });
});

describe("confidence and price", () => {
  test("any core confidence below 0.6 is at best caution", () => {
    const r = evaluate(healthyCow({ breed: { label: "Sahiwal", confidence: 0.4, uncertain: false } }));
    expect(r.verdict).toBe("caution");
    expect(r.score).toBeLessThan(70);
    expect(r.flags).toContain("low_confidence");
  });

  test("seller price more than 20% over budget adds a risk", () => {
    const r = evaluate(healthyCow({ budget: 200000, sellerPrice: 260000 }));
    expect(r.flags).toContain("over_budget");
    expect(r.risks.join(" ")).toMatch(/30% above your budget/);
  });

  test("seller price within 20% of budget adds no risk", () => {
    expect(evaluate(healthyCow({ budget: 200000, sellerPrice: 230000 })).flags).not.toContain("over_budget");
  });

  test("an uncertain breed scores as unknown suitability", () => {
    const r = evaluate(healthyCow({ breed: { label: "Gir", confidence: 0.7, uncertain: true } }));
    expect(r.purposeFitLevel).toBe("unknown");
  });
});
