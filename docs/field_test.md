# Field test at a mandi

The lab numbers in [results/README.md](results/README.md) come from internet photos. This test checks MaweshiAI on real animals at a real livestock market, with the owner's information as the ground truth. Fill in one row per animal in [field_test.csv](field_test.csv) (open it in Excel or Google Sheets).

## Before you go

- [ ] App installed on 2 phones (one Android low/mid-range), signed in to a team test account, language set as the buyer prefers.
- [ ] Backend and ML service reachable from the market (deployed, or a laptop hotspot) — note which in the sheet.
- [ ] Printed consent line (below), pen, this sheet, a power bank.
- [ ] Aim for **at least 30 animals**: mix of cows and buffaloes, several breeds (Sahiwal, Cholistani, Nili-Ravi, crossbreds…), young and old, and any animal the owner says is sick.

**Consent (read to the owner):** "We are university students testing an app that estimates an animal's breed, age and health from photos. May we photograph your animal and ask its breed and age? We won't record your name, and the photos are only used for our project." Only continue if they agree.

## For each animal

1. Ask the owner: breed, age (or number of permanent teeth), any illness or treatment now, and the asking price. Look at the teeth yourself if they allow it and count the permanent incisors.
2. In the app: pick the purpose the owner sells it for, enter the price, take the 5 photos as the app guides you. Note anything that was hard (light, animal moving, crowd).
3. Write down what the app said (species, breed, age, health, verdict, score, time to report).
4. Show the report to the buyer or owner and ask the two feedback questions (1 = very poor, 5 = very good):
   - **Q1 Useful:** "Would this report help you decide whether to buy?"
   - **Q2 Easy:** "Was the app easy to use?"
5. Never present the result as a diagnosis. If the app flags FMD or lumpy skin, tell the owner it is only a photo check and a vet should look.

## Columns in field_test.csv

| Column | What to write |
|---|---|
| `animal_no` | 1, 2, 3 … |
| `date`, `market` | e.g. 2026-11-02, Sahiwal mandi |
| `species_true` | cow / buffalo (from the owner) |
| `breed_true` | owner's answer; "crossbred" or "unknown" if they don't know |
| `age_true_years` | owner's answer (or your teeth count: 0 permanent incisors ≈ under 2 y, 2 ≈ 2 y, 4 ≈ 3 y, 6 ≈ 4 y, 8 ≈ 5 y+) |
| `teeth_counted` | permanent incisors you counted, or blank |
| `health_true` | healthy / FMD / lumpy / other illness (owner or vet) |
| `purpose` | milk / breeding / qurbani / meat / farm_work / other |
| `price_pkr` | owner's asking price |
| `report_id` | from the app, e.g. MW-261102-0418 |
| `species_pred`, `breed_pred`, `breed_uncertain` | from the report (yes/no for "possibly …") |
| `age_pred_years`, `age_uncertain` | from the report |
| `health_pred` | healthy / FMD / lumpy / uncertain |
| `verdict`, `score` | from the report |
| `time_to_report_s` | stopwatch from tapping Analyze |
| `photo_retakes` | how many photos the app asked to retake |
| `network` | wifi / 4G / 3G / offline-queued |
| `q1_useful`, `q2_easy` | 1–5 |
| `notes` | anything unusual (bad light, animal moving, owner comments) |

## How to score it afterwards

- **Species accuracy**: `species_pred == species_true`.
- **Breed accuracy**: on animals whose true breed is one of the 15 model breeds, and separately how often the app said "possibly / not certain" for crossbreds and breeds it doesn't know (that is the right answer for them).
- **Age**: mean absolute error in years, and % within ±1 year; separately for reports not marked uncertain.
- **Health**: how many sick animals were flagged (FMD / lumpy / uncertain) and how many healthy animals were wrongly flagged. Expect few sick animals at a market: report the counts, not just percentages.
- **Verdict sense check**: for each "Recommended", would an experienced buyer in the team agree? Count disagreements and why.
- **Time and usability**: median `time_to_report_s`, average Q1 and Q2, most common notes.

Put the summary table in the thesis next to the lab results, and note the market, dates, phones and network.
