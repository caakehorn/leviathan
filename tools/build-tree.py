#!/usr/bin/env python3
"""build-tree — compile a GEDCOM export into data/tree.json for THE LINE.

THE LINE (tree.html + js/tree.js) renders one dataset: data/tree.json. This
script builds it from a GEDCOM 5.5.1 file — the format Ancestry.com, FamilySearch
and every other genealogy host exports — so the section can be refreshed with one
command as the research turns up new people.

  tools/build-tree.py path/to/export.ged

THE POINT OF THIS SCRIPT IS THAT THE TREE KEEPS GROWING. Two ways to add people:

  1. Re-export from Ancestry and re-run this script. Everything is rebuilt from
     the .ged, so nothing hand-edited in data/tree.json would survive — which is
     why hand-editing data/tree.json is the wrong move and (2) exists.

  2. Write additions into data/tree-additions.json, which this script merges over
     the GEDCOM every time it runs. That file is the place for anybody the
     Ancestry tree does not have yet, and for corrections to anybody it does.
     See --help-additions for its shape.

Living people: an individual with no death record whose estimated birth year is
inside LIVING_WINDOW years is flagged `living: true`. Nothing is withheld on
that basis by default — this is the operator's own family — but --redact-living
will strip everything except a name and the flag from those records, for a build
meant to sit somewhere less private than this one.

The GEDCOM's source citations are counted, not reproduced: each person carries
`sources`, the number of distinct SOUR records cited anywhere in their record,
and `sourceTitles`, the titles of those records. That is enough for the page to
show how well attested a person is without shipping 617 citation blocks.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

LIVING_WINDOW = 100          # no death + born within this many years => living
GEN_SPAN = 30                # years per generation, for estimating unknown births

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun",
     "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
MONTHS.update({m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"], start=1)})

# Prefixes GEDCOM puts in front of an imprecise date. Kept in the display text
# because "about 1812" and "1812" are different claims and the page should not
# quietly promote one to the other.
QUALIFIERS = ("abt", "about", "bef", "before", "aft", "after", "est", "cal",
              "bet", "between", "from", "to", "circa", "ca")

EVENT_TAGS = {
    "BIRT": "birth", "DEAT": "death", "BURI": "burial",
    "BAPM": "baptism", "CHR": "christening", "MARR": "marriage", "DIV": "divorce",
}


# ── GEDCOM reading ───────────────────────────────────────────────────────────

class Node:
    """One GEDCOM line plus its children, which is the whole format."""
    __slots__ = ("tag", "value", "xref", "kids")

    def __init__(self, tag: str, value: str = "", xref: str = ""):
        self.tag, self.value, self.xref, self.kids = tag, value, xref, []

    def first(self, tag: str):
        for k in self.kids:
            if k.tag == tag:
                return k
        return None

    def all(self, tag: str):
        return [k for k in self.kids if k.tag == tag]

    def val(self, tag: str) -> str:
        k = self.first(tag)
        return k.value if k else ""


LINE_RE = re.compile(r"^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$")


def parse_gedcom(text: str) -> list[Node]:
    """Return the top-level (level 0) records, each with its subtree attached."""
    root = Node("ROOT")
    stack = [root]
    for raw in text.splitlines():
        line = raw.rstrip("\r\n")
        if not line.strip():
            continue
        m = LINE_RE.match(line.lstrip("﻿"))
        if not m:
            continue
        level, xref, tag, value = int(m.group(1)), m.group(2) or "", m.group(3), m.group(4) or ""

        # CONT is a hard line break inside the parent's value; CONC is a
        # continuation with no break. Both belong to the previous line, not to
        # the tree, so they never become nodes.
        if tag in ("CONT", "CONC") and len(stack) > level:
            parent = stack[level]
            parent.value += ("\n" if tag == "CONT" else "") + value
            continue

        node = Node(tag, value, xref)
        while len(stack) > level + 1:
            stack.pop()
        stack[-1].kids.append(node)
        stack.append(node)
    return root.kids


# ── field extraction ─────────────────────────────────────────────────────────

def clean_xref(v: str) -> str:
    return v.strip().strip("@")


def parse_date(raw: str) -> dict | None:
    """GEDCOM date -> {text, year, sort, qualifier} or None.

    Handles the ordinary forms (`12 MAR 1884`, `MAR 1884`, `1884`), the
    qualified ones (`ABT 1884`, `BET 1884 AND 1886`), and the thing Ancestry
    emits for directory listings — a run of bare years, `1993 1994 1995 1996
    1997` — which is rendered as a range rather than dropped.
    """
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None

    low = raw.lower()
    qualifier = ""
    for q in QUALIFIERS:
        if low.startswith(q + " "):
            qualifier = q
            break

    years = [int(y) for y in re.findall(r"\b(1[0-9]{3}|20[0-9]{2})\b", raw)]

    # A run of three or more bare years with nothing else in the string is a
    # span, not a date. Ancestry writes residence spans this way.
    bare_years = re.fullmatch(r"(?:\s*(?:1[0-9]{3}|20[0-9]{2})\s*)+", raw)
    if bare_years and len(years) >= 2:
        return {"text": f"{years[0]}–{years[-1]}", "year": years[0],
                "sort": years[0] * 10000, "qualifier": "range"}

    if not years:
        return {"text": raw, "year": None, "sort": None, "qualifier": qualifier}

    year = years[0]
    month = day = 0
    dm = re.search(r"\b([A-Za-z]{3,9})\b", raw)
    if dm and dm.group(1).lower() in MONTHS:
        month = MONTHS[dm.group(1).lower()]
        dd = re.match(r"^(?:\w+\s+)??(\d{1,2})\s+[A-Za-z]", raw) if qualifier else \
             re.match(r"^(\d{1,2})\s+[A-Za-z]", raw)
        if dd:
            day = int(dd.group(1))

    text = raw
    if len(years) >= 2 and qualifier in ("bet", "between", "from"):
        text = f"{years[0]}–{years[-1]}"

    return {"text": text, "year": year,
            "sort": year * 10000 + month * 100 + day,
            "qualifier": qualifier}


def parse_place(raw: str) -> str:
    """Tidy a PLAC value. GEDCOM places are comma-separated, finest first, and
    Ancestry leaves empty levels in as doubled commas."""
    if not raw:
        return ""
    parts = [p.strip() for p in raw.replace("\n", " ").split(",")]
    return ", ".join(p for p in parts if p)


def count_sources(node: Node, out: set) -> None:
    """Walk a record collecting every SOUR pointer at any depth."""
    for k in node.kids:
        if k.tag == "SOUR" and k.value.startswith("@"):
            out.add(clean_xref(k.value))
        count_sources(k, out)


def event(node: Node | None) -> dict | None:
    if node is None:
        return None
    d = parse_date(node.val("DATE"))
    p = parse_place(node.val("PLAC"))
    if not d and not p:
        # A bare `1 DEAT` with no detail still asserts the person died, and the
        # living heuristic downstream depends on seeing it.
        return {"date": None, "place": ""} if node.tag in ("DEAT", "BIRT") else None
    return {"date": d, "place": p}


def split_name(node: Node) -> tuple[str, str, str]:
    """-> (full, given, surname). Prefers the GIVN/SURN subtags and falls back
    to the /slash/ convention in the NAME value."""
    given = node.val("GIVN").strip()
    surname = node.val("SURN").strip()
    raw = node.value.strip()
    if not given and not surname and raw:
        m = re.match(r"^(.*?)/([^/]*)/(.*)$", raw)
        if m:
            given, surname = m.group(1).strip(), m.group(2).strip()
        else:
            given = raw
    full = " ".join(p for p in (given, surname) if p) or raw.replace("/", "").strip()
    return full, given, surname


# ── record building ──────────────────────────────────────────────────────────

def build_person(rec: Node, sources: dict) -> dict:
    names = rec.all("NAME")
    full, given, surname = ("", "", "")
    alt = []
    for i, n in enumerate(names):
        f, g, s = split_name(n)
        if i == 0:
            full, given, surname = f, g, s
        elif f and f != full:
            alt.append(f)

    src_ids = set()
    count_sources(rec, src_ids)

    residences = []
    for r in rec.all("RESI"):
        d, p = parse_date(r.val("DATE")), parse_place(r.val("PLAC"))
        if d or p:
            residences.append({"date": d, "place": p})

    events = []
    for ev in rec.all("EVEN"):
        d, p = parse_date(ev.val("DATE")), parse_place(ev.val("PLAC"))
        kind = (ev.val("TYPE") or ev.value or "Event").strip()
        if d or p:
            events.append({"type": kind, "date": d, "place": p})
    for mil in rec.all("_MILT"):
        d, p = parse_date(mil.val("DATE")), parse_place(mil.val("PLAC"))
        if d or p:
            events.append({"type": "Military service", "date": d, "place": p})

    person = {
        "id": clean_xref(rec.xref),
        "name": full or "(unknown)",
        "given": given,
        "surname": surname,
        "sex": rec.val("SEX").strip().upper()[:1],
        "birth": event(rec.first("BIRT")),
        "death": event(rec.first("DEAT")),
        "burial": event(rec.first("BURI")),
        "baptism": event(rec.first("BAPM")) or event(rec.first("CHR")),
        "residences": residences,
        "events": events,
        "altNames": alt,
        "famc": [clean_xref(k.value) for k in rec.all("FAMC") if k.value],
        "fams": [clean_xref(k.value) for k in rec.all("FAMS") if k.value],
        "sources": len(src_ids),
        "sourceTitles": sorted({sources[s] for s in src_ids if s in sources}),
    }
    return {k: v for k, v in person.items() if v not in ("", [], None) or k in ("birth", "death")}


def build_family(rec: Node) -> dict:
    fam = {
        "id": clean_xref(rec.xref),
        "husband": clean_xref(rec.val("HUSB")),
        "wife": clean_xref(rec.val("WIFE")),
        "children": [clean_xref(k.value) for k in rec.all("CHIL") if k.value],
        "marriage": event(rec.first("MARR")),
        "divorce": event(rec.first("DIV")),
    }
    return {k: v for k, v in fam.items() if v not in ("", [], None)}


# ── derived fields ───────────────────────────────────────────────────────────

def estimate_births(people: dict, families: dict) -> dict:
    """Estimated birth year per person, for people the GEDCOM never dated.

    Resolved iteratively off whatever *is* dated nearby: a marriage puts both
    spouses near it, a dated child puts a parent a generation earlier, a dated
    parent puts a child a generation later. Only used for the living heuristic
    and for sorting; never shown as if it were a fact.
    """
    est = {}
    for pid, p in people.items():
        b = (p.get("birth") or {}).get("date") or {}
        if b.get("year"):
            est[pid] = b["year"]

    for _ in range(6):
        changed = False
        for fam in families.values():
            spouses = [s for s in (fam.get("husband"), fam.get("wife")) if s in people]
            kids = [c for c in fam.get("children", []) if c in people]
            m = (fam.get("marriage") or {}).get("date") or {}

            known = [est[s] for s in spouses if s in est]
            if m.get("year"):
                known.append(m["year"] - 25)
            known += [est[c] - GEN_SPAN for c in kids if c in est]
            if known:
                parent_year = round(sum(known) / len(known))
                for s in spouses:
                    if s not in est:
                        est[s], changed = parent_year, True
                for c in kids:
                    if c not in est:
                        est[c], changed = parent_year + GEN_SPAN, True
        if not changed:
            break
    return est


def mark_living(people: dict, est: dict, this_year: int) -> None:
    for pid, p in people.items():
        if p.get("death") is not None or p.get("burial"):
            p["living"] = False
            continue
        year = est.get(pid)
        # No death record and no year anywhere in reach: in a tree that reaches
        # the 1700s the overwhelmingly likely reading is "long dead, poorly
        # documented", so an undated person is not flagged living.
        p["living"] = bool(year and this_year - year < LIVING_WINDOW)


def compute_generations(people: dict, families: dict, root: str) -> dict:
    """Breadth-first generation index relative to the root person: negative for
    ancestors, positive for descendants, and carried across spouses."""
    child_of = {}
    for fam in families.values():
        for c in fam.get("children", []):
            child_of.setdefault(c, []).append(fam["id"])

    gen = {root: 0}
    queue = [root]
    while queue:
        pid = queue.pop(0)
        g = gen[pid]
        p = people.get(pid)
        if not p:
            continue
        for fid in child_of.get(pid, []):
            fam = families.get(fid, {})
            for parent in (fam.get("husband"), fam.get("wife")):
                if parent in people and parent not in gen:
                    gen[parent], _ = g - 1, queue.append(parent)
        for fid in p.get("fams", []):
            fam = families.get(fid, {})
            for spouse in (fam.get("husband"), fam.get("wife")):
                if spouse and spouse != pid and spouse in people and spouse not in gen:
                    gen[spouse], _ = g, queue.append(spouse)
            for c in fam.get("children", []):
                if c in people and c not in gen:
                    gen[c], _ = g + 1, queue.append(c)
    return gen


def pick_root(people: dict, gedcom_text: str) -> str:
    """The tree's owner: the individual the export names in its _TREE header,
    else the first individual in the file, which Ancestry writes as the home
    person."""
    m = re.search(r"^2 _TREE (.+)$", gedcom_text, re.M)
    if m:
        want = m.group(1).strip().lower().replace(" family tree", "")
        for pid, p in people.items():
            if p["name"].lower() == want:
                return pid
        for pid, p in people.items():
            if want and want in p["name"].lower():
                return pid
    return next(iter(people))


# ── additions overlay ────────────────────────────────────────────────────────

ADDITIONS_HELP = """\
data/tree-additions.json — hand-maintained people and corrections, merged over
the GEDCOM on every build so re-exporting from Ancestry never loses them.

{
  "people": [
    {
      "id": "X-hannah-mercer",           // any id not in the GEDCOM; keep it stable
      "name": "Hannah Mercer",
      "given": "Hannah", "surname": "Mercer", "sex": "F",
      "birth": {"date": {"text": "abt 1799", "year": 1799}, "place": "Fayette, PA"},
      "death": {"date": {"text": "1861", "year": 1861}, "place": ""},
      "famc": ["F412"],                  // family she is a child in
      "fams": ["X-fam-mercer"],          // families she is a spouse in
      "note": "Named in the 1850 census household; no birth record found yet."
    },
    { "id": "I13545620178", "occupation": "Attorney" }   // patch an existing person
  ],
  "families": [
    { "id": "X-fam-mercer", "husband": "I132335319570", "wife": "X-hannah-mercer",
      "children": [], "marriage": {"date": {"text": "1821", "year": 1821}, "place": ""} }
  ]
}

Every field is optional but `id`. An entry whose id already exists patches that
record field by field; an entry with a new id creates one. Anything created or
patched here is tagged `added: true` so the page can show it as research rather
than as an Ancestry-sourced fact. Links are not made symmetric for you: adding
someone's `fams` does not put them in that family's `husband`/`wife`, so set
both sides.
"""


def apply_additions(people: dict, families: dict, path: Path) -> int:
    if not path.exists():
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    touched = 0
    for kind, table in (("people", people), ("families", families)):
        for entry in data.get(kind, []):
            pid = entry.get("id")
            if not pid:
                print(f"  ! {kind} entry with no id, skipped", file=sys.stderr)
                continue
            rec = table.setdefault(pid, {"id": pid})
            rec.update({k: v for k, v in entry.items() if k != "id"})
            rec["added"] = True
            touched += 1
    return touched


# ── main ─────────────────────────────────────────────────────────────────────

def redact(people: dict) -> int:
    n = 0
    for p in people.values():
        if p.get("living"):
            keep = {k: p[k] for k in ("id", "name", "given", "surname", "sex",
                                      "famc", "fams", "living") if k in p}
            keep["redacted"] = True
            p.clear()
            p.update(keep)
            n += 1
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("gedcom", nargs="?", help="path to the .ged export")
    ap.add_argument("--out", default="data/tree.json")
    ap.add_argument("--meta-out", default="data/tree-meta.json",
                    help="tiny counts-only file for pages that cannot afford the whole tree")
    ap.add_argument("--additions", default="data/tree-additions.json")
    ap.add_argument("--root", default="", help="id of the home person (default: from the header)")
    ap.add_argument("--redact-living", action="store_true",
                    help="strip all facts but the name from people flagged living")
    ap.add_argument("--help-additions", action="store_true",
                    help="print the shape of the additions file and exit")
    args = ap.parse_args()

    if args.help_additions:
        print(ADDITIONS_HELP)
        return 0
    if not args.gedcom:
        ap.error("a .ged path is required")

    src = Path(args.gedcom)
    text = src.read_text(encoding="utf-8-sig", errors="replace")
    records = parse_gedcom(text)

    sources = {}
    for rec in records:
        if rec.tag == "SOUR" and rec.xref:
            title = rec.val("TITL").strip()
            if title:
                sources[clean_xref(rec.xref)] = title

    people, families = {}, {}
    for rec in records:
        if rec.tag == "INDI" and rec.xref:
            p = build_person(rec, sources)
            people[p["id"]] = p
        elif rec.tag == "FAM" and rec.xref:
            f = build_family(rec)
            families[f["id"]] = f

    if not people:
        print("no individuals found — is this a GEDCOM file?", file=sys.stderr)
        return 1

    added = apply_additions(people, families, Path(args.additions))

    # Drop pointers to records that do not exist. Ancestry exports are usually
    # clean, but a hand-written addition that names a family it never created
    # would otherwise strand a node in the renderer.
    for p in people.values():
        p["famc"] = [f for f in p.get("famc", []) if f in families]
        p["fams"] = [f for f in p.get("fams", []) if f in families]
        if not p["famc"]:
            p.pop("famc", None)
        if not p["fams"]:
            p.pop("fams", None)
    for f in families.values():
        f["children"] = [c for c in f.get("children", []) if c in people]
        for side in ("husband", "wife"):
            if f.get(side) and f[side] not in people:
                f.pop(side)

    this_year = date.today().year
    est = estimate_births(people, families)
    mark_living(people, est, this_year)

    root = args.root or pick_root(people, text)
    if root not in people:
        print(f"root {root!r} is not in the tree", file=sys.stderr)
        return 1
    gens = compute_generations(people, families, root)
    for pid, p in people.items():
        if pid in gens:
            p["gen"] = gens[pid]
        if pid in est and not (p.get("birth") or {}).get("date"):
            p["estBirth"] = est[pid]

    redacted = redact(people) if args.redact_living else 0

    years = [y for y in est.values()]
    surnames = {}
    for p in people.values():
        if p.get("surname"):
            surnames[p["surname"]] = surnames.get(p["surname"], 0) + 1

    out = {
        "meta": {
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": src.name,
            "root": root,
            "counts": {
                "people": len(people),
                "families": len(families),
                "living": sum(1 for p in people.values() if p.get("living")),
                "added": added,
                "redacted": redacted,
                "withBirth": sum(1 for p in people.values() if (p.get("birth") or {}).get("date")),
                "withDeath": sum(1 for p in people.values() if (p.get("death") or {}).get("date")),
                "sources": len(sources),
            },
            "span": [min(years), max(years)] if years else None,
            "generations": [min(gens.values()), max(gens.values())] if gens else [0, 0],
            "surnames": sorted(surnames.items(), key=lambda kv: (-kv[1], kv[0]))[:40],
            "redactedLiving": bool(args.redact_living),
        },
        "people": sorted(people.values(), key=lambda p: (p.get("surname", ""), p.get("given", ""))),
        "families": sorted(families.values(), key=lambda f: f["id"]),
    }

    dest = Path(args.out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # The headline counts alone, a few hundred bytes, so singularity.html can
    # show live numbers on the door without pulling the whole tree down.
    meta_dest = Path(args.meta_out)
    meta_dest.write_text(json.dumps({
        "generated": out["meta"]["generated"],
        "people": out["meta"]["counts"]["people"],
        "families": out["meta"]["counts"]["families"],
        "span": out["meta"]["span"],
        "generations": out["meta"]["generations"],
    }, separators=(",", ":")), encoding="utf-8")

    c = out["meta"]["counts"]
    print(f"{dest}: {c['people']} people, {c['families']} families, "
          f"{c['living']} living, {c['added']} from additions, "
          f"{dest.stat().st_size / 1024:.0f} KB")
    if redacted:
        print(f"  redacted {redacted} living records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
