jest.mock("../services/mlClient", () => {
  const actual = jest.requireActual("../services/mlClient");
  return {
    MLServiceError: actual.MLServiceError,
    quality: jest.fn(),
    species: jest.fn(),
    breed: jest.fn(),
    age: jest.fn(),
    health: jest.fn(),
    legacyPredict: jest.fn()
  };
});
jest.mock("../services/storage", () => ({
  isConfigured: jest.fn(),
  uploadImage: jest.fn(),
  deleteImages: jest.fn(async () => {})
}));

const fakeUpload = async (buffer, { evaluationId, view }) => ({
  url: `https://res.cloudinary.test/${evaluationId}/${view}.jpg`,
  publicId: `maweshiai/evaluations/${evaluationId}/${view}`
});

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
const db = require("./db");
const ml = require("../services/mlClient");
const storage = require("../services/storage");
const Evaluation = require("../models/Evaluation");

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const VIEWS = ["front", "back", "left", "right", "teeth"];

const ML_OK = {
  species: { species: "cow", confidence: 0.94, model_version: "s" },
  breed: {
    breed: "Sahiwal",
    breed_key: "sahiwal",
    confidence: 0.82,
    uncertain: false,
    top3: [{ breed: "Sahiwal", confidence: 0.82 }, { breed: "Red Sindhi", confidence: 0.1 }, { breed: "Gir", confidence: 0.05 }],
    model_version: "b"
  },
  age: { age_years: 3, interval_90: [2, 4], uncertain: false, permanent_incisors_estimate: 4, confidence: 0.5, quality: { ok: true, issues: [] } },
  health: { condition: "healthy", confidence: 0.93, per_image: [], model_version: "h" }
};

const mockHealthyAnimal = () => {
  ml.species.mockResolvedValue(ML_OK.species);
  ml.breed.mockResolvedValue(ML_OK.breed);
  ml.age.mockResolvedValue(ML_OK.age);
  ml.health.mockResolvedValue(ML_OK.health);
  ml.quality.mockResolvedValue({ ok: true, issues: [], blur_score: 300 });
};

const token = async (email = "buyer@example.com") => {
  const res = await request(app).post("/api/auth/register").send({ name: "Haroon", email, password: "secret123" });
  return res.body.token;
};

const submit = (auth, fields = {}, views = VIEWS) => {
  let req = request(app).post("/api/evaluations").set("Authorization", `Bearer ${auth}`);
  views.forEach((v) => {
    req = req.attach(v, JPEG, { filename: `${v}.jpg`, contentType: "image/jpeg" });
  });
  Object.entries({ purpose: "milk", ...fields }).forEach(([k, v]) => {
    req = req.field(k, v);
  });
  return req;
};

const waitUntilFinished = async (auth, id) => {
  for (let i = 0; i < 100; i += 1) {
    const res = await request(app).get(`/api/evaluations/${id}`).set("Authorization", `Bearer ${auth}`);
    if (res.body.evaluation.status !== "processing") return res.body.evaluation;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("evaluation did not finish");
};

beforeAll(db.connect);
afterAll(db.close);
beforeEach(async () => {
  await db.clear();
  jest.clearAllMocks();
  storage.isConfigured.mockReturnValue(true);
  storage.uploadImage.mockImplementation(fakeUpload);
  mockHealthyAnimal();
});

describe("POST /api/evaluations", () => {
  test("5 photos produce a done evaluation with every result", async () => {
    const auth = await token();
    const res = await submit(auth, { budget: "2,50,000", sellerPrice: "3,00,000", experience: "first_time" });
    expect(res.status).toBe(202);
    expect(res.body.reportId).toMatch(/^MW-\d{6}-\d{4}$/);

    const e = await waitUntilFinished(auth, res.body.id);
    expect(e.status).toBe("done");
    expect(e.steps.map((s) => [s.key, s.status])).toEqual([
      ["species", "done"], ["breed", "done"], ["age", "done"], ["health", "done"], ["report", "done"]
    ]);
    expect(e.steps.find((s) => s.key === "breed").summary).toBe("Sahiwal");
    expect(e.results.species.species).toBe("cow");
    expect(e.results.breed.final).toMatchObject({ label: "Sahiwal", source: "model" });
    expect(e.results.breedVerification).toMatchObject({ skipped: true });
    expect(e.results.age.age_years).toBe(3);
    expect(e.results.health.condition).toBe("healthy");
    expect(["recommended", "caution", "not_recommended"]).toContain(e.verdict);
    expect(e.score).toBeGreaterThan(0);
    expect(e.report.source).toBe("template");
    expect(e.report.summary).toBeTruthy();
    expect(e.budget).toBe(250000);
    expect(e.images.front.url).toMatch(/front\.jpg$/);
    expect(storage.uploadImage).toHaveBeenCalledTimes(5);
    // breed gets front + left + right, health gets the four body views (not teeth)
    expect(ml.breed.mock.calls[0][0]).toHaveLength(3);
    expect(ml.breed.mock.calls[0][1]).toBe("cow");
    expect(ml.breed.mock.calls[0][2]).toBe(0.94); // species confidence: the ML service filters breeds only when it is high
    expect(ml.health.mock.calls[0][1]).toEqual(["front", "back", "left", "right"]);
    expect(ml.health.mock.calls[0][0]).toHaveLength(4);
  });

  test("a non-cattle front photo stops early as rejected", async () => {
    ml.species.mockResolvedValue({ species: "unknown", confidence: 0.99 });
    const auth = await token();
    const e = await waitUntilFinished(auth, (await submit(auth)).body.id);
    expect(e.status).toBe("rejected");
    expect(e.reason).toBe("not_cattle");
    expect(e.steps.map((s) => s.status)).toEqual(["failed", "skipped", "skipped", "skipped", "skipped"]);
    expect(ml.breed).not.toHaveBeenCalled();
  });

  test("FMD makes the verdict not recommended", async () => {
    ml.health.mockResolvedValue({ condition: "foot-and-mouth", confidence: 0.9, per_image: [] });
    const auth = await token();
    const e = await waitUntilFinished(auth, (await submit(auth)).body.id);
    expect(e.verdict).toBe("not_recommended");
    expect(e.score).toBeLessThanOrEqual(25);
    expect(e.report.summary).toMatch(/Foot-and-Mouth/);
  });

  test("Qurbani with a young animal is not recommended", async () => {
    ml.age.mockResolvedValue({ ...ML_OK.age, age_years: 1, interval_90: [1, 2], permanent_incisors_estimate: 0 });
    const auth = await token();
    const e = await waitUntilFinished(auth, (await submit(auth, { purpose: "qurbani" })).body.id);
    expect(e.verdict).toBe("not_recommended");
    expect(e.report.reasons.join(" ")).toMatch(/Not eligible for Qurbani by age/);
  });

  test("the ML service going down marks the evaluation failed", async () => {
    ml.breed.mockRejectedValue(new ml.MLServiceError("Analysis service is unavailable.", 503));
    const auth = await token();
    const e = await waitUntilFinished(auth, (await submit(auth)).body.id);
    expect(e.status).toBe("failed");
    expect(e.reason).toBe("ml_unavailable");
    expect(e.steps.find((s) => s.key === "breed").status).toBe("failed");
  });

  test("a failed photo upload doesn't fail the analysis", async () => {
    storage.uploadImage.mockRejectedValue(new Error("cloudinary down"));
    const auth = await token();
    const e = await waitUntilFinished(auth, (await submit(auth)).body.id);
    expect(e.status).toBe("done");
  });

  test("missing photos are rejected", async () => {
    const res = await submit(await token(), {}, ["front", "left"]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/back, right, teeth/);
  });

  test("an invalid purpose is rejected", async () => {
    const res = await submit(await token(), { purpose: "racing" });
    expect(res.status).toBe(400);
  });

  test("non-image files are rejected", async () => {
    const auth = await token();
    const res = await request(app)
      .post("/api/evaluations")
      .set("Authorization", `Bearer ${auth}`)
      .attach("front", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });

  test("requires a token", async () => {
    expect((await request(app).post("/api/evaluations")).status).toBe(401);
  });
});

describe("reading, listing and deleting", () => {
  test("only the owner can read an evaluation", async () => {
    const owner = await token("owner@example.com");
    const other = await token("other@example.com");
    const { id } = (await submit(owner)).body;
    await waitUntilFinished(owner, id);
    const res = await request(app).get(`/api/evaluations/${id}`).set("Authorization", `Bearer ${other}`);
    expect(res.status).toBe(404);
  });

  test("history lists newest first and filters by verdict and breed", async () => {
    const auth = await token();
    await waitUntilFinished(auth, (await submit(auth)).body.id);
    ml.health.mockResolvedValue({ condition: "lumpy", confidence: 0.9, per_image: [] });
    ml.breed.mockResolvedValue({ ...ML_OK.breed, breed: "Red Sindhi", breed_key: "red-sindhi" });
    await waitUntilFinished(auth, (await submit(auth)).body.id);

    const all = await request(app).get("/api/evaluations").set("Authorization", `Bearer ${auth}`);
    expect(all.body.total).toBe(2);
    expect(all.body.items[0].breed).toBe("Red Sindhi");
    expect(all.body.items[0].thumbnail).toMatch(/front\.jpg$/);

    const bad = await request(app).get("/api/evaluations?verdict=not_recommended").set("Authorization", `Bearer ${auth}`);
    expect(bad.body.items.map((i) => i.breed)).toEqual(["Red Sindhi"]);

    const search = await request(app).get("/api/evaluations?q=sahi").set("Authorization", `Bearer ${auth}`);
    expect(search.body.items.map((i) => i.breed)).toEqual(["Sahiwal"]);
  });

  test("delete removes the evaluation and its photos", async () => {
    const auth = await token();
    const { id } = (await submit(auth)).body;
    await waitUntilFinished(auth, id);
    const res = await request(app).delete(`/api/evaluations/${id}`).set("Authorization", `Bearer ${auth}`);
    expect(res.status).toBe(200);
    expect(await Evaluation.countDocuments()).toBe(0);
    expect(storage.deleteImages).toHaveBeenCalledWith(VIEWS.map((v) => `maweshiai/evaluations/${id}/${v}`));
  });
});

describe("POST /api/evaluations/quality", () => {
  test("front photo gets quality and species pre-check", async () => {
    const auth = await token();
    const res = await request(app)
      .post("/api/evaluations/quality")
      .set("Authorization", `Bearer ${auth}`)
      .field("view", "front")
      .attach("image", JPEG, { filename: "f.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    expect(res.body.quality.ok).toBe(true);
    expect(res.body.species).toMatchObject({ species: "cow", isCattle: true });
  });

  test("other views skip the species check", async () => {
    const auth = await token();
    const res = await request(app)
      .post("/api/evaluations/quality")
      .set("Authorization", `Bearer ${auth}`)
      .field("view", "teeth")
      .attach("image", JPEG, { filename: "t.jpg", contentType: "image/jpeg" });
    expect(res.body.species).toBeNull();
    expect(ml.species).not.toHaveBeenCalled();
  });

  test("ML service down returns 503", async () => {
    ml.quality.mockRejectedValue(new ml.MLServiceError("Analysis service is unavailable.", 503));
    const auth = await token();
    const res = await request(app)
      .post("/api/evaluations/quality")
      .set("Authorization", `Bearer ${auth}`)
      .attach("image", JPEG, { filename: "f.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(503);
  });
});

describe("guest mode", () => {
  test("a guest can run an evaluation and list only their own", async () => {
    const guest = (await request(app).post("/api/auth/guest")).body.token;
    const user = await token();
    await waitUntilFinished(user, (await submit(user)).body.id);
    const { id } = (await submit(guest)).body;
    const e = await waitUntilFinished(guest, id);
    expect(e.status).toBe("done");
    expect(e.guestId).toMatch(/^guest_/);
    const list = await request(app).get("/api/evaluations").set("Authorization", `Bearer ${guest}`);
    expect(list.body.total).toBe(1);
  });

  test("guests can't use account-only routes", async () => {
    const guest = (await request(app).post("/api/auth/guest")).body.token;
    expect((await request(app).get("/api/auth/profile").set("Authorization", `Bearer ${guest}`)).status).toBe(403);
  });
});

describe("legacy /api/evaluate", () => {
  test("still returns the original shape", async () => {
    ml.legacyPredict.mockResolvedValue({ species: "Cow", confidence: 95.5 });
    const auth = await token();
    const res = await request(app)
      .post("/api/evaluate")
      .set("Authorization", `Bearer ${auth}`)
      .attach("bodyImage", JPEG, { filename: "b.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ species: "Cow", confidence: 95.5 });
    // legacy records don't show up in the new history
    const list = await request(app).get("/api/evaluations").set("Authorization", `Bearer ${auth}`);
    expect(list.body.total).toBe(0);
  });
});

describe("public report page /r/:reportId", () => {
  test("needs the share key and hides budget and price", async () => {
    const auth = await token();
    const { id, reportId } = (await submit(auth, { budget: "2,50,000", sellerPrice: "9,99,999" })).body;
    const e = await waitUntilFinished(auth, id);
    expect(e.shareKey).toMatch(/^[0-9a-f]{24}$/);

    const noKey = await request(app).get(`/r/${reportId}`);
    expect(noKey.status).toBe(404);
    const wrongKey = await request(app).get(`/r/${reportId}?k=deadbeef`);
    expect(wrongKey.status).toBe(404);

    const ok = await request(app).get(`/r/${reportId}?k=${e.shareKey}`);
    expect(ok.status).toBe(200);
    expect(ok.text).toContain(reportId);
    expect(ok.text).toContain(e.report.summary.replace(/'/g, "&#39;"));
    expect(ok.text).not.toMatch(/9,99,999|999999|250000/);
  });

  test("escapes text from the report", async () => {
    const auth = await token();
    const { id, reportId } = (await submit(auth)).body;
    const e = await waitUntilFinished(auth, id);
    await Evaluation.updateOne({ _id: id }, { $set: { "report.summary": "<script>alert(1)</script>" } });
    const res = await request(app).get(`/r/${reportId}?k=${e.shareKey}`);
    expect(res.text).not.toContain("<script>alert(1)</script>");
    expect(res.text).toContain("&lt;script&gt;");
  });
});

describe("Module 7 backend", () => {
  test("history search understands dates", async () => {
    const auth = await token();
    await waitUntilFinished(auth, (await submit(auth)).body.id);
    const now = new Date();
    const day = now.getUTCDate();
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getUTCMonth()];
    for (const q of [`${day} ${mon}`, `${day}/${now.getUTCMonth() + 1}`]) {
      const res = await request(app).get(`/api/evaluations?q=${encodeURIComponent(q)}`).set("Authorization", `Bearer ${auth}`);
      expect(res.body.total).toBe(1);
    }
    const other = await request(app).get(`/api/evaluations?q=${encodeURIComponent("1 Jan 1999")}`).set("Authorization", `Bearer ${auth}`);
    expect(other.body.total).toBe(0);
  });

  test("a guest who signs up keeps their reports", async () => {
    const guest = (await request(app).post("/api/auth/guest")).body.token;
    await waitUntilFinished(guest, (await submit(guest)).body.id);
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${guest}`)
      .send({ name: "Former Guest", email: "former@example.com", password: "secret123" });
    expect(res.body.claimedReports).toBe(1);
    const list = await request(app).get("/api/evaluations").set("Authorization", `Bearer ${res.body.token}`);
    expect(list.body.total).toBe(1);
    const asGuest = await request(app).get("/api/evaluations").set("Authorization", `Bearer ${guest}`);
    expect(asGuest.body.total).toBe(0);
  });

  test("delete account removes the user, reports and photos", async () => {
    const auth = await token("leaving@example.com");
    const { id } = (await submit(auth)).body;
    await waitUntilFinished(auth, id);
    const res = await request(app).delete("/api/auth/account").set("Authorization", `Bearer ${auth}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedReports).toBe(1);
    expect(await Evaluation.countDocuments()).toBe(0);
    expect(storage.deleteImages).toHaveBeenCalledWith(VIEWS.map((v) => `maweshiai/evaluations/${id}/${v}`));
    const login = await request(app).post("/api/auth/login").send({ email: "leaving@example.com", password: "secret123" });
    expect(login.status).toBe(401);
  });

  test("guests can't delete an account", async () => {
    const guest = (await request(app).post("/api/auth/guest")).body.token;
    expect((await request(app).delete("/api/auth/account").set("Authorization", `Bearer ${guest}`)).status).toBe(403);
  });
});

test("processing step summaries follow the report language", async () => {
  const auth = await token();
  const { id } = (await submit(auth, { language: "ur" })).body;
  const e = await waitUntilFinished(auth, id);
  const summary = (key) => e.steps.find((s) => s.key === key).summary;
  expect(summary("species")).toBe("گائے (94%)");
  expect(summary("health")).toBe("بیماری کی کوئی علامت نہیں");
  expect(summary("report")).toBe("رپورٹ تیار");
});

test("date search uses the phone's timezone", async () => {
  const auth = await token();
  const { id } = (await submit(auth)).body;
  await waitUntilFinished(auth, id);
  // Pretend it was created at 23 Oct 21:30 UTC = 24 Oct 02:30 in Pakistan (UTC+5)
  // Raw driver: Mongoose treats createdAt as immutable and would silently drop this $set
  await Evaluation.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt: new Date(Date.UTC(2026, 9, 23, 21, 30)) } });
  const q = (s, tz) => request(app).get(`/api/evaluations?q=${encodeURIComponent(s)}${tz != null ? `&tz=${tz}` : ""}`).set("Authorization", `Bearer ${auth}`);
  expect((await q("24 Oct 2026", -300)).body.total).toBe(1);
  expect((await q("23 Oct 2026", -300)).body.total).toBe(0);
  expect((await q("23 Oct 2026")).body.total).toBe(1); // no tz -> UTC day
});
