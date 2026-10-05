"""Extract compact reading texts (en/ru/uz) from the SmartyLang repo.

Usage: python scripts/extract_texts.py <path-to-SmartyLang-repo>
Keeps only id/title/text; strips dialogue speaker labels so the scored text
matches what the student actually reads aloud (same rule as SmartyLang's
getSpeakablePassageText, widened to Cyrillic/Uzbek names).
"""
import json
import re
import sys
from pathlib import Path

SOURCES = {
    "en": "public/level-texts.json",
    "ru": "public/data/lang-packs/ru/level-texts.json",
    "uz": "public/data/lang-packs/uz/level-texts.json",
}
LEVELS = ["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Advanced"]
SPEAKER_RE = re.compile(r"^([^\W\d_][\w'’.\-]*(?:\s+[^\W\d_][\w'’.\-]*){0,2})\s*:\s*(.+)$")


def plausible_speaker(name: str) -> bool:
    words = name.split()
    return 0 < len(name) <= 28 and len(words) <= 3 and name[0].isupper()


def speakable(text: str) -> str:
    lines = [l.strip() for l in text.replace("\r\n", "\n").split("\n") if l.strip()]
    labeled = 0
    out = []
    for line in lines:
        m = SPEAKER_RE.match(line)
        if m and plausible_speaker(m.group(1)):
            labeled += 1
            out.append(m.group(2).strip())
        else:
            out.append(line)
    return " ".join(out) if labeled >= 2 else " ".join(lines)


def main() -> None:
    repo = Path(sys.argv[1])
    dest = Path(__file__).resolve().parent.parent / "public" / "texts"
    for lang, rel in SOURCES.items():
        data = json.loads((repo / rel).read_text(encoding="utf-8"))
        compact = {
            level: [
                {"id": t["id"], "title": t["title"], "text": speakable(t["text"])}
                for t in data.get(level, [])
                if t.get("text") and not t.get("archived")
            ]
            for level in LEVELS
        }
        out = dest / f"{lang}.json"
        out.write_text(json.dumps(compact, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(lang, {k: len(v) for k, v in compact.items()}, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
