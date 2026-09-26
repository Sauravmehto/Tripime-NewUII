#!/usr/bin/env python3
"""Render build: install deps. Prefer Python 3.11 via PYTHON_VERSION=3.11.9."""

from __future__ import annotations

import subprocess
import sys


def main() -> int:
    ver = sys.version.split()[0]
    print(f"==> Python: {ver} ({sys.executable})")

    if sys.version_info[:2] == (3, 14):
        print(
            "NOTE: Python 3.14 detected. Requirements include wheels for 3.14.\n"
            "For a stabler runtime, set Environment PYTHON_VERSION=3.11.9 and redeploy."
        )
    elif sys.version_info[:2] != (3, 11):
        print(
            f"WARNING: expected Python 3.11.x (got {ver}). Continuing install anyway.\n"
            "Set Environment PYTHON_VERSION=3.11.9 if the build fails."
        )
    else:
        print("OK: Python 3.11 detected")

    subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    print("==> Build complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
