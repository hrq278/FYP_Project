# MaweshiAI API

Two HTTP services sit behind the mobile app:

- **Backend** (Node.js + Express, port 3000): accounts, evaluations, reports, chat, compare. The only service the app talks to.
- **ML service** (Python + FastAPI, port 8000): the five models. Called only by the backend.

All JSON. Errors are always `{ "message": "..." }` with the status codes listed below. Images are uploaded as `multipart/form-data`.

---

## 1. Backend

### Authentication

Send `Authorization: Bearer <token>` on every request except register, login, guest and the public report page.

| Token | How to get it | Lifetime | Can do |
|---|---|---|---|
| Account | `POST /api/auth/register` or `/login` | 7 days | everything |
| Guest | `POST /api/auth/guest` | 30 days | evaluations, history, chat, compare. Profile, settings and delete account return **403** "Sign up to use this feature" |

When a guest registers or logs in with their guest token still in the `Authorization` header, their reports move to the account (`claimedReports` in the response).

Common errors: **401** token missing or invalid, **403** guest on an account-only route, **404** not found or not yours (other users' evaluations are reported as not found).

### Accounts — `/api/auth`

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/guest` | — | **201** `{ token, guest: true, guestId }` | |
| POST | `/register` | `{ name, email, password }` (password ≥ 6) | **201** `{ token, claimedReports }` | 400 missing fields, 409 email in use |
| POST | `/login` | `{ email, password }` | **200** `{ token, claimedReports }` | 400 missing fields, 401 wrong email or password |
| GET | `/profile` | — | **200** `{ user: { _id, name, email, createdAt, settings: { preferredLanguage, alertsEnabled } } }` | 403 guest |
| PUT | `/settings` | `{ preferredLanguage: "en" \| "ur", alertsEnabled? }` | **200** `{ message, settings }` | 403 guest |
| POST | `/logout` | — | **200** | |
| DELETE | `/account` | — | **200** `{ message, deletedReports }`: deletes the user, all their evaluations and the photos in Cloudinary | 403 guest |

### Evaluations — `/api/evaluations`

**Photo rules:** JPEG, PNG or WebP, at most **8 MB** each (400 "Image must be 8 MB or smaller"). The app shrinks photos to 1280 px / JPEG 80 % first, about 200–400 KB each.

#### `POST /api/evaluations/quality` — check one photo while capturing

Multipart: `image`, `view` (`front | back | left | right | teeth`).

```json
200 {
  "view": "front",
  "quality": { "ok": false, "issues": ["blurry"], "blur_score": 41.2, "brightness": 0.52, "clipped_fraction": 0.004, "width": 1280, "height": 960 },
  "species": { "species": "cow", "confidence": 0.97, "isCattle": true }
}
```
`species` is filled only for the front photo (the early "is this a cow or buffalo?" check), otherwise `null`. If the ML service is down this returns **503** and the app lets the user keep the photo.

#### `POST /api/evaluations` — start a check

Multipart: `front`, `back`, `left`, `right`, `teeth` (all required) and

| Field | Required | Values |
|---|---|---|
| `purpose` | yes | `milk`, `breeding`, `qurbani`, `meat`, `farm_work`, `other` |
| `experience` | no | `first_time` (default), `experienced` |
| `language` | no | `en` (default), `ur`: language of the written report |
| `budget`, `sellerPrice` | no | PKR, digits or "2,50,000" |
| `quality` | no | JSON of the per-photo quality results, kept with the evaluation |

```json
202 { "id": "6adbaffc09c28f34ef42015a", "reportId": "MW-261024-0418", "status": "processing" }
```
Errors: 400 missing photo / bad purpose / bad number. The work then runs in the background (section 3); poll the evaluation.

#### `GET /api/evaluations/:id` — progress and result

Poll every 1.5 s while `status` is `processing`.

```json
200 { "evaluation": {
  "_id": "6adbaffc09c28f34ef42015a",
  "reportId": "MW-261024-0418",
  "status": "done",                  // processing | done | failed | rejected
  "reason": null,                    // failed: "ml_unavailable" or "<step>_failed"; rejected: "not_cattle"
  "purpose": "milk", "budget": 250000, "sellerPrice": 310000, "experience": "first_time", "language": "en",
  "steps": [
    { "key": "species", "status": "done", "summary": "Buffalo (98%)" },
    { "key": "breed",   "status": "done", "summary": "Nili-Ravi" },
    { "key": "age",     "status": "done", "summary": "About 5 years" },
    { "key": "health",  "status": "done", "summary": "No disease signs" },
    { "key": "report",  "status": "done", "summary": "Report ready" }
  ],
  "results": { "species": {…}, "breed": {…}, "breedVerification": {…}, "age": {…}, "health": {…} },
  "verdict": "caution", "score": 69,
  "scoreBreakdown": { "purposeFit": 32, "age": 15, "health": 25, "confidence": 7, "flags": ["age_uncertain"] },
  "report": {
    "summary": "Nili-Ravi buffalo for milk: check the risks below before buying.",
    "reasons": ["No signs of Foot-and-Mouth or Lumpy Skin Disease in the photos.", "..."],
    "risks": ["..."], "tips": ["..."],
    "purposeFit": "...", "purposeFitLevel": "strong",
    "source": "llm",                 // "template" when no LLM key
    "promptVersion": "report-v1"
  },
  "images": { "front": { "url": "https://res.cloudinary.com/...", "publicId": "..." }, "...": {} },
  "createdAt": "2026-10-24T08:12:03.512Z"
} }
```
`results.*` are the raw ML outputs (section 2), kept for the thesis and for re-scoring.

#### Other evaluation routes

| Method | Path | Body / query | Success | Errors |
|---|---|---|---|---|
| GET | `/` | `?verdict=recommended\|caution\|not_recommended&q=<text>&tz=<minutes>&page=<n>` | **200** `{ items: [{ id, reportId, status, purpose, verdict, score, species, breed, thumbnail, createdAt }], total }`, newest first, 20 per page. `q` matches breed, report id, or a date such as "24 Oct", "24/10", "24 October 2026"; `tz` = the phone's `getTimezoneOffset()` so dates mean the local day | 400 bad verdict |
| DELETE | `/:id` | — | **200**; also deletes the photos | 404 |
| POST | `/:id/chat` | `{ message }` (≤ 500 characters) | **200** `{ answer, suggestions: [3], chat }` (last 20 messages kept) | 400 empty / too long, 409 report not ready, **503** no LLM key (body has `suggestions` to show instead), 502 LLM error |
| POST | `/compare` | `{ ids: [a, b] }` | **200** `{ winnerId, reason, reasonSource: "llm" \| "rules", animals: [A, B], rows: [{ key, a, b }] }`; winner = higher score | 400 not 2 different ids / different purposes, 409 not both finished |

### Public report page

`GET /r/:reportId?k=<shareKey>` → HTML page (English + Urdu) for the QR code on the PDF. Needs the random `shareKey` stored with the evaluation, because report ids are guessable. It leaves out budget, price and owner, escapes all text and sets `noindex`. 404 page when the key is wrong.

### Legacy

`POST /api/evaluate` (multipart `bodyImage`) → `{ species, confidence, createdAt }`. From the first prototype, kept so old app builds still work.

---

## 2. ML service

Called by the backend only (no authentication; keep port 8000 private). Images up to **10 MB**, 400 for an unreadable image, **503** when the needed model failed to load. All models load once at start-up (about 20–25 s on CPU).

| Method | Path | Input (multipart) | Returns |
|---|---|---|---|
| GET | `/health` | — | `{ status, models: { gate, species, breed, age, health: { loaded, version, load_seconds } } }` |
| POST | `/quality` | `image` | `{ ok, issues: [blurry \| too_dark \| too_bright \| too_small], blur_score, brightness, clipped_fraction, width, height }` |
| POST | `/predict/species` | `image` | `{ species: cow \| buffalo \| unknown, confidence, buffalo_score, gate: { is_cattle, cattle_score, sheep_score, buffalo_share, top3 }, species_model, model_version }` |
| POST | `/predict/breed` | `images` (1–6 side/front photos), `species`, `species_confidence` | `{ breed, breed_key, confidence, uncertain, species_conflict, top3, species_filter, views, model_version }`; only breeds of `species` can win when `species_confidence` ≥ 0.75 (or is not sent) |
| POST | `/predict/age` | `image` (teeth), `?enforce_quality=true` | `{ age_years, age_years_expected, age_band, permanent_incisors_estimate, interval_90: [lo, hi], confidence, uncertain, quality: { ok, issues: [blurry \| no_teeth \| low_confidence] }, model_version }` |
| POST | `/predict/health` | `images` (1–6 body photos), `views` | `{ condition: healthy \| foot-and-mouth \| lumpy \| uncertain, confidence, mean_probabilities, per_image: [{ view, condition, probabilities }], model_version }` |
| POST | `/predict` | `bodyImage` | Legacy: `{ species: "Cow" \| "Buffalo", confidence }` |

Decision rules inside the models (all set in `ml-service/models.yaml`):

| Model | Rule |
|---|---|
| Cattle gate | cattle if P(ox + water buffalo + oxcart) ≥ 0.02 **and** P(ram + bighorn) < that score (photo + mirror image averaged) |
| Species | buffalo if the gate's water-buffalo share ≥ 0.10, else cow; confidence capped at 0.99 |
| Breed | average of 4 views per photo over all photos; only the detected species' breeds when the species step is ≥ 75 % sure, otherwise a breed of the other species comes back `uncertain` + `species_conflict`; `uncertain` below 0.50 |
| Age | 5-fold ensemble + flip/zoom views; `uncertain` when the 90 % interval is wider than 5 years |
| Health | any confident (≥ 0.60) disease on a photo wins, FMD before lumpy; otherwise the average decides; `uncertain` below 0.60 |

---

## 3. One evaluation, step by step

`backend/services/pipeline.js`, after `POST /api/evaluations` has stored the photos (Cloudinary) and returned 202:

1. **Species**: `/predict/species` on the front photo. `unknown` → status `rejected` (the app shows "This doesn't look like a cow or buffalo").
2. **Breed**: `/predict/breed` on front + left + right with the species and its confidence. Then the LLM looks at one side photo and confirms or corrects the breed (`results.breedVerification`); skipped without an LLM key.
3. **Age**: `/predict/age` on the teeth photo.
4. **Health**: `/predict/health` on the four body photos (not the teeth close-up, see `docs/results/README.md`).
5. **Rules** (`services/rules.js`): score out of 100 = purpose fit 40 + age 25 + health 25 + model confidence 10; ≥ 70 recommended, ≥ 45 caution, else not recommended. Caps: FMD or lumpy skin → not recommended (≤ 25); unclear health → at most caution; Qurbani under 2 years → not recommended; any model confidence below 0.6 → at most caution; seller's price over budget + 20 % → a risk.
6. **Report**: the LLM writes the summary, reasons, risks and tips in English or Urdu from the rule result (`docs/PROMPTS.md`); without a key, a template does it.

Each step updates `steps[]`, which the app's Processing screen shows live. If the ML service can't be reached the evaluation ends `failed` with `reason: "ml_unavailable"`.
