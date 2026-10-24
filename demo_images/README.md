# Demo and test photos

Photos for trying MaweshiAI without going to a mandi: **10 animals** (7 cows, 3 buffaloes, different breeds), each with the 5 photos the app asks for, and **5 other animals** the app should turn away.

```text
demo_images/
  animals/01_Sahiwal_cow/   front.jpg  back.jpg  left.jpg  right.jpg  teeth.jpg
  animals/02_Gir_cow/ ... animals/10_Murrah_buffalo/
  not_cattle/   1_goat.jpg  2_sheep.jpg  3_camel.jpg  4_horse.jpg  5_dog.jpg
```

## How to use them

- **On the laptop (Chrome):** on each camera screen tap **Gallery** and pick the matching file (front → back → left → right → teeth).
- **On a phone (APK or Expo Go):** copy the folder to the phone (USB cable, Google Drive or WhatsApp to yourself), then use **Gallery** the same way.
- **To show the cattle filter:** start a new check and pick any photo from `not_cattle/` as the *front* photo → "This doesn't look like a cow or buffalo".

## What the app says (tested 2026-10-24, no LLM key)

| Folder | Purpose used | Species | Breed | Age (teeth: true age) | Health | Verdict |
|---|---|---|---|---|---|---|
| `01_Sahiwal_cow` | Milk | Cow | Sahiwal | 4 y (4 y) | Healthy | Recommended 98 |
| `02_Gir_cow` | Milk | Cow | Gir | 3 y (3 y) | Healthy | Recommended 99 |
| `03_Tharparkar_cow` | Milk | Cow | Tharparkar | 5 y (5 y) | Healthy | Recommended 83 |
| `04_Red_Sindhi_cow` | Breeding | Cow | Red Sindhi | 2 y (2 y) | Healthy | Recommended 98 |
| `05_Kankrej_bull` | Farm work | Cow | Kankrej | 6 y (6 y) | Healthy | Recommended 99 |
| `06_Holstein_Friesian_cow` | Milk | Cow | Holstein Friesian | 3 y (3 y) | Healthy | Recommended 98 |
| `07_Rathi_cow` | Milk | Cow | Rathi | 4 y (4 y) | Healthy | Recommended 100 |
| `08_Nili-Ravi_buffalo` | Milk | Buffalo | Nili-Ravi | 5 y (5 y) | Healthy | Recommended 98 |
| `09_Jaffarabadi_buffalo` | Milk | Buffalo | Jaffarabadi | 7 y (7 y) | Healthy | Recommended 88 |
| `10_Murrah_buffalo` | Qurbani | Buffalo | Nili-Ravi | 8 y (8 y) | Healthy | Recommended 98 |

| Photo | App result |
|---|---|
| `not_cattle/1_goat.jpg` | Turned away: not a cow or buffalo |
| `not_cattle/2_sheep.jpg` | Turned away: not a cow or buffalo |
| `not_cattle/3_camel.jpg` | Turned away: not a cow or buffalo |
| `not_cattle/4_horse.jpg` | Turned away: not a cow or buffalo |
| `not_cattle/5_dog.jpg` | Turned away: not a cow or buffalo |

Other results to show:
- **Caution:** `06_Holstein_Friesian_cow` with purpose **Farm work** → Caution 68 (a dairy breed is a weak fit for work).
- **Not recommended:** the demo account (`demo@maweshiai.app`) has a Gir that is too young for Qurbani. Disease is also always "not recommended".
- **Unknown breed:** `10_Murrah_buffalo`: Murrah is not one of the model's 15 breeds, so the model says Nili-Ravi (its closest buffalo). With the LLM key set, the AI breed check from the side photo is meant to catch this.
- **Price:** enter a budget and a higher seller's price on the Purpose screen → the report adds a price risk.

## Important to know

- **The 5 photos of an animal are not one physical animal.** No public dataset has front, back, both sides and teeth of the same animal. Each set is 4 different photos of the same breed, picked to look like each view, plus a teeth photo of a known age from a separate dataset. The app treats every photo on its own, so this works for demos and testing; for real results, photograph one animal at a mandi (`docs/field_test.md`).
- The buffalo sets (`08_Nili-Ravi`, `10_Murrah`) contain flipped or rotated copies of the same photo for some views: only 3–4 distinct buffalo photos of each breed passed the checks. The cow sets use different photos for every view.
- Body photos are from the breed project's held-out test / validation split, so the breed model never saw them in training. Each was checked to pass the photo-quality and cattle checks. Some Holstein photos are black-and-white because the dataset is like that.
- **Known false alarm found while building this:** Rathi cows with densely spotted coats were called *lumpy skin* in 6 of 7 photos (scores 0.6–0.8). The photos here use plainer Rathi coats; mention this limitation in the thesis.
- Two other animals got through the cattle filter during selection (a close-up goat portrait and a donkey); the photos in `not_cattle/` are ones it does stop.

## Sources and licences (local use only: this folder is not uploaded to GitHub)

- Body photos: *Indian Cattle & Buffalo Breeds (15-Class)* dataset, Kaggle `vedant0dusane/cattle-breed-classification-dataset`, CC BY 4.0. Murrah: Hugging Face `SynthAIzer/indian-cattle-buffalo-breeds` (test split).
- Teeth photos: Cattle Dentition Dataset (Patil et al., 2025), holdout split of the team's age project. **Not redistributable**: don't share these outside the team.
- Not-cattle photos: Wikimedia Commons (goat, sheep, camel, dog: files `Domestic_goat.jpg`, `Sheep.jpg`, `Camel.jpg`, `Labrador_Retriever_portrait.jpg`; horse: see `ml-service/tests/fixtures/SOURCES.md`).

Exact source file of every photo: [SOURCES.csv](SOURCES.csv).
