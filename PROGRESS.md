# MaweshiAI — Progress Log

One entry per module session. Newest first. See [BUILD_PLAN.md](BUILD_PLAN.md) for the plan.

---

## Module 7 — Mobile: History, Compare, Profile (2026-10-24)

**Status:** done (verified in the browser with real backend + ML service and Atlas data).

### What was done
- **History** `app/(tabs)/history.jsx` (spec §4.14): search by breed or date (debounced; "24 Oct", "24 October 2026", "24/10" use the phone's time zone), filter chips All / Recommended / Caution / Not Recommended, paginated list (loads more on scroll), pull to refresh, **Select** button or long-press → checkboxes, "Compare (2)" keeps the last two picked and explains why when it can't compare (not finished / different purposes). Separate empty states for "no reports yet" and "no results" (with Clear search and filters).
- **Compare** `app/compare/[a]/[b].jsx`: A/B cards (winner outlined green), table for breed, age, health and fit for purpose with 3-segment bars, green "Better choice" card with the reason, "Open Animal X report".
- **Profile** `app/(tabs)/profile.jsx`: account card, language cards (English / اردو), About, **How we use your data** (`app/legal.jsx`, also opened from the terms note on Login/Register), Log out, **Delete account** with a red confirm button, app version.
- **Guests**: banner + Sign up link on History. Instead of a separate local list, guest reports stay on the server and are **moved to the account on sign-up or log-in** (`claimedReports` in the response).
- **Backend**: `DELETE /api/auth/account` (account, reports and their Cloudinary photos; guests get 403); date search with `tz` offset; guest-report claim in register/login.
- **Health check fix**: a Module 5 test animal was Not Recommended (score 25) because the disease model called the **teeth photo** foot-and-mouth (0.88) while all four body photos were healthy. Measured on 80 healthy photos from the dentition dataset: 32 FMD, 14 uncertain, 34 healthy, so the model can't be trusted on mouth close-ups. The pipeline now sends only the four body photos to the health model; the teeth photo is used for age only. Screen text changed from "Mouth, skin and hooves" to "Skin, legs and hooves" (English and Urdu).
- New `danger` button variant used by destructive confirm dialogs.

### How it was tested
- Backend: **68 tests** pass (new: date search incl. time zone, guest claim, delete account, guest 403, health gets 4 body views). ML: 48 pass.
- Playwright run against the live app: filter → only the Not Recommended animal; search "nili" and "24 Oct" → only Nili-Ravi; different-purpose hint shown; compare page opens; a guest's report moves to the new account on sign-up and the banner disappears; Delete account → back to Login and the old password returns 401; English and Urdu screenshots reviewed; no page errors.

### Open items
- History thumbnails show only once Cloudinary works (FIXES.md item 1).
- Pull-to-refresh and long-press still to try on a phone (FIXES.md item 5).

---

## Module 6 — Mobile: Result, Ask, PDF, Share (2026-10-23)

**Status:** done (verified in the browser with real backend + ML service; PDF, WhatsApp and text-to-speech still to try on a phone).

### What was done
- **Result screen** `app/report/[id]/index.jsx` (spec §4.12): header (date · purpose), verdict card (3dp verdict-colour border, large badge, `ScoreRing`, summary), 2×2 tiles (species + confidence, breed + confidence + "possibly X" / "identified by AI", age + permanent-teeth estimate + "not certain", health + note), front photo (or "Photo not stored"), accordions (Why this verdict – open, Risks, Fit for your purpose, Check before you pay), disclaimer with report id and whether the text was written by AI or from rules, sticky bar: Download PDF · **Share on WhatsApp** · Ask a Question. Handles loading, still processing (keeps polling), rejected, failed, not found.
- **PDF** `src/report/pdf.js` (spec §6): A4 HTML (logo, report id, date, purpose, prepared for, QR code, front photo, verdict box, summary table with AI confidence, reasons and risks boxes, disclaimer, footer) → `expo-print` → share sheet. Urdu PDFs embed Noto Nastaliq Urdu as base64 `@font-face` and are right-to-left. QR via `qrcode-generator` (pure JS). On web the report opens in its own window to print.
- **Share** `src/report/share.js`: WhatsApp with summary + link (`whatsapp://send`), falling back to the share sheet with the PDF; `wa.me` on web.
- **Ask screen** `app/report/[id]/ask.jsx` (spec §4.13): linked report card, chat bubbles from the stored history, 3 suggested questions (tap sends), input + Send, **Listen** with `expo-speech` (`ur-PK` / `en-US`); clear notice and default suggestions when the AI assistant isn't available (no key yet). Voice input ("Speak") left out as allowed by the plan.
- **Backend**: public read-only report page `GET /r/:reportId?k=<shareKey>` for the QR code. Report ids are guessable (date + 4 digits), so each evaluation now gets a random 24-hex `shareKey` and the page needs both; it leaves out budget, seller's price and owner, escapes all text and sets `noindex`.
- ML service: species confidence capped at 0.99 (it showed "100%").
- New packages: `expo-print`, `expo-sharing`, `expo-speech`, `expo-file-system`, `expo-asset`, `qrcode-generator`.

### How it was tested
- Backend: **63 tests** pass (2 new: share key required, budget/price not exposed, HTML escaped). ML: 48 pass.
- Created one English and one Urdu evaluation through the API, then rendered with Playwright: Result (top / middle / bottom) in English and Urdu, the PDF HTML at A4 in both languages (Urdu in Nastaliq, mirrored), Ask screen before and after tapping a suggestion (503 notice without key), and the public page (200 with key, 404 without).
- Fixed during testing: Urdu Ask screen wider than the screen (input needed `minWidth: 0` on web), species "100%".
- Android bundle builds; no page errors.

### Open items
- Try Download PDF, WhatsApp and Listen on a real phone (FIXES.md item 5).
- QR / WhatsApp links work only on the local network until deployment (FIXES.md item 6, Module 10).
- "Show AI focus areas" heatmap stays hidden (no `/explain` yet).

---

## Module 5 — Mobile: analysis flow (2026-10-23)

**Status:** done (verified end to end in the browser with real backend + ML service; not yet on a physical phone).

### What was done
- `src/context/CheckFlowContext.js`: state for one check (purpose, budget, seller's price, experience, 5 photos with their quality and species results, retake mode, evaluation id); Pakistani number formatting (`2,50,000`).
- `src/utils/photo.js`: compress every photo to max 1280 px, JPEG 0.8 (`expo-image-manipulator`).
- `services/api.js`: `checkPhoto` (`POST /api/evaluations/quality`), `createEvaluation` (5 photos + form), `getEvaluation`; uploads use a uri on phones and a Blob on web.
- Screens (`app/check/`):
  - `purpose`: 2×3 purpose cards (Milk default), optional budget and seller's price in PKR, experience toggle.
  - `capture/[view]`: one screen for front/back/left/right/teeth: `expo-camera` live preview, 5-step stepper, dashed silhouette per view (right = mirrored left), amber corner brackets, tip card with example, Gallery / Capture / Flash (off → auto → on). After a photo: compress → quality check (+ species pre-check on the front photo) → good photos move on automatically; weak ones get an inline "Retake / Use anyway"; not cow/buffalo → wrong-image screen; check failing (offline) → "use anyway". Camera permission screen with "Allow" or "Open settings". Close asks to discard (own `ConfirmDialog`, since RN `Alert` does nothing on web).
  - Teeth step: guide card (lower-jaw drawing + 3 tips), mouth outline, hint pill, flash on by default.
  - `review`: 2-column grid, teeth across both columns, Good / blurred "Retake" tiles, warning banner with count, tap to retake one photo (returns to Review), Analyze confirms when photos are weak.
  - `processing`: uploads, then polls every 1.5 s and renders `steps[]` live (done / working spinner / waiting) with server summaries ("Cow (60%)", "Possibly Vechur", "~5 years"); progress bar; Cancel back to Review; done → `report/[id]`; rejected → wrong image; failed → retry screen.
  - `wrong-image` (spec §5.2): Retake photo / See photo tips (opens onboarding, which now returns instead of going to Login when signed in).
- Overlays added to `Illustrations.jsx`: `CaptureOverlay` (front, back, side), `MouthOverlay`, `CornerBrackets`. All strings in English and Urdu.

### How it was tested (Playwright + Chrome with a fake camera, real backend on Atlas + ML service)
- Full run: Purpose (Qurbani, PKR 2,50,000 / 3,10,000) → 5 photos via Gallery (Gir cow, Holstein, blurred Hereford, black-and-white cow, real teeth photo) → blurred photo got "Image is blurry – retake" → Use anyway → Review showed 1 warning tile and banner → confirm dialog → Processing showed live steps → report route in **10.9 s**. Photos checked in 22.8 s total.
- Goat as front photo → wrong-image screen (species pre-check), no evaluation created.
- Urdu: purpose, camera, teeth and wrong-image screens mirror correctly; fixed badge placement on cards (RN-web doesn't flip `start`/`end` on absolute positions; now physical side by language, which also matches phones).
- Android bundle builds; no page errors.
- Test data added in Atlas: one evaluation for `claude-m2-1792756718@example.com`.

### Open items
- Try the live camera, flash and permission flow on a real Android phone (Expo Go).
- Offline queue for photos (spec §5.1 "No internet") is Module 8.

---

## Module 4 — Mobile foundation: theme, components, i18n, auth screens (2026-10-23)

**Status:** done (verified by rendering on web at phone size; not yet on a physical phone).

### What was done
- **Design system in code** `mobile/src/theme/`: every token from UI spec §1 (colours incl. verdict and photo-quality colours, type scale, spacing, radii, borders, touch sizes, shadows).
- **Fonts:** Plus Jakarta Sans (400-800) and Noto Nastaliq Urdu (400-700) via `@expo-google-fonts`; `AppText` switches to Nastaliq with ~1.9x line height in Urdu (`latin` prop keeps names, emails and numbers in the Latin font).
- **Components** `mobile/src/components/`: `Button` (primary/outline/neutral/dark, icons, loading), `TextField` (label, prefix block, password toggle, error), `SelectCard`, `IconTile`, `Chip`, `PageDots`, `SegmentedToggle`, `Switch`, `Screen`, `BackButton`, `ScreenHeader`, `Card`, `InfoBanner`, `EmptyState`, `Accordion`, `VerdictBadge`, `ScoreRing`, `ConfidenceBar`, `InfoTile`, `Stepper`, `ReportListItem`, bottom nav, and SVG line art (`CattleHeadIcon` logo, `CattleSide` zebu, `PhoneViewfinder`, `TeethIllustration`, `Hills`). Icons from `lucide-react-native`.
- **i18n** `mobile/src/i18n/`: i18next with `en.json` / `ur.json` for every Module 4 string. Language saved in AsyncStorage, loaded before the first screen renders, synced to `PUT /api/auth/settings` for signed-in users. Switching to/from Urdu calls `I18nManager.forceRTL` and reloads once (`expo-updates`, falling back to `DevSettings.reload`). Arrows and chevrons follow the language (`useDirection`).
- **Session** `mobile/src/context/SessionContext.js`: token, guest flag, profile, onboarding-seen flag; `signIn`, `signInAsGuest` (`POST /api/auth/guest`), `signOut`, `finishOnboarding`.
- **Screens** (Expo Router groups): Splash (`app/index.jsx`, animated, routes to Language / Onboarding / Login / Home), `(onboarding)/language`, `(onboarding)/onboarding` (3-step carousel, shown once), `(auth)/login` and `(auth)/register` (email + password per decision 1, Continue as Guest, terms), `(tabs)/home` (greeting, hero card, last 3 reports, guest banner, empty state), `(tabs)/history` and `(tabs)/profile` (basic; full versions in Module 7), `about`. Placeholders for `check/purpose` (Module 5) and `report/[id]` (Module 6).
- Removed the old CattleEval screens (hero, sidebar, old home/result/settings/profile, background wrapper); they remain in git history.
- `app.json`: green native splash, `supportsRTL`, web config. New packages: `react-native-svg`, `lucide-react-native`, `i18next`, `react-i18next`, `expo-splash-screen`, `expo-updates`, `expo-status-bar`, both font packages, `react-native-web` + `@expo/metro-runtime` (web rendering for checks).
- **Backend fix found while testing:** an error inside an async route (e.g. MongoDB not connected) was an unhandled rejection that crashed the whole server. All routes are now wrapped (`middleware/asyncHandler.js`) so errors become 500 responses; 61 backend tests still pass.

### How it was tested
- Android and web bundles build with no errors (3,239 / 2,864 modules).
- 17 screens rendered at 390×844 in headless Chrome (Playwright) in English and Urdu and compared with `docs/design/MaweshiAI.pdf`; issues found and fixed: Urdu not applied on deep links, Urdu subtitle font, overlapping radio on Profile, duplicate "Not cattle" in lists, arrow direction and text alignment in RTL.
- Click-through flow from a fresh install: Splash → Language → Onboarding (3 steps) → Login → Continue as Guest → Home (guest banner) → app restart goes straight to Home. No page errors.

### Open items
- Run on a real phone with Expo Go (fonts, RTL reload, keyboard). Update `mobile/.env` IP first.
- On this network DNS TXT lookups were blocked again, so the backend had to be started with the standard `mongodb://` string (see README).

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
