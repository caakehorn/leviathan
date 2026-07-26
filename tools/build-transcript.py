#!/usr/bin/env python3
"""Build data/transcript.json from an iMessage CSV export.

Usage:  python3 tools/build-transcript.py <export.csv> [-o data/transcript.json]

The CSV is the output of the imessage-extract query: one row per message with
timestamp / target / direction / text / associated_message_type /
cache_has_attachments / service / textSource.

Output is a compact JSON envelope: messages in chronological order, each one a
fixed-length array so the file stays small enough to ship over Pages.

    {"generated": iso8601, "target": "+1...", "count": n,
     "first": ts, "last": ts,
     "m": [[timestamp, dir, text, flags], ...]}

    dir   0 = received, 1 = sent
    flags bit 0 = has attachment, bit 1 = tapback/reaction
"""

import argparse
import csv
import json
import sys
from datetime import datetime, timezone


def build(rows):
    out = []
    for r in rows:
        flags = 0
        if r.get("cache_has_attachments") == "1":
            flags |= 1
        amt = (r.get("associated_message_type") or "0").strip()
        if amt not in ("", "0"):
            flags |= 2
        out.append([
            r["timestamp"],
            1 if r["direction"] == "Sent" else 0,
            r["text"],
            flags,
        ])
    out.sort(key=lambda m: m[0])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("-o", "--out", default="data/transcript.json")
    args = ap.parse_args()

    with open(args.csv_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        sys.exit("no rows in %s" % args.csv_path)

    messages = build(rows)
    targets = {r.get("target", "") for r in rows}
    envelope = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "target": sorted(targets)[0] if len(targets) == 1 else sorted(targets),
        "count": len(messages),
        "first": messages[0][0],
        "last": messages[-1][0],
        "m": messages,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(envelope, fh, ensure_ascii=False, separators=(",", ":"))
    print("%s: %d messages, %s .. %s" % (
        args.out, len(messages), envelope["first"], envelope["last"]))


if __name__ == "__main__":
    main()
