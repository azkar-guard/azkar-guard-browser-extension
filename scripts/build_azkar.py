#!/usr/bin/env python3
"""Generate src/data/azkar.json from Hisn al-Muslim (hisnmuslim.com, chapter 27).

Arabic dhikr text is copied verbatim from the source. The only transformations are:
  * the dhikr is taken from between the source's (( )) delimiters, dropping the
    trailing instruction notes such as "(ثلاثَ مرَّاتٍ)", since the counter shows that;
  * text is NFC-normalized (reorders combining marks only; canonically equivalent);
  * evening variants are produced by the exact substitutions the source itself
    prescribes in its "وإذا أمسى قال" notes (see EVENING below). Where the source
    gives the full evening wording, that wording is used as-is.

English translations of meaning and transliterations are written for this project
directly from the Arabic (see TRANSLATIONS and TRANSLITERATIONS); no published
translation is used.

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
    ("three-quls", 76, "both", "small", None),  # split into three surahs, see SPLIT
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

# Source entries holding several dhikr, split at each basmala into separate items
# (one card and counter each). The ids here replace the ITEMS id.
SPLIT = {
    76: ["surat-al-ikhlas", "surat-al-falaq", "surat-an-nas"],
}
BASMALA = "بسم الله الرحمن الرحيم"

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
# Written for this project directly from the Arabic (not adapted from any published
# translation), so it is covered by the project license. Conventions, kept consistent:
#   لا إله إلا = "there is no god but"      الملك = "dominion"
#   أعوذ بـ = "I seek refuge with/in"         الرحمن الرحيم = "the Most Compassionate, the Most Merciful"
#   الحي القيوم = "the Ever-Living, the Self-Subsisting Sustainer"
TRANSLATIONS = {
    "ayat-al-kursi": "I seek refuge with Allah from Satan, the accursed. Allah: there is no god but He, the Ever-Living, the Self-Subsisting Sustainer. Neither slumber nor sleep seizes Him. His is all that is in the heavens and all that is on the earth. Who could intercede in His presence without His leave? He knows all that lies before them and all that lies behind them, while they grasp nothing of His knowledge except what He wills. His Kursi encompasses the heavens and the earth, and guarding them both does not tire Him. And He is the Most High, the Supreme. (Al-Baqarah 2:255)",
    "surat-al-ikhlas": "In the name of Allah, the Most Compassionate, the Most Merciful. Say: He is Allah, the One. Allah, the Self-Sufficient, on whom all depend. He neither begets, nor was He begotten. And there is none comparable to Him. (Al-Ikhlas 112)",
    "surat-al-falaq": "In the name of Allah, the Most Compassionate, the Most Merciful. Say: I seek refuge with the Lord of the daybreak, from the evil of what He has created, from the evil of the night when its darkness settles, from the evil of those who blow on knots, and from the evil of the envious one when he envies. (Al-Falaq 113)",
    "surat-an-nas": "In the name of Allah, the Most Compassionate, the Most Merciful. Say: I seek refuge with the Lord of people, the King of people, the God of people, from the evil of the whisperer who withdraws, who whispers into people's chests, whether from among the jinn or from among people. (An-Nas 114)",
    "asbahna-wa-asbaha-al-mulk": "We have entered the morning, and the dominion has entered the morning belonging to Allah. All praise is for Allah. There is no god but Allah alone; He has no partner. His is the dominion and His is all praise, and He has power over all things. My Lord, I ask You for the good that this day holds and the good that follows it, and I seek refuge with You from the evil that this day holds and the evil that follows it. My Lord, I seek refuge with You from laziness and the hardships of old age. My Lord, I seek refuge with You from a punishment in the Fire and a punishment in the grave.",
    "asbahna-wa-asbaha-al-mulk-evening": "We have entered the evening, and the dominion has entered the evening belonging to Allah. All praise is for Allah. There is no god but Allah alone; He has no partner. His is the dominion and His is all praise, and He has power over all things. My Lord, I ask You for the good that this night holds and the good that follows it, and I seek refuge with You from the evil that this night holds and the evil that follows it. My Lord, I seek refuge with You from laziness and the hardships of old age. My Lord, I seek refuge with You from a punishment in the Fire and a punishment in the grave.",
    "allahumma-bika-asbahna": "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.",
    "allahumma-bika-asbahna-evening": "O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return.",
    "sayyid-al-istighfar": "O Allah, You are my Lord; there is no god but You. You created me, and I am Your slave. I keep Your covenant and Your promise as much as I can. I seek refuge with You from the evil of what I have done. I admit to You Your blessing upon me, and I admit my sin; so forgive me, for none forgives sins but You.",
    "allahumma-inni-asbahtu-ushhiduka": "O Allah, I have entered the morning calling You to witness, and calling to witness those who carry Your Throne, Your angels and all Your creation, that You are Allah: there is no god but You alone, You have no partner; and that Muhammad is Your slave and Your Messenger.",
    "allahumma-inni-asbahtu-ushhiduka-evening": "O Allah, I have entered the evening calling You to witness, and calling to witness those who carry Your Throne, Your angels and all Your creation, that You are Allah: there is no god but You alone, You have no partner; and that Muhammad is Your slave and Your Messenger.",
    "allahumma-ma-asbaha-bi": "O Allah, every blessing that I or any of Your creation have entered this morning with comes from You alone; You have no partner. So Yours is all praise and Yours is all thanks.",
    "allahumma-ma-asbaha-bi-evening": "O Allah, every blessing that I or any of Your creation have entered this evening with comes from You alone; You have no partner. So Yours is all praise and Yours is all thanks.",
    "allahumma-afini-fi-badani": "O Allah, grant me well-being in my body. O Allah, grant me well-being in my hearing. O Allah, grant me well-being in my sight. There is no god but You. O Allah, I seek refuge with You from disbelief and from poverty, and I seek refuge with You from the punishment of the grave. There is no god but You.",
    "hasbiyallahu": "Allah is sufficient for me; there is no god but He. In Him I have put my trust, and He is the Lord of the Mighty Throne.",
    "al-afwa-wal-afiya": "O Allah, I ask You for Your pardon and for well-being in this world and in the Hereafter. O Allah, I ask You for Your pardon and for well-being in my religion and my worldly life, in my family and in my wealth. O Allah, conceal my faults and calm my fears. O Allah, guard me from before me and from behind me, from my right and from my left, and from above me; and I seek refuge in Your greatness from being taken unawares from beneath me.",
    "alim-al-ghaybi-wash-shahada": "O Allah, Knower of the hidden and the manifest, Creator of the heavens and the earth, Lord of everything and its Sovereign: I bear witness that there is no god but You. I seek refuge with You from the evil within myself, from the evil of Satan and his snares, and from committing a wrong against myself or bringing one upon a Muslim.",
    "bismillahi-alladhi-la-yadurru": "In the name of Allah, along with whose name nothing on the earth or in the heaven causes harm; and He is the All-Hearing, the All-Knowing.",
    "raditu-billahi-rabba": "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.",
    "ya-hayyu-ya-qayyum": "O Ever-Living, O Self-Subsisting Sustainer, by Your mercy I seek relief: set all my affairs right, and do not entrust me to myself for even the blink of an eye.",
    "asbahna-rabbil-alamin": "We have entered the morning, and the dominion has entered the morning belonging to Allah, Lord of all the worlds. O Allah, I ask You for this day's good: its opening, its victory, its light, its blessing and its guidance. And I seek refuge with You from the evil within it and the evil that follows it.",
    "asbahna-rabbil-alamin-evening": "We have entered the evening, and the dominion has entered the evening belonging to Allah, Lord of all the worlds. O Allah, I ask You for this night's good: its opening, its victory, its light, its blessing and its guidance. And I seek refuge with You from the evil within it and the evil that follows it.",
    "asbahna-ala-fitrat-al-islam": "We have entered the morning upon the natural way (fitrah) of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muhammad ﷺ, and upon the way of our father Ibrahim, a man of pure faith and a Muslim, who was never one of those who ascribe partners to Allah.",
    "asbahna-ala-fitrat-al-islam-evening": "We have entered the evening upon the natural way (fitrah) of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muhammad ﷺ, and upon the way of our father Ibrahim, a man of pure faith and a Muslim, who was never one of those who ascribe partners to Allah.",
    "subhanallahi-wa-bihamdihi": "Glory is to Allah, and praise is to Him.",
    "la-ilaha-illallah-10": "There is no god but Allah alone; He has no partner. His is the dominion and His is all praise, and He has power over all things.",
    "la-ilaha-illallah-100": "There is no god but Allah alone; He has no partner. His is the dominion and His is all praise, and He has power over all things.",
    "subhanallahi-adada-khalqihi": "Glory is to Allah, and praise is to Him: as many times as the number of His creation, as much as pleases Him, equal to the weight of His Throne, and as much as the ink of His words.",
    "ilman-nafian": "O Allah, I ask You for beneficial knowledge, wholesome provision, and deeds that are accepted.",
    "astaghfirullah-wa-atubu-ilayh": "I ask Allah for forgiveness, and I repent to Him.",
    "audhu-bikalimatillah": "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    "salat-ala-an-nabi": "O Allah, bestow Your blessings and peace upon our Prophet Muhammad.",
}

# Transliteration, keyed like TRANSLATIONS. Written for this project in one consistent
# scheme: ' = ع or hamza, aa/ee/oo = long vowels, dh = ذ, th = ث, gh = غ, kh = خ.
TRANSLITERATIONS = {
    "ayat-al-kursi": "A'oodhu billaahi minash-shaytaanir-rajeem. Allaahu laa ilaaha illaa huwal-hayyul-qayyoom, laa ta'khudhuhu sinatun wa laa nawm, lahu maa fis-samaawaati wa maa fil-ard, man dhal-ladhee yashfa'u 'indahu illaa bi-idhnih, ya'lamu maa bayna aydeehim wa maa khalfahum, wa laa yuheetoona bi shay'im-min 'ilmihi illaa bimaa shaa', wasi'a kursiyyuhus-samaawaati wal-ard, wa laa ya'ooduhu hifdhuhumaa, wa huwal-'aliyyul-'adheem.",
    "surat-al-ikhlas": "Bismillaahir-rahmaanir-raheem. Qul huwal-laahu ahad. Allaahus-samad. Lam yalid wa lam yoolad. Wa lam yakul-lahu kufuwan ahad.",
    "surat-al-falaq": "Bismillaahir-rahmaanir-raheem. Qul a'oodhu bi rabbil-falaq. Min sharri maa khalaq. Wa min sharri ghaasiqin idhaa waqab. Wa min sharrin-naffaathaati fil-'uqad. Wa min sharri haasidin idhaa hasad.",
    "surat-an-nas": "Bismillaahir-rahmaanir-raheem. Qul a'oodhu bi rabbin-naas. Malikin-naas. Ilaahin-naas. Min sharril-waswaasil-khannaas. Alladhee yuwaswisu fee sudoorin-naas. Minal-jinnati wan-naas.",
    "asbahna-wa-asbaha-al-mulk": "Asbahnaa wa asbahal-mulku lillaah, wal-hamdu lillaah, laa ilaaha illallaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamd, wa huwa 'alaa kulli shay'in qadeer. Rabbi as'aluka khayra maa fee haadhal-yawmi wa khayra maa ba'dah, wa a'oodhu bika min sharri maa fee haadhal-yawmi wa sharri maa ba'dah. Rabbi a'oodhu bika minal-kasali wa soo'il-kibar. Rabbi a'oodhu bika min 'adhaabin fin-naari wa 'adhaabin fil-qabr.",
    "asbahna-wa-asbaha-al-mulk-evening": "Amsaynaa wa amsal-mulku lillaah, wal-hamdu lillaah, laa ilaaha illallaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamd, wa huwa 'alaa kulli shay'in qadeer. Rabbi as'aluka khayra maa fee haadhihil-laylati wa khayra maa ba'dahaa, wa a'oodhu bika min sharri maa fee haadhihil-laylati wa sharri maa ba'dahaa. Rabbi a'oodhu bika minal-kasali wa soo'il-kibar. Rabbi a'oodhu bika min 'adhaabin fin-naari wa 'adhaabin fil-qabr.",
    "allahumma-bika-asbahna": "Allaahumma bika asbahnaa, wa bika amsaynaa, wa bika nahyaa, wa bika namootu, wa ilaykan-nushoor.",
    "allahumma-bika-asbahna-evening": "Allaahumma bika amsaynaa, wa bika asbahnaa, wa bika nahyaa, wa bika namootu, wa ilaykal-maseer.",
    "sayyid-al-istighfar": "Allaahumma anta rabbee laa ilaaha illaa ant, khalaqtanee wa ana 'abduk, wa ana 'alaa 'ahdika wa wa'dika mastata't, a'oodhu bika min sharri maa sana't, aboo'u laka bi ni'matika 'alayya, wa aboo'u bi dhanbee, faghfir lee fa innahu laa yaghfirudh-dhunooba illaa ant.",
    "allahumma-inni-asbahtu-ushhiduka": "Allaahumma innee asbahtu ushhiduka, wa ushhidu hamalata 'arshika, wa malaa'ikataka, wa jamee'a khalqika, annaka antallaahu laa ilaaha illaa anta wahdaka laa shareeka lak, wa anna Muhammadan 'abduka wa rasooluk.",
    "allahumma-inni-asbahtu-ushhiduka-evening": "Allaahumma innee amsaytu ushhiduka, wa ushhidu hamalata 'arshika, wa malaa'ikataka, wa jamee'a khalqika, annaka antallaahu laa ilaaha illaa anta wahdaka laa shareeka lak, wa anna Muhammadan 'abduka wa rasooluk.",
    "allahumma-ma-asbaha-bi": "Allaahumma maa asbaha bee min ni'matin aw bi ahadin min khalqika fa minka wahdaka laa shareeka lak, fa lakal-hamdu wa lakash-shukr.",
    "allahumma-ma-asbaha-bi-evening": "Allaahumma maa amsaa bee min ni'matin aw bi ahadin min khalqika fa minka wahdaka laa shareeka lak, fa lakal-hamdu wa lakash-shukr.",
    "allahumma-afini-fi-badani": "Allaahumma 'aafinee fee badanee, Allaahumma 'aafinee fee sam'ee, Allaahumma 'aafinee fee basaree, laa ilaaha illaa ant. Allaahumma innee a'oodhu bika minal-kufri wal-faqr, wa a'oodhu bika min 'adhaabil-qabr, laa ilaaha illaa ant.",
    "hasbiyallahu": "Hasbiyallaahu laa ilaaha illaa huwa, 'alayhi tawakkaltu, wa huwa rabbul-'arshil-'adheem.",
    "al-afwa-wal-afiya": "Allaahumma innee as'alukal-'afwa wal-'aafiyata fid-dunyaa wal-aakhirah. Allaahumma innee as'alukal-'afwa wal-'aafiyata fee deenee wa dunyaaya wa ahlee wa maalee. Allaahummastur 'awraatee, wa aamin raw'aatee. Allaahummahfadhnee min bayni yadayya, wa min khalfee, wa 'an yameenee, wa 'an shimaalee, wa min fawqee, wa a'oodhu bi 'adhamatika an ughtaala min tahtee.",
    "alim-al-ghaybi-wash-shahada": "Allaahumma 'aalimal-ghaybi wash-shahaadah, faatiras-samaawaati wal-ard, rabba kulli shay'in wa maleekah, ash-hadu an laa ilaaha illaa ant, a'oodhu bika min sharri nafsee, wa min sharrish-shaytaani wa sharakih, wa an aqtarifa 'alaa nafsee soo'an aw ajurrahu ilaa muslim.",
    "bismillahi-alladhi-la-yadurru": "Bismillaahil-ladhee laa yadurru ma'as-mihi shay'un fil-ardi wa laa fis-samaa'i wa huwas-samee'ul-'aleem.",
    "raditu-billahi-rabba": "Radeetu billaahi rabbaa, wa bil-islaami deenaa, wa bi Muhammadin sallallaahu 'alayhi wa sallama nabiyyaa.",
    "ya-hayyu-ya-qayyum": "Yaa hayyu yaa qayyoomu bi rahmatika astagheeth, aslih lee sha'nee kullahu, wa laa takilnee ilaa nafsee tarfata 'ayn.",
    "asbahna-rabbil-alamin": "Asbahnaa wa asbahal-mulku lillaahi rabbil-'aalameen. Allaahumma innee as'aluka khayra haadhal-yawm, fat-hahu, wa nasrahu, wa noorahu, wa barakatahu, wa hudaahu, wa a'oodhu bika min sharri maa feehi wa sharri maa ba'dah.",
    "asbahna-rabbil-alamin-evening": "Amsaynaa wa amsal-mulku lillaahi rabbil-'aalameen. Allaahumma innee as'aluka khayra haadhihil-laylah, fat-hahaa, wa nasrahaa, wa noorahaa, wa barakatahaa, wa hudaahaa, wa a'oodhu bika min sharri maa feehaa wa sharri maa ba'dahaa.",
    "asbahna-ala-fitrat-al-islam": "Asbahnaa 'alaa fitratil-islaam, wa 'alaa kalimatil-ikhlaas, wa 'alaa deeni nabiyyinaa Muhammadin sallallaahu 'alayhi wa sallam, wa 'alaa millati abeenaa Ibraaheema haneefan musliman wa maa kaana minal-mushrikeen.",
    "asbahna-ala-fitrat-al-islam-evening": "Amsaynaa 'alaa fitratil-islaam, wa 'alaa kalimatil-ikhlaas, wa 'alaa deeni nabiyyinaa Muhammadin sallallaahu 'alayhi wa sallam, wa 'alaa millati abeenaa Ibraaheema haneefan musliman wa maa kaana minal-mushrikeen.",
    "subhanallahi-wa-bihamdihi": "Subhaanallaahi wa bihamdih.",
    "la-ilaha-illallah-10": "Laa ilaaha illallaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamd, wa huwa 'alaa kulli shay'in qadeer.",
    "la-ilaha-illallah-100": "Laa ilaaha illallaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamd, wa huwa 'alaa kulli shay'in qadeer.",
    "subhanallahi-adada-khalqihi": "Subhaanallaahi wa bihamdih, 'adada khalqih, wa ridaa nafsih, wa zinata 'arshih, wa midaada kalimaatih.",
    "ilman-nafian": "Allaahumma innee as'aluka 'ilman naafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalaa.",
    "astaghfirullah-wa-atubu-ilayh": "Astaghfirullaaha wa atoobu ilayh.",
    "audhu-bikalimatillah": "A'oodhu bi kalimaatil-laahit-taammaati min sharri maa khalaq.",
    "salat-ala-an-nabi": "Allaahumma salli wa sallim 'alaa nabiyyinaa Muhammad.",
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
        "en": "Al-Ikhlas, al-Falaq and an-Nas, recited three times in the evening and in the morning, will suffice you against everything. (Abu Dawud 5082)",
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


def split_basmala(text: str, source_id: int, count: int) -> list[str]:
    """Split a text holding several surahs at each basmala, dropping the "." separators."""
    parts = [p.strip().rstrip(".").strip() for p in text.split(BASMALA) if p.strip()]
    if len(parts) != count or text.count(BASMALA) != count:
        sys.exit(f"source #{source_id}: expected {count} basmala-separated parts, got {len(parts)}")
    return [f"{BASMALA} {p}" for p in parts]


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
                "transliteration": TRANSLITERATIONS[id_],
            }
            if virtue:
                obj["virtue_note"] = virtue["en"]
                obj["virtue_note_ar"] = virtue_note_ar
            return obj

        if source_id in SPLIT:
            ids = SPLIT[source_id]
            for id_, text in zip(ids, split_basmala(morning_text, source_id, len(ids))):
                out.append(make(id_, session, text))
            continue

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
