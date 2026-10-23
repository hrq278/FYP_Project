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
uvicorn main:app --host 0.0.0.0 --port 8000
```

- The species model is `model/SpecieDetector.keras` (override with `MODEL_PATH`; uvicorn does not read `.env` itself, so set it in the shell if you change it).
- `setuptools` is pinned below 81 on purpose: `tensorflow-hub` still imports `pkg_resources`.

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

## API (current)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password }` → `{ token }` |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token }` |
| GET | `/api/auth/profile` | Bearer | |
| PUT | `/api/auth/settings` | Bearer | `{ preferredLanguage, alertsEnabled }` |
| POST | `/api/auth/logout` | Bearer | |
| POST | `/api/evaluate` | Bearer | multipart `bodyImage` (JPEG/PNG/WebP, ≤ 8 MB) → `{ species, confidence, createdAt }`; 400 for bad images, 503 if the ML service is down |
| POST | `/predict` (ML service) | — | multipart `bodyImage` → `{ species, confidence }` |
