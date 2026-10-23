# MaweshiAI

AI cattle-buying advisor for livestock markets (formerly CattleEval / LES). The user photographs an animal and the system checks species, breed, age and disease, then gives a buy / don't-buy report.

MUET Jamshoro FYDP — Haroon Rasheed (22CS070), Abdul Mutali (22CS114), Syed Eiman Ali Shah (22CS006). Supervisor: Dr. Fawad Mangi.

- Build plan: [BUILD_PLAN.md](BUILD_PLAN.md) · Progress log: [PROGRESS.md](PROGRESS.md) · Status report: [docs/STATUS_2026-10-23.md](docs/STATUS_2026-10-23.md)

## Services

| Folder | Stack | Port |
|---|---|---|
| `mobile/` | React Native 0.81, Expo SDK 54, Expo Router 6 | Expo dev server (8081) |
| `backend/` | Node.js, Express 4, Mongoose 8, JWT | 3000 |
| `ml-service/` | Python 3.13, FastAPI, TensorFlow 2.21 / Keras 3 | 8000 |

Database: MongoDB Atlas.

## Requirements

- Node.js 20.19 or newer
- Python 3.13
- A MongoDB Atlas cluster with your IP allowed under **Network Access**
- Expo Go on a phone connected to the same Wi-Fi as the PC

## Setup

Copy each `.env.example` to `.env` in the same folder and fill in the values.

### 1. ML service (port 8000)

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/download_models.py   # health model (128 MB, too big for GitHub) from Hugging Face
uvicorn main:app --host 0.0.0.0 --port 8000
```

- Every model's file, preprocessing, classes and thresholds are in [ml-service/models.yaml](ml-service/models.yaml). `GET /health` shows which models loaded; set `ML_MODELS=species,gate` to load only some while developing.
- Tests: `pip install -r requirements-dev.txt` then `python -m pytest` (about 1 minute; loads all models once).
- `setuptools` is pinned below 81 on purpose: `tensorflow-hub` still imports `pkg_resources`.

| Model | File | Source |
|---|---|---|
| Cattle gate | `model/gate/efficientnetv2-b0.h5` | Keras Applications, ImageNet-1k (ox / water buffalo / oxcart classes) |
| Species | `model/SpecieDetector.keras` | Original CattleEval model (MobileNetV2, cow / buffalo) |
| Breed | `model/cattle_breed.keras` | Team's ResNet-18, 15 breeds (`F:\FYP\Models\Breed`) |
| Age | `model/age/age.onnx` + `segmenter.onnx` | Team's age project (`F:\FYP\Models\Age Detection`) |
| Health | `model/health/efficientnet_b3_best.keras` | Hugging Face `xprotocol/EfficientNet-B3-Cattle-Disease` (Apache-2.0) |

### 2. Backend (port 3000)

```bash
cd backend
npm install
npm run dev
```

If startup fails with `queryTxt ETIMEOUT`, the network is blocking the DNS lookups that `mongodb+srv://` strings need. Use the standard `mongodb://host1,host2,host3/?tls=true&authSource=admin&replicaSet=...` form instead (see [docs/STATUS_2026-10-23.md](docs/STATUS_2026-10-23.md)).

### 3. Mobile

```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to `http://<your PC's LAN IP>:3000` (find it with `ipconfig`), then scan the QR code with Expo Go.

- Code layout: `mobile/app/` (Expo Router screens: `(onboarding)`, `(auth)`, `(tabs)`, `check/`, `report/`), `mobile/src/theme` (design tokens), `mobile/src/components`, `mobile/src/i18n` (`en.json`, `ur.json`), `mobile/src/context/SessionContext.js`.
- Switching to Urdu reloads the app once to apply right-to-left layout.
- `npx expo start --web` renders the app in a browser for quick layout checks.

## API (current)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password }` → `{ token }` |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token }` |
| GET | `/api/auth/profile` | Bearer | |
| PUT | `/api/auth/settings` | Bearer | `{ preferredLanguage, alertsEnabled }` |
| POST | `/api/auth/logout` | Bearer | |
| POST | `/api/auth/guest` | — | → `{ token, guest: true, guestId }` (30 days; profile/settings return 403 for guests) |
| POST | `/api/evaluations/quality` | Bearer | multipart `image` + `view` (front/back/left/right/teeth) → `{ quality: { ok, issues }, species }` (species pre-check on the front photo only) |
| POST | `/api/evaluations` | Bearer | multipart `front, back, left, right, teeth` + `purpose` (milk/breeding/qurbani/meat/farm_work/other), optional `budget`, `sellerPrice` ("2,50,000" accepted), `experience`, `language`, `quality` (JSON) → **202** `{ id, reportId, status: "processing" }` |
| GET | `/api/evaluations/:id` | Bearer (owner) | `{ evaluation }`: `status` (processing/done/failed/rejected), `steps[]`, `results`, `verdict`, `score`, `scoreBreakdown`, `report`, `images` (Cloudinary URLs). Poll every 1.5 s while processing |
| GET | `/api/evaluations?verdict=&q=&page=` | Bearer | History, newest first, 20 per page: `{ items: [{ id, reportId, status, purpose, verdict, score, species, breed, thumbnail, createdAt }], total }` |
| DELETE | `/api/evaluations/:id` | Bearer (owner) | Deletes the evaluation and its Cloudinary photos |
| POST | `/api/evaluations/:id/chat` | Bearer (owner) | `{ message }` → `{ answer, suggestions[3], chat }` (last 20 messages kept). 503 with default suggestions when no LLM key; 409 until the report is ready |
| POST | `/api/evaluations/compare` | Bearer | `{ ids: [a, b] }` (same purpose, both done) → `{ winnerId, reason, reasonSource, animals[A, B], rows }`; winner by score, reason worded by the LLM when available |
| GET | `/r/:reportId?k=<shareKey>` | — | Public read-only report page for the PDF's QR code (no budget, price or owner) |
| POST | `/api/evaluate` | Bearer | Legacy single photo: multipart `bodyImage` → `{ species, confidence, createdAt }` (kept for the current app until Module 5) |

Backend tests: `cd backend && npm test` (Jest + Supertest, in-memory MongoDB; ML service, Cloudinary and the LLM mocked).

**LLM (reports, breed check, chat, compare):** set `LLM_API_KEY` in `backend/.env` (Claude Haiku 5.5 by default, about $0.001 per report). Check it with `node scripts/llm_smoke.js [side-photo.jpg]`. Without a key everything still works with rule-based reports in English and Urdu; chat returns 503. Prompts: [docs/PROMPTS.md](docs/PROMPTS.md); breed facts and sources: [docs/breeds_sources.md](docs/breeds_sources.md).

### ML service (port 8000)

All endpoints take multipart images (JPEG/PNG/WebP, ≤ 10 MB each) and return 400 for invalid images and 503 when a model isn't loaded.

| Method | Endpoint | Input | Returns |
|---|---|---|---|
| GET | `/health` | — | `{ status, models: { gate, species, breed, age, health } }` with versions |
| POST | `/quality` | `image` | `{ ok, issues: [blurry, too_dark, too_bright, too_small], blur_score, brightness, ... }` |
| POST | `/predict/species` | `image` | `{ species: cow \| buffalo \| unknown, confidence, species_model, gate, model_version }` |
| POST | `/predict/breed` | `images` (1–6), `species` | `{ breed, breed_key, confidence, uncertain, top3, species_filter, views, model_version }` |
| POST | `/predict/age` | `image` (teeth), `?enforce_quality=` | `{ age_years, age_band, permanent_incisors_estimate, interval_90, confidence, uncertain, quality, model_version }` |
| POST | `/predict/health` | `images` (1–6), `views` | `{ condition: healthy \| foot-and-mouth \| lumpy \| uncertain, confidence, mean_probabilities, per_image, model_version }` |
| POST | `/predict` | `bodyImage` | Legacy: `{ species: "Cow" \| "Buffalo", confidence (percent) }`, used by the current backend |
