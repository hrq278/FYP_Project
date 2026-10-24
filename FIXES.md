# Fixes needed from the team

Things only you can do (accounts, keys, devices, data). Claude keeps this list current: solved items are removed, new ones are added.

Last checked: 2026-10-24 (Module 10, demo setup). Solved since last time: Cloudinary (photos are stored now), the old phone IP (the start file finds the address itself), MongoDB on networks that block DNS (the backend now handles it by itself).

---

## 1. LLM API key (AI report, breed check, chat, compare)

Without it, reports use the rule-based template and chat is unavailable. Everything else works.

1. Create a key at https://console.anthropic.com (Settings → API Keys) and add a little credit (US$5 is plenty).
2. Add to `backend/.env`: `LLM_API_KEY=<key>` and save.
3. Run `cd backend` then `node scripts/llm_smoke.js path/to/side-photo.jpg` and send Claude the output so the answers and the Urdu can be checked.
4. Then ask Claude to re-measure the time per check with the AI report (`ml-service/eval/end_to_end.py`), refresh the demo account (`node scripts/seed_demo.js --force`) and retake the screenshots, so the thesis numbers include the LLM.

## 2. Test on a real Android phone (Expo Go)

Everything so far was checked in a browser at phone size. Start the app with `START_MaweshiAI.bat` and connect the phone as described in `DEMO.md` ("Show it on a phone"). On the phone, check:
- fonts (English and Urdu) and switching language (the app restarts once into right-to-left);
- the live camera, flash, the camera-permission prompt and Gallery;
- keyboard covering inputs on Login, Register and Purpose;
- History: pull down to refresh, long-press a report to start selecting, and scrolling to load more;
- **airplane mode**: take the 5 photos, turn on airplane mode, tap Analyze → "No internet connection" screen → Check later; turn airplane mode off and the check should send itself within a few seconds and appear in History. Also close the app while offline and reopen it online: the saved check should still send;
- **vibration** on the shutter, on a photo that needs a retake, and when a finished report opens;
- **large text**: Android Settings → Display → Font size to the largest, then look at Home, Purpose, the report and History;
- the report screen's **Download PDF** (opens the share sheet with the PDF), **Share on WhatsApp**, and **Listen** on chat answers (uses the phone's text-to-speech; Urdu needs an Urdu voice installed in Android settings).

The app icon and splash screen only show in an installed build (APK), not inside Expo Go; that needs an EAS build, skipped while the project isn't deployed. Tell Claude anything that looks wrong (a screenshot helps).

## 3. The QR code / WhatsApp link only opens near the laptop

The project runs on this PC only (no deployment). The link in the PDF's QR code and in WhatsApp messages points to the laptop's address on the local network, so it opens only on phones connected to the same Wi-Fi / hotspot while the app is running. Nothing to do; mention it in the thesis as a limitation of the demo setup.

## 4. Species model notebook (for the thesis)

Still missing: the **species** model's training notebook and dataset description (`model/SpecieDetector.keras`). Put it in `ml-service/notebooks/` or tell Claude where it is. If nobody has it, say so in the thesis: the app no longer uses that model's vote (the cattle gate decides cow vs buffalo, see `ml-service/notebooks/README.md`). The health model is third-party (Hugging Face), so no notebook is expected for it.

## 5. Re-check some breed facts before submitting the thesis

A few numbers in `backend/data/breeds.json` came from search-result excerpts because some sites (Oklahoma State, TNAU, NDDB) blocked access from this network. Open the links in `docs/breeds_sources.md` (sources 1, 5, 6 and 23) and confirm the figures.

## 6. Clean up test data in Atlas (when you're done testing)

Test accounts created while building:
- `claude-smoketest-1792732144@example.com` (2 evaluations)
- `claude-m2-1792756718@example.com` (several evaluations, including Module 5-9 test runs)

Delete them in Atlas → Browse Collections (`users` and `evaluations`), or ask Claude to do it. **Keep `demo@maweshiai.app`**: it is the account for presentations (`DEMO.md`).

## 7. Optional: free 1.8 GB on drive F

`ml-service/.venv.broken-hrq27` is the unusable Python environment copied from the other PC. It can be deleted.

## 8. Field test at a real mandi (for the thesis results chapter)

All accuracy numbers so far come from internet photos. Take the laptop and a phone to a livestock market and check at least 30 animals with their owners' information, following `docs/field_test.md` and filling in `docs/field_test.csv`. Without deployment: give the laptop internet through the phone's hotspot, start `START_MaweshiAI.bat`, and use the app on that phone (or a second phone on the same hotspot). Best done after items 1 and 2. Send Claude the filled CSV to turn into tables for the thesis.
