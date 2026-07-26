#!/usr/bin/env python3
"""Build data/transcript.json — the complete Dan/Annie message record.

Usage:
    # single export (the original one-file mode)
    python3 tools/build-transcript.py export.csv [-o data/transcript.json]

    # full record: merge every Annie-thread export in a wiki-brain checkout
    python3 tools/build-transcript.py --merge /path/to/wiki-brain [--report]

No single export on disk holds the whole thread. The exports were pulled at
different times, against different handles, with different column names and
two different clocks, and several of them are demonstrably truncated — the
2022-2026 pull of the 212 number carries fewer rows for three and a half
years than a later pull carries for one. So the complete record has to be
assembled, and `--merge` is that assembly:

  * SOURCES lists every export known to belong to the Dan/Annie thread,
    across all three of Annie's handles (+1 724 434 6811, the 2015-2019
    original; +1 724 920 4125, the 2018-2020 alternate; +1 212 470 2449,
    the 2022-2026 current one).
  * Column names are normalized: timestamp / datetime_local / timestamp_utc
    all mean the same thing, but only one of them is UTC.
  * `imessages_2124702449_last6months.csv` is stamped in UTC and is
    converted to America/New_York, honoring DST rather than subtracting a
    flat four hours — an hour of drift would split a conversation across
    the dedupe window and mint phantom duplicates, which is exactly the
    failure this file caused before.
  * Rows are deduplicated on (direction, collapsed text) within a
    DEDUPE_WINDOW-second window, so the same message pulled by two
    overlapping exports collapses to one line while a genuinely repeated
    "Please" minutes later survives as two.

Output is a compact JSON envelope: messages in chronological order, each one
a fixed-length array so the file stays small enough to ship over Pages.

    {"generated": iso8601, "target": "+1...", "count": n,
     "first": ts, "last": ts,
     "m": [[timestamp, dir, text, flags], ...]}

    dir   0 = received, 1 = sent
    flags bit 0 = has attachment, bit 1 = tapback/reaction
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("America/New_York")
DEDUPE_WINDOW = 120  # seconds

# Every export on disk that carries Dan/Annie messages, oldest coverage first.
# `utc` marks the one export stamped in UTC rather than local time.
SOURCES = [
    ("raw/self/message-csv/imessage_7244346811+7249204125+2124702449_both_all_now.csv", False),
    ("raw/self/message-csv/imessage_7244346811+2124702449_both_all_now.csv", False),
    ("raw/self/message-csv/imessage_7244346811_both_all_now.csv", False),
    ("raw/self/message-csv/imessage_7249204125_both_all_now.csv", False),
    ("raw/self/message-csv/imessages_2124702449_last6months.csv", True),
    ("raw/self/message-csv/imessage_2124702449_both_all_now.csv", False),
    ("raw/self/message-csv/imessage_2124702449_both_2025-05-14_now.csv", False),
    ("raw/self/message-csv/imessage_2124702449_both_2026-05-01_now.csv", False),
    ("raw/self/message-csv/annie_all_time_logs.csv", False),
    ("raw/self/message-csv/imessage_export_2124702449_20260726.csv", False),
]

TS_KEYS = ("timestamp", "datetime_local", "timestamp_utc")
TEXT_KEYS = ("text", "body", "message")
DIR_KEYS = ("direction", "dir")

_ws = re.compile(r"\s+")


def norm_text(t):
    """Collapse whitespace and case for dedupe only; the stored text is raw."""
    return _ws.sub(" ", (t or "")).strip().lower()


def parse_ts(raw, is_utc):
    raw = (raw or "").strip()
    if not raw:
        return None
    raw = raw.replace("T", " ").replace("Z", "").split(".")[0].split("+")[0].strip()
    try:
        dt = datetime.strptime(raw[:19], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            dt = datetime.strptime(raw[:16], "%Y-%m-%d %H:%M")
        except ValueError:
            return None
    if is_utc:
        dt = dt.replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ).replace(tzinfo=None)
    return dt


def read_rows(path, is_utc):
    """Yield (datetime, dir, text, flags) from one export, whatever its schema."""
    with open(path, newline="", encoding="utf-8", errors="replace") as fh:
        rd = csv.DictReader(fh)
        cols = rd.fieldnames or []
        tsk = next((k for k in TS_KEYS if k in cols), None)
        txk = next((k for k in TEXT_KEYS if k in cols), None)
        drk = next((k for k in DIR_KEYS if k in cols), None)
        if not (tsk and txk and drk):
            return
        for r in rd:
            dt = parse_ts(r.get(tsk), is_utc)
            text = r.get(txk)
            if dt is None or not (text or "").strip():
                continue
            flags = 0
            if str(r.get("cache_has_attachments") or r.get("has_attachments") or "").strip() in ("1", "true", "True"):
                flags |= 1
            amt = str(r.get("associated_message_type") or "0").strip()
            if amt not in ("", "0"):
                flags |= 2
            if str(r.get("kind") or "").strip().lower() in ("reaction", "tapback"):
                flags |= 2
            yield dt, 1 if str(r.get(drk)).strip().lower().startswith("sent") else 0, text, flags


def merge(root, report=False):
    """Merge every SOURCES export under `root` into one deduplicated record."""
    seen = {}   # (dir, normalized text) -> [datetimes already kept]
    kept = []
    stats = []
    for relpath, is_utc in SOURCES:
        path = os.path.join(root, relpath)
        if not os.path.exists(path):
            stats.append((relpath, 0, 0, "MISSING"))
            continue
        read = new = 0
        for dt, direction, text, flags in read_rows(path, is_utc):
            read += 1
            key = (direction, norm_text(text))
            bucket = seen.setdefault(key, [])
            if any(abs((dt - prev).total_seconds()) <= DEDUPE_WINDOW for prev in bucket):
                continue
            bucket.append(dt)
            kept.append([dt.strftime("%Y-%m-%d %H:%M:%S"), direction, text, flags])
            new += 1
        stats.append((relpath, read, new, ""))
    kept.sort(key=lambda m: m[0])
    if report:
        print("%-62s %9s %9s" % ("source", "rows", "new"), file=sys.stderr)
        for relpath, read, new, note in stats:
            print("%-62s %9d %9d %s" % (os.path.basename(relpath), read, new, note), file=sys.stderr)
    return kept


def build(rows):
    """Single-export mode: the original straight-through conversion."""
    out = []
    for r in rows:
        flags = 0
        if r.get("cache_has_attachments") == "1":
            flags |= 1
        amt = (r.get("associated_message_type") or "0").strip()
        if amt not in ("", "0"):
            flags |= 2
        out.append([r["timestamp"], 1 if r["direction"] == "Sent" else 0, r["text"], flags])
    out.sort(key=lambda m: m[0])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path", nargs="?", help="single export to convert")
    ap.add_argument("--merge", metavar="WIKI_BRAIN",
                    help="merge every Annie-thread export under this wiki-brain checkout")
    ap.add_argument("--report", action="store_true", help="per-source row counts to stderr")
    ap.add_argument("-o", "--out", default="data/transcript.json")
    args = ap.parse_args()

    if args.merge:
        messages = merge(args.merge, report=args.report)
        target = ["+17244346811", "+17249204125", "+12124702449"]
    elif args.csv_path:
        with open(args.csv_path, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        if not rows:
            sys.exit("no rows in %s" % args.csv_path)
        messages = build(rows)
        targets = {r.get("target", "") for r in rows}
        target = sorted(targets)[0] if len(targets) == 1 else sorted(targets)
    else:
        ap.error("pass an export path, or --merge <wiki-brain checkout>")

    if not messages:
        sys.exit("no messages assembled")

    envelope = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "target": target,
        "count": len(messages),
        "first": messages[0][0],
        "last": messages[-1][0],
        "m": messages,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(envelope, fh, ensure_ascii=False, separators=(",", ":"))
    sent = sum(1 for m in messages if m[1])
    print("%s: %d messages (%d sent / %d received), %s .. %s" % (
        args.out, len(messages), sent, len(messages) - sent,
        envelope["first"], envelope["last"]))


if __name__ == "__main__":
    main()
