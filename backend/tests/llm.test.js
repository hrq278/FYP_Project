const llm = require("../services/llm");

// Fake Anthropic client: returns queued responses and records each request
const fakeClient = (responses) => {
  const calls = [];
  return {
    calls,
    messages: {
      parse: jest.fn(async (params) => {
        calls.push(params);
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      })
    }
  };
};
const ok = (parsed) => ({ stop_reason: "end_turn", parsed_output: parsed });

const rules = {
  verdict: "recommended",
  score: 82,
  purposeFitLevel: "strong",
  reasons: ["No signs of Foot-and-Mouth or Lumpy Skin Disease in the photos."],
  risks: ["The seller's price is 30% above your budget."],
  flags: ["over_budget"]
};
const ctx = (overrides = {}) => ({
  purpose: "milk",
  language: "en",
  budget: 200000,
  sellerPrice: 260000,
  experience: "first_time",
  species: { species: "cow", confidence: 0.95 },
  breed: { label: "Sahiwal", confidence: 0.85, uncertain: false, source: "model" },
  age: { age_years: 3, interval_90: [2, 4], permanent_incisors_estimate: 4, uncertain: false, quality: { ok: true } },
  health: { condition: "healthy", confidence: 0.93 },
  rules,
  ...overrides
});
const goodReport = {
  summary: "Healthy Sahiwal cow, a good fit for milk.",
  reasons: ["Sahiwal is a dairy breed.", "No disease signs."],
  risks: ["The price is 30% over your budget."],
  purposeFit: "Strong fit for milk.",
  tips: ["Watch one full milking.", "Ask for the vaccination record.", "Check the udder and teats."]
};

beforeAll(() => {
  process.env.LLM_API_KEY = "test-key";
});
afterAll(() => {
  delete process.env.LLM_API_KEY;
  llm._setClient(null);
});

describe("generateReport", () => {
  test("returns an LLM report that keeps the rule engine's fit level", async () => {
    const client = fakeClient([ok(goodReport)]);
    llm._setClient(client);
    const report = await llm.generateReport(ctx());
    expect(report).toMatchObject({ ...goodReport, purposeFitLevel: "strong", source: "llm", promptVersion: "report-v1" });

    const req = client.calls[0];
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req.output_config.format.type).toBe("json_schema");
    const text = req.messages[0].content;
    expect(text).toContain('"verdict": "Recommended"');
    expect(text).toContain("Punjab, Pakistan"); // Sahiwal facts from the knowledge base
    expect(text).toContain("The seller's price is 30% above your budget.");
    expect(req.system).toMatch(/never change, soften or contradict the verdict/);
  });

  test("asks for Urdu when the evaluation language is Urdu", async () => {
    const client = fakeClient([ok(goodReport)]);
    llm._setClient(client);
    await llm.generateReport(ctx({ language: "ur" }));
    expect(client.calls[0].messages[0].content).toMatch(/simple Urdu \(Urdu script\)/);
  });

  test("breeds without a knowledge-base entry get no breed facts", async () => {
    const client = fakeClient([ok(goodReport)]);
    llm._setClient(client);
    await llm.generateReport(ctx({ breed: { label: "Mystery", confidence: 0.7 } }));
    expect(client.calls[0].messages[0].content).toContain("do not state breed facts");
  });

  test("invalid output is retried once", async () => {
    const client = fakeClient([ok({ summary: "missing fields" }), ok(goodReport)]);
    llm._setClient(client);
    const report = await llm.generateReport(ctx());
    expect(report.source).toBe("llm");
    expect(client.calls).toHaveLength(2);
  });

  test("invalid output twice throws, so the caller uses the template", async () => {
    llm._setClient(fakeClient([ok(null), ok({ nope: true })]));
    await expect(llm.generateReport(ctx())).rejects.toBeInstanceOf(llm.LLMError);
  });

  test("a refusal is not retried", async () => {
    const client = fakeClient([{ stop_reason: "refusal", stop_details: { category: null }, parsed_output: null }]);
    llm._setClient(client);
    await expect(llm.generateReport(ctx())).rejects.toThrow(/declined/);
    expect(client.calls).toHaveLength(1);
  });

  test("API errors go straight to the fallback", async () => {
    const client = fakeClient([new Error("network down")]);
    llm._setClient(client);
    await expect(llm.generateReport(ctx())).rejects.toBeInstanceOf(llm.LLMError);
    expect(client.calls).toHaveLength(1);
  });
});

describe("verifyBreed", () => {
  const image = { buffer: Buffer.from("fake-jpeg"), mimetype: "image/jpeg" };

  test("sends the photo and the classifier's suggestions", async () => {
    const client = fakeClient([ok({ breed: "Sahiwal", confidence: 0.8, inKnownClasses: true, reasoning: "Red coat, loose skin." })]);
    llm._setClient(client);
    const out = await llm.verifyBreed({ image, species: "cow", modelTop3: [{ breed: "Sahiwal", confidence: 0.6 }] });
    expect(out).toMatchObject({ breed: "Sahiwal", confidence: 0.8, inKnownClasses: true, promptVersion: "breed-check-v1" });
    const [img, text] = client.calls[0].messages[0].content;
    expect(img).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from("fake-jpeg").toString("base64") } });
    expect(text.text).toContain("Sahiwal (60%)");
  });

  test("a breed outside the model's classes is marked as such, and confidence is clamped", async () => {
    llm._setClient(fakeClient([ok({ breed: "Cholistani", confidence: 1.4, inKnownClasses: true, reasoning: "x" })]));
    const out = await llm.verifyBreed({ image, species: "cow" });
    expect(out.inKnownClasses).toBe(false);
    expect(out.confidence).toBe(1);
  });
});

describe("answerQuestion and explainComparison", () => {
  const evaluation = {
    purpose: "milk",
    language: "en",
    verdict: "recommended",
    score: 82,
    results: { breed: { final: { label: "Sahiwal" } }, species: { species: "cow" }, age: { age_years: 3 }, health: { condition: "healthy" } },
    report: goodReport
  };

  test("answers with the report as context and exactly 3 suggestions", async () => {
    const client = fakeClient([ok({ answer: "About 8-10 litres a day with good feed.", suggestions: ["a", "b", "c", "d"] })]);
    llm._setClient(client);
    const out = await llm.answerQuestion({ evaluation, history: [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello" }], question: "How much milk?" });
    expect(out.suggestions).toEqual(["a", "b", "c"]);
    expect(client.calls[0].system).toContain('"breed":"Sahiwal"');
    expect(client.calls[0].messages[0].content).toMatch(/Buyer: Hi\nMaweshiAI: Hello\nBuyer: How much milk\?/);
  });

  test("comparison reasons are generated for the chosen winner only", async () => {
    const client = fakeClient([ok({ reason: "A is younger and healthier." })]);
    llm._setClient(client);
    const out = await llm.explainComparison({ purpose: "milk", language: "en", winner: { letter: "A" }, other: { letter: "B" } });
    expect(out.reason).toBe("A is younger and healthier.");
    expect(client.calls[0].system).toMatch(/never argue for the other animal/);
  });
});
