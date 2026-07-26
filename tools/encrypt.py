#!/usr/bin/env python3
"""Encrypt a payload into this project's blob format.

The format is whatever data/leviathan.enc has always been, written down at
last so there is a tool in the repo that can produce it:

    {"v": 1, "kdf": "PBKDF2-SHA256", "iter": 250000,
     "salt": <b64, 16 bytes>, "iv": <b64, 12 bytes>, "ct": <b64>}

    key = PBKDF2-HMAC-SHA256(passphrase, salt, iter) -> 32 bytes
    ct  = AES-256-GCM(key, iv, plaintext)            -- tag appended

A wrong passphrase fails GCM authentication rather than returning garbage,
which is why the browser needs no stored hash to check against and why there
is nothing on the wire that a guesser can grind offline any faster than by
running the same 250,000 iterations per attempt.

The passphrase comes from $LEVIATHAN_PASSPHRASE or an interactive prompt. It
is never written to disk, never echoed, and must never be committed.

    tools/encrypt.py verify                     # data/verify.enc, the small
                                                # blob the gate checks against
    tools/encrypt.py pack data/transcript.json  # -> data/transcript.json.enc
    tools/encrypt.py pack in.json -o out.enc
    tools/encrypt.py check data/leviathan.enc   # does this passphrase open it?

Requires: pip install cryptography
"""
import argparse
import base64
import getpass
import hashlib
import json
import os
import pathlib
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITER = 250_000
# What data/verify.enc holds. The gate only cares that it decrypts, so the
# plaintext is deliberately worthless — knowing it tells an attacker nothing
# they could not already assume.
VERIFY_PLAINTEXT = json.dumps({"v": 1, "ok": True}, separators=(",", ":"))


def b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def passphrase(confirm: bool = False) -> str:
    pw = os.environ.get("LEVIATHAN_PASSPHRASE")
    if pw:
        return pw
    if not sys.stdin.isatty():
        sys.exit("error: no $LEVIATHAN_PASSPHRASE and no tty to prompt on")
    pw = getpass.getpass("passphrase: ")
    if confirm and pw != getpass.getpass("again: "):
        sys.exit("error: passphrases do not match")
    if not pw:
        sys.exit("error: empty passphrase")
    return pw


def derive(pw: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, ITER, dklen=32)


def seal(plaintext: bytes, pw: str) -> dict:
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(derive(pw, salt)).encrypt(iv, plaintext, None)
    return {"v": 1, "kdf": "PBKDF2-SHA256", "iter": ITER,
            "salt": b64(salt), "iv": b64(iv), "ct": b64(ct)}


def open_blob(blob: dict, pw: str) -> bytes:
    """Raises cryptography.exceptions.InvalidTag on a wrong passphrase."""
    key = derive(pw, base64.b64decode(blob["salt"]))
    return AESGCM(key).decrypt(base64.b64decode(blob["iv"]),
                               base64.b64decode(blob["ct"]), None)


def write(path: pathlib.Path, blob: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(blob, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path} ({path.stat().st_size:,} bytes)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("verify", help="write the gate's small challenge blob")
    v.add_argument("-o", "--out", default="data/verify.enc")

    p = sub.add_parser("pack", help="encrypt a file")
    p.add_argument("src")
    p.add_argument("-o", "--out", help="default: <src>.enc")

    c = sub.add_parser("check", help="test a passphrase against an existing blob")
    c.add_argument("blob")

    a = ap.parse_args()

    if a.cmd == "check":
        blob = json.loads(pathlib.Path(a.blob).read_text(encoding="utf-8"))
        try:
            n = len(open_blob(blob, passphrase()))
        except Exception:
            sys.exit("✕ wrong passphrase")
        print(f"✓ passphrase opens {a.blob} ({n:,} bytes of plaintext)")
        return

    if a.cmd == "verify":
        # Confirm on the way in: this blob is what every future unlock is
        # checked against, so a typo here locks the whole site out.
        write(pathlib.Path(a.out), seal(VERIFY_PLAINTEXT.encode("utf-8"),
                                        passphrase(confirm=True)))
        return

    src = pathlib.Path(a.src)
    out = pathlib.Path(a.out) if a.out else src.with_suffix(src.suffix + ".enc")
    write(out, seal(src.read_bytes(), passphrase()))


if __name__ == "__main__":
    main()
