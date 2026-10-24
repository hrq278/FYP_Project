"""Time whole evaluations through the backend, the way the app sends them: Analyze -> report ready.

Usage (backend on :3000 and ML service on :8000 running):
  python eval/end_to_end.py --cattle <dir of side photos> --teeth <dir of teeth photos> [--runs 10] [--api http://localhost:3000]

Photos are shrunk like the app does (longest side 1280 px, JPEG quality 80). A throwaway account is created
and deleted at the end. Writes docs/results/end_to_end.json (read by `evaluate.py summary`).
"""
import argparse
import io
import json
import os
import random
import statistics
import sys
import time

import httpx
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), "docs", "results", "end_to_end.json")
EXT = (".jpg", ".jpeg", ".png")


def phone_jpeg(path):
    img = Image.open(path).convert("RGB")
    img.thumbnail((1280, 1280))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def files_in(d):
    return [os.path.join(r, f) for r, _, fs in os.walk(d) for f in fs if f.lower().endswith(EXT)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cattle", required=True)
    ap.add_argument("--teeth", required=True)
    ap.add_argument("--runs", type=int, default=10)
    ap.add_argument("--api", default="http://localhost:3000")
    args = ap.parse_args()
    random.seed(1)
    body, teeth = random.sample(files_in(args.cattle), args.runs), random.sample(files_in(args.teeth), args.runs)

    c = httpx.Client(base_url=args.api, timeout=120)
    email = f"timing-{int(time.time())}@example.com"
    token = c.post("/api/auth/register", json={"name": "Timing run", "email": email, "password": "timing-run-1"}).json()["token"]
    auth = {"Authorization": f"Bearer {token}"}
    runs = []
    try:
        for i in range(args.runs):
            side = phone_jpeg(body[i])
            files = [(v, (f"{v}.jpg", side, "image/jpeg")) for v in ("front", "back", "left", "right")]
            files.append(("teeth", ("teeth.jpg", phone_jpeg(teeth[i]), "image/jpeg")))
            size_kb = sum(len(f[1][1]) for f in files) / 1024
            t0 = time.perf_counter()
            r = c.post("/api/evaluations", headers=auth, files=files, data={"purpose": "milk", "language": "en"})
            t_upload = time.perf_counter() - t0
            if r.status_code != 202:
                print("POST failed", r.status_code, r.text[:200])
                continue
            eid = r.json()["id"]
            while True:
                e = c.get(f"/api/evaluations/{eid}", headers=auth).json()["evaluation"]
                if e["status"] != "processing":
                    break
                time.sleep(0.2)
            total = time.perf_counter() - t0
            runs.append({"status": e["status"], "upload_s": round(t_upload, 2), "total_s": round(total, 2),
                         "upload_kb": round(size_kb), "report_source": (e.get("report") or {}).get("source")})
            print(i + 1, runs[-1], flush=True)
    finally:
        c.delete("/api/auth/account", headers=auth)

    done = [r for r in runs if r["status"] == "done"]
    tot = [r["total_s"] for r in done]
    up = [r["upload_s"] for r in done]
    source = sorted({r["report_source"] for r in done})
    result = {
        "runs": runs,
        "n_done": len(done),
        "total_s": {"mean": round(statistics.mean(tot), 1), "median": round(statistics.median(tot), 1), "max": round(max(tot), 1)} if tot else None,
        "upload_s": {"mean": round(statistics.mean(up), 2), "max": round(max(up), 2)} if up else None,
        "upload_kb_mean": round(statistics.mean(r["upload_kb"] for r in runs)) if runs else None,
        "report_source": source,
        "setup": "backend + ML service on one laptop CPU (no GPU), local network; photos shrunk like the app (1280 px, JPEG 80)",
    }
    if tot:
        llm_note = ("Reports were written by the rule template (no LLM key yet); the LLM breed check and AI-written report "
                    "will add time once the key is set; not measured yet (run this script again then)." if source == ["template"] else "")
        result["summary_md"] = (
            f"{len(done)} full evaluations (5 photos, about {result['upload_kb_mean']} KB per check): **{result['total_s']['median']} s median** "
            f"from tapping Analyze to the report being ready (mean {result['total_s']['mean']} s, slowest {result['total_s']['max']} s); "
            f"the upload itself took {result['upload_s']['mean']} s on the local network. Backend and ML service on one laptop CPU "
            f"(no GPU). {llm_note} On mobile data the upload takes longer; at 1 Mbit/s, {result['upload_kb_mean']} KB is about "
            f"{result['upload_kb_mean'] * 8 / 1000:.1f} s.")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf8") as f:
        json.dump(result, f, indent=2)
    print(json.dumps({k: v for k, v in result.items() if k != "runs"}, indent=1))


if __name__ == "__main__":
    sys.exit(main())
