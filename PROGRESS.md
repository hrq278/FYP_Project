# MaweshiAI — Progress Log

One entry per module session. Newest first. See [BUILD_PLAN.md](BUILD_PLAN.md) for the plan.

---

## Module 3 — LLM report, Q&A and compare (2026-10-23)

**Status:** code done and tested with a mocked Anthropic client. **Not yet run against the real API**: needs `LLM_API_KEY` in `backend/.env`, then `node scripts/llm_smoke.js [side-photo.jpg]`.

### What was done
- `services/llm.js`: Anthropic provider (official `@anthropic-ai/sdk`, `messages.parse` with zod structured outputs, model `claude-haiku-5-5`, effort low). Output re-validated with zod; invalid output retried once; refusals and API errors go straight to the fallback. Functions: `verifyBreed` (side photo, base64), `generateReport`, `answerQuestion`, `explainComparison`. Prompt versions `breed-check-v1`, `report-v1`, `chat-v1`, `compare-v1` stored with each result.
- **Breed knowledge base** `backend/data/breeds.json`: 23 breeds (the 15 model classes + Cholistani, Dhanni, Lohani, Achai, Dajal, Bhagnari, Kundi, Murrah) with origin, primary use, milk yield, weight, heat tolerance, notes and per-purpose suitability; 23 cited sources and the suitability method in `docs/breeds_sources.md`. Missing figures say "not found in the sources used". The rule engine now scores purpose fit from it (it was "unknown" for every breed in Module 2).
- Report: explains the rule engine's verdict (never changes it), uses only given facts and the breed's KB entry, includes every rule risk, English or Urdu by `language`. Template fallback now also in **Urdu** (built from rule flags).
- Breed check runs in the pipeline on the left photo and is reconciled with the model (Module 2 `breed.js`).
- `POST /api/evaluations/:id/chat`: grounded Q&A, 3 suggested follow-ups, history stored on the evaluation (last 20 messages); 503 with default (en/ur) suggestions without a key; 409 until the report is done.
- `POST /api/evaluations/compare`: 2 ids, same purpose, both done; winner chosen by score (ties → health), reason worded by the LLM or a template; rows for breed, age, health, purpose fit.
- `docs/PROMPTS.md` (prompt design and versions for the thesis); `scripts/llm_smoke.js` (real-API check).

### How it was tested
- `npm test`: **61 passed** (23 new): request contents (image block, verdict, KB facts, Urdu instruction, model id, JSON schema), retry once, fallback after two invalid outputs, no retry on refusal or API error, breed check clamping and known-class check, pipeline with LLM report and breed check, LLM breed replacing the model's (Cholistani), LLM failure → template, Urdu template without key, chat (503 without key, answer stored, 20-message cap, validation), compare (winner by score, LLM reason, different purposes rejected, ownership).
- Live run without a key (real ML service + Atlas): Urdu evaluation completed with the Urdu template report; chat returned 503 with Urdu suggestions. The breed model called a Holstein "Jersey" (41 %, uncertain), which is the case the LLM breed check is for.

### Open items
- Add `LLM_API_KEY` and run `node scripts/llm_smoke.js` to confirm real responses, Urdu quality and cost.
- Re-check KB figures taken from search-result excerpts (Oklahoma State, TNAU, NDDB pages couldn't be opened from this network) before thesis submission.
- `CLOUDINARY_CLOUD_NAME` still needs the dashboard's cloud name (Module 2).

---

## Module 2 — Backend: evaluation pipeline and rules (2026-10-23)

**Status:** done. One config fix needed: `CLOUDINARY_CLOUD_NAME` in `backend/.env` is `FYP_Project`, which Cloudinary rejects ("Invalid cloud_name"); it must be the dashboard's cloud name code. Until then photos aren't stored (the analysis still completes).

### What was done
- `backend/app.js` (Express app, used by tests) split from `server.js` (DB + listen).
- New `models/Evaluation.js` per the plan's schema (owner `userId` or `guestId`, status, purpose form, Cloudinary images, steps, raw results incl. `breedVerification`, verdict, score + breakdown, report, `reportId` `MW-YYMMDD-NNNN`, `legacy` flag).
- Services:
  - `mlClient.js`: one function per ML endpoint; no response → 503, ML 400 → 400.
  - `storage.js`: Cloudinary upload/delete (`maweshiai/evaluations/<id>/<view>`).
  - `pipeline.js`: background run species → breed (+ LLM check) → age → health → report, updating `steps[]` after each; uploads run in parallel and an upload failure doesn't fail the analysis; not-cattle stops early as `rejected` / `not_cattle`; ML down → `failed` / `ml_unavailable`.
  - `rules.js`: deterministic score = purpose fit 40 + age 25 + health 25 + confidence 10, verdict ≥70 / ≥45; caps: FMD or lumpy → not recommended (≤25); health uncertain → at best caution; Qurbani under 2 years → not recommended, uncertain age → caution + "do daant" check; any core confidence < 0.6 → at best caution; seller price > budget + 20 % → risk.
  - `breed.js`: model + LLM reconciliation (agree / LLM-only breed / disagree → "possibly").
  - `report.js`: template report from the rules (summary, reasons, risks, purpose fit, practical checks) used until the LLM report (Module 3) and as its fallback.
  - `breedKnowledge.js`: reads `data/breeds.json` (Module 3); missing breeds score "unknown" (neutral).
  - `llm.js`: interface only (`isConfigured`, `verifyBreed`, `generateReport`); returns nothing until Module 3 and `LLM_API_KEY`.
- Endpoints: `POST /api/evaluations/quality`, `POST /api/evaluations` (202 + id), `GET /api/evaluations/:id` (owner only), `GET /api/evaluations?verdict=&q=&page=`, `DELETE /api/evaluations/:id`, `POST /api/auth/guest` (30-day guest token; profile/settings → 403 for guests). `POST /api/evaluate` (legacy) kept working, saved as `legacy: true` and hidden from the new history.
- Shared `middleware/upload.js` (8 MB, JPEG/PNG/WebP, multer errors → 400).
- Dependencies: `cloudinary`, `@anthropic-ai/sdk` (for Module 3), `zod`; dev: `jest`, `supertest`, `mongodb-memory-server`.

### How it was tested
- `npm test`: **38 passed** (rules unit tests incl. FMD, lumpy, Qurbani, low confidence, price; breed reconciliation; API: full 5-photo flow to `done`, rejected path, FMD and Qurbani verdicts, ML down, upload failure, missing photos, bad purpose, non-image files, owner-only access, history filters/search, delete with photo cleanup, quality pre-check, guest mode, legacy endpoint).
- **Live run** (real ML service, Atlas, Cloudinary): 5 photos + Qurbani + seller price 30 % over budget → `done` in **9.7 s** with live step updates; verdict Caution 65/100 with flags `qurbani_age_unclear`, `low_confidence`, `age_uncertain`, `over_budget`. Goat front photo → quality pre-check `isCattle: false`; full submission → `rejected / not_cattle`. History and verdict filter correct. Cloudinary upload failed on the cloud name (above).
- Test records left in Atlas: account `claude-m2-1792756718@example.com` with 2 evaluations.

---

## Model accuracy work (2026-10-23)

Every change measured on photos the models weren't trained on (sources and scripts below). Public datasets may partly overlap training data, so numbers are reported per source.

| Model | Change | Before → after | Evidence |
|---|---|---|---|
| Age | 5-fold ensemble (team's `cpu_mobilenetv3` folds, exported with the team's `AgeExport`) + flip/zoom test-time views | exact 33.6 → 39.6 %, ±1 year 72.6 → 77.1 %, MAE 1.37 → 1.21 y; when not flagged uncertain MAE 0.74, ±1 88 % | 449 holdout photos, `scripts/eval_age.py` |
| Age | Teeth blur threshold 32.8 → 16 (5th percentile) | photos accepted 67 % → 91 %, same accuracy (the "blurry" ones had MAE 1.14) | same |
| Species | Cow vs buffalo from ImageNet's ox / water-buffalo split, cut-off 0.10 (species model returned but weight 0) | 69.5 % → 90.5 % (buffalo 91.4 %, cow 90.3 %) | 968 labelled photos (185 buffalo), consistent on both sources |
| Cattle gate | Flip averaging, threshold 0.05 → 0.02 | cattle wrongly rejected 5.8 → 3.0 %; non-cattle accepted 2/35 (unchanged) | 968 cattle + 35 non-cattle, `scripts/threshold_study.py` |
| Breed | Center + full-frame views + flips | dairy set 79.4 → 88.7 %; independent set 27.3 → 26.3 % (≈15 animals) | `scripts/eval_breed.py` on Hugging Face sets |
| Health | Flip averaging | equal or better on every set (lumpy set 91.5 → 93.6 %) | `scripts/eval_health.py`; 93–97 % top-1 on 4 external sets, sick called healthy 0–9 % |
| Speed | `tf.function` for all Keras models; TF Hub species model always run with batch 2 (720 ms → 30 ms) | ML time per evaluation ~8 s → ~1.6 s | timing runs |

Also: the 128 MB health model and the 84 MB age ensemble are stored in **Git LFS**.

**Data sources used for evaluation (not committed):** Hugging Face `SynthAIzer/indian-cattle-buffalo-breeds` (test split, 1–2 source photos per breed, augmented), `Priya012005/CowBuffaloBreed` (4 dairy breeds, likely overlaps the breed model's training source); GitHub `11Adars/Mini-Project-Cattle-Disease-Detection`, `tleeds1/Cattle-disease-detection-app`, `Abdo965/AI-LLM-Based-Disease-Detection-for-Cows`, `SuryaGudipati21/Cattle-Disease-Detection`, `shubh-07-lk/Detection-of-FMDV-using-Computer-Vision-Algorithm`; age project's holdout split (local).

**Still weak:** the breed model on genuinely new photos (independent set 26 %; Sahiwal, Gir, Tharparkar 0/9). The LLM breed check (decision 3, Module 3) is the main remedy; retraining with Pakistani breeds is in Module 10.

---

## Module 1 — ML service: all four models (2026-10-23)

**Status:** done. `/explain` (Grad-CAM, optional) deferred, see open items.

### What was done
- New package `ml-service/maweshi_ml/` with one module per model, all configured from `ml-service/models.yaml` (paths, preprocessing, classes, thresholds, versions):
  - `registry.py`: `ModelRegistry` loads every model once at startup; one failing model doesn't stop the others; `GET /health` lists status, version and load time.
  - `imaging.py`: one decoder for all models, applies the phone's EXIF rotation, alpha on white.
  - `quality.py` → `POST /quality`: blur (Laplacian variance at 1024 px), brightness, clipped pixels, minimum size; ~0.2 s.
  - `gate.py` + `species.py` → `POST /predict/species`: cow / buffalo / unknown (see study below).
  - `breed.py` → `POST /predict/breed`: same preprocessing as the export's `inference.py`, averages softmax over several views, keeps only the detected species' breeds and renormalises, `uncertain` below 0.50.
  - `age/` → `POST /predict/age`: the team's ONNX age model + incisor segmenter, with the team's quality gate (blurry / no teeth / low segmentation confidence), temperature calibration and 90 % interval. Helpers vendored verbatim from `F:\FYP\Models\Age Detection\src`. Adds `age_band`, `permanent_incisors_estimate` (dentition chart: 1 y → 0, 2 → 2, 3 → 4, 4 → 6, 5+ → 8) and `uncertain` (90 % interval wider than 5 years).
  - `health.py` → `POST /predict/health`: EfficientNet-B3 baseline with stand-in `EfficientNetPreprocess` / `FocalLoss` objects; any confident disease finding wins (FMD before lumpy), otherwise the average over all photos decides; `uncertain` below 0.60.
  - `POST /predict` kept unchanged (legacy shape) so the current backend still works.
- Models added: `model/gate/` (ImageNet EfficientNetV2-B0, 29 MB), `model/age/` (age.onnx 17 MB, segmenter.onnx 27 MB, serve.json), `model/health/` (README + test results; the 128 MB `.keras` is git-ignored and fetched by `scripts/download_models.py`, pinned to Hugging Face revision `8798052`).
- `scripts/threshold_study.py` (species/gate study), `scripts/download_models.py`.
- Tests: `tests/` with 23 Wikimedia Commons fixtures (sources in `tests/fixtures/SOURCES.md`); `pytest.ini`; `requirements-dev.txt`. Added `onnxruntime`, `PyYAML` to `requirements.txt`.

### Key finding: the species model can't reject non-cattle
The build plan said to return `unknown` when the species softmax is below ~0.80. On 13 cattle and 33 non-cattle photos the species model scored goats (0.9995), grass (0.9987), cats, a truck and a brick wall *higher* as "cow" than many real cattle. No threshold works:

| Method | Not-cattle wrongly accepted | Cattle wrongly rejected |
|---|---|---|
| Species score ≥ 0.80 (old plan) | 57.6 % | 38.5 % |
| Species score ≥ 0.99 | 6.1 % | 92.3 % |
| **Gate: ImageNet P(ox + water buffalo + oxcart) ≥ 0.05** | **6.1 %** (donkey, one goat photo) | **0 %** |

Final species step (gate + species model): **31/33 non-cattle rejected, 13/13 cattle accepted, cow vs buffalo correct on 13/13** (the species model alone called a Gir cow and a Salers cow "buffalo"; averaging with the gate's ox / water-buffalo split fixes both). Small test set; the threshold should be re-checked on mandi photos in Module 9.

### How it was tested
- `python -m pytest`: **47 passed** in ~65 s (all endpoints, invalid files, quality issues, species on 6 cattle + 16 non-cattle fixtures, breed species gating, age gate and uncertainty, health aggregation, legacy `/predict`).
- Parity: our age output equals the team's `AgePipeline` (class, interval, confidence); our breed preprocessing equals the export's `inference.py` to 1e-6. (Run when `F:\FYP\Models` is present; skipped otherwise.)
- Live `uvicorn` run, all 5 models loaded (~21 s startup). Latency on CPU: quality 0.25 s, species 1.3–1.9 s, breed (3 views) 0.5 s, age 0.45 s, health (4 photos) 1.8 s.

### Model observations (for the thesis and Module 2–3)
- **Breed is weak:** Holstein photo → Jersey 59 % (Holstein 2nd); Gir cow → Vechur 99 %. Species gating fixed the buffalo case (now Nili-Ravi). The LLM breed check (decision 3) is needed.
- **Age** is right on clear photos (completed 2 y → 2, completed 7 y → 7) but can be far off with a wide interval (completed 3 y → 10, 90 % interval 3–12): shown as `uncertain`, and the rules should treat it as "check teeth in person".
- **Health:** healthy animals come back healthy (82–98 %). No diseased photos were available locally to test FMD/lumpy detection (the `F:\FYP\Dataset` folder is no longer on the drive).

### Open items
- `/explain` (Grad-CAM heatmap for the "Show AI focus areas" switch) not built; the Result screen hides the switch until it is.
- Re-check the gate threshold and health model on real mandi photos, and FMD/lumpy photos (Module 9).
- Teeth photos aren't in git (dataset licence); age tests that need one are skipped without the local dataset.

---

## Plan update — UI spec and decisions (2026-10-23)

- Added `docs/design/MaweshiAI_UI_Spec.md` (UI spec) next to `docs/design/MaweshiAI.pdf`.
- `BUILD_PLAN.md` §0.1 **Decisions** added: email/password login now (OTP + Google → Module 10), Cow/Buffalo wording, species-gated breed model + LLM breed verification from a side photo, age model from the team's PyTorch project via ONNX, EfficientNet-B3 health baseline with Lumpy Skin as an extra result, Claude Haiku 5.5 as the LLM, Cloudinary for images, Profile designed from the system.
- Modules 1–7 and 10 updated to match. Cloudinary credentials confirmed present in `backend/.env`.
- Still needed: `LLM_API_KEY` in `backend/.env` before Module 2/3.

---

## Module 0 — Repo setup and fixes (2026-10-23)

**Status:** done. Pushed to https://github.com/hrq278/FYP_Project (branch `main`).

### What was done
- Docs moved: `reportnow.md` → `docs/STATUS_2026-10-23.md`, `report.md` → `docs/REPORT_2026-04-24.md`, `MAWESHIAI_BUILD_PLAN.md` → `BUILD_PLAN.md`. Created `docs/design/` (design PDF not yet added).
- `.gitignore`: ignores all `.venv*` folders, `.tfhub_cache`, `.pytest_cache`, `.env` files, and `ml-service/model/*.weights.h5` (regenerated by the `.keras` fallback loader on every start).
- `.env.example` updated for backend (Cloudinary + LLM placeholders, Atlas DNS note) and mobile (LAN IP note).
- `ml-service/requirements.txt`: all direct dependencies pinned to the working versions; added `keras`, `h5py`, `pillow`, `setuptools==80.10.2`.
- `mobile/babel.config.js`: removed deprecated `expo-router/babel` plugin.
- `mobile/components/ImagePicker.jsx`: `MediaTypeOptions.Images` → `mediaTypes: ["images"]`.
- Backend `/api/evaluate`:
  - multer limit 8 MB, JPEG/PNG/WebP only, both returned as 400 with a clear message.
  - ML service 400 (e.g. invalid image) passed through as 400.
  - ML service unreachable/timeout → 503 "Analysis service is unavailable".
- New `mobile/hooks/useAuth.js` (`useAuth` → `saveSession`, `logout`; `useProfile` → profile loaded on focus). Login, Register, Home, Result, Profile and Settings use it; removed 5 copies of the logout code and 2 copies of profile loading.
- `README.md` rewritten: correct model path, setuptools note, Atlas DNS note, run steps, API table.
- `mobile/app.json`: display name **MaweshiAI**, slug `maweshiai` (no Android/iOS package id was set, so nothing to keep stable).
- `ml-service/model/`: kept `cattle_breed.keras` only (the two `.h5` copies held identical weights; originals remain in `F:\FYP\Models\Breed\...\exports\cattle_breed_keras`). Added `cattle_breed.labels.json`, `cattle_breed.preprocessing.json`, `cattle_breed.export_report.json` from that export folder.
- `.vscode/settings.json`: Python interpreter points to `ml-service/.venv`.

### Files changed
`.gitignore`, `.vscode/settings.json`, `README.md`, `PROGRESS.md` (new), `BUILD_PLAN.md` (renamed), `docs/*` (moved), `backend/.env.example`, `backend/routes/evaluateRoutes.js`, `backend/controllers/evaluateController.js`, `ml-service/requirements.txt`, `ml-service/model/*`, `mobile/.env.example`, `mobile/app.json`, `mobile/babel.config.js`, `mobile/components/ImagePicker.jsx`, `mobile/hooks/useAuth.js` (new), `mobile/app/{login,register,home,result,profile,settings}.jsx`.

### How it was tested (2026-10-23)
| Check | Result |
|---|---|
| ML service + backend start with README steps (Atlas via `mongodb+srv://`) | ✅ |
| Login → evaluate cow photo | ✅ Cow 95.55% (200) |
| Evaluate buffalo photo | ✅ Buffalo 98.95% (200) |
| Text file sent as `text/plain` | ✅ 400 "Only JPEG, PNG or WebP images are allowed" |
| Garbage bytes labelled `image/jpeg` | ✅ 400 "Invalid image file" (passed through from ML) |
| 9 MB upload | ✅ 400 "Image must be 8 MB or smaller" |
| No file | ✅ 400 "Body image is required" |
| ML service stopped | ✅ 503 "Analysis service is unavailable…" |
| Expo Android bundle (cache cleared) | ✅ 1,126 modules, no errors, no babel deprecation warning |

Not tested: screens on a real phone (no device connected).

### Open questions / notes
- `mobile/.env` still has the old IP `192.168.100.129`; set it to the PC's current LAN IP before using Expo Go.
- Module 1 inputs now known: breed metadata (in `ml-service/model/`), age project at `F:\FYP\Models\Age Detection` (PyTorch, 5-fold checkpoints; final model to be selected/exported), FMD spec (Hugging Face `xprotocol/EfficientNet-B3-Cattle-Disease`).
- Breed model quick check: Holstein photo → Jersey 59% (Holstein 2nd); water buffalo → Brown Swiss 85%. Plan for Module 1: species-gated breed list, multi-view averaging, "uncertain" below threshold, LLM breed verification from a side photo (team decision 2026-10-23).
