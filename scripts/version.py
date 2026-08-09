#!/usr/bin/env python3
"""Read and validate the repository semantic version."""

from __future__ import annotations

import json
import re
from pathlib import Path

VERSION_FILE = Path(__file__).resolve().parents[1] / "version.json"
SEMVER_PATTERN = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")


def main() -> None:
    with VERSION_FILE.open(encoding="utf-8") as file:
        data = json.load(file)

    fields = ("major", "minor", "patch")
    if any(not isinstance(data.get(field), int) or data[field] < 0 for field in fields):
        raise ValueError("version.json must contain non-negative integer major, minor, and patch fields")

    version = ".".join(str(data[field]) for field in fields)
    if not SEMVER_PATTERN.fullmatch(version):
        raise ValueError(f"Invalid version: {version}")
    print(version)


if __name__ == "__main__":
    main()
