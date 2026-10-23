# MaweshiAI — Complete Build Plan for the Coding Agent

> Put this file in the repo root as `BUILD_PLAN.md`. Work **one module per session**.
> Start every session with: *"Read BUILD_PLAN.md and PROGRESS.md, then do Module N."*

---

## 0. Context (read first)

**What the app is:** MaweshiAI (previously "CattleEval / LES") is an AI cattle-buying advisor for Pakistani buyers at livestock markets (mandi). The user picks a buying purpose, takes 5 guided photos (front, back, left, right, teeth), and the system runs 4 models (species, breed, age from teeth, health: FMD / Lumpy Skin Disease). A rule engine and an LLM then produce a buy / don't-buy report, shown on screen and downloadable as PDF.

**Team:** Haroon Rasheed (22CS070), Abdul Mutali (22CS114), Syed Eiman Ali Shah (22CS006). Supervisor: Dr. Fawad Mangi. MUET Jamshoro FYDP.

**Existing codebase (working, do not throw away):**

```
mobile/      React Native 0.81, Expo SDK 54, Expo Router 6, Axios, AsyncStorage
backend/     Node.js, Express 4, Mongoose 8, JWT, bcrypt, multer   (port 3000)
ml-service/  Python 3.13, FastAPI, TensorFlow 2.21, tf-keras, TF Hub, OpenCV (port 8000)
DB           MongoDB Atlas
```

Already working end to end: register/login/profile/settings (email + password, JWT 7 days), species detection (`SpecieDetector.keras`, MobileNetV2, classes 0=Cow 1=Buffalo), single-image `POST /api/evaluate`. Full status is in `docs/STATUS_2026-10-23.md` (the old `reportnow.md`).

**Design source of truth:** `docs/design/MaweshiAI_UI_Spec.md` (tokens, components, every screen, states, navigation, data shape, RTL and accessibility rules) together with `docs/design/MaweshiAI.pdf` (19 frames). Match them closely: layout, colors, type, spacing, copy. Where the spec and this plan differ, the **Decisions** list below wins; otherwise the spec wins for anything visual.

### 0.1 Decisions (2026-10-23)

These override older text in this plan and the UI spec:

1. **Login:** email + password now (existing backend), restyled to the spec's Login layout, plus **Continue as Guest**. No OTP screen and no Google sign-in yet; both move to Module 10 (optional).
2. **Species wording:** the app distinguishes Cow and Buffalo. Show "Cow" / "Buffalo" (not "Cattle"), and the wrong-image copy reads "This doesn't look like a cow or buffalo".
3. **Breed:** use `cattle_breed.keras` (ResNet-18, 15 classes, metadata in `ml-service/model/cattle_breed.*.json`). Restrict the breed list by species (buffalo → Nili-Ravi / Jaffarabadi; cow → the 13 cow breeds), average across front/left/right, and return "uncertain" below threshold. **The LLM verifies the breed from one side photo** (vision), which also covers breeds the model doesn't know (e.g. Cholistani, Dhanni, Sibbi). Model and LLM results are both stored; disagreement lowers confidence.
4. **Age:** use the team's PyTorch model from `F:\FYP\Models\Age Detection` (selected checkpoint exported to ONNX and served with `onnxruntime`, so the ML service doesn't need PyTorch). Output is age in years; permanent incisor count is derived from a standard dentition chart and labelled approximate.
5. **Health:** baseline model **EfficientNet-B3 Cattle Disease** (Hugging Face `xprotocol/EfficientNet-B3-Cattle-Disease`, Apache-2.0): 3 classes `foot-and-mouth`, `healthy`, `lumpy`; input 300×300 RGB 0–255 (no /255); "uncertain" below 0.60; model version `efficientnet-b3-baseline-v1`. **Lumpy Skin Disease** is a result the design doesn't show: add it with the same Not Recommended styling.
6. **LLM:** Anthropic **Claude Haiku 5.5** (`claude-haiku-5-5`, $0.10 / $0.50 per million input/output tokens, about $0.001 per report) behind the provider interface in Module 3.
7. **Image storage:** Cloudinary; credentials live in `backend/.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
8. **Profile screen** isn't designed: build it from the same tokens and components (name, email, language switch, about/team, logout, delete account).
9. **Cattle gate (Module 1 finding):** the species model can't recognise "not cattle" (goats, cats and grass score 0.95+ as cow), so a softmax threshold doesn't work. An ImageNet EfficientNetV2-B0 decides cattle vs not (P(ox) + P(water buffalo) + P(oxcart) ≥ 0.05), and cow vs buffalo is the average of the species model and the gate. Study in `PROGRESS.md`.

---

## 1. Global rules for the agent

1. **Read before writing.** At the start of each module, read the relevant existing files. Extend working code; do not rewrite it from scratch.
2. **Never invent model metadata.** Class names, class order, input size and preprocessing must come from the training notebooks, dataset folder names, or the team. If you can't find them, **stop and ask**, listing exactly what's missing. Do not guess breed names.
3. **One module per session.** Finish its acceptance criteria, then update `PROGRESS.md` (what was done, files changed, how to test, open questions) and stop.
3a. **Keep `FIXES.md` current.** It lists what only the team can do (keys, accounts, devices, data). Remove items once they work; add new ones as they come up.
4. **Keep secrets out of git.** All keys in `.env` files; commit `.env.example` with placeholder values only.
5. **Small commits** with clear messages (`feat(ml): add breed endpoint`).
6. **No fake data in production paths.** Mock data is allowed only behind `USE_MOCKS=true` or in tests/storybook.
7. **Every user-facing string goes through i18n** (`en` and `ur`), from Module 4 onward.
8. When something in this plan conflicts with the real code or models, explain the conflict in `PROGRESS.md` and choose the simplest fix.

---

## 2. Design system (from the approved design)

> The full token list (including `primaryTintSoft`, `primaryTintBorder`, `accentText`, `surfaceMuted`, camera colours and the photo-quality warning colours) and the component specs are in `docs/design/MaweshiAI_UI_Spec.md` §1–§2. The tables below are a summary; use the spec when building.

**Font:** Plus Jakarta Sans (400, 500, 600, 700, 800) via `@expo-google-fonts/plus-jakarta-sans`. Urdu: Noto Nastaliq Urdu (`@expo-google-fonts/noto-nastaliq-urdu`), with line-height ≈ 1.9× font size so text isn't clipped.

**Colors**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAF7F0` | App background (off-white) |
| `surface` | `#FFFFFF` | Cards, inputs, bottom nav |
| `text` | `#1B1F1A` | Primary text |
| `textBody` | `#2E352C` | Long text in lists |
| `textMuted` | `#4A5248` | Secondary text |
| `iconMuted` | `#6B7068` | Chevrons, inactive icons |
| `border` | `#E6E0D3` | Card borders (2px) |
| `borderStrong` | `#DCD6C8` | Outline buttons, back buttons |
| `primary` | `#1F5F3A` | Brand green, hero card, selected states |
| `primaryDark` | `#143F27` | Pressed state |
| `primaryTint` | `#E3EFE5` | Icon tiles, active nav, chips |
| `accent` | `#E8A317` | Main CTA buttons (text on it = `text`) |
| `accentLight` | `#F2B23A` | Progress bars, illustration lines |
| `cameraBg` | `#10150F` | Capture screens |
| `success` / `successBg` / `successText` | `#1E7A3E` / `#DDF0E2` / `#14532D` | Recommended |
| `caution` / `cautionBg` / `cautionText` | `#D18A00` / `#FCEFCF` / `#6E4300` | Caution |
| `danger` / `dangerBg` / `dangerText` | `#C0262D` / `#FBE1DE` / `#8F1A1A` | Not Recommended, errors |

**Shape and size**

- Radii: chips/badges 999, icon buttons 14, buttons 16, small cards 16, list cards 20, hero/verdict cards 22–24.
- Primary button: height 56, radius 16, `accent` background, 18px/800 text, optional leading icon.
- Outline button: height 56, 2px `primary` (or `borderStrong`) border, `primary` text.
- Minimum touch target 48×48. Screen side padding 20. Card borders 2px.
- Icons: line icons, stroke 2–2.5, rounded caps (use `lucide-react-native`; custom SVG for cattle illustrations via `react-native-svg`).
- Verdict is **never color alone**: always icon + label (✓ Recommended, ⚠ Caution, ✕ Not Recommended).
- Type scale: H1 28/800, screen title 22/800, section 21/800, card title 18/800, body 15–16/500, caption 13–14/600.

---

## 3. Target architecture

```
Mobile (Expo)
  └─► Backend (Express)  ── stores everything in MongoDB, images in Cloudinary
        ├─► ML service (FastAPI)  — species, breed, age, health (FMD/lumpy), quality check, Grad-CAM
        └─► LLM provider (configurable) — report text, Q&A chat, comparison
```

**Evaluation lifecycle (async, so the Processing screen shows real progress):**

1. `POST /api/evaluations` with purpose form + 5 images → returns `{ id, status: "processing" }` immediately.
2. Backend runs steps in order, updating `steps[]` in MongoDB after each: `species → breed (model + LLM verification) → age → health → report`.
3. App polls `GET /api/evaluations/:id` every 1.5s until `status` is `done` or `failed`.
4. If species check fails (not cow/buffalo), stop early with `status: "rejected"`, `reason: "not_cattle"`.

---

## Module 0 — Repo setup and fixes ✅ Done 2026-10-23

**Goal:** a clean, versioned, runnable base. (Details in `PROGRESS.md`; repo: https://github.com/hrq278/FYP_Project.)

Tasks:
- `git init`, `.gitignore` (node_modules, .venv*, .env, model binaries if > 100MB → use Git LFS or document a download link), push to GitHub.
- Move docs: `reportnow.md` → `docs/STATUS_2026-10-23.md`; add design PDF at `docs/design/MaweshiAI.pdf`.
- Create `PROGRESS.md` and `.env.example` for each service.
- Fix known issues from the status report:
  - `ml-service/requirements.txt`: add `setuptools<81`, `h5py`, pin all versions (`pip freeze` from the working venv).
  - `mobile/babel.config.js`: remove deprecated `expo-router/babel`.
  - `ImagePicker`: `MediaTypeOptions` → `mediaTypes: ["images"]`.
  - Backend: pass ML 400s through as 400; return 503 when the ML service is unreachable.
  - multer: 8 MB per-file limit, accept only jpeg/png/webp.
  - Move duplicated logout/profile logic into one shared hook (`useAuth`).
  - README: correct model path (`SpecieDetector.keras`), setuptools note, run steps.
- Rename app display name/slug to **MaweshiAI** in `app.json` (keep package id stable if already used).

**Done when:** all three services start with the README steps, existing login + species flow still works, repo is on GitHub.

---

## Module 1 — ML service: all four models ✅ Done 2026-10-23

**Goal:** one ML service that serves every model behind a clean API.

**First, collect model metadata (stop and ask if anything is missing):**

| Model | File | Status |
|---|---|---|
| Species | `model/SpecieDetector.keras` | ✅ Known: MobileNetV2 (TF Hub), 224×224, /255, [Cow, Buffalo] |
| Breed | `model/cattle_breed.keras` | ✅ Known: ResNet-18 (converted from PyTorch), 224×224, EXIF fix → short-side resize 256 → center crop 224 → /255 → ImageNet mean/std. 15 classes in `cattle_breed.labels.json` (13 cow + `jaffarabadi`, `nili-ravi` buffalo). Validation macro-F1 0.71. Reference code: `F:\FYP\Models\Breed\...\exports\cattle_breed_keras\inference.py` |
| Age | `F:\FYP\Models\Age Detection` (PyTorch) | 🟡 Read its README/configs to find the final config, input size, preprocessing and output (ordinal 15 ages). Pick the best checkpoint from `outputs/cv/*` by its CV metrics (ask the team if unclear), export to ONNX, verify parity against PyTorch on sample images |
| Health | Hugging Face `xprotocol/EfficientNet-B3-Cattle-Disease` | 🟡 Download; verify exact file name. 300×300 RGB, 0–255 (scaling inside the model), EXIF fix first. Classes [foot-and-mouth, healthy, lumpy]. Needs stand-in custom objects `EfficientNetPreprocess` and `FocalLoss` (see decision 5); load with `compile=False` |

Write all of this into `ml-service/models.yaml` (path, input size, preprocessing, class list, thresholds, model version). Load everything from that file, not hard-coded constants. Keep each model's preprocessing as its own function: the four models all preprocess differently.

Tasks:
- `ModelRegistry` that loads all models once at startup (keep the existing `.keras` fallback loader), with a `/health` endpoint listing which models loaded.
- Endpoints (all accept multipart images, return JSON with `confidence` 0–1 and `model_version`):
  - `POST /quality` → `{ ok, blur_score, brightness, issues: ["blurry"|"too_dark"|"too_bright"] }` (OpenCV Laplacian variance + mean brightness; thresholds in `models.yaml`).
  - `POST /predict/species` → `{ species: "cow"|"buffalo"|"unknown", confidence }`. **Unknown-animal handling:** return `unknown` when max softmax < threshold (start at 0.80, tune on a small set of non-cattle images: people, goats, cars, walls). Document the chosen threshold and the test set.
  - `POST /predict/breed` (form field `species` = cow|buffalo) → `{ breed, confidence, top3: [...], uncertain }`. Accept several images (front + sides), **average the softmax outputs** across views, keep only the breeds of that species and renormalise, `uncertain: true` below the threshold in `models.yaml`.
  - `POST /predict/age` → `{ age_years, age_band, permanent_incisors_estimate, confidence }` from the teeth image (band and incisor estimate derived from `age_years`).
  - `POST /predict/health` → `{ condition: "healthy"|"foot-and-mouth"|"lumpy"|"uncertain", confidence, per_image: [...], model_version }`. Run on the body photos (and teeth photo for mouth lesions); report the worst confident finding.
  - `POST /explain` (optional, do last) → Grad-CAM heatmap PNG (base64) for breed or health.
- Keep `/predict` working as an alias for species so nothing breaks before Module 2 lands.
- Tests: `pytest` with 2–3 fixture images per endpoint and one invalid file.

**Done when:** `/health` shows all models loaded, each endpoint returns correct shapes on fixture images, unknown-animal test images return `unknown`.

---

## Module 2 — Backend: evaluation pipeline and rules ✅ Done 2026-10-23

**Goal:** the backend accepts the full 5-photo evaluation, orchestrates the models, applies safety rules, and stores everything.

**Mongoose `Evaluation` schema (replace the old one, migrate nothing):**

```js
{
  userId, status: "processing"|"done"|"failed"|"rejected", reason,
  purpose: "milk"|"breeding"|"qurbani"|"meat"|"farm_work"|"other",
  budget, sellerPrice, experience: "first_time"|"experienced",
  language: "en"|"ur",
  images: { front, back, left, right, teeth },        // Cloudinary URLs
  quality: { front: {...}, ... },
  steps: [{ key: "species"|"breed"|"age"|"health"|"report", status: "waiting"|"working"|"done"|"failed", summary }],
  results: { species, breed, breedVerification, age, health }, // raw model + LLM outputs with confidences
  // Shape the app reads is in UI spec §7 (Report): species {label, confidence}, breed {label, confidence},
  // age {years, permanentTeeth}, health {condition, notes[]} (spec's fmdDetected extended for lumpy skin)
  verdict: "recommended"|"caution"|"not_recommended",
  score,                                               // 0–100, computed by backend
  report: { summary, reasons[], risks[], purposeFit, purposeFitLevel: "strong"|"fair"|"weak", tips[] },
  reportId,                                            // e.g. MW-261023-0418
  createdAt
}
```

Tasks:
- Image storage on **Cloudinary** (free tier); store URLs, not filenames.
- `POST /api/evaluations/quality` — single image quality + species pre-check, used by the capture screens for instant feedback.
- `POST /api/evaluations` — multipart (`front, back, left, right, teeth` + form fields), validates, uploads, creates the doc, starts the pipeline in the background, returns `{ id }`.
- `GET /api/evaluations/:id` — status, steps, results (owner only).
- `GET /api/evaluations?verdict=&q=&page=` — history list for the user (thumbnail = front image).
- `DELETE /api/evaluations/:id`.
- **Pipeline service** (`services/pipeline.js`): species (front image) → stop with `rejected` if `unknown` → breed (front+left+right, species-gated) → **breed verification by the LLM from the left or right photo** (Module 3; skipped with a note if no LLM key) → age (teeth) → health (body + teeth photos) → report (Module 3). Update `steps[]` after each. The breed step's summary shows the final breed (e.g. "Sahiwal").
- **Breed reconciliation:** model and LLM agree → keep, confidence up; LLM names a breed outside the 15 classes with good confidence (e.g. Cholistani) → use the LLM breed, mark source "AI vision"; disagree → show the model's top breed with "possibly <LLM breed>", confidence down.
- **Rule engine** (`services/rules.js`), runs before the LLM and always wins:
  - FMD or Lumpy Skin Disease detected → `not_recommended`, score capped at 25.
  - Health `uncertain` → at best `caution`, add "check mouth, hooves and skin in person".
  - Purpose `qurbani` and age below 2 years (fewer than 2 permanent incisors) → `not_recommended` with reason "Not eligible for Qurbani by age".
  - Any core model confidence < 0.6 → at best `caution`, add "low confidence, retake photos" risk.
  - Seller price > budget by more than 20% → add a risk line.
- **Score** is deterministic in the backend (document the formula in code), e.g. purpose-fit of breed (from the knowledge base) 40, age suitability for purpose 25, health 25, confidence 10. The LLM explains the score; it never sets it.
- Auth: keep email/password JWT (decision 1). Add **Guest mode** (`POST /api/auth/guest` → short-lived guest token, history kept on device only). Phone OTP and Google sign-in are **optional, Module 10**.
- Tests: Jest + Supertest for auth, create evaluation (ML and LLM mocked), rejected path, rules, breed reconciliation.

**Done when:** a curl request with 5 images produces a `done` evaluation with all results, and the FMD/lumpy/Qurbani rules and breed reconciliation are covered by tests.

---

## Module 3 — LLM report, Q&A and compare ✅ Code done 2026-10-23 (real-API check pending LLM_API_KEY)

**Goal:** trustworthy, structured, bilingual advice.

Tasks:
- `services/llm.js` with a provider interface (`generateJSON(prompt, schema, images?)`, `chat(messages)`). Provider, model name and API key come from `.env` (`LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-haiku-5-5`, `LLM_API_KEY`). Implement the Anthropic provider with the official `@anthropic-ai/sdk` and structured outputs.
- **Breed verification** `verifyBreed(sideImage, species, modelTop3)` → `{ breed, confidence, inKnownClasses, reasoning }` (strict JSON). Prompt lists the model's top 3 and common Pakistani breeds; it must answer "unknown" rather than guess. Used by the Module 2 pipeline.
- **Breed knowledge base** `backend/data/breeds.json`: for each of the 15 model breeds **plus the common Pakistani breeds the LLM may return** (Cholistani, Dhanni, Sibbi, Lohani, Achai, Kundi, crossbreds) — origin, primary use, typical milk yield range, typical adult weight range, heat tolerance, suitability per purpose (strong/fair/weak). Fill from reliable sources and cite them in `docs/breeds_sources.md`. The LLM only uses facts from this file.
- **Report prompt:** input = form data + model outputs with confidences + rule-engine verdict/score + breed KB entry + language. Output = strict JSON matching `report` in the schema above. Validate with `zod`; on invalid output retry once, then fall back to a template report built from the rules (so the app never breaks during the demo).
- Prompt rules: never contradict the verdict, don't claim certainty when confidence is low, always include practical checks (watch one milking, vaccination record, check udder/teats/hooves), simple language, Urdu when `language = ur`.
- `POST /api/evaluations/:id/chat` — Q&A grounded in that report (history stored on the evaluation, max ~20 messages). Return 3 suggested follow-up questions.
- `POST /api/evaluations/compare` — 2 ids → `{ winnerId, reason, rows: [...] }` for the same purpose.
- Save the exact prompt version in each evaluation (`report.promptVersion`) for the thesis.

**Done when:** the same evaluation produces valid JSON reports in English and Urdu, the fallback works with the LLM key removed, chat and compare return sensible answers.

---

## Module 4 — Mobile foundation: theme, components, i18n, auth screens ✅ Done 2026-10-23

**Goal:** the design system in code, and the first 6 screens.

Tasks:
- `mobile/src/theme/` — tokens from UI spec §1 (`colors.js`, `type.js`, `spacing.js`, `radii.js`), including the verdict and photo-quality colours.
- `mobile/src/components/` — `Button` (primary/outline/ghost, with icon, loading), `Card`, `VerdictBadge`, `ScoreRing` (react-native-svg), `ConfidenceBar`, `InfoTile`, `Stepper`, `Chip`, `SelectCard`, `IconTile`, `TextField` (with prefix like PKR/+92), `SegmentedToggle`, `BottomNav`, `ScreenHeader` (back button 48×48), `EmptyState`, `Accordion`, `Switch`, cattle SVG illustrations (side, head, front silhouette, teeth).
- **i18n:** `i18next` + `react-i18next`, `locales/en.json`, `locales/ur.json`. RTL with `I18nManager.forceRTL` on language change (requires reload — use `expo-updates` `reloadAsync` or `DevSettings.reload`). Language saved in AsyncStorage and synced to `PUT /api/auth/settings`.
- Remove old Hero / About / sidebar screens from the main flow (keep About reachable from Profile).
- Screens (match `docs/design/MaweshiAI.pdf`):
  1. **Splash** — green background, logo tile, "MaweshiAI", tagline, amber progress bar (use `expo-splash-screen` + an animated JS splash while fonts and token load).
  2. **Language** — English / اردو cards, Continue.
  3. **Onboarding** — 3-step carousel (Take photos → AI checks → Get report), Skip/Next; show once.
  4. **Login** (spec §4.4 layout, decision 1) — logo + wordmark, H1 "Log in", email and password TextFields, PrimaryButton "Log in", "Create an account" link, "Continue as Guest" TextLink, terms footer. No OTP screen and no Google button yet.
  5. **Register** — same style (name, email, password).
  6. **Home** — greeting with user name, green hero card "Check a New Animal" → Purpose, Recent Reports (last 3 from API), bottom nav Home / History / Profile.
- Navigation with Expo Router groups: `(onboarding)`, `(auth)`, `(tabs)` for Home/History/Profile, a `check/` stack for the analysis flow and `report/[id]` for results, following the route ids in UI spec §10. Follow the spec's RTL (§8) and accessibility (§9) checklists on every screen.

**Done when:** fresh install → splash → language → onboarding → login/guest → Home, in both English and Urdu (RTL correct), visually matching the design.

---

## Module 5 — Mobile: analysis flow (Purpose → Capture → Review → Processing) ✅ Done 2026-10-23

Tasks:
- A `useCheckFlow` store (Zustand or React context) holding purpose form + 5 images + quality results across screens.
- **Purpose screen** — 2×3 select cards (Milk, Breeding, Qurbani, Meat/Fattening, Farm Work, Other), optional Budget and Seller's price (PKR, numeric, formatted `2,50,000`), experience toggle, "Next: take photos".
- **Capture screens** (one reusable `CaptureScreen` for front/back/left/right):
  - `expo-camera` `CameraView`, dark `cameraBg` chrome, 5-segment stepper with labels, dashed silhouette overlay per view (SVG), amber corner brackets, tip card with example thumbnail, Gallery / Capture / Flash buttons.
  - After capture: compress with `expo-image-manipulator` (max 1280px, JPEG 0.8), call `/api/evaluations/quality` (the spec says "on-device", but Expo Go can't run the models, so the check runs on the server and should return in well under a second); on the front photo also run the species pre-check. Show ✓ or "Retake" inline. Not cow/buffalo → **Wrong image** state screen.
- **Teeth capture** — guide card (good example illustration + 3 tips), mouth-shaped overlay, flash on by default.
- **Review screen** — 5 tiles with Good / Retake badges, blurry warning, banner "Retake 1 photo for a more accurate report". Analyze is allowed with warnings but shows a confirm dialog.
- **Processing screen** — calls `POST /api/evaluations`, then polls; renders the 5-step checklist from `steps[]` (Done / Working / Waiting with the step summary such as "Sahiwal"), overall progress bar, Cancel. Navigate to Result when done; to Wrong-image state when `rejected`.
- Handle camera permission denied with a clear screen and a Settings button.

**Done when:** a real cow photographed through the app reaches the Processing screen and shows real step-by-step progress.

---

## Module 6 — Mobile: Result, Ask, PDF, Share ✅ Done 2026-10-23

Tasks:
- **Result screen** (spec §4.12) — header (date · purpose), verdict card (badge + `ScoreRing` + summary), 4 info tiles (Species "Cow"/"Buffalo" with confidence bar; Breed with confidence bar and "AI vision" / "possibly X" note from breed reconciliation; Age "~N years" with "about N permanent teeth"; Health: No disease signs / FMD / Lumpy Skin / Uncertain, each with icon + label), front photo card with "Show AI focus areas" switch (Grad-CAM overlay from `/explain` if Module 1 did it; hide the switch otherwise), accordions (Why this verdict, Risks to consider, Fit for your purpose), disclaimer, sticky bottom bar: Download PDF / **Share on WhatsApp** (primary) / Ask a Question.
- **PDF** with `expo-print` (HTML template matching the "PDF Report" frame: logo, report ID, date, purpose, prepared for, QR code, front photo, verdict box, summary table with AI confidence, reasons, risks, disclaimer). QR code via `qrcode` (SVG string) pointing to a public read-only report URL `GET /r/:reportId` (simple server-rendered page) — or to the report ID text if no hosting yet. Urdu PDF uses the Nastaliq font embedded via `@font-face` (base64).
- **Share** — `expo-sharing` with the PDF; WhatsApp button uses `Linking.openURL('whatsapp://send?text=...')` with a short summary + link, falling back to the share sheet.
- **Ask screen** — report summary card at top, chat bubbles, suggested question chips, text input, "Speak" button (voice input optional; if not done, hide it), "Listen" on AI replies with `expo-speech` (`language: 'ur-PK'` or `'en-US'`).

**Done when:** a finished evaluation can be viewed, exported as a PDF that matches the design, shared to WhatsApp, and questioned in chat.

---

## Module 7 — Mobile: History, Compare, Profile

Tasks:
- **History** — search (breed/date), filter chips (All / Recommended / Caution / Not Recommended), paginated list with thumbnails and verdict badges, pull to refresh, long-press → multi-select mode, "Compare (2)" button (exactly 2, same purpose; otherwise explain why).
- **Compare** — A/B cards (photo, badge, score; winner outlined in green), comparison table (breed, age, health, fit for purpose with 3-segment bars), green "Better choice for <purpose>: Animal X" card, "Open Animal X report".
- **Profile** (not in the design; decision 8) — avatar + name + email, language switch (English / اردو cards as on the Language screen), About MaweshiAI and team, Terms/Privacy links, Logout, Delete account (confirm dialog). Remove `alertsEnabled` (unused).
- Guest users: history stored locally (AsyncStorage) and a banner "Sign up to save your reports".

**Done when:** history, filters, search, compare and profile all work against real data.

---

## Module 8 — States, offline and polish

Tasks:
- **No internet** state — photos kept on device in a pending queue (`expo-file-system` + AsyncStorage), "Try again" / "Check later"; auto-retry on reconnect (`@react-native-community/netinfo`), pending items shown at the top of History.
- **Wrong image** state, **Empty history** state, generic server error state, ML-service-down (503) message.
- Loading skeletons on Home and History.
- Accessibility: `accessibilityLabel` on icon buttons, font scaling tested at 1.3×, contrast already handled by tokens.
- Haptics on capture and on verdict (`expo-haptics`).
- App icon and adaptive icon from the logo.

**Done when:** airplane-mode, wrong-photo and empty-account paths all show the designed screens with no crashes.

---

## Module 9 — Testing, evaluation and documentation (thesis material)

Tasks:
- `ml-service/notebooks/` — training notebooks for all 4 models (team provides), cleaned.
- `ml-service/eval/evaluate.py` — for each model on its held-out test set: accuracy, precision, recall, F1, confusion matrix PNG, inference time on CPU. Output to `docs/results/`.
- Unknown-animal threshold study: table of threshold vs false-accept / false-reject.
- End-to-end timing: average time from Analyze to report (replaces the made-up "~10s"/"~95%" stats anywhere they still appear).
- `docs/ARCHITECTURE.md` (diagram + sequence of one evaluation), `docs/API.md` (all endpoints), `docs/PROMPTS.md` (LLM prompt versions).
- Screenshots of every screen in English and Urdu to `docs/screenshots/`.
- Field-test template `docs/field_test.md`: animal #, true breed/age (from owner), predicted, verdict, user feedback (1–5).

**Done when:** `docs/results/` has metrics for all models and the docs folder is ready to paste into the FYP report.

---

## Module 10 — Deployment and optional extras

Tasks:
- Deploy backend + ML service (Render / Railway / a small VPS; ML service needs about 2 GB RAM). Use the non-SRV `mongodb://` Atlas string if the network blocks DNS TXT lookups (see status doc).
- `EXPO_PUBLIC_API_BASE_URL` → hosted URL; build an installable APK with **EAS Build** (`eas build -p android --profile preview`).
- Clean up the test account and test evaluations in Atlas.
- **Optional (only if time remains):** phone OTP login + OTP screen (spec §4.5) and Continue with Google (Firebase Auth; needs an EAS development build, not Expo Go), on-device species check with TFLite for offline mandi use, weight estimation from side image, fine-tuned FMD model to replace the baseline, breed model retrained with Cholistani/Dhanni/Sibbi.

**Done when:** the APK runs on a phone with no laptop involved and completes a full evaluation.

---

## Recommended order and owners

| Order | Module | Can run in parallel with |
|---|---|---|
| 1 | M0 Setup | — |
| 2 | M1 ML service | M4 Mobile foundation |
| 3 | M2 Backend pipeline | M4 |
| 4 | M3 LLM | M5 Analysis flow (use `USE_MOCKS=true`) |
| 5 | M6 Result/PDF | M9 Docs (notebooks + metrics) |
| 6 | M7 History/Compare | — |
| 7 | M8 States/polish | — |
| 8 | M10 Deploy | — |

## Information the team must supply before Module 1

- [x] Breed model: 15 class names in training order + preprocessing (from the Keras export folder)
- [x] Age model project located (`F:\FYP\Models\Age Detection`); final checkpoint to be chosen in Module 1
- [x] Health model spec (EfficientNet-B3 baseline, Hugging Face)
- [ ] Training notebooks and dataset descriptions for all 4 models (breed notebook found: `F:\FYP\Models\Breed\...\Cattle_Breed_Classification_Thesis.ipynb`; species and health still needed for Module 9)
- [x] LLM provider choice: Anthropic Claude Haiku 5.5
- [ ] LLM API key in `backend/.env` (`LLM_API_KEY`), needed from Module 2
- [x] Cloudinary credentials saved in `backend/.env`
- [x] UI design: `docs/design/MaweshiAI.pdf` + `docs/design/MaweshiAI_UI_Spec.md`
