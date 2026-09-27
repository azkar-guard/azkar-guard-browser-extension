# Azkar Guard privacy policy

*Last updated: 2026-09-27*

Azkar Guard is a browser extension that reminds you to complete your morning and evening Azkar. It has no accounts, no analytics, no ads and no servers of its own.

## What is stored, and where

Everything is stored **only on your device**, in the browser's extension storage (`chrome.storage.local`):

- **Your settings:** location (city and country, or latitude and longitude), prayer time calculation method, azkar level, language, theme, text size and reminder options.
- **Your progress:** tap counts for the current session, and dates on which you completed each session (for the streak).
- **Cached prayer times** for a few days around today.

None of this is sent to the Azkar Guard authors. Uninstalling the extension deletes it.

## What leaves your device

- **Prayer times:** to calculate Fajr and Maghrib, the extension requests prayer times from the [AlAdhan API](https://aladhan.com) (`api.aladhan.com`). Each request contains your city and country, or your coordinates, plus the calculation method. AlAdhan receives these the way any web server receives a request, including your IP address. See [AlAdhan's terms](https://aladhan.com/credits-and-terms).
- **Nothing else.** The extension makes no other network requests.

## Location

- **"Use my current location"** asks the browser for your position once. The coordinates are rounded to 4 decimals and stored as your location setting.
- **You can instead type a city,** or edit or remove the coordinates at any time in the settings page.

## Websites you visit

The site reminder banner is **off by default**.
- **When you enable it:** the extension asks for access to websites, and draws the banner on pages while a session is incomplete.
- **What it reads:** the banner script never reads, collects or transmits page content, URLs or browsing history. It only asks the extension whether to show itself.
- **When you disable it:** the site access permission is removed.

## Changes

Changes to this policy will be published in this file in the project's repository.

## Contact

Open an issue in the project's GitHub repository.
