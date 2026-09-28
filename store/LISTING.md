# Chrome Web Store listing

**Live:** https://chromewebstore.google.com/detail/pphgcabpchgmnmpfchhgjcckdgmcjnic (item ID `pphgcabpchgmnmpfchhgjcckdgmcjnic`)

Everything to paste into the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole) for v1.0.0. Keep it in sync with the extension when features change.

## Package

```bash
npm run package        # builds and writes azkar-guard-v<version>.zip
```

Upload the zip in **Package → Upload new package**.

## Store listing tab

| Field | Value |
|---|---|
| Name | *from the package:* Azkar Guard / حارس الأذكار |
| Summary | *from the package* (`_locales/*/messages.json` → `extDescription`) |
| Category | Productivity |
| Language | English (default), plus an Arabic listing |
| Icon | `public/icons/icon-128.png` (in the package, from the brand kit) |
| Screenshots (1280×800) | English listing: `store/screenshots/en/1-…` to `5-…`, in order. Arabic listing: `store/screenshots/ar/1-…` to `5-…` |
| Small promo tile (440×280) | `store/promo-small-440x280.png` |
| Marquee (1400×560, optional) | `store/promo-marquee-1400x560.png` |
| Homepage URL | https://github.com/azkar-guard/azkar-guard-browser-extension |
| Support URL | https://github.com/azkar-guard/azkar-guard-browser-extension/issues |

### Description (English)

```
Azkar Guard keeps reminding you until your morning and evening Azkar are done — built for people who spend the whole day in a browser and let them slip.

HOW IT WORKS
• Morning Azkar run from Fajr to Maghrib, evening Azkar from Maghrib to the next Fajr, calculated for your city or location (AlAdhan prayer times, many calculation methods).
• Tap each dhikr to count it down to zero. A session is done only when every dhikr is complete.
• Until then: a new tab shows your checklist, the toolbar badge shows how many are left, and a gentle notification reminds you every 30 minutes.
• Once the session is done, reminders stop and new tabs go back to Chrome's normal page until the next window.

CHOOSE WHAT FITS YOUR DAY
• Three levels: Small (~3 min), Medium (~8 min) or Full, switchable right from the checklist.
• Your streak counts days where both morning and evening were completed.

MADE TO BE READ
• Arabic text of Hisn al-Muslim (Fortress of the Muslim), with virtue notes from the hadith.
• English and Arabic interface, transliteration and English meaning for non-Arabic readers.
• Light and dark themes, and three text sizes.

OPTIONAL SITE REMINDER
• Turn on a small reminder bar on websites you visit while a session is pending. It asks for site access only when you enable it, never reads page content, and gives up its access when you turn it off.

PRIVATE BY DESIGN
• No account, no ads, no analytics. Everything stays in your browser. Only your city or coordinates are sent to AlAdhan to get prayer times.

Free forever, open source (MIT): https://github.com/azkar-guard/azkar-guard-browser-extension

Note: this extension replaces your new tab page while a session is pending.
```

### الوصف (العربية)

```
حارس الأذكار يذكّرك باستمرار حتى تُتمّ أذكار الصباح والمساء — صُمّم لمن يقضي يومه كله أمام المتصفح فتفوته الأذكار.

كيف يعمل
• أذكار الصباح من الفجر إلى المغرب، وأذكار المساء من المغرب إلى الفجر، تُحسب لمدينتك أو موقعك (مواقيت AlAdhan بطرق حساب متعددة).
• اضغط على كل ذكر ليُعدّ تنازليًا حتى الصفر، ولا تكتمل الأذكار إلا بإتمام كل ذكر فيها.
• وحتى تكتمل: تعرض لك صفحة التبويب الجديد قائمة الأذكار، ويُظهر شعار الإضافة عدد المتبقي، ويصلك تذكير لطيف كل 30 دقيقة.
• وعند إتمامها يتوقف التذكير، وتعود صفحة التبويب الجديد إلى صفحة Chrome المعتادة حتى الوقت التالي.

اختر ما يناسب يومك
• ثلاثة مستويات: مختصر (نحو 3 دقائق)، متوسط (نحو 8 دقائق)، كامل، ويمكنك التبديل بينها من القائمة مباشرة.
• أيام المداومة تُحتسب للأيام التي أتممت فيها أذكار الصباح والمساء معًا.

سهل القراءة
• نص الأذكار من كتاب حصن المسلم، مع فضائلها من الأحاديث.
• واجهة بالعربية والإنجليزية، مع النطق اللاتيني والمعنى بالإنجليزية لغير الناطقين بالعربية.
• مظهر فاتح وداكن، وثلاثة أحجام للخط.

شريط تذكير اختياري في المواقع
• فعّل شريط تذكير صغيرًا يظهر في المواقع التي تزورها ما دامت الأذكار غير مكتملة. لا يطلب إذن الوصول إلى المواقع إلا عند تفعيله، ولا يقرأ محتوى الصفحات أبدًا، ويتخلى عن الإذن عند تعطيله.

خصوصيتك محفوظة
• بلا حساب ولا إعلانات ولا تتبّع. كل بياناتك تبقى في متصفحك، ولا يُرسل إلا اسم مدينتك أو إحداثياتك إلى AlAdhan لحساب المواقيت.

مجاني دائمًا ومفتوح المصدر (MIT): https://github.com/azkar-guard/azkar-guard-browser-extension

ملاحظة: تستبدل هذه الإضافة صفحة التبويب الجديد ما دامت الأذكار غير مكتملة.
```

## Privacy practices tab

**Single purpose**

```
Remind the user to complete their daily morning and evening Azkar (Islamic remembrance), and let them count each dhikr until the session is complete.
```

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Stores the user's settings, the tap progress of the current session, completion history for the streak, and cached prayer times, all locally. |
| `alarms` | Schedules the start and end of each morning/evening window (from prayer times) and the reminder every 30 minutes while a session is incomplete. |
| `notifications` | Shows the reminder that the current Azkar session is not finished yet. |
| `geolocation` | Only when the user clicks "Use my current location" in settings, to get coordinates for prayer time calculation. |
| `scripting` | Registers the optional site reminder banner at runtime, only after the user enables it and grants site access. |
| Host permissions (`http://*/*`, `https://*/*`, optional) | Requested only when the user enables the site reminder banner, to show it on websites. The script does not read page content and the permission is removed when the banner is disabled. |
| Remote code | **No.** All code is in the package. The only network request is to api.aladhan.com for prayer times (JSON data, not code). |

**Data usage.** Tick only:
- **Location**: the city/country or coordinates the user enters, sent to api.aladhan.com to calculate prayer times.

Then certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL**

```
https://github.com/azkar-guard/azkar-guard-browser-extension/blob/main/PRIVACY.md
```

## Distribution tab

- **Visibility:** Public
- **Payments:** Free (required by Hisn al-Muslim's terms; see CREDITS.md)
- **Regions:** All regions

## Before each release

- [ ] Bump `version` in `public/manifest.json` and `package.json`.
- [ ] `npm test` and `npm run package`.
- [ ] Manual QA on a clean Chrome profile (see the release checklist issue).
- [ ] Re-capture screenshots if the UI changed (`store/tools/README.md`).
