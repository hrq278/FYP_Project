# Running a MaweshiAI demo

Everything runs on this PC. The app talks to three cloud services, so **the PC needs internet**: MongoDB Atlas (accounts and reports), Cloudinary (photos), and Anthropic (AI-written reports, only if a key is set).

## Start

1. Double-click **`START_MaweshiAI.bat`** in this folder.
2. Wait about 1–2 minutes until the window says **READY**. Three windows open on their own; leave them open:
   - *MaweshiAI - 1 ML service*: the AI models
   - *MaweshiAI - 2 Backend*: accounts, reports, database
   - *MaweshiAI - 3 App*: the app, with a QR code for phones
3. Chrome opens the app at http://localhost:8081.

**To stop:** close the three MaweshiAI windows. **To restart** (e.g. something got stuck): just double-click the start file again; it closes the old windows first.

**Demo account:** `demo@maweshiai.app` / `maweshi123`. It already has 7 reports (good milk animals, a buffalo, two old cows marked "be careful", and a Qurbani animal that is too young). Or tap *Continue as Guest* to start empty.

## Show it on a laptop screen

In Chrome press **F12**, then **Ctrl + Shift + M** and pick a phone (e.g. "iPhone 12 Pro") so the app looks like a phone. Press F12 again to hide the tools. Zoom the page (Ctrl +) if the room is large.

Photos: on a laptop, use **Gallery** on each camera screen to pick photos from the PC. Keep a folder ready with 4 side photos and 1 teeth photo of the same animal.

## Show it on a phone: installed app (APK), recommended

1. Install the MaweshiAI APK on the phone (open the download link from the build on the phone, allow "install unknown apps" once). It shows the real app icon and works like any app.
2. Connect the phone and the laptop to the **same network**. Easiest: turn on the **phone's hotspot** and connect the laptop to it (the laptop then also gets internet from the phone).
3. Double-click **START_MaweshiAI.bat**. When it says READY it shows a yellow address, e.g. `192.168.43.12:3000`.
4. Open MaweshiAI on the phone. If the login screen can't reach the server, tap **Change** at the bottom of the login screen (or Profile → *Server address*), type the yellow address, tap **Save**. It says "Connected to MaweshiAI". The phone remembers it until the network changes.
5. The first time, Windows asks whether Node.js may use the network: tick **both Private and Public** and click **Allow**.

**Make a new APK** (after changing the app): open a terminal in the `mobile` folder and run `npx eas-cli build -p android --profile preview`. It builds in Expo's cloud (free plan, about 15–30 minutes) and prints a download link / QR code. Log in first with `npx eas-cli login` if asked.

## Show it on a phone: Expo Go (development)

Useful while changing the app (changes appear on the phone straight away).

1. Install **Expo Go** from the Play Store (it must support Expo SDK 54).
2. Same network as the laptop (see above), start the file, then in Expo Go tap **Scan QR code** and scan the code in the *MaweshiAI - 3 App* window.

## Suggested 5-minute demo

1. Language screen → choose **English** (later switch to **اردو** in Profile to show the Urdu, right-to-left version).
2. Log in with the demo account. **History**: search "sahiwal", filter by verdict.
3. Open the **Sahiwal** report: verdict, score, the four results, "Why this verdict", **Download PDF** (QR code inside), **Ask a question**.
4. **Compare**: in History tap *Select*, pick the two milk Holsteins or the Sahiwal and a Holstein, tap *Compare (2)*.
5. **New check**: Home → *Check a New Animal* → purpose *Milk*, budget and price → 4 body photos + teeth (show the blurry-photo warning if you have one) → *Analyze* → watch the 5 live steps (about 5 seconds) → report.
6. **Safety**: upload a photo of a goat or a dog as the front photo → "This doesn't look like a cow or buffalo".
7. **Offline**: turn off Wi-Fi before *Analyze* → "No internet connection, photos saved" → turn it on → the check is sent by itself (History).

Numbers to quote (from `docs/results/README.md`): cattle vs other animals 94 %, cow vs buffalo 89.5 %, breed 70.6 % on the 15 breeds (93 % in the top 3), age within ±1 year 77 %, FMD / lumpy skin 95.6 % on public photos, about 4.5 seconds per check on this laptop.

## If something goes wrong

| What you see | What to do |
|---|---|
| The start window says **PROBLEM** | Read the line under it; it says what is missing. |
| "ML service did not start" | Look at window 1. Usually the PC is low on memory: close Chrome tabs and start again. |
| "MongoDB connection failed" in window 2 | No internet, or this PC's IP isn't allowed in MongoDB Atlas → *Network Access* (add the current IP or 0.0.0.0/0 for demos). |
| Phone: "Can't reach the server" / Expo Go can't load | In the app, check *Server address* matches the yellow address in the start window. Otherwise the phone and laptop are on different networks, or Windows Firewall blocked Node.js. Use the phone hotspot (see above) and allow Node.js in Windows Security → Firewall → *Allow an app*. |
| Expo Go says the project is for a different SDK | Update Expo Go from the Play Store. |
| A check says "checking service is busy" | Window 1 (ML service) was closed or crashed: start again. |
| Reports say "Generated from the check results" instead of AI text | Normal without an LLM key (FIXES.md item 1); everything else works. |
| Demo account lost its reports | In a terminal: `cd backend` then `node scripts/seed_demo.js --force` (while the app is running). |

More detail: [README.md](README.md) (setup), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (how it works).
