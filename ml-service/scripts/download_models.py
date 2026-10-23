"""Download model files that are too large for GitHub (> 100 MB), pinned to an exact revision.

Usage: python scripts/download_models.py
Reads the `download` blocks in models.yaml. Skips files that already exist with the expected size.
"""
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from maweshi_ml.registry import BASE_DIR, load_config  # noqa: E402


def download(url: str, dest: str) -> None:
    tmp = dest + ".part"
    with urllib.request.urlopen(url, timeout=60) as resp, open(tmp, "wb") as out:
        total = int(resp.headers.get("Content-Length", 0))
        done = 0
        while chunk := resp.read(1 << 20):
            out.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done / total:6.1%} of {total / 1e6:.0f} MB", end="", flush=True)
    print()
    os.replace(tmp, dest)


def main() -> None:
    cfg = load_config()
    for name, model in cfg.items():
        spec = model.get("download") if isinstance(model, dict) else None
        if not spec:
            continue
        dest = os.path.join(BASE_DIR, model["path"])
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            print(f"{name}: {model['path']} already present")
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        url = f"https://huggingface.co/{spec['repo']}/resolve/{spec['revision']}/{spec['file']}"
        print(f"{name}: downloading {spec['file']} from {spec['repo']}@{spec['revision'][:7]}")
        download(url, dest)


if __name__ == "__main__":
    main()
