#!/usr/bin/env python3
"""build-wiki-data — compile the wiki-brain repo into data/wiki-data.json.

The LEVIATHAN archive's WIKI section renders three datasets (wikiPages,
wikiText, wikiLog). This script builds all three straight from a checkout of
github.com/caakehorn/wiki-brain — the authoritative wiki source — so the site
can be refreshed with one command instead of re-packing the encrypted bundle.

The wiki content is served publicly at caakehorn.github.io/wiki-brain, so this
dataset ships as plaintext; the encrypted bundle keeps everything else.

Usage:
  tools/build-wiki-data.py --wiki-brain /path/to/wiki-brain [--out data/wiki-data.json]

Stdlib only, PyYAML used when available (lenient fallback otherwise).
"""
from __future__ import annotations

import argparse
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except Exception:
    yaml = None

DOMAINS = ["self", "timeline", "people", "mind", "work",
           "interests", "health", "places", "legal"]

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WL_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
LOG_RE = re.compile(r"^## \[(\d{4}-\d{2}-\d{2})\]\s*([^|]+)\|")

# Operation kinds the ACCRETION view knows how to color; everything else
# is folded into the nearest kind (or 'other').
KIND_MAP = {
    "ingest": "ingest", "connect": "connect", "rename": "rename",
    "build": "build", "edit": "edit", "add": "add", "triage": "triage",
    "lint": "lint", "rewrite": "rewrite", "fix": "fix",
    "migrate": "build", "restructure": "build", "governance": "build",
    "style": "lint", "audit": "triage", "verify": "triage",
    "capture": "ingest", "expand": "edit", "enrich": "edit",
    "promote": "edit", "correction": "fix", "correct": "fix",
}


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FM_RE.match(text)
    if not m:
        return {}, text
    raw, body = m.group(1), text[m.end():]
    if yaml is not None:
        try:
            meta = yaml.safe_load(raw)
            if isinstance(meta, dict):
                return meta, body
        except Exception:
            pass
    # lenient fallback: top-level scalars + simple inline lists only
    meta: dict = {}
    for line in raw.splitlines():
        if line.startswith((" ", "\t", "-")) or ":" not in line:
            continue
        k, _, v = line.partition(":")
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            meta[k.strip()] = [x.strip().strip("\"'") for x in v[1:-1].split(",") if x.strip()]
        elif v:
            meta[k.strip()] = v.strip("\"'")
    return meta, body


def norm_id(target: str) -> str:
    t = target.strip().split("#", 1)[0].strip()
    t = re.sub(r"\.md$", "", t)
    if t and not t.startswith("wiki/"):
        t = "wiki/" + t
    return t


def strip_wikilinks(s: str) -> str:
    return WL_RE.sub(lambda m: (m.group(2) or m.group(1).split("/")[-1]).strip(), s)


def plain_text(s: str) -> str:
    s = strip_wikilinks(s)
    s = re.sub(r"\[([^\]]+)\]\((?:https?:)?[^)]*\)", r"\1", s)
    s = re.sub(r"[*_`]{1,3}", "", s)
    return re.sub(r"\s+", " ", s).strip()


def first_paragraph(body: str) -> str:
    para: list[str] = []
    for line in body.splitlines():
        ls = line.strip()
        if not ls:
            if para:
                break
            continue
        if ls.startswith(("#", "---", "***", "|", ">", "```", "<!--")):
            if para:
                break
            continue
        if re.match(r"^\s*([-*+]|\d+\.)\s", line):
            if para:
                break
            continue
        para.append(ls)
    s = plain_text(" ".join(para))
    if len(s) > 300:
        s = s[:300].rsplit(" ", 1)[0] + "…"
    return s


def clean_infobox(fb) -> dict:
    out = {}
    if not isinstance(fb, dict):
        return out
    for k, v in fb.items():
        if isinstance(v, list):
            out[str(k)] = [plain_text(str(x)) for x in v]
        elif isinstance(v, (str, int, float, bool)):
            out[str(k)] = plain_text(str(v)) if isinstance(v, str) else v
    return out


def build_pages(root: Path) -> tuple[list[dict], dict]:
    pages, text = [], {}
    for f in sorted((root / "wiki").rglob("*.md")):
        rel = f.relative_to(root)
        pid = norm_id(str(rel))
        src = f.read_text(encoding="utf-8", errors="replace")
        meta, body = parse_frontmatter(src)
        domain = str(meta.get("domain") or rel.parts[1])
        if domain not in DOMAINS:
            domain = rel.parts[1] if rel.parts[1] in DOMAINS else "self"
        title = str(meta.get("title") or "").strip()
        if not title:
            m = re.search(r"^# (.+)$", body, re.MULTILINE)
            title = m.group(1).strip() if m else f.stem.replace("-", " ").title()
        title = plain_text(title)

        links, seen = [], set()
        for m in WL_RE.finditer(body):
            t = norm_id(m.group(1))
            if t and t != pid and t not in seen:
                seen.add(t)
                links.append(t)

        conns = []
        for c in meta.get("connections") or []:
            if isinstance(c, dict) and c.get("page") and c.get("type"):
                conns.append({
                    "page": norm_id(str(c["page"])),
                    "type": str(c["type"]).strip(),
                    "claim": plain_text(str(c.get("claim") or "")),
                })

        tags = [str(t).strip() for t in (meta.get("tags") or []) if str(t).strip()]
        aliases = [str(a).strip() for a in (meta.get("aliases") or []) if str(a).strip()]
        sources = [str(s).strip() for s in (meta.get("sources") or []) if str(s).strip()]

        page = {
            "id": pid,
            "title": title,
            "domain": domain,
            "page_type": str(meta.get("page_type") or ""),
            "status": str(meta.get("status") or ""),
            "words": len(body.split()),
            "summary": first_paragraph(body),
            "tags": tags,
            "links": links,
            "connections": conns,
            "sources": sources,
        }
        if aliases:
            page["aliases"] = aliases
        for src_key, dst in (("date_range_start", "drs"), ("date_range_end", "dre"),
                             ("date_created", "created")):
            v = meta.get(src_key)
            if v:
                page[dst] = str(v)[:10]
        fb = clean_infobox(meta.get("infobox"))
        if fb:
            page["infobox"] = fb
        pages.append(page)
        text[pid] = src
    return pages, text


def build_log(root: Path) -> list[dict]:
    ops = []
    log = root / "log.md"
    if not log.exists():
        return ops
    for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
        m = LOG_RE.match(line)
        if not m:
            continue
        kind = re.split(r"[+\s]", m.group(2).strip().lower(), 1)[0]
        ops.append({"d": m.group(1), "k": KIND_MAP.get(kind, "other")})
    ops.sort(key=lambda o: o["d"])
    return ops


def git_sha(root: Path) -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"],
                                       cwd=root, text=True).strip()
    except Exception:
        return "unknown"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wiki-brain", required=True, type=Path)
    ap.add_argument("--out", type=Path,
                    default=Path(__file__).resolve().parent.parent / "data" / "wiki-data.json")
    args = ap.parse_args()
    root = args.wiki_brain.resolve()
    if not (root / "wiki").is_dir():
        print(f"error: {root} has no wiki/ directory", file=sys.stderr)
        return 1

    pages, text = build_pages(root)
    ops = build_log(root)
    known = {p["id"] for p in pages}
    typed = sum(1 for p in pages for c in p["connections"]
                if c["page"] in known and c["page"] != p["id"])
    words = sum(p["words"] for p in pages)

    out = {
        "generated": datetime.date.today().isoformat(),
        "source": "github.com/caakehorn/wiki-brain",
        "source_commit": git_sha(root),
        "wikiPages": {"pages": pages},
        "wikiText": text,
        "wikiLog": {"ops": ops},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")),
                        encoding="utf-8")
    print(f"{args.out}: {len(pages)} pages, {typed} typed edges, "
          f"{words:,} words, {len(ops)} log ops "
          f"({args.out.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
