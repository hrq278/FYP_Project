# MaweshiAI — UI & App Flow Specification

> AI-based cattle buying advisory app for Pakistan.
> Target: **Android**, design frame **390 × 844** (CSS px ≈ dp).
> This document is the single source of truth for building the UI. It describes design tokens, shared components, every screen (with layout, content, states and actions) and the navigation flow.

---

## 0. Product summary

Users photograph a cow/bull at a livestock market (*mandi*). AI models identify **species**, **breed**, **age (from teeth)** and detect **Foot-and-Mouth Disease (FMD)**. An LLM then writes a **buy / don't-buy report** tailored to the user's **buying purpose** (Milk, Breeding, Qurbani, Meat/Fattening, Farm Work, Other).

### Target users & design constraints (must follow everywhere)
- Pakistani farmers and cattle buyers, often **outdoors in bright sunlight**, on **budget Android phones**, using **one hand**, some with **low literacy**.
- **High contrast** text (≥ 4.5:1 body, ≥ 3:1 for ≥ 24px).
- **Touch targets ≥ 48dp** (primary buttons 56–60dp tall).
- **Icons are always paired with a text label** (never icon-only, except back/close buttons which carry an accessibility label).
- **Minimal typing**: prefer cards, chips, toggles, voice ("Speak").
- **Verdict is never colour-only**: always colour + icon + text label.
- UI shipped in **English** first; layouts must mirror cleanly for **Urdu (RTL)**. Use logical properties (`start/end`, `paddingStart`), never hard-coded left/right. Phone numbers, OTP digits, prices and scores stay LTR inside RTL layouts.

---

## 1. Design tokens

### 1.1 Colours

| Token | Hex | Use |
|---|---|---|
| `primary` | `#1F5F3A` | Earthy green: brand, headers, selected states, active nav, links |
| `primaryDark` | `#143F27` | Pressed / hover on primary links |
| `primaryTint` | `#E3EFE5` | Icon tiles, selected nav pill, illustration backgrounds |
| `primaryTintSoft` | `#F2F8F3` | Selected card background |
| `primaryTintBorder` | `#C9DCCD` | Borders on tinted chips |
| `accent` | `#E8A317` | Warm amber — **main CTA buttons** (text on it is `textPrimary`) |
| `accentBright` | `#F2B23A` | Amber on dark surfaces (splash "AI", camera progress, flash on) |
| `accentText` | `#B45309` | Amber used as text/icon on light backgrounds |
| `background` | `#FAF7F0` | Off-white app background |
| `surface` | `#FFFFFF` | Cards, inputs, bottom bars |
| `surfaceMuted` | `#EFEBE1` | Input prefixes, segmented control track, info rows |
| `border` | `#DCD6C8` | Default 2dp borders on inputs/buttons |
| `borderSoft` | `#E6E0D3` | Card borders, dividers |
| `divider` | `#EFEBE1` | Hairline list dividers |
| `textPrimary` | `#1B1F1A` | Main text |
| `textSecondary` | `#3F473D` | Body copy |
| `textMuted` | `#4A5248` | Captions, meta (still ≥ 4.5:1 on background) |
| `textDisabled` | `#5E655B` / `#6B7068` | Pending / disabled labels |
| `iconInactive` | `#B9B2A3` | Inactive dots, empty radio rings |
| `cameraBg` | `#10150F` | Camera screen chrome |
| `cameraControl` | `#263024` | Camera secondary buttons |
| `cameraTrack` | `#3A4637` | Inactive camera progress segments |

#### Verdict colours (always with icon + label)

| Verdict | Badge bg | Badge text | Icon fill | Icon |
|---|---|---|---|---|
| **Recommended** | `#DDF0E2` | `#14532D` | `#1E7A3E` | Filled circle + white check |
| **Caution** | `#FCEFCF` | `#6E4300` | `#D18A00` | Filled triangle + white "!" |
| **Not Recommended** | `#FBE1DE` | `#8F1A1A` | `#C0262D` | Filled circle + white "×" |

Warning/blurry (photo quality): border & badge `#C2410C`, text `#9A3412`, banner bg `#FDEBD8` text `#7C2D12`.

### 1.2 Typography
- **Latin:** Plus Jakarta Sans (400, 500, 600, 700, 800).
- **Urdu:** Noto Nastaliq Urdu (500, 700), line-height ≈ 1.9–2.0 (Nastaliq needs extra leading).

| Style | Size / weight | Use |
|---|---|---|
| Display | 44 / 800 | Splash wordmark |
| H1 | 26–30 / 800, letter-spacing −0.01em | Screen titles |
| H2 | 18–22 / 800 | Section titles |
| Card title | 17–18 / 800 | Card / list item names |
| Body L | 17–19 / 500–600 | Explanations, button labels (19/800 for primary CTA) |
| Body | 15–16 / 600 | Secondary text |
| Caption | 13–14 / 600–700 | Meta lines, badges, nav labels |
| Overline | 12–13 / 800, letter-spacing 0.04–0.08em, uppercase | "VERDICT", table group labels |

Minimum text size anywhere in the app: **13px** (11px allowed only for the tiny "Example" tag on the camera tip card).

### 1.3 Spacing, radius, elevation
- Screen side padding: **20–24dp**. Section gaps: **14–28dp**. Grid gaps: **10dp**.
- Radius: buttons/inputs **14–16**, cards **18–24**, icon tiles **14–20**, logo tile **40**, pills/badges **999**.
- Borders: default **2dp**; selected state **3dp `primary`**.
- Shadows only on selected cards: `0 4 14 rgba(31,95,58,0.14)`. Focus ring on inputs: `0 0 0 4 rgba(31,95,58,0.12)`.

### 1.4 Iconography & illustration
- Line icons, 2–2.5 stroke, round caps/joins, 18–30dp, coloured `primary` on light, white on dark.
- **Logo:** simple cattle-head line icon (horns, ears, head, muzzle, eyes) in an off-white rounded tile on green, or white on green tile.
- **Cattle illustrations:** flat line art of a humped zebu (Sahiwal-type) side view; front-view and rear-view silhouettes for capture overlays; lower-jaw incisor drawing (8 incisors, cattle have no upper incisors) for teeth guidance.
- Photo placeholders: tinted tile + cattle icon (until real photos exist).

---

## 2. Shared components

| Component | Spec |
|---|---|
| **PrimaryButton** | Height 60 (56 inside cards/bars), radius 16, bg `accent`, text `textPrimary` 19/800, optional leading icon or trailing arrow. Full width. |
| **SecondaryButton** | Height 56–60, radius 16, 2dp `primary` border, transparent bg, text `primary` 17–18/700. |
| **NeutralButton** | Height 60, radius 16, 2dp `border`, white bg, text `textPrimary` (used for "Continue with Google"). |
| **TextLink** | Min height 48, `primary`, 16–18/700, optional icon, underline for standalone links. |
| **BackButton** | 48×48, radius 14, white bg, 2dp `border`, arrow icon, accessibility label "Back to …". On dark screens: bg `cameraControl`, no border. |
| **SelectableCard** | White, radius 18–20, 2dp `border`. Selected: 3dp `primary` border, bg `primaryTintSoft`, shadow, check badge (28–32dp green circle + white tick) at top-end. Role = radio. |
| **SegmentedToggle** | Track `surfaceMuted`, radius 16, padding 4; options min height 52, radius 12. Selected: bg `primary`, white text. Each option has icon + label. |
| **TextField** | Height 56–60, radius 14–16, 2dp border, white bg, 18–21/600 text. Optional prefix block (`surfaceMuted` or `primaryTint`, e.g. "+92", "PKR") separated by a 2dp border-end. Visible label above (15–16/700). Focused: `primary` border + focus ring. |
| **SearchField** | Height 54, search icon at start, placeholder "Search breed or date". |
| **Chip (filter)** | Min height 44, pill. Active: bg `primary`, white text. Inactive: white, 2dp border; verdict chips include the verdict icon. |
| **Chip (suggestion)** | Min height 44, pill, bg `primaryTintSoft`, border `primaryTintBorder`, text `#14532D` 15/700. |
| **VerdictBadge** | Pill, icon (16–18) + label, 13–14/800, colours per §1.1. Large variant on result: solid `#1E7A3E` bg, white text 20–22/800, white circle icon. |
| **ScoreRing** | 88dp circle, 9dp stroke, track `primaryTint`, progress in verdict colour, starts at 12 o'clock; centre "78" 26/800 + "/100" 12/700. |
| **ConfidenceBar** | 6dp bar, track `borderSoft`, fill `primary`, % label 13/800 `primary`. |
| **ProgressStepper (camera)** | 5 equal segments, 8dp tall, gap 6. Done `#5FA874`, current `accentBright`, upcoming `cameraTrack`. Labels under segments (Front, Back, Left, Right, Teeth), current in amber. |
| **PageDots** | Active: 28×10 pill `primary`; inactive: 10×10 `iconInactive`. |
| **ReportListItem** | White card, radius 20, 2dp `borderSoft`, padding 12: thumbnail 60–64 (radius 14) · breed (17–18/800) · "Purpose · Date" (14 muted) · VerdictBadge · chevron at end. In select mode: 28dp checkbox at start, selected = 3dp `primary` border + tinted bg. |
| **Accordion** | White card, radius 18; header button min-height 58 with leading icon, title 17/800, chevron rotates 180° when open; body = bulleted text 15/1.45. `aria-expanded`. |
| **Switch** | 56×32 track, 26 knob; on = `primary`, off = `iconInactive`. Role switch with label. |
| **BottomNav** | Height 80, white, top border 2dp. 3 items: Home, History, Profile — icon 26 + label 14. Active: `primaryTint` pill bg, `primary` colour, 800 weight. |
| **StickyActionBar** | White, top border, padding 12/16/20, sits above system nav. |
| **InfoBanner** | Radius 16, padding 12–14, icon + 15/700 text. Variants: neutral (`surfaceMuted`), warning (`#FDEBD8`). |
| **CaptureButton** | 84dp white ring (5dp) with 64dp `accent` inner circle + camera icon, label "Capture" under it. |

---

## 3. Navigation map

```
Splash ──► Language ──► Onboarding (1/3 → 2/3 → 3/3) ──► Login ──► OTP ──► Home
                                  └─ Skip ─────────────────►┘   └─ Continue as Guest ─► Home
                                                         └─ Continue with Google ─► Home

Home ──"Check a New Animal"──► Buying Purpose ──► Body Photo ×4 (Front, Back, Left, Right)
     ──► Teeth Photo (5/5) ──► Review Photos ──"Analyze Animal"──► Processing ──► Result Report
                                    └─ tap photo ─► retake that capture step

Result Report ─► Download PDF (PDF Report)
              ─► Share on WhatsApp (system share intent with PDF + summary text)
              ─► Ask a Question (chat, linked to this report)

Bottom nav: Home | History | Profile
History ─► tap item ─► Result Report
History ─► Select ─► pick 2 ─► Compare (2) ─► Compare ─► "Open Animal A report" ─► Result Report

Error / empty states:
  No internet  (any network step, esp. Analyze)   → Try again | Check later (Home)
  Wrong image  (species check fails)              → Retake photo | See photo tips
  Empty history (History with 0 reports)          → Check a New Animal
```

---

## 4. Screens

Each screen: **Purpose · Layout (top → bottom) · Content · States · Actions**.

### 4.1 Splash (`Splash`)
- **Layout:** full-bleed `primary` background; centred group; bottom loader.
- **Content:**
  - Logo tile 136×136, radius 40, bg `background`, cattle-head line icon 88dp in `primary`, soft halo ring.
  - Wordmark "Maweshi**AI**" 44/800 white, "AI" in `accentBright`.
  - Tagline "Smart advice before you buy" 19/500 `primaryTint`.
  - Bottom: 160×6 progress bar (amber fill), "Loading…", faint line-art hills.
- **Behaviour:** auto-advance after init → Language (first launch) or Home (logged in).

### 4.2 Language Selection (`Language`)
- **Layout:** globe icon tile → H1 "Choose your language" → Urdu subtitle "اپنی زبان منتخب کریں" (RTL, Nastaliq) → 2 large SelectableCards (radio group) → spacer → note → Continue.
- **Cards (min-height 104):**
  - "Aa" tile + **English** + "Left to right".
  - "اب" tile + **اردو** + "Urdu · Right to left".
  - Selected shows check badge; unselected shows empty ring.
- **Note:** "You can change this later in Profile."
- **Actions:** Continue (PrimaryButton with arrow) → Onboarding. Selecting Urdu switches app locale and layout direction.

### 4.3 Onboarding (`Onboarding`, 3-step carousel)
- **Top row:** pill "Step 1 of 3" (start) · "Skip" TextLink (end).
- **Illustration panel:** 340dp tall, radius 28, `primaryTint`; phone outline containing a camera viewfinder with amber corner brackets around a cattle line drawing and an amber shutter.
- **Steps:**
  1. **Take photos** — "Take clear photos of the animal in good light. We guide you step by step." + 3 mini chips: Body, Face, Teeth.
  2. **AI checks the animal** — species, breed, age, health (FMD).
  3. **Get your report** — buy / don't-buy advice for your purpose.
- **Bottom:** PageDots (3) · row [Skip (SecondaryButton, 1 part) | Next → (PrimaryButton, 2 parts)]. On step 3, Next becomes "Get started".
- **Actions:** Swipe / Next → next step; Skip or finish → Login.

### 4.4 Login (`Login`)
- **Layout:** small logo + wordmark → H1 "Log in with your phone" → body "We will send a 6-digit code to your number by SMS." → phone field → Send OTP → "or" divider → Continue with Google → spacer → Continue as Guest → terms.
- **Phone field:** label "Mobile number"; prefix block (phone icon + **+92**, LTR); input `type=tel`, numeric keypad, placeholder "300 1234567"; helper "Example: 300 1234567 (without the first 0)". Validate 10 digits starting with 3.
- **Actions:**
  - **Send OTP** (PrimaryButton, send icon) → OTP.
  - **Continue with Google** (NeutralButton, "G" mark) → Google sign-in → Home.
  - **Continue as Guest** (underlined TextLink with person icon) → Home (history stored locally only).
  - Footer: "By continuing you agree to our Terms and Privacy Policy." (links).

### 4.5 OTP Verification (`Otp`)
- **Layout:** BackButton → chat-bubble icon tile → H1 "Enter the code" → "We sent a 6-digit code to **+92 300 1234567**" → "Change number" link → OTP boxes → resend row → spacer → Verify.
- **OTP boxes:** 6 equal boxes, 64dp tall, radius 14, 28/800 digits, LTR. Filled: `primary` border. Focused: 3dp `accent` border + amber tint bg + glow. Empty: `border`. Support SMS auto-fill/paste.
- **Resend row** (`surfaceMuted` card): clock icon + "Resend code in **00:28**"; "Resend" button disabled until timer hits 0.
- **Actions:** Verify (PrimaryButton, shield-check icon) → Home. Error state: boxes turn red border + message "Wrong code. Try again."

### 4.6 Home (`Home`)
- **Header:** "Assalam-o-Alaikum," (16/600 muted) / **Haroon** (28/800) · avatar circle 52 (`primary`, initial) → Profile.
- **Hero card (whole card tappable):** bg `primary`, radius 24; "AI check" pill; title "Check a New Animal" 26/800 white; sub "Breed, age, health and a buy report"; cattle line illustration (off-white) with amber ground line; inner amber bar "Start – take photos" with camera icon. → Buying Purpose.
- **Recent Reports:** H2 + "See all >" link (→ History). 3 ReportListItems, e.g.:
  - Sahiwal · Dairy · 21 Oct 2026 · **Recommended**
  - Red Sindhi · Qurbani · 18 Oct 2026 · **Caution**
  - Cholistani · Breeding · 12 Oct 2026 · **Not Recommended**
- **BottomNav:** Home (active), History, Profile.
- **Empty:** if no reports, show the Empty history block inline in place of the list.

### 4.7 Buying Purpose (`Purpose`) — step before capture
- **Top:** BackButton (→ Home) · pill "New check".
- **H1:** "Why are you buying this animal?"
- **Purpose grid:** 2 × 3 SelectableCards (radio group, height 96, icon tile 44 + label):
  | Card | Icon idea |
  |---|---|
  | **Milk (Dairy)** *(default selected)* | milk can with drop |
  | **Breeding** | cow + calf + heart |
  | **Qurbani** | crescent + star |
  | **Meat / Fattening** | weighing scale |
  | **Farm Work** | cart wheel / plough |
  | **Other** | circle with dots |
- **"More details" · Optional:**
  - Two fields side by side: **Your budget** [PKR] and **Seller's price** [PKR] (numeric, Pakistani digit grouping e.g. 2,50,000).
  - **Your experience** SegmentedToggle: "First-time buyer" (default) / "Experienced".
- **Action:** PrimaryButton "Next: take photos →" → Body Photo (Front). Purpose is required; others optional and passed to the LLM prompt.

### 4.8 Body Photo Capture (`CaptureBody`) — repeats for 4 views
- **Dark camera UI** (`cameraBg`).
- **Top bar:** Close (×) button → confirm discard → Purpose. Text "Step 1 of 5" (14/700 light) + view name "**Front View**" (21/800). ProgressStepper with labels Front · Back · Left · Right · Teeth.
- **Viewfinder (fills remaining height):** live camera preview; **semi-transparent cattle silhouette overlay** for the current view (white 20% fill, dashed white stroke); amber corner brackets.
- **Tip card** (bottom of viewfinder, off-white 96% opacity, radius 18): "Example" thumbnail (64dp, tinted tile with outline of the correct pose) + "Tip" (sun icon) + "Keep the full animal in frame, avoid backlight".
- **Control bar** (3 columns): **Gallery** (image icon + label, start) · **CaptureButton** "Capture" (centre) · **Flash: Off/Auto/On** toggle (bolt icon + label, end).
- **Sequence & overlays:**
  | Step | Title | Overlay |
  |---|---|---|
  | 1/5 | Front View | Front silhouette: horns, ears, head, chest, 4 legs |
  | 2/5 | Back View | Rear silhouette: rump, tail, hind legs |
  | 3/5 | Left Side | Side silhouette facing left |
  | 4/5 | Right Side | Side silhouette facing right (mirrored) |
- **Behaviour:** after capture show quick on-device quality check (blur, darkness, animal-in-frame). Pass → auto-advance to next step. Fail → inline retake prompt.

### 4.9 Teeth Photo Capture (`CaptureTeeth`) — Step 5 of 5
- **Top bar:** BackButton · "Step 5 of 5" / "**Teeth (for age)**" · ProgressStepper (4 done in green, 5th amber).
- **Guide card** (off-white, radius 20): example illustration of lower lip pulled down showing the 8 lower incisors (central pair larger = permanent teeth), caption "Good example"; tips list with icons:
  - ✋ Lift the lip gently
  - 👁 Show front teeth clearly
  - ⚡ Use flash if dark
  *(use line icons, not emoji)*
- **Viewfinder:** mouth-shaped dashed overlay (wide oval lips + tooth outlines + gum line) inside amber corner brackets; floating hint "Fit the mouth inside the outline".
- **Control bar:** Gallery · Capture · **Flash: On** (default on for this step, amber active state).
- **Action:** Capture → Review Photos.

### 4.10 Review Photos (`Review`)
- **Header:** BackButton · H1 "Review photos" · sub "Tap a photo to retake it".
- **Grid:** 2 columns; Front, Back, Left, Right as tiles (photo 112dp + footer row 48dp); **Teeth** spans 2 columns (horizontal tile).
- **Tile states:**
  - **Good:** 2dp `borderSoft`; footer = view name + green check + "Good".
  - **Warning (e.g. Left):** 3dp `#C2410C` border, warm bg, photo blurred, white overlay label with triangle "**Image is blurry – retake**", footer "Retake" solid orange pill with refresh icon.
- **Banner** (warning InfoBanner): "Retake 1 photo for a more accurate report".
- **Action:** PrimaryButton (sparkle icon) "**Analyze Animal**" → Processing. Tapping any tile → that capture step in single-retake mode, returning here after capture. (Analyze stays enabled; quality warning lowers confidence.)

### 4.11 Processing (`Processing`)
- **Illustration:** smiling cattle line art in a `primaryTint` rounded panel with an amber scan line.
- **H1:** "Checking your animal…"; sub with clock icon: "This takes about 20 seconds".
- **Overall progress bar** 10dp (`primary` fill).
- **Checklist card** (ordered list, rows ≥ 60dp):
  | Step | State in mock | Row content |
  |---|---|---|
  | Species check | ✓ done | green check · "Cattle (cow)" · "Done" |
  | Breed identification | ✓ done | green check · "Sahiwal" · "Done" |
  | Age estimation | ⟳ in progress | spinning amber ring · "Reading the teeth…" · "Working" (row highlighted amber tint) |
  | Health check (FMD) | pending | dashed grey circle · "Mouth and hooves" · "Waiting" |
  | Generating report | pending | dashed grey circle · "For: Milk (Dairy)" · "Waiting" |
- **Bottom:** "Please keep the app open." · SecondaryButton "Cancel" (→ Review).
- **Behaviour:** rows update live from backend events; on completion → Result Report. Respect reduced-motion (no spinner rotation). If species ≠ cattle → Wrong image state. Network loss → No internet state.

### 4.12 Result Report (`Result`)
- **Scrollable content** + **sticky action bar** (116dp).
- **Header:** BackButton (→ Home) · H1 "Your report" · "23 Oct 2026 · For Milk (Dairy)".
- **Verdict card** (white, 3dp border in verdict colour): overline "VERDICT"; large VerdictBadge "**Recommended**"; ScoreRing **78/100**; summary 17/700 "Healthy Sahiwal cow, good fit for milk production".
- **Info chips** (2 × 2 cards, icon + label + value + evidence):
  - **Species:** Cattle — ConfidenceBar **98%**
  - **Breed:** Sahiwal — ConfidenceBar **82%**
  - **Age:** ~3 years — "2 permanent teeth"
  - **Health:** No FMD signs — green check "Mouth & hooves clear"
- **Photo card:** front photo; Switch "**Show AI focus areas**" toggles a heatmap overlay (red→amber→transparent blobs) with legend "Red = where AI looked most".
- **Accordions:**
  1. **Why this verdict** (open by default) — breed is a dairy breed; young age; no FMD signs; good body condition.
  2. **Risks to consider** — milk yield not visible in photos, watch one milking; ask vaccination record (FMD, HS); check udder and teats by hand.
  3. **Fit for your purpose (Milk)** — "**Strong fit.** …"
- **Disclaimer:** info icon + "AI-based advice, not a replacement for a vet".
- **Sticky bar (3 columns):** [Download PDF (icon over label, 76dp)] · [**Share on WhatsApp** — prominent, wide, green `#1E7A3E`, white text + chat icon] · [Ask a Question (icon over label, 76dp)].
- **Verdict variants:** Caution → amber border/badge/ring; Not Recommended → red border/badge/ring. Copy changes accordingly.

### 4.13 Ask a Question (`Ask`)
- **Header (white):** BackButton (→ Result) · H1 "Ask about this animal" · **linked report card**: thumbnail + "Sahiwal · For Milk" + mini badge "Recommended · 78/100" + "View report" (→ Result).
- **Messages (scroll):**
  - User bubble (end-aligned, `primary` bg, white): "How much milk will it give?"
  - AI bubble (start-aligned, white, border, AI sparkle avatar, name "MaweshiAI"): short, plain-language answer that references the report context, ends with practical advice; "Listen" button (speaker icon) for text-to-speech.
- **Composer (white, top border):**
  - "Suggested questions" chips (wrap): "What should I feed it?", "How much milk will it give?", "Is the price fair?" — tap sends immediately.
  - Text input "Type your question…" + amber **Speak** button (mic icon + label) for voice input; a Send button replaces Speak when text is present.
- **Behaviour:** LLM receives the report JSON + purpose + budget/asking price as context. Answers in the selected language.

### 4.14 History (`History`)
- **Header:** H1 "History" · button "Select" (checkbox icon) / "Cancel" (× icon) in select mode.
- **SearchField:** "Search breed or date".
- **Filter chips (horizontal scroll):** **All** (active) · Recommended · Caution · Not Recommended (each with verdict icon).
- **Select mode line:** "2 selected · pick 2 to compare".
- **List:** ReportListItems (thumbnail, breed, "Purpose · Date", VerdictBadge). Example data:
  1. Sahiwal · Milk · 23 Oct 2026 · Recommended *(selected)*
  2. Red Sindhi · Milk · 22 Oct 2026 · Caution *(selected)*
  3. Sahiwal · Dairy · 21 Oct 2026 · Recommended
  4. Red Sindhi · Qurbani · 18 Oct 2026 · Caution
  5. Cholistani · Breeding · 12 Oct 2026 · Not Recommended
- **Select mode:** checkbox at item start; selected = 3dp `primary` border + tinted bg + filled checkbox. Sticky bar above BottomNav with PrimaryButton "**Compare (2)**" (two-column icon) — enabled only when exactly 2 are selected; otherwise greyed.
- **Normal mode:** tap item → Result Report; long-press → enter select mode.
- **BottomNav:** History active.
- **Empty:** see 5.3.

### 4.15 Compare (`Compare`)
- **Header:** BackButton (→ History) · H1 "Compare" · "Buying for Milk (Dairy)".
- **Two columns** (Animal **A** / **B**, letter tags on photos): photo · VerdictBadge · score (30/800 + "/100"). The better animal's card gets a 3dp green border.
- **Comparison table** (white card, rows with overline labels, values in 2 columns):
  | Row | Animal A | Animal B |
  |---|---|---|
  | BREED | Sahiwal | Red Sindhi |
  | AGE | ~3 years | ~5 years |
  | HEALTH | ✓ No FMD signs | ⚠ Hoof mark – check |
  | FIT FOR MILK | **Strong** (3/3 bars green) | **Fair** (2/3 bars amber) |
- **Recommendation card** (bg `primary`, white text, amber trophy tile): "**Better choice for Milk: Animal A**" + reason "Younger, no health concerns, and Sahiwal is the stronger dairy match."
- **Action:** PrimaryButton "Open Animal A report" → Result.

---

## 5. Empty & error states (390 × 640 content frames, shown full-screen)

Common layout: big illustration tile (150dp, radius 44) → H1 (26/800, centred) → body (17, centred) → optional info row → spacer → primary + secondary actions.

### 5.1 No internet (`StateOffline`)
- Icon: Wi-Fi arcs with red diagonal strike, on `surfaceMuted` tile.
- H1 "No internet connection"; body "Your photos are saved on the phone. We will check the animal when you are back online."
- Info row: green check "5 photos saved".
- Actions: PrimaryButton "Try again" (refresh icon); SecondaryButton "Check later" (clock icon → Home; queue job for auto-retry).

### 5.2 Wrong image — not cattle (`StateWrongImage`)
- Icon: dashed cattle-head outline on red-tint tile with red × badge.
- H1 "This doesn't look like a cow or bull"; body "MaweshiAI checks cattle only. Please take a clear photo of the animal you want to buy."
- Info row: sun icon "Stand back so the full animal is in frame".
- Actions: PrimaryButton "Retake photo" (camera → failing capture step); SecondaryButton "See photo tips" (→ Onboarding step 1 / tips sheet).

### 5.3 Empty history (`StateEmptyHistory`)
- Header "History"; centred cattle illustration with a blank report card.
- H2 "No reports yet"; body "Check your first animal at the mandi. Your reports will be saved here."
- Action: PrimaryButton "Check a New Animal" (camera icon → Buying Purpose). BottomNav still visible in-app.

---

## 6. PDF Report (A4, 794 × 1123 px @ 96dpi, margins 48–56)

Generated from Result Report; used by Download PDF and WhatsApp share.

1. **Header** (bottom rule 4px `primary`): logo tile + "Maweshi**AI**" + "Animal Buying Advisory Report" · details list: **Report ID** (e.g. `MW-261023-0418`), **Date**, **Purpose**, **Prepared for** · **QR code** (84px, links to online report) + "Scan to view".
2. **Top row:** front photo (300 × 220, caption "Front view · taken <date>") | **Verdict box** (3px verdict-colour border, tint bg): overline "VERDICT", large badge, score **78/100**, one-line summary, 2-line explanation.
3. **Summary table** (header row tinted, 1px rules): Check | Result | AI confidence
   - Species — Cattle (cow) — 98%
   - Breed — Sahiwal — 82%
   - Age — About 3 years (2 permanent teeth) — —
   - Health — ✓ No FMD signs on mouth, feet or hooves — —
   - Purpose fit — Milk (Dairy): Strong fit — —
4. **Two boxes:** ✓ Reasons for this verdict (green) | ⚠ Risks to consider (amber) — same bullets as the app.
5. **Footer:** disclaimer "This is AI-based advice, not a replacement for a vet. Results depend on photo quality. Please have the animal checked by a qualified veterinarian before purchase." · "Generated by MaweshiAI · Report <ID>" · "Page 1 of 1".
- Print rules: body ≥ 13px, near-black text on white, must read in grayscale (verdict also via icon + word).

---

## 7. Data the UI expects (suggested shape)

```ts
type Verdict = 'recommended' | 'caution' | 'not_recommended';
type Purpose = 'milk' | 'breeding' | 'qurbani' | 'meat' | 'farm_work' | 'other';
type PhotoView = 'front' | 'back' | 'left' | 'right' | 'teeth';

interface CheckRequest {
  purpose: Purpose;
  budgetPkr?: number;
  askingPricePkr?: number;
  experience: 'first_time' | 'experienced';
  photos: Record<PhotoView, { uri: string; quality: 'good' | 'blurry' | 'dark' | 'no_animal' }>;
}

interface Report {
  id: string;                    // e.g. MW-261023-0418
  createdAt: string;             // ISO date
  purpose: Purpose;
  species: { label: string; confidence: number };      // "Cattle", 0.98
  breed:   { label: string; confidence: number };      // "Sahiwal", 0.82
  age:     { years: number; permanentTeeth: number };  // ~3, 2
  health:  { fmdDetected: boolean; notes: string[] };
  verdict: Verdict;
  score: number;                 // 0–100
  summary: string;               // one line
  reasons: string[];
  risks: string[];
  purposeFit: { level: 'strong' | 'fair' | 'weak'; text: string };
  heatmapUri?: string;           // AI focus overlay for front photo
  thumbnailUri: string;
}

type ProcessingStep = 'species' | 'breed' | 'age' | 'health' | 'report';
type StepState = 'done' | 'working' | 'waiting' | 'failed';
```

---

## 8. Localisation & RTL checklist
- All strings in resource files (`en`, `ur`). Urdu uses Noto Nastaliq Urdu with taller line-height; allow ~30% text expansion.
- Mirror layouts with `layoutDirection` (back arrows, chevrons, progress direction, check badges move to start/end correctly).
- Do **not** mirror: phone/OTP inputs, numbers, scores, PKR amounts, camera controls order may stay (Gallery · Capture · Flash).
- Greeting: "Assalam-o-Alaikum" / "السلام علیکم".

## 9. Accessibility checklist
- Real buttons/links with accessible names; icon-only back/close carry `contentDescription`.
- Radio semantics for purpose cards, language cards, experience toggle; switch semantics for heatmap; `expanded` state on accordions; progressbar semantics on steppers.
- Never rely on colour alone (verdicts, photo quality, processing states all have icon + text).
- Support system font scaling up to 130% without clipping (cards grow in height).
- Optional voice: "Speak" input in chat, "Listen" (TTS) on AI answers and on the report summary.

## 10. Screen inventory (build order)

| # | Screen | Route id |
|---|---|---|
| 1 | Splash | `splash` |
| 2 | Language Selection | `language` |
| 3 | Onboarding (3 steps) | `onboarding` |
| 4 | Login | `login` |
| 5 | OTP Verification | `otp` |
| 6 | Home | `home` |
| 7 | Buying Purpose | `check/purpose` |
| 8 | Body Photo Capture (×4) | `check/capture/:view` |
| 9 | Teeth Photo Capture | `check/capture/teeth` |
| 10 | Review Photos | `check/review` |
| 11 | Processing | `check/processing` |
| 12 | Result Report | `report/:id` |
| 13 | Ask a Question | `report/:id/ask` |
| 14 | History (+ select mode) | `history` |
| 15 | Compare | `compare/:idA/:idB` |
| — | Profile (not yet designed) | `profile` |
| — | PDF Report (A4) | generated file |
| — | No internet / Wrong image / Empty history | state components |
