#!/usr/bin/env python3
"""Generate src/data/azkar.json from Hisn al-Muslim (hisnmuslim.com, chapter 27).

The Arabic text is copied verbatim from the source. The only transformations are:
  * the dhikr is taken from between the source's (( )) delimiters, dropping the
    trailing instruction notes such as "(ثلاثَ مرَّاتٍ)", since the counter shows that;
  * evening variants are produced by the exact substitutions the source itself
    prescribes in its "وإذا أمسى قال" notes (see EVENING below). Where the source
    gives the full evening wording, that wording is used as-is.

Usage: python3 scripts/build_azkar.py
"""

import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

SOURCE_URL = "https://www.hisnmuslim.com/api/ar/27.json"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "azkar.json"

# id, source ID, session, minimum level, required count override (None = source REPEAT), virtue note.
# Levels are cumulative: small ⊂ medium ⊂ full.
ITEMS = [
    ("ayat-al-kursi", 75, "both", "small", None,
     "Whoever says it in the morning is protected from the jinn until evening, and whoever says it in the evening is protected until morning. (al-Hakim, an-Nasa'i)"),
    ("three-quls", 76, "both", "small", None,
     "Recited three times morning and evening, they will suffice you against everything. (Abu Dawud, at-Tirmidhi)"),
    ("asbahna-wa-asbaha-al-mulk", 77, "morning", "medium", None, None),
    ("allahumma-bika-asbahna", 78, "morning", "medium", None, None),
    ("sayyid-al-istighfar", 79, "both", "small", None,
     "Whoever says it with conviction during the day and dies before evening is of the people of Paradise, and likewise at night. (al-Bukhari)"),
    ("allahumma-inni-asbahtu-ushhiduka", 80, "morning", "medium", None,
     "Whoever says it four times, Allah frees him from the Fire. (Abu Dawud)"),
    ("allahumma-ma-asbaha-bi", 81, "morning", "medium", None,
     "Whoever says it in the morning has given thanks for his day, and in the evening for his night. (Abu Dawud)"),
    ("allahumma-afini-fi-badani", 82, "both", "full", None, None),
    # Source REPEAT field says 1 but its own text says (سَبْعَ مَرّاتٍ) — seven times.
    ("hasbiyallahu", 83, "both", "medium", 7,
     "Whoever says it seven times, Allah will suffice him in whatever concerns him. (Abu Dawud)"),
    ("al-afwa-wal-afiya", 84, "both", "medium", None, None),
    ("alim-al-ghaybi-wash-shahada", 85, "both", "full", None, None),
    ("bismillahi-alladhi-la-yadurru", 86, "both", "small", None,
     "Whoever says it three times, nothing will harm him. (Abu Dawud, at-Tirmidhi)"),
    ("raditu-billahi-rabba", 87, "both", "small", None,
     "It is a right upon Allah to please him on the Day of Resurrection. (Ahmad)"),
    ("ya-hayyu-ya-qayyum", 88, "both", "small", None, None),
    ("asbahna-rabbil-alamin", 89, "morning", "full", None, None),
    ("asbahna-ala-fitrat-al-islam", 90, "morning", "full", None, None),
    ("subhanallahi-wa-bihamdihi", 91, "both", "medium", None,
     "No one will come on the Day of Resurrection with anything better, except one who said the same or more. (Muslim)"),
    ("la-ilaha-illallah-10", 92, "both", "full", None, None),
    ("la-ilaha-illallah-100", 93, "morning", "full", None,
     "Equal to freeing ten slaves; a hundred good deeds are written, a hundred sins erased, and it is a protection from Shaytan that day. (al-Bukhari, Muslim)"),
    ("subhanallahi-adada-khalqihi", 94, "morning", "full", None, None),
    ("ilman-nafian", 95, "morning", "full", None, None),
    ("astaghfirullah-wa-atubu-ilayh", 96, "morning", "full", None, None),
    ("audhu-bikalimatillah", 97, "evening", "small", None,
     "Whoever says it three times in the evening, no venomous sting will harm him that night. (Ahmad)"),
    ("salat-ala-an-nabi", 98, "both", "medium", None,
     "Whoever sends blessings upon me ten times in the morning and ten in the evening will receive my intercession. (at-Tabarani)"),
]

# Evening variants for morning-only items: list of (old, new) replacements applied to the
# morning text, or the literal string "SOURCE" to take the full evening wording from the
# source's own [وإذا أمسى قال: ...] note.
EVENING = {
    77: [
        ("أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ"),
        ("خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيرَ مَا بَعْدَهُ", "خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا"),
        ("شَرِّ مَا فِي  هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ", "شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا"),
    ],
    78: "SOURCE",
    80: [("أَصْبَحْتُ", "أَمْسَيْتُ")],
    81: [("مَا أَصْبَحَ بِي", "مَا أَمْسَى بِي")],
    89: "SOURCE",
    90: [("أَصْبَحْنا عَلَى", "أَمْسَيْنَا عَلَى")],
}


def fetch_source() -> dict[int, dict]:
    # The server rejects Python's default User-Agent with 403.
    req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "azkar-guard-build/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8-sig"))
    entries = next(iter(data.values()))
    # NFC only reorders combining marks into canonical order (the source stores shadda
    # before fatha in places); the text is canonically equivalent and renders identically.
    for e in entries:
        e["ARABIC_TEXT"] = unicodedata.normalize("NFC", e["ARABIC_TEXT"])
    return {e["ID"]: e for e in entries}


def extract_dhikr(raw: str) -> str:
    """Return the text between the outer (( )) delimiters. Without delimiters, return the
    whole text minus a trailing instruction note such as "(ثلاثَ مرَّاتٍ)."."""
    start, end = raw.find("(("), raw.rfind("))")
    if start == -1 or end == -1:
        return re.sub(r"\s*\([^()]*\)\.?\s*$", "", raw).strip()
    return raw[start + 2:end].strip()


def source_evening(raw: str) -> str:
    """Return the full evening wording from the source's [وإذا أمسى قال: ...] note."""
    match = re.search(r"\[\s*وإذا أمسى قال:\s*(.+?)\]", raw)
    if not match:
        sys.exit("evening note not found in source text")
    return match.group(1).strip()


def apply_replacements(text: str, replacements: list[tuple[str, str]], source_id: int) -> str:
    for old, new in replacements:
        old = unicodedata.normalize("NFC", old)
        new = unicodedata.normalize("NFC", new)
        if text.count(old) != 1:
            sys.exit(f"source #{source_id}: expected exactly one {old!r} in text")
        text = text.replace(old, new)
    return text


def main() -> None:
    source = fetch_source()
    out = []
    for item_id, source_id, session, level, count, virtue in ITEMS:
        entry = source[source_id]
        morning_text = extract_dhikr(entry["ARABIC_TEXT"])
        required = count if count is not None else entry["REPEAT"]

        def make(id_: str, sess: str, text: str) -> dict:
            obj = {
                "id": id_,
                "session": sess,
                "arabic_text": text,
                "required_count": required,
                "level": level,
                "source": f"Hisn al-Muslim, hisnmuslim.com #{source_id}",
            }
            if virtue:
                obj["virtue_note"] = virtue
            return obj

        out.append(make(item_id, session, morning_text))

        if source_id in EVENING:
            rule = EVENING[source_id]
            if rule == "SOURCE":
                evening_text = source_evening(entry["ARABIC_TEXT"])
            else:
                evening_text = apply_replacements(morning_text, rule, source_id)
            out.append(make(f"{item_id}-evening", "evening", evening_text))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(out)} entries to {OUT}")


if __name__ == "__main__":
    main()
