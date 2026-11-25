"""Blur URLs, brand words and contact lines in screen-recording frames, using the per-frame OCR log.

Usage: blur.py ocr.tsv frames_dir [--only url|word|line]

ocr.tsv comes from `ocr frames_dir` (scripts/ocr.swift): one line per frame, "f_00001.jpg<TAB>item ;; item",
item = "text|y=..|h=..|x=..|w=..", with normalized centre and size.

Priority (阿星's rule since video 05): URLs first. Any OCR line that contains a URL is blurred whole:
address bars (127.0.0.1:18765/..., localhost), deployed sites (xxx.pages.dev), links in pages (www.youtube.com, x.com).
URL boxes are carried 8 frames back and forward, so a frame OCR missed in a static address bar stays covered.

Also blurred:
- brand words (only the word): workbuddy, 公众号, ChatGPT, Cursor, OpenAI, DeepSeek, Cloudflare, Playwright, Opus, 飞书, 豆包
- a line containing 微信 (contact ID), whole.
Brand and contact boxes carry over to the next 4 frames.

Frames are edited in place; rerun rough_cut.py to get clean frames back.
"""

import re
import sys
from pathlib import Path

from PIL import Image, ImageFilter

URL = re.compile(
    r"https?://|www\.|\blocalhost\b|\b\d{1,3}(?:\.\d{1,3}){3}\b|:\d{4,5}/|pages\.dev"
    r"|\b[\w-]+(?:\.[\w-]+)*\.(?:com|cn|net|org|io|dev|app|ai|me|co|xyz|top|cc|so|gg|tv|ly|sh)\b(?!\.)",
    re.I,
)
WORD = re.compile(r"workbuddy|公众号|ChatGPT|Cursor|OpenAI|DeepSeek|Cloudflare|Playwright|Opus|飞书|豆包", re.I)
LINE = re.compile(r"微信")
# A box found in frame k also covers frames k - before ... k + after.
CARRY = {"url": (8, 8), "word": (0, 4), "line": (0, 4)}


def parse(item):
    """Split one OCR item into text and normalized (y, h, x, w)."""
    m = re.match(r"(.*)\|y=([\d.-]+)\|h=([\d.-]+)\|x=([\d.-]+)\|w=([\d.-]+)$", item)
    return (m[1], *map(float, m.groups()[1:])) if m else None


def box(y, h, x, w, a, e, W, H):
    """Pixel box for the [a, e] fraction of an OCR line, padded by its height."""
    x0 = (x - w / 2 + a * w) * W - 0.6 * h * H
    x1 = (x - w / 2 + e * w) * W + 0.6 * h * H
    y0, y1 = (y - h * 0.9) * H, (y + h * 0.9) * H
    return int(max(0, x0)), int(max(0, y0)), int(min(W, x1)), int(min(H, y1))


def boxes_for(items, W, H, only=None):
    """Return {kind: [pixel boxes]} to blur for one frame's OCR items."""
    out = {"url": [], "word": [], "line": []}
    for it in items:
        p = parse(it)
        if not p:
            continue
        text, y, h, x, w = p
        if URL.search(text):
            out["url"].append(box(y, h, x, w, 0.0, 1.0, W, H))
        elif LINE.search(text):
            out["line"].append(box(y, h, x, w, 0.0, 1.0, W, H))
        else:
            wt = [2 if ord(c) > 0x2E80 else 1 for c in text]
            tot = sum(wt) or 1
            for b in WORD.finditer(text):
                out["word"].append(box(y, h, x, w, sum(wt[: b.start()]) / tot, sum(wt[: b.end()]) / tot, W, H))
    if only:
        out = {k: (v if k == only else []) for k, v in out.items()}
    return out


def main() -> None:
    """Read OCR rows and blur matching regions in place."""
    log, frames = Path(sys.argv[1]), Path(sys.argv[2])
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    rows = {}
    for line in log.read_text(encoding="utf8").splitlines():
        name, _, items = line.partition("\t")
        rows[int(name[2:7])] = items.split(" ;; ") if items else []
    W, H = Image.open(next(frames.glob("f_*.jpg"))).size
    found = {i: boxes_for(items, W, H, only) for i, items in rows.items()}
    hits = {k: 0 for k in CARRY}
    for i in sorted(rows):
        todo = []
        for kind, (before, after) in CARRY.items():
            for k in range(i - after, i + before + 1):
                todo += [(kind, b) for b in found.get(k, {}).get(kind, [])]
        if not todo:
            continue
        p = frames / f"f_{i:05d}.jpg"
        img = Image.open(p).convert("RGB")
        for kind, b in todo:
            if b[2] > b[0] and b[3] > b[1]:
                img.paste(img.crop(b).filter(ImageFilter.GaussianBlur(14)), b[:2])
                hits[kind] += 1
        img.save(p, quality=92)
    print(len(rows), "frames; boxes blurred:", hits)


if __name__ == "__main__":
    main()
