# Credits and content licensing

The Azkar Guard **source code** is MIT-licensed (see [LICENSE](LICENSE)). The **content** it ships comes from the sources below, each under its own terms. The extension is and must remain **free of charge**; the first source only permits free distribution.

This file records what each source allows, as checked on 2026-09-27. It is not legal advice.

## 1. Azkar text: Hisn al-Muslim (حصن المسلم)

- **What we use:** the Arabic morning and evening azkar (chapter 27), their repetition counts, and the selection itself, in `src/data/azkar.json`. The text is fetched from the [hisnmuslim.com](https://www.hisnmuslim.com) API by `scripts/build_azkar.py`.
- **Author:** Sheikh Sa'id bin Ali bin Wahf al-Qahtani (سعيد بن علي بن وهف القحطاني).
- **Terms:** the book's rights page (42nd edition, 1436 AH, [archive.org copy](https://archive.org/details/7sn-muslem)) says the rights are reserved for the author, except for anyone who wants to print it and distribute it free of charge, without deletion, addition or change:

  > حقوق الطبع محفوظة للمؤلف إلا لمن أراد طبعه وتوزيعه مجانًا بدون حذف أو إضافة أو تغيير

- **What this means for us:**
  - The extension must stay free.
  - The Arabic text is reproduced verbatim. The only changes are Unicode NFC normalization (canonically equivalent, renders identically) and removing the counting notes, which the counter replaces.
  - The azkar themselves are Qur'an and Sunnah. The book is the reference for the selection and the counts.
  - We use one chapter rather than the whole book, and split it into cards, so this is not a full reprint. We credit the book as the source.
- **hisnmuslim.com** itself shows no license or terms of use (checked on the site and its API). Its content is the book above.

## 2. English translation of meaning: our own

- **What we use:** `translation_en` in `src/data/azkar.json`, plus the English text of the reminders in `src/lib/reminders.ts`.
- **Origin:** written for this project directly from the Arabic, including Ayat al-Kursi and the three Quls. No published translation was used as a base. Earlier drafts were adapted from the hisnmuslim.com English edition (whose terms are unknown), so that text was replaced entirely.
- **Independence check:** we compared the text against that edition and rephrased every long shared passage. What remains in common is short literal phrases that any accurate translation shares, such as "O Allah, I ask You for" or "Creator of the heavens and the earth".
- **Conventions** (kept consistent across entries):
  - لا إله إلا = "there is no god but"
  - الملك = "dominion"
  - أعوذ بـ = "I seek refuge with/in"
  - الرحمن الرحيم = "the Most Compassionate, the Most Merciful"
  - الحي القيوم = "the Ever-Living, the Self-Subsisting Sustainer"
- **License:** covered by the project license (MIT). It is a translation of *meaning*; the Arabic remains the text that is recited.

## 3. Transliteration

Written for this project in a consistent scheme. Covered by the MIT license.

## 4. Hadith excerpts: fawazahmed0/hadith-api

- **What we use:** the Arabic `virtue_note_ar` excerpts (al-Bukhari, Muslim, Abu Dawud) and the al-Bukhari 6407 reminder. Each is verified verbatim at build time.
- **Source:** [github.com/fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api).
- **Terms:** [The Unlicense](https://unlicense.org) (public domain dedication).

## 5. Qur'an text: Tanzil Project

- **What we use:** the Qur'an verses in the motivational reminders (`src/lib/reminders.ts`), from Tanzil's *quran-simple* text via [api.alquran.cloud](https://alquran.cloud/api).
- **Terms:** CC BY 3.0 with Tanzil's conditions. Verbatim copies only (changing the text is not allowed), the source must be clearly indicated, and there must be a link to tanzil.net. The extension's settings page carries the attribution and link. The required notice:

  ```
  Tanzil Quran Text
  Copyright (C) 2007-2021 Tanzil Project
  License: Creative Commons Attribution 3.0

  This copy of the Quran text is carefully produced, highly verified and
  continuously monitored by a group of specialists in Tanzil Project.

  TERMS OF USE:

  - Permission is granted to copy and distribute verbatim copies of this text,
    but CHANGING IT IS NOT ALLOWED.

  - This Quran text can be used in any website or application, provided that
    its source (Tanzil Project) is clearly indicated, and a link is made to
    tanzil.net to enable users to keep track of changes.

  - This copyright notice shall be included in all verbatim copies of the text,
    and shall be reproduced appropriately in all files derived from or
    containing substantial portion of this text.

  Please check updates at: http://tanzil.net/updates/
  ```

## 6. Prayer times: AlAdhan API

- **What we use:** Fajr and Maghrib times from [api.aladhan.com](https://aladhan.com/prayer-times-api), fetched at runtime.
- **Terms:** free to use, provided without warranty ([Credits and Terms](https://aladhan.com/credits-and-terms)). No attribution is required, but it is given here and in the settings page. The computed times may differ from local authorities.
- **Privacy:** requests include the user's city or coordinates. See [PRIVACY.md](PRIVACY.md).
