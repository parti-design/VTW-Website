#!/usr/bin/env python3
"""Generate responsive WebP derivatives for the site's photographs.

GitHub Pages runs Jekyll without custom plugins, so derivatives are built here
and committed. Originals in assets/images/ are never touched: they stay as the
archive and as the <img src> fallback, and the lightbox still opens them at
full size.

    python3 tools/build-images.py            # build what is missing or stale
    python3 tools/build-images.py --force    # rebuild everything
    python3 tools/build-images.py --report   # show sizes, write nothing

Output lands in assets/images/derived/, mirroring the source tree:

    assets/images/projects-final/f-s-barn/54-07-68.jpg
    assets/images/derived/projects-final/f-s-barn/54-07-68-800.webp

Widths come in two tiers. Everything gets the small pair, which is all a card
or a gallery thumbnail can display. Images that are shown large — project
covers, the home page's photo panels — also get the big pair. Add to
LARGE_WIDTHS' set by referencing an image as a cover_image or a *_image in
front matter; the tiers are derived from the content, not hand-listed here.

Requires ImageMagick (`brew install imagemagick`).
"""

import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "assets", "images")
OUT_DIR = os.path.join(SRC_DIR, "derived")

SMALL_WIDTHS = [400, 800]
LARGE_WIDTHS = [400, 800, 1200, 1600]
QUALITY = {400: 78, 800: 78, 1200: 80, 1600: 82}

RASTER = (".jpg", ".jpeg", ".png")


def large_set():
    """Paths the site displays big, read out of the content's front matter."""
    keys = re.compile(
        r'^(?:cover_image|photo|hero_image|statement_image|advocate_image|portrait_image)'
        r':\s*"?(/assets/images/[^"\s]+)"?\s*$',
        re.M,
    )
    found = set()
    sources = []
    for d in ("_projects", "_pages"):
        p = os.path.join(ROOT, d)
        if os.path.isdir(p):
            sources += [os.path.join(p, f) for f in os.listdir(p) if f.endswith(".md")]
    sources.append(os.path.join(ROOT, "index.md"))
    for f in sources:
        if not os.path.exists(f):
            continue
        with open(f) as fh:
            for m in keys.finditer(fh.read()):
                found.add(m.group(1).lstrip("/"))
    return found


def sources():
    for dirpath, dirnames, filenames in os.walk(SRC_DIR):
        if os.path.commonpath([os.path.abspath(dirpath), OUT_DIR]) == OUT_DIR:
            continue
        dirnames[:] = [d for d in dirnames if d != "derived"]
        for name in sorted(filenames):
            if name.lower().endswith(RASTER):
                yield os.path.join(dirpath, name)


def derivative_path(src, width):
    rel = os.path.relpath(src, SRC_DIR)
    stem = os.path.splitext(rel)[0]
    return os.path.join(OUT_DIR, f"{stem}-{width}.webp")


def stale(src, dst):
    return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="rebuild even if up to date")
    ap.add_argument("--report", action="store_true", help="print sizes, write nothing")
    args = ap.parse_args()

    if subprocess.run(["which", "magick"], capture_output=True).returncode != 0:
        sys.exit("magick not found. brew install imagemagick")

    big = large_set()
    src_bytes = out_bytes = 0
    built = skipped = 0

    for src in sources():
        rel = os.path.relpath(src, ROOT)
        src_w = int(subprocess.run(["identify", "-format", "%w", src],
                                   capture_output=True, text=True).stdout or 0)
        src_bytes += os.path.getsize(src)
        widths = LARGE_WIDTHS if rel in big else SMALL_WIDTHS

        for width in widths:
            # never upscale
            if src_w and width > src_w:
                continue
            dst = derivative_path(src, width)
            if args.report:
                if os.path.exists(dst):
                    out_bytes += os.path.getsize(dst)
                continue
            if not args.force and not stale(src, dst):
                skipped += 1
                out_bytes += os.path.getsize(dst)
                continue
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            subprocess.run(
                ["magick", src, "-auto-orient", "-resize", f"{width}x>",
                 "-strip", "-quality", str(QUALITY[width]), dst],
                check=True,
            )
            out_bytes += os.path.getsize(dst)
            built += 1

    mb = 1024 * 1024
    print(f"originals    {src_bytes / mb:8.1f} MB")
    print(f"derivatives  {out_bytes / mb:8.1f} MB")
    if not args.report:
        print(f"built {built}, up to date {skipped}")


if __name__ == "__main__":
    main()
