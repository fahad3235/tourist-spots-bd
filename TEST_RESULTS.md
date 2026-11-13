# TEST_RESULTS.md — Tourist Spots BD (run #326, 2026-11-13)

## Unit tests (node, no deps)

Command: `node tests/unit.test.mjs`
Result: **43 passed, 0 failed**

Coverage: data integrity (24 spots, 8 divisions covered, unique ids,
EN+BN fields present on every spot, valid category/division/months/days,
no taka amounts in data); season logic (wrap-around Nov–Feb and Oct–Mar
labels, BN labels, invalid months); filtering (division, category, month,
EN + Bengali search, favourites-only); sorting (name/division/days);
trip math (days sum, dedupe, unknown ids ignored, per-division grouping);
import validation (valid round-trip, wrong app, unknown spot, non-object,
bad trip type, dedupe).

Repairs during testing: **1 real app bug** — `seasonLabel` sorted months
numerically and labelled the wrapping Nov–Feb season "Jan–Dec". Fixed to
follow the circular consecutive run (Nov–Feb, Oct–Mar). 1 test-name fix
(November filter count label 21 → 22; the assertion itself was correct).

## Smoke tests (headless Chrome, raw CDP, file://)

Command: `node tests/smoke.mjs 1280` and `node tests/smoke.mjs 390`
Result: **43/43 checks passed at 1280px; 43/43 at 390px**

Verified live in the browser: 24 cards render; 9 division chips;
search "cox" → 1 card; Sylhet chip → 4; Beach → 4; July → 2
(Ratargul + Floating Guava Market); favourite star + favourites-only
filter; detail modal (Sundarbans: permit note, Khulna reach text);
trip add ×2 → 5 total days, stat updates, localStorage persistence;
trip + favourite survive reload; clear-trip (confirm auto-accepted)
empties the list; bad JSON import (wrong app) shows a failure message;
EN→BN toggle changes the title, shows Bengali digits and Bengali card
names, persists `tsbd-lang = bn`, and toggles back; no horizontal
overflow at either width.

Hygiene: **0 console errors, 0 page exceptions, 0 non-file network
requests** at both widths.

## Syntax

`node --check` on `js/data.js`, `js/logic.js`, `js/i18n.js`, `js/app.js` — all clean.
