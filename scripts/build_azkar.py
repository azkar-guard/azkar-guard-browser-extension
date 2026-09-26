#!/usr/bin/env python3
"""Generate src/data/azkar.json from Hisn al-Muslim (hisnmuslim.com, chapter 27).

Arabic dhikr text is copied verbatim from the source. The only transformations are:
  * the dhikr is taken from between the source's (( )) delimiters, dropping the
    trailing instruction notes such as "(ثلاثَ مرَّاتٍ)", since the counter shows that;
  * text is NFC-normalized (reorders combining marks only; canonically equivalent);
  * evening variants are produced by the exact substitutions the source itself
    prescribes in its "وإذا أمسى قال" notes (see EVENING below). Where the source
    gives the full evening wording, that wording is used as-is.

English translations of meaning are adapted from the Hisn al-Muslim English edition
(hisnmuslim.com/api/en/27.json), cleaned of inline notes; see TRANSLATIONS.

Arabic virtue notes are verbatim excerpts of hadith text, checked at build time
against the fawazahmed0/hadith-api dataset (see VIRTUES). Two hadiths are from
collections that dataset does not include; those are paraphrases marked «بمعناه».

Usage: python3 scripts/build_azkar.py
"""

import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

SOURCE_URL = "https://www.hisnmuslim.com/api/ar/27.json"
HADITH_URL = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-{edition}/{number}.json"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "azkar.json"
USER_AGENT = "azkar-guard-build/1.0"  # hisnmuslim.com rejects Python's default with 403

# id, source ID, session, minimum level, required count override (None = source REPEAT).
# Levels are cumulative: small ⊂ medium ⊂ full.
ITEMS = [
    ("ayat-al-kursi", 75, "both", "small", None),
    ("three-quls", 76, "both", "small", None),
    ("asbahna-wa-asbaha-al-mulk", 77, "morning", "medium", None),
    ("allahumma-bika-asbahna", 78, "morning", "medium", None),
    ("sayyid-al-istighfar", 79, "both", "small", None),
    ("allahumma-inni-asbahtu-ushhiduka", 80, "morning", "medium", None),
    ("allahumma-ma-asbaha-bi", 81, "morning", "medium", None),
    ("allahumma-afini-fi-badani", 82, "both", "full", None),
    # Source REPEAT field says 1 but its own text says (سَبْعَ مَرّاتٍ) — seven times.
    ("hasbiyallahu", 83, "both", "medium", 7),
    ("al-afwa-wal-afiya", 84, "both", "medium", None),
    ("alim-al-ghaybi-wash-shahada", 85, "both", "full", None),
    ("bismillahi-alladhi-la-yadurru", 86, "both", "small", None),
    ("raditu-billahi-rabba", 87, "both", "small", None),
    ("ya-hayyu-ya-qayyum", 88, "both", "small", None),
    ("asbahna-rabbil-alamin", 89, "morning", "full", None),
    ("asbahna-ala-fitrat-al-islam", 90, "morning", "full", None),
    ("subhanallahi-wa-bihamdihi", 91, "both", "medium", None),
    ("la-ilaha-illallah-10", 92, "both", "full", None),
    ("la-ilaha-illallah-100", 93, "morning", "full", None),
    ("subhanallahi-adada-khalqihi", 94, "morning", "full", None),
    ("ilman-nafian", 95, "morning", "full", None),
    ("astaghfirullah-wa-atubu-ilayh", 96, "morning", "full", None),
    ("audhu-bikalimatillah", 97, "evening", "small", None),
    ("salat-ala-an-nabi", 98, "both", "medium", None),
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

# English translation of meaning, keyed by item id ("-evening" ids for evening variants).
TRANSLATIONS = {
    "ayat-al-kursi": "I seek refuge in Allah from Satan, the accursed. Allah — there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass nothing of His knowledge except what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Al-Baqarah 2:255)",
    "three-quls": "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent. — Say: I seek refuge in the Lord of daybreak, from the evil of what He created, from the evil of darkness when it settles, from the evil of the blowers in knots, and from the evil of an envier when he envies. — Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer, who whispers into the breasts of mankind, from among the jinn and mankind. (Al-Ikhlas, Al-Falaq, An-Nas)",
    "asbahna-wa-asbaha-al-mulk": "We have reached the morning and at this very time all sovereignty belongs to Allah, and all praise is for Allah. None has the right to be worshipped except Allah, alone, without partner; to Him belong all sovereignty and praise, and He is over all things omnipotent. My Lord, I ask You for the good of this day and the good of what follows it, and I seek refuge in You from the evil of this day and the evil of what follows it. My Lord, I seek refuge in You from laziness and senility. My Lord, I seek refuge in You from torment in the Fire and punishment in the grave.",
    "asbahna-wa-asbaha-al-mulk-evening": "We have reached the evening and at this very time all sovereignty belongs to Allah, and all praise is for Allah. None has the right to be worshipped except Allah, alone, without partner; to Him belong all sovereignty and praise, and He is over all things omnipotent. My Lord, I ask You for the good of this night and the good of what follows it, and I seek refuge in You from the evil of this night and the evil of what follows it. My Lord, I seek refuge in You from laziness and senility. My Lord, I seek refuge in You from torment in the Fire and punishment in the grave.",
    "allahumma-bika-asbahna": "O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening, by Your leave we live and die, and unto You is our resurrection.",
    "allahumma-bika-asbahna-evening": "O Allah, by Your leave we have reached the evening and by Your leave we have reached the morning, by Your leave we live and die, and unto You is our return.",
    "sayyid-al-istighfar": "O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for none forgives sins except You.",
    "allahumma-inni-asbahtu-ushhiduka": "O Allah, I have reached the morning and call on You, the bearers of Your Throne, Your angels and all of Your creation to witness that You are Allah, none has the right to be worshipped except You, alone, without partner, and that Muhammad is Your servant and Messenger.",
    "allahumma-inni-asbahtu-ushhiduka-evening": "O Allah, I have reached the evening and call on You, the bearers of Your Throne, Your angels and all of Your creation to witness that You are Allah, none has the right to be worshipped except You, alone, without partner, and that Muhammad is Your servant and Messenger.",
    "allahumma-ma-asbaha-bi": "O Allah, whatever blessing I or any of Your creation have risen upon this morning is from You alone, without partner, so for You is all praise and unto You all thanks.",
    "allahumma-ma-asbaha-bi-evening": "O Allah, whatever blessing I or any of Your creation have reached this evening with is from You alone, without partner, so for You is all praise and unto You all thanks.",
    "allahumma-afini-fi-badani": "O Allah, grant my body health. O Allah, grant my hearing health. O Allah, grant my sight health. None has the right to be worshipped except You. O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped except You.",
    "hasbiyallahu": "Allah is sufficient for me; none has the right to be worshipped except Him. Upon Him I rely, and He is the Lord of the Mighty Throne.",
    "al-afwa-wal-afiya": "O Allah, I ask You for pardon and well-being in this life and the next. O Allah, I ask You for pardon and well-being in my religion, my worldly affairs, my family and my wealth. O Allah, veil my faults and calm my fears. O Allah, guard me from in front of me and behind me, from my right and my left, and from above me, and I seek refuge in Your greatness from being struck down from beneath me.",
    "alim-al-ghaybi-wash-shahada": "O Allah, Knower of the unseen and the seen, Creator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that none has the right to be worshipped except You. I seek refuge in You from the evil of my soul, from the evil of Satan and his call to shirk, and from committing wrong against myself or bringing it upon a Muslim.",
    "bismillahi-alladhi-la-yadurru": "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.",
    "raditu-billahi-rabba": "I am pleased with Allah as my Lord, with Islam as my religion and with Muhammad ﷺ as my Prophet.",
    "ya-hayyu-ya-qayyum": "O Ever-Living, O Sustainer of all, by Your mercy I seek help; set right all my affairs and do not leave me to myself even for the blink of an eye.",
    "asbahna-rabbil-alamin": "We have reached the morning and at this very time all sovereignty belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this day: its triumph, its victory, its light, its blessing and its guidance, and I seek refuge in You from the evil in it and the evil of what follows it.",
    "asbahna-rabbil-alamin-evening": "We have reached the evening and at this very time all sovereignty belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this night: its triumph, its victory, its light, its blessing and its guidance, and I seek refuge in You from the evil in it and the evil of what follows it.",
    "asbahna-ala-fitrat-al-islam": "We have reached the morning upon the fitrah of Islam, the word of pure faith, the religion of our Prophet Muhammad ﷺ and the way of our forefather Ibrahim, who was upright and a Muslim and was not of those who associate partners with Allah.",
    "asbahna-ala-fitrat-al-islam-evening": "We have reached the evening upon the fitrah of Islam, the word of pure faith, the religion of our Prophet Muhammad ﷺ and the way of our forefather Ibrahim, who was upright and a Muslim and was not of those who associate partners with Allah.",
    "subhanallahi-wa-bihamdihi": "How perfect is Allah, and I praise Him.",
    "la-ilaha-illallah-10": "None has the right to be worshipped except Allah, alone, without partner; to Him belong all sovereignty and praise, and He is over all things omnipotent.",
    "la-ilaha-illallah-100": "None has the right to be worshipped except Allah, alone, without partner; to Him belong all sovereignty and praise, and He is over all things omnipotent.",
    "subhanallahi-adada-khalqihi": "How perfect is Allah, and I praise Him, by the number of His creation, by His pleasure, by the weight of His Throne and by the ink of His words.",
    "ilman-nafian": "O Allah, I ask You for beneficial knowledge, good provision and accepted deeds.",
    "astaghfirullah-wa-atubu-ilayh": "I seek Allah's forgiveness and turn to Him in repentance.",
    "audhu-bikalimatillah": "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    "salat-ala-an-nabi": "O Allah, send prayers and peace upon our Prophet Muhammad.",
}

# Virtue notes keyed by source ID. "quote" = (dataset edition, dataset number, verbatim
# excerpt), verified against the fetched hadith text; "ar" = paraphrase when no quote.
VIRTUES = {
    75: {
        "en": "Whoever says it in the morning is protected from the jinn until evening, and whoever says it in the evening is protected until morning. (al-Hakim, an-Nasa'i)",
        "ar": "من قالها حين يصبح أُجير من الجن حتى يمسي، ومن قالها حين يمسي أُجير منهم حتى يصبح (بمعناه)",
        "ref_ar": "رواه الحاكم والنسائي",
    },
    76: {
        "en": "Recited three times in the evening and in the morning, they will suffice you against everything. (Abu Dawud 5082)",
        "quote": ("abudawud", 5082, "حِينَ تُمْسِي وَحِينَ تُصْبِحُ ثَلاَثَ مَرَّاتٍ تَكْفِيكَ مِنْ كُلِّ شَىْءٍ"),
        "ref_ar": "رواه أبو داود (5082)",
    },
    79: {
        "en": "Whoever says it during the day with conviction and dies that day before evening is of the people of Paradise, and whoever says it at night with conviction and dies before morning is of the people of Paradise. (al-Bukhari 6306)",
        "quote": ("bukhari", 6306, "وَمَنْ قَالَهَا مِنَ النَّهَارِ مُوقِنًا بِهَا، فَمَاتَ مِنْ يَوْمِهِ قَبْلَ أَنْ يُمْسِيَ، فَهُوَ مِنْ أَهْلِ الْجَنَّةِ، وَمَنْ قَالَهَا مِنَ اللَّيْلِ وَهْوَ مُوقِنٌ بِهَا، فَمَاتَ قَبْلَ أَنْ يُصْبِحَ، فَهْوَ مِنْ أَهْلِ الْجَنَّةِ"),
        "ref_ar": "رواه البخاري (6306)",
    },
    80: {
        "en": "Whoever says it four times, Allah frees him from the Fire. (Abu Dawud 5069)",
        "quote": ("abudawud", 5069, "فَإِنْ قَالَهَا أَرْبَعًا أَعْتَقَهُ اللَّهُ مِنَ النَّارِ"),
        "ref_ar": "رواه أبو داود (5069)",
    },
    81: {
        "en": "Whoever says it in the morning has given thanks for his day, and whoever says it in the evening has given thanks for his night. (Abu Dawud 5073)",
        "quote": ("abudawud", 5073, "فَقَدْ أَدَّى شُكْرَ يَوْمِهِ وَمَنْ قَالَ مِثْلَ ذَلِكَ حِينَ يُمْسِي فَقَدْ أَدَّى شُكْرَ لَيْلَتِهِ"),
        "ref_ar": "رواه أبو داود (5073)",
    },
    83: {
        "en": "Whoever says it seven times morning and evening, Allah will suffice him in whatever concerns him. (Abu Dawud 5081, from Abu ad-Darda')",
        "quote": ("abudawud", 5081, "سَبْعَ مَرَّاتٍ كَفَاهُ اللَّهُ مَا أَهَمَّهُ"),
        "ref_ar": "رواه أبو داود (5081) موقوفًا على أبي الدرداء",
    },
    86: {
        "en": "Whoever says it three times in the evening, no sudden affliction will befall him until morning; and whoever says it three times in the morning, none will befall him until evening. (Abu Dawud 5088)",
        "quote": ("abudawud", 5088, "ثَلاَثَ مَرَّاتٍ لَمْ تُصِبْهُ فَجْأَةُ بَلاَءٍ حَتَّى يُصْبِحَ وَمَنْ قَالَهَا حِينَ يُصْبِحُ ثَلاَثَ مَرَّاتٍ لَمْ تُصِبْهُ فَجْأَةُ بَلاَءٍ حَتَّى يُمْسِيَ"),
        "ref_ar": "رواه أبو داود (5088)",
    },
    87: {
        "en": "Whoever says it morning and evening, it is a right upon Allah to please him. (Abu Dawud 5072)",
        "quote": ("abudawud", 5072, "إِلاَّ كَانَ حَقًّا عَلَى اللَّهِ أَنْ يُرْضِيَهُ"),
        "ref_ar": "رواه أبو داود (5072)",
    },
    91: {
        "en": "No one will come on the Day of Resurrection with anything better, except one who said the same or more. (Muslim 2692)",
        # Dataset number 6843 = Sahih Muslim 2692 in the standard numbering.
        "quote": ("muslim", 6843, "لَمْ يَأْتِ أَحَدٌ يَوْمَ الْقِيَامَةِ بِأَفْضَلَ مِمَّا جَاءَ بِهِ إِلاَّ أَحَدٌ قَالَ مِثْلَ مَا قَالَ أَوْ زَادَ عَلَيْهِ"),
        "ref_ar": "رواه مسلم (2692)",
    },
    93: {
        "en": "Said a hundred times in a day, it equals freeing ten slaves; a hundred good deeds are written, a hundred sins erased, and it is a protection from Satan that day until evening. (al-Bukhari 3293)",
        "quote": ("bukhari", 3293, "كَانَتْ لَهُ عَدْلَ عَشْرِ رِقَابٍ، وَكُتِبَتْ لَهُ مِائَةُ حَسَنَةٍ، وَمُحِيَتْ عَنْهُ مِائَةُ سَيِّئَةٍ، وَكَانَتْ لَهُ حِرْزًا مِنَ الشَّيْطَانِ يَوْمَهُ ذَلِكَ حَتَّى يُمْسِيَ"),
        "ref_ar": "رواه البخاري (3293)",
    },
    97: {
        "en": "A man stung by a scorpion was told: had you said it in the evening, it would not have harmed you. (Muslim 2709)",
        # Dataset number 6880 = Sahih Muslim 2709 in the standard numbering.
        "quote": ("muslim", 6880, "أَمَا لَوْ قُلْتَ حِينَ أَمْسَيْتَ أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ لَمْ تَضُرُّكَ"),
        "ref_ar": "رواه مسلم (2709)",
    },
    98: {
        "en": "Whoever sends blessings upon the Prophet ﷺ ten times in the morning and ten in the evening will receive his intercession. (at-Tabarani)",
        "ar": "من صلى على النبي ﷺ حين يصبح عشرًا وحين يمسي عشرًا أدركته شفاعته يوم القيامة (بمعناه)",
        "ref_ar": "رواه الطبراني",
    },
}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8-sig"))


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def fetch_source() -> dict[int, dict]:
    entries = next(iter(fetch_json(SOURCE_URL).values()))
    # NFC only reorders combining marks into canonical order (the source stores shadda
    # before fatha in places); the text is canonically equivalent and renders identically.
    for e in entries:
        e["ARABIC_TEXT"] = nfc(e["ARABIC_TEXT"])
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
        old, new = nfc(old), nfc(new)
        if text.count(old) != 1:
            sys.exit(f"source #{source_id}: expected exactly one {old!r} in text")
        text = text.replace(old, new)
    return text


def virtue_ar(source_id: int, virtue: dict) -> str:
    """Arabic virtue note: a verified verbatim hadith excerpt, or the marked paraphrase."""
    if "quote" not in virtue:
        return f"{virtue['ar']}. {virtue['ref_ar']}"
    edition, number, excerpt = virtue["quote"]
    hadith = fetch_json(HADITH_URL.format(edition=edition, number=number))
    text = nfc(hadith["hadiths"][0]["text"])
    if nfc(excerpt) not in text:
        sys.exit(f"source #{source_id}: excerpt not found in {edition} {number}")
    return f"«{nfc(excerpt)}» {virtue['ref_ar']}"


def main() -> None:
    source = fetch_source()
    out = []
    for item_id, source_id, session, level, count in ITEMS:
        entry = source[source_id]
        morning_text = extract_dhikr(entry["ARABIC_TEXT"])
        required = count if count is not None else entry["REPEAT"]
        virtue = VIRTUES.get(source_id)
        virtue_note_ar = virtue_ar(source_id, virtue) if virtue else None

        def make(id_: str, sess: str, text: str) -> dict:
            obj = {
                "id": id_,
                "session": sess,
                "arabic_text": text,
                "required_count": required,
                "level": level,
                "source": f"Hisn al-Muslim, hisnmuslim.com #{source_id}",
                "translation_en": TRANSLATIONS[id_],
            }
            if virtue:
                obj["virtue_note"] = virtue["en"]
                obj["virtue_note_ar"] = virtue_note_ar
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
