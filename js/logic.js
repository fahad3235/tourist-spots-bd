/* Tourist Spots BD — pure logic (no DOM). Node + browser compatible. */
(function (root) {
  const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  function bnDigits(value, lang) {
    const s = String(value);
    if (lang !== 'bn') return s;
    return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
  }

  function norm(s) {
    return String(s || '').trim().toLowerCase();
  }

  function monthName(m, lang, MONTHS_EN, MONTHS_BN) {
    if (!Number.isInteger(m) || m < 1 || m > 12) return '';
    return lang === 'bn' ? MONTHS_BN[m - 1] : MONTHS_EN[m - 1];
  }

  // "Nov–Feb" style season label; handles seasons that wrap the year end.
  function seasonLabel(months, lang, MONTHS_EN, MONTHS_BN) {
    if (!Array.isArray(months) || months.length === 0) return '';
    const names = (lang === 'bn' ? MONTHS_BN : MONTHS_EN);
    const short = (n) => (lang === 'bn' ? n : n.slice(0, 3));
    if (months.length === 12) return lang === 'bn' ? 'সারা বছর' : 'All year';
    const set = {};
    months.forEach((m) => { set[m] = true; });
    const prev = (m) => (m === 1 ? 12 : m - 1);
    const next = (m) => (m === 12 ? 1 : m + 1);
    // A season is one consecutive run on the circular year: its start is the
    // month whose predecessor is not in the set. If there is exactly one
    // start, label start–end of that run.
    const starts = months.filter((m) => !set[prev(m)]);
    if (starts.length === 1) {
      let end = starts[0];
      while (set[next(end)]) end = next(end);
      return short(names[starts[0] - 1]) + '–' + short(names[end - 1]);
    }
    const sorted = months.slice().sort((a, b) => a - b);
    return short(names[sorted[0] - 1]) + '–' + short(names[sorted[sorted.length - 1] - 1]);
  }

  function isInSeason(spot, month) {
    if (!month) return true;
    return Array.isArray(spot.months) && spot.months.indexOf(month) !== -1;
  }

  function matchesQuery(spot, q) {
    if (!q) return true;
    const hay = norm(spot.name) + ' ' + norm(spot.bn) + ' ' + norm(spot.division) + ' ' + norm(spot.category) + ' ' + norm(spot.desc);
    return hay.indexOf(q) !== -1;
  }

  function filterSpots(spots, opts) {
    const o = opts || {};
    const q = norm(o.q);
    const favs = o.favs || {};
    return spots.filter((s) => {
      if (o.division && o.division !== 'All' && s.division !== o.division) return false;
      if (o.category && o.category !== 'All' && s.category !== o.category) return false;
      if (o.favOnly && !favs[s.id]) return false;
      if (o.month && !isInSeason(s, o.month)) return false;
      if (!matchesQuery(s, q)) return false;
      return true;
    });
  }

  function sortSpots(spots, key) {
    const arr = spots.slice();
    if (key === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (key === 'division') arr.sort((a, b) => (a.division + a.name).localeCompare(b.division + b.name));
    else if (key === 'season') arr.sort((a, b) => Math.min.apply(null, a.months) - Math.min.apply(null, b.months));
    else if (key === 'days') arr.sort((a, b) => a.days - b.days);
    return arr;
  }

  function countByDivision(spots) {
    const out = {};
    spots.forEach((s) => { out[s.division] = (out[s.division] || 0) + 1; });
    return out;
  }

  // Trip shortlist: array of spot ids (unique, order kept).
  function tripDays(ids, spots) {
    const byId = {};
    spots.forEach((s) => { byId[s.id] = s; });
    let total = 0;
    const seen = {};
    (ids || []).forEach((id) => {
      if (!seen[id] && byId[id]) { seen[id] = true; total += byId[id].days; }
    });
    return total;
  }

  function tripDivisions(ids, spots) {
    const byId = {};
    spots.forEach((s) => { byId[s.id] = s; });
    const out = {};
    const seen = {};
    (ids || []).forEach((id) => {
      if (!seen[id] && byId[id]) { seen[id] = true; out[byId[id].division] = (out[byId[id].division] || 0) + 1; }
    });
    return out;
  }

  function validateTripImport(obj, spots) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'not-an-object' };
    if (obj.app !== 'tourist-spots-bd') return { ok: false, error: 'wrong-app' };
    if (!Array.isArray(obj.trip)) return { ok: false, error: 'bad-trip' };
    const valid = {};
    spots.forEach((s) => { valid[s.id] = true; });
    const ids = [];
    for (const id of obj.trip) {
      if (typeof id !== 'string' || !valid[id]) return { ok: false, error: 'unknown-spot' };
      if (ids.indexOf(id) === -1) ids.push(id);
    }
    if (obj.favourites !== undefined) {
      if (!Array.isArray(obj.favourites)) return { ok: false, error: 'bad-favourites' };
      for (const id of obj.favourites) {
        if (typeof id !== 'string' || !valid[id]) return { ok: false, error: 'unknown-spot' };
      }
    }
    return { ok: true, trip: ids, favourites: obj.favourites || [] };
  }

  function entryLabel(entry, lang) {
    const map = {
      free: { en: 'Free entry', bn: 'বিনামূল্যে' },
      ticketed: { en: 'Ticketed — check locally', bn: 'টিকিট লাগে — স্থানীয়ভাবে যাচাই করুন' },
      permit: { en: 'Permit required', bn: 'অনুমতি প্রয়োজন' }
    };
    const e = map[entry] || map.free;
    return lang === 'bn' ? e.bn : e.en;
  }

  const api = { bnDigits, monthName, seasonLabel, isInSeason, matchesQuery, filterSpots, sortSpots, countByDivision, tripDays, tripDivisions, validateTripImport, entryLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TouristLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
