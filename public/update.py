#!/usr/bin/env python3
"""Pull the latest dashboard build from GitHub and install it in place.

Ships inside the dashboard bundle, so once the dashboard is installed this
script sits next to it (e.g. /config/www/dashboard/update.py) and Home
Assistant can run it on a schedule:

    shell_command:
      glasshome_update: python3 /config/www/dashboard/update.py

By default it replaces the folder it lives in. Safer still, keep a copy
outside the dashboard (so an update can never remove the updater) and pass
the target explicitly:

    shell_command:
      glasshome_update: python3 /config/glasshome_update.py /config/www/dashboard

Nothing is touched unless the download and extraction both succeed, and the
swap happens at the end — a failed update leaves the working dashboard alone.

Private repository? Put a GitHub token in /config/glasshome_token.txt (or set
GLASSHOME_GITHUB_TOKEN) and it will authenticate.
"""

from __future__ import annotations

import io
import json
import os
import shutil
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile

OWNER = os.environ.get("GLASSHOME_OWNER", "atlas4tl45")
REPO = os.environ.get("GLASSHOME_REPO", "Home-dashboard")
TAG = os.environ.get("GLASSHOME_TAG", "dashboard-latest")
ASSET = "dashboard.zip"
TIMEOUT = 60

def resolve_target() -> str:
    """Dashboard folder to replace: argument, env var, then this file's home."""
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
    from_env = os.environ.get("GLASSHOME_TARGET")
    if from_env:
        return os.path.abspath(from_env)
    return os.path.dirname(os.path.abspath(__file__))


TARGET = resolve_target()

TOKEN_FILE = "/config/glasshome_token.txt"


def log(message: str) -> None:
    print(f"[glasshome] {message}", flush=True)


def github_token() -> str | None:
    token = os.environ.get("GLASSHOME_GITHUB_TOKEN")
    if token:
        return token.strip()
    try:
        with open(TOKEN_FILE, encoding="utf-8") as handle:
            return handle.read().strip() or None
    except OSError:
        return None


def fetch(url: str, token: str | None, accept: str) -> bytes:
    request = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": "glasshome-updater"})
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read()


def download_release() -> bytes:
    """Public download first; fall back to the API for private repositories."""
    token = github_token()
    public_url = (
        f"https://github.com/{OWNER}/{REPO}/releases/download/{TAG}/{ASSET}"
    )
    if not token:
        return fetch(public_url, None, "application/octet-stream")

    meta = json.loads(
        fetch(
            f"https://api.github.com/repos/{OWNER}/{REPO}/releases/tags/{TAG}",
            token,
            "application/vnd.github+json",
        )
    )
    for asset in meta.get("assets", []):
        if asset.get("name") == ASSET:
            return fetch(asset["url"], token, "application/octet-stream")
    raise RuntimeError(f"{ASSET} is not attached to release {TAG}")


def guard_target() -> None:
    """Refuse to replace anything that isn't clearly a dashboard folder."""
    if TARGET.rstrip("/") in ("", "/", "/config", "/config/www"):
        raise SystemExit(f"refusing to replace {TARGET}")
    if os.path.exists(TARGET) and not os.path.exists(os.path.join(TARGET, "index.html")):
        raise SystemExit(f"{TARGET} does not look like the dashboard (no index.html)")


def installed_version() -> str | None:
    try:
        with open(os.path.join(TARGET, "version.json"), encoding="utf-8") as handle:
            return json.load(handle).get("version")
    except (OSError, ValueError):
        return None


def main() -> int:
    guard_target()
    current = installed_version()

    try:
        payload = download_release()
    except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as err:
        log(f"download failed: {err}")
        return 1

    parent = os.path.dirname(TARGET)
    staging = tempfile.mkdtemp(prefix=".glasshome-", dir=parent)
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            archive.extractall(staging)
        if not os.path.exists(os.path.join(staging, "index.html")):
            raise RuntimeError("downloaded archive has no index.html")

        try:
            with open(os.path.join(staging, "version.json"), encoding="utf-8") as handle:
                incoming = json.load(handle).get("version")
        except (OSError, ValueError):
            incoming = None

        if incoming and incoming == current:
            log(f"already on build {current}")
            return 0

        # Swap last, so a failure above never disturbs the running dashboard.
        previous = f"{TARGET}.previous"
        shutil.rmtree(previous, ignore_errors=True)
        if os.path.exists(TARGET):
            os.rename(TARGET, previous)
        os.rename(staging, TARGET)
        staging = None
        shutil.rmtree(previous, ignore_errors=True)
        log(f"updated {current or 'unknown'} -> {incoming or 'unknown'}")
        return 0
    except Exception as err:  # noqa: BLE001 - report and leave the old copy alone
        log(f"update failed: {err}")
        return 1
    finally:
        if staging:
            shutil.rmtree(staging, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
