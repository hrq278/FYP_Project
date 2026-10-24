jest.mock("../services/mlClient", () => {
  const actual = jest.requireActual("../services/mlClient");
  return { MLServiceError: actual.MLServiceError, quality: jest.fn(), species: jest.fn(), breed: jest.fn(), age: jest.fn(), health: jest.fn(), legacyPredict: jest.fn() };
});
jest.mock("../services/storage", () => ({ isConfigured: jest.fn(() => false), uploadImage: jest.fn(), deleteImages: jest.fn(async () => {}) }));

const request = require("supertest");
const app = require("../app");
const db = require("./db");
const ml = require("../services/mlClient");
const llm = require("../services/llm");
const Evaluation = require("../models/Evaluation");

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const VIEWS = ["front", "back", "left", "right", "teeth"];
const ok = (parsed) => ({ stop_reason: "end_turn", parsed_output: parsed });

const mockAnimal = ({ breed = "Sahiwal", health = "healthy", age = 3 } = {}) => {
  ml.species.mockResolvedValue({ species: "cow", confidence: 0.94 });
  ml.breed.mockResolvedValue({
    breed, breed_key: breed.toLowerCase(), confidence: 0.82, uncertain: false,
    top3: [{ breed, confidence: 0.82 }, { breed: "Gir", confidence: 0.1 }, { breed: "Rathi", confidence: 0.05 }]
  });
  ml.age.mockResolvedValue({ age_years: age, interval_90: [age - 1, age + 1], uncertain: false, permanent_incisors_estimate: 4, quality: { ok: true } });
  ml.health.mockResolvedValue({ condition: health, confidence: 0.92, per_image: [] });
};

const token = async (email = "buyer@example.com") =>
  (await request(app).post("/api/auth/register").send({ name: "Haroon", email, password: "secret123" })).body.token;

const submit = (auth, fields = {}) => {
  let req = request(app).post("/api/evaluations").set("Authorization", `Bearer ${auth}`);
  VIEWS.forEach((v) => { req = req.attach(v, JPEG, { filename: `${v}.jpg`, contentType: "image/jpeg" }); });
  Object.entries({ purpose: "milk", ...fields }).forEach(([k, v]) => { req = req.field(k, v); });
  return req;
};

const finished = async (auth, id) => {
  for (let i = 0; i < 100; i += 1) {
    const res = await request(app).get(`/api/evaluations/${id}`).set("Authorization", `Bearer ${auth}`);
    if (res.body.evaluation.status !== "processing") return res.body.evaluation;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("not finished");
};

// Fake Anthropic client answering by prompt version
const fakeLLM = (handlers) => ({
  messages: {
    parse: jest.fn(async (params) => {
      const text = JSON.stringify(params.messages[0].content) + params.system;
      if (text.includes("identify cattle and buffalo breeds")) return handlers.breed();
      if (text.includes("write the buying report")) return handlers.report();
      if (text.includes("Answer questions about ONE animal")) return handlers.chat();
      return handlers.compare();
    })
  }
});

beforeAll(db.connect);
afterAll(async () => {
  llm._setClient(null);
  await db.close();
});
beforeEach(async () => {
  await db.clear();
  jest.clearAllMocks();
  delete process.env.LLM_API_KEY;
  mockAnimal();
});

describe("pipeline with the LLM", () => {
  test("uses the LLM report and records the breed check", async () => {
    process.env.LLM_API_KEY = "test";
    llm._setClient(fakeLLM({
      breed: () => ok({ breed: "Sahiwal", confidence: 0.8, inKnownClasses: true, reasoning: "Loose skin, red coat." }),
      report: () => ok({ summary: "Healthy Sahiwal cow.", reasons: ["Dairy breed."], risks: ["Check udder."], purposeFit: "Strong fit.", tips: ["Watch milking."] })
    }));
    const auth = await token();
    const e = await finished(auth, (await submit(auth)).body.id);
    expect(e.status).toBe("done");
    expect(e.report).toMatchObject({ source: "llm", promptVersion: "report-v1", summary: "Healthy Sahiwal cow.", purposeFitLevel: "strong" });
    expect(e.results.breedVerification).toMatchObject({ breed: "Sahiwal", promptVersion: "breed-check-v1" });
    expect(e.results.breed.final.source).toBe("model+ai_vision");
    expect(e.steps.find((s) => s.key === "report").summary).toBe("AI report ready");
  });

  test("a confident LLM breed the model doesn't know replaces the model's breed", async () => {
    process.env.LLM_API_KEY = "test";
    llm._setClient(fakeLLM({
      breed: () => ok({ breed: "Cholistani", confidence: 0.85, inKnownClasses: false, reasoning: "Spotted coat." }),
      report: () => ok({ summary: "s", reasons: ["r"], risks: [], purposeFit: "p", tips: ["t"] })
    }));
    const auth = await token();
    const e = await finished(auth, (await submit(auth)).body.id);
    expect(e.results.breed.final).toMatchObject({ label: "Cholistani", source: "ai_vision", possibly: "Sahiwal" });
    expect(e.steps.find((s) => s.key === "breed").summary).toBe("Cholistani");
  });

  test("an LLM failure falls back to the template report", async () => {
    process.env.LLM_API_KEY = "test";
    llm._setClient(fakeLLM({ breed: () => ok(null), report: () => ok(null) }));
    const auth = await token();
    const e = await finished(auth, (await submit(auth)).body.id);
    expect(e.status).toBe("done");
    expect(e.report.source).toBe("template");
    expect(e.results.breedVerification.error).toBeTruthy();
  });

  test("without a key the report is the Urdu template for Urdu users", async () => {
    const auth = await token();
    const e = await finished(auth, (await submit(auth, { language: "ur" })).body.id);
    expect(e.report.source).toBe("template");
    expect(e.report.summary).toMatch(/[؀-ۿ]/); // Urdu script
    expect(e.report.tips.join(" ")).toMatch(/دوہائی/);
  });
});

describe("POST /api/evaluations/:id/chat", () => {
  test("is unavailable without an LLM key, with default suggestions", async () => {
    const auth = await token();
    const { id } = (await submit(auth)).body;
    await finished(auth, id);
    const res = await request(app).post(`/api/evaluations/${id}/chat`).set("Authorization", `Bearer ${auth}`).send({ message: "How much milk?" });
    expect(res.status).toBe(503);
    expect(res.body.suggestions).toHaveLength(3);
  });

  test("answers and keeps the conversation on the evaluation", async () => {
    const auth = await token();
    const { id } = (await submit(auth)).body;
    await finished(auth, id);
    process.env.LLM_API_KEY = "test";
    llm._setClient(fakeLLM({ chat: () => ok({ answer: "About 8-10 litres a day.", suggestions: ["Feed?", "Price?", "Age?"] }) }));
    const res = await request(app).post(`/api/evaluations/${id}/chat`).set("Authorization", `Bearer ${auth}`).send({ message: "How much milk?" });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe("About 8-10 litres a day.");
    expect(res.body.chat.map((m) => m.role)).toEqual(["user", "assistant"]);
    const stored = await Evaluation.findById(id).lean();
    expect(stored.chat[1]).toMatchObject({ content: "About 8-10 litres a day.", promptVersion: "chat-v1" });
  });

  test("keeps only the last 20 messages", async () => {
    const auth = await token();
    const { id } = (await submit(auth)).body;
    await finished(auth, id);
    process.env.LLM_API_KEY = "test";
    llm._setClient(fakeLLM({ chat: () => ok({ answer: "ok", suggestions: ["a", "b", "c"] }) }));
    for (let i = 0; i < 11; i += 1) {
      await request(app).post(`/api/evaluations/${id}/chat`).set("Authorization", `Bearer ${auth}`).send({ message: `q${i}` });
    }
    const stored = await Evaluation.findById(id).lean();
    expect(stored.chat).toHaveLength(20);
    expect(stored.chat[0].content).toBe("q1");
  });

  test("rejects empty or too long questions", async () => {
    const auth = await token();
    const { id } = (await submit(auth)).body;
    expect((await request(app).post(`/api/evaluations/${id}/chat`).set("Authorization", `Bearer ${auth}`).send({ message: " " })).status).toBe(400);
    expect((await request(app).post(`/api/evaluations/${id}/chat`).set("Authorization", `Bearer ${auth}`).send({ message: "x".repeat(501) })).status).toBe(400);
  });
});

describe("POST /api/evaluations/compare", () => {
  const two = async (auth, second = {}, purposes = ["milk", "milk"]) => {
    mockAnimal();
    const a = (await submit(auth, { purpose: purposes[0] })).body.id;
    await finished(auth, a);
    mockAnimal(second);
    const b = (await submit(auth, { purpose: purposes[1] })).body.id;
    await finished(auth, b);
    return [a, b];
  };

  test("the higher score wins and the reason explains it", async () => {
    const auth = await token();
    const [a, b] = await two(auth, { health: "lumpy" });
    const res = await request(app).post("/api/evaluations/compare").set("Authorization", `Bearer ${auth}`).send({ ids: [a, b] });
    expect(res.status).toBe(200);
    expect(res.body.winnerId).toBe(a);
    expect(res.body.reasonSource).toBe("template");
    expect(res.body.reason).toMatch(/Animal A scores \d+\/100 against \d+\/100 for milk \(healthier/);
    expect(res.body.rows.find((r) => r.key === "health")).toEqual({ key: "health", a: "healthy", b: "lumpy" });
  });

  test("the reason follows the app's language, not the reports'", async () => {
    const auth = await token();
    const [a, b] = await two(auth, { health: "lumpy" });
    const res = await request(app).post("/api/evaluations/compare").set("Authorization", `Bearer ${auth}`).send({ ids: [a, b], language: "ur" });
    expect(res.status).toBe(200);
    expect(res.body.reason).toMatch(/^جانور A کا اسکور \d+\/100/);
  });

  test("uses the LLM to word the reason when available", async () => {
    const auth = await token();
    const [a, b] = await two(auth, { health: "lumpy" });
    process.env.LLM_API_KEY = "test";
    llm._setClient(fakeLLM({ compare: () => ok({ reason: "Animal A has no disease signs." }) }));
    const res = await request(app).post("/api/evaluations/compare").set("Authorization", `Bearer ${auth}`).send({ ids: [b, a] });
    expect(res.body.winnerId).toBe(a);
    expect(res.body.reason).toBe("Animal A has no disease signs.");
    expect(res.body.animals.map((x) => x.letter)).toEqual(["A", "B"]);
  });

  test("different purposes can't be compared", async () => {
    const auth = await token();
    const [a, b] = await two(auth, {}, ["milk", "qurbani"]);
    const res = await request(app).post("/api/evaluations/compare").set("Authorization", `Bearer ${auth}`).send({ ids: [a, b] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/same buying purpose/);
  });

  test("needs exactly two of your own reports", async () => {
    const auth = await token();
    const [a] = await two(auth);
    expect((await request(app).post("/api/evaluations/compare").set("Authorization", `Bearer ${auth}`).send({ ids: [a] })).status).toBe(400);
    const other = await token("other@example.com");
    expect((await request(app).post("/api/evaluations/compare").set("Authorization", `Bearer ${other}`).send({ ids: [a, "6adb4bf23b556f31590bb20c"] })).status).toBe(404);
  });
});
