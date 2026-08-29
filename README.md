# Evripos Currents

A bilingual Expo app for understanding the unusual tidal current in the Evripos
Strait at Chalkida, Greece. It estimates the current direction, the next reversal
and the daily cycle from the published Port Authority table and local astronomical
calculations.

**Platforms:** Android, iOS and web

## What is in it

| View | What it shows |
| --- | --- |
| Now | Estimated direction, cycle phase, next reversal countdown, a strait schematic and a 24-hour chart |
| Day | The four expected direction changes for a selected day |
| 6 days | A six-day overview with lunar day, current curve and reversal times |
| Map | Strait map, Sun and Moon azimuth and the upcoming lunar phases |
| Alerts | Notification controls |
| Guide | Methodology, reliability notes, source links and legend |

A few things worth knowing about the build:

- **The prediction is calculated locally.** The app combines an embedded version of
  the published current table with the lunar day, so the core forecast does not
  depend on a remote API.
- **Irregular days are not guessed.** Lunar days 7–9 and 22–24 are marked as
  irregular, and the UI deliberately avoids presenting a direction as reliable.
- **Times follow Athens correctly.** Published table values are standard-time values;
  the model applies the `Europe/Athens` offset independently to each event.
- **Astronomy uses the bridge coordinates.** Sun, Moon and lunar-phase values are
  calculated for `38.4644 N, 23.5936 E` with
  [Astronomy Engine](https://github.com/cosinekitty/astronomy).
- **Notifications are local and opt-in.** Native builds can schedule alerts before
  reversals, at irregular periods, and for full or new moons. Preferences are stored
  on the device.
- **The interface is bilingual.** Greek and English copy share the same prediction
  model and can be switched directly from the header.

## Running it

Expo SDK 57 requires Node.js 22.13 or newer.

```bash
git clone https://github.com/DeStegio/evripos-currents.git
cd evripos-currents
npm install
npm start
```

The Expo terminal can open the project on a connected device, simulator or browser.
The platform scripts are also available directly:

```bash
npm run android
npm run ios
npm run web
```

Use a native development or production build when testing scheduled notifications
and the Android exact-alarm permission.

## Checks

```bash
npm run verify
```

That runs Expo ESLint, TypeScript without emitting files, the reference checks for the
current-prediction model (`npm run test:model`), and the live-derivation checks
(`npm run test:live`).

The live checks exist because a release build must not quietly differ from development.
They assert that distinct instants produce distinct readings — nothing on screen is a
fixture — and that the Europe/Athens offset derived from the EU daylight-saving rule
matches ICU on every hour between 2024 and 2030, including both switch instants. That
fallback is what keeps the clock correct if the JavaScript engine in a release APK ships
without a time-zone database.

## Structure

```text
src/
  app/
    _layout.tsx                    app shell and global configuration
    index.tsx                      six-tab interface
  features/
    evripos-model.ts               current table, prediction and astronomy model
    notification-service.ts        native notification scheduling
    notification-service.web.ts    web fallback
  ui/
    theme.ts                       palette, type and spacing tokens
    primitives.tsx                 label, stat cell and toggle
    graphics.tsx                   curve, strait views, moon, azimuth dial, tab icons
scripts/
  verify-evripos-model.ts          reference cases for model behavior
  verify-live-model.ts             live-derivation and time-zone fallback checks
assets/images/
  chalkida-map.png                 map used in the Map view
```

## Method and sources

The app clearly separates computed astronomy from an empirical direction forecast.
Its in-app methodology links to the original references:

- [Municipality of Chalkida — the Evripos tidal phenomenon](https://dimoschalkideon.gr/to-palirroiko-fenomeno-tou-evripou/)
- [Evia Chamber publication containing the current table](https://eviachamber.gr/wp-content/uploads/2024/04/90-xronia-eviachamber.pdf)
- [Astronomy Engine](https://github.com/cosinekitty/astronomy)

## Important limitation

This is an empirical direction forecast, not a live water-current measurement.
Wind and local conditions can shift the real reversal time. Do not use the app for
navigation or safety-critical decisions.
