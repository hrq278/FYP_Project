# Fixes needed from the team

Things only you can do (accounts, keys, devices, data). Claude keeps this list current: solved items are removed, new ones are added.

Last checked: 2026-10-23

---

## 1. Cloudinary cloud name is wrong (photos are not being saved)

`CLOUDINARY_CLOUD_NAME` in `backend/.env` is now `fypproject`; Cloudinary still answers **"Invalid cloud_name fypproject"**. Evaluations still finish, but their photos aren't stored, so the Result screen and PDF show "Photo not stored" and History has no thumbnails.

1. Log in at https://console.cloudinary.com
2. On the **Dashboard** (or Settings → **API Keys**), copy the value labelled **Cloud name**. It's a short code such as `dxk2abc9q`, not the product environment's display name.
3. Put it in `backend/.env`: `CLOUDINARY_CLOUD_NAME=<that code>` and save (Ctrl+S).
4. Check `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` come from the same page.

## 2. LLM API key (AI report, breed check, chat, compare)

Without it, reports use the rule-based template and chat is unavailable.

1. Create a key at https://console.anthropic.com (Settings → API Keys) and add a little credit (US$5 is plenty).
2. Add to `backend/.env`: `LLM_API_KEY=<key>` and save.
3. Run `cd backend` then `node scripts/llm_smoke.js path/to/side-photo.jpg` and send Claude the output so the answers and the Urdu can be checked.

## 3. Mobile app points to an old IP

`mobile/.env` has `http://192.168.100.129:3000`; this PC is currently `10.148.30.56`.

1. Run `ipconfig` and note the IPv4 address of the Wi-Fi adapter.
2. Set `EXPO_PUBLIC_API_BASE_URL=http://<that IP>:3000` in `mobile/.env`.
3. Restart Expo. Repeat whenever you change network.

## 4. MongoDB Atlas on networks that block DNS TXT lookups

On the university network the backend fails with `queryTxt ETIMEOUT` because `mongodb+srv://` needs a DNS TXT lookup. Either use another network, or replace `MONGO_URI` in `backend/.env` with the standard form (same user and password):

```
mongodb://<user>:<password>@ac-o3ywzcp-shard-00-00.tavy5nf.mongodb.net:27017,ac-o3ywzcp-shard-00-01.tavy5nf.mongodb.net:27017,ac-o3ywzcp-shard-00-02.tavy5nf.mongodb.net:27017/?tls=true&authSource=admin&replicaSet=atlas-9bowx9-shard-0&retryWrites=true&w=majority&appName=fypCluster
```

Also make sure your current IP is allowed under Atlas → **Network Access**.

## 5. Test on a real Android phone (Expo Go)

Everything so far was checked in a browser at phone size. On a phone, check:
- fonts (English and Urdu) and switching language (the app restarts once into right-to-left);
- the live camera, flash, the camera-permission prompt and Gallery;
- keyboard covering inputs on Login, Register and Purpose.

- the report screen's **Download PDF** (opens the share sheet with the PDF), **Share on WhatsApp**, and **Listen** on chat answers (uses the phone's text-to-speech; Urdu needs an Urdu voice installed in Android settings).

Steps: fix item 3, start ML service + backend + `cd mobile && npx expo start`, scan the QR code with Expo Go. Tell Claude anything that looks wrong (a screenshot helps).

## 6. The QR code / WhatsApp link only works on your Wi-Fi for now

The link in the PDF's QR code and in WhatsApp messages points to the backend's address (`EXPO_PUBLIC_API_BASE_URL`), which is your PC on the local network. Other people's phones can only open it once the backend is deployed online (Module 10). Nothing to do now; just don't be surprised when it doesn't open outside your network.

## 7. Datasets and training notebooks (needed for Module 9 and the thesis)

- `F:\FYP\Dataset` is no longer on the drive. If you still have it (breed, FMD, dentition, species folders), put it back or tell Claude where it is; it is needed to re-measure accuracy on your own data.
- Training notebooks / descriptions still missing for the **species** model and the **health (FMD)** model. Breed and age projects are in `F:\FYP\Models`.

## 8. Re-check some breed facts before submitting the thesis

A few numbers in `backend/data/breeds.json` came from search-result excerpts because some sites (Oklahoma State, TNAU, NDDB) blocked access from this network. Open the links in `docs/breeds_sources.md` (sources 1, 5, 6 and 23) and confirm the figures.

## 9. Clean up test data in Atlas (when you're done testing)

Test accounts created while building:
- `claude-smoketest-1792732144@example.com` (2 evaluations)
- `claude-m2-1792756718@example.com` (several evaluations, including Module 5-6 test runs)

Delete them in Atlas → Browse Collections (`users` and `evaluations`), or ask Claude to do it.

## 10. Optional: free 1.8 GB on drive F

`ml-service/.venv.broken-hrq27` is the unusable Python environment copied from the other PC. It can be deleted.
