# DATA_NOTES.md — Tourist Spots BD

## What the data is

24 tourist spots across all 8 divisions of Bangladesh. Each spot carries:
`id, name (EN), bn (Bengali name), division, category, months (best-season
month numbers 1–12), days (suggested days, 1–3), entry (category),
desc/descBn, reach/reachBn, tip/tipBn`.

## Sources (general public knowledge — no single source scraped)

- Locations, divisions and categories: common geographic knowledge
  (e.g. Cox's Bazar in Chattogram division; Sundarbans in Khulna division;
  Paharpur in Naogaon, Rajshahi division).
- Best seasons: the standard Bangladesh travel pattern — winter
  (November–February) for most places; monsoon (June–September) for
  Ratargul Swamp Forest, which is only navigable by boat when flooded;
  July–August for the Floating Guava Market, which exists only in guava
  season. Jaflong is listed October–March (clearest water in the dry
  season). These are patterns, not guarantees — weather varies.
- "How to reach": standard public transport routes (bus/train/launch +
  local CNG/rickshaw/boat), described at the level of a travel guide.
- UNESCO status: Sundarbans, Shat Gambuj Mosque and Paharpur
  (Somapura Mahavihara) are UNESCO World Heritage Sites — well-established
  fact, stated in the descriptions.

## Deliberate honesty choices

1. **No taka amounts anywhere.** A unit test asserts the dataset contains
   no `৳`, `BDT` or `Tk.` amounts. Entry is a category only:
   `free` / `ticketed` / `permit`. The UI says "Ticketed — check locally"
   because entry fees change and vary by visitor type. The footer and
   README repeat this.
2. **No invented distances or times presented as exact.** Travel times are
   given as round "about N hours" estimates where stated, and the app
   never claims live schedules.
3. **Saint Martin's ships**: the app states ships run in the winter
   tourist season only and to confirm sailings — the service is seasonal
   and weather-dependent.
4. **Sundarbans**: entry is `permit`; the card and tip state a licensed
   operator and a forest permit are required and that you must never
   enter alone.
5. **Cox's Bazar "about 120 km"**: the commonly cited length of the
   unbroken beach (usually quoted as 120 km / 75 miles). The description
   says "about 120 km" — approximate, as published figures vary
   (120–125 km depending on where the beach is measured from).

## What is NOT in the data

No prices, no hotel names, no phone numbers, no live schedules, no
booking links. Nothing that could go stale silently. Anything the user
needs to verify (fees, sailings, permits) is flagged as "check locally"
in the UI.
