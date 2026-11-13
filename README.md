# Tourist Spots BD 🇧🇩

An offline, bilingual (English / বাংলা) explorer for **24 tourist spots across all 8 divisions of Bangladesh** — with search, filters, a best-season month planner, favourites, and a trip shortlist you can export as JSON.

Live demo: https://fahad3235.github.io/tourist-spots-bd/

## Problem

Bangladesh has world-class places — the longest sea beach, the largest mangrove forest, ancient Buddhist monasteries, tea gardens, swamp forests — but trip planning usually means jumping between blogs, Facebook posts and outdated lists. This app puts the essentials for 24 well-known spots in one place that works fully offline: where it is, when to go, how to reach it, and how many days to allow.

## Features

- **24 spots, 8 divisions** — Dhaka, Chattogram, Sylhet, Khulna, Rajshahi, Barishal, Rangpur, Mymensingh
- **Search** in English or Bengali (name, division, category, description)
- **Filters** — division chips with counts, category (Beach / Hill / Forest / Heritage / Lake / River / Tea Garden), best-season month, favourites-only
- **Sort** — name, division, best-season start, fewest days first
- **Best-season month planner** — pick a month and see which spots are in season (e.g. July shows only Ratargul Swamp Forest and the Floating Guava Market)
- **Spot details** — description, best season, suggested days, entry category, how to reach, and a practical tip
- **Favourites** — star spots, persisted in localStorage
- **Trip shortlist** — add spots, see total suggested days, export/import as JSON (strict validation: wrong app, unknown spot or malformed JSON is rejected), clear with confirmation
- **Bilingual UI** — English / বাংলা toggle, persisted, with Bengali digits
- **Offline & private** — zero network requests; all data and preferences stay on the device
- **Responsive** — verified at 1280px desktop and 390px mobile, no horizontal overflow

## Screenshots

Open `index.html` in any browser (or visit the live demo above). No build step, no server needed.

## Stack

- Plain HTML + CSS + JavaScript (no frameworks, no dependencies)
- `js/data.js` — the 24-spot dataset (EN + BN)
- `js/logic.js` — pure, testable functions (filtering, sorting, season math, trip math, import validation)
- `js/i18n.js` — UI strings and division/category translations
- `js/app.js` — DOM wiring and localStorage persistence

## Run locally

```bash
# Just open the file — it works from disk (file://), no server required:
open index.html
# or serve it:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tests

```bash
node tests/unit.test.mjs   # 43 pure-logic tests, no dependencies
node tests/smoke.mjs 1280  # headless-Chrome smoke tests (raw CDP), desktop
node tests/smoke.mjs 390   # headless-Chrome smoke tests, mobile
```

Results (2026-11-13): **43/43 unit tests**, **43/43 smoke checks at 1280px**, **43/43 at 390px**, 0 console/page errors, 0 non-file network requests. See `TEST_RESULTS.md`.

## Data notes

Spot facts are general public knowledge (location, division, category, best season, how to reach). **Entry is shown as a category only** — "Free entry", "Ticketed — check locally", or "Permit required" — never a taka amount, because fees change. Check ticket prices, ship sailings and forest permits locally before you travel. Full sourcing notes: `DATA_NOTES.md`.

## Limitations

- 24 spots is a starter set, not an exhaustive guide to Bangladesh.
- Best seasons are typical patterns; weather varies year to year.
- No live data: no prices, no weather, no transport schedules, no booking.
- Ship sailings to Saint Martin's Island run in the winter tourist season only; the Sundarbans requires a licensed operator and a forest permit — the app says so on the relevant cards, but you must arrange these yourself.

## Status

Complete MVP — factory run #326, 2026-11-13. Public repo, GitHub Pages live.

## License

MIT
