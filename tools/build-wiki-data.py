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

Requires PyYAML. The frontmatter carries nested lists of dicts (`connections`,
`sources`), which the no-dependency fallback parser cannot read: without PyYAML
the build still succeeds but yields ZERO typed edges and no sources, silently
gutting the CLAIMS / HEALTH / EVIDENCE / GENESIS / SCHEMA views. That failure is
invisible in the output, so PyYAML is required rather than optional, and the
build refuses to overwrite a healthy dataset with a degraded one.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    # Narrow on purpose: a broad catch here would swallow a genuinely broken
    # PyYAML install and misreport it as "not installed" in main()'s message.
    yaml = None

DOMAINS = ["self", "timeline", "people", "mind", "work",
           "interests", "health", "places", "legal"]

# Longest summary any consumer renders is 190 chars (js/wiki-reader.js); the
# others clip to 170 and 150. Kept above that so a future view has headroom.
SUMMARY_MAX = 300
# Refuse a rebuild that loses more than this fraction of pages, words or edges.
SHRINK_LIMIT = 0.8

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
            print(f"warning: frontmatter is {type(meta).__name__}, not a mapping "
                  f"— falling back to the lenient parser", file=sys.stderr)
        except yaml.YAMLError as e:
            print(f"warning: unparseable frontmatter ({e.__class__.__name__}) "
                  f"— falling back to the lenient parser", file=sys.stderr)
    # lenient fallback: top-level scalars + simple inline lists only. Reached
    # only when safe_load fails or yields a non-mapping — main() exits before
    # this when PyYAML is absent entirely.
    lenient: dict = {}
    for line in raw.splitlines():
        if line.startswith((" ", "\t", "-")) or ":" not in line:
            continue
        k, _, v = line.partition(":")
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            lenient[k.strip()] = [x.strip().strip("\"'")
                                  for x in v[1:-1].split(",") if x.strip()]
        elif v:
            lenient[k.strip()] = v.strip("\"'")
    return lenient, body


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
    if len(s) > SUMMARY_MAX:
        head = s[:SUMMARY_MAX]
        # rsplit would return the slice unchanged when it holds no space (CJK, a
        # long URL), appending the ellipsis to a mid-word cut.
        s = (head.rsplit(" ", 1)[0] if " " in head else head) + "…"
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
        # Body only: every frontmatter field is already parsed into `page`
        # above, and both consumers (wiki-reader's rdrMarkdown, wiki-analytics'
        # wkPlain) strip it on arrival anyway. Shipping it cost ~385 KB and
        # silently skewed the EPISTEME/ECHO rates, which measure prose against
        # a `words` count taken from the body alone.
        text[pid] = body
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
        kind = re.split(r"[+\s]", m.group(2).strip().lower(), maxsplit=1)[0]
        ops.append({"d": m.group(1), "k": KIND_MAP.get(kind, "other")})
    ops.sort(key=lambda o: o["d"])
    return ops


def git_sha(root: Path) -> str | None:
    """HEAD of the wiki-brain checkout, or None if it cannot be determined.

    The caller must treat None as fatal. This value becomes `source_commit`,
    which the sync workflow diffs against wiki-brain's HEAD to decide whether a
    rebuild is needed — writing a placeholder here would never match, so the
    workflow would rebuild, commit and deploy every hour forever.
    """
    try:
        r = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, text=True,
                           capture_output=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        return None
    return r.stdout.strip() or None


def sanity_check(pages: list[dict], typed: int, words: int, out: Path,
                 allow_shrink: bool) -> str | None:
    """Return an error message if this build looks degraded, else None.

    Guards the unattended path: a half-checked-out source or a frontmatter
    regression should stop the pipeline, not quietly publish a thinner wiki.
    """
    if not pages:
        return "no pages parsed"
    if typed == 0:
        return ("0 typed edges parsed — frontmatter is not being read "
                "(is PyYAML installed?)")
    if allow_shrink or not out.exists():
        return None
    try:
        prev = json.loads(out.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        # Do not fail — a first run has nothing to compare against — but say so.
        # A corrupt or truncated previous build is exactly when this guard is
        # most useful, and it is the one case where it cannot run.
        print(f"warning: cannot read {out} ({e.__class__.__name__}); "
              f"skipping the regression guard", file=sys.stderr)
        return None
    old = prev.get("wikiPages", {}).get("pages", [])
    old_pages = len(old)
    old_words = sum(p.get("words", 0) for p in old)
    # Count the previous edges the same way main() counts the new ones — resolved
    # and non-self-referential. Comparing every stored connection against a
    # filtered total makes the guard fire on a healthy build the moment
    # wiki-brain gains connections pointing at pages that do not exist yet.
    old_known = {p.get("id") for p in old}
    old_typed = sum(1 for p in old for c in p.get("connections", [])
                    if c.get("page") in old_known and c.get("page") != p.get("id"))
    for label, new, old in (("pages", len(pages), old_pages),
                            ("words", words, old_words),
                            ("typed edges", typed, old_typed)):
        if old and new < old * SHRINK_LIMIT:
            return (f"{label} dropped {old} -> {new} (>20%); refusing to overwrite. "
                    f"Re-run with --allow-shrink if this is intentional.")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wiki-brain", required=True, type=Path)
    ap.add_argument("--out", type=Path,
                    default=Path(__file__).resolve().parent.parent / "data" / "wiki-data.json")
    ap.add_argument("--allow-shrink", action="store_true",
                    help="skip the regression guard (genuine large deletions)")
    args = ap.parse_args()
    root = args.wiki_brain.resolve()
    if not (root / "wiki").is_dir():
        print(f"error: {root} has no wiki/ directory", file=sys.stderr)
        return 1
    if yaml is None:
        print("error: PyYAML is required (pip install pyyaml); without it the "
              "connections and sources frontmatter cannot be parsed and the "
              "build would silently emit 0 typed edges", file=sys.stderr)
        return 2

    pages, text = build_pages(root)
    ops = build_log(root)
    known = {p["id"] for p in pages}
    typed = sum(1 for p in pages for c in p["connections"]
                if c["page"] in known and c["page"] != p["id"])
    words = sum(p["words"] for p in pages)

    bad = sanity_check(pages, typed, words, args.out, args.allow_shrink)
    if bad:
        print(f"error: {bad}", file=sys.stderr)
        return 3

    sha = git_sha(root)
    if sha is None:
        print(f"error: cannot read git HEAD of {root}; source_commit would never "
              f"match upstream and the sync workflow would rebuild every hour",
              file=sys.stderr)
        return 4

    # No "generated" timestamp: nothing reads it, and because it changed on every
    # run it made each rebuild look like a change, which the sync workflow then
    # needed a dedicated step to detect and revert.
    out = {
        "source": "github.com/caakehorn/wiki-brain",
        "source_commit": sha,
        "wikiPages": {"pages": pages},
        "wikiText": text,
        "wikiLog": {"ops": ops},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # Write via a temp file in the same directory: an interrupted write would
    # otherwise leave a truncated dataset that sanity_check silently declines to
    # guard against on the next run.
    tmp = args.out.with_suffix(args.out.suffix + ".tmp")
    tmp.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    tmp.replace(args.out)
    print(f"{args.out}: {len(pages)} pages, {typed} typed edges, "
          f"{words:,} words, {len(ops)} log ops "
          f"({args.out.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
